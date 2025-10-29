/**
 * Usage Tracking Service for ChatGPT API calls and monitoring
 * Handles logging, performance monitoring, and error rate tracking
 */

import { getDatabase } from './database.js';

class UsageTrackingService {
  constructor() {
    this.db = null;
    this.performanceMetrics = {
      totalRequests: 0,
      totalErrors: 0,
      totalProcessingTime: 0,
      averageResponseTime: 0,
      errorRate: 0
    };
    this.recentActivity = [];
    this.maxRecentActivity = 100;
  }

  /**
   * Initialize the service with database connection
   */
  async initialize() {
    try {
      this.db = getDatabase();
      console.log('Usage tracking service initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize usage tracking service:', error);
      return false;
    }
  }

  /**
   * Log ChatGPT API usage with detailed metrics
   * @param {object} usageData - Usage data to log
   * @returns {Promise<object>} Log result
   */
  async logApiUsage(usageData) {
    try {
      if (!this.db) {
        await this.initialize();
      }

      const logEntry = {
        userId: usageData.userId,
        userEmail: usageData.userEmail || 'unknown',
        action: 'chatgpt_api_call',
        endpoint: usageData.endpoint || '/api/generate-investment-report',
        reportType: usageData.reportType || 'basic',
        
        // Token usage
        promptTokens: usageData.promptTokens || 0,
        completionTokens: usageData.completionTokens || 0,
        totalTokens: usageData.totalTokens || 0,
        
        // Cost calculation
        estimatedCost: usageData.estimatedCost || 0,
        model: usageData.model || 'gpt-4',
        
        // Performance metrics
        processingTime: usageData.processingTime || 0,
        requestStartTime: usageData.requestStartTime || new Date().toISOString(),
        requestEndTime: usageData.requestEndTime || new Date().toISOString(),
        
        // Request details
        success: usageData.success !== false,
        errorCode: usageData.errorCode || null,
        errorMessage: usageData.errorMessage || null,
        retryAttempts: usageData.retryAttempts || 0,
        
        // System info
        ipAddress: usageData.ipAddress || 'unknown',
        userAgent: usageData.userAgent || 'unknown',
        
        // Additional metadata
        dataCompleteness: usageData.dataCompleteness || 0,
        reportQuality: usageData.reportQuality || 0,
        
        timestamp: new Date().toISOString()
      };

      // Log to database
      const result = await this.db.logTokenUsage(logEntry);
      
      if (result.success) {
        // Update in-memory metrics
        this.updatePerformanceMetrics(logEntry);
        this.addToRecentActivity(logEntry);
        
        console.log(`API usage logged: ${logEntry.userId} - ${logEntry.reportType} - ${logEntry.totalTokens} tokens`);
      }

      return result;
    } catch (error) {
      console.error('Error logging API usage:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Log report generation performance metrics
   * @param {object} performanceData - Performance data
   * @returns {Promise<object>} Log result
   */
  async logReportGeneration(performanceData) {
    try {
      if (!this.db) {
        await this.initialize();
      }

      const logEntry = {
        userId: performanceData.userId,
        userEmail: performanceData.userEmail || 'unknown',
        action: 'report_generation',
        reportType: performanceData.reportType || 'basic',
        
        // Performance metrics
        totalProcessingTime: performanceData.totalProcessingTime || 0,
        chatgptProcessingTime: performanceData.chatgptProcessingTime || 0,
        dataProcessingTime: performanceData.dataProcessingTime || 0,
        storageTime: performanceData.storageTime || 0,
        
        // Quality metrics
        reportWordCount: performanceData.reportWordCount || 0,
        reportQualityScore: performanceData.reportQualityScore || 0,
        dataCompletenessScore: performanceData.dataCompletenessScore || 0,
        
        // Success/failure tracking
        success: performanceData.success !== false,
        errorStage: performanceData.errorStage || null,
        errorCode: performanceData.errorCode || null,
        
        // System info
        ipAddress: performanceData.ipAddress || 'unknown',
        userAgent: performanceData.userAgent || 'unknown',
        
        timestamp: new Date().toISOString()
      };

      const result = await this.db.logReportGeneration(logEntry);
      
      if (result.success) {
        console.log(`Report generation logged: ${logEntry.userId} - ${logEntry.reportType} - ${logEntry.totalProcessingTime}ms`);
      }

      return result;
    } catch (error) {
      console.error('Error logging report generation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Log error occurrences for monitoring
   * @param {object} errorData - Error data
   * @returns {Promise<object>} Log result
   */
  async logError(errorData) {
    try {
      if (!this.db) {
        await this.initialize();
      }

      const logEntry = {
        userId: errorData.userId || 'unknown',
        userEmail: errorData.userEmail || 'unknown',
        action: 'error_occurred',
        
        // Error details
        errorType: errorData.errorType || 'unknown',
        errorCode: errorData.errorCode || 'UNKNOWN_ERROR',
        errorMessage: errorData.errorMessage || 'No message provided',
        errorStack: errorData.errorStack || null,
        
        // Context
        endpoint: errorData.endpoint || 'unknown',
        reportType: errorData.reportType || null,
        processingStage: errorData.processingStage || 'unknown',
        
        // System info
        ipAddress: errorData.ipAddress || 'unknown',
        userAgent: errorData.userAgent || 'unknown',
        
        // Additional context
        requestData: errorData.requestData || null,
        
        timestamp: new Date().toISOString()
      };

      const result = await this.db.logUsage(logEntry);
      
      if (result.success) {
        // Update error metrics
        this.performanceMetrics.totalErrors++;
        this.updateErrorRate();
        
        console.log(`Error logged: ${logEntry.errorCode} - ${logEntry.errorMessage}`);
      }

      return result;
    } catch (error) {
      console.error('Error logging error occurrence:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update performance metrics in memory
   * @param {object} logEntry - Log entry data
   */
  updatePerformanceMetrics(logEntry) {
    this.performanceMetrics.totalRequests++;
    
    if (!logEntry.success) {
      this.performanceMetrics.totalErrors++;
    }
    
    this.performanceMetrics.totalProcessingTime += logEntry.processingTime || 0;
    this.performanceMetrics.averageResponseTime = 
      this.performanceMetrics.totalProcessingTime / this.performanceMetrics.totalRequests;
    
    this.updateErrorRate();
  }

  /**
   * Update error rate calculation
   */
  updateErrorRate() {
    if (this.performanceMetrics.totalRequests > 0) {
      this.performanceMetrics.errorRate = 
        (this.performanceMetrics.totalErrors / this.performanceMetrics.totalRequests) * 100;
    }
  }

  /**
   * Add entry to recent activity tracking
   * @param {object} logEntry - Log entry to add
   */
  addToRecentActivity(logEntry) {
    this.recentActivity.unshift({
      timestamp: logEntry.timestamp,
      userId: logEntry.userId,
      action: logEntry.action,
      reportType: logEntry.reportType,
      success: logEntry.success,
      processingTime: logEntry.processingTime,
      totalTokens: logEntry.totalTokens,
      estimatedCost: logEntry.estimatedCost
    });

    // Keep only recent entries
    if (this.recentActivity.length > this.maxRecentActivity) {
      this.recentActivity = this.recentActivity.slice(0, this.maxRecentActivity);
    }
  }

  /**
   * Get current performance metrics
   * @returns {object} Performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Get recent activity
   * @param {number} limit - Number of recent activities to return
   * @returns {array} Recent activity entries
   */
  getRecentActivity(limit = 20) {
    return this.recentActivity.slice(0, limit);
  }

  /**
   * Get usage statistics from database
   * @param {number} timeRange - Time range in days
   * @returns {Promise<object>} Usage statistics
   */
  async getUsageStatistics(timeRange = 30) {
    try {
      if (!this.db) {
        await this.initialize();
      }

      const tokenStats = await this.db.getTokenUsageStats(timeRange);
      const reportStats = await this.db.getInvestmentReportStats();
      
      if (!tokenStats.success || !reportStats.success) {
        throw new Error('Failed to fetch usage statistics');
      }

      return {
        success: true,
        data: {
          timeRange: timeRange,
          tokenUsage: tokenStats.data,
          reportGeneration: reportStats.data,
          performanceMetrics: this.getPerformanceMetrics(),
          recentActivity: this.getRecentActivity(10)
        }
      };
    } catch (error) {
      console.error('Error getting usage statistics:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user-specific usage statistics
   * @param {string} userId - User ID
   * @param {number} timeRange - Time range in days
   * @returns {Promise<object>} User usage statistics
   */
  async getUserUsageStatistics(userId, timeRange = 30) {
    try {
      if (!this.db) {
        await this.initialize();
      }

      const tokenUsage = await this.db.getUserTokenUsage(userId, timeRange);
      const reportStats = await this.db.getInvestmentReportStats(userId);
      
      if (!tokenUsage.success || !reportStats.success) {
        throw new Error('Failed to fetch user usage statistics');
      }

      return {
        success: true,
        data: {
          userId: userId,
          timeRange: timeRange,
          tokenUsage: tokenUsage.data,
          reportGeneration: reportStats.data,
          lastActivity: this.recentActivity.filter(activity => activity.userId === userId).slice(0, 5)
        }
      };
    } catch (error) {
      console.error('Error getting user usage statistics:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate cost estimates based on token usage
   * @param {number} promptTokens - Number of prompt tokens
   * @param {number} completionTokens - Number of completion tokens
   * @param {string} model - Model used
   * @returns {number} Estimated cost in USD
   */
  calculateCost(promptTokens, completionTokens, model = 'gpt-4') {
    if (!this.db) {
      // Fallback calculation if database not available
      const pricing = {
        'gpt-4': { input: 0.03 / 1000, output: 0.06 / 1000 },
        'gpt-4o': { input: 0.005 / 1000, output: 0.015 / 1000 },
        'gpt-3.5-turbo': { input: 0.001 / 1000, output: 0.002 / 1000 }
      };
      
      const modelPricing = pricing[model] || pricing['gpt-4'];
      return (promptTokens * modelPricing.input) + (completionTokens * modelPricing.output);
    }
    
    return this.db.calculateTokenCost(promptTokens, completionTokens, model);
  }

  /**
   * Check if usage limits are exceeded
   * @param {string} userId - User ID
   * @param {object} limits - Usage limits to check
   * @returns {Promise<object>} Limit check result
   */
  async checkUsageLimits(userId, limits = {}) {
    try {
      const defaultLimits = {
        dailyRequests: 100,
        dailyTokens: 100000,
        dailyCost: 10.00,
        monthlyRequests: 1000,
        monthlyTokens: 1000000,
        monthlyCost: 100.00
      };

      const effectiveLimits = { ...defaultLimits, ...limits };
      
      // Get usage for different time periods
      const dailyUsage = await this.getUserUsageStatistics(userId, 1);
      const monthlyUsage = await this.getUserUsageStatistics(userId, 30);

      if (!dailyUsage.success || !monthlyUsage.success) {
        return { success: false, error: 'Failed to check usage limits' };
      }

      const daily = dailyUsage.data;
      const monthly = monthlyUsage.data;

      const limitStatus = {
        daily: {
          requests: {
            used: daily.tokenUsage.totalRecords || 0,
            limit: effectiveLimits.dailyRequests,
            exceeded: (daily.tokenUsage.totalRecords || 0) >= effectiveLimits.dailyRequests
          },
          tokens: {
            used: daily.tokenUsage.totalTokens || 0,
            limit: effectiveLimits.dailyTokens,
            exceeded: (daily.tokenUsage.totalTokens || 0) >= effectiveLimits.dailyTokens
          },
          cost: {
            used: daily.tokenUsage.totalCost || 0,
            limit: effectiveLimits.dailyCost,
            exceeded: (daily.tokenUsage.totalCost || 0) >= effectiveLimits.dailyCost
          }
        },
        monthly: {
          requests: {
            used: monthly.tokenUsage.totalRecords || 0,
            limit: effectiveLimits.monthlyRequests,
            exceeded: (monthly.tokenUsage.totalRecords || 0) >= effectiveLimits.monthlyRequests
          },
          tokens: {
            used: monthly.tokenUsage.totalTokens || 0,
            limit: effectiveLimits.monthlyTokens,
            exceeded: (monthly.tokenUsage.totalTokens || 0) >= effectiveLimits.monthlyTokens
          },
          cost: {
            used: monthly.tokenUsage.totalCost || 0,
            limit: effectiveLimits.monthlyCost,
            exceeded: (monthly.tokenUsage.totalCost || 0) >= effectiveLimits.monthlyCost
          }
        }
      };

      const anyLimitExceeded = 
        limitStatus.daily.requests.exceeded ||
        limitStatus.daily.tokens.exceeded ||
        limitStatus.daily.cost.exceeded ||
        limitStatus.monthly.requests.exceeded ||
        limitStatus.monthly.tokens.exceeded ||
        limitStatus.monthly.cost.exceeded;

      return {
        success: true,
        data: {
          userId: userId,
          limitsExceeded: anyLimitExceeded,
          limitStatus: limitStatus,
          recommendations: this.generateUsageRecommendations(limitStatus)
        }
      };
    } catch (error) {
      console.error('Error checking usage limits:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate usage recommendations based on current usage
   * @param {object} limitStatus - Current limit status
   * @returns {array} Array of recommendations
   */
  generateUsageRecommendations(limitStatus) {
    const recommendations = [];

    if (limitStatus.daily.requests.used / limitStatus.daily.requests.limit > 0.8) {
      recommendations.push('Daily request limit approaching - consider spacing out report generations');
    }

    if (limitStatus.daily.cost.used / limitStatus.daily.cost.limit > 0.8) {
      recommendations.push('Daily cost limit approaching - consider using basic report types');
    }

    if (limitStatus.monthly.tokens.used / limitStatus.monthly.tokens.limit > 0.9) {
      recommendations.push('Monthly token limit nearly reached - optimize input data length');
    }

    if (recommendations.length === 0) {
      recommendations.push('Usage is within normal limits');
    }

    return recommendations;
  }

  /**
   * Reset performance metrics
   */
  resetMetrics() {
    this.performanceMetrics = {
      totalRequests: 0,
      totalErrors: 0,
      totalProcessingTime: 0,
      averageResponseTime: 0,
      errorRate: 0
    };
    this.recentActivity = [];
    console.log('Performance metrics reset');
  }
}

// Create and export singleton instance
const usageTrackingService = new UsageTrackingService();

export default usageTrackingService;
export { UsageTrackingService };