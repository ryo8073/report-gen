// Complete Trial Site Test Suite Runner
// Task 5: Test and Validate Core Functionality
// Runs all subtasks: 5.1, 5.2, 5.3

import fs from 'fs/promises';
import { runTask51Tests } from './test-trial-site-functionality.js';
import { runTask52Tests } from './test-trial-site-error-handling.js';
import { runTask53Tests } from './test-trial-site-performance.js';

// Test configuration
const COMPLETE_RESULTS_FILE = 'trial-site-complete-test-results.json';

// Complete test results
const completeResults = {
  timestamp: new Date().toISOString(),
  testSuites: {
    functionality: { completed: false, passed: false, duration: 0 },
    errorHandling: { completed: false, passed: false, duration: 0 },
    performance: { completed: false, passed: false, duration: 0 }
  },
  summary: {
    totalSuites: 3,
    completedSuites: 0,
    passedSuites: 0,
    overallSuccess: false,
    totalDuration: 0
  },
  requirements: {
    '1.1': { tested: false, passed: false, description: 'Trial users can access without authentication' },
    '1.2': { tested: false, passed: false, description: 'Report requests processed without credentials' },
    '1.3': { tested: false, passed: false, description: 'No authentication endpoint calls' },
    '1.4': { tested: false, passed: false, description: 'Interface loads without login prompts' },
    '2.1': { tested: false, passed: false, description: 'Correct API endpoint usage' },
    '2.2': { tested: false, passed: false, description: 'API accepts requests without auth headers' },
    '2.3': { tested: false, passed: false, description: 'Different report types processed correctly' },
    '2.4': { tested: false, passed: false, description: 'Proper response format' },
    '3.1': { tested: false, passed: false, description: 'User-friendly error messages' },
    '3.2': { tested: false, passed: false, description: 'OpenAI unavailable error handling' },
    '3.3': { tested: false, passed: false, description: 'No authentication errors for trial users' },
    '3.4': { tested: false, passed: false, description: 'File upload error feedback' },
    '4.1': { tested: false, passed: false, description: 'Text input acceptance' },
    '4.2': { tested: false, passed: false, description: 'File upload processing' },
    '4.3': { tested: false, passed: false, description: 'Different report types handling' },
    '4.4': { tested: false, passed: false, description: 'File content inclusion in reports' },
    '5.1': { tested: false, passed: false, description: 'Readable report format' },
    '5.2': { tested: false, passed: false, description: 'Report copy functionality' },
    '5.3': { tested: false, passed: false, description: 'Report download functionality' },
    '5.4': { tested: false, passed: false, description: 'Progress indication' }
  }
};

