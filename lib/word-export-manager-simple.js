/**
 * Simple Word Document Export Manager
 * Handles Word document export functionality using docx.js library
 * Implements requirements 7.1, 7.2, 7.3, 7.4 for Word document export functionality
 */

// Get docx library
let docx;
if (typeof window !== 'undefined' && window.docx) {
    docx = window.docx;
} else if (typeof require !== 'undefined') {
    try {
        docx = require('docx');
    } catch (e) {
        console.warn('docx library not found via require');
    }
} else if (typeof global !== 'undefined' && global.docx) {
    docx = global.docx;
}

class WordExportManager {
    constructor(options = {}) {
        // Check if docx library is available
        if (!docx) {
            throw new Error('docx library not found. Please ensure it is loaded before WordExportManager.');
        }
        
        this.options = {
            defaultFilename: 'business-document',
            includeHeaders: true,
            includeFooters: true,
            pageSize: 'A4',
            orientation: 'portrait',
            margins: {
                top: 720,
                right: 720,
                bottom: 720,
                left: 720
            },
            fontSize: 24,
            fontFamily: 'Arial',
            ...options
        };
        
        this.isExporting = false;
        this.exportQueue = [];
    }

    /**
     * Export content to Word document
     * @param {HTMLElement|string} content - Content to export
     * @param {Object} options - Export options
     * @returns {Promise<boolean>} Success status
     */
    async exportToWord(content, options = {}) {
        if (this.isExporting) {
            console.warn('Word export already in progress');
            return false;
        }

        try {
            this.isExporting = true;
            
            const exportOptions = { ...this.options, ...options };
            
            // Create simple document
            const doc = new docx.Document({
                sections: [{
                    properties: this.createSectionProperties(exportOptions),
                    headers: exportOptions.includeHeaders ? this.createHeaders(exportOptions) : {},
                    footers: exportOptions.includeFooters ? this.createFooters(exportOptions) : {},
                    children: await this.convertContentToWordElements(content, exportOptions)
                }]
            });
            
            // Download the document
            await this.downloadWordDocument(doc, exportOptions);
            
            return true;
            
        } catch (error) {
            console.error('Word export failed:', error);
            this.showErrorMessage(`Word export failed: ${error.message}`);
            return false;
        } finally {
            this.isExporting = false;
        }
    }

    /**
     * Convert content to Word elements
     * @param {HTMLElement|string} content - Content to convert
     * @param {Object} options - Export options
     * @returns {Promise<Array>} Array of Word elements
     */
    async convertContentToWordElements(content, options) {
        const elements = [];
        
        // Simple conversion - just create paragraphs from text content
        let textContent = '';
        
        if (typeof content === 'string') {
            // If it's HTML, try to extract text
            if (content.includes('<')) {
                // Simple HTML to text conversion
                textContent = content
                    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n$1\n\n')
                    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
                    .replace(/<br[^>]*>/gi, '\n')
                    .replace(/<[^>]+>/g, '')
                    .replace(/\n\s*\n\s*\n/g, '\n\n')
                    .trim();
            } else {
                textContent = content;
            }
        } else if (content && content.textContent) {
            textContent = content.textContent;
        } else {
            textContent = 'Generated document content';
        }
        
        // Split into paragraphs and create Word elements
        const paragraphs = textContent.split('\n\n').filter(p => p.trim());
        
        for (const paragraphText of paragraphs) {
            if (paragraphText.trim()) {
                elements.push(new docx.Paragraph({
                    children: [new docx.TextRun({
                        text: paragraphText.trim(),
                        font: options.fontFamily || 'Arial',
                        size: options.fontSize || 24
                    })],
                    spacing: {
                        after: 120
                    }
                }));
            }
        }
        
        // Add at least one paragraph if no content
        if (elements.length === 0) {
            elements.push(new docx.Paragraph({
                children: [new docx.TextRun({
                    text: 'Generated Business Document',
                    font: options.fontFamily || 'Arial',
                    size: options.fontSize || 24
                })]
            }));
        }
        
        return elements;
    }

    /**
     * Create section properties
     * @param {Object} options - Export options
     * @returns {Object} Section properties
     */
    createSectionProperties(options) {
        const pageSize = options.pageSize || 'A4';
        const orientation = options.orientation || 'portrait';
        
        const pageDimensions = {
            'A4': { width: 11906, height: 16838 },
            'Letter': { width: 12240, height: 15840 },
            'Legal': { width: 12240, height: 20160 }
        };
        
        const dims = pageDimensions[pageSize] || pageDimensions['A4'];
        
        return {
            page: {
                size: {
                    orientation: orientation === 'landscape' ? docx.PageOrientation.LANDSCAPE : docx.PageOrientation.PORTRAIT,
                    width: orientation === 'landscape' ? dims.height : dims.width,
                    height: orientation === 'landscape' ? dims.width : dims.height
                },
                margin: options.margins || {
                    top: 720,
                    right: 720,
                    bottom: 720,
                    left: 720
                }
            }
        };
    }

