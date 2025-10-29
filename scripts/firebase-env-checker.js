#!/usr/bin/env node

/**
 * Firebase Environment Variable Checker
 * 
 * This script validates all required Firebase environment variables
 * and provides specific error messages for each missing variable.
 * 
 * Requirements addressed: 6.1, 6.4
 */

import fs from 'fs';
import path from 'path';

class FirebaseEnvChecker {
  constructor() {
    // Critical environment variables required for Firebase Admin SDK
    this.criticalEnvVars = {
      FIREBASE_PROJECT_ID: {
        description: 'Firebase project ID (found in Firebase Console > Project Settings)',
        example: 'my-project-id',
        validation: (value) => /^[a-z0-9-]+$/.test(value),
        errorMessage: 'Project ID should contain only lowercase letters, numbers, and hyphens'
      },
      FIREBASE_PRIVATE_KEY_ID: {
        description: 'Private key ID from service account JSON file',
        example: 'abc123def456...',
        validation: (value) => value && value.length > 10,
        errorMessage: 'Private key ID should be a long alphanumeric string'
      },
      FIREBASE_PRIVATE_KEY: {
        description: 'Private key from service account JSON (keep \\n as literal text)',
        example: '"-----BEGIN PRIVATE KEY-----\\nMIIE...\\n-----END PRIVATE KEY-----\\n"',
        validation: (value) => value && value.includes('BEGIN PRIVATE KEY') && value.includes('END PRIVATE KEY'),
        errorMessage: 'Private key must be a complete PEM format key with BEGIN/END markers and \\n line breaks'
      },
      FIREBASE_CLIENT_EMAIL: {
        description: 'Service account email from Firebase Console',
        example: 'firebase-adminsdk-xxxxx@project-id.iam.gserviceaccount.com',
        validation: (value) => value && value.includes('@') && value.includes('.iam.gserviceaccount.com'),
        errorMessage: 'Client email must be a service account email ending with .iam.gserviceaccount.com'
      },
      FIREBASE_CLIENT_ID: {
        description: 'Client ID from service account JSON file',
        example: '123456789012345678901',
        validation: (value) => value && /^\d+$/.test(value),
        errorMessage: 'Client ID should be a numeric string'
      },
      FIREBASE_CLIENT_X509_CERT_URL: {
        description: 'Client certificate URL from service account JSON',
        example: 'https://www.googleapis.com/robot/v1/metadata/x509/...',
        validation: (value) => value && value.startsWith('https://www.googleapis.com/robot/v1/metadata/x509/'),
        errorMessage: 'Certificate URL should start with https://www.googleapis.com/robot/v1/metadata/x509/'
      }
    };

    // Optional environment variables for client-side Firebase features
    this.optionalEnvVars = {
      FIREBASE_API_KEY: {
        description: 'Firebase web API key (for client-side authentication)',
        example: 'AIzaSyC...',
        validation: (value) => !value || value.startsWith('AIza'),
        errorMessage: 'API key should start with "AIza"'
      },
      FIREBASE_AUTH_DOMAIN: {
        description: 'Firebase auth domain (for client-side authentication)',
        example: 'project-id.firebaseapp.com',
        validation: (value) => !value || value.includes('.firebaseapp.com'),
        errorMessage: 'Auth domain should end with .firebaseapp.com'
      },
      FIREBASE_STORAGE_BUCKET: {
        description: 'Firebase storage bucket (for file uploads)',
        example: 'project-id.appspot.com',
        validation: (value) => !value || value.includes('.appspot.com'),
        errorMessage: 'Storage bucket should end with .appspot.com'
      },
      FIREBASE_MESSAGING_SENDER_ID: {
        description: 'Firebase messaging sender ID (for push notifications)',
        example: '123456789012',
        validation: (value) => !value || /^\d+$/.test(value),
        errorMessage: 'Messaging sender ID should be numeric'
      },
      FIREBASE_APP_ID: {
        description: 'Firebase app ID (for client-side features)',
        example: '1:123456789012:web:abcdef123456789',
        validation: (value) => !value || value.includes(':web:'),
        errorMessage: 'App ID should contain ":web:" for web applications'
      }
    };
  }

