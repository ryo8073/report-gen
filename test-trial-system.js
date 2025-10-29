#!/usr/bin/env node

/**
 * Trial System Test Script
 * 
 * This script tests:
 * - Trial period creation and tracking
 * - Usage limit enforcement
 * - Trial expiration handling
 * - Upgrade functionality
 * 
 * Requirements: Trial system functionality
 */

import { promises as fs } from 'fs';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_USER = {
    email: 'trial-test@example.com',
    password: 'testpassword123',
    name: 'Trial Test User'
};

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

function extractCookies(response) {
    const setCookieHeader = response.headers.get('set-cookie');
    if (!setCookieHeader) return {};
    
    const cookies = {};
    setCookieHeader.split(',').forEach(cookie => {
        const [nameValue] = cookie.split(';');
        const [name, value] = nameValue.split('=');
        if (name && value) {
            cookies[name.trim()] = value.trim();
        }
    });
    return cookies;
}

async function makeRequest(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });
    
    return {
        response,
        data: response.headers.get('content-type')?.includes('application/json') 
            ? await response.json().catch(() => ({}))
            : await response.text(),
        cookies: extractCookies(response)
    };
}

// Test functions
async function testTrialUserCreation() {
    console.log('\n👤 Testing trial user creation...');
    
    try {
        const { response, data } = await makeRequest('/api/auth/register-firebase', {
            method: 'POST',
            body: JSON.stringify(TEST_USER)
        });
        
        logTest('Trial user registration returns 201', response.status === 201);
        logTest('Registration response has success field', data.success === true);
        logTest('Registration returns user ID', data.userId !== undefined);
        
        return data.userId;
        
    } catch (error) {
        logTest('Trial user creation', false, error.message);
        return null;
    }
}

async function testTrialStatusCheck(token) {
    console.log('\n📊 Testing trial status check...');
    
    if (!token) {
        logTest('Trial status check', false, 'No authentication token available');
        return null;
    }
    
    try {
        const { response, data } = await makeRequest('/api/trial/status', {
            headers: {
                'Cookie': `token=${token}`
            }
        });
        
        logTest('Trial status returns 200', response.status === 200);
        logTest('Trial status has success field', data.success === true);
        logTest('Trial status includes trial data', data.trial !== undefined);
        
        if (data.trial) {
            logTest('Trial is initially active', data.trial.isTrialActive === true);
            logTest('Trial has remaining days', data.trial.remainingDays > 0);
            logTest('Trial has remaining usage', data.trial.remainingUsage === 15);
            logTest('User can use service', data.trial.canUseService === true);
        }
        
        return data.trial;
        
    } catch (error) {
        logTest('Trial status check', false, error.message);
        return null;
    }
}

async function testReportGenerationWithTrial(token) {
    console.log('\n📄 Testing report generation with trial...');
    
    if (!token) {
        logTest('Report generation with trial', false, 'No authentication token available');
        return;
    }
    
    try {
        const requestData = {
            reportType: 'jp_investment_4part',
            inputText: 'Test report generation for trial user',
            files: [],
            options: {
                language: 'ja'
            }
        };
        
        const { response, data } = await makeRequest('/api/generate-firebase', {
            method: 'POST',
            headers: {
                'Cookie': `token=${token}`
            },
            body: JSON.stringify(requestData)
        });
        
        logTest('Trial user can generate reports', response.status === 200);
        logTest('Report generation returns content', data.success === true && data.content);
        
        // Check updated trial status
        const { data: statusData } = await makeRequest('/api/trial/status', {
            headers: {
                'Cookie': `token=${token}`
            }
        });
        
        if (statusData.success) {
            logTest('Trial usage count incremented', statusData.trial.trialUsageCount === 1);
            logTest('Remaining usage decremented', statusData.trial.remainingUsage === 14);
        }
        
    } catch (error) {
        logTest('Report generation with trial', false, error.message);
    }
}

async function testTrialLimitEnforcement(token) {
    console.log('\n🚫 Testing trial limit enforcement...');
    
    if (!token) {
        logTest('Trial limit enforcement', false, 'No authentication token available');
        return;
    }
    
    try {
        // Simulate reaching usage limit by making multiple requests
        console.log('   Simulating multiple report generations...');
        
        const requestData = {
            reportType: 'jp_investment_4part',
            inputText: 'Test report for limit testing',
            files: [],
            options: {
                language: 'ja'
            }
        };
        
        // Make 14 more requests to reach the limit (we already made 1)
        for (let i = 0; i < 14; i++) {
            await makeRequest('/api/generate-firebase', {
                method: 'POST',
                headers: {
                    'Cookie': `token=${token}`
                },
                body: JSON.stringify(requestData)
            });
        }
        
        // Now try one more request - should be blocked
        const { response, data } = await makeRequest('/api/generate-firebase', {
            method: 'POST',
            headers: {
                'Cookie': `token=${token}`
            },
            body: JSON.stringify(requestData)
        });
        
        logTest('Trial limit blocks further requests', response.status === 403);
        logTest('Trial limit returns appropriate error', data.code === 'TRIAL_EXPIRED');
        logTest('Error message mentions trial expiration', data.error && data.error.includes('試用期間'));
        
    } catch (error) {
        logTest('Trial limit enforcement', false, error.message);
    }
}

