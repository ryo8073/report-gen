// Simple test script for report generation functionality
// Tests the core functionality without complex dependencies

import http from 'http';
import https from 'https';
import { Buffer } from 'buffer';

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = process.env.TEST_EMAIL || 'admin@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'admin123';

// Test results
let testsPassed = 0;
let testsFailed = 0;

function logTest(testName, passed, message = '') {
  if (passed) {
    testsPassed++;
    console.log(`✅ ${testName}: PASSED ${message ? `- ${message}` : ''}`);
  } else {
    testsFailed++;
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

// Test authentication
async function testAuthentication() {
  try {
    console.log('Testing authentication...');
    
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
        logTest('Authentication', true, `Token obtained: ${token.substring(0, 20)}...`);
        return token;
      } else {
        logTest('Authentication', false, 'No token in response');
        return null;
      }
    } else {
      logTest('Authentication', false, `Status: ${response.status}, Message: ${response.data.error || 'Unknown error'}`);
      return null;
    }
  } catch (error) {
    logTest('Authentication', false, error.message);
    return null;
  }
}

// Test basic report generation
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
        inputText: 'テスト用の投資分析レポートを生成してください。ポートフォリオには株式50%、債券30%、現金20%が含まれています。',
        files: []
      })
    });

    if (response.status === 200 && response.data.success && response.data.content) {
      logTest('Basic Report Generation', true, `Generated ${response.data.content.length} characters`);
      return true;
    } else {
      logTest('Basic Report Generation', false, `Status: ${response.status}, Error: ${response.data.error || 'No content'}`);
      return false;
    }
  } catch (error) {
    logTest('Basic Report Generation', false, error.message);
    return false;
  }
}

// Test custom prompt generation
async function testCustomPromptGeneration(token) {
  try {
    console.log('Testing custom prompt generation...');
    
    const customPrompt = `あなたは金融アドバイザーです。以下の情報を基に、簡潔な投資レポートを作成してください：
1. 現在の市場状況の分析
2. リスク評価
3. 推奨事項
レポートは日本語で、専門的でありながら理解しやすい内容にしてください。`;

    const response = await makeRequest(`${BASE_URL}/api/generate-firebase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`
      },
      body: JSON.stringify({
        reportType: 'custom',
        customPrompt: customPrompt,
        inputText: '現在の投資ポートフォリオ：株式60%、債券25%、不動産15%',
        files: []
      })
    });

    if (response.status === 200 && response.data.success && response.data.content) {
      logTest('Custom Prompt Generation', true, `Generated ${response.data.content.length} characters`);
      return true;
    } else {
      logTest('Custom Prompt Generation', false, `Status: ${response.status}, Error: ${response.data.error || 'No content'}`);
      return false;
    }
  } catch (error) {
    logTest('Custom Prompt Generation', false, error.message);
    return false;
  }
}

// Test file upload with simple text file
async function testFileUpload(token) {
  try {
    console.log('Testing file upload processing...');
    
    // Create a simple test file content
    const testFileContent = `Test Financial Document
    
Investment Portfolio Analysis:
- Stock A: $10,000 (20%)
- Stock B: $15,000 (30%) 
- Bonds: $20,000 (40%)
- Cash: $5,000 (10%)

Total Portfolio Value: $50,000

Risk Assessment: Conservative allocation suitable for long-term growth.`;

    const fileBase64 = Buffer.from(testFileContent).toString('base64');

    const response = await makeRequest(`${BASE_URL}/api/generate-firebase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`
      },
      body: JSON.stringify({
        reportType: 'jp_investment_4part',
        inputText: 'アップロードされたファイルを分析して投資レポートを作成してください。',
        files: [
          {
            name: 'test-document.txt',
            type: 'text/plain',
            data: fileBase64
          }
        ]
      })
    });

    if (response.status === 200 && response.data.success && response.data.content) {
      logTest('File Upload Processing', true, `Processed file and generated ${response.data.content.length} characters`);
      return true;
    } else {
      logTest('File Upload Processing', false, `Status: ${response.status}, Error: ${response.data.error || 'No content'}`);
      return false;
    }
  } catch (error) {
    logTest('File Upload Processing', false, error.message);
    return false;
  }
}

// Test error handling - invalid report type
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
        reportType: 'invalid_type',
        inputText: 'Test input',
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

// Test error handling - missing custom prompt
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
        inputText: 'Test input',
        files: []
        // Missing customPrompt
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

// Test error handling - unauthenticated request
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
        inputText: 'Test input',
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

// Test error handling - no input provided
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

// Main test runner
async function runTests() {
  console.log('🚀 Starting Report Generation Functionality Tests');
  console.log('=' .repeat(60));
  
  // Test authentication first
  const token = await testAuthentication();
  
  if (!token) {
    console.log('❌ Cannot proceed with tests - authentication failed');
    console.log('Make sure the server is running and test credentials are correct');
    return false;
  }

  // Run core functionality tests
  await testBasicReportGeneration(token);
  await testCustomPromptGeneration(token);
  await testFileUpload(token);
  
  // Run error handling tests
  await testInvalidReportType(token);
  await testMissingCustomPrompt(token);
  await testUnauthenticatedRequest();
  await testNoInputProvided(token);

  // Print summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Test Summary');
  console.log('=' .repeat(60));
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  
  const allTestsPassed = testsFailed === 0;
  
  if (allTestsPassed) {
    console.log('\n🎉 All tests passed! Report generation functionality is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the error messages above.');
  }

  return allTestsPassed;
}

// Run tests
runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });