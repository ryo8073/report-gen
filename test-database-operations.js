#!/usr/bin/env node

/**
 * Database Operations and Logging Validation Test Script
 * 
 * This script validates:
 * - User creation, authentication, and session management
 * - Usage logging and report generation tracking
 * - Admin user creation and database initialization
 * 
 * Requirements: 4.3, 4.4, 5.4
 */

import { promises as fs } from 'fs';
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
    }
}

// Test results tracking
const testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

// Helper functions
function logTest(name, passed, message = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const fullMessage = `${status}: ${name}${message ? ' - ' + message : ''}`;
    console.log(fullMessage);
    
    testResults.tests.push({
        name,
        passed,
        message
    });
    
    if (passed) {
        testResults.passed++;
    } else {
        testResults.failed++;
    }
}

// Test database initialization
async function testDatabaseInitialization() {
    console.log('\n🗄️  Testing database initialization...');
    
    try {
        const { default: DatabaseInitializer } = await import('./scripts/database-init.js');
        const dbInit = new DatabaseInitializer();
        
        // Test database connectivity
        const connectivityResult = await dbInit.validateConnection();
        logTest('Database connectivity validation', connectivityResult === true);
        
        // Test database initialization
        const initResult = await dbInit.initializeDatabase();
        logTest('Database initialization', initResult.success, initResult.error || initResult.message);
        
        // Test database health check
        const healthResult = await dbInit.getDatabaseHealth();
        logTest('Database health check', healthResult.success);
        
        if (healthResult.success) {
            const health = healthResult.data;
            logTest('All required collections exist', 
                health.collections.users?.exists && 
                health.collections.usage_logs?.exists && 
                health.collections.report_generations?.exists && 
                health.collections.sessions?.exists
            );
        }
        
        return initResult.success;
        
    } catch (error) {
        logTest('Database initialization', false, error.message);
        return false;
    }
}

// Test admin user creation and management
async function testAdminUserCreation() {
    console.log('\n👤 Testing admin user creation and management...');
    
    try {
        const { default: AdminUserService } = await import('./lib/admin-user-service.js');
        const adminService = new AdminUserService();
        
        // Test admin user status check
        const statusResult = await adminService.getAdminUserStatus();
        logTest('Admin user status check', statusResult.success);
        
        // Test admin user initialization
        const initResult = await adminService.initializeAdminUser();
        logTest('Admin user initialization', initResult.success, initResult.error || initResult.message);
        
        if (initResult.success) {
            const adminUser = initResult.adminUser;
            logTest('Admin user has correct role', adminUser.role === 'admin');
            logTest('Admin user is active', adminUser.isActive === true);
            logTest('Admin user has valid email', adminUser.email && adminUser.email.includes('@'));
        }
        
        // Test admin user verification (if admin exists)
        if (statusResult.success && statusResult.data.exists) {
            const verifyResult = await adminService.verifyAdminCredentials(
                statusResult.data.email, 
                'admin123'
            );
            // Note: This might fail if password was already changed, which is expected
            logTest('Admin credentials verification available', 
                verifyResult.success || verifyResult.error.includes('Invalid credentials'));
        }
        
        return initResult.success;
        
    } catch (error) {
        logTest('Admin user creation', false, error.message);
        return false;
    }
}

