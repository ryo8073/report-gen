/**
 * ChatGPT Service for Investment Analysis
 * Handles all interactions with OpenAI ChatGPT API for generating investment reports
 */

import OpenAI from 'openai';
import openaiConfig from './openai-config.js';
import usageTrackingService from './usage-tracking-service.js';

/**
 * ChatGPT Service class for investment analysis
 * Manages API communication, prompt formatting, and response processing
 */
class ChatGPTService {
  constructor() {
    this.client = null;
    this.isInitialized = false;
    this.initializationError = null;
    
    // Request queue for high-traffic periods
    this.requestQueue = [];
    this.activeRequests = 0;
    this.maxConcurrentRequests = 3;
    this.queueProcessingInterval = null;
    this.queueStats = {
      totalQueued: 0,
      totalProcessed: 0,
      averageWaitTime: 0,
      maxQueueSize: 0
    };
  }

  /**
   * Investment analysis prompt templates for different report types
   */
  static PROMPT_TEMPLATES = {
    basic: {
      systemPrompt: `You are a professional investment advisor providing clear, accessible investment analysis. 
Focus on fundamental concepts and practical recommendations suitable for beginning investors.
Keep explanations simple and avoid complex financial jargon.`,
      
      userPromptTemplate: `Please analyze the following investment portfolio and provide a basic investment report:

INVESTMENT DATA:
Portfolio Holdings: {portfolio}
Investment Goals: {goals}
Risk Tolerance: {riskTolerance}
Investment Timeline: {timeHorizon}
Current Age: {age}
Annual Income: {income}

ANALYSIS REQUIREMENTS:
Please provide a structured report with the following sections:

1. PORTFOLIO SUMMARY
   - Brief overview of current holdings
   - Asset allocation breakdown
   - Total portfolio value assessment

2. RISK ASSESSMENT
   - Simple risk level evaluation (Low/Medium/High)
   - Risk alignment with stated tolerance
   - Basic diversification analysis

3. RECOMMENDATIONS
   - 3-5 specific, actionable recommendations
   - Focus on fundamental improvements
   - Simple rebalancing suggestions if needed

4. NEXT STEPS
   - Immediate actions to take
   - Timeline for implementation
   - When to review again

Keep the language accessible and focus on practical, implementable advice.`
    },

    intermediate: {
      systemPrompt: `You are an experienced investment advisor providing comprehensive analysis for investors with moderate experience. 
Include detailed analysis while maintaining clarity. Use appropriate financial terminology with explanations.
Focus on strategic asset allocation and risk management principles.`,
      
      userPromptTemplate: `Please analyze the following investment portfolio and provide an intermediate-level investment report:

INVESTMENT DATA:
Portfolio Holdings: {portfolio}
Investment Goals: {goals}
Risk Tolerance: {riskTolerance}
Investment Timeline: {timeHorizon}
Current Age: {age}
Annual Income: {income}
Investment Experience: {experience}
Preferred Focus Areas: {focusAreas}

ANALYSIS REQUIREMENTS:
Please provide a comprehensive report with the following sections:

1. EXECUTIVE SUMMARY
   - Key findings and overall portfolio health
   - Primary strengths and concerns
   - Investment thesis alignment

2. DETAILED PORTFOLIO ANALYSIS
   - Asset allocation analysis with target recommendations
   - Sector and geographic diversification review
   - Cost analysis (expense ratios, fees)
   - Performance attribution and benchmarking

3. RISK MANAGEMENT ASSESSMENT
   - Quantitative risk metrics (if calculable from data)
   - Correlation analysis between holdings
   - Stress testing scenarios
   - Risk-adjusted return evaluation

4. STRATEGIC RECOMMENDATIONS
   - Asset allocation optimization
   - Specific security recommendations (buy/sell/hold)
   - Tax efficiency improvements
   - Rebalancing strategy and timeline

5. IMPLEMENTATION PLAN
   - Prioritized action items with timelines
   - Transition strategy for major changes
   - Monitoring and review schedule
   - Performance benchmarks to track

Include relevant financial concepts and provide rationale for all recommendations.`
    },

    advanced: {
      systemPrompt: `You are a sophisticated investment advisor providing institutional-quality analysis for experienced investors. 
Use advanced financial concepts, quantitative analysis, and strategic insights. 
Assume familiarity with complex investment strategies and financial instruments.`,
      
      userPromptTemplate: `Please analyze the following investment portfolio and provide an advanced investment report:

INVESTMENT DATA:
Portfolio Holdings: {portfolio}
Investment Goals: {goals}
Risk Tolerance: {riskTolerance}
Investment Timeline: {timeHorizon}
Current Age: {age}
Annual Income: {income}
Net Worth: {netWorth}
Investment Experience: {experience}
Tax Situation: {taxSituation}
Preferred Focus Areas: {focusAreas}
Current Market Outlook: {marketOutlook}

ANALYSIS REQUIREMENTS:
Please provide a sophisticated analysis with the following sections:

1. EXECUTIVE SUMMARY & INVESTMENT THESIS
   - Strategic portfolio positioning
   - Key alpha generation opportunities
   - Risk-return optimization assessment

2. QUANTITATIVE PORTFOLIO ANALYSIS
   - Modern Portfolio Theory metrics (Sharpe ratio, alpha, beta)
   - Factor exposure analysis (value, growth, momentum, quality)
   - Correlation matrix and diversification efficiency
   - Value-at-Risk and stress testing scenarios
   - Performance attribution analysis

3. STRATEGIC ASSET ALLOCATION
   - Optimal allocation using mean-variance optimization
   - Alternative investment opportunities
   - Currency and geographic exposure analysis
   - Tactical vs. strategic allocation recommendations

4. ADVANCED RISK MANAGEMENT
   - Tail risk assessment and hedging strategies
   - Liquidity analysis and management
   - Concentration risk evaluation
   - Systematic vs. idiosyncratic risk breakdown

5. TAX OPTIMIZATION & EFFICIENCY
   - Tax-loss harvesting opportunities
   - Asset location optimization
   - Tax-efficient rebalancing strategies
   - Estate planning considerations

6. IMPLEMENTATION & MONITORING
   - Sophisticated rebalancing algorithms
   - Performance attribution framework
   - Risk monitoring dashboard recommendations
   - Dynamic hedging strategies

7. MARKET OUTLOOK INTEGRATION
   - Macroeconomic scenario analysis
   - Sector rotation strategies
   - Cyclical vs. secular trend positioning
   - Black swan event preparation

Provide quantitative analysis where possible and include advanced investment strategies appropriate for sophisticated investors.`
    }
  };

