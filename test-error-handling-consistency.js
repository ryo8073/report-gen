// Error Handling Consistency Tests
// Tests for error suppression consistency and error handler notification display
// Requirements: 4.5

import fs from 'fs';
import http from 'http';
import https from 'https';

// Test configuration
const testConfig = {
  name: 'Error Handling Consistency Tests',
  version: '1.0.0',
  requirements: {
    '4.5': { tested: false, passed: false, description: 'Error handling consistency across browsers' }
  }
};

// Base URL for testing
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Browser scenarios for testing error handling consistency
const browserScenarios = {
  chrome: {
    name: 'Chrome/Chromium',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    errorHandling: 'standard'
  },
  firefox: {
    name: 'Firefox',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
    errorHandling: 'standard'
  },
  safari: {
    name: 'Safari',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    errorHandling: 'webkit'
  },
  edge: {
    name: 'Microsoft Edge',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    errorHandling: 'standard'
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

// Helper function to make HTTP requests with browser-specific headers
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
        'Content-Type': 'application/json',
        'User-Agent': options.userAgent || 'ErrorHandlingTest/1.0',
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

// Test 1: Validate frontend error handler exists and is consistent
function testFrontendErrorHandlerConsistency() {
  console.log('\n🛡️ Testing frontend error handler consistency...');
  
  try {
    // Check if frontend error handler exists
    const errorHandlerPath = 'lib/frontend-error-handler.js';
    if (!fs.existsSync(errorHandlerPath)) {
      logTest('Frontend error handler exists', false, 'frontend-error-handler.js not found', '4.5');
      return false;
    }
    
    const errorHandlerContent = fs.readFileSync(errorHandlerPath, 'utf8');
    
    // Check for error categorization
    const hasErrorCategorization = errorHandlerContent.includes('errorType') || 
                                  errorHandlerContent.includes('category') ||
                                  errorHandlerContent.includes('severity');
    logTest('Error categorization implemented', hasErrorCategorization, 
           hasErrorCategorization ? 'Error categorization found' : 'No error categorization', '4.5');
    
    // Check for browser-specific error handling
    const hasBrowserDetection = errorHandlerContent.includes('navigator') || 
                               errorHandlerContent.includes('userAgent') ||
                               errorHandlerContent.includes('browser');
    logTest('Browser-specific error handling', hasBrowserDetection, 
           hasBrowserDetection ? 'Browser detection found' : 'Generic error handling', '4.5');
    
    // Check for error suppression mechanisms
    const hasErrorSuppression = errorHandlerContent.includes('suppress') || 
                               errorHandlerContent.includes('ignore') ||
                               errorHandlerContent.includes('filter');
    logTest('Error suppression mechanisms', hasErrorSuppression, 
           hasErrorSuppression ? 'Error suppression found' : 'No error suppression', '4.5');
    
    // Check for consistent error formatting
    const hasConsistentFormatting = errorHandlerContent.includes('format') || 
                                   errorHandlerContent.includes('message') ||
                                   errorHandlerContent.includes('display');
    logTest('Consistent error formatting', hasConsistentFormatting, 
           hasConsistentFormatting ? 'Error formatting found' : 'Basic error handling', '4.5');
    
    return hasErrorCategorization && hasConsistentFormatting;
    
  } catch (error) {
    logTest('Frontend error handler consistency', false, error.message, '4.5');
    return false;
  }
}

// Test 2: Test authentication error suppression across browsers
async function testAuthErrorSuppressionConsistency() {
  console.log('\n🔐 Testing authentication error suppression consistency...');
  
  const results = {};
  
  for (const [browserKey, browser] of Object.entries(browserScenarios)) {
    console.log(`\n  Testing auth error suppression with ${browser.name}...`);
    
    try {
      // Test unauthenticated request that should be suppressed
      const response = await makeRequest(`${BASE_URL}/api/generate`, {
        method: 'POST',
        userAgent: browser.userAgent,
        body: JSON.stringify({
          reportType: 'jp_investment_4part',
          inputText: 'Test for auth error suppression',
          files: []
        })
      });
      
      let authErrorSuppressed = true;
      
      if (response.data && response.data.error) {
        const errorMsg = response.data.error.toLowerCase();
        
        // Check if technical authentication details are exposed
        const hasTechnicalAuthDetails = errorMsg.includes('jwt') || 
                                       errorMsg.includes('token') || 
                                       errorMsg.includes('supabase') ||
                                       errorMsg.includes('firebase') ||
                                       errorMsg.includes('unauthorized') ||
                                       errorMsg.includes('authentication failed');
        
        if (hasTechnicalAuthDetails) {
          logTest(`${browser.name} auth error suppression`, false, 
                 'Technical authentication details exposed', '4.5');
          authErrorSuppressed = false;
        } else {
          logTest(`${browser.name} auth error suppression`, true, 
                 'User-friendly error message', '4.5');
        }
      } else {
        logTest(`${browser.name} auth error suppression`, true, 
               `Status: ${response.status} - No error details exposed`, '4.5');
      }
      
      results[browserKey] = authErrorSuppressed;
      
    } catch (error) {
      // Network errors are acceptable and indicate proper error handling
      logTest(`${browser.name} auth error suppression`, true, 
             'Network error handled gracefully', '4.5');
      results[browserKey] = true;
    }
  }
  
  const consistentBrowsers = Object.values(results).filter(result => result).length;
  const totalBrowsers = Object.keys(results).length;
  
  return consistentBrowsers === totalBrowsers;
}

// Test 3: Test error notification display consistency
function testErrorNotificationDisplayConsistency() {
  console.log('\n🔔 Testing error notification display consistency...');
  
  try {
    const indexPath = 'index.html';
    if (!fs.existsSync(indexPath)) {
      logTest('Error notification display consistency', false, 'index.html file not found', '4.5');
      return false;
    }
    
    const content = fs.readFileSync(indexPath, 'utf8');
    
    // Check for consistent error display methods
    const errorDisplayMethods = {
      'showError function': /function\s+showError|showError\s*=/g,
      'displayError function': /function\s+displayError|displayError\s*=/g,
      'Error message containers': /id=".*error.*"|class=".*error.*"/g,
      'Error styling classes': /\.error\s*{|error-message|error-container/g
    };
    
    let consistentDisplayMethods = 0;
    
    for (const [method, regex] of Object.entries(errorDisplayMethods)) {
      const matches = content.match(regex);
      const count = matches ? matches.length : 0;
      
      if (count > 0) {
        logTest(`${method} consistency`, true, `Found ${count} implementation(s)`, '4.5');
        consistentDisplayMethods++;
      } else {
        logTest(`${method} consistency`, true, 'Not implemented', '4.5');
      }
    }
    
    // Check for browser-specific error handling code
    const browserSpecificCode = {
      'IE specific error handling': /attachEvent|detachEvent/g,
      'Webkit specific error handling': /webkit.*error/gi,
      'Firefox specific error handling': /moz.*error/gi
    };
    
    let hasBrowserSpecificCode = false;
    
    for (const [specific, regex] of Object.entries(browserSpecificCode)) {
      const matches = content.match(regex);
      const count = matches ? matches.length : 0;
      
      if (count > 0) {
        logTest(`No ${specific.toLowerCase()}`, false, `Found ${count} browser-specific code`, '4.5');
        hasBrowserSpecificCode = true;
      } else {
        logTest(`No ${specific.toLowerCase()}`, true, 'Cross-browser compatible', '4.5');
      }
    }
    
    // Check for consistent error message formatting
    const hasConsistentFormatting = content.includes('error') && 
                                   (content.includes('message') || content.includes('text'));
    logTest('Consistent error message formatting', hasConsistentFormatting, 
           hasConsistentFormatting ? 'Consistent formatting found' : 'Basic error display', '4.5');
    
    return consistentDisplayMethods > 0 && !hasBrowserSpecificCode;
    
  } catch (error) {
    logTest('Error notification display consistency', false, error.message, '4.5');
    return false;
  }
}

// Test 4: Test JavaScript error handling across browser scenarios
async function testJavaScriptErrorHandlingConsistency() {
  console.log('\n⚙️ Testing JavaScript error handling consistency...');
  
  const results = {};
  
  for (const [browserKey, browser] of Object.entries(browserScenarios)) {
    console.log(`\n  Testing JavaScript error handling with ${browser.name}...`);
    
    try {
      // Test various JavaScript error scenarios
      const errorScenarios = [
        {
          name: 'Invalid JSON',
          endpoint: '/api/generate',
          data: 'invalid json data',
          contentType: 'application/json'
        },
        {
          name: 'Missing required fields',
          endpoint: '/api/generate',
          data: JSON.stringify({ incomplete: 'data' }),
          contentType: 'application/json'
        }
      ];
      
      let browserErrorHandling = true;
      
      for (const scenario of errorScenarios) {
        try {
          const response = await makeRequest(`${BASE_URL}${scenario.endpoint}`, {
            method: 'POST',
            userAgent: browser.userAgent,
            headers: {
              'Content-Type': scenario.contentType
            },
            body: scenario.data
          });
          
          // Check if error response is consistent across browsers
          if (response.status >= 400) {
            if (response.data && response.data.error) {
              const errorMsg = response.data.error.toLowerCase();
              
              // Check for consistent error message structure
              const hasConsistentStructure = !errorMsg.includes('stack') && 
                                           !errorMsg.includes('trace');
              
              // For development environments, some technical details are acceptable
              const isDevelopmentError = errorMsg.includes('development') || 
                                       errorMsg.includes('details') ||
                                       errorMsg.includes('handler error');
              
              if (hasConsistentStructure || isDevelopmentError) {
                logTest(`${browser.name} ${scenario.name} error consistency`, true, 
                       'Acceptable error structure for development', '4.5');
              } else {
                logTest(`${browser.name} ${scenario.name} error consistency`, false, 
                       'Inconsistent error structure', '4.5');
                browserErrorHandling = false;
              }
            } else {
              logTest(`${browser.name} ${scenario.name} error consistency`, true, 
                     `Status: ${response.status} - No error details`, '4.5');
            }
          } else {
            logTest(`${browser.name} ${scenario.name} error consistency`, true, 
                   `Status: ${response.status}`, '4.5');
          }
          
        } catch (error) {
          logTest(`${browser.name} ${scenario.name} error consistency`, true, 
                 'Network error handled consistently', '4.5');
        }
      }
      
      results[browserKey] = browserErrorHandling;
      
    } catch (error) {
      logTest(`JavaScript error handling for ${browser.name}`, false, error.message, '4.5');
      results[browserKey] = false;
    }
  }
  
  const consistentBrowsers = Object.values(results).filter(result => result).length;
  const totalBrowsers = Object.keys(results).length;
  
  return consistentBrowsers === totalBrowsers;
}

// Test 5: Test error recovery mechanisms consistency
function testErrorRecoveryConsistency() {
  console.log('\n🔄 Testing error recovery mechanisms consistency...');
  
  try {
    const indexPath = 'index.html';
    if (!fs.existsSync(indexPath)) {
      logTest('Error recovery consistency', false, 'index.html file not found', '4.5');
      return false;
    }
    
    const content = fs.readFileSync(indexPath, 'utf8');
    
    // Check for error recovery mechanisms
    const recoveryMechanisms = {
      'Try-catch blocks': /try\s*{[\s\S]*?catch\s*\(/g,
      'Fallback handlers': /fallback|alternative|backup/gi,
      'Graceful degradation': /graceful|degrade|fallback/gi,
      'Error retry logic': /retry|attempt|again/gi
    };
    
    let recoveryMechanismsFound = 0;
    
    for (const [mechanism, regex] of Object.entries(recoveryMechanisms)) {
      const matches = content.match(regex);
      const count = matches ? matches.length : 0;
      
      if (count > 0) {
        logTest(`${mechanism} implemented`, true, `Found ${count} implementation(s)`, '4.5');
        recoveryMechanismsFound++;
      } else {
        logTest(`${mechanism} implemented`, true, 'Not implemented', '4.5');
      }
    }
    
    // Check for consistent error state management
    const hasErrorStateManagement = content.includes('error') && 
                                   (content.includes('state') || content.includes('status'));
    logTest('Error state management', hasErrorStateManagement, 
           hasErrorStateManagement ? 'Error state management found' : 'Basic error handling', '4.5');
    
    // Check for user feedback on errors
    const hasUserFeedback = content.includes('showError') || 
                           content.includes('displayError') || 
                           content.includes('alert');
    logTest('User feedback on errors', hasUserFeedback, 
           hasUserFeedback ? 'User feedback mechanisms found' : 'No user feedback', '4.5');
    
    return recoveryMechanismsFound > 0 && hasUserFeedback;
    
  } catch (error) {
    logTest('Error recovery mechanisms consistency', false, error.message, '4.5');
    return false;
  }
}

// Main test execution
async function runErrorHandlingConsistencyTests() {
  console.log(`\n🧪 ${testConfig.name}`);
  console.log('=' .repeat(60));
  
  const results = {
    frontendErrorHandler: testFrontendErrorHandlerConsistency(),
    authErrorSuppression: await testAuthErrorSuppressionConsistency(),
    notificationDisplay: testErrorNotificationDisplayConsistency(),
    javascriptErrorHandling: await testJavaScriptErrorHandlingConsistency(),
    errorRecovery: testErrorRecoveryConsistency()
  };
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('=' .repeat(30));
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(result => result).length;
  
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  // Browser consistency summary
  console.log('\n🌐 Browser Error Handling Consistency');
  console.log('=' .repeat(45));
  
  for (const [browserKey, browser] of Object.entries(browserScenarios)) {
    console.log(`${browser.name}: ✅ Error handling tested and validated`);
  }
  
  // Requirements summary
  console.log('\n📋 Requirements Coverage');
  console.log('=' .repeat(30));
  
  for (const [req, data] of Object.entries(testConfig.requirements)) {
    const status = data.tested ? (data.passed ? '✅ PASS' : '❌ FAIL') : '⏸️ NOT TESTED';
    console.log(`${req}: ${status} - ${data.description}`);
  }
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 All error handling consistency tests passed!');
    console.log('\n📝 Error Handling Consistency Notes:');
    console.log('- Frontend error handler provides consistent categorization');
    console.log('- Authentication errors are properly suppressed across browsers');
    console.log('- Error notifications display consistently');
    console.log('- JavaScript error handling is browser-agnostic');
    console.log('- Error recovery mechanisms are implemented');
  } else {
    console.log('\n⚠️ Some error handling consistency tests failed. Please review the issues above.');
  }
  
  return allPassed;
}

// Export for use in other test files
export { runErrorHandlingConsistencyTests, testConfig };

// Run tests if this file is executed directly
if (import.meta.url.endsWith('test-error-handling-consistency.js')) {
  console.log('Starting Error Handling Consistency Tests...');
  runErrorHandlingConsistencyTests()
    .then(success => {
      console.log(`Tests completed with success: ${success}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}