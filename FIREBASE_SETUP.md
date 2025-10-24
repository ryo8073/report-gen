# Firebase Setup Guide

This guide will help you set up Firebase Authentication for your Proformer application.

## Prerequisites

- Firebase project created
- Node.js application with Firebase SDK installed

## Step 1: Configure Firebase Project

### 1.1 Enable Authentication
1. Go to your Firebase Console (https://console.firebase.google.com/)
2. Select your project
3. Navigate to "Authentication" in the left sidebar
4. Click "Get started"
5. Go to "Sign-in method" tab
6. Enable the following providers:
   - **Email/Password**: Enable this provider
   - **Google**: Enable this provider (optional but recommended)

### 1.2 Configure Authorized Domains
1. In Authentication > Settings > Authorized domains
2. Add your production domain (e.g., `your-domain.com`)
3. Add `localhost` for local development

## Step 2: Get Firebase Configuration

### 2.1 Get Web App Configuration
1. In Firebase Console, go to Project Settings (gear icon)
2. Scroll down to "Your apps" section
3. Click "Add app" and select Web app
4. Register your app with a nickname
5. Copy the Firebase configuration object

### 2.2 Update Frontend Configuration
Update `public/firebase-config.js` with your actual Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-actual-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-actual-app-id"
};
```

### 2.3 Update HTML Configuration
Update `firebase-login.html` with your actual Firebase configuration in the script section.

## Step 3: Configure Server-Side Authentication

### 3.1 Generate Service Account Key
1. In Firebase Console, go to Project Settings
2. Go to "Service accounts" tab
3. Click "Generate new private key"
4. Download the JSON file
5. **Keep this file secure and never commit it to version control**

### 3.2 Set Environment Variables
Create a `.env` file in your project root with the following variables:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com
```

**Important**: Replace the placeholder values with actual values from your service account JSON file.

## Step 4: Database Migration

The database schema has been updated to support Firebase authentication. The new schema includes:

- `firebase_uid`: Firebase user ID
- `email_verified`: Email verification status
- `auth_provider`: Authentication provider (firebase/custom)

Existing users will continue to work with the custom authentication system.

## Step 5: Test Firebase Integration

### 5.1 Test Authentication Flow
1. Start your development server: `npm run dev`
2. Navigate to `/firebase-login.html`
3. Try signing up with a new account
4. Try signing in with existing credentials
5. Test Google sign-in (if enabled)

### 5.2 Test API Endpoints
Test the Firebase authentication endpoints:

```bash
# Test Firebase login
curl -X POST http://localhost:3000/api/auth/firebase-login \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \
  -H "Content-Type: application/json"

# Test Firebase user info
curl -X GET http://localhost:3000/api/auth/firebase-me \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN"
```

## Step 6: Update Frontend Integration

### 6.1 Update Main Application
Update your main application to use Firebase authentication:

1. Include Firebase configuration in your main HTML files
2. Update authentication state management
3. Modify API calls to include Firebase ID tokens

### 6.2 Example Frontend Integration

```javascript
// Check authentication state
import { onAuthStateChange, makeAuthenticatedRequest } from './firebase-auth.js';

onAuthStateChange((user) => {
  if (user) {
    // User is signed in
    console.log('User signed in:', user);
  } else {
    // User is signed out
    console.log('User signed out');
  }
});

// Make authenticated API calls
const response = await makeAuthenticatedRequest('/api/generate', {
  method: 'POST',
  body: JSON.stringify({
    reportType: 'jp_investment_4part',
    inputText: 'Your input text here'
  })
});
```

## Step 7: Production Deployment

### 7.1 Update Environment Variables
Update your production environment variables with the Firebase configuration.

### 7.2 Update Authorized Domains
Add your production domain to Firebase authorized domains.

### 7.3 Test Production Authentication
Test the complete authentication flow in production.

## Troubleshooting

### Common Issues

1. **"Firebase: Error (auth/invalid-api-key)"**
   - Check that your API key is correct
   - Ensure the API key is properly configured in your Firebase project

2. **"Firebase: Error (auth/unauthorized-domain)"**
   - Add your domain to authorized domains in Firebase Console
   - Check that the domain matches exactly

3. **"Firebase: Error (auth/configuration-not-found)"**
   - Verify your Firebase configuration object
   - Ensure all required fields are present

4. **Server-side authentication errors**
   - Check that all environment variables are set correctly
   - Verify the service account key is valid
   - Ensure the Firebase Admin SDK is properly initialized

### Debug Mode

Enable debug mode by setting `NODE_ENV=development` in your environment variables. This will provide more detailed error messages.

## Security Considerations

1. **Never commit service account keys to version control**
2. **Use environment variables for all sensitive configuration**
3. **Implement proper CORS settings for production**
4. **Use HTTPS in production**
5. **Regularly rotate service account keys**

## Support

If you encounter issues:

1. Check the Firebase Console for authentication logs
2. Review server logs for detailed error messages
3. Verify all configuration values are correct
4. Test with a fresh Firebase project if needed

## Next Steps

After successful Firebase integration:

1. Consider implementing additional Firebase features (Firestore, Storage, etc.)
2. Add more authentication providers (Facebook, Twitter, etc.)
3. Implement user role management
4. Add email verification flows
5. Set up monitoring and analytics
