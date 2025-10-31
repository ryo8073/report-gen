/**
 * Advanced PDF Export Manager
 * Handles PDF export functionality using dedicated PDF generation library (jsPDF)
 * Implements requirements 3.1, 3.2, 3.3, 3.4 for document export functionality
 * Replaces basic print-to-PDF with advanced PDF generation engine
 */

// jsPDF and html2canvas are loaded via CDN in the HTML file
// Access them from the global window object
const jsPDF = window.jspdf?.jsPDF || window.jsPDF;
const html2canvas = window.html2canvas;

class PDFExportManager {
    constructor(options = {}) {
        // Check if required libraries are available
        if (!jsPDF) {
            throw new Error('jsPDF library not found. Please ensure it is loaded before PDFExportManager.');
        }
        if (!html2canvas) {
            throw new Error('html2canvas library not found. Please ensure it is loaded before PDFExportManager.');
        }
        
        this.options = {
            defaultFilename: 'business-document',
            styleOptimization: true,
            includeHeaders: true,
            includeFooters: true,
            pageSize: 'A4', // 'A4', 'Letter', 'Legal'
            orientation: 'portrait', // 'portrait', 'landscape'
            margins: {
                top: 20,
                right: 20,
                bottom: 20,
                left: 20
            },
            quality: 1.0, // Canvas quality for image rendering
            useCORS: true, // Enable CORS for external images
            allowTaint: false, // Prevent tainted canvas
            scale: 2, // Higher scale for better quality
            dpi: 300, // DPI for high-quality output
            compress: true, // Enable PDF compression
            ...options
        };
        
        this.isExporting = false;
        this.exportQueue = [];
        this.pageBreaks = [];
        this.currentPage = 1;
        
        // PDF dimensions in mm for different page sizes
        this.pageDimensions = {
            'A4': { width: 210, height: 297 },
            'Letter': { width: 216, height: 279 },
            'Legal': { width: 216, height: 356 }
        };
        
        // Initialize jsPDF instance
        this.initializePDF();
    }

    /**
     * Initialize jsPDF instance with current options
     */
    initializePDF() {
        const pageSize = this.options.pageSize || 'A4';
        const orientation = this.options.orientation || 'portrait';
        
        this.pdf = new jsPDF({
            orientation: orientation,
            unit: 'mm',
            format: pageSize,
            compress: this.options.compress
        });
        
        // Set PDF metadata
        this.pdf.setProperties({
            title: this.options.title || 'Business Document',
            subject: 'Generated Business Document',
            author: this.options.author || 'Document Generator',
            creator: 'Advanced PDF Export Manager',
            producer: 'jsPDF'
        });
    }

    /**
     * Get page dimensions for current page size
     * @returns {Object} Page dimensions in mm
     */
    getPageDimensions() {
        const pageSize = this.options.pageSize || 'A4';
        return this.pageDimensions[pageSize] || this.pageDimensions['A4'];
    }

    /**
     * Calculate content area dimensions considering margins
     * @returns {Object} Content area dimensions
     */
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

