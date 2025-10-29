/**
 * Investment Report Generation API Endpoint
 * Integrates ChatGPT service with investment data processing
 * to generate comprehensive investment analysis reports
 */

import { requireAuth, setSecurityHeaders } from '../lib/auth.js';
import { getDatabase } from '../lib/database.js';
import chatGPTService from '../lib/chatgpt-service.js';
import { InvestmentDataProcessor, InvestmentDataConverter } from '../lib/investment-data-processor.js';
import reportService from '../lib/report-service.js';
import { formatReportForStorage, validateReportData, calculateReportQuality } from '../lib/report-utils.js';
import usageTrackingService from '../lib/usage-tracking-service.js';

// Error tracking and monitoring
const errorStats = {
  totalErrors: 0,
  errorsByType: {},
  lastErrors: [],
  maxLastErrors: 100
};

// Rate limiting for report generation
const rateLimiter = {
  requests: new Map(),
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5 // Max 5 reports per minute per user
};

export default async function handler(req, res) {
  // Set security headers
  setSecurityHeaders(res);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Token');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  // Use authentication middleware
  return requireAuth(req, res, async () => {
    const startTime = Date.now();
    let reportGenerationAttempted = false;
    
    try {
      // Rate limiting check
      const rateLimitResult = checkRateLimit(req.user.id);
      if (!rateLimitResult.allowed) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many report generation requests. Please wait ${Math.ceil(rateLimitResult.resetTime / 1000)} seconds before trying again.`,
          retryAfter: Math.ceil(rateLimitResult.resetTime / 1000)
        });
      }
      
      // Extract request data
      const { 
        investmentData = {}, 
        reportType = 'basic', 
        userPreferences = {} 
      } = req.body;

      console.log(`Investment report generation started for user ${req.user.id}, type: ${reportType}`);

      // Validate request data
      const validationResult = validateRequestData(investmentData, reportType, userPreferences);
      if (!validationResult.isValid) {
        return res.status(400).json({
          error: 'Invalid request data',
          code: 'INVALID_REQUEST_DATA',
          details: validationResult.errors,
          suggestions: validationResult.suggestions
        });
      }

      // Initialize ChatGPT service if needed
      if (!chatGPTService.isReady()) {
        console.log('Initializing ChatGPT service...');
        const initialized = await chatGPTService.initialize();
        if (!initialized) {
          const status = chatGPTService.getStatus();
          return res.status(503).json({
            error: 'ChatGPT service unavailable',
            code: 'SERVICE_UNAVAILABLE',
            details: status.error,
            message: 'The AI service is currently unavailable. Please try again later.'
          });
        }
      }

      // Validate and sanitize investment data
      const dataValidation = InvestmentDataProcessor.validateInvestmentData(investmentData);
      if (!dataValidation.isValid) {
        return res.status(400).json({
          error: 'Investment data validation failed',
          code: 'INVALID_INVESTMENT_DATA',
          details: dataValidation.errors,
          warnings: dataValidation.warnings,
          securityIssues: dataValidation.securityIssues,
          suggestions: generateDataSuggestions(dataValidation)
        });
      }

      // Convert data to ChatGPT-friendly format
      const convertedData = InvestmentDataConverter.convertToPromptFormat(
        dataValidation.sanitizedData, 
        userPreferences
      );

      // Generate report using ChatGPT service
      console.log('Generating investment report with ChatGPT...');
      reportGenerationAttempted = true;
      
      const reportResult = await generateReportWithFallback(
        dataValidation.sanitizedData,
        reportType,
        userPreferences,
        req.user.id,
        req.user.email
      );

      if (!reportResult.success) {
        return handleChatGPTError(reportResult.error, res, {
          userId: req.user.id,
          reportType,
          processingTime: Date.now() - startTime
        });
      }

      // Format and validate report data for storage
      const reportData = formatReportForStorage(
        reportResult.data.report,
        dataValidation.sanitizedData,
        {
          ...reportResult.data.metadata,
          reportType: reportType,
          processingTime: Date.now() - startTime,
          userAgent: req.headers['user-agent'],
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress
        },
        userPreferences
      );

      // Validate report data before saving
      const validation = validateReportData({ userId: req.user.id, ...reportData });
      if (!validation.isValid) {
        console.warn('Report validation warnings:', validation.warnings);
        console.error('Report validation errors:', validation.errors);
      }

      // Save report using the new report service
      const savedReport = await reportService.saveReport(req.user.id, reportData, reportData.metadata);
      
      if (!savedReport.success) {
        throw new Error(savedReport.error || 'Failed to save report');
      }

      // Log usage for tracking
      await db.logUsage(
        req.user.id,
        'investment_report_generated',
        reportType,
        0, // file count
        0, // file size
        req.headers['x-forwarded-for'] || req.connection.remoteAddress
      );

      // Calculate report quality
      const qualityAssessment = calculateReportQuality({ 
        userId: req.user.id, 
        ...reportData 
      });

      // Prepare response
      const response = {
        success: true,
        data: {
          reportId: savedReport.id,
          report: reportResult.data.report,
          metadata: {
            ...reportResult.data.metadata,
            processingTime: Date.now() - startTime
          },
          dataQuality: {
            completeness: dataValidation.completeness,
            warnings: dataValidation.warnings
          },
          quality: qualityAssessment
        },
        message: 'Investment report generated successfully'
      };

      console.log(`Investment report generated successfully in ${Date.now() - startTime}ms`);
      res.status(200).json(response);

    } catch (error) {
      console.error('Investment report generation error:', error);
      
      // Track error statistics
      trackError(error, {
        userId: req.user?.id,
        reportType: req.body?.reportType,
        processingTime: Date.now() - startTime,
        reportGenerationAttempted
      });
      
      // Log error for monitoring
      try {
        const db = getDatabase();
        await db.logUsage(
          req.user?.id || 'unknown',
          'investment_report_error',
          req.body?.reportType || 'unknown',
          0,
          0,
          req.headers['x-forwarded-for'] || req.connection.remoteAddress
        );
      } catch (logError) {
        console.error('Error logging usage:', logError);
      }

      // Determine appropriate error response
      const errorResponse = categorizeError(error);
      
      return res.status(errorResponse.status).json({
        error: errorResponse.message,
        code: errorResponse.code,
        message: errorResponse.userMessage,
        shouldRetry: errorResponse.shouldRetry,
        retryAfter: errorResponse.retryAfter,
        supportInfo: errorResponse.supportInfo,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
}

/**
 * Validate request data structure and required fields
 * @param {object} investmentData - Investment data from request
 * @param {string} reportType - Type of report requested
 * @param {object} userPreferences - User preferences for report
 * @returns {object} Validation result
 */
function validateRequestData(investmentData, reportType, userPreferences) {
  const result = {
    isValid: true,
    errors: [],
    suggestions: []
  };

  // Validate report type
  const validReportTypes = ['basic', 'intermediate', 'advanced'];
  if (!validReportTypes.includes(reportType)) {
    result.isValid = false;
    result.errors.push(`Invalid report type: ${reportType}. Must be one of: ${validReportTypes.join(', ')}`);
  }

  // Validate investment data structure
  if (!investmentData || typeof investmentData !== 'object') {
    result.isValid = false;
    result.errors.push('Investment data must be provided as an object');
    return result;
  }

  // Check for minimum required data
  const hasGoals = investmentData.goals && investmentData.goals.trim().length > 0;
  const hasRiskTolerance = investmentData.riskTolerance && investmentData.riskTolerance.trim().length > 0;
  const hasTimeHorizon = investmentData.timeHorizon && investmentData.timeHorizon.trim().length > 0;

  if (!hasGoals && !hasRiskTolerance && !hasTimeHorizon) {
    result.isValid = false;
    result.errors.push('At least one of the following is required: goals, riskTolerance, or timeHorizon');
    result.suggestions.push('Provide your investment goals, risk tolerance, or investment timeline for a meaningful analysis');
  }

  // Validate user preferences structure
  if (userPreferences && typeof userPreferences !== 'object') {
    result.errors.push('User preferences must be an object if provided');
  }

  return result;
}

/**
 * Handle ChatGPT service errors and provide appropriate responses
 * @param {object} error - Error object from ChatGPT service
 * @param {object} res - Express response object
 * @param {object} context - Additional context for error handling
 * @returns {object} HTTP response
 */
function handleChatGPTError(error, res, context = {}) {
  console.error('ChatGPT service error:', error);
  
  // Track the error
  trackError(new Error(error.message || 'ChatGPT service error'), {
    ...context,
    errorCode: error.code,
    originalError: error.originalError
  });

  // Use enhanced error information if available
  if (error.error && typeof error.error === 'object') {
    return res.status(getStatusFromSeverity(error.error.severity)).json({
      success: false,
      error: {
        code: error.error.code,
        message: error.error.message,
        userMessage: error.error.message,
        shouldRetry: error.error.shouldRetry,
        retryAfter: error.error.retryAfter,
        severity: error.error.severity,
        userActions: error.error.userActions,
        technicalDetails: process.env.NODE_ENV === 'development' ? error.error.technicalDetails : undefined,
        errorId: error.error.errorId,
        timestamp: error.error.timestamp,
        supportInfo: generateSupportInfo(error.error)
      }
    });
  }

  // Fallback to legacy error responses
  const errorResponses = {
    'SERVICE_NOT_INITIALIZED': {
      status: 503,
      code: 'AI_SERVICE_UNAVAILABLE',
      message: 'The AI service is not properly configured. Please contact support.',
      userMessage: 'The AI analysis service is currently unavailable. Please try again later or contact support.',
      shouldRetry: false,
      retryAfter: null,
      severity: 'critical',
      userActions: [
        'Please try again in a few minutes',
        'If the problem persists, contact support'
      ],
      supportInfo: 'This appears to be a configuration issue. Please contact technical support.'
    },
    'AUTHENTICATION_ERROR': {
      status: 503,
      code: 'AI_SERVICE_AUTH_ERROR',
      message: 'AI service authentication failed. Please try again later.',
      userMessage: 'Unable to authenticate with the AI service. Please try again in a few minutes.',
      shouldRetry: true,
      retryAfter: 300,
      severity: 'critical',
      userActions: [
        'Please try again in 5 minutes',
        'If this problem persists, please contact support'
      ],
      supportInfo: 'If this problem persists, please contact support.'
    },
    'RATE_LIMIT_ERROR': {
      status: 429,
      code: 'AI_SERVICE_RATE_LIMITED',
      message: 'AI service is currently busy. Please wait a moment and try again.',
      userMessage: 'The AI service is currently experiencing high demand. Please wait a moment and try again.',
      shouldRetry: true,
      retryAfter: 60,
      severity: 'warning',
      userActions: [
        'Please wait 1 minute before trying again',
        'Consider using a basic report type for faster processing',
        'Try again during off-peak hours for better performance'
      ],
      supportInfo: 'Try again in a minute, or consider using a basic report type for faster processing.'
    },
    'SERVICE_UNAVAILABLE': {
      status: 503,
      code: 'AI_SERVICE_DOWN',
      message: 'AI service is temporarily unavailable. Please try again in a few minutes.',
      userMessage: 'The AI analysis service is temporarily down for maintenance. Please try again shortly.',
      shouldRetry: true,
      retryAfter: 300,
      severity: 'warning',
      userActions: [
        'A simplified analysis will be provided automatically',
        'Try again in 5 minutes for full AI-powered analysis',
        'Check our status page for service updates'
      ],
      supportInfo: 'Service should be restored within a few minutes. Check our status page for updates.'
    },
    'INVALID_INPUT_DATA': {
      status: 400,
      code: 'INVALID_ANALYSIS_DATA',
      message: 'The provided investment data could not be processed for analysis.',
      userMessage: 'There was an issue with your investment data. Please check your input and try again.',
      shouldRetry: false,
      retryAfter: null,
      severity: 'error',
      userActions: [
        'Ensure all required fields are completed',
        'Check that portfolio data is properly formatted',
        'Try reducing the amount of detailed information'
      ],
      supportInfo: 'Ensure all required fields are completed and portfolio data is properly formatted.'
    },
    'TIMEOUT_ERROR': {
      status: 504,
      code: 'AI_SERVICE_TIMEOUT',
      message: 'AI service request timed out. Please try again.',
      userMessage: 'The analysis is taking longer than expected. Please try again with simpler data.',
      shouldRetry: true,
      retryAfter: 120,
      severity: 'warning',
      userActions: [
        'Try using a basic report type for faster processing',
        'Reduce the amount of portfolio data',
        'Simplify your investment goals description'
      ],
      supportInfo: 'Consider using a basic report type or reducing the amount of portfolio data.'
    },
    'CONNECTION_ERROR': {
      status: 503,
      code: 'AI_SERVICE_CONNECTION_ERROR',
      message: 'Unable to connect to AI service. Please check your connection and try again.',
      userMessage: 'Unable to connect to the AI service. Please check your internet connection.',
      shouldRetry: true,
      retryAfter: 30,
      severity: 'warning',
      userActions: [
        'Check your internet connection',
        'Try refreshing the page',
        'If your connection is stable, this may be a temporary service issue'
      ],
      supportInfo: 'If your connection is stable, this may be a temporary service issue.'
    },
    'GENERATION_FAILED': {
      status: 500,
      code: 'AI_GENERATION_FAILED',
      message: 'Failed to generate report after multiple attempts.',
      userMessage: 'We were unable to generate your investment report after several attempts. Please try again later.',
      shouldRetry: true,
      retryAfter: 600,
      severity: 'error',
      userActions: [
        'Try again in 10 minutes',
        'Consider using a basic report type',
        'If this continues to happen, please contact support'
      ],
      supportInfo: 'If this continues to happen, please contact support with your request details.'
    }
  };

  const errorResponse = errorResponses[error.code] || {
    status: 500,
    code: 'AI_SERVICE_ERROR',
    message: 'An error occurred while generating your investment analysis. Please try again.',
    userMessage: 'An unexpected error occurred during analysis. Please try again.',
    shouldRetry: true,
    retryAfter: 60,
    severity: 'error',
    userActions: [
      'Try again in a few minutes',
      'If the problem continues, contact support'
    ],
    supportInfo: 'If the problem persists, please contact support.'
  };

  // For certain errors, provide fallback response
  if (error.code === 'SERVICE_UNAVAILABLE' || error.code === 'GENERATION_FAILED') {
    try {
      // Attempt to provide a basic fallback analysis
      const fallbackReport = createFallbackResponse(
        context.investmentData || {},
        context.reportType || 'basic'
      );
      
      return res.status(200).json({
        success: true,
        data: {
          reportId: generateReportId(),
          report: fallbackReport,
          metadata: {
            reportType: context.reportType || 'basic',
            generatedAt: new Date().toISOString(),
            processingTime: context.processingTime || 0,
            fallback: true,
            fallbackReason: error.code
          },
          dataQuality: {
            completeness: 50,
            warnings: ['AI service unavailable - basic analysis provided']
          }
        },
        message: 'Basic investment analysis provided (AI service temporarily unavailable)',
        warning: 'This is a simplified analysis. Please try again later for a comprehensive AI-powered report.'
      });
    } catch (fallbackError) {
      console.error('Fallback generation failed:', fallbackError);
      // Continue with error response
    }
  }

  return res.status(errorResponse.status).json({
    error: errorResponse.message,
    code: errorResponse.code,
    message: errorResponse.userMessage,
    shouldRetry: errorResponse.shouldRetry,
    retryAfter: errorResponse.retryAfter,
    supportInfo: errorResponse.supportInfo,
    details: process.env.NODE_ENV === 'development' ? error.originalError : undefined
  });
}

/**
 * Generate helpful suggestions based on data validation results
 * @param {object} validation - Data validation result
 * @returns {array} Array of suggestion strings
 */
function generateDataSuggestions(validation) {
  const suggestions = [];

  if (validation.completeness < 50) {
    suggestions.push('Consider providing more investment details for a comprehensive analysis');
  }

  if (validation.errors.some(error => error.includes('goals'))) {
    suggestions.push('Add your investment goals (e.g., retirement planning, wealth building, income generation)');
  }

  if (validation.errors.some(error => error.includes('riskTolerance'))) {
    suggestions.push('Specify your risk tolerance: conservative, moderate, or aggressive');
  }

  if (validation.errors.some(error => error.includes('timeHorizon'))) {
    suggestions.push('Include your investment timeline (e.g., "5 years", "20 years")');
  }

  if (validation.warnings.some(warning => warning.includes('portfolio'))) {
    suggestions.push('Adding specific portfolio holdings will enable detailed asset allocation analysis');
  }

  return suggestions;
}



/**
 * Generate a unique report ID
 * @returns {string} Unique report identifier
 */
function generateReportId() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `rpt_${timestamp}_${randomStr}`;
}

/**
 * Check rate limiting for user requests
 * @param {string} userId - User ID
 * @returns {object} Rate limit result
 */
function checkRateLimit(userId) {
  const now = Date.now();
  const windowStart = now - rateLimiter.windowMs;
  
  // Clean old requests
  if (rateLimiter.requests.has(userId)) {
    const userRequests = rateLimiter.requests.get(userId).filter(time => time > windowStart);
    rateLimiter.requests.set(userId, userRequests);
  }
  
  // Check current requests
  const userRequests = rateLimiter.requests.get(userId) || [];
  if (userRequests.length >= rateLimiter.maxRequests) {
    const oldestRequest = Math.min(...userRequests);
    const resetTime = oldestRequest + rateLimiter.windowMs - now;
    return {
      allowed: false,
      resetTime: Math.max(0, resetTime)
    };
  }
  
  // Add current request
  userRequests.push(now);
  rateLimiter.requests.set(userId, userRequests);
  
  return { allowed: true };
}

/**
 * Generate report with fallback mechanisms
 * @param {object} investmentData - Sanitized investment data
 * @param {string} reportType - Report type
 * @param {object} userPreferences - User preferences
 * @param {string} userId - User ID for logging
 * @param {string} userEmail - User email for logging
 * @returns {object} Report generation result
 */
async function generateReportWithFallback(investmentData, reportType, userPreferences, userId, userEmail) {
  const maxRetries = 3;
  let lastError = null;
  const reportStartTime = Date.now();
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Report generation attempt ${attempt}/${maxRetries} for user ${userId}`);
      
      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Report generation timeout')), 120000); // 2 minutes
      });
      
      const reportPromise = chatGPTService.generateInvestmentReport(
        investmentData,
        reportType,
        userPreferences,
        userId,
        userEmail
      );
      
      const result = await Promise.race([reportPromise, timeoutPromise]);
      
      if (result.success) {
        console.log(`Report generated successfully on attempt ${attempt}`);
        
        // Log successful report generation
        await usageTrackingService.logReportGeneration({
          userId: userId,
          userEmail: userEmail,
          reportType: reportType,
          totalProcessingTime: Date.now() - reportStartTime,
          chatgptProcessingTime: result.data.metadata.processingTime || 0,
          reportWordCount: result.data.report.wordCount || 0,
          reportQualityScore: calculateReportQuality(result.data.report),
          dataCompletenessScore: result.data.metadata.dataCompleteness || 0,
          success: true
        });
        
        return result;
      }
      
      lastError = result.error;
      
      // Log failed attempt
      await usageTrackingService.logError({
        userId: userId,
        userEmail: userEmail,
        errorType: 'ReportGenerationError',
        errorCode: result.error.code,
        errorMessage: result.error.message,
        endpoint: '/api/generate-investment-report',
        reportType: reportType,
        processingStage: 'chatgpt_generation'
      });
      
      // Don't retry on certain errors
      if (result.error.code === 'AUTHENTICATION_ERROR' || 
          result.error.code === 'INVALID_INPUT_DATA') {
        break;
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
    } catch (error) {
      lastError = error;
      console.error(`Report generation attempt ${attempt} failed:`, error.message);
      
      // Log error
      await usageTrackingService.logError({
        userId: userId,
        userEmail: userEmail,
        errorType: error.name || 'UnknownError',
        errorCode: 'GENERATION_EXCEPTION',
        errorMessage: error.message,
        errorStack: error.stack,
        endpoint: '/api/generate-investment-report',
        reportType: reportType,
        processingStage: 'report_generation_attempt'
      });
      
      // Don't retry on timeout or connection errors after first attempt
      if (attempt > 1 && (error.message.includes('timeout') || error.message.includes('connection'))) {
        break;
      }
    }
  }
  
  // Log final failure
  await usageTrackingService.logReportGeneration({
    userId: userId,
    userEmail: userEmail,
    reportType: reportType,
    totalProcessingTime: Date.now() - reportStartTime,
    success: false,
    errorStage: 'generation_failed',
    errorCode: 'GENERATION_FAILED'
  });
  
  // All attempts failed
  return {
    success: false,
    error: {
      code: 'GENERATION_FAILED',
      message: 'Failed to generate report after multiple attempts',
      originalError: lastError?.message || 'Unknown error',
      shouldRetry: true
    }
  };
}

/**
 * Track error statistics for monitoring
 * @param {Error} error - Error object
 * @param {object} context - Error context
 */
function trackError(error, context) {
  errorStats.totalErrors++;
  
  const errorType = error.name || 'UnknownError';
  errorStats.errorsByType[errorType] = (errorStats.errorsByType[errorType] || 0) + 1;
  
  const errorRecord = {
    timestamp: new Date().toISOString(),
    type: errorType,
    message: error.message,
    stack: error.stack,
    context: context
  };
  
  errorStats.lastErrors.push(errorRecord);
  
  // Keep only recent errors
  if (errorStats.lastErrors.length > errorStats.maxLastErrors) {
    errorStats.lastErrors = errorStats.lastErrors.slice(-errorStats.maxLastErrors);
  }
  
  // Log critical errors immediately
  if (errorType === 'TypeError' || errorType === 'ReferenceError') {
    console.error('CRITICAL ERROR:', errorRecord);
  }
}

/**
 * Categorize errors and provide appropriate responses
 * @param {Error} error - Error object
 * @returns {object} Categorized error response
 */
function categorizeError(error) {
  const errorMessage = error.message?.toLowerCase() || '';
  const errorName = error.name || 'Error';
  
  // Network and connection errors
  if (errorMessage.includes('network') || errorMessage.includes('connection') || 
      errorMessage.includes('econnrefused') || errorMessage.includes('enotfound')) {
    return {
      status: 503,
      code: 'NETWORK_ERROR',
      message: 'Network connection error',
      userMessage: 'Unable to connect to the AI service. Please check your internet connection and try again.',
      shouldRetry: true,
      retryAfter: 30,
      supportInfo: 'If the problem persists, please contact support.'
    };
  }
  
  // Timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('etimedout')) {
    return {
      status: 504,
      code: 'TIMEOUT_ERROR',
      message: 'Request timeout',
      userMessage: 'The request took too long to process. Please try again with simpler input data.',
      shouldRetry: true,
      retryAfter: 60,
      supportInfo: 'Consider reducing the amount of portfolio data or using a basic report type.'
    };
  }
  
  // Memory or resource errors
  if (errorMessage.includes('memory') || errorMessage.includes('heap') || 
      errorName === 'RangeError') {
    return {
      status: 507,
      code: 'RESOURCE_ERROR',
      message: 'Insufficient resources',
      userMessage: 'The system is currently under heavy load. Please try again in a few minutes.',
      shouldRetry: true,
      retryAfter: 300,
      supportInfo: 'Try using a basic report type or reducing the amount of input data.'
    };
  }
  
  // Validation errors
  if (errorMessage.includes('validation') || errorMessage.includes('invalid') ||
      errorName === 'ValidationError') {
    return {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Data validation error',
      userMessage: 'The provided investment data contains errors. Please check your input and try again.',
      shouldRetry: false,
      supportInfo: 'Ensure all required fields are filled correctly and portfolio data is properly formatted.'
    };
  }
  
  // Authentication/authorization errors
  if (errorMessage.includes('auth') || errorMessage.includes('unauthorized') ||
      errorMessage.includes('forbidden')) {
    return {
      status: 401,
      code: 'AUTH_ERROR',
      message: 'Authentication error',
      userMessage: 'Your session has expired. Please log in again.',
      shouldRetry: false,
      supportInfo: 'Please refresh the page and log in again.'
    };
  }
  
  // Database errors
  if (errorMessage.includes('database') || errorMessage.includes('sql') ||
      errorMessage.includes('connection pool')) {
    return {
      status: 503,
      code: 'DATABASE_ERROR',
      message: 'Database error',
      userMessage: 'Unable to save your report. The service is temporarily unavailable.',
      shouldRetry: true,
      retryAfter: 120,
      supportInfo: 'Your report was generated but could not be saved. Please try again.'
    };
  }
  
  // Rate limiting errors
  if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
    return {
      status: 429,
      code: 'RATE_LIMIT_ERROR',
      message: 'Rate limit exceeded',
      userMessage: 'You have made too many requests. Please wait before trying again.',
      shouldRetry: true,
      retryAfter: 60,
      supportInfo: 'Wait a minute before generating another report.'
    };
  }
  
  // Default error response
  return {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
    userMessage: 'An unexpected error occurred while generating your investment report. Please try again.',
    shouldRetry: true,
    retryAfter: 30,
    supportInfo: 'If the problem continues, please contact support with the error code.'
  };
}

/**
 * Create fallback response when ChatGPT is unavailable
 * @param {object} investmentData - User's investment data
 * @param {string} reportType - Requested report type
 * @returns {object} Fallback report
 */
function createFallbackResponse(investmentData, reportType) {
  const fallbackReport = {
    title: `Investment Analysis Summary - ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Level`,
    summary: 'AI service temporarily unavailable - Basic analysis provided',
    fullContent: generateBasicAnalysis(investmentData),
    sections: {
      summary: 'The AI-powered analysis service is currently unavailable. Below is a basic assessment based on your provided information.',
      recommendations: generateBasicRecommendations(investmentData, reportType)
    },
    reportType: reportType,
    fallback: true,
    contentLength: 0,
    wordCount: 0
  };
  
  fallbackReport.fullContent = `# ${fallbackReport.title}\n\n${fallbackReport.sections.summary}\n\n## Basic Analysis\n\n${generateBasicAnalysis(investmentData)}\n\n## Recommendations\n\n${fallbackReport.sections.recommendations}`;
  fallbackReport.contentLength = fallbackReport.fullContent.length;
  fallbackReport.wordCount = fallbackReport.fullContent.split(/\s+/).length;
  
  return fallbackReport;
}

/**
 * Generate basic analysis when AI service is unavailable
 * @param {object} investmentData - Investment data
 * @returns {string} Basic analysis text
 */
