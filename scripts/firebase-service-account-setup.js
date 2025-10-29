#!/usr/bin/env node

/**
 * Firebase Service Account Setup Guide and Validator
 * 
 * This script provides step-by-step Firebase project setup instructions,
 * validates service account credentials, and implements Firestore security rules setup guide.
 * 
 * Requirements addressed: 6.2, 6.3, 6.5
 */

import fs from 'fs';
import readline from 'readline';

class FirebaseServiceAccountSetup {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * Display comprehensive Firebase project setup instructions
   */
  displayProjectSetupInstructions() {
    console.log('🔥 Firebase Project Setup Guide');
    console.log('===============================');
    console.log('');
    console.log('This guide will walk you through setting up Firebase for your report generation system.');
    console.log('Follow each step carefully to ensure proper configuration.');
    console.log('');
    
    console.log('📋 Prerequisites');
    console.log('================');
    console.log('✓ Google account');
    console.log('✓ Internet connection');
    console.log('✓ Web browser');
    console.log('✓ Text editor for .env file');
    console.log('');

    console.log('🚀 Step 1: Create Firebase Project');
    console.log('===================================');
    console.log('');
    console.log('1.1 Open Firebase Console');
    console.log('    • Go to: https://console.firebase.google.com/');
    console.log('    • Sign in with your Google account');
    console.log('');
    console.log('1.2 Create New Project');
    console.log('    • Click "Create a project" (or "Add project")');
    console.log('    • Enter project name (e.g., "report-generator")');
    console.log('    • Choose a unique Project ID (this will be your FIREBASE_PROJECT_ID)');
    console.log('    • Select your country/region');
    console.log('    • Accept Firebase terms');
    console.log('');
    console.log('1.3 Configure Google Analytics (Optional)');
    console.log('    • Choose "Enable Google Analytics" or "Not right now"');
    console.log('    • If enabled, select or create Analytics account');
    console.log('    • Click "Create project"');
    console.log('');
    console.log('1.4 Wait for Project Creation');
    console.log('    • Wait for "Your new project is ready" message');
    console.log('    • Click "Continue"');
    console.log('');

    console.log('🗄️  Step 2: Enable Firestore Database');
    console.log('=====================================');
    console.log('');
    console.log('2.1 Navigate to Firestore');
    console.log('    • In Firebase Console, click "Firestore Database" in left sidebar');
    console.log('    • Click "Create database"');
    console.log('');
    console.log('2.2 Configure Security Rules');
    console.log('    • Choose "Start in test mode" (we\'ll configure proper rules later)');
    console.log('    • Click "Next"');
    console.log('');
    console.log('2.3 Select Database Location');
    console.log('    • Choose a location close to your users');
    console.log('    • Note: This cannot be changed later');
    console.log('    • Click "Done"');
    console.log('');
    console.log('2.4 Wait for Database Creation');
    console.log('    • Wait for Firestore to be created');
    console.log('    • You should see the Firestore console with empty collections');
    console.log('');

    console.log('🔑 Step 3: Create Service Account');
    console.log('=================================');
    console.log('');
    console.log('3.1 Navigate to Project Settings');
    console.log('    • Click the gear icon (⚙️) next to "Project Overview"');
    console.log('    • Select "Project settings"');
    console.log('');
    console.log('3.2 Go to Service Accounts Tab');
    console.log('    • Click on "Service accounts" tab');
    console.log('    • You should see "Firebase Admin SDK" section');
    console.log('');
    console.log('3.3 Generate Private Key');
    console.log('    • Click "Generate new private key"');
    console.log('    • A dialog will appear with security warning');
    console.log('    • Click "Generate key"');
    console.log('');
    console.log('3.4 Download Service Account File');
    console.log('    • A JSON file will be automatically downloaded');
    console.log('    • File name format: "project-id-firebase-adminsdk-xxxxx-xxxxxxxxxx.json"');
    console.log('    • Save this file securely (DO NOT commit to version control)');
    console.log('');

    console.log('📝 Step 4: Extract Credentials from JSON');
    console.log('=========================================');
    console.log('');
    console.log('4.1 Open the Downloaded JSON File');
    console.log('    • Open the service account JSON file in a text editor');
    console.log('    • You should see a structure like this:');
    console.log('');
    console.log('    {');
    console.log('      "type": "service_account",');
    console.log('      "project_id": "your-project-id",');
    console.log('      "private_key_id": "abc123...",');
    console.log('      "private_key": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",');
    console.log('      "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",');
    console.log('      "client_id": "123456789012345678901",');
    console.log('      "auth_uri": "https://accounts.google.com/o/oauth2/auth",');
    console.log('      "token_uri": "https://oauth2.googleapis.com/token",');
    console.log('      "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",');
    console.log('      "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."');
    console.log('    }');
    console.log('');
    console.log('4.2 Map JSON Fields to Environment Variables');
    console.log('    Extract these values for your .env file:');
    console.log('');
    console.log('    JSON Field                    → Environment Variable');
    console.log('    ─────────────────────────────────────────────────────');
    console.log('    "project_id"                  → FIREBASE_PROJECT_ID');
    console.log('    "private_key_id"              → FIREBASE_PRIVATE_KEY_ID');
    console.log('    "private_key"                 → FIREBASE_PRIVATE_KEY');
    console.log('    "client_email"                → FIREBASE_CLIENT_EMAIL');
    console.log('    "client_id"                   → FIREBASE_CLIENT_ID');
    console.log('    "client_x509_cert_url"        → FIREBASE_CLIENT_X509_CERT_URL');
    console.log('');

    console.log('⚠️  Step 5: Important Private Key Formatting');
    console.log('============================================');
    console.log('');
    console.log('5.1 Private Key Special Handling');
    console.log('    • The private_key field contains \\n characters');
    console.log('    • These must remain as literal \\n (not actual newlines)');
    console.log('    • Wrap the entire key in double quotes in your .env file');
    console.log('');
    console.log('5.2 Correct Format Example');
    console.log('    FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\\n-----END PRIVATE KEY-----\\n"');
    console.log('');
    console.log('5.3 Common Mistakes to Avoid');
    console.log('    ❌ Converting \\n to actual newlines');
    console.log('    ❌ Removing quotes around the private key');
    console.log('    ❌ Adding extra spaces or characters');
    console.log('    ❌ Modifying the key content between BEGIN and END');
    console.log('');
  }

