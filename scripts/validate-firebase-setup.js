#!/usr/bin/env node

// Quick Firebase setup validation script
// This is a simplified version for quick checks

import FirebaseConfigValidator from './firebase-config-validator.js';

async function quickValidation() {
  console.log('🚀 Quick Firebase Setup Validation');
  console.log('==================================\n');
  
  const validator = new FirebaseConfigValidator();
  
  try {
    // Run the complete validation
    const isValid = await validator.runCompleteValidation();
    
    if (isValid) {
      console.log('\n🎉 SUCCESS: Firebase is properly configured!');
      console.log('✅ You can now run the application.');
      console.log('\n📋 Next steps:');
      console.log('   1. Run: node scripts/init-firebase.js (to initialize database)');
      console.log('   2. Start your application');
      console.log('   3. Test login and report generation\n');
    } else {
      console.log('\n❌ FAILED: Firebase configuration needs attention.');
      console.log('📖 Please follow the setup guide in FIREBASE_SETUP_GUIDE.md\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 Validation error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   • Make sure you\'re running from the project root directory');
    console.log('   • Ensure .env file exists with Firebase credentials');
    console.log('   • Check that all required environment variables are set');
    console.log('   • Verify your Firebase project has Firestore enabled\n');
    process.exit(1);
  }
}

// Run validation
quickValidation();