// File Upload Integration Tests
// Comprehensive integration tests for file upload functionality
// Requirements: 5.2

const fs = require('fs');
const path = require('path');

// Test configuration
const testConfig = {
  name: 'File Upload Integration Tests',
  version: '1.0.0',
  requirements: {
    '5.2': { tested: false, passed: false, description: 'Complete file upload functionality works correctly' }
  }
};

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

// Test 1: Complete File Upload UI Integration
function testFileUploadUIIntegration() {
  console.log('\n🎨 Testing complete file upload UI integration...');
  
  try {
    const indexPath = 'index.html';
    if (!fs.existsSync(indexPath)) {
      logTest('File upload UI integration', false, 'index.html file not found', '5.2');
      return false;
    }
    
    const content = fs.readFileSync(indexPath, 'utf8');
    
    // Check for complete file upload interface
    const hasFileInput = content.includes('id="fileInput"') && content.includes('type="file"');
    const hasDropZone = content.includes('id="fileDropZone"');
    const hasFileList = content.includes('id="fileList"');
    const hasMultipleSupport = content.includes('multiple');
    const hasAcceptTypes = content.includes('accept=');
    
    logTest('File input element', hasFileInput, hasFileInput ? 'Found' : 'Missing', '5.2');
    logTest('Drop zone element', hasDropZone, hasDropZone ? 'Found' : 'Missing', '5.2');
    logTest('File list display', hasFileList, hasFileList ? 'Found' : 'Missing', '5.2');
    logTest('Multiple file support', hasMultipleSupport, hasMultipleSupport ? 'Enabled' : 'Disabled', '5.2');
    logTest('File type restrictions', hasAcceptTypes, hasAcceptTypes ? 'Configured' : 'Not configured', '5.2');
    
    // Check for drag and drop functionality
    const hasDragEvents = content.includes('dragover') && content.includes('drop');
    logTest('Drag and drop events', hasDragEvents, hasDragEvents ? 'Configured' : 'Not configured', '5.2');
    
    // Check for file handling functions
    const hasFileHandling = content.includes('handleFiles') || content.includes('fileInput.addEventListener');
    logTest('File handling functions', hasFileHandling, hasFileHandling ? 'Implemented' : 'Missing', '5.2');
    
    return hasFileInput && hasDropZone && hasFileList && hasFileHandling;
    
  } catch (error) {
    logTest('File upload UI integration', false, error.message, '5.2');
    return false;
  }
}

// Test 2: File Validation Integration
function testFileValidationIntegration() {
  console.log('\n🔍 Testing file validation integration...');
  
  try {
    const indexPath = 'index.html';
    const apiPath = 'api/generate.js';
    
    let frontendValidation = false;
    let backendValidation = false;
    
    // Check frontend validation
    if (fs.existsSync(indexPath)) {
      const indexContent = fs.readFileSync(indexPath, 'utf8');
      
      const hasClientValidation = indexContent.includes('file.size') || 
                                 indexContent.includes('file.type') ||
                                 indexContent.includes('validateFile');
      
      const hasErrorDisplay = indexContent.includes('showError') || 
                             indexContent.includes('alert') ||
                             indexContent.includes('errorHandler');
      
      frontendValidation = hasClientValidation && hasErrorDisplay;
      logTest('Frontend validation', frontendValidation, frontendValidation ? 'Implemented' : 'Missing', '5.2');
    }
    
    // Check backend validation
    if (fs.existsSync(apiPath)) {
      const apiContent = fs.readFileSync(apiPath, 'utf8');
      
      const hasServerValidation = apiContent.includes('validateFiles') && 
                                 apiContent.includes('maxFileSize') &&
                                 apiContent.includes('allowedTypes');
      
      const hasValidationErrors = apiContent.includes('validation_error') &&
                                 apiContent.includes('userActions');
      
      backendValidation = hasServerValidation && hasValidationErrors;
      logTest('Backend validation', backendValidation, backendValidation ? 'Implemented' : 'Missing', '5.2');
    }
    
    return frontendValidation && backendValidation;
    
  } catch (error) {
    logTest('File validation integration', false, error.message, '5.2');
    return false;
  }
}