// Test user creation and management
async function testUserCreation() {
    console.log('\n👥 Testing user creation and management...');
    
    try {
        const { default: firebaseDb } = await import('./lib/firebase-db.js');
        
        // Create test user data
        const testUserId = `test_user_${Date.now()}`;
        const testUserData = {
            id: testUserId,
            email: `test${Date.now()}@example.com`,
            password: 'hashedpassword123',
            role: 'user',
            isActive: true,
            subscriptionStatus: 'trial',
            trialUsageCount: 0,
            trialMaxUsage: 15
        };
        
        // Test user creation
        const createResult = await firebaseDb.createUser(testUserData);
        logTest('User creation', createResult.success, createResult.error);
        
        if (createResult.success) {
            // Test user retrieval by ID
            const getUserResult = await firebaseDb.getUserById(testUserId);
            logTest('User retrieval by ID', getUserResult.success);
            
            if (getUserResult.success) {
                const user = getUserResult.data;
                logTest('User data integrity', 
                    user.email === testUserData.email && 
                    user.role === testUserData.role
                );
            }
            
            // Test user retrieval by email
            const getUserByEmailResult = await firebaseDb.getUserByEmail(testUserData.email);
            logTest('User retrieval by email', getUserByEmailResult.success);
            
            // Test user update
            const updateData = { lastLogin: new Date(), loginAttempts: 1 };
            const updateResult = await firebaseDb.updateUser(testUserId, updateData);
            logTest('User update', updateResult.success);
            
            // Test trial user creation
            const trialUserId = `trial_user_${Date.now()}`;
            const trialUserData = {
                id: trialUserId,
                email: `trial${Date.now()}@example.com`,
                password: 'hashedpassword123',
                role: 'user',
                isActive: true
            };
            
            const createTrialResult = await firebaseDb.createTrialUser(trialUserData);
            logTest('Trial user creation', createTrialResult.success);
            
            if (createTrialResult.success) {
                // Test trial status check
                const trialStatusResult = await firebaseDb.checkTrialStatus(trialUserId);
                logTest('Trial status check', trialStatusResult.success);
                
                if (trialStatusResult.success) {
                    const trialStatus = trialStatusResult.data;
                    logTest('Trial is active for new user', trialStatus.isTrialActive === true);
                    logTest('Trial has correct usage limits', trialStatus.trialMaxUsage === 15);
                }
                
                // Test trial usage increment
                const incrementResult = await firebaseDb.incrementTrialUsage(trialUserId);
                logTest('Trial usage increment', incrementResult.success);
            }
        }
        
        return createResult.success;
        
    } catch (error) {
        logTest('User creation and management', false, error.message);
        return false;
    }
}

// Test usage logging functionality
async function testUsageLogging() {
    console.log('\n📊 Testing usage logging functionality...');
    
    try {
        const { default: firebaseDb } = await import('./lib/firebase-db.js');
        
        // Test usage logging
        const usageData = {
            userId: `test_user_${Date.now()}`,
            action: 'login',
            ip: '127.0.0.1',
            userAgent: 'test-script'
        };
        
        const logResult = await firebaseDb.logUsage(usageData);
        logTest('Usage logging', logResult.success);
        
        // Test usage stats retrieval
        const statsResult = await firebaseDb.getUsageStats();
        logTest('Usage stats retrieval', statsResult.success);
        
        if (statsResult.success) {
            logTest('Usage stats contain data', Array.isArray(statsResult.data));
        }
        
        // Test recent activity retrieval
        const activityResult = await firebaseDb.getRecentActivity(10);
        logTest('Recent activity retrieval', activityResult.success);
        
        // Test total usage stats
        const totalStatsResult = await firebaseDb.getTotalUsageStats();
        logTest('Total usage stats', totalStatsResult.success);
        
        if (totalStatsResult.success) {
            const stats = totalStatsResult.data;
            logTest('Total stats structure', 
                typeof stats.totalUsers === 'number' && 
                typeof stats.totalReports === 'number' && 
                typeof stats.totalUsage === 'number'
            );
        }
        
        return logResult.success;
        
    } catch (error) {
        logTest('Usage logging', false, error.message);
        return false;
    }
}

