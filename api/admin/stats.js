import { requireAuth, setSecurityHeaders } from '../../lib/auth.js';
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
      const stats = await db.getTotalUsageStats();

      res.status(200).json({
        success: true,
        stats: {
          total_users: stats.total_users || 0,
          total_requests: stats.total_requests || 0,
          total_reports: stats.total_reports || 0,
          total_files: stats.total_files || 0,
          total_size: stats.total_size || 0
        }
      });

    } catch (error) {
      console.error('Admin stats error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch stats',
        code: 'STATS_ERROR'
      });
    }
  });
}
