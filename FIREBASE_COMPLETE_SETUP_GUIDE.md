# Firebase Complete Setup Guide

This comprehensive guide provides step-by-step instructions for setting up Firebase for the report generation system, including environment validation, service account setup, and Firestore security rules configuration.

## 🚀 Quick Start

If you're in a hurry, run these commands in order:

```bash
# 1. Check environment variables
node scripts/firebase-env-checker.js

# 2. Interactive setup wizard (recommended for first-time setup)
node scripts/firebase-service-account-setup.js wizard

# 3. Validate complete configuration
node scripts/firebase-config-validator.js

# 4. Initialize database
node scripts/init-firebase.js
```

## 📋 Prerequisites

Before starting, ensure you have:

- ✅ Node.js (version 14 or higher)
- ✅ Google account
- ✅ Internet connection
- ✅ Text editor for configuration files
- ✅ Project cloned and dependencies installed

## 🔥 Part 1: Firebase Project Setup

### Step 1.1: Create Firebase Project

1. **Open Firebase Console**
   - Go to [https://console.firebase.google.com/](https://console.firebase.google.com/)
   - Sign in with your Google account

2. **Create New Project**
   - Click "Create a project" (or "Add project")
   - Enter project name (e.g., "report-generator")
   - Choose a unique Project ID (this becomes your `FIREBASE_PROJECT_ID`)
   - Select your country/region
   - Accept Firebase terms

3. **Configure Google Analytics (Optional)**
   - Choose "Enable Google Analytics" or "Not right now"
   - If enabled, select or create Analytics account
   - Click "Create project"

4. **Wait for Project Creation**
   - Wait for "Your new project is ready" message
   - Click "Continue"

### Step 1.2: Enable Firestore Database

1. **Navigate to Firestore**
   - In Firebase Console, click "Firestore Database" in left sidebar
   - Click "Create database"

2. **Configure Security Rules**
   - Choose "Start in test mode" (we'll configure proper rules later)
   - Click "Next"

3. **Select Database Location**
   - Choose a location close to your users
   - ⚠️ **Note**: This cannot be changed later
   - Click "Done"

4. **Wait for Database Creation**
   - Wait for Firestore to be created
   - You should see the Firestore console with empty collections

## 🔑 Part 2: Service Account Setup

### Step 2.1: Create Service Account

1. **Navigate to Project Settings**
   - Click the gear icon (⚙️) next to "Project Overview"
   - Select "Project settings"

2. **Go to Service Accounts Tab**
   - Click on "Service accounts" tab
   - You should see "Firebase Admin SDK" section

3. **Generate Private Key**
   - Click "Generate new private key"
   - A dialog will appear with security warning
   - Click "Generate key"

4. **Download Service Account File**
   - A JSON file will be automatically downloaded
   - File name format: `project-id-firebase-adminsdk-xxxxx-xxxxxxxxxx.json`
   - 🔒 **Save this file securely** (DO NOT commit to version control)

### Step 2.2: Extract Credentials

The downloaded JSON file contains all the credentials you need. Here's how to extract them:

#### JSON Structure
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",
  "client_id": "123456789012345678901",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

#### Environment Variable Mapping
| JSON Field | Environment Variable | Description |
|------------|---------------------|-------------|
| `project_id` | `FIREBASE_PROJECT_ID` | Your Firebase project ID |
| `private_key_id` | `FIREBASE_PRIVATE_KEY_ID` | Private key identifier |
| `private_key` | `FIREBASE_PRIVATE_KEY` | Private key (keep \\n as literal) |
| `client_email` | `FIREBASE_CLIENT_EMAIL` | Service account email |
| `client_id` | `FIREBASE_CLIENT_ID` | Client identifier |
| `client_x509_cert_url` | `FIREBASE_CLIENT_X509_CERT_URL` | Certificate URL |

### Step 2.3: Validate Service Account (Optional)

You can validate your service account JSON file:

```bash
node scripts/firebase-service-account-setup.js validate path/to/your/service-account.json
```

This will:
- ✅ Verify JSON structure
- ✅ Check required fields
- ✅ Generate .env template
- ✅ Validate credential formats

## 📝 Part 3: Environment Configuration

### Step 3.1: Create .env File

1. **Copy Template**
   ```bash
   cp env.example .env
   ```

2. **Edit .env File**
   Replace the Firebase values with your actual credentials:

   ```env
   # Firebase Admin SDK Configuration (Required)
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY_ID=your-private-key-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
   FIREBASE_CLIENT_ID=123456789012345678901
   FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com

   # Firebase Client SDK (Optional - for frontend features)
   FIREBASE_API_KEY=your-web-api-key
   FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   FIREBASE_MESSAGING_SENDER_ID=123456789012
   FIREBASE_APP_ID=1:123456789012:web:abcdef123456789
   ```

### Step 3.2: Critical Private Key Formatting

⚠️ **IMPORTANT**: The private key requires special formatting:

- ✅ **Correct**: Keep `\n` as literal `\n` characters (not actual newlines)
- ✅ **Correct**: Wrap the entire key in double quotes
- ❌ **Wrong**: Converting `\n` to actual newlines
- ❌ **Wrong**: Removing quotes around the private key

**Example of correct format:**
```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

### Step 3.3: Validate Environment Variables

Run the environment checker to validate your configuration:

```bash
node scripts/firebase-env-checker.js
```

This script will:
- ✅ Check all required environment variables
- ✅ Validate credential formats
- ✅ Provide specific error messages for issues
- ✅ Generate setup checklist if needed

**Expected output for valid configuration:**
```
✅ All critical Firebase environment variables are valid
🎉 Environment configuration is ready!
```

## 🔒 Part 4: Firestore Security Rules

### Step 4.1: Navigate to Firestore Rules

1. **Open Firestore Console**
   - Go to Firebase Console > Firestore Database
   - Click on "Rules" tab at the top

2. **Review Current Rules**
   - You should see the current rules (likely test mode)
   - Test mode allows all reads/writes (not secure for production)

### Step 4.2: Configure Production Rules

Replace the default rules with these secure rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can create usage logs and read their own
    match /usage_logs/{document} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Users can manage their own report generations
    match /report_generations/{document} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Users can manage their own sessions
    match /sessions/{document} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Allow service account (admin) operations for system initialization
    match /{document=**} {
      allow read, write: if request.auth != null && 
        request.auth.token.email != null &&
        request.auth.token.email.matches('.*@.*\\.iam\\.gserviceaccount\\.com$');
    }
  }
}
```

### Step 4.3: Publish Rules

1. **Review Rules**
   - Check that the rules are correctly formatted
   - Look for any syntax errors (highlighted in red)

2. **Publish Rules**
   - Click "Publish" button
   - Wait for "Rules published successfully" message
   - Rules take effect immediately

### Step 4.4: Understanding the Rules

**Security Features:**
- ✅ Authentication required for all operations
- ✅ Users isolated to their own data
- ✅ Service account can perform admin operations
- ✅ No anonymous access allowed
- ✅ Prevents data leakage between users

**Rule Breakdown:**
- `users/{userId}`: Users can only read/write their own user document
- `usage_logs`: Users can create logs and read their own logs
- `report_generations`: Users can manage their own report history
- `sessions`: Users can manage their own authentication sessions
- Service account rule: Allows admin operations for system setup

## ✅ Part 5: Validation and Testing

### Step 5.1: Complete Configuration Test

Run the complete Firebase configuration validator:

```bash
node scripts/firebase-config-validator.js
```

This will:
- ✅ Validate all environment variables
- ✅ Test Firebase Admin SDK connection
- ✅ Test Firestore database connection
- ✅ Provide diagnostic information

**Expected output for successful setup:**
```
✅ All critical Firebase environment variables are configured!
✅ Firebase Admin SDK connection successful
✅ Firestore database connection successful
🎉 Firebase configuration is valid and connection successful!
```

### Step 5.2: Initialize Database

Once validation passes, initialize the database:

```bash
node scripts/init-firebase.js
```

This will:
- ✅ Create required Firestore collections
- ✅ Set up admin user
- ✅ Test database operations

## 🔧 Troubleshooting

### Common Issues and Solutions

#### Issue: "Service account key is invalid"
**Possible causes:**
- Private key format is incorrect
- Missing or extra quotes around private key
- `\n` characters converted to actual newlines

**Solutions:**
1. Re-download service account JSON from Firebase Console
2. Ensure private key has `\n` as literal text (not actual newlines)
3. Wrap private key in double quotes in .env file
4. Run: `node scripts/firebase-service-account-setup.js validate <json-file>`

#### Issue: "Permission denied" errors
**Possible causes:**
- Firestore security rules not configured
- Rules not published
- Service account lacks permissions

**Solutions:**
1. Configure Firestore security rules as shown above
2. Ensure rules are published (not just saved)
3. Wait a few minutes for rules to propagate
4. Check Firebase Console > Firestore > Rules

#### Issue: "Project not found"
**Possible causes:**
- Incorrect project ID in .env file
- Project ID is case-sensitive

**Solutions:**
1. Verify project ID in Firebase Console > Project Settings
2. Ensure `FIREBASE_PROJECT_ID` matches exactly (case-sensitive)

#### Issue: "Firestore not enabled"
**Possible causes:**
- Firestore database not created in Firebase project

**Solutions:**
1. Go to Firebase Console > Firestore Database
2. Click "Create database" if not already created
3. Choose "Start in test mode" initially

### Diagnostic Commands

Run these commands to diagnose issues:

```bash
# Check environment variables
node scripts/firebase-env-checker.js

# Validate service account JSON
node scripts/firebase-service-account-setup.js validate path/to/service-account.json

# Test complete configuration
node scripts/firebase-config-validator.js

# Get troubleshooting help
node scripts/firebase-service-account-setup.js troubleshoot
```

## 🎯 Quick Reference

### Required Environment Variables
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=123456789012345678901
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/...
```

### Validation Commands
```bash
# Environment variables
node scripts/firebase-env-checker.js

# Service account JSON
node scripts/firebase-service-account-setup.js validate <json-file>

# Complete configuration
node scripts/firebase-config-validator.js

# Interactive setup
node scripts/firebase-service-account-setup.js wizard
```

### Setup Checklist
- [ ] Firebase project created
- [ ] Firestore database enabled
- [ ] Service account JSON downloaded
- [ ] Environment variables configured in .env
- [ ] Private key format validated
- [ ] Firestore security rules configured and published
- [ ] Configuration validated with scripts
- [ ] Database initialized

## 🆘 Getting Help

If you're still having issues after following this guide:

1. **Run all diagnostic scripts** to identify specific problems
2. **Check Firebase Console** for error messages and project status
3. **Verify each step** was completed correctly
4. **Use the interactive setup wizard**: `node scripts/firebase-service-account-setup.js wizard`

## 📚 Additional Resources

- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Firestore Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Console](https://console.firebase.google.com/)

## 🔐 Security Best Practices

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

---

This guide should get your Firebase setup working correctly. If you encounter any issues, use the diagnostic tools and troubleshooting section to resolve them quickly.