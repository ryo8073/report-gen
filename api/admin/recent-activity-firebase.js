// Firebase-based admin recent activity endpoint
import { db } from '../../lib/firebase-db.js';
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

    // Get user data to check role
    const userResult = await db.getUserById(decoded.userId);
    if (!userResult.success || userResult.data.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get recent activity
    const activityResult = await db.getRecentActivity(50);
    if (!activityResult.success) {
      return res.status(500).json({ error: activityResult.error });
    }

    return res.status(200).json({
      success: true,
      data: activityResult.data
    });

  } catch (error) {
    console.error('Admin recent activity error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
