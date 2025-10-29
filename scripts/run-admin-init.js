#!/usr/bin/env node
// Admin user initialization runner script
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

async function runAdminUserInitialization() {
    console.log('👤 Starting admin user initialization process...');
    console.log('=====================================');

    // Load environment variables first
    loadEnvironmentVariables();

    try {
        // Import AdminUserService after environment variables are loaded
        const { default: AdminUserService } = await import('../lib/admin-user-service.js');
        const adminService = new AdminUserService();

        // Check current admin user status
        console.log('🔍 Checking current admin user status...');
        const statusResult = await adminService.getAdminUserStatus();

        if (statusResult.success) {
            const status = statusResult.data;

            if (status.exists) {
                console.log('📋 Current Admin User Status:');
                console.log(`   Email: ${status.email}`);
                console.log(`   Active: ${status.isActive ? '✅ Yes' : '❌ No'}`);
                console.log(`   Account Locked: ${status.accountLocked ? '🔒 Yes' : '🔓 No'}`);
                console.log(`   Must Change Password: ${status.mustChangePassword ? '⚠️  Yes' : '✅ No'}`);
                console.log(`   Last Login: ${status.lastLogin || 'Never'}`);
                console.log(`   Created: ${status.createdAt}`);
                console.log(`   Permissions: ${status.permissions.join(', ')}`);
            } else {
                console.log('📋 No admin user found in system');
            }
        }

        // Initialize admin user
        const result = await adminService.initializeAdminUser();

        if (result.success) {
            console.log('=====================================');
            console.log('🎉 Admin user initialization completed successfully!');
            console.log(`📧 Admin Email: ${result.adminUser.email}`);
            console.log(`🔑 Default Password: admin123 (change on first login)`);
            console.log(`👑 Role: ${result.adminUser.role}`);
            console.log(`✅ Status: ${result.adminUser.isActive ? 'Active' : 'Inactive'}`);

            if (result.message === 'Admin user created successfully') {
                console.log('');
                console.log('🔐 IMPORTANT SECURITY NOTES:');
                console.log('   1. Change the default password immediately after first login');
                console.log('   2. The admin user has full system permissions');
                console.log('   3. Account will be locked after 5 failed login attempts');
                console.log('   4. All admin actions are logged for audit purposes');
            }

            process.exit(0);

        } else {
            console.error('=====================================');
            console.error('❌ Admin user initialization failed:', result.error);
            console.error('💡 Check your Firebase configuration and database connectivity');
            process.exit(1);
        }

    } catch (error) {
        console.error('=====================================');
        console.error('💥 Unexpected error during admin user initialization:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run the initialization
runAdminUserInitialization();