async function checkServerAvailability() {
  console.log('🔍 Checking server availability...');
  
  try {
    const response = await fetch('http://localhost:3000/api/generate', {
      method: 'OPTIONS'
    });
    
    if (response.status === 200) {
      console.log('✅ Server is available and responding');
      return true;
    } else {
      console.log(`❌ Server responded with status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Server is not available: ${error.message}`);
    console.log('💡 Please ensure the server is running on http://localhost:3000');
    return false;
  }
}

async function runCompleteTestSuite() {
  console.log('🚀 Starting Complete Trial Site Test Suite');
  console.log('=' .repeat(80));
  console.log(`Test execution started at: ${new Date().toISOString()}`);
  console.log('');
  
  const overallStartTime = Date.now();
  
  // Check server availability first
  const serverAvailable = await checkServerAvailability();
  if (!serverAvailable) {
    console.log('\n❌ Cannot proceed with tests - server is not available');
    console.log('Please start the server with: node server.js or npm start');
    return false;
  }
  
  console.log('');
  
  try {
    // Task 5.1: Report Generation Functionality
    console.log('📋 Running Task 5.1: Report Generation Functionality Tests');
    console.log('-' .repeat(60));
    const task51StartTime = Date.now();
    
    try {
      const task51Success = await runTask51Tests();
      const task51Duration = Date.now() - task51StartTime;
      
      completeResults.testSuites.functionality = {
        completed: true,
        passed: task51Success,
        duration: task51Duration
      };
      
      if (task51Success) {
        completeResults.summary.passedSuites++;
        console.log(`✅ Task 5.1 completed successfully in ${task51Duration}ms`);
      } else {
        console.log(`❌ Task 5.1 completed with failures in ${task51Duration}ms`);
      }
      
      completeResults.summary.completedSuites++;
      
    } catch (error) {
      console.log(`❌ Task 5.1 failed to execute: ${error.message}`);
      completeResults.testSuites.functionality.completed = false;
    }
    
    console.log('');
    
    // Task 5.2: Error Handling Scenarios
    console.log('🚨 Running Task 5.2: Error Handling Scenarios Tests');
    console.log('-' .repeat(60));
    const task52StartTime = Date.now();
    
    try {
      const task52Success = await runTask52Tests();
      const task52Duration = Date.now() - task52StartTime;
      
      completeResults.testSuites.errorHandling = {
        completed: true,
        passed: task52Success,
        duration: task52Duration
      };
      
      if (task52Success) {
        completeResults.summary.passedSuites++;
        console.log(`✅ Task 5.2 completed successfully in ${task52Duration}ms`);
      } else {
        console.log(`❌ Task 5.2 completed with failures in ${task52Duration}ms`);
      }
      
      completeResults.summary.completedSuites++;
      
    } catch (error) {
      console.log(`❌ Task 5.2 failed to execute: ${error.message}`);
      completeResults.testSuites.errorHandling.completed = false;
    }
    
    console.log('');
    
    // Task 5.3: Performance and Integration Testing
    console.log('⚡ Running Task 5.3: Performance and Integration Tests');
    console.log('-' .repeat(60));
    const task53StartTime = Date.now();
    
    try {
      const task53Success = await runTask53Tests();
      const task53Duration = Date.now() - task53StartTime;
      
      completeResults.testSuites.performance = {
        completed: true,
        passed: task53Success,
        duration: task53Duration
      };
      
      if (task53Success) {
        completeResults.summary.passedSuites++;
        console.log(`✅ Task 5.3 completed successfully in ${task53Duration}ms`);
      } else {
        console.log(`❌ Task 5.3 completed with failures in ${task53Duration}ms`);
      }
      
      completeResults.summary.completedSuites++;
      
    } catch (error) {
      console.log(`❌ Task 5.3 failed to execute: ${error.message}`);
      completeResults.testSuites.performance.completed = false;
    }
    
    // Calculate overall results
    const totalDuration = Date.now() - overallStartTime;
    completeResults.summary.totalDuration = totalDuration;
    completeResults.summary.overallSuccess = completeResults.summary.passedSuites === completeResults.summary.totalSuites;
    
    // Generate final summary
    console.log('\n' + '=' .repeat(80));
    console.log('🏁 COMPLETE TEST SUITE SUMMARY');
    console.log('=' .repeat(80));
    
    console.log(`\n📊 Test Suite Results:`);
    console.log(`  Task 5.1 (Functionality): ${completeResults.testSuites.functionality.passed ? '✅ PASSED' : '❌ FAILED'} (${completeResults.testSuites.functionality.duration}ms)`);
    console.log(`  Task 5.2 (Error Handling): ${completeResults.testSuites.errorHandling.passed ? '✅ PASSED' : '❌ FAILED'} (${completeResults.testSuites.errorHandling.duration}ms)`);
    console.log(`  Task 5.3 (Performance): ${completeResults.testSuites.performance.passed ? '✅ PASSED' : '❌ FAILED'} (${completeResults.testSuites.performance.duration}ms)`);
    
    console.log(`\n📈 Overall Statistics:`);
    console.log(`  Total Test Suites: ${completeResults.summary.totalSuites}`);
    console.log(`  Completed Suites: ${completeResults.summary.completedSuites}`);
    console.log(`  Passed Suites: ${completeResults.summary.passedSuites}`);
    console.log(`  Success Rate: ${Math.round((completeResults.summary.passedSuites / completeResults.summary.totalSuites) * 100)}%`);
    console.log(`  Total Duration: ${Math.round(totalDuration / 1000)}s`);
    
    console.log(`\n🎯 Overall Result: ${completeResults.summary.overallSuccess ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    // Save complete results
    await fs.writeFile(COMPLETE_RESULTS_FILE, JSON.stringify(completeResults, null, 2));
    console.log(`\n📄 Complete results saved to: ${COMPLETE_RESULTS_FILE}`);
    
    // Provide recommendations
    console.log('\n💡 Recommendations:');
    if (completeResults.summary.overallSuccess) {
      console.log('  ✅ All core functionality is working correctly');
      console.log('  ✅ Error handling is robust and user-friendly');
      console.log('  ✅ Performance meets acceptable thresholds');
      console.log('  🚀 The trial site is ready for user testing');
    } else {
      console.log('  ⚠️  Some tests failed - review individual test results');
      console.log('  🔧 Fix failing functionality before deploying');
      console.log('  📋 Check individual test result files for detailed error information');
    }
    
    return completeResults.summary.overallSuccess;
    
  } catch (error) {
    console.error('\n❌ Complete test suite execution failed:', error);
    console.log('📋 Check server status and try again');
    return false;
  }
}

// Additional utility functions
async function generateTestReport() {
  console.log('\n📋 Generating detailed test report...');
  
  const reportContent = `# Trial Site Test Report

## Test Execution Summary
- **Execution Date**: ${completeResults.timestamp}
- **Total Duration**: ${Math.round(completeResults.summary.totalDuration / 1000)}s
- **Overall Success**: ${completeResults.summary.overallSuccess ? 'PASSED' : 'FAILED'}

## Test Suite Results

### Task 5.1: Report Generation Functionality
- **Status**: ${completeResults.testSuites.functionality.passed ? 'PASSED' : 'FAILED'}
- **Duration**: ${completeResults.testSuites.functionality.duration}ms
- **Coverage**: Basic report generation, text input, file uploads, report quality

### Task 5.2: Error Handling Scenarios  
- **Status**: ${completeResults.testSuites.errorHandling.passed ? 'PASSED' : 'FAILED'}
- **Duration**: ${completeResults.testSuites.errorHandling.duration}ms
- **Coverage**: Invalid inputs, oversized files, API errors, user-friendly messages

### Task 5.3: Performance and Integration Testing
- **Status**: ${completeResults.testSuites.performance.passed ? 'PASSED' : 'FAILED'}
- **Duration**: ${completeResults.testSuites.performance.duration}ms
- **Coverage**: Large files, concurrent requests, response times, complete workflows

## Requirements Coverage

${Object.entries(completeResults.requirements).map(([req, data]) => 
  `- **${req}**: ${data.passed ? '✅' : '❌'} ${data.description}`
).join('\n')}

## Recommendations

${completeResults.summary.overallSuccess ? 
  '✅ All tests passed. The trial site is ready for production use.' :
  '⚠️ Some tests failed. Review individual test results and fix issues before deployment.'
}

## Test Files Generated
- \`trial-site-test-results.json\` - Task 5.1 detailed results
- \`trial-site-error-test-results.json\` - Task 5.2 detailed results  
- \`trial-site-performance-test-results.json\` - Task 5.3 detailed results
- \`trial-site-complete-test-results.json\` - Complete test summary
`;

  await fs.writeFile('TRIAL_SITE_TEST_REPORT.md', reportContent);
  console.log('📄 Detailed test report saved to: TRIAL_SITE_TEST_REPORT.md');
}

// Export for use in other files
export {
  runCompleteTestSuite,
  completeResults,
  generateTestReport
};

// Run complete test suite if called directly
const isMainModule = import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMainModule) {
  runCompleteTestSuite().then(async (success) => {
    await generateTestReport();
    process.exit(success ? 0 : 1);
  });
}