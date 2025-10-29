/**
 * Unit Tests for ChatGPT Service
 * Tests prompt formatting, API communication, error handling, and retry logic
 */

import { ChatGPTService } from './lib/chatgpt-service.js';
import openaiConfig from './lib/openai-config.js';

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  tests: [],
  startTime: Date.now()
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

// Mock OpenAI client for testing
class MockOpenAIClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey;
    this.shouldFail = options.shouldFail || false;
    this.failureType = options.failureType || 'generic';
    this.responseDelay = options.responseDelay || 0;
    this.callCount = 0;
  }

  chat = {
    completions: {
      create: async (params) => {
        this.callCount++;
        
        if (this.responseDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, this.responseDelay));
        }

        if (this.shouldFail) {
          const error = new Error('Mock API Error');
          switch (this.failureType) {
            case 'auth':
              error.status = 401;
              break;
            case 'rate_limit':
              error.status = 429;
              error.response = { headers: { 'retry-after': '60' } };
              break;
            case 'server_error':
              error.status = 500;
              break;
            case 'timeout':
              error.code = 'ETIMEDOUT';
              break;
            default:
              error.status = 500;
          }
          throw error;
        }

        return {
          choices: [{
            message: {
              content: `Mock investment analysis response for model: ${params.model}`
            },
            finish_reason: 'stop'
          }],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 200,
            total_tokens: 300
          }
        };
      }
    }
  }
}

/**
 * Test 1: ChatGPT Service Initialization
 */
async function testServiceInitialization() {
  try {
    const service = new ChatGPTService();
    
    // Test initial state
    if (!service.isReady()) {
      logTest('Service Initial State', true, 'Service correctly starts uninitialized');
    } else {
      logTest('Service Initial State', false, 'Service should not be ready before initialization');
      return false;
    }

    // Test status method
    const status = service.getStatus();
    if (status && typeof status === 'object' && 
        status.hasOwnProperty('isInitialized') && 
        status.hasOwnProperty('isReady')) {
      logTest('Service Status Method', true, 'Status method returns correct structure');
    } else {
      logTest('Service Status Method', false, 'Status method missing required properties');
      return false;
    }

    return true;
  } catch (error) {
    logTest('Service Initialization', false, error.message);
    return false;
  }
}

/**
 * Test 2: Prompt Formatting
 */
function testPromptFormatting() {
  try {
    const service = new ChatGPTService();
    
    // Test data
    const investmentData = {
      portfolio: {
        holdings: [
          { name: 'Apple Inc', symbol: 'AAPL', type: 'Stock', value: '$10000', percentage: '50' },
          { name: 'US Treasury Bond', symbol: 'UST', type: 'Bond', value: '$5000', percentage: '25' }
        ],
        totalValue: '$20000'
      },
      goals: 'Long-term growth and retirement planning',
      riskTolerance: 'Moderate',
      timeHorizon: '20 years',
      age: '35',
      income: '$75000'
    };

    const userPreferences = {
      focusAreas: ['risk analysis', 'diversification'],
      marketOutlook: 'Optimistic'
    };

    // Test basic report formatting
    const basicPrompt = service.formatPrompt(investmentData, 'basic', userPreferences);
    
    if (basicPrompt && basicPrompt.systemPrompt && basicPrompt.userPrompt) {
      logTest('Basic Prompt Structure', true, 'Contains system and user prompts');
    } else {
      logTest('Basic Prompt Structure', false, 'Missing required prompt components');
      return false;
    }

    // Test data substitution
    if (basicPrompt.userPrompt.includes('Long-term growth') && 
        basicPrompt.userPrompt.includes('Moderate') &&
        basicPrompt.userPrompt.includes('Apple Inc')) {
      logTest('Prompt Data Substitution', true, 'Investment data properly substituted');
    } else {
      logTest('Prompt Data Substitution', false, 'Investment data not properly substituted');
      return false;
    }

    // Test different report types
    const reportTypes = ['basic', 'intermediate', 'advanced'];
    let allTypesValid = true;
    
    reportTypes.forEach(type => {
      try {
        const prompt = service.formatPrompt(investmentData, type, userPreferences);
        if (!prompt || !prompt.systemPrompt || !prompt.userPrompt) {
          allTypesValid = false;
        }
      } catch (error) {
        allTypesValid = false;
      }
    });

    if (allTypesValid) {
      logTest('Multiple Report Types', true, 'All report types generate valid prompts');
    } else {
      logTest('Multiple Report Types', false, 'Some report types failed to generate prompts');
      return false;
    }

    // Test invalid report type
    try {
      service.formatPrompt(investmentData, 'invalid_type');
      logTest('Invalid Report Type Handling', false, 'Should throw error for invalid type');
      return false;
    } catch (error) {
      logTest('Invalid Report Type Handling', true, 'Correctly throws error for invalid type');
    }

    return true;
  } catch (error) {
    logTest('Prompt Formatting', false, error.message);
    return false;
  }
}

