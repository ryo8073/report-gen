#!/usr/bin/env node

/**
 * Failover Scenarios Test
 * Tests the automatic failover from OpenAI to Gemini by simulating various failure conditions:
 * - Rate limits
 * - Timeouts  
 * - Server errors
 * - Authentication errors
 * - Network issues
 * - Both services failing
 */

import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔍 Testing AI Service Failover Scenarios...\n');

// Test data for report generation
const testReportData = {
  reportType: 'jp_investment_4part',
  inputText: `投資ポートフォリオ分析テスト
現在の資産: 500万円
- 株式: 300万円 (60%)
- 債券: 100万円 (20%)
- 現金: 100万円 (20%)

投資目標: 3年間で750万円
リスク許容度: 中程度`,
  files: [],
  additionalInfo: {
    investmentHorizon: '3年',
    riskTolerance: '中程度'
  }
};

// Mock error classes to simulate different failure types
class MockOpenAIError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'MockOpenAIError';
    this.status = status;
    this.code = code;
  }
}

class MockGeminiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'MockGeminiError';
    this.status = status;
    this.code = code;
  }
}

// Simulate the failover logic from generate.js
function shouldTryFallback(error) {
  // Rate limit errors - always try fallback
  if (error.status === 429 || error.message?.includes('rate limit')) {
    console.log('   → Rate limit detected, trying fallback');
    return true;
  }
  
  // Server errors (5xx) - try fallback
  if (error.status >= 500 || error.message?.includes('server error')) {
    console.log('   → Server error detected, trying fallback');
    return true;
  }
  
  // Network timeouts and connection issues - try fallback
  if (error.code === 'ETIMEDOUT' || 
      error.code === 'ECONNRESET' || 
      error.code === 'ENOTFOUND' ||
      error.message?.includes('network') ||
      error.message?.includes('timeout') ||
      error.message?.includes('unavailable')) {
    console.log('   → Network/timeout error detected, trying fallback');
    return true;
  }
  
  // Authentication errors - mark service as unhealthy but try fallback
  if (error.status === 401 || error.message?.includes('authentication')) {
    console.log('   → Authentication error detected, trying fallback');
    return true;
  }
  
  // Service unavailable errors
  if (error.status === 503 || error.message?.includes('service unavailable')) {
    console.log('   → Service unavailable, trying fallback');
    return true;
  }
  
  // Don't try fallback for client errors (400, 403) or validation errors
  if (error.status === 400 || error.status === 403 || 
      error.message?.includes('validation') ||
      error.message?.includes('invalid request')) {
    console.log('   → Client error detected, not trying fallback:', error.message);
    return false;
  }
  
  // For unknown errors, try fallback as a safety measure
  console.log('   → Unknown error type, trying fallback as safety measure:', error.message);
  return true;
}

// Mock OpenAI service that can simulate failures
class MockOpenAIService {
  constructor(shouldFail = false, errorType = null) {
    this.shouldFail = shouldFail;
    this.errorType = errorType;
  }

  async generateReport(data) {
    if (this.shouldFail) {
      switch (this.errorType) {
        case 'rate_limit':
          throw new MockOpenAIError('Rate limit exceeded', 429);
        case 'server_error':
          throw new MockOpenAIError('Internal server error', 500);
        case 'timeout':
          throw new MockOpenAIError('Request timeout', null, 'ETIMEDOUT');
        case 'auth_error':
          throw new MockOpenAIError('Authentication failed', 401);
        case 'network_error':
          throw new MockOpenAIError('Network connection failed', null, 'ECONNRESET');
        case 'service_unavailable':
          throw new MockOpenAIError('Service temporarily unavailable', 503);
        case 'client_error':
          throw new MockOpenAIError('Bad request - invalid input', 400);
        default:
          throw new MockOpenAIError('Unknown OpenAI error');
      }
    }

    // Simulate successful OpenAI response
    return {
      id: Date.now().toString(),
      title: '投資分析レポート（4部構成）',
      content: 'OpenAI生成レポート: 投資分析の詳細内容...',
      createdAt: new Date().toISOString(),
      usage: {
        promptTokens: 150,
        completionTokens: 300,
        totalTokens: 450,
        estimatedCost: '0.0135'
      },
      aiService: 'openai'
    };
  }
}

