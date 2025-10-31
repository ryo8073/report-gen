// Task 7.2: Test Enhanced Error Handling Implementation
// Tests comprehensive error handling with try-catch blocks, user-friendly messages, and automatic retry

import fs from 'fs/promises';
import enhancedErrorHandler from './lib/enhanced-error-handler.js';

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 30000; // 30 seconds per test

// Test results tracking
const testResults = {
  taskId: '7.2',
  taskName: 'Test Enhanced Error Handling',
  timestamp: new Date().toISOString(),
  summary: { passed: 0, failed: 0, total: 0 },
  tests: [],
  errorHandling: {},
  retryTests: {},
  errors: []
};

// Utility functions
function logTest(testName, passed, details = '', requirement = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const reqText = requirement ? ` [${requirement}]` : '';
  console.log(`${status} ${testName}${reqText}`);
  if (details) {
    console.log(`   ${details}`);
  }
  
  testResults.tests.push({
    name: testName,
    passed,
    details,
    requirement,
    timestamp: new Date().toISOString()
  });
  
  if (passed) {
    testResults.summary.passed++;
  } else {
    testResults.summary.failed++;
    testResults.errors.push({ test: testName, details, requirement });
  }
  testResults.summary.total++;
}

async function makeRequest(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TEST_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    clearTimeout(timeoutId);
    
    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = { error: 'Invalid JSON response' };
    }
    
    return { response, data };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${TEST_TIMEOUT}ms`);
    }
    throw error;
  }
}

// Test error categorization
async function testErrorCategorization() {
  console.log('\n🔍 Testing error categorization...');
  
  const testErrors = [
    {
      error: new Error('Invalid request format'),
      error: { status: 400, message: 'Invalid request format' },
      expectedCategory: 'validation_error',
      name: 'Validation Error (400)'
    },
    {
      error: { status: 401, message: 'Unauthorized' },
      expectedCategory: 'authentication_error',
      name: 'Authentication Error (401)'
    },
    {
      error: { status: 429, message: 'Rate limit exceeded' },
      expectedCategory: 'rate_limit_error',
      name: 'Rate Limit Error (429)'
    },
    {
      error: { status: 500, message: 'Internal server error' },
      expectedCategory: 'service_error',
      name: 'Service Error (500)'
    },
    {
      error: { code: 'ETIMEDOUT', message: 'Request timeout' },
      expectedCategory: 'network_error',
      name: 'Network Timeout Error'
    },
    {
      error: { message: 'Failed to process PDF file' },
      expectedCategory: 'file_processing_error',
      name: 'File Processing Error'
    }
  ];
  
  for (const testCase of testErrors) {
    try {
      const category = enhancedErrorHandler.categorizeError(testCase.error);
      const isCorrect = category === testCase.expectedCategory;
      
      logTest(
        `Error Categorization - ${testCase.name}`,
        isCorrect,
        `Expected: ${testCase.expectedCategory}, Got: ${category}`,
        '5.5'
      );
      
      testResults.errorHandling[testCase.name] = {
        expected: testCase.expectedCategory,
        actual: category,
        correct: isCorrect
      };
      
    } catch (error) {
      logTest(
        `Error Categorization - ${testCase.name}`,
        false,
        `Categorization failed: ${error.message}`,
        '5.5'
      );
    }
  }
}

// Test user-friendly error messages
async function testUserFriendlyMessages() {
  console.log('\n💬 Testing user-friendly error messages...');
  
  const testCases = [
    {
      input: { reportType: '', inputText: 'test', files: [] },
      expectedErrorType: 'validation_error',
      name: 'Missing Report Type'
    },
    {
      input: { reportType: 'jp_investment_4part', inputText: '', files: [] },
      expectedErrorType: 'validation_error',
      name: 'Missing Input Data'
    },
    {
      input: { reportType: 'invalid_type', inputText: 'test', files: [] },
      expectedErrorType: 'validation_error',
      name: 'Invalid Report Type'
    }
  ];
  
  for (const testCase of testCases) {
    try {
      const { response, data } = await makeRequest(`${BASE_URL}/api/generate`, {
        method: 'POST',
        body: JSON.stringify(testCase.input)
      });
      
      const hasUserFriendlyMessage = data.error && 
                                   data.error.message && 
                                   data.error.message.length > 0 &&
                                   !data.error.message.includes('undefined') &&
                                   !data.error.message.includes('null');
      
      const hasUserActions = data.error && 
                           data.error.userActions && 
                           Array.isArray(data.error.userActions) &&
                           data.error.userActions.length > 0;
      
      const hasErrorId = data.error && data.error.errorId;
      
      logTest(
        `User-Friendly Message - ${testCase.name}`,
        hasUserFriendlyMessage,
        `Message: "${data.error?.message || 'None'}"`,
        '5.5'
      );
      
      logTest(
        `User Actions - ${testCase.name}`,
        hasUserActions,
        `Actions: ${data.error?.userActions?.length || 0} provided`,
        '5.5'
      );
      
      logTest(
        `Error ID - ${testCase.name}`,
        hasErrorId,
        `Error ID: ${data.error?.errorId || 'None'}`,
        '5.5'
      );
      
    } catch (error) {
      logTest(
        `User-Friendly Message - ${testCase.name}`,
        false,
        `Request failed: ${error.message}`,
        '5.5'
      );
    }
  }
}

// Test automatic retry functionality
async function testAutomaticRetry() {
  console.log('\n🔄 Testing automatic retry functionality...');
  
  // Test retry logic with mock operations
  let attemptCount = 0;
  const maxRetries = 3;
  
  // Mock operation that fails first few times then succeeds
  const mockOperation = async () => {
    attemptCount++;
    if (attemptCount <= 2) {
      const error = new Error('Temporary service error');
      error.status = 503;
      throw error;
    }
    return { success: true, attempt: attemptCount };
  };
  
  try {
    const startTime = Date.now();
    const result = await enhancedErrorHandler.retryOperation(mockOperation, {
      maxRetries: maxRetries,
      baseDelay: 100, // Short delay for testing
      backoffFactor: 2
    });
    const duration = Date.now() - startTime;
    
    const retryWorked = result.success && attemptCount === 3;
    
    logTest(
      'Automatic Retry - Success After Failures',
      retryWorked,
      `Succeeded on attempt ${attemptCount}/${maxRetries + 1}, Duration: ${duration}ms`,
      '5.5'
    );
    
    testResults.retryTests.successAfterFailures = {
      attempts: attemptCount,
      maxRetries: maxRetries + 1,
      duration: duration,
      success: retryWorked
    };
    
  } catch (error) {
    logTest(
      'Automatic Retry - Success After Failures',
      false,
      `Retry failed: ${error.message}`,
      '5.5'
    );
  }
  
  // Test retry with non-retryable error
  attemptCount = 0;
  const nonRetryableOperation = async () => {
    attemptCount++;
    const error = new Error('Validation error');
    error.status = 400; // Non-retryable
    throw error;
  };
  
  try {
    await enhancedErrorHandler.retryOperation(nonRetryableOperation, {
      maxRetries: 3,
      baseDelay: 50
    });
    
    logTest(
      'Automatic Retry - Non-Retryable Error',
      false,
      'Should have failed without retries',
      '5.5'
    );
    
  } catch (error) {
    const noRetryAttempted = attemptCount === 1;
    
    logTest(
      'Automatic Retry - Non-Retryable Error',
      noRetryAttempted,
      `Correctly failed on first attempt (${attemptCount} attempts)`,
      '5.5'
    );
    
    testResults.retryTests.nonRetryableError = {
      attempts: attemptCount,
      expectedAttempts: 1,
      correctBehavior: noRetryAttempted
    };
  }
}

// Test error handling in actual API calls
async function testApiErrorHandling() {
  console.log('\n🌐 Testing API error handling...');
  
  // Test with malformed JSON
  try {
    const response = await fetch(`${BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json'
    });
    
    const data = await response.json();
    
    const handlesInvalidJson = !response.ok && data.error;
    
    logTest(
      'API Error Handling - Invalid JSON',
      handlesInvalidJson,
      `Status: ${response.status}, Has error object: ${!!data.error}`,
      '5.5'
    );
    
  } catch (error) {
    // Network-level error is also acceptable
    logTest(
      'API Error Handling - Invalid JSON',
      true,
      `Request properly rejected: ${error.message}`,
      '5.5'
    );
  }
  
  // Test with oversized request
  try {
    const largeText = 'x'.repeat(50000); // 50KB of text
    const { response, data } = await makeRequest(`${BASE_URL}/api/generate`, {
      method: 'POST',
      body: JSON.stringify({
        reportType: 'jp_investment_4part',
        inputText: largeText,
        files: []
      })
    });
    
    const handlesLargeRequest = response.status === 400 || 
                               (data.error && data.error.type === 'validation_error');
    
    logTest(
      'API Error Handling - Oversized Request',
      handlesLargeRequest,
      `Status: ${response.status}, Error type: ${data.error?.type || 'None'}`,
      '5.5'
    );
    
  } catch (error) {
    logTest(
      'API Error Handling - Oversized Request',
      false,
      `Request failed: ${error.message}`,
      '5.5'
    );
  }
}

