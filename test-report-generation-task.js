// Task 6.2: Test report generation functionality
// This script tests authenticated users can generate reports, file upload processing, and error handling

import http from 'http';
import https from 'https';
import { Buffer } from 'buffer';

// Configuration - using actual admin credentials
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = 'yamanami-ryo@heya.co.jp'; // Admin user from initialization
const TEST_PASSWORD = 'admin123'; // Default admin password

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

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

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData,
            rawData: data
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: {},
            rawData: data
          });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

// Test 1: Authenticate user (Requirement 3.1 - authenticated users can generate reports)
async function testAuthentication() {
  try {
    console.log('Testing user authentication...');
    
    const response = await makeRequest(`${BASE_URL}/api/auth/login-firebase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      })
    });

    if (response.status === 200 && response.data.success) {
      // Extract token from Set-Cookie header
      const setCookieHeader = response.headers['set-cookie'];
      let token = null;
      
      if (setCookieHeader) {
        const cookieString = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
        const tokenMatch = cookieString.match(/token=([^;]+)/);
        if (tokenMatch) {
          token = tokenMatch[1];
        }
      }

      if (token) {
        logTest('User Authentication', true, `Admin user authenticated successfully`);
        return token;
      } else {
        logTest('User Authentication', false, 'No authentication token received');
        return null;
      }
    } else {
      logTest('User Authentication', false, `Status: ${response.status}, Error: ${response.data.error || 'Unknown error'}`);
      return null;
    }
  } catch (error) {
    logTest('User Authentication', false, error.message);
    return null;
  }
}

// Test 2: Basic report generation (Requirement 3.1 - authenticated users can generate reports)
async function testBasicReportGeneration(token) {
  try {
    console.log('Testing basic report generation...');
    
    const response = await makeRequest(`${BASE_URL}/api/generate-firebase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`
      },
      body: JSON.stringify({
        reportType: 'jp_investment_4part',
        inputText: 'テスト用の投資分析レポートを生成してください。ポートフォリオには株式50%、債券30%、現金20%が含まれています。リスク評価と推奨事項を含めてください。',
        files: []
      })
    });

    if (response.status === 200 && response.data.success && response.data.content) {
      logTest('Basic Report Generation', true, `Generated report with ${response.data.content.length} characters`);
      return true;
    } else {
      logTest('Basic Report Generation', false, `Status: ${response.status}, Error: ${response.data.error || 'No content generated'}`);
      return false;
    }
  } catch (error) {
    logTest('Basic Report Generation', false, error.message);
    return false;
  }
}

// Test 3: Custom prompt report generation (Requirement 3.1)
async function testCustomPromptGeneration(token) {
  try {
    console.log('Testing custom prompt report generation...');
    
    const customPrompt = `あなたは経験豊富な金融アドバイザーです。以下の情報を基に、包括的な投資レポートを日本語で作成してください：

1. 現在の市場状況の分析
2. ポートフォリオのリスク評価
3. 具体的な推奨事項
4. 今後の戦略

レポートは専門的でありながら、クライアントが理解しやすい内容にしてください。`;

    const response = await makeRequest(`${BASE_URL}/api/generate-firebase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`
      },
      body: JSON.stringify({
        reportType: 'custom',
        customPrompt: customPrompt,
        inputText: '現在の投資ポートフォリオ：株式60%（国内30%、海外30%）、債券25%、不動産15%。年齢45歳、投資経験10年、リスク許容度は中程度。',
        files: []
      })
    });

    if (response.status === 200 && response.data.success && response.data.content) {
      logTest('Custom Prompt Generation', true, `Generated custom report with ${response.data.content.length} characters`);
      return true;
    } else {
      logTest('Custom Prompt Generation', false, `Status: ${response.status}, Error: ${response.data.error || 'No content generated'}`);
      return false;
    }
  } catch (error) {
    logTest('Custom Prompt Generation', false, error.message);
    return false;
  }
}

// Test 4: File upload and processing (Requirement 3.2 - test file upload and processing)
async function testFileUploadProcessing(token) {
  try {
    console.log('Testing file upload and processing...');
    
    // Create test file content simulating financial document
    const testFileContent = `Financial Portfolio Analysis Report

Current Holdings:
- Technology Stocks: ¥5,000,000 (25%)
- Healthcare Stocks: ¥3,000,000 (15%)
- Government Bonds: ¥6,000,000 (30%)
- Corporate Bonds: ¥2,000,000 (10%)
- Real Estate Investment: ¥3,000,000 (15%)
- Cash and Equivalents: ¥1,000,000 (5%)

Total Portfolio Value: ¥20,000,000

Performance Summary:
- YTD Return: +8.5%
- 3-Year Average: +6.2%
- Risk Level: Moderate
- Sharpe Ratio: 1.15

Market Outlook:
The current market conditions show moderate volatility with opportunities in emerging technologies and sustainable investments.

Recommendations:
1. Consider rebalancing to increase international exposure
2. Evaluate ESG investment opportunities
3. Review bond duration in current interest rate environment
4. Maintain emergency cash reserves at current level`;

    const fileBase64 = Buffer.from(testFileContent).toString('base64');

    const response = await makeRequest(`${BASE_URL}/api/generate-firebase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`
      },
      body: JSON.stringify({
        reportType: 'jp_investment_4part',
        inputText: 'アップロードされたポートフォリオ分析レポートを基に、詳細な投資戦略レポートを作成してください。現在の保有状況を分析し、改善提案を含めてください。',
        files: [
          {
            name: 'portfolio-analysis.txt',
            type: 'text/plain',
            data: fileBase64
          }
        ]
      })
    });

    if (response.status === 200 && response.data.success && response.data.content) {
      logTest('File Upload Processing', true, `Processed uploaded file and generated ${response.data.content.length} character report`);
      return true;
    } else {
      logTest('File Upload Processing', false, `Status: ${response.status}, Error: ${response.data.error || 'Failed to process file'}`);
      return false;
    }
  } catch (error) {
    logTest('File Upload Processing', false, error.message);
    return false;
  }
}

// Test 5: Multiple file upload processing
async function testMultipleFileUpload(token) {
  try {
    console.log('Testing multiple file upload processing...');
    
    // Create first test file - financial data
    const financialData = `Q3 2024 Financial Summary
Revenue: ¥15,000,000
Expenses: ¥12,000,000
Net Income: ¥3,000,000
Cash Flow: ¥2,500,000`;

    // Create second test file - market analysis
    const marketAnalysis = `Market Analysis Q3 2024
Nikkei 225: +12.5% YTD
TOPIX: +8.9% YTD
USD/JPY: 149.50 (stable)
10Y JGB Yield: 0.75%
Sector Performance:
- Technology: +15.2%
- Healthcare: +7.8%
- Finance: +5.1%`;

    const file1Base64 = Buffer.from(financialData).toString('base64');
    const file2Base64 = Buffer.from(marketAnalysis).toString('base64');

    const response = await makeRequest(`${BASE_URL}/api/generate-firebase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`
      },
      body: JSON.stringify({
        reportType: 'jp_investment_4part',
        inputText: '提供された財務データと市場分析を統合して、包括的な投資戦略レポートを作成してください。',
        files: [
          {
            name: 'financial-summary.txt',
            type: 'text/plain',
            data: file1Base64
          },
          {
            name: 'market-analysis.txt',
            type: 'text/plain',
            data: file2Base64
          }
        ]
      })
    });

    if (response.status === 200 && response.data.success && response.data.content) {
      logTest('Multiple File Upload', true, `Processed 2 files and generated ${response.data.content.length} character report`);
      return true;
    } else {
      logTest('Multiple File Upload', false, `Status: ${response.status}, Error: ${response.data.error || 'Failed to process multiple files'}`);
      return false;
    }
  } catch (error) {
    logTest('Multiple File Upload', false, error.message);
    return false;
  }
}

// Test 6: Error handling - Invalid report type (Requirement 3.3 - validate error handling)
async function testInvalidReportType(token) {
  try {
    console.log('Testing invalid report type error handling...');
    
    const response = await makeRequest(`${BASE_URL}/api/generate-firebase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`
      },
      body: JSON.stringify({
        reportType: 'invalid_report_type_test',
        inputText: 'Test input for invalid report type',
        files: []
      })
    });

    if (response.status === 400 && response.data.error && response.data.error.includes('Invalid report type')) {
      logTest('Invalid Report Type Error', true, 'Correctly rejected invalid report type');
      return true;
    } else {
      logTest('Invalid Report Type Error', false, `Expected 400 with invalid report type error, got ${response.status}: ${response.data.error}`);
      return false;
    }
  } catch (error) {
    logTest('Invalid Report Type Error', false, error.message);
    return false;
  }
}

// Test 7: Error handling - Missing custom prompt (Requirement 3.3)
async function testMissingCustomPrompt(token) {
  try {
    console.log('Testing missing custom prompt error handling...');
    
    const response = await makeRequest(`${BASE_URL}/api/generate-firebase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`
      },
      body: JSON.stringify({
        reportType: 'custom',
        inputText: 'Test input without custom prompt',
        files: []
        // Missing customPrompt field
      })
    });

    if (response.status === 400 && response.data.error && response.data.error.includes('Custom prompt is required')) {
      logTest('Missing Custom Prompt Error', true, 'Correctly rejected missing custom prompt');
      return true;
    } else {
      logTest('Missing Custom Prompt Error', false, `Expected 400 with custom prompt error, got ${response.status}: ${response.data.error}`);
      return false;
    }
  } catch (error) {
    logTest('Missing Custom Prompt Error', false, error.message);
    return false;
  }
}

// Test 8: Error handling - No input provided (Requirement 3.3)
async function testNoInputProvided(token) {
  try {
    console.log('Testing no input provided error handling...');
    
    const response = await makeRequest(`${BASE_URL}/api/generate-firebase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`
      },
      body: JSON.stringify({
        reportType: 'jp_investment_4part',
        inputText: '', // Empty input
        files: [] // No files
      })
    });

    if (response.status === 400 && response.data.error && 
        (response.data.error.includes('テキストまたはファイルを入力してください') || response.data.code === 'NO_INPUT_PROVIDED')) {
      logTest('No Input Provided Error', true, 'Correctly rejected empty input');
      return true;
    } else {
      logTest('No Input Provided Error', false, `Expected 400 with no input error, got ${response.status}: ${response.data.error}`);
      return false;
    }
  } catch (error) {
    logTest('No Input Provided Error', false, error.message);
    return false;
  }
}

// Test 9: Error handling - Unauthenticated request (Requirement 3.3)
async function testUnauthenticatedRequest() {
  try {
    console.log('Testing unauthenticated request error handling...');
    
    const response = await makeRequest(`${BASE_URL}/api/generate-firebase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // No authentication token
      },
      body: JSON.stringify({
        reportType: 'jp_investment_4part',
        inputText: 'Test input without authentication',
        files: []
      })
    });

    if (response.status === 401 && response.data.error && response.data.error.includes('Authentication required')) {
      logTest('Unauthenticated Request Error', true, 'Correctly rejected unauthenticated request');
      return true;
    } else {
      logTest('Unauthenticated Request Error', false, `Expected 401 with auth error, got ${response.status}: ${response.data.error}`);
      return false;
    }
  } catch (error) {
    logTest('Unauthenticated Request Error', false, error.message);
    return false;
  }
}