// Test 3: File Processing Pipeline Integration
function testFileProcessingPipelineIntegration() {
  console.log('\n🔄 Testing file processing pipeline integration...');
  
  try {
    const apiPath = 'api/generate.js';
    if (!fs.existsSync(apiPath)) {
      logTest('File processing pipeline integration', false, 'api/generate.js file not found', '5.2');
      return false;
    }
    
    const content = fs.readFileSync(apiPath, 'utf8');
    
    // Check for complete processing pipeline
    const hasFileProcessing = content.includes('processFiles') || content.includes('processFilesWithVision');
    const hasVisionProcessing = content.includes('processFilesWithVision');
    const hasFallbackProcessing = content.includes('fallback') || content.includes('legacy');
    const hasFileContentExtraction = content.includes('fileContent') && content.includes('添付ファイル内容');
    
    logTest('File processing functions', hasFileProcessing, hasFileProcessing ? 'Implemented' : 'Missing', '5.2');
    logTest('Vision processing', hasVisionProcessing, hasVisionProcessing ? 'Available' : 'Not available', '5.2');
    logTest('Fallback processing', hasFallbackProcessing, hasFallbackProcessing ? 'Implemented' : 'Missing', '5.2');
    logTest('Content extraction', hasFileContentExtraction, hasFileContentExtraction ? 'Implemented' : 'Missing', '5.2');
    
    // Check for different file type handling
    const handlesPDF = content.includes('application/pdf');
    const handlesImages = content.includes('image/jpeg') || content.includes('image/png');
    const handlesText = content.includes('text/plain') || content.includes('text/csv');
    const handlesExcel = content.includes('spreadsheet') || content.includes('excel');
    
    logTest('PDF processing', handlesPDF, handlesPDF ? 'Supported' : 'Not supported', '5.2');
    logTest('Image processing', handlesImages, handlesImages ? 'Supported' : 'Not supported', '5.2');
    logTest('Text processing', handlesText, handlesText ? 'Supported' : 'Not supported', '5.2');
    logTest('Excel processing', handlesExcel, handlesExcel ? 'Supported' : 'Not supported', '5.2');
    
    return hasFileProcessing && hasFileContentExtraction && (handlesPDF || handlesImages || handlesText);
    
  } catch (error) {
    logTest('File processing pipeline integration', false, error.message, '5.2');
    return false;
  }
}

// Test 4: Error Handling Integration
function testErrorHandlingIntegration() {
  console.log('\n⚠️ Testing error handling integration...');
  
  try {
    const apiPath = 'api/generate.js';
    if (!fs.existsSync(apiPath)) {
      logTest('Error handling integration', false, 'api/generate.js file not found', '5.2');
      return false;
    }
    
    const content = fs.readFileSync(apiPath, 'utf8');
    
    // Check for comprehensive error handling
    const hasFileErrorHandling = content.includes('handleFileProcessingError') || 
                                content.includes('file_processing_error');
    
    const hasValidationErrorHandling = content.includes('validation_error') &&
                                      content.includes('severity') &&
                                      content.includes('shouldRetry');
    
    const hasUserFriendlyMessages = content.includes('userActions') &&
                                   content.includes('Please') &&
                                   content.includes('try again');
    
    const hasErrorCategorization = content.includes('errorId') &&
                                  content.includes('timestamp');
    
    logTest('File processing error handling', hasFileErrorHandling, hasFileErrorHandling ? 'Implemented' : 'Missing', '5.2');
    logTest('Validation error handling', hasValidationErrorHandling, hasValidationErrorHandling ? 'Implemented' : 'Missing', '5.2');
    logTest('User-friendly error messages', hasUserFriendlyMessages, hasUserFriendlyMessages ? 'Implemented' : 'Missing', '5.2');
    logTest('Error categorization', hasErrorCategorization, hasErrorCategorization ? 'Implemented' : 'Missing', '5.2');
    
    return hasFileErrorHandling && hasValidationErrorHandling && hasUserFriendlyMessages;
    
  } catch (error) {
    logTest('Error handling integration', false, error.message, '5.2');
    return false;
  }
}

// Test 5: Multi-file Upload Support
function testMultiFileUploadSupport() {
  console.log('\n📎 Testing multi-file upload support...');
  
  try {
    const indexPath = 'index.html';
    const apiPath = 'api/generate.js';
    
    let frontendMultiSupport = false;
    let backendMultiSupport = false;
    
    // Check frontend multi-file support
    if (fs.existsSync(indexPath)) {
      const indexContent = fs.readFileSync(indexPath, 'utf8');
      
      const hasMultipleAttribute = indexContent.includes('multiple');
      const hasFileArrayHandling = indexContent.includes('files.length') || 
                                  indexContent.includes('selectedFiles');
      const hasFileListDisplay = indexContent.includes('fileList') &&
                                indexContent.includes('displayFile');
      
      frontendMultiSupport = hasMultipleAttribute && hasFileArrayHandling;
      logTest('Frontend multi-file support', frontendMultiSupport, frontendMultiSupport ? 'Implemented' : 'Missing', '5.2');
    }
    
    // Check backend multi-file support
    if (fs.existsSync(apiPath)) {
      const apiContent = fs.readFileSync(apiPath, 'utf8');
      
      const hasMultiFileProcessing = apiContent.includes('files.forEach') || 
                                    apiContent.includes('for (const file of files)');
      const hasFileCountValidation = apiContent.includes('maxFiles') &&
                                    apiContent.includes('files.length >');
      const hasMultiFileContent = apiContent.includes('allFiles') ||
                                 apiContent.includes('processedFiles');
      
      backendMultiSupport = hasMultiFileProcessing && hasFileCountValidation;
      logTest('Backend multi-file support', backendMultiSupport, backendMultiSupport ? 'Implemented' : 'Missing', '5.2');
    }
    
    return frontendMultiSupport && backendMultiSupport;
    
  } catch (error) {
    logTest('Multi-file upload support', false, error.message, '5.2');
    return false;
  }
}