  /**
   * Display Firestore security rules setup guide
   */
  displayFirestoreRulesGuide() {
    console.log('🔒 Firestore Security Rules Setup');
    console.log('=================================');
    console.log('');
    console.log('Security rules control access to your Firestore database.');
    console.log('Follow these steps to configure proper security for your application.');
    console.log('');

    console.log('📋 Step 1: Navigate to Firestore Rules');
    console.log('======================================');
    console.log('');
    console.log('1.1 Open Firestore Console');
    console.log('    • Go to Firebase Console > Firestore Database');
    console.log('    • Click on "Rules" tab at the top');
    console.log('');
    console.log('1.2 Review Current Rules');
    console.log('    • You should see the current rules (likely test mode)');
    console.log('    • Test mode allows all reads/writes (not secure for production)');
    console.log('');

    console.log('📝 Step 2: Configure Production Rules');
    console.log('=====================================');
    console.log('');
    console.log('2.1 Replace Default Rules');
    console.log('    • Select all text in the rules editor');
    console.log('    • Replace with the following secure rules:');
    console.log('');
    console.log('```javascript');
    console.log('rules_version = \'2\';');
    console.log('service cloud.firestore {');
    console.log('  match /databases/{database}/documents {');
    console.log('    // Users can only access their own user document');
    console.log('    match /users/{userId} {');
    console.log('      allow read, write: if request.auth != null && request.auth.uid == userId;');
    console.log('    }');
    console.log('    ');
    console.log('    // Users can create usage logs and read their own');
    console.log('    match /usage_logs/{document} {');
    console.log('      allow create: if request.auth != null;');
    console.log('      allow read: if request.auth != null && request.auth.uid == resource.data.userId;');
    console.log('    }');
    console.log('    ');
    console.log('    // Users can manage their own report generations');
    console.log('    match /report_generations/{document} {');
    console.log('      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;');
    console.log('    }');
    console.log('    ');
    console.log('    // Users can manage their own sessions');
    console.log('    match /sessions/{document} {');
    console.log('      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;');
    console.log('    }');
    console.log('    ');
    console.log('    // Allow service account (admin) operations for system initialization');
    console.log('    match /{document=**} {');
    console.log('      allow read, write: if request.auth != null && ');
    console.log('        request.auth.token.email != null &&');
    console.log('        request.auth.token.email.matches(\'.*@.*\\\\.iam\\\\.gserviceaccount\\\\.com$\');');
    console.log('    }');
    console.log('  }');
    console.log('}');
    console.log('```');
    console.log('');

    console.log('✅ Step 3: Publish Rules');
    console.log('========================');
    console.log('');
    console.log('3.1 Review Rules');
    console.log('    • Check that the rules are correctly formatted');
    console.log('    • Look for any syntax errors (highlighted in red)');
    console.log('');
    console.log('3.2 Publish Rules');
    console.log('    • Click "Publish" button');
    console.log('    • Wait for "Rules published successfully" message');
    console.log('    • Rules take effect immediately');
    console.log('');

    console.log('🔍 Step 4: Test Rules (Optional)');
    console.log('================================');
    console.log('');
    console.log('4.1 Use Rules Playground');
    console.log('    • Click "Rules playground" tab');
    console.log('    • Test different scenarios:');
    console.log('      - Authenticated user accessing their own data');
    console.log('      - Unauthenticated user trying to access data');
    console.log('      - User trying to access another user\'s data');
    console.log('');

    console.log('📚 Understanding the Rules');
    console.log('==========================');
    console.log('');
    console.log('Rule Explanation:');
    console.log('');
    console.log('• users/{userId}: Users can only read/write their own user document');
    console.log('• usage_logs: Users can create logs and read their own logs');
    console.log('• report_generations: Users can manage their own report history');
    console.log('• sessions: Users can manage their own authentication sessions');
    console.log('• Service account rule: Allows admin operations for system setup');
    console.log('');
    console.log('Security Features:');
    console.log('');
    console.log('✓ Authentication required for all operations');
    console.log('✓ Users isolated to their own data');
    console.log('✓ Service account can perform admin operations');
    console.log('✓ No anonymous access allowed');
    console.log('✓ Prevents data leakage between users');
    console.log('');
  }

