import { verifyFirebaseToken, getUserByUid } from '../lib/firebase.js';
import { getDatabase } from '../lib/database.js';

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
    const db = getDatabase();
    let localUser = await db.getUserByFirebaseUid(decodedToken.uid);
    
    if (!localUser) {
      // Create local user record if it doesn't exist
      localUser = await db.createUserFromFirebase({
        firebaseUid: decodedToken.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email,
        emailVerified: firebaseUser.emailVerified,
        role: 'user' // Default role
      });
    } else {
      // Update local user record with latest Firebase data
      await db.updateUserFromFirebase(localUser.id, {
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email,
        emailVerified: firebaseUser.emailVerified
      });
    }

    // Log the login
    await db.logUsage(localUser.id, 'firebase_login', null, 0, 0, req.ip);

    // Return success
    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: localUser.id,
        email: localUser.email,
        name: localUser.name,
        role: localUser.role,
        emailVerified: localUser.email_verified,
        authProvider: localUser.auth_provider
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
