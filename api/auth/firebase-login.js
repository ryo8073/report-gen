import { requireFirebaseAuth, createFirebaseAuthRateLimit } from '../lib/firebase-auth.js';
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

    // Firebase authentication is handled by middleware
    // This endpoint just confirms the user is authenticated
    try {
      const db = getDatabase();
      
      // Log the login
      db.logUsage(req.user.id, 'firebase_login', null, 0, 0, req.ip);
      
      return res.status(200).json({
        success: true,
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          role: req.user.role,
          emailVerified: req.user.email_verified,
          authProvider: req.user.auth_provider
        },
        firebase: {
          uid: req.firebaseUser.uid,
          emailVerified: req.firebaseUser.emailVerified
        }
      });
    } catch (error) {
      console.error('Firebase login error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        code: 'FIREBASE_LOGIN_ERROR'
      });
    }
  });
}