  /**
   * Validate service account credentials from JSON file
   */
  async validateServiceAccountJSON(jsonPath) {
    console.log('🔍 Service Account JSON Validation');
    console.log('==================================');
    console.log('');

    try {
      // Check if file exists
      if (!fs.existsSync(jsonPath)) {
        console.log(`❌ File not found: ${jsonPath}`);
        console.log('');
        console.log('💡 Make sure you:');
        console.log('   1. Downloaded the service account JSON from Firebase Console');
        console.log('   2. Provided the correct file path');
        console.log('   3. Have read permissions for the file');
        console.log('');
        return false;
      }

      // Read and parse JSON
      const jsonContent = fs.readFileSync(jsonPath, 'utf8');
      let serviceAccount;
      
      try {
        serviceAccount = JSON.parse(jsonContent);
      } catch (parseError) {
        console.log('❌ Invalid JSON format');
        console.log(`   Error: ${parseError.message}`);
        console.log('');
        console.log('💡 Make sure the file is a valid JSON file downloaded from Firebase');
        return false;
      }

      // Validate required fields
      const requiredFields = {
        type: 'service_account',
        project_id: 'string',
        private_key_id: 'string',
        private_key: 'string',
        client_email: 'string',
        client_id: 'string',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: 'string'
      };

      let isValid = true;
      const issues = [];

      for (const [field, expectedType] of Object.entries(requiredFields)) {
        if (!serviceAccount[field]) {
          issues.push(`Missing field: ${field}`);
          isValid = false;
        } else if (expectedType === 'string' && typeof serviceAccount[field] !== 'string') {
          issues.push(`Invalid type for ${field}: expected string`);
          isValid = false;
        } else if (expectedType !== 'string' && serviceAccount[field] !== expectedType) {
          issues.push(`Invalid value for ${field}: expected ${expectedType}`);
          isValid = false;
        }
      }

      // Specific validations
      if (serviceAccount.type !== 'service_account') {
        issues.push('Type must be "service_account"');
        isValid = false;
      }

      if (serviceAccount.client_email && !serviceAccount.client_email.includes('.iam.gserviceaccount.com')) {
        issues.push('client_email must be a service account email');
        isValid = false;
      }

      if (serviceAccount.private_key && !serviceAccount.private_key.includes('BEGIN PRIVATE KEY')) {
        issues.push('private_key must be a valid PEM format key');
        isValid = false;
      }

      // Display results
      if (isValid) {
        console.log('✅ Service account JSON is valid!');
        console.log('');
        console.log('📋 Extracted Information:');
        console.log(`   Project ID: ${serviceAccount.project_id}`);
        console.log(`   Client Email: ${serviceAccount.client_email}`);
        console.log(`   Client ID: ${serviceAccount.client_id}`);
        console.log(`   Private Key ID: ${serviceAccount.private_key_id.substring(0, 8)}...`);
        console.log('');
        
        // Generate .env template
        console.log('📝 Environment Variables for .env file:');
        console.log('');
        console.log(`FIREBASE_PROJECT_ID=${serviceAccount.project_id}`);
        console.log(`FIREBASE_PRIVATE_KEY_ID=${serviceAccount.private_key_id}`);
        console.log(`FIREBASE_PRIVATE_KEY="${serviceAccount.private_key}"`);
        console.log(`FIREBASE_CLIENT_EMAIL=${serviceAccount.client_email}`);
        console.log(`FIREBASE_CLIENT_ID=${serviceAccount.client_id}`);
        console.log(`FIREBASE_CLIENT_X509_CERT_URL=${serviceAccount.client_x509_cert_url}`);
        console.log('');
        console.log('💡 Copy these values to your .env file');
        console.log('');
        
        return true;
      } else {
        console.log('❌ Service account JSON has issues:');
        issues.forEach(issue => console.log(`   • ${issue}`));
        console.log('');
        console.log('💡 Please download a fresh service account JSON from Firebase Console');
        return false;
      }

    } catch (error) {
      console.log('❌ Error validating service account JSON:');
      console.log(`   ${error.message}`);
      console.log('');
      return false;
    }
  }

