# Firebase Quick Reference

## Quick Setup Commands

```bash
# Validate Firebase configuration
npm run firebase:validate

# Quick setup validation (recommended)
npm run firebase:setup

# Initialize database after setup
npm run firebase:init
```

## Required Environment Variables

Add these to your `.env` file:

```env
# Firebase Admin SDK (Required)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Key-Here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=123456789012345678901
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/...

# Firebase Client SDK (Optional - for frontend features)
FIREBASE_API_KEY=your-web-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789012
FIREBASE_APP_ID=1:123456789012:web:abcdef123456789
```

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can manage their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Usage logs
    match /usage_logs/{document} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Report generations
    match /report_generations/{document} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Sessions
    match /sessions/{document} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Admin operations (service account)
    match /{document=**} {
      allow read, write: if request.auth != null && 
        request.auth.token.email != null &&
        request.auth.token.email.matches('.*@.*\\.iam\\.gserviceaccount\\.com$');
    }
  }
}
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Service account key is invalid" | Re-download service account JSON, check private key format |
| "Permission denied" | Configure Firestore security rules |
| "Project not found" | Verify FIREBASE_PROJECT_ID is correct |
| "Firestore not enabled" | Enable Firestore in Firebase Console |
| "Invalid private key format" | Ensure key has `\n` as literal characters |

## Validation Output

✅ **Success**: All green checkmarks, connection test passes
❌ **Failed**: Missing variables or connection issues
⚠️ **Warning**: Optional variables missing (client-side features)

## Files Created

- `scripts/firebase-config-validator.js` - Complete validation script
- `scripts/validate-firebase-setup.js` - Quick validation
- `lib/firebase-error-handler.js` - Error handling utilities
- `FIREBASE_SETUP_GUIDE.md` - Detailed setup instructions

## Next Steps After Setup

1. Run `npm run firebase:init` to initialize database
2. Test login functionality
3. Test report generation
4. Monitor Firebase Console for activity