/**
 * Performance Benchmarking Test Suite
 * Tests report generation performance with various input sizes and monitors memory usage
 */

class PerformanceBenchmarker {
    constructor() {
        this.results = {
            reportGeneration: [],
            memoryUsage: [],
            largeInputTests: [],
            baselineMetrics: {}
        };
        this.testStartTime = Date.now();
    }

    // Memory monitoring utilities
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

    startMemoryMonitoring() {
        this.memoryInterval = setInterval(() => {
            this.results.memoryUsage.push(this.getMemoryUsage());
        }, 1000);
    }

    stopMemoryMonitoring() {
        if (this.memoryInterval) {
            clearInterval(this.memoryInterval);
        }
    }

    // Generate test data of various sizes
    generateTestData(size) {
        const baseText = "This is a sample investment analysis text that will be repeated to create larger inputs for performance testing. ";
        const repetitions = Math.ceil(size / baseText.length);
        return baseText.repeat(repetitions).substring(0, size);
    }

    // Create mock file for testing
    createMockFile(sizeKB, type = 'text/plain') {
        const content = this.generateTestData(sizeKB * 1024);
        return new File([content], `test-file-${sizeKB}kb.txt`, { type });
    }

    // Measure report generation performance
    async measureReportGeneration(inputSize, reportType = 'jp_investment_4part') {
        const testData = this.generateTestData(inputSize);
        const startTime = performance.now();
        const startMemory = this.getMemoryUsage();

        try {
            // Simulate report generation (using actual API if available)
            const response = await this.generateReport(testData, reportType);
            
            const endTime = performance.now();
            const endMemory = this.getMemoryUsage();
            const duration = endTime - startTime;

            const result = {
                inputSize,
                reportType,
                duration,
                success: response.success,
                outputLength: response.content ? response.content.length : 0,
                memoryDelta: endMemory.used - startMemory.used,
                timestamp: Date.now()
            };

            this.results.reportGeneration.push(result);
            return result;
        } catch (error) {
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            const result = {
                inputSize,
                reportType,
                duration,
                success: false,
                error: error.message,
                timestamp: Date.now()
            };

            this.results.reportGeneration.push(result);
            return result;
        }
    }

    // Generate report using available API
    async generateReport(inputText, reportType) {
        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputText,
                    reportType,
                    timestamp: Date.now()
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return {
                success: true,
                content: data.content || data.report || '',
                metadata: data
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Test with large file inputs
    async testLargeFileProcessing() {
        const fileSizes = [100, 500, 1000, 2000, 4000]; // KB
        
        for (const size of fileSizes) {
            const startTime = performance.now();
            const startMemory = this.getMemoryUsage();

            try {
                const mockFile = this.createMockFile(size);
                const formData = new FormData();
                formData.append('file', mockFile);
                formData.append('reportType', 'jp_investment_4part');

                const response = await fetch('/api/generate', {
                    method: 'POST',
                    body: formData
                });

                const endTime = performance.now();
                const endMemory = this.getMemoryUsage();

                const result = {
                    fileSize: size,
                    duration: endTime - startTime,
                    success: response.ok,
                    memoryDelta: endMemory.used - startMemory.used,
                    timestamp: Date.now()
                };

                this.results.largeInputTests.push(result);
            } catch (error) {
                const endTime = performance.now();
                this.results.largeInputTests.push({
                    fileSize: size,
                    duration: endTime - startTime,
                    success: false,
                    error: error.message,
                    timestamp: Date.now()
                });
            }
        }
    }

    // Run baseline performance tests
    async runBaselineTests() {
        console.log('Running baseline performance tests...');
        
        // Test different input sizes
        const inputSizes = [100, 500, 1000, 5000, 10000]; // characters
        const reportTypes = ['jp_investment_4part', 'jp_inheritance_strategy', 'jp_tax_strategy'];

        for (const size of inputSizes) {
            for (const type of reportTypes) {
                console.log(`Testing ${type} with ${size} character input...`);
                await this.measureReportGeneration(size, type);
                
                // Small delay between tests
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        // Calculate baseline metrics
        this.calculateBaselineMetrics();
    }

    calculateBaselineMetrics() {
        const successful = this.results.reportGeneration.filter(r => r.success);
        
        if (successful.length > 0) {
            const durations = successful.map(r => r.duration);
            const memoryDeltas = successful.map(r => r.memoryDelta || 0);

            this.results.baselineMetrics = {
                averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
                minDuration: Math.min(...durations),
                maxDuration: Math.max(...durations),
                averageMemoryDelta: memoryDeltas.reduce((a, b) => a + b, 0) / memoryDeltas.length,
                successRate: (successful.length / this.results.reportGeneration.length) * 100,
                totalTests: this.results.reportGeneration.length
            };
        }
    }

    // Generate performance report
    generateReport() {
        const report = {
            testSummary: {
                startTime: this.testStartTime,
                endTime: Date.now(),
                duration: Date.now() - this.testStartTime,
                totalTests: this.results.reportGeneration.length + this.results.largeInputTests.length
            },
            baselineMetrics: this.results.baselineMetrics,
            reportGenerationResults: this.results.reportGeneration,
            largeInputResults: this.results.largeInputTests,
            memoryUsage: {
                samples: this.results.memoryUsage.length,
                peak: this.results.memoryUsage.length > 0 ? 
                    Math.max(...this.results.memoryUsage.map(m => m.used)) : 0,
                average: this.results.memoryUsage.length > 0 ?
                    this.results.memoryUsage.reduce((a, b) => a + b.used, 0) / this.results.memoryUsage.length : 0
            }
        };

        return report;
    }

    // Run complete performance benchmark
    async runCompleteBenchmark() {
        console.log('Starting comprehensive performance benchmark...');
        
        this.startMemoryMonitoring();
        
        try {
            // Run baseline tests
            await this.runBaselineTests();
            
            // Test large file processing
            console.log('Testing large file processing...');
            await this.testLargeFileProcessing();
            
            console.log('Performance benchmark completed successfully');
            return this.generateReport();
            
        } catch (error) {
            console.error('Performance benchmark failed:', error);
            throw error;
        } finally {
            this.stopMemoryMonitoring();
        }
    }
}

// Test execution function
async function runPerformanceBenchmark() {
    const benchmarker = new PerformanceBenchmarker();
    
    try {
        const results = await benchmarker.runCompleteBenchmark();
        
        console.log('=== PERFORMANCE BENCHMARK RESULTS ===');
        console.log('Test Summary:', results.testSummary);
        console.log('Baseline Metrics:', results.baselineMetrics);
        console.log('Memory Usage:', results.memoryUsage);
        
        // Save results to file
        const resultsJson = JSON.stringify(results, null, 2);
        
        // Try to save results if running in Node.js environment
        if (typeof require !== 'undefined') {
            const fs = require('fs');
            fs.writeFileSync('performance-benchmark-results.json', resultsJson);
            console.log('Results saved to performance-benchmark-results.json');
        }
        
        return results;
        
    } catch (error) {
        console.error('Performance benchmark failed:', error);
        return {
            success: false,
            error: error.message,
            timestamp: Date.now()
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PerformanceBenchmarker, runPerformanceBenchmark };
}

// Auto-run if loaded directly in browser
if (typeof window !== 'undefined') {
    window.PerformanceBenchmarker = PerformanceBenchmarker;
    window.runPerformanceBenchmark = runPerformanceBenchmark;
}