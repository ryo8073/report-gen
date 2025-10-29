/**
 * Integration Tests for ChatGPT Report Generation
 * Tests complete report generation flow from input to storage, report history, and authentication
 */

import fs from 'fs';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  const lines = envContent.split('\n');
  
  for (const line of lines) {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        process.env[key.trim()] = value;
      }
    }
  }
}

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  tests: [],
  startTime: Date.now(),
  testData: {
    userId: null,
    userEmail: 'test@example.com',
    authToken: null,
    generatedReports: []
  }
};

// Helper function to log test results
function logTest(testName, passed, message = '') {
  const result = { testName, passed, message, timestamp: new Date().toISOString() };
  testResults.tests.push(result);
  
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${testName}: PASSED ${message ? `- ${message}` : ''}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}: FAILED ${message ? `- ${message}` : ''}`);
  }
}

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  timeout: 30000,
  maxRetries: 3,
  testUser: {
    email: 'integration-test@example.com',
    password: 'TestPassword123!',
    name: 'Integration Test User'
  },
  sampleInvestmentData: {
    goals: 'Long-term retirement planning and wealth building',
    riskTolerance: 'Moderate - willing to accept some volatility for growth potential',
    timeHorizon: '25 years until retirement',
    age: '35',
    income: '$85,000 annually',
    portfolio: {
      holdings: [
        {
          name: 'S&P 500 Index Fund',
          symbol: 'SPY',
          type: 'ETF',
          value: '$25,000',
          percentage: '50'
        },
        {
          name: 'Total Bond Market Fund',
          symbol: 'BND',
          type: 'Bond Fund',
          value: '$15,000',
          percentage: '30'
        },
        {
          name: 'International Stock Fund',
          symbol: 'VTIAX',
          type: 'Mutual Fund',
          value: '$10,000',
          percentage: '20'
        }
      ],
      totalValue: '$50,000',
      lastUpdated: '2024-01-15'
    }
  }
};

/**
 * Helper function to make HTTP requests with timeout and retry
 */
async function makeRequest(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TEST_CONFIG.timeout);
  
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
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Helper function to create or get test user authentication
 */
async function setupTestAuthentication() {
  try {
    // Try to login with existing test user
    const loginResponse = await makeRequest(`${TEST_CONFIG.baseUrl}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: TEST_CONFIG.testUser.email,
        password: TEST_CONFIG.testUser.password
      })
    });

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      testResults.testData.authToken = loginData.token;
      testResults.testData.userId = loginData.user?.id;
      return true;
    }

    // If login fails, try to register new user
    const registerResponse = await makeRequest(`${TEST_CONFIG.baseUrl}/api/auth/register`, {
      method: 'POST',
      body: JSON.stringify(TEST_CONFIG.testUser)
    });

    if (registerResponse.ok) {
      const registerData = await registerResponse.json();
      testResults.testData.authToken = registerData.token;
      testResults.testData.userId = registerData.user?.id;
      return true;
    }

    return false;
  } catch (error) {
    console.error('Authentication setup error:', error.message);
    return false;
  }
}

/**
 * Test 1: Server Health Check
 */
