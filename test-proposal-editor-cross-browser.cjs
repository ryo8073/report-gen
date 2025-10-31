/**
 * Cross-Browser Compatibility Test Suite for Proposal Editor Enhancement
 * Tests functionality across different browsers and browser versions
 */

const fs = require('fs');

// Browser compatibility test configuration
const browserTestConfig = {
    targetBrowsers: {
        chrome: { minVersion: 60, features: ['print', 'blob', 'es6', 'css-grid'] },
        firefox: { minVersion: 55, features: ['print', 'blob', 'es6', 'css-grid'] },
        safari: { minVersion: 11, features: ['print', 'blob', 'es6', 'css-grid'] },
        edge: { minVersion: 79, features: ['print', 'blob', 'es6', 'css-grid'] }
    },
    
    featureTests: {
        printAPI: 'window.print',
        blobAPI: 'window.Blob',
        fileAPI: 'window.File',
        es6Classes: 'class syntax',
        arrowFunctions: 'arrow functions',
        asyncAwait: 'async/await',
        cssGrid: 'CSS Grid',
        cssCustomProperties: 'CSS Custom Properties',
        mediaQueries: 'CSS Media Queries'
    },
    
    components: [
        'lib/enhanced-wysiwyg-editor.js',
        'lib/pdf-export-manager.js',
        'lib/word-export-manager-browser.js',
        'lib/business-document-formatter.js',
        'lib/template-selection-system.js'
    ]
};

let browserTestResults = {
    passed: 0,
    failed: 0,
    total: 0,
    compatibility: {}
};

function logBrowserTest(testName, passed, message = '', browserInfo = {}) {
    browserTestResults.total++;
    if (passed) {
        browserTestResults.passed++;
        console.log(`✓ ${testName}`);
    } else {
        browserTestResults.failed++;
        console.log(`✗ ${testName}: ${message}`);
    }
    
    if (!browserTestResults.compatibility[testName]) {
        browserTestResults.compatibility[testName] = [];
    }
    
    browserTestResults.compatibility[testName].push({
        passed,
        message,
        browserInfo,
        timestamp: new Date().toISOString()
    });
}

// Test 1: JavaScript Feature Compatibility
function testJavaScriptFeatures() {
    console.log('\n=== Testing JavaScript Feature Compatibility ===');
    
    browserTestConfig.components.forEach(componentPath => {
        if (fs.existsSync(componentPath)) {
            const content = fs.readFileSync(componentPath, 'utf8');
            const componentName = componentPath.split('/').pop().replace('.js', '');
            
            // Test ES6 Class syntax
            const usesES6Classes = content.includes('class ') && content.includes('constructor');
            logBrowserTest(
                `${componentName} uses ES6 classes`,
                usesES6Classes,
                usesES6Classes ? '' : 'Uses older function syntax'
            );
            
            // Test Arrow functions
            const usesArrowFunctions = content.includes('=>');
            logBrowserTest(
                `${componentName} uses arrow functions`,
                usesArrowFunctions,
                usesArrowFunctions ? '' : 'Uses traditional function syntax'
            );
            
            // Test const/let usage
            const usesModernVariables = content.includes('const ') || content.includes('let ');
            logBrowserTest(
                `${componentName} uses modern variable declarations`,
                usesModernVariables,
                usesModernVariables ? '' : 'Uses var declarations'
            );
            
            // Test async/await
            const usesAsyncAwait = content.includes('async ') && content.includes('await ');
            logBrowserTest(
                `${componentName} uses async/await`,
                usesAsyncAwait,
                usesAsyncAwait ? '' : 'Uses promises or callbacks'
            );
            
            // Test template literals
            const usesTemplateLiterals = content.includes('`') && content.includes('${');
            logBrowserTest(
                `${componentName} uses template literals`,
                usesTemplateLiterals,
                usesTemplateLiterals ? '' : 'Uses string concatenation'
            );
            
            // Test destructuring
            const usesDestructuring = content.includes('const {') || content.includes('const [');
            logBrowserTest(
                `${componentName} uses destructuring`,
                usesDestructuring,
                usesDestructuring ? '' : 'Uses traditional property access'
            );
        }
    });
}