async function testUpgradeSimulation(token) {
    console.log('\n⬆️ Testing upgrade simulation...');
    
    if (!token) {
        logTest('Upgrade simulation', false, 'No authentication token available');
        return;
    }
    
    try {
        const { response, data } = await makeRequest('/api/trial/upgrade', {
            method: 'POST',
            headers: {
                'Cookie': `token=${token}`
            },
            body: JSON.stringify({ planType: 'pro' })
        });
        
        logTest('Upgrade simulation returns 200', response.status === 200);
        logTest('Upgrade response has success field', data.success === true);
        logTest('Upgrade includes plan type', data.planType === 'pro');
        
        // Check that user can now generate reports again
        const requestData = {
            reportType: 'jp_investment_4part',
            inputText: 'Test report after upgrade',
            files: [],
            options: {
                language: 'ja'
            }
        };
        
        const { response: reportResponse } = await makeRequest('/api/generate-firebase', {
            method: 'POST',
            headers: {
                'Cookie': `token=${token}`
            },
            body: JSON.stringify(requestData)
        });
        
        logTest('Upgraded user can generate reports', reportResponse.status === 200);
        
    } catch (error) {
        logTest('Upgrade simulation', false, error.message);
    }
}

async function testAdminTrialStats() {
    console.log('\n📈 Testing admin trial statistics...');
    
    try {
        // First, authenticate as admin (assuming admin user exists)
        const adminLogin = await makeRequest('/api/auth/login-firebase', {
            method: 'POST',
            body: JSON.stringify({
                email: 'admin@example.com',
                password: 'adminpassword123'
            })
        });
        
        if (adminLogin.response.status !== 200) {
            logTest('Admin trial stats', false, 'Admin authentication failed - skipping admin tests');
            return;
        }
        
        const adminToken = adminLogin.cookies.token;
        
        const { response, data } = await makeRequest('/api/admin/trial-stats', {
            headers: {
                'Cookie': `token=${adminToken}`
            }
        });
        
        logTest('Admin can access trial stats', response.status === 200);
        logTest('Trial stats have required fields', 
            data.success && data.stats && 
            typeof data.stats.totalUsers === 'number' &&
            typeof data.stats.trialUsers === 'number'
        );
        
    } catch (error) {
        logTest('Admin trial statistics', false, error.message);
    }
}

// Authentication helper
async function authenticateUser() {
    try {
        const { response, data, cookies } = await makeRequest('/api/auth/login-firebase', {
            method: 'POST',
            body: JSON.stringify({
                email: TEST_USER.email,
                password: TEST_USER.password
            })
        });
        
        if (response.status === 200 && data.success && cookies.token) {
            return cookies.token;
        }
        
        throw new Error('Authentication failed');
    } catch (error) {
        console.error('❌ Failed to authenticate test user:', error.message);
        return null;
    }
}

// Check if server is running
async function checkServerHealth() {
    try {
        const response = await fetch(`${BASE_URL}/api/auth/me-firebase`);
        return true;
    } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.cause?.code === 'ECONNREFUSED') {
            console.error(`❌ Cannot connect to server at ${BASE_URL}`);
            console.error('Please start the development server first:');
            console.error('  npm run dev');
            console.error('  or');
            console.error('  vercel dev');
            return false;
        }
        return true;
    }
}

// Main test execution
async function runTrialSystemTests() {
    console.log('🧪 Starting Trial System Tests');
    console.log(`Testing against: ${BASE_URL}`);
    console.log('=' .repeat(60));
    
    // Create trial user
    const userId = await testTrialUserCreation();
    
    if (!userId) {
        console.log('❌ Cannot proceed without user creation');
        process.exit(1);
    }
    
    // Authenticate
    console.log('🔐 Authenticating trial user...');
    const token = await authenticateUser();
    
    if (!token) {
        console.log('❌ Cannot proceed without authentication');
        process.exit(1);
    }
    
    console.log('✅ Authentication successful');
    
    // Test trial functionality
    const trialData = await testTrialStatusCheck(token);
    await testReportGenerationWithTrial(token);
    await testTrialLimitEnforcement(token);
    await testUpgradeSimulation(token);
    await testAdminTrialStats();
    
    // Print summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 Test Summary:');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
    
    if (testResults.failed > 0) {
        console.log('\n❌ Failed Tests:');
        testResults.tests
            .filter(test => !test.passed)
            .forEach(test => console.log(`  - ${test.name}: ${test.message}`));
    }
    
    // Save detailed results
    const reportPath = 'trial-system-test-results.json';
    await fs.writeFile(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        baseUrl: BASE_URL,
        summary: {
            passed: testResults.passed,
            failed: testResults.failed,
            total: testResults.passed + testResults.failed,
            successRate: (testResults.passed / (testResults.passed + testResults.failed)) * 100
        },
        tests: testResults.tests
    }, null, 2));
    
    console.log(`\n📄 Detailed results saved to: ${reportPath}`);
    
    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
}

// Handle unhandled errors
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
});

// Run tests
(async () => {
    const serverRunning = await checkServerHealth();
    if (serverRunning) {
        await runTrialSystemTests();
    } else {
        process.exit(1);
    }
})();

export { runTrialSystemTests };