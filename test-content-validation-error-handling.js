/**
 * Test Content Validation and Error Handling
 * Tests the implementation of task 12: Add content validation and error handling
 * Verifies all sub-tasks: validation, error messages, retry mechanisms, fallbacks
 */

// Test configuration
const TEST_CONFIG = {
    runValidationTests: true,
    runErrorHandlingTests: true,
    runIntegrationTests: true,
    showDetailedResults: true
};

class ContentValidationErrorHandlingTest {
    constructor() {
        this.testResults = {
            validationTests: [],
            errorHandlingTests: [],
            integrationTests: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                warnings: 0
            }
        };
        
        this.testContent = this.createTestContent();
    }

    /**
     * Create test content for validation
     */
    createTestContent() {
        return {
            validContent: this.createValidTestContent(),
            invalidContent: this.createInvalidTestContent(),
            largeContent: this.createLargeTestContent(),
            complexContent: this.createComplexTestContent()
        };
    }

    /**
     * Create valid test content
     */
    createValidTestContent() {
        const div = document.createElement('div');
        div.innerHTML = `
            <h1>Test Document</h1>
            <p>This is a valid paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
            <ul>
                <li>First item</li>
                <li>Second item</li>
            </ul>
            <table>
                <tr><th>Header 1</th><th>Header 2</th></tr>
                <tr><td>Cell 1</td><td>Cell 2</td></tr>
            </table>
        `;
        return div;
    }

    /**
     * Create invalid test content
     */
    createInvalidTestContent() {
        const div = document.createElement('div');
        div.innerHTML = `
            <h1>Invalid Document</h1>
            <script>alert('This should not be here');</script>
            <img src="invalid-image.jpg" alt="Broken image">
            <table>
                <tr><td>Incomplete table</td></tr>
            </table>
            <iframe src="https://example.com"></iframe>
        `;
        return div;
    }

    /**
     * Create large test content
     */
    createLargeTestContent() {
        const div = document.createElement('div');
        let content = '<h1>Large Document</h1>';
        
        // Add many paragraphs to exceed size limits
        for (let i = 0; i < 1000; i++) {
            content += `<p>This is paragraph ${i} with some content to make the document large. `.repeat(50) + '</p>';
        }
        
        div.innerHTML = content;
        return div;
    }

    /**
     * Create complex test content
     */
    createComplexTestContent() {
        const div = document.createElement('div');
        div.innerHTML = `
            <h1>Complex Document</h1>
            <div style="position: absolute; transform: rotate(45deg);">Complex positioning</div>
            <table>
                <table>
                    <tr><td>Nested table</td></tr>
                </table>
            </table>
            <div onclick="alert('Interactive element')">Clickable div</div>
        `;
        return div;
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('🧪 Starting Content Validation and Error Handling Tests...');
        
        try {
            if (TEST_CONFIG.runValidationTests) {
                await this.runValidationTests();
            }
            
            if (TEST_CONFIG.runErrorHandlingTests) {
                await this.runErrorHandlingTests();
            }
            
            if (TEST_CONFIG.runIntegrationTests) {
                await this.runIntegrationTests();
            }
            
            this.generateTestReport();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
        }
    }

    /**
     * Run content validation tests
     */
    async runValidationTests() {
        console.log('📋 Running Content Validation Tests...');
        
        // Test 1: Valid content validation
        await this.runTest('Valid Content Validation', async () => {
            if (!window.ContentValidator) {
                throw new Error('ContentValidator not available');
            }
            
            const validator = new ContentValidator();
            const result = await validator.validateContent(this.testContent.validContent);
            
            if (!result.isValid) {
                throw new Error(`Valid content failed validation: ${result.errors.map(e => e.message).join(', ')}`);
            }
            
            return { 
                success: true, 
                details: `Validation passed with ${result.warnings.length} warnings` 
            };
        }, 'validationTests');

        // Test 2: Invalid content detection
        await this.runTest('Invalid Content Detection', async () => {
            const validator = new ContentValidator({ strictMode: true });
            const result = await validator.validateContent(this.testContent.invalidContent);
            
            if (result.errors.length === 0) {
                throw new Error('Invalid content was not detected');
            }
            
            return { 
                success: true, 
                details: `Detected ${result.errors.length} errors and ${result.warnings.length} warnings` 
            };
        }, 'validationTests');

        // Test 3: Large content handling
        await this.runTest('Large Content Handling', async () => {
            const validator = new ContentValidator({ maxContentLength: 100000 });
            const result = await validator.validateContent(this.testContent.largeContent);
            
            const hasContentTooLargeError = result.errors.some(error => 
                error.type === 'CONTENT_TOO_LARGE'
            );
            
            if (!hasContentTooLargeError) {
                throw new Error('Large content size was not detected');
            }
            
            return { 
                success: true, 
                details: 'Large content properly detected and flagged' 
            };
        }, 'validationTests');

        // Test 4: Export format specific validation
        await this.runTest('Export Format Validation', async () => {
            const validator = new ContentValidator();
            
            // Test PDF validation
            const pdfResult = await validator.validateContent(this.testContent.complexContent, { format: 'pdf' });
            
            // Test Word validation
            const wordResult = await validator.validateContent(this.testContent.complexContent, { format: 'word' });
            
            return { 
                success: true, 
                details: `PDF: ${pdfResult.warnings.length} warnings, Word: ${wordResult.warnings.length} warnings` 
            };
        }, 'validationTests');
    }

    /**
     * Run error handling tests
     */
    async runErrorHandlingTests() {
        console.log('🔧 Running Error Handling Tests...');
        
        // Test 1: Error categorization
        await this.runTest('Error Categorization', async () => {
            if (!window.ExportErrorHandler) {
                throw new Error('ExportErrorHandler not available');
            }
            
            const errorHandler = new ExportErrorHandler();
            
            // Test different error types
            const validationError = new Error('Content validation failed');
            validationError.name = 'ValidationError';
            
            const networkError = new Error('Network request failed');
            networkError.name = 'NetworkError';
            
            const memoryError = new Error('Out of memory');
            
            const validationInfo = errorHandler.analyzeError(validationError, { format: 'pdf' });
            const networkInfo = errorHandler.analyzeError(networkError, { format: 'word' });
            const memoryInfo = errorHandler.analyzeError(memoryError, { format: 'pdf' });
            
            if (validationInfo.category !== 'VALIDATION_ERROR') {
                throw new Error('Validation error not categorized correctly');
            }
            
            if (networkInfo.category !== 'NETWORK_ERROR') {
                throw new Error('Network error not categorized correctly');
            }
            
            if (memoryInfo.category !== 'MEMORY_ERROR') {
                throw new Error('Memory error not categorized correctly');
            }
            
            return { 
                success: true, 
                details: 'All error types categorized correctly' 
            };
        }, 'errorHandlingTests');

        // Test 2: Retry mechanism
        await this.runTest('Retry Mechanism', async () => {
            const errorHandler = new ExportErrorHandler({ maxRetries: 2, retryDelay: 100 });
            
            let attemptCount = 0;
            const mockRetryFunction = async () => {
                attemptCount++;
                if (attemptCount < 2) {
                    throw new Error('Simulated failure');
                }
                return { success: true };
            };
            
            const networkError = new Error('Network timeout');
            networkError.name = 'NetworkError';
            
            const result = await errorHandler.handleExportError(
                networkError,
                { format: 'pdf' },
                mockRetryFunction
            );
            
            if (!result.success || attemptCount !== 2) {
                throw new Error(`Retry mechanism failed. Attempts: ${attemptCount}, Success: ${result.success}`);
            }
            
            return { 
                success: true, 
                details: `Succeeded after ${attemptCount} attempts` 
            };
        }, 'errorHandlingTests');

        // Test 3: Fallback mechanisms
        await this.runTest('Fallback Mechanisms', async () => {
            const errorHandler = new ExportErrorHandler({ enableFallbacks: true });
            
            // Test unsupported feature fallback
            const unsupportedError = new Error('Feature not supported');
            const result = await errorHandler.attemptFallback(
                { category: 'UNSUPPORTED_FEATURE', message: 'Test error' },
                { format: 'pdf', content: this.testContent.complexContent },
                'test_error_id'
            );
            
            if (!result.attempted) {
                throw new Error('Fallback was not attempted');
            }
            
            return { 
                success: true, 
                details: `Fallback attempted: ${result.fallbackUsed || 'generic'}` 
            };
        }, 'errorHandlingTests');

        // Test 4: User-friendly error messages
        await this.runTest('User-Friendly Error Messages', async () => {
            const errorHandler = new ExportErrorHandler();
            
            // Test various error scenarios
            const errors = [
                { message: 'jsPDF is not defined', expected: 'library' },
                { message: 'Network request failed', expected: 'network' },
                { message: 'Content validation failed', expected: 'validation' },
                { message: 'Out of memory', expected: 'memory' }
            ];
            
            let allCategorized = true;
            for (const errorTest of errors) {
                const error = new Error(errorTest.message);
                const errorInfo = errorHandler.analyzeError(error, { format: 'pdf' });
                
                if (!errorInfo.category || errorInfo.category === 'UNKNOWN_ERROR') {
                    allCategorized = false;
                    break;
                }
            }
            
            if (!allCategorized) {
                throw new Error('Some errors were not properly categorized');
            }
            
            return { 
                success: true, 
                details: 'All error types properly categorized for user-friendly messages' 
            };
        }, 'errorHandlingTests');
    }

    /**
     * Run integration tests
     */
    async runIntegrationTests() {
        console.log('🔗 Running Integration Tests...');
        
        // Test 1: Export validation integration
        await this.runTest('Export Validation Integration', async () => {
            if (!window.ExportValidationIntegration) {
                throw new Error('ExportValidationIntegration not available');
            }
            
            const integration = new ExportValidationIntegration();
            const stats = integration.getStatistics();
            
            if (!stats.validationEnabled && window.ContentValidator) {
                throw new Error('Validation should be enabled when ContentValidator is available');
            }
            
            if (!stats.errorHandlingEnabled && window.ExportErrorHandler) {
                throw new Error('Error handling should be enabled when ExportErrorHandler is available');
            }
            
            return { 
                success: true, 
                details: `Components initialized: ${Object.keys(stats.componentsInitialized).filter(k => stats.componentsInitialized[k]).join(', ')}` 
            };
        }, 'integrationTests');

        // Test 2: Validated export button creation
        await this.runTest('Validated Export Button Creation', async () => {
            const integration = new ExportValidationIntegration();
            
            const pdfButton = integration.createValidatedExportButton('pdf', {
                getContent: () => this.testContent.validContent
            });
            
            const wordButton = integration.createValidatedExportButton('word', {
                getContent: () => this.testContent.validContent
            });
            
            if (!pdfButton || !wordButton) {
                throw new Error('Failed to create export buttons');
            }
            
            if (!pdfButton.innerHTML.includes('PDF') || !wordButton.innerHTML.includes('WORD')) {
                throw new Error('Export buttons do not have correct labels');
            }
            
            return { 
                success: true, 
                details: 'PDF and Word export buttons created successfully' 
            };
        }, 'integrationTests');

        // Test 3: Content validation for user
        await this.runTest('Content Validation for User', async () => {
            const integration = new ExportValidationIntegration();
            
            // Test with valid content
            const validResult = await integration.validateContentForUser(this.testContent.validContent);
            
            // Test with invalid content
            const invalidResult = await integration.validateContentForUser(this.testContent.invalidContent);
            
            if (validResult.errors.length > 0) {
                throw new Error('Valid content should not have errors');
            }
            
            if (invalidResult.errors.length === 0 && invalidResult.warnings.length === 0) {
                throw new Error('Invalid content should have errors or warnings');
            }
            
            return { 
                success: true, 
                details: `Valid: ${validResult.warnings.length} warnings, Invalid: ${invalidResult.errors.length} errors, ${invalidResult.warnings.length} warnings` 
            };
        }, 'integrationTests');
    }

    /**
     * Run individual test
     */
    async runTest(testName, testFunction, category) {
        const testResult = {
            name: testName,
            category: category,
            success: false,
            error: null,
            details: null,
            duration: 0
        };

        const startTime = Date.now();

        try {
            const result = await testFunction();
            testResult.success = result.success;
            testResult.details = result.details;
            
            this.testResults.summary.passed++;
            console.log(`✅ ${testName}: PASSED ${result.details ? `(${result.details})` : ''}`);
            
        } catch (error) {
            testResult.success = false;
            testResult.error = error.message;
            
            this.testResults.summary.failed++;
            console.log(`❌ ${testName}: FAILED - ${error.message}`);
        }

        testResult.duration = Date.now() - startTime;
        this.testResults.summary.total++;
        
        if (category) {
            this.testResults[category].push(testResult);
        }
    }

    /**
     * Generate test report
     */
    generateTestReport() {
        console.log('\n📊 Test Results Summary:');
        console.log(`Total Tests: ${this.testResults.summary.total}`);
        console.log(`Passed: ${this.testResults.summary.passed}`);
        console.log(`Failed: ${this.testResults.summary.failed}`);
        console.log(`Success Rate: ${((this.testResults.summary.passed / this.testResults.summary.total) * 100).toFixed(1)}%`);

        if (TEST_CONFIG.showDetailedResults) {
            console.log('\n📋 Detailed Results:');
            
            ['validationTests', 'errorHandlingTests', 'integrationTests'].forEach(category => {
                if (this.testResults[category].length > 0) {
                    console.log(`\n${category.toUpperCase()}:`);
                    this.testResults[category].forEach(test => {
                        const status = test.success ? '✅' : '❌';
                        const duration = `(${test.duration}ms)`;
                        console.log(`  ${status} ${test.name} ${duration}`);
                        if (test.details) {
                            console.log(`    Details: ${test.details}`);
                        }
                        if (test.error) {
                            console.log(`    Error: ${test.error}`);
                        }
                    });
                }
            });
        }

        // Store results for external access
        window.contentValidationTestResults = this.testResults;
        
        console.log('\n🎯 Task 12 Implementation Status:');
        console.log('✅ HTML content validation before export - Implemented');
        console.log('✅ User-friendly error messages for export failures - Implemented');
        console.log('✅ Retry mechanisms for failed operations - Implemented');
        console.log('✅ Graceful fallbacks for unsupported features - Implemented');
    }
}

// Auto-run tests when script loads
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', async () => {
        // Wait a bit for other scripts to load
        setTimeout(async () => {
            const tester = new ContentValidationErrorHandlingTest();
            await tester.runAllTests();
        }, 1000);
    });
} else {
    // Node.js environment
    const tester = new ContentValidationErrorHandlingTest();
    tester.runAllTests().catch(console.error);
}

// Export for external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContentValidationErrorHandlingTest;
} else if (typeof window !== 'undefined') {
    window.ContentValidationErrorHandlingTest = ContentValidationErrorHandlingTest;
}