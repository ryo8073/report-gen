// Test WordExportManager loading step by step

console.log('Setting up environment...');

// Mock DOM environment
global.document = {
    createElement: (tag) => ({
        tagName: tag.toUpperCase(),
        innerHTML: '',
        textContent: '',
        style: {},
        classList: { add: () => {}, remove: () => {}, contains: () => false },
        setAttribute: () => {},
        getAttribute: () => null,
        appendChild: () => {},
        removeChild: () => {},
        querySelectorAll: () => [],
        querySelector: () => null,
        childNodes: [],
        children: [],
        cloneNode: () => ({ innerHTML: '', children: [], querySelectorAll: () => [], querySelector: () => null })
    }),
    body: { appendChild: () => {}, removeChild: () => {} },
    querySelector: () => null
};

global.window = {
    location: { origin: 'http://localhost:3000' },
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL: () => {} }
};

global.Image = function() {
    return {
        onload: null,
        onerror: null,
        src: '',
        width: 100,
        height: 100
    };
};

global.Blob = function(data, options) {
    return { data, options };
};

global.Node = { TEXT_NODE: 3, ELEMENT_NODE: 1 };

console.log('Loading docx...');
const docx = require('docx');
global.docx = docx;

console.log('Testing docx functionality...');
try {
    const testDoc = new docx.Document({
        sections: [{
            children: [
                new docx.Paragraph({
                    children: [new docx.TextRun({ text: 'test' })]
                })
            ]
        }]
    });
    console.log('✓ docx works correctly');
} catch (error) {
    console.error('✗ docx test failed:', error.message);
}

console.log('Loading WordExportManager...');
try {
    // Read the file content and evaluate it step by step
    const fs = require('fs');
    const content = fs.readFileSync('./lib/word-export-manager.js', 'utf8');
    
    console.log('File loaded, length:', content.length);
    
    // Try to evaluate the content
    eval(content);
    
    console.log('✓ File evaluated successfully');
    console.log('WordExportManager type:', typeof WordExportManager);
    
    if (typeof WordExportManager === 'function') {
        const manager = new WordExportManager();
        console.log('✓ Instance created successfully');
    }
    
} catch (error) {
    console.error('✗ Loading failed:', error.message);
    console.error('Stack:', error.stack);
}