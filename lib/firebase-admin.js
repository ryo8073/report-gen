// Firebase Admin SDK configuration for server-side
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import FirebaseErrorHandler from './firebase-error-handler.js';

// Validate required environment variables
function validateFirebaseConfig() {
  const requiredVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY_ID', 
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_CLIENT_ID',
    'FIREBASE_CLIENT_X509_CERT_URL'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ Missing Firebase environment variables:', missing);
    console.error('💡 Run: node scripts/firebase-config-validator.js for detailed setup help');
    throw new Error(`Missing Firebase configuration: ${missing.join(', ')}`);
  }
}

// Initialize Firebase Admin SDK
let adminApp;
try {
  if (getApps().length === 0) {
    // Validate configuration before initializing
    validateFirebaseConfig();
    
    adminApp = initializeApp({
      credential: cert({
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
        universe_domain: "googleapis.com"
      })
    });
    
    console.log('✅ Firebase Admin SDK initialized successfully');
  } else {
    adminApp = getApps()[0];
  }
} catch (error) {
  FirebaseErrorHandler.logError(error, { context: 'Firebase Admin SDK initialization' });
  throw error;
}

// Initialize Firestore
export const db = getFirestore(adminApp);

// Initialize Auth
export const auth = getAuth(adminApp);

export default adminApp;
