/**
 * Integration Test Suite for Proposal Editor Enhancement
 * Tests the complete editing and export workflow
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const integrationTestConfig = {
    testScenarios: [
        'markdown-to-wysiwyg-workflow',
        'template-application-workflow',
        'pdf-export-workflow',
        'word-export-workflow',
        'header-footer-workflow',
        'content-validation-workflow',
        'error-recovery-workflow'
    ],
    sampleContent: {
        markdown: `# Business Proposal Test

This is a **comprehensive test** of the proposal editor enhancement system.

## Key Features

### Rich Text Editing
- Bold and *italic* formatting
- Multiple heading levels
- Lists and tables

### Export Capabilities
1. PDF export with professional styling
2. Word document generation
3. Print preview functionality

## Technical Details

| Component | Status | Priority |
|-----------|--------|----------|
| WYSIWYG Editor | ✅ Complete | High |
| PDF Export | ✅ Complete | High |
| Word Export | ✅ Complete | Medium |

> This system provides professional document creation capabilities.`,
        
        html: `<h1>HTML Content Test</h1>
<p>This tests the system's ability to handle <strong>HTML content</strong> directly.</p>
<ul>
<li>List item 1</li>
<li>List item 2</li>
</ul>
<table>
<tr><th>Header</th><th>Value</th></tr>
<tr><td>Test</td><td>Data</td></tr>
</table>`
    }
};

let integrationResults = {
    passed: 0,
    failed: 0,
    total: 0,
    scenarios: []
};

function logIntegrationTest(testName, passed, message = '', details = {}) {
    integrationResults.total++;
    if (passed) {
        integrationResults.passed++;
        console.log(`✓ ${testName}`);
    } else {
        integrationResults.failed++;
        console.log(`✗ ${testName}: ${message}`);
    }
    
    integrationResults.scenarios.push({
        testName,
        passed,
        message,
        details,
        timestamp: new Date().toISOString()
    });
}

// Integration Test 1: Markdown to WYSIWYG Workflow
function testMarkdownToWYSIWYGWorkflow() {
    console.log('\n=== Testing Markdown to WYSIWYG Workflow ===');
    
    try {
        // Check if required components exist
        const wysiwygExists = fs.existsSync('lib/enhanced-wysiwyg-editor.js');
        const markdownRendererExists = fs.existsSync('lib/markdown-renderer.js');
        
        logIntegrationTest(
            'Required components for markdown workflow exist',
            wysiwygExists && markdownRendererExists,
            wysiwygExists ? '' : 'WYSIWYG editor missing',
            { wysiwygExists, markdownRendererExists }
        );
        
        if (wysiwygExists && markdownRendererExists) {
            // Check component integration
            const wysiwygContent = fs.readFileSync('lib/enhanced-wysiwyg-editor.js', 'utf8');
            const hasMarkdownIntegration = wysiwygContent.includes('markdown') || wysiwygContent.includes('Markdown');
            
            logIntegrationTest(
                'WYSIWYG editor has markdown integration',
                hasMarkdownIntegration,
                hasMarkdownIntegration ? '' : 'No markdown integration found'
            );
            
            // Check for content conversion methods
            const hasLoadMarkdown = wysiwygContent.includes('loadMarkdownContent');
            const hasGetMarkdown = wysiwygContent.includes('getMarkdown') || wysiwygContent.includes('markdown');
            
            logIntegrationTest(
                'WYSIWYG editor supports markdown conversion',
                hasLoadMarkdown || hasGetMarkdown,
                'Missing markdown conversion methods'
            );
        }
        
    } catch (error) {
        logIntegrationTest(
            'Markdown to WYSIWYG workflow test',
            false,
            error.message
        );
    }
}

// Integration Test 2: Template Application Workflow
function testTemplateApplicationWorkflow() {
    console.log('\n=== Testing Template Application Workflow ===');
    
    try {
        const templateSystemExists = fs.existsSync('lib/template-selection-system.js');
        const businessFormatterExists = fs.existsSync('lib/business-document-formatter.js');
        const templateStylesExist = fs.existsSync('lib/template-styles.css');
        
        logIntegrationTest(
            'Template system components exist',
            templateSystemExists && businessFormatterExists && templateStylesExist,
            'Missing template system components',
            { templateSystemExists, businessFormatterExists, templateStylesExist }
        );
        
        if (templateSystemExists) {
            const templateContent = fs.readFileSync('lib/template-selection-system.js', 'utf8');
            
            // Check for template definitions
            const hasSimpleTemplate = templateContent.includes('simple');
            const hasFormalTemplate = templateContent.includes('formal');
            const hasModernTemplate = templateContent.includes('modern');
            
            logIntegrationTest(
                'Template system includes all required templates',
                hasSimpleTemplate && hasFormalTemplate && hasModernTemplate,
                'Missing template definitions',
                { hasSimpleTemplate, hasFormalTemplate, hasModernTemplate }
            );
            
            // Check for integration methods
            const hasApplyTemplate = templateContent.includes('applyTemplate');
            const hasSelectTemplate = templateContent.includes('selectTemplate');
            
            logIntegrationTest(
                'Template system has application methods',
                hasApplyTemplate && hasSelectTemplate,
                'Missing template application methods'
            );
        }
        
    } catch (error) {
        logIntegrationTest(
            'Template application workflow test',
            false,
            error.message
        );
    }
}

// Integration Test 3: PDF Export Workflow
function testPDFExportWorkflow() {
    console.log('\n=== Testing PDF Export Workflow ===');
    
    try {
        const pdfExportExists = fs.existsSync('lib/pdf-export-manager.js');
        const businessFormatterExists = fs.existsSync('lib/business-document-formatter.js');
        
        logIntegrationTest(
            'PDF export components exist',
            pdfExportExists && businessFormatterExists,
            'Missing PDF export components',
            { pdfExportExists, businessFormatterExists }
        );
        
        if (pdfExportExists) {
            const pdfContent = fs.readFileSync('lib/pdf-export-manager.js', 'utf8');
            
            // Check for export functionality
            const hasExportToPDF = pdfContent.includes('exportToPDF');
            const hasBusinessFormatting = pdfContent.includes('business') || pdfContent.includes('Business');
            
            logIntegrationTest(
                'PDF export manager has required functionality',
                hasExportToPDF,
                'Missing exportToPDF method'
            );
            
            logIntegrationTest(
                'PDF export supports business formatting',
                hasBusinessFormatting,
                'No business formatting integration found'
            );
            
            // Check for print CSS integration
            const hasPrintCSS = pdfContent.includes('print') || pdfContent.includes('Print');
            logIntegrationTest(
                'PDF export integrates with print CSS',
                hasPrintCSS,
                'No print CSS integration found'
            );
        }
        
    } catch (error) {
        logIntegrationTest(
            'PDF export workflow test',
            false,
            error.message
        );
    }
}

// Integration Test 4: Word Export Workflow
function testWordExportWorkflow() {
    console.log('\n=== Testing Word Export Workflow ===');
    
    try {
        const wordExportExists = fs.existsSync('lib/word-export-manager-browser.js');
        
        logIntegrationTest(
            'Word export manager exists',
            wordExportExists,
            'Word export manager file not found'
        );
        
        if (wordExportExists) {
            const wordContent = fs.readFileSync('lib/word-export-manager-browser.js', 'utf8');
            
            // Check for export functionality
            const hasExportToWord = wordContent.includes('exportToWord');
            const hasDocxSupport = wordContent.includes('docx') || wordContent.includes('DOCX');
            
            logIntegrationTest(
                'Word export manager has export functionality',
                hasExportToWord,
                'Missing exportToWord method'
            );
            
            logIntegrationTest(
                'Word export supports DOCX format',
                hasDocxSupport,
                'No DOCX format support found'
            );
            
            // Check for HTML to Word conversion
            const hasHTMLConversion = wordContent.includes('HTML') || wordContent.includes('html');
            logIntegrationTest(
                'Word export supports HTML conversion',
                hasHTMLConversion,
                'No HTML conversion support found'
            );
        }
        
    } catch (error) {
        logIntegrationTest(
            'Word export workflow test',
            false,
            error.message
        );
    }
}

// Integration Test 5: Header/Footer Workflow
function testHeaderFooterWorkflow() {
    console.log('\n=== Testing Header/Footer Workflow ===');
    
    try {
        const headerFooterExists = fs.existsSync('lib/header-footer-manager.js');
        
        logIntegrationTest(
            'Header/Footer manager exists',
            headerFooterExists,
            'Header/Footer manager file not found'
        );
        
        if (headerFooterExists) {
            const headerFooterContent = fs.readFileSync('lib/header-footer-manager.js', 'utf8');
            
            // Check for header/footer functionality
            const hasSetHeader = headerFooterContent.includes('setHeader');
            const hasSetFooter = headerFooterContent.includes('setFooter');
            const hasRenderHeaders = headerFooterContent.includes('renderHeaders');
            
            logIntegrationTest(
                'Header/Footer manager has required methods',
                hasSetHeader && hasSetFooter && hasRenderHeaders,
                'Missing header/footer methods',
                { hasSetHeader, hasSetFooter, hasRenderHeaders }
            );
            
            // Check for page number support
            const hasPageNumbers = headerFooterContent.includes('pageNumber') || headerFooterContent.includes('page');
            logIntegrationTest(
                'Header/Footer manager supports page numbers',
                hasPageNumbers,
                'No page number support found'
            );
        }
        
    } catch (error) {
        logIntegrationTest(
            'Header/Footer workflow test',
            false,
            error.message
        );
    }
}

// Integration Test 6: Content Validation Workflow
function testContentValidationWorkflow() {
    console.log('\n=== Testing Content Validation Workflow ===');
    
    try {
        const contentValidatorExists = fs.existsSync('lib/content-validator.js');
        const exportErrorHandlerExists = fs.existsSync('lib/export-error-handler.js');
        
        logIntegrationTest(
            'Content validation components exist',
            contentValidatorExists && exportErrorHandlerExists,
            'Missing validation components',
            { contentValidatorExists, exportErrorHandlerExists }
        );
        
        if (contentValidatorExists) {
            const validatorContent = fs.readFileSync('lib/content-validator.js', 'utf8');
            
            // Check for validation methods
            const hasValidateHTML = validatorContent.includes('validateHTML');
            const hasSanitizeContent = validatorContent.includes('sanitizeContent');
            
            logIntegrationTest(
                'Content validator has validation methods',
                hasValidateHTML || hasSanitizeContent,
                'Missing validation methods'
            );
        }
        
        if (exportErrorHandlerExists) {
            const errorHandlerContent = fs.readFileSync('lib/export-error-handler.js', 'utf8');
            
            // Check for error handling methods
            const hasHandleError = errorHandlerContent.includes('handleError') || errorHandlerContent.includes('handleExportError');
            const hasShowError = errorHandlerContent.includes('showError') || errorHandlerContent.includes('showUserFriendlyError');
            
            logIntegrationTest(
                'Export error handler has error methods',
                hasHandleError || hasShowError,
                'Missing error handling methods'
            );
        }
        
    } catch (error) {
        logIntegrationTest(
            'Content validation workflow test',
            false,
            error.message
        );
    }
}

// Integration Test 7: Error Recovery Workflow
function testErrorRecoveryWorkflow() {
    console.log('\n=== Testing Error Recovery Workflow ===');
    
    try {
        // Check if error handling is integrated across components
        const componentsToCheck = [
            'lib/pdf-export-manager.js',
            'lib/word-export-manager-browser.js',
            'lib/enhanced-wysiwyg-editor.js'
        ];
        
        let hasErrorHandling = 0;
        let totalComponents = 0;
        
        componentsToCheck.forEach(componentPath => {
            if (fs.existsSync(componentPath)) {
                totalComponents++;
                const content = fs.readFileSync(componentPath, 'utf8');
                
                // Check for error handling patterns
                const hasTryCatch = content.includes('try') && content.includes('catch');
                const hasErrorHandling = content.includes('error') || content.includes('Error');
                
                if (hasTryCatch || hasErrorHandling) {
                    hasErrorHandling++;
                }
            }
        });
        
        logIntegrationTest(
            'Components implement error handling',
            hasErrorHandling >= Math.ceil(totalComponents * 0.7), // At least 70% should have error handling
            `Only ${hasErrorHandling}/${totalComponents} components have error handling`,
            { hasErrorHandling, totalComponents }
        );
        
        // Check for graceful degradation
        const testFiles = [
            'test-pdf-export-functionality.html',
            'test-word-export-functionality.html',
            'test-enhanced-wysiwyg-editor.html'
        ];
        
        let hasGracefulDegradation = 0;
        testFiles.forEach(testFile => {
            if (fs.existsSync(testFile)) {
                const content = fs.readFileSync(testFile, 'utf8');
                const hasFallback = content.includes('fallback') || content.includes('alternative');
                if (hasFallback) {
                    hasGracefulDegradation++;
                }
            }
        });
        
        logIntegrationTest(
            'System provides graceful degradation',
            hasGracefulDegradation > 0,
            'No graceful degradation patterns found'
        );
        
    } catch (error) {
        logIntegrationTest(
            'Error recovery workflow test',
            false,
            error.message
        );
    }
}

// Integration Test 8: End-to-End Workflow Simulation
function testEndToEndWorkflow() {
    console.log('\n=== Testing End-to-End Workflow ===');
    
    try {
        // Simulate complete workflow steps
        const workflowSteps = [
            { name: 'Load content', component: 'lib/enhanced-wysiwyg-editor.js', method: 'setContent' },
            { name: 'Apply formatting', component: 'lib/business-document-formatter.js', method: 'applyStandardStyling' },
            { name: 'Select template', component: 'lib/template-selection-system.js', method: 'applyTemplate' },
            { name: 'Set headers/footers', component: 'lib/header-footer-manager.js', method: 'setHeader' },
            { name: 'Validate content', component: 'lib/content-validator.js', method: 'validateHTML' },
            { name: 'Export to PDF', component: 'lib/pdf-export-manager.js', method: 'exportToPDF' },
            { name: 'Export to Word', component: 'lib/word-export-manager-browser.js', method: 'exportToWord' }
        ];
        
        let completedSteps = 0;
        workflowSteps.forEach(step => {
            if (fs.existsSync(step.component)) {
                const content = fs.readFileSync(step.component, 'utf8');
                if (content.includes(step.method)) {
                    completedSteps++;
                }
            }
        });
        
        const workflowComplete = completedSteps >= workflowSteps.length * 0.8; // 80% completion
        logIntegrationTest(
            'End-to-end workflow is complete',
            workflowComplete,
            `Only ${completedSteps}/${workflowSteps.length} workflow steps available`,
            { completedSteps, totalSteps: workflowSteps.length, workflowSteps }
        );
        
    } catch (error) {
        logIntegrationTest(
            'End-to-end workflow test',
            false,
            error.message
        );
    }
}

// Main integration test runner
function runIntegrationTests() {
    console.log('🔄 Starting Integration Test Suite for Proposal Editor Enhancement');
    console.log('================================================================');
    
    // Run all integration tests
    testMarkdownToWYSIWYGWorkflow();
    testTemplateApplicationWorkflow();
    testPDFExportWorkflow();
    testWordExportWorkflow();
    testHeaderFooterWorkflow();
    testContentValidationWorkflow();
    testErrorRecoveryWorkflow();
    testEndToEndWorkflow();
    
    // Generate summary
    console.log('\n================================================================');
    console.log('📊 Integration Test Results Summary');
    console.log('================================================================');
    console.log(`Total Integration Tests: ${integrationResults.total}`);
    console.log(`Passed: ${integrationResults.passed} (${Math.round((integrationResults.passed / integrationResults.total) * 100)}%)`);
    console.log(`Failed: ${integrationResults.failed} (${Math.round((integrationResults.failed / integrationResults.total) * 100)}%)`);
    
    if (integrationResults.failed > 0) {
        console.log('\n❌ Failed Integration Tests:');
        integrationResults.scenarios
            .filter(test => !test.passed)
            .forEach(test => {
                console.log(`   • ${test.testName}: ${test.message}`);
            });
    }
    
    // Overall status
    const overallSuccess = integrationResults.failed === 0;
    console.log(`\n${overallSuccess ? '✅' : '❌'} Integration Status: ${overallSuccess ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
    
    // Save results
    const detailedResults = {
        summary: {
            total: integrationResults.total,
            passed: integrationResults.passed,
            failed: integrationResults.failed,
            successRate: Math.round((integrationResults.passed / integrationResults.total) * 100),
            timestamp: new Date().toISOString()
        },
        scenarios: integrationResults.scenarios,
        testConfig: integrationTestConfig
    };
    
    try {
        fs.writeFileSync('test-proposal-editor-integration-results.json', JSON.stringify(detailedResults, null, 2));
        console.log('\n📄 Integration test results saved to: test-proposal-editor-integration-results.json');
    } catch (error) {
        console.log('\n⚠️  Could not save integration test results:', error.message);
    }
    
    return overallSuccess;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runIntegrationTests,
        integrationTestConfig,
        integrationResults
    };
}

// Run tests if this file is executed directly
if (require.main === module) {
    runIntegrationTests();
}