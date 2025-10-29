// Trial Site Functionality Test Suite
// Task 5.1: Test report generation functionality
// Requirements: 4.3, 4.4, 5.1

import fs from 'fs/promises';

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_RESULTS_FILE = 'trial-site-test-results.json';

// Test data
const testData = {
  reportTypes: [
    { id: 'jp_investment_4part', name: '投資分析（4部構成）' },
    { id: 'jp_tax_strategy', name: '税務戦略（減価償却）' },
    { id: 'jp_inheritance_strategy', name: '相続対策戦略' },
    { id: 'custom', name: 'カスタムプロンプト' }
  ],
  textInputs: {
    investment: '年収800万円、貯蓄1000万円、35歳会社員。リスク許容度は中程度で、10年後の資産形成を目指している。',
    tax: '個人事業主、年収1200万円。節税対策として不動産投資を検討中。減価償却を活用した戦略を知りたい。',
    inheritance: '資産総額5000万円、配偶者と子供2人。相続税対策として生前贈与や不動産投資を検討している。',
    custom: '新規事業立ち上げのためのビジネスプランを作成してください。IT関連のサービス業で、初期投資500万円を予定しています。'
  }
};

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

// Test functions for Task 5.1

async function testBasicReportGeneration() {
  console.log('\n📄 Testing basic report generation functionality...');
  
  for (const reportType of testData.reportTypes) {
    try {
      const inputKey = reportType.id === 'custom' ? 'custom' : 
                      reportType.id.includes('investment') ? 'investment' :
                      reportType.id.includes('tax') ? 'tax' : 'inheritance';
      
      const requestData = {
        reportType: reportType.id,
        inputText: testData.textInputs[inputKey],
        files: [],
        additionalInfo: {},
        options: { language: 'ja' }
      };

      const { response, data } = await makeRequest('/api/generate', requestData);
      
      // Test response status
      logTest(
        `${reportType.name} - API Response`, 
        response.status === 200, 
        `Status: ${response.status}`,
        '4.3'
      );
      
      // Test response structure
      logTest(
        `${reportType.name} - Response Structure`, 
        data.success === true && data.report !== undefined,
        `Success: ${data.success}, Has Report: ${!!data.report}`,
        '5.1'
      );
      
      // Test report content
      if (data.report) {
        logTest(
          `${reportType.name} - Report Content`, 
          data.report.content && data.report.content.length > 100,
          `Content length: ${data.report.content ? data.report.content.length : 0} chars`,
          '5.1'
        );
        
        logTest(
          `${reportType.name} - Report Metadata`, 
          data.report.id && data.report.title && data.report.createdAt,
          `Has ID: ${!!data.report.id}, Title: ${!!data.report.title}, Timestamp: ${!!data.report.createdAt}`,
          '5.1'
        );
      }
      
    } catch (error) {
      logTest(
        `${reportType.name} - Generation Test`, 
        false, 
        `Error: ${error.message}`,
        '4.3'
      );
    }
  }
}

async function testTextOnlyInput() {
  console.log('\n📝 Testing text-only input scenarios...');
  
  const testCases = [
    {
      name: 'Short Text Input',
      text: '簡単なテスト入力です。',
      reportType: 'jp_investment_4part'
    },
    {
      name: 'Medium Text Input',
      text: testData.textInputs.investment,
      reportType: 'jp_investment_4part'
    },
    {
      name: 'Long Text Input',
      text: testData.textInputs.investment.repeat(10),
      reportType: 'custom'
    }
  ];
  
  for (const testCase of testCases) {
    try {
      const requestData = {
        reportType: testCase.reportType,
        inputText: testCase.text,
        files: [],
        additionalInfo: {},
        options: { language: 'ja' }
      };

      const { response, data } = await makeRequest('/api/generate', requestData);
      
      logTest(
        `Text Input - ${testCase.name}`, 
        response.status === 200 && data.success === true,
        `Status: ${response.status}, Success: ${data.success}, Text length: ${testCase.text.length}`,
        '4.4'
      );
      
    } catch (error) {
      logTest(
        `Text Input - ${testCase.name}`, 
        false, 
        `Error: ${error.message}`,
        '4.4'
      );
    }
  }
}

