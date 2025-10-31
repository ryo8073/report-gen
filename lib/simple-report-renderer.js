/**
 * Simple Report Renderer - Reliable, clean report display system
 * Implements requirements 4.1, 4.2, 4.3, 4.4, 4.5 for simplified report display
 * Provides fallback functionality when complex editors fail
 */

class SimpleReportRenderer {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            enableCopy: true,
            enableExport: true,
            enablePrint: true,
            maxContentLength: 50000, // Prevent memory issues with very large reports
            wordWrapLength: 80,
            showWordCount: true,
            showReadingTime: true,
            enableResponsive: true,
            ...options
        };
        
        this.content = '';
        this.originalContent = '';
        this.isInitialized = false;
        this.exportManager = null;
        
        // Initialize the renderer
        this.init();
    }
    
    /**
     * Initialize the simple report renderer
     */
    init() {
        try {
            if (!this.container) {
                throw new Error('Container element is required');
            }
            
            this.createLayout();
            this.setupEventListeners();
            this.setupResponsiveDesign();
            this.isInitialized = true;
            
            console.log('Simple Report Renderer initialized successfully');
        } catch (error) {
            console.error('Simple Report Renderer initialization failed:', error);
            this.showFallbackError(error);
        }
    }
    
    /**
     * Create the basic layout structure
     */
    createLayout() {
        // Clear container
        this.container.innerHTML = '';
        
        // Create main wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'simple-report-wrapper';
        wrapper.innerHTML = `
            <div class="simple-report-header">
                <div class="report-info">
                    <h3 class="report-title">生成されたレポート</h3>
                    <div class="report-meta">
                        <span class="word-count" style="display: none;"></span>
                        <span class="reading-time" style="display: none;"></span>
                        <span class="generation-time"></span>
                    </div>
                </div>
                <div class="report-actions">
                    <button type="button" class="action-btn copy-btn" title="コピー">
                        📋 コピー
                    </button>
                    <button type="button" class="action-btn print-btn" title="印刷">
                        🖨️ 印刷
                    </button>
                    <div class="export-dropdown">
                        <button type="button" class="action-btn export-btn" title="エクスポート">
                            📥 エクスポート ▼
                        </button>
                        <div class="export-menu">
                            <button type="button" class="export-option" data-format="txt">テキスト (.txt)</button>
                            <button type="button" class="export-option" data-format="md">Markdown (.md)</button>
                            <button type="button" class="export-option" data-format="pdf">PDF (.pdf)</button>
                            <button type="button" class="export-option" data-format="rtf">Word (.rtf)</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="simple-report-content">
                <div class="content-display" role="main" aria-label="レポート内容">
                    <div class="content-text"></div>
                </div>
            </div>
            
            <div class="simple-report-footer">
                <div class="status-message"></div>
            </div>
        `;
        
        this.container.appendChild(wrapper);
        
        // Add CSS styles
        this.addStyles();
        
        // Cache DOM elements
        this.elements = {
            wrapper,
            header: wrapper.querySelector('.simple-report-header'),
            content: wrapper.querySelector('.content-text'),
            wordCount: wrapper.querySelector('.word-count'),
            readingTime: wrapper.querySelector('.reading-time'),
            generationTime: wrapper.querySelector('.generation-time'),
            copyBtn: wrapper.querySelector('.copy-btn'),
            printBtn: wrapper.querySelector('.print-btn'),
            exportBtn: wrapper.querySelector('.export-btn'),
            exportMenu: wrapper.querySelector('.export-menu'),
            exportOptions: wrapper.querySelectorAll('.export-option'),
            statusMessage: wrapper.querySelector('.status-message')
        };
    }    

    /**
     * Add CSS styles for the simple report renderer
     */
    addStyles() {
        const styleId = 'simple-report-renderer-styles';
        if (document.getElementById(styleId)) {
            return; // Styles already added
        }
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Enable smooth scrolling */
            html {
                scroll-behavior: smooth;
            }
            
            .simple-report-wrapper {
                max-width: 100%;
                margin: 0 auto;
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .simple-report-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                background: #f9fafb;
                border-bottom: 1px solid #e5e7eb;
                border-radius: 8px 8px 0 0;
            }
            
            .report-info h3 {
                margin: 0 0 4px 0;
                font-size: 18px;
                font-weight: 600;
                color: #111827;
            }
            
            .report-meta {
                display: flex;
                gap: 12px;
                font-size: 12px;
                color: #6b7280;
            }
            
            .report-actions {
                display: flex;
                gap: 8px;
                align-items: center;
            }
            
            .action-btn {
                padding: 8px 12px;
                background: white;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .action-btn:hover {
                background: #f3f4f6;
                border-color: #9ca3af;
            }
            
            .action-btn:active {
                background: #e5e7eb;
            }
            
            .action-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .export-dropdown {
                position: relative;
            }
            
            .export-menu {
                position: absolute;
                top: 100%;
                right: 0;
                background: white;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                z-index: 1000;
                min-width: 150px;
                display: none;
            }
            
            .export-menu.show {
                display: block;
            }
            
            .export-option {
                display: block;
                width: 100%;
                padding: 8px 12px;
                background: none;
                border: none;
                text-align: left;
                font-size: 14px;
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .export-option:hover {
                background: #f3f4f6;
            }
            
            .simple-report-content {
                padding: 24px;
                min-height: 200px;
            }
            
            .content-display {
                line-height: 1.7;
                color: #1f2937;
                font-size: 16px;
                font-weight: 400;
                letter-spacing: 0.01em;
                text-rendering: optimizeLegibility;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }
            
            .content-text {
                white-space: pre-wrap;
                word-wrap: break-word;
                max-width: 100%;
                hyphens: auto;
                -webkit-hyphens: auto;
                -ms-hyphens: auto;
            }
            
            /* Table of Contents Styles */
            .table-of-contents {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 20px;
                margin: 0 0 32px 0;
                max-width: 100%;
            }
            
            .toc-title {
                margin: 0 0 16px 0 !important;
                font-size: 18px !important;
                font-weight: 600 !important;
                color: #1e293b !important;
                border-bottom: 2px solid #e2e8f0;
                padding-bottom: 8px;
            }
            
            .toc-nav {
                max-height: 300px;
                overflow-y: auto;
            }
            
            .toc-list {
                list-style: none !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            
            .toc-item {
                margin: 0 !important;
                padding: 0 !important;
            }
            
            .toc-link {
                display: block;
                padding: 6px 12px;
                color: #475569;
                text-decoration: none;
                border-radius: 4px;
                transition: all 0.2s;
                font-size: 14px;
                line-height: 1.4;
            }
            
            .toc-link:hover {
                background: #e2e8f0;
                color: #1e293b;
                text-decoration: none;
            }
            
            .toc-link:focus {
                outline: 2px solid #3b82f6;
                outline-offset: 2px;
            }
            
            .toc-level-2 .toc-link { padding-left: 24px; font-size: 13px; }
            .toc-level-3 .toc-link { padding-left: 36px; font-size: 12px; }
            .toc-level-4 .toc-link { padding-left: 48px; font-size: 12px; }
            
            /* Enhanced Header Styles */
            .content-text .report-header {
                position: relative;
                margin: 32px 0 16px 0;
                font-weight: 600;
                color: #111827;
                line-height: 1.3;
                scroll-margin-top: 80px; /* Account for fixed headers */
            }
            
            .content-text .report-h1 { 
                font-size: 28px; 
                border-bottom: 3px solid #e5e7eb;
                padding-bottom: 12px;
                margin-top: 0;
            }
            
            .content-text .report-h2 { 
                font-size: 24px; 
                border-bottom: 2px solid #f3f4f6;
                padding-bottom: 8px;
            }
            
            .content-text .report-h3 { 
                font-size: 20px; 
                color: #374151;
            }
            
            .content-text .report-h4 { 
                font-size: 18px; 
                color: #4b5563;
            }
            
            .header-anchor {
                position: absolute;
                left: -24px;
                top: 50%;
                transform: translateY(-50%);
                opacity: 0;
                color: #9ca3af;
                text-decoration: none;
                font-weight: normal;
                font-size: 0.8em;
                transition: opacity 0.2s;
                width: 20px;
                text-align: center;
            }
            
            .report-header:hover .header-anchor {
                opacity: 1;
            }
            
            .header-anchor:hover {
                color: #3b82f6;
                text-decoration: none;
            }
            
            /* Enhanced Paragraph Styles for Better Readability */
            .content-text .report-paragraph {
                margin: 18px 0;
                line-height: 1.8;
                color: #1f2937;
                font-size: 16px;
                text-align: justify;
                text-justify: inter-ideograph;
                word-spacing: 0.05em;
            }
            
            .content-text .report-paragraph:first-child {
                margin-top: 0;
            }
            
            .content-text .report-paragraph:last-child {
                margin-bottom: 0;
            }
            
            /* Improve readability for Japanese text */
            .content-text .report-paragraph:lang(ja) {
                text-align: left;
                line-height: 1.9;
                letter-spacing: 0.02em;
            }
            
            /* Enhanced List Styles for Better Readability */
            .content-text .report-list {
                margin: 20px 0;
                padding-left: 28px;
            }
            
            .content-text .report-list.numbered {
                list-style-type: decimal;
            }
            
            .content-text .report-list:not(.numbered) {
                list-style-type: disc;
            }
            
            .content-text .report-list-item {
                margin: 10px 0;
                line-height: 1.7;
                color: #1f2937;
                padding-left: 8px;
            }
            
            .content-text .report-list .report-list {
                margin: 10px 0;
                padding-left: 24px;
            }
            
            .content-text .report-list .report-list:not(.numbered) {
                list-style-type: circle;
            }
            
            /* Better spacing for nested lists */
            .content-text .report-list .report-list .report-list {
                list-style-type: square;
            }
            
            /* Enhanced Typography and Contrast */
            .content-text strong {
                font-weight: 700;
                color: #111827;
            }
            
            .content-text em {
                font-style: italic;
                color: #374151;
            }
            
            .content-text code {
                background: #f1f5f9;
                color: #1e293b;
                padding: 3px 6px;
                border-radius: 4px;
                font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
                font-size: 14px;
                border: 1px solid #e2e8f0;
            }
            
            .content-text pre {
                background: #f8fafc;
                color: #1e293b;
                padding: 16px;
                border-radius: 8px;
                overflow-x: auto;
                margin: 20px 0;
                border: 1px solid #e2e8f0;
                font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
                font-size: 14px;
                line-height: 1.5;
            }
            
            .content-text blockquote {
                margin: 20px 0;
                padding: 16px 20px;
                background: #f8fafc;
                border-left: 4px solid #3b82f6;
                font-style: italic;
                color: #475569;
                border-radius: 0 8px 8px 0;
            }
            
            .simple-report-footer {
                padding: 12px 20px;
                background: #f9fafb;
                border-top: 1px solid #e5e7eb;
                border-radius: 0 0 8px 8px;
                min-height: 20px;
            }
            
            .status-message {
                font-size: 12px;
                color: #6b7280;
            }
            
            .status-message.success {
                color: #059669;
            }
            
            .status-message.error {
                color: #dc2626;
            }
            
            /* Responsive design for better readability */
            @media (max-width: 768px) {
                .simple-report-header {
                    flex-direction: column;
                    gap: 12px;
                    align-items: stretch;
                    padding: 12px 16px;
                }
                
                .report-actions {
                    justify-content: center;
                    flex-wrap: wrap;
                }
                
                .simple-report-content {
                    padding: 16px;
                }
                
                .content-display {
                    font-size: 15px;
                    line-height: 1.8;
                }
                
                .content-text .report-h1 { font-size: 24px; }
                .content-text .report-h2 { font-size: 20px; }
                .content-text .report-h3 { font-size: 18px; }
                .content-text .report-h4 { font-size: 16px; }
                
                .content-text .report-paragraph {
                    font-size: 15px;
                    line-height: 1.8;
                    margin: 16px 0;
                }
                
                .content-text .report-list-item {
                    font-size: 15px;
                    line-height: 1.7;
                }
                
                .table-of-contents {
                    padding: 16px;
                    margin-bottom: 24px;
                }
                
                .toc-link {
                    font-size: 13px;
                    padding: 8px 12px;
                }
                
                .toc-level-2 .toc-link { padding-left: 20px; }
                .toc-level-3 .toc-link { padding-left: 28px; }
                .toc-level-4 .toc-link { padding-left: 36px; }
            }
            
            @media (max-width: 480px) {
                .simple-report-content {
                    padding: 12px;
                }
                
                .content-display {
                    font-size: 14px;
                }
                
                .content-text .report-h1 { font-size: 22px; }
                .content-text .report-h2 { font-size: 18px; }
                .content-text .report-h3 { font-size: 16px; }
                .content-text .report-h4 { font-size: 15px; }
                
                .content-text .report-paragraph {
                    font-size: 14px;
                    text-align: left;
                }
                
                .content-text .report-list-item {
                    font-size: 14px;
                }
                
                .table-of-contents {
                    padding: 12px;
                }
                
                .action-btn {
                    padding: 6px 10px;
                    font-size: 13px;
                }
            }
            
            /* Large screen optimizations */
            @media (min-width: 1200px) {
                .simple-report-wrapper {
                    max-width: 900px;
                }
                
                .content-display {
                    font-size: 17px;
                    line-height: 1.7;
                }
                
                .content-text .report-paragraph {
                    font-size: 17px;
                    max-width: 75ch; /* Optimal reading line length */
                }
                
                .simple-report-content {
                    padding: 32px;
                }
            }
            
            /* Print styles */
            @media print {
                * {
                    -webkit-print-color-adjust: exact !important;
                    color-adjust: exact !important;
                }
                
                .simple-report-wrapper {
                    border: none;
                    box-shadow: none;
                    background: white !important;
                    color: black !important;
                    max-width: none;
                    margin: 0;
                }
                
                .simple-report-header,
                .simple-report-footer {
                    display: none !important;
                }
                
                .simple-report-content {
                    padding: 0;
                }
                
                .content-display {
                    font-size: 12pt;
                    line-height: 1.6;
                    color: black !important;
                }
                
                .content-text .report-header {
                    color: black !important;
                    page-break-after: avoid;
                    margin-top: 24pt;
                    margin-bottom: 12pt;
                }
                
                .content-text .report-h1 {
                    font-size: 18pt;
                    border-bottom: 2pt solid black;
                    padding-bottom: 6pt;
                }
                
                .content-text .report-h2 {
                    font-size: 16pt;
                    border-bottom: 1pt solid black;
                    padding-bottom: 4pt;
                }
                
                .content-text .report-h3 {
                    font-size: 14pt;
                }
                
                .content-text .report-h4 {
                    font-size: 12pt;
                }
                
                .content-text .report-paragraph {
                    color: black !important;
                    font-size: 11pt;
                    line-height: 1.5;
                    margin: 12pt 0;
                    text-align: justify;
                    orphans: 3;
                    widows: 3;
                }
                
                .content-text .report-list {
                    margin: 12pt 0;
                    padding-left: 20pt;
                }
                
                .content-text .report-list-item {
                    color: black !important;
                    font-size: 11pt;
                    line-height: 1.5;
                    margin: 6pt 0;
                    page-break-inside: avoid;
                }
                
                .table-of-contents {
                    background: white !important;
                    border: 1pt solid black;
                    padding: 12pt;
                    margin-bottom: 24pt;
                    page-break-after: avoid;
                }
                
                .toc-title {
                    color: black !important;
                    font-size: 14pt;
                    border-bottom: 1pt solid black;
                }
                
                .toc-link {
                    color: black !important;
                    text-decoration: none;
                    font-size: 10pt;
                }
                
                .header-anchor {
                    display: none !important;
                }
                
                .content-text blockquote {
                    background: #f5f5f5 !important;
                    border-left: 3pt solid black;
                    color: black !important;
                    margin: 12pt 0;
                    padding: 12pt;
                    page-break-inside: avoid;
                }
                
                .content-text code {
                    background: #f5f5f5 !important;
                    color: black !important;
                    border: 1pt solid black;
                    font-size: 10pt;
                }
                
                .content-text pre {
                    background: #f5f5f5 !important;
                    color: black !important;
                    border: 1pt solid black;
                    font-size: 9pt;
                    line-height: 1.4;
                    page-break-inside: avoid;
                }
                
                /* Page break controls */
                .content-text .report-h1,
                .content-text .report-h2 {
                    page-break-before: auto;
                    page-break-after: avoid;
                }
                
                .content-text .report-h3,
                .content-text .report-h4 {
                    page-break-after: avoid;
                }
                
                /* Ensure good page breaks */
                .content-text .report-paragraph,
                .content-text .report-list {
                    page-break-inside: avoid;
                }
            }
        `;
        
        document.head.appendChild(style);
    }  
  
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Copy button
        if (this.elements.copyBtn) {
            this.elements.copyBtn.addEventListener('click', () => this.copyToClipboard());
        }
        
        // Print button
        if (this.elements.printBtn) {
            this.elements.printBtn.addEventListener('click', () => this.printReport());
        }
        
        // Export dropdown
        if (this.elements.exportBtn) {
            this.elements.exportBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleExportMenu();
            });
        }
        
        // Export options
        this.elements.exportOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const format = e.target.dataset.format;
                this.exportReport(format);
                this.hideExportMenu();
            });
        });
        
        // Close export menu when clicking outside
        document.addEventListener('click', () => {
            this.hideExportMenu();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'c':
                        if (e.target.closest('.simple-report-wrapper')) {
                            e.preventDefault();
                            this.copyToClipboard();
                        }
                        break;
                    case 'p':
                        if (e.target.closest('.simple-report-wrapper')) {
                            e.preventDefault();
                            this.printReport();
                        }
                        break;
                }
            }
        });
        
        // Set up smooth scrolling for anchor links
        this.setupSmoothScrolling();
    }

    /**
     * Set up smooth scrolling for navigation links
     */
    setupSmoothScrolling() {
        // Enable smooth scrolling behavior
        if (this.container) {
            this.container.addEventListener('click', (e) => {
                const link = e.target.closest('a[href^="#"]');
                if (link) {
                    e.preventDefault();
                    const targetId = link.getAttribute('href').substring(1);
                    const targetElement = document.getElementById(targetId);
                    
                    if (targetElement) {
                        this.smoothScrollToElement(targetElement);
                        
                        // Update URL hash without jumping
                        if (history.pushState) {
                            history.pushState(null, null, `#${targetId}`);
                        }
                        
                        // Focus the target element for accessibility
                        targetElement.focus({ preventScroll: true });
                    }
                }
            });
        }
        
        // Handle initial hash navigation on page load
        if (window.location.hash) {
            setTimeout(() => {
                const targetId = window.location.hash.substring(1);
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    this.smoothScrollToElement(targetElement);
                }
            }, 100);
        }
    }

    /**
     * Smooth scroll to a specific element
     * @param {Element} element - Target element to scroll to
     */
    smoothScrollToElement(element) {
        const headerOffset = 80; // Account for any fixed headers
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
    
    /**
     * Set up responsive design
     */
    setupResponsiveDesign() {
        if (!this.options.enableResponsive) return;
        
        // Handle window resize
        const handleResize = () => {
            this.adjustForScreenSize();
        };
        
        window.addEventListener('resize', handleResize);
        this.adjustForScreenSize();
    }
    
    /**
     * Adjust layout for screen size
     */
    adjustForScreenSize() {
        const wrapper = this.elements.wrapper;
        if (!wrapper) return;
        
        const screenWidth = window.innerWidth;
        
        if (screenWidth < 768) {
            wrapper.classList.add('mobile-layout');
        } else {
            wrapper.classList.remove('mobile-layout');
        }
    }
    
    /**
     * Set content to display
     * @param {string} content - The report content to display
     * @param {Object} metadata - Optional metadata about the report
     */
    setContent(content, metadata = {}) {
        try {
            if (!this.isInitialized) {
                console.warn('SimpleReportRenderer not initialized, attempting to initialize...');
                this.init();
            }
            
            // Validate and sanitize content
            this.content = this.sanitizeContent(content || '');
            this.originalContent = this.content;
            
            // Update display
            this.updateContentDisplay();
            
            // Update metadata
            this.updateMetadata(metadata);
            
            // Show success message
            this.showStatus('レポートが正常に表示されました', 'success');
            
            console.log('Content set successfully in SimpleReportRenderer');
        } catch (error) {
            console.error('Error setting content:', error);
            this.showFallbackError(error);
        }
    }
    
    /**
     * Sanitize content to prevent XSS and ensure proper display
     * @param {string} content - Raw content
     * @returns {string} - Sanitized content
     */
    sanitizeContent(content) {
        if (typeof content !== 'string') {
            content = String(content || '');
        }
        
        // Limit content length to prevent memory issues
        if (content.length > this.options.maxContentLength) {
            content = content.substring(0, this.options.maxContentLength) + '\n\n[内容が長すぎるため切り詰められました]';
        }
        
        // Basic HTML escaping for security
        content = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        
        return content;
    }
    
    /**
     * Update the content display
     */
    updateContentDisplay() {
        if (!this.elements.content) return;
        
        // Apply basic markdown-like formatting
        const formattedContent = this.applyBasicFormatting(this.content);
        this.elements.content.innerHTML = formattedContent;
    }    
  
  /**
     * Apply basic formatting to content (simple markdown-like)
     * @param {string} content - Raw content
     * @returns {string} - Formatted HTML content
     */
    applyBasicFormatting(content) {
        // First, extract and process headers for navigation
        const headers = this.extractHeaders(content);
        
        let formattedContent = content
            // Headers with anchor links and improved hierarchy
            .replace(/^#### (.*$)/gm, (match, title) => {
                const id = this.generateHeaderId(title);
                return `<h4 id="${id}" class="report-header report-h4">${title}<a href="#${id}" class="header-anchor" aria-label="このセクションへのリンク">#</a></h4>`;
            })
            .replace(/^### (.*$)/gm, (match, title) => {
                const id = this.generateHeaderId(title);
                return `<h3 id="${id}" class="report-header report-h3">${title}<a href="#${id}" class="header-anchor" aria-label="このセクションへのリンク">#</a></h3>`;
            })
            .replace(/^## (.*$)/gm, (match, title) => {
                const id = this.generateHeaderId(title);
                return `<h2 id="${id}" class="report-header report-h2">${title}<a href="#${id}" class="header-anchor" aria-label="このセクションへのリンク">#</a></h2>`;
            })
            .replace(/^# (.*$)/gm, (match, title) => {
                const id = this.generateHeaderId(title);
                return `<h1 id="${id}" class="report-header report-h1">${title}<a href="#${id}" class="header-anchor" aria-label="このセクションへのリンク">#</a></h1>`;
            })
            // Bold and italic
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Lists with better structure
            .replace(/^\* (.*$)/gm, '<li class="report-list-item">$1</li>')
            .replace(/^- (.*$)/gm, '<li class="report-list-item">$1</li>')
            // Numbered lists
            .replace(/^\d+\. (.*$)/gm, '<li class="report-list-item numbered">$1</li>')
            // Wrap consecutive list items in ul/ol tags
            .replace(/(<li class="report-list-item">.*?<\/li>)/gs, (match) => {
                return '<ul class="report-list">' + match + '</ul>';
            })
            .replace(/(<li class="report-list-item numbered">.*?<\/li>)/gs, (match) => {
                return '<ol class="report-list numbered">' + match.replace(/numbered"/g, '"') + '</ol>';
            })
            // Paragraphs with better spacing
            .replace(/\n\n/g, '</p><p class="report-paragraph">')
            .replace(/^(.*)$/gm, (match, line) => {
                if (line.trim() && !line.includes('<h') && !line.includes('<li') && !line.includes('<ul') && !line.includes('<ol')) {
                    return '<p class="report-paragraph">' + line + '</p>';
                }
                return line;
            })
            // Clean up empty paragraphs
            .replace(/<p class="report-paragraph"><\/p>/g, '')
            .replace(/<p class="report-paragraph">(<[^>]+>)<\/p>/g, '$1');

        // Add table of contents if there are multiple headers
        if (headers.length > 2) {
            const toc = this.generateTableOfContents(headers);
            formattedContent = toc + formattedContent;
        }

        return formattedContent;
    }

    /**
     * Extract headers from content for navigation
     * @param {string} content - Raw content
     * @returns {Array} - Array of header objects
     */
    extractHeaders(content) {
        const headers = [];
        const headerRegex = /^(#{1,4})\s+(.*)$/gm;
        let match;
        
        while ((match = headerRegex.exec(content)) !== null) {
            const level = match[1].length;
            const title = match[2].trim();
            const id = this.generateHeaderId(title);
            
            headers.push({
                level,
                title,
                id,
                anchor: `#${id}`
            });
        }
        
        return headers;
    }

    /**
     * Generate a unique ID for a header
     * @param {string} title - Header title
     * @returns {string} - Generated ID
     */
    generateHeaderId(title) {
        return title
            .toLowerCase()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single
            .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
            .substring(0, 50) // Limit length
            || 'section'; // Fallback if empty
    }

    /**
     * Generate table of contents HTML
     * @param {Array} headers - Array of header objects
     * @returns {string} - TOC HTML
     */
    generateTableOfContents(headers) {
        if (headers.length === 0) return '';
        
        let tocHtml = '<div class="table-of-contents">';
        tocHtml += '<h3 class="toc-title">目次</h3>';
        tocHtml += '<nav class="toc-nav" role="navigation" aria-label="目次">';
        tocHtml += '<ul class="toc-list">';
        
        headers.forEach(header => {
            const indent = header.level > 1 ? ` toc-level-${header.level}` : '';
            tocHtml += `<li class="toc-item${indent}">`;
            tocHtml += `<a href="${header.anchor}" class="toc-link" data-level="${header.level}">${header.title}</a>`;
            tocHtml += '</li>';
        });
        
        tocHtml += '</ul>';
        tocHtml += '</nav>';
        tocHtml += '</div>';
        
        return tocHtml;
    }    
    
/**
     * Update metadata display
     * @param {Object} metadata - Report metadata
     */
    updateMetadata(metadata = {}) {
        // Word count
        if (this.options.showWordCount && this.elements.wordCount) {
            const wordCount = this.getWordCount(this.content);
            this.elements.wordCount.textContent = `${wordCount.toLocaleString()}文字`;
            this.elements.wordCount.style.display = 'inline';
        }
        
        // Reading time
        if (this.options.showReadingTime && this.elements.readingTime) {
            const readingTime = this.getReadingTime(this.content);
            this.elements.readingTime.textContent = `読了時間: ${readingTime}分`;
            this.elements.readingTime.style.display = 'inline';
        }
        
        // Generation time
        if (this.elements.generationTime) {
            const now = new Date();
            this.elements.generationTime.textContent = `生成時刻: ${now.toLocaleTimeString('ja-JP')}`;
        }
    }
    
    /**
     * Get word count for content
     * @param {string} content - Content to count
     * @returns {number} - Word count
     */
    getWordCount(content) {
        // For Japanese text, count characters instead of words
        return content.replace(/\s/g, '').length;
    }
    
    /**
     * Get estimated reading time
     * @param {string} content - Content to analyze
     * @returns {number} - Reading time in minutes
     */
    getReadingTime(content) {
        const charCount = this.getWordCount(content);
        // Average Japanese reading speed: ~500 characters per minute
        return Math.max(1, Math.ceil(charCount / 500));
    }
    
    /**
     * Copy content to clipboard
     */
    async copyToClipboard() {
        try {
            await navigator.clipboard.writeText(this.originalContent);
            this.showStatus('クリップボードにコピーしました', 'success');
        } catch (error) {
            console.error('Copy failed:', error);
            // Fallback for older browsers
            this.fallbackCopyToClipboard();
        }
    }
    
    /**
     * Fallback copy method for older browsers
     */
    fallbackCopyToClipboard() {
        try {
            const textArea = document.createElement('textarea');
            textArea.value = this.originalContent;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showStatus('クリップボードにコピーしました', 'success');
        } catch (error) {
            console.error('Fallback copy failed:', error);
            this.showStatus('コピーに失敗しました', 'error');
        }
    }
    
    /**
     * Print the report
     */
    printReport() {
        try {
            // Create a print-friendly version
            const printWindow = window.open('', '_blank');
            const printContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>レポート印刷</title>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            line-height: 1.6;
                            color: #333;
                            max-width: 800px;
                            margin: 0 auto;
                            padding: 20px;
                        }
                        h1, h2, h3, h4, h5, h6 {
                            margin: 24px 0 12px 0;
                            font-weight: 600;
                        }
                        p { margin: 12px 0; }
                        ul, ol { margin: 12px 0; padding-left: 24px; }
                        li { margin: 4px 0; }
                        @page { margin: 2cm; }
                    </style>
                </head>
                <body>
                    ${this.elements.content.innerHTML}
                </body>
                </html>
            `;
            
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
            printWindow.close();
            
            this.showStatus('印刷ダイアログを開きました', 'success');
        } catch (error) {
            console.error('Print failed:', error);
            this.showStatus('印刷に失敗しました', 'error');
        }
    }
    
    /**
     * Toggle export menu visibility
     */
    toggleExportMenu() {
        if (this.elements.exportMenu) {
            this.elements.exportMenu.classList.toggle('show');
        }
    }
    
    /**
     * Hide export menu
     */
    hideExportMenu() {
        if (this.elements.exportMenu) {
            this.elements.exportMenu.classList.remove('show');
        }
    }
    
    /**
     * Export report in specified format
     * @param {string} format - Export format (txt, md, pdf, rtf)
     */
    exportReport(format) {
        try {
            switch (format) {
                case 'txt':
                    this.exportAsText();
                    break;
                case 'md':
                    this.exportAsMarkdown();
                    break;
                case 'pdf':
                    this.exportAsPDF();
                    break;
                case 'rtf':
                    this.exportAsRTF();
                    break;
                default:
                    throw new Error(`Unsupported export format: ${format}`);
            }
        } catch (error) {
            console.error('Export failed:', error);
            this.showStatus(`${format.toUpperCase()}エクスポートに失敗しました`, 'error');
        }
    }
    
    /**
     * Export as plain text
     */
    exportAsText() {
        const blob = new Blob([this.originalContent], { type: 'text/plain;charset=utf-8' });
        this.downloadBlob(blob, 'report.txt');
        this.showStatus('テキストファイルをダウンロードしました', 'success');
    }
    
    /**
     * Export as markdown
     */
    exportAsMarkdown() {
        const blob = new Blob([this.originalContent], { type: 'text/markdown;charset=utf-8' });
        this.downloadBlob(blob, 'report.md');
        this.showStatus('Markdownファイルをダウンロードしました', 'success');
    }
    
    /**
     * Export as PDF using browser print
     */
    exportAsPDF() {
        // Use browser's print to PDF functionality
        this.printReport();
        this.showStatus('印刷ダイアログからPDFとして保存してください', 'success');
    }
    
    /**
     * Export as RTF (Rich Text Format)
     */
    exportAsRTF() {
        // Convert to basic RTF format
        const rtfContent = this.convertToRTF(this.originalContent);
        const blob = new Blob([rtfContent], { type: 'application/rtf;charset=utf-8' });
        this.downloadBlob(blob, 'report.rtf');
        this.showStatus('RTFファイルをダウンロードしました', 'success');
    }
    
    /**
     * Convert content to RTF format
     * @param {string} content - Plain text content
     * @returns {string} - RTF formatted content
     */
    convertToRTF(content) {
        // Basic RTF conversion
        const rtfHeader = '{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}';
        const rtfFooter = '}';
        
        // Escape RTF special characters
        const escapedContent = content
            .replace(/\\/g, '\\\\')
            .replace(/\{/g, '\\{')
            .replace(/\}/g, '\\}')
            .replace(/\n/g, '\\par\n');
        
        return `${rtfHeader}\\f0\\fs24 ${escapedContent}${rtfFooter}`;
    }
    
    /**
     * Download blob as file
     * @param {Blob} blob - File blob
     * @param {string} filename - File name
     */
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    /**
     * Show status message
     * @param {string} message - Status message
     * @param {string} type - Message type (success, error, info)
     */
    showStatus(message, type = 'info') {
        if (this.elements.statusMessage) {
            this.elements.statusMessage.textContent = message;
            this.elements.statusMessage.className = `status-message ${type}`;
            
            // Clear message after 3 seconds
            setTimeout(() => {
                if (this.elements.statusMessage) {
                    this.elements.statusMessage.textContent = '';
                    this.elements.statusMessage.className = 'status-message';
                }
            }, 3000);
        }
    }
    
    /**
     * Show fallback error display when everything else fails
     * @param {Error} error - The error that occurred
     */
    showFallbackError(error) {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div style="
                padding: 20px;
                background: #fef2f2;
                border: 1px solid #fecaca;
                border-radius: 8px;
                color: #991b1b;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">
                <h3 style="margin: 0 0 12px 0; color: #991b1b;">レポート表示エラー</h3>
                <p style="margin: 0 0 12px 0;">レポートの表示中にエラーが発生しました。</p>
                <details style="margin-top: 12px;">
                    <summary style="cursor: pointer; font-weight: 600;">技術的な詳細</summary>
                    <pre style="
                        margin: 8px 0 0 0;
                        padding: 8px;
                        background: white;
                        border: 1px solid #fecaca;
                        border-radius: 4px;
                        font-size: 12px;
                        overflow-x: auto;
                    ">${error.message || error}</pre>
                </details>
            </div>
        `;
    }
    
    /**
     * Clear all content and reset the renderer
     */
    clear() {
        this.content = '';
        this.originalContent = '';
        
        if (this.elements.content) {
            this.elements.content.innerHTML = '<p style="color: #6b7280; font-style: italic;">レポート内容がここに表示されます...</p>';
        }
        
        if (this.elements.wordCount) {
            this.elements.wordCount.style.display = 'none';
        }
        
        if (this.elements.readingTime) {
            this.elements.readingTime.style.display = 'none';
        }
        
        this.showStatus('');
    }
    
    /**
     * Destroy the renderer and clean up resources
     */
    destroy() {
        // Remove event listeners
        // (Event listeners are automatically removed when elements are removed from DOM)
        
        // Clear container
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        // Reset state
        this.isInitialized = false;
        this.content = '';
        this.originalContent = '';
        this.elements = {};
        
        console.log('Simple Report Renderer destroyed');
    }
}

// Make available globally
window.SimpleReportRenderer = SimpleReportRenderer;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SimpleReportRenderer;
}