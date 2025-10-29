// Admin token usage statistics endpoint
import { FirebaseDatabase } from '../lib/firebase-db.js';

const db = new FirebaseDatabase();
import { verifyToken } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user data and verify admin role
    const userResult = await db.getUserById(decoded.userId);
    if (!userResult.success || !userResult.data.isActive || userResult.data.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get query parameters
    const { timeRange = '30', reportType, userId } = req.query;
    const days = parseInt(timeRange);

    // Get token usage statistics
    let statsResult;
    if (userId) {
      // Get specific user's token usage
      statsResult = await db.getUserTokenUsage(userId, days);
    } else {
      // Get overall token usage statistics
      statsResult = await db.getTokenUsageStats(days);
    }

    if (statsResult.success) {
      return res.status(200).json({
        success: true,
        timeRange: days,
        stats: statsResult.data
      });
    } else {
      return res.status(500).json({ error: 'Failed to retrieve token statistics' });
    }

  } catch (error) {
    console.error('Admin token stats error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}