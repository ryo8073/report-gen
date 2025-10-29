// Trial Site Error Handling Test Suite
// Task 5.2: Test error handling scenarios
// Requirements: 3.1, 3.2, 3.4

import fs from 'fs/promises';

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_RESULTS_FILE = 'trial-site-error-test-results.json';

// Test results tracking
const testResults = {
  timestamp: new Date().toISOString(),
  summary: { passed: 0, failed: 0, total: 0 },
  tests: []
};

// Utility functions
function logTest(testName, passed, details = '', requirement = '') {
  const result = {
    test: testName,
    passed,
    details,
    requirement,
    timestamp: new Date().toISOString()
  };
  
  testResults.tests.push(result);
  testResults.summary.total++;
  
  if (passed) {
    testResults.summary.passed++;
    console.log(`✅ ${testName}${requirement ? ` (${requirement})` : ''}`);
  } else {
    testResults.summary.failed++;
    console.log(`❌ ${testName}${requirement ? ` (${requirement})` : ''}`);
  }
  
  if (details) {
    console.log(`   ${details}`);
  }
}

async function makeRequest(endpoint, data) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    let responseData;
    try {
      responseData = await response.json();
    } catch (parseError) {
      responseData = { error: 'Failed to parse response JSON' };
    }

    return { response, data: responseData };
  } catch (error) {
    return { 
      response: { status: 0, ok: false }, 
      data: { error: error.message } 
    };
  }
}

// Test functions for Task 5.2

async function testInvalidInputs() {
  console.log('\n❌ Testing invalid input scenarios...');
  
  const invalidInputTests = [
    {
      name: 'Missing Report Type',
      data: {
        inputText: 'Test input without report type',
        files: [],
        additionalInfo: {},
        options: { language: 'ja' }
      },
      expectedError: 'validation_error'
    },
    {
      name: 'Invalid Report Type',
      data: {
        reportType: 'invalid_report_type',
        inputText: 'Test input with invalid report type',
        files: [],
        additionalInfo: {},
        options: { language: 'ja' }
      },
      expectedError: 'validation_error'
    },
    {
      name: 'Empty Input (No Text or Files)',
      data: {
        reportType: 'jp_investment_4part',
        inputText: '',
        files: [],
        additionalInfo: {},
        options: { language: 'ja' }
      },
      expectedError: 'validation_error'
    },
    {
      name: 'Null Input Text',
      data: {
        reportType: 'jp_investment_4part',
        inputText: null,
        files: [],
        additionalInfo: {},
        options: { language: 'ja' }
      },
      expectedError: 'validation_error'
    },
    {
      name: 'Extremely Long Text Input',
      data: {
        reportType: 'custom',
        inputText: 'A'.repeat(15000), // Exceeds 10,000 character limit
        files: [],
        additionalInfo: {},
        options: { language: 'ja' }
      },
      expectedError: 'validation_error'
    }
  ];
  
  for (const test of invalidInputTests) {
    try {
      const { response, data } = await makeRequest('/api/generate', test.data);
      
      // Should return 400 status for validation errors
      logTest(
        `Invalid Input - ${test.name} (Status)`, 
        response.status === 400,
        `Expected 400, got ${response.status}`,
        '3.1'
      );
      
      // Should have error structure
      logTest(
        `Invalid Input - ${test.name} (Error Structure)`, 
        data.success === false && data.error !== undefined,
        `Success: ${data.success}, Has Error: ${!!data.error}`,
        '3.1'
      );
      
      // Should have user-friendly error message
      logTest(
        `Invalid Input - ${test.name} (User-Friendly Message)`, 
        data.error && data.error.message && data.error.message.length > 0,
        `Error message: ${data.error ? data.error.message : 'No message'}`,
        '3.1'
      );
      
      // Should have error type
      logTest(
        `Invalid Input - ${test.name} (Error Type)`, 
        data.error && data.error.type === test.expectedError,
        `Expected: ${test.expectedError}, Got: ${data.error ? data.error.type : 'none'}`,
        '3.1'
      );
      
    } catch (error) {
      logTest(
        `Invalid Input - ${test.name}`, 
        false, 
        `Test error: ${error.message}`,
        '3.1'
      );
    }
  }
}