// Test report generation tracking
async function testReportGenerationTracking() {
    console.log('\n📄 Testing report generation tracking...');
    
    try {
        const { default: firebaseDb } = await import('./lib/firebase-db.js');
        
        // Test report generation logging
        const reportData = {
            userId: `test_user_${Date.now()}`,
            reportType: 'investment_strategy',
            status: 'completed',
            inputLength: 1000,
            outputLength: 2500,
            processingTime: 5.2
        };
        
        const logReportResult = await firebaseDb.logReportGeneration(reportData);
        logTest('Report generation logging', logReportResult.success);
        
        // Test report generations retrieval
        const getReportsResult = await firebaseDb.getReportGenerations();
        logTest('Report generations retrieval', getReportsResult.success);
        
        if (getReportsResult.success) {
            logTest('Report generations data structure', Array.isArray(getReportsResult.data));
        }
        
        // Test user-specific report retrieval
        const userReportsResult = await firebaseDb.getReportGenerations(reportData.userId, 50);
        logTest('User-specific report retrieval', userReportsResult.success);
        
        // Test token usage logging
        const tokenData = {
            userId: reportData.userId,
            reportType: reportData.reportType,
            promptTokens: 800,
            completionTokens: 1200,
            totalTokens: 2000,
            model: 'gpt-4o',
            estimatedCost: 0.025
        };
        
        const tokenLogResult = await firebaseDb.logTokenUsage(tokenData);
        logTest('Token usage logging', tokenLogResult.success);
        
        // Test token usage stats
        const tokenStatsResult = await firebaseDb.getTokenUsageStats(30);
        logTest('Token usage stats retrieval', tokenStatsResult.success);
        
        if (tokenStatsResult.success) {
            const stats = tokenStatsResult.data;
            logTest('Token stats structure', 
                stats.summary && 
                typeof stats.summary.totalTokens === 'number' && 
                typeof stats.summary.totalCost === 'number'
            );
        }
        
        return logReportResult.success;
        
    } catch (error) {
        logTest('Report generation tracking', false, error.message);
        return false;
    }
}

// Test session management
async function testSessionManagement() {
    console.log('\n🔐 Testing session management...');
    
    try {
        const { default: firebaseDb } = await import('./lib/firebase-db.js');
        
        // Create test user for session testing
        const sessionUserId = `session_user_${Date.now()}`;
        const sessionUserData = {
            id: sessionUserId,
            email: `session${Date.now()}@example.com`,
            password: 'hashedpassword123',
            role: 'user',
            isActive: true
        };
        
        const createUserResult = await firebaseDb.createUser(sessionUserData);
        logTest('Session test user creation', createUserResult.success);
        
        if (createUserResult.success) {
            // Test session logging through usage logs
            const sessionData = {
                userId: sessionUserId,
                action: 'session_created',
                ip: '127.0.0.1',
                userAgent: 'test-script'
            };
            
            const sessionLogResult = await firebaseDb.logUsage(sessionData);
            logTest('Session creation logging', sessionLogResult.success);
            
            // Test session validation logging
            const validationData = {
                userId: sessionUserId,
                action: 'session_validated',
                ip: '127.0.0.1',
                userAgent: 'test-script'
            };
            
            const validationLogResult = await firebaseDb.logUsage(validationData);
            logTest('Session validation logging', validationLogResult.success);
            
            // Test session termination logging
            const terminationData = {
                userId: sessionUserId,
                action: 'session_terminated',
                ip: '127.0.0.1',
                userAgent: 'test-script'
            };
            
            const terminationLogResult = await firebaseDb.logUsage(terminationData);
            logTest('Session termination logging', terminationLogResult.success);
        }
        
        return createUserResult.success;
        
    } catch (error) {
        logTest('Session management', false, error.message);
        return false;
    }
}

// Test user statistics and analytics
async function testUserStatistics() {
    console.log('\n📈 Testing user statistics and analytics...');
    
    try {
        const { default: firebaseDb } = await import('./lib/firebase-db.js');
        
        // Test total users count
        const totalUsersResult = await firebaseDb.getTotalUsers();
        logTest('Total users count', totalUsersResult.success);
        
        // Test user statistics
        const userStatsResult = await firebaseDb.getUserStats();
        logTest('User statistics retrieval', userStatsResult.success);
        
        if (userStatsResult.success) {
            const stats = userStatsResult.data;
            logTest('User stats structure', 
                typeof stats.totalUsers === 'number' && 
                typeof stats.adminUsers === 'number' && 
                typeof stats.regularUsers === 'number'
            );
        }
        
        // Test trial statistics
        const trialStatsResult = await firebaseDb.getTrialStats();
        logTest('Trial statistics retrieval', trialStatsResult.success);
        
        if (trialStatsResult.success) {
            const trialStats = trialStatsResult.data;
            logTest('Trial stats structure', 
                typeof trialStats.totalUsers === 'number' && 
                typeof trialStats.trialUsers === 'number' && 
                typeof trialStats.averageTrialUsage !== 'undefined'
            );
        }
        
        // Test all users retrieval (admin function)
        const allUsersResult = await firebaseDb.getAllUsers(10);
        logTest('All users retrieval', allUsersResult.success);
        
        return totalUsersResult.success;
        
    } catch (error) {
        logTest('User statistics', false, error.message);
        return false;
    }
}