  /**
   * Load environment variables from .env file
   */
  loadEnvFile() {
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
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error loading .env file:', error.message);
      return false;
    }
  }

  /**
   * Check if .env file exists and provide setup instructions
   */
  checkEnvFileExists() {
    const envExists = fs.existsSync('.env');
    const exampleExists = fs.existsSync('env.example');
    
    console.log('📄 Environment File Check');
    console.log('=========================');
    
    if (!envExists) {
      console.log('❌ .env file not found!');
      console.log('');
      console.log('🔧 REQUIRED ACTION:');
      if (exampleExists) {
        console.log('   1. Copy the example file: cp env.example .env');
        console.log('   2. Edit .env with your Firebase credentials');
      } else {
        console.log('   1. Create a .env file in the project root');
        console.log('   2. Add your Firebase environment variables');
      }
      console.log('   3. Run this script again to validate');
      console.log('');
      return false;
    }
    
    console.log('✅ .env file found');
    if (exampleExists) {
      console.log('✅ env.example file found');
    }
    console.log('');
    return true;
  }

  /**
   * Validate a specific environment variable
   */
  validateEnvVar(varName, config, value) {
    const result = {
      name: varName,
      value: value,
      status: 'valid',
      message: '',
      required: true
    };

    // Check if variable exists
    if (!value || value.trim() === '' || value === 'your_value_here') {
      result.status = 'missing';
      result.message = `Missing: ${config.description}`;
      return result;
    }

    // Validate format if validation function exists
    if (config.validation && !config.validation(value)) {
      result.status = 'invalid';
      result.message = config.errorMessage || 'Invalid format';
      return result;
    }

    result.message = 'Valid';
    return result;
  }

  /**
   * Validate all critical environment variables
   */
  validateCriticalEnvVars() {
    console.log('🔍 Critical Firebase Environment Variables');
    console.log('==========================================');
    
    const results = [];
    let allValid = true;

    for (const [varName, config] of Object.entries(this.criticalEnvVars)) {
      const value = process.env[varName];
      const result = this.validateEnvVar(varName, config, value);
      results.push(result);

      // Display result
      const statusIcon = result.status === 'valid' ? '✅' : 
                        result.status === 'missing' ? '❌' : '⚠️';
      console.log(`${statusIcon} ${varName}: ${result.message}`);
      
      if (result.status !== 'valid') {
        allValid = false;
        console.log(`   📝 Expected: ${config.description}`);
        console.log(`   💡 Example: ${config.example}`);
        console.log('');
      }
    }

    console.log('');
    return { allValid, results };
  }

  /**
   * Validate optional environment variables
   */
  validateOptionalEnvVars() {
    console.log('🔧 Optional Firebase Environment Variables');
    console.log('==========================================');
    
    const results = [];
    let hasWarnings = false;

    for (const [varName, config] of Object.entries(this.optionalEnvVars)) {
      const value = process.env[varName];
      const result = this.validateEnvVar(varName, config, value);
      result.required = false;
      results.push(result);

      if (!value || value.trim() === '' || value === 'your_value_here') {
        console.log(`⚠️  ${varName}: Not set (optional for client-side features)`);
        console.log(`   📝 Purpose: ${config.description}`);
        hasWarnings = true;
      } else if (result.status === 'invalid') {
        console.log(`⚠️  ${varName}: ${result.message}`);
        console.log(`   💡 Example: ${config.example}`);
        hasWarnings = true;
      } else {
        console.log(`✅ ${varName}: Valid`);
      }
    }

    if (!hasWarnings) {
      console.log('✅ All optional variables are properly configured');
    }
    
    console.log('');
    return { hasWarnings, results };
  }

  /**
   * Generate environment setup checklist
   */
  generateSetupChecklist() {
    console.log('📋 Firebase Environment Setup Checklist');
    console.log('========================================');
    console.log('');
    console.log('□ Step 1: Create Firebase Project');
    console.log('  • Go to https://console.firebase.google.com/');
    console.log('  • Create new project or select existing');
    console.log('  • Enable Firestore Database');
    console.log('');
    console.log('□ Step 2: Create Service Account');
    console.log('  • Go to Project Settings > Service Accounts');
    console.log('  • Click "Generate new private key"');
    console.log('  • Download the JSON file');
    console.log('');
    console.log('□ Step 3: Extract Required Values');
    console.log('  From the service account JSON file:');
    
    for (const [varName, config] of Object.entries(this.criticalEnvVars)) {
      console.log(`  • ${varName}: ${config.description}`);
    }
    
    console.log('');
    console.log('□ Step 4: Configure .env File');
    console.log('  • Copy env.example to .env');
    console.log('  • Replace placeholder values with actual credentials');
    console.log('  • Keep private key \\n as literal text (not actual newlines)');
    console.log('');
    console.log('□ Step 5: Validate Configuration');
    console.log('  • Run: node scripts/firebase-env-checker.js');
    console.log('  • Fix any validation errors');
    console.log('  • Test Firebase connection');
    console.log('');
    console.log('□ Step 6: Configure Firestore Rules');
    console.log('  • Set up security rules in Firebase Console');
    console.log('  • Test database operations');
    console.log('');
  }

  /**
   * Display specific error messages for missing variables
   */
  displayMissingVariableHelp(missingVars) {
    if (missingVars.length === 0) return;

    console.log('🚨 Missing Environment Variables - Action Required');
    console.log('==================================================');
    console.log('');
    
    for (const varResult of missingVars) {
      const config = this.criticalEnvVars[varResult.name] || this.optionalEnvVars[varResult.name];
      if (!config) continue;

      console.log(`❌ ${varResult.name}`);
      console.log(`   Description: ${config.description}`);
      console.log(`   Example: ${config.example}`);
      console.log(`   Add to .env: ${varResult.name}=${config.example}`);
      console.log('');
    }

    console.log('💡 How to fix:');
    console.log('   1. Open your .env file');
    console.log('   2. Add the missing variables with your actual values');
    console.log('   3. Save the file and run this script again');
    console.log('');
  }

  /**
   * Display specific error messages for invalid variables
   */
  displayInvalidVariableHelp(invalidVars) {
    if (invalidVars.length === 0) return;

    console.log('⚠️  Invalid Environment Variables - Format Issues');
    console.log('=================================================');
    console.log('');
    
    for (const varResult of invalidVars) {
      const config = this.criticalEnvVars[varResult.name] || this.optionalEnvVars[varResult.name];
      if (!config) continue;

      console.log(`⚠️  ${varResult.name}`);
      console.log(`   Current value: ${varResult.value ? varResult.value.substring(0, 50) + '...' : 'empty'}`);
      console.log(`   Issue: ${varResult.message}`);
      console.log(`   Expected format: ${config.example}`);
      console.log('');
    }

    console.log('💡 How to fix:');
    console.log('   1. Check the format of the invalid variables');
    console.log('   2. Compare with the expected format shown above');
    console.log('   3. Update your .env file with the correct format');
    console.log('   4. Run this script again to validate');
    console.log('');
  }

  /**
   * Run complete environment variable validation
   */
  async runCompleteCheck() {
    console.log('🔥 Firebase Environment Variable Checker');
    console.log('========================================');
    console.log('');

    // Check if .env file exists
    if (!this.checkEnvFileExists()) {
      this.generateSetupChecklist();
      return false;
    }

    // Load environment variables
    const envLoaded = this.loadEnvFile();
    if (!envLoaded) {
      console.log('❌ Failed to load .env file');
      return false;
    }

    // Validate critical environment variables
    const criticalValidation = this.validateCriticalEnvVars();
    
    // Validate optional environment variables
    const optionalValidation = this.validateOptionalEnvVars();

    // Collect results
    const allResults = [...criticalValidation.results, ...optionalValidation.results];
    const missingVars = allResults.filter(r => r.status === 'missing');
    const invalidVars = allResults.filter(r => r.status === 'invalid');

    // Display specific help for issues
    this.displayMissingVariableHelp(missingVars);
    this.displayInvalidVariableHelp(invalidVars);

    // Final summary
    console.log('📊 Validation Summary');
    console.log('====================');
    
    if (criticalValidation.allValid) {
      console.log('✅ All critical Firebase environment variables are valid');
      
      if (optionalValidation.hasWarnings) {
        console.log('⚠️  Some optional variables are missing (client-side features may not work)');
      } else {
        console.log('✅ All optional variables are configured');
      }
      
      console.log('');
      console.log('🎉 Environment configuration is ready!');
      console.log('');
      console.log('📋 Next steps:');
      console.log('   1. Run: node scripts/firebase-config-validator.js (test connection)');
      console.log('   2. Run: node scripts/init-firebase.js (initialize database)');
      console.log('   3. Test your application');
      console.log('');
      
      return true;
    } else {
      console.log('❌ Critical environment variables are missing or invalid');
      console.log('');
      console.log('🔧 Required actions:');
      console.log('   1. Fix the issues shown above');
      console.log('   2. Run this script again to validate');
      console.log('   3. Proceed with Firebase connection testing');
      console.log('');
      
      return false;
    }
  }
}

// Export for use in other modules
export default FirebaseEnvChecker;

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const checker = new FirebaseEnvChecker();
  checker.runCompleteCheck().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('💥 Environment check failed:', error.message);
    process.exit(1);
  });
}