  /**
   * Initialize the OpenAI client with API key validation
   * @returns {Promise<boolean>} True if initialization successful, false otherwise
   */
  async initialize() {
    try {
      // Validate API key using existing config
      if (!openaiConfig.isReady()) {
        this.initializationError = openaiConfig.getValidationError();
        console.error('ChatGPT Service initialization failed:', this.initializationError);
        return false;
      }

      // Initialize OpenAI client
      this.client = new OpenAI({
        apiKey: openaiConfig.getApiKey()
      });

      // Test the connection with a simple API call
      await this.validateConnection();
      
      this.isInitialized = true;
      this.initializationError = null;
      console.log('ChatGPT Service initialized successfully');
      return true;

    } catch (error) {
      this.initializationError = `Failed to initialize ChatGPT service: ${error.message}`;
      console.error('ChatGPT Service initialization error:', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Validate the API connection by making a test request
   * @returns {Promise<boolean>} True if connection is valid, false otherwise
   */
  async validateConnection() {
    try {
      if (!this.client) {
        throw new Error('OpenAI client not initialized');
      }

      // Make a minimal test request to validate the API key
      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test connection' }],
        max_tokens: 5
      });

      if (!response || !response.choices || response.choices.length === 0) {
        throw new Error('Invalid response from OpenAI API');
      }

      return true;
    } catch (error) {
      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key - authentication failed');
      } else if (error.status === 429) {
        throw new Error('OpenAI API rate limit exceeded');
      } else if (error.status === 500) {
        throw new Error('OpenAI API server error');
      } else {
        throw new Error(`OpenAI API connection failed: ${error.message}`);
      }
    }
  }

  /**
   * Check if the service is ready to handle requests
   * @returns {boolean} True if service is initialized and ready
   */
  isReady() {
    return this.isInitialized && this.client !== null;
  }

  /**
   * Get the current initialization status and any error messages
   * @returns {object} Status object with initialization state and errors
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isReady: this.isReady(),
      error: this.initializationError,
      configStatus: openaiConfig.getConfigurationStatus()
    };
  }

  /**
   * Handle API errors and provide user-friendly error messages
   * @param {Error} error - The error object from OpenAI API
   * @returns {object} Formatted error response
   */
  handleApiError(error) {
    console.error('ChatGPT API Error:', error);

    let userMessage = 'An error occurred while generating your report. Please try again.';
    let errorCode = 'UNKNOWN_ERROR';
    let shouldRetry = false;
    let retryAfter = null;
    let userActions = [];
    let technicalDetails = null;
    let severity = 'error';

    if (error.status) {
      switch (error.status) {
        case 401:
          userMessage = 'AI service authentication failed. The service is temporarily unavailable.';
          errorCode = 'AUTHENTICATION_ERROR';
          shouldRetry = false;
          severity = 'critical';
          userActions = [
            'Please try again in a few minutes',
            'If the problem persists, contact support'
          ];
          technicalDetails = 'OpenAI API key authentication failed';
          break;
        case 429:
          userMessage = 'The AI service is currently experiencing high demand. Your request has been queued.';
          errorCode = 'RATE_LIMIT_ERROR';
          shouldRetry = true;
          retryAfter = this.extractRetryAfterHeader(error) || 60;
          severity = 'warning';
          userActions = [
            `Please wait ${retryAfter} seconds before trying again`,
            'Consider using a basic report type for faster processing',
            'Try again during off-peak hours for better performance'
          ];
          technicalDetails = `Rate limit exceeded. Retry after ${retryAfter} seconds`;
          break;
        case 500:
        case 502:
        case 503:
          userMessage = 'The AI analysis service is temporarily down for maintenance. We\'ll provide a basic analysis instead.';
          errorCode = 'SERVICE_UNAVAILABLE';
          shouldRetry = true;
          retryAfter = 300;
          severity = 'warning';
          userActions = [
            'A simplified analysis will be provided automatically',
            'Try again in 5 minutes for full AI-powered analysis',
            'Check our status page for service updates'
          ];
          technicalDetails = `OpenAI service unavailable (HTTP ${error.status})`;
          break;
        case 400:
          userMessage = 'There was an issue with your investment data format. Please check your input and try again.';
          errorCode = 'INVALID_REQUEST';
          shouldRetry = false;
          severity = 'error';
          userActions = [
            'Ensure all required fields are completed',
            'Check that portfolio data is properly formatted',
            'Try reducing the amount of detailed information'
          ];
          technicalDetails = 'Invalid request format sent to OpenAI API';
          break;
        case 413:
          userMessage = 'Your investment data is too detailed for processing. Please simplify your input.';
          errorCode = 'REQUEST_TOO_LARGE';
          shouldRetry = false;
          severity = 'error';
          userActions = [
            'Reduce the amount of portfolio detail',
            'Use shorter descriptions for your investment goals',
            'Try a basic report type instead of advanced'
          ];
          technicalDetails = 'Request payload too large for OpenAI API';
          break;
        default:
          userMessage = `AI service error (${error.status}). Please try again or contact support.`;
          errorCode = 'API_ERROR';
          shouldRetry = error.status >= 500;
          severity = error.status >= 500 ? 'warning' : 'error';
          userActions = [
            'Try again in a few minutes',
            'If the problem continues, contact support with error code'
          ];
          technicalDetails = `HTTP ${error.status}: ${error.message}`;
      }
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      userMessage = 'Unable to connect to the AI service. Please check your internet connection.';
      errorCode = 'CONNECTION_ERROR';
      shouldRetry = true;
      retryAfter = 30;
      severity = 'warning';
      userActions = [
        'Check your internet connection',
        'Try refreshing the page',
        'If your connection is stable, this may be a temporary service issue'
      ];
      technicalDetails = 'Network connection failed to OpenAI API';
    } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      userMessage = 'The AI analysis is taking longer than expected. Please try with simpler data.';
      errorCode = 'TIMEOUT_ERROR';
      shouldRetry = true;
      retryAfter = 120;
      severity = 'warning';
      userActions = [
        'Try using a basic report type for faster processing',
        'Reduce the amount of portfolio data',
        'Simplify your investment goals description'
      ];
      technicalDetails = 'Request timeout to OpenAI API';
    }