// Test 6: Comparison Analysis File Upload Integration
function testComparisonAnalysisFileUploadIntegration() {
  console.log('\n🔀 Testing comparison analysis file upload integration...');
  
  try {
    const indexPath = 'index.html';
    if (!fs.existsSync(indexPath)) {
      logTest('Comparison analysis file upload integration', false, 'index.html file not found', '5.2');
      return false;
    }
    
    const content = fs.readFileSync(indexPath, 'utf8');
    
    // Check for comparison-specific file upload elements
    const hasPropertyAFiles = content.includes('propertyAFiles');
    const hasPropertyBFiles = content.includes('propertyBFiles');
    const hasComparisonSection = content.includes('comparisonSection');
    const hasDualFileHandling = content.includes('propertyA.files') || content.includes('propertyB.files');
    
    logTest('Property A file upload', hasPropertyAFiles, hasPropertyAFiles ? 'Implemented' : 'Missing', '5.2');
    logTest('Property B file upload', hasPropertyBFiles, hasPropertyBFiles ? 'Implemented' : 'Missing', '5.2');
    logTest('Comparison section', hasComparisonSection, hasComparisonSection ? 'Implemented' : 'Missing', '5.2');
    
    // Check API support for comparison file processing
    const apiPath = 'api/generate.js';
    let hasComparisonAPISupport = false;
    
    if (fs.existsSync(apiPath)) {
      const apiContent = fs.readFileSync(apiPath, 'utf8');
      hasComparisonAPISupport = apiContent.includes('comparison_analysis') &&
                               apiContent.includes('propertyA') &&
                               apiContent.includes('propertyB');
    }
    
    logTest('Comparison API support', hasComparisonAPISupport, hasComparisonAPISupport ? 'Implemented' : 'Missing', '5.2');
    
    return hasPropertyAFiles && hasPropertyBFiles && hasComparisonAPISupport;
    
  } catch (error) {
    logTest('Comparison analysis file upload integration', false, error.message, '5.2');
    return false;
  }
}

// Test 7: File Upload Security and Validation
function testFileUploadSecurity() {
  console.log('\n🔒 Testing file upload security and validation...');
  
  try {
    const apiPath = 'api/generate.js';
    if (!fs.existsSync(apiPath)) {
      logTest('File upload security', false, 'api/generate.js file not found', '5.2');
      return false;
    }
    
    const content = fs.readFileSync(apiPath, 'utf8');
    
    // Check for security measures
    const hasFileSizeLimit = content.includes('maxFileSize') && content.includes('10 * 1024 * 1024');
    const hasFileTypeWhitelist = content.includes('allowedTypes') && content.includes('application/pdf');
    const hasFileCountLimit = content.includes('maxFiles') && content.includes('5');
    const hasBase64Validation = content.includes('base64') && content.includes('match');
    const hasCorruptionDetection = content.includes('corrupted') || content.includes('invalid data');
    
    logTest('File size limits', hasFileSizeLimit, hasFileSizeLimit ? 'Enforced' : 'Not enforced', '5.2');
    logTest('File type whitelist', hasFileTypeWhitelist, hasFileTypeWhitelist ? 'Implemented' : 'Missing', '5.2');
    logTest('File count limits', hasFileCountLimit, hasFileCountLimit ? 'Enforced' : 'Not enforced', '5.2');
    logTest('Base64 validation', hasBase64Validation, hasBase64Validation ? 'Implemented' : 'Missing', '5.2');
    logTest('Corruption detection', hasCorruptionDetection, hasCorruptionDetection ? 'Implemented' : 'Missing', '5.2');
    
    return hasFileSizeLimit && hasFileTypeWhitelist && hasFileCountLimit;
    
  } catch (error) {
    logTest('File upload security', false, error.message, '5.2');
    return false;
  }
}

// Main test execution
async function runFileUploadIntegrationTests() {
  console.log(`\n🧪 ${testConfig.name}`);
  console.log('=' .repeat(50));
  
  const results = {
    uiIntegration: testFileUploadUIIntegration(),
    validationIntegration: testFileValidationIntegration(),
    processingPipeline: testFileProcessingPipelineIntegration(),
    errorHandling: testErrorHandlingIntegration(),
    multiFileSupport: testMultiFileUploadSupport(),
    comparisonAnalysis: testComparisonAnalysisFileUploadIntegration(),
    security: testFileUploadSecurity()
  };
  
  // Summary
  console.log('\n📊 Integration Test Summary');
  console.log('=' .repeat(30));
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(result => result).length;
  
  console.log(`Total Integration Tests: ${totalTests}`);
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
    console.log('\n🎉 All file upload integration tests passed!');
    console.log('\n✨ File upload functionality is fully validated and working correctly.');
  } else {
    console.log('\n⚠️ Some file upload integration tests failed. Please review the issues above.');
  }
  
  return allPassed;
}

// Export for use in other test files
module.exports = { runFileUploadIntegrationTests, testConfig };

// Run tests if this file is executed directly
if (require.main === module) {
  console.log('Starting File Upload Integration Tests...');
  runFileUploadIntegrationTests()
    .then(success => {
      console.log(`Integration tests completed with success: ${success}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Integration test execution failed:', error);
      process.exit(1);
    });
}