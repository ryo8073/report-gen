// Trial Analytics API - View usage metrics and error statistics
import trialAnalytics from '../lib/trial-analytics.js';

export default async (req, res) => {
  const { method, query } = req;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed. Use GET to retrieve analytics.'
    });
  }

  try {
    const { type = 'summary', days = '7' } = query;
    const daysNumber = parseInt(days, 10) || 7;

    switch (type) {
      case 'summary':
        const summary = await trialAnalytics.getTrialEffectivenessSummary();
        return res.status(200).json(summary);

      case 'metrics':
        const metrics = await trialAnalytics.getUsageMetrics(daysNumber);
        return res.status(200).json(metrics);

      case 'errors':
        const errors = await trialAnalytics.getErrorStatistics(daysNumber);
        return res.status(200).json({
          success: true,
          data: errors
        });

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid analytics type. Use: summary, metrics, or errors'
        });
    }

  } catch (error) {
    console.error('Analytics API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve analytics data'
    });
  }
};