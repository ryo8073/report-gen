/**
 * Unit tests for Word Export functionality
 * Tests the core Word document export capabilities
 */

const fs = require('fs');
const path = require('path');

// Mock DOM environment for testing
global.document = {
    createElement: (tag) => ({
        tagName: tag.toUpperCase(),
        innerHTML: '',
        textContent: '',
        style: {},
        classList: {
            add: () => {},
            remove: () => {},
            contains: () => false
        },
        setAttribute: () => {},
        getAttribute: () => null,
        appendChild: () => {},
        removeChild: () => {},
        querySelectorAll: () => [],
        querySelector: () => null,
        childNodes: [],
        children: [],
        cloneNode: () => ({
            tagName: tag.toUpperCase(),
            innerHTML: '',
            textContent: '',
            style: {},
            classList: { add: () => {}, remove: () => {}, contains: () => false },
            childNodes: [],
            children: []
        })
    }),
    body: {
        appendChild: () => {},
        removeChild: () => {}
    }
};

global.window = {
    location: {
        origin: 'http://localhost:3000'
    },
    URL: {
        createObjectURL: () => 'blob:test-url',
        revokeObjectURL: () => {}
    }
};

global.Node = {
    TEXT_NODE: 3,
    ELEMENT_NODE: 1
};

// Load the docx library
const docx = require('docx');
global.docx = docx;

// Load the Word Export Manager
const WordExportManager = require('./lib/word-export-manager.cjs');

