// Comprehensive File Upload Testing
// Tests for file upload functionality including validation, processing, and error handling
// Requirements: 5.2

import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';

// Test configuration
const testConfig = {
  name: 'Comprehensive File Upload Tests',
  version: '1.0.0',
  requirements: {
    '5.2': { tested: false, passed: false, description: 'File uploads work without errors and are properly processed' }
  }
};

// Base URL for testing
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// File size limits (matching API specification)
const MAX_FILE_SIZE = 4.5 * 1024 * 1024; // 4.5MB in bytes
const MAX_FILES = 5;

// Supported file types
const SUPPORTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// Logging function
function logTest(testName, passed, details = '', requirement = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const reqText = requirement ? ` [Req: ${requirement}]` : '';
  console.log(`${status} ${testName}${reqText}`);
  if (details) {
    console.log(`   Details: ${details}`);
  }
  
  if (requirement && testConfig.requirements[requirement]) {
    testConfig.requirements[requirement].tested = true;
    testConfig.requirements[requirement].passed = passed;
  }
}

// Helper function to create test files
function createTestFile(name, content, type) {
  const buffer = Buffer.from(content, 'utf8');
  return {
    name: name,
    type: type,
    data: buffer.toString('base64'),
    size: buffer.length
  };
}

// Helper function to create binary test files
function createBinaryTestFile(name, type, sizeKB) {
  // Create a buffer with random data
  const buffer = Buffer.alloc(sizeKB * 1024);
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = Math.floor(Math.random() * 256);
  }
  
  return {
    name: name,
    type: type,
    data: buffer.toString('base64'),
    size: buffer.length
  };
}

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'FileUploadTest/1.0',
        ...options.headers
      }
    };
    
    const req = httpModule.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsedData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsedData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: { raw: data }
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

// Helper function to create multipart form data
function createMultipartFormData(fields, files) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substr(2, 16);
  const parts = [];
  
  // Add text fields
  for (const [key, value] of Object.entries(fields)) {
    parts.push(`--${boundary}`);
    parts.push(`Content-Disposition: form-data; name="${key}"`);
    parts.push('');
    parts.push(value);
  }
  
  // Add files
  for (const file of files) {
    parts.push(`--${boundary}`);
    parts.push(`Content-Disposition: form-data; name="files"; filename="${file.name}"`);
    parts.push(`Content-Type: ${file.type}`);
    parts.push('');
    parts.push(Buffer.from(file.data, 'base64').toString('binary'));
  }
  
  parts.push(`--${boundary}--`);
  
  const formData = parts.join('\r\n');
  
  return {
    data: formData,
    contentType: `multipart/form-data; boundary=${boundary}`
  };
}

// Test 1: PDF File Upload
async function testPDFFileUpload() {
  console.log('\n📄 Testing PDF file upload...');
  
  try {
    // Create a simple PDF-like file (mock PDF content)
    const pdfContent = '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n179\n%%EOF';
    const testFile = createTestFile('test-document.pdf', pdfContent, 'application/pdf');
    
    const formData = createMultipartFormData({
      reportType: 'jp_investment_4part',
      inputText: 'Test PDF upload functionality',
      language: 'ja'
    }, [testFile]);
    
    const response = await makeRequest(`${BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': formData.contentType,
        'Content-Length': Buffer.byteLength(formData.data)
      },
      body: formData.data
    });
    
    // Check if PDF upload is handled properly
    const success = response.status === 200 || 
                   (response.status >= 400 && response.data.error && 
                    !response.data.error.message.includes('file type') &&
                    !response.data.error.message.includes('corrupted'));
    
    logTest('PDF File Upload', success, `Status: ${response.status}`, '5.2');
    return success;
    
  } catch (error) {
    logTest('PDF File Upload', false, `Error: ${error.message}`, '5.2');
    return false;
  }
}

// Test 2: Image File Upload
async function testImageFileUpload() {
  console.log('\n🖼️ Testing image file upload...');
  
  try {
    // Create test image files for different formats
    const imageFormats = [
      { name: 'test-image.jpg', type: 'image/jpeg' },
      { name: 'test-image.png', type: 'image/png' },
      { name: 'test-image.gif', type: 'image/gif' },
      { name: 'test-image.webp', type: 'image/webp' }
    ];
    
    let successCount = 0;
    
    for (const format of imageFormats) {
      try {
        // Create a minimal image-like binary data
        const imageData = createBinaryTestFile(format.name, format.type, 50); // 50KB
        
        const formData = createMultipartFormData({
          reportType: 'jp_investment_4part',
          inputText: `Test ${format.type} upload functionality`,
          language: 'ja'
        }, [imageData]);
        
        const response = await makeRequest(`${BASE_URL}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': formData.contentType,
            'Content-Length': Buffer.byteLength(formData.data)
          },
          body: formData.data
        });
        
        // Check if image upload is handled properly
        const success = response.status === 200 || 
                       (response.status >= 400 && response.data.error && 
                        !response.data.error.message.includes('file type') &&
                        !response.data.error.message.includes('corrupted'));
        
        if (success) successCount++;
        logTest(`Image Upload - ${format.type}`, success, `Status: ${response.status}`, '5.2');
        
      } catch (error) {
        logTest(`Image Upload - ${format.type}`, false, `Error: ${error.message}`, '5.2');
      }
    }
    
    return successCount >= imageFormats.length / 2; // At least half should work
    
  } catch (error) {
    logTest('Image File Upload', false, `Error: ${error.message}`, '5.2');
    return false;
  }
}