async function testServerHealth() {
  try {
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/health`);
    
    if (response.ok) {
      logTest('Server Health Check', true, `Server responding on ${TEST_CONFIG.baseUrl}`);
      return true;
    } else {
      logTest('Server Health Check', false, `Server returned ${response.status}`);
      return false;
    }
  } catch (error) {
    logTest('Server Health Check', false, `Cannot connect to server: ${error.message}`);
    return false;
  }
}

/**
 * Test 2: Authentication Setup
 */
async function testAuthenticationSetup() {
  try {
    const success = await setupTestAuthentication();
    
    if (success && testResults.testData.authToken) {
      logTest('Authentication Setup', true, `Token obtained for user ${testResults.testData.userId}`);
      return true;
    } else {
      logTest('Authentication Setup', false, 'Failed to obtain authentication token');
      return false;
    }
  } catch (error) {
    logTest('Authentication Setup', false, error.message);
    return false;
  }
}

/**
 * Test 3: Report Generation API - Basic Report
 */
async function testBasicReportGeneration() {
  try {
    if (!testResults.testData.authToken) {
      logTest('Basic Report Generation', false, 'No authentication token available');
      return false;
    }

    const requestData = {
      reportType: 'basic',
      investmentData: TEST_CONFIG.sampleInvestmentData,
      preferences: {
        focusAreas: ['risk analysis', 'diversification']
      }
    };

    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/generate-investment-report`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testResults.testData.authToken}`,
        'Cookie': `token=${testResults.testData.authToken}`
      },
      body: JSON.stringify(requestData)
    });

    if (response.ok) {
      const reportData = await response.json();
      
      if (reportData.success && reportData.data && reportData.data.report) {
        testResults.testData.generatedReports.push({
          type: 'basic',
          reportId: reportData.data.reportId,
          data: reportData.data
        });
        
        logTest('Basic Report Generation', true, `Report generated with ${reportData.data.metadata?.tokenUsage?.totalTokens || 0} tokens`);
        return true;
      } else {
        logTest('Basic Report Generation', false, 'Invalid response structure');
        return false;
      }
    } else {
      const errorData = await response.text();
      logTest('Basic Report Generation', false, `HTTP ${response.status}: ${errorData}`);
      return false;
    }
  } catch (error) {
    logTest('Basic Report Generation', false, error.message);
    return false;
  }
}

/**
 * Test 4: Report Generation API - Intermediate Report
 */
async function testIntermediateReportGeneration() {
  try {
    if (!testResults.testData.authToken) {
      logTest('Intermediate Report Generation', false, 'No authentication token available');
      return false;
    }

    const requestData = {
      reportType: 'intermediate',
      investmentData: {
        ...TEST_CONFIG.sampleInvestmentData,
        experience: 'Some experience with mutual funds and ETFs',
        netWorth: '$150,000'
      },
      preferences: {
        focusAreas: ['asset allocation', 'tax efficiency', 'performance analysis'],
        marketOutlook: 'Cautiously optimistic'
      }
    };

    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/generate-investment-report`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testResults.testData.authToken}`,
        'Cookie': `token=${testResults.testData.authToken}`
      },
      body: JSON.stringify(requestData)
    });

    if (response.ok) {
      const reportData = await response.json();
      
      if (reportData.success && reportData.data && reportData.data.report) {
        testResults.testData.generatedReports.push({
          type: 'intermediate',
          reportId: reportData.data.reportId,
          data: reportData.data
        });
        
        logTest('Intermediate Report Generation', true, `Report generated with ${reportData.data.metadata?.tokenUsage?.totalTokens || 0} tokens`);
        return true;
      } else {
        logTest('Intermediate Report Generation', false, 'Invalid response structure');
        return false;
      }
    } else {
      const errorData = await response.text();
      logTest('Intermediate Report Generation', false, `HTTP ${response.status}: ${errorData}`);
      return false;
    }
  } catch (error) {
    logTest('Intermediate Report Generation', false, error.message);
    return false;
  }
}

/**
 * Test 5: Report Generation with Invalid Data
 */
async function testInvalidDataHandling() {
  try {
    if (!testResults.testData.authToken) {
      logTest('Invalid Data Handling', false, 'No authentication token available');
      return false;
    }

    const invalidRequestData = {
      reportType: 'basic',
      investmentData: {
        // Missing required fields
        goals: '',
        riskTolerance: '',
        timeHorizon: ''
      },
      preferences: {}
    };

    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/generate-investment-report`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testResults.testData.authToken}`,
        'Cookie': `token=${testResults.testData.authToken}`
      },
      body: JSON.stringify(invalidRequestData)
    });

    if (response.status === 400) {
      const errorData = await response.json();
      if (errorData.error && errorData.error.code === 'INVALID_INPUT_DATA') {
        logTest('Invalid Data Handling', true, 'Correctly rejected invalid input data');
        return true;
      }
    }
    
    logTest('Invalid Data Handling', false, 'Should have rejected invalid input data');
    return false;
  } catch (error) {
    logTest('Invalid Data Handling', false, error.message);
    return false;
  }
}

/**
 * Test 6: Unauthorized Access Prevention
 */
async function testUnauthorizedAccess() {
  try {
    const requestData = {
      reportType: 'basic',
      investmentData: TEST_CONFIG.sampleInvestmentData,
      preferences: {}
    };

    // Test without authentication token
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/generate-investment-report`, {
      method: 'POST',
      body: JSON.stringify(requestData)
    });

    if (response.status === 401) {
      logTest('Unauthorized Access Prevention', true, 'Correctly rejected unauthenticated request');
      return true;
    } else {
      logTest('Unauthorized Access Prevention', false, `Expected 401, got ${response.status}`);
      return false;
    }
  } catch (error) {
    logTest('Unauthorized Access Prevention', false, error.message);
    return false;
  }
}

