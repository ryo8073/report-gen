/**
 * Header and Footer Management System
 * Implements header/footer functionality for business documents
 * Supports company logo, automatic page numbering, and date insertion
 * Implements requirements 2.3, 3.2, 3.3 for professional document formatting
 */

class HeaderFooterManager {
    constructor(options = {}) {
        this.options = {
            enableLogo: true,
            enablePageNumbers: true,
            enableDateInsertion: true,
            defaultHeaderText: '',
            defaultFooterText: '',
            logoMaxWidth: 120,
            logoMaxHeight: 40,
            dateFormat: 'YYYY年MM月DD日',
            ...options
        };
        
        this.state = {
            headerText: this.options.defaultHeaderText,
            footerText: this.options.defaultFooterText,
            logoFile: null,
            logoDataUrl: null,
            showPageNumbers: true,
            showDate: true,
            headerPosition: 'left', // 'left', 'center', 'right'
            footerPosition: 'center'
        };
        
        this.listeners = {
            headerChange: [],
            footerChange: [],
            logoChange: []
        };
        
        this.init();
    }
    
    /**
     * Initialize the header/footer manager
     */
    init() {
        try {
            this.setupEventListeners();
            this.loadSavedSettings();
            console.log('Header/Footer Manager initialized');
        } catch (error) {
            console.error('Header/Footer Manager initialization error:', error);
        }
    }
    
    /**
     * Set up event listeners for header/footer controls
     */
    setupEventListeners() {
        // Header text input
        const headerTextInput = document.getElementById('headerText');
        if (headerTextInput) {
            headerTextInput.addEventListener('input', (e) => {
                this.setHeaderText(e.target.value);
            });
            
            headerTextInput.addEventListener('blur', () => {
                this.saveSettings();
            });
        }
        
        // Footer text input
        const footerTextInput = document.getElementById('footerText');
        if (footerTextInput) {
            footerTextInput.addEventListener('input', (e) => {
                this.setFooterText(e.target.value);
            });
            
            footerTextInput.addEventListener('blur', () => {
                this.saveSettings();
            });
        }
        
        // Logo upload button
        const headerLogoBtn = document.getElementById('headerLogoBtn');
        if (headerLogoBtn) {
            headerLogoBtn.addEventListener('click', () => {
                this.openLogoUpload();
            });
        }
        
        // Page numbers checkbox
        const showPageNumbers = document.getElementById('showPageNumbers');
        if (showPageNumbers) {
            showPageNumbers.addEventListener('change', (e) => {
                this.setShowPageNumbers(e.target.checked);
            });
        }
        
        // Date display checkbox
        const showDate = document.getElementById('showDate');
        if (showDate) {
            showDate.addEventListener('change', (e) => {
                this.setShowDate(e.target.checked);
            });
        }
    }
    
    /**
     * Set header text
     */
    setHeaderText(text) {
        this.state.headerText = text || '';
        this.emit('headerChange', {
            text: this.state.headerText,
            timestamp: new Date().toISOString()
        });
        
        // Update preview if visible
        this.updatePreview();
    }
    
    /**
     * Set footer text
     */
    setFooterText(text) {
        this.state.footerText = text || '';
        this.emit('footerChange', {
            text: this.state.footerText,
            timestamp: new Date().toISOString()
        });
        
        // Update preview if visible
        this.updatePreview();
    }
    
    /**
     * Set page numbers visibility
     */
    setShowPageNumbers(show) {
        this.state.showPageNumbers = show;
        this.saveSettings();
        this.updatePreview();
    }
    
    /**
     * Set date display visibility
     */
    setShowDate(show) {
        this.state.showDate = show;
        this.saveSettings();
        this.updatePreview();
    }
    
