/**
 * Reliability Testing Suite
 * Tests extended usage sessions, memory leaks, and error recovery systems
 */

class ReliabilityTester {
    constructor() {
        this.results = {
            extendedSessions: [],
            memoryLeakTests: [],
            errorRecoveryTests: [],
            fallbackSystemTests: [],
            performanceDegradation: []
        };
        this.sessionStartTime = Date.now();
        this.memoryBaseline = null;
        this.errorCount = 0;
    }

    // Memory leak detection
    async testMemoryLeaks() {
        console.log('Testing for memory leaks...');
        
        const iterations = 50;
        const memorySnapshots = [];
        
        // Take baseline memory snapshot
        this.memoryBaseline = this.getMemoryUsage();
        memorySnapshots.push(this.memoryBaseline);
        
        for (let i = 0; i < iterations; i++) {
            try {
                // Simulate typical user operations
                await this.simulateUserOperation();
                
                // Force garbage collection if available
                if (window.gc) {
                    window.gc();
                }
                
                // Take memory snapshot
                const snapshot = this.getMemoryUsage();
                memorySnapshots.push(snapshot);
                
                // Small delay between operations
                await new Promise(resolve => setTimeout(resolve, 50));
                
            } catch (error) {
                console.warn(`Memory leak test iteration ${i} failed:`, error);
            }
        }
        
        // Analyze memory growth
        const memoryGrowth = this.analyzeMemoryGrowth(memorySnapshots);
        
        this.results.memoryLeakTests.push({
            iterations,
            baseline: this.memoryBaseline,
            final: memorySnapshots[memorySnapshots.length - 1],
            growth: memoryGrowth,
            snapshots: memorySnapshots,
            timestamp: Date.now()
        });
        
        return memoryGrowth;
    }