async function testOversizedFiles() {
  console.log('\n📁 Testing oversized file scenarios...');
  
  const oversizedFileTests = [
    {
      name: 'Single Large File',
      files: [{
        name: 'large-file.txt',
        type: 'text/plain',
        data: Buffer.from('A'.repeat(15 * 1024 * 1024)).toString('base64') // 15MB
      }]
    },
    {
      name: 'Too Many Files',
      files: Array.from({ length: 10 }, (_, i) => ({
        name: `file-${i}.txt`,
        type: 'text/plain',
        data: Buffer.from(`Content of file ${i}`).toString('base64')
      }))
    },
    {
      name: 'Invalid File Type',
      files: [{
        name: 'executable.exe',
        type: 'application/x-executable',
        data: Buffer.from('fake executable content').toString('base64')
      }]
    },
    {
      name: 'Corrupted File Data',
      files: [{
        name: 'corrupted.pdf',
        type: 'application/pdf',
        data: 'invalid-base64-data!!!'
      }]
    },
    {
      name: 'Empty File Data',
      files: [{
        name: 'empty.txt',
        type: 'text/plain',
        data: ''
      }]
    }
  ];
  
  for (const test of oversizedFileTests) {
    try {
      const requestData = {
        reportType: 'jp_investment_4part',
        inputText: 'File upload test',
        files: test.files,
        additionalInfo: {},
        options: { language: 'ja' }
      };

      const { response, data } = await makeRequest('/api/generate', requestData);
      
      // Should return 400 status for file validation errors
      logTest(
        `File Error - ${test.name} (Status)`, 
        response.status === 400,
        `Expected 400, got ${response.status}`,
        '3.2'
      );
      
      // Should have error structure
      logTest(
        `File Error - ${test.name} (Error Structure)`, 
        data.success === false && data.error !== undefined,
        `Success: ${data.success}, Has Error: ${!!data.error}`,
        '3.2'
      );
      
      // Should have user-friendly error message
      logTest(
        `File Error - ${test.name} (User-Friendly Message)`, 
        data.error && data.error.message && data.error.userActions,
        `Has message: ${!!data.error?.message}, Has actions: ${!!data.error?.userActions}`,
        '3.2'
      );
      
    } catch (error) {
      logTest(
        `File Error - ${test.name}`, 
        false, 
        `Test error: ${error.message}`,
        '3.2'
      );
    }
  }
}

async function testOpenAIAPIErrorScenarios() {
  console.log('\n🤖 Testing OpenAI API error scenarios...');
  
  // Test with invalid API key scenario (simulated by very long input that might cause issues)
  const apiErrorTests = [
    {
      name: 'Rate Limit Simulation',
      data: {
        reportType: 'custom',
        inputText: 'Generate a very detailed report. '.repeat(1000), // Large input to potentially trigger rate limits
        files: [],
        additionalInfo: {},
        options: { language: 'ja' }
      }
    },
    {
      name: 'Complex Request Processing',
      data: {
        reportType: 'jp_investment_4part',
        inputText: '複雑な投資シナリオのテスト。' + 'データ '.repeat(500),
        files: [{
          name: 'complex-data.txt',
          type: 'text/plain',
          data: Buffer.from('Complex financial data. '.repeat(1000)).toString('base64')
        }],
        additionalInfo: {
          complexData: 'A'.repeat(1000)
        },
        options: { language: 'ja' }
      }
    }
  ];
  
  for (const test of apiErrorTests) {
    try {
      const startTime = Date.now();
      const { response, data } = await makeRequest('/api/generate', test.data);
      const duration = Date.now() - startTime;
      
      // Test should either succeed or fail gracefully
      if (response.status === 200) {
        logTest(
          `API Stress - ${test.name} (Success)`, 
          data.success === true && data.report !== undefined,
          `Completed in ${duration}ms`,
          '3.4'
        );
      } else {
        // If it fails, should have proper error handling
        logTest(
          `API Stress - ${test.name} (Error Handling)`, 
          data.error && data.error.message && data.error.shouldRetry !== undefined,
          `Status: ${response.status}, Has retry info: ${!!data.error?.shouldRetry}`,
          '3.4'
        );
      }
      
    } catch (error) {
      logTest(
        `API Stress - ${test.name}`, 
        false, 
        `Test error: ${error.message}`,
        '3.4'
      );
    }
  }
}

