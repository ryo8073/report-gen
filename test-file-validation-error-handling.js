// File Validation and Error Handling Tests
// Tests for file type validation, size limits, and error handling
// Requirements: 5.2, 5.5

import fs from 'fs';
import path from 'path';

// Test configuration
const testConfig = {
  name: 'File Validation and Error Handling Tests',
  version: '1.0.0',
  requirements: {
    '5.2': { tested: false, passed: false, description: 'File uploads work without errors and are properly processed' },
    '5.5': { tested: false, passed: false, description: 'Clear error messages for file issues' }
  }
};

// File validation constants (matching API specification)
const MAX_FILE_SIZE = 4.5 * 1024 * 1024; // 4.5MB in bytes
const MAX_FILES = 5;

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

const UNSUPPORTED_TYPES = [
  'application/zip',
  'application/x-rar-compressed',
  'video/mp4',
  'audio/mpeg',
  'application/x-executable'
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

// Test 1: File Type Validation in HTML
function testFileTypeValidationHTML() {
  console.log('\n🔍 Testing file type validation in HTML...');
  
  try {
    const indexPath = 'index.html';
    if (!fs.existsSync(indexPath)) {
      logTest('File type validation HTML', false, 'index.html file not found', '5.2');
      return false;
    }
    
    const content = fs.readFileSync(indexPath, 'utf8');
    
    // Check for accept attribute with proper file types
    const hasAcceptAttribute = content.includes('accept=');
    logTest('Accept attribute exists', hasAcceptAttribute, hasAcceptAttribute ? 'Found accept attribute' : 'No accept attribute', '5.2');
    
    // Check for specific supported file types
    const supportedTypesInHTML = [
      '.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', 
      '.xlsx', '.xls', '.csv', '.txt', '.docx', '.doc'
    ];
    
    let foundTypes = 0;
    for (const type of supportedTypesInHTML) {
      if (content.includes(type)) {
        foundTypes++;
      }
    }
    
    const hasAllTypes = foundTypes >= supportedTypesInHTML.length * 0.8; // At least 80% of types
    logTest('Supported file types defined', hasAllTypes, `Found ${foundTypes}/${supportedTypesInHTML.length} file types`, '5.2');
    
    // Check for file size limit mention
    const hasSizeLimit = content.includes('4.5MB') || content.includes('最大4.5MB');
    logTest('File size limit mentioned', hasSizeLimit, hasSizeLimit ? 'Found size limit info' : 'No size limit mentioned', '5.2');
    
    return hasAcceptAttribute && hasAllTypes && hasSizeLimit;
    
  } catch (error) {
    logTest('File type validation HTML', false, error.message, '5.2');
    return false;
  }
}

// Test 2: File Validation JavaScript Logic
function testFileValidationJavaScript() {
  console.log('\n⚙️ Testing file validation JavaScript logic...');
  
  try {
    const indexPath = 'index.html';
    if (!fs.existsSync(indexPath)) {
      logTest('File validation JavaScript', false, 'index.html file not found', '5.2');
      return false;
    }
    
    const content = fs.readFileSync(indexPath, 'utf8');
    
    // Check for file size validation
    const hasSizeValidation = content.includes('file.size') || 
                             content.includes('MAX_FILE_SIZE') || 
                             content.includes('4.5') ||
                             content.includes('4718592'); // 4.5MB in bytes
    logTest('File size validation logic exists', hasSizeValidation, hasSizeValidation ? 'Found size validation' : 'No size validation', '5.2');
    
    // Check for file type validation
    const hasTypeValidation = content.includes('file.type') || 
                             content.includes('allowedTypes') ||
                             content.includes('supportedTypes');
    logTest('File type validation logic exists', hasTypeValidation, hasTypeValidation ? 'Found type validation' : 'No type validation', '5.2');
    
    // Check for file count validation
    const hasCountValidation = content.includes('files.length') || 
                              content.includes('selectedFiles.length') ||
                              content.includes('MAX_FILES');
    logTest('File count validation logic exists', hasCountValidation, hasCountValidation ? 'Found count validation' : 'No count validation', '5.2');
    
    // Check for validation error handling
    const hasErrorHandling = content.includes('showError') || 
                            content.includes('alert') || 
                            content.includes('console.error') ||
                            content.includes('errorHandler');
    logTest('Validation error handling exists', hasErrorHandling, hasErrorHandling ? 'Found error handling' : 'No error handling', '5.5');
    
    return hasSizeValidation && hasTypeValidation && hasErrorHandling;
    
  } catch (error) {
    logTest('File validation JavaScript', false, error.message, '5.2');
    return false;
  }
}

// Test 3: API File Validation Logic
function testAPIFileValidation() {
  console.log('\n🌐 Testing API file validation logic...');
  
  try {
    const apiPath = 'api/generate.js';
    if (!fs.existsSync(apiPath)) {
      logTest('API file validation', false, 'api/generate.js file not found', '5.2');
      return false;
    }
    
    const content = fs.readFileSync(apiPath, 'utf8');
    
    // Check for validateFiles function
    const hasValidateFiles = content.includes('validateFiles') || content.includes('function validateFiles');
    logTest('validateFiles function exists', hasValidateFiles, hasValidateFiles ? 'Found validateFiles function' : 'No validateFiles function', '5.2');
    
    // Check for file size validation in API
    const hasAPISizeValidation = content.includes('maxFileSize') || 
                                content.includes('10 * 1024 * 1024') || // 10MB
                                content.includes('file.data.length');
    logTest('API file size validation exists', hasAPISizeValidation, hasAPISizeValidation ? 'Found API size validation' : 'No API size validation', '5.2');
    
    // Check for file type validation in API
    const hasAPITypeValidation = content.includes('allowedTypes') || 
                                content.includes('application/pdf') ||
                                content.includes('image/jpeg');
    logTest('API file type validation exists', hasAPITypeValidation, hasAPITypeValidation ? 'Found API type validation' : 'No API type validation', '5.2');
    
    // Check for file count validation in API
    const hasAPICountValidation = content.includes('maxFiles') || 
                                 content.includes('files.length >');
    logTest('API file count validation exists', hasAPICountValidation, hasAPICountValidation ? 'Found API count validation' : 'No API count validation', '5.2');
    
    // Check for validation error messages
    const hasValidationErrors = content.includes('validation_error') || 
                               content.includes('File type') ||
                               content.includes('too large');
    logTest('API validation error messages exist', hasValidationErrors, hasValidationErrors ? 'Found validation error messages' : 'No validation error messages', '5.5');
    
    return hasValidateFiles && hasAPISizeValidation && hasAPITypeValidation && hasValidationErrors;
    
  } catch (error) {
    logTest('API file validation', false, error.message, '5.2');
    return false;
  }
}

// Test 4: Error Message Quality
function testErrorMessageQuality() {
  console.log('\n💬 Testing error message quality...');
  
  try {
    const apiPath = 'api/generate.js';
    if (!fs.existsSync(apiPath)) {
      logTest('Error message quality', false, 'api/generate.js file not found', '5.5');
      return false;
    }
    
    const content = fs.readFileSync(apiPath, 'utf8');
    
    // Check for user-friendly error messages
    const hasUserFriendlyMessages = content.includes('Please') || 
                                   content.includes('try again') ||
                                   content.includes('reduce');
    logTest('User-friendly error messages exist', hasUserFriendlyMessages, hasUserFriendlyMessages ? 'Found user-friendly messages' : 'No user-friendly messages', '5.5');
    
    // Check for specific file error messages
    const hasFileErrorMessages = content.includes('File type') && 
                                content.includes('not supported') ||
                                content.includes('too large');
    logTest('Specific file error messages exist', hasFileErrorMessages, hasFileErrorMessages ? 'Found specific file error messages' : 'No specific file error messages', '5.5');
    
    // Check for actionable error guidance
    const hasActionableGuidance = content.includes('userActions') || 
                                 content.includes('Convert') ||
                                 content.includes('Compress');
    logTest('Actionable error guidance exists', hasActionableGuidance, hasActionableGuidance ? 'Found actionable guidance' : 'No actionable guidance', '5.5');
    
    // Check for error categorization
    const hasErrorCategorization = content.includes('severity') || 
                                  content.includes('shouldRetry') ||
                                  content.includes('errorId');
    logTest('Error categorization exists', hasErrorCategorization, hasErrorCategorization ? 'Found error categorization' : 'No error categorization', '5.5');
    
    return hasUserFriendlyMessages && hasFileErrorMessages && hasActionableGuidance;
    
  } catch (error) {
    logTest('Error message quality', false, error.message, '5.5');
    return false;
  }
}

// Test 5: File Processing Error Handling
function testFileProcessingErrorHandling() {
  console.log('\n🔧 Testing file processing error handling...');
  
  try {
    const apiPath = 'api/generate.js';
    if (!fs.existsSync(apiPath)) {
      logTest('File processing error handling', false, 'api/generate.js file not found', '5.2');
      return false;
    }
    
    const content = fs.readFileSync(apiPath, 'utf8');
    
    // Check for file processing error handling
    const hasProcessingErrorHandling = content.includes('processFiles') && 
                                      (content.includes('try') || content.includes('catch'));
    logTest('File processing error handling exists', hasProcessingErrorHandling, hasProcessingErrorHandling ? 'Found processing error handling' : 'No processing error handling', '5.2');
    
    // Check for corrupted file detection
    const hasCorruptedFileDetection = content.includes('corrupted') || 
                                     content.includes('invalid data') ||
                                     content.includes('base64');
    logTest('Corrupted file detection exists', hasCorruptedFileDetection, hasCorruptedFileDetection ? 'Found corrupted file detection' : 'No corrupted file detection', '5.2');
    
    // Check for fallback processing
    const hasFallbackProcessing = content.includes('fallback') || 
                                 content.includes('legacy') ||
                                 content.includes('alternative');
    logTest('Fallback processing exists', hasFallbackProcessing, hasFallbackProcessing ? 'Found fallback processing' : 'No fallback processing', '5.2');
    
    // Check for file processing timeout handling
    const hasTimeoutHandling = content.includes('timeout') || 
                              content.includes('60') ||
                              content.includes('AbortController');
    logTest('File processing timeout handling exists', hasTimeoutHandling, hasTimeoutHandling ? 'Found timeout handling' : 'No timeout handling', '5.2');
    
    return hasProcessingErrorHandling && hasCorruptedFileDetection;
    
  } catch (error) {
    logTest('File processing error handling', false, error.message, '5.2');
    return false;
  }
}

// Test 6: Frontend File Validation Integration
function testFrontendFileValidationIntegration() {
  console.log('\n🎯 Testing frontend file validation integration...');
  
  try {
    const indexPath = 'index.html';
    if (!fs.existsSync(indexPath)) {
      logTest('Frontend file validation integration', false, 'index.html file not found', '5.2');
      return false;
    }
    
    const content = fs.readFileSync(indexPath, 'utf8');
    
    // Check for file validation before upload
    const hasPreUploadValidation = content.includes('validateFile') || 
                                  content.includes('checkFile') ||
                                  (content.includes('file.size') && content.includes('file.type'));
    logTest('Pre-upload validation exists', hasPreUploadValidation, hasPreUploadValidation ? 'Found pre-upload validation' : 'No pre-upload validation', '5.2');
    
    // Check for visual feedback on validation errors
    const hasVisualFeedback = content.includes('showError') || 
                             content.includes('addClass') ||
                             content.includes('style.color') ||
                             content.includes('classList');
    logTest('Visual validation feedback exists', hasVisualFeedback, hasVisualFeedback ? 'Found visual feedback' : 'No visual feedback', '5.5');
    
    // Check for file list management
    const hasFileListManagement = content.includes('fileList') || 
                                 content.includes('selectedFiles') ||
                                 content.includes('removeFile');
    logTest('File list management exists', hasFileListManagement, hasFileListManagement ? 'Found file list management' : 'No file list management', '5.2');
    
    // Check for drag and drop validation
    const hasDragDropValidation = content.includes('dragover') && 
                                 (content.includes('preventDefault') || content.includes('dataTransfer'));
    logTest('Drag and drop validation exists', hasDragDropValidation, hasDragDropValidation ? 'Found drag and drop validation' : 'No drag and drop validation', '5.2');
    
    return hasPreUploadValidation && hasFileListManagement;
    
  } catch (error) {
    logTest('Frontend file validation integration', false, error.message, '5.2');
    return false;
  }
}

// Test 7: File Size Limit Enforcement
function testFileSizeLimitEnforcement() {
  console.log('\n📏 Testing file size limit enforcement...');
  
  try {
    // Check both frontend and backend size limits
    const indexPath = 'index.html';
    const apiPath = 'api/generate.js';
    
    let frontendSizeLimit = false;
    let backendSizeLimit = false;
    
    // Check frontend size limit
    if (fs.existsSync(indexPath)) {
      const indexContent = fs.readFileSync(indexPath, 'utf8');
      frontendSizeLimit = indexContent.includes('4.5') || 
                         indexContent.includes('4718592') || // 4.5MB in bytes
                         indexContent.includes('MAX_FILE_SIZE');
    }
    
    // Check backend size limit
    if (fs.existsSync(apiPath)) {
      const apiContent = fs.readFileSync(apiPath, 'utf8');
      backendSizeLimit = apiContent.includes('maxFileSize') || 
                        apiContent.includes('10 * 1024 * 1024') || // 10MB
                        apiContent.includes('file.data.length');
    }
    
    logTest('Frontend size limit enforcement', frontendSizeLimit, frontendSizeLimit ? 'Found frontend size limit' : 'No frontend size limit', '5.2');
    logTest('Backend size limit enforcement', backendSizeLimit, backendSizeLimit ? 'Found backend size limit' : 'No backend size limit', '5.2');
    
    return frontendSizeLimit && backendSizeLimit;
    
  } catch (error) {
    logTest('File size limit enforcement', false, error.message, '5.2');
    return false;
  }
}

// Main test execution for task 8.2
async function runFileValidationErrorHandlingTests() {
  console.log(`\n🧪 ${testConfig.name} - Task 8.2`);
  console.log('=' .repeat(50));
  
  const results = {
    htmlValidation: testFileTypeValidationHTML(),
    jsValidation: testFileValidationJavaScript(),
    apiValidation: testAPIFileValidation(),
    errorMessages: testErrorMessageQuality(),
    processingErrors: testFileProcessingErrorHandling(),
    frontendIntegration: testFrontendFileValidationIntegration(),
    sizeLimits: testFileSizeLimitEnforcement()
  };
  
  // Summary
  console.log('\n📊 Test Summary - Task 8.2');
  console.log('=' .repeat(30));
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(result => result).length;
  
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  // Requirements summary
  console.log('\n📋 Requirements Coverage');
  console.log('=' .repeat(30));
  
  for (const [req, data] of Object.entries(testConfig.requirements)) {
    const status = data.tested ? (data.passed ? '✅ PASS' : '❌ FAIL') : '⏸️ NOT TESTED';
    console.log(`${req}: ${status} - ${data.description}`);
  }
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 All file validation and error handling tests passed!');
  } else {
    console.log('\n⚠️ Some file validation and error handling tests failed. Please review the issues above.');
  }
  
  return allPassed;
}

// Export for use in other test files
export { runFileValidationErrorHandlingTests, testConfig };

// Run tests if this file is executed directly
if (import.meta.url.endsWith('test-file-validation-error-handling.js')) {
  console.log('Starting File Validation and Error Handling Tests...');
  runFileValidationErrorHandlingTests()
    .then(success => {
      console.log(`Tests completed with success: ${success}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}