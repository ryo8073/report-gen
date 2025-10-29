// Firebase Configuration Validator
// Validates Firebase environment variables and provides setup guidance

import fs from 'fs';
import path from 'path';

// Load environment variables from .env file
function loadEnvFile() {
  try {
    if (fs.existsSync('.env')) {
      const envContent = fs.readFileSync('.env', 'utf8');
      const lines = envContent.split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            let value = valueParts.join('=');
            // Remove surrounding quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || 
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            process.env[key.trim()] = value;
          }
        }
      }
    }
  } catch (error) {
    console.warn('Warning: Could not load .env file:', error.message);
  }
}

// Load .env file at startup
loadEnvFile();

class FirebaseConfigValidator {
  constructor() {
    this.requiredEnvVars = {
      // Firebase Admin SDK (Server-side)
      FIREBASE_PROJECT_ID: 'Firebase project ID',
      FIREBASE_PRIVATE_KEY_ID: 'Private key ID from service account',
      FIREBASE_PRIVATE_KEY: 'Private key from service account (with \\n line breaks)',
      FIREBASE_CLIENT_EMAIL: 'Service account email',
      FIREBASE_CLIENT_ID: 'Client ID from service account',
      FIREBASE_CLIENT_X509_CERT_URL: 'Client certificate URL from service account',
      
      // Firebase Client SDK (Client-side) - Optional for admin-only setup
      FIREBASE_API_KEY: 'Firebase web API key (optional for client-side)',
      FIREBASE_AUTH_DOMAIN: 'Firebase auth domain (optional for client-side)',
      FIREBASE_STORAGE_BUCKET: 'Firebase storage bucket (optional for client-side)',
      FIREBASE_MESSAGING_SENDER_ID: 'Firebase messaging sender ID (optional for client-side)',
      FIREBASE_APP_ID: 'Firebase app ID (optional for client-side)'
    };

    this.criticalEnvVars = [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_PRIVATE_KEY_ID', 
      'FIREBASE_PRIVATE_KEY',
      'FIREBASE_CLIENT_EMAIL',
      'FIREBASE_CLIENT_ID',
      'FIREBASE_CLIENT_X509_CERT_URL'
    ];
  }

  /**
   * Validate all Firebase environment variables
   */
  validateEnvironmentVariables() {
    console.log('🔍 Validating Firebase environment variables...\n');
    
    const missing = [];
    const invalid = [];
    const warnings = [];

    // Check for .env file
    if (!fs.existsSync('.env')) {
      console.error('❌ .env file not found!');
      console.log('📝 Please copy env.example to .env and configure your Firebase settings.\n');
      return { success: false, missing: Object.keys(this.requiredEnvVars) };
    }

    // Check each required environment variable
    for (const [envVar, description] of Object.entries(this.requiredEnvVars)) {
      const value = process.env[envVar];
      
      if (!value || value.trim() === '' || value === 'your_value_here') {
        if (this.criticalEnvVars.includes(envVar)) {
          missing.push({ var: envVar, description });
        } else {
          warnings.push({ var: envVar, description });
        }
      } else {
        // Validate specific formats
        const validation = this.validateSpecificVariable(envVar, value);
        if (!validation.valid) {
          invalid.push({ var: envVar, description, issue: validation.issue });
        } else {
          console.log(`✅ ${envVar}: Valid`);
        }
      }
    }

    // Report results
    if (missing.length > 0) {
      console.log('\n❌ Missing critical Firebase environment variables:');
      missing.forEach(({ var: envVar, description }) => {
        console.log(`   • ${envVar}: ${description}`);
      });
    }

    if (invalid.length > 0) {
      console.log('\n⚠️  Invalid Firebase environment variables:');
      invalid.forEach(({ var: envVar, description, issue }) => {
        console.log(`   • ${envVar}: ${issue}`);
      });
    }

    if (warnings.length > 0) {
      console.log('\n⚠️  Optional Firebase environment variables (for client-side features):');
      warnings.forEach(({ var: envVar, description }) => {
        console.log(`   • ${envVar}: ${description}`);
      });
    }

    const success = missing.length === 0 && invalid.length === 0;
    
    if (success) {
      console.log('\n✅ All critical Firebase environment variables are configured!');
    } else {
      console.log('\n❌ Firebase configuration is incomplete. See setup guide below.');
    }

    return { 
      success, 
      missing: missing.map(m => m.var), 
      invalid: invalid.map(i => i.var),
      warnings: warnings.map(w => w.var)
    };
  }

