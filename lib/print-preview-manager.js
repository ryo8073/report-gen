/**
 * Print Preview Manager
 * Implements dedicated print preview mode with accurate page layout
 * Shows page breaks, pagination, and header/footer content as it will appear in final document
 * Implements requirements 6.1, 6.2, 6.3, 6.4
 */

class PrintPreviewManager {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            pageSize: 'A4', // 'A4', 'Letter', 'Legal'
            orientation: 'portrait', // 'portrait', 'landscape'
            margins: 'normal', // 'narrow', 'normal', 'wide'
            showPageNumbers: true,
            showDate: true,
            enableNavigation: true,
            enableZoom: true,
            defaultZoom: 100,
            ...options
        };
        
        this.isActive = false;
        this.currentPage = 1;
        this.totalPages = 1;
        this.zoomLevel = this.options.defaultZoom;
        this.content = '';
        this.headerContent = '';
        this.footerContent = '';
        
        // Page dimensions (in pixels at 96 DPI)
        this.pageDimensions = this.getPageDimensions();
        
        // Component instances
        this.businessFormatter = null;
        this.headerFooterManager = null;
        
        // Event listeners
        this.listeners = {
            pageChange: [],
            zoomChange: [],
            modeChange: [],
            navigationChange: []
        };
        
        this.init();
    }
    
    /**
     * Initialize the print preview manager
     */
    init() {
        try {
            // Initialize component dependencies
            this.initializeComponents();
            
            // Create print preview structure
            this.createPreviewStructure();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Set up keyboard navigation
            this.setupKeyboardNavigation();
            
            console.log('Print Preview Manager initialized');
        } catch (error) {
            console.error('Print Preview Manager initialization error:', error);
            this.showError('印刷プレビューの初期化に失敗しました');
        }
    }
    
    /**
     * Initialize component dependencies
     */
    initializeComponents() {
        // Initialize Business Document Formatter
        if (typeof BusinessDocumentFormatter !== 'undefined') {
            this.businessFormatter = new BusinessDocumentFormatter();
        }
        
        // Initialize Header/Footer Manager
        if (typeof HeaderFooterManager !== 'undefined') {
            this.headerFooterManager = new HeaderFooterManager({
                enableLogo: true,
                enablePageNumbers: this.options.showPageNumbers,
                enableDateInsertion: this.options.showDate
            });
        }
    }
    
    /**
     * Create the print preview structure
     */
    createPreviewStructure() {
        this.container.innerHTML = `
            <div class="print-preview-manager" id="print-preview-manager">
                <!-- Print Preview Header -->
                <div class="print-preview-header" id="preview-header">
                    <div class="preview-title-section">
                        <h3 class="preview-title">印刷プレビュー</h3>
                        <div class="preview-status">
                            <span class="page-info" id="page-info">ページ 1 / 1</span>
                        </div>
                    </div>
                    
                    <div class="preview-controls">
                        <div class="control-group">
                            <label for="zoom-select">表示倍率:</label>
                            <select id="zoom-select" class="preview-select">
                                <option value="50">50%</option>
                                <option value="75">75%</option>
                                <option value="100" selected>100%</option>
                                <option value="125">125%</option>
                                <option value="150">150%</option>
                                <option value="fit-width">幅に合わせる</option>
                                <option value="fit-page">ページに合わせる</option>
                            </select>
                        </div>
                        
                        <div class="control-group">
                            <button id="prev-page-btn" class="preview-nav-btn" title="前のページ" disabled>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="15,18 9,12 15,6"></polyline>
                                </svg>
                            </button>
                            <button id="next-page-btn" class="preview-nav-btn" title="次のページ" disabled>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="9,18 15,12 9,6"></polyline>
                                </svg>
                            </button>
                        </div>
                        
                        <div class="control-group">
                            <button id="close-preview-btn" class="btn btn-secondary">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                                プレビューを閉じる
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Print Preview Content -->
                <div class="print-preview-content" id="preview-content">
                    <div class="preview-viewport" id="preview-viewport">
                        <div class="preview-pages-container" id="pages-container">
                            <!-- Pages will be dynamically generated here -->
                        </div>
                    </div>
                </div>
                
                <!-- Print Preview Footer -->
                <div class="print-preview-footer" id="preview-footer">
                    <div class="footer-info">
                        <span class="document-info" id="document-info">文書サイズ: A4, 向き: 縦</span>
                    </div>
                    <div class="footer-actions">
                        <button id="print-btn" class="btn btn-primary">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6,9 6,2 18,2 18,9"></polyline>
                                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                <polyline points="6,14 6,22 18,22 18,14"></polyline>
                            </svg>
                            印刷
                        </button>
                        <button id="export-pdf-btn" class="btn btn-primary">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14,2 14,8 20,8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                            </svg>
                            PDF出力
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Zoom control
        const zoomSelect = this.container.querySelector('#zoom-select');
        if (zoomSelect) {
            zoomSelect.addEventListener('change', (e) => {
                this.setZoom(e.target.value);
            });
        }
        
        // Page navigation
        const prevBtn = this.container.querySelector('#prev-page-btn');
        const nextBtn = this.container.querySelector('#next-page-btn');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousPage());
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextPage());
        }
        
        // Close preview
        const closeBtn = this.container.querySelector('#close-preview-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closePreview());
        }
        
        // Print and export
        const printBtn = this.container.querySelector('#print-btn');
        const exportBtn = this.container.querySelector('#export-pdf-btn');
        
        if (printBtn) {
            printBtn.addEventListener('click', () => this.printDocument());
        }
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportToPDF());
        }
        
        // Viewport scroll for page tracking
        const viewport = this.container.querySelector('#preview-viewport');
        if (viewport) {
            viewport.addEventListener('scroll', () => this.updateCurrentPageFromScroll());
        }
    }
    
    /**
     * Set up keyboard navigation
     */
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (!this.isActive) return;
            
            switch (e.key) {
                case 'Escape':
                    e.preventDefault();
                    this.closePreview();
                    break;
                case 'ArrowUp':
                case 'PageUp':
                    e.preventDefault();
                    this.previousPage();
                    break;
                case 'ArrowDown':
                case 'PageDown':
                    e.preventDefault();
                    this.nextPage();
                    break;
                case 'Home':
                    e.preventDefault();
                    this.goToPage(1);
                    break;
                case 'End':
                    e.preventDefault();
                    this.goToPage(this.totalPages);
                    break;
                case '+':
                case '=':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.zoomIn();
                    }
                    break;
                case '-':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.zoomOut();
                    }
                    break;
                case '0':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.setZoom(100);
                    }
                    break;
            }
        });
    }
    
    /**
     * Show print preview with content
     */
    showPreview(content, headerContent = '', footerContent = '') {
        this.content = content || '';
        this.headerContent = headerContent || '';
        this.footerContent = footerContent || '';
        
        // Update page dimensions based on current settings
        this.pageDimensions = this.getPageDimensions();
        
        // Generate pages with content
        this.generatePages();
        
        // Show the preview
        this.isActive = true;
        this.container.style.display = 'block';
        
        // Update navigation
        this.updateNavigation();
        
        // Update document info
        this.updateDocumentInfo();
        
        // Emit mode change event
        this.emit('modeChange', {
            active: true,
            totalPages: this.totalPages,
            pageSize: this.options.pageSize,
            orientation: this.options.orientation
        });
        
        console.log(`Print preview shown with ${this.totalPages} pages`);
    }
    
    /**
     * Close print preview
     */
    closePreview() {
        this.isActive = false;
        this.container.style.display = 'none';
        
        // Emit mode change event
        this.emit('modeChange', {
            active: false,
            totalPages: 0
        });
        
        console.log('Print preview closed');
    }
    
    /**
     * Generate pages with content and page breaks
     */
    generatePages() {
        const pagesContainer = this.container.querySelector('#pages-container');
        if (!pagesContainer) return;
        
        // Clear existing pages
        pagesContainer.innerHTML = '';
        
        // Create a temporary container to measure content
        const tempContainer = document.createElement('div');
        tempContainer.style.cssText = `
            position: absolute;
            top: -9999px;
            left: -9999px;
            width: ${this.pageDimensions.contentWidth}px;
            font-family: var(--business-font-family, 'Times New Roman', serif);
            font-size: var(--business-font-size-body, 12pt);
            line-height: var(--business-line-height-normal, 1.5);
        `;
        
        // Apply business formatting if available
        if (this.businessFormatter) {
            this.businessFormatter.applyStandardStyling(tempContainer);
        }
        
        // Set content
        tempContainer.innerHTML = this.content;
        document.body.appendChild(tempContainer);
        
        // Calculate pages based on content height
        const contentHeight = tempContainer.scrollHeight;
        const pageContentHeight = this.pageDimensions.contentHeight;
        this.totalPages = Math.max(1, Math.ceil(contentHeight / pageContentHeight));
        
        // Generate individual pages
        for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
            const pageElement = this.createPageElement(pageNum);
            pagesContainer.appendChild(pageElement);
        }
        
        // Clean up temporary container
        document.body.removeChild(tempContainer);
        
        // Update page info
        this.updatePageInfo();
    }
    
    /**
     * Create a single page element
     */
    createPageElement(pageNumber) {
        const page = document.createElement('div');
        page.className = 'preview-page';
        page.id = `page-${pageNumber}`;
        page.style.cssText = `
            width: ${this.pageDimensions.width}px;
            height: ${this.pageDimensions.height}px;
            margin: 20px auto;
            background: white;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            position: relative;
            overflow: hidden;
            page-break-after: always;
        `;
        
        // Create header
        if (this.headerContent || this.options.showDate) {
            const header = this.createHeaderElement(pageNumber);
            page.appendChild(header);
        }
        
        // Create content area
        const contentArea = document.createElement('div');
        contentArea.className = 'page-content';
        contentArea.style.cssText = `
            padding: ${this.pageDimensions.marginTop}px ${this.pageDimensions.marginRight}px ${this.pageDimensions.marginBottom}px ${this.pageDimensions.marginLeft}px;
            height: ${this.pageDimensions.contentHeight}px;
            overflow: hidden;
            font-family: var(--business-font-family, 'Times New Roman', serif);
            font-size: var(--business-font-size-body, 12pt);
            line-height: var(--business-line-height-normal, 1.5);
        `;
        
        // Calculate content for this page
        const pageContent = this.getContentForPage(pageNumber);
        contentArea.innerHTML = pageContent;
        
        // Apply business formatting if available
        if (this.businessFormatter) {
            this.businessFormatter.applyStandardStyling(contentArea);
        }
        
        page.appendChild(contentArea);
        
        // Create footer
        if (this.footerContent || this.options.showPageNumbers) {
            const footer = this.createFooterElement(pageNumber);
            page.appendChild(footer);
        }
        
        return page;
    }
    
    /**
     * Create header element for a page
     */
    createHeaderElement(pageNumber) {
        const header = document.createElement('div');
        header.className = 'page-header';
        header.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: ${this.pageDimensions.marginTop}px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 ${this.pageDimensions.marginLeft}px;
            font-size: 10pt;
            color: #666;
            border-bottom: 1px solid #ddd;
        `;
        
        const headerLeft = document.createElement('div');
        headerLeft.textContent = this.headerContent;
        
        const headerRight = document.createElement('div');
        if (this.options.showDate) {
            headerRight.textContent = new Date().toLocaleDateString('ja-JP');
        }
        
        header.appendChild(headerLeft);
        header.appendChild(headerRight);
        
        return header;
    }
    
    /**
     * Create footer element for a page
     */
    createFooterElement(pageNumber) {
        const footer = document.createElement('div');
        footer.className = 'page-footer';
        footer.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: ${this.pageDimensions.marginBottom}px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 ${this.pageDimensions.marginLeft}px;
            font-size: 10pt;
            color: #666;
            border-top: 1px solid #ddd;
        `;
        
        const footerLeft = document.createElement('div');
        footerLeft.textContent = this.footerContent;
        
        const footerRight = document.createElement('div');
        if (this.options.showPageNumbers) {
            footerRight.textContent = `${pageNumber} / ${this.totalPages}`;
        }
        
        footer.appendChild(footerLeft);
        footer.appendChild(footerRight);
        
        return footer;
    }
    
    /**
     * Get content for a specific page
     */
    getContentForPage(pageNumber) {
        // For now, return the full content for each page
        // In a more sophisticated implementation, this would split content across pages
        return this.content;
    }
    
    /**
     * Get page dimensions based on current settings
     */
    getPageDimensions() {
        const dimensions = {
            A4: { width: 794, height: 1123 }, // 210mm x 297mm at 96 DPI
            Letter: { width: 816, height: 1056 }, // 8.5" x 11" at 96 DPI
            Legal: { width: 816, height: 1344 } // 8.5" x 14" at 96 DPI
        };
        
        const margins = {
            narrow: { top: 48, right: 48, bottom: 48, left: 48 }, // 0.5"
            normal: { top: 96, right: 96, bottom: 96, left: 96 }, // 1"
            wide: { top: 144, right: 144, bottom: 144, left: 144 } // 1.5"
        };
        
        const pageSize = dimensions[this.options.pageSize] || dimensions.A4;
        const margin = margins[this.options.margins] || margins.normal;
        
        if (this.options.orientation === 'landscape') {
            return {
                width: pageSize.height,
                height: pageSize.width,
                marginTop: margin.top,
                marginRight: margin.right,
                marginBottom: margin.bottom,
                marginLeft: margin.left,
                contentWidth: pageSize.height - margin.left - margin.right,
                contentHeight: pageSize.width - margin.top - margin.bottom
            };
        }
        
        return {
            width: pageSize.width,
            height: pageSize.height,
            marginTop: margin.top,
            marginRight: margin.right,
            marginBottom: margin.bottom,
            marginLeft: margin.left,
            contentWidth: pageSize.width - margin.left - margin.right,
            contentHeight: pageSize.height - margin.top - margin.bottom
        };
    }
    
    /**
     * Set zoom level
     */
    setZoom(zoomValue) {
        const viewport = this.container.querySelector('#preview-viewport');
        if (!viewport) return;
        
        let scale;
        
        if (zoomValue === 'fit-width') {
            const containerWidth = viewport.clientWidth - 40; // Account for margins
            scale = containerWidth / this.pageDimensions.width;
        } else if (zoomValue === 'fit-page') {
            const containerWidth = viewport.clientWidth - 40;
            const containerHeight = viewport.clientHeight - 40;
            const scaleX = containerWidth / this.pageDimensions.width;
            const scaleY = containerHeight / this.pageDimensions.height;
            scale = Math.min(scaleX, scaleY);
        } else {
            scale = parseInt(zoomValue) / 100;
        }
        
        this.zoomLevel = Math.round(scale * 100);
        
        const pagesContainer = this.container.querySelector('#pages-container');
        if (pagesContainer) {
            pagesContainer.style.transform = `scale(${scale})`;
            pagesContainer.style.transformOrigin = 'top center';
        }
        
        // Update zoom select if it doesn't match
        const zoomSelect = this.container.querySelector('#zoom-select');
        if (zoomSelect && zoomSelect.value !== zoomValue) {
            if (zoomValue !== 'fit-width' && zoomValue !== 'fit-page') {
                zoomSelect.value = this.zoomLevel.toString();
            }
        }
        
        this.emit('zoomChange', { zoom: this.zoomLevel, scale });
    }
    
    /**
     * Zoom in
     */
    zoomIn() {
        const newZoom = Math.min(200, this.zoomLevel + 25);
        this.setZoom(newZoom.toString());
    }
    
    /**
     * Zoom out
     */
    zoomOut() {
        const newZoom = Math.max(25, this.zoomLevel - 25);
        this.setZoom(newZoom.toString());
    }
    
    /**
     * Navigate to previous page
     */
    previousPage() {
        if (this.currentPage > 1) {
            this.goToPage(this.currentPage - 1);
        }
    }
    
    /**
     * Navigate to next page
     */
    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.goToPage(this.currentPage + 1);
        }
    }
    
    /**
     * Go to specific page
     */
    goToPage(pageNumber) {
        if (pageNumber < 1 || pageNumber > this.totalPages) return;
        
        this.currentPage = pageNumber;
        
        // Scroll to page
        const pageElement = this.container.querySelector(`#page-${pageNumber}`);
        const viewport = this.container.querySelector('#preview-viewport');
        
        if (pageElement && viewport) {
            pageElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
        
        this.updateNavigation();
        this.emit('pageChange', { page: this.currentPage, totalPages: this.totalPages });
    }
    
    /**
     * Update current page based on scroll position
     */
    updateCurrentPageFromScroll() {
        const viewport = this.container.querySelector('#preview-viewport');
        if (!viewport) return;
        
        const pages = this.container.querySelectorAll('.preview-page');
        const viewportTop = viewport.scrollTop;
        const viewportHeight = viewport.clientHeight;
        const viewportCenter = viewportTop + viewportHeight / 2;
        
        let newCurrentPage = 1;
        
        pages.forEach((page, index) => {
            const pageTop = page.offsetTop;
            const pageBottom = pageTop + page.offsetHeight;
            
            if (viewportCenter >= pageTop && viewportCenter <= pageBottom) {
                newCurrentPage = index + 1;
            }
        });
        
        if (newCurrentPage !== this.currentPage) {
            this.currentPage = newCurrentPage;
            this.updateNavigation();
        }
    }
    
    /**
     * Update navigation buttons and page info
     */
    updateNavigation() {
        const prevBtn = this.container.querySelector('#prev-page-btn');
        const nextBtn = this.container.querySelector('#next-page-btn');
        
        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
        }
        
        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= this.totalPages;
        }
        
        this.updatePageInfo();
    }
    
    /**
     * Update page information display
     */
    updatePageInfo() {
        const pageInfo = this.container.querySelector('#page-info');
        if (pageInfo) {
            pageInfo.textContent = `ページ ${this.currentPage} / ${this.totalPages}`;
        }
    }
    
    /**
     * Update document information display
     */
    updateDocumentInfo() {
        const docInfo = this.container.querySelector('#document-info');
        if (docInfo) {
            const orientation = this.options.orientation === 'portrait' ? '縦' : '横';
            docInfo.textContent = `文書サイズ: ${this.options.pageSize}, 向き: ${orientation}`;
        }
    }
    
    /**
     * Print the document
     */
    printDocument() {
        // Create a new window for printing
        const printWindow = window.open('', '_blank');
        
        const printContent = this.generatePrintHTML();
        
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Wait for content to load, then print
        printWindow.onload = () => {
            printWindow.print();
            printWindow.close();
        };
    }
    
    /**
     * Export to PDF
     */
    async exportToPDF() {
        try {
            // Use existing PDF export manager if available
            if (window.PDFExportManager) {
                const pdfManager = new PDFExportManager({
                    pageSize: this.options.pageSize,
                    orientation: this.options.orientation,
                    margins: this.options.margins
                });
                
                const contentElement = document.createElement('div');
                contentElement.innerHTML = this.content;
                
                await pdfManager.exportToPDF(contentElement, {
                    filename: 'print-preview-document.pdf',
                    header: this.headerContent,
                    footer: this.footerContent,
                    showPageNumbers: this.options.showPageNumbers
                });
            } else {
                // Fallback to browser print
                this.printDocument();
            }
        } catch (error) {
            console.error('PDF export error:', error);
            this.showError('PDF出力中にエラーが発生しました');
        }
    }
    
    /**
     * Generate HTML for printing
     */
    generatePrintHTML() {
        const printCSS = this.generatePrintCSS();
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>印刷プレビュー</title>
                <style>
                    ${printCSS}
                </style>
            </head>
            <body>
                ${this.content}
            </body>
            </html>
        `;
    }
    
    /**
     * Generate CSS for printing
     */
    generatePrintCSS() {
        const margins = {
            narrow: '0.5in',
            normal: '1in',
            wide: '1.5in'
        }[this.options.margins] || '1in';
        
        return `
            @page {
                size: ${this.options.pageSize} ${this.options.orientation};
                margin: ${margins};
            }
            
            body {
                font-family: 'Times New Roman', serif;
                font-size: 12pt;
                line-height: 1.5;
                color: #000;
            }
            
            h1, h2, h3, h4, h5, h6 {
                page-break-after: avoid;
                margin-top: 0;
            }
            
            p {
                margin: 0 0 12pt 0;
                text-align: justify;
            }
            
            table {
                page-break-inside: avoid;
                border-collapse: collapse;
                width: 100%;
            }
            
            th, td {
                border: 1pt solid #000;
                padding: 6pt;
            }
            
            .page-break {
                page-break-before: always;
            }
        `;
    }
    
    /**
     * Update preview settings
     */
    updateSettings(newSettings) {
        this.options = { ...this.options, ...newSettings };
        
        if (this.isActive) {
            // Regenerate pages with new settings
            this.pageDimensions = this.getPageDimensions();
            this.generatePages();
            this.updateDocumentInfo();
        }
    }
    
    /**
     * Show error message
     */
    showError(message) {
        if (window.errorHandler) {
            window.errorHandler.showNotification(message, 'error');
        } else {
            console.error(message);
            alert(message);
        }
    }
    
    /**
     * Event emitter functionality
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }
    
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }
    
    /**
     * Get current preview state
     */
    getState() {
        return {
            isActive: this.isActive,
            currentPage: this.currentPage,
            totalPages: this.totalPages,
            zoomLevel: this.zoomLevel,
            options: { ...this.options }
        };
    }
    
    /**
     * Cleanup and destroy
     */
    destroy() {
        this.closePreview();
        this.listeners = {};
        
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        console.log('Print Preview Manager destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PrintPreviewManager;
} else if (typeof window !== 'undefined') {
    window.PrintPreviewManager = PrintPreviewManager;
}