/**
 * Test 7: Report History Retrieval
 */
async function testReportHistoryRetrieval() {
  try {
    if (!testResults.testData.authToken) {
      logTest('Report History Retrieval', false, 'No authentication token available');
      return false;
    }

    // Wait a moment for reports to be saved
    await new Promise(resolve => setTimeout(resolve, 2000));

    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/reports/history?limit=10&offset=0`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testResults.testData.authToken}`,
        'Cookie': `token=${testResults.testData.authToken}`
      }
    });

    if (response.ok) {
      const historyData = await response.json();
      
      if (historyData.success && Array.isArray(historyData.data.reports)) {
        const reportCount = historyData.data.reports.length;
        logTest('Report History Retrieval', true, `Retrieved ${reportCount} reports from history`);
        return true;
      } else {
        logTest('Report History Retrieval', false, 'Invalid history response structure');
        return false;
      }
    } else {
      const errorData = await response.text();
      logTest('Report History Retrieval', false, `HTTP ${response.status}: ${errorData}`);
      return false;
    }
  } catch (error) {
    logTest('Report History Retrieval', false, error.message);
    return false;
  }
}

/**
 * Test 8: Individual Report Retrieval
 */
async function testIndividualReportRetrieval() {
  try {
    if (!testResults.testData.authToken || testResults.testData.generatedReports.length === 0) {
      logTest('Individual Report Retrieval', false, 'No authentication token or reports available');
      return false;
    }

    // Get the first generated report ID
    const reportId = testResults.testData.generatedReports[0].reportId;
    if (!reportId) {
      logTest('Individual Report Retrieval', false, 'No report ID available for testing');
      return false;
    }

    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/reports/${reportId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testResults.testData.authToken}`,
        'Cookie': `token=${testResults.testData.authToken}`
      }
    });

    if (response.ok) {
      const reportData = await response.json();
      
      if (reportData.success && reportData.data && reportData.data.report) {
        logTest('Individual Report Retrieval', true, `Retrieved report ${reportId}`);
        return true;
      } else {
        logTest('Individual Report Retrieval', false, 'Invalid report response structure');
        return false;
      }
    } else {
      const errorData = await response.text();
      logTest('Individual Report Retrieval', false, `HTTP ${response.status}: ${errorData}`);
      return false;
    }
  } catch (error) {
    logTest('Individual Report Retrieval', false, error.message);
    return false;
  }
}

/**
 * Test 9: Report Access Control
 */
async function testReportAccessControl() {
  try {
    if (testResults.testData.generatedReports.length === 0) {
      logTest('Report Access Control', false, 'No reports available for testing');
      return false;
    }

    const reportId = testResults.testData.generatedReports[0].reportId;
    if (!reportId) {
      logTest('Report Access Control', false, 'No report ID available for testing');
      return false;
    }

    // Test access without authentication
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/reports/${reportId}`, {
      method: 'GET'
    });

    if (response.status === 401) {
      logTest('Report Access Control', true, 'Correctly prevented unauthorized report access');
      return true;
    } else {
      logTest('Report Access Control', false, `Expected 401, got ${response.status}`);
      return false;
    }
  } catch (error) {
    logTest('Report Access Control', false, error.message);
    return false;
  }
}

/**
 * Test 10: Error Handling and Recovery
 */