    /**
     * Create document headers
     * @param {Object} options - Export options
     * @returns {Object} Header configuration
     */
    createHeaders(options) {
        if (!options.headerFooterData || !options.headerFooterData.header) {
            return {};
        }
        
        return {
            default: new docx.Header({
                children: [
                    new docx.Paragraph({
                        children: [
                            new docx.TextRun({
                                text: options.headerFooterData.header,
                                font: options.fontFamily || 'Arial',
                                size: 20
                            })
                        ],
                        alignment: docx.AlignmentType.CENTER
                    })
                ]
            })
        };
    }

    /**
     * Create document footers
     * @param {Object} options - Export options
     * @returns {Object} Footer configuration
     */
    createFooters(options) {
        const footerElements = [];
        
        if (options.headerFooterData && options.headerFooterData.footer) {
            footerElements.push(
                new docx.TextRun({
                    text: options.headerFooterData.footer,
                    font: options.fontFamily || 'Arial',
                    size: 18
                })
            );
        }
        
        if (options.showPageNumbers !== false) {
            if (footerElements.length > 0) {
                footerElements.push(new docx.TextRun({ text: ' - ' }));
            }
            footerElements.push(
                new docx.TextRun({
                    text: 'Page ',
                    font: options.fontFamily || 'Arial',
                    size: 18
                })
            );
            footerElements.push(docx.PageNumber.CURRENT);
        }
        
        if (footerElements.length === 0) {
            return {};
        }
        
        return {
            default: new docx.Footer({
                children: [
                    new docx.Paragraph({
                        children: footerElements,
                        alignment: docx.AlignmentType.CENTER
                    })
                ]
            })
        };
    }

    /**
     * Download Word document
     * @param {Object} doc - Word document instance
     * @param {Object} options - Export options
     * @returns {Promise<void>}
     */
    async downloadWordDocument(doc, options) {
        try {
            const buffer = await docx.Packer.toBuffer(doc);
            const filename = this.generateFilename(options);
            
            if (typeof Blob !== 'undefined' && typeof document !== 'undefined') {
                // Browser environment
                const blob = new Blob([buffer], {
                    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                });
                
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                URL.revokeObjectURL(url);
                console.log('Word document downloaded successfully:', filename);
            } else {
                // Node.js environment
                console.log('Word document generated successfully:', filename, 'Buffer size:', buffer.length);
            }
            
        } catch (error) {
            console.error('Failed to download Word document:', error);
            throw error;
        }
    }

    /**
     * Generate filename for Word export
     * @param {Object} options - Export options
     * @returns {string} Generated filename
     */
    generateFilename(options) {
        let filename = options.filename || options.defaultFilename || 'business-document';
        
        if (options.includeTimestamp !== false) {
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
            filename += `_${timestamp}`;
        }
        
        if (!filename.toLowerCase().endsWith('.docx')) {
            filename += '.docx';
        }
        
        return filename;
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showErrorMessage(message) {
        if (typeof document !== 'undefined') {
            console.error('Word Export Error:', message);
            // Could add UI notification here
        } else {
            console.error('Word Export Error:', message);
        }
    }

    /**
     * Get export capabilities
     * @returns {Object} Supported features
     */
    getCapabilities() {
        return {
            formats: ['docx'],
            pageSizes: ['A4', 'Letter', 'Legal'],
            orientations: ['portrait', 'landscape'],
            features: {
                customMargins: true,
                headerFooter: true,
                pageNumbers: true,
                basicFormatting: true
            }
        };
    }

    /**
     * Get export progress
     * @returns {Object} Progress information
     */
    getExportProgress() {
        return {
            isExporting: this.isExporting,
            queueLength: this.exportQueue.length
        };
    }

    /**
     * Cancel export
     */
    cancelExport() {
        if (this.isExporting) {
            this.isExporting = false;
            console.log('Word export cancelled');
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.cancelExport();
        this.exportQueue = [];
        console.log('WordExportManager destroyed');
    }
}

// Export for different environments
if (typeof window !== 'undefined') {
    // Browser global
    window.WordExportManager = WordExportManager;
}

if (typeof module !== 'undefined' && module.exports) {
    // CommonJS (for .cjs files and Node.js)
    module.exports = WordExportManager;
}