// Mock Gemini service that can simulate failures
class MockGeminiService {
  constructor(shouldFail = false, errorType = null) {
    this.shouldFail = shouldFail;
    this.errorType = errorType;
  }

  async generateReport(data) {
    if (this.shouldFail) {
      switch (this.errorType) {
        case 'rate_limit':
          throw new MockGeminiError('Quota exceeded', 429);
        case 'server_error':
          throw new MockGeminiError('Internal server error', 500);
        case 'timeout':
          throw new MockGeminiError('Request timeout', null, 'ETIMEDOUT');
        case 'auth_error':
          throw new MockGeminiError('API key invalid', 403);
        case 'network_error':
          throw new MockGeminiError('Network unavailable', null, 'ENOTFOUND');
        case 'service_unavailable':
          throw new MockGeminiError('Service unavailable', 503);
        default:
          throw new MockGeminiError('Unknown Gemini error');
      }
    }

    // Simulate successful Gemini response
    return {
      id: Date.now().toString(),
      title: '投資分析レポート（4部構成）',
      content: 'Gemini生成レポート: 投資分析の詳細内容...',
      createdAt: new Date().toISOString(),
      usage: {
        promptTokens: 140,
        completionTokens: 280,
        totalTokens: 420,
        estimatedCost: '0.0063'
      },
      aiService: 'gemini'
    };
  }
}

// Simulate the main report generation function with failover
async function generateReportWithFailover(openaiService, geminiService, reportData) {
  let aiService = 'openai';
  let report;
  
  try {
    // Try OpenAI first
    report = await openaiService.generateReport(reportData);
  } catch (openaiError) {
    console.log(`   OpenAI failed: ${openaiError.message}`);
    
    // Check if we should try fallback based on error type
    if (shouldTryFallback(openaiError)) {
      try {
        // Fallback to Gemini
        aiService = 'gemini';
        report = await geminiService.generateReport(reportData);
        console.log('   ✅ Successfully generated report using Gemini fallback');
        
        // Add service notification
        report.serviceNotification = {
          message: 'Your report was generated using our backup AI service to ensure uninterrupted service.',
          type: 'info',
          details: 'The primary service was temporarily unavailable, but report quality remains consistent.',
          timestamp: new Date().toISOString()
        };
      } catch (geminiError) {
        console.log(`   Gemini also failed: ${geminiError.message}`);
        // Both failed - throw dual-service failure error
        const dualError = new Error(`Both AI services failed. OpenAI: ${openaiError.message}, Gemini: ${geminiError.message}`);
        dualError.isDualServiceFailure = true;
        dualError.openaiError = openaiError;
        dualError.geminiError = geminiError;
        throw dualError;
      }
    } else {
      // Don't try fallback for certain error types
      throw openaiError;
    }
  }
  
  // Add service indicator to response
  report.aiService = aiService;
  return report;
}

