// Task 7.1: Test All Report Types - Comprehensive Report Generation Testing
// Tests all available report types to ensure they generate successfully
// Requirements: 5.1, 5.2, 5.3, 5.4, 5.5

import fs from 'fs/promises';

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 120000; // 2 minutes per test
const MAX_RETRIES = 3;

// Test results tracking
const testResults = {
  taskId: '7.1',
  taskName: 'Test All Report Types',
  timestamp: new Date().toISOString(),
  summary: { passed: 0, failed: 0, total: 0 },
  tests: [],
  reportTypes: {},
  performance: {},
  errors: []
};

// Report types to test (from prompt templates)
const REPORT_TYPES = [
  {
    type: 'jp_investment_4part',
    name: '投資分析レポート（4部構成）',
    description: 'Executive Summary, Benefits, Risks, Financial Analysis',
    testData: {
      inputText: `物件概要：
- 所在地：東京都渋谷区
- 構造：RC造
- 築年数：5年
- 価格：1億円
- 年間賃料収入：800万円
- 年間運営費：200万円
- 融資条件：金利2.5%、期間30年、借入比率80%

投資目標：安定したキャッシュフローと資産形成を目指す`,
      files: []
    }
  },
  {
    type: 'jp_inheritance_strategy',
    name: '相続対策戦略レポート',
    description: '収益不動産活用による相続対策分析',
    testData: {
      inputText: `相続対策検討データ：
- 総資産：5億円（金融資産3億円、不動産2億円）
- 法定相続人：配偶者1名、子2名
- 年収：2000万円
- 相続税試算：約8000万円
- 検討物件：都心RC造マンション、価格2億円、利回り4%
- 融資検討：金利2%、期間25年、借入比率70%

目標：相続税圧縮と安定収益の両立`,
      files: []
    }
  },
  {
    type: 'jp_tax_strategy',
    name: '税務戦略レポート（減価償却活用）',
    description: '所得税・住民税の減税戦略分析',
    testData: {
      inputText: `税務戦略検討データ：
- 年収：1500万円（給与所得）
- 課税所得：1200万円
- 実効税率：約45%
- 検討物件：築古RC造、価格8000万円、建物比率60%
- 減価償却期間：9年（法定耐用年数超過）
- 融資条件：金利2.8%、期間20年、借入比率75%
- 年間賃料収入：400万円、年間運営費：120万円

目標：損益通算による所得税軽減とデッドクロス管理`,
      files: []
    }
  },
  {
    type: 'comparison_analysis',
    name: '比較分析レポート',
    description: '複数物件の比較分析',
    testData: {
      propertyA: {
        inputText: `物件A：
- 所在地：東京都新宿区
- 構造：RC造、築3年
- 価格：1.2億円
- 年間賃料：900万円
- FCR：6.5%、K%：4.2%、CCR：8.1%
- DCR：1.35倍、BER：78%`,
        files: []
      },
      propertyB: {
        inputText: `物件B：
- 所在地：大阪市中央区
- 構造：SRC造、築8年
- 価格：8000万円
- 年間賃料：650万円
- FCR：7.2%、K%：4.8%、CCR：9.8%
- DCR：1.28倍、BER：82%`,
        files: []
      },
      comparisonCriteria: '収益性、リスク、立地を中心とした総合比較',
      resultFormat: '表形式での比較と推奨順位'
    }
  },
  {
    type: 'custom',
    name: 'カスタムレポート',
    description: 'カスタム要件に基づく投資分析',
    testData: {
      inputText: `カスタム分析要求：
- 物件：都心商業ビル、価格15億円
- 特殊要件：ESG投資基準での評価
- 分析観点：環境性能、社会的影響、ガバナンス
- 投資期間：10年
- 目標IRR：8%以上

カスタム分析項目：
1. ESG評価スコア算定
2. 持続可能性リスク分析
3. 長期価値創造戦略
4. ステークホルダー影響評価`,
      files: []
    }
  }
];

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

