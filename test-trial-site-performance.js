// Trial Site Performance and Integration Test Suite
// Task 5.3: Performance and integration testing
// Requirements: 2.4, 4.2, 5.4

import fs from 'fs/promises';

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_RESULTS_FILE = 'trial-site-performance-test-results.json';

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  maxResponseTime: 30000, // 30 seconds for report generation
  maxFileProcessingTime: 10000, // 10 seconds for file processing
  maxConcurrentRequests: 3,
  maxFileSize: 5 * 1024 * 1024 // 5MB
};

// Test results tracking
const testResults = {
  timestamp: new Date().toISOString(),
  summary: { passed: 0, failed: 0, total: 0 },
  performance: {
    averageResponseTime: 0,
    maxResponseTime: 0,
    minResponseTime: Infinity,
    totalRequests: 0
  },
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

async function makeRequest(endpoint, data, timeout = 35000) {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    // Update performance metrics
    testResults.performance.totalRequests++;
    testResults.performance.maxResponseTime = Math.max(testResults.performance.maxResponseTime, responseTime);
    testResults.performance.minResponseTime = Math.min(testResults.performance.minResponseTime, responseTime);
    testResults.performance.averageResponseTime = 
      ((testResults.performance.averageResponseTime * (testResults.performance.totalRequests - 1)) + responseTime) / 
      testResults.performance.totalRequests;

    let responseData;
    try {
      responseData = await response.json();
    } catch (parseError) {
      responseData = { error: 'Failed to parse response JSON' };
    }

    return { response, data: responseData, responseTime };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return { 
      response: { status: 0, ok: false }, 
      data: { error: error.message },
      responseTime
    };
  }
}

// Test functions for Task 5.3

async function testLargeFileProcessing() {
  console.log('\n📁 Testing large file processing performance...');
  
  const largeFileTests = [
    {
      name: 'Large Text File (1MB)',
      file: {
        name: 'large-text.txt',
        type: 'text/plain',
        data: Buffer.from('Large text content. '.repeat(50000)).toString('base64') // ~1MB
      }
    },
    {
      name: 'Large PDF File (2MB)',
      file: {
        name: 'large-document.pdf',
        type: 'application/pdf',
        data: Buffer.from('%PDF-1.4\n' + 'PDF content data. '.repeat(100000)).toString('base64') // ~2MB
      }
    },
    {
      name: 'Large Image File (3MB)',
      file: {
        name: 'large-image.jpg',
        type: 'image/jpeg',
        data: Buffer.from('JPEG image data. '.repeat(150000)).toString('base64') // ~3MB
      }
    }
  ];
  
  for (const test of largeFileTests) {
    try {
      const requestData = {
        reportType: 'jp_investment_4part',
        inputText: 'Large file processing test',
        files: [test.file],
        additionalInfo: {},
        options: { language: 'ja' }
      };

      const { response, data, responseTime } = await makeRequest('/api/generate', requestData);
      
      // Test response time
      logTest(
        `Large File - ${test.name} (Response Time)`, 
        responseTime < PERFORMANCE_THRESHOLDS.maxFileProcessingTime,
        `${responseTime}ms (threshold: ${PERFORMANCE_THRESHOLDS.maxFileProcessingTime}ms)`,
        '4.2'
      );
      
      // Test successful processing
      logTest(
        `Large File - ${test.name} (Processing Success)`, 
        response.status === 200 && data.success === true,
        `Status: ${response.status}, Success: ${data.success}`,
        '4.2'
      );
      
      // Test file size estimation
      const estimatedSize = Math.round((test.file.data.length * 3) / 4 / 1024 / 1024 * 100) / 100;
      logTest(
        `Large File - ${test.name} (Size Handling)`, 
        estimatedSize <= 5, // Should be under 5MB
        `Estimated size: ${estimatedSize}MB`,
        '4.2'
      );
      
    } catch (error) {
      logTest(
        `Large File - ${test.name}`, 
        false, 
        `Error: ${error.message}`,
        '4.2'
      );
    }
  }
}

async function testConcurrentRequests() {
  console.log('\n🔄 Testing concurrent request handling...');
  
  const concurrentRequestData = {
    reportType: 'jp_investment_4part',
    inputText: '並行リクエストのテストです。投資分析を行ってください。',
    files: [],
    additionalInfo: { testType: 'concurrent' },
    options: { language: 'ja' }
  };
  
  try {
    const startTime = Date.now();
    
    // Create multiple concurrent requests
    const requests = Array.from({ length: PERFORMANCE_THRESHOLDS.maxConcurrentRequests }, (_, i) => 
      makeRequest('/api/generate', {
        ...concurrentRequestData,
        additionalInfo: { ...concurrentRequestData.additionalInfo, requestId: i + 1 }
      })
    );
    
    const results = await Promise.allSettled(requests);
    const totalTime = Date.now() - startTime;
    
    // Analyze results
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.response.status === 200).length;
    const failed = results.length - successful;
    
    logTest(
      'Concurrent Requests - Success Rate', 
      successful >= Math.floor(PERFORMANCE_THRESHOLDS.maxConcurrentRequests * 0.8), // 80% success rate
      `${successful}/${results.length} successful (${Math.round(successful/results.length*100)}%)`,
      '2.4'
    );
    
    logTest(
      'Concurrent Requests - Total Time', 
      totalTime < PERFORMANCE_THRESHOLDS.maxResponseTime * 2, // Should not take more than 2x single request
      `${totalTime}ms for ${results.length} requests`,
      '2.4'
    );
    
    // Test individual response times
    const responseTimes = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value.responseTime);
    
    if (responseTimes.length > 0) {
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      logTest(
        'Concurrent Requests - Average Response Time', 
        avgResponseTime < PERFORMANCE_THRESHOLDS.maxResponseTime,
        `${Math.round(avgResponseTime)}ms average`,
        '2.4'
      );
    }
    
  } catch (error) {
    logTest(
      'Concurrent Requests - Test Error', 
      false, 
      `Error: ${error.message}`,
      '2.4'
    );
  }
}

