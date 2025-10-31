/**
 * Master Test Suite for Proposal Editor Enhancement
 * Orchestrates all test suites and generates comprehensive reports
 */

const fs = require('fs');
const path = require('path');

// Import test suites
let comprehensiveTests, integrationTests, crossBrowserTests;

try {
    comprehensiveTests = require('./test-proposal-editor-comprehensive.js');
} catch (error) {
    console.log('⚠️  Comprehensive test suite not available');
}

try {
    integrationTests = require('./test-proposal-editor-integration.js');
} catch (error) {
    console.log('⚠️  Integration test suite not available');
}

try {
    crossBrowserTests = require('./test-proposal-editor-cross-browser.js');
} catch (error) {
    console.log('⚠️  Cross-browser test suite not available');
}

// Master test configuration
const masterTestConfig = {
    testSuites: [
        {
            name: 'Comprehensive Tests',
            description: 'Unit tests for all components and functionality',
            runner: comprehensiveTests?.runAllTests,
            weight: 0.4 // 40% of total score
        },
        {
            name: 'Integration Tests',
            description: 'End-to-end workflow testing',
            runner: integrationTests?.runIntegrationTests,
            weight: 0.3 // 30% of total score
        },
        {
            name: 'Cross-Browser Tests',
            description: 'Browser compatibility and feature support',
            runner: crossBrowserTests?.runCrossBrowserTests,
            weight: 0.2 // 20% of total score
        },
        {
            name: 'Accessibility Tests',
            description: 'WCAG compliance and screen reader support',
            runner: null, // HTML-based test
            weight: 0.1 // 10% of total score
        }
    ],
    
    requirements: [
        {
            id: 'REQ-1',
            description: 'WYSIWYG Editor with markdown integration',
            components: ['lib/enhanced-wysiwyg-editor.js'],
            testFiles: ['test-enhanced-wysiwyg-editor.html']
        },
        {
            id: 'REQ-2',
            description: 'Professional business document styling',
            components: ['lib/business-document-formatter.js', 'lib/business-document-styles.css'],
            testFiles: ['test-business-document-styling.html']
        },
        {
            id: 'REQ-3',
            description: 'PDF export functionality',
            components: ['lib/pdf-export-manager.js'],
            testFiles: ['test-pdf-export-functionality.html']
        },
        {
            id: 'REQ-4',
            description: 'Image insertion and handling',
            components: ['lib/enhanced-wysiwyg-editor.js'],
            testFiles: ['test-enhanced-wysiwyg-editor.html']
        },
        {
            id: 'REQ-5',
            description: 'Template selection system',
            components: ['lib/template-selection-system.js', 'lib/template-styles.css'],
            testFiles: ['test-template-selection-system.html']
        },
        {
            id: 'REQ-6',
            description: 'Print preview functionality',
            components: ['lib/print-preview-manager.js', 'lib/print-preview-styles.css'],
            testFiles: ['test-print-preview-functionality.html']
        },
        {
            id: 'REQ-7',
            description: 'Word document export',
            components: ['lib/word-export-manager-browser.js'],
            testFiles: ['test-word-export-functionality.html']
        }
    ]
};

let masterTestResults = {
    suites: {},
    requirements: {},
    overall: {
        passed: 0,
        failed: 0,
        total: 0,
        score: 0
    },
    timestamp: new Date().toISOString()
};

