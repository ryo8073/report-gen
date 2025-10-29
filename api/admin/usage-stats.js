/**
 * Admin API endpoint for retrieving usage statistics and monitoring data
 * Provides comprehensive analytics for ChatGPT API usage, costs, and performance
 */

import { requireAuth, setSecurityHeaders } from '../../lib/auth.js';
import usageTrackingService from '../../lib/usage-tracking-service.js';
import { getDatabase } from '../../lib/database.js';

export default async function handler(req, res) {
  // Set security headers
  setSecurityHeaders(res);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Token');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  // Use authentication middleware
  return requireAuth(req, res, async () => {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          error: 'Access denied',
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Admin access required to view usage statistics'
        });
      }

      // Get query parameters
      const {
        timeRange = '30',
        includeUserBreakdown = 'false',
        includePerformanceMetrics = 'true',
        includeRecentActivity = 'true',
        format = 'detailed'
      } = req.query;

      const timeRangeDays = parseInt(timeRange) || 30;
      const includeUsers = includeUserBreakdown === 'true';
      const includePerformance = includePerformanceMetrics === 'true';
      const includeActivity = includeRecentActivity === 'true';

      console.log(`Admin requesting usage stats: ${timeRangeDays} days, format: ${format}`);

      // Initialize usage tracking service
      await usageTrackingService.initialize();

      // Get comprehensive usage statistics
      const usageStats = await usageTrackingService.getUsageStatistics(timeRangeDays);
      
      if (!usageStats.success) {
        throw new Error(usageStats.error || 'Failed to retrieve usage statistics');
      }

      // Get additional admin-specific data
      const db = getDatabase();
      const [userStats, trialStats] = await Promise.all([
        db.getUserStats(),
        db.getTrialStats()
      ]);

      // Build response based on format
      let responseData = {
        timeRange: timeRangeDays,
        generatedAt: new Date().toISOString(),
        summary: {
          totalUsers: userStats.success ? userStats.data.totalUsers : 0,
          totalReports: usageStats.data.reportGeneration.totalReports || 0,
          totalTokensUsed: usageStats.data.tokenUsage.summary.totalTokens || 0,
          totalApiCost: usageStats.data.tokenUsage.summary.totalCost || 0,
          averageProcessingTime: usageStats.data.tokenUsage.summary.averageTokensPerRequest || 0,
          errorRate: usageStats.data.performanceMetrics.errorRate || 0
        }
      };

      if (format === 'detailed') {
        responseData.detailed = {
          tokenUsage: usageStats.data.tokenUsage,
          reportGeneration: usageStats.data.reportGeneration,
          userStatistics: userStats.success ? userStats.data : null,
          trialStatistics: trialStats.success ? trialStats.data : null
        };

        if (includePerformance) {
          responseData.detailed.performanceMetrics = usageStats.data.performanceMetrics;
        }

        if (includeActivity) {
          responseData.detailed.recentActivity = usageStats.data.recentActivity;
        }

        if (includeUsers) {
          // Get user breakdown
          const userBreakdown = await getUserBreakdown(timeRangeDays);
          responseData.detailed.userBreakdown = userBreakdown;
        }
      }

      // Add cost analysis
      responseData.costAnalysis = await generateCostAnalysis(usageStats.data.tokenUsage);

      // Add performance insights
      responseData.insights = generatePerformanceInsights(usageStats.data);

      // Add alerts if any
      responseData.alerts = generateAlerts(usageStats.data, userStats.data);

      console.log(`Usage stats retrieved successfully: ${responseData.summary.totalReports} reports, $${responseData.summary.totalApiCost.toFixed(4)} cost`);

      res.status(200).json({
        success: true,
        data: responseData
      });

    } catch (error) {
      console.error('Error retrieving usage statistics:', error);
      
      return res.status(500).json({
        error: 'Failed to retrieve usage statistics',
        code: 'STATS_RETRIEVAL_ERROR',
        message: 'An error occurred while fetching usage statistics',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
}

/**
 * Get detailed user breakdown of usage
 * @param {number} timeRangeDays - Time range in days
 * @returns {Promise<object>} User breakdown data
 */
async function getUserBreakdown(timeRangeDays) {
  try {
    const db = getDatabase();
    const users = await db.getAllUsers(100); // Get top 100 users
    
    if (!users.success) {
      return { error: 'Failed to fetch users' };
    }

    const userBreakdown = [];
    
    for (const user of users.data.slice(0, 20)) { // Limit to top 20 for performance
      const userUsage = await usageTrackingService.getUserUsageStatistics(user.id, timeRangeDays);
      
      if (userUsage.success) {
        userBreakdown.push({
          userId: user.id,
          email: user.email,
          role: user.role || 'user',
          subscriptionStatus: user.subscriptionStatus || 'unknown',
          usage: {
            totalReports: userUsage.data.reportGeneration.totalReports || 0,
            totalTokens: userUsage.data.tokenUsage.totalTokens || 0,
            totalCost: userUsage.data.tokenUsage.totalCost || 0,
            averageProcessingTime: userUsage.data.tokenUsage.records?.length > 0 
              ? userUsage.data.tokenUsage.records.reduce((sum, r) => sum + (r.processingTime || 0), 0) / userUsage.data.tokenUsage.records.length
              : 0
          }
        });
      }
    }

    // Sort by total cost descending
    userBreakdown.sort((a, b) => b.usage.totalCost - a.usage.totalCost);

    return {
      topUsers: userBreakdown,
      totalUsersAnalyzed: userBreakdown.length,
      analysisDate: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating user breakdown:', error);
    return { error: error.message };
  }
}

/**
 * Generate cost analysis and projections
 * @param {object} tokenUsage - Token usage data
 * @returns {object} Cost analysis
 */
async function generateCostAnalysis(tokenUsage) {
  try {
    const summary = tokenUsage.summary || {};
    const dailyStats = tokenUsage.dailyStats || {};
    
    // Calculate daily averages
    const days = Object.keys(dailyStats);
    const avgDailyCost = days.length > 0 
      ? days.reduce((sum, day) => sum + (dailyStats[day].totalCost || 0), 0) / days.length
      : 0;
    
    const avgDailyRequests = days.length > 0
      ? days.reduce((sum, day) => sum + (dailyStats[day].count || 0), 0) / days.length
      : 0;

    // Project monthly costs
    const projectedMonthlyCost = avgDailyCost * 30;
    const projectedMonthlyRequests = avgDailyRequests * 30;

    // Cost per report type analysis
    const reportTypeStats = tokenUsage.reportTypeStats || {};
    const costByReportType = {};
    
    Object.keys(reportTypeStats).forEach(type => {
      const stats = reportTypeStats[type];
      costByReportType[type] = {
        averageCost: stats.count > 0 ? stats.totalCost / stats.count : 0,
        averageTokens: stats.count > 0 ? stats.totalTokens / stats.count : 0,
        totalCost: stats.totalCost || 0,
        requestCount: stats.count || 0
      };
    });

    return {
      current: {
        totalCost: summary.totalCost || 0,
        totalRequests: summary.totalRecords || 0,
        averageCostPerRequest: summary.averageCostPerRequest || 0,
        costByReportType: costByReportType
      },
      projections: {
        dailyAverage: {
          cost: avgDailyCost,
          requests: avgDailyRequests
        },
        monthly: {
          projectedCost: projectedMonthlyCost,
          projectedRequests: projectedMonthlyRequests
        },
        yearly: {
          projectedCost: projectedMonthlyCost * 12,
          projectedRequests: projectedMonthlyRequests * 12
        }
      },
      recommendations: generateCostRecommendations(avgDailyCost, costByReportType)
    };
  } catch (error) {
    console.error('Error generating cost analysis:', error);
    return { error: error.message };
  }
}

/**
 * Generate cost optimization recommendations
 * @param {number} avgDailyCost - Average daily cost
 * @param {object} costByReportType - Cost breakdown by report type
 * @returns {array} Array of recommendations
 */
function generateCostRecommendations(avgDailyCost, costByReportType) {
  const recommendations = [];

  if (avgDailyCost > 10) {
    recommendations.push('High daily costs detected - consider implementing usage limits');
  }

  // Check if advanced reports are significantly more expensive
  const basicCost = costByReportType.basic?.averageCost || 0;
  const advancedCost = costByReportType.advanced?.averageCost || 0;
  
  if (advancedCost > basicCost * 3) {
    recommendations.push('Advanced reports are significantly more expensive - consider promoting basic reports for cost savings');
  }

  if (Object.keys(costByReportType).length > 0) {
    const mostExpensive = Object.entries(costByReportType)
      .sort(([,a], [,b]) => b.averageCost - a.averageCost)[0];
    
    if (mostExpensive[1].averageCost > 0.50) {
      recommendations.push(`${mostExpensive[0]} reports have high average cost ($${mostExpensive[1].averageCost.toFixed(4)}) - consider optimizing prompts`);
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('Costs are within reasonable ranges');
  }

  return recommendations;
}

/**
 * Generate performance insights from usage data
 * @param {object} usageData - Complete usage data
 * @returns {object} Performance insights
 */
function generatePerformanceInsights(usageData) {
  const insights = {
    performance: [],
    usage: [],
    quality: []
  };

  const metrics = usageData.performanceMetrics || {};
  const tokenStats = usageData.tokenUsage?.summary || {};

  // Performance insights
  if (metrics.averageResponseTime > 30000) {
    insights.performance.push('Average response time is high (>30s) - consider optimizing prompts or upgrading infrastructure');
  }

  if (metrics.errorRate > 5) {
    insights.performance.push(`Error rate is elevated (${metrics.errorRate.toFixed(1)}%) - investigate common failure patterns`);
  }

  // Usage insights
  if (tokenStats.averageTokensPerRequest > 8000) {
    insights.usage.push('High average token usage per request - consider prompt optimization');
  }

  const reportTypes = usageData.tokenUsage?.reportTypeStats || {};
  const totalReports = Object.values(reportTypes).reduce((sum, type) => sum + (type.count || 0), 0);
  
  if (totalReports > 0) {
    const advancedRatio = (reportTypes.advanced?.count || 0) / totalReports;
    if (advancedRatio > 0.7) {
      insights.usage.push('High proportion of advanced reports - consider if users need this level of detail');
    }
  }

  // Quality insights
  if (usageData.recentActivity?.length > 0) {
    const recentErrors = usageData.recentActivity.filter(activity => !activity.success).length;
    const recentErrorRate = (recentErrors / usageData.recentActivity.length) * 100;
    
    if (recentErrorRate > 10) {
      insights.quality.push(`Recent error rate is high (${recentErrorRate.toFixed(1)}%) - immediate attention needed`);
    }
  }

  return insights;
}

/**
 * Generate alerts based on usage patterns
 * @param {object} usageData - Usage data
 * @param {object} userStats - User statistics
 * @returns {array} Array of alerts
 */
function generateAlerts(usageData, userStats) {
  const alerts = [];

  const metrics = usageData.performanceMetrics || {};
  const tokenStats = usageData.tokenUsage?.summary || {};

  // Critical alerts
  if (metrics.errorRate > 15) {
    alerts.push({
      level: 'critical',
      type: 'high_error_rate',
      message: `Critical error rate: ${metrics.errorRate.toFixed(1)}%`,
      action: 'Investigate immediately'
    });
  }

  if (tokenStats.totalCost > 100) {
    alerts.push({
      level: 'warning',
      type: 'high_cost',
      message: `High API costs: $${tokenStats.totalCost.toFixed(2)}`,
      action: 'Review usage patterns and consider limits'
    });
  }

  // Usage alerts
  if (userStats?.trialUsers > userStats?.activeSubscriptions * 2) {
    alerts.push({
      level: 'info',
      type: 'trial_conversion',
      message: 'High number of trial users relative to paid subscribers',
      action: 'Consider improving conversion strategies'
    });
  }

  if (metrics.averageResponseTime > 60000) {
    alerts.push({
      level: 'warning',
      type: 'slow_performance',
      message: `Slow average response time: ${(metrics.averageResponseTime / 1000).toFixed(1)}s`,
      action: 'Optimize prompts or infrastructure'
    });
  }

  return alerts;
}