// Test 10: Error handling - File size validation (Requirement 3.3)
async function testFileSizeValidation(token) {
  try {
    console.log('Testing file size validation...');
    
    // Create a file that exceeds the 4.5MB limit (create 5MB of data)
    const largeContent = 'A'.repeat(5 * 1024 * 1024); // 5MB of 'A' characters
    const largeFileBase64 = Buffer.from(largeContent).toString('base64');

    const response = await makeRequest(`${BASE_URL}/api/generate-firebase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`
      },
      body: JSON.stringify({
        reportType: 'jp_investment_4part',
        inputText: 'Test with oversized file',
        files: [
          {
            name: 'large-file.txt',
            type: 'text/plain',
            data: largeFileBase64
          }
        ]
      })
    });

    if (response.status === 400 && response.data.error && response.data.error.includes('exceeds 4.5MB limit')) {
      logTest('File Size Validation', true, 'Correctly rejected oversized file');
      return true;
    } else {
      logTest('File Size Validation', false, `Expected 400 with file size error, got ${response.status}: ${response.data.error}`);
      return false;
    }
  } catch (error) {
    logTest('File Size Validation', false, error.message);
    return false;
  }
}

// Test 11: Error handling - Unsupported file type (Requirement 3.3)
async function testUnsupportedFileType(token) {
  try {
    console.log('Testing unsupported file type error handling...');
    
    // Create a fake executable file
    const fakeExeContent = 'This is a fake executable file content';
    const fakeExeBase64 = Buffer.from(fakeExeContent).toString('base64');

    const response = await makeRequest(`${BASE_URL}/api/generate-firebase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`
      },
      body: JSON.stringify({
        reportType: 'jp_investment_4part',
        inputText: 'Test with unsupported file type',
        files: [
          {
            name: 'malicious.exe',
            type: 'application/x-executable',
            data: fakeExeBase64
          }
        ]
      })
    });

    if (response.status === 400 && response.data.error && response.data.error.includes('Unsupported file type')) {
      logTest('Unsupported File Type', true, 'Correctly rejected unsupported file type');
      return true;
    } else {
      logTest('Unsupported File Type', false, `Expected 400 with unsupported file error, got ${response.status}: ${response.data.error}`);
      return false;
    }
  } catch (error) {
    logTest('Unsupported File Type', false, error.message);
    return false;
  }
}

