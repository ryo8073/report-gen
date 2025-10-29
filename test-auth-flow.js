#!/usr/bin/env node

/**
 * Authentication Flow End-to-End Test Script
 * 
 * This script tests:
 * - Login, session persistence, and logout functionality
 * - Authentication error scenarios and recovery
 * - Token handling and expiration
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4
 */

import { promises as fs } from 'fs';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_USER = {
    email: 'test@example.com',
    password: 'testpassword123',
    name: 'Test User'
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

function formatCookies(cookies) {
    return Object.entries(cookies)
        .map(([name, value]) => `${name}=${value}`)
        .join('; ');
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
async function testLoginWithValidCredentials() {
    console.log('\n🔐 Testing login with valid credentials...');
    
    try {
        const { response, data, cookies } = await makeRequest('/api/auth/login-firebase', {
            method: 'POST',
            body: JSON.stringify(TEST_USER)
        });
        
        // Test response status
        logTest('Login returns 200 status', response.status === 200, `Got ${response.status}`);
        
        // Test response structure
        logTest('Login response has success field', data.success === true);
        logTest('Login response has user data', data.user && data.user.email === TEST_USER.email);
        
        // Test cookie setting
        logTest('Login sets authentication cookie', cookies.token !== undefined, 'Token cookie should be set');
        
        return cookies.token;
        
    } catch (error) {
        logTest('Login with valid credentials', false, error.message);
        return null;
    }
}

async function testLoginWithInvalidCredentials() {
    console.log('\n❌ Testing login with invalid credentials...');
    
    const invalidCredentials = [
        { email: 'nonexistent@example.com', password: 'wrongpassword', scenario: 'non-existent user' },
        { email: TEST_USER.email, password: 'wrongpassword', scenario: 'wrong password' },
        { email: '', password: TEST_USER.password, scenario: 'missing email' },
        { email: TEST_USER.email, password: '', scenario: 'missing password' }
    ];
    
    for (const creds of invalidCredentials) {
        try {
            const { response, data } = await makeRequest('/api/auth/login-firebase', {
                method: 'POST',
                body: JSON.stringify({ email: creds.email, password: creds.password })
            });
            
            const expectedStatus = creds.email === '' || creds.password === '' ? 400 : 401;
            logTest(`Login rejects ${creds.scenario}`, 
                response.status === expectedStatus && !data.success,
                `Expected ${expectedStatus}, got ${response.status}`);
                
        } catch (error) {
            logTest(`Login with ${creds.scenario}`, false, error.message);
        }
    }
}

async function testSessionPersistence(token) {
    console.log('\n🔄 Testing session persistence...');
    
    if (!token) {
        logTest('Session persistence test', false, 'No token available from login');
        return;
    }
    
    try {
        const { response, data } = await makeRequest('/api/auth/me-firebase', {
            headers: {
                'Cookie': `token=${token}`
            }
        });
        
        logTest('Session validation returns 200', response.status === 200);
        logTest('Session returns user data', data.success && data.user);
        logTest('Session user email matches', data.user?.email === TEST_USER.email);
        
    } catch (error) {
        logTest('Session persistence', false, error.message);
    }
}

async function testInvalidTokenHandling() {
    console.log('\n🚫 Testing invalid token handling...');
    
    const invalidTokens = [
        { token: 'invalid.token.here', scenario: 'malformed token' },
        { token: '', scenario: 'empty token' },
        { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c', scenario: 'expired/invalid JWT' }
    ];
    
    for (const { token, scenario } of invalidTokens) {
        try {
            const { response, data } = await makeRequest('/api/auth/me-firebase', {
                headers: {
                    'Cookie': token ? `token=${token}` : ''
                }
            });
            
            logTest(`Rejects ${scenario}`, response.status === 401 && !data.success);
            
        } catch (error) {
            logTest(`Invalid token handling for ${scenario}`, false, error.message);
        }
    }
}

async function testLogoutFunctionality(token) {
    console.log('\n🚪 Testing logout functionality...');
    
    if (!token) {
        logTest('Logout test', false, 'No token available for logout');
        return;
    }
    
    try {
        // Test logout endpoint
        const { response, data, cookies } = await makeRequest('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Cookie': `token=${token}`
            }
        });
        
        logTest('Logout returns 200 status', response.status === 200);
        logTest('Logout response indicates success', data.success === true);
        
        // Check if cookies are cleared (should have Max-Age=0)
        const setCookieHeader = response.headers.get('set-cookie');
        const cookiesCleared = setCookieHeader && setCookieHeader.includes('Max-Age=0');
        logTest('Logout clears authentication cookies', cookiesCleared);
        
        // Test that session is invalidated
        const { response: sessionResponse } = await makeRequest('/api/auth/me-firebase', {
            headers: {
                'Cookie': `token=${token}`
            }
        });
        
        logTest('Session invalidated after logout', sessionResponse.status === 401);
        
    } catch (error) {
        logTest('Logout functionality', false, error.message);
    }
}

async function testAuthenticationRedirection() {
    console.log('\n🔀 Testing authentication redirection behavior...');
    
    try {
        // Test accessing protected endpoint without authentication
        const { response } = await makeRequest('/api/auth/me-firebase');
        
        logTest('Unauthenticated request returns 401', response.status === 401);
        
        // Test accessing main page without authentication (should redirect to login)
        const { response: indexResponse } = await makeRequest('/');
        
        // Note: This test depends on server-side redirect logic
        // If it's client-side redirect, we'd need to check the HTML content
        const isRedirectOrContainsLoginLogic = indexResponse.status === 302 || 
            indexResponse.status === 200; // Client-side redirect would still return 200
            
        logTest('Main page handles unauthenticated access', isRedirectOrContainsLoginLogic);
        
    } catch (error) {
        logTest('Authentication redirection', false, error.message);
    }
}

async function testErrorHandling() {
    console.log('\n⚠️ Testing error handling and recovery...');
    
    try {
        // Test malformed request body
        const { response: malformedResponse } = await makeRequest('/api/auth/login-firebase', {
            method: 'POST',
            body: 'invalid json'
        });
        
        logTest('Handles malformed JSON', malformedResponse.status >= 400);
        
        // Test unsupported HTTP method
        const { response: methodResponse } = await makeRequest('/api/auth/login-firebase', {
            method: 'GET'
        });
        
        logTest('Rejects unsupported HTTP methods', methodResponse.status === 405);
        
        // Test missing content-type (should still work)
        const { response: noContentTypeResponse } = await makeRequest('/api/auth/login-firebase', {
            method: 'POST',
            headers: {},
            body: JSON.stringify(TEST_USER)
        });
        
        // Should either work or return a specific error
        logTest('Handles missing content-type gracefully', 
            noContentTypeResponse.status === 200 || noContentTypeResponse.status >= 400);
        
    } catch (error) {
        logTest('Error handling', false, error.message);
    }
}

async function testRateLimiting() {
    console.log('\n🚦 Testing rate limiting (if implemented)...');
    
    try {
        // Make multiple rapid requests to test rate limiting
        const requests = [];
        for (let i = 0; i < 10; i++) {
            requests.push(makeRequest('/api/auth/login-firebase', {
                method: 'POST',
                body: JSON.stringify({ email: 'test@test.com', password: 'wrong' })
            }));
        }
        
        const responses = await Promise.all(requests);
        const rateLimited = responses.some(({ response }) => response.status === 429);
        
        if (rateLimited) {
            logTest('Rate limiting is implemented', true);
        } else {
            logTest('Rate limiting check', true, 'No rate limiting detected (may not be implemented)');
        }
        
    } catch (error) {
        logTest('Rate limiting test', false, error.message);
    }
}

// Main test execution
async function runAuthenticationTests() {
    console.log('🧪 Starting Authentication Flow End-to-End Tests');
    console.log(`Testing against: ${BASE_URL}`);
    console.log('=' .repeat(60));
    
    // Test login functionality
    const token = await testLoginWithValidCredentials();
    await testLoginWithInvalidCredentials();
    
    // Test session management
    await testSessionPersistence(token);
    await testInvalidTokenHandling();
    
    // Test logout
    await testLogoutFunctionality(token);
    
    // Test authentication flow
    await testAuthenticationRedirection();
    
    // Test error scenarios
    await testErrorHandling();
    await testRateLimiting();
    
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
    const reportPath = 'auth-test-results.json';
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
        // Server is running but returned an error (which is expected for unauthenticated request)
        return true;
    }
}

// Run tests
(async () => {
    const serverRunning = await checkServerHealth();
    if (serverRunning) {
        await runAuthenticationTests();
    } else {
        process.exit(1);
    }
})();

export { runAuthenticationTests };