  /**
   * Interactive setup wizard
   */
  async runInteractiveSetup() {
    console.log('🧙‍♂️ Firebase Interactive Setup Wizard');
    console.log('======================================');
    console.log('');
    console.log('This wizard will guide you through the Firebase setup process.');
    console.log('You can exit at any time by pressing Ctrl+C.');
    console.log('');

    try {
      // Step 1: Check if user has Firebase project
      const hasProject = await this.askQuestion('Do you already have a Firebase project? (y/n): ');
      
      if (hasProject.toLowerCase() !== 'y') {
        console.log('');
        this.displayProjectSetupInstructions();
        
        const projectCreated = await this.askQuestion('Have you created your Firebase project and enabled Firestore? (y/n): ');
        if (projectCreated.toLowerCase() !== 'y') {
          console.log('');
          console.log('Please complete the project setup first, then run this wizard again.');
          return false;
        }
      }

      // Step 2: Check if user has service account
      console.log('');
      const hasServiceAccount = await this.askQuestion('Do you have a service account JSON file? (y/n): ');
      
      if (hasServiceAccount.toLowerCase() !== 'y') {
        console.log('');
        console.log('🔑 Service Account Creation Instructions');
        console.log('=======================================');
        console.log('');
        console.log('1. Go to Firebase Console > Project Settings > Service Accounts');
        console.log('2. Click "Generate new private key"');
        console.log('3. Download the JSON file');
        console.log('4. Come back here with the file path');
        console.log('');
        
        const serviceAccountCreated = await this.askQuestion('Have you downloaded the service account JSON file? (y/n): ');
        if (serviceAccountCreated.toLowerCase() !== 'y') {
          console.log('');
          console.log('Please download the service account file first, then run this wizard again.');
          return false;
        }
      }

      // Step 3: Validate service account JSON
      console.log('');
      const jsonPath = await this.askQuestion('Enter the path to your service account JSON file: ');
      
      const isValidJSON = await this.validateServiceAccountJSON(jsonPath.trim());
      if (!isValidJSON) {
        console.log('Please fix the service account JSON issues and try again.');
        return false;
      }

      // Step 4: Firestore rules setup
      console.log('');
      const needsRulesSetup = await this.askQuestion('Do you need help setting up Firestore security rules? (y/n): ');
      
      if (needsRulesSetup.toLowerCase() === 'y') {
        console.log('');
        this.displayFirestoreRulesGuide();
        
        console.log('');
        const rulesConfigured = await this.askQuestion('Have you configured and published the Firestore rules? (y/n): ');
        if (rulesConfigured.toLowerCase() !== 'y') {
          console.log('');
          console.log('⚠️  Warning: Your database may not work properly without correct security rules.');
          console.log('Please configure the rules when you have a chance.');
        }
      }

      // Step 5: Final instructions
      console.log('');
      console.log('🎉 Setup Complete!');
      console.log('==================');
      console.log('');
      console.log('Next steps:');
      console.log('1. Update your .env file with the environment variables shown above');
      console.log('2. Run: node scripts/firebase-env-checker.js (validate environment)');
      console.log('3. Run: node scripts/firebase-config-validator.js (test connection)');
      console.log('4. Run: node scripts/init-firebase.js (initialize database)');
      console.log('');
      
      return true;

    } catch (error) {
      console.log('');
      console.log('❌ Setup wizard error:', error.message);
      return false;
    } finally {
      this.rl.close();
    }
  }