async function runTests() {
    console.log('🧪 Starting Word Export Unit Tests...\n');
    
    let passedTests = 0;
    let totalTests = 0;
    
    function test(name, testFn) {
        totalTests++;
        try {
            console.log(`📝 Testing: ${name}`);
            testFn();
            console.log(`✅ PASSED: ${name}\n`);
            passedTests++;
        } catch (error) {
            console.log(`❌ FAILED: ${name}`);
            console.log(`   Error: ${error.message}\n`);
        }
    }
    
    async function asyncTest(name, testFn) {
        totalTests++;
        try {
            console.log(`📝 Testing: ${name}`);
            await testFn();
            console.log(`✅ PASSED: ${name}\n`);
            passedTests++;
        } catch (error) {
            console.log(`❌ FAILED: ${name}`);
            console.log(`   Error: ${error.message}\n`);
        }
    }
    
    // Test 1: WordExportManager initialization
    test('WordExportManager initialization', () => {
        const manager = new WordExportManager();
        if (!manager) throw new Error('Failed to create WordExportManager instance');
        if (typeof manager.exportToWord !== 'function') throw new Error('exportToWord method not found');
        if (typeof manager.getCapabilities !== 'function') throw new Error('getCapabilities method not found');
    });
    
    // Test 2: Default options
    test('Default options configuration', () => {
        const manager = new WordExportManager();
        const capabilities = manager.getCapabilities();
        
        if (!capabilities.formats.includes('docx')) throw new Error('docx format not supported');
        if (!capabilities.pageSizes.includes('A4')) throw new Error('A4 page size not supported');
        if (!capabilities.orientations.includes('portrait')) throw new Error('portrait orientation not supported');
    });
    
    // Test 3: Custom options
    test('Custom options configuration', () => {
        const customOptions = {
            defaultFilename: 'custom-document',
            pageSize: 'Letter',
            orientation: 'landscape',
            fontSize: 28
        };
        
        const manager = new WordExportManager(customOptions);
        if (manager.options.defaultFilename !== 'custom-document') throw new Error('Custom filename not set');
        if (manager.options.pageSize !== 'Letter') throw new Error('Custom page size not set');
        if (manager.options.orientation !== 'landscape') throw new Error('Custom orientation not set');
        if (manager.options.fontSize !== 28) throw new Error('Custom font size not set');
    });
    
    // Test 4: HTML content preparation
    asyncTest('HTML content preparation', async () => {
        const manager = new WordExportManager();
        const htmlContent = '<h1>Test Title</h1><p>Test paragraph with <strong>bold</strong> text.</p>';
        
        const element = await manager.prepareContentForExport(htmlContent, {});
        if (!element) throw new Error('Failed to prepare content');
        if (element.innerHTML !== htmlContent) throw new Error('Content not preserved during preparation');
    });
    
    // Test 5: Text run extraction
    test('Text run extraction', () => {
        const manager = new WordExportManager();
        
        // Create mock element
        const mockElement = {
            childNodes: [
                { nodeType: 3, textContent: 'Plain text ' }, // TEXT_NODE
                { 
                    nodeType: 1, // ELEMENT_NODE
                    tagName: 'STRONG',
                    textContent: 'bold text'
                }
            ]
        };
        
        const textRuns = manager.extractTextRuns(mockElement);
        if (textRuns.length === 0) throw new Error('No text runs extracted');
    });
    
    // Test 6: Filename generation
    test('Filename generation', () => {
        const manager = new WordExportManager();
        
        const filename1 = manager.generateFilename({ filename: 'test-doc' });
        if (!filename1.endsWith('.docx')) throw new Error('Filename missing .docx extension');
        
        const filename2 = manager.generateFilename({ includeTimestamp: false });
        if (!filename2.includes('business-document')) throw new Error('Default filename not used');
    });
    
    // Test 7: Word styles creation
    test('Word styles creation', () => {
        const manager = new WordExportManager();
        const styles = manager.createWordStyles({ fontFamily: 'Arial', fontSize: 24 });
        
        if (!styles.paragraphStyles) throw new Error('Paragraph styles not created');
        if (styles.paragraphStyles.length === 0) throw new Error('No paragraph styles defined');
    });
    
    // Test 8: Section properties creation
    test('Section properties creation', () => {
        const manager = new WordExportManager();
        const properties = manager.createSectionProperties({
            pageSize: 'A4',
            orientation: 'portrait'
        });
        
        if (!properties.page) throw new Error('Page properties not created');
        if (!properties.page.size) throw new Error('Page size not set');
        if (!properties.page.margin) throw new Error('Page margins not set');
    });
    
    // Test 9: Heading creation
    test('Heading creation', () => {
        const manager = new WordExportManager();
        
        const mockHeading = {
            textContent: 'Test Heading'
        };
        
        const heading = manager.createHeading(mockHeading, 'h1', {});
        if (!heading) throw new Error('Heading not created');
    });
    
    // Test 10: Paragraph creation
    test('Paragraph creation', () => {
        const manager = new WordExportManager();
        
        const mockParagraph = {
            childNodes: [
                { nodeType: 3, textContent: 'Test paragraph content' }
            ]
        };
        
        const paragraph = manager.createParagraph(mockParagraph, {});
        if (!paragraph) throw new Error('Paragraph not created');
    });
    
    // Test 11: Error handling
    asyncTest('Error handling for invalid content', async () => {
        const manager = new WordExportManager();
        
        try {
            await manager.exportToWord(null, {});
            throw new Error('Should have thrown error for null content');
        } catch (error) {
            if (error.message.includes('Should have thrown')) throw error;
            // Expected error - test passes
        }
    });
    
    // Test 12: Export progress tracking
    test('Export progress tracking', () => {
        const manager = new WordExportManager();
        
        const progress = manager.getExportProgress();
        if (typeof progress.isExporting !== 'boolean') throw new Error('isExporting not tracked');
        if (typeof progress.queueLength !== 'number') throw new Error('queueLength not tracked');
    });
    
    // Test 13: Capabilities reporting
    test('Capabilities reporting', () => {
        const manager = new WordExportManager();
        const capabilities = manager.getCapabilities();
        
        if (!Array.isArray(capabilities.formats)) throw new Error('Formats not reported as array');
        if (!Array.isArray(capabilities.pageSizes)) throw new Error('Page sizes not reported as array');
        if (!Array.isArray(capabilities.orientations)) throw new Error('Orientations not reported as array');
        if (typeof capabilities.features !== 'object') throw new Error('Features not reported as object');
    });
    
    // Test 14: Cleanup functionality
    test('Cleanup functionality', () => {
        const manager = new WordExportManager();
        
        // Set some state
        manager.isExporting = true;
        manager.exportQueue = ['test'];
        
        manager.destroy();
        
        if (manager.isExporting !== false) throw new Error('isExporting not reset');
        if (manager.exportQueue.length !== 0) throw new Error('exportQueue not cleared');
    });
    
    // Test 15: Complex HTML structure handling
    asyncTest('Complex HTML structure handling', async () => {
        const manager = new WordExportManager();
        
        const complexHtml = `
            <div>
                <h1>Main Title</h1>
                <h2>Subtitle</h2>
                <p>Paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
                <ul>
                    <li>List item 1</li>
                    <li>List item 2</li>
                </ul>
                <table>
                    <tr>
                        <th>Header 1</th>
                        <th>Header 2</th>
                    </tr>
                    <tr>
                        <td>Cell 1</td>
                        <td>Cell 2</td>
                    </tr>
                </table>
            </div>
        `;
        
        const element = await manager.prepareContentForExport(complexHtml, {});
        if (!element) throw new Error('Failed to prepare complex HTML content');
    });
    
    // Summary
    console.log('📊 Test Results Summary:');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${totalTests - passedTests}`);
    console.log(`   Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    if (passedTests === totalTests) {
        console.log('\n🎉 All tests passed! Word export functionality is working correctly.');
        return true;
    } else {
        console.log('\n⚠️  Some tests failed. Please review the implementation.');
        return false;
    }
}

// Run the tests
runTests().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
});