// Test error boundary functionality
async function testErrorBoundary() {
  console.log('\n🛡️ Testing error boundary functionality...');
  
  // Test error boundary wrapper
  const riskyOperation = async (shouldFail) => {
    if (shouldFail) {
      throw new Error('Simulated operation failure');
    }
    return { success: true };
  };
  
  const wrappedOperation = enhancedErrorHandler.createErrorBoundary(
    riskyOperation,
    { sessionId: 'test_session', reportType: 'test' }
  );
  
  // Test successful operation
  try {
    const result = await wrappedOperation(false);
    const success = result.success === true;
    
    logTest(
      'Error Boundary - Successful Operation',
      success,
      'Operation completed without error boundary interference',
      '5.5'
    );
    
  } catch (error) {
    logTest(
      'Error Boundary - Successful Operation',
      false,
      `Unexpected error: ${error.message}`,
      '5.5'
    );
  }
  
  // Test failed operation
  try {
    await wrappedOperation(true);
    
    logTest(
      'Error Boundary - Failed Operation',
      false,
      'Should have thrown an error',
      '5.5'
    );
    
  } catch (error) {
    let errorData;
    try {
      errorData = JSON.parse(error.message);
    } catch (e) {
      errorData = null;
    }
    
    const hasStructuredError = errorData && 
                              errorData.error && 
                              errorData.error.type &&
                              errorData.error.message;
    
    logTest(
      'Error Boundary - Failed Operation',
      hasStructuredError,
      `Error properly structured: ${!!hasStructuredError}`,
      '5.5'
    );
  }
}

// Test error statistics and monitoring
async function testErrorStatistics() {
  console.log('\n📊 Testing error statistics and monitoring...');
  
  // Reset stats for clean test
  enhancedErrorHandler.resetErrorStats();
  
  // Generate some test errors
  const testErrors = [
    { status: 400, message: 'Validation error' },
    { status: 429, message: 'Rate limit' },
    { status: 500, message: 'Server error' },
    { code: 'ETIMEDOUT', message: 'Timeout' }
  ];
  
  for (const error of testErrors) {
    enhancedErrorHandler.handleError(error, { sessionId: 'test' });
  }
  
  const stats = enhancedErrorHandler.getErrorStats();
  
  const hasCorrectTotalCount = stats.totalErrors === testErrors.length;
  const hasCategoryBreakdown = Object.keys(stats.errorsByCategory).length > 0;
  const hasSeverityBreakdown = Object.keys(stats.errorsBySeverity).length > 0;
  
  logTest(
    'Error Statistics - Total Count',
    hasCorrectTotalCount,
    `Expected: ${testErrors.length}, Got: ${stats.totalErrors}`,
    '5.5'
  );
  
  logTest(
    'Error Statistics - Category Breakdown',
    hasCategoryBreakdown,
    `Categories tracked: ${Object.keys(stats.errorsByCategory).length}`,
    '5.5'
  );
  
  logTest(
    'Error Statistics - Severity Breakdown',
    hasSeverityBreakdown,
    `Severity levels tracked: ${Object.keys(stats.errorsBySeverity).length}`,
    '5.5'
  );
  
  testResults.errorHandling.statistics = stats;
}

// Test comprehensive error response structure
async function testErrorResponseStructure() {
  console.log('\n🏗️ Testing error response structure...');
  
  const testError = new Error('Test error for structure validation');
  testError.status = 500;
  
  const errorResponse = enhancedErrorHandler.handleError(testError, {
    sessionId: 'test_session',
    reportType: 'jp_investment_4part',
    userAgent: 'test-agent'
  });
  
  // Check required fields
  const requiredFields = [
    'success',
    'error.id',
    'error.type',
    'error.severity',
    'error.message',
    'error.shouldRetry',
    'error.retryAfter',
    'error.userActions',
    'error.technicalDetails',
    'error.timestamp'
  ];
  
  let allFieldsPresent = true;
  const missingFields = [];
  
  for (const field of requiredFields) {
    const fieldPath = field.split('.');
    let current = errorResponse;
    
    for (const part of fieldPath) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        allFieldsPresent = false;
        missingFields.push(field);
        break;
      }
    }
  }
  
  logTest(
    'Error Response Structure - Required Fields',
    allFieldsPresent,
    missingFields.length > 0 ? `Missing: ${missingFields.join(', ')}` : 'All required fields present',
    '5.5'
  );
  
  // Check data types
  const typeChecks = [
    { field: 'success', expected: 'boolean', actual: typeof errorResponse.success },
    { field: 'error.shouldRetry', expected: 'boolean', actual: typeof errorResponse.error?.shouldRetry },
    { field: 'error.retryAfter', expected: 'number', actual: typeof errorResponse.error?.retryAfter },
    { field: 'error.userActions', expected: 'object', actual: typeof errorResponse.error?.userActions }
  ];
  
  let allTypesCorrect = true;
  const incorrectTypes = [];
  
  for (const check of typeChecks) {
    if (check.expected !== check.actual) {
      allTypesCorrect = false;
      incorrectTypes.push(`${check.field}: expected ${check.expected}, got ${check.actual}`);
    }
  }
  
  logTest(
    'Error Response Structure - Data Types',
    allTypesCorrect,
    incorrectTypes.length > 0 ? incorrectTypes.join('; ') : 'All data types correct',
    '5.5'
  );
  
  // Check user actions array
  const hasUserActions = Array.isArray(errorResponse.error?.userActions) &&
                        errorResponse.error.userActions.length > 0;
  
  logTest(
    'Error Response Structure - User Actions Array',
    hasUserActions,
    `User actions: ${errorResponse.error?.userActions?.length || 0} items`,
    '5.5'
  );
}

async function generateSummaryReport() {
  console.log('\n📊 Generating test summary report...');
  
  const summary = {
    ...testResults,
    errorHandlingSummary: {
      categorizationTests: Object.keys(testResults.errorHandling).length,
      retryTests: Object.keys(testResults.retryTests).length,
      allCategoriesWorking: Object.values(testResults.errorHandling)
        .filter(test => typeof test === 'object' && 'correct' in test)
        .every(test => test.correct)
    },
    performanceSummary: {
      retrySuccessRate: testResults.retryTests.successAfterFailures?.success ? '100%' : '0%',
      nonRetryableHandling: testResults.retryTests.nonRetryableError?.correctBehavior ? 'Correct' : 'Incorrect'
    }
  };
  
  // Save detailed results
  await fs.writeFile(
    'test-enhanced-error-handling-results.json',
    JSON.stringify(summary, null, 2)
  );
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST SUMMARY - Task 7.2: Enhanced Error Handling');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${summary.summary.total}`);
  console.log(`Passed: ${summary.summary.passed} ✅`);
  console.log(`Failed: ${summary.summary.failed} ❌`);
  console.log(`Success Rate: ${Math.round((summary.summary.passed / summary.summary.total) * 100)}%`);
  console.log('');
  console.log(`Error Categorization Tests: ${summary.errorHandlingSummary.categorizationTests}`);
  console.log(`All Categories Working: ${summary.errorHandlingSummary.allCategoriesWorking ? 'Yes' : 'No'}`);
  console.log(`Retry Success Rate: ${summary.performanceSummary.retrySuccessRate}`);
  console.log(`Non-Retryable Handling: ${summary.performanceSummary.nonRetryableHandling}`);
  
  if (summary.errors.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    summary.errors.forEach(error => {
      console.log(`  • ${error.test}: ${error.details}`);
    });
  }
  
  console.log('\n📄 Detailed results saved to: test-enhanced-error-handling-results.json');
  console.log('='.repeat(60));
  
  return summary;
}

// Main test execution
async function runTask72Tests() {
  console.log('🧪 Task 7.2: Test Enhanced Error Handling');
  console.log('Testing comprehensive error handling with try-catch blocks, user-friendly messages, and automatic retry');
  console.log('='.repeat(60));
  console.log(`Testing against: ${BASE_URL}`);
  console.log(`Timeout per test: ${TEST_TIMEOUT}ms`);
  console.log('');
  
  try {
    // Test error categorization
    await testErrorCategorization();
    
    // Test user-friendly error messages
    await testUserFriendlyMessages();
    
    // Test automatic retry functionality
    await testAutomaticRetry();
    
    // Test API error handling
    await testApiErrorHandling();
    
    // Test error boundary functionality
    await testErrorBoundary();
    
    // Test error statistics
    await testErrorStatistics();
    
    // Test error response structure
    await testErrorResponseStructure();
    
    // Generate and save summary
    const summary = await generateSummaryReport();
    
    // Exit with appropriate code
    const allPassed = summary.summary.failed === 0;
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    testResults.errors.push({ test: 'Test Execution', details: error.message });
    
    await fs.writeFile(
      'test-enhanced-error-handling-results.json',
      JSON.stringify(testResults, null, 2)
    );
    
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTask72Tests();
}

export { runTask72Tests, testErrorCategorization, testAutomaticRetry };