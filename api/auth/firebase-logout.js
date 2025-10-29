import { optionalFirebaseAuth, createFirebaseAuthRateLimit } from '../lib/firebase-auth.js';
import { getDatabase } from '../lib/database.js';

const rateLimit = createFirebaseAuthRateLimit();

export default async function handler(req, res) {
  // Apply rate limiting
  rateLimit(req, res, (err) => {
    if (err) return;
    
    if (req.method !== 'POST') {
      return res.status(405).json({ 
        error: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED'
      });
    }

    try {
      // If user is authenticated, log the logout
      if (req.user) {
        const db = getDatabase();
        db.logUsage(req.user.id, 'firebase_logout', null, 0, 0, req.ip);
      }
      
      return res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Firebase logout error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        code: 'FIREBASE_LOGOUT_ERROR'
      });
    }
  });
}
