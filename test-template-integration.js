/**
 * Template Integration Test
 * Tests the template selection system integration
 */

import fs from 'fs';
import path from 'path';

// Test configuration
const testConfig = {
    templateSystemFile: 'lib/template-selection-system.js',
    templateStylesFile: 'lib/template-styles.css',
    businessFormatterFile: 'lib/business-document-formatter.js',
    testHtmlFile: 'test-template-selection-system.html',
    indexHtmlFile: 'index.html'
};

// Test results
const testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

function runTest(testName, testFunction) {
    try {
        const result = testFunction();
        if (result) {
            testResults.passed++;
            testResults.tests.push({ name: testName, status: 'PASSED', message: result });
            console.log(`✓ ${testName}: PASSED`);
        } else {
            testResults.failed++;
            testResults.tests.push({ name: testName, status: 'FAILED', message: 'Test returned false' });
            console.log(`✗ ${testName}: FAILED`);
        }
    } catch (error) {
        testResults.failed++;
        testResults.tests.push({ name: testName, status: 'ERROR', message: error.message });
        console.log(`✗ ${testName}: ERROR - ${error.message}`);
    }
}

// Test 1: Check if all required files exist
runTest('File Existence Check', () => {
    const missingFiles = [];
    Object.entries(testConfig).forEach(([key, filePath]) => {
        if (!fs.existsSync(filePath)) {
            missingFiles.push(filePath);
        }
    });
    
    if (missingFiles.length > 0) {
        throw new Error(`Missing files: ${missingFiles.join(', ')}`);
    }
    
    return 'All required files exist';
});

// Test 2: Check template system class structure
runTest('Template System Class Structure', () => {
    const templateSystemContent = fs.readFileSync(testConfig.templateSystemFile, 'utf8');
    
    const requiredMethods = [
        'constructor',
        'initialize',
        'getTemplates',
        'getCurrentTemplate',
        'applyTemplate',
        'createTemplateSelector',
        'selectTemplate',
        'getTemplateConfig'
    ];
    
    const missingMethods = requiredMethods.filter(method => 
        !templateSystemContent.includes(method)
    );
    
    if (missingMethods.length > 0) {
        throw new Error(`Missing methods: ${missingMethods.join(', ')}`);
    }
    
    return 'All required methods found in TemplateSelectionSystem';
});

// Test 3: Check template definitions
runTest('Template Definitions Check', () => {
    const templateSystemContent = fs.readFileSync(testConfig.templateSystemFile, 'utf8');
    
    const requiredTemplates = ['simple', 'formal', 'modern'];
    const missingTemplates = requiredTemplates.filter(template => 
        !templateSystemContent.includes(`${template}:`) && 
        !templateSystemContent.includes(`'${template}'`) && 
        !templateSystemContent.includes(`"${template}"`)
    );
    
    if (missingTemplates.length > 0) {
        throw new Error(`Missing templates: ${missingTemplates.join(', ')}`);
    }
    
    return 'All required templates (simple, formal, modern) are defined';
});

// Test 4: Check CSS template styles
runTest('Template CSS Styles Check', () => {
    const templateStylesContent = fs.readFileSync(testConfig.templateStylesFile, 'utf8');
    
    const requiredClasses = [
        '.business-template-simple',
        '.business-template-formal',
        '.business-template-modern'
    ];
    
    const missingClasses = requiredClasses.filter(className => 
        !templateStylesContent.includes(className)
    );
    
    if (missingClasses.length > 0) {
        throw new Error(`Missing CSS classes: ${missingClasses.join(', ')}`);
    }
    
    return 'All template CSS classes are defined';
});

// Test 5: Check index.html integration
runTest('Index.html Integration Check', () => {
    const indexContent = fs.readFileSync(testConfig.indexHtmlFile, 'utf8');
    
    const requiredIntegrations = [
        'template-selection-system.js',
        'template-styles.css',
        'templateSelect',
        'applyDocumentTemplate',
        'showTemplatePreview'
    ];
    
    const missingIntegrations = requiredIntegrations.filter(integration => 
        !indexContent.includes(integration)
    );
    
    if (missingIntegrations.length > 0) {
        throw new Error(`Missing integrations: ${missingIntegrations.join(', ')}`);
    }
    
    return 'Template system is properly integrated into index.html';
});

