// Test script for report generation functionality
// This script tests the complete report generation flow including authentication,
// file upload, processing, and error handling

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword123';

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
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

// Helper function to create test files
function createTestFiles() {
  const testDir = './test-files';
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir);
  }

  // Create a simple text file to convert to PDF-like content
  const testTextContent = `
Test Document for Report Generation

This is a test document containing sample financial data:

Investment Portfolio:
- Stock A: $10,000 (20%)
- Stock B: $15,000 (30%)
- Bonds: $20,000 (40%)
- Cash: $5,000 (10%)

Total Portfolio Value: $50,000

Risk Assessment:
- Conservative allocation
- Diversified across asset classes
- Suitable for long-term growth

Recommendations:
1. Consider rebalancing quarterly
2. Monitor market conditions
3. Review allocation annually
`;

  fs.writeFileSync(path.join(testDir, 'test-document.txt'), testTextContent);

  // Create a simple image (1x1 pixel PNG)
  const pngBuffer = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
    0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x01, 0x5C, 0xC2, 0x8A, 0xBC, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);
  
  fs.writeFileSync(path.join(testDir, 'test-image.png'), pngBuffer);

  return {
    textFile: path.join(testDir, 'test-document.txt'),
    imageFile: path.join(testDir, 'test-image.png')
  };
}

// Helper function to authenticate and get token
async function authenticateUser() {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login-firebase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      })
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract token from Set-Cookie header
    const setCookieHeader = response.headers.get('set-cookie');
    let token = null;
    
    if (setCookieHeader) {
      const tokenMatch = setCookieHeader.match(/token=([^;]+)/);
      if (tokenMatch) {
        token = tokenMatch[1];
      }
    }

    return {
      success: data.success,
      token: token,
      user: data.user
    };
  } catch (error) {
    throw new Error(`Authentication error: ${error.message}`);
  }
}

// Test 1: Authentication and user profile
async function testAuthentication() {
  try {
    const authResult = await authenticateUser();
    
    if (authResult.success && authResult.token) {
      logTest('Authentication', true, 'User successfully authenticated');
      
      // Test user profile endpoint
      const profileResponse = await fetch(`${BASE_URL}/api/auth/me-firebase`, {
        method: 'GET',
        headers: {
          'Cookie': `token=${authResult.token}`
        }
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        logTest('User Profile', true, `Profile retrieved for ${profileData.user.email}`);
        return authResult.token;
      } else {
        logTest('User Profile', false, `Profile request failed: ${profileResponse.status}`);
        return authResult.token;
      }
    } else {
      logTest('Authentication', false, 'Failed to authenticate user');
      return null;
    }
  } catch (error) {
    logTest('Authentication', false, error.message);
    return null;
  }
}

// Test 2: Basic report generation with text input
async function testBasicReportGeneration(token) {
  try {
    const response = await fetch(`${BASE_URL}/api/generate-firebase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`
      },
      body: JSON.stringify({
        reportType: 'jp_investment_4part',
        inputText: 'テスト用の投資分析レポートを生成してください。ポートフォリオには株式50%、債券30%、現金20%が含まれています。',
        files: [],
        additionalInfo: null
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.content) {
        logTest('Basic Report Generation', true, `Report generated with ${data.content.length} characters`);
        return true;
      } else {
        logTest('Basic Report Generation', false, 'Response missing content');
        return false;
      }
    } else {
      const errorData = await response.json().catch(() => ({}));
      logTest('Basic Report Generation', false, `HTTP ${response.status}: ${errorData.error || response.statusText}`);
      return false;
    }
  } catch (error) {
    logTest('Basic Report Generation', false, error.message);
    return false;
  }
}

// Test 3: Custom prompt report generation
async function testCustomPromptGeneration(token) {
  try {
    const customPrompt = `
あなたは金融アドバイザーです。以下の情報を基に、簡潔な投資レポートを作成してください：

1. 現在の市場状況の分析
2. リスク評価
3. 推奨事項

レポートは日本語で、専門的でありながら理解しやすい内容にしてください。
`;

    const response = await fetch(`${BASE_URL}/api/generate-firebase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`
      },
      body: JSON.stringify({
        reportType: 'custom',
        customPrompt: customPrompt,
        inputText: '現在の投資ポートフォリオ：株式60%、債券25%、不動産15%',
        files: [],
        additionalInfo: null
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.content) {
        logTest('Custom Prompt Generation', true, `Custom report generated with ${data.content.length} characters`);
        return true;
      } else {
        logTest('Custom Prompt Generation', false, 'Response missing content');
        return false;
      }
    } else {
      const errorData = await response.json().catch(() => ({}));
      logTest('Custom Prompt Generation', false, `HTTP ${response.status}: ${errorData.error || response.statusText}`);
      return false;
    }
  } catch (error) {
    logTest('Custom Prompt Generation', false, error.message);
    return false;
  }
}

// Test 4: File upload and processing
async function testFileUploadProcessing(token) {
  try {
    const testFiles = createTestFiles();
    
    // Test with text file (simulating PDF content)
    const textContent = fs.readFileSync(testFiles.textFile, 'utf8');
    const textFileBase64 = Buffer.from(textContent).toString('base64');
    
    // Test with image file
    const imageBuffer = fs.readFileSync(testFiles.imageFile);
    const imageFileBase64 = imageBuffer.toString('base64');

    const response = await fetch(`${BASE_URL}/api/generate-firebase`, {
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
            data: textFileBase64
          },
          {
            name: 'test-image.png',
            type: 'image/png',
            data: imageFileBase64
          }
        ],
        additionalInfo: null
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.content) {
        logTest('File Upload Processing', true, `Report with files generated (${data.content.length} chars)`);
        return true;
      } else {
        logTest('File Upload Processing', false, 'Response missing content');
        return false;
      }
    } else {
      const errorData = await response.json().catch(() => ({}));
      logTest('File Upload Processing', false, `HTTP ${response.status}: ${errorData.error || response.statusText}`);
      return false;
    }
  } catch (error) {
    logTest('File Upload Processing', false, error.message);
    return false;
  }
}

