// Step-by-step debug of WordExportManager

console.log('Step 1: Loading docx...');
const docx = require('docx');
global.docx = docx;

console.log('Step 2: Testing docx properties...');
console.log('  ShadingType:', typeof docx.ShadingType);
console.log('  WidthType:', typeof docx.WidthType);
console.log('  BorderStyle:', typeof docx.BorderStyle);
console.log('  LevelFormat:', typeof docx.LevelFormat);
console.log('  AlignmentType:', typeof docx.AlignmentType);
console.log('  PageOrientation:', typeof docx.PageOrientation);

console.log('Step 3: Testing class definition...');
try {
    eval(`
        class TestWordExportManager {
            constructor() {
                console.log('  Constructor works');
            }
            
            testMethod() {
                // Test docx usage
                const paragraph = new docx.Paragraph({
                    children: [new docx.TextRun({ text: 'test' })]
                });
                console.log('  docx usage works');
                
                // Test problematic properties
                const shadingType = docx.ShadingType.SOLID;
                console.log('  ShadingType.SOLID works');
                
                const widthType = docx.WidthType.PERCENTAGE;
                console.log('  WidthType.PERCENTAGE works');
                
                const borderStyle = docx.BorderStyle.SINGLE;
                console.log('  BorderStyle.SINGLE works');
                
                const levelFormat = docx.LevelFormat.DECIMAL;
                console.log('  LevelFormat.DECIMAL works');
                
                const alignmentType = docx.AlignmentType.START;
                console.log('  AlignmentType.START works');
                
                const pageOrientation = docx.PageOrientation.PORTRAIT;
                console.log('  PageOrientation.PORTRAIT works');
                
                return true;
            }
        }
        
        const manager = new TestWordExportManager();
        manager.testMethod();
        console.log('Step 3: Class definition successful');
    `);
} catch (error) {
    console.error('Step 3 failed:', error.message);
}

console.log('Step 4: Loading actual WordExportManager...');
try {
    const WordExportManager = require('./lib/word-export-manager.js');
    console.log('  Loaded successfully, type:', typeof WordExportManager);
} catch (error) {
    console.error('  Loading failed:', error.message);
    console.error('  Stack:', error.stack);
}