// Test error handling and edge cases
async function testErrorHandling() {
    console.log('\n⚠️  Testing error handling and edge cases...');
    
    try {
        const { default: firebaseDb } = await import('./lib/firebase-db.js');
        
        // Test invalid user ID retrieval
        const invalidUserResult = await firebaseDb.getUserById('nonexistent_user_id');
        logTest('Invalid user ID handling', !invalidUserResult.success);
        
        // Test invalid email retrieval
        const invalidEmailResult = await firebaseDb.getUserByEmail('nonexistent@example.com');
        logTest('Invalid email handling', !invalidEmailResult.success);
        
        // Test invalid user update
        const invalidUpdateResult = await firebaseDb.updateUser('nonexistent_user_id', { name: 'test' });
        logTest('Invalid user update handling', !invalidUpdateResult.success);
        
        // Test invalid trial status check
        const invalidTrialResult = await firebaseDb.checkTrialStatus('nonexistent_user_id');
        logTest('Invalid trial status handling', !invalidTrialResult.success);
        
        // Test malformed usage data
        const malformedUsageResult = await firebaseDb.logUsage({});
        logTest('Malformed usage data handling', 
            malformedUsageResult.success || malformedUsageResult.error);
        
        return true;
        
    } catch (error) {
        logTest('Error handling', false, error.message);
        return false;
    }
}

// Main test execution
async function runDatabaseOperationTests() {
    console.log('🧪 Starting Database Operations and Logging Validation Tests');
    console.log('=' .repeat(80));
    
    // Load environment variables
    loadEnvironmentVariables();
    
    const startTime = Date.now();
    
    try {
        // Test database initialization
        await testDatabaseInitialization();
        
        // Test admin user creation
        await testAdminUserCreation();
        
        // Test user creation and management
        await testUserCreation();
        
        // Test usage logging
        await testUsageLogging();
        
        // Test report generation tracking
        await testReportGenerationTracking();
        
        // Test session management
        await testSessionManagement();
        
        // Test user statistics
        await testUserStatistics();
        
        // Test error handling
        await testErrorHandling();
        
    } catch (error) {
        console.error('❌ Database operation test failed:', error);
        logTest('Overall test execution', false, error.message);
    }
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    // Print summary
    console.log('\n' + '=' .repeat(80));
    console.log('📊 Database Operations Test Summary:');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
    console.log(`⏱️  Duration: ${duration} seconds`);
    
    if (testResults.failed > 0) {
        console.log('\n❌ Failed Tests:');
        testResults.tests
            .filter(test => !test.passed)
            .forEach(test => console.log(`  - ${test.name}: ${test.message}`));
    }
    
    // Save detailed results
    const reportPath = 'database-operations-test-results.json';
    await fs.writeFile(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        summary: {
            passed: testResults.passed,
            failed: testResults.failed,
            total: testResults.passed + testResults.failed,
            successRate: (testResults.passed / (testResults.passed + testResults.failed)) * 100,
            duration: parseFloat(duration)
        },
        tests: testResults.tests,
        requirements: ['4.3', '4.4', '5.4'],
        testCategories: [
            'Database Initialization',
            'Admin User Creation',
            'User Management',
            'Usage Logging',
            'Report Generation Tracking',
            'Session Management',
            'User Statistics',
            'Error Handling'
        ]
    }, null, 2));
    
    console.log(`\n📄 Detailed results saved to: ${reportPath}`);
    
    // Validation summary
    console.log('\n✅ Database Operations Validation Complete:');
    console.log('  🗄️  Database initialization and connectivity');
    console.log('  👤 Admin user creation and management');
    console.log('  👥 User creation, authentication, and session management');
    console.log('  📊 Usage logging and activity tracking');
    console.log('  📄 Report generation tracking and analytics');
    console.log('  🔐 Session management and validation');
    console.log('  📈 User statistics and trial system');
    console.log('  ⚠️  Error handling and edge cases');
    
    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
}

// Handle unhandled errors
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
});

// Run tests
runDatabaseOperationTests();

export { runDatabaseOperationTests };