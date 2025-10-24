import { verifyFirebaseToken, getUserByUid } from './firebase.js';
import { getDatabase } from './database.js';

// Firebase Authentication middleware
export async function requireFirebaseAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const sessionToken = req.headers['x-session-token'];
    
    let idToken = null;
    
    // Check for Bearer token in Authorization header
    if (authHeader && authHeader.startsWith('Bearer ')) {
      idToken = authHeader.substring(7);
    }
    // Check for session token in custom header
    else if (sessionToken) {
      idToken = sessionToken;
    }
    // Check for token in cookies
    else if (req.cookies && req.cookies.idToken) {
      idToken = req.cookies.idToken;
    }
    
    if (!idToken) {
      return res.status(401).json({ 
        error: 'Firebase authentication required',
        code: 'FIREBASE_AUTH_REQUIRED'
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
    
    // Add user info to request
    req.user = localUser;
    req.firebaseUser = firebaseUser;
    req.firebaseToken = decodedToken;
    
    next();
  } catch (error) {
    console.error('Firebase auth middleware error:', error);
    return res.status(500).json({ 
      error: 'Firebase authentication error',
      code: 'FIREBASE_AUTH_ERROR'
    });
  }
}

// Optional Firebase authentication (doesn't fail if no token)
export async function optionalFirebaseAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const sessionToken = req.headers['x-session-token'];
    
    let idToken = null;
    
    // Check for Bearer token in Authorization header
    if (authHeader && authHeader.startsWith('Bearer ')) {
      idToken = authHeader.substring(7);
    }
    // Check for session token in custom header
    else if (sessionToken) {
      idToken = sessionToken;
    }
    // Check for token in cookies
    else if (req.cookies && req.cookies.idToken) {
      idToken = req.cookies.idToken;
    }
    
    if (idToken) {
      // Verify Firebase ID token
      const decodedToken = await verifyFirebaseToken(idToken);
      if (decodedToken) {
        // Get user details from Firebase
        const firebaseUser = await getUserByUid(decodedToken.uid);
        if (firebaseUser) {
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
          }
          
          // Add user info to request
          req.user = localUser;
          req.firebaseUser = firebaseUser;
          req.firebaseToken = decodedToken;
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Optional Firebase auth middleware error:', error);
    // Don't fail the request, just continue without auth
    next();
  }
}

// Rate limiting for Firebase auth endpoints
export function createFirebaseAuthRateLimit() {
  const attempts = new Map();
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  const MAX_ATTEMPTS = 10; // Max attempts per window (higher than custom auth)
  
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const windowStart = now - WINDOW_MS;
    
    // Clean old attempts
    if (attempts.has(key)) {
      const userAttempts = attempts.get(key).filter(time => time > windowStart);
      attempts.set(key, userAttempts);
    }
    
    // Check current attempts
    const userAttempts = attempts.get(key) || [];
    if (userAttempts.length >= MAX_ATTEMPTS) {
      return res.status(429).json({
        error: 'Too many Firebase authentication attempts. Please try again later.',
        code: 'FIREBASE_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(WINDOW_MS / 1000)
      });
    }
    
    // Add current attempt
    userAttempts.push(now);
    attempts.set(key, userAttempts);
    
    next();
  };
}

export default {
  requireFirebaseAuth,
  optionalFirebaseAuth,
  createFirebaseAuthRateLimit
};
