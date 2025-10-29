// Firebase Error Handler
// Provides comprehensive error messages and troubleshooting guidance

export class FirebaseErrorHandler {
  
  /**
   * Get user-friendly error message for Firebase errors
   */
  static getUserFriendlyError(error) {
    const errorCode = error.code || error.message || 'unknown';
    const errorMessage = error.message || 'Unknown error occurred';
    
    // Common Firebase Admin SDK errors
    const errorMappings = {
      'app/invalid-credential': {
        message: 'Firebase service account credentials are invalid.',
        solution: 'Please check your FIREBASE_PRIVATE_KEY and other service account credentials in your .env file.'
      },
      'app/invalid-app-credential': {
        message: 'Firebase app credentials are invalid.',
        solution: 'Verify your Firebase project configuration and service account setup.'
      },
      'permission-denied': {
        message: 'Permission denied accessing Firestore.',
        solution: 'Check your Firestore security rules and ensure they allow the required operations.'
      },
      'not-found': {
        message: 'Firestore document or collection not found.',
        solution: 'Ensure the database is properly initialized and collections exist.'
      },
      'already-exists': {
        message: 'Document already exists.',
        solution: 'This is usually not an error - the resource you\'re trying to create already exists.'
      },
      'unauthenticated': {
        message: 'Authentication required.',
        solution: 'Ensure the user is properly authenticated before accessing protected resources.'
      },
      'invalid-argument': {
        message: 'Invalid data provided to Firebase.',
        solution: 'Check the data format and ensure all required fields are provided.'
      },
      'deadline-exceeded': {
        message: 'Firebase operation timed out.',
        solution: 'Check your internet connection and Firebase project status.'
      },
      'unavailable': {
        message: 'Firebase service is temporarily unavailable.',
        solution: 'This is usually temporary. Try again in a few moments.'
      }
    };
    
    // Check for specific error patterns
    for (const [pattern, errorInfo] of Object.entries(errorMappings)) {
      if (errorCode.includes(pattern) || errorMessage.toLowerCase().includes(pattern)) {
        return {
          type: 'firebase',
          code: pattern,
          message: errorInfo.message,
          solution: errorInfo.solution,
          originalError: errorMessage
        };
      }
    }
    
    // Configuration-specific errors
    if (errorMessage.includes('service account') || errorMessage.includes('private key')) {
      return {
        type: 'configuration',
        code: 'invalid-service-account',
        message: 'Firebase service account configuration is incorrect.',
        solution: 'Run "node scripts/firebase-config-validator.js" to validate your configuration.',
        originalError: errorMessage
      };
    }
    
    if (errorMessage.includes('project') && errorMessage.includes('not found')) {
      return {
        type: 'configuration',
        code: 'invalid-project',
        message: 'Firebase project not found.',
        solution: 'Check your FIREBASE_PROJECT_ID in the .env file and ensure the project exists.',
        originalError: errorMessage
      };
    }
    
    if (errorMessage.includes('Firestore') && errorMessage.includes('not enabled')) {
      return {
        type: 'configuration',
        code: 'firestore-not-enabled',
        message: 'Firestore is not enabled for this project.',
        solution: 'Enable Firestore in your Firebase Console under Database section.',
        originalError: errorMessage
      };
    }
    
    // Generic error
    return {
      type: 'unknown',
      code: 'unknown',
      message: 'An unexpected Firebase error occurred.',
      solution: 'Check the error details and Firebase Console for more information.',
      originalError: errorMessage
    };
  }
  
  /**
   * Log error with context
   */
  static logError(error, context = {}) {
    const friendlyError = this.getUserFriendlyError(error);
    
    console.error('\n🔥 Firebase Error:', friendlyError.message);
    console.error('📍 Context:', context);
    console.error('💡 Solution:', friendlyError.solution);
    console.error('🔍 Original Error:', friendlyError.originalError);
    
    if (friendlyError.type === 'configuration') {
      console.error('\n🛠️  Configuration Help:');
      console.error('   • Run: node scripts/firebase-config-validator.js');
      console.error('   • Check: FIREBASE_SETUP_GUIDE.md');
      console.error('   • Verify: .env file has correct Firebase credentials');
    }
    
    console.error(''); // Empty line for readability
  }
  
  /**
   * Get setup validation errors
   */
  static getSetupValidationErrors() {
    const errors = [];
    
    // Check critical environment variables
    const criticalVars = [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_PRIVATE_KEY',
      'FIREBASE_CLIENT_EMAIL'
    ];
    
    for (const envVar of criticalVars) {
      if (!process.env[envVar] || process.env[envVar].trim() === '') {
        errors.push({
          type: 'missing-env-var',
          variable: envVar,
          message: `Missing required environment variable: ${envVar}`,
          solution: 'Add this variable to your .env file with the correct value from your Firebase service account.'
        });
      }
    }
    
    // Validate private key format
    if (process.env.FIREBASE_PRIVATE_KEY) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;
      if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
        errors.push({
          type: 'invalid-private-key',
          variable: 'FIREBASE_PRIVATE_KEY',
          message: 'Firebase private key format is invalid.',
          solution: 'Ensure the private key includes the full PEM format with BEGIN and END markers.'
        });
      }
    }
    
    // Validate email format
    if (process.env.FIREBASE_CLIENT_EMAIL) {
      const email = process.env.FIREBASE_CLIENT_EMAIL;
      if (!email.includes('@') || !email.includes('.iam.gserviceaccount.com')) {
        errors.push({
          type: 'invalid-email',
          variable: 'FIREBASE_CLIENT_EMAIL',
          message: 'Firebase client email format is invalid.',
          solution: 'Ensure the email is a valid service account email ending with .iam.gserviceaccount.com'
        });
      }
    }
    
    return errors;
  }
  
  /**
   * Display configuration help
   */
  static displayConfigurationHelp() {
    console.log('\n🔧 Firebase Configuration Help');
    console.log('==============================\n');
    
    const errors = this.getSetupValidationErrors();
    
    if (errors.length === 0) {
      console.log('✅ Basic environment variables look correct.');
      console.log('💡 If you\'re still having issues, run: node scripts/firebase-config-validator.js\n');
      return;
    }
    
    console.log('❌ Configuration Issues Found:\n');
    
    errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.message}`);
      console.log(`   💡 Solution: ${error.solution}\n`);
    });
    
    console.log('📖 For detailed setup instructions, see: FIREBASE_SETUP_GUIDE.md');
    console.log('🔍 For validation and testing, run: node scripts/firebase-config-validator.js\n');
  }
}

export default FirebaseErrorHandler;