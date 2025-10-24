import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Firebase Admin SDK configuration
const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  clientId: process.env.FIREBASE_CLIENT_ID,
  authUri: process.env.FIREBASE_AUTH_URI,
  tokenUri: process.env.FIREBASE_TOKEN_URI,
  authProviderX509CertUrl: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  clientX509CertUrl: process.env.FIREBASE_CLIENT_X509_CERT_URL,
};

// Initialize Firebase Admin SDK
let app;
if (getApps().length === 0) {
  app = initializeApp({
    credential: cert(firebaseConfig),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
} else {
  app = getApps()[0];
}

// Get Firebase Auth instance
export const auth = getAuth(app);

// Firebase Authentication utilities
export async function verifyFirebaseToken(idToken) {
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      name: decodedToken.name,
      picture: decodedToken.picture,
      iss: decodedToken.iss,
      aud: decodedToken.aud,
      authTime: decodedToken.auth_time,
      exp: decodedToken.exp,
      iat: decodedToken.iat,
      firebase: decodedToken.firebase
    };
  } catch (error) {
    console.error('Firebase token verification error:', error);
    return null;
  }
}

export async function createCustomToken(uid, additionalClaims = {}) {
  try {
    return await auth.createCustomToken(uid, additionalClaims);
  } catch (error) {
    console.error('Firebase custom token creation error:', error);
    throw error;
  }
}

export async function getUserByUid(uid) {
  try {
    return await auth.getUser(uid);
  } catch (error) {
    console.error('Firebase get user error:', error);
    return null;
  }
}

export async function createUser(email, password, displayName = null) {
  try {
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
      emailVerified: false
    });
    return userRecord;
  } catch (error) {
    console.error('Firebase create user error:', error);
    throw error;
  }
}

export async function updateUser(uid, updates) {
  try {
    return await auth.updateUser(uid, updates);
  } catch (error) {
    console.error('Firebase update user error:', error);
    throw error;
  }
}

export async function deleteUser(uid) {
  try {
    return await auth.deleteUser(uid);
  } catch (error) {
    console.error('Firebase delete user error:', error);
    throw error;
  }
}

export async function setCustomUserClaims(uid, customClaims) {
  try {
    return await auth.setCustomUserClaims(uid, customClaims);
  } catch (error) {
    console.error('Firebase set custom claims error:', error);
    throw error;
  }
}

export default {
  auth,
  verifyFirebaseToken,
  createCustomToken,
  getUserByUid,
  createUser,
  updateUser,
  deleteUser,
  setCustomUserClaims
};