// Test 5: Error handling - Invalid report type
async function testInvalidReportType(token) {
  try {
    const response = await fetch(`${BASE_URL}/api/generate-firebase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`
      },
      body: JSON.stringify({
        reportType: 'invalid_report_type',
        inputText: 'Test input',
        files: [],
        additionalInfo: null
      })
    });

    if (response.status === 400) {
      const errorData = await response.json();
      if (errorData.error && errorData.error.includes('Invalid report type')) {
        logTest('Invalid Report Type Error', true, 'Correctly rejected invalid report type');
        return true;
      } else {
        logTest('Invalid Report Type Error', false, 'Wrong error message for invalid report type');
        return false;
      }
    } else {
      logTest('Invalid Report Type Error', false, `Expected 400 status, got ${response.status}`);
      return false;
    }
  } catch (error) {
    logTest('Invalid Report Type Error', false, error.message);
    return false;
  }
}

// Test 6: Error handling - Missing custom prompt
async function testMissingCustomPrompt(token) {
  try {
    const response = await fetch(`${BASE_URL}/api/generate-firebase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`
      },
      body: JSON.stringify({
        reportType: 'custom',
        inputText: 'Test input',
        files: [],
        additionalInfo: null
        // Missing customPrompt
      })
    });

    if (response.status === 400) {
      const errorData = await response.json();
      if (errorData.error && errorData.error.includes('Custom prompt is required')) {
        logTest('Missing Custom Prompt Error', true, 'Correctly rejected missing custom prompt');
        return true;
      } else {
        logTest('Missing Custom Prompt Error', false, 'Wrong error message for missing custom prompt');
        return false;
      }
    } else {
      logTest('Missing Custom Prompt Error', false, `Expected 400 status, got ${response.status}`);
      return false;
    }
  } catch (error) {
    logTest('Missing Custom Prompt Error', false, error.message);
    return false;
  }
}

// Test 7: Error handling - No input provided
async function testNoInputProvided(token) {
  try {
    const response = await fetch(`${BASE_URL}/api/generate-firebase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`
      },
      body: JSON.stringify({
        reportType: 'jp_investment_4part',
        inputText: '', // Empty input
        files: [], // No files
        additionalInfo: null
      })
    });

    if (response.status === 400) {
      const errorData = await response.json();
      if (errorData.error && (errorData.error.includes('テキストまたはファイルを入力してください') || errorData.code === 'NO_INPUT_PROVIDED')) {
        logTest('No Input Provided Error', true, 'Correctly rejected empty input');
        return true;
      } else {
        logTest('No Input Provided Error', false, 'Wrong error message for empty input');
        return false;
      }
    } else {
      logTest('No Input Provided Error', false, `Expected 400 status, got ${response.status}`);
      return false;
    }
  } catch (error) {
    logTest('No Input Provided Error', false, error.message);
    return false;
  }
}