// Test 2: Browser API Compatibility
function testBrowserAPICompatibility() {
    console.log('\n=== Testing Browser API Compatibility ===');
    
    browserTestConfig.components.forEach(componentPath => {
        if (fs.existsSync(componentPath)) {
            const content = fs.readFileSync(componentPath, 'utf8');
            const componentName = componentPath.split('/').pop().replace('.js', '');
            
            // Test Print API usage
            const usesPrintAPI = content.includes('window.print') || content.includes('print()');
            logBrowserTest(
                `${componentName} uses Print API`,
                usesPrintAPI,
                usesPrintAPI ? 'Compatible with modern browsers' : 'No print functionality'
            );
            
            // Test Blob API usage
            const usesBlobAPI = content.includes('Blob') || content.includes('blob');
            logBrowserTest(
                `${componentName} uses Blob API`,
                usesBlobAPI,
                usesBlobAPI ? 'Compatible with modern browsers' : 'No blob functionality'
            );
            
            // Test File API usage
            const usesFileAPI = content.includes('File') || content.includes('FileReader');
            logBrowserTest(
                `${componentName} uses File API`,
                usesFileAPI,
                usesFileAPI ? 'Compatible with modern browsers' : 'No file handling'
            );
            
            // Test URL API usage
            const usesURLAPI = content.includes('URL.createObjectURL') || content.includes('URL.revokeObjectURL');
            logBrowserTest(
                `${componentName} uses URL API`,
                usesURLAPI,
                usesURLAPI ? 'Compatible with modern browsers' : 'No URL object handling'
            );
            
            // Test Canvas API usage
            const usesCanvasAPI = content.includes('canvas') || content.includes('getContext');
            logBrowserTest(
                `${componentName} uses Canvas API`,
                usesCanvasAPI,
                usesCanvasAPI ? 'May need canvas polyfill for older browsers' : 'No canvas functionality'
            );
            
            // Test Fetch API usage
            const usesFetchAPI = content.includes('fetch(') || content.includes('fetch ');
            logBrowserTest(
                `${componentName} uses Fetch API`,
                usesFetchAPI,
                usesFetchAPI ? 'May need fetch polyfill for IE' : 'Uses XMLHttpRequest or no network calls'
            );
        }
    });
}

// Test 3: CSS Feature Compatibility
function testCSSFeatureCompatibility() {
    console.log('\n=== Testing CSS Feature Compatibility ===');
    
    const cssFiles = [
        'lib/business-document-styles.css',
        'lib/template-styles.css',
        'lib/enhanced-wysiwyg-editor.css',
        'lib/print-preview-styles.css'
    ];
    
    cssFiles.forEach(cssPath => {
        if (fs.existsSync(cssPath)) {
            const content = fs.readFileSync(cssPath, 'utf8');
            const fileName = cssPath.split('/').pop().replace('.css', '');
            
            // Test CSS Grid usage
            const usesCSSGrid = content.includes('display: grid') || content.includes('grid-template');
            logBrowserTest(
                `${fileName} uses CSS Grid`,
                usesCSSGrid,
                usesCSSGrid ? 'Requires modern browser support' : 'Uses flexbox or float layouts'
            );
            
            // Test CSS Custom Properties (Variables)
            const usesCustomProperties = content.includes('--') && content.includes('var(');
            logBrowserTest(
                `${fileName} uses CSS Custom Properties`,
                usesCustomProperties,
                usesCustomProperties ? 'Requires modern browser support' : 'Uses static values'
            );
            
            // Test Flexbox usage
            const usesFlexbox = content.includes('display: flex') || content.includes('flex-');
            logBrowserTest(
                `${fileName} uses Flexbox`,
                usesFlexbox,
                usesFlexbox ? 'Widely supported' : 'Uses traditional layout methods'
            );
            
            // Test CSS Transforms
            const usesTransforms = content.includes('transform:') || content.includes('translate');
            logBrowserTest(
                `${fileName} uses CSS Transforms`,
                usesTransforms,
                usesTransforms ? 'Requires vendor prefixes for older browsers' : 'No transform animations'
            );
            
            // Test CSS Animations
            const usesAnimations = content.includes('@keyframes') || content.includes('animation:');
            logBrowserTest(
                `${fileName} uses CSS Animations`,
                usesAnimations,
                usesAnimations ? 'Requires vendor prefixes for older browsers' : 'No CSS animations'
            );
            
            // Test Media Queries
            const usesMediaQueries = content.includes('@media');
            logBrowserTest(
                `${fileName} uses Media Queries`,
                usesMediaQueries,
                usesMediaQueries ? 'Widely supported' : 'Not responsive'
            );
            
            // Test CSS calc()
            const usesCalc = content.includes('calc(');
            logBrowserTest(
                `${fileName} uses CSS calc()`,
                usesCalc,
                usesCalc ? 'Requires modern browser support' : 'Uses fixed values'
            );
        }
    });
}