/**
 * Test 3: Investment Data Validation
 */
function testInvestmentDataValidation() {
  try {
    const service = new ChatGPTService();

    // Test complete data
    const completeData = {
      goals: 'Retirement planning',
      riskTolerance: 'Moderate',
      timeHorizon: '20 years',
      age: '35',
      income: '$75000',
      portfolio: { holdings: [] }
    };

    const completeValidation = service.validateInvestmentData(completeData);
    if (completeValidation.isValid && completeValidation.completeness > 80) {
      logTest('Complete Data Validation', true, `Completeness: ${completeValidation.completeness}%`);
    } else {
      logTest('Complete Data Validation', false, 'Complete data should be valid');
      return false;
    }

    // Test incomplete data
    const incompleteData = {
      goals: 'Retirement planning'
      // Missing required fields
    };

    const incompleteValidation = service.validateInvestmentData(incompleteData);
    if (!incompleteValidation.isValid && incompleteValidation.warnings.length > 0) {
      logTest('Incomplete Data Validation', true, `Found ${incompleteValidation.warnings.length} warnings`);
    } else {
      logTest('Incomplete Data Validation', false, 'Should detect missing required fields');
      return false;
    }

    // Test empty data
    const emptyValidation = service.validateInvestmentData({});
    if (!emptyValidation.isValid && emptyValidation.completeness === 0) {
      logTest('Empty Data Validation', true, 'Correctly identifies empty data');
    } else {
      logTest('Empty Data Validation', false, 'Should reject empty data');
      return false;
    }

    return true;
  } catch (error) {
    logTest('Investment Data Validation', false, error.message);
    return false;
  }
}

/**
 * Test 4: Portfolio Data Formatting
 */
function testPortfolioDataFormatting() {
  try {
    const service = new ChatGPTService();

    // Test with holdings
    const portfolioWithHoldings = {
      holdings: [
        { name: 'Apple Inc', symbol: 'AAPL', type: 'Stock', value: '$10000', percentage: '50' },
        { name: 'Bond Fund', symbol: 'BND', type: 'Bond', value: '$5000', percentage: '25' }
      ],
      totalValue: '$20000',
      lastUpdated: '2024-01-01'
    };

    const formatted = service.formatPortfolioData(portfolioWithHoldings);
    if (formatted.includes('Apple Inc') && formatted.includes('Bond Fund') && 
        formatted.includes('Total Portfolio Value')) {
      logTest('Portfolio Formatting with Holdings', true, 'Correctly formats portfolio data');
    } else {
      logTest('Portfolio Formatting with Holdings', false, 'Portfolio formatting incomplete');
      return false;
    }

    // Test empty portfolio
    const emptyFormatted = service.formatPortfolioData({});
    if (emptyFormatted.includes('No portfolio data') || emptyFormatted.includes('No specific holdings')) {
      logTest('Empty Portfolio Formatting', true, 'Handles empty portfolio gracefully');
    } else {
      logTest('Empty Portfolio Formatting', false, 'Should handle empty portfolio');
      return false;
    }

    // Test null portfolio
    const nullFormatted = service.formatPortfolioData(null);
    if (nullFormatted.includes('No portfolio data')) {
      logTest('Null Portfolio Formatting', true, 'Handles null portfolio gracefully');
    } else {
      logTest('Null Portfolio Formatting', false, 'Should handle null portfolio');
      return false;
    }

    return true;
  } catch (error) {
    logTest('Portfolio Data Formatting', false, error.message);
    return false;
  }
}

/**
 * Test 5: Error Handling
 */
