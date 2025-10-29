// Trial status check endpoint
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

    // Check trial status
    const trialResult = await db.checkTrialStatus(decoded.userId);

    if (trialResult.success) {
      return res.status(200).json({
        success: true,
        trial: trialResult.data
      });
    } else {
      return res.status(500).json({ error: 'Failed to check trial status' });
    }

  } catch (error) {
    console.error('Trial status check error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}