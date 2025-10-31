/**
 * Enhanced Error Handler for Report Generation System
 * Task 7.2: Implement Robust Error Handling
 * 
 * This module provides comprehensive error handling with:
 * - Try-catch blocks around all major operations
 * - User-friendly error messages
 * - Automatic retry for transient failures
 * - Detailed error categorization and logging
 */

import trialAnalytics from './trial-analytics.js';

class EnhancedErrorHandler {
  constructor() {
    this.errorCategories = {
      VALIDATION: 'validation_error',
      NETWORK: 'network_error',
      SERVICE: 'service_error',
      FILE_PROCESSING: 'file_processing_error',
      RATE_LIMIT: 'rate_limit_error',
      AUTHENTICATION: 'authentication_error',
      TIMEOUT: 'timeout_error',
      DUAL_SERVICE_FAILURE: 'dual_service_failure',
      UNKNOWN: 'unknown_error'
    };

    this.severityLevels = {
      LOW: 'info',
      MEDIUM: 'warning', 
      HIGH: 'error',
      CRITICAL: 'critical'
    };

    this.retryableErrors = new Set([
      this.errorCategories.NETWORK,
      this.errorCategories.SERVICE,
      this.errorCategories.RATE_LIMIT,
      this.errorCategories.TIMEOUT,
      this.errorCategories.DUAL_SERVICE_FAILURE
    ]);

    // Error statistics for monitoring
    this.errorStats = {
      totalErrors: 0,
      errorsByCategory: {},
      errorsBySeverity: {},
      retryAttempts: 0,
      successfulRetries: 0
    };
  }

  /**
   * Main error handling method with comprehensive error analysis
   * @param {Error} error - The error to handle
   * @param {Object} context - Additional context about the error
   * @returns {Object} Formatted error response
   */
  handleError(error, context = {}) {
    try {
      // Generate unique error ID for tracking
      const errorId = this.generateErrorId();
      
      // Categorize the error
      const category = this.categorizeError(error);
      const severity = this.determineSeverity(error, category);
      
      // Update error statistics
      this.updateErrorStats(category, severity);
      
      // Create comprehensive error response
      const errorResponse = this.createErrorResponse(error, category, severity, errorId, context);
      
      // Log error for monitoring and debugging
      this.logError(error, errorResponse, context);
      
      // Track error in analytics if context provided
      if (context.sessionId || context.reportType) {
        this.trackErrorInAnalytics(errorResponse, context);
      }
      
      return errorResponse;
      
    } catch (handlingError) {
      // Fallback error handling if the error handler itself fails
      console.error('Error in error handler:', handlingError);
      return this.createFallbackErrorResponse(error);
    }
  }

  /**
   * Categorize error based on type, status code, and message
   * @param {Error} error - The error to categorize
   * @returns {string} Error category
   */
  categorizeError(error) {
    // Dual service failure (custom error type)
    if (error.isDualServiceFailure) {
      return this.errorCategories.DUAL_SERVICE_FAILURE;
    }

    // HTTP status code based categorization
    if (error.status) {
      if (error.status === 400) return this.errorCategories.VALIDATION;
      if (error.status === 401 || error.status === 403) return this.errorCategories.AUTHENTICATION;
      if (error.status === 429) return this.errorCategories.RATE_LIMIT;
      if (error.status >= 500) return this.errorCategories.SERVICE;
    }

    // Network error codes
    const networkErrorCodes = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'];
    if (networkErrorCodes.includes(error.code)) {
      return this.errorCategories.NETWORK;
    }

    // Message-based categorization
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('timeout')) return this.errorCategories.TIMEOUT;
    if (message.includes('rate limit')) return this.errorCategories.RATE_LIMIT;
    if (message.includes('network') || message.includes('connection')) return this.errorCategories.NETWORK;
    if (message.includes('file') || message.includes('upload')) return this.errorCategories.FILE_PROCESSING;
    if (message.includes('validation') || message.includes('invalid')) return this.errorCategories.VALIDATION;
    if (message.includes('auth')) return this.errorCategories.AUTHENTICATION;
    if (message.includes('service') || message.includes('api')) return this.errorCategories.SERVICE;