    return {
      success: false,
      error: {
        code: errorCode,
        message: userMessage,
        originalError: error.message,
        shouldRetry: shouldRetry,
        retryAfter: retryAfter,
        severity: severity,
        userActions: userActions,
        technicalDetails: technicalDetails,
        timestamp: new Date().toISOString(),
        errorId: this.generateErrorId()
      }
    };
  }

  /**
   * Generate a unique error ID for tracking
   * @returns {string} Unique error identifier
   */
  generateErrorId() {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `err_${timestamp}_${randomStr}`;
  }

  /**
   * Ensure the service is initialized before making API calls
   * @returns {Promise<boolean>} True if ready, false otherwise
   */
  async ensureInitialized() {
    if (!this.isReady()) {
      console.log('ChatGPT Service not initialized, attempting initialization...');
      return await this.initialize();
    }
    return true;
  }

  /**
   * Format investment data into a structured prompt for ChatGPT
   * @param {object} investmentData - User's investment data
   * @param {string} reportType - Type of report (basic, intermediate, advanced)
   * @param {object} userPreferences - User's analysis preferences
   * @returns {object} Formatted prompt with system and user messages
   */
  formatPrompt(investmentData, reportType = 'basic', userPreferences = {}) {
    try {
      // Validate report type
      if (!ChatGPTService.PROMPT_TEMPLATES[reportType]) {
        throw new Error(`Invalid report type: ${reportType}. Must be 'basic', 'intermediate', or 'advanced'`);
      }

      const template = ChatGPTService.PROMPT_TEMPLATES[reportType];
      
      // Prepare data for prompt substitution
      const promptData = {
        portfolio: this.formatPortfolioData(investmentData.portfolio || {}),
        goals: investmentData.goals || 'Not specified',
        riskTolerance: investmentData.riskTolerance || 'Not specified',
        timeHorizon: investmentData.timeHorizon || 'Not specified',
        age: investmentData.age || 'Not specified',
        income: investmentData.income || 'Not specified',
        netWorth: investmentData.netWorth || 'Not specified',
        experience: investmentData.experience || 'Not specified',
        taxSituation: investmentData.taxSituation || 'Not specified',
        focusAreas: this.formatFocusAreas(userPreferences.focusAreas || []),
        marketOutlook: userPreferences.marketOutlook || 'Neutral'
      };

      // Replace placeholders in the template
      let formattedPrompt = template.userPromptTemplate;
      Object.keys(promptData).forEach(key => {
        const placeholder = `{${key}}`;
        formattedPrompt = formattedPrompt.replace(new RegExp(placeholder, 'g'), promptData[key]);
      });

      return {
        systemPrompt: template.systemPrompt,
        userPrompt: formattedPrompt,
        reportType: reportType,
        metadata: {
          timestamp: new Date().toISOString(),
          dataFields: Object.keys(promptData),
          preferences: userPreferences
        }
      };

    } catch (error) {
      console.error('Error formatting prompt:', error);
      throw new Error(`Failed to format investment analysis prompt: ${error.message}`);
    }
  }

  /**
   * Format portfolio data for inclusion in prompts
   * @param {object} portfolio - Portfolio holdings data
   * @returns {string} Formatted portfolio description
   */
  formatPortfolioData(portfolio) {
    try {
      if (!portfolio || typeof portfolio !== 'object') {
        return 'No portfolio data provided';
      }

      const holdings = portfolio.holdings || [];
      if (holdings.length === 0) {
        return 'No specific holdings provided';
      }

      let formatted = 'Portfolio Holdings:\n';
      holdings.forEach((holding, index) => {
        formatted += `${index + 1}. ${holding.name || 'Unknown'} (${holding.symbol || 'N/A'})\n`;
        formatted += `   - Type: ${holding.type || 'Not specified'}\n`;
        formatted += `   - Value: ${holding.value || 'Not specified'}\n`;
        formatted += `   - Percentage: ${holding.percentage || 'Not specified'}%\n`;
        if (holding.description) {
          formatted += `   - Notes: ${holding.description}\n`;
        }
        formatted += '\n';
      });

      // Add portfolio summary if available
      if (portfolio.totalValue) {
        formatted += `Total Portfolio Value: ${portfolio.totalValue}\n`;
      }
      if (portfolio.lastUpdated) {
        formatted += `Last Updated: ${portfolio.lastUpdated}\n`;
      }

      return formatted.trim();

    } catch (error) {
      console.error('Error formatting portfolio data:', error);
      return 'Error formatting portfolio data';
    }
  }

  /**
   * Format user focus areas for inclusion in prompts
   * @param {array} focusAreas - Array of user's preferred focus areas
   * @returns {string} Formatted focus areas description
   */
  formatFocusAreas(focusAreas) {
    try {
      if (!Array.isArray(focusAreas) || focusAreas.length === 0) {
        return 'No specific focus areas specified - provide general analysis';
      }

      return `Please pay special attention to: ${focusAreas.join(', ')}`;

    } catch (error) {
      console.error('Error formatting focus areas:', error);
      return 'General analysis requested';
    }
  }

  /**
   * Validate investment data completeness and provide guidance
   * @param {object} investmentData - User's investment data
   * @returns {object} Validation result with suggestions
   */
  validateInvestmentData(investmentData) {
    const validation = {
      isValid: true,
      warnings: [],
      suggestions: [],
      completeness: 0
    };

    const requiredFields = ['goals', 'riskTolerance', 'timeHorizon'];
    const optionalFields = ['age', 'income', 'experience', 'portfolio'];
    const totalFields = requiredFields.length + optionalFields.length;
    let providedFields = 0;

    // Check required fields
    requiredFields.forEach(field => {
      if (!investmentData[field] || investmentData[field].trim() === '') {
        validation.warnings.push(`Missing required field: ${field}`);
        validation.isValid = false;
      } else {
        providedFields++;
      }
    });

    // Check optional fields
    optionalFields.forEach(field => {
      if (investmentData[field] && investmentData[field] !== '') {
        providedFields++;
      }
    });

    validation.completeness = Math.round((providedFields / totalFields) * 100);

    // Provide suggestions based on completeness
    if (validation.completeness < 50) {
      validation.suggestions.push('Consider providing more investment details for a more comprehensive analysis');
    }
    if (!investmentData.portfolio || !investmentData.portfolio.holdings) {
      validation.suggestions.push('Adding specific portfolio holdings will enable detailed asset allocation analysis');
    }
    if (!investmentData.age) {
      validation.suggestions.push('Age information helps determine appropriate investment timeline and risk tolerance');
    }
    if (!investmentData.income) {
      validation.suggestions.push('Income information enables better savings and investment capacity analysis');
    }

    return validation;
  }

  /**
   * Generate an investment analysis report using ChatGPT API with queue management
   * @param {object} investmentData - User's investment data
   * @param {string} reportType - Type of report (basic, intermediate, advanced)
   * @param {object} userPreferences - User's analysis preferences
   * @param {string} userId - User ID for tracking
   * @param {string} userEmail - User email for tracking
   * @returns {Promise<object>} Generated report or error response
   */
  async generateInvestmentReport(investmentData, reportType = 'basic', userPreferences = {}, userId = null, userEmail = null) {
    // Check if we should queue this request
    if (this.shouldQueueRequest()) {
      return this.queueRequest(investmentData, reportType, userPreferences, userId, userEmail);
    }
    
    return this.processReportRequest(investmentData, reportType, userPreferences, userId, userEmail);
  }

  /**
   * Process a report generation request
   * @param {object} investmentData - User's investment data
   * @param {string} reportType - Type of report (basic, intermediate, advanced)
   * @param {object} userPreferences - User's analysis preferences
   * @param {string} userId - User ID for tracking
   * @param {string} userEmail - User email for tracking
   * @returns {Promise<object>} Generated report or error response
   */
  async processReportRequest(investmentData, reportType = 'basic', userPreferences = {}, userId = null, userEmail = null) {
    const startTime = Date.now();
    let tokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    let success = false;
    let errorCode = null;
    let errorMessage = null;

    try {
      // Ensure service is initialized
      if (!(await this.ensureInitialized())) {
        errorCode = 'SERVICE_NOT_INITIALIZED';
        errorMessage = 'ChatGPT service is not properly initialized';
        return {
          success: false,
          error: {
            code: errorCode,
            message: errorMessage,
            originalError: this.initializationError
          }
        };
      }

      // Validate investment data
      const validation = this.validateInvestmentData(investmentData);
      if (!validation.isValid) {
        errorCode = 'INVALID_INPUT_DATA';
        errorMessage = 'Investment data validation failed';
        return {
          success: false,
          error: {
            code: errorCode,
            message: errorMessage,
            details: validation.warnings,
            suggestions: validation.suggestions
          }
        };
      }

      // Format the prompt
      const promptData = this.formatPrompt(investmentData, reportType, userPreferences);
      
      // Make the API request with retry logic
      const response = await this.makeApiRequestWithRetry(promptData, userPreferences);
      
      if (!response.success) {
        errorCode = response.error?.code || 'API_REQUEST_FAILED';
        errorMessage = response.error?.message || 'API request failed';
        
        // Check if we should provide graceful degradation
        if (this.shouldProvideDegradedService(response.error)) {
          console.log('Providing graceful degradation due to API failure');
          return this.gracefulDegradation(investmentData, reportType, userPreferences);
        }
        
        return response;
      }

      // Parse and format the response
      const formattedReport = this.parseInvestmentReport(response.data, reportType);
      
      // Extract token usage from response
      tokenUsage = response.tokenUsage || tokenUsage;
      success = true;

      const result = {
        success: true,
        data: {
          report: formattedReport,
          metadata: {
            reportType: reportType,
            generatedAt: new Date().toISOString(),
            processingTime: response.processingTime,
            tokenUsage: tokenUsage,
            dataCompleteness: validation.completeness,
            preferences: userPreferences
          }
        }
      };

      return result;

    } catch (error) {
      console.error('Error generating investment report:', error);
      errorCode = 'UNEXPECTED_ERROR';
      errorMessage = error.message;
      return this.handleApiError(error);
    } finally {
      // Log usage regardless of success/failure
      if (userId) {
        const processingTime = Date.now() - startTime;
        const estimatedCost = usageTrackingService.calculateCost(
          tokenUsage.promptTokens,
          tokenUsage.completionTokens,
          userPreferences.model || 'gpt-4'
        );

        await usageTrackingService.logApiUsage({
          userId: userId,
          userEmail: userEmail,
          endpoint: '/api/generate-investment-report',
          reportType: reportType,
          promptTokens: tokenUsage.promptTokens,
          completionTokens: tokenUsage.completionTokens,
          totalTokens: tokenUsage.totalTokens,
          estimatedCost: estimatedCost,
          model: userPreferences.model || 'gpt-4',
          processingTime: processingTime,
          requestStartTime: new Date(startTime).toISOString(),
          requestEndTime: new Date().toISOString(),
          success: success,
          errorCode: errorCode,
          errorMessage: errorMessage,
          dataCompleteness: validation?.completeness || 0
        });
      }
    }
  }

  /**
   * Make API request to ChatGPT with comprehensive retry logic and exponential backoff
   * @param {object} promptData - Formatted prompt data
   * @param {object} options - Request options and preferences
   * @returns {Promise<object>} API response or error
   */
  async makeApiRequestWithRetry(promptData, options = {}) {
    const maxRetries = options.maxRetries || 5;
    const baseDelay = options.baseDelay || 1000; // 1 second
    const maxDelay = options.maxDelay || 60000; // 60 seconds
    const jitterFactor = options.jitterFactor || 0.1;
    const timeoutMs = options.timeoutMs || 120000; // 2 minutes
    
    let lastError = null;
    let retryableErrors = 0;
    const startTime = Date.now();
    const retryHistory = [];

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const attemptStartTime = Date.now();
      
      try {
        console.log(`Making ChatGPT API request (attempt ${attempt + 1}/${maxRetries + 1})`);
        
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
        });
        
        // Create API request promise
        const apiPromise = this.client.chat.completions.create({
          model: options.model || 'gpt-4',
          messages: [
            { role: 'system', content: promptData.systemPrompt },
            { role: 'user', content: promptData.userPrompt }
          ],
          max_tokens: options.maxTokens || 4000,
          temperature: options.temperature || 0.7,
          top_p: options.topP || 1,
          frequency_penalty: options.frequencyPenalty || 0,
          presence_penalty: options.presencePenalty || 0
        });

        // Race between API call and timeout
        const response = await Promise.race([apiPromise, timeoutPromise]);
        const attemptTime = Date.now() - attemptStartTime;
        const totalTime = Date.now() - startTime;
        
        // Validate response
        if (!response || !response.choices || response.choices.length === 0) {
          throw new Error('Invalid response from OpenAI API - no choices returned');
        }

        const content = response.choices[0].message?.content;
        if (!content || content.trim() === '') {
          throw new Error('Empty response content from OpenAI API');
        }

        console.log(`ChatGPT API request successful (${totalTime}ms, attempt ${attempt + 1})`);
        
        return {
          success: true,
          data: {
            content: content,
            finishReason: response.choices[0].finish_reason
          },
          processingTime: totalTime,
          attemptTime: attemptTime,
          tokenUsage: {
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
            totalTokens: response.usage?.total_tokens || 0
          },
          attempt: attempt + 1,
          retryHistory: retryHistory
        };

      } catch (error) {
        lastError = error;
        const attemptTime = Date.now() - attemptStartTime;
        
        // Record retry attempt
        retryHistory.push({
          attempt: attempt + 1,
          error: error.message,
          errorCode: error.status || error.code,
          attemptTime: attemptTime,
          timestamp: new Date().toISOString()
        });
        
        console.error(`ChatGPT API request failed (attempt ${attempt + 1}):`, error.message);

        // Determine if error is retryable
        const isRetryable = this.isRetryableError(error);
        if (!isRetryable) {
          console.log('Non-retryable error encountered, stopping retries');
          break;
        }
        
        retryableErrors++;

        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff, jitter, and rate limit handling
        let delay = this.calculateRetryDelay(attempt, baseDelay, maxDelay, jitterFactor, error);
        
        // Special handling for rate limits
        if (error.status === 429) {
          const retryAfter = this.extractRetryAfterHeader(error);
          if (retryAfter) {
            delay = Math.max(delay, retryAfter * 1000);
          }
        }

        console.log(`Retrying in ${delay}ms... (${retryableErrors} retryable errors so far)`);
        await this.sleep(delay);
      }
    }

    // All retries failed
    console.error(`All ChatGPT API retry attempts failed after ${maxRetries + 1} attempts. Last error:`, lastError);
    
    // Enhanced error response with retry history
    const errorResponse = this.handleApiError(lastError);
    errorResponse.retryHistory = retryHistory;
    errorResponse.totalRetries = maxRetries + 1;
    errorResponse.retryableErrors = retryableErrors;
    errorResponse.totalProcessingTime = Date.now() - startTime;
    
    return errorResponse;
  }

  /**
   * Determine if an error is retryable
   * @param {Error} error - Error object
   * @returns {boolean} True if error should be retried
   */
  isRetryableError(error) {
    // Non-retryable errors (client errors)
    if (error.status === 400 || error.status === 401 || error.status === 403) {
      return false;
    }
    
    // Retryable errors (server errors, rate limits, timeouts)
    if (error.status === 429 || error.status === 500 || error.status === 502 || 
        error.status === 503 || error.status === 504) {
      return true;
    }
    
    // Network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || 
        error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      return true;
    }
    
    // Default to non-retryable for unknown errors
    return false;
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   * @param {number} attempt - Current attempt number (0-based)
   * @param {number} baseDelay - Base delay in milliseconds
   * @param {number} maxDelay - Maximum delay in milliseconds
   * @param {number} jitterFactor - Jitter factor (0-1)
   * @param {Error} error - Error that caused the retry
   * @returns {number} Delay in milliseconds
   */
  calculateRetryDelay(attempt, baseDelay, maxDelay, jitterFactor, error) {
    // Base exponential backoff
    let delay = baseDelay * Math.pow(2, attempt);
    
    // Add jitter to prevent thundering herd
    const jitter = delay * jitterFactor * Math.random();
    delay += jitter;
    
    // Special handling for different error types
    if (error.status === 429) {
      // Rate limit: use longer delays
      delay = Math.max(delay, baseDelay * Math.pow(3, attempt));
    } else if (error.status >= 500) {
      // Server errors: moderate backoff
      delay = Math.max(delay, baseDelay * Math.pow(2.5, attempt));
    }
    
    // Cap at maximum delay
    return Math.min(delay, maxDelay);
  }

  /**
   * Extract retry-after header from rate limit errors
   * @param {Error} error - Error object
   * @returns {number|null} Retry after seconds, or null if not found
   */
  extractRetryAfterHeader(error) {
    try {
      if (error.response && error.response.headers) {
        const retryAfter = error.response.headers['retry-after'];
        if (retryAfter) {
          const seconds = parseInt(retryAfter);
          return isNaN(seconds) ? null : seconds;
        }
      }
    } catch (e) {
      // Ignore header parsing errors
    }
    return null;
  }

  /**
   * Parse and structure the ChatGPT response into a formatted investment report
   * @param {object} responseData - Raw response from ChatGPT API
   * @param {string} reportType - Type of report for formatting context
   * @returns {object} Structured investment report
   */
  parseInvestmentReport(responseData, reportType) {
    try {
      const content = responseData.content;
      
      // Basic parsing - split content into sections
      const sections = this.extractReportSections(content);
      
      return {
        title: `Investment Analysis Report - ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Level`,
        summary: sections.summary || sections.executiveSummary || 'Summary not available',
        fullContent: content,
        sections: sections,
        reportType: reportType,
        finishReason: responseData.finishReason,
        contentLength: content.length,
        wordCount: content.split(/\s+/).length
      };

    } catch (error) {
      console.error('Error parsing investment report:', error);
      return {
        title: `Investment Analysis Report - ${reportType}`,
        summary: 'Error parsing report content',
        fullContent: responseData.content || 'No content available',
        sections: {},
        reportType: reportType,
        error: error.message
      };
    }
  }

  /**
   * Extract structured sections from the ChatGPT response content
   * @param {string} content - Raw content from ChatGPT
   * @returns {object} Extracted sections
   */
  extractReportSections(content) {
    const sections = {};
    
    try {
      // Common section headers to look for
      const sectionPatterns = [
        { key: 'summary', patterns: ['EXECUTIVE SUMMARY', 'PORTFOLIO SUMMARY', 'SUMMARY'] },
        { key: 'analysis', patterns: ['PORTFOLIO ANALYSIS', 'DETAILED ANALYSIS', 'ANALYSIS'] },
        { key: 'riskAssessment', patterns: ['RISK ASSESSMENT', 'RISK ANALYSIS', 'RISK MANAGEMENT'] },
        { key: 'recommendations', patterns: ['RECOMMENDATIONS', 'STRATEGIC RECOMMENDATIONS', 'NEXT STEPS'] },
        { key: 'implementation', patterns: ['IMPLEMENTATION', 'ACTION PLAN', 'IMPLEMENTATION PLAN'] },
        { key: 'monitoring', patterns: ['MONITORING', 'REVIEW SCHEDULE', 'PERFORMANCE TRACKING'] }
      ];

      // Split content into lines for processing
      const lines = content.split('\n');
      let currentSection = null;
      let currentContent = [];

      lines.forEach(line => {
        const trimmedLine = line.trim();
        
        // Check if this line is a section header
        let foundSection = null;
        sectionPatterns.forEach(pattern => {
          pattern.patterns.forEach(patternText => {
            if (trimmedLine.toUpperCase().includes(patternText)) {
              foundSection = pattern.key;
            }
          });
        });

        if (foundSection) {
          // Save previous section if it exists
          if (currentSection && currentContent.length > 0) {
            sections[currentSection] = currentContent.join('\n').trim();
          }
          
          // Start new section
          currentSection = foundSection;
          currentContent = [];
        } else if (currentSection && trimmedLine !== '') {
          // Add content to current section
          currentContent.push(line);
        }
      });

      // Save the last section
      if (currentSection && currentContent.length > 0) {
        sections[currentSection] = currentContent.join('\n').trim();
      }

      // If no sections were found, treat the entire content as summary
      if (Object.keys(sections).length === 0) {
        sections.summary = content;
      }

    } catch (error) {
      console.error('Error extracting report sections:', error);
      sections.summary = content;
    }

    return sections;
  }

  /**
   * Check if request should be queued based on current load
   * @returns {boolean} True if request should be queued
   */
  shouldQueueRequest() {
    return this.activeRequests >= this.maxConcurrentRequests;
  }

  /**
   * Queue a request for later processing
   * @param {object} investmentData - User's investment data
   * @param {string} reportType - Type of report
   * @param {object} userPreferences - User preferences
   * @param {string} userId - User ID
   * @param {string} userEmail - User email
   * @returns {Promise<object>} Promise that resolves when request is processed
   */
  async queueRequest(investmentData, reportType, userPreferences, userId, userEmail) {
    return new Promise((resolve, reject) => {
      const queueItem = {
        id: `req_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        investmentData,
        reportType,
        userPreferences,
        userId,
        userEmail,
        queuedAt: Date.now(),
        resolve,
        reject,
        priority: this.calculateRequestPriority(reportType, userPreferences)
      };

      // Add to queue with priority sorting
      this.requestQueue.push(queueItem);
      this.requestQueue.sort((a, b) => b.priority - a.priority);
      
      // Update stats
      this.queueStats.totalQueued++;
      this.queueStats.maxQueueSize = Math.max(this.queueStats.maxQueueSize, this.requestQueue.length);
      
      console.log(`Request queued (${this.requestQueue.length} in queue, ${this.activeRequests} active)`);
      
      // Start queue processing if not already running
      this.startQueueProcessing();
      
      // Set timeout for queued requests
      setTimeout(() => {
        const index = this.requestQueue.findIndex(item => item.id === queueItem.id);
        if (index !== -1) {
          this.requestQueue.splice(index, 1);
          reject(new Error('Request timeout in queue'));
        }
      }, 300000); // 5 minute timeout
    });
  }

  /**
   * Calculate request priority based on report type and preferences
   * @param {string} reportType - Report type
   * @param {object} userPreferences - User preferences
   * @returns {number} Priority score (higher = more priority)
   */
  calculateRequestPriority(reportType, userPreferences) {
    let priority = 0;
    
    // Basic reports get higher priority (faster to process)
    if (reportType === 'basic') priority += 3;
    else if (reportType === 'intermediate') priority += 2;
    else if (reportType === 'advanced') priority += 1;
    
    // Premium users get higher priority
    if (userPreferences.isPremium) priority += 2;
    
    // Retry requests get higher priority
    if (userPreferences.isRetry) priority += 1;
    
    return priority;
  }

  /**
   * Start processing the request queue
   */
  startQueueProcessing() {
    if (this.queueProcessingInterval) {
      return; // Already running
    }
    
    this.queueProcessingInterval = setInterval(() => {
      this.processQueue();
    }, 1000); // Check every second
  }

  /**
   * Process queued requests
   */
  async processQueue() {
    if (this.requestQueue.length === 0) {
      // Stop processing if queue is empty
      if (this.queueProcessingInterval) {
        clearInterval(this.queueProcessingInterval);
        this.queueProcessingInterval = null;
      }
      return;
    }
    
    // Process requests up to the concurrent limit
    while (this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrentRequests) {
      const queueItem = this.requestQueue.shift();
      const waitTime = Date.now() - queueItem.queuedAt;
      
      // Update average wait time
      this.queueStats.averageWaitTime = 
        (this.queueStats.averageWaitTime * this.queueStats.totalProcessed + waitTime) / 
        (this.queueStats.totalProcessed + 1);
      this.queueStats.totalProcessed++;
      
      console.log(`Processing queued request (waited ${waitTime}ms)`);
      
      // Process the request
      this.activeRequests++;
      this.processReportRequest(
        queueItem.investmentData,
        queueItem.reportType,
        queueItem.userPreferences,
        queueItem.userId,
        queueItem.userEmail
      ).then(result => {
        this.activeRequests--;
        queueItem.resolve(result);
      }).catch(error => {
        this.activeRequests--;
        queueItem.reject(error);
      });
    }
  }

  /**
   * Get queue statistics
   * @returns {object} Queue statistics
   */
  getQueueStats() {
    return {
      ...this.queueStats,
      currentQueueSize: this.requestQueue.length,
      activeRequests: this.activeRequests,
      maxConcurrentRequests: this.maxConcurrentRequests
    };
  }

  /**
   * Graceful degradation when API is unavailable
   * @param {object} investmentData - User's investment data
   * @param {string} reportType - Report type
   * @param {object} userPreferences - User preferences
   * @returns {object} Degraded service response
   */
  async gracefulDegradation(investmentData, reportType, userPreferences) {
    console.log('Providing graceful degradation response');
    
    const degradedReport = {
      title: `Investment Analysis Summary - ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Level (Limited Service)`,
      summary: 'AI service temporarily unavailable - Basic analysis provided',
      fullContent: this.generateBasicAnalysis(investmentData),
      sections: {
        summary: 'The AI-powered analysis service is currently experiencing high demand. Below is a basic assessment based on your provided information.',
        recommendations: this.generateBasicRecommendations(investmentData, reportType),
        notice: 'For a comprehensive AI-powered analysis, please try again in a few minutes when service capacity is available.'
      },
      reportType: reportType,
      degraded: true,
      degradationReason: 'SERVICE_OVERLOADED',
      contentLength: 0,
      wordCount: 0
    };
    
    degradedReport.fullContent = `# ${degradedReport.title}\n\n${degradedReport.sections.summary}\n\n## Basic Analysis\n\n${this.generateBasicAnalysis(investmentData)}\n\n## Recommendations\n\n${degradedReport.sections.recommendations}\n\n## Notice\n\n${degradedReport.sections.notice}`;
    degradedReport.contentLength = degradedReport.fullContent.length;
    degradedReport.wordCount = degradedReport.fullContent.split(/\s+/).length;
    
    return {
      success: true,
      data: {
        report: degradedReport,
        metadata: {
          reportType: reportType,
          generatedAt: new Date().toISOString(),
          processingTime: 100, // Minimal processing time
          degraded: true,
          degradationReason: 'SERVICE_OVERLOADED',
          tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          dataCompleteness: this.calculateDataCompleteness(investmentData),
          preferences: userPreferences
        }
      }
    };
  }

  /**
   * Generate basic analysis for degraded service
   * @param {object} investmentData - Investment data
   * @returns {string} Basic analysis text
   */
  generateBasicAnalysis(investmentData) {
    let analysis = '';
    
    if (investmentData.goals) {
      analysis += `**Investment Goals:** ${investmentData.goals}\n\n`;
    }
    
    if (investmentData.riskTolerance) {
      analysis += `**Risk Tolerance:** ${investmentData.riskTolerance}\n\n`;
      
      // Basic risk assessment
      if (investmentData.riskTolerance.toLowerCase().includes('conservative')) {
        analysis += 'Based on your conservative risk tolerance, consider focusing on stable, income-generating investments such as bonds, dividend-paying stocks, and balanced funds.\n\n';
      } else if (investmentData.riskTolerance.toLowerCase().includes('aggressive')) {
        analysis += 'Given your aggressive risk tolerance, you may consider growth-oriented investments such as growth stocks, emerging market funds, and technology sector investments.\n\n';
      } else {
        analysis += 'With a moderate risk tolerance, a balanced approach combining growth and income investments may be appropriate.\n\n';
      }
    }
    
    if (investmentData.timeHorizon) {
      analysis += `**Time Horizon:** ${investmentData.timeHorizon}\n\n`;
      
      // Basic time horizon guidance
      const timeText = investmentData.timeHorizon.toLowerCase();
      if (timeText.includes('short') || timeText.includes('1') || timeText.includes('2')) {
        analysis += 'With a shorter time horizon, focus on capital preservation and liquidity. Consider money market funds, short-term bonds, and stable value funds.\n\n';
      } else if (timeText.includes('long') || timeText.includes('10') || timeText.includes('20')) {
        analysis += 'Your longer time horizon allows for more growth-oriented strategies. Consider a higher allocation to stocks and equity funds.\n\n';
      }
    }
    
    if (investmentData.portfolio && investmentData.portfolio.holdings) {
      analysis += `**Portfolio Holdings:** ${investmentData.portfolio.holdings.length} holdings identified\n\n`;
      analysis += 'For detailed portfolio analysis including asset allocation, diversification assessment, and specific recommendations, please try again when the full AI service is available.\n\n';
    }
    
    analysis += '**Important:** This is a simplified analysis. For comprehensive investment advice tailored to your specific situation, please try again when our full AI analysis service is available or consult with a qualified financial advisor.';
    
    return analysis;
  }

  /**
   * Generate basic recommendations for degraded service
   * @param {object} investmentData - Investment data
   * @param {string} reportType - Report type
   * @returns {string} Basic recommendations
   */
  generateBasicRecommendations(investmentData, reportType) {
    const recommendations = [];
    
    // Risk-based recommendations
    if (investmentData.riskTolerance) {
      const risk = investmentData.riskTolerance.toLowerCase();
      if (risk.includes('conservative')) {
        recommendations.push('Consider a portfolio allocation of 30-40% stocks, 50-60% bonds, and 10% cash equivalents');
        recommendations.push('Focus on dividend-paying stocks and high-grade corporate bonds');
      } else if (risk.includes('aggressive')) {
        recommendations.push('Consider a portfolio allocation of 80-90% stocks, 10-15% bonds, and minimal cash');
        recommendations.push('Explore growth stocks, international markets, and sector-specific ETFs');
      } else {
        recommendations.push('Consider a balanced portfolio allocation of 60% stocks, 35% bonds, and 5% cash');
        recommendations.push('Mix growth and value investments across different sectors');
      }
    }
    
    // Time horizon recommendations
    if (investmentData.timeHorizon) {
      const timeText = investmentData.timeHorizon.toLowerCase();
      if (timeText.includes('short') || timeText.includes('1') || timeText.includes('2')) {
        recommendations.push('Prioritize capital preservation and liquidity over growth');
        recommendations.push('Consider CDs, money market accounts, and short-term Treasury bills');
      } else if (timeText.includes('long') || timeText.includes('10') || timeText.includes('20')) {
        recommendations.push('Take advantage of compound growth with long-term equity investments');
        recommendations.push('Consider dollar-cost averaging into broad market index funds');
      }
    }
    
    // General recommendations
    recommendations.push('Diversify across different asset classes, sectors, and geographic regions');
    recommendations.push('Review and rebalance your portfolio regularly (quarterly or semi-annually)');
    recommendations.push('Consider tax-advantaged accounts (401k, IRA, Roth IRA) for retirement savings');
    recommendations.push('Maintain an emergency fund of 3-6 months of expenses in liquid savings');
    
    if (reportType === 'advanced') {
      recommendations.push('Consider tax-loss harvesting strategies to optimize after-tax returns');
      recommendations.push('Evaluate alternative investments (REITs, commodities) for additional diversification');
    }
    
    recommendations.push('**Important:** These are general guidelines. For personalized advice, consult with a qualified financial advisor or try again when our full AI analysis service is available.');
    
    return recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n\n');
  }

  /**
   * Calculate data completeness score
   * @param {object} investmentData - Investment data
   * @returns {number} Completeness percentage
   */
  calculateDataCompleteness(investmentData) {
    const fields = ['goals', 'riskTolerance', 'timeHorizon', 'age', 'income', 'portfolio'];
    let completedFields = 0;
    
    fields.forEach(field => {
      if (investmentData[field] && investmentData[field] !== '') {
        completedFields++;
      }
    });
    
    return Math.round((completedFields / fields.length) * 100);
  }

  /**
   * Determine if graceful degradation should be provided
   * @param {object} error - Error object
   * @returns {boolean} True if degraded service should be provided
   */
  shouldProvideDegradedService(error) {
    // Provide degraded service for temporary issues
    const degradableErrors = [
      'SERVICE_UNAVAILABLE',
      'RATE_LIMIT_ERROR', 
      'TIMEOUT_ERROR',
      'CONNECTION_ERROR',
      'GENERATION_FAILED'
    ];
    
    return degradableErrors.includes(error.code);
  }

  /**
   * Utility function to sleep for a specified duration
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Promise that resolves after the specified time
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get estimated token count for a text string (rough approximation)
   * @param {string} text - Text to estimate tokens for
   * @returns {number} Estimated token count
   */
  estimateTokenCount(text) {
    // Rough approximation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if a request would exceed token limits and suggest optimizations
   * @param {object} promptData - Formatted prompt data
   * @param {object} options - Request options
   * @returns {object} Token analysis and suggestions
   */
  analyzeTokenUsage(promptData, options = {}) {
    const systemTokens = this.estimateTokenCount(promptData.systemPrompt);
    const userTokens = this.estimateTokenCount(promptData.userPrompt);
    const totalInputTokens = systemTokens + userTokens;
    const maxTokens = options.maxTokens || 4000;
    const modelLimit = options.modelLimit || 8192; // Default for gpt-4

    const analysis = {
      estimatedInputTokens: totalInputTokens,
      requestedOutputTokens: maxTokens,
      estimatedTotalTokens: totalInputTokens + maxTokens,
      modelLimit: modelLimit,
      withinLimits: (totalInputTokens + maxTokens) <= modelLimit,
      suggestions: []
    };

    if (!analysis.withinLimits) {
      analysis.suggestions.push('Request may exceed model token limits');
      analysis.suggestions.push('Consider reducing portfolio detail or using a shorter report type');
    }

    if (totalInputTokens > modelLimit * 0.7) {
      analysis.suggestions.push('Input prompt is quite long - consider summarizing portfolio data');
    }

    return analysis;
  }
}

// Create and export singleton instance
const chatGPTService = new ChatGPTService();

export default chatGPTService;
export { ChatGPTService };