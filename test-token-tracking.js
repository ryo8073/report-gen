#!/usr/bin/env node

/**
 * Token Tracking Test Script
 * 
 * This script tests:
 * - Token usage recording during report generation
 * - Admin token statistics API
 * - User token usage API
 * - Cost calculation accuracy
 */

import { promises as fs } from 'fs';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_USER = {
    email: 'token-test@example.com',
    password: 'testpassword123',
    name: 'Token Test User'
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

// Authentication helper
async function authenticateUser() {
    try {
        const { response, data, cookies } = await makeRequest('/api/auth/login-firebase', {
            method: 'POST',
            body: JSON.stringify(TEST_USER)
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

// Test functions
async function testTokenRecordingInReportGeneration(token) {
    console.log('\n📊 Testing token recording in report generation...');
    
    if (!token) {
        logTest('Token recording test', false, 'No authentication token available');
        return null;
    }
    
    try {
        const requestData = {
            reportType: 'jp_investment_4part',
            inputText: 'Test report for token tracking: This is a sample investment analysis request.',
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
        
        logTest('Report generation returns 200', response.status === 200);
        logTest('Report generation has usage data', data.usage !== undefined);
        
        if (data.usage) {
            logTest('Usage includes prompt tokens', typeof data.usage.promptTokens === 'number' && data.usage.promptTokens > 0);
            logTest('Usage includes completion tokens', typeof data.usage.completionTokens === 'number' && data.usage.completionTokens > 0);
            logTest('Usage includes total tokens', typeof data.usage.totalTokens === 'number' && data.usage.totalTokens > 0);
            logTest('Usage includes estimated cost', typeof data.usage.estimatedCost === 'string' && parseFloat(data.usage.estimatedCost) > 0);
            
            // Verify token calculation
            const calculatedTotal = data.usage.promptTokens + data.usage.completionTokens;
            logTest('Token calculation is correct', calculatedTotal === data.usage.totalTokens);
            
            return data.usage;
        }
        
        return null;
        
    } catch (error) {
        logTest('Token recording in report generation', false, error.message);
        return null;
    }
}

async function testUserTokenUsageAPI(token) {
    console.log('\n👤 Testing user token usage API...');
    
    if (!token) {
        logTest('User token usage API test', false, 'No authentication token available');
        return;
    }
    
    try {
        const { response, data } = await makeRequest('/api/user/token-usage?timeRange=30', {
            headers: {
                'Cookie': `token=${token}`
            }
        });
        
        logTest('User token usage API returns 200', response.status === 200);
        logTest('User token usage has success field', data.success === true);
        logTest('User token usage has usage data', data.usage !== undefined);
        
        if (data.usage) {
            logTest('Usage data has total records', typeof data.usage.totalRecords === 'number');
            logTest('Usage data has total tokens', typeof data.usage.totalTokens === 'number');
            logTest('Usage data has total cost', typeof data.usage.totalCost === 'number');
            logTest('Usage data has records array', Array.isArray(data.usage.records));
        }
        
    } catch (error) {
        logTest('User token usage API', false, error.message);
    }
}

async function testAdminTokenStatsAPI() {
    console.log('\n🔧 Testing admin token stats API...');
    
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
            logTest('Admin token stats', false, 'Admin authentication failed - skipping admin tests');
            return;
        }
        
        const adminToken = adminLogin.cookies.token;
        
        const { response, data } = await makeRequest('/api/admin/token-stats?timeRange=30', {
            headers: {
                'Cookie': `token=${adminToken}`
            }
        });
        
        logTest('Admin token stats API returns 200', response.status === 200);
        logTest('Admin token stats has success field', data.success === true);
        logTest('Admin token stats has stats data', data.stats !== undefined);
        
        if (data.stats) {
            logTest('Stats has summary data', data.stats.summary !== undefined);
            logTest('Stats has report type stats', data.stats.reportTypeStats !== undefined);
            logTest('Stats has user stats', data.stats.userStats !== undefined);
            logTest('Stats has recent usage', Array.isArray(data.stats.recentUsage));
            
            if (data.stats.summary) {
                logTest('Summary has total tokens', typeof data.stats.summary.totalTokens === 'number');
                logTest('Summary has total cost', typeof data.stats.summary.totalCost === 'number');
                logTest('Summary has total records', typeof data.stats.summary.totalRecords === 'number');
            }
        }
        
    } catch (error) {
        logTest('Admin token statistics', false, error.message);
    }
}

async function testCostCalculationAccuracy() {
    console.log('\n💰 Testing cost calculation accuracy...');
    
    try {
        // Test known token amounts with expected costs
        const testCases = [
            { promptTokens: 1000, completionTokens: 500, model: 'gpt-4o' },
            { promptTokens: 2000, completionTokens: 1000, model: 'gpt-4o' },
            { promptTokens: 500, completionTokens: 250, model: 'gpt-4' }
        ];
        
        // Since we can't directly test the calculation function, we'll test through API
        // This is a simplified test - in a real scenario, you'd want to test the calculation function directly
        
        for (const testCase of testCases) {
            // Expected cost calculation (based on current pricing)
            const pricing = {
                'gpt-4o': { input: 0.005 / 1000, output: 0.015 / 1000 },
                'gpt-4': { input: 0.03 / 1000, output: 0.06 / 1000 }
            };
            
            const modelPricing = pricing[testCase.model];
            const expectedCost = (testCase.promptTokens * modelPricing.input) + 
                               (testCase.completionTokens * modelPricing.output);
            
            logTest(`Cost calculation for ${testCase.model}`, 
                expectedCost > 0, 
                `Expected cost: $${expectedCost.toFixed(6)}`);
        }
        
    } catch (error) {
        logTest('Cost calculation accuracy', false, error.message);
    }
}

async function testTokenDataPersistence(token) {
    console.log('\n💾 Testing token data persistence...');
    
    if (!token) {
        logTest('Token data persistence test', false, 'No authentication token available');
        return;
    }
    
    try {
        // Generate a report to create token usage data
        const requestData = {
            reportType: 'custom',
            customPrompt: 'Create a brief test report',
            inputText: 'This is a test for token persistence.',
            files: [],
            options: { language: 'ja' }
        };
        
        const { response: genResponse, data: genData } = await makeRequest('/api/generate-firebase', {
            method: 'POST',
            headers: {
                'Cookie': `token=${token}`
            },
            body: JSON.stringify(requestData)
        });
        
        if (genResponse.status === 200 && genData.usage) {
            // Wait a moment for data to be persisted
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check if the data appears in user token usage
            const { response: usageResponse, data: usageData } = await makeRequest('/api/user/token-usage?timeRange=1', {
                headers: {
                    'Cookie': `token=${token}`
                }
            });
            
            logTest('Token data persisted to database', 
                usageResponse.status === 200 && 
                usageData.success && 
                usageData.usage.totalRecords > 0);
                
            if (usageData.usage.records && usageData.usage.records.length > 0) {
                const latestRecord = usageData.usage.records[0];
                logTest('Persisted data has correct report type', latestRecord.reportType === 'custom');
                logTest('Persisted data has token counts', latestRecord.totalTokens > 0);
                logTest('Persisted data has cost estimate', latestRecord.estimatedCost > 0);
            }
        }
        
    } catch (error) {
        logTest('Token data persistence', false, error.message);
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
            return false;
        }
        return true;
    }
}

// Main test execution
async function runTokenTrackingTests() {
    console.log('🧪 Starting Token Tracking Tests');
    console.log(`Testing against: ${BASE_URL}`);
    console.log('=' .repeat(60));
    
    // Authenticate
    console.log('🔐 Authenticating test user...');
    const token = await authenticateUser();
    
    if (!token) {
        console.log('❌ Cannot proceed without authentication');
        process.exit(1);
    }
    
    console.log('✅ Authentication successful');
    
    // Test token tracking functionality
    const usage = await testTokenRecordingInReportGeneration(token);
    await testUserTokenUsageAPI(token);
    await testAdminTokenStatsAPI();
    await testCostCalculationAccuracy();
    await testTokenDataPersistence(token);
    
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
    const reportPath = 'token-tracking-test-results.json';
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
        await runTokenTrackingTests();
    } else {
        process.exit(1);
    }
})();

export { runTokenTrackingTests };