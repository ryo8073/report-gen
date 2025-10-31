/**
 * Optimized PDF Export Manager
 * Enhanced version with performance optimizations
 * Task 14: Add performance optimizations
 * Requirements: Performance and scalability
 */

class OptimizedPDFExportManager {
    constructor(options = {}) {
        this.options = {
            defaultFilename: 'business-document',
            styleOptimization: true,
            includeHeaders: true,
            includeFooters: true,
            pageSize: 'A4',
            orientation: 'portrait',
            margins: {
                top: 20,
                right: 20,
                bottom: 20,
                left: 20
            },
            quality: 1.0,
            useCORS: true,
            allowTaint: false,
            scale: 2,
            dpi: 300,
            compress: true,
            // Performance optimization options
            enableLazyLoading: true,
            enableCaching: true,
            enableChunkedProcessing: true,
            enableMemoryOptimization: true,
            chunkSize: 500, // Smaller chunks for PDF processing
            ...options
        };
        
        this.isExporting = false;
        this.exportQueue = [];
        this.pageBreaks = [];
        this.currentPage = 1;
        
        // Performance optimization manager
        this.performanceManager = null;
        this.initializePerformanceManager();
        
        // PDF dimensions in mm for different page sizes
        this.pageDimensions = {
            'A4': { width: 210, height: 297 },
            'Letter': { width: 216, height: 279 },
            'Legal': { width: 216, height: 356 }
        };
        
        console.log('OptimizedPDFExportManager initialized');
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
            
            // Preload PDF libraries if lazy loading is enabled
            if (this.options.enableLazyLoading) {
                this.performanceManager.preloadLibraries('pdf');
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
     * Export content to PDF with performance optimizations
     * @param {HTMLElement|string} content - Content to export
     * @param {Object} options - Export options
     * @returns {Promise<boolean>} Success status
     */
    async exportToPDF(content, options = {}) {
        if (this.isExporting) {
            console.warn('PDF export already in progress');
            return false;
        }

        const exportStartTime = performance.now();
        
        try {
            this.isExporting = true;
            
            // Merge options
            const exportOptions = { ...this.options, ...options };
            
            // Lazy load PDF libraries if needed
            if (exportOptions.enableLazyLoading) {
                const librariesLoaded = await this.performanceManager.lazyLoadLibraries('pdf');
                if (!librariesLoaded) {
                    throw new Error('Failed to load required PDF libraries');
                }
            }
            
            // Check cache for previously processed content
            const cacheKey = this.generateCacheKey(content, exportOptions);
            let processedContent = null;
            
            if (exportOptions.enableCaching) {
                processedContent = this.performanceManager.getCachedContent(cacheKey);
                if (processedContent) {
                    console.log('Using cached processed content');
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
            
            // Generate PDF
            await this.generateOptimizedPDF(processedContent, exportOptions);
            
            const exportTime = performance.now() - exportStartTime;
            console.log(`Optimized PDF export completed in ${Math.round(exportTime)}ms`);
            
            return true;
            
        } catch (error) {
            console.error('Optimized PDF export failed:', error);
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
            throw new Error('Invalid content type for PDF export');
        }

        // Apply business document styling if needed
        if (options.businessFormatting !== false) {
            this.applyBusinessDocumentStyling(element);
        }

        // Optimize element for PDF generation
        await this.optimizeElementForPDF(element, options);
        
        return element;
    }

    /**
     * Process a chunk of content
     * @param {Array|HTMLElement} chunk - Content chunk
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Processed chunk
     */
    async processContentChunk(chunk, options) {
        const elements = Array.isArray(chunk) ? chunk : [chunk];
        const processedElements = [];
        
        for (const element of elements) {
            // Process individual element
            const processed = await this.processElement(element, options);
            processedElements.push(processed);
            
            // Yield control periodically
            if (processedElements.length % 50 === 0) {
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
     * Process individual element
     * @param {HTMLElement} element - Element to process
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Processed element data
     */
    async processElement(element, options) {
        return {
            tagName: element.tagName,
            content: element.textContent,
            styles: this.extractElementStyles(element),
            attributes: this.extractElementAttributes(element),
            children: Array.from(element.children).map(child => ({
                tagName: child.tagName,
                content: child.textContent
            }))
        };
    }

    /**
     * Extract element styles
     * @param {HTMLElement} element - Element
     * @returns {Object} Extracted styles
     */
    extractElementStyles(element) {
        const computedStyle = window.getComputedStyle(element);
        return {
            fontSize: computedStyle.fontSize,
            fontFamily: computedStyle.fontFamily,
            fontWeight: computedStyle.fontWeight,
            color: computedStyle.color,
            backgroundColor: computedStyle.backgroundColor,
            margin: computedStyle.margin,
            padding: computedStyle.padding
        };
    }

    /**
     * Extract element attributes
     * @param {HTMLElement} element - Element
     * @returns {Object} Extracted attributes
     */
    extractElementAttributes(element) {
        const attributes = {};
        for (const attr of element.attributes) {
            attributes[attr.name] = attr.value;
        }
        return attributes;
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
     * Generate optimized PDF
     * @param {Object} processedContent - Processed content
     * @param {Object} options - Export options
     * @returns {Promise<void>}
     */
    async generateOptimizedPDF(processedContent, options) {
        // Initialize PDF with current options
        this.initializePDF();
        
        // Process content in memory-efficient way
        await this.convertProcessedContentToPDF(processedContent, options);
        
        // Save the PDF file
        const filename = this.generateFilename(options);
        this.pdf.save(filename);
    }

    /**
     * Convert processed content to PDF
     * @param {Object} processedContent - Processed content
     * @param {Object} options - Export options
     * @returns {Promise<void>}
     */
    async convertProcessedContentToPDF(processedContent, options) {
        // Create temporary element for rendering
        const renderElement = this.createRenderElement(processedContent);
        
        try {
            // Add element to document temporarily for rendering
            renderElement.style.position = 'absolute';
            renderElement.style.left = '-9999px';
            renderElement.style.top = '0';
            renderElement.style.width = `${this.getContentDimensions().width * 3.78}px`;
            document.body.appendChild(renderElement);
            
            // Configure html2canvas options for performance
            const canvasOptions = {
                scale: options.scale || 1.5, // Reduced scale for performance
                useCORS: options.useCORS !== false,
                allowTaint: options.allowTaint || false,
                backgroundColor: '#ffffff',
                logging: false,
                width: renderElement.scrollWidth,
                height: renderElement.scrollHeight,
                // Performance optimizations
                removeContainer: true,
                async: true,
                foreignObjectRendering: false
            };

            // Generate canvas with memory monitoring
            const canvas = await this.generateCanvasWithMonitoring(renderElement, canvasOptions);
            
            // Calculate PDF dimensions
            const contentDims = this.getContentDimensions();
            const imgWidth = contentDims.width;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            // Add content to PDF with chunked processing
            await this.addContentToPagesOptimized(canvas, imgWidth, imgHeight, contentDims, options);
            
        } finally {
            // Clean up temporary element
            if (renderElement.parentNode) {
                renderElement.parentNode.removeChild(renderElement);
            }
        }
    }

    /**
     * Create render element from processed content
     * @param {Object} processedContent - Processed content
     * @returns {HTMLElement} Render element
     */
    createRenderElement(processedContent) {
        const element = document.createElement('div');
        element.className = 'business-document optimized-render';
        
        // Reconstruct content from processed data
        for (const elementData of processedContent.elements) {
            const childElement = document.createElement(elementData.tagName || 'div');
            childElement.textContent = elementData.content || '';
            
            // Apply styles
            if (elementData.styles) {
                Object.assign(childElement.style, elementData.styles);
            }
            
            // Apply attributes
            if (elementData.attributes) {
                for (const [name, value] of Object.entries(elementData.attributes)) {
                    if (name !== 'style') {
                        childElement.setAttribute(name, value);
                    }
                }
            }
            
            element.appendChild(childElement);
        }
        
        return element;
    }

    /**
     * Generate canvas with memory monitoring
     * @param {HTMLElement} element - Element to render
     * @param {Object} options - Canvas options
     * @returns {Promise<HTMLCanvasElement>} Generated canvas
     */
    async generateCanvasWithMonitoring(element, options) {
        const startMemory = this.getCurrentMemoryUsage();
        
        try {
            const canvas = await html2canvas(element, options);
            
            const endMemory = this.getCurrentMemoryUsage();
            const memoryUsed = endMemory - startMemory;
            
            console.log(`Canvas generation used ${this.formatBytes(memoryUsed)} memory`);
            
            return canvas;
            
        } catch (error) {
            console.error('Canvas generation failed:', error);
            throw error;
        }
    }

    /**
     * Add content to PDF pages with optimization
     * @param {HTMLCanvasElement} canvas - Canvas containing content
     * @param {number} imgWidth - Image width in PDF
     * @param {number} imgHeight - Image height in PDF
     * @param {Object} contentDims - Content dimensions
     * @param {Object} options - Export options
     * @returns {Promise<void>}
     */
    async addContentToPagesOptimized(canvas, imgWidth, imgHeight, contentDims, options) {
        const pageHeight = contentDims.height;
        let position = 0;
        let pageNumber = 1;
        
        // Convert canvas to image data with compression
        const imgData = canvas.toDataURL('image/jpeg', 0.8); // Use JPEG with compression
        
        while (position < imgHeight) {
            // Add new page if not the first page
            if (pageNumber > 1) {
                this.pdf.addPage();
            }
            
            // Calculate remaining height for this page
            const remainingHeight = Math.min(pageHeight, imgHeight - position);
            
            // Add image to current page
            this.pdf.addImage(
                imgData,
                'JPEG',
                contentDims.x,
                contentDims.y,
                imgWidth,
                remainingHeight,
                undefined,
                'FAST',
                0,
                -position
            );
            
            // Add headers and footers for this page
            if (options.includeHeaders || options.includeFooters) {
                await this.addPageHeadersFooters(pageNumber, options);
            }
            
            position += pageHeight;
            pageNumber++;
            
            // Memory optimization between pages
            if (pageNumber % 5 === 0) {
                await this.performanceManager.optimizeMemory();
            }
        }
    }

    /**
     * Get current memory usage
     * @returns {number} Current memory usage in bytes
     */
    getCurrentMemoryUsage() {
        if (typeof performance !== 'undefined' && performance.memory) {
            return performance.memory.usedJSHeapSize;
        }
        return 0;
    }

    /**
     * Format bytes to human readable format
     * @param {number} bytes - Bytes
     * @returns {string} Formatted string
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Generate cache key for content
     * @param {any} content - Content
     * @param {Object} options - Options
     * @returns {string} Cache key
     */
    generateCacheKey(content, options) {
        const contentHash = this.hashContent(content);
        const optionsHash = this.hashOptions(options);
        return `pdf_${contentHash}_${optionsHash}`;
    }

    /**
     * Hash content for cache key
     * @param {any} content - Content
     * @returns {string} Content hash
     */
    hashContent(content) {
        if (typeof content === 'string') {
            return this.simpleHash(content);
        }
        
        if (content instanceof HTMLElement) {
            return this.simpleHash(content.outerHTML);
        }
        
        return this.simpleHash(JSON.stringify(content));
    }

    /**
     * Hash options for cache key
     * @param {Object} options - Options
     * @returns {string} Options hash
     */
    hashOptions(options) {
        const relevantOptions = {
            pageSize: options.pageSize,
            orientation: options.orientation,
            margins: options.margins,
            scale: options.scale,
            quality: options.quality
        };
        
        return this.simpleHash(JSON.stringify(relevantOptions));
    }

    /**
     * Simple hash function
     * @param {string} str - String to hash
     * @returns {string} Hash
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    // Include necessary methods from original PDFExportManager
    initializePDF() {
        const pageSize = this.options.pageSize || 'A4';
        const orientation = this.options.orientation || 'portrait';
        
        // Check if jsPDF is available
        const jsPDF = window.jspdf?.jsPDF || window.jsPDF;
        if (!jsPDF) {
            throw new Error('jsPDF library not found');
        }
        
        this.pdf = new jsPDF({
            orientation: orientation,
            unit: 'mm',
            format: pageSize,
            compress: this.options.compress
        });
        
        this.pdf.setProperties({
            title: this.options.title || 'Business Document',
            subject: 'Generated Business Document',
            author: this.options.author || 'Document Generator',
            creator: 'Optimized PDF Export Manager',
            producer: 'jsPDF'
        });
    }

    getPageDimensions() {
        const pageSize = this.options.pageSize || 'A4';
        return this.pageDimensions[pageSize] || this.pageDimensions['A4'];
    }

    getContentDimensions() {
        const pageDims = this.getPageDimensions();
        const margins = this.options.margins;
        
        return {
            width: pageDims.width - margins.left - margins.right,
            height: pageDims.height - margins.top - margins.bottom,
            x: margins.left,
            y: margins.top
        };
    }

    applyBusinessDocumentStyling(element) {
        if (!element.classList.contains('business-document')) {
            element.classList.add('business-document');
        }
        
        element.style.fontFamily = 'Arial, sans-serif';
        element.style.fontSize = '12pt';
        element.style.lineHeight = '1.5';
        element.style.color = '#000000';
        element.style.backgroundColor = '#ffffff';
        element.style.padding = '0';
        element.style.margin = '0';
    }

    async optimizeElementForPDF(element, options) {
        // Remove interactive elements
        const interactiveElements = element.querySelectorAll('button, input, select, textarea');
        interactiveElements.forEach(el => el.remove());
        
        // Remove onclick attributes
        const clickableElements = element.querySelectorAll('[onclick]');
        clickableElements.forEach(el => el.removeAttribute('onclick'));
        
        // Optimize images
        await this.optimizeImagesForPDF(element);
    }

    async optimizeImagesForPDF(element) {
        const images = element.querySelectorAll('img');
        const imagePromises = Array.from(images).map(img => {
            return new Promise((resolve) => {
                if (img.complete) {
                    resolve();
                } else {
                    img.onload = resolve;
                    img.onerror = resolve;
                    setTimeout(resolve, 3000); // Shorter timeout for performance
                }
            });
        });
        
        await Promise.all(imagePromises);
    }

    async addPageHeadersFooters(pageNumber, options) {
        const pageDims = this.getPageDimensions();
        const margins = options.margins;
        
        if (options.includeHeaders) {
            await this.addPageHeader(pageNumber, options, pageDims, margins);
        }
        
        if (options.includeFooters) {
            await this.addPageFooter(pageNumber, options, pageDims, margins);
        }
    }

    async addPageHeader(pageNumber, options, pageDims, margins) {
        let headerText = '';
        if (options.headerFooterData && options.headerFooterData.header) {
            headerText = options.headerFooterData.header;
        } else if (options.header) {
            headerText = options.header;
        } else if (options.title) {
            headerText = options.title;
        }
        
        if (headerText) {
            this.pdf.setFontSize(10);
            this.pdf.setTextColor(100);
            this.pdf.text(headerText, margins.left, margins.top - 5);
        }
        
        this.pdf.setDrawColor(200);
        this.pdf.line(margins.left, margins.top - 2, pageDims.width - margins.right, margins.top - 2);
    }

    async addPageFooter(pageNumber, options, pageDims, margins) {
        const footerY = pageDims.height - margins.bottom + 10;
        
        this.pdf.setDrawColor(200);
        this.pdf.line(margins.left, footerY - 5, pageDims.width - margins.right, footerY - 5);
        
        let footerText = '';
        if (options.headerFooterData && options.headerFooterData.footer) {
            footerText = options.headerFooterData.footer;
        } else if (options.footer) {
            footerText = options.footer;
        }
        
        if (footerText) {
            this.pdf.setFontSize(9);
            this.pdf.setTextColor(100);
            this.pdf.text(footerText, margins.left, footerY);
        }
        
        if (options.showPageNumbers !== false) {
            const pageText = `Page ${pageNumber}`;
            this.pdf.setFontSize(9);
            this.pdf.setTextColor(100);
            const textWidth = this.pdf.getTextWidth(pageText);
            this.pdf.text(pageText, pageDims.width - margins.right - textWidth, footerY);
        }
    }

    generateFilename(options) {
        let filename = options.filename || options.defaultFilename || 'business-document';
        
        if (options.includeTimestamp !== false) {
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
            filename += `_${timestamp}`;
        }
        
        if (!filename.toLowerCase().endsWith('.pdf')) {
            filename += '.pdf';
        }
        
        return filename;
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
        this.pageBreaks = [];
        this.currentPage = 1;
        this.isExporting = false;
        
        if (this.pdf) {
            this.pdf = null;
        }
        
        if (this.performanceManager) {
            this.performanceManager.cleanup();
        }
        
        console.log('OptimizedPDFExportManager destroyed and cleaned up');
    }

    cancelExport() {
        if (this.isExporting) {
            this.isExporting = false;
            console.log('PDF export cancelled');
        }
    }
}

// Export for use in different module systems
if (typeof window !== 'undefined') {
    window.OptimizedPDFExportManager = OptimizedPDFExportManager;
}

// Export for both CommonJS and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OptimizedPDFExportManager;
} else if (typeof window !== 'undefined') {
    window.OptimizedPDFExportManager = OptimizedPDFExportManager;
}