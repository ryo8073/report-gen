#!/usr/bin/env node
// Database initialization runner script
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables from .env file
function loadEnvironmentVariables() {
  try {
    const envPath = join(process.cwd(), '.env');
    const envContent = readFileSync(envPath, 'utf8');
    
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value;
        }
      }
    });
    
    console.log('✅ Environment variables loaded from .env file');
  } catch (error) {
    console.warn('⚠️  Could not load .env file:', error.message);
    console.warn('   Make sure .env file exists and contains Firebase configuration');
  }
}

async function runDatabaseInitialization() {
  console.log('🚀 Starting database initialization process...');
  console.log('=====================================');
  
  // Load environment variables first
  loadEnvironmentVariables();
  
  try {
    // Import DatabaseInitializer after environment variables are loaded
    const { default: DatabaseInitializer } = await import('./database-init.js');
    const initializer = new DatabaseInitializer();
    
    // Run database initialization
    const result = await initializer.initializeDatabase();
    
    if (result.success) {
      console.log('=====================================');
      console.log('🎉 Database initialization completed successfully!');
      
      // Show database health status
      console.log('\n📊 Database Health Status:');
      const healthResult = await initializer.getDatabaseHealth();
      
      if (healthResult.success) {
        const health = healthResult.data;
        console.log(`   Connectivity: ${health.connectivity ? '✅ Connected' : '❌ Failed'}`);
        console.log(`   Total Documents: ${health.totalDocuments}`);
        console.log('   Collections:');
        
        Object.entries(health.collections).forEach(([name, info]) => {
          console.log(`     - ${name}: ${info.exists ? '✅ Ready' : '❌ Missing'} (${info.documentCount} docs)`);
        });
        
        console.log(`   Last Checked: ${health.lastChecked.toISOString()}`);
      }
      
      process.exit(0);
      
    } else {
      console.error('=====================================');
      console.error('❌ Database initialization failed:', result.error);
      console.error('💡 Check your Firebase configuration and try again');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('=====================================');
    console.error('💥 Unexpected error during database initialization:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the initialization
runDatabaseInitialization();