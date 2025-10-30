// JavaScript Error Validation Tests
// Tests for duplicate function declarations and global namespace pollution prevention
// Requirements: 1.4, 1.5

import fs from 'fs';
import path from 'path';

// Test configuration
const testConfig = {
  name: 'JavaScript Error Validation Tests',
  version: '1.0.0',
  requirements: {
    '1.4': { tested: false, passed: false, description: 'No duplicate function declarations exist' },
    '1.5': { tested: false, passed: false, description: 'Global namespace pollution prevention' }
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

// Test 1: Check for duplicate function declarations in index.html
function testDuplicateFunctionDeclarations() {
  console.log('\n🔍 Testing for duplicate function declarations...');
  
  try {
    const indexPath = 'index.html';
    if (!fs.existsSync(indexPath)) {
      logTest('Duplicate Function Declarations Check', false, 'index.html file not found', '1.4');
      return false;
    }
    
    const content = fs.readFileSync(indexPath, 'utf8');
    
    // Check for duplicate applyFontSize function declarations
    const applyFontSizeMatches = content.match(/function\s+applyFontSize\s*\(/g);
    const applyFontSizeCount = applyFontSizeMatches ? applyFontSizeMatches.length : 0;
    
    if (applyFontSizeCount <= 1) {
      logTest('No duplicate applyFontSize declarations', true, `Found ${applyFontSizeCount} declaration(s)`, '1.4');
    } else {
      logTest('No duplicate applyFontSize declarations', false, `Found ${applyFontSizeCount} duplicate declarations`, '1.4');
      return false;
    }
    
    // Check for other common duplicate function patterns
    const functionPatterns = [
      'applyLineHeight',
      'applyTheme',
      'toggleFormatControls',
      'copyToClipboard'
    ];
    
    let duplicatesFound = false;
    for (const funcName of functionPatterns) {
      const regex = new RegExp(`function\\s+${funcName}\\s*\\(`, 'g');
      const matches = content.match(regex);
      const count = matches ? matches.length : 0;
      
      if (count > 1) {
        logTest(`No duplicate ${funcName} declarations`, false, `Found ${count} declarations`, '1.4');
        duplicatesFound = true;
      } else {
        logTest(`No duplicate ${funcName} declarations`, true, `Found ${count} declaration(s)`, '1.4');
      }
    }
    
    return !duplicatesFound;
    
  } catch (error) {
    logTest('Duplicate Function Declarations Check', false, error.message, '1.4');
    return false;
  }
}

// Test 2: Check for global namespace pollution
function testGlobalNamespacePollution() {
  console.log('\n🌐 Testing for global namespace pollution...');
  
  try {
    const indexPath = 'index.html';
    if (!fs.existsSync(indexPath)) {
      logTest('Global Namespace Pollution Check', false, 'index.html file not found', '1.5');
      return false;
    }
    
    const content = fs.readFileSync(indexPath, 'utf8');
    
    // Check for duplicate window assignments
    const windowAssignments = {};
    const windowAssignmentRegex = /window\.(\w+)\s*=/g;
    let match;
    
    while ((match = windowAssignmentRegex.exec(content)) !== null) {
      const funcName = match[1];
      if (!windowAssignments[funcName]) {
        windowAssignments[funcName] = 0;
      }
      windowAssignments[funcName]++;
    }
    
    let duplicateAssignments = false;
    for (const [funcName, count] of Object.entries(windowAssignments)) {
      if (count > 1) {
        logTest(`Single window.${funcName} assignment`, false, `Found ${count} assignments`, '1.5');
        duplicateAssignments = true;
      } else {
        logTest(`Single window.${funcName} assignment`, true, `Found ${count} assignment`, '1.5');
      }
    }
    
    // Check for proper function organization
    const scriptTags = content.match(/<script[^>]*>[\s\S]*?<\/script>/gi);
    if (scriptTags) {
      logTest('Script tags properly organized', true, `Found ${scriptTags.length} script sections`, '1.5');
    } else {
      logTest('Script tags properly organized', false, 'No script tags found', '1.5');
    }
    
    return !duplicateAssignments;
    
  } catch (error) {
    logTest('Global Namespace Pollution Check', false, error.message, '1.5');
    return false;
  }
}

// Test 3: Validate JavaScript syntax integrity
function testJavaScriptSyntaxIntegrity() {
  console.log('\n⚙️ Testing JavaScript syntax integrity...');
  
  try {
    const indexPath = 'index.html';
    if (!fs.existsSync(indexPath)) {
      logTest('JavaScript Syntax Integrity', false, 'index.html file not found', '1.4');
      return false;
    }
    
    const content = fs.readFileSync(indexPath, 'utf8');
    
    // Extract JavaScript code from script tags
    const scriptMatches = content.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
    
    if (!scriptMatches) {
      logTest('JavaScript Syntax Integrity', false, 'No JavaScript code found', '1.4');
      return false;
    }
    
    let syntaxValid = true;
    
    for (let i = 0; i < scriptMatches.length; i++) {
      const scriptContent = scriptMatches[i].replace(/<script[^>]*>|<\/script>/gi, '');
      
      // Basic syntax checks
      const openBraces = (scriptContent.match(/\{/g) || []).length;
      const closeBraces = (scriptContent.match(/\}/g) || []).length;
      
      if (openBraces !== closeBraces) {
        logTest(`Script ${i + 1} brace matching`, false, `Open: ${openBraces}, Close: ${closeBraces}`, '1.4');
        syntaxValid = false;
      } else {
        logTest(`Script ${i + 1} brace matching`, true, `Braces properly matched`, '1.4');
      }
      
      const openParens = (scriptContent.match(/\(/g) || []).length;
      const closeParens = (scriptContent.match(/\)/g) || []).length;
      
      if (openParens !== closeParens) {
        logTest(`Script ${i + 1} parentheses matching`, false, `Open: ${openParens}, Close: ${closeParens}`, '1.4');
        syntaxValid = false;
      } else {
        logTest(`Script ${i + 1} parentheses matching`, true, `Parentheses properly matched`, '1.4');
      }
    }
    
    return syntaxValid;
    
  } catch (error) {
    logTest('JavaScript Syntax Integrity', false, error.message, '1.4');
    return false;
  }
}

// Main test execution
async function runJavaScriptErrorValidationTests() {
  console.log(`\n🧪 ${testConfig.name}`);
  console.log('=' .repeat(50));
  
  const results = {
    duplicateFunctions: testDuplicateFunctionDeclarations(),
    globalNamespace: testGlobalNamespacePollution(),
    syntaxIntegrity: testJavaScriptSyntaxIntegrity()
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
  
  // Requirements summary
  console.log('\n📋 Requirements Coverage');
  console.log('=' .repeat(30));
  
  for (const [req, data] of Object.entries(testConfig.requirements)) {
    const status = data.tested ? (data.passed ? '✅ PASS' : '❌ FAIL') : '⏸️ NOT TESTED';
    console.log(`${req}: ${status} - ${data.description}`);
  }
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 All JavaScript error validation tests passed!');
  } else {
    console.log('\n⚠️ Some JavaScript error validation tests failed. Please review the issues above.');
  }
  
  return allPassed;
}

// Export for use in other test files
export { runJavaScriptErrorValidationTests, testConfig };

// Run tests if this file is executed directly
console.log('Debug: import.meta.url =', import.meta.url);
console.log('Debug: process.argv[1] =', process.argv[1]);
console.log('Debug: file URL =', `file://${process.argv[1]}`);

if (import.meta.url.endsWith('test-javascript-error-validation.js')) {
  console.log('Starting JavaScript Error Validation Tests...');
  runJavaScriptErrorValidationTests()
    .then(success => {
      console.log(`Tests completed with success: ${success}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}