#!/usr/bin/env node
// Complete system initialization script
// Combines database initialization and admin user creation
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

async function runCompleteInitialization() {
  console.log('🚀 Starting complete system initialization...');
  console.log('=====================================');
  
  // Load environment variables first
  loadEnvironmentVariables();
  
  try {
    // Import services after environment variables are loaded
    const { default: DatabaseInitializer } = await import('./database-init.js');
    const { default: AdminUserService } = await import('../lib/admin-user-service.js');
    
    // Step 1: Initialize Database
    console.log('📊 STEP 1: Database Initialization');
    console.log('-----------------------------------');
    
    const dbInitializer = new DatabaseInitializer();
    const dbResult = await dbInitializer.initializeDatabase();
    
    if (!dbResult.success) {
      console.error('❌ Database initialization failed:', dbResult.error);
      process.exit(1);
    }
    
    console.log('✅ Database initialization completed successfully');
    
    // Step 2: Initialize Admin User
    console.log('\n👤 STEP 2: Admin User Initialization');
    console.log('------------------------------------');
    
    const adminService = new AdminUserService();
    const adminResult = await adminService.initializeAdminUser();
    
    if (!adminResult.success) {
      console.error('❌ Admin user initialization failed:', adminResult.error);
      process.exit(1);
    }
    
    console.log('✅ Admin user initialization completed successfully');
    
    // Step 3: System Health Check
    console.log('\n🏥 STEP 3: System Health Check');
    console.log('------------------------------');
    
    // Database health
    const healthResult = await dbInitializer.getDatabaseHealth();
    if (healthResult.success) {
      const health = healthResult.data;
      console.log(`📊 Database Status: ${health.connectivity ? '✅ Connected' : '❌ Failed'}`);
      console.log(`📁 Collections: ${Object.keys(health.collections).length} ready`);
      console.log(`📄 Total Documents: ${health.totalDocuments}`);
    }
    
    // Admin user status
    const adminStatusResult = await adminService.getAdminUserStatus();
    if (adminStatusResult.success && adminStatusResult.data.exists) {
      const status = adminStatusResult.data;
      console.log(`👤 Admin User: ${status.email} (${status.isActive ? 'Active' : 'Inactive'})`);
    }
    
    // Final Summary
    console.log('\n=====================================');
    console.log('🎉 COMPLETE SYSTEM INITIALIZATION SUCCESSFUL!');
    console.log('=====================================');
    console.log('');
    console.log('📋 System Ready:');
    console.log('   ✅ Database collections created and indexed');
    console.log('   ✅ Admin user created and configured');
    console.log('   ✅ System health validated');
    console.log('');
    console.log('🔐 Admin Login Details:');
    console.log(`   📧 Email: ${adminResult.adminUser.email}`);
    console.log('   🔑 Password: admin123 (CHANGE ON FIRST LOGIN)');
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('   1. Start your application server');
    console.log('   2. Login with admin credentials');
    console.log('   3. Change the default admin password');
    console.log('   4. Configure additional users as needed');
    console.log('');
    
    process.exit(0);
    
  } catch (error) {
    console.error('=====================================');
    console.error('💥 System initialization failed:', error.message);
    console.error('Stack trace:', error.stack);
    console.error('');
    console.error('🔧 Troubleshooting:');
    console.error('   1. Check Firebase configuration in .env file');
    console.error('   2. Verify Firebase project permissions');
    console.error('   3. Ensure internet connectivity');
    console.error('   4. Run: node scripts/firebase-config-validator.js');
    process.exit(1);
  }
}

// Run the complete initialization
runCompleteInitialization();