function generateBasicAnalysis(investmentData) {
  let analysis = '';
  
  if (investmentData.goals) {
    analysis += `**Investment Goals:** ${investmentData.goals}\n\n`;
  }
  
  if (investmentData.riskTolerance) {
    analysis += `**Risk Tolerance:** ${investmentData.riskTolerance}\n\n`;
  }
  
  if (investmentData.timeHorizon) {
    analysis += `**Time Horizon:** ${investmentData.timeHorizon}\n\n`;
  }
  
  if (investmentData.portfolio && investmentData.portfolio.holdings) {
    analysis += `**Portfolio Holdings:** ${investmentData.portfolio.holdings.length} holdings\n\n`;
  }
  
  analysis += 'For a comprehensive AI-powered analysis, please try again when the service is available.';
  
  return analysis;
}

/**
 * Generate basic recommendations based on investment data
 * @param {object} investmentData - Investment data
 * @param {string} reportType - Report type
 * @returns {string} Basic recommendations
 */
function generateBasicRecommendations(investmentData, reportType) {
  const recommendations = [];
  
  if (investmentData.riskTolerance === 'conservative') {
    recommendations.push('Consider a balanced portfolio with emphasis on bonds and stable investments');
  } else if (investmentData.riskTolerance === 'aggressive') {
    recommendations.push('Growth-oriented investments may be appropriate given your risk tolerance');
  } else {
    recommendations.push('A moderate allocation between growth and income investments may be suitable');
  }
  
  if (investmentData.timeHorizon && investmentData.timeHorizon.includes('year')) {
    const years = parseInt(investmentData.timeHorizon);
    if (years > 10) {
      recommendations.push('Long-term growth strategies can be considered given your time horizon');
    } else if (years < 5) {
      recommendations.push('Focus on capital preservation given your shorter time horizon');
    }
  }
  
  recommendations.push('Consult with a financial advisor for personalized investment advice');
  recommendations.push('Consider diversification across different asset classes');
  
  return recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n');
}