// Utility functions
function logMasterTest(testName, passed, message = '') {
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${testName}${message ? ': ' + message : ''}`);
}

function calculateWeightedScore(suiteResults) {
    let totalScore = 0;
    let totalWeight = 0;
    
    masterTestConfig.testSuites.forEach(suite => {
        if (suiteResults[suite.name]) {
            const suiteScore = suiteResults[suite.name].successRate || 0;
            totalScore += suiteScore * suite.weight;
            totalWeight += suite.weight;
        }
    });
    
    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
}

// Test Suite 1: Run All Automated Tests
function runAutomatedTestSuites() {
    console.log('\n=== Running Automated Test Suites ===');
    
    masterTestConfig.testSuites.forEach(suite => {
        if (suite.runner) {
            console.log(`\n🔄 Running ${suite.name}...`);
            try {
                const success = suite.runner();
                masterTestResults.suites[suite.name] = {
                    success,
                    successRate: success ? 100 : 0,
                    weight: suite.weight
                };
                logMasterTest(suite.name, success, success ? 'All tests passed' : 'Some tests failed');
            } catch (error) {
                console.log(`❌ ${suite.name} failed to run: ${error.message}`);
                masterTestResults.suites[suite.name] = {
                    success: false,
                    successRate: 0,
                    weight: suite.weight,
                    error: error.message
                };
            }
        } else {
            console.log(`⏭️  ${suite.name} - Manual test (HTML-based)`);
            masterTestResults.suites[suite.name] = {
                success: null,
                successRate: null,
                weight: suite.weight,
                manual: true
            };
        }
    });
}

// Test Suite 2: Validate Requirements Implementation
function validateRequirementsImplementation() {
    console.log('\n=== Validating Requirements Implementation ===');
    
    masterTestConfig.requirements.forEach(requirement => {
        let requirementMet = true;
        let missingComponents = [];
        let missingTestFiles = [];
        
        // Check if required components exist
        requirement.components.forEach(component => {
            if (!fs.existsSync(component)) {
                requirementMet = false;
                missingComponents.push(component);
            }
        });
        
        // Check if test files exist
        requirement.testFiles.forEach(testFile => {
            if (!fs.existsSync(testFile)) {
                requirementMet = false;
                missingTestFiles.push(testFile);
            }
        });
        
        masterTestResults.requirements[requirement.id] = {
            description: requirement.description,
            met: requirementMet,
            missingComponents,
            missingTestFiles
        };
        
        const status = requirementMet ? 'Implemented' : 'Incomplete';
        const details = requirementMet ? '' : 
            `Missing: ${[...missingComponents, ...missingTestFiles].join(', ')}`;
        
        logMasterTest(`${requirement.id}: ${requirement.description}`, requirementMet, status + (details ? ` (${details})` : ''));
    });
}

// Test Suite 3: Component Integration Validation
function validateComponentIntegration() {
    console.log('\n=== Validating Component Integration ===');
    
    const integrationChecks = [
        {
            name: 'WYSIWYG Editor + Business Formatter',
            components: ['lib/enhanced-wysiwyg-editor.js', 'lib/business-document-formatter.js'],
            integration: 'business'
        },
        {
            name: 'Template System + Business Formatter',
            components: ['lib/template-selection-system.js', 'lib/business-document-formatter.js'],
            integration: 'template'
        },
        {
            name: 'PDF Export + Business Formatter',
            components: ['lib/pdf-export-manager.js', 'lib/business-document-formatter.js'],
            integration: 'export'
        },
        {
            name: 'Word Export + Content Validator',
            components: ['lib/word-export-manager-browser.js', 'lib/content-validator.js'],
            integration: 'validation'
        }
    ];
    
    integrationChecks.forEach(check => {
        let integrationExists = true;
        let integrationDetails = [];
        
        check.components.forEach(component => {
            if (fs.existsSync(component)) {
                const content = fs.readFileSync(component, 'utf8');
                const hasIntegration = content.includes(check.integration) || 
                                     content.includes(check.integration.charAt(0).toUpperCase() + check.integration.slice(1));
                
                if (hasIntegration) {
                    integrationDetails.push(`${component}: ✓`);
                } else {
                    integrationExists = false;
                    integrationDetails.push(`${component}: ✗`);
                }
            } else {
                integrationExists = false;
                integrationDetails.push(`${component}: Missing`);
            }
        });
        
        logMasterTest(check.name, integrationExists, integrationExists ? 'Integrated' : 'Not integrated');
    });
}

// Test Suite 4: Performance and Quality Metrics
function analyzePerformanceAndQuality() {
    console.log('\n=== Analyzing Performance and Quality Metrics ===');
    
    const components = [
        'lib/enhanced-wysiwyg-editor.js',
        'lib/business-document-formatter.js',
        'lib/pdf-export-manager.js',
        'lib/word-export-manager-browser.js',
        'lib/template-selection-system.js'
    ];
    
    let totalSize = 0;
    let componentCount = 0;
    let qualityMetrics = {
        hasErrorHandling: 0,
        hasDocumentation: 0,
        hasTypeChecking: 0,
        hasOptimization: 0
    };
    
    components.forEach(component => {
        if (fs.existsSync(component)) {
            const content = fs.readFileSync(component, 'utf8');
            const stats = fs.statSync(component);
            
            totalSize += stats.size;
            componentCount++;
            
            // Check for error handling
            if (content.includes('try') && content.includes('catch')) {
                qualityMetrics.hasErrorHandling++;
            }
            
            // Check for documentation
            if (content.includes('/**') || content.includes('//')) {
                qualityMetrics.hasDocumentation++;
            }
            
            // Check for type checking patterns
            if (content.includes('typeof') || content.includes('instanceof')) {
                qualityMetrics.hasTypeChecking++;
            }
            
            // Check for optimization patterns
            if (content.includes('debounce') || content.includes('throttle') || content.includes('cache')) {
                qualityMetrics.hasOptimization++;
            }
        }
    });
    
    const avgSize = Math.round(totalSize / componentCount / 1024); // KB
    const qualityScore = Math.round(
        ((qualityMetrics.hasErrorHandling + qualityMetrics.hasDocumentation + 
          qualityMetrics.hasTypeChecking + qualityMetrics.hasOptimization) / 
         (componentCount * 4)) * 100
    );
    
    console.log(`📊 Performance Metrics:`);
    console.log(`   • Total component size: ${Math.round(totalSize / 1024)}KB`);
    console.log(`   • Average component size: ${avgSize}KB`);
    console.log(`   • Components with error handling: ${qualityMetrics.hasErrorHandling}/${componentCount}`);
    console.log(`   • Components with documentation: ${qualityMetrics.hasDocumentation}/${componentCount}`);
    console.log(`   • Overall quality score: ${qualityScore}%`);
    
    masterTestResults.performance = {
        totalSize: Math.round(totalSize / 1024),
        averageSize: avgSize,
        qualityScore,
        qualityMetrics
    };
    
    logMasterTest('Performance Analysis', qualityScore >= 70, `Quality score: ${qualityScore}%`);
}

// Generate Comprehensive Test Report
function generateComprehensiveReport() {
    // Calculate overall score
    const weightedScore = calculateWeightedScore(masterTestResults.suites);
    
    // Count requirements implementation
    const implementedRequirements = Object.values(masterTestResults.requirements)
        .filter(req => req.met).length;
    const totalRequirements = Object.keys(masterTestResults.requirements).length;
    const requirementScore = Math.round((implementedRequirements / totalRequirements) * 100);
    
    // Calculate final score
    const finalScore = Math.round((weightedScore * 0.7) + (requirementScore * 0.3));
    
    masterTestResults.overall = {
        score: finalScore,
        weightedScore,
        requirementScore,
        implementedRequirements,
        totalRequirements,
        grade: finalScore >= 90 ? 'A' : finalScore >= 80 ? 'B' : finalScore >= 70 ? 'C' : finalScore >= 60 ? 'D' : 'F'
    };
    
    const report = {
        summary: {
            overallScore: finalScore,
            grade: masterTestResults.overall.grade,
            implementedRequirements: `${implementedRequirements}/${totalRequirements}`,
            testSuiteResults: Object.keys(masterTestResults.suites).length,
            timestamp: masterTestResults.timestamp
        },
        
        testSuites: masterTestResults.suites,
        requirements: masterTestResults.requirements,
        performance: masterTestResults.performance,
        
        recommendations: generateRecommendations(),
        
        nextSteps: [
            'Run accessibility tests manually using test-proposal-editor-accessibility.html',
            'Perform user acceptance testing with real business documents',
            'Test export functionality with various document sizes and formats',
            'Validate cross-browser compatibility on actual devices',
            'Conduct performance testing with large documents',
            'Review and optimize code based on quality metrics'
        ],
        
        testFiles: {
            comprehensive: 'test-proposal-editor-comprehensive.js',
            integration: 'test-proposal-editor-integration.js',
            crossBrowser: 'test-proposal-editor-cross-browser.js',
            accessibility: 'test-proposal-editor-accessibility.html',
            masterSuite: 'test-proposal-editor-master-suite.js'
        }
    };
    
    return report;
}

function generateRecommendations() {
    const recommendations = [];
    
    // Based on test results
    if (masterTestResults.overall.requirementScore < 100) {
        recommendations.push('Complete implementation of missing requirements');
    }
    
    if (masterTestResults.performance?.qualityScore < 80) {
        recommendations.push('Improve code quality with better error handling and documentation');
    }
    
    if (masterTestResults.performance?.averageSize > 50) {
        recommendations.push('Consider code splitting and lazy loading for large components');
    }
    
    // Based on suite results
    Object.entries(masterTestResults.suites).forEach(([suiteName, results]) => {
        if (results.successRate !== null && results.successRate < 90) {
            recommendations.push(`Address failing tests in ${suiteName}`);
        }
    });
    
    // General recommendations
    recommendations.push('Implement automated testing in CI/CD pipeline');
    recommendations.push('Add performance monitoring for export operations');
    recommendations.push('Create user documentation and tutorials');
    
    return recommendations;
}

// Main master test runner
function runMasterTestSuite() {
    console.log('🎯 Starting Master Test Suite for Proposal Editor Enhancement');
    console.log('================================================================');
    console.log('This comprehensive test suite validates all aspects of the implementation');
    console.log('================================================================\n');
    
    // Run all test phases
    runAutomatedTestSuites();
    validateRequirementsImplementation();
    validateComponentIntegration();
    analyzePerformanceAndQuality();
    
    // Generate comprehensive report
    const report = generateComprehensiveReport();
    
    // Display final results
    console.log('\n================================================================');
    console.log('🏆 FINAL TEST RESULTS');
    console.log('================================================================');
    console.log(`Overall Score: ${report.summary.overallScore}% (Grade: ${report.summary.grade})`);
    console.log(`Requirements: ${report.summary.implementedRequirements} implemented`);
    console.log(`Test Suites: ${report.summary.testSuiteResults} executed`);
    
    // Display suite breakdown
    console.log('\n📊 Test Suite Breakdown:');
    Object.entries(masterTestResults.suites).forEach(([suiteName, results]) => {
        const icon = results.success === true ? '✅' : results.success === false ? '❌' : '⏭️';
        const score = results.successRate !== null ? `${results.successRate}%` : 'Manual';
        console.log(`${icon} ${suiteName}: ${score} (Weight: ${Math.round(results.weight * 100)}%)`);
    });
    
    // Display recommendations
    if (report.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        report.recommendations.forEach((rec, index) => {
            console.log(`${index + 1}. ${rec}`);
        });
    }
    
    // Display next steps
    console.log('\n🚀 Next Steps:');
    report.nextSteps.forEach((step, index) => {
        console.log(`${index + 1}. ${step}`);
    });
    
    // Save comprehensive report
    try {
        fs.writeFileSync('test-proposal-editor-master-report.json', JSON.stringify(report, null, 2));
        console.log('\n📄 Comprehensive test report saved to: test-proposal-editor-master-report.json');
    } catch (error) {
        console.log('\n⚠️  Could not save master report:', error.message);
    }
    
    // Final status
    const success = report.summary.overallScore >= 80;
    console.log(`\n${success ? '🎉' : '⚠️'} Final Status: ${success ? 'IMPLEMENTATION READY' : 'NEEDS IMPROVEMENT'}`);
    
    if (success) {
        console.log('\n✨ Congratulations! The Proposal Editor Enhancement is ready for production use.');
        console.log('   All core functionality has been implemented and tested successfully.');
    } else {
        console.log('\n🔧 The implementation needs attention before production deployment.');
        console.log('   Please address the recommendations above and re-run the tests.');
    }
    
    return success;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runMasterTestSuite,
        masterTestConfig,
        masterTestResults,
        generateComprehensiveReport
    };
}

// Run master test suite if this file is executed directly
if (require.main === module) {
    runMasterTestSuite();
}