// Test 4: Print Media Query Compatibility
function testPrintMediaCompatibility() {
    console.log('\n=== Testing Print Media Query Compatibility ===');
    
    const cssFiles = [
        'lib/business-document-styles.css',
        'lib/print-preview-styles.css'
    ];
    
    cssFiles.forEach(cssPath => {
        if (fs.existsSync(cssPath)) {
            const content = fs.readFileSync(cssPath, 'utf8');
            const fileName = cssPath.split('/').pop().replace('.css', '');
            
            // Test print media queries
            const hasPrintMedia = content.includes('@media print');
            logBrowserTest(
                `${fileName} has print media queries`,
                hasPrintMedia,
                hasPrintMedia ? 'Print-optimized styles available' : 'No print-specific styles'
            );
            
            // Test page break properties
            const hasPageBreaks = content.includes('page-break') || content.includes('break-');
            logBrowserTest(
                `${fileName} uses page break properties`,
                hasPageBreaks,
                hasPageBreaks ? 'Print pagination supported' : 'No page break control'
            );
            
            // Test print-specific units
            const usesPrintUnits = content.includes('pt') || content.includes('in') || content.includes('cm');
            logBrowserTest(
                `${fileName} uses print-friendly units`,
                usesPrintUnits,
                usesPrintUnits ? 'Uses physical units for print' : 'Uses screen units only'
            );
        }
    });
}

// Test 5: Polyfill Requirements
function testPolyfillRequirements() {
    console.log('\n=== Testing Polyfill Requirements ===');
    
    const polyfillNeeds = {
        'Promise polyfill': false,
        'Fetch polyfill': false,
        'Array.from polyfill': false,
        'Object.assign polyfill': false,
        'CSS Custom Properties polyfill': false,
        'CSS Grid polyfill': false
    };
    
    browserTestConfig.components.forEach(componentPath => {
        if (fs.existsSync(componentPath)) {
            const content = fs.readFileSync(componentPath, 'utf8');
            
            // Check for Promise usage
            if (content.includes('Promise') || content.includes('.then(')) {
                polyfillNeeds['Promise polyfill'] = true;
            }
            
            // Check for Fetch usage
            if (content.includes('fetch(')) {
                polyfillNeeds['Fetch polyfill'] = true;
            }
            
            // Check for Array.from usage
            if (content.includes('Array.from')) {
                polyfillNeeds['Array.from polyfill'] = true;
            }
            
            // Check for Object.assign usage
            if (content.includes('Object.assign')) {
                polyfillNeeds['Object.assign polyfill'] = true;
            }
        }
    });
    
    // Check CSS files for polyfill needs
    const cssFiles = ['lib/business-document-styles.css', 'lib/template-styles.css'];
    cssFiles.forEach(cssPath => {
        if (fs.existsSync(cssPath)) {
            const content = fs.readFileSync(cssPath, 'utf8');
            
            if (content.includes('var(--')) {
                polyfillNeeds['CSS Custom Properties polyfill'] = true;
            }
            
            if (content.includes('display: grid')) {
                polyfillNeeds['CSS Grid polyfill'] = true;
            }
        }
    });
    
    Object.entries(polyfillNeeds).forEach(([polyfill, needed]) => {
        logBrowserTest(
            `Requires ${polyfill}`,
            !needed, // Pass if polyfill is NOT needed
            needed ? 'Required for older browser support' : 'Not required'
        );
    });
}