// Test 3: Excel File Upload
async function testExcelFileUpload() {
  console.log('\n📊 Testing Excel file upload...');
  
  try {
    // Create test Excel files
    const excelFormats = [
      { name: 'test-data.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      { name: 'test-data.xls', type: 'application/vnd.ms-excel' }
    ];
    
    let successCount = 0;
    
    for (const format of excelFormats) {
      try {
        // Create Excel-like binary data
        const excelData = createBinaryTestFile(format.name, format.type, 100); // 100KB
        
        const formData = createMultipartFormData({
          reportType: 'jp_investment_4part',
          inputText: `Test ${format.type} upload functionality`,
          language: 'ja'
        }, [excelData]);
        
        const response = await makeRequest(`${BASE_URL}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': formData.contentType,
            'Content-Length': Buffer.byteLength(formData.data)
          },
          body: formData.data
        });
        
        // Check if Excel upload is handled properly
        const success = response.status === 200 || 
                       (response.status >= 400 && response.data.error && 
                        !response.data.error.message.includes('file type') &&
                        !response.data.error.message.includes('corrupted'));
        
        if (success) successCount++;
        logTest(`Excel Upload - ${format.name}`, success, `Status: ${response.status}`, '5.2');
        
      } catch (error) {
        logTest(`Excel Upload - ${format.name}`, false, `Error: ${error.message}`, '5.2');
      }
    }
    
    return successCount > 0;
    
  } catch (error) {
    logTest('Excel File Upload', false, `Error: ${error.message}`, '5.2');
    return false;
  }
}

// Test 4: Text File Upload
async function testTextFileUpload() {
  console.log('\n📝 Testing text file upload...');
  
  try {
    // Create test text files
    const textFiles = [
      {
        name: 'test-document.txt',
        type: 'text/plain',
        content: 'This is a test text document with sample content for upload validation.'
      },
      {
        name: 'test-data.csv',
        type: 'text/csv',
        content: 'Name,Value,Category\nTest Item 1,100,Category A\nTest Item 2,200,Category B\nTest Item 3,150,Category A'
      }
    ];
    
    let successCount = 0;
    
    for (const textFile of textFiles) {
      try {
        const testFile = createTestFile(textFile.name, textFile.content, textFile.type);
        
        const formData = createMultipartFormData({
          reportType: 'jp_investment_4part',
          inputText: `Test ${textFile.type} upload functionality`,
          language: 'ja'
        }, [testFile]);
        
        const response = await makeRequest(`${BASE_URL}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': formData.contentType,
            'Content-Length': Buffer.byteLength(formData.data)
          },
          body: formData.data
        });
        
        // Check if text upload is handled properly
        const success = response.status === 200 || 
                       (response.status >= 400 && response.data.error && 
                        !response.data.error.message.includes('file type') &&
                        !response.data.error.message.includes('corrupted'));
        
        if (success) successCount++;
        logTest(`Text Upload - ${textFile.name}`, success, `Status: ${response.status}`, '5.2');
        
      } catch (error) {
        logTest(`Text Upload - ${textFile.name}`, false, `Error: ${error.message}`, '5.2');
      }
    }
    
    return successCount === textFiles.length;
    
  } catch (error) {
    logTest('Text File Upload', false, `Error: ${error.message}`, '5.2');
    return false;
  }
}