function testErrorHandling() {
  try {
    const service = new ChatGPTService();

    // Test different error types
    const errorTypes = [
      { status: 401, expectedCode: 'AUTHENTICATION_ERROR' },
      { status: 429, expectedCode: 'RATE_LIMIT_ERROR' },
      { status: 500, expectedCode: 'SERVICE_UNAVAILABLE' },
      { status: 400, expectedCode: 'INVALID_REQUEST' },
      { code: 'ETIMEDOUT', expectedCode: 'TIMEOUT_ERROR' }
    ];

    let allErrorsHandled = true;
    errorTypes.forEach(errorType => {
      const mockError = new Error('Test error');
      if (errorType.status) mockError.status = errorType.status;
      if (errorType.code) mockError.code = errorType.code;

      const errorResponse = service.handleApiError(mockError);
      if (!errorResponse.error || errorResponse.error.code !== errorType.expectedCode) {
        allErrorsHandled = false;
      }
    });

    if (allErrorsHandled) {
      logTest('Error Type Handling', true, 'All error types properly categorized');
    } else {
      logTest('Error Type Handling', false, 'Some error types not properly handled');
      return false;
    }

    // Test error response structure
    const testError = new Error('Test error');
    testError.status = 500;
    const errorResponse = service.handleApiError(testError);
    
    const requiredFields = ['success', 'error'];
    const errorFields = ['code', 'message', 'shouldRetry', 'severity', 'userActions'];
    
    const hasRequiredFields = requiredFields.every(field => errorResponse.hasOwnProperty(field));
    const hasErrorFields = errorFields.every(field => errorResponse.error.hasOwnProperty(field));
    
    if (hasRequiredFields && hasErrorFields) {
      logTest('Error Response Structure', true, 'Error response has all required fields');
    } else {
      logTest('Error Response Structure', false, 'Error response missing required fields');
      return false;
    }

    return true;
  } catch (error) {
    logTest('Error Handling', false, error.message);
    return false;
  }
}

/**
 * Test 6: Retry Logic
 */
function testRetryLogic() {
  try {
    const service = new ChatGPTService();

    // Test retryable error detection
    const retryableErrors = [
      { status: 429, shouldRetry: true },
      { status: 500, shouldRetry: true },
      { status: 502, shouldRetry: true },
      { code: 'ETIMEDOUT', shouldRetry: true },
      { status: 401, shouldRetry: false },
      { status: 400, shouldRetry: false }
    ];

    let retryLogicCorrect = true;
    retryableErrors.forEach(errorTest => {
      const mockError = new Error('Test error');
      if (errorTest.status) mockError.status = errorTest.status;
      if (errorTest.code) mockError.code = errorTest.code;

      const isRetryable = service.isRetryableError(mockError);
      if (isRetryable !== errorTest.shouldRetry) {
        retryLogicCorrect = false;
      }
    });

    if (retryLogicCorrect) {
      logTest('Retry Error Detection', true, 'Correctly identifies retryable errors');
    } else {
      logTest('Retry Error Detection', false, 'Retry logic incorrect for some error types');
      return false;
    }

    // Test retry delay calculation
    const delays = [
      service.calculateRetryDelay(0, 1000, 60000, 0.1, { status: 500 }),
      service.calculateRetryDelay(1, 1000, 60000, 0.1, { status: 500 }),
      service.calculateRetryDelay(2, 1000, 60000, 0.1, { status: 500 })
    ];

    // Delays should increase (with some jitter tolerance)
    if (delays[1] > delays[0] * 1.5 && delays[2] > delays[1] * 1.5) {
      logTest('Retry Delay Calculation', true, 'Delays increase exponentially');
    } else {
      logTest('Retry Delay Calculation', false, 'Retry delays not increasing properly');
      return false;
    }

    // Test maximum delay cap
    const maxDelay = service.calculateRetryDelay(10, 1000, 5000, 0.1, { status: 500 });
    if (maxDelay <= 5000) {
      logTest('Maximum Delay Cap', true, 'Delay properly capped at maximum');
    } else {
      logTest('Maximum Delay Cap', false, 'Delay exceeds maximum limit');
      return false;
    }

    return true;
  } catch (error) {
    logTest('Retry Logic', false, error.message);
    return false;
  }
}

/**
 * Test 7: Report Parsing
 */