async function testFileUploadProcessing() {
  console.log('\n📎 Testing file upload and processing...');
  
  // Create test files
  const testFiles = {
    textFile: {
      name: 'test-document.txt',
      type: 'text/plain',
      data: Buffer.from('これはテスト用のテキストファイルです。\n投資に関する情報が含まれています。').toString('base64')
    },
    pdfFile: {
      name: 'test-document.pdf',
      type: 'application/pdf',
      data: Buffer.from('%PDF-1.4 fake pdf content for testing').toString('base64')
    },
    imageFile: {
      name: 'test-image.jpg',
      type: 'image/jpeg',
      data: Buffer.from('fake jpeg content for testing').toString('base64')
    }
  };
  
  // Test individual file types
  for (const [fileType, fileData] of Object.entries(testFiles)) {
    try {
      const requestData = {
        reportType: 'jp_investment_4part',
        inputText: 'ファイルアップロードのテストです。',
        files: [fileData],
        additionalInfo: {},
        options: { language: 'ja' }
      };

      const { response, data } = await makeRequest('/api/generate', requestData);
      
      logTest(
        `File Upload - ${fileType}`, 
        response.status === 200,
        `Status: ${response.status}, File: ${fileData.name}`,
        '4.1, 4.2'
      );
      
    } catch (error) {
      logTest(
        `File Upload - ${fileType}`, 
        false, 
        `Error: ${error.message}`,
        '4.1, 4.2'
      );
    }
  }
  
  // Test multiple files
  try {
    const requestData = {
      reportType: 'custom',
      inputText: '複数ファイルのテストです。',
      files: Object.values(testFiles),
      additionalInfo: {},
      options: { language: 'ja' }
    };

    const { response, data } = await makeRequest('/api/generate', requestData);
    
    logTest(
      'File Upload - Multiple Files', 
      response.status === 200,
      `Status: ${response.status}, Files: ${Object.values(testFiles).length}`,
      '4.2'
    );
    
  } catch (error) {
    logTest(
      'File Upload - Multiple Files', 
      false, 
      `Error: ${error.message}`,
      '4.2'
    );
  }
}

async function testReportQualityAndFormatting() {
  console.log('\n🎨 Testing report quality and formatting...');
  
  try {
    const requestData = {
      reportType: 'jp_investment_4part',
      inputText: testData.textInputs.investment,
      files: [],
      additionalInfo: {
        riskTolerance: 'medium',
        investmentHorizon: '10years',
        currentAssets: '10000000'
      },
      options: { language: 'ja' }
    };

    const { response, data } = await makeRequest('/api/generate', requestData);
    
    if (response.status === 200 && data.report) {
      const report = data.report;
      
      // Test report structure
      logTest(
        'Report Quality - Structure', 
        report.content.includes('投資') && report.content.length > 500,
        `Content length: ${report.content.length}, Contains investment terms: ${report.content.includes('投資')}`,
        '5.1'
      );
      
      // Test Japanese language
      logTest(
        'Report Quality - Language', 
        /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(report.content),
        'Contains Japanese characters',
        '5.1'
      );
      
      // Test report title
      logTest(
        'Report Quality - Title', 
        report.title && report.title.length > 0,
        `Title: ${report.title}`,
        '5.1'
      );
      
      // Test usage information
      logTest(
        'Report Quality - Usage Info', 
        report.usage && report.usage.totalTokens > 0,
        `Total tokens: ${report.usage ? report.usage.totalTokens : 0}`,
        '5.1'
      );
      
    } else {
      logTest(
        'Report Quality - Generation Failed', 
        false, 
        `Status: ${response.status}, Error: ${data.error || 'Unknown error'}`,
        '5.1'
      );
    }
    
  } catch (error) {
    logTest(
      'Report Quality - Test Error', 
      false, 
      `Error: ${error.message}`,
      '5.1'
    );
  }
}

async function testAdditionalInfoProcessing() {
  console.log('\n📋 Testing additional info processing...');
  
  const testCases = [
    {
      name: 'Investment Additional Info',
      reportType: 'jp_investment_4part',
      additionalInfo: {
        age: 35,
        income: 8000000,
        savings: 10000000,
        riskTolerance: 'medium',
        investmentGoal: 'retirement'
      }
    },
    {
      name: 'Tax Strategy Additional Info',
      reportType: 'jp_tax_strategy',
      additionalInfo: {
        businessType: 'individual',
        annualIncome: 12000000,
        currentTaxRate: 0.33,
        investmentBudget: 5000000
      }
    }
  ];
  
  for (const testCase of testCases) {
    try {
      const requestData = {
        reportType: testCase.reportType,
        inputText: 'Additional info processing test',
        files: [],
        additionalInfo: testCase.additionalInfo,
        options: { language: 'ja' }
      };

      const { response, data } = await makeRequest('/api/generate', requestData);
      
      logTest(
        `Additional Info - ${testCase.name}`, 
        response.status === 200 && data.success === true,
        `Status: ${response.status}, Info fields: ${Object.keys(testCase.additionalInfo).length}`,
        '4.4'
      );
      
    } catch (error) {
      logTest(
        `Additional Info - ${testCase.name}`, 
        false, 
        `Error: ${error.message}`,
        '4.4'
      );
    }
  }
}

// Main test execution
async function runTask51Tests() {
  console.log('🧪 Task 5.1: Testing Report Generation Functionality');
  console.log('=' .repeat(60));
  console.log(`Testing against: ${BASE_URL}`);
  console.log(`Test started at: ${new Date().toISOString()}`);
  
  try {
    // Run all test suites
    await testBasicReportGeneration();
    await testTextOnlyInput();
    await testFileUploadProcessing();
    await testReportQualityAndFormatting();
    await testAdditionalInfoProcessing();
    
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
  runTask51Tests,
  testResults,
  logTest,
  makeRequest
};

// Run tests if called directly
const isMainModule = import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMainModule) {
  console.log('Starting Task 5.1 tests...');
  runTask51Tests().then(success => {
    console.log(`Task 5.1 completed with success: ${success}`);
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Task 5.1 failed:', error);
    process.exit(1);
  });
}