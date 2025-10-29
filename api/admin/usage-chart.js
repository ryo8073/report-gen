import { requireAuth, setSecurityHeaders } from '../../lib/auth.js';
import { getDatabase } from '../lib/database.js';

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
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Use authentication middleware
  return requireAuth(req, res, async () => {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({ 
          error: 'Admin access required',
          code: 'ADMIN_REQUIRED'
        });
      }

      const db = getDatabase();
      const days = req.query.days || 30;
      const usageData = await db.getUserUsageStats(0, days); // 0 for all users

      res.status(200).json({
        success: true,
        data: usageData
      });

    } catch (error) {
      console.error('Usage chart error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch usage data',
        code: 'USAGE_ERROR'
      });
    }
  });
}