function testReportParsing() {
  try {
    const service = new ChatGPTService();

    // Mock response data
    const mockResponseData = {
      content: `# Investment Analysis Report

## EXECUTIVE SUMMARY
This is a comprehensive analysis of your investment portfolio.

## PORTFOLIO ANALYSIS
Your current holdings show good diversification.

## RISK ASSESSMENT
The risk level is appropriate for your goals.

## RECOMMENDATIONS
1. Consider rebalancing quarterly
2. Increase international exposure
3. Review expense ratios`,
      finishReason: 'stop'
    };

    const parsedReport = service.parseInvestmentReport(mockResponseData, 'intermediate');

    // Test basic structure
    if (parsedReport.title && parsedReport.fullContent && parsedReport.sections) {
      logTest('Report Structure Parsing', true, 'Report has required structure');
    } else {
      logTest('Report Structure Parsing', false, 'Report missing required structure');
      return false;
    }

    // Test section extraction
    const expectedSections = ['summary', 'analysis', 'riskAssessment', 'recommendations'];
    const foundSections = Object.keys(parsedReport.sections);
    const hasExpectedSections = expectedSections.some(section => foundSections.includes(section));

    if (hasExpectedSections) {
      logTest('Section Extraction', true, `Found sections: ${foundSections.join(', ')}`);
    } else {
      logTest('Section Extraction', false, 'No expected sections found');
      return false;
    }

    // Test content metrics
    if (parsedReport.contentLength > 0 && parsedReport.wordCount > 0) {
      logTest('Content Metrics', true, `Length: ${parsedReport.contentLength}, Words: ${parsedReport.wordCount}`);
    } else {
      logTest('Content Metrics', false, 'Content metrics not calculated');
      return false;
    }

    return true;
  } catch (error) {
    logTest('Report Parsing', false, error.message);
    return false;
  }
}

/**
 * Test 8: Token Estimation
 */
function testTokenEstimation() {
  try {
    const service = new ChatGPTService();

    // Test token estimation
    const shortText = 'Hello world';
    const longText = 'This is a much longer text that should have significantly more tokens than the short text example above.';

    const shortTokens = service.estimateTokenCount(shortText);
    const longTokens = service.estimateTokenCount(longText);

    if (shortTokens > 0 && longTokens > shortTokens) {
      logTest('Token Estimation', true, `Short: ${shortTokens}, Long: ${longTokens}`);
    } else {
      logTest('Token Estimation', false, 'Token estimation not working correctly');
      return false;
    }

    // Test token analysis
    const mockPromptData = {
      systemPrompt: 'You are an investment advisor.',
      userPrompt: 'Analyze this portfolio: ' + 'x'.repeat(1000)
    };

    const analysis = service.analyzeTokenUsage(mockPromptData, { maxTokens: 2000, modelLimit: 4000 });
    
    if (analysis.estimatedInputTokens > 0 && 
        analysis.estimatedTotalTokens > analysis.estimatedInputTokens &&
        typeof analysis.withinLimits === 'boolean') {
      logTest('Token Analysis', true, `Input: ${analysis.estimatedInputTokens}, Total: ${analysis.estimatedTotalTokens}`);
    } else {
      logTest('Token Analysis', false, 'Token analysis not working correctly');
      return false;
    }

    return true;
  } catch (error) {
    logTest('Token Estimation', false, error.message);
    return false;
  }
}

/**
 * Test 9: Queue Management
 */
function testQueueManagement() {
  try {
    const service = new ChatGPTService();

    // Test initial queue state
    const initialStats = service.getQueueStats();
    if (initialStats.currentQueueSize === 0 && initialStats.activeRequests === 0) {
      logTest('Initial Queue State', true, 'Queue starts empty');
    } else {
      logTest('Initial Queue State', false, 'Queue should start empty');
      return false;
    }

    // Test priority calculation
    const basicPriority = service.calculateRequestPriority('basic', {});
    const advancedPriority = service.calculateRequestPriority('advanced', {});
    const premiumPriority = service.calculateRequestPriority('basic', { isPremium: true });

    if (basicPriority > advancedPriority && premiumPriority > basicPriority) {
      logTest('Priority Calculation', true, `Basic: ${basicPriority}, Advanced: ${advancedPriority}, Premium: ${premiumPriority}`);
    } else {
      logTest('Priority Calculation', false, 'Priority calculation not working correctly');
      return false;
    }

    // Test queue decision logic
    service.activeRequests = 0;
    service.maxConcurrentRequests = 3;
    
    if (!service.shouldQueueRequest()) {
      logTest('Queue Decision Logic', true, 'Correctly allows requests when under limit');
    } else {
      logTest('Queue Decision Logic', false, 'Should not queue when under limit');
      return false;
    }

    service.activeRequests = 3;
    if (service.shouldQueueRequest()) {
      logTest('Queue Decision Logic - At Limit', true, 'Correctly queues when at limit');
    } else {
      logTest('Queue Decision Logic - At Limit', false, 'Should queue when at limit');
      return false;
    }

    return true;
  } catch (error) {
    logTest('Queue Management', false, error.message);
    return false;
  }
}

