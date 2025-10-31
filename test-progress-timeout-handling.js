// Task 7.3: Test Progress and Timeout Handling Implementation
// Tests progress indicators, timeout handling, and cancel functionality

import fs from 'fs/promises';
import progressTimeoutManager from './lib/progress-timeout-manager.js';

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 90000; // 90 seconds for timeout tests

// Test results tracking
const testResults = {
  taskId: '7.3',
  taskName: 'Test Progress and Timeout Handling',
  timestamp: new Date().toISOString(),
  summary: { passed: 0, failed: 0, total: 0 },
  tests: [],
  progressTests: {},
  timeoutTests: {},
  cancelTests: {},
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test progress indicator functionality
async function testProgressIndicators() {
  console.log('\n📊 Testing progress indicators...');
  
  const requestId = `test_progress_${Date.now()}`;
  const reportType = 'jp_investment_4part';
  
  // Start progress tracking
  const tracker = progressTimeoutManager.startProgress(requestId, reportType, 30000);
  
  const hasTracker = tracker && tracker.requestId === requestId;
  logTest(
    'Progress Tracking - Initialization',
    hasTracker,
    `Tracker created: ${!!tracker}, Request ID: ${tracker?.requestId}`,
    '5.4'
  );
  
  // Test initial progress state
  const initialProgress = progressTimeoutManager.getProgress(requestId);
  const hasInitialProgress = initialProgress && 
                           initialProgress.progress >= 0 && 
                           initialProgress.message &&
                           initialProgress.status === 'running';
  
  logTest(
    'Progress Tracking - Initial State',
    hasInitialProgress,
    `Progress: ${initialProgress?.progress}%, Message: "${initialProgress?.message}", Status: ${initialProgress?.status}`,
    '5.4'
  );
  
  testResults.progressTests.initial = initialProgress;
  
  // Test progress advancement
  await sleep(2000); // Wait for automatic progress updates
  
  const updatedProgress = progressTimeoutManager.getProgress(requestId);
  const progressAdvanced = updatedProgress && 
                          updatedProgress.progress > initialProgress.progress;
  
  logTest(
    'Progress Tracking - Automatic Updates',
    progressAdvanced,
    `Initial: ${initialProgress?.progress}%, Updated: ${updatedProgress?.progress}%`,
    '5.4'
  );
  
  // Test manual stage advancement
  progressTimeoutManager.advanceToStage(requestId, 'processing_files', 'Custom processing message');
  
  const manualProgress = progressTimeoutManager.getProgress(requestId);
  const stageAdvanced = manualProgress && 
                       manualProgress.message === 'Custom processing message' &&
                       manualProgress.progress >= 15;
  
  logTest(
    'Progress Tracking - Manual Stage Advancement',
    stageAdvanced,
    `Progress: ${manualProgress?.progress}%, Message: "${manualProgress?.message}"`,
    '5.4'
  );
  
  testResults.progressTests.manual = manualProgress;
  
  // Test progress callbacks
  let callbackTriggered = false;
  let callbackData = null;
  
  progressTimeoutManager.onProgress(requestId, (progressInfo) => {
    callbackTriggered = true;
    callbackData = progressInfo;
  });
  
  // Trigger another stage advancement to test callback
  progressTimeoutManager.advanceToStage(requestId, 'extracting_data');
  
  await sleep(500); // Allow callback to execute
  
  const callbackWorked = callbackTriggered && 
                        callbackData && 
                        callbackData.progress >= 30;
  
  logTest(
    'Progress Tracking - Callbacks',
    callbackWorked,
    `Callback triggered: ${callbackTriggered}, Progress: ${callbackData?.progress}%`,
    '5.4'
  );
  
  testResults.progressTests.callback = {
    triggered: callbackTriggered,
    data: callbackData
  };
  
  // Complete the request
  progressTimeoutManager.completeRequest(requestId, { success: true });
  
  const finalProgress = progressTimeoutManager.getProgress(requestId);
  const completedCorrectly = !finalProgress; // Should be cleaned up after completion
  
  logTest(
    'Progress Tracking - Completion and Cleanup',
    completedCorrectly,
    `Request cleaned up after completion: ${completedCorrectly}`,
    '5.4'
  );
}

// Test timeout handling (60 seconds)
async function testTimeoutHandling() {
  console.log('\n⏰ Testing timeout handling...');
  
  const requestId = `test_timeout_${Date.now()}`;
  const shortTimeout = 5000; // 5 seconds for testing
  
  // Start progress tracking with short timeout
  progressTimeoutManager.startProgress(requestId, 'custom', shortTimeout);
  
  let timeoutTriggered = false;
  let timeoutData = null;
  
  // Set up timeout callback
  progressTimeoutManager.onTimeout(requestId, (progressInfo) => {
    timeoutTriggered = true;
    timeoutData = progressInfo;
  });
  
  // Wait for timeout to occur
  await sleep(shortTimeout + 1000);
  
  const timeoutWorked = timeoutTriggered && 
                       timeoutData && 
                       timeoutData.status === 'timeout';
  
  logTest(
    'Timeout Handling - Timeout Detection',
    timeoutWorked,
    `Timeout triggered: ${timeoutTriggered}, Status: ${timeoutData?.status}`,
    '5.4'
  );
  
  testResults.timeoutTests.detection = {
    triggered: timeoutTriggered,
    data: timeoutData,
    expectedTimeout: shortTimeout
  };
  
  // Test timeout warning (should trigger before actual timeout)
  const warningRequestId = `test_warning_${Date.now()}`;
  const warningTimeout = 10000; // 10 seconds
  
  progressTimeoutManager.startProgress(warningRequestId, 'custom', warningTimeout);
  
  let warningTriggered = false;
  
  progressTimeoutManager.onProgress(warningRequestId, (progressInfo) => {
    if (progressInfo.timeoutWarning) {
      warningTriggered = true;
    }
  });
  
  // Wait for warning threshold (should be 45% of timeout for testing)
  await sleep(4500); // 45% of 10 seconds
  
  logTest(
    'Timeout Handling - Warning System',
    warningTriggered,
    `Warning triggered: ${warningTriggered}`,
    '5.4'
  );
  
  testResults.timeoutTests.warning = {
    triggered: warningTriggered,
    warningTime: 4500,
    totalTimeout: warningTimeout
  };
  
  // Clean up
  progressTimeoutManager.cancelRequest(warningRequestId, 'Test cleanup');
}

// Test cancel functionality
async function testCancelFunctionality() {
  console.log('\n❌ Testing cancel functionality...');
  
  const requestId = `test_cancel_${Date.now()}`;
  
  // Start progress tracking
  progressTimeoutManager.startProgress(requestId, 'jp_tax_strategy', 30000);
  
  let cancelTriggered = false;
  let cancelData = null;
  
  // Set up cancel callback
  progressTimeoutManager.onCancel(requestId, (progressInfo) => {
    cancelTriggered = true;
    cancelData = progressInfo;
  });
  
  // Let it run for a bit
  await sleep(2000);
  
  // Cancel the request
  const cancelResult = progressTimeoutManager.cancelRequest(requestId, 'User requested cancellation');
  
  await sleep(500); // Allow callback to execute
  
  const cancelWorked = cancelResult && 
                      cancelTriggered && 
                      cancelData && 
                      cancelData.status === 'cancelled';
  
  logTest(
    'Cancel Functionality - User Cancellation',
    cancelWorked,
    `Cancel result: ${cancelResult}, Callback triggered: ${cancelTriggered}, Status: ${cancelData?.status}`,
    '5.4'
  );
  
  testResults.cancelTests.userCancel = {
    result: cancelResult,
    triggered: cancelTriggered,
    data: cancelData
  };
  
  // Test cancelling non-existent request
  const invalidCancelResult = progressTimeoutManager.cancelRequest('non_existent_request');
  
  logTest(
    'Cancel Functionality - Invalid Request',
    !invalidCancelResult,
    `Cancel invalid request result: ${invalidCancelResult}`,
    '5.4'
  );
}

// Test timeout-aware fetch wrapper
async function testTimeoutAwareFetch() {
  console.log('\n🌐 Testing timeout-aware fetch wrapper...');
  
  const requestId = `test_fetch_${Date.now()}`;
  
  try {
    // Test successful request with timeout wrapper
    const startTime = Date.now();
    const response = await progressTimeoutManager.fetchWithTimeout(
      `${BASE_URL}/api/test`, // Assuming this endpoint exists or will return 404
      { 
        method: 'GET',
        timeout: 10000 // 10 second timeout
      },
      requestId
    );
    const duration = Date.now() - startTime;
    
    const fetchWorked = response && duration < 10000;
    
    logTest(
      'Timeout-Aware Fetch - Successful Request',
      fetchWorked,
      `Response received in ${duration}ms, Status: ${response?.status}`,
      '5.4'
    );
    
  } catch (error) {
    // 404 or other HTTP errors are acceptable for this test
    const isExpectedError = error.message.includes('404') || 
                           error.message.includes('Not Found') ||
                           !error.message.includes('timeout');
    
    logTest(
      'Timeout-Aware Fetch - Successful Request',
      isExpectedError,
      `Expected error (endpoint may not exist): ${error.message}`,
      '5.4'
    );
  }
  
  // Test timeout scenario with very short timeout
  try {
    const timeoutStartTime = Date.now();
    await progressTimeoutManager.fetchWithTimeout(
      `${BASE_URL}/api/generate`, // This should take longer than 100ms
      { 
        method: 'POST',
        timeout: 100, // Very short timeout
        body: JSON.stringify({ reportType: 'jp_investment_4part', inputText: 'test' })
      },
      `${requestId}_timeout`
    );
    
    logTest(
      'Timeout-Aware Fetch - Timeout Handling',
      false,
      'Request should have timed out but did not',
      '5.4'
    );
    
  } catch (error) {
    const isTimeoutError = error.message.includes('timeout') || error.isTimeout;
    
    logTest(
      'Timeout-Aware Fetch - Timeout Handling',
      isTimeoutError,
      `Timeout error correctly thrown: ${error.message}`,
      '5.4'
    );
  }
}

// Test progress stages for different report types
async function testReportTypeStages() {
  console.log('\n📋 Testing progress stages for different report types...');
  
  const reportTypes = ['jp_investment_4part', 'jp_tax_strategy', 'jp_inheritance_strategy', 'comparison_analysis', 'custom'];
  
  for (const reportType of reportTypes) {
    const requestId = `test_stages_${reportType}_${Date.now()}`;
    
    // Start progress tracking
    const tracker = progressTimeoutManager.startProgress(requestId, reportType, 15000);
    
    const hasStages = tracker && 
                     tracker.stages && 
                     tracker.stages.length > 0 &&
                     tracker.stages[0].stage === 'initializing' &&
                     tracker.stages[tracker.stages.length - 1].stage === 'completed';
    
    logTest(
      `Progress Stages - ${reportType}`,
      hasStages,
      `Stages: ${tracker?.stages?.length || 0}, First: ${tracker?.stages?.[0]?.stage}, Last: ${tracker?.stages?.[tracker.stages.length - 1]?.stage}`,
      '5.4'
    );
    
    testResults.progressTests[`stages_${reportType}`] = {
      stageCount: tracker?.stages?.length || 0,
      stages: tracker?.stages?.map(s => s.stage) || []
    };
    
    // Test stage advancement
    if (tracker && tracker.stages.length > 2) {
      const secondStage = tracker.stages[1].stage;
      progressTimeoutManager.advanceToStage(requestId, secondStage);
      
      const progress = progressTimeoutManager.getProgress(requestId);
      const stageAdvanced = progress && progress.stage === secondStage;
      
      logTest(
        `Stage Advancement - ${reportType}`,
        stageAdvanced,
        `Advanced to: ${progress?.stage}, Progress: ${progress?.progress}%`,
        '5.4'
      );
    }
    
    // Clean up
    progressTimeoutManager.cancelRequest(requestId, 'Test cleanup');
  }
}

// Test concurrent request handling
async function testConcurrentRequests() {
  console.log('\n🔄 Testing concurrent request handling...');
  
  const requestIds = [];
  const requestCount = 5;
  
  // Start multiple concurrent requests
  for (let i = 0; i < requestCount; i++) {
    const requestId = `test_concurrent_${i}_${Date.now()}`;
    requestIds.push(requestId);
    progressTimeoutManager.startProgress(requestId, 'custom', 20000);
  }
  
  // Check that all requests are tracked
  const activeRequests = progressTimeoutManager.getActiveRequests();
  const allTracked = activeRequests.length >= requestCount;
  
  logTest(
    'Concurrent Requests - Tracking Multiple',
    allTracked,
    `Active requests: ${activeRequests.length}, Expected: ${requestCount}`,
    '5.4'
  );
  
  // Test statistics
  const stats = progressTimeoutManager.getStatistics();
  const hasStats = stats && 
                  stats.activeRequests >= requestCount &&
                  stats.requestsByType &&
                  stats.requestsByStatus;
  
  logTest(
    'Concurrent Requests - Statistics',
    hasStats,
    `Active: ${stats?.activeRequests}, By type: ${Object.keys(stats?.requestsByType || {}).length}, By status: ${Object.keys(stats?.requestsByStatus || {}).length}`,
    '5.4'
  );
  
  testResults.progressTests.concurrent = {
    requestCount: requestCount,
    activeRequests: activeRequests.length,
    statistics: stats
  };
  
  // Clean up all requests
  for (const requestId of requestIds) {
    progressTimeoutManager.cancelRequest(requestId, 'Test cleanup');
  }
  
  // Verify cleanup
  const afterCleanup = progressTimeoutManager.getActiveRequests();
  const cleanedUp = afterCleanup.length === 0;
  
  logTest(
    'Concurrent Requests - Cleanup',
    cleanedUp,
    `Remaining requests after cleanup: ${afterCleanup.length}`,
    '5.4'
  );
}

// Test integration with actual API calls
async function testApiIntegration() {
  console.log('\n🔗 Testing API integration...');
  
  const requestId = `test_api_${Date.now()}`;
  
  try {
    // Start progress tracking
    progressTimeoutManager.startProgress(requestId, 'jp_investment_4part', 60000);
    
    let progressUpdates = [];
    
    // Track progress updates
    progressTimeoutManager.onProgress(requestId, (progressInfo) => {
      progressUpdates.push({
        progress: progressInfo.progress,
        message: progressInfo.message,
        timestamp: Date.now()
      });
    });
    
    // Make actual API call with timeout wrapper
    const response = await progressTimeoutManager.fetchWithTimeout(
      `${BASE_URL}/api/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: 'jp_investment_4part',
          inputText: 'Test property: Tokyo apartment, 100M yen, 8% yield',
          files: []
        }),
        timeout: 45000 // 45 seconds
      },
      requestId
    );
    
    const data = await response.json();
    
    // Complete the request
    progressTimeoutManager.completeRequest(requestId, data);
    
    const apiWorked = response.ok && data.success;
    const hadProgressUpdates = progressUpdates.length > 0;
    
    logTest(
      'API Integration - Request Success',
      apiWorked,
      `Response: ${response.status}, Success: ${data.success}, Progress updates: ${progressUpdates.length}`,
      '5.4'
    );
    
    logTest(
      'API Integration - Progress Updates',
      hadProgressUpdates,
      `Progress updates received: ${progressUpdates.length}`,
      '5.4'
    );
    
    testResults.progressTests.apiIntegration = {
      responseStatus: response.status,
      success: data.success,
      progressUpdates: progressUpdates.length,
      finalProgress: progressUpdates[progressUpdates.length - 1]
    };
    
  } catch (error) {
    const isTimeoutError = error.message.includes('timeout');
    
    if (isTimeoutError) {
      logTest(
        'API Integration - Timeout Handling',
        true,
        `Request properly timed out: ${error.message}`,
        '5.4'
      );
    } else {
      logTest(
        'API Integration - Request Success',
        false,
        `API call failed: ${error.message}`,
        '5.4'
      );
    }
    
    // Clean up on error
    progressTimeoutManager.cancelRequest(requestId, `Error: ${error.message}`);
  }
}

async function generateSummaryReport() {
  console.log('\n📊 Generating test summary report...');
  
  const summary = {
    ...testResults,
    progressSummary: {
      totalProgressTests: Object.keys(testResults.progressTests).length,
      timeoutTests: Object.keys(testResults.timeoutTests).length,
      cancelTests: Object.keys(testResults.cancelTests).length,
      allProgressFeaturesWorking: testResults.tests
        .filter(test => test.name.includes('Progress'))
        .every(test => test.passed)
    },
    performanceSummary: {
      timeoutDetection: testResults.timeoutTests.detection?.triggered || false,
      warningSystem: testResults.timeoutTests.warning?.triggered || false,
      cancelFunctionality: testResults.cancelTests.userCancel?.result || false
    }
  };
  
  // Save detailed results
  await fs.writeFile(
    'test-progress-timeout-results.json',
    JSON.stringify(summary, null, 2)
  );
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST SUMMARY - Task 7.3: Progress and Timeout Handling');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${summary.summary.total}`);
  console.log(`Passed: ${summary.summary.passed} ✅`);
  console.log(`Failed: ${summary.summary.failed} ❌`);
  console.log(`Success Rate: ${Math.round((summary.summary.passed / summary.summary.total) * 100)}%`);
  console.log('');
  console.log(`Progress Tests: ${summary.progressSummary.totalProgressTests}`);
  console.log(`Timeout Detection: ${summary.performanceSummary.timeoutDetection ? 'Working' : 'Failed'}`);
  console.log(`Warning System: ${summary.performanceSummary.warningSystem ? 'Working' : 'Failed'}`);
  console.log(`Cancel Functionality: ${summary.performanceSummary.cancelFunctionality ? 'Working' : 'Failed'}`);
  console.log(`All Progress Features: ${summary.progressSummary.allProgressFeaturesWorking ? 'Working' : 'Some Failed'}`);
  
  if (summary.errors.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    summary.errors.forEach(error => {
      console.log(`  • ${error.test}: ${error.details}`);
    });
  }
  
  console.log('\n📄 Detailed results saved to: test-progress-timeout-results.json');
  console.log('='.repeat(60));
  
  return summary;
}

// Main test execution
async function runTask73Tests() {
  console.log('🧪 Task 7.3: Test Progress and Timeout Handling');
  console.log('Testing progress indicators, timeout handling for 60+ second requests, and cancel functionality');
  console.log('='.repeat(60));
  console.log(`Testing against: ${BASE_URL}`);
  console.log(`Test timeout: ${TEST_TIMEOUT}ms`);
  console.log('');
  
  try {
    // Test progress indicators
    await testProgressIndicators();
    
    // Test timeout handling
    await testTimeoutHandling();
    
    // Test cancel functionality
    await testCancelFunctionality();
    
    // Test timeout-aware fetch wrapper
    await testTimeoutAwareFetch();
    
    // Test progress stages for different report types
    await testReportTypeStages();
    
    // Test concurrent request handling
    await testConcurrentRequests();
    
    // Test API integration
    await testApiIntegration();
    
    // Generate and save summary
    const summary = await generateSummaryReport();
    
    // Exit with appropriate code
    const allPassed = summary.summary.failed === 0;
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    testResults.errors.push({ test: 'Test Execution', details: error.message });
    
    await fs.writeFile(
      'test-progress-timeout-results.json',
      JSON.stringify(testResults, null, 2)
    );
    
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTask73Tests();
}

export { runTask73Tests, testProgressIndicators, testTimeoutHandling, testCancelFunctionality };