async function testErrorHandlingAndRecovery() {
  try {
    if (!testResults.testData.authToken) {
      logTest('Error Handling and Recovery', false, 'No authentication token available');
      return false;
    }

    // Test with invalid report type
    const invalidTypeRequest = {
      reportType: 'invalid_type',
      investmentData: TEST_CONFIG.sampleInvestmentData,
      preferences: {}
    };

    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/generate-investment-report`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testResults.testData.authToken}`,
        'Cookie': `token=${testResults.testData.authToken}`
      },
      body: JSON.stringify(invalidTypeRequest)
    });

    if (response.status === 400) {
      const errorData = await response.json();
      if (errorData.error && errorData.error.message) {
        logTest('Error Handling and Recovery', true, 'Correctly handled invalid report type');
        return true;
      }
    }
    
    logTest('Error Handling and Recovery', false, 'Should have handled invalid report type error');
    return false;
  } catch (error) {
    logTest('Error Handling and Recovery', false, error.message);
    return false;
  }
}

/**
 * Test 11: Performance and Response Times
 */
async function testPerformanceAndResponseTimes() {
  try {
    if (!testResults.testData.authToken) {
      logTest('Performance and Response Times', false, 'No authentication token available');
      return false;
    }

    const startTime = Date.now();
    
    const requestData = {
      reportType: 'basic',
      investmentData: {
        goals: 'Quick performance test',
        riskTolerance: 'Moderate',
        timeHorizon: '10 years'
      },
      preferences: {}
    };

    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/generate-investment-report`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testResults.testData.authToken}`,
        'Cookie': `token=${testResults.testData.authToken}`
      },
      body: JSON.stringify(requestData)
    });

    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      const reportData = await response.json();
      if (reportData.success) {
        logTest('Performance and Response Times', true, `Response time: ${responseTime}ms`);
        return true;
      }
    }
    
    logTest('Performance and Response Times', false, `Failed after ${responseTime}ms`);
    return false;
  } catch (error) {
    logTest('Performance and Response Times', false, error.message);
    return false;
  }
}

/**
 * Test 12: Data Persistence and Storage
 */
