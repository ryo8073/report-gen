// Debug script to test Word Export Manager loading

console.log('1. Loading docx library...');
const docx = require('docx');
console.log('   docx loaded successfully:', typeof docx.Document);

console.log('2. Setting global docx...');
global.docx = docx;

console.log('3. Loading Word Export Manager...');
try {
    const WordExportManager = require('./lib/word-export-manager.js');
    console.log('   Module loaded, type:', typeof WordExportManager);
    console.log('   Is function?', typeof WordExportManager === 'function');
    console.log('   Constructor name:', WordExportManager.name);
    
    if (typeof WordExportManager === 'function') {
        console.log('4. Creating instance...');
        const manager = new WordExportManager();
        console.log('   Instance created successfully');
        console.log('   Instance type:', typeof manager);
        console.log('   Has exportToWord method:', typeof manager.exportToWord === 'function');
    } else {
        console.log('4. WordExportManager is not a constructor');
        console.log('   Exported object:', WordExportManager);
    }
} catch (error) {
    console.error('Error loading WordExportManager:', error.message);
    console.error('Stack:', error.stack);
}