/**
 * Word Document Export Manager
 * Handles Word document export functionality using docx.js library
 * Implements requirements 7.1, 7.2, 7.3, 7.4 for Word document export functionality
 * Provides client-side Word document generation with formatting preservation
 */

// docx library is loaded via CDN or npm - access from global or import
let docx;
if (typeof window !== 'undefined' && window.docx) {
    docx = window.docx;
} else if (typeof require !== 'undefined') {
    try {
        docx = require('docx');
    } catch (e) {
        console.warn('docx library not found via require, will try global access');
    }
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
            pageSize: 'A4', // 'A4', 'Letter', 'Legal'
            orientation: 'portrait', // 'portrait', 'landscape'
            margins: {
                top: 720, // 0.5 inch in twips (1440 twips = 1 inch)
                right: 720,
                bottom: 720,
                left: 720
            },
            fontSize: 24, // 12pt in half-points
            fontFamily: 'Arial',
            lineSpacing: 240, // 1.0 line spacing in twips
            ...options
        };
        
        this.isExporting = false;
        this.exportQueue = [];
        
        // Document structure
        this.documentSections = [];
        this.currentSection = null;
        
        console.log('WordExportManager initialized');
    }

    /**
     * Export content to Word document
     * @param {HTMLElement|string} content - Content to export (element or HTML string)
     * @param {Object} options - Export options
     * @returns {Promise<boolean>} Success status
     */
    async exportToWord(content, options = {}) {
        if (this.isExporting) {
            console.warn('Word export already in progress');
            return false;
        }

        // Initialize error handler if not already done
        if (!this.errorHandler) {
            this.errorHandler = new (window.ExportErrorHandler || class { 
                async handleExportError() { return { success: false }; } 
            })();
        }

        // Initialize content validator if not already done
        if (!this.contentValidator) {
            this.contentValidator = new (window.ContentValidator || class { 
                async validateContent() { return { isValid: true, errors: [], warnings: [] }; } 
            })();
        }

        const exportContext = {
            format: 'word',
            content: content,
            options: options,
            ...options
        };

        const retryFunction = async (retryContext) => {
            return await this.performWordExport(retryContext.content, retryContext);
        };

        try {
            this.isExporting = true;
            
            // Validate content before export
            const validationResult = await this.contentValidator.validateContent(content, exportContext);
            
            if (!validationResult.isValid) {
                const validationError = new Error('Content validation failed');
                validationError.name = 'ValidationError';
                validationError.validationResult = validationResult;
                throw validationError;
            }
            
            // Show warnings if any
            if (validationResult.warnings.length > 0) {
                console.warn('Word Export warnings:', validationResult.warnings);
                if (window.enhancedErrorHandler) {
                    window.enhancedErrorHandler.showNotification(
                        `Export proceeding with ${validationResult.warnings.length} warning(s). Check console for details.`,
                        'warning',
                        3000
                    );
                }
            }
            
            // Perform the actual export
            const result = await this.performWordExport(content, { ...this.options, ...options });
            return result;
            
        } catch (error) {
            console.error('Word export failed:', error);
            
            // Handle error with retry and fallback mechanisms
            const errorResult = await this.errorHandler.handleExportError(error, exportContext, retryFunction);
            
            if (errorResult.success) {
                return true;
            }
            
            // If all recovery attempts failed, show final error
            this.showErrorMessage(`Word export failed: ${error.message}`);
            return false;
            
        } finally {
            this.isExporting = false;
        }
    }

    /**
     * Perform the actual Word export (separated for retry mechanism)
     * @param {HTMLElement|string} content - Content to export
     * @param {Object} exportOptions - Export options
     * @returns {Promise<boolean>} Success status
     */
    async performWordExport(content, exportOptions) {
        // Prepare content for export
        const processedContent = await this.prepareContentForExport(content, exportOptions);
        
        // Convert HTML content to Word document structure
        const documentData = await this.convertHTMLToWordStructure(processedContent, exportOptions);
        
        // Create Word document
        const doc = await this.createWordDocument(documentData, exportOptions);
        
        // Generate and download the document
        await this.downloadWordDocument(doc, exportOptions);
        
        return true;
    }

    /**
     * Prepare content for Word export
     * @param {HTMLElement|string} content - Content to prepare
     * @param {Object} options - Export options
     * @returns {Promise<HTMLElement>} Prepared HTML element
     */
    async prepareContentForExport(content, options) {
        let element;
        
        if (typeof content === 'string') {
            // Create temporary element from HTML string
            if (typeof document !== 'undefined') {
                element = document.createElement('div');
                element.innerHTML = content;
            } else {
                // Node.js environment - create mock element
                element = {
                    innerHTML: content,
                    children: [],
                    querySelectorAll: () => [],
                    querySelector: () => null,
                    cloneNode: () => ({ innerHTML: content, children: [] })
                };
            }
        } else if (content && typeof content === 'object') {
            // Clone the element to avoid modifying original
            element = content.cloneNode ? content.cloneNode(true) : content;
        } else {
            throw new Error('Invalid content type for Word export');
        }

        // Clean up content for Word export
        await this.cleanContentForWord(element, options);
        
        return element;
    }

    /**
     * Clean content for Word export
     * @param {HTMLElement} element - HTML element to clean
     * @param {Object} options - Export options
     */
    async cleanContentForWord(element, options) {
        // Remove interactive elements that don't make sense in Word
        const interactiveElements = element.querySelectorAll('button, input, select, textarea');
        interactiveElements.forEach(el => el.remove());
        
        // Remove onclick attributes and other event handlers
        const clickableElements = element.querySelectorAll('[onclick], [onmouseover], [onmouseout]');
        clickableElements.forEach(el => {
            el.removeAttribute('onclick');
            el.removeAttribute('onmouseover');
            el.removeAttribute('onmouseout');
        });
        
        // Convert relative URLs to absolute for images
        if (options.convertRelativeUrls !== false && typeof window !== 'undefined') {
            const baseUrl = window.location.origin;
            const images = element.querySelectorAll ? element.querySelectorAll('img[src]') : [];
            images.forEach(img => {
                if (!img.src.startsWith('http') && !img.src.startsWith('data:')) {
                    img.src = `${baseUrl}/${img.src}`;
                }
            });
        }
        
        // Ensure images are loaded and convert to base64
        await this.processImagesForWord(element);
        
        // Clean up CSS classes that won't work in Word
        this.cleanCSSForWord(element);
    }

    /**
     * Process images for Word document
     * @param {HTMLElement} element - Element containing images
     * @returns {Promise<void>}
     */
    async processImagesForWord(element) {
        const images = element.querySelectorAll('img');
        const imagePromises = Array.from(images).map(async (img) => {
            try {
                // Convert image to base64 if it's not already
                if (!img.src.startsWith('data:')) {
                    const base64 = await this.convertImageToBase64(img.src);
                    if (base64) {
                        img.setAttribute('data-base64', base64);
                        img.setAttribute('data-original-src', img.src);
                    }
                }
            } catch (error) {
                console.warn('Failed to process image:', img.src, error);
            }
        });
        
        await Promise.all(imagePromises);
    }

    /**
     * Convert image URL to base64
     * @param {string} imageUrl - Image URL
     * @returns {Promise<string|null>} Base64 string or null if failed
     */
    async convertImageToBase64(imageUrl) {
        // Only works in browser environment
        if (typeof Image === 'undefined' || typeof document === 'undefined') {
            console.warn('Image conversion not available in Node.js environment');
            return null;
        }
        
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    const base64 = canvas.toDataURL('image/png');
                    resolve(base64);
                } catch (error) {
                    console.warn('Failed to convert image to base64:', error);
                    resolve(null);
                }
            };
            
            img.onerror = () => {
                console.warn('Failed to load image:', imageUrl);
                resolve(null);
            };
            
            // Timeout after 5 seconds
            setTimeout(() => resolve(null), 5000);
            
            img.src = imageUrl;
        });
    }

    /**
     * Clean CSS classes for Word compatibility
     * @param {HTMLElement} element - HTML element
     */
    cleanCSSForWord(element) {
        // Remove CSS classes that won't work in Word
        const elementsWithClasses = element.querySelectorAll('[class]');
        elementsWithClasses.forEach(el => {
            // Keep only basic formatting classes
            const classes = el.className.split(' ').filter(cls => {
                return ['bold', 'italic', 'underline', 'center', 'left', 'right'].includes(cls);
            });
            el.className = classes.join(' ');
        });
    }

    /**
     * Convert HTML content to Word document structure
     * @param {HTMLElement} element - HTML element
     * @param {Object} options - Export options
     * @returns {Promise<Object>} Document structure for docx
     */
    async convertHTMLToWordStructure(element, options) {
        const documentData = {
            sections: [],
            styles: this.createWordStyles(options),
            numbering: this.createNumberingStyles()
        };
        
        // Process the HTML content
        const children = await this.processHTMLChildren(element, options);
        
        // Create main section
        const section = {
            properties: this.createSectionProperties(options),
            headers: options.includeHeaders ? this.createHeaders(options) : {},
            footers: options.includeFooters ? this.createFooters(options) : {},
            children: children
        };
        
        documentData.sections.push(section);
        
        return documentData;
    }

    /**
     * Process HTML children elements
     * @param {HTMLElement} element - Parent HTML element
     * @param {Object} options - Export options
     * @returns {Promise<Array>} Array of Word document elements
     */
    async processHTMLChildren(element, options) {
        const children = [];
        
        for (const child of element.children) {
            const wordElement = await this.convertHTMLElementToWord(child, options);
            if (wordElement) {
                if (Array.isArray(wordElement)) {
                    children.push(...wordElement);
                } else {
                    children.push(wordElement);
                }
            }
        }
        
        return children;
    }

    /**
     * Convert HTML element to Word document element
     * @param {HTMLElement} element - HTML element
     * @param {Object} options - Export options
     * @returns {Promise<Object|Array|null>} Word document element(s)
     */
    async convertHTMLElementToWord(element, options) {
        const tagName = element.tagName.toLowerCase();
        
        switch (tagName) {
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
            case 'h6':
                return this.createHeading(element, tagName, options);
                
            case 'p':
                return this.createParagraph(element, options);
                
            case 'ul':
            case 'ol':
                return await this.createList(element, tagName === 'ol', options);
                
            case 'table':
                return await this.createTable(element, options);
                
            case 'img':
                return await this.createImage(element, options);
                
            case 'blockquote':
                return this.createBlockquote(element, options);
                
            case 'pre':
            case 'code':
                return this.createCodeBlock(element, options);
                
            case 'hr':
                return this.createHorizontalRule();
                
            case 'br':
                return this.createLineBreak();
                
            case 'div':
            case 'section':
            case 'article':
                // Process children of container elements
                return await this.processHTMLChildren(element, options);
                
            default:
                // For other elements, try to extract text content
                if (element.textContent && element.textContent.trim()) {
                    return this.createParagraph(element, options);
                }
                return null;
        }
    }

    /**
     * Create Word heading element
     * @param {HTMLElement} element - HTML heading element
     * @param {string} tagName - Heading tag name (h1, h2, etc.)
     * @param {Object} options - Export options
     * @returns {Object} Word heading element
     */
    createHeading(element, tagName, options) {
        const level = parseInt(tagName.charAt(1));
        const text = element.textContent || '';
        
        return new docx.Paragraph({
            text: text,
            heading: `Heading${level}`,
            spacing: {
                before: level === 1 ? 480 : 240, // More space before H1
                after: 120
            }
        });
    }

    /**
     * Create Word paragraph element
     * @param {HTMLElement} element - HTML paragraph element
     * @param {Object} options - Export options
     * @returns {Object} Word paragraph element
     */
    createParagraph(element, options) {
        const textRuns = this.extractTextRuns(element);
        
        return new docx.Paragraph({
            children: textRuns,
            spacing: {
                after: 120 // 6pt after paragraph
            }
        });
    }

    /**
     * Extract text runs with formatting from HTML element
     * @param {HTMLElement} element - HTML element
     * @returns {Array} Array of text runs
     */
    extractTextRuns(element) {
        const textRuns = [];
        
        for (const node of element.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;
                if (text.trim()) {
                    textRuns.push(new docx.TextRun({
                        text: text,
                        font: this.options.fontFamily,
                        size: this.options.fontSize
                    }));
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const childRuns = this.extractFormattedTextRuns(node);
                textRuns.push(...childRuns);
            }
        }
        
        return textRuns;
    }

    /**
     * Extract formatted text runs from HTML element
     * @param {HTMLElement} element - HTML element
     * @returns {Array} Array of formatted text runs
     */
    extractFormattedTextRuns(element) {
        const tagName = element.tagName.toLowerCase();
        const text = element.textContent || '';
        
        if (!text.trim()) return [];
        
        const formatting = {
            font: this.options.fontFamily,
            size: this.options.fontSize
        };
        
        // Apply formatting based on HTML tags
        switch (tagName) {
            case 'strong':
            case 'b':
                formatting.bold = true;
                break;
            case 'em':
            case 'i':
                formatting.italics = true;
                break;
            case 'u':
                formatting.underline = {};
                break;
            case 'code':
                formatting.font = 'Courier New';
                formatting.shading = {
                    type: docx.ShadingType.SOLID,
                    color: 'F5F5F5'
                };
                break;
        }
        
        return [new docx.TextRun({
            text: text,
            ...formatting
        })];
    }

    /**
     * Create Word list element
     * @param {HTMLElement} element - HTML list element (ul/ol)
     * @param {boolean} isOrdered - Whether it's an ordered list
     * @param {Object} options - Export options
     * @returns {Promise<Array>} Array of Word list items
     */
    async createList(element, isOrdered, options) {
        const listItems = [];
        const listItems_html = element.querySelectorAll('li');
        
        for (let i = 0; i < listItems_html.length; i++) {
            const li = listItems_html[i];
            const textRuns = this.extractTextRuns(li);
            
            const listItem = new docx.Paragraph({
                children: textRuns,
                bullet: isOrdered ? undefined : {
                    level: 0
                },
                numbering: isOrdered ? {
                    reference: 'default-numbering',
                    level: 0
                } : undefined,
                spacing: {
                    after: 60
                }
            });
            
            listItems.push(listItem);
        }
        
        return listItems;
    }

    /**
     * Create Word table element
     * @param {HTMLElement} element - HTML table element
     * @param {Object} options - Export options
     * @returns {Promise<Object>} Word table element
     */
    async createTable(element, options) {
        const rows = [];
        const htmlRows = element.querySelectorAll('tr');
        
        for (const htmlRow of htmlRows) {
            const cells = [];
            const htmlCells = htmlRow.querySelectorAll('td, th');
            
            for (const htmlCell of htmlCells) {
                const textRuns = this.extractTextRuns(htmlCell);
                const isHeader = htmlCell.tagName.toLowerCase() === 'th';
                
                const cell = new docx.TableCell({
                    children: [new docx.Paragraph({
                        children: textRuns
                    })],
                    shading: isHeader ? {
                        type: docx.ShadingType.SOLID,
                        color: 'E5E5E5'
                    } : undefined
                });
                
                cells.push(cell);
            }
            
            rows.push(new docx.TableRow({
                children: cells
            }));
        }
        
        return new docx.Table({
            rows: rows,
            width: {
                size: 100,
                type: docx.WidthType.PERCENTAGE
            },
            borders: {
                top: { style: docx.BorderStyle.SINGLE, size: 1 },
                bottom: { style: docx.BorderStyle.SINGLE, size: 1 },
                left: { style: docx.BorderStyle.SINGLE, size: 1 },
                right: { style: docx.BorderStyle.SINGLE, size: 1 },
                insideHorizontal: { style: docx.BorderStyle.SINGLE, size: 1 },
                insideVertical: { style: docx.BorderStyle.SINGLE, size: 1 }
            }
        });
    }

    /**
     * Create Word image element
     * @param {HTMLElement} element - HTML image element
     * @param {Object} options - Export options
     * @returns {Promise<Object|null>} Word image element or null if failed
     */
    async createImage(element, options) {
        try {
            const base64Data = element.getAttribute('data-base64');
            if (!base64Data) {
                console.warn('No base64 data found for image');
                return null;
            }
            
            // Extract base64 data (remove data:image/png;base64, prefix)
            const base64 = base64Data.split(',')[1];
            if (!base64) {
                console.warn('Invalid base64 data for image');
                return null;
            }
            
            // Get image dimensions (with fallbacks)
            const width = parseInt(element.getAttribute('width')) || 300;
            const height = parseInt(element.getAttribute('height')) || 200;
            
            // Convert to Word-compatible dimensions (EMUs - English Metric Units)
            const maxWidth = 6 * 914400; // 6 inches in EMUs
            const maxHeight = 4 * 914400; // 4 inches in EMUs
            
            let finalWidth = Math.min(width * 9525, maxWidth); // Convert px to EMUs (approx)
            let finalHeight = Math.min(height * 9525, maxHeight);
            
            // Maintain aspect ratio
            const aspectRatio = width / height;
            if (finalWidth / finalHeight > aspectRatio) {
                finalWidth = finalHeight * aspectRatio;
            } else {
                finalHeight = finalWidth / aspectRatio;
            }
            
            const imageRun = new docx.ImageRun({
                data: base64,
                transformation: {
                    width: Math.round(finalWidth),
                    height: Math.round(finalHeight)
                }
            });
            
            return new docx.Paragraph({
                children: [imageRun],
                spacing: {
                    before: 120,
                    after: 120
                }
            });
            
        } catch (error) {
            console.warn('Failed to create Word image:', error);
            return null;
        }
    }

    /**
     * Create Word blockquote element
     * @param {HTMLElement} element - HTML blockquote element
     * @param {Object} options - Export options
     * @returns {Object} Word paragraph with quote styling
     */
    createBlockquote(element, options) {
        const textRuns = this.extractTextRuns(element);
        
        return new docx.Paragraph({
            children: textRuns,
            indent: {
                left: 720 // 0.5 inch indent
            },
            spacing: {
                before: 120,
                after: 120
            },
            shading: {
                type: docx.ShadingType.SOLID,
                color: 'F8F8F8'
            }
        });
    }

    /**
     * Create Word code block element
     * @param {HTMLElement} element - HTML code element
     * @param {Object} options - Export options
     * @returns {Object} Word paragraph with code styling
     */
    createCodeBlock(element, options) {
        const text = element.textContent || '';
        
        return new docx.Paragraph({
            children: [new docx.TextRun({
                text: text,
                font: 'Courier New',
                size: 20 // 10pt
            })],
            spacing: {
                before: 120,
                after: 120
            },
            shading: {
                type: docx.ShadingType.SOLID,
                color: 'F5F5F5'
            }
        });
    }

    /**
     * Create horizontal rule
     * @returns {Object} Word paragraph with border
     */
    createHorizontalRule() {
        return new docx.Paragraph({
            children: [new docx.TextRun({ text: '' })],
            border: {
                bottom: {
                    style: docx.BorderStyle.SINGLE,
                    size: 6,
                    color: 'CCCCCC'
                }
            },
            spacing: {
                before: 120,
                after: 120
            }
        });
    }

    /**
     * Create line break
     * @returns {Object} Word paragraph with line break
     */
    createLineBreak() {
        return new docx.Paragraph({
            children: [new docx.TextRun({ text: '', break: 1 })]
        });
    }

    /**
     * Create Word document styles
     * @param {Object} options - Export options
     * @returns {Object} Document styles
     */
    createWordStyles(options) {
        return {
            paragraphStyles: [
                {
                    id: 'Normal',
                    name: 'Normal',
                    basedOn: 'Normal',
                    next: 'Normal',
                    run: {
                        font: options.fontFamily || 'Arial',
                        size: options.fontSize || 24
                    },
                    paragraph: {
                        spacing: {
                            line: options.lineSpacing || 240
                        }
                    }
                }
            ]
        };
    }

    /**
     * Create numbering styles for lists
     * @returns {Object} Numbering configuration
     */
    createNumberingStyles() {
        return {
            config: [
                {
                    reference: 'default-numbering',
                    levels: [
                        {
                            level: 0,
                            format: docx.LevelFormat.DECIMAL,
                            text: '%1.',
                            alignment: docx.AlignmentType.START
                        }
                    ]
                }
            ]
        };
    }

    /**
     * Create section properties
     * @param {Object} options - Export options
     * @returns {Object} Section properties
     */
    createSectionProperties(options) {
        const pageSize = options.pageSize || 'A4';
        const orientation = options.orientation || 'portrait';
        
        // Page dimensions in twips (1440 twips = 1 inch)
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
                                size: 20 // 10pt
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
        
        // Add footer text if provided
        if (options.headerFooterData && options.headerFooterData.footer) {
            footerElements.push(
                new docx.TextRun({
                    text: options.headerFooterData.footer,
                    font: options.fontFamily || 'Arial',
                    size: 18 // 9pt
                })
            );
        }
        
        // Add page numbers if enabled
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
     * Create Word document from processed data
     * @param {Object} documentData - Document structure data
     * @param {Object} options - Export options
     * @returns {Promise<Object>} Word document instance
     */
    async createWordDocument(documentData, options) {
        const docOptions = {
            sections: documentData.sections,
            styles: documentData.styles,
            numbering: documentData.numbering
        };
        
        // Add document properties
        if (options.title) {
            docOptions.title = options.title;
        }
        
        if (options.author) {
            docOptions.creator = options.author;
        }
        
        docOptions.description = 'Generated by Word Export Manager';
        
        return new docx.Document(docOptions);
    }

    /**
     * Download Word document
     * @param {Object} doc - Word document instance
     * @param {Object} options - Export options
     * @returns {Promise<void>}
     */
    async downloadWordDocument(doc, options) {
        try {
            // Generate document buffer
            const buffer = await docx.Packer.toBuffer(doc);
            
            // Generate filename
            const filename = this.generateFilename(options);
            
            // Browser environment - create download
            if (typeof Blob !== 'undefined' && typeof document !== 'undefined') {
                // Create blob and download
                const blob = new Blob([buffer], {
                    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                });
                
                // Create download link
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                
                // Trigger download
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Clean up
                URL.revokeObjectURL(url);
                
                console.log('Word document downloaded successfully:', filename);
            } else {
                // Node.js environment - just log success
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
        
        // Add timestamp if requested
        if (options.includeTimestamp !== false) {
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
            filename += `_${timestamp}`;
        }
        
        // Ensure .docx extension
        if (!filename.toLowerCase().endsWith('.docx')) {
            filename += '.docx';
        }
        
        return filename;
    }

    /**
     * Show error message to user
     * @param {string} message - Error message
     */
    showErrorMessage(message) {
        // Only show UI error messages in browser environment
        if (typeof document !== 'undefined') {
            // Create error notification
            const errorDiv = document.createElement('div');
            errorDiv.innerHTML = message;
            errorDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                max-width: 400px;
                padding: 1rem;
                background: #fee2e2;
                border: 1px solid #fca5a5;
                border-radius: 8px;
                color: #991b1b;
                z-index: 10000;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            `;
            
            document.body.appendChild(errorDiv);
            
            // Auto-remove after 10 seconds
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.parentNode.removeChild(errorDiv);
                }
            }, 10000);
        } else {
            // Node.js environment - just log the error
            console.error('Word Export Error:', message);
        }
    }

    /**
     * Create Word export button
     * @param {Object} options - Button options
     * @returns {HTMLElement} Export button element
     */
    createExportButton(options = {}) {
        // Only works in browser environment
        if (typeof document === 'undefined') {
            console.warn('createExportButton not available in Node.js environment');
            return null;
        }
        
        const button = document.createElement('button');
        button.className = options.className || 'btn btn-primary business-export-btn';
        button.innerHTML = `
            <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14,2 14,8 20,8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10,9 9,9 8,9"></polyline>
            </svg>
            Export Word
        `;
        
        button.addEventListener('click', async () => {
            if (this.isExporting) return;
            
            // Show loading state
            const originalHTML = button.innerHTML;
            button.innerHTML = `
                <svg class="icon animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
                Generating Word...
            `;
            button.disabled = true;
            
            try {
                const content = options.getContent ? options.getContent() : (document ? document.querySelector('.results-preview') : null);
                const success = await this.exportToWord(content, options);
                
                if (success) {
                    // Show success feedback
                    button.innerHTML = `
                        <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 6L9 17l-5-5"/>
                        </svg>
                        Word Generated!
                    `;
                    
                    setTimeout(() => {
                        button.innerHTML = originalHTML;
                    }, 2000);
                }
                
            } catch (error) {
                console.error('Word export failed:', error);
                this.showErrorMessage(`Word export failed: ${error.message}`);
            } finally {
                button.disabled = false;
                if (button.innerHTML.includes('Generating')) {
                    button.innerHTML = originalHTML;
                }
            }
        });
        
        return button;
    }

    /**
     * Get export progress information
     * @returns {Object} Progress information
     */
    getExportProgress() {
        return {
            isExporting: this.isExporting,
            queueLength: this.exportQueue.length
        };
    }

    /**
     * Cancel current export operation
     */
    cancelExport() {
        if (this.isExporting) {
            this.isExporting = false;
            console.log('Word export cancelled');
        }
    }

    /**
     * Get supported export capabilities
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
                imageSupport: true,
                tableSupport: true,
                listSupport: true,
                formattingPreservation: true
            }
        };
    }

    /**
     * Cleanup resources and reset state
     */
    destroy() {
        // Cancel any ongoing export
        this.cancelExport();
        
        // Clear queues and reset state
        this.exportQueue = [];
        this.isExporting = false;
        this.documentSections = [];
        this.currentSection = null;
        
        console.log('WordExportManager destroyed and cleaned up');
    }
}

// Export for use in different module systems
if (typeof window !== 'undefined') {
    // Browser global
    window.WordExportManager = WordExportManager;
} else {
    // ES module export (for Node.js with type: "module")
    if (typeof module === 'undefined') {
        // This is likely an ES module environment
        globalThis.WordExportManager = WordExportManager;
    }
}

// ES module export
export default WordExportManager;