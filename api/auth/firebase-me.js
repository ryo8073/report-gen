import { requireFirebaseAuth, createFirebaseAuthRateLimit } from '../../lib/firebase-auth.js';

const rateLimit = createFirebaseAuthRateLimit();

export default async function handler(req, res) {
  // Apply rate limiting
  rateLimit(req, res, (err) => {
    if (err) return;
    
    if (req.method !== 'GET') {
      return res.status(405).json({ 
        error: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED'
      });
    }

    // Firebase authentication is handled by middleware
    // This endpoint returns current user info
    try {
      return res.status(200).json({
        success: true,
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          role: req.user.role,
          emailVerified: req.user.email_verified,
          authProvider: req.user.auth_provider,
          createdAt: req.user.created_at,
          lastLogin: req.user.last_login
        },
        firebase: {
          uid: req.firebaseUser.uid,
          emailVerified: req.firebaseUser.emailVerified,
          displayName: req.firebaseUser.displayName,
          photoURL: req.firebaseUser.photoURL
        }
      });
    } catch (error) {
      console.error('Firebase me error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        code: 'FIREBASE_ME_ERROR'
      });
    }
  });
}
