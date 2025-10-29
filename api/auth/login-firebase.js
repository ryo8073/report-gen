// Firebase-based user login endpoint
import { verifyFirebaseToken, getUserByUid } from '../lib/firebase.js';
import { FirebaseDatabase } from '../lib/firebase-db.js';

const db = new FirebaseDatabase();

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ 
        error: 'Firebase ID token is required',
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

    // Get user details from Firebase
    const firebaseUser = await getUserByUid(decodedToken.uid);
    if (!firebaseUser) {
      return res.status(401).json({ 
        error: 'Firebase user not found',
        code: 'FIREBASE_USER_NOT_FOUND'
      });
    }

    // Get or create user in local database
    let localUser = await db.getUserById(decodedToken.uid);
    
    if (!localUser.success) {
      // Create local user record if it doesn't exist
      const createResult = await db.createUser({
        id: decodedToken.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email,
        emailVerified: firebaseUser.emailVerified,
        role: 'user', // Default role
        isActive: true,
        authProvider: 'firebase',
        firebaseUid: decodedToken.uid
      });
      
      if (!createResult.success) {
        return res.status(500).json({ 
          error: 'Failed to create user record',
          code: 'USER_CREATION_FAILED'
        });
      }
      
      localUser = await db.getUserById(decodedToken.uid);
    }

    // Log the login
    await db.logUsage({
      action: 'firebase_login',
      userId: decodedToken.uid,
      email: firebaseUser.email,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });

    // Return success
    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: localUser.data.id,
        email: localUser.data.email,
        name: localUser.data.name,
        role: localUser.data.role,
        emailVerified: localUser.data.emailVerified,
        authProvider: localUser.data.authProvider
      },
      firebase: {
        uid: firebaseUser.uid,
        emailVerified: firebaseUser.emailVerified
      }
    });

  } catch (error) {
    console.error('Firebase login error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'FIREBASE_LOGIN_ERROR'
    });
  }
}