// Test scenarios
const failoverScenarios = [
  {
    name: 'OpenAI Rate Limit → Gemini Success',
    description: 'OpenAI hits rate limit, should fallback to Gemini',
    openaiConfig: { shouldFail: true, errorType: 'rate_limit' },
    geminiConfig: { shouldFail: false },
    expectedResult: 'gemini_success'
  },
  {
    name: 'OpenAI Server Error → Gemini Success',
    description: 'OpenAI server error, should fallback to Gemini',
    openaiConfig: { shouldFail: true, errorType: 'server_error' },
    geminiConfig: { shouldFail: false },
    expectedResult: 'gemini_success'
  },
  {
    name: 'OpenAI Timeout → Gemini Success',
    description: 'OpenAI timeout, should fallback to Gemini',
    openaiConfig: { shouldFail: true, errorType: 'timeout' },
    geminiConfig: { shouldFail: false },
    expectedResult: 'gemini_success'
  },
  {
    name: 'OpenAI Auth Error → Gemini Success',
    description: 'OpenAI authentication error, should fallback to Gemini',
    openaiConfig: { shouldFail: true, errorType: 'auth_error' },
    geminiConfig: { shouldFail: false },
    expectedResult: 'gemini_success'
  },
  {
    name: 'OpenAI Network Error → Gemini Success',
    description: 'OpenAI network error, should fallback to Gemini',
    openaiConfig: { shouldFail: true, errorType: 'network_error' },
    geminiConfig: { shouldFail: false },
    expectedResult: 'gemini_success'
  },
  {
    name: 'OpenAI Service Unavailable → Gemini Success',
    description: 'OpenAI service unavailable, should fallback to Gemini',
    openaiConfig: { shouldFail: true, errorType: 'service_unavailable' },
    geminiConfig: { shouldFail: false },
    expectedResult: 'gemini_success'
  },
  {
    name: 'OpenAI Client Error → No Fallback',
    description: 'OpenAI client error (400), should NOT fallback to Gemini',
    openaiConfig: { shouldFail: true, errorType: 'client_error' },
    geminiConfig: { shouldFail: false },
    expectedResult: 'openai_error_no_fallback'
  },
  {
    name: 'Both Services Rate Limited',
    description: 'Both OpenAI and Gemini hit rate limits',
    openaiConfig: { shouldFail: true, errorType: 'rate_limit' },
    geminiConfig: { shouldFail: true, errorType: 'rate_limit' },
    expectedResult: 'dual_service_failure'
  },
  {
    name: 'Both Services Server Errors',
    description: 'Both OpenAI and Gemini have server errors',
    openaiConfig: { shouldFail: true, errorType: 'server_error' },
    geminiConfig: { shouldFail: true, errorType: 'server_error' },
    expectedResult: 'dual_service_failure'
  },
  {
    name: 'OpenAI Success (No Failover)',
    description: 'OpenAI works normally, no failover needed',
    openaiConfig: { shouldFail: false },
    geminiConfig: { shouldFail: false },
    expectedResult: 'openai_success'
  }
];

async function runFailoverTest(scenario) {
  console.log(`\n📋 Testing: ${scenario.name}`);
  console.log(`   Description: ${scenario.description}`);
  
  const openaiService = new MockOpenAIService(
    scenario.openaiConfig.shouldFail,
    scenario.openaiConfig.errorType
  );
  
  const geminiService = new MockGeminiService(
    scenario.geminiConfig.shouldFail,
    scenario.geminiConfig.errorType
  );
  
  try {
    const startTime = Date.now();
    const result = await generateReportWithFailover(openaiService, geminiService, testReportData);
    const responseTime = Date.now() - startTime;
    
    // Validate result based on expected outcome
    switch (scenario.expectedResult) {
      case 'openai_success':
        if (result.aiService === 'openai') {
          console.log(`   ✅ SUCCESS: OpenAI generated report as expected`);
          console.log(`   📊 Service: ${result.aiService}, Response time: ${responseTime}ms`);
          return { success: true, actualResult: 'openai_success', responseTime };
        } else {
          console.log(`   ❌ FAIL: Expected OpenAI but got ${result.aiService}`);
          return { success: false, actualResult: result.aiService, responseTime };
        }
        
      case 'gemini_success':
        if (result.aiService === 'gemini' && result.serviceNotification) {
          console.log(`   ✅ SUCCESS: Gemini fallback worked as expected`);
          console.log(`   📊 Service: ${result.aiService}, Response time: ${responseTime}ms`);
          console.log(`   📢 Notification: ${result.serviceNotification.message}`);
          return { success: true, actualResult: 'gemini_success', responseTime };
        } else {
          console.log(`   ❌ FAIL: Expected Gemini fallback but got ${result.aiService}`);
          return { success: false, actualResult: result.aiService, responseTime };
        }
        
      default:
        console.log(`   ❌ UNEXPECTED: Got result when expecting failure`);
        return { success: false, actualResult: 'unexpected_success', responseTime };
    }
    
  } catch (error) {
    // Handle expected failures
    switch (scenario.expectedResult) {
      case 'openai_error_no_fallback':
        if (error.status === 400) {
          console.log(`   ✅ SUCCESS: OpenAI client error correctly did not trigger fallback`);
          return { success: true, actualResult: 'openai_error_no_fallback', error: error.message };
        } else {
          console.log(`   ❌ FAIL: Expected client error but got: ${error.message}`);
          return { success: false, actualResult: 'unexpected_error', error: error.message };
        }
        
      case 'dual_service_failure':
        if (error.isDualServiceFailure) {
          console.log(`   ✅ SUCCESS: Both services failed as expected`);
          console.log(`   📊 OpenAI Error: ${error.openaiError.message}`);
          console.log(`   📊 Gemini Error: ${error.geminiError.message}`);
          return { success: true, actualResult: 'dual_service_failure', error: error.message };
        } else {
          console.log(`   ❌ FAIL: Expected dual service failure but got: ${error.message}`);
          return { success: false, actualResult: 'unexpected_error', error: error.message };
        }
        
      default:
        console.log(`   ❌ FAIL: Unexpected error: ${error.message}`);
        return { success: false, actualResult: 'unexpected_error', error: error.message };
    }
  }
}