// Test 8: Error handling - Unauthenticated request
async function testUnauthenticatedRequest() {
  try {
    const response = await fetch(`${BASE_URL}/api/generate-firebase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // No authentication token
      },
      body: JSON.stringify({
        reportType: 'jp_investment_4part',
        inputText: 'Test input',
        files: [],
        additionalInfo: null
      })
    });

    if (response.status === 401) {
      const errorData = await response.json();
      if (errorData.error && errorData.error.includes('Authentication required')) {
        logTest('Unauthenticated Request Error', true, 'Correctly rejected unauthenticated request');
        return true;
      } else {
        logTest('Unauthenticated Request Error', false, 'Wrong error message for unauthenticated request');
        return false;
      }
    } else {
      logTest('Unauthenticated Request Error', false, `Expected 401 status, got ${response.status}`);
      return false;
    }
  } catch (error) {
    logTest('Unauthenticated Request Error', false, error.message);
    return false;
  }
}

// Test 9: File size validation
async function testFileSizeValidation(token) {
  try {
    // Create a large file (over 4.5MB limit)
    const largeFileContent = 'A'.repeat(5 * 1024 * 1024); // 5MB of 'A' characters
    const largeFileBase64 = Buffer.from(largeFileContent).toString('base64');

    const response = await fetch(`${BASE_URL}/api/generate-firebase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`
      },
      body: JSON.stringify({
        reportType: 'jp_investment_4part',
        inputText: 'Test with large file',
        files: [
          {
            name: 'large-file.txt',
            type: 'text/plain',
            data: largeFileBase64
          }
        ],
        additionalInfo: null
      })
    });

    if (response.status === 400) {
      const errorData = await response.json();
      if (errorData.error && errorData.error.includes('exceeds 4.5MB limit')) {
        logTest('File Size Validation', true, 'Correctly rejected oversized file');
        return true;
      } else {
        logTest('File Size Validation', false, 'Wrong error message for oversized file');
        return false;
      }
    } else {
      logTest('File Size Validation', false, `Expected 400 status, got ${response.status}`);
      return false;
    }
  } catch (error) {
    logTest('File Size Validation', false, error.message);
    return false;
  }
}

// Test 10: Unsupported file type
async function testUnsupportedFileType(token) {
  try {
    // Create a fake file with unsupported type
    const fakeFileContent = 'This is a fake executable file';
    const fakeFileBase64 = Buffer.from(fakeFileContent).toString('base64');

    const response = await fetch(`${BASE_URL}/api/generate-firebase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`
      },
      body: JSON.stringify({
        reportType: 'jp_investment_4part',
        inputText: 'Test with unsupported file',
        files: [
          {
            name: 'malicious.exe',
            type: 'application/x-executable',
            data: fakeFileBase64
          }
        ],
        additionalInfo: null
      })
    });

    if (response.status === 400) {
      const errorData = await response.json();
      if (errorData.error && errorData.error.includes('Unsupported file type')) {
        logTest('Unsupported File Type', true, 'Correctly rejected unsupported file type');
        return true;
      } else {
        logTest('Unsupported File Type', false, 'Wrong error message for unsupported file type');
        return false;
      }
    } else {
      logTest('Unsupported File Type', false, `Expected 400 status, got ${response.status}`);
      return false;
    }
  } catch (error) {
    logTest('Unsupported File Type', false, error.message);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Report Generation Functionality Tests');
  console.log('=' .repeat(60));
  
  // Test authentication first
  const token = await testAuthentication();
  
  if (!token) {
    console.log('❌ Cannot proceed with tests - authentication failed');
    return;
  }

  // Run all report generation tests
  await testBasicReportGeneration(token);
  await testCustomPromptGeneration(token);
  await testFileUploadProcessing(token);
  
  // Run error handling tests
  await testInvalidReportType(token);
  await testMissingCustomPrompt(token);
  await testNoInputProvided(token);
  await testUnauthenticatedRequest();
  await testFileSizeValidation(token);
  await testUnsupportedFileType(token);

  // Clean up test files
  try {
    if (fs.existsSync('./test-files')) {
      fs.rmSync('./test-files', { recursive: true, force: true });
    }
  } catch (error) {
    console.log('Warning: Could not clean up test files:', error.message);
  }

  // Print summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Test Summary');
  console.log('=' .repeat(60));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.tests
      .filter(test => !test.passed)
      .forEach(test => {
        console.log(`  - ${test.testName}: ${test.message}`);
      });
  }

  // Save detailed results to file
  const reportPath = './test-report-generation-results.json';
  fs.writeFileSync(reportPath, JSON.stringify({
    summary: {
      passed: testResults.passed,
      failed: testResults.failed,
      total: testResults.passed + testResults.failed,
      successRate: ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1) + '%'
    },
    tests: testResults.tests,
    timestamp: new Date().toISOString()
  }, null, 2));

  console.log(`\n📄 Detailed results saved to: ${reportPath}`);
  
  return testResults.failed === 0;
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner error:', error);
      process.exit(1);
    });
}

export default runAllTests;