async function testDataPersistenceAndStorage() {
  try {
    if (!testResults.testData.authToken) {
      logTest('Data Persistence and Storage', false, 'No authentication token available');
      return false;
    }

    // Generate a report with specific identifiable content
    const uniqueGoal = `Test persistence ${Date.now()}`;
    const requestData = {
      reportType: 'basic',
      investmentData: {
        ...TEST_CONFIG.sampleInvestmentData,
        goals: uniqueGoal
      },
      preferences: {}
    };

    const generateResponse = await makeRequest(`${TEST_CONFIG.baseUrl}/api/generate-investment-report`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testResults.testData.authToken}`,
        'Cookie': `token=${testResults.testData.authToken}`
      },
      body: JSON.stringify(requestData)
    });

    if (!generateResponse.ok) {
      logTest('Data Persistence and Storage', false, 'Failed to generate test report');
      return false;
    }

    const generateData = await generateResponse.json();
    const reportId = generateData.data?.reportId;

    if (!reportId) {
      logTest('Data Persistence and Storage', false, 'No report ID returned');
      return false;
    }

    // Wait for storage to complete
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Retrieve the report and verify it contains our unique content
    const retrieveResponse = await makeRequest(`${TEST_CONFIG.baseUrl}/api/reports/${reportId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testResults.testData.authToken}`,
        'Cookie': `token=${testResults.testData.authToken}`
      }
    });

    if (retrieveResponse.ok) {
      const retrieveData = await retrieveResponse.json();
      if (retrieveData.success && retrieveData.data?.report) {
        // Check if our unique goal is preserved in the stored data
        const storedData = JSON.stringify(retrieveData.data);
        if (storedData.includes(uniqueGoal)) {
          logTest('Data Persistence and Storage', true, 'Report data correctly persisted and retrieved');
          return true;
        } else {
          logTest('Data Persistence and Storage', false, 'Stored data does not match generated content');
          return false;
        }
      }
    }
    
    logTest('Data Persistence and Storage', false, 'Failed to retrieve stored report');
    return false;
  } catch (error) {
    logTest('Data Persistence and Storage', false, error.message);
    return false;
  }
}

/**
 * Main test runner
 */
async function runChatGPTIntegrationTests() {
  console.log('🧪 Starting ChatGPT Integration Tests');
  console.log('=' .repeat(80));
  console.log('Testing complete report generation flow from input to storage');
  console.log('=' .repeat(80));

  // Run all tests in sequence
  const tests = [
    { name: 'Server Health Check', fn: testServerHealth },
    { name: 'Authentication Setup', fn: testAuthenticationSetup },
    { name: 'Basic Report Generation', fn: testBasicReportGeneration },
    { name: 'Intermediate Report Generation', fn: testIntermediateReportGeneration },
    { name: 'Invalid Data Handling', fn: testInvalidDataHandling },
    { name: 'Unauthorized Access Prevention', fn: testUnauthorizedAccess },
    { name: 'Report History Retrieval', fn: testReportHistoryRetrieval },
    { name: 'Individual Report Retrieval', fn: testIndividualReportRetrieval },
    { name: 'Report Access Control', fn: testReportAccessControl },
    { name: 'Error Handling and Recovery', fn: testErrorHandlingAndRecovery },
    { name: 'Performance and Response Times', fn: testPerformanceAndResponseTimes },
    { name: 'Data Persistence and Storage', fn: testDataPersistenceAndStorage }
  ];

  for (const test of tests) {
    console.log(`\n🔄 Running: ${test.name}`);
    try {
      await test.fn();
    } catch (error) {
      console.error(`Test execution error: ${error.message}`);
      logTest(test.name, false, `Execution error: ${error.message}`);
    }
  }

  // Print summary
  const totalTime = Date.now() - testResults.startTime;
  console.log('\n' + '=' .repeat(80));
  console.log('📊 ChatGPT Integration Test Summary');
  console.log('=' .repeat(80));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⏱️  Total Time: ${Math.round(totalTime / 1000)}s`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  console.log(`📊 Reports Generated: ${testResults.testData.generatedReports.length}`);

  // Print failed tests
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    console.log('=' .repeat(80));
    testResults.tests
      .filter(test => !test.passed)
      .forEach(test => {
        console.log(`  - ${test.testName}: ${test.message}`);
      });
  }

  // Print test configuration info
  console.log('\n📋 Test Configuration:');
  console.log('=' .repeat(80));
  console.log(`Base URL: ${TEST_CONFIG.baseUrl}`);
  console.log(`Timeout: ${TEST_CONFIG.timeout}ms`);
  console.log(`Test User: ${TEST_CONFIG.testUser.email}`);
  console.log(`User ID: ${testResults.testData.userId || 'Not authenticated'}`);

  // Save detailed results
  const reportPath = './test-chatgpt-integration-results.json';
  fs.writeFileSync(reportPath, JSON.stringify({
    summary: {
      passed: testResults.passed,
      failed: testResults.failed,
      total: testResults.passed + testResults.failed,
      successRate: ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1) + '%',
      totalTime: totalTime,
      reportsGenerated: testResults.testData.generatedReports.length
    },
    tests: testResults.tests,
    testData: {
      userId: testResults.testData.userId,
      reportsGenerated: testResults.testData.generatedReports.map(r => ({
        type: r.type,
        reportId: r.reportId,
        tokenUsage: r.data?.metadata?.tokenUsage
      }))
    },
    configuration: {
      baseUrl: TEST_CONFIG.baseUrl,
      timeout: TEST_CONFIG.timeout,
      testUser: TEST_CONFIG.testUser.email
    },
    timestamp: new Date().toISOString()
  }, null, 2));

  console.log(`\n📄 Detailed results saved to: ${reportPath}`);
  
  return testResults.failed === 0;
}

// Run tests if script is executed directly
if (process.argv[1] && process.argv[1].endsWith('test-chatgpt-integration.js')) {
  runChatGPTIntegrationTests()
    .then(success => {
      console.log('\n' + '=' .repeat(80));
      if (success) {
        console.log('🎉 All ChatGPT integration tests passed!');
      } else {
        console.log('⚠️  Some ChatGPT integration tests failed. Please review the issues above.');
      }
      console.log('=' .repeat(80));
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner error:', error);
      process.exit(1);
    });
}

export { runChatGPTIntegrationTests };