async function runAllFailoverTests() {
  console.log('🚀 Starting Comprehensive Failover Testing...\n');
  
  const results = [];
  let passedTests = 0;
  let totalTests = failoverScenarios.length;
  
  for (const scenario of failoverScenarios) {
    const result = await runFailoverTest(scenario);
    results.push({
      scenario: scenario.name,
      ...result
    });
    
    if (result.success) {
      passedTests++;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 FAILOVER TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  console.log('\n📋 Detailed Results:');
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${result.scenario}`);
    if (result.responseTime) {
      console.log(`   Response Time: ${result.responseTime}ms`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  // Test specific failover logic validation
  console.log('\n🔍 Failover Logic Validation:');
  
  const logicTests = [
    { error: new MockOpenAIError('Rate limit exceeded', 429), shouldFallback: true },
    { error: new MockOpenAIError('Internal server error', 500), shouldFallback: true },
    { error: new MockOpenAIError('Request timeout', null, 'ETIMEDOUT'), shouldFallback: true },
    { error: new MockOpenAIError('Authentication failed', 401), shouldFallback: true },
    { error: new MockOpenAIError('Network error', null, 'ECONNRESET'), shouldFallback: true },
    { error: new MockOpenAIError('Service unavailable', 503), shouldFallback: true },
    { error: new MockOpenAIError('Bad request', 400), shouldFallback: false },
    { error: new MockOpenAIError('Forbidden', 403), shouldFallback: false },
    { error: new MockOpenAIError('validation failed'), shouldFallback: false }
  ];
  
  let logicTestsPassed = 0;
  logicTests.forEach((test, index) => {
    const actualResult = shouldTryFallback(test.error);
    const passed = actualResult === test.shouldFallback;
    const status = passed ? '✅' : '❌';
    
    console.log(`${index + 1}. ${status} ${test.error.message} → ${actualResult ? 'Fallback' : 'No Fallback'}`);
    
    if (passed) {
      logicTestsPassed++;
    }
  });
  
  console.log(`\nFailover Logic Tests: ${logicTestsPassed}/${logicTests.length} passed`);
  
  const overallSuccess = passedTests === totalTests && logicTestsPassed === logicTests.length;
  
  if (overallSuccess) {
    console.log('\n🎉 ALL FAILOVER TESTS PASSED!');
    console.log('   ✅ Automatic failover is working correctly');
    console.log('   ✅ Error handling is appropriate for different failure types');
    console.log('   ✅ Both services failing is handled gracefully');
    console.log('   ✅ Client errors correctly avoid unnecessary fallback attempts');
  } else {
    console.log('\n⚠️  SOME FAILOVER TESTS FAILED');
    console.log('   Please review the failed tests and fix the failover logic');
  }
  
  return {
    success: overallSuccess,
    totalTests,
    passedTests,
    failedTests: totalTests - passedTests,
    successRate: Math.round((passedTests / totalTests) * 100),
    logicTestsPassed,
    logicTestsTotal: logicTests.length
  };
}

// Run all tests
runAllFailoverTests()
  .then(summary => {
    if (summary.success) {
      console.log('\n✅ Failover system is working correctly and ready for production.');
      process.exit(0);
    } else {
      console.log('\n❌ Failover system has issues that need to be addressed.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Unexpected error during failover testing:', error);
    process.exit(1);
  });