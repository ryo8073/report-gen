console.log('Debug test starting...');

const fs = require('fs');
const path = require('path');

// Check if key module files exist
const modulesToCheck = [
    'lib/print-preview-manager.js',
    'lib/optimized-pdf-export-manager.js',
    'lib/optimized-word-export-manager.js',
    'lib/performance-monitor-dashboard.js'
];

console.log('Checking module files...');

modulesToCheck.forEach(modulePath => {
    const exists = fs.existsSync(modulePath);
    console.log(`${modulePath}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
    
    if (exists) {
        try {
            const content = fs.readFileSync(modulePath, 'utf8');
            const hasExport = content.includes('module.exports') || content.includes('window.');
            const hasSyntaxError = content.includes('${') && !content.includes('`');
            console.log(`  - Has export pattern: ${hasExport}`);
            console.log(`  - Potential syntax issues: ${hasSyntaxError}`);
        } catch (error) {
            console.log(`  - Error reading file: ${error.message}`);
        }
    }
});

console.log('Debug test completed.');