    return this.errorCategories.UNKNOWN;
  }

  /**
   * Determine error severity based on category and impact
   * @param {Error} error - The error object
   * @param {string} category - Error category
   * @returns {string} Severity level
   */
  determineSeverity(error, category) {
    // Critical errors that prevent all functionality
    if (category === this.errorCategories.DUAL_SERVICE_FAILURE) {
      return this.severityLevels.CRITICAL;
    }

    if (category === this.errorCategories.AUTHENTICATION) {
      return this.severityLevels.CRITICAL;
    }

    // High severity errors that prevent current operation
    if (category === this.errorCategories.SERVICE && error.status >= 500) {
      return this.severityLevels.HIGH;
    }

    if (category === this.errorCategories.FILE_PROCESSING) {
      return this.severityLevels.HIGH;
    }

    // Medium severity errors that can be retried
    if (category === this.errorCategories.RATE_LIMIT) {
      return this.severityLevels.MEDIUM;
    }

    if (category === this.errorCategories.NETWORK) {
      return this.severityLevels.MEDIUM;
    }

    if (category === this.errorCategories.TIMEOUT) {
      return this.severityLevels.MEDIUM;
    }

    // Low severity errors (validation, user input issues)
    if (category === this.errorCategories.VALIDATION) {
      return this.severityLevels.LOW;
    }

    // Default to high for unknown errors
    return this.severityLevels.HIGH;
  }

  /**
   * Create comprehensive error response with user guidance
   * @param {Error} error - Original error
   * @param {string} category - Error category
   * @param {string} severity - Error severity
   * @param {string} errorId - Unique error ID
   * @param {Object} context - Additional context
   * @returns {Object} Formatted error response
   */
  createErrorResponse(error, category, severity, errorId, context) {
    const baseResponse = {
      success: false,
      error: {
        id: errorId,
        type: category,
        severity: severity,
        timestamp: new Date().toISOString(),
        shouldRetry: this.retryableErrors.has(category),
        retryAfter: this.getRetryDelay(category, severity),
        userActions: this.getUserActions(category, error),
        technicalDetails: this.getTechnicalDetails(error),
        context: this.sanitizeContext(context)
      }
    };

    // Add category-specific error messages and guidance
    switch (category) {
      case this.errorCategories.VALIDATION:
        baseResponse.error.message = this.getValidationErrorMessage(error);
        baseResponse.statusCode = 400;
        break;

      case this.errorCategories.NETWORK:
        baseResponse.error.message = 'Network connection error. Please check your internet connection and try again.';
        baseResponse.statusCode = 503;
        break;

      case this.errorCategories.SERVICE:
        baseResponse.error.message = 'AI service is temporarily unavailable. Please try again in a few minutes.';
        baseResponse.statusCode = 503;
        break;

      case this.errorCategories.RATE_LIMIT:
        baseResponse.error.message = 'Service is experiencing high demand. Please wait a moment and try again.';
        baseResponse.statusCode = 429;
        break;

      case this.errorCategories.AUTHENTICATION:
        baseResponse.error.message = 'Service authentication error. Our team has been automatically notified.';
        baseResponse.statusCode = 500;
        break;

      case this.errorCategories.TIMEOUT:
        baseResponse.error.message = 'Request timed out. Please try again with simpler input or check your connection.';
        baseResponse.statusCode = 408;
        break;

      case this.errorCategories.FILE_PROCESSING:
        baseResponse.error.message = this.getFileProcessingErrorMessage(error);
        baseResponse.statusCode = 400;
        break;

      case this.errorCategories.DUAL_SERVICE_FAILURE:
        baseResponse.error = { ...baseResponse.error, ...error.errorDetails };
        baseResponse.statusCode = 503;
        break;

      default:
        baseResponse.error.message = 'An unexpected error occurred. Please try again or contact support.';
        baseResponse.statusCode = 500;
    }

    return baseResponse;
  }

  /**
   * Get user-friendly actions based on error category
   * @param {string} category - Error category
   * @param {Error} error - Original error
   * @returns {Array} Array of user action strings
   */
  getUserActions(category, error) {
    const actions = {
      [this.errorCategories.VALIDATION]: [
        'Check your input data for completeness and accuracy',
        'Ensure all required fields are filled',
        'Try with simpler or shorter input text'
      ],
      [this.errorCategories.NETWORK]: [
        'Check your internet connection',
        'Try refreshing the page',
        'Wait a moment and try again'
      ],
      [this.errorCategories.SERVICE]: [
        'Wait a few minutes and try again',
        'Try during off-peak hours for better availability',
        'Contact support if the issue persists'
      ],
      [this.errorCategories.RATE_LIMIT]: [
        'Wait 1-2 minutes before trying again',
        'Try during off-peak hours for faster response',
        'Consider breaking large requests into smaller parts'
      ],
      [this.errorCategories.AUTHENTICATION]: [
        'Try again in a few minutes',
        'Our technical team has been automatically notified',
        'Contact support if the problem persists beyond 30 minutes'
      ],
      [this.errorCategories.TIMEOUT]: [
        'Try with shorter or simpler input text',
        'Check your internet connection stability',
        'Upload fewer or smaller files'
      ],
      [this.errorCategories.FILE_PROCESSING]: [
        'Check that uploaded files are not corrupted',
        'Try uploading files in supported formats (PDF, JPEG, PNG)',
        'Reduce file sizes if they are very large'
      ]
    };

    return actions[category] || [
      'Try the operation again',
      'Simplify your request if the error persists',
      'Contact support if you continue to experience issues'
    ];
  }

  /**
   * Get appropriate retry delay based on error category and severity
   * @param {string} category - Error category
   * @param {string} severity - Error severity
   * @returns {number} Retry delay in seconds
   */
  getRetryDelay(category, severity) {
    const delays = {
      [this.errorCategories.RATE_LIMIT]: 60,
      [this.errorCategories.NETWORK]: 30,
      [this.errorCategories.SERVICE]: 120,
      [this.errorCategories.TIMEOUT]: 45,
      [this.errorCategories.AUTHENTICATION]: 300,
      [this.errorCategories.DUAL_SERVICE_FAILURE]: 600
    };

    let baseDelay = delays[category] || 60;

    // Adjust delay based on severity
    if (severity === this.severityLevels.CRITICAL) {
      baseDelay *= 2;
    } else if (severity === this.severityLevels.LOW) {
      baseDelay = Math.max(baseDelay / 2, 15);
    }

    return baseDelay;
  }

  /**
   * Get validation-specific error message
   * @param {Error} error - Validation error
   * @returns {string} User-friendly validation error message
   */
  getValidationErrorMessage(error) {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('report type')) {
      return 'Please select a valid report type to continue.';
    }
    if (message.includes('input') || message.includes('text')) {
      return 'Please provide input text or upload files for analysis.';
    }
    if (message.includes('file')) {
      return 'There was an issue with one or more uploaded files. Please check the files and try again.';
    }
    if (message.includes('length') || message.includes('size')) {
      return 'Input text is too long. Please reduce the length and try again.';
    }
    
    return 'Please check your input and try again.';
  }

  /**
   * Get file processing specific error message
   * @param {Error} error - File processing error
   * @returns {string} User-friendly file error message
   */
  getFileProcessingErrorMessage(error) {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('pdf')) {
      return 'Unable to process the PDF file. Please ensure it\'s not password-protected or corrupted.';
    }
    if (message.includes('image')) {
      return 'Unable to process the image file. Please try a different image format (JPEG, PNG).';
    }
    if (message.includes('size') || message.includes('large')) {
      return 'One or more files are too large. Please reduce file sizes and try again.';
    }
    if (message.includes('format') || message.includes('type')) {
      return 'Unsupported file format. Please use PDF, JPEG, PNG, or text files.';
    }
    
    return 'Unable to process one or more uploaded files. Please check the files and try again.';
  }

  /**
   * Get technical details for debugging (sanitized for user display)
   * @param {Error} error - Original error
   * @returns {string} Technical details
   */
  getTechnicalDetails(error) {
    const details = [];
    
    if (error.status) {
      details.push(`HTTP ${error.status}`);
    }
    
    if (error.code) {
      details.push(`Code: ${error.code}`);
    }
    
    if (error.name && error.name !== 'Error') {
      details.push(`Type: ${error.name}`);
    }
    
    // Sanitize error message to remove sensitive information
    let message = error.message || 'Unknown error';
    message = message.replace(/api[_-]?key/gi, '[API_KEY]');
    message = message.replace(/token/gi, '[TOKEN]');
    message = message.replace(/password/gi, '[PASSWORD]');
    
    details.push(`Message: ${message}`);
    
    return details.join(' | ');
  }

  /**
   * Sanitize context to remove sensitive information
   * @param {Object} context - Original context
   * @returns {Object} Sanitized context
   */
  sanitizeContext(context) {
    const sanitized = { ...context };
    
    // Remove sensitive fields
    delete sanitized.apiKey;
    delete sanitized.token;
    delete sanitized.password;
    delete sanitized.credentials;
    
    // Truncate long text fields
    if (sanitized.inputText && sanitized.inputText.length > 100) {
      sanitized.inputText = sanitized.inputText.substring(0, 100) + '...';
    }
    
    return sanitized;
  }

  /**
   * Generate unique error ID for tracking
   * @returns {string} Unique error ID
   */
  generateErrorId() {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `err_${timestamp}_${randomStr}`;
  }

  /**
   * Update error statistics for monitoring
   * @param {string} category - Error category
   * @param {string} severity - Error severity
   */
  updateErrorStats(category, severity) {
    this.errorStats.totalErrors++;
    
    if (!this.errorStats.errorsByCategory[category]) {
      this.errorStats.errorsByCategory[category] = 0;
    }
    this.errorStats.errorsByCategory[category]++;
    
    if (!this.errorStats.errorsBySeverity[severity]) {
      this.errorStats.errorsBySeverity[severity] = 0;
    }
    this.errorStats.errorsBySeverity[severity]++;
  }

  /**
   * Log error for monitoring and debugging
   * @param {Error} originalError - Original error
   * @param {Object} errorResponse - Formatted error response
   * @param {Object} context - Additional context
   */
  logError(originalError, errorResponse, context) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      errorId: errorResponse.error.id,
      category: errorResponse.error.type,
      severity: errorResponse.error.severity,
      message: originalError.message,
      stack: originalError.stack,
      context: this.sanitizeContext(context),
      userAgent: context.userAgent,
      sessionId: context.sessionId
    };
    
    // Log based on severity
    if (errorResponse.error.severity === this.severityLevels.CRITICAL) {
      console.error('[CRITICAL ERROR]', logEntry);
    } else if (errorResponse.error.severity === this.severityLevels.HIGH) {
      console.error('[ERROR]', logEntry);
    } else if (errorResponse.error.severity === this.severityLevels.MEDIUM) {
      console.warn('[WARNING]', logEntry);
    } else {
      console.log('[INFO]', logEntry);
    }
  }

  /**
   * Track error in analytics system
   * @param {Object} errorResponse - Formatted error response
   * @param {Object} context - Additional context
   */
  async trackErrorInAnalytics(errorResponse, context) {
    try {
      if (trialAnalytics && typeof trialAnalytics.trackReportGeneration === 'function') {
        await trialAnalytics.trackReportGeneration({
          reportType: context.reportType || 'unknown',
          success: false,
          processingTime: context.processingTime || 0,
          hasFiles: context.hasFiles || false,
          fileCount: context.fileCount || 0,
          inputLength: context.inputLength || 0,
          errorType: errorResponse.error.type,
          errorMessage: errorResponse.error.message,
          errorId: errorResponse.error.id,
          sessionId: context.sessionId,
          userAgent: context.userAgent,
          severity: errorResponse.error.severity
        });
      }
    } catch (analyticsError) {
      console.error('Failed to track error in analytics:', analyticsError);
    }
  }

  /**
   * Create fallback error response when error handler fails
   * @param {Error} originalError - Original error
   * @returns {Object} Fallback error response
   */
  createFallbackErrorResponse(originalError) {
    return {
      success: false,
      statusCode: 500,
      error: {
        id: `fallback_${Date.now()}`,
        type: 'system_error',
        severity: 'critical',
        message: 'A system error occurred. Please try again or contact support.',
        shouldRetry: true,
        retryAfter: 60,
        userActions: [
          'Try the operation again',
          'Contact support if the problem persists'
        ],
        technicalDetails: originalError.message || 'Unknown error',
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Implement automatic retry logic with exponential backoff
   * @param {Function} operation - Operation to retry
   * @param {Object} options - Retry options
   * @returns {Promise} Result of successful operation
   */
  async retryOperation(operation, options = {}) {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 30000,
      backoffFactor = 2,
      jitter = true
    } = options;

    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        this.errorStats.retryAttempts++;
        const result = await operation();
        
        if (attempt > 0) {
          this.errorStats.successfulRetries++;
          console.log(`Operation succeeded on retry attempt ${attempt}`);
        }
        
        return result;
        
      } catch (error) {
        lastError = error;
        
        // Don't retry on last attempt or for non-retryable errors
        if (attempt === maxRetries || !this.shouldRetry(error)) {
          break;
        }
        
        // Calculate delay with exponential backoff and optional jitter
        let delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt), maxDelay);
        
        if (jitter) {
          delay = delay * (0.5 + Math.random() * 0.5); // Add 0-50% jitter
        }
        
        console.log(`Operation failed (attempt ${attempt + 1}), retrying in ${Math.round(delay)}ms:`, error.message);
        
        await this.sleep(delay);
      }
    }
    
    // All retries failed, throw the last error
    throw lastError;
  }

  /**
   * Determine if an error should be retried
   * @param {Error} error - Error to check
   * @returns {boolean} Whether the error should be retried
   */
  shouldRetry(error) {
    const category = this.categorizeError(error);
    return this.retryableErrors.has(category);
  }

  /**
   * Sleep utility for retry delays
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Promise that resolves after delay
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get error statistics for monitoring
   * @returns {Object} Error statistics
   */
  getErrorStats() {
    return {
      ...this.errorStats,
      retrySuccessRate: this.errorStats.retryAttempts > 0 
        ? (this.errorStats.successfulRetries / this.errorStats.retryAttempts * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Reset error statistics
   */
  resetErrorStats() {
    this.errorStats = {
      totalErrors: 0,
      errorsByCategory: {},
      errorsBySeverity: {},
      retryAttempts: 0,
      successfulRetries: 0
    };
  }

  /**
   * Create error boundary wrapper for async operations
   * @param {Function} operation - Async operation to wrap
   * @param {Object} context - Context for error handling
   * @returns {Function} Wrapped operation with error boundary
   */
  createErrorBoundary(operation, context = {}) {
    return async (...args) => {
      try {
        return await operation(...args);
      } catch (error) {
        const errorResponse = this.handleError(error, context);
        throw new Error(JSON.stringify(errorResponse));
      }
    };
  }
}

// Export singleton instance
const enhancedErrorHandler = new EnhancedErrorHandler();
export default enhancedErrorHandler;
export { EnhancedErrorHandler };