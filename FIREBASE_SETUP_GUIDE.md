# Firebase Setup Guide

This guide will help you configure Firebase for the report generation system. Follow these steps carefully to ensure proper setup.

## Prerequisites

- Node.js installed (version 14 or higher)
- A Google account
- Access to Firebase Console

## Step 1: Create Firebase Project

1. **Go to Firebase Console**
   - Visit [https://console.firebase.google.com/](https://console.firebase.google.com/)
   - Sign in with your Google account

2. **Create or Select Project**
   - Click "Create a project" for new project
   - Or select an existing project
   - Follow the setup wizard (Analytics is optional)

3. **Enable Firestore Database**
   - In your Firebase project, go to "Firestore Database"
   - Click "Create database"
   - Choose "Start in test mode" (we'll configure rules later)
   - Select a location for your database

4. **Note Your Project ID**
   - Go to Project Settings (gear icon)
   - Copy your "Project ID" - you'll need this later

## Step 2: Create Service Account

1. **Navigate to Service Accounts**
   - In Firebase Console, go to Project Settings
   - Click on "Service accounts" tab

2. **Generate Private Key**
   - Click "Generate new private key"
   - A JSON file will be downloaded
   - **Keep this file secure** - it contains sensitive credentials

3. **Extract Required Values**
   From the downloaded JSON file, you'll need these values:
   ```json
   {
     "project_id": "your-project-id",
     "private_key_id": "key-id-here",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",
     "client_id": "123456789012345678901",
     "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
   }
   ```

## Step 3: Configure Environment Variables

1. **Copy Environment Template**
   ```bash
   cp env.example .env
   ```

2. **Edit .env File**
   Replace the Firebase values with your actual credentials:

   ```env
   # Firebase Admin SDK Configuration
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY_ID=your-private-key-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
   FIREBASE_CLIENT_ID=123456789012345678901
   FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com

   # Optional: Firebase Client SDK (for frontend features)
   FIREBASE_API_KEY=your-web-api-key
   FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   FIREBASE_MESSAGING_SENDER_ID=123456789012
   FIREBASE_APP_ID=1:123456789012:web:abcdef123456789
   ```

   **Important Notes:**
   - Keep the `\n` in the private key as literal `\n` characters (not actual line breaks)
   - Don't add quotes around the private key unless shown in the example
   - Make sure there are no extra spaces or characters

## Step 4: Configure Firestore Security Rules

1. **Navigate to Firestore Rules**
   - In Firebase Console, go to "Firestore Database"
   - Click on "Rules" tab

2. **Replace Default Rules**
   Copy and paste these security rules:

   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Allow authenticated users to read/write their own user data
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       
       // Allow authenticated users to create usage logs
       match /usage_logs/{document} {
         allow create: if request.auth != null;
         allow read: if request.auth != null && request.auth.uid == resource.data.userId;
       }
       
       // Allow authenticated users to manage their report generations
       match /report_generations/{document} {
         allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
       }
       
       // Allow authenticated users to manage their sessions
       match /sessions/{document} {
         allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
       }
       
       // Allow admin operations (for system initialization)
       match /{document=**} {
         allow read, write: if request.auth != null && 
           request.auth.token.email != null &&
           request.auth.token.email.matches('.*@.*\\.iam\\.gserviceaccount\\.com$');
       }
     }
   }
   ```

3. **Publish Rules**
   - Click "Publish" to save the rules
   - Wait for confirmation that rules are published

## Step 5: Validate Configuration

1. **Run Configuration Validator**
   ```bash
   node scripts/firebase-config-validator.js
   ```

   This script will:
   - Check all required environment variables
   - Validate credential formats
   - Test Firebase connection
   - Provide specific error messages if issues are found

2. **Expected Output**
   If successful, you should see:
   ```
   ✅ All critical Firebase environment variables are configured!
   ✅ Firebase Admin SDK connection successful
   ✅ Firestore database connection successful
   🎉 Firebase configuration is valid and connection successful!
   ```

## Step 6: Initialize Database

1. **Run Database Initialization**
   ```bash
   node scripts/init-firebase.js
   ```

   This will:
   - Create required Firestore collections
   - Set up an admin user
   - Test database operations

## Troubleshooting

### Common Issues and Solutions

#### 1. "Service account key is invalid"
- **Cause**: Incorrect private key format or missing credentials
- **Solution**: 
  - Re-download the service account JSON file
  - Ensure private key has `\n` as literal characters, not actual line breaks
  - Verify all required environment variables are set

#### 2. "Permission denied" errors
- **Cause**: Firestore security rules not configured correctly
- **Solution**:
  - Double-check that you published the security rules
  - Ensure the rules match exactly as shown in Step 4
  - Wait a few minutes for rules to propagate

#### 3. "Project not found"
- **Cause**: Incorrect project ID
- **Solution**:
  - Verify `FIREBASE_PROJECT_ID` matches exactly (case-sensitive)
  - Check project ID in Firebase Console > Project Settings

#### 4. "Firestore not enabled"
- **Cause**: Firestore database not created in Firebase project
- **Solution**:
  - Go to Firebase Console > Firestore Database
  - Click "Create database" if not already created

#### 5. "Invalid private key format"
- **Cause**: Private key formatting issues
- **Solution**:
  - Ensure private key starts with `-----BEGIN PRIVATE KEY-----`
  - Ensure private key ends with `-----END PRIVATE KEY-----`
  - Keep `\n` as literal `\n` characters in the .env file
  - Don't modify the key content between BEGIN and END markers

### Getting Help

If you continue to have issues:

1. **Run Diagnostic Report**
   ```bash
   node scripts/firebase-config-validator.js
   ```
   This provides detailed diagnostic information.

2. **Check Firebase Console**
   - Verify your project exists and Firestore is enabled
   - Check that service account exists in IAM & Admin

3. **Verify Environment**
   - Ensure you're running commands from the project root directory
   - Check that `.env` file exists and contains your credentials
   - Verify Node.js version is 14 or higher

## Security Best Practices

1. **Never commit credentials to version control**
   - The `.env` file should be in your `.gitignore`
   - Never share your service account JSON file

2. **Rotate credentials regularly**
   - Generate new service account keys periodically
   - Delete old keys from Firebase Console

3. **Use least privilege principle**
   - Only grant necessary permissions to service accounts
   - Regularly review Firestore security rules

4. **Monitor usage**
   - Check Firebase Console for unusual activity
   - Set up billing alerts to avoid unexpected charges

## Next Steps

After successful setup:

1. **Test the application**
   - Try logging in with the admin user
   - Test report generation functionality

2. **Create additional users**
   - Use the registration page to create test users
   - Verify authentication flows work correctly

3. **Monitor logs**
   - Check browser console for any errors
   - Monitor Firebase Console for database activity

## Support

For additional help:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)