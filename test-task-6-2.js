#!/usr/bin/env node

/**
 * Task 6.2: Test Report Generation Functionality
 * 
 * Tests:
 * - Verify authenticated users can generate reports
 * - Test file upload and processing
 * - Validate error handling for report generation failures
 * 
 * Requirements: 3.1, 3.2, 3.3
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';

const BASE_URL = 'http://localhost:3005';
const TEST_RESULTS = [];

function logTest(name, passed, message = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const fullMessage = `${status}: ${name}${message ? ' - ' + message : ''}`;
  console.log(fullMessage);
  
  TEST_RESULTS.push({ name, passed, message });
}

async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  return {
    response,
    data: response.headers.get('content-type')?.includes('application/json') 
      ? await response.json().catch(() => ({}))
      : await response.text()
  };
}

async function authenticateUser() {
  const { response, data } = await makeRequest('/api/auth/login-firebase', {
    method: 'POST',
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'testpassword123'
    })
  });
  
  if (response.status === 200 && data.success) {
    const cookies = response.headers.get('set-cookie');
    return cookies ? cookies.split(';')[0] : null;
  }
  return null;
}

async function testBasicReportGeneration(cookie) {
  console.log('\n📄 Testing basic report generation...');
  
  const { response, data } = await makeRequest('/api/generate-firebase', {
    method: 'POST',
    headers: {
      'Cookie': cookie
    },
    body: JSON.stringify({
      reportType: 'jp_investment_4part',
      inputText: 'Test investment analysis for property worth ¥50,000,000',
      files: [],
      options: { language: 'ja' }
    })
  });
  
  logTest('Report generation returns 200', response.status === 200);
  logTest('Response has success field', data.success === true);
  logTest('Response contains content', data.content && data.content.length > 0);
  logTest('Response includes usage data', data.usage && typeof data.usage.totalTokens === 'number');
  logTest('Content includes expected sections', data.content && data.content.includes('Executive Summary'));
}

async function testDifferentReportTypes(cookie) {
  console.log('\n📊 Testing different report types...');
  
  const reportTypes = [
    'jp_tax_strategy',
    'jp_inheritance_strategy',
    'custom'
  ];
  
  for (const reportType of reportTypes) {
    const requestData = {
      reportType,
      inputText: `Test content for ${reportType}`,
      files: [],
      options: { language: 'ja' }
    };
    
    if (reportType === 'custom') {
      requestData.customPrompt = 'Create a brief analysis report';
    }
    
    const { response, data } = await makeRequest('/api/generate-firebase', {
      method: 'POST',
      headers: {
        'Cookie': cookie
      },
      body: JSON.stringify(requestData)
    });
    
    logTest(`${reportType} generation works`, response.status === 200 && data.success);
    logTest(`${reportType} returns content`, data.content && data.content.length > 0);
  }
}

async function testFileUpload(cookie) {
  console.log('\n📎 Testing file upload processing...');
  
  // Create mock file data
  const mockFile = {
    name: 'test-document.pdf',
    type: 'application/pdf',
    data: Buffer.from('Mock PDF content').toString('base64')
  };
  
  const { response, data } = await makeRequest('/api/generate-firebase', {
    method: 'POST',
    headers: {
      'Cookie': cookie
    },
    body: JSON.stringify({
      reportType: 'jp_investment_4part',
      inputText: 'Analyze the uploaded document',
      files: [mockFile],
      options: { language: 'ja' }
    })
  });
  
  logTest('File upload processing works', response.status === 200);
  logTest('File upload returns content', data.success && data.content);
  logTest('Content mentions file analysis', data.content && data.content.includes('添付ファイル'));
}

async function testErrorHandling() {
  console.log('\n❌ Testing error handling...');
  
  // Test unauthenticated request
  const { response: unauthResponse } = await makeRequest('/api/generate-firebase', {
    method: 'POST',
    body: JSON.stringify({
      reportType: 'jp_investment_4part',
      inputText: 'Test without auth'
    })
  });
  
  logTest('Unauthenticated request rejected', unauthResponse.status === 401);
  
  // Test with authenticated user but invalid data
  const cookie = await authenticateUser();
  
  const { response: invalidResponse } = await makeRequest('/api/generate-firebase', {
    method: 'POST',
    headers: {
      'Cookie': cookie
    },
    body: JSON.stringify({
      // Missing reportType
      inputText: 'Test with missing report type'
    })
  });
  
  logTest('Invalid request data rejected', invalidResponse.status === 400);
  
  // Test invalid HTTP method
  const { response: methodResponse } = await makeRequest('/api/generate-firebase', {
    method: 'GET',
    headers: {
      'Cookie': cookie
    }
  });
  
  logTest('Invalid HTTP method rejected', methodResponse.status === 405);
}

async function testInputValidation(cookie) {
  console.log('\n🔍 Testing input validation...');
  
  // Test empty input
  const { response: emptyResponse, data: emptyData } = await makeRequest('/api/generate-firebase', {
    method: 'POST',
    headers: {
      'Cookie': cookie
    },
    body: JSON.stringify({
      reportType: 'jp_investment_4part',
      inputText: '',
      files: []
    })
  });
  
  // Should still work with empty input (using report type template)
  logTest('Empty input handled gracefully', emptyResponse.status === 200);
  
  // Test very long input
  const longInput = 'A'.repeat(10000);
  const { response: longResponse } = await makeRequest('/api/generate-firebase', {
    method: 'POST',
    headers: {
      'Cookie': cookie
    },
    body: JSON.stringify({
      reportType: 'custom',
      customPrompt: 'Analyze this data',
      inputText: longInput,
      files: []
    })
  });
  
  logTest('Long input processed', longResponse.status === 200);
}

async function startMVPServer() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting MVP server...');
    
    const server = spawn('node', ['mvp-server.js'], {
      stdio: 'pipe'
    });
    
    server.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Ready for testing!')) {
        console.log('✅ MVP server started successfully');
        resolve(server);
      }
    });
    
    server.stderr.on('data', (data) => {
      console.error('Server error:', data.toString());
    });
    
    server.on('error', reject);
    
    // Timeout after 10 seconds
    setTimeout(() => {
      reject(new Error('Server startup timeout'));
    }, 10000);
  });
}

async function runTask62Tests() {
  console.log('🧪 Task 6.2: Testing Report Generation Functionality');
  console.log('=' .repeat(60));
  
  let server = null;
  
  try {
    // Start MVP server
    server = await startMVPServer();
    
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Authenticate user
    console.log('🔐 Authenticating test user...');
    const cookie = await authenticateUser();
    
    if (!cookie) {
      throw new Error('Failed to authenticate test user');
    }
    
    console.log('✅ Authentication successful');
    
    // Run tests
    await testBasicReportGeneration(cookie);
    await testDifferentReportTypes(cookie);
    await testFileUpload(cookie);
    await testErrorHandling();
    await testInputValidation(cookie);
    
    // Print summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 Task 6.2 Test Summary:');
    
    const passed = TEST_RESULTS.filter(t => t.passed).length;
    const failed = TEST_RESULTS.filter(t => t.passed === false).length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      TEST_RESULTS
        .filter(test => !test.passed)
        .forEach(test => console.log(`  - ${test.name}: ${test.message}`));
    }
    
    // Save results
    await fs.writeFile('task-6-2-results.json', JSON.stringify({
      task: '6.2 Test report generation functionality',
      timestamp: new Date().toISOString(),
      summary: { passed, failed, total: passed + failed },
      tests: TEST_RESULTS
    }, null, 2));
    
    console.log('\n📄 Results saved to: task-6-2-results.json');
    
    if (failed === 0) {
      console.log('\n🎉 Task 6.2 COMPLETED SUCCESSFULLY!');
    } else {
      console.log('\n⚠️  Task 6.2 completed with some failures');
    }
    
  } catch (error) {
    console.error('❌ Task 6.2 failed:', error.message);
  } finally {
    if (server) {
      console.log('\n🛑 Stopping MVP server...');
      server.kill();
    }
  }
}

// Run the tests
runTask62Tests().catch(console.error);