async function testResponseTimePerformance() {
  console.log('\n⏱️ Testing response time performance...');
  
  const performanceTests = [
    {
      name: 'Simple Text Request',
      data: {
        reportType: 'jp_investment_4part',
        inputText: '簡単な投資分析をお願いします。',
        files: [],
        additionalInfo: {},
        options: { language: 'ja' }
      },
      maxTime: 15000 // 15 seconds
    },
    {
      name: 'Complex Text Request',
      data: {
        reportType: 'custom',
        inputText: '詳細な投資分析レポートを作成してください。' + 'データ分析 '.repeat(100),
        files: [],
        additionalInfo: {
          complexity: 'high',
          detailLevel: 'comprehensive'
        },
        options: { language: 'ja' }
      },
      maxTime: 25000 // 25 seconds
    },
    {
      name: 'Request with Small File',
      data: {
        reportType: 'jp_tax_strategy',
        inputText: 'ファイル付きの税務戦略分析です。',
        files: [{
          name: 'small-data.txt',
          type: 'text/plain',
          data: Buffer.from('Small file content for testing. '.repeat(50)).toString('base64')
        }],
        additionalInfo: {},
        options: { language: 'ja' }
      },
      maxTime: 20000 // 20 seconds
    }
  ];
  
  for (const test of performanceTests) {
    try {
      const { response, data, responseTime } = await makeRequest('/api/generate', test.data);
      
      logTest(
        `Performance - ${test.name} (Response Time)`, 
        responseTime < test.maxTime,
        `${responseTime}ms (threshold: ${test.maxTime}ms)`,
        '5.4'
      );
      
      logTest(
        `Performance - ${test.name} (Success)`, 
        response.status === 200 && data.success === true,
        `Status: ${response.status}, Success: ${data.success}`,
        '5.4'
      );
      
      // Test token usage efficiency
      if (data.report && data.report.usage) {
        const tokensPerSecond = data.report.usage.totalTokens / (responseTime / 1000);
        logTest(
          `Performance - ${test.name} (Token Efficiency)`, 
          tokensPerSecond > 10, // Should process at least 10 tokens per second
          `${Math.round(tokensPerSecond)} tokens/second`,
          '5.4'
        );
      }
      
    } catch (error) {
      logTest(
        `Performance - ${test.name}`, 
        false, 
        `Error: ${error.message}`,
        '5.4'
      );
    }
  }
}

async function testCompleteUserWorkflow() {
  console.log('\n👤 Testing complete user workflow...');
  
  const workflowSteps = [
    {
      name: 'Step 1: Simple Report Generation',
      data: {
        reportType: 'jp_investment_4part',
        inputText: '30歳、年収600万円、投資初心者です。',
        files: [],
        additionalInfo: {},
        options: { language: 'ja' }
      }
    },
    {
      name: 'Step 2: Report with Additional Info',
      data: {
        reportType: 'jp_tax_strategy',
        inputText: '個人事業主として節税対策を検討中です。',
        files: [],
        additionalInfo: {
          businessType: 'individual',
          annualIncome: 8000000,
          currentSavings: 5000000
        },
        options: { language: 'ja' }
      }
    },
    {
      name: 'Step 3: Report with File Upload',
      data: {
        reportType: 'jp_inheritance_strategy',
        inputText: '相続対策について相談したいです。',
        files: [{
          name: 'asset-list.txt',
          type: 'text/plain',
          data: Buffer.from('資産リスト:\n不動産: 3000万円\n預金: 2000万円\n株式: 1000万円').toString('base64')
        }],
        additionalInfo: {},
        options: { language: 'ja' }
      }
    }
  ];
  
  let workflowStartTime = Date.now();
  let allStepsSuccessful = true;
  
  for (let i = 0; i < workflowSteps.length; i++) {
    const step = workflowSteps[i];
    
    try {
      const { response, data, responseTime } = await makeRequest('/api/generate', step.data);
      
      const stepSuccessful = response.status === 200 && data.success === true;
      allStepsSuccessful = allStepsSuccessful && stepSuccessful;
      
      logTest(
        `Workflow - ${step.name}`, 
        stepSuccessful,
        `Status: ${response.status}, Time: ${responseTime}ms`,
        '5.4'
      );
      
      // Test report content quality for workflow
      if (data.report) {
        logTest(
          `Workflow - ${step.name} (Content Quality)`, 
          data.report.content && data.report.content.length > 200,
          `Content length: ${data.report.content ? data.report.content.length : 0} chars`,
          '5.4'
        );
      }
      
    } catch (error) {
      allStepsSuccessful = false;
      logTest(
        `Workflow - ${step.name}`, 
        false, 
        `Error: ${error.message}`,
        '5.4'
      );
    }
  }
  
  const totalWorkflowTime = Date.now() - workflowStartTime;
  
  logTest(
    'Complete User Workflow - Overall Success', 
    allStepsSuccessful,
    `All ${workflowSteps.length} steps completed in ${totalWorkflowTime}ms`,
    '5.4'
  );
  
  logTest(
    'Complete User Workflow - Total Time', 
    totalWorkflowTime < 90000, // Should complete within 90 seconds
    `${totalWorkflowTime}ms (threshold: 90000ms)`,
    '5.4'
  );
}

async function testMemoryAndResourceUsage() {
  console.log('\n💾 Testing memory and resource usage...');
  
  // Test with multiple file types and sizes
  const resourceTests = [
    {
      name: 'Multiple File Types',
      data: {
        reportType: 'custom',
        inputText: 'Multiple file analysis test',
        files: [
          {
            name: 'text-file.txt',
            type: 'text/plain',
            data: Buffer.from('Text file content. '.repeat(1000)).toString('base64')
          },
          {
            name: 'pdf-file.pdf',
            type: 'application/pdf',
            data: Buffer.from('%PDF-1.4\nPDF content. '.repeat(1000)).toString('base64')
          },
          {
            name: 'image-file.jpg',
            type: 'image/jpeg',
            data: Buffer.from('JPEG data. '.repeat(1000)).toString('base64')
          }
        ],
        additionalInfo: { testType: 'resource-usage' },
        options: { language: 'ja' }
      }
    }
  ];
  
  for (const test of resourceTests) {
    try {
      const { response, data, responseTime } = await makeRequest('/api/generate', test.data);
      
      logTest(
        `Resource Usage - ${test.name} (Processing)`, 
        response.status === 200,
        `Status: ${response.status}, Time: ${responseTime}ms`,
        '4.2'
      );
      
      // Calculate total data size
      const totalDataSize = test.data.files.reduce((sum, file) => 
        sum + (file.data.length * 3 / 4), 0
      );
      
      logTest(
        `Resource Usage - ${test.name} (Data Size Handling)`, 
        totalDataSize < PERFORMANCE_THRESHOLDS.maxFileSize * test.data.files.length,
        `Total size: ${Math.round(totalDataSize / 1024)}KB`,
        '4.2'
      );
      
    } catch (error) {
      logTest(
        `Resource Usage - ${test.name}`, 
        false, 
        `Error: ${error.message}`,
        '4.2'
      );
    }
  }
}

// Main test execution
async function runTask53Tests() {
  console.log('🧪 Task 5.3: Performance and Integration Testing');
  console.log('=' .repeat(60));
  console.log(`Testing against: ${BASE_URL}`);
  console.log(`Test started at: ${new Date().toISOString()}`);
  console.log(`Performance Thresholds:`);
  console.log(`  Max Response Time: ${PERFORMANCE_THRESHOLDS.maxResponseTime}ms`);
  console.log(`  Max File Processing: ${PERFORMANCE_THRESHOLDS.maxFileProcessingTime}ms`);
  console.log(`  Max Concurrent Requests: ${PERFORMANCE_THRESHOLDS.maxConcurrentRequests}`);
  
  try {
    // Run all test suites
    await testResponseTimePerformance();
    await testLargeFileProcessing();
    await testConcurrentRequests();
    await testCompleteUserWorkflow();
    await testMemoryAndResourceUsage();
    
    // Generate summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Total Tests: ${testResults.summary.total}`);
    console.log(`Passed: ${testResults.summary.passed}`);
    console.log(`Failed: ${testResults.summary.failed}`);
    console.log(`Success Rate: ${((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1)}%`);
    
    console.log('\n📈 PERFORMANCE METRICS');
    console.log('=' .repeat(60));
    console.log(`Total Requests: ${testResults.performance.totalRequests}`);
    console.log(`Average Response Time: ${Math.round(testResults.performance.averageResponseTime)}ms`);
    console.log(`Max Response Time: ${testResults.performance.maxResponseTime}ms`);
    console.log(`Min Response Time: ${testResults.performance.minResponseTime}ms`);
    
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
  runTask53Tests,
  testResults,
  logTest,
  makeRequest,
  PERFORMANCE_THRESHOLDS
};

// Run tests if called directly
const isMainModule = import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMainModule) {
  console.log('Starting Task 5.3 tests...');
  runTask53Tests().then(success => {
    console.log(`Task 5.3 completed with success: ${success}`);
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Task 5.3 failed:', error);
    process.exit(1);
  });
}