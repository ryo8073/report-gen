// Firebase initialization script
import { db } from '../lib/firebase-db.js';

async function initializeFirebase() {
  console.log('🔥 Initializing Firebase...');
  
  try {
    // Initialize admin user
    console.log('👤 Creating admin user...');
    const adminResult = await db.initializeAdminUser();
    
    if (adminResult.success) {
      console.log('✅ Admin user ready:', adminResult.message);
    } else {
      console.error('❌ Admin user creation failed:', adminResult.error);
    }

    // Test database connection
    console.log('🔗 Testing database connection...');
    const testResult = await db.getTotalUsers();
    
    if (testResult.success) {
      console.log('✅ Database connection successful');
      console.log(`📊 Total users: ${testResult.data}`);
    } else {
      console.error('❌ Database connection failed:', testResult.error);
    }

    console.log('🎉 Firebase initialization complete!');
    
  } catch (error) {
    console.error('💥 Firebase initialization failed:', error);
  }
}

// Run initialization
initializeFirebase();