  /**
   * Ask a question and wait for user input
   */
  askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }

  /**
   * Display comprehensive troubleshooting guide
   */
  displayTroubleshootingGuide() {
    console.log('🔧 Firebase Setup Troubleshooting Guide');
    console.log('=======================================');
    console.log('');

    console.log('❌ Common Issue: "Service account key is invalid"');
    console.log('─────────────────────────────────────────────────');
    console.log('Possible causes:');
    console.log('• Private key format is incorrect');
    console.log('• Missing or extra quotes around private key');
    console.log('• \\n characters converted to actual newlines');
    console.log('• Service account JSON file is corrupted');
    console.log('');
    console.log('Solutions:');
    console.log('1. Re-download service account JSON from Firebase Console');
    console.log('2. Ensure private key has \\n as literal text (not actual newlines)');
    console.log('3. Wrap private key in double quotes in .env file');
    console.log('4. Run: node scripts/firebase-service-account-setup.js validate <json-file>');
    console.log('');

    console.log('❌ Common Issue: "Permission denied" errors');
    console.log('───────────────────────────────────────────');
    console.log('Possible causes:');
    console.log('• Firestore security rules not configured');
    console.log('• Rules not published');
    console.log('• Service account lacks permissions');
    console.log('');
    console.log('Solutions:');
    console.log('1. Configure Firestore security rules as shown in the guide');
    console.log('2. Ensure rules are published (not just saved)');
    console.log('3. Wait a few minutes for rules to propagate');
    console.log('4. Check Firebase Console > Firestore > Rules');
    console.log('');

    console.log('❌ Common Issue: "Project not found"');
    console.log('───────────────────────────────────');
    console.log('Possible causes:');
    console.log('• Incorrect project ID in .env file');
    console.log('• Project ID is case-sensitive');
    console.log('• Project was deleted or doesn\'t exist');
    console.log('');
    console.log('Solutions:');
    console.log('1. Verify project ID in Firebase Console > Project Settings');
    console.log('2. Ensure FIREBASE_PROJECT_ID matches exactly (case-sensitive)');
    console.log('3. Check that project exists and you have access');
    console.log('');

    console.log('❌ Common Issue: "Firestore not enabled"');
    console.log('───────────────────────────────────────');
    console.log('Possible causes:');
    console.log('• Firestore database not created in Firebase project');
    console.log('• Wrong database mode selected');
    console.log('');
    console.log('Solutions:');
    console.log('1. Go to Firebase Console > Firestore Database');
    console.log('2. Click "Create database" if not already created');
    console.log('3. Choose "Start in test mode" initially');
    console.log('4. Configure security rules after creation');
    console.log('');

    console.log('💡 General Troubleshooting Tips');
    console.log('==============================');
    console.log('');
    console.log('• Always run validation scripts after making changes');
    console.log('• Check Firebase Console for error messages');
    console.log('• Ensure you\'re running commands from project root directory');
    console.log('• Verify Node.js version is 14 or higher');
    console.log('• Check that .env file exists and has correct permissions');
    console.log('• Look for typos in environment variable names');
    console.log('• Ensure no extra spaces or characters in .env values');
    console.log('');

    console.log('🆘 Getting Additional Help');
    console.log('==========================');
    console.log('');
    console.log('If you\'re still having issues:');
    console.log('');
    console.log('1. Run diagnostic scripts:');
    console.log('   • node scripts/firebase-env-checker.js');
    console.log('   • node scripts/firebase-config-validator.js');
    console.log('');
    console.log('2. Check Firebase documentation:');
    console.log('   • https://firebase.google.com/docs/admin/setup');
    console.log('   • https://firebase.google.com/docs/firestore/security/get-started');
    console.log('');
    console.log('3. Verify your setup step by step using this guide');
    console.log('');
  }
}

// Export for use in other modules
export default FirebaseServiceAccountSetup;

// Command line interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const setup = new FirebaseServiceAccountSetup();
  const command = process.argv[2];
  const arg = process.argv[3];

  switch (command) {
    case 'guide':
      setup.displayProjectSetupInstructions();
      break;
    case 'rules':
      setup.displayFirestoreRulesGuide();
      break;
    case 'validate':
      if (arg) {
        setup.validateServiceAccountJSON(arg).then(success => {
          process.exit(success ? 0 : 1);
        });
      } else {
        console.log('Usage: node scripts/firebase-service-account-setup.js validate <json-file-path>');
        process.exit(1);
      }
      break;
    case 'troubleshoot':
      setup.displayTroubleshootingGuide();
      break;
    case 'wizard':
    default:
      setup.runInteractiveSetup().then(success => {
        process.exit(success ? 0 : 1);
      }).catch(error => {
        console.error('Setup wizard failed:', error.message);
        process.exit(1);
      });
      break;
  }
}