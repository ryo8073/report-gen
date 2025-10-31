/**
 * Optimized Word Export Manager
 * Enhanced version with performance optimizations
 * Task 14: Add performance optimizations
 * Requirements: Performance and scalability
 */

class OptimizedWordExportManager {
    constructor(options = {}) {
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
            lineSpacing: 240,
            // Performance optimization options
            enableLazyLoading: true,
            enableCaching: true,
            enableChunkedProcessing: true,
            enableMemoryOptimization: true,
            chunkSize: 200, // Smaller chunks for Word processing
            ...options
        };
        
        this.isExporting = false;
        this.exportQueue = [];
        this.documentSections = [];
        this.currentSection = null;
        
        // Performance optimization manager
        this.performanceManager = null;
        this.initializePerformanceManager();
        
        console.log('OptimizedWordExportManager initialized');
    }

    /**
     * Initialize performance optimization manager
     */
    async initializePerformanceManager() {
        try {
            // Import performance manager if not already available
            if (typeof PerformanceOptimizationManager === 'undefined') {
                await import('./performance-optimization-manager.js');
            }
            
            this.performanceManager = new PerformanceOptimizationManager({
                cacheEnabled: this.options.enableCaching,
                chunkSize: this.options.chunkSize,
                memoryMonitoringEnabled: this.options.enableMemoryOptimization
            });
            
            // Preload Word libraries if lazy loading is enabled
            if (this.options.enableLazyLoading) {
                this.performanceManager.preloadLibraries('word');
            }
            
        } catch (error) {
            console.warn('Failed to initialize performance manager:', error);
            // Create fallback performance manager
            this.performanceManager = this.createFallbackPerformanceManager();
        }
    }

    /**
     * Create fallback performance manager
     * @returns {Object} Fallback performance manager
     */
    createFallbackPerformanceManager() {
        return {
            lazyLoadLibraries: async () => true,
            getCachedContent: () => null,
            cacheContent: () => {},
            processInChunks: async (content, processor, options) => processor(content, options),
            optimizeMemory: async () => {},
            getMetrics: () => ({}),
            cleanup: () => {}
        };
    }

    /**
     * Export content to Word with performance optimizations
     * @param {HTMLElement|string} content - Content to export
     * @param {Object} options - Export options
     * @returns {Promise<boolean>} Success status
     */
    async exportToWord(content, options = {}) {
        if (this.isExporting) {
            console.warn('Word export already in progress');
            return false;
        }

        const exportStartTime = performance.now();
        
        try {
            this.isExporting = true;
            
            // Merge options
            const exportOptions = { ...this.options, ...options };
            
            // Lazy load Word libraries if needed
            if (exportOptions.enableLazyLoading) {
                const librariesLoaded = await this.performanceManager.lazyLoadLibraries('word');
                if (!librariesLoaded) {
                    throw new Error('Failed to load required Word libraries');
                }
            }
            
            // Check cache for previously processed content
            const cacheKey = this.generateCacheKey(content, exportOptions);
            let processedContent = null;
            
            if (exportOptions.enableCaching) {
                processedContent = this.performanceManager.getCachedContent(cacheKey);
                if (processedContent) {
                    console.log('Using cached processed content for Word export');
                }
            }
            
            // Process content if not cached
            if (!processedContent) {
                processedContent = await this.processContentWithOptimizations(content, exportOptions);
                
                // Cache processed content
                if (exportOptions.enableCaching) {
                    this.performanceManager.cacheContent(cacheKey, processedContent);
                }
            }
            
            // Generate Word document
            await this.generateOptimizedWordDocument(processedContent, exportOptions);
            
            const exportTime = performance.now() - exportStartTime;
            console.log(`Optimized Word export completed in ${Math.round(exportTime)}ms`);
            
            return true;
            
        } catch (error) {
            console.error('Optimized Word export failed:', error);
            throw error;
        } finally {
            this.isExporting = false;
            
            // Optimize memory after export
            if (this.options.enableMemoryOptimization) {
                setTimeout(() => {
                    this.performanceManager.optimizeMemory();
                }, 1000);
            }
        }
    }

    /**
     * Process content with performance optimizations
     * @param {HTMLElement|string} content - Content to process
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Processed content
     */
    async processContentWithOptimizations(content, options) {
        // Prepare content element
        const element = await this.prepareContentElement(content, options);
        
        // Use chunked processing for large documents
        if (options.enableChunkedProcessing) {
            return await this.performanceManager.processInChunks(
                element,
                (chunk, chunkOptions) => this.processContentChunk(chunk, chunkOptions),
                {
                    chunkSize: options.chunkSize,
                    onProgress: options.onProgress,
                    combiner: (results) => this.combineProcessedChunks(results)
                }
            );
        } else {
            return await this.processContentChunk(element, options);
        }
    }

    /**
     * Prepare content element for processing
     * @param {HTMLElement|string} content - Content
     * @param {Object} options - Options
     * @returns {Promise<HTMLElement>} Prepared element
     */
    async prepareContentElement(content, options) {
        let element;
        
        if (typeof content === 'string') {
            element = document.createElement('div');
            element.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            element = content.cloneNode(true);
        } else {
            throw new Error('Invalid content type for Word export');
        }

        // Clean up content for Word export
        await this.cleanContentForWord(element, options);
        
        return element;
    }

    /**
     * Process a chunk of content
     * @param {Array|HTMLElement} chunk - Content chunk
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Processed chunk
     */
    async processContentChunk(chunk, options) {
        const elements = Array.isArray(chunk) ? chunk : this.getChildElements(chunk);
        const processedElements = [];
        
        for (const element of elements) {
            // Process individual element
            const processed = await this.processElementForWord(element, options);
            if (processed) {
                processedElements.push(processed);
            }
            
            // Yield control periodically
            if (processedElements.length % 25 === 0) {
                await this.performanceManager.delay(1);
            }
        }
        
        return {
            elements: processedElements,
            chunkIndex: options.chunkIndex || 0,
            isChunked: options.isChunked || false
        };
    }

    /**
     * Get child elements for processing
     * @param {HTMLElement} element - Parent element
     * @returns {Array} Array of child elements
     */
    getChildElements(element) {
        const children = [];
        
        // Process direct children and text nodes
        for (const child of element.childNodes) {
            if (child.nodeType === Node.ELEMENT_NODE) {
                children.push(child);
            } else if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
                // Create wrapper for text nodes
                const wrapper = document.createElement('p');
                wrapper.textContent = child.textContent;
                children.push(wrapper);
            }
        }
        
        return children;
    }

    /**
     * Process individual element for Word
     * @param {HTMLElement} element - Element to process
     * @param {Object} options - Processing options
     * @returns {Promise<Object|null>} Processed element data
     */
    async processElementForWord(element, options) {
        const tagName = element.tagName.toLowerCase();
        
        // Skip empty elements
        if (!element.textContent.trim() && !['img', 'hr', 'br'].includes(tagName)) {
            return null;
        }
        
        const elementData = {
            type: this.getWordElementType(tagName),
            tagName: tagName,
            content: element.textContent || '',
            styles: this.extractWordCompatibleStyles(element),
            attributes: this.extractRelevantAttributes(element)
        };
        
        // Special processing for different element types
        switch (tagName) {
            case 'img':
                elementData.imageData = await this.processImageForWord(element);
                break;
            case 'table':
                elementData.tableData = await this.processTableForWord(element);
                break;
            case 'ul':
            case 'ol':
                elementData.listData = await this.processListForWord(element);
                break;
            case 'blockquote':
                elementData.quoteData = this.processQuoteForWord(element);
                break;
            default:
                elementData.textRuns = this.extractTextRuns(element);
                break;
        }
        
        return elementData;
    }

    /**
     * Get Word element type from HTML tag
     * @param {string} tagName - HTML tag name
     * @returns {string} Word element type
     */
    getWordElementType(tagName) {
        const typeMap = {
            'h1': 'heading1',
            'h2': 'heading2',
            'h3': 'heading3',
            'h4': 'heading4',
            'h5': 'heading5',
            'h6': 'heading6',
            'p': 'paragraph',
            'div': 'paragraph',
            'span': 'paragraph',
            'ul': 'list',
            'ol': 'numberedList',
            'li': 'listItem',
            'table': 'table',
            'img': 'image',
            'blockquote': 'quote',
            'pre': 'code',
            'code': 'code',
            'hr': 'horizontalRule',
            'br': 'lineBreak'
        };
        
        return typeMap[tagName] || 'paragraph';
    }

    /**
     * Extract Word-compatible styles
     * @param {HTMLElement} element - Element
     * @returns {Object} Word-compatible styles
     */
    extractWordCompatibleStyles(element) {
        const computedStyle = window.getComputedStyle(element);
        
        return {
            fontSize: this.convertFontSize(computedStyle.fontSize),
            fontFamily: computedStyle.fontFamily.replace(/['"]/g, ''),
            bold: computedStyle.fontWeight === 'bold' || parseInt(computedStyle.fontWeight) >= 600,
            italic: computedStyle.fontStyle === 'italic',
            underline: computedStyle.textDecoration.includes('underline'),
            color: this.convertColor(computedStyle.color),
            backgroundColor: this.convertColor(computedStyle.backgroundColor),
            textAlign: computedStyle.textAlign
        };
    }

    /**
     * Convert font size to Word format
     * @param {string} fontSize - CSS font size
     * @returns {number} Font size in half-points
     */
    convertFontSize(fontSize) {
        const pxSize = parseFloat(fontSize);
        return Math.round(pxSize * 1.5); // Convert px to half-points (approximate)
    }

    /**
     * Convert color to Word format
     * @param {string} color - CSS color
     * @returns {string} Hex color
     */
    convertColor(color) {
        if (color.startsWith('#')) {
            return color.substring(1);
        }
        
        if (color.startsWith('rgb')) {
            // Convert rgb to hex
            const matches = color.match(/\d+/g);
            if (matches && matches.length >= 3) {
                const r = parseInt(matches[0]).toString(16).padStart(2, '0');
                const g = parseInt(matches[1]).toString(16).padStart(2, '0');
                const b = parseInt(matches[2]).toString(16).padStart(2, '0');
                return `${r}${g}${b}`;
            }
        }
        
        return '000000'; // Default to black
    }

    /**
     * Extract relevant attributes
     * @param {HTMLElement} element - Element
     * @returns {Object} Relevant attributes
     */
    extractRelevantAttributes(element) {
        const attributes = {};
        
        // Extract specific attributes that matter for Word export
        const relevantAttrs = ['src', 'alt', 'width', 'height', 'colspan', 'rowspan'];
        
        for (const attr of relevantAttrs) {
            if (element.hasAttribute(attr)) {
                attributes[attr] = element.getAttribute(attr);
            }
        }
        
        return attributes;
    }

    /**
     * Process image for Word
     * @param {HTMLElement} img - Image element
     * @returns {Promise<Object|null>} Image data
     */
    async processImageForWord(img) {
        try {
            // Get image data
            const src = img.getAttribute('src');
            const alt = img.getAttribute('alt') || '';
            const width = parseInt(img.getAttribute('width')) || img.naturalWidth || 300;
            const height = parseInt(img.getAttribute('height')) || img.naturalHeight || 200;
            
            // Convert to base64 if needed
            let base64Data = null;
            if (src && src.startsWith('data:')) {
                base64Data = src.split(',')[1];
            } else if (src) {
                base64Data = await this.convertImageToBase64(src);
            }
            
            return {
                src: src,
                alt: alt,
                width: width,
                height: height,
                base64: base64Data
            };
            
        } catch (error) {
            console.warn('Failed to process image for Word:', error);
            return null;
        }
    }

    /**
     * Process table for Word
     * @param {HTMLElement} table - Table element
     * @returns {Promise<Object>} Table data
     */
    async processTableForWord(table) {
        const rows = [];
        const tableRows = table.querySelectorAll('tr');
        
        for (const row of tableRows) {
            const cells = [];
            const tableCells = row.querySelectorAll('td, th');
            
            for (const cell of tableCells) {
                cells.push({
                    content: cell.textContent || '',
                    isHeader: cell.tagName.toLowerCase() === 'th',
                    colspan: parseInt(cell.getAttribute('colspan')) || 1,
                    rowspan: parseInt(cell.getAttribute('rowspan')) || 1,
                    styles: this.extractWordCompatibleStyles(cell)
                });
            }
            
            rows.push({ cells });
        }
        
        return { rows };
    }

    /**
     * Process list for Word
     * @param {HTMLElement} list - List element
     * @returns {Promise<Object>} List data
     */
    async processListForWord(list) {
        const items = [];
        const listItems = list.querySelectorAll('li');
        
        for (const item of listItems) {
            items.push({
                content: item.textContent || '',
                styles: this.extractWordCompatibleStyles(item)
            });
        }
        
        return {
            isOrdered: list.tagName.toLowerCase() === 'ol',
            items: items
        };
    }

    /**
     * Process quote for Word
     * @param {HTMLElement} quote - Quote element
     * @returns {Object} Quote data
     */
    processQuoteForWord(quote) {
        return {
            content: quote.textContent || '',
            styles: this.extractWordCompatibleStyles(quote)
        };
    }

    /**
     * Extract text runs from element
     * @param {HTMLElement} element - Element
     * @returns {Array} Text runs
     */
    extractTextRuns(element) {
        const runs = [];
        
        for (const node of element.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;
                if (text.trim()) {
                    runs.push({
                        text: text,
                        styles: this.extractWordCompatibleStyles(element)
                    });
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const childRuns = this.extractFormattedTextRuns(node);
                runs.push(...childRuns);
            }
        }
        
        return runs;
    }

    /**
     * Extract formatted text runs
     * @param {HTMLElement} element - Element
     * @returns {Array} Formatted text runs
     */
    extractFormattedTextRuns(element) {
        const text = element.textContent || '';
        if (!text.trim()) return [];
        
        const styles = this.extractWordCompatibleStyles(element);
        
        return [{
            text: text,
            styles: styles
        }];
    }

    /**
     * Convert image URL to base64
     * @param {string} imageUrl - Image URL
     * @returns {Promise<string|null>} Base64 string or null
     */
    async convertImageToBase64(imageUrl) {
        if (typeof Image === 'undefined' || typeof document === 'undefined') {
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
                    resolve(base64.split(',')[1]);
                } catch (error) {
                    console.warn('Failed to convert image to base64:', error);
                    resolve(null);
                }
            };
            
            img.onerror = () => resolve(null);
            setTimeout(() => resolve(null), 3000); // Shorter timeout for performance
            
            img.src = imageUrl;
        });
    }

    /**
     * Combine processed chunks
     * @param {Array} chunks - Array of processed chunks
     * @returns {Object} Combined result
     */
    combineProcessedChunks(chunks) {
        const allElements = [];
        
        for (const chunk of chunks) {
            if (chunk.elements) {
                allElements.push(...chunk.elements);
            }
        }
        
        return {
            elements: allElements,
            totalChunks: chunks.length,
            isOptimized: true
        };
    }

    /**
     * Generate optimized Word document
     * @param {Object} processedContent - Processed content
     * @param {Object} options - Export options
     * @returns {Promise<void>}
     */
    async generateOptimizedWordDocument(processedContent, options) {
        // Check if docx library is available
        if (!window.docx) {
            throw new Error('docx library not found');
        }
        
        // Convert processed content to Word document structure
        const documentData = await this.convertToWordStructure(processedContent, options);
        
        // Create Word document
        const doc = await this.createWordDocument(documentData, options);
        
        // Generate and download the document
        await this.downloadWordDocument(doc, options);
    }

    /**
     * Convert processed content to Word document structure
     * @param {Object} processedContent - Processed content
     * @param {Object} options - Export options
     * @returns {Promise<Object>} Document structure
     */
    async convertToWordStructure(processedContent, options) {
        const documentElements = [];
        
        // Process elements in chunks to avoid blocking
        const chunkSize = 50;
        const elements = processedContent.elements;
        
        for (let i = 0; i < elements.length; i += chunkSize) {
            const chunk = elements.slice(i, i + chunkSize);
            
            for (const elementData of chunk) {
                const wordElement = await this.createWordElement(elementData, options);
                if (wordElement) {
                    if (Array.isArray(wordElement)) {
                        documentElements.push(...wordElement);
                    } else {
                        documentElements.push(wordElement);
                    }
                }
            }
            
            // Yield control between chunks
            if (i + chunkSize < elements.length) {
                await this.performanceManager.delay(1);
            }
        }
        
        // Create document structure
        const section = {
            properties: this.createSectionProperties(options),
            headers: options.includeHeaders ? this.createHeaders(options) : {},
            footers: options.includeFooters ? this.createFooters(options) : {},
            children: documentElements
        };
        
        return {
            sections: [section],
            styles: this.createWordStyles(options),
            numbering: this.createNumberingStyles()
        };
    }

    /**
     * Create Word element from processed data
     * @param {Object} elementData - Element data
     * @param {Object} options - Export options
     * @returns {Promise<Object|Array|null>} Word element(s)
     */
    async createWordElement(elementData, options) {
        const docx = window.docx;
        
        switch (elementData.type) {
            case 'heading1':
            case 'heading2':
            case 'heading3':
            case 'heading4':
            case 'heading5':
            case 'heading6':
                return this.createHeading(elementData, docx);
                
            case 'paragraph':
                return this.createParagraph(elementData, docx);
                
            case 'list':
            case 'numberedList':
                return this.createList(elementData, docx);
                
            case 'table':
                return this.createTable(elementData, docx);
                
            case 'image':
                return await this.createImage(elementData, docx);
                
            case 'quote':
                return this.createBlockquote(elementData, docx);
                
            case 'code':
                return this.createCodeBlock(elementData, docx);
                
            case 'horizontalRule':
                return this.createHorizontalRule(docx);
                
            case 'lineBreak':
                return this.createLineBreak(docx);
                
            default:
                return this.createParagraph(elementData, docx);
        }
    }

    /**
     * Create Word heading
     * @param {Object} elementData - Element data
     * @param {Object} docx - docx library
     * @returns {Object} Word heading
     */
    createHeading(elementData, docx) {
        const level = parseInt(elementData.tagName.charAt(1));
        
        return new docx.Paragraph({
            text: elementData.content,
            heading: `Heading${level}`,
            spacing: {
                before: level === 1 ? 480 : 240,
                after: 120
            }
        });
    }

    /**
     * Create Word paragraph
     * @param {Object} elementData - Element data
     * @param {Object} docx - docx library
     * @returns {Object} Word paragraph
     */
    createParagraph(elementData, docx) {
        const textRuns = elementData.textRuns || [{
            text: elementData.content,
            styles: elementData.styles
        }];
        
        const children = textRuns.map(run => new docx.TextRun({
            text: run.text,
            font: run.styles.fontFamily || this.options.fontFamily,
            size: run.styles.fontSize || this.options.fontSize,
            bold: run.styles.bold,
            italics: run.styles.italic,
            underline: run.styles.underline ? {} : undefined,
            color: run.styles.color
        }));
        
        return new docx.Paragraph({
            children: children,
            spacing: { after: 120 }
        });
    }

    /**
     * Create Word list
     * @param {Object} elementData - Element data
     * @param {Object} docx - docx library
     * @returns {Array} Word list items
     */
    createList(elementData, docx) {
        if (!elementData.listData) return [];
        
        const isOrdered = elementData.listData.isOrdered;
        const items = [];
        
        for (const item of elementData.listData.items) {
            const listItem = new docx.Paragraph({
                children: [new docx.TextRun({
                    text: item.content,
                    font: item.styles.fontFamily || this.options.fontFamily,
                    size: item.styles.fontSize || this.options.fontSize
                })],
                bullet: isOrdered ? undefined : { level: 0 },
                numbering: isOrdered ? { reference: 'default-numbering', level: 0 } : undefined,
                spacing: { after: 60 }
            });
            
            items.push(listItem);
        }
        
        return items;
    }

    /**
     * Create Word table
     * @param {Object} elementData - Element data
     * @param {Object} docx - docx library
     * @returns {Object} Word table
     */
    createTable(elementData, docx) {
        if (!elementData.tableData) return null;
        
        const rows = elementData.tableData.rows.map(rowData => {
            const cells = rowData.cells.map(cellData => {
                return new docx.TableCell({
                    children: [new docx.Paragraph({
                        children: [new docx.TextRun({
                            text: cellData.content,
                            font: cellData.styles.fontFamily || this.options.fontFamily,
                            size: cellData.styles.fontSize || this.options.fontSize
                        })]
                    })],
                    shading: cellData.isHeader ? {
                        type: docx.ShadingType.SOLID,
                        color: 'E5E5E5'
                    } : undefined
                });
            });
            
            return new docx.TableRow({ children: cells });
        });
        
        return new docx.Table({
            rows: rows,
            width: { size: 100, type: docx.WidthType.PERCENTAGE }
        });
    }

    /**
     * Create Word image
     * @param {Object} elementData - Element data
     * @param {Object} docx - docx library
     * @returns {Promise<Object|null>} Word image
     */
    async createImage(elementData, docx) {
        if (!elementData.imageData || !elementData.imageData.base64) {
            return null;
        }
        
        try {
            const imageRun = new docx.ImageRun({
                data: elementData.imageData.base64,
                transformation: {
                    width: Math.min(elementData.imageData.width * 9525, 6 * 914400),
                    height: Math.min(elementData.imageData.height * 9525, 4 * 914400)
                }
            });
            
            return new docx.Paragraph({
                children: [imageRun],
                spacing: { before: 120, after: 120 }
            });
            
        } catch (error) {
            console.warn('Failed to create Word image:', error);
            return null;
        }
    }

    /**
     * Create Word blockquote
     * @param {Object} elementData - Element data
     * @param {Object} docx - docx library
     * @returns {Object} Word paragraph with quote styling
     */
    createBlockquote(elementData, docx) {
        return new docx.Paragraph({
            children: [new docx.TextRun({
                text: elementData.content,
                font: this.options.fontFamily,
                size: this.options.fontSize
            })],
            indent: { left: 720 },
            spacing: { before: 120, after: 120 },
            shading: { type: docx.ShadingType.SOLID, color: 'F8F8F8' }
        });
    }

    /**
     * Create Word code block
     * @param {Object} elementData - Element data
     * @param {Object} docx - docx library
     * @returns {Object} Word paragraph with code styling
     */
    createCodeBlock(elementData, docx) {
        return new docx.Paragraph({
            children: [new docx.TextRun({
                text: elementData.content,
                font: 'Courier New',
                size: 20
            })],
            spacing: { before: 120, after: 120 },
            shading: { type: docx.ShadingType.SOLID, color: 'F5F5F5' }
        });
    }

    /**
     * Create horizontal rule
     * @param {Object} docx - docx library
     * @returns {Object} Word paragraph with border
     */
    createHorizontalRule(docx) {
        return new docx.Paragraph({
            children: [new docx.TextRun({ text: '' })],
            border: {
                bottom: {
                    style: docx.BorderStyle.SINGLE,
                    size: 6,
                    color: 'CCCCCC'
                }
            },
            spacing: { before: 120, after: 120 }
        });
    }

    /**
     * Create line break
     * @param {Object} docx - docx library
     * @returns {Object} Word paragraph with line break
     */
    createLineBreak(docx) {
        return new docx.Paragraph({
            children: [new docx.TextRun({ text: '', break: 1 })]
        });
    }

    // Include necessary methods from original WordExportManager
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
                        spacing: { line: options.lineSpacing || 240 }
                    }
                }
            ]
        };
    }

    createNumberingStyles() {
        const docx = window.docx;
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

    createSectionProperties(options) {
        const docx = window.docx;
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

    createHeaders(options) {
        const docx = window.docx;
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

    createFooters(options) {
        const docx = window.docx;
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

    async createWordDocument(documentData, options) {
        const docx = window.docx;
        const docOptions = {
            sections: documentData.sections,
            styles: documentData.styles,
            numbering: documentData.numbering
        };
        
        if (options.title) {
            docOptions.title = options.title;
        }
        
        if (options.author) {
            docOptions.creator = options.author;
        }
        
        docOptions.description = 'Generated by Optimized Word Export Manager';
        
        return new docx.Document(docOptions);
    }

    async downloadWordDocument(doc, options) {
        const docx = window.docx;
        
        try {
            const buffer = await docx.Packer.toBuffer(doc);
            const filename = this.generateFilename(options);
            
            if (typeof Blob !== 'undefined' && typeof document !== 'undefined') {
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
                
                console.log('Optimized Word document downloaded successfully:', filename);
            }
            
        } catch (error) {
            console.error('Failed to download Word document:', error);
            throw error;
        }
    }

    async cleanContentForWord(element, options) {
        // Remove interactive elements
        const interactiveElements = element.querySelectorAll('button, input, select, textarea');
        interactiveElements.forEach(el => el.remove());
        
        // Remove event handlers
        const clickableElements = element.querySelectorAll('[onclick], [onmouseover], [onmouseout]');
        clickableElements.forEach(el => {
            el.removeAttribute('onclick');
            el.removeAttribute('onmouseover');
            el.removeAttribute('onmouseout');
        });
        
        // Process images
        await this.processImagesForWord(element);
        
        // Clean CSS classes
        this.cleanCSSForWord(element);
    }

    async processImagesForWord(element) {
        const images = element.querySelectorAll('img');
        const imagePromises = Array.from(images).map(async (img) => {
            try {
                if (!img.src.startsWith('data:')) {
                    const base64 = await this.convertImageToBase64(img.src);
                    if (base64) {
                        img.setAttribute('data-base64', `data:image/png;base64,${base64}`);
                        img.setAttribute('data-original-src', img.src);
                    }
                }
            } catch (error) {
                console.warn('Failed to process image:', img.src, error);
            }
        });
        
        await Promise.all(imagePromises);
    }

    cleanCSSForWord(element) {
        const elementsWithClasses = element.querySelectorAll('[class]');
        elementsWithClasses.forEach(el => {
            const classes = el.className.split(' ').filter(cls => {
                return ['bold', 'italic', 'underline', 'center', 'left', 'right'].includes(cls);
            });
            el.className = classes.join(' ');
        });
    }

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

    generateCacheKey(content, options) {
        const contentHash = this.hashContent(content);
        const optionsHash = this.hashOptions(options);
        return `word_${contentHash}_${optionsHash}`;
    }

    hashContent(content) {
        if (typeof content === 'string') {
            return this.simpleHash(content);
        }
        
        if (content instanceof HTMLElement) {
            return this.simpleHash(content.outerHTML);
        }
        
        return this.simpleHash(JSON.stringify(content));
    }

    hashOptions(options) {
        const relevantOptions = {
            pageSize: options.pageSize,
            orientation: options.orientation,
            margins: options.margins,
            fontSize: options.fontSize,
            fontFamily: options.fontFamily
        };
        
        return this.simpleHash(JSON.stringify(relevantOptions));
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Get performance metrics
     * @returns {Object} Performance metrics
     */
    getPerformanceMetrics() {
        return this.performanceManager ? this.performanceManager.getMetrics() : {};
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.cancelExport();
        this.exportQueue = [];
        this.isExporting = false;
        this.documentSections = [];
        this.currentSection = null;
        
        if (this.performanceManager) {
            this.performanceManager.cleanup();
        }
        
        console.log('OptimizedWordExportManager destroyed and cleaned up');
    }

    cancelExport() {
        if (this.isExporting) {
            this.isExporting = false;
            console.log('Word export cancelled');
        }
    }
}

// Export for use in different module systems
// Export for both CommonJS and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OptimizedWordExportManager;
} else if (typeof window !== 'undefined') {
    window.OptimizedWordExportManager = OptimizedWordExportManager;
}