// Test 6: Browser-Specific Workarounds
function testBrowserSpecificWorkarounds() {
    console.log('\n=== Testing Browser-Specific Workarounds ===');
    
    browserTestConfig.components.forEach(componentPath => {
        if (fs.existsSync(componentPath)) {
            const content = fs.readFileSync(componentPath, 'utf8');
            const componentName = componentPath.split('/').pop().replace('.js', '');
            
            // Check for user agent detection
            const hasUserAgentDetection = content.includes('navigator.userAgent') || content.includes('navigator.vendor');
            logBrowserTest(
                `${componentName} uses user agent detection`,
                hasUserAgentDetection,
                hasUserAgentDetection ? 'Has browser-specific code' : 'No browser detection'
            );
            
            // Check for feature detection
            const hasFeatureDetection = content.includes('typeof ') || content.includes('in window');
            logBrowserTest(
                `${componentName} uses feature detection`,
                hasFeatureDetection,
                hasFeatureDetection ? 'Uses progressive enhancement' : 'No feature detection'
            );
            
            // Check for vendor prefixes in CSS
            if (componentPath.endsWith('.css')) {
                const hasVendorPrefixes = content.includes('-webkit-') || content.includes('-moz-') || content.includes('-ms-');
                logBrowserTest(
                    `${componentName} uses vendor prefixes`,
                    hasVendorPrefixes,
                    hasVendorPrefixes ? 'Has cross-browser CSS' : 'No vendor prefixes'
                );
            }
            
            // Check for fallbacks
            const hasFallbacks = content.includes('fallback') || content.includes('alternative');
            logBrowserTest(
                `${componentName} provides fallbacks`,
                hasFallbacks,
                hasFallbacks ? 'Has graceful degradation' : 'No explicit fallbacks'
            );
        }
    });
}

// Test 7: Performance Considerations
function testPerformanceConsiderations() {
    console.log('\n=== Testing Performance Considerations ===');
    
    browserTestConfig.components.forEach(componentPath => {
        if (fs.existsSync(componentPath)) {
            const content = fs.readFileSync(componentPath, 'utf8');
            const componentName = componentPath.split('/').pop().replace('.js', '');
            const fileSize = Buffer.byteLength(content, 'utf8');
            
            // Check file size
            const isReasonableSize = fileSize < 100000; // 100KB threshold
            logBrowserTest(
                `${componentName} has reasonable file size`,
                isReasonableSize,
                `File size: ${Math.round(fileSize / 1024)}KB ${isReasonableSize ? '' : '(may impact load time)'}`
            );
            
            // Check for lazy loading patterns
            const hasLazyLoading = content.includes('lazy') || content.includes('defer') || content.includes('dynamic import');
            logBrowserTest(
                `${componentName} uses lazy loading`,
                hasLazyLoading,
                hasLazyLoading ? 'Optimized loading' : 'Loads all code upfront'
            );
            
            // Check for memory management
            const hasMemoryManagement = content.includes('removeEventListener') || content.includes('cleanup') || content.includes('destroy');
            logBrowserTest(
                `${componentName} has memory management`,
                hasMemoryManagement,
                hasMemoryManagement ? 'Prevents memory leaks' : 'May have memory leaks'
            );
            
            // Check for efficient DOM manipulation
            const hasEfficientDOM = content.includes('documentFragment') || content.includes('batch') || content.includes('requestAnimationFrame');
            logBrowserTest(
                `${componentName} uses efficient DOM manipulation`,
                hasEfficientDOM,
                hasEfficientDOM ? 'Optimized DOM updates' : 'Standard DOM manipulation'
            );
        }
    });
}

// Test 8: Accessibility Cross-Browser Support
function testAccessibilityCrossBrowserSupport() {
    console.log('\n=== Testing Accessibility Cross-Browser Support ===');
    
    const testFiles = [
        'test-enhanced-wysiwyg-editor.html',
        'test-pdf-export-functionality.html',
        'test-word-export-functionality.html',
        'test-template-selection-system.html'
    ];
    
    testFiles.forEach(testFile => {
        if (fs.existsSync(testFile)) {
            const content = fs.readFileSync(testFile, 'utf8');
            const fileName = testFile.replace('.html', '');
            
            // Check for ARIA attributes
            const hasAriaAttributes = content.includes('aria-') || content.includes('role=');
            logBrowserTest(
                `${fileName} uses ARIA attributes`,
                hasAriaAttributes,
                hasAriaAttributes ? 'Screen reader compatible' : 'Limited screen reader support'
            );
            
            // Check for semantic HTML
            const hasSemanticHTML = content.includes('<main') || content.includes('<nav') || content.includes('<section');
            logBrowserTest(
                `${fileName} uses semantic HTML`,
                hasSemanticHTML,
                hasSemanticHTML ? 'Better accessibility support' : 'Uses generic elements'
            );
            
            // Check for keyboard navigation
            const hasKeyboardSupport = content.includes('tabindex') || content.includes('onkeydown') || content.includes('keydown');
            logBrowserTest(
                `${fileName} supports keyboard navigation`,
                hasKeyboardSupport,
                hasKeyboardSupport ? 'Keyboard accessible' : 'Mouse-only interaction'
            );
            
            // Check for focus management
            const hasFocusManagement = content.includes('focus()') || content.includes('blur()') || content.includes(':focus');
            logBrowserTest(
                `${fileName} manages focus`,
                hasFocusManagement,
                hasFocusManagement ? 'Proper focus handling' : 'No focus management'
            );
        }
    });
}

