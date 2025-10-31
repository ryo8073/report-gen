// Test immediate export

console.log('Setting up...');
global.docx = require('docx');

// Mock DOM
global.document = {
    createElement: () => ({ innerHTML: '', children: [], querySelectorAll: () => [] }),
    body: { appendChild: () => {}, removeChild: () => {} }
};
global.window = { location: { origin: 'http://localhost' } };

console.log('Reading file...');
const fs = require('fs');
let content = fs.readFileSync('./lib/word-export-manager.js', 'utf8');

// Remove the existing export and add immediate export
content = content.replace(
    /\/\/ Export for use in different module systems[\s\S]*$/,
    `
// Immediate export test
console.log('About to export WordExportManager, type:', typeof WordExportManager);
module.exports = WordExportManager;
`
);

console.log('Evaluating modified content...');
try {
    eval(content);
    console.log('✓ Evaluation successful');
} catch (error) {
    console.error('✗ Evaluation failed:', error.message);
    console.error('Stack:', error.stack);
}