// Trial check and auto-expire endpoint
import { FirebaseDatabase } from '../lib/firebase-db.js';

const db = new FirebaseDatabase();
import { verifyToken } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
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

    if (!trialResult.success) {
      return res.status(500).json({ error: 'Failed to check trial status' });
    }

    const trialData = trialResult.data;

    // Auto-expire trial if needed
    if (trialData.subscriptionStatus === 'trial' && !trialData.canUseService) {
      await db.expireTrial(decoded.userId);
      trialData.subscriptionStatus = 'trial_expired';
    }

    return res.status(200).json({
      success: true,
      trial: trialData,
      message: trialData.canUseService ? 'Trial active' : 'Trial expired'
    });

  } catch (error) {
    console.error('Trial check error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}