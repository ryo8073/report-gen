// Minimal Word Export Manager for testing

const docx = require('docx');

class MinimalWordExportManager {
    constructor(options = {}) {
        console.log('Constructor called');
        
        // Check if docx library is available
        if (!docx) {
            throw new Error('docx library not found');
        }
        
        this.options = {
            defaultFilename: 'test-document',
            ...options
        };
        
        console.log('MinimalWordExportManager initialized');
    }

    async exportToWord(content, options = {}) {
        console.log('exportToWord called');
        
        try {
            // Create a simple document
            const doc = new docx.Document({
                sections: [{
                    properties: {},
                    children: [
                        new docx.Paragraph({
                            children: [
                                new docx.TextRun({
                                    text: "Hello World! This is a test document.",
                                    font: "Arial",
                                    size: 24
                                })
                            ]
                        })
                    ]
                }]
            });
            
            console.log('Document created successfully');
            
            // Generate buffer
            const buffer = await docx.Packer.toBuffer(doc);
            console.log('Buffer generated, size:', buffer.length);
            
            return true;
            
        } catch (error) {
            console.error('Export failed:', error);
            return false;
        }
    }

    getCapabilities() {
        return {
            formats: ['docx'],
            pageSizes: ['A4', 'Letter'],
            orientations: ['portrait', 'landscape']
        };
    }
}

// Export
module.exports = MinimalWordExportManager;

// Test if we can create an instance
if (require.main === module) {
    console.log('Testing MinimalWordExportManager...');
    
    try {
        const manager = new MinimalWordExportManager();
        console.log('✓ Instance created successfully');
        
        const capabilities = manager.getCapabilities();
        console.log('✓ Capabilities:', capabilities);
        
        // Test export
        manager.exportToWord('<p>Test content</p>').then(success => {
            console.log('✓ Export test result:', success);
        }).catch(error => {
            console.error('✗ Export test failed:', error);
        });
        
    } catch (error) {
        console.error('✗ Failed to create instance:', error);
    }
}