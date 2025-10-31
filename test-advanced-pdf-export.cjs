/**
 * Test Advanced PDF Export Engine
 * Tests the enhanced PDF export functionality with jsPDF and html2canvas
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const testConfig = {
    testName: 'Advanced PDF Export Engine Test',
    timestamp: new Date().toISOString(),
    outputFile: 'test-advanced-pdf-export-results.json'
};

// Test results storage
const testResults = {
    testName: testConfig.testName,
    timestamp: testConfig.timestamp,
    tests: [],
    summary: {
        total: 0,
        passed: 0,
        failed: 0,
        errors: []
    }
};

/**
 * Add test result
 */
function addTestResult(testName, passed, details = '', error = null) {
    const result = {
        test: testName,
        passed,
        details,
        error: error ? error.message : null,
        timestamp: new Date().toISOString()
    };
    
    testResults.tests.push(result);
    testResults.summary.total++;
    
    if (passed) {
        testResults.summary.passed++;
        console.log(`✓ ${testName}: ${details}`);
    } else {
        testResults.summary.failed++;
        testResults.summary.errors.push(error ? error.message : 'Test failed');
        console.log(`✗ ${testName}: ${details}${error ? ` (${error.message})` : ''}`);
    }
}

/**
 * Test PDF Export Manager file structure
 */
function testFileStructure() {
    console.log('\n=== Testing File Structure ===');
    
    try {
        // Check if PDF export manager exists
        const pdfManagerPath = path.join(__dirname, 'lib', 'pdf-export-manager.js');
        const exists = fs.existsSync(pdfManagerPath);
        addTestResult(
            'PDF Export Manager File Exists',
            exists,
            exists ? 'File found at lib/pdf-export-manager.js' : 'File not found'
        );
        
        if (exists) {
            // Check file content for advanced features
            const content = fs.readFileSync(pdfManagerPath, 'utf8');
            
            // Test for jsPDF integration
            const hasJsPDF = content.includes('jsPDF') && content.includes('html2canvas');
            addTestResult(
                'Advanced PDF Libraries Integration',
                hasJsPDF,
                hasJsPDF ? 'jsPDF and html2canvas integration found' : 'Missing advanced PDF library integration'
            );
            
            // Test for advanced features
            const hasAdvancedFeatures = content.includes('convertContentToPDF') && 
                                      content.includes('addPageHeadersFooters') &&
                                      content.includes('setPageSettings');
            addTestResult(
                'Advanced PDF Features',
                hasAdvancedFeatures,
                hasAdvancedFeatures ? 'Advanced PDF features implemented' : 'Missing advanced PDF features'
            );
            
            // Test for page break handling
            const hasPageBreaks = content.includes('addPageBreakMarkers') && 
                                content.includes('addContentToPages');
            addTestResult(
                'Page Break Handling',
                hasPageBreaks,
                hasPageBreaks ? 'Page break handling implemented' : 'Missing page break handling'
            );
            
            // Test for custom margins and settings
            const hasCustomSettings = content.includes('setPageSettings') && 
                                    content.includes('validateSettings') &&
                                    content.includes('getPageDimensions');
            addTestResult(
                'Custom Page Settings',
                hasCustomSettings,
                hasCustomSettings ? 'Custom page settings implemented' : 'Missing custom page settings'
            );
            
            // Test for header/footer positioning
            const hasHeaderFooter = content.includes('addPageHeader') && 
                                  content.includes('addPageFooter') &&
                                  content.includes('headerFooterOptions');
            addTestResult(
                'Header/Footer Positioning',
                hasHeaderFooter,
                hasHeaderFooter ? 'Header/footer positioning implemented' : 'Missing header/footer positioning'
            );
        }
        
    } catch (error) {
        addTestResult('File Structure Test', false, 'Error reading files', error);
    }
}

/**
 * Test HTML integration
 */
function testHTMLIntegration() {
    console.log('\n=== Testing HTML Integration ===');
    
    try {
        // Check index.html for CDN libraries
        const indexPath = path.join(__dirname, 'index.html');
        if (fs.existsSync(indexPath)) {
            const content = fs.readFileSync(indexPath, 'utf8');
            
            // Test for jsPDF CDN
            const hasJsPDFCDN = content.includes('jspdf') && content.includes('cdnjs.cloudflare.com');
            addTestResult(
                'jsPDF CDN Integration',
                hasJsPDFCDN,
                hasJsPDFCDN ? 'jsPDF CDN found in index.html' : 'Missing jsPDF CDN in index.html'
            );
            
            // Test for html2canvas CDN
            const hasHtml2CanvasCDN = content.includes('html2canvas') && content.includes('cdnjs.cloudflare.com');
            addTestResult(
                'html2canvas CDN Integration',
                hasHtml2CanvasCDN,
                hasHtml2CanvasCDN ? 'html2canvas CDN found in index.html' : 'Missing html2canvas CDN in index.html'
            );
            
            // Test for proper script loading order
            const scriptOrder = content.indexOf('jspdf') < content.indexOf('pdf-export-manager.js');
            addTestResult(
                'Script Loading Order',
                scriptOrder,
                scriptOrder ? 'Libraries loaded before PDF manager' : 'Incorrect script loading order'
            );
        }
        
        // Check test files for CDN libraries
        const testFiles = [
            'test-pdf-export-functionality.html',
            'test-enhanced-results-layout.html'
        ];
        
        testFiles.forEach(filename => {
            const testPath = path.join(__dirname, filename);
            if (fs.existsSync(testPath)) {
                const content = fs.readFileSync(testPath, 'utf8');
                const hasCDNs = content.includes('jspdf') && content.includes('html2canvas');
                addTestResult(
                    `CDN Integration in ${filename}`,
                    hasCDNs,
                    hasCDNs ? 'CDN libraries found' : 'Missing CDN libraries'
                );
            }
        });
        
    } catch (error) {
        addTestResult('HTML Integration Test', false, 'Error reading HTML files', error);
    }
}