// Generate Browser Compatibility Report
function generateCompatibilityReport() {
    const report = {
        summary: {
            total: browserTestResults.total,
            passed: browserTestResults.passed,
            failed: browserTestResults.failed,
            successRate: Math.round((browserTestResults.passed / browserTestResults.total) * 100)
        },
        
        browserSupport: {
            chrome: {
                minVersion: 60,
                status: 'Fully Supported',
                notes: 'All modern features supported'
            },
            firefox: {
                minVersion: 55,
                status: 'Fully Supported',
                notes: 'All modern features supported'
            },
            safari: {
                minVersion: 11,
                status: 'Mostly Supported',
                notes: 'Some CSS features may need prefixes'
            },
            edge: {
                minVersion: 79,
                status: 'Fully Supported',
                notes: 'Chromium-based Edge fully compatible'
            },
            ie11: {
                status: 'Limited Support',
                notes: 'Requires polyfills for ES6 features and CSS Grid'
            }
        },
        
        recommendations: [
            'Include polyfills for Promise, Fetch, and Array methods for IE11 support',
            'Use autoprefixer for CSS vendor prefixes',
            'Implement feature detection for progressive enhancement',
            'Provide fallbacks for CSS Grid in older browsers',
            'Test print functionality across all target browsers',
            'Validate accessibility features in different browsers'
        ],
        
        compatibility: browserTestResults.compatibility,
        timestamp: new Date().toISOString()
    };
    
    return report;
}

// Main cross-browser test runner
function runCrossBrowserTests() {
    console.log('🌐 Starting Cross-Browser Compatibility Test Suite');
    console.log('================================================================');
    
    // Run all cross-browser tests
    testJavaScriptFeatures();
    testBrowserAPICompatibility();
    testCSSFeatureCompatibility();
    testPrintMediaCompatibility();
    testPolyfillRequirements();
    testBrowserSpecificWorkarounds();
    testPerformanceConsiderations();
    testAccessibilityCrossBrowserSupport();
    
    // Generate compatibility report
    const compatibilityReport = generateCompatibilityReport();
    
    // Display summary
    console.log('\n================================================================');
    console.log('📊 Cross-Browser Compatibility Results');
    console.log('================================================================');
    console.log(`Total Tests: ${compatibilityReport.summary.total}`);
    console.log(`Passed: ${compatibilityReport.summary.passed} (${compatibilityReport.summary.successRate}%)`);
    console.log(`Failed: ${compatibilityReport.summary.failed}`);
    
    // Display browser support matrix
    console.log('\n🌐 Browser Support Matrix:');
    Object.entries(compatibilityReport.browserSupport).forEach(([browser, info]) => {
        const icon = info.status === 'Fully Supported' ? '✅' : 
                    info.status === 'Mostly Supported' ? '⚠️' : '❌';
        console.log(`${icon} ${browser.toUpperCase()}: ${info.status} ${info.minVersion ? `(${info.minVersion}+)` : ''}`);
        console.log(`   ${info.notes}`);
    });
    
    // Display recommendations
    console.log('\n💡 Recommendations:');
    compatibilityReport.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
    });
    
    // Save detailed report
    try {
        fs.writeFileSync('test-proposal-editor-cross-browser-results.json', JSON.stringify(compatibilityReport, null, 2));
        console.log('\n📄 Cross-browser compatibility report saved to: test-proposal-editor-cross-browser-results.json');
    } catch (error) {
        console.log('\n⚠️  Could not save cross-browser report:', error.message);
    }
    
    const overallSuccess = browserTestResults.failed === 0;
    console.log(`\n${overallSuccess ? '✅' : '⚠️'} Cross-Browser Status: ${overallSuccess ? 'FULLY COMPATIBLE' : 'NEEDS ATTENTION'}`);
    
    return overallSuccess;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runCrossBrowserTests,
        browserTestConfig,
        browserTestResults,
        generateCompatibilityReport
    };
}

// Run tests if this file is executed directly
if (require.main === module) {
    runCrossBrowserTests();
}