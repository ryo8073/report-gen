/**
 * Trial Analytics Service
 * Tracks basic usage analytics for the trial site without user identification
 * Focuses on report generation attempts, errors, and basic metrics
 */

import fs from 'fs';
import path from 'path';

class TrialAnalytics {
  constructor() {
    this.analyticsFile = path.join(process.cwd(), 'data', 'trial-analytics.json');
    this.errorLogFile = path.join(process.cwd(), 'data', 'trial-errors.json');
    this.ensureDataDir();
  }

  ensureDataDir() {
    const dataDir = path.dirname(this.analyticsFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  /**
   * Track a report generation attempt
   * @param {object} data - Report generation data
   */
  async trackReportGeneration(data) {
    try {
      const event = {
        id: `report_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        type: 'report_generation',
        timestamp: new Date().toISOString(),
        reportType: data.reportType || 'unknown',
        success: data.success !== false,
        processingTime: data.processingTime || 0,
        hasFiles: data.hasFiles || false,
        fileCount: data.fileCount || 0,
        inputLength: data.inputLength || 0,
        errorType: data.errorType || null,
        errorMessage: data.errorMessage || null,
        // Anonymous session tracking (no personal data)
        sessionId: data.sessionId || this.generateSessionId(),
        userAgent: this.sanitizeUserAgent(data.userAgent),
        // OpenAI usage metrics (if available)
        promptTokens: data.promptTokens || 0,
        completionTokens: data.completionTokens || 0,
        totalTokens: data.totalTokens || 0,
        estimatedCost: data.estimatedCost || 0
      };

      await this.saveEvent(event);
      
      // Also log errors separately for debugging
      if (!event.success && data.errorType) {
        await this.logError({
          errorType: data.errorType,
          errorMessage: data.errorMessage,
          reportType: data.reportType,
          timestamp: event.timestamp,
          sessionId: event.sessionId
        });
      }

      return { success: true, eventId: event.id };
    } catch (error) {
      console.error('Error tracking report generation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Log common errors for debugging
   * @param {object} errorData - Error information
   */
  async logError(errorData) {
    try {
      const errorEvent = {
        id: `error_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        timestamp: new Date().toISOString(),
        errorType: errorData.errorType || 'unknown',
        errorMessage: errorData.errorMessage || 'No message',
        reportType: errorData.reportType || null,
        sessionId: errorData.sessionId || null,
        context: errorData.context || {},
        severity: this.categorizeErrorSeverity(errorData.errorType)
      };

      // Load existing errors
      let errors = [];
      try {
        if (fs.existsSync(this.errorLogFile)) {
          const data = fs.readFileSync(this.errorLogFile, 'utf8');
          errors = JSON.parse(data);
        }
      } catch (loadError) {
        console.error('Error loading existing error log:', loadError);
      }

      errors.push(errorEvent);

      // Keep only recent errors (last 1000)
      if (errors.length > 1000) {
        errors = errors.slice(-1000);
      }

      // Save errors
      fs.writeFileSync(this.errorLogFile, JSON.stringify(errors, null, 2));

      return { success: true, errorId: errorEvent.id };
    } catch (error) {
      console.error('Error logging error event:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Save analytics event to file
   * @param {object} event - Event data
   */
  async saveEvent(event) {
    try {
      // Load existing analytics
      let analytics = [];
      try {
        if (fs.existsSync(this.analyticsFile)) {
          const data = fs.readFileSync(this.analyticsFile, 'utf8');
          analytics = JSON.parse(data);
        }
      } catch (loadError) {
        console.error('Error loading existing analytics:', loadError);
      }

      analytics.push(event);

      // Keep only recent events (last 5000)
      if (analytics.length > 5000) {
        analytics = analytics.slice(-5000);
      }

      // Save analytics
      fs.writeFileSync(this.analyticsFile, JSON.stringify(analytics, null, 2));
    } catch (error) {
      console.error('Error saving analytics event:', error);
      throw error;
    }
  }

  /**
   * Get basic usage metrics for trial effectiveness
   * @param {number} days - Number of days to look back
   * @returns {object} Usage metrics
   */
  async getUsageMetrics(days = 7) {
    try {
      const analytics = await this.loadAnalytics();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const recentEvents = analytics.filter(event => 
        new Date(event.timestamp) >= cutoffDate
      );

      const reportEvents = recentEvents.filter(event => 
        event.type === 'report_generation'
      );

      const successfulReports = reportEvents.filter(event => event.success);
      const failedReports = reportEvents.filter(event => !event.success);

      // Calculate metrics by report type
      const reportTypeStats = {};
      reportEvents.forEach(event => {
        const type = event.reportType || 'unknown';
        if (!reportTypeStats[type]) {
          reportTypeStats[type] = {
            total: 0,
            successful: 0,
            failed: 0,
            avgProcessingTime: 0,
            totalTokens: 0
          };
        }
        reportTypeStats[type].total++;
        if (event.success) {
          reportTypeStats[type].successful++;
        } else {
          reportTypeStats[type].failed++;
        }
        reportTypeStats[type].avgProcessingTime += event.processingTime || 0;
        reportTypeStats[type].totalTokens += event.totalTokens || 0;
      });

      // Calculate averages
      Object.keys(reportTypeStats).forEach(type => {
        const stats = reportTypeStats[type];
        stats.avgProcessingTime = stats.total > 0 ? stats.avgProcessingTime / stats.total : 0;
        stats.successRate = stats.total > 0 ? (stats.successful / stats.total) * 100 : 0;
      });

      // Get error statistics
      const errorStats = await this.getErrorStatistics(days);

      return {
        success: true,
        data: {
          timeRange: `${days} days`,
          totalReportAttempts: reportEvents.length,
          successfulReports: successfulReports.length,
          failedReports: failedReports.length,
          successRate: reportEvents.length > 0 ? (successfulReports.length / reportEvents.length) * 100 : 0,
          avgProcessingTime: reportEvents.length > 0 ? 
            reportEvents.reduce((sum, event) => sum + (event.processingTime || 0), 0) / reportEvents.length : 0,
          totalTokensUsed: reportEvents.reduce((sum, event) => sum + (event.totalTokens || 0), 0),
          estimatedTotalCost: reportEvents.reduce((sum, event) => sum + (event.estimatedCost || 0), 0),
          reportTypeStats,
          errorStats,
          uniqueSessions: new Set(reportEvents.map(event => event.sessionId)).size,
          reportsWithFiles: reportEvents.filter(event => event.hasFiles).length,
          avgFilesPerReport: reportEvents.length > 0 ? 
            reportEvents.reduce((sum, event) => sum + (event.fileCount || 0), 0) / reportEvents.length : 0
        }
      };
    } catch (error) {
      console.error('Error getting usage metrics:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get error statistics for debugging
   * @param {number} days - Number of days to look back
   * @returns {object} Error statistics
   */
  async getErrorStatistics(days = 7) {
    try {
      const errors = await this.loadErrors();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const recentErrors = errors.filter(error => 
        new Date(error.timestamp) >= cutoffDate
      );

      // Group errors by type
      const errorsByType = {};
      recentErrors.forEach(error => {
        const type = error.errorType || 'unknown';
        if (!errorsByType[type]) {
          errorsByType[type] = {
            count: 0,
            severity: error.severity || 'medium',
            lastOccurrence: error.timestamp,
            reportTypes: new Set()
          };
        }
        errorsByType[type].count++;
        if (error.reportType) {
          errorsByType[type].reportTypes.add(error.reportType);
        }
        if (new Date(error.timestamp) > new Date(errorsByType[type].lastOccurrence)) {
          errorsByType[type].lastOccurrence = error.timestamp;
        }
      });

      // Convert sets to arrays for JSON serialization
      Object.keys(errorsByType).forEach(type => {
        errorsByType[type].reportTypes = Array.from(errorsByType[type].reportTypes);
      });

      return {
        totalErrors: recentErrors.length,
        errorsByType,
        mostCommonError: Object.keys(errorsByType).reduce((a, b) => 
          errorsByType[a]?.count > errorsByType[b]?.count ? a : b, 'none'
        ),
        criticalErrors: recentErrors.filter(error => error.severity === 'critical').length
      };
    } catch (error) {
      console.error('Error getting error statistics:', error);
      return {
        totalErrors: 0,
        errorsByType: {},
        mostCommonError: 'none',
        criticalErrors: 0
      };
    }
  }

  /**
   * Load analytics data from file
   * @returns {array} Analytics events
   */
  async loadAnalytics() {
    try {
      if (fs.existsSync(this.analyticsFile)) {
        const data = fs.readFileSync(this.analyticsFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
    return [];
  }

  /**
   * Load error data from file
   * @returns {array} Error events
   */
  async loadErrors() {
    try {
      if (fs.existsSync(this.errorLogFile)) {
        const data = fs.readFileSync(this.errorLogFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading errors:', error);
    }
    return [];
  }

  /**
   * Generate anonymous session ID
   * @returns {string} Session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Sanitize user agent string (remove potentially identifying information)
   * @param {string} userAgent - Raw user agent string
   * @returns {string} Sanitized user agent
   */
  sanitizeUserAgent(userAgent) {
    if (!userAgent) return 'unknown';
    
    // Extract basic browser and OS info, remove detailed version numbers
    const sanitized = userAgent
      .replace(/\d+\.\d+\.\d+/g, 'x.x.x') // Replace version numbers
      .replace(/\([^)]*\)/g, '(...)') // Replace detailed system info
      .substring(0, 100); // Limit length
    
    return sanitized;
  }

  /**
   * Categorize error severity for monitoring
   * @param {string} errorType - Type of error
   * @returns {string} Severity level
   */
  categorizeErrorSeverity(errorType) {
    const criticalErrors = [
      'openai_auth_error',
      'service_error',
      'server_error'
    ];
    
    const highErrors = [
      'openai_service_error',
      'network_error',
      'file_processing_error'
    ];
    
    const mediumErrors = [
      'openai_rate_limit',
      'validation_error',
      'openai_bad_request'
    ];

    if (criticalErrors.includes(errorType)) return 'critical';
    if (highErrors.includes(errorType)) return 'high';
    if (mediumErrors.includes(errorType)) return 'medium';
    return 'low';
  }

  /**
   * Get a summary report for trial effectiveness
   * @returns {object} Summary report
   */
  async getTrialEffectivenessSummary() {
    try {
      const weeklyMetrics = await this.getUsageMetrics(7);
      const monthlyMetrics = await this.getUsageMetrics(30);

      if (!weeklyMetrics.success || !monthlyMetrics.success) {
        throw new Error('Failed to load metrics');
      }

      return {
        success: true,
        summary: {
          lastWeek: {
            totalAttempts: weeklyMetrics.data.totalReportAttempts,
            successRate: Math.round(weeklyMetrics.data.successRate),
            uniqueUsers: weeklyMetrics.data.uniqueSessions,
            avgProcessingTime: Math.round(weeklyMetrics.data.avgProcessingTime)
          },
          lastMonth: {
            totalAttempts: monthlyMetrics.data.totalReportAttempts,
            successRate: Math.round(monthlyMetrics.data.successRate),
            uniqueUsers: monthlyMetrics.data.uniqueSessions,
            avgProcessingTime: Math.round(monthlyMetrics.data.avgProcessingTime)
          },
          topIssues: Object.entries(weeklyMetrics.data.errorStats.errorsByType)
            .sort(([,a], [,b]) => b.count - a.count)
            .slice(0, 3)
            .map(([type, data]) => ({
              type,
              count: data.count,
              severity: data.severity
            })),
          recommendations: this.generateRecommendations(weeklyMetrics.data, monthlyMetrics.data)
        }
      };
    } catch (error) {
      console.error('Error generating trial effectiveness summary:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate recommendations based on usage patterns
   * @param {object} weeklyData - Weekly metrics
   * @param {object} monthlyData - Monthly metrics
   * @returns {array} Recommendations
   */
  generateRecommendations(weeklyData, monthlyData) {
    const recommendations = [];

    // Success rate recommendations
    if (weeklyData.successRate < 80) {
      recommendations.push({
        type: 'improvement',
        message: 'Success rate is below 80%. Focus on error handling improvements.',
        priority: 'high'
      });
    }

    // Performance recommendations
    if (weeklyData.avgProcessingTime > 30000) { // 30 seconds
      recommendations.push({
        type: 'performance',
        message: 'Average processing time is high. Consider optimizing API calls.',
        priority: 'medium'
      });
    }

    // Usage pattern recommendations
    if (weeklyData.reportsWithFiles / weeklyData.totalReportAttempts > 0.5) {
      recommendations.push({
        type: 'feature',
        message: 'High file upload usage detected. Consider improving file processing.',
        priority: 'medium'
      });
    }

    // Error pattern recommendations
    if (weeklyData.errorStats.criticalErrors > 0) {
      recommendations.push({
        type: 'critical',
        message: 'Critical errors detected. Immediate attention required.',
        priority: 'critical'
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type: 'status',
        message: 'Trial site is performing well. Continue monitoring.',
        priority: 'low'
      });
    }

    return recommendations;
  }
}

// Create and export singleton instance
const trialAnalytics = new TrialAnalytics();

export default trialAnalytics;
export { TrialAnalytics };