// Test just the class definition

console.log('Setting up environment...');

// Mock environment
global.docx = require('docx');
global.document = {
    createElement: () => ({ innerHTML: '', children: [], querySelectorAll: () => [] }),
    body: { appendChild: () => {}, removeChild: () => {} }
};
global.window = { location: { origin: 'http://localhost' } };
global.Image = function() { return { onload: null, onerror: null }; };
global.Blob = function() { return {}; };

console.log('Testing minimal class...');

try {
    // Test a minimal version of the class
    eval(`
        class WordExportManager {
            constructor(options = {}) {
                console.log('Constructor called');
                this.options = { defaultFilename: 'test', ...options };
            }
            
            async exportToWord(content, options = {}) {
                console.log('exportToWord called');
                return true;
            }
        }
        
        console.log('Class defined, type:', typeof WordExportManager);
        const instance = new WordExportManager();
        console.log('Instance created');
    `);
} catch (error) {
    console.error('Minimal class failed:', error.message);
}

console.log('Testing with docx usage...');

try {
    eval(`
        class WordExportManagerWithDocx {
            constructor(options = {}) {
                if (!docx) {
                    throw new Error('docx library not found');
                }
                this.options = { defaultFilename: 'test', ...options };
            }
            
            createParagraph() {
                return new docx.Paragraph({
                    children: [new docx.TextRun({ text: 'test' })]
                });
            }
        }
        
        console.log('Class with docx defined, type:', typeof WordExportManagerWithDocx);
        const instance2 = new WordExportManagerWithDocx();
        console.log('Instance with docx created');
        const para = instance2.createParagraph();
        console.log('Paragraph created');
    `);
} catch (error) {
    console.error('Class with docx failed:', error.message);
    console.error('Stack:', error.stack);
}