    /**
     * Export content to PDF using advanced PDF generation
     * @param {HTMLElement|string} content - Content to export (element or HTML string)
     * @param {Object} options - Export options
     * @returns {Promise<boolean>} Success status
     */
    async exportToPDF(content, options = {}) {
        if (this.isExporting) {
            console.warn('PDF export already in progress');
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
            format: 'pdf',
            content: content,
            options: options,
            ...options
        };

        const retryFunction = async (retryContext) => {
            return await this.performPDFExport(retryContext.content, retryContext);
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
                console.warn('PDF Export warnings:', validationResult.warnings);
                if (window.enhancedErrorHandler) {
                    window.enhancedErrorHandler.showNotification(
                        `Export proceeding with ${validationResult.warnings.length} warning(s). Check console for details.`,
                        'warning',
                        3000
                    );
                }
            }
            
            // Perform the actual export
            const result = await this.performPDFExport(content, { ...this.options, ...options });
            return result;
            
        } catch (error) {
            console.error('PDF export failed:', error);
            
            // Handle error with retry and fallback mechanisms
            const errorResult = await this.errorHandler.handleExportError(error, exportContext, retryFunction);
            
            if (errorResult.success) {
                return true;
            }
            
            // If all recovery attempts failed, show final error
            this.showErrorMessage(`PDF export failed: ${error.message}`);
            return false;
            
        } finally {
            this.isExporting = false;
        }
    }

    /**
     * Perform the actual PDF export (separated for retry mechanism)
     * @param {HTMLElement|string} content - Content to export
     * @param {Object} exportOptions - Export options
     * @returns {Promise<boolean>} Success status
     */
    async performPDFExport(content, exportOptions) {
        // Initialize PDF with current options
        this.initializePDF();
        
        // Prepare content for export
        const exportElement = await this.prepareContentForExport(content, exportOptions);
        
        // Add headers and footers if enabled
        if (exportOptions.includeHeaders || exportOptions.includeFooters) {
            await this.addHeadersAndFooters(exportOptions);
        }
        
        // Convert content to PDF with proper page handling
        await this.convertContentToPDF(exportElement, exportOptions);
        
        // Save the PDF file
        const filename = this.generateFilename(exportOptions);
        this.pdf.save(filename);
        
        return true;
    }

    /**
     * Prepare content for PDF export
     * @param {HTMLElement|string} content - Content to prepare
     * @param {Object} options - Export options
     * @returns {Promise<HTMLElement>} Prepared HTML element
     */
    async prepareContentForExport(content, options) {
        let element;
        
        if (typeof content === 'string') {
            // Create temporary element from HTML string
            element = document.createElement('div');
            element.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            // Clone the element to avoid modifying original
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
        
        // Add element to document temporarily for rendering
        element.style.position = 'absolute';
        element.style.left = '-9999px';
        element.style.top = '0';
        element.style.width = `${this.getContentDimensions().width * 3.78}px`; // Convert mm to px
        document.body.appendChild(element);
        
        return element;
    }

    /**
     * Apply business document styling to element
     * @param {HTMLElement} element - HTML element
     */
    applyBusinessDocumentStyling(element) {
        // Add business document class if not present
        if (!element.classList.contains('business-document')) {
            element.classList.add('business-document');
        }
        
        // Apply PDF-specific styles
        element.style.fontFamily = 'Arial, sans-serif';
        element.style.fontSize = '12pt';
        element.style.lineHeight = '1.5';
        element.style.color = '#000000';
        element.style.backgroundColor = '#ffffff';
        element.style.padding = '0';
        element.style.margin = '0';
    }

    /**
     * Optimize element for PDF generation
     * @param {HTMLElement} element - HTML element
     * @param {Object} options - Export options
     */
    async optimizeElementForPDF(element, options) {
        // Remove interactive elements that don't make sense in PDF
        const interactiveElements = element.querySelectorAll('button, input, select, textarea');
        interactiveElements.forEach(el => el.remove());
        
        // Remove onclick attributes
        const clickableElements = element.querySelectorAll('[onclick]');
        clickableElements.forEach(el => el.removeAttribute('onclick'));
        
        // Convert relative URLs to absolute for images
        if (options.convertRelativeUrls !== false) {
            const baseUrl = window.location.origin;
            const images = element.querySelectorAll('img[src]');
            images.forEach(img => {
                if (!img.src.startsWith('http') && !img.src.startsWith('data:')) {
                    img.src = `${baseUrl}/${img.src}`;
                }
            });
        }
        
        // Ensure images are loaded
        await this.ensureImagesLoaded(element);
        
        // Add page break markers for better pagination
        this.addPageBreakMarkers(element);
        
        // Apply PDF-specific styling
        this.applyPDFSpecificStyling(element);
    }

    /**
     * Ensure all images in element are loaded
     * @param {HTMLElement} element - Element containing images
     * @returns {Promise<void>}
     */
    async ensureImagesLoaded(element) {
        const images = element.querySelectorAll('img');
        const imagePromises = Array.from(images).map(img => {
            return new Promise((resolve) => {
                if (img.complete) {
                    resolve();
                } else {
                    img.onload = resolve;
                    img.onerror = resolve; // Continue even if image fails to load
                    // Timeout after 5 seconds
                    setTimeout(resolve, 5000);
                }
            });
        });
        
        await Promise.all(imagePromises);
    }

    /**
     * Add page break markers to element
     * @param {HTMLElement} element - HTML element
     */
    addPageBreakMarkers(element) {
        // Add page break before major headings (except the first one)
        const headings = element.querySelectorAll('h1, h2');
        headings.forEach((heading, index) => {
            if (index > 0) {
                const pageBreak = document.createElement('div');
                pageBreak.className = 'pdf-page-break';
                pageBreak.style.pageBreakBefore = 'always';
                pageBreak.style.height = '1px';
                heading.parentNode.insertBefore(pageBreak, heading);
            }
        });
    }

    /**
     * Apply PDF-specific styling to element
     * @param {HTMLElement} element - HTML element
     */
    applyPDFSpecificStyling(element) {
        // Ensure proper styling for PDF generation
        const style = document.createElement('style');
        style.textContent = `
            .pdf-page-break {
                page-break-before: always;
                height: 1px;
                margin: 0;
                padding: 0;
            }
            
            table {
                page-break-inside: avoid;
                border-collapse: collapse;
                width: 100%;
            }
            
            h1, h2, h3, h4, h5, h6 {
                page-break-after: avoid;
                page-break-inside: avoid;
            }
            
            p {
                orphans: 2;
                widows: 2;
            }
            
            img {
                max-width: 100%;
                height: auto;
                page-break-inside: avoid;
            }
            
            pre, blockquote {
                page-break-inside: avoid;
            }
        `;
        
        element.appendChild(style);
    }

    /**
     * Convert content to PDF with proper page handling
     * @param {HTMLElement} element - Element to convert
     * @param {Object} options - Export options
     * @returns {Promise<void>}
     */
    async convertContentToPDF(element, options) {
        try {
            // Configure html2canvas options
            const canvasOptions = {
                scale: options.scale || 2,
                useCORS: options.useCORS !== false,
                allowTaint: options.allowTaint || false,
                backgroundColor: '#ffffff',
                logging: false,
                width: element.scrollWidth,
                height: element.scrollHeight
            };

            // Generate canvas from HTML element
            const canvas = await html2canvas(element, canvasOptions);
            
            // Clean up temporary element
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            
            // Calculate PDF dimensions
            const contentDims = this.getContentDimensions();
            const imgWidth = contentDims.width;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            // Handle multi-page content
            await this.addContentToPages(canvas, imgWidth, imgHeight, contentDims, options);
            
        } catch (error) {
            // Clean up temporary element on error
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            throw error;
        }
    }

    /**
     * Add content to PDF pages with proper page breaks
     * @param {HTMLCanvasElement} canvas - Canvas containing content
     * @param {number} imgWidth - Image width in PDF
     * @param {number} imgHeight - Image height in PDF
     * @param {Object} contentDims - Content dimensions
     * @param {Object} options - Export options
     * @returns {Promise<void>}
     */
    async addContentToPages(canvas, imgWidth, imgHeight, contentDims, options) {
        const pageHeight = contentDims.height;
        let position = 0;
        let pageNumber = 1;
        
        // Convert canvas to image data
        const imgData = canvas.toDataURL('image/png', 1.0);
        
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
                'PNG',
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
        }
    }

    /**
     * Add headers and footers to PDF
     * @param {Object} options - Export options
     * @returns {Promise<void>}
     */
    async addHeadersAndFooters(options) {
        // This method sets up header/footer templates
        // Actual rendering happens per page in addPageHeadersFooters
        this.headerFooterOptions = options;
    }

    /**
     * Add headers and footers to specific page
     * @param {number} pageNumber - Current page number
     * @param {Object} options - Export options
     * @returns {Promise<void>}
     */
    async addPageHeadersFooters(pageNumber, options) {
        const pageDims = this.getPageDimensions();
        const margins = options.margins;
        
        // Add header
        if (options.includeHeaders) {
            await this.addPageHeader(pageNumber, options, pageDims, margins);
        }
        
        // Add footer
        if (options.includeFooters) {
            await this.addPageFooter(pageNumber, options, pageDims, margins);
        }
    }

    /**
     * Add header to current page
     * @param {number} pageNumber - Current page number
     * @param {Object} options - Export options
     * @param {Object} pageDims - Page dimensions
     * @param {Object} margins - Page margins
     */
    async addPageHeader(pageNumber, options, pageDims, margins) {
        // Get header content
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
        
        // Add logo if available
        if (options.logo || (options.headerFooterData && options.headerFooterData.logo)) {
            const logoSrc = options.logo || options.headerFooterData.logo;
            try {
                // Add logo to top-right corner
                this.pdf.addImage(logoSrc, 'PNG', pageDims.width - margins.right - 30, margins.top - 15, 25, 10);
            } catch (error) {
                console.warn('Failed to add logo to PDF:', error);
            }
        }
        
        // Add header line
        this.pdf.setDrawColor(200);
        this.pdf.line(margins.left, margins.top - 2, pageDims.width - margins.right, margins.top - 2);
    }

    /**
     * Add footer to current page
     * @param {number} pageNumber - Current page number
     * @param {Object} options - Export options
     * @param {Object} pageDims - Page dimensions
     * @param {Object} margins - Page margins
     */
    async addPageFooter(pageNumber, options, pageDims, margins) {
        const footerY = pageDims.height - margins.bottom + 10;
        
        // Add footer line
        this.pdf.setDrawColor(200);
        this.pdf.line(margins.left, footerY - 5, pageDims.width - margins.right, footerY - 5);
        
        // Get footer content
        let footerText = '';
        if (options.headerFooterData && options.headerFooterData.footer) {
            footerText = options.headerFooterData.footer;
        } else if (options.footer) {
            footerText = options.footer;
        }
        
        // Add footer text
        if (footerText) {
            this.pdf.setFontSize(9);
            this.pdf.setTextColor(100);
            this.pdf.text(footerText, margins.left, footerY);
        }
        
        // Add page number
        if (options.showPageNumbers !== false) {
            const pageText = `Page ${pageNumber}`;
            this.pdf.setFontSize(9);
            this.pdf.setTextColor(100);
            const textWidth = this.pdf.getTextWidth(pageText);
            this.pdf.text(pageText, pageDims.width - margins.right - textWidth, footerY);
        }
        
        // Add date
        if (options.showDate) {
            const dateText = new Date().toLocaleDateString();
            this.pdf.setFontSize(9);
            this.pdf.setTextColor(100);
            const centerX = (pageDims.width - this.pdf.getTextWidth(dateText)) / 2;
            this.pdf.text(dateText, centerX, footerY);
        }
    }

    /**
     * Generate filename for PDF export
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
        
        // Ensure .pdf extension
        if (!filename.toLowerCase().endsWith('.pdf')) {
            filename += '.pdf';
        }
        
        return filename;
    }

    /**
     * Set custom page size and margins
     * @param {Object} pageSettings - Page configuration
     */
    setPageSettings(pageSettings) {
        if (pageSettings.size) {
            this.options.pageSize = pageSettings.size;
        }
        
        if (pageSettings.orientation) {
            this.options.orientation = pageSettings.orientation;
        }
        
        if (pageSettings.margins) {
            this.options.margins = { ...this.options.margins, ...pageSettings.margins };
        }
        
        // Reinitialize PDF with new settings
        this.initializePDF();
    }

    /**
     * Get current page settings
     * @returns {Object} Current page settings
     */
    getPageSettings() {
        return {
            size: this.options.pageSize,
            orientation: this.options.orientation,
            margins: this.options.margins,
            dimensions: this.getPageDimensions()
        };
    }

    /**
     * Export with custom settings (public API method)
     * @param {HTMLElement|string} content - Content to export
     * @param {Object} customSettings - Custom export settings
     * @returns {Promise<boolean>} Success status
     */
    async exportWithCustomSettings(content, customSettings = {}) {
        // Merge custom settings with defaults
        const exportOptions = {
            ...this.options,
            ...customSettings,
            margins: { ...this.options.margins, ...(customSettings.margins || {}) }
        };
        
        return await this.exportToPDF(content, exportOptions);
    }

    /**
     * Preview PDF settings without generating PDF
     * @param {Object} settings - Settings to preview
     * @returns {Object} Preview information
     */
    previewSettings(settings = {}) {
        const previewOptions = { ...this.options, ...settings };
        const dimensions = this.pageDimensions[previewOptions.pageSize] || this.pageDimensions['A4'];
        const contentDims = {
            width: dimensions.width - previewOptions.margins.left - previewOptions.margins.right,
            height: dimensions.height - previewOptions.margins.top - previewOptions.margins.bottom
        };
        
        return {
            pageSize: previewOptions.pageSize,
            orientation: previewOptions.orientation,
            margins: previewOptions.margins,
            contentArea: contentDims,
            filename: this.generateFilename(previewOptions)
        };
    }

    /**
     * Validate export settings
     * @param {Object} settings - Settings to validate
     * @returns {Object} Validation result
     */
    validateSettings(settings) {
        const errors = [];
        const warnings = [];
        
        // Validate page size
        if (settings.pageSize && !this.pageDimensions[settings.pageSize]) {
            errors.push(`Invalid page size: ${settings.pageSize}. Supported: ${Object.keys(this.pageDimensions).join(', ')}`);
        }
        
        // Validate orientation
        if (settings.orientation && !['portrait', 'landscape'].includes(settings.orientation)) {
            errors.push(`Invalid orientation: ${settings.orientation}. Supported: portrait, landscape`);
        }
        
        // Validate margins
        if (settings.margins) {
            const requiredMargins = ['top', 'right', 'bottom', 'left'];
            const missingMargins = requiredMargins.filter(m => typeof settings.margins[m] !== 'number');
            if (missingMargins.length > 0) {
                warnings.push(`Missing margin values: ${missingMargins.join(', ')}`);
            }
        }
        
        // Validate quality settings
        if (settings.scale && (settings.scale < 0.1 || settings.scale > 5)) {
            warnings.push('Scale should be between 0.1 and 5 for optimal results');
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Get export progress information
     * @returns {Object} Progress information
     */
    getExportProgress() {
        return {
            isExporting: this.isExporting,
            currentPage: this.currentPage,
            queueLength: this.exportQueue.length
        };
    }

    /**
     * Cancel current export operation
     */
    cancelExport() {
        if (this.isExporting) {
            this.isExporting = false;
            console.log('PDF export cancelled');
        }
    }

    /**
     * Get supported export formats and capabilities
     * @returns {Object} Supported features
     */
    getCapabilities() {
        return {
            formats: ['pdf'],
            pageSizes: Object.keys(this.pageDimensions),
            orientations: ['portrait', 'landscape'],
            features: {
                customMargins: true,
                headerFooter: true,
                pageNumbers: true,
                imageSupport: true,
                multiPage: true,
                compression: true,
                customDPI: true
            }
        };
    }

    /**
     * Show error message to user
     * @param {string} message - Error message
     */
    showErrorMessage(message) {
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
    }

    /**
     * Create advanced export button with settings
     * @param {Object} options - Button options
     * @returns {HTMLElement} Export button element
     */
    createExportButton(options = {}) {
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
            Export PDF
        `;
        
        button.addEventListener('click', async () => {
            if (this.isExporting) return;
            
            // Show loading state
            const originalHTML = button.innerHTML;
            button.innerHTML = `
                <svg class="icon animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
                Generating PDF...
            `;
            button.disabled = true;
            
            try {
                const content = options.getContent ? options.getContent() : document.querySelector('.results-preview');
                
                // Validate settings before export
                const validation = this.validateSettings(options);
                if (!validation.isValid) {
                    throw new Error(`Invalid settings: ${validation.errors.join(', ')}`);
                }
                
                // Show warnings if any
                if (validation.warnings.length > 0) {
                    console.warn('PDF Export warnings:', validation.warnings);
                }
                
                const success = await this.exportToPDF(content, options);
                
                if (success) {
                    // Show success feedback
                    button.innerHTML = `
                        <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 6L9 17l-5-5"/>
                        </svg>
                        PDF Generated!
                    `;
                    
                    setTimeout(() => {
                        button.innerHTML = originalHTML;
                    }, 2000);
                }
                
            } catch (error) {
                console.error('Advanced PDF export failed:', error);
                this.showErrorMessage(`PDF export failed: ${error.message}`);
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
     * Create settings panel for PDF export
     * @param {Object} options - Panel options
     * @returns {HTMLElement} Settings panel element
     */
    createSettingsPanel(options = {}) {
        const panel = document.createElement('div');
        panel.className = 'pdf-settings-panel';
        panel.innerHTML = `
            <div class="settings-group">
                <label>Page Size:</label>
                <select class="page-size-select">
                    <option value="A4">A4</option>
                    <option value="Letter">Letter</option>
                    <option value="Legal">Legal</option>
                </select>
            </div>
            
            <div class="settings-group">
                <label>Orientation:</label>
                <select class="orientation-select">
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                </select>
            </div>
            
            <div class="settings-group">
                <label>Margins (mm):</label>
                <div class="margin-inputs">
                    <input type="number" class="margin-top" placeholder="Top" value="20" min="0" max="50">
                    <input type="number" class="margin-right" placeholder="Right" value="20" min="0" max="50">
                    <input type="number" class="margin-bottom" placeholder="Bottom" value="20" min="0" max="50">
                    <input type="number" class="margin-left" placeholder="Left" value="20" min="0" max="50">
                </div>
            </div>
            
            <div class="settings-group">
                <label>
                    <input type="checkbox" class="include-headers" checked>
                    Include Headers
                </label>
            </div>
            
            <div class="settings-group">
                <label>
                    <input type="checkbox" class="include-footers" checked>
                    Include Footers
                </label>
            </div>
            
            <div class="settings-group">
                <label>
                    <input type="checkbox" class="show-page-numbers" checked>
                    Show Page Numbers
                </label>
            </div>
        `;
        
        // Add event listeners to update settings
        const updateSettings = () => {
            const settings = this.getSettingsFromPanel(panel);
            this.setPageSettings(settings);
        };
        
        panel.querySelectorAll('select, input').forEach(input => {
            input.addEventListener('change', updateSettings);
        });
        
        return panel;
    }

    /**
     * Get settings from settings panel
     * @param {HTMLElement} panel - Settings panel
     * @returns {Object} Current settings
     */
    getSettingsFromPanel(panel) {
        return {
            size: panel.querySelector('.page-size-select').value,
            orientation: panel.querySelector('.orientation-select').value,
            margins: {
                top: parseInt(panel.querySelector('.margin-top').value) || 20,
                right: parseInt(panel.querySelector('.margin-right').value) || 20,
                bottom: parseInt(panel.querySelector('.margin-bottom').value) || 20,
                left: parseInt(panel.querySelector('.margin-left').value) || 20
            },
            includeHeaders: panel.querySelector('.include-headers').checked,
            includeFooters: panel.querySelector('.include-footers').checked,
            showPageNumbers: panel.querySelector('.show-page-numbers').checked
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
        this.pageBreaks = [];
        this.currentPage = 1;
        this.isExporting = false;
        
        // Clean up PDF instance
        if (this.pdf) {
            this.pdf = null;
        }
        
        console.log('PDFExportManager destroyed and cleaned up');
    }
}

// Export for use in different module systems
if (typeof module !== 'undefined' && module.exports) {
    // Node.js/CommonJS
    module.exports = PDFExportManager;
} else if (typeof define === 'function' && define.amd) {
    // AMD
    define([], function() {
        return PDFExportManager;
    });
} else if (typeof window !== 'undefined') {
    // Browser global
    window.PDFExportManager = PDFExportManager;
}