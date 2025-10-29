// Firebase-based user profile endpoint
import { verifyFirebaseToken } from '../lib/firebase.js';
import { FirebaseDatabase } from '../lib/firebase-db.js';

const db = new FirebaseDatabase();

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    // Get Firebase ID token from Authorization header
    const authHeader = req.headers.authorization;
    let idToken = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      idToken = authHeader.substring(7);
    }
    
    if (!idToken) {
      return res.status(401).json({ 
        error: 'Firebase ID token required',
        code: 'MISSING_ID_TOKEN'
      });
    }

    // Verify Firebase ID token
    const decodedToken = await verifyFirebaseToken(idToken);
    if (!decodedToken) {
      return res.status(401).json({ 
        error: 'Invalid or expired Firebase token',
        code: 'INVALID_FIREBASE_TOKEN'
      });
    }

    // Get user data from local database
    const userResult = await db.getUserById(decodedToken.uid);
    if (!userResult.success) {
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = userResult.data;

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ 
        error: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
        authProvider: user.authProvider,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Profile error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      code: 'PROFILE_ERROR'
    });
  }
}