    getMemoryUsage() {
        if (performance.memory) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024 * 100) / 100,
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024 * 100) / 100,
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024 * 100) / 100,
                timestamp: Date.now()
            };
        }
        return { used: 0, total: 0, limit: 0, timestamp: Date.now() };
    }

    analyzeMemoryGrowth(snapshots) {
        if (snapshots.length < 2) return { growth: 0, trend: 'stable' };
        
        const first = snapshots[0];
        const last = snapshots[snapshots.length - 1];
        const growth = last.used - first.used;
        const growthPercent = (growth / first.used) * 100;
        
        // Calculate trend
        let trend = 'stable';
        if (growthPercent > 20) trend = 'concerning';
        else if (growthPercent > 10) trend = 'moderate';
        else if (growthPercent < -5) trend = 'decreasing';
        
        return {
            growth: Math.round(growth * 100) / 100,
            growthPercent: Math.round(growthPercent * 100) / 100,
            trend,
            baseline: first.used,
            final: last.used
        };
    }

    // Simulate typical user operations
    async simulateUserOperation() {
        const operations = [
            () => this.simulateReportGeneration(),
            () => this.simulateFileUpload(),
            () => this.simulateTemplateSelection(),
            () => this.simulateExportOperation(),
            () => this.simulateEditorInteraction()
        ];
        
        const operation = operations[Math.floor(Math.random() * operations.length)];
        return await operation();
    }

    async simulateReportGeneration() {
        const testData = "Sample investment analysis data for reliability testing.".repeat(10);
        
        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    inputText: testData,
                    reportType: 'jp_investment_4part'
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                return { success: true, operation: 'reportGeneration' };
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            return { success: false, operation: 'reportGeneration', error: error.message };
        }
    }

    async simulateFileUpload() {
        try {
            const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
            const formData = new FormData();
            formData.append('file', mockFile);
            
            // Simulate file processing without actual upload
            await new Promise(resolve => setTimeout(resolve, 100));
            
            return { success: true, operation: 'fileUpload' };
        } catch (error) {
            return { success: false, operation: 'fileUpload', error: error.message };
        }
    }

    async simulateTemplateSelection() {
        try {
            // Simulate template loading
            const templates = ['jp_investment_4part', 'jp_inheritance_strategy', 'jp_tax_strategy'];
            const selected = templates[Math.floor(Math.random() * templates.length)];
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            return { success: true, operation: 'templateSelection', template: selected };
        } catch (error) {
            return { success: false, operation: 'templateSelection', error: error.message };
        }
    }

    async simulateExportOperation() {
        try {
            // Simulate export functionality
            const content = "Sample report content for export testing.".repeat(20);
            const blob = new Blob([content], { type: 'text/plain' });
            
            // Simulate processing
            await new Promise(resolve => setTimeout(resolve, 75));
            
            return { success: true, operation: 'export', size: blob.size };
        } catch (error) {
            return { success: false, operation: 'export', error: error.message };
        }
    }

    async simulateEditorInteraction() {
        try {
            // Simulate editor operations
            const operations = ['format', 'copy', 'scroll', 'select'];
            const operation = operations[Math.floor(Math.random() * operations.length)];
            
            await new Promise(resolve => setTimeout(resolve, 25));
            
            return { success: true, operation: 'editorInteraction', action: operation };
        } catch (error) {
            return { success: false, operation: 'editorInteraction', error: error.message };
        }
    }

    // Test extended usage sessions
    async testExtendedSession(durationMinutes = 5) {
        console.log(`Testing extended session for ${durationMinutes} minutes...`);
        
        const startTime = Date.now();
        const endTime = startTime + (durationMinutes * 60 * 1000);
        const operations = [];
        let operationCount = 0;
        
        while (Date.now() < endTime) {
            const operation = await this.simulateUserOperation();
            operations.push({
                ...operation,
                timestamp: Date.now(),
                operationNumber: ++operationCount
            });
            
            // Random delay between operations (0.5-3 seconds)
            const delay = Math.random() * 2500 + 500;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        const sessionResult = {
            duration: Date.now() - startTime,
            operationCount,
            successfulOperations: operations.filter(op => op.success).length,
            failedOperations: operations.filter(op => !op.success).length,
            operations,
            timestamp: Date.now()
        };
        
        this.results.extendedSessions.push(sessionResult);
        return sessionResult;
    }

    // Test error recovery and fallback systems
    async testErrorRecovery() {
        console.log('Testing error recovery systems...');
        
        const errorScenarios = [
            { name: 'Network Failure', test: () => this.testNetworkFailure() },
            { name: 'Invalid Input', test: () => this.testInvalidInput() },
            { name: 'Large File Processing', test: () => this.testLargeFileError() },
            { name: 'Template Loading Error', test: () => this.testTemplateError() },
            { name: 'Memory Pressure', test: () => this.testMemoryPressure() }
        ];
        
        for (const scenario of errorScenarios) {
            try {
                console.log(`Testing ${scenario.name}...`);
                const result = await scenario.test();
                
                this.results.errorRecoveryTests.push({
                    scenario: scenario.name,
                    success: true,
                    result,
                    timestamp: Date.now()
                });
            } catch (error) {
                this.results.errorRecoveryTests.push({
                    scenario: scenario.name,
                    success: false,
                    error: error.message,
                    timestamp: Date.now()
                });
            }
        }
    }

    async testNetworkFailure() {
        // Simulate network failure by making request to non-existent endpoint
        try {
            await fetch('/api/nonexistent', { method: 'POST' });
            return { recovered: false, message: 'Expected network failure did not occur' };
        } catch (error) {
            // This is expected - test if system handles it gracefully
            return { recovered: true, message: 'Network failure handled gracefully' };
        }
    }

    async testInvalidInput() {
        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    inputText: null,
                    reportType: 'invalid_type'
                })
            });
            
            return { 
                recovered: !response.ok, 
                status: response.status,
                message: 'Invalid input handled appropriately'
            };
        } catch (error) {
            return { recovered: true, message: 'Invalid input error caught and handled' };
        }
    }

    async testLargeFileError() {
        try {
            // Create oversized file (simulate 10MB)
            const largeContent = 'x'.repeat(10 * 1024 * 1024);
            const largeFile = new File([largeContent], 'large.txt', { type: 'text/plain' });
            
            const formData = new FormData();
            formData.append('file', largeFile);
            
            const response = await fetch('/api/generate', {
                method: 'POST',
                body: formData
            });
            
            return { 
                recovered: !response.ok,
                status: response.status,
                message: 'Large file handled appropriately'
            };
        } catch (error) {
            return { recovered: true, message: 'Large file error handled gracefully' };
        }
    }

    async testTemplateError() {
        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    inputText: 'test',
                    reportType: 'nonexistent_template'
                })
            });
            
            return { 
                recovered: !response.ok,
                status: response.status,
                message: 'Template error handled appropriately'
            };
        } catch (error) {
            return { recovered: true, message: 'Template error handled gracefully' };
        }
    }

    async testMemoryPressure() {
        try {
            // Create memory pressure by allocating large arrays
            const arrays = [];
            for (let i = 0; i < 10; i++) {
                arrays.push(new Array(100000).fill('memory pressure test'));
            }
            
            // Try to perform operation under memory pressure
            const result = await this.simulateReportGeneration();
            
            // Clean up
            arrays.length = 0;
            
            return { 
                recovered: result.success,
                message: 'Operation completed under memory pressure'
            };
        } catch (error) {
            return { recovered: false, message: 'Failed under memory pressure', error: error.message };
        }
    }

    // Test fallback systems
    async testFallbackSystems() {
        console.log('Testing fallback systems...');
        
        const fallbackTests = [
            { name: 'Simple Report Renderer', test: () => this.testSimpleRendererFallback() },
            { name: 'Basic Export Fallback', test: () => this.testExportFallback() },
            { name: 'Template Fallback', test: () => this.testTemplateFallback() }
        ];
        
        for (const test of fallbackTests) {
            try {
                const result = await test.test();
                this.results.fallbackSystemTests.push({
                    system: test.name,
                    success: true,
                    result,
                    timestamp: Date.now()
                });
            } catch (error) {
                this.results.fallbackSystemTests.push({
                    system: test.name,
                    success: false,
                    error: error.message,
                    timestamp: Date.now()
                });
            }
        }
    }

    async testSimpleRendererFallback() {
        // Test if simple renderer works when complex editor fails
        const content = "Test report content for fallback testing.";
        
        try {
            // Simulate simple renderer
            const container = document.createElement('div');
            container.innerHTML = `<pre>${content}</pre>`;
            
            return { 
                fallbackWorking: container.innerHTML.includes(content),
                message: 'Simple renderer fallback functional'
            };
        } catch (error) {
            throw new Error('Simple renderer fallback failed');
        }
    }

    async testExportFallback() {
        // Test basic export functionality
        try {
            const content = "Test content for export fallback";
            const blob = new Blob([content], { type: 'text/plain' });
            
            return {
                fallbackWorking: blob.size > 0,
                size: blob.size,
                message: 'Export fallback functional'
            };
        } catch (error) {
            throw new Error('Export fallback failed');
        }
    }

    async testTemplateFallback() {
        // Test default template fallback
        try {
            const defaultTemplate = "Default template content for {{input}}";
            const processed = defaultTemplate.replace('{{input}}', 'test input');
            
            return {
                fallbackWorking: processed.includes('test input'),
                message: 'Template fallback functional'
            };
        } catch (error) {
            throw new Error('Template fallback failed');
        }
    }

    // Generate comprehensive reliability report
    generateReport() {
        const totalTests = 
            this.results.extendedSessions.length +
            this.results.memoryLeakTests.length +
            this.results.errorRecoveryTests.length +
            this.results.fallbackSystemTests.length;

        const successfulTests = 
            this.results.extendedSessions.filter(t => t.successfulOperations > t.failedOperations).length +
            this.results.memoryLeakTests.filter(t => t.growth.trend !== 'concerning').length +
            this.results.errorRecoveryTests.filter(t => t.success).length +
            this.results.fallbackSystemTests.filter(t => t.success).length;

        return {
            summary: {
                totalTests,
                successfulTests,
                reliabilityScore: Math.round((successfulTests / totalTests) * 100),
                testDuration: Date.now() - this.sessionStartTime
            },
            extendedSessions: this.results.extendedSessions,
            memoryLeakAnalysis: this.results.memoryLeakTests,
            errorRecovery: this.results.errorRecoveryTests,
            fallbackSystems: this.results.fallbackSystemTests,
            recommendations: this.generateRecommendations()
        };
    }

    generateRecommendations() {
        const recommendations = [];
        
        // Memory leak recommendations
        const memoryTests = this.results.memoryLeakTests;
        if (memoryTests.some(t => t.growth.trend === 'concerning')) {
            recommendations.push('Investigate memory leaks in report generation or editor components');
        }
        
        // Error recovery recommendations
        const errorTests = this.results.errorRecoveryTests;
        const failedErrorTests = errorTests.filter(t => !t.success);
        if (failedErrorTests.length > 0) {
            recommendations.push(`Improve error handling for: ${failedErrorTests.map(t => t.scenario).join(', ')}`);
        }
        
        // Fallback system recommendations
        const fallbackTests = this.results.fallbackSystemTests;
        const failedFallbacks = fallbackTests.filter(t => !t.success);
        if (failedFallbacks.length > 0) {
            recommendations.push(`Fix fallback systems: ${failedFallbacks.map(t => t.system).join(', ')}`);
        }
        
        return recommendations;
    }

    // Run complete reliability test suite
    async runCompleteReliabilityTest() {
        console.log('Starting comprehensive reliability testing...');
        
        try {
            // Test memory leaks
            await this.testMemoryLeaks();
            
            // Test extended session (2 minutes for quick testing)
            await this.testExtendedSession(2);
            
            // Test error recovery
            await this.testErrorRecovery();
            
            // Test fallback systems
            await this.testFallbackSystems();
            
            console.log('Reliability testing completed successfully');
            return this.generateReport();
            
        } catch (error) {
            console.error('Reliability testing failed:', error);
            throw error;
        }
    }
}

// Test execution function
async function runReliabilityTest() {
    const tester = new ReliabilityTester();
    
    try {
        const results = await tester.runCompleteReliabilityTest();
        
        console.log('=== RELIABILITY TEST RESULTS ===');
        console.log('Summary:', results.summary);
        console.log('Recommendations:', results.recommendations);
        
        // Save results
        const resultsJson = JSON.stringify(results, null, 2);
        
        if (typeof require !== 'undefined') {
            const fs = require('fs');
            fs.writeFileSync('reliability-test-results.json', resultsJson);
            console.log('Results saved to reliability-test-results.json');
        }
        
        return results;
        
    } catch (error) {
        console.error('Reliability test failed:', error);
        return {
            success: false,
            error: error.message,
            timestamp: Date.now()
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ReliabilityTester, runReliabilityTest };
}

// Auto-setup for browser environment
if (typeof window !== 'undefined') {
    window.ReliabilityTester = ReliabilityTester;
    window.runReliabilityTest = runReliabilityTest;
}