// Main test runner
async function runReportGenerationTests() {
  console.log('🚀 Starting Report Generation Functionality Tests (Task 6.2)');
  console.log('=' .repeat(70));
  console.log('Testing Requirements 3.1, 3.2, and 3.3 from the specification');
  console.log('=' .repeat(70));
  
  // Test authentication first
  const token = await testAuthentication();
  
  if (!token) {
    console.log('❌ Cannot proceed with tests - authentication failed');
    console.log('Please ensure the server is running and admin user is properly configured');
    return false;
  }

  // Test core functionality (Requirements 3.1 and 3.2)
  await testBasicReportGeneration(token);
  await testCustomPromptGeneration(token);
  await testFileUploadProcessing(token);
  await testMultipleFileUpload(token);
  
  // Test error handling (Requirement 3.3)
  await testInvalidReportType(token);
  await testMissingCustomPrompt(token);
  await testNoInputProvided(token);
  await testUnauthenticatedRequest();
  await testFileSizeValidation(token);
  await testUnsupportedFileType(token);

  // Print summary
  console.log('\n' + '=' .repeat(70));
  console.log('📊 Task 6.2 Test Summary');
  console.log('=' .repeat(70));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  // Print requirement coverage
  console.log('\n📋 Requirement Coverage:');
  console.log('- Requirement 3.1 (Authenticated users can generate reports): ✅ Tested');
  console.log('- Requirement 3.2 (File upload and processing): ✅ Tested');
  console.log('- Requirement 3.3 (Error handling for report generation failures): ✅ Tested');
  
  const allTestsPassed = testResults.failed === 0;
  
  if (allTestsPassed) {
    console.log('\n🎉 All tests passed! Report generation functionality is working correctly.');
    console.log('✅ Task 6.2 completed successfully');
  } else {
    console.log('\n⚠️  Some tests failed. Details:');
    testResults.tests
      .filter(test => !test.passed)
      .forEach(test => {
        console.log(`  - ${test.testName}: ${test.message}`);
      });
  }

  return allTestsPassed;
}

// Run the tests
runReportGenerationTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });