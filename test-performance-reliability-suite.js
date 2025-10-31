/**
 * Comprehensive Performance and Reliability Test Suite
 * Combines performance benchmarking and reliability testing
 */

class PerformanceReliabilityTestSuite {
    constructor() {
        this.results = {
            performance: null,
            reliability: null,
            combined: null,
            startTime: Date.now(),
            endTime: null
        };
        this.responsivenessTester = new ResponsivenessTester();
    }

    // Test site responsiveness during report generation
    async testSiteResponsiveness() {
        console.log('Testing site responsiveness during report generation...');
        
        const responsivenessTester = new ResponsivenessTester();
        
        // Start responsiveness monitoring
        responsivenessTester.startMonitoring();
        
        try {
            // Generate multiple reports concurrently to test responsiveness
            const concurrentReports = [];
            for (let i = 0; i < 3; i++) {
                concurrentReports.push(this.generateTestReport(i));
            }
            
            // Wait for all reports to complete
            const reportResults = await Promise.allSettled(concurrentReports);
            
            // Stop monitoring
            const responsivenessResults = responsivenessTester.stopMonitoring();
            
            return {
                reportResults: reportResults.map(r => ({
                    status: r.status,
                    value: r.status === 'fulfilled' ? r.value : null,
                    reason: r.status === 'rejected' ? r.reason.message : null
                })),
                responsiveness: responsivenessResults,
                timestamp: Date.now()
            };
            
        } catch (error) {
            responsivenessTester.stopMonitoring();
            throw error;
        }
    }

    async generateTestReport(index) {
        const testData = `Test report ${index} with sample investment data. `.repeat(50);
        
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                inputText: testData,
                reportType: 'jp_investment_4part',
                testIndex: index
            })
        });
        
        if (!response.ok) {
            throw new Error(`Report ${index} failed: HTTP ${response.status}`);
        }
        
        const data = await response.json();
        return {
            index,
            success: true,
            contentLength: data.content ? data.content.length : 0,
            timestamp: Date.now()
        };
    }

    // Run performance benchmarking
    async runPerformanceBenchmark() {
        console.log('Running performance benchmark...');
        
        try {
            // Load performance benchmarker
            const { PerformanceBenchmarker } = await import('./test-performance-benchmarking.js');
            const benchmarker = new PerformanceBenchmarker();
            
            const results = await benchmarker.runCompleteBenchmark();
            this.results.performance = results;
            
            return results;
        } catch (error) {
            console.error('Performance benchmark failed:', error);
            this.results.performance = { error: error.message };
            throw error;
        }
    }

    // Run reliability testing
    async runReliabilityTest() {
        console.log('Running reliability test...');
        
        try {
            // Load reliability tester
            const { ReliabilityTester } = await import('./test-reliability-validation.js');
            const tester = new ReliabilityTester();
            
            const results = await tester.runCompleteReliabilityTest();
            this.results.reliability = results;
            
            return results;
        } catch (error) {
            console.error('Reliability test failed:', error);
            this.results.reliability = { error: error.message };
            throw error;
        }
    }

    // Generate combined analysis
    generateCombinedAnalysis() {
        const analysis = {
            overallScore: 0,
            performanceScore: 0,
            reliabilityScore: 0,
            recommendations: [],
            criticalIssues: [],
            summary: {}
        };

        // Analyze performance results
        if (this.results.performance && !this.results.performance.error) {
            const perf = this.results.performance;
            
            // Calculate performance score based on metrics
            let perfScore = 100;
            
            if (perf.baselineMetrics) {
                // Deduct points for slow average response times
                if (perf.baselineMetrics.averageDuration > 10000) perfScore -= 30;
                else if (perf.baselineMetrics.averageDuration > 5000) perfScore -= 15;
                
                // Deduct points for low success rate
                if (perf.baselineMetrics.successRate < 90) perfScore -= 20;
                else if (perf.baselineMetrics.successRate < 95) perfScore -= 10;
            }
            
            // Check memory usage
            if (perf.memoryUsage && perf.memoryUsage.peak > 100) {
                perfScore -= 10;
                analysis.recommendations.push('Monitor memory usage - peak usage exceeded 100MB');
            }
            
            analysis.performanceScore = Math.max(0, perfScore);
        }

        // Analyze reliability results
        if (this.results.reliability && !this.results.reliability.error) {
            const rel = this.results.reliability;
            analysis.reliabilityScore = rel.summary ? rel.summary.reliabilityScore : 0;
            
            if (rel.recommendations) {
                analysis.recommendations.push(...rel.recommendations);
            }
        }

        // Calculate overall score
        analysis.overallScore = Math.round((analysis.performanceScore + analysis.reliabilityScore) / 2);

        // Identify critical issues
        if (analysis.performanceScore < 70) {
            analysis.criticalIssues.push('Performance below acceptable threshold');
        }
        if (analysis.reliabilityScore < 70) {
            analysis.criticalIssues.push('Reliability below acceptable threshold');
        }

        // Generate summary
        analysis.summary = {
            status: analysis.overallScore >= 80 ? 'PASS' : analysis.overallScore >= 60 ? 'WARNING' : 'FAIL',
            overallScore: analysis.overallScore,
            testDuration: this.results.endTime - this.results.startTime,
            timestamp: Date.now()
        };

        return analysis;
    }

    // Run complete test suite
    async runCompleteTestSuite() {
        console.log('Starting comprehensive performance and reliability test suite...');
        
        try {
            // Test site responsiveness
            const responsivenessResults = await this.testSiteResponsiveness();
            
            // Run performance benchmark
            await this.runPerformanceBenchmark();
            
            // Run reliability test
            await this.runReliabilityTest();
            
            // Mark end time
            this.results.endTime = Date.now();
            
            // Generate combined analysis
            this.results.combined = this.generateCombinedAnalysis();
            this.results.responsiveness = responsivenessResults;
            
            console.log('Complete test suite finished successfully');
            return this.results;
            
        } catch (error) {
            this.results.endTime = Date.now();
            console.error('Test suite failed:', error);
            throw error;
        }
    }

    // Save results to files
    saveResults() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        try {
            if (typeof require !== 'undefined') {
                const fs = require('fs');
                
                // Save complete results
                fs.writeFileSync(
                    `performance-reliability-results-${timestamp}.json`,
                    JSON.stringify(this.results, null, 2)
                );
                
                // Save summary report
                const summary = {
                    timestamp: new Date().toISOString(),
                    overallScore: this.results.combined?.overallScore || 0,
                    performanceScore: this.results.combined?.performanceScore || 0,
                    reliabilityScore: this.results.combined?.reliabilityScore || 0,
                    status: this.results.combined?.summary?.status || 'UNKNOWN',
                    criticalIssues: this.results.combined?.criticalIssues || [],
                    recommendations: this.results.combined?.recommendations || []
                };
                
                fs.writeFileSync(
                    `test-summary-${timestamp}.json`,
                    JSON.stringify(summary, null, 2)
                );
                
                console.log(`Results saved to performance-reliability-results-${timestamp}.json`);
                console.log(`Summary saved to test-summary-${timestamp}.json`);
            }
        } catch (error) {
            console.warn('Could not save results to file:', error.message);
        }
    }
}

// Responsiveness tester class
class ResponsivenessTester {
    constructor() {
        this.measurements = [];
        this.monitoring = false;
        this.interval = null;
    }

    startMonitoring() {
        if (this.monitoring) return;
        
        this.monitoring = true;
        this.measurements = [];
        
        // Monitor frame rate and responsiveness
        this.interval = setInterval(() => {
            const start = performance.now();
            
            requestAnimationFrame(() => {
                const frameTime = performance.now() - start;
                
                this.measurements.push({
                    frameTime,
                    timestamp: Date.now(),
                    memoryUsage: this.getMemoryUsage()
                });
            });
        }, 100);
    }

    stopMonitoring() {
        if (!this.monitoring) return null;
        
        this.monitoring = false;
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        
        return this.analyzeResponsiveness();
    }

    getMemoryUsage() {
        if (performance.memory) {
            return Math.round(performance.memory.usedJSHeapSize / 1024 / 1024 * 100) / 100;
        }
        return 0;
    }

    analyzeResponsiveness() {
        if (this.measurements.length === 0) {
            return { responsive: true, averageFrameTime: 0, maxFrameTime: 0 };
        }
        
        const frameTimes = this.measurements.map(m => m.frameTime);
        const averageFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
        const maxFrameTime = Math.max(...frameTimes);
        
        // Consider responsive if average frame time < 16ms (60fps) and max < 50ms
        const responsive = averageFrameTime < 16 && maxFrameTime < 50;
        
        return {
            responsive,
            averageFrameTime: Math.round(averageFrameTime * 100) / 100,
            maxFrameTime: Math.round(maxFrameTime * 100) / 100,
            measurementCount: this.measurements.length,
            memoryTrend: this.analyzeMemoryTrend()
        };
    }

    analyzeMemoryTrend() {
        if (this.measurements.length < 2) return 'stable';
        
        const memoryValues = this.measurements.map(m => m.memoryUsage).filter(m => m > 0);
        if (memoryValues.length < 2) return 'unknown';
        
        const first = memoryValues[0];
        const last = memoryValues[memoryValues.length - 1];
        const change = ((last - first) / first) * 100;
        
        if (change > 10) return 'increasing';
        if (change < -5) return 'decreasing';
        return 'stable';
    }
}

// Main execution function
async function runPerformanceReliabilityTest() {
    const testSuite = new PerformanceReliabilityTestSuite();
    
    try {
        const results = await testSuite.runCompleteTestSuite();
        
        console.log('=== PERFORMANCE & RELIABILITY TEST RESULTS ===');
        console.log('Overall Score:', results.combined?.overallScore || 'N/A');
        console.log('Performance Score:', results.combined?.performanceScore || 'N/A');
        console.log('Reliability Score:', results.combined?.reliabilityScore || 'N/A');
        console.log('Status:', results.combined?.summary?.status || 'UNKNOWN');
        
        if (results.combined?.criticalIssues?.length > 0) {
            console.log('Critical Issues:', results.combined.criticalIssues);
        }
        
        if (results.combined?.recommendations?.length > 0) {
            console.log('Recommendations:', results.combined.recommendations);
        }
        
        // Save results
        testSuite.saveResults();
        
        return results;
        
    } catch (error) {
        console.error('Performance and reliability test failed:', error);
        return {
            success: false,
            error: error.message,
            timestamp: Date.now()
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        PerformanceReliabilityTestSuite, 
        ResponsivenessTester,
        runPerformanceReliabilityTest 
    };
}

// Auto-setup for browser environment
if (typeof window !== 'undefined') {
    window.PerformanceReliabilityTestSuite = PerformanceReliabilityTestSuite;
    window.ResponsivenessTester = ResponsivenessTester;
    window.runPerformanceReliabilityTest = runPerformanceReliabilityTest;
}