    /**
     * Open logo upload dialog
     */
    openLogoUpload() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleLogoUpload(file);
            }
        });
        
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    }
    
    /**
     * Handle logo file upload
     */
    async handleLogoUpload(file) {
        try {
            // Validate file
            if (!file.type.startsWith('image/')) {
                throw new Error('画像ファイルを選択してください');
            }
            
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                throw new Error('ファイルサイズは2MB以下にしてください');
            }
            
            // Read file as data URL
            const dataUrl = await this.readFileAsDataUrl(file);
            
            // Resize image if needed
            const resizedDataUrl = await this.resizeImage(dataUrl, this.options.logoMaxWidth, this.options.logoMaxHeight);
            
            // Update state
            this.state.logoFile = file;
            this.state.logoDataUrl = resizedDataUrl;
            
            // Update UI
            this.updateLogoButton();
            
            // Save settings
            this.saveSettings();
            
            // Emit change event
            this.emit('logoChange', {
                file: file,
                dataUrl: resizedDataUrl,
                timestamp: new Date().toISOString()
            });
            
            // Update preview
            this.updatePreview();
            
            console.log('Logo uploaded successfully:', file.name);
            
        } catch (error) {
            console.error('Logo upload error:', error);
            this.showError('ロゴのアップロードに失敗しました: ' + error.message);
        }
    }
    
    /**
     * Read file as data URL
     */
    readFileAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('ファイルの読み込みに失敗しました'));
            reader.readAsDataURL(file);
        });
    }
    
    /**
     * Resize image to fit within max dimensions
     */
    resizeImage(dataUrl, maxWidth, maxHeight) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calculate new dimensions
                let { width, height } = img;
                
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width *= ratio;
                    height *= ratio;
                }
                
                // Set canvas size and draw image
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to data URL
                resolve(canvas.toDataURL('image/png', 0.9));
            };
            img.src = dataUrl;
        });
    }
    
    /**
     * Update logo button appearance
     */
    updateLogoButton() {
        const logoBtn = document.getElementById('headerLogoBtn');
        if (!logoBtn) return;
        
        if (this.state.logoDataUrl) {
            logoBtn.innerHTML = '✓ ロゴ設定済み';
            logoBtn.style.background = '#dcfce7';
            logoBtn.style.color = '#166534';
            logoBtn.title = 'クリックしてロゴを変更';
        } else {
            logoBtn.innerHTML = '📷 ロゴ';
            logoBtn.style.background = '#f3f4f6';
            logoBtn.style.color = '#374151';
            logoBtn.title = 'クリックしてロゴをアップロード';
        }
    }
    
    /**
     * Generate header HTML
     */
    generateHeaderHTML(options = {}) {
        const {
            includeInPreview = false,
            pageNumber = 1,
            totalPages = 1
        } = options;
        
        let headerContent = '';
        
        // Logo section
        if (this.state.logoDataUrl && this.options.enableLogo) {
            headerContent += `
                <div class="header-logo">
                    <img src="${this.state.logoDataUrl}" alt="Company Logo" style="max-height: ${this.options.logoMaxHeight}px; max-width: ${this.options.logoMaxWidth}px;">
                </div>
            `;
        }
        
        // Header text section
        if (this.state.headerText) {
            headerContent += `
                <div class="header-text">
                    <h1 class="document-title">${this.escapeHtml(this.state.headerText)}</h1>
                </div>
            `;
        }
        
        // Date section
        if (this.state.showDate && this.options.enableDateInsertion) {
            const currentDate = this.formatDate(new Date());
            headerContent += `
                <div class="header-date">
                    <span class="document-date">${currentDate}</span>
                </div>
            `;
        }
        
        if (!headerContent) return '';
        
        return `
            <div class="document-header ${includeInPreview ? 'preview-header' : 'print-header'}">
                <div class="header-content">
                    ${headerContent}
                </div>
            </div>
        `;
    }
    
    /**
     * Generate footer HTML
     */
    generateFooterHTML(options = {}) {
        const {
            includeInPreview = false,
            pageNumber = 1,
            totalPages = 1
        } = options;
        
        let footerContent = '';
        
        // Footer text section
        if (this.state.footerText) {
            footerContent += `
                <div class="footer-text">
                    <span class="footer-info">${this.escapeHtml(this.state.footerText)}</span>
                </div>
            `;
        }
        
        // Page numbers section
        if (this.state.showPageNumbers && this.options.enablePageNumbers) {
            footerContent += `
                <div class="footer-page-numbers">
                    <span class="page-number">ページ ${pageNumber} / ${totalPages}</span>
                </div>
            `;
        }
        
        if (!footerContent) return '';
        
        return `
            <div class="document-footer ${includeInPreview ? 'preview-footer' : 'print-footer'}">
                <div class="footer-content">
                    ${footerContent}
                </div>
            </div>
        `;
    }
    
    /**
     * Generate CSS for headers and footers
     */
    generateHeaderFooterCSS() {
        return `
            /* Document Header Styles */
            .document-header {
                border-bottom: 2px solid #e5e7eb;
                padding: 16px 0;
                margin-bottom: 24px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                min-height: 60px;
            }
            
            .header-content {
                display: flex;
                align-items: center;
                justify-content: space-between;
                width: 100%;
                gap: 16px;
            }
            
            .header-logo img {
                display: block;
                height: auto;
            }
            
            .header-text {
                flex: 1;
                text-align: center;
            }
            
            .document-title {
                font-size: 24px;
                font-weight: 700;
                color: #1f2937;
                margin: 0;
                line-height: 1.2;
            }
            
            .header-date {
                text-align: right;
                min-width: 120px;
            }
            
            .document-date {
                font-size: 14px;
                color: #6b7280;
                font-weight: 500;
            }
            
            /* Document Footer Styles */
            .document-footer {
                border-top: 1px solid #e5e7eb;
                padding: 16px 0;
                margin-top: 32px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                min-height: 40px;
            }
            
            .footer-content {
                display: flex;
                align-items: center;
                justify-content: space-between;
                width: 100%;
                gap: 16px;
            }
            
            .footer-text {
                flex: 1;
            }
            
            .footer-info {
                font-size: 12px;
                color: #6b7280;
                line-height: 1.4;
            }
            
            .footer-page-numbers {
                text-align: right;
            }
            
            .page-number {
                font-size: 12px;
                color: #6b7280;
                font-weight: 500;
            }
            
            /* Print-specific styles */
            @media print {
                .print-header {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    background: white;
                    z-index: 1000;
                }
                
                .print-footer {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: white;
                    z-index: 1000;
                }
                
                .document-content {
                    margin-top: 100px;
                    margin-bottom: 60px;
                }
            }
            
            /* Preview-specific styles */
            .preview-header {
                background: #f9fafb;
                border-radius: 8px 8px 0 0;
            }
            
            .preview-footer {
                background: #f9fafb;
                border-radius: 0 0 8px 8px;
            }
            
            /* Responsive adjustments */
            @media (max-width: 768px) {
                .header-content,
                .footer-content {
                    flex-direction: column;
                    text-align: center;
                    gap: 8px;
                }
                
                .header-date,
                .footer-page-numbers {
                    text-align: center;
                    min-width: auto;
                }
                
                .document-title {
                    font-size: 20px;
                }
            }
        `;
    }
    
    /**
     * Update preview with header/footer
     */
    updatePreview() {
        // Find preview containers
        const previewContainers = document.querySelectorAll('#preview-content, #split-preview-content, .report-preview');
        
        previewContainers.forEach(container => {
            if (!container) return;
            
            // Remove existing headers/footers
            const existingHeaders = container.querySelectorAll('.document-header');
            const existingFooters = container.querySelectorAll('.document-footer');
            existingHeaders.forEach(el => el.remove());
            existingFooters.forEach(el => el.remove());
            
            // Add new header
            const headerHTML = this.generateHeaderHTML({ includeInPreview: true });
            if (headerHTML) {
                container.insertAdjacentHTML('afterbegin', headerHTML);
            }
            
            // Add new footer
            const footerHTML = this.generateFooterHTML({ includeInPreview: true });
            if (footerHTML) {
                container.insertAdjacentHTML('beforeend', footerHTML);
            }
        });
        
        // Inject CSS if not already present
        this.injectHeaderFooterCSS();
    }
    
    /**
     * Inject header/footer CSS
     */
    injectHeaderFooterCSS() {
        const existingStyle = document.getElementById('header-footer-styles');
        if (existingStyle) return;
        
        const style = document.createElement('style');
        style.id = 'header-footer-styles';
        style.textContent = this.generateHeaderFooterCSS();
        document.head.appendChild(style);
    }
    
    /**
     * Format date according to options
     */
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return this.options.dateFormat
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day);
    }
    
    /**
     * Escape HTML characters
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Save settings to localStorage
     */
    saveSettings() {
        try {
            const settings = {
                headerText: this.state.headerText,
                footerText: this.state.footerText,
                logoDataUrl: this.state.logoDataUrl,
                showPageNumbers: this.state.showPageNumbers,
                showDate: this.state.showDate,
                headerPosition: this.state.headerPosition,
                footerPosition: this.state.footerPosition
            };
            
            localStorage.setItem('headerFooterSettings', JSON.stringify(settings));
        } catch (error) {
            console.error('Failed to save header/footer settings:', error);
        }
    }
    
    /**
     * Load saved settings from localStorage
     */
    loadSavedSettings() {
        try {
            const saved = localStorage.getItem('headerFooterSettings');
            if (!saved) return;
            
            const settings = JSON.parse(saved);
            
            // Update state
            this.state = { ...this.state, ...settings };
            
            // Update UI elements
            const headerTextInput = document.getElementById('headerText');
            if (headerTextInput) {
                headerTextInput.value = this.state.headerText;
            }
            
            const footerTextInput = document.getElementById('footerText');
            if (footerTextInput) {
                footerTextInput.value = this.state.footerText;
            }
            
            const showPageNumbers = document.getElementById('showPageNumbers');
            if (showPageNumbers) {
                showPageNumbers.checked = this.state.showPageNumbers;
            }
            
            const showDate = document.getElementById('showDate');
            if (showDate) {
                showDate.checked = this.state.showDate;
            }
            
            // Update logo button
            this.updateLogoButton();
            
        } catch (error) {
            console.error('Failed to load header/footer settings:', error);
        }
    }
    
    /**
     * Get current header/footer data for export
     */
    getExportData() {
        return {
            headerHTML: this.generateHeaderHTML({ includeInPreview: false }),
            footerHTML: this.generateFooterHTML({ includeInPreview: false }),
            css: this.generateHeaderFooterCSS(),
            settings: { ...this.state }
        };
    }
    
    /**
     * Show error message
     */
    showError(message) {
        // Try to use existing error handler
        if (window.errorHandler && window.errorHandler.showNotification) {
            window.errorHandler.showNotification(message, 'error');
        } else {
            alert(message);
        }
    }
    
    /**
     * Event listener management
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
        return () => this.off(event, callback);
    }
    
    off(event, callback) {
        if (!this.listeners[event]) return;
        const index = this.listeners[event].indexOf(callback);
        if (index > -1) {
            this.listeners[event].splice(index, 1);
        }
    }
    
    emit(event, data) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('Error in HeaderFooterManager event listener:', error);
            }
        });
    }
    
    /**
     * Get current state
     */
    getState() {
        return { ...this.state };
    }
    
    /**
     * Reset to default state
     */
    reset() {
        this.state = {
            headerText: this.options.defaultHeaderText,
            footerText: this.options.defaultFooterText,
            logoFile: null,
            logoDataUrl: null,
            showPageNumbers: true,
            showDate: true,
            headerPosition: 'left',
            footerPosition: 'center'
        };
        
        // Update UI
        this.loadSavedSettings();
        this.updatePreview();
        
        // Clear saved settings
        localStorage.removeItem('headerFooterSettings');
    }
    
    /**
     * Destroy the component and clean up
     */
    destroy() {
        // Clear listeners
        Object.keys(this.listeners).forEach(event => {
            this.listeners[event] = [];
        });
        
        // Remove injected CSS
        const style = document.getElementById('header-footer-styles');
        if (style) {
            style.remove();
        }
        
        console.log('Header/Footer Manager destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HeaderFooterManager;
} else {
    window.HeaderFooterManager = HeaderFooterManager;
}