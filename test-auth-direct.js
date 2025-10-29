// Test authentication function directly
import fs from 'fs';

// Load environment variables from .env file FIRST
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  const lines = envContent.split('\n');
  
  console.log('Loading environment variables...');
  for (const line of lines) {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        process.env[key.trim()] = value;
        console.log(`Loaded: ${key.trim()}`);
      }
    }
  }
  
  // Check if Firebase variables are loaded
  console.log('Firebase Project ID:', process.env.FIREBASE_PROJECT_ID ? 'Set' : 'Missing');
  console.log('Firebase Private Key:', process.env.FIREBASE_PRIVATE_KEY ? 'Set' : 'Missing');
  console.log('Firebase Client Email:', process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Missing');
} else {
  console.log('.env file not found');
}

// Now import Firebase after environment variables are loaded
const { FirebaseDatabase } = await import('./lib/firebase-db.js');

async function testDirectAuth() {
  console.log('🔍 Testing Firebase Database Connection');
  console.log('=====================================');
  
  try {
    const db = new FirebaseDatabase();
    console.log('✅ FirebaseDatabase instance created');
    
    // Test getting user by email
    console.log('Testing getUserByEmail...');
    const userResult = await db.getUserByEmail('yamanami-ryo@heya.co.jp');
    
    if (userResult.success) {
      console.log('✅ User found:', {
        id: userResult.data.id,
        email: userResult.data.email,
        role: userResult.data.role,
        isActive: userResult.data.isActive
      });
    } else {
      console.log('❌ User not found:', userResult.error);
    }
    
  } catch (error) {
    console.error('❌ Error testing database:', error);
    console.error('Stack trace:', error.stack);
  }
}

testDirectAuth();