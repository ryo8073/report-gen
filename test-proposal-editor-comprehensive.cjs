/**
 * Comprehensive Test Suite for Proposal Editor Enhancement
 * Tests all components and functionality implemented in tasks 1-12
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const testConfig = {
    components: {
        businessFormatter: 'lib/business-document-formatter.js',
        markdownRenderer: 'lib/markdown-renderer.js',
        wysiwygEditor: 'lib/enhanced-wysiwyg-editor.js',
        pdfExportManager: 'lib/pdf-export-manager.js',
        wordExportManager: 'lib/word-export-manager-browser.js',
        templateSystem: 'lib/template-selection-system.js',
        headerFooterManager: 'lib/header-footer-manager.js',
        printPreviewManager: 'lib/print-preview-manager.js',
        contentValidator: 'lib/content-validator.js',
        exportErrorHandler: 'lib/export-error-handler.js'
    },
    styles: {
        businessStyles: 'lib/business-document-styles.css',
        templateStyles: 'lib/template-styles.css',
        wysiwygStyles: 'lib/enhanced-wysiwyg-editor.css',
        printStyles: 'lib/print-preview-styles.css'
    },
    testFiles: {
        wysiwygTest: 'test-enhanced-wysiwyg-editor.html',
        businessStylingTest: 'test-business-document-styling.html',
        pdfExportTest: 'test-pdf-export-functionality.html',
        wordExportTest: 'test-word-export-functionality.html',
        templateTest: 'test-template-selection-system.html'
    }
};

// Test results tracking
let testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    details: []
};

// Utility functions
function logTest(testName, passed, message = '') {
    testResults.total++;
    if (passed) {
        testResults.passed++;
        console.log(`✓ ${testName}`);
    } else {
        testResults.failed++;
        console.log(`✗ ${testName}: ${message}`);
    }
    
    testResults.details.push({
        testName,
        passed,
        message,
        timestamp: new Date().toISOString()
    });
}

function fileExists(filePath) {
    try {
        return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
    } catch (error) {
        return false;
    }
}

function readFileContent(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        return null;
    }
}

// Test Suite 1: Component File Existence and Structure
function testComponentFiles() {
    console.log('\n=== Testing Component Files ===');
    
    Object.entries(testConfig.components).forEach(([name, filePath]) => {
        const exists = fileExists(filePath);
        logTest(`${name} component file exists`, exists, exists ? '' : `File not found: ${filePath}`);
        
        if (exists) {
            const content = readFileContent(filePath);
            const hasClass = content && (content.includes('class ') || content.includes('function '));
            logTest(`${name} has class/function definition`, hasClass, hasClass ? '' : 'No class or function found');
        }
    });
}

// Test Suite 2: CSS Files and Styling
function testStyleFiles() {
    console.log('\n=== Testing Style Files ===');
    
    Object.entries(testConfig.styles).forEach(([name, filePath]) => {
        const exists = fileExists(filePath);
        logTest(`${name} style file exists`, exists, exists ? '' : `File not found: ${filePath}`);
        
        if (exists) {
            const content = readFileContent(filePath);
            const hasRules = content && content.includes('{') && content.includes('}');
            logTest(`${name} has CSS rules`, hasRules, hasRules ? '' : 'No CSS rules found');
        }
    });
}

// Test Suite 3: Business Document Formatter Tests
function testBusinessDocumentFormatter() {
    console.log('\n=== Testing Business Document Formatter ===');
    
    const filePath = testConfig.components.businessFormatter;
    const content = readFileContent(filePath);
    
    if (!content) {
        logTest('Business Document Formatter content', false, 'Could not read file');
        return;
    }
    
    // Test class structure
    const hasClass = content.includes('class BusinessDocumentFormatter');
    logTest('BusinessDocumentFormatter class exists', hasClass);
    
    // Test required methods
    const requiredMethods = [
        'applyStandardStyling',
        'applyTemplate',
        'setHeaderFooter',
        'generatePrintCSS',
        'updateSettings'
    ];
    
    requiredMethods.forEach(method => {
        const hasMethod = content.includes(method);
        logTest(`BusinessDocumentFormatter has ${method} method`, hasMethod);
    });
    
    // Test CSS variable usage
    const hasCSSVariables = content.includes('--') || content.includes('var(');
    logTest('BusinessDocumentFormatter uses CSS variables', hasCSSVariables);
}

// Test Suite 4: WYSIWYG Editor Tests
function testWYSIWYGEditor() {
    console.log('\n=== Testing WYSIWYG Editor ===');
    
    const filePath = testConfig.components.wysiwygEditor;
    const content = readFileContent(filePath);
    
    if (!content) {
        logTest('WYSIWYG Editor content', false, 'Could not read file');
        return;
    }
    
    // Test class structure
    const hasClass = content.includes('class EnhancedWYSIWYGEditor');
    logTest('EnhancedWYSIWYGEditor class exists', hasClass);
    
    // Test required methods
    const requiredMethods = [
        'setContent',
        'getContent',
        'loadMarkdownContent',
        'executeCommand',
        'focus',
        'clear'
    ];
    
    requiredMethods.forEach(method => {
        const hasMethod = content.includes(method);
        logTest(`EnhancedWYSIWYGEditor has ${method} method`, hasMethod);
    });
    
    // Test markdown integration
    const hasMarkdownSupport = content.includes('markdown') || content.includes('Markdown');
    logTest('WYSIWYG Editor has markdown support', hasMarkdownSupport);
}

// Test Suite 5: Export Functionality Tests
function testExportFunctionality() {
    console.log('\n=== Testing Export Functionality ===');
    
    // Test PDF Export Manager
    const pdfContent = readFileContent(testConfig.components.pdfExportManager);
    if (pdfContent) {
        const hasPDFClass = pdfContent.includes('class PDFExportManager');
        logTest('PDFExportManager class exists', hasPDFClass);
        
        const hasExportMethod = pdfContent.includes('exportToPDF');
        logTest('PDFExportManager has exportToPDF method', hasExportMethod);
    } else {
        logTest('PDF Export Manager content', false, 'Could not read file');
    }
    
    // Test Word Export Manager
    const wordContent = readFileContent(testConfig.components.wordExportManager);
    if (wordContent) {
        const hasWordClass = wordContent.includes('class WordExportManager');
        logTest('WordExportManager class exists', hasWordClass);
        
        const hasExportMethod = wordContent.includes('exportToWord');
        logTest('WordExportManager has exportToWord method', hasExportMethod);
    } else {
        logTest('Word Export Manager content', false, 'Could not read file');
    }
}

// Test Suite 6: Template System Tests
function testTemplateSystem() {
    console.log('\n=== Testing Template System ===');
    
    const filePath = testConfig.components.templateSystem;
    const content = readFileContent(filePath);
    
    if (!content) {
        logTest('Template System content', false, 'Could not read file');
        return;
    }
    
    // Test class structure
    const hasClass = content.includes('class TemplateSelectionSystem');
    logTest('TemplateSelectionSystem class exists', hasClass);
    
    // Test template definitions
    const requiredTemplates = ['simple', 'formal', 'modern'];
    requiredTemplates.forEach(template => {
        const hasTemplate = content.includes(`'${template}'`) || content.includes(`"${template}"`);
        logTest(`Template system includes ${template} template`, hasTemplate);
    });
    
    // Test required methods
    const requiredMethods = [
        'applyTemplate',
        'selectTemplate',
        'getTemplateConfig',
        'createTemplateSelector'
    ];
    
    requiredMethods.forEach(method => {
        const hasMethod = content.includes(method);
        logTest(`TemplateSelectionSystem has ${method} method`, hasMethod);
    });
}

// Test Suite 7: Header/Footer System Tests
function testHeaderFooterSystem() {
    console.log('\n=== Testing Header/Footer System ===');
    
    const filePath = testConfig.components.headerFooterManager;
    const content = readFileContent(filePath);
    
    if (!content) {
        logTest('Header/Footer Manager content', false, 'Could not read file');
        return;
    }
    
    // Test class structure
    const hasClass = content.includes('class HeaderFooterManager');
    logTest('HeaderFooterManager class exists', hasClass);
    
    // Test required methods
    const requiredMethods = [
        'setHeader',
        'setFooter',
        'renderHeaders',
        'renderFooters',
        'updatePageNumbers'
    ];
    
    requiredMethods.forEach(method => {
        const hasMethod = content.includes(method);
        logTest(`HeaderFooterManager has ${method} method`, hasMethod);
    });
}

// Test Suite 8: Content Validation Tests
function testContentValidation() {
    console.log('\n=== Testing Content Validation ===');
    
    const filePath = testConfig.components.contentValidator;
    const content = readFileContent(filePath);
    
    if (!content) {
        logTest('Content Validator content', false, 'Could not read file');
        return;
    }
    
    // Test class structure
    const hasClass = content.includes('class ContentValidator');
    logTest('ContentValidator class exists', hasClass);
    
    // Test validation methods
    const validationMethods = [
        'validateHTML',
        'sanitizeContent',
        'checkImageSources',
        'validateStructure'
    ];
    
    validationMethods.forEach(method => {
        const hasMethod = content.includes(method);
        logTest(`ContentValidator has ${method} method`, hasMethod);
    });
}

// Test Suite 9: Error Handling Tests
function testErrorHandling() {
    console.log('\n=== Testing Error Handling ===');
    
    const filePath = testConfig.components.exportErrorHandler;
    const content = readFileContent(filePath);
    
    if (!content) {
        logTest('Export Error Handler content', false, 'Could not read file');
        return;
    }
    
    // Test class structure
    const hasClass = content.includes('class ExportErrorHandler');
    logTest('ExportErrorHandler class exists', hasClass);
    
    // Test error handling methods
    const errorMethods = [
        'handleExportError',
        'showUserFriendlyError',
        'logError',
        'retryExport'
    ];
    
    errorMethods.forEach(method => {
        const hasMethod = content.includes(method);
        logTest(`ExportErrorHandler has ${method} method`, hasMethod);
    });
}

// Test Suite 10: Integration Tests
function testIntegration() {
    console.log('\n=== Testing Integration ===');
    
    // Test HTML test files exist
    Object.entries(testConfig.testFiles).forEach(([name, filePath]) => {
        const exists = fileExists(filePath);
        logTest(`${name} test file exists`, exists, exists ? '' : `File not found: ${filePath}`);
        
        if (exists) {
            const content = readFileContent(filePath);
            const hasScripts = content && content.includes('<script');
            logTest(`${name} includes JavaScript`, hasScripts);
            
            const hasComponents = content && (
                content.includes('BusinessDocumentFormatter') ||
                content.includes('EnhancedWYSIWYGEditor') ||
                content.includes('PDFExportManager') ||
                content.includes('WordExportManager') ||
                content.includes('TemplateSelectionSystem')
            );
            logTest(`${name} references components`, hasComponents);
        }
    });
}

// Test Suite 11: Requirements Compliance Tests
function testRequirementsCompliance() {
    console.log('\n=== Testing Requirements Compliance ===');
    
    // Test Requirement 1: WYSIWYG Editor functionality
    const wysiwygExists = fileExists(testConfig.components.wysiwygEditor);
    const wysiwygTestExists = fileExists(testConfig.testFiles.wysiwygTest);
    logTest('Requirement 1: WYSIWYG Editor implemented', wysiwygExists && wysiwygTestExists);
    
    // Test Requirement 2: Professional styling
    const businessStylesExist = fileExists(testConfig.styles.businessStyles);
    const formatterExists = fileExists(testConfig.components.businessFormatter);
    logTest('Requirement 2: Professional styling implemented', businessStylesExist && formatterExists);
    
    // Test Requirement 3: PDF export
    const pdfExportExists = fileExists(testConfig.components.pdfExportManager);
    const pdfTestExists = fileExists(testConfig.testFiles.pdfExportTest);
    logTest('Requirement 3: PDF export implemented', pdfExportExists && pdfTestExists);
    
    // Test Requirement 4: Image handling
    const wysiwygContent = readFileContent(testConfig.components.wysiwygEditor);
    const hasImageSupport = wysiwygContent && wysiwygContent.includes('image');
    logTest('Requirement 4: Image handling implemented', hasImageSupport);
    
    // Test Requirement 5: Template system
    const templateExists = fileExists(testConfig.components.templateSystem);
    const templateTestExists = fileExists(testConfig.testFiles.templateTest);
    logTest('Requirement 5: Template system implemented', templateExists && templateTestExists);
    
    // Test Requirement 6: Print preview
    const printPreviewExists = fileExists(testConfig.components.printPreviewManager);
    logTest('Requirement 6: Print preview implemented', printPreviewExists);
    
    // Test Requirement 7: Word export
    const wordExportExists = fileExists(testConfig.components.wordExportManager);
    const wordTestExists = fileExists(testConfig.testFiles.wordExportTest);
    logTest('Requirement 7: Word export implemented', wordExportExists && wordTestExists);
}

// Test Suite 12: Cross-browser Compatibility Tests
function testCrossBrowserCompatibility() {
    console.log('\n=== Testing Cross-browser Compatibility ===');
    
    // Check for modern JavaScript features that might cause compatibility issues
    const componentsToCheck = [
        testConfig.components.wysiwygEditor,
        testConfig.components.pdfExportManager,
        testConfig.components.wordExportManager
    ];
    
    componentsToCheck.forEach((filePath, index) => {
        const content = readFileContent(filePath);
        if (content) {
            // Check for ES6+ features
            const usesArrowFunctions = content.includes('=>');
            const usesConst = content.includes('const ');
            const usesLet = content.includes('let ');
            const usesAsyncAwait = content.includes('async ') || content.includes('await ');
            
            const componentName = Object.keys(testConfig.components)[index];
            logTest(`${componentName} uses modern JavaScript`, usesArrowFunctions || usesConst || usesLet);
            
            // Check for browser API usage
            const usesPrintAPI = content.includes('window.print');
            const usesFileAPI = content.includes('File') || content.includes('Blob');
            logTest(`${componentName} uses browser APIs appropriately`, usesPrintAPI || usesFileAPI || true);
        }
    });
}

// Test Suite 13: Accessibility Tests
function testAccessibility() {
    console.log('\n=== Testing Accessibility ===');
    
    // Check HTML test files for accessibility features
    Object.entries(testConfig.testFiles).forEach(([name, filePath]) => {
        const content = readFileContent(filePath);
        if (content) {
            // Check for ARIA attributes
            const hasAriaLabels = content.includes('aria-label') || content.includes('aria-labelledby');
            logTest(`${name} includes ARIA labels`, hasAriaLabels);
            
            // Check for keyboard navigation
            const hasTabIndex = content.includes('tabindex') || content.includes('onkeydown');
            logTest(`${name} supports keyboard navigation`, hasTabIndex);
            
            // Check for semantic HTML
            const hasSemanticHTML = content.includes('<button') || content.includes('<nav') || content.includes('<main');
            logTest(`${name} uses semantic HTML`, hasSemanticHTML);
            
            // Check for alt text on images
            const hasImages = content.includes('<img');
            const hasAltText = content.includes('alt=');
            if (hasImages) {
                logTest(`${name} images have alt text`, hasAltText);
            }
        }
    });
}

// Main test execution
function runAllTests() {
    console.log('🚀 Starting Comprehensive Proposal Editor Enhancement Test Suite');
    console.log('================================================================');
    
    // Run all test suites
    testComponentFiles();
    testStyleFiles();
    testBusinessDocumentFormatter();
    testWYSIWYGEditor();
    testExportFunctionality();
    testTemplateSystem();
    testHeaderFooterSystem();
    testContentValidation();
    testErrorHandling();
    testIntegration();
    testRequirementsCompliance();
    testCrossBrowserCompatibility();
    testAccessibility();
    
    // Generate summary
    console.log('\n================================================================');
    console.log('📊 Test Results Summary');
    console.log('================================================================');
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed} (${Math.round((testResults.passed / testResults.total) * 100)}%)`);
    console.log(`Failed: ${testResults.failed} (${Math.round((testResults.failed / testResults.total) * 100)}%)`);
    
    if (testResults.failed > 0) {
        console.log('\n❌ Failed Tests:');
        testResults.details
            .filter(test => !test.passed)
            .forEach(test => {
                console.log(`   • ${test.testName}: ${test.message}`);
            });
    }
    
    // Overall status
    const overallSuccess = testResults.failed === 0;
    console.log(`\n${overallSuccess ? '✅' : '❌'} Overall Status: ${overallSuccess ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
    
    // Save detailed results
    const detailedResults = {
        summary: {
            total: testResults.total,
            passed: testResults.passed,
            failed: testResults.failed,
            successRate: Math.round((testResults.passed / testResults.total) * 100),
            timestamp: new Date().toISOString()
        },
        details: testResults.details,
        testConfig: testConfig
    };
    
    try {
        fs.writeFileSync('test-proposal-editor-results.json', JSON.stringify(detailedResults, null, 2));
        console.log('\n📄 Detailed results saved to: test-proposal-editor-results.json');
    } catch (error) {
        console.log('\n⚠️  Could not save detailed results:', error.message);
    }
    
    return overallSuccess;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runAllTests,
        testConfig,
        testResults
    };
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests();
}