  /**
   * Validate specific environment variable formats
   */
  validateSpecificVariable(envVar, value) {
    switch (envVar) {
      case 'FIREBASE_PROJECT_ID':
        if (!/^[a-z0-9-]+$/.test(value)) {
          return { valid: false, issue: 'Project ID should contain only lowercase letters, numbers, and hyphens' };
        }
        break;
        
      case 'FIREBASE_PRIVATE_KEY':
        if (!value.includes('BEGIN PRIVATE KEY') || !value.includes('END PRIVATE KEY')) {
          return { valid: false, issue: 'Private key should be a complete PEM format key with BEGIN/END markers' };
        }
        if (!value.includes('\\n')) {
          return { valid: false, issue: 'Private key should contain \\n line breaks (not actual newlines)' };
        }
        break;
        
      case 'FIREBASE_CLIENT_EMAIL':
        if (!value.includes('@') || !value.includes('.iam.gserviceaccount.com')) {
          return { valid: false, issue: 'Client email should be a service account email ending with .iam.gserviceaccount.com' };
        }
        break;
        
      case 'FIREBASE_CLIENT_X509_CERT_URL':
        if (!value.startsWith('https://www.googleapis.com/robot/v1/metadata/x509/')) {
          return { valid: false, issue: 'Client certificate URL should start with https://www.googleapis.com/robot/v1/metadata/x509/' };
        }
        break;
    }
    
    return { valid: true };
  }