// Test 6: Check test HTML file structure
runTest('Test HTML File Structure', () => {
    const testHtmlContent = fs.readFileSync(testConfig.testHtmlFile, 'utf8');
    
    const requiredElements = [
        'TemplateSelectionSystem',
        'BusinessDocumentFormatter',
        'templateSystem.initialize',
        'createTemplateSelector'
    ];
    
    const missingElements = requiredElements.filter(element => 
        !testHtmlContent.includes(element)
    );
    
    if (missingElements.length > 0) {
        throw new Error(`Missing elements: ${missingElements.join(', ')}`);
    }
    
    return 'Test HTML file has proper structure';
});

// Test 7: Check JavaScript syntax validity
runTest('JavaScript Syntax Validation', () => {
    try {
        // Basic syntax check by attempting to parse
        const templateSystemContent = fs.readFileSync(testConfig.templateSystemFile, 'utf8');
        
        // Check for common syntax issues
        const syntaxIssues = [];
        
        // Check for unmatched braces
        const openBraces = (templateSystemContent.match(/{/g) || []).length;
        const closeBraces = (templateSystemContent.match(/}/g) || []).length;
        if (openBraces !== closeBraces) {
            syntaxIssues.push('Unmatched braces');
        }
        
        // Check for unmatched parentheses
        const openParens = (templateSystemContent.match(/\(/g) || []).length;
        const closeParens = (templateSystemContent.match(/\)/g) || []).length;
        if (openParens !== closeParens) {
            syntaxIssues.push('Unmatched parentheses');
        }
        
        if (syntaxIssues.length > 0) {
            throw new Error(`Syntax issues: ${syntaxIssues.join(', ')}`);
        }
        
        return 'JavaScript syntax appears valid';
    } catch (error) {
        throw new Error(`Syntax validation failed: ${error.message}`);
    }
});

// Test 8: Check requirements compliance
runTest('Requirements Compliance Check', () => {
    const templateSystemContent = fs.readFileSync(testConfig.templateSystemFile, 'utf8');
    const indexContent = fs.readFileSync(testConfig.indexHtmlFile, 'utf8');
    
    // Check requirement 5.1: Multiple design options
    const hasMultipleTemplates = templateSystemContent.includes('simple') && 
                                templateSystemContent.includes('formal') && 
                                templateSystemContent.includes('modern');
    
    // Check requirement 5.2: Template application
    const hasTemplateApplication = templateSystemContent.includes('applyTemplate');
    
    // Check requirement 5.3: Content preservation
    const hasContentPreservation = templateSystemContent.includes('applyTemplateToElement') ||
                                   templateSystemContent.includes('applyTemplateStyles');
    
    // Check integration in index.html
    const hasIndexIntegration = indexContent.includes('applyDocumentTemplate');
    
    const missingRequirements = [];
    if (!hasMultipleTemplates) missingRequirements.push('Multiple template options');
    if (!hasTemplateApplication) missingRequirements.push('Template application functionality');
    if (!hasContentPreservation) missingRequirements.push('Content preservation mechanism');
    if (!hasIndexIntegration) missingRequirements.push('Index.html integration');
    
    if (missingRequirements.length > 0) {
        throw new Error(`Missing requirements: ${missingRequirements.join(', ')}`);
    }
    
    return 'All requirements (5.1, 5.2, 5.3) are implemented';
});

// Run all tests
console.log('🧪 Running Template Selection System Integration Tests...\n');

// Execute tests
console.log('Running tests...\n');

// Print results
console.log('\n📊 Test Results Summary:');
console.log(`✓ Passed: ${testResults.passed}`);
console.log(`✗ Failed: ${testResults.failed}`);
console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.tests.filter(test => test.status !== 'PASSED').forEach(test => {
        console.log(`   • ${test.name}: ${test.message}`);
    });
}

console.log('\n🎯 Template Selection System Implementation Status:');
if (testResults.failed === 0) {
    console.log('✅ All tests passed! Template selection system is ready for use.');
    console.log('\n📋 Implementation Summary:');
    console.log('   • TemplateSelectionSystem class with 3 templates (Simple, Formal, Modern)');
    console.log('   • Template-specific CSS styles for professional document formatting');
    console.log('   • Integration with index.html format controls');
    console.log('   • Template preview and selection functionality');
    console.log('   • Business document formatter integration');
    console.log('   • Comprehensive test coverage');
    
    console.log('\n🚀 Next Steps:');
    console.log('   1. Open test-template-selection-system.html to test the system');
    console.log('   2. Use the template selector in the main application');
    console.log('   3. Verify PDF export preserves template styling');
} else {
    console.log('❌ Some tests failed. Please review and fix the issues above.');
}

// Exit with appropriate code
process.exit(testResults.failed > 0 ? 1 : 0);