/**
 * Get HTTP status code from error severity
 * @param {string} severity - Error severity
 * @returns {number} HTTP status code
 */
function getStatusFromSeverity(severity) {
  const statusMap = {
    'critical': 503,
    'error': 500,
    'warning': 503,
    'info': 200
  };
  return statusMap[severity] || 500;
}

/**
 * Generate support information based on error
 * @param {object} error - Error object
 * @returns {string} Support information
 */
function generateSupportInfo(error) {
  const supportMessages = {
    'AUTHENTICATION_ERROR': 'This appears to be a service configuration issue. Please contact technical support.',
    'RATE_LIMIT_ERROR': 'Try again during off-peak hours or use a basic report type for faster processing.',
    'SERVICE_UNAVAILABLE': 'Service should be restored within a few minutes. Check our status page for updates.',
    'TIMEOUT_ERROR': 'Consider using a basic report type or reducing the amount of input data.',
    'CONNECTION_ERROR': 'If your connection is stable, this may be a temporary service issue.',
    'INVALID_REQUEST': 'Ensure all required fields are completed and data is properly formatted.',
    'REQUEST_TOO_LARGE': 'Try reducing the amount of detailed information in your input.'
  };

  return supportMessages[error.code] || 'If the problem persists, please contact support with the error ID.';
}

/**
 * Get error statistics for monitoring
 * @returns {object} Error statistics
 */
export function getErrorStats() {
  return {
    ...errorStats,
    errorRate: errorStats.totalErrors > 0 ? 
      Object.values(errorStats.errorsByType).reduce((a, b) => a + b, 0) / errorStats.totalErrors : 0
  };
}