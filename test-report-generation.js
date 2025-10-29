#!/usr/bin/env node

/**
 * Report Generation Functionality Test Script
 * 
 * This script tests:
 * - Verify authenticated users can generate reports
 * - Test file upload and processing
 * - Validate error handling for report generation failures
 * 
 * Requirements: 3.1, 3.2, 3.3
 */

import { promises as fs } from 'fs';
import path from 'path';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_USER = {
    email: 'test@example.com',
    password: 'testpassword123'
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

// Create test files
async function createTestFiles() {
    const testFiles = {};
    
    // Create a simple text file as PDF substitute (for testing file processing)
    const textContent = 'This is a test document for report generation testing.\n\nIt contains sample content to verify file processing capabilities.';
    testFiles.textFile = {
        name: 'test-document.txt',
        type: 'text/plain',
        base64: Buffer.from(textContent).toString('base64')
    };
    
    // Create a simple image (1x1 PNG)
    const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77yQAAAABJRU5ErkJggg==', 'base64');
    testFiles.imageFile = {
        name: 'test-image.png',
        type: 'image/png',
        base64: pngBuffer.toString('base64')
    };
    
    return testFiles;
}

// Test functions
async function testBasicReportGeneration(token) {
    console.log('\n📄 Testing basic report generation...');
    
    if (!token) {
        logTest('Basic report generation', false, 'No authentication token available');
        return;
    }
    
    try {
        const requestData = {
            reportType: 'comparison_analysis',
            inputText: 'Please analyze the following test data: Revenue Q1: $100k, Revenue Q2: $120k, Revenue Q3: $110k',
            files: [],
            options: {
                language: 'ja',
                structured: false
            }
        };
        
        const { response, data } = await makeRequest('/api/generate-firebase', {
            method: 'POST',
            headers: {
                'Cookie': `token=${token}`
            },
            body: JSON.stringify(requestData)
        });
        
        logTest('Report generation returns 200 status', response.status === 200, `Got ${response.status}`);
        logTest('Report generation response has success field', data.success === true);
        logTest('Report generation returns content', data.content && data.content.length > 0);
        logTest('Report generation includes timestamp', data.timestamp !== undefined);
        logTest('Report generation includes report type', data.reportType === 'jp_investment_4part');
        
    } catch (error) {
        logTest('Basic report generation', false, error.message);
    }
}

async function testCustomPromptReportGeneration(token) {
    console.log('\n🎯 Testing custom prompt report generation...');
    
    if (!token) {
        logTest('Custom prompt report generation', false, 'No authentication token available');
        return;
    }
    
    try {
        const requestData = {
            reportType: 'custom',
            customPrompt: 'Create a brief summary of the following data in Japanese',
            inputText: 'Test data for custom prompt analysis',
            files: [],
            options: {
                language: 'ja',
                structured: false
            }
        };
        
        const { response, data } = await makeRequest('/api/generate-firebase', {
            method: 'POST',
            headers: {
                'Cookie': `token=${token}`
            },
            body: JSON.stringify(requestData)
        });
        
        logTest('Custom prompt report returns 200 status', response.status === 200);
        logTest('Custom prompt report has success field', data.success === true);
        logTest('Custom prompt report returns content', data.content && data.content.length > 0);
        
    } catch (error) {
        logTest('Custom prompt report generation', false, error.message);
    }
}

async function testFileUploadProcessing(token) {
    console.log('\n📎 Testing file upload and processing...');
    
    if (!token) {
        logTest('File upload processing', false, 'No authentication token available');
        return;
    }
    
    const testFiles = await createTestFiles();
    
    try {
        // Test with image file
        const requestData = {
            reportType: 'comparison_analysis',
            inputText: 'Please analyze the uploaded image',
            files: [testFiles.imageFile],
            options: {
                language: 'ja',
                structured: false
            }
        };
        
        const { response, data } = await makeRequest('/api/generate-firebase', {
            method: 'POST',
            headers: {
                'Cookie': `token=${token}`
            },
            body: JSON.stringify(requestData)
        });
        
        logTest('File upload processing returns 200 status', response.status === 200);
        logTest('File upload processing has success field', data.success === true);
        logTest('File upload processing returns content', data.content && data.content.length > 0);
        
    } catch (error) {
        logTest('File upload processing', false, error.message);
    }
}

async function testMultipleFileProcessing(token) {
    console.log('\n📎📎 Testing multiple file processing...');
    
    if (!token) {
        logTest('Multiple file processing', false, 'No authentication token available');
        return;
    }
    
    const testFiles = await createTestFiles();
    
    try {
        const requestData = {
            reportType: 'comparison_analysis',
            inputText: 'Please analyze the uploaded files',
            files: [testFiles.imageFile, testFiles.textFile],
            options: {
                language: 'ja',
                structured: false
            }
        };
        
        const { response, data } = await makeRequest('/api/generate-firebase', {
            method: 'POST',
            headers: {
                'Cookie': `token=${token}`
            },
            body: JSON.stringify(requestData)
        });
        
        logTest('Multiple file processing returns 200 status', response.status === 200);
        logTest('Multiple file processing has success field', data.success === true);
        logTest('Multiple file processing returns content', data.content && data.content.length > 0);
        
    } catch (error) {
        logTest('Multiple file processing', false, error.message);
    }
}

async function testUnauthenticatedAccess() {
    console.log('\n🚫 Testing unauthenticated access...');
    
    try {
        const requestData = {
            reportType: 'comparison_analysis',
            inputText: 'Test without authentication',
            files: []
        };
        
        const { response, data } = await makeRequest('/api/generate-firebase', {
            method: 'POST',
            body: JSON.stringify(requestData)
        });
        
        logTest('Unauthenticated request returns 401', response.status === 401);
        logTest('Unauthenticated request has error message', data.error !== undefined);
        
    } catch (error) {
        logTest('Unauthenticated access test', false, error.message);
    }
}

async function testInvalidReportType(token) {
    console.log('\n❌ Testing invalid report type...');
    
    if (!token) {
        logTest('Invalid report type test', false, 'No authentication token available');
        return;
    }
    
    try {
        const requestData = {
            reportType: 'invalid_report_type',
            inputText: 'Test with invalid report type',
            files: []
        };
        
        const { response, data } = await makeRequest('/api/generate-firebase', {
            method: 'POST',
            headers: {
                'Cookie': `token=${token}`
            },
            body: JSON.stringify(requestData)
        });
        
        logTest('Invalid report type returns 400', response.status === 400);
        logTest('Invalid report type has error message', data.error !== undefined);
        
    } catch (error) {
        logTest('Invalid report type test', false, error.message);
    }
}

async function testMissingCustomPrompt(token) {
    console.log('\n❌ Testing missing custom prompt...');
    
    if (!token) {
        logTest('Missing custom prompt test', false, 'No authentication token available');
        return;
    }
    
    try {
        const requestData = {
            reportType: 'custom',
            inputText: 'Test without custom prompt',
            files: []
        };
        
        const { response, data } = await makeRequest('/api/generate-firebase', {
            method: 'POST',
            headers: {
                'Cookie': `token=${token}`
            },
            body: JSON.stringify(requestData)
        });
        
        logTest('Missing custom prompt returns 400', response.status === 400);
        logTest('Missing custom prompt has error message', data.error !== undefined);
        
    } catch (error) {
        logTest('Missing custom prompt test', false, error.message);
    }
}

async function testFileSizeLimit(token) {
    console.log('\n📏 Testing file size limit...');
    
    if (!token) {
        logTest('File size limit test', false, 'No authentication token available');
        return;
    }
    
    try {
        // Create a large file (simulate 5MB file)
        const largeFileContent = 'A'.repeat(5 * 1024 * 1024); // 5MB of 'A' characters
        const largeFile = {
            name: 'large-file.txt',
            type: 'text/plain',
            base64: Buffer.from(largeFileContent).toString('base64')
        };
        
        const requestData = {
            reportType: 'comparison_analysis',
            inputText: 'Test with large file',
            files: [largeFile]
        };
        
        const { response, data } = await makeRequest('/api/generate-firebase', {
            method: 'POST',
            headers: {
                'Cookie': `token=${token}`
            },
            body: JSON.stringify(requestData)
        });
        
        logTest('Large file returns 400', response.status === 400);
        logTest('Large file has size limit error', data.error && data.error.includes('4.5MB'));
        
    } catch (error) {
        logTest('File size limit test', false, error.message);
    }
}

async function testUnsupportedFileType(token) {
    console.log('\n🚫 Testing unsupported file type...');
    
    if (!token) {
        logTest('Unsupported file type test', false, 'No authentication token available');
        return;
    }
    
    try {
        const unsupportedFile = {
            name: 'test.exe',
            type: 'application/x-executable',
            base64: Buffer.from('fake executable content').toString('base64')
        };
        
        const requestData = {
            reportType: 'comparison_analysis',
            inputText: 'Test with unsupported file',
            files: [unsupportedFile]
        };
        
        const { response, data } = await makeRequest('/api/generate-firebase', {
            method: 'POST',
            headers: {
                'Cookie': `token=${token}`
            },
            body: JSON.stringify(requestData)
        });
        
        logTest('Unsupported file type returns 400', response.status === 400);
        logTest('Unsupported file type has error message', data.error && data.error.includes('Unsupported file type'));
        
    } catch (error) {
        logTest('Unsupported file type test', false, error.message);
    }
}

async function testInvalidHttpMethod() {
    console.log('\n🚫 Testing invalid HTTP method...');
    
    try {
        const { response, data } = await makeRequest('/api/generate-firebase', {
            method: 'GET'
        });
        
        logTest('Invalid HTTP method returns 405', response.status === 405);
        logTest('Invalid HTTP method has error message', data.error !== undefined);
        
    } catch (error) {
        logTest('Invalid HTTP method test', false, error.message);
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
async function runReportGenerationTests() {
    console.log('🧪 Starting Report Generation Functionality Tests');
    console.log(`Testing against: ${BASE_URL}`);
    console.log('=' .repeat(60));
    
    // Authenticate first
    console.log('🔐 Authenticating test user...');
    const token = await authenticateUser();
    
    if (!token) {
        console.log('❌ Cannot proceed without authentication. Please ensure:');
        console.log('  1. The server is running');
        console.log('  2. The test user exists in the database');
        console.log('  3. Firebase is properly configured');
        process.exit(1);
    }
    
    console.log('✅ Authentication successful');
    
    // Test basic functionality
    await testBasicReportGeneration(token);
    await testCustomPromptReportGeneration(token);
    
    // Test file processing
    await testFileUploadProcessing(token);
    await testMultipleFileProcessing(token);
    
    // Test error scenarios
    await testUnauthenticatedAccess();
    await testInvalidReportType(token);
    await testMissingCustomPrompt(token);
    await testFileSizeLimit(token);
    await testUnsupportedFileType(token);
    await testInvalidHttpMethod();
    
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
    const reportPath = 'report-generation-test-results.json';
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
        await runReportGenerationTests();
    } else {
        process.exit(1);
    }
})();

export { runReportGenerationTests };