/**
 * Test 10: Graceful Degradation
 */
function testGracefulDegradation() {
  try {
    const service = new ChatGPTService();

    // Test degradation decision
    const degradableErrors = [
      { code: 'SERVICE_UNAVAILABLE', shouldDegrade: true },
      { code: 'RATE_LIMIT_ERROR', shouldDegrade: true },
      { code: 'AUTHENTICATION_ERROR', shouldDegrade: false },
      { code: 'INVALID_REQUEST', shouldDegrade: false }
    ];

    let degradationLogicCorrect = true;
    degradableErrors.forEach(errorTest => {
      const shouldDegrade = service.shouldProvideDegradedService(errorTest);
      if (shouldDegrade !== errorTest.shouldDegrade) {
        degradationLogicCorrect = false;
      }
    });

    if (degradationLogicCorrect) {
      logTest('Degradation Decision Logic', true, 'Correctly identifies when to degrade');
    } else {
      logTest('Degradation Decision Logic', false, 'Degradation logic incorrect');
      return false;
    }

    // Test basic analysis generation
    const testData = {
      goals: 'Retirement planning',
      riskTolerance: 'Conservative',
      timeHorizon: 'Long-term',
      portfolio: { holdings: [{ name: 'Test Stock' }] }
    };

    const basicAnalysis = service.generateBasicAnalysis(testData);
    if (basicAnalysis.includes('Retirement planning') && 
        basicAnalysis.includes('Conservative') &&
        basicAnalysis.length > 100) {
      logTest('Basic Analysis Generation', true, `Generated ${basicAnalysis.length} characters`);
    } else {
      logTest('Basic Analysis Generation', false, 'Basic analysis not generated properly');
      return false;
    }

    // Test basic recommendations
    const recommendations = service.generateBasicRecommendations(testData, 'basic');
    if (recommendations.includes('1.') && recommendations.toLowerCase().includes('diversif')) {
      logTest('Basic Recommendations', true, 'Generated structured recommendations');
    } else {
      logTest('Basic Recommendations', false, 'Recommendations not generated properly');
      return false;
    }

    return true;
  } catch (error) {
    logTest('Graceful Degradation', false, error.message);
    return false;
  }
}

/**
 * Main test runner
 */
async function runChatGPTServiceUnitTests() {
  console.log('🧪 Starting ChatGPT Service Unit Tests');
  console.log('=' .repeat(80));
  console.log('Testing prompt formatting, API communication, error handling, and retry logic');
  console.log('=' .repeat(80));

  // Run all tests
  const tests = [
    testServiceInitialization,
    testPromptFormatting,
    testInvestmentDataValidation,
    testPortfolioDataFormatting,
    testErrorHandling,
    testRetryLogic,
    testReportParsing,
    testTokenEstimation,
    testQueueManagement,
    testGracefulDegradation
  ];

  for (const test of tests) {
    try {
      await test();
    } catch (error) {
      console.error(`Test execution error: ${error.message}`);
    }
  }

  // Print summary
  const totalTime = Date.now() - testResults.startTime;
  console.log('\n' + '=' .repeat(80));
  console.log('📊 ChatGPT Service Unit Test Summary');
  console.log('=' .repeat(80));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⏱️  Total Time: ${totalTime}ms`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

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

  // Save detailed results
  const reportPath = './test-chatgpt-service-unit-results.json';
  const fs = await import('fs');
  fs.writeFileSync(reportPath, JSON.stringify({
    summary: {
      passed: testResults.passed,
      failed: testResults.failed,
      total: testResults.passed + testResults.failed,
      successRate: ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1) + '%',
      totalTime: totalTime
    },
    tests: testResults.tests,
    timestamp: new Date().toISOString()
  }, null, 2));

  console.log(`\n📄 Detailed results saved to: ${reportPath}`);
  
  return testResults.failed === 0;
}

// Run tests if script is executed directly
if (process.argv[1] && process.argv[1].endsWith('test-chatgpt-service-unit.js')) {
  runChatGPTServiceUnitTests()
    .then(success => {
      console.log('\n' + '=' .repeat(80));
      if (success) {
        console.log('🎉 All ChatGPT Service unit tests passed!');
      } else {
        console.log('⚠️  Some ChatGPT Service unit tests failed. Please review the issues above.');
      }
      console.log('=' .repeat(80));
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner error:', error);
      process.exit(1);
    });
}

export { runChatGPTServiceUnitTests };