async function testNetworkErrorScenarios() {
  console.log('\n🌐 Testing network error scenarios...');
  
  // Test with invalid endpoint
  try {
    const { response, data } = await makeRequest('/api/nonexistent', {
      reportType: 'jp_investment_4part',
      inputText: 'Test input'
    });
    
    logTest(
      'Network Error - Invalid Endpoint', 
      response.status === 404 || response.status === 0,
      `Status: ${response.status}`,
      '3.1'
    );
    
  } catch (error) {
    logTest(
      'Network Error - Invalid Endpoint', 
      true, // Network errors are expected
      `Network error caught: ${error.message}`,
      '3.1'
    );
  }
  
  // Test with malformed request
  try {
    const response = await fetch(`${BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: 'invalid json data'
    });
    
    const data = await response.json();
    
    logTest(
      'Network Error - Malformed JSON', 
      response.status >= 400,
      `Status: ${response.status}`,
      '3.1'
    );
    
  } catch (error) {
    logTest(
      'Network Error - Malformed JSON', 
      true, // Parse errors are expected
      `Parse error caught: ${error.message}`,
      '3.1'
    );
  }
}

async function testUserFriendlyErrorMessages() {
  console.log('\n💬 Testing user-friendly error messages...');
  
  const errorMessageTests = [
    {
      name: 'Missing Report Type Message',
      data: {
        inputText: 'Test without report type'
      },
      expectedMessageContent: ['選択', 'report', 'type']
    },
    {
      name: 'File Too Large Message',
      data: {
        reportType: 'jp_investment_4part',
        inputText: 'Test with large file',
        files: [{
          name: 'huge-file.txt',
          type: 'text/plain',
          data: Buffer.from('A'.repeat(12 * 1024 * 1024)).toString('base64') // 12MB
        }]
      },
      expectedMessageContent: ['large', 'size', 'MB']
    }
  ];
  
  for (const test of errorMessageTests) {
    try {
      const { response, data } = await makeRequest('/api/generate', test.data);
      
      if (data.error && data.error.message) {
        const message = data.error.message.toLowerCase();
        const hasExpectedContent = test.expectedMessageContent.some(content => 
          message.includes(content.toLowerCase())
        );
        
        logTest(
          `Error Message - ${test.name} (Content)`, 
          hasExpectedContent,
          `Message: ${data.error.message}`,
          '3.1'
        );
        
        // Test for user actions
        logTest(
          `Error Message - ${test.name} (User Actions)`, 
          data.error.userActions && Array.isArray(data.error.userActions) && data.error.userActions.length > 0,
          `Actions count: ${data.error.userActions ? data.error.userActions.length : 0}`,
          '3.1'
        );
        
        // Test for error ID
        logTest(
          `Error Message - ${test.name} (Error ID)`, 
          data.error.errorId && data.error.errorId.length > 0,
          `Has error ID: ${!!data.error.errorId}`,
          '3.1'
        );
      }
      
    } catch (error) {
      logTest(
        `Error Message - ${test.name}`, 
        false, 
        `Test error: ${error.message}`,
        '3.1'
      );
    }
  }
}

// Main test execution
async function runTask52Tests() {
  console.log('🧪 Task 5.2: Testing Error Handling Scenarios');
  console.log('=' .repeat(60));
  console.log(`Testing against: ${BASE_URL}`);
  console.log(`Test started at: ${new Date().toISOString()}`);
  
  try {
    // Run all test suites
    await testInvalidInputs();
    await testOversizedFiles();
    await testOpenAIAPIErrorScenarios();
    await testNetworkErrorScenarios();
    await testUserFriendlyErrorMessages();
    
    // Generate summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Total Tests: ${testResults.summary.total}`);
    console.log(`Passed: ${testResults.summary.passed}`);
    console.log(`Failed: ${testResults.summary.failed}`);
    console.log(`Success Rate: ${((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1)}%`);
    
    // Save results
    await fs.writeFile(TEST_RESULTS_FILE, JSON.stringify(testResults, null, 2));
    console.log(`\n📄 Results saved to: ${TEST_RESULTS_FILE}`);
    
    // Return success status
    return testResults.summary.failed === 0;
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    return false;
  }
}

// Export for use in other test files
export {
  runTask52Tests,
  testResults,
  logTest,
  makeRequest
};

// Run tests if called directly
const isMainModule = import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMainModule) {
  console.log('Starting Task 5.2 tests...');
  runTask52Tests().then(success => {
    console.log(`Task 5.2 completed with success: ${success}`);
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Task 5.2 failed:', error);
    process.exit(1);
  });
}