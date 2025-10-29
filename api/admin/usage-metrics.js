/**
 * Simple API endpoint for basic usage metrics
 * Provides quick access to key performance indicators
 */

import { requireAuth, setSecurityHeaders } from '../../lib/auth.js';
import usageTrackingService from '../../lib/usage-tracking-service.js';

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
          message: 'Admin access required'
        });
      }

      // Initialize usage tracking service
      await usageTrackingService.initialize();

      // Get performance metrics
      const performanceMetrics = usageTrackingService.getPerformanceMetrics();
      const recentActivity = usageTrackingService.getRecentActivity(5);

      // Get basic usage statistics (last 24 hours)
      const usageStats = await usageTrackingService.getUsageStatistics(1);

      const metrics = {
        performance: {
          totalRequests: performanceMetrics.totalRequests,
          totalErrors: performanceMetrics.totalErrors,
          errorRate: performanceMetrics.errorRate,
          averageResponseTime: performanceMetrics.averageResponseTime,
          uptime: performanceMetrics.uptime
        },
        usage: {
          last24Hours: usageStats.success ? {
            totalReports: usageStats.data.reportGeneration?.totalReports || 0,
            totalTokens: usageStats.data.tokenUsage?.summary?.totalTokens || 0,
            totalCost: usageStats.data.tokenUsage?.summary?.totalCost || 0
          } : null
        },
        recentActivity: recentActivity,
        timestamp: new Date().toISOString()
      };

      res.status(200).json({
        success: true,
        data: metrics
      });

    } catch (error) {
      console.error('Error retrieving usage metrics:', error);
      
      return res.status(500).json({
        error: 'Failed to retrieve usage metrics',
        code: 'METRICS_ERROR',
        message: 'An error occurred while fetching usage metrics'
      });
    }
  });
}