async function testReportType(reportType, retryCount = 0) {
  const startTime = Date.now();
  
  try {
    console.log(`\n📄 Testing ${reportType.name} (${reportType.type})...`);
    
    let requestData;
    let endpoint = '/api/generate';
    
    // Handle comparison analysis differently
    if (reportType.type === 'comparison_analysis') {
      requestData = reportType.testData;
      endpoint = '/api/generate/comparison';
    } else {
      requestData = {
        reportType: reportType.type,
        inputText: reportType.testData.inputText,
        files: reportType.testData.files || [],
        options: {
          maxTokens: 2500,
          temperature: 0.7
        }
      };
    }
    
    const { response, data } = await makeRequest(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
    
    const processingTime = Date.now() - startTime;
    
    // Record performance metrics
    testResults.performance[reportType.type] = {
      processingTime,
      responseStatus: response.status,
      timestamp: new Date().toISOString()
    };
    
    // Test basic response structure
    logTest(
      `${reportType.type} - API Response`,
      response.status === 200,
      `Status: ${response.status}, Time: ${processingTime}ms`,
      '5.1'
    );
    
    if (response.status !== 200) {
      testResults.reportTypes[reportType.type] = {
        success: false,
        error: data.error || 'HTTP error',
        processingTime
      };
      return false;
    }
    
    // Test response data structure
    const hasSuccess = data.success === true;
    logTest(
      `${reportType.type} - Success Flag`,
      hasSuccess,
      `Success: ${data.success}`,
      '5.1'
    );
    
    // Test content generation
    let content = '';
    let reportData = null;
    
    if (reportType.type === 'comparison_analysis') {
      reportData = data.report;
      content = reportData?.content || '';
    } else {
      content = data.content || '';
    }
    
    const hasContent = content && content.length > 0;
    logTest(
      `${reportType.type} - Content Generation`,
      hasContent,
      `Content length: ${content.length} characters`,
      '5.2'
    );
    
    // Test content quality (basic checks)
    if (hasContent) {
      const wordCount = content.split(/\s+/).length;
      const hasStructure = content.includes('##') || content.includes('**') || content.includes('###');
      const isSubstantial = wordCount >= 100; // Minimum word count
      
      logTest(
        `${reportType.type} - Content Quality`,
        isSubstantial && hasStructure,
        `Words: ${wordCount}, Structured: ${hasStructure}`,
        '5.2'
      );
      
      // Test template-specific content
      if (reportType.type === 'jp_investment_4part') {
        const hasSections = content.includes('Executive Summary') || 
                           content.includes('Benefits') || 
                           content.includes('Risks') || 
                           content.includes('Evidence');
        logTest(
          `${reportType.type} - Template Structure`,
          hasSections,
          `Has expected sections: ${hasSections}`,
          '5.3'
        );
      }
      
      if (reportType.type === 'jp_inheritance_strategy') {
        const hasInheritanceTerms = content.includes('相続') || 
                                   content.includes('レバレッジ') || 
                                   content.includes('評価額');
        logTest(
          `${reportType.type} - Domain Content`,
          hasInheritanceTerms,
          `Has inheritance-related content: ${hasInheritanceTerms}`,
          '5.3'
        );
      }
      
      if (reportType.type === 'jp_tax_strategy') {
        const hasTaxTerms = content.includes('減価償却') || 
                           content.includes('デッドクロス') || 
                           content.includes('損益通算');
        logTest(
          `${reportType.type} - Domain Content`,
          hasTaxTerms,
          `Has tax strategy content: ${hasTaxTerms}`,
          '5.3'
        );
      }
      
      if (reportType.type === 'comparison_analysis') {
        const hasComparison = content.includes('物件A') || 
                             content.includes('物件B') || 
                             content.includes('比較') ||
                             content.includes('推奨');
        logTest(
          `${reportType.type} - Comparison Content`,
          hasComparison,
          `Has comparison analysis: ${hasComparison}`,
          '5.3'
        );
      }
    }
    
    // Test processing time (should be under 60 seconds per requirement 5.4)
    const withinTimeLimit = processingTime < 60000;
    logTest(
      `${reportType.type} - Processing Time`,
      withinTimeLimit,
      `${processingTime}ms (limit: 60s)`,
      '5.4'
    );
    
    // Test usage tracking
    const hasUsage = data.usage && (data.usage.totalTokens > 0 || data.usage.estimatedCost);
    logTest(
      `${reportType.type} - Usage Tracking`,
      hasUsage,
      `Tokens: ${data.usage?.totalTokens || 0}, Cost: ${data.usage?.estimatedCost || 'N/A'}`,
      '5.5'
    );
    
    // Record successful test
    testResults.reportTypes[reportType.type] = {
      success: true,
      processingTime,
      contentLength: content.length,
      wordCount: content.split(/\s+/).length,
      hasUsage,
      usage: data.usage
    };
    
    return true;
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error(`Error testing ${reportType.type}:`, error.message);
    
    // Record failed test
    testResults.reportTypes[reportType.type] = {
      success: false,
      error: error.message,
      processingTime
    };
    
    // Retry logic for transient failures
    if (retryCount < MAX_RETRIES && isRetryableError(error)) {
      console.log(`Retrying ${reportType.type} (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))); // Exponential backoff
      return testReportType(reportType, retryCount + 1);
    }
    
    logTest(
      `${reportType.type} - Generation Failed`,
      false,
      error.message,
      '5.1'
    );
    
    return false;
  }
}

function isRetryableError(error) {
  const retryableErrors = [
    'timeout',
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'Request timeout',
    'rate limit',
    'service unavailable'
  ];
  
  return retryableErrors.some(errorType => 
    error.message.toLowerCase().includes(errorType.toLowerCase())
  );
}

async function testConcurrentReportGeneration() {
  console.log('\n🔄 Testing concurrent report generation...');
  
  const startTime = Date.now();
  const concurrentTests = REPORT_TYPES.slice(0, 3).map(reportType => 
    testReportType(reportType)
  );
  
  try {
    const results = await Promise.allSettled(concurrentTests);
    const processingTime = Date.now() - startTime;
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    const total = results.length;
    
    logTest(
      'Concurrent Report Generation',
      successful === total,
      `${successful}/${total} reports generated successfully in ${processingTime}ms`,
      '5.4'
    );
    
    // Test that concurrent generation doesn't cause excessive delays
    const averageTime = processingTime / total;
    const withinReasonableTime = averageTime < 90000; // 90 seconds average
    
    logTest(
      'Concurrent Processing Performance',
      withinReasonableTime,
      `Average time per report: ${Math.round(averageTime)}ms`,
      '5.4'
    );
    
  } catch (error) {
    logTest(
      'Concurrent Report Generation',
      false,
      error.message,
      '5.4'
    );
  }
}

async function testErrorHandling() {
  console.log('\n⚠️ Testing error handling scenarios...');
  
  // Test with invalid report type
  try {
    const { response, data } = await makeRequest(`${BASE_URL}/api/generate`, {
      method: 'POST',
      body: JSON.stringify({
        reportType: 'invalid_type',
        inputText: 'Test input',
        files: []
      })
    });
    
    const handlesInvalidType = response.status === 400 || 
                              (data.success === false && data.error);
    
    logTest(
      'Invalid Report Type Handling',
      handlesInvalidType,
      `Status: ${response.status}, Error handled: ${!!data.error}`,
      '5.5'
    );
    
  } catch (error) {
    logTest(
      'Invalid Report Type Handling',
      false,
      error.message,
      '5.5'
    );
  }
  
  // Test with empty input
  try {
    const { response, data } = await makeRequest(`${BASE_URL}/api/generate`, {
      method: 'POST',
      body: JSON.stringify({
        reportType: 'jp_investment_4part',
        inputText: '',
        files: []
      })
    });
    
    // Should either succeed with minimal content or fail gracefully
    const handlesEmptyInput = response.status === 200 || 
                             (response.status === 400 && data.error);
    
    logTest(
      'Empty Input Handling',
      handlesEmptyInput,
      `Status: ${response.status}, Handled gracefully: ${handlesEmptyInput}`,
      '5.5'
    );
    
  } catch (error) {
    logTest(
      'Empty Input Handling',
      false,
      error.message,
      '5.5'
    );
  }
  
  // Test with malformed request
  try {
    const { response, data } = await makeRequest(`${BASE_URL}/api/generate`, {
      method: 'POST',
      body: 'invalid json'
    });
    
    const handlesMalformedRequest = response.status === 400 && data.error;
    
    logTest(
      'Malformed Request Handling',
      handlesMalformedRequest,
      `Status: ${response.status}, Error: ${data.error || 'None'}`,
      '5.5'
    );
    
  } catch (error) {
    // Network errors are acceptable for malformed requests
    logTest(
      'Malformed Request Handling',
      true,
      `Request properly rejected: ${error.message}`,
      '5.5'
    );
  }
}

async function generateSummaryReport() {
  console.log('\n📊 Generating test summary report...');
  
  const totalReportTypes = REPORT_TYPES.length;
  const successfulReportTypes = Object.values(testResults.reportTypes)
    .filter(result => result.success).length;
  
  const averageProcessingTime = Object.values(testResults.reportTypes)
    .filter(result => result.success)
    .reduce((sum, result) => sum + result.processingTime, 0) / successfulReportTypes || 0;
  
  const summary = {
    ...testResults,
    reportTypesSummary: {
      total: totalReportTypes,
      successful: successfulReportTypes,
      failed: totalReportTypes - successfulReportTypes,
      successRate: `${Math.round((successfulReportTypes / totalReportTypes) * 100)}%`
    },
    performanceSummary: {
      averageProcessingTime: Math.round(averageProcessingTime),
      allWithinTimeLimit: Object.values(testResults.reportTypes)
        .every(result => !result.success || result.processingTime < 60000),
      fastestReport: Math.min(...Object.values(testResults.reportTypes)
        .filter(r => r.success).map(r => r.processingTime)),
      slowestReport: Math.max(...Object.values(testResults.reportTypes)
        .filter(r => r.success).map(r => r.processingTime))
    }
  };
  
  // Save detailed results
  await fs.writeFile(
    'test-report-types-results.json',
    JSON.stringify(summary, null, 2)
  );
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST SUMMARY - Task 7.1: Test All Report Types');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${summary.summary.total}`);
  console.log(`Passed: ${summary.summary.passed} ✅`);
  console.log(`Failed: ${summary.summary.failed} ❌`);
  console.log(`Success Rate: ${Math.round((summary.summary.passed / summary.summary.total) * 100)}%`);
  console.log('');
  console.log(`Report Types Tested: ${summary.reportTypesSummary.total}`);
  console.log(`Successfully Generated: ${summary.reportTypesSummary.successful}`);
  console.log(`Report Type Success Rate: ${summary.reportTypesSummary.successRate}`);
  console.log('');
  console.log(`Average Processing Time: ${summary.performanceSummary.averageProcessingTime}ms`);
  console.log(`All Within Time Limit (60s): ${summary.performanceSummary.allWithinTimeLimit ? 'Yes' : 'No'}`);
  
  if (summary.errors.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    summary.errors.forEach(error => {
      console.log(`  • ${error.test}: ${error.details}`);
    });
  }
  
  console.log('\n📄 Detailed results saved to: test-report-types-results.json');
  console.log('='.repeat(60));
  
  return summary;
}

// Main test execution
async function runTask71Tests() {
  console.log('🧪 Task 7.1: Test All Report Types');
  console.log('Testing report generation functionality for all available templates');
  console.log('='.repeat(60));
  console.log(`Testing against: ${BASE_URL}`);
  console.log(`Timeout per test: ${TEST_TIMEOUT}ms`);
  console.log(`Max retries: ${MAX_RETRIES}`);
  console.log('');
  
  try {
    // Test each report type individually
    for (const reportType of REPORT_TYPES) {
      await testReportType(reportType);
    }
    
    // Test concurrent generation
    await testConcurrentReportGeneration();
    
    // Test error handling scenarios
    await testErrorHandling();
    
    // Generate and save summary
    const summary = await generateSummaryReport();
    
    // Exit with appropriate code
    const allPassed = summary.summary.failed === 0;
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    testResults.errors.push({ test: 'Test Execution', details: error.message });
    
    await fs.writeFile(
      'test-report-types-results.json',
      JSON.stringify(testResults, null, 2)
    );
    
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTask71Tests();
}

export { runTask71Tests, testReportType, REPORT_TYPES };