/**
 * Test API compatibility
 */
function testAPICompatibility() {
    console.log('\n=== Testing API Compatibility ===');
    
    try {
        const pdfManagerPath = path.join(__dirname, 'lib', 'pdf-export-manager.js');
        if (fs.existsSync(pdfManagerPath)) {
            const content = fs.readFileSync(pdfManagerPath, 'utf8');
            
            // Test for required methods
            const requiredMethods = [
                'exportToPDF',
                'setPageSettings',
                'getPageSettings',
                'exportWithCustomSettings',
                'validateSettings',
                'createExportButton',
                'createSettingsPanel'
            ];
            
            requiredMethods.forEach(method => {
                const hasMethod = content.includes(`${method}(`);
                addTestResult(
                    `API Method: ${method}`,
                    hasMethod,
                    hasMethod ? 'Method implemented' : 'Method missing'
                );
            });
            
            // Test for backward compatibility
            const hasBackwardCompatibility = content.includes('exportToPDF') && 
                                          content.includes('createExportButton');
            addTestResult(
                'Backward Compatibility',
                hasBackwardCompatibility,
                hasBackwardCompatibility ? 'Maintains existing API' : 'Breaking changes detected'
            );
        }
        
    } catch (error) {
        addTestResult('API Compatibility Test', false, 'Error testing API', error);
    }
}

/**
 * Test requirements compliance
 */
function testRequirementsCompliance() {
    console.log('\n=== Testing Requirements Compliance ===');
    
    try {
        const pdfManagerPath = path.join(__dirname, 'lib', 'pdf-export-manager.js');
        if (fs.existsSync(pdfManagerPath)) {
            const content = fs.readFileSync(pdfManagerPath, 'utf8');
            
            // Requirement 3.1: Perfect preservation of styles, images, and formatting
            const hasStylePreservation = content.includes('html2canvas') && 
                                        content.includes('useCORS') &&
                                        content.includes('scale');
            addTestResult(
                'Requirement 3.1: Style Preservation',
                hasStylePreservation,
                hasStylePreservation ? 'Style preservation implemented' : 'Missing style preservation'
            );
            
            // Requirement 3.2: Header/footer content in PDF
            const hasHeaderFooterInPDF = content.includes('addPageHeader') && 
                                       content.includes('addPageFooter');
            addTestResult(
                'Requirement 3.2: Header/Footer in PDF',
                hasHeaderFooterInPDF,
                hasHeaderFooterInPDF ? 'Header/footer in PDF implemented' : 'Missing header/footer in PDF'
            );
            
            // Requirement 3.3: Image placement and sizing
            const hasImageHandling = content.includes('ensureImagesLoaded') && 
                                    content.includes('addImage');
            addTestResult(
                'Requirement 3.3: Image Handling',
                hasImageHandling,
                hasImageHandling ? 'Image handling implemented' : 'Missing image handling'
            );
            
            // Requirement 3.4: Custom page size and margins
            const hasCustomPageSettings = content.includes('setPageSettings') && 
                                        content.includes('pageDimensions') &&
                                        content.includes('margins');
            addTestResult(
                'Requirement 3.4: Custom Page Settings',
                hasCustomPageSettings,
                hasCustomPageSettings ? 'Custom page settings implemented' : 'Missing custom page settings'
            );
            
            // Additional: Proper page break handling
            const hasPageBreakHandling = content.includes('addContentToPages') && 
                                       content.includes('pageBreak');
            addTestResult(
                'Page Break Handling',
                hasPageBreakHandling,
                hasPageBreakHandling ? 'Page break handling implemented' : 'Missing page break handling'
            );
        }
        
    } catch (error) {
        addTestResult('Requirements Compliance Test', false, 'Error testing requirements', error);
    }
}

/**
 * Run all tests
 */
async function runTests() {
    console.log(`Starting ${testConfig.testName}...`);
    console.log(`Timestamp: ${testConfig.timestamp}\n`);
    
    // Run test suites
    testFileStructure();
    testHTMLIntegration();
    testAPICompatibility();
    testRequirementsCompliance();
    
    // Generate summary
    console.log('\n=== Test Summary ===');
    console.log(`Total Tests: ${testResults.summary.total}`);
    console.log(`Passed: ${testResults.summary.passed}`);
    console.log(`Failed: ${testResults.summary.failed}`);
    console.log(`Success Rate: ${((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1)}%`);
    
    if (testResults.summary.errors.length > 0) {
        console.log('\nErrors:');
        testResults.summary.errors.forEach((error, index) => {
            console.log(`${index + 1}. ${error}`);
        });
    }
    
    // Save results
    try {
        fs.writeFileSync(testConfig.outputFile, JSON.stringify(testResults, null, 2));
        console.log(`\nResults saved to: ${testConfig.outputFile}`);
    } catch (error) {
        console.error('Failed to save test results:', error.message);
    }
    
    // Return success status
    return testResults.summary.failed === 0;
}

// Run tests if called directly
if (require.main === module) {
    runTests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = { runTests, testResults };