// Team member usage endpoint
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

    // Get user data
    const userResult = await db.getUserById(decoded.userId);
    if (!userResult.success || !userResult.data.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Check if user is team member
    if (userResult.data.role !== 'team_member') {
      return res.status(403).json({ error: 'Team member access required' });
    }

    // Get team member usage
    const usageResult = await db.getTeamMemberUsage(decoded.userId, 30);

    if (usageResult.success) {
      return res.status(200).json({
        success: true,
        usage: usageResult.data
      });
    } else {
      return res.status(500).json({ error: 'Failed to retrieve usage information' });
    }

  } catch (error) {
    console.error('Team member usage error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}