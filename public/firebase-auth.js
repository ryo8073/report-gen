// Firebase Authentication utilities for frontend
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth } from './firebase-config.js';

// Authentication state management
let currentUser = null;
let authStateListeners = [];

// Listen for authentication state changes
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  authStateListeners.forEach(listener => listener(user));
});

// Add authentication state listener
export function onAuthStateChange(callback) {
  authStateListeners.push(callback);
  // Call immediately with current state
  if (currentUser !== null) {
    callback(currentUser);
  }
}

// Remove authentication state listener
export function removeAuthStateListener(callback) {
  const index = authStateListeners.indexOf(callback);
  if (index > -1) {
    authStateListeners.splice(index, 1);
  }
}

// Get current user
export function getCurrentUser() {
  return currentUser;
}

// Sign in with email and password
export async function signInWithEmail(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken();
    
    // Store token for API calls
    localStorage.setItem('firebaseIdToken', idToken);
    
    return {
      success: true,
      user: userCredential.user,
      idToken
    };
  } catch (error) {
    console.error('Sign in error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Sign up with email and password
export async function signUpWithEmail(email, password, displayName) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update display name
    if (displayName) {
      await updateProfile(userCredential.user, { displayName });
    }
    
    const idToken = await userCredential.user.getIdToken();
    
    // Store token for API calls
    localStorage.setItem('firebaseIdToken', idToken);
    
    return {
      success: true,
      user: userCredential.user,
      idToken
    };
  } catch (error) {
    console.error('Sign up error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Sign in with Google
export async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const idToken = await userCredential.user.getIdToken();
    
    // Store token for API calls
    localStorage.setItem('firebaseIdToken', idToken);
    
    return {
      success: true,
      user: userCredential.user,
      idToken
    };
  } catch (error) {
    console.error('Google sign in error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Sign out
export async function signOutUser() {
  try {
    await signOut(auth);
    localStorage.removeItem('firebaseIdToken');
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Send password reset email
export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error('Password reset error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Get ID token for API calls
export async function getIdToken() {
  if (currentUser) {
    try {
      return await currentUser.getIdToken();
    } catch (error) {
      console.error('Get ID token error:', error);
      return null;
    }
  }
  return null;
}

// Make authenticated API calls
export async function makeAuthenticatedRequest(url, options = {}) {
  const idToken = await getIdToken();
  
  if (!idToken) {
    throw new Error('No authentication token available');
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${idToken}`,
    ...options.headers
  };
  
  return fetch(url, {
    ...options,
    headers
  });
}

// Check if user is authenticated
export function isAuthenticated() {
  return currentUser !== null;
}

// Get user display name
export function getUserDisplayName() {
  return currentUser?.displayName || currentUser?.email || 'User';
}

// Get user email
export function getUserEmail() {
  return currentUser?.email || '';
}

// Check if email is verified
export function isEmailVerified() {
  return currentUser?.emailVerified || false;
}

export default {
  onAuthStateChange,
  removeAuthStateListener,
  getCurrentUser,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signOutUser,
  resetPassword,
  getIdToken,
  makeAuthenticatedRequest,
  isAuthenticated,
  getUserDisplayName,
  getUserEmail,
  isEmailVerified
};