  /**
   * Test Firebase connection
   */
  async testFirebaseConnection() {
    console.log('\n🔗 Testing Firebase connection...');
    
    try {
      // Import Firebase admin after env validation
      const { default: adminApp, db } = await import('../lib/firebase-admin.js');
      
      // Test Firestore connection
      const testDoc = db.collection('_test').doc('connection');
      await testDoc.set({ timestamp: new Date(), test: true });
      await testDoc.delete();
      
      console.log('✅ Firebase Admin SDK connection successful');
      console.log('✅ Firestore database connection successful');
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Firebase connection failed:', error.message);
      
      if (error.message.includes('service account')) {
        console.log('💡 This usually means your service account credentials are incorrect.');
      } else if (error.message.includes('permission')) {
        console.log('💡 This usually means your Firestore security rules need to be configured.');
      } else if (error.message.includes('project')) {
        console.log('💡 This usually means your Firebase project ID is incorrect.');
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Display comprehensive setup guide
   */
  displaySetupGuide() {
    console.log('\n📚 Firebase Setup Guide');
    console.log('========================\n');
    
    console.log('🔥 Step 1: Create Firebase Project');
    console.log('   1. Go to https://console.firebase.google.com/');
    console.log('   2. Click "Create a project" or select existing project');
    console.log('   3. Enable Firestore Database in your project');
    console.log('   4. Note your Project ID (shown in project settings)\n');
    
    console.log('🔑 Step 2: Create Service Account');
    console.log('   1. Go to Firebase Console > Project Settings > Service Accounts');
    console.log('   2. Click "Generate new private key"');
    console.log('   3. Download the JSON file');
    console.log('   4. Extract the following values from the JSON:\n');
    console.log('      • project_id → FIREBASE_PROJECT_ID');
    console.log('      • private_key_id → FIREBASE_PRIVATE_KEY_ID');
    console.log('      • private_key → FIREBASE_PRIVATE_KEY (keep \\n as literal \\n)');
    console.log('      • client_email → FIREBASE_CLIENT_EMAIL');
    console.log('      • client_id → FIREBASE_CLIENT_ID');
    console.log('      • client_x509_cert_url → FIREBASE_CLIENT_X509_CERT_URL\n');
    
    console.log('📝 Step 3: Configure Environment Variables');
    console.log('   1. Copy env.example to .env');
    console.log('   2. Replace the Firebase values with your actual credentials');
    console.log('   3. Make sure FIREBASE_PRIVATE_KEY keeps \\n as literal text (not actual newlines)\n');
    
    console.log('🔒 Step 4: Configure Firestore Security Rules');
    console.log('   1. Go to Firebase Console > Firestore Database > Rules');
    console.log('   2. Replace the default rules with:\n');
    console.log('   ```');
    console.log('   rules_version = \'2\';');
    console.log('   service cloud.firestore {');
    console.log('     match /databases/{database}/documents {');
    console.log('       // Allow authenticated users to read/write their own data');
    console.log('       match /users/{userId} {');
    console.log('         allow read, write: if request.auth != null && request.auth.uid == userId;');
    console.log('       }');
    console.log('       ');
    console.log('       // Allow authenticated users to write usage logs');
    console.log('       match /usage_logs/{document} {');
    console.log('         allow create: if request.auth != null;');
    console.log('         allow read: if request.auth != null && request.auth.uid == resource.data.userId;');
    console.log('       }');
    console.log('       ');
    console.log('       // Allow authenticated users to manage their report generations');
    console.log('       match /report_generations/{document} {');
    console.log('         allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;');
    console.log('       }');
    console.log('       ');
    console.log('       // Allow authenticated users to manage their sessions');
    console.log('       match /sessions/{document} {');
    console.log('         allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;');
    console.log('       }');
    console.log('     }');
    console.log('   }');
    console.log('   ```\n');
    
    console.log('✅ Step 5: Test Configuration');
    console.log('   Run: node scripts/firebase-config-validator.js');
    console.log('   This will validate your setup and test the connection.\n');
    
    console.log('🚀 Step 6: Initialize Database');
    console.log('   Run: node scripts/init-firebase.js');
    console.log('   This will create the admin user and set up initial collections.\n');
    
    console.log('💡 Troubleshooting Tips:');
    console.log('   • Make sure your Firebase project has Firestore enabled');
    console.log('   • Verify your service account has the correct permissions');
    console.log('   • Check that your private key format is correct (with \\n line breaks)');
    console.log('   • Ensure your project ID matches exactly (case-sensitive)');
    console.log('   • Make sure Firestore security rules are published\n');
  }

  /**
   * Generate diagnostic report
   */
  generateDiagnosticReport() {
    console.log('\n🔍 Firebase Configuration Diagnostic Report');
    console.log('===========================================\n');
    
    // Check .env file
    const envExists = fs.existsSync('.env');
    console.log(`📄 .env file: ${envExists ? '✅ Found' : '❌ Missing'}`);
    
    if (envExists) {
      const envContent = fs.readFileSync('.env', 'utf8');
      const firebaseVars = Object.keys(this.requiredEnvVars).filter(key => 
        envContent.includes(key)
      );
      console.log(`🔧 Firebase variables in .env: ${firebaseVars.length}/${Object.keys(this.requiredEnvVars).length}`);
    }
    
    // Check example file
    const exampleExists = fs.existsSync('env.example');
    console.log(`📋 env.example file: ${exampleExists ? '✅ Found' : '❌ Missing'}`);
    
    // Check Firebase lib files
    const adminLibExists = fs.existsSync('lib/firebase-admin.js');
    const configLibExists = fs.existsSync('lib/firebase-config.js');
    console.log(`📚 Firebase admin lib: ${adminLibExists ? '✅ Found' : '❌ Missing'}`);
    console.log(`📚 Firebase config lib: ${configLibExists ? '✅ Found' : '❌ Missing'}`);
    
    // Check Node.js version
    console.log(`🟢 Node.js version: ${process.version}`);
    
    // Check if running in correct directory
    const packageExists = fs.existsSync('package.json');
    console.log(`📦 package.json: ${packageExists ? '✅ Found' : '❌ Missing (run from project root)'}`);
    
    console.log('\n');
  }

  /**
   * Run complete validation
   */
  async runCompleteValidation() {
    console.log('🔥 Firebase Configuration Validator');
    console.log('===================================\n');
    
    // Generate diagnostic report
    this.generateDiagnosticReport();
    
    // Validate environment variables
    const envValidation = this.validateEnvironmentVariables();
    
    if (!envValidation.success) {
      console.log('\n❌ Configuration validation failed!');
      this.displaySetupGuide();
      return false;
    }
    
    // Test Firebase connection
    const connectionTest = await this.testFirebaseConnection();
    
    if (!connectionTest.success) {
      console.log('\n❌ Firebase connection test failed!');
      console.log('\n💡 Common solutions:');
      console.log('   • Double-check your service account credentials');
      console.log('   • Verify your Firestore security rules are configured');
      console.log('   • Ensure your Firebase project has Firestore enabled');
      console.log('   • Check that your project ID is correct\n');
      this.displaySetupGuide();
      return false;
    }
    
    console.log('\n🎉 Firebase configuration is valid and connection successful!');
    console.log('✅ Your system is ready to use Firebase.');
    
    return true;
  }
}

// Export for use in other modules
export default FirebaseConfigValidator;

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new FirebaseConfigValidator();
  validator.runCompleteValidation().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('💥 Validation failed with error:', error);
    process.exit(1);
  });
}