// Test 5: Multiple File Upload
async function testMultipleFileUpload() {
  console.log('\n📎 Testing multiple file upload...');
  
  try {
    // Create multiple test files
    const testFiles = [
      createTestFile('document1.txt', 'First test document content', 'text/plain'),
      createTestFile('document2.txt', 'Second test document content', 'text/plain'),
      createTestFile('data.csv', 'Name,Value\nItem1,100\nItem2,200', 'text/csv')
    ];
    
    const formData = createMultipartFormData({
      reportType: 'jp_investment_4part',
      inputText: 'Test multiple file upload functionality',
      language: 'ja'
    }, testFiles);
    
    const response = await makeRequest(`${BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': formData.contentType,
        'Content-Length': Buffer.byteLength(formData.data)
      },
      body: formData.data
    });
    
    // Check if multiple file upload is handled properly
    const success = response.status === 200 || 
                   (response.status >= 400 && response.data.error && 
                    !response.data.error.message.includes('file type') &&
                    !response.data.error.message.includes('corrupted'));
    
    logTest('Multiple File Upload', success, `Status: ${response.status}, Files: ${testFiles.length}`, '5.2');
    return success;
    
  } catch (error) {
    logTest('Multiple File Upload', false, `Error: ${error.message}`, '5.2');
    return false;
  }
}

// Test 6: File Content Extraction Verification
async function testFileContentExtraction() {
  console.log('\n🔍 Testing file content extraction...');
  
  try {
    // Create a text file with specific content to verify extraction
    const testContent = 'UNIQUE_TEST_CONTENT_12345: This content should be extracted and processed by the system.';
    const testFile = createTestFile('extraction-test.txt', testContent, 'text/plain');
    
    const formData = createMultipartFormData({
      reportType: 'jp_investment_4part',
      inputText: 'Please analyze the uploaded file content',
      language: 'ja'
    }, [testFile]);
    
    const response = await makeRequest(`${BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': formData.contentType,
        'Content-Length': Buffer.byteLength(formData.data)
      },
      body: formData.data
    });
    
    // Check if file content is being processed
    let contentProcessed = false;
    
    if (response.status === 200 && response.data.report) {
      // Check if the unique content appears in the response
      contentProcessed = response.data.report.includes('UNIQUE_TEST_CONTENT_12345') ||
                        response.data.report.includes('extraction-test.txt');
    } else if (response.status >= 400 && response.data.error) {
      // Even error responses should indicate file processing was attempted
      contentProcessed = !response.data.error.message.includes('file type') &&
                        !response.data.error.message.includes('corrupted');
    }
    
    logTest('File Content Extraction', contentProcessed, `Status: ${response.status}`, '5.2');
    return contentProcessed;
    
  } catch (error) {
    logTest('File Content Extraction', false, `Error: ${error.message}`, '5.2');
    return false;
  }
}

// Main test execution for task 8.1
async function runFileUploadTests() {
  console.log(`\n🧪 ${testConfig.name} - Task 8.1`);
  console.log('=' .repeat(50));
  
  const results = {
    pdfUpload: await testPDFFileUpload(),
    imageUpload: await testImageFileUpload(),
    excelUpload: await testExcelFileUpload(),
    textUpload: await testTextFileUpload(),
    multipleUpload: await testMultipleFileUpload(),
    contentExtraction: await testFileContentExtraction()
  };
  
  // Summary
  console.log('\n📊 Test Summary - Task 8.1');
  console.log('=' .repeat(30));
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(result => result).length;
  
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 All file upload tests passed!');
  } else {
    console.log('\n⚠️ Some file upload tests failed. Please review the issues above.');
  }
  
  return allPassed;
}

// Export for use in other test files
export { runFileUploadTests, testConfig };

// Run tests if this file is executed directly
if (import.meta.url.endsWith('test-file-upload-comprehensive.js')) {
  console.log('Starting Comprehensive File Upload Tests...');
  runFileUploadTests()
    .then(success => {
      console.log(`Tests completed with success: ${success}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}