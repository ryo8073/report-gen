import { requireAuth } from './auth.js';
import { requireFirebaseAuth } from './firebase-auth.js';

// Unified authentication middleware that supports both Firebase and custom auth
export async function requireUnifiedAuth(req, res, next) {
  // Try Firebase authentication first
  return requireFirebaseAuth(req, res, (err) => {
    if (err) {
      // If Firebase auth fails, try custom auth
      return requireAuth(req, res, next);
    } else {
      // Firebase auth succeeded, continue
      next();
    }
  });
}

// Optional unified authentication (doesn't fail if no token)
export async function optionalUnifiedAuth(req, res, next) {
  // Try Firebase authentication first
  return requireFirebaseAuth(req, res, (err) => {
    if (err) {
      // If Firebase auth fails, try custom auth
      return requireAuth(req, res, (err2) => {
        if (err2) {
          // Both auth methods failed, continue without auth
          next();
        } else {
          // Custom auth succeeded
          next();
        }
      });
    } else {
      // Firebase auth succeeded, continue
      next();
    }
  });
}

export default {
  requireUnifiedAuth,
  optionalUnifiedAuth
};
