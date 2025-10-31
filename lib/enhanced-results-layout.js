/**
 * Simple Tiptap WYSIWYG Editor Layout
 * Implements a single, Word-like WYSIWYG editor using TiptapEditorClean
 * Similar to test-tiptap-editor.html implementation
 */

class EnhancedResultsLayout {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            enablePDFExport: true,
            enableAutoSave: true,
            autoSaveInterval: 5000,
            ...options
        };
        
        this.content = '';
        this.contentEditor = null; // TiptapEditorClean instance
        
        // Component instances
        this.pdfExportManager = null;
        
        // State management
        this.isDirty = false;
        this.lastSaved = null;
        this.autoSaveTimer = null;
        
        // Event listeners
        this.listeners = {
            contentChange: [],
            save: [],
            export: []
        };
        
        this.init();
    }
    
    /**
     * Initialize the enhanced results layout
     */
    init() {
        try {
            // Initialize components
            this.initializeComponents();
            
            // Create the layout structure
            this.createLayoutStructure();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Note: Tiptap editor will be initialized when setContent() is called
            // This ensures the editor is ready before content is set
            
            console.log('Simple Tiptap WYSIWYG Editor layout ready');
        } catch (error) {
            console.error('Enhanced Results Layout initialization error:', error);
            this.showError('結果表示レイアウトの初期化に失敗しました');
        }
    }
    
    /**
     * Initialize component dependencies
     */
    initializeComponents() {
        // Initialize PDF Export Manager (for PDF export functionality)
        if (typeof PDFExportManager !== 'undefined' && this.options.enablePDFExport) {
            this.pdfExportManager = new PDFExportManager({
                defaultFilename: 'report',
                businessFormatting: false
            });
        }
    }
    
    /**
     * Create the layout structure - Simple Tiptap WYSIWYG Editor only
     */
    createLayoutStructure() {
        this.container.innerHTML = `
            <div class="enhanced-results-layout simple-editor-layout">
                <!-- Header with title and actions -->
                <div class="results-header">
                    <div class="results-title-section">
                        <h2 class="results-title">生成されたレポート</h2>
                        <div class="results-status" id="results-status">
                            <span class="status-indicator" id="status-indicator"></span>
                            <span class="status-text" id="status-text">準備完了</span>
                        </div>
                    </div>
                    
                    <div class="results-actions">
                        <button id="copyBtn" class="btn btn-secondary" title="内容をクリップボードにコピー">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            コピー
                        </button>
                        <button id="downloadBtn" class="btn btn-secondary" title="Markdownファイルとしてダウンロード">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7,10 12,15 17,10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            ダウンロード
                        </button>
                        <button id="exportPdfBtn" class="btn btn-primary business-export-btn" title="PDFとして出力">
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
                
                <!-- Tiptap WYSIWYG Editor Container (Word-like) -->
                <div class="editor-container-wrapper">
                    <div id="content-editor-container" class="tiptap-editor-wrapper"></div>
                </div>
                
                <!-- Status Bar -->
                <div class="content-status-bar" id="content-status">
                    <div class="status-info">
                        <span class="word-count" id="word-count">文字数: 0</span>
                        <span class="last-saved" id="last-saved"></span>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Action buttons only (copy, download, PDF export)
        this.setupActionButtonListeners();
        
        // Keyboard shortcuts
        this.setupKeyboardShortcuts();
    }
    
    /**
     * Set up format control listeners
     */
    setupFormatControlListeners() {
        const fontSizeSelect = this.container.querySelector('#font-size-select');
        const lineHeightSelect = this.container.querySelector('#line-height-select');
        const themeSelect = this.container.querySelector('#theme-select');
        const businessToggle = this.container.querySelector('#business-format-toggle');
        const fullscreenToggle = this.container.querySelector('#fullscreen-toggle');
        
        if (fontSizeSelect) {
            fontSizeSelect.addEventListener('change', (e) => {
                this.updateFormatSetting('fontSize', e.target.value);
            });
        }
        
        if (lineHeightSelect) {
            lineHeightSelect.addEventListener('change', (e) => {
                this.updateFormatSetting('lineHeight', e.target.value);
            });
        }
        
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                this.updateFormatSetting('theme', e.target.value);
            });
        }
        
        if (businessToggle) {
            businessToggle.addEventListener('click', () => {
                this.toggleBusinessFormatting();
            });
        }
        
        if (fullscreenToggle) {
            fullscreenToggle.addEventListener('click', () => {
                this.toggleFullscreen();
            });
        }
    }
    
    /**
     * Set up content editing listeners
     */
    setupContentEditingListeners() {
        // Tiptap editors handle their own listeners via TiptapEditorClean
        // The toolbar in EnhancedResultsLayout is now legacy and can be removed
        // But we keep the structure for now to avoid breaking the UI
        
        // Note: TiptapEditorClean has its own comprehensive toolbar
        // The old toolbar buttons are kept for backward compatibility but may not work
        // Consider removing the old toolbar in favor of Tiptap's built-in toolbar
    }
    
    /**
     * Set up action button listeners
     */
    setupActionButtonListeners() {
        const copyBtn = this.container.querySelector('#copyBtn');
        const downloadBtn = this.container.querySelector('#downloadBtn');
        const exportPdfBtn = this.container.querySelector('#exportPdfBtn');
        
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyContent());
        }
        
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.downloadContent());
        }
        
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', () => this.exportToPDF());
        }
    }
    
    /**
     * Initialize Tiptap editor (single, simple WYSIWYG editor)
     * Similar to test-tiptap-editor.html implementation
     * This is called from setContent() to ensure proper initialization order
     */
    async initializeEditor() {
        const editorContainer = this.container.querySelector('#content-editor-container');
        if (!editorContainer) {
            console.warn('[EnhancedResultsLayout] Editor container not found');
            return false;
        }
        
        // Prevent duplicate initialization
        if (this.contentEditor) {
            console.log('[EnhancedResultsLayout] Editor already initialized');
            return true;
        }
        
        if (typeof TiptapEditorClean === 'undefined') {
            console.error('[EnhancedResultsLayout] TiptapEditorClean is not available');
            return false;
        }
        
        try {
            console.log('[EnhancedResultsLayout] Initializing TiptapEditorClean...');
            
            // Clear container first
            editorContainer.innerHTML = '';
            
            // Initialize TiptapEditorClean (similar to test-tiptap-editor.html)
            this.contentEditor = new TiptapEditorClean(editorContainer, {
                enableToolbar: true,
                enableAutoSave: this.options.enableAutoSave,
                autoSaveInterval: this.options.autoSaveInterval || 5000,
                placeholder: 'ここでレポートを編集してください...',
                onContentChange: (htmlContent, textContent) => {
                    // HTML content change
                    console.log('[EnhancedResultsLayout] Content changed (HTML length:', htmlContent.length, ', Text length:', textContent.length, ')');
                },
                onMarkdownChange: (markdownContent) => {
                    // Markdown content change - primary callback
                    console.log('[EnhancedResultsLayout] Markdown changed (length:', markdownContent.length, ')');
                    this.handleContentChange(markdownContent);
                },
                onAutoSave: (data) => {
                    // Auto-save callback
                    this.handleAutoSave(data.markdown || data.html);
                }
            });
            
            // Wait for editor to be ready
            await this.ensureEditorReady(this.contentEditor);
            
            console.log('[EnhancedResultsLayout] TiptapEditorClean initialized successfully');
            return true;
        } catch (error) {
            console.error('[EnhancedResultsLayout] Failed to initialize TiptapEditorClean:', error);
            console.error('[EnhancedResultsLayout] Error stack:', error.stack);
            this.contentEditor = null;
            return false;
        }
    }
    
    /**
     * Ensure editor is ready before setting content
     */
    async ensureEditorReady(editor) {
        if (!editor) return;
        
        // Wait for editor to be initialized
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        while (attempts < maxAttempts) {
            if (editor.isReady && editor.isReady()) {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        // If still not ready, wait a bit more and proceed anyway
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    /**
     * Handle auto-save
     */
    handleAutoSave(content) {
        this.lastSaved = new Date();
        this.isDirty = false;
        this.updateStatusIndicator();
        
        // Emit save event
        this.emit('save', {
            content: content,
            timestamp: this.lastSaved.toISOString()
        });
    }
    
    /**
     * Set content for the editor
     * This method ensures the editor is initialized before setting content
     * Important: This is called after AI generates the report, so timing is critical
     */
    async setContent(content, metadata = {}) {
        // Store content first (important for editor initialization callback)
        this.content = content || '';
        
        console.log('[EnhancedResultsLayout] setContent called, content length:', this.content.length);
        
        // Ensure editor is initialized before setting content
        if (!this.contentEditor) {
            console.log('[EnhancedResultsLayout] Editor not initialized yet, initializing now...');
            await this.initializeEditor();
        }
        
        // Wait for editor to be fully ready
        if (this.contentEditor) {
            try {
                await this.ensureEditorReady(this.contentEditor);
                
                // Set content in the editor
                if (typeof this.contentEditor.setContent === 'function') {
                    console.log('[EnhancedResultsLayout] Setting content in editor...');
                    this.contentEditor.setContent(this.content, 'markdown');
                    console.log('[EnhancedResultsLayout] Content set successfully');
                } else {
                    console.error('[EnhancedResultsLayout] Editor setContent method not available');
                }
            } catch (error) {
                console.error('[EnhancedResultsLayout] Error setting content in editor:', error);
            }
        } else {
            console.warn('[EnhancedResultsLayout] Editor initialization failed, content stored but not displayed');
        }
        
        // Update status
        this.updateContentStatus();
        
        // Mark as clean
        this.isDirty = false;
        
        console.log('[EnhancedResultsLayout] Content set complete:', this.content.length, 'characters');
    }
    
    /**
     * Handle content changes (simple, no view switching)
     */
    handleContentChange(newContent) {
        this.content = newContent;
        this.isDirty = true;
        
        // Update status
        this.updateContentStatus();
        
        // Auto-save if enabled
        if (this.options.enableAutoSave) {
            this.scheduleAutoSave();
        }
        
        // Emit content change event
        this.emit('contentChange', {
            content: newContent,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Update content status (word count, etc.)
     */
    updateContentStatus() {
        const wordCount = this.container.querySelector('#word-count');
        
        if (wordCount) {
            wordCount.textContent = `文字数: ${this.content.length}`;
        }
        
        // Update status indicator
        this.updateStatusIndicator();
    }
    
    /**
     * Update status indicator
     */
    updateStatusIndicator() {
        const statusIndicator = this.container.querySelector('#status-indicator');
        const statusText = this.container.querySelector('#status-text');
        
        if (this.isDirty) {
            statusIndicator.className = 'status-indicator status-modified';
            statusText.textContent = '変更あり';
        } else {
            statusIndicator.className = 'status-indicator status-saved';
            statusText.textContent = '保存済み';
        }
    }
    
    /**
     * Toggle business formatting
     */
    toggleBusinessFormatting() {
        this.isBusinessFormatting = !this.isBusinessFormatting;
        
        const toggleBtn = this.container.querySelector('#business-format-toggle');
        if (toggleBtn) {
            toggleBtn.classList.toggle('active', this.isBusinessFormatting);
            toggleBtn.title = this.isBusinessFormatting ? 'ビジネス書式を無効にする' : 'ビジネス書式を有効にする';
            
            // Update ARIA pressed state for accessibility
            if (toggleBtn.hasAttribute('aria-pressed')) {
                toggleBtn.setAttribute('aria-pressed', this.isBusinessFormatting.toString());
            }
        }
        
        // Update markdown renderer
        if (this.markdownRenderer) {
            this.markdownRenderer.setBusinessFormatting(this.isBusinessFormatting);
        }
        
        // Update PDF export manager
        if (this.pdfExportManager) {
            this.pdfExportManager.options.businessFormatting = this.isBusinessFormatting;
        }
        
        // Re-render content
        this.updatePreview();
        this.updateSplitPreview();
        
        // Emit format change event
        this.emit('formatChange', {
            type: 'businessFormatting',
            value: this.isBusinessFormatting,
            timestamp: new Date().toISOString()
        });
        
        console.log('Business formatting:', this.isBusinessFormatting ? 'enabled' : 'disabled');
    }
    
    /**
     * Update format setting
     */
    updateFormatSetting(setting, value) {
        this.formatSettings[setting] = value;
        
        // Apply to all content areas
        const contentAreas = this.container.querySelectorAll('.preview-content, .split-preview-content');
        contentAreas.forEach(area => {
            this.applyFormatSettings(area);
        });
        
        // Emit format change event
        this.emit('formatChange', {
            type: setting,
            value: value,
            timestamp: new Date().toISOString()
        });
        
        console.log(`Format setting updated: ${setting} = ${value}`);
    }
    
    /**
     * Apply format settings to content area
     */
    applyFormatSettings(contentArea) {
        if (!contentArea) return;
        
        const { fontSize, lineHeight, theme } = this.formatSettings;
        
        // Font size
        const fontSizeMap = {
            small: '12px',
            normal: '14px',
            large: '16px',
            xlarge: '18px'
        };
        contentArea.style.fontSize = fontSizeMap[fontSize] || '14px';
        
        // Line height
        const lineHeightMap = {
            tight: '1.4',
            normal: '1.6',
            relaxed: '1.8',
            loose: '2.0'
        };
        contentArea.style.lineHeight = lineHeightMap[lineHeight] || '1.6';
        
        // Theme
        contentArea.className = contentArea.className.replace(/theme-\w+/g, '');
        if (theme !== 'default') {
            contentArea.classList.add(`theme-${theme}`);
        }
    }
    
    /**
     * Copy content to clipboard
     * Copies the HTML-rendered content (as displayed) for rich text pasting
     */
    async copyContent() {
        try {
            // Get the latest content from the editor if available
            let markdownContent = this.content;
            if (this.contentEditor && typeof this.contentEditor.getMarkdown === 'function') {
                markdownContent = this.contentEditor.getMarkdown();
                console.log('[EnhancedResultsLayout] Copying content from editor (Markdown length:', markdownContent.length, ')');
            } else {
                console.log('[EnhancedResultsLayout] Copying content from stored content (Markdown length:', markdownContent.length, ')');
            }
            
            if (!markdownContent || markdownContent.trim().length === 0) {
                this.showFeedback('コピーするコンテンツがありません', 'error');
                return;
            }
            
            // Convert markdown to HTML (same as PDF export)
            const htmlContent = this.convertMarkdownToHTML(markdownContent);
            console.log('[EnhancedResultsLayout] HTML content length:', htmlContent.length);
            
            // Copy both HTML and plain text to clipboard
            // This allows rich text pasting (with formatting) in Word, Google Docs, etc.
            const clipboardItem = new ClipboardItem({
                'text/html': new Blob([htmlContent], { type: 'text/html' }),
                'text/plain': new Blob([markdownContent], { type: 'text/plain' })
            });
            
            await navigator.clipboard.write([clipboardItem]);
            this.showFeedback('コピーしました（リッチテキスト形式）', 'success');
        } catch (error) {
            console.error('[EnhancedResultsLayout] Copy failed:', error);
            // Fallback to plain text if ClipboardItem is not supported
            try {
                const markdownContent = this.contentEditor && typeof this.contentEditor.getMarkdown === 'function'
                    ? this.contentEditor.getMarkdown()
                    : this.content;
                await navigator.clipboard.writeText(markdownContent);
                this.showFeedback('コピーしました（テキスト形式）', 'success');
            } catch (fallbackError) {
                console.error('[EnhancedResultsLayout] Copy fallback failed:', fallbackError);
                this.showFeedback('コピーに失敗しました', 'error');
            }
        }
    }
    
    /**
     * Download content as markdown file
     * Gets the latest content from the editor
     */
    downloadContent() {
        try {
            // Get the latest content from the editor if available
            let contentToDownload = this.content;
            if (this.contentEditor && typeof this.contentEditor.getMarkdown === 'function') {
                contentToDownload = this.contentEditor.getMarkdown();
                console.log('[EnhancedResultsLayout] Downloading content from editor, length:', contentToDownload.length);
            } else {
                console.log('[EnhancedResultsLayout] Downloading content from stored content, length:', contentToDownload.length);
            }
            
            if (!contentToDownload || contentToDownload.trim().length === 0) {
                this.showFeedback('ダウンロードするコンテンツがありません', 'error');
                return;
            }
            
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const filename = `report_${timestamp}.md`;
            
            const blob = new Blob([contentToDownload], { type: 'text/markdown; charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none'; // Hide the link
            document.body.appendChild(a);
            
            // Use setTimeout to prevent double click events
            setTimeout(() => {
                a.click();
                // Clean up after a short delay
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
            }, 10);
            
            this.showFeedback('ダウンロードしました', 'success');
        } catch (error) {
            console.error('[EnhancedResultsLayout] Download failed:', error);
            this.showFeedback('ダウンロードに失敗しました', 'error');
        }
    }
    
    /**
     * Export content to PDF
     * Gets the latest content from the editor and converts to HTML
     */
    async exportToPDF() {
        if (!this.pdfExportManager) {
            this.showFeedback('PDF出力機能が利用できません', 'error');
            return;
        }
        
        const exportBtn = this.container.querySelector('#exportPdfBtn');
        if (!exportBtn) {
            console.error('[EnhancedResultsLayout] PDF export button not found');
            return;
        }
        
        const originalHTML = exportBtn.innerHTML;
        
        try {
            // Show loading state
            exportBtn.innerHTML = `
                <svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
                PDF出力中...
            `;
            exportBtn.disabled = true;
            
            // Get the latest content from the editor if available
            let contentForPDF = this.content;
            if (this.contentEditor && typeof this.contentEditor.getMarkdown === 'function') {
                contentForPDF = this.contentEditor.getMarkdown();
                console.log('[EnhancedResultsLayout] Exporting PDF from editor content, length:', contentForPDF.length);
            } else {
                console.log('[EnhancedResultsLayout] Exporting PDF from stored content, length:', contentForPDF.length);
            }
            
            if (!contentForPDF || contentForPDF.trim().length === 0) {
                this.showFeedback('PDF出力するコンテンツがありません', 'error');
                return;
            }
            
            // Convert markdown to HTML
            // Use simple markdown to HTML conversion
            let htmlContent = this.convertMarkdownToHTML(contentForPDF);
            
            // Export options
            const exportOptions = {
                title: 'レポート',
                businessFormatting: false,
                pageSize: 'A4',
                orientation: 'portrait',
                margins: 'normal',
                showPageNumbers: true,
                showDate: true
            };
            
            console.log('[EnhancedResultsLayout] Calling PDFExportManager.exportToPDF...');
            const success = await this.pdfExportManager.exportToPDF(htmlContent, exportOptions);
            
            if (success) {
                this.showFeedback('PDF出力が完了しました', 'success');
            } else {
                this.showFeedback('PDF出力に失敗しました', 'error');
            }
            
        } catch (error) {
            console.error('[EnhancedResultsLayout] PDF export error:', error);
            console.error('[EnhancedResultsLayout] PDF export error stack:', error.stack);
            this.showFeedback('PDF出力エラーが発生しました: ' + error.message, 'error');
        } finally {
            // Restore button state
            exportBtn.innerHTML = originalHTML;
            exportBtn.disabled = false;
        }
    }
    
    /**
     * Convert markdown to HTML (simple conversion)
     */
    convertMarkdownToHTML(markdown) {
        if (!markdown) return '';
        
        // Use MarkdownRenderer if available
        if (typeof MarkdownRenderer !== 'undefined') {
            try {
                const renderer = new MarkdownRenderer({ businessFormatting: false });
                return renderer.render(markdown, false);
            } catch (error) {
                console.warn('[EnhancedResultsLayout] MarkdownRenderer failed, using fallback:', error);
            }
        }
        
        // Simple fallback conversion
        let html = markdown;
        
        // Headers
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        
        // Bold
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Italic
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Lists
        html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
        html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
        html = html.replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>');
        
        // Wrap list items in ul or ol
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        
        // Paragraphs
        html = html.replace(/\n\n/g, '</p><p>');
        html = '<p>' + html + '</p>';
        
        // Line breaks
        html = html.replace(/\n/g, '<br>');
        
        return html;
    }
    
    /**
     * Show feedback message
     */
    showFeedback(message, type = 'info') {
        const statusText = this.container.querySelector('#status-text');
        if (statusText) {
            const originalText = statusText.textContent;
            statusText.textContent = message;
            statusText.className = `status-text status-${type}`;
            
            setTimeout(() => {
                statusText.textContent = originalText;
                statusText.className = 'status-text';
            }, 3000);
        }
    }
    
    /**
     * Set up keyboard navigation and shortcuts
     */
    setupKeyboardNavigation() {
        this.container.addEventListener('keydown', (e) => {
            // Tab navigation with Ctrl+1,2,3
            if (e.ctrlKey && !e.shiftKey && !e.altKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        this.switchView('edit');
                        break;
                    case '2':
                        e.preventDefault();
                        this.switchView('preview');
                        break;
                    case '3':
                        e.preventDefault();
                        this.switchView('split');
                        break;
                    case 's':
                        e.preventDefault();
                        this.saveContent();
                        break;
                }
            }
        });
    }
    
    /**
     * Set up responsive design
     */
    setupResponsiveDesign() {
        // Add responsive classes based on container size
        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                const width = entry.contentRect.width;
                
                this.container.classList.toggle('mobile', width < 768);
                this.container.classList.toggle('tablet', width >= 768 && width < 1024);
                this.container.classList.toggle('desktop', width >= 1024);
            }
        });
        
        resizeObserver.observe(this.container);
    }
    
    /**
     * Set up accessibility features
     */
    setupAccessibility() {
        try {
            // Initialize accessibility manager if available
            if (typeof AccessibilityManager !== 'undefined') {
                this.accessibilityManager = new AccessibilityManager({
                    enableKeyboardNavigation: true,
                    enableScreenReaderSupport: true,
                    enableAriaLabels: true,
                    enableHighContrast: true,
                    enableFocusManagement: true,
                    announceChanges: true
                });
                
                // Listen for accessibility events
                this.accessibilityManager.on('keyboardNavigation', (data) => {
                    this.handleAccessibilityKeyboard(data);
                });
                
                this.accessibilityManager.on('contrastChange', (data) => {
                    this.handleContrastChange(data);
                });
            }
            
            // Set up component-specific accessibility
            this.setupTabAccessibility();
            this.setupEditorAccessibility();
            this.setupControlAccessibility();
            
            // Add ARIA live region for status updates
            const liveRegion = document.createElement('div');
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.className = 'sr-only';
            liveRegion.id = 'results-announcements';
            this.container.appendChild(liveRegion);
            
            // Announce view changes
            this.on('viewChange', (data) => {
                const announcements = {
                    edit: '編集モードに切り替わりました',
                    preview: 'プレビューモードに切り替わりました',
                    'print-preview': '印刷プレビューモードに切り替わりました',
                    split: '分割表示モードに切り替わりました'
                };
                
                const announcement = announcements[data.to] || `${data.to}モードに切り替わりました`;
                liveRegion.textContent = announcement;
                
                if (this.accessibilityManager) {
                    this.accessibilityManager.announce(announcement, 'polite');
                }
            });
            
            // Announce content changes
            this.on('contentChange', (data) => {
                if (this.accessibilityManager) {
                    const wordCount = data.content.trim() ? data.content.trim().split(/\s+/).length : 0;
                    this.accessibilityManager.updateStatus(`文字数: ${data.content.length}, 単語数: ${wordCount}`);
                }
            });
            
            console.log('Results layout accessibility features initialized');
            
        } catch (error) {
            console.error('Error setting up accessibility features:', error);
        }
    }
    
    /**
     * Set up tab accessibility
     */
    setupTabAccessibility() {
        const tabList = this.container.querySelector('.tab-navigation');
        const tabButtons = this.container.querySelectorAll('.tab-button');
        
        if (tabList) {
            // Set up roving tabindex for tab navigation
            tabButtons.forEach((button, index) => {
                button.tabIndex = index === 0 ? 0 : -1;
                
                // Add keyboard navigation
                button.addEventListener('keydown', (e) => {
                    this.handleTabKeyNavigation(e, tabButtons);
                });
            });
        }
    }
    
    /**
     * Handle tab keyboard navigation
     */
    handleTabKeyNavigation(e, buttons) {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
            return;
        }
        
        e.preventDefault();
        
        const currentIndex = Array.from(buttons).indexOf(document.activeElement);
        if (currentIndex === -1) return;
        
        let nextIndex = currentIndex;
        
        switch (e.key) {
            case 'ArrowLeft':
                nextIndex = currentIndex > 0 ? currentIndex - 1 : buttons.length - 1;
                break;
            case 'ArrowRight':
                nextIndex = currentIndex < buttons.length - 1 ? currentIndex + 1 : 0;
                break;
            case 'Home':
                nextIndex = 0;
                break;
            case 'End':
                nextIndex = buttons.length - 1;
                break;
        }
        
        // Update tabindex and focus
        buttons[currentIndex].tabIndex = -1;
        buttons[nextIndex].tabIndex = 0;
        buttons[nextIndex].focus();
        
        // Announce tab
        if (this.accessibilityManager) {
            const tabName = buttons[nextIndex].textContent.trim();
            this.accessibilityManager.announce(`${tabName}タブ`, 'polite');
        }
    }
    
    /**
     * Set up editor accessibility
     */
    setupEditorAccessibility() {
        // Tiptap editors handle their own accessibility
        // Set up ARIA labels for Tiptap ProseMirror elements
        if (this.contentEditor) {
            const editorElement = this.contentEditor.editor?.view?.dom || 
                                this.container.querySelector('#content-editor-container .ProseMirror');
            if (editorElement) {
                editorElement.setAttribute('aria-label', 'メインエディター');
                editorElement.setAttribute('role', 'textbox');
                editorElement.setAttribute('aria-multiline', 'true');
            }
        }
        
        if (this.splitEditor) {
            const editorElement = this.splitEditor.editor?.view?.dom || 
                                this.container.querySelector('#split-editor-container .ProseMirror');
            if (editorElement) {
                editorElement.setAttribute('aria-label', '分割表示エディター');
                editorElement.setAttribute('role', 'textbox');
                editorElement.setAttribute('aria-multiline', 'true');
            }
        }
    }
    
    /**
     * Set up control accessibility
     */
    setupControlAccessibility() {
        // Format controls
        const formatControls = this.container.querySelectorAll('.format-select');
        formatControls.forEach(control => {
            if (!control.getAttribute('aria-label')) {
                const label = control.previousElementSibling;
                if (label && label.tagName === 'LABEL') {
                    const labelId = `${control.id}-label`;
                    label.id = labelId;
                    control.setAttribute('aria-labelledby', labelId);
                }
            }
        });
        
        // Action buttons
        const actionButtons = this.container.querySelectorAll('.btn');
        actionButtons.forEach(button => {
            if (!button.getAttribute('aria-label') && button.title) {
                button.setAttribute('aria-label', button.title);
            }
        });
        
        // Toggle buttons
        const toggleButtons = this.container.querySelectorAll('.format-toggle-btn');
        toggleButtons.forEach(button => {
            button.setAttribute('aria-pressed', 'false');
        });
    }
    
    /**
     * Handle accessibility-related keyboard events
     */
    handleAccessibilityKeyboard(data) {
        // Handle results layout specific accessibility shortcuts
        if (data.key === 'F1' && data.target.closest('.enhanced-results-layout')) {
            this.showAccessibilityHelp();
        }
    }
    
    /**
     * Handle contrast changes
     */
    handleContrastChange(data) {
        // Update UI to reflect contrast changes
        if (data.enabled) {
            this.container.classList.add('high-contrast-mode');
        } else {
            this.container.classList.remove('high-contrast-mode');
        }
    }
    
    /**
     * Show accessibility help dialog
     */
    showAccessibilityHelp() {
        const helpModal = document.createElement('div');
        helpModal.className = 'accessibility-help-modal';
        helpModal.innerHTML = `
            <div class="accessibility-help-content">
                <h2>アクセシビリティ機能とキーボードショートカット</h2>
                <div class="help-sections">
                    <div class="help-section">
                        <h3>表示モード切り替え</h3>
                        <ul>
                            <li><kbd>Ctrl+1</kbd>: 編集モード</li>
                            <li><kbd>Ctrl+2</kbd>: プレビューモード</li>
                            <li><kbd>Ctrl+3</kbd>: 分割表示モード</li>
                        </ul>
                    </div>
                    <div class="help-section">
                        <h3>編集操作</h3>
                        <ul>
                            <li><kbd>Ctrl+B</kbd>: 太字</li>
                            <li><kbd>Ctrl+I</kbd>: 斜体</li>
                            <li><kbd>Ctrl+U</kbd>: 下線</li>
                            <li><kbd>Ctrl+S</kbd>: 保存</li>
                        </ul>
                    </div>
                    <div class="help-section">
                        <h3>アクセシビリティ</h3>
                        <ul>
                            <li><kbd>Alt+H</kbd>: ハイコントラストモード切り替え</li>
                            <li><kbd>F6</kbd>: 領域間フォーカス移動</li>
                            <li><kbd>Escape</kbd>: ダイアログを閉じる</li>
                        </ul>
                    </div>
                    <div class="help-section">
                        <h3>タブナビゲーション</h3>
                        <ul>
                            <li><kbd>←→</kbd>: タブ間移動</li>
                            <li><kbd>Home/End</kbd>: 最初/最後のタブ</li>
                            <li><kbd>Enter/Space</kbd>: タブ選択</li>
                        </ul>
                    </div>
                </div>
                <div class="help-actions">
                    <button class="help-close-btn">閉じる</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(helpModal);
        
        // Set up modal accessibility
        if (this.accessibilityManager) {
            this.accessibilityManager.setupModalFocusManagement(helpModal, {
                returnFocus: true,
                trapFocus: true,
                closeOnEscape: true
            });
        }
        
        // Set up close button
        const closeBtn = helpModal.querySelector('.help-close-btn');
        closeBtn.addEventListener('click', () => {
            if (this.accessibilityManager) {
                this.accessibilityManager.closeModal(helpModal);
            }
            document.body.removeChild(helpModal);
        });
        
        // Focus the close button
        closeBtn.focus();
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
                console.error('Error in EnhancedResultsLayout event listener:', error);
            }
        });
    }
    
    /**
     * Get current state
     */
    getState() {
        return {
            currentView: this.currentView,
            content: this.content,
            isBusinessFormatting: this.isBusinessFormatting,
            formatSettings: { ...this.formatSettings },
            isDirty: this.isDirty,
            lastSaved: this.lastSaved
        };
    }
    
    /**
     * Destroy the component and clean up
     */
    destroy() {
        // Clear auto-save timer
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }
        
        // Clear listeners
        Object.keys(this.listeners).forEach(event => {
            this.listeners[event] = [];
        });
        
        // Remove live region
        const liveRegion = this.container.querySelector('#results-announcements');
        if (liveRegion) {
            liveRegion.remove();
        }
        
        console.log('Enhanced Results Layout destroyed');
    }
    
    /**
     * Set up split view listeners
     */
    setupSplitViewListeners() {
        const splitSyncToggle = this.container.querySelector('#split-sync-toggle');
        const splitRefresh = this.container.querySelector('#split-refresh');
        
        if (splitSyncToggle) {
            splitSyncToggle.addEventListener('click', () => {
                this.toggleSplitSync();
            });
        }
        
        if (splitRefresh) {
            splitRefresh.addEventListener('click', () => {
                this.updateSplitPreview();
            });
        }
    }
    
    /**
     * Set up keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when focus is within the results layout
            if (!this.container.contains(e.target)) return;
            
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'b':
                        e.preventDefault();
                        this.handleToolbarAction('bold');
                        break;
                    case 'i':
                        e.preventDefault();
                        this.handleToolbarAction('italic');
                        break;
                    case 'u':
                        e.preventDefault();
                        this.handleToolbarAction('underline');
                        break;
                    case 'z':
                        if (!e.shiftKey) {
                            e.preventDefault();
                            this.handleToolbarAction('undo');
                        }
                        break;
                    case 'y':
                        e.preventDefault();
                        this.handleToolbarAction('redo');
                        break;
                }
            }
        });
    }
    
    /**
     * Handle toolbar actions
     */
    handleToolbarAction(action) {
        const activeEditor = this.getActiveEditor();
        if (!activeEditor) return;
        
        const start = activeEditor.selectionStart;
        const end = activeEditor.selectionEnd;
        const selectedText = activeEditor.value.substring(start, end);
        
        let replacement = '';
        let newCursorPos = start;
        
        switch (action) {
            case 'bold':
                replacement = `**${selectedText}**`;
                newCursorPos = selectedText ? end + 4 : start + 2;
                break;
            case 'italic':
                replacement = `*${selectedText}*`;
                newCursorPos = selectedText ? end + 2 : start + 1;
                break;
            case 'underline':
                replacement = `<u>${selectedText}</u>`;
                newCursorPos = selectedText ? end + 7 : start + 3;
                break;
            case 'list-ul':
                replacement = this.formatAsList(selectedText, false);
                break;
            case 'list-ol':
                replacement = this.formatAsList(selectedText, true);
                break;
            case 'undo':
                // Simple undo implementation
                if (this.undoStack && this.undoStack.length > 0) {
                    const previousState = this.undoStack.pop();
                    activeEditor.value = previousState;
                    this.handleContentChange(previousState, this.getEditorSource(activeEditor));
                }
                return;
            case 'redo':
                // Simple redo implementation
                if (this.redoStack && this.redoStack.length > 0) {
                    const nextState = this.redoStack.pop();
                    activeEditor.value = nextState;
                    this.handleContentChange(nextState, this.getEditorSource(activeEditor));
                }
                return;
        }
        
        if (replacement !== '') {
            // Save current state for undo
            this.saveUndoState(activeEditor.value);
            
            // Replace selected text
            const newValue = activeEditor.value.substring(0, start) + replacement + activeEditor.value.substring(end);
            activeEditor.value = newValue;
            
            // Set cursor position
            activeEditor.setSelectionRange(newCursorPos, newCursorPos);
            
            // Update content
            this.handleContentChange(newValue, this.getEditorSource(activeEditor));
        }
    }
    
    /**
     * Get the currently active editor
     */
    getActiveEditor() {
        if (this.currentView === 'edit') {
            return this.contentEditor;
        } else if (this.currentView === 'split') {
            return this.splitEditor;
        }
        return null;
    }
    
    /**
     * Get editor source identifier
     */
    getEditorSource(editor) {
        if (editor === this.contentEditor) return 'edit';
        if (editor === this.splitEditor) return 'split';
        return 'unknown';
    }
    
    /**
     * Format text as list
     */
    formatAsList(text, ordered = false) {
        if (!text) {
            return ordered ? '1. ' : '- ';
        }
        
        const lines = text.split('\n');
        return lines.map((line, index) => {
            const trimmed = line.trim();
            if (!trimmed) return '';
            
            if (ordered) {
                return `${index + 1}. ${trimmed}`;
            } else {
                return `- ${trimmed}`;
            }
        }).join('\n');
    }
    
    /**
     * Apply heading format
     */
    applyHeading(level) {
        const activeEditor = this.getActiveEditor();
        if (!activeEditor || !level) return;
        
        const start = activeEditor.selectionStart;
        const end = activeEditor.selectionEnd;
        
        // Find the start of the current line
        const lineStart = activeEditor.value.lastIndexOf('\n', start - 1) + 1;
        const lineEnd = activeEditor.value.indexOf('\n', end);
        const actualLineEnd = lineEnd === -1 ? activeEditor.value.length : lineEnd;
        
        const currentLine = activeEditor.value.substring(lineStart, actualLineEnd);
        
        // Remove existing heading markers
        const cleanLine = currentLine.replace(/^#+\s*/, '');
        
        // Add new heading markers
        const headingMarkers = {
            h1: '# ',
            h2: '## ',
            h3: '### ',
            h4: '#### '
        };
        
        const newLine = headingMarkers[level] + cleanLine;
        
        // Save current state for undo
        this.saveUndoState(activeEditor.value);
        
        // Replace the line
        const newValue = activeEditor.value.substring(0, lineStart) + newLine + activeEditor.value.substring(actualLineEnd);
        activeEditor.value = newValue;
        
        // Update content
        this.handleContentChange(newValue, this.getEditorSource(activeEditor));
        
        // Reset heading select
        const headingSelect = this.container.querySelector('#heading-select');
        if (headingSelect) {
            headingSelect.value = '';
        }
    }
    
    /**
     * Handle editor keydown events
     */
    handleEditorKeydown(e) {
        // Tab key handling for indentation
        if (e.key === 'Tab') {
            e.preventDefault();
            const editor = e.target;
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            
            if (e.shiftKey) {
                // Shift+Tab: Remove indentation
                this.removeIndentation(editor, start, end);
            } else {
                // Tab: Add indentation
                this.addIndentation(editor, start, end);
            }
        }
    }
    
    /**
     * Add indentation to selected lines
     */
    addIndentation(editor, start, end) {
        const value = editor.value;
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const lineEnd = value.indexOf('\n', end);
        const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;
        
        const selectedLines = value.substring(lineStart, actualLineEnd);
        const indentedLines = selectedLines.split('\n').map(line => '  ' + line).join('\n');
        
        const newValue = value.substring(0, lineStart) + indentedLines + value.substring(actualLineEnd);
        editor.value = newValue;
        
        // Adjust cursor position
        const newStart = start + 2;
        const newEnd = end + (indentedLines.length - selectedLines.length);
        editor.setSelectionRange(newStart, newEnd);
        
        this.handleContentChange(newValue, this.getEditorSource(editor));
    }
    
    /**
     * Remove indentation from selected lines
     */
    removeIndentation(editor, start, end) {
        const value = editor.value;
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const lineEnd = value.indexOf('\n', end);
        const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;
        
        const selectedLines = value.substring(lineStart, actualLineEnd);
        const unindentedLines = selectedLines.split('\n').map(line => {
            if (line.startsWith('  ')) {
                return line.substring(2);
            } else if (line.startsWith(' ')) {
                return line.substring(1);
            }
            return line;
        }).join('\n');
        
        const newValue = value.substring(0, lineStart) + unindentedLines + value.substring(actualLineEnd);
        editor.value = newValue;
        
        // Adjust cursor position
        const removedChars = selectedLines.length - unindentedLines.length;
        const newStart = Math.max(lineStart, start - Math.min(2, removedChars));
        const newEnd = end - removedChars;
        editor.setSelectionRange(newStart, newEnd);
        
        this.handleContentChange(newValue, this.getEditorSource(editor));
    }
    
    /**
     * Update split preview
     */
    updateSplitPreview() {
        const splitPreviewContent = this.container.querySelector('#split-preview-content');
        if (!splitPreviewContent) return;
        
        if (!this.content) {
            splitPreviewContent.innerHTML = `
                <div class="preview-placeholder">
                    <p>編集内容のプレビューがここに表示されます</p>
                </div>
            `;
            return;
        }
        
        try {
            let html;
            if (this.markdownRenderer) {
                html = this.markdownRenderer.render(this.content, this.isBusinessFormatting);
            } else {
                html = this.content.replace(/\n/g, '<br>');
            }
            
            splitPreviewContent.innerHTML = html;
            this.applyFormatSettings(splitPreviewContent);
            
        } catch (error) {
            console.error('Split preview update error:', error);
            splitPreviewContent.innerHTML = `
                <div class="error-message">
                    <p>プレビューの更新中にエラーが発生しました</p>
                </div>
            `;
        }
    }
    
    /**
     * Set up split view resizing
     */
    setupSplitViewResizing() {
        const splitDivider = this.container.querySelector('#split-divider');
        const splitContainer = this.container.querySelector('.split-container');
        
        if (!splitDivider || !splitContainer) return;
        
        let isResizing = false;
        
        splitDivider.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.body.style.cursor = 'col-resize';
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const containerRect = splitContainer.getBoundingClientRect();
            const percentage = ((e.clientX - containerRect.left) / containerRect.width) * 100;
            
            // Limit percentage between 20% and 80%
            const clampedPercentage = Math.max(20, Math.min(80, percentage));
            
            splitContainer.style.gridTemplateColumns = `${clampedPercentage}% 1px ${100 - clampedPercentage - 0.1}%`;
        });
        
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
            }
        });
    }
    
    /**
     * Toggle split view scroll synchronization
     */
    toggleSplitSync() {
        const syncBtn = this.container.querySelector('#split-sync-toggle');
        const isEnabled = syncBtn.classList.contains('active');
        
        syncBtn.classList.toggle('active', !isEnabled);
        
        if (!isEnabled) {
            this.enableSplitSync();
        } else {
            this.disableSplitSync();
        }
    }
    
    /**
     * Enable split view scroll synchronization
     */
    enableSplitSync() {
        // Get ProseMirror element from Tiptap editor
        const editorElement = this.splitEditor?.editor?.view?.dom || 
                            this.container.querySelector('#split-editor-container .ProseMirror');
        const splitPreview = this.container.querySelector('#split-preview-content');
        
        if (!editorElement || !splitPreview) return;
        
        this.splitSyncHandler = (e) => {
            this.handleSplitScroll(e, 'editor');
        };
        
        editorElement.addEventListener('scroll', this.splitSyncHandler);
    }
    
    /**
     * Disable split view scroll synchronization
     */
    disableSplitSync() {
        const editorElement = this.splitEditor?.editor?.view?.dom || 
                            this.container.querySelector('#split-editor-container .ProseMirror');
        
        if (editorElement && this.splitSyncHandler) {
            editorElement.removeEventListener('scroll', this.splitSyncHandler);
            this.splitSyncHandler = null;
        }
    }
    
    /**
     * Handle split view scroll synchronization
     */
    handleSplitScroll(e, source) {
        if (source === 'editor') {
            const splitPreview = this.container.querySelector('#split-preview-content');
            if (splitPreview) {
                const scrollPercentage = e.target.scrollTop / (e.target.scrollHeight - e.target.clientHeight);
                const targetScrollTop = scrollPercentage * (splitPreview.scrollHeight - splitPreview.clientHeight);
                splitPreview.scrollTop = targetScrollTop;
            }
        }
    }
    
    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen() {
        const isFullscreen = this.container.classList.contains('fullscreen');
        
        if (!isFullscreen) {
            this.enterFullscreen();
        } else {
            this.exitFullscreen();
        }
    }
    
    /**
     * Enter fullscreen mode
     */
    enterFullscreen() {
        this.container.classList.add('fullscreen');
        document.body.classList.add('results-fullscreen');
        
        const fullscreenBtn = this.container.querySelector('#fullscreen-toggle');
        if (fullscreenBtn) {
            fullscreenBtn.title = 'フルスクリーンを終了';
            fullscreenBtn.classList.add('active');
        }
        
        // Add escape key listener
        this.fullscreenEscapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.exitFullscreen();
            }
        };
        document.addEventListener('keydown', this.fullscreenEscapeHandler);
    }
    
    /**
     * Exit fullscreen mode
     */
    exitFullscreen() {
        this.container.classList.remove('fullscreen');
        document.body.classList.remove('results-fullscreen');
        
        const fullscreenBtn = this.container.querySelector('#fullscreen-toggle');
        if (fullscreenBtn) {
            fullscreenBtn.title = 'フルスクリーン表示';
            fullscreenBtn.classList.remove('active');
        }
        
        // Remove escape key listener
        if (this.fullscreenEscapeHandler) {
            document.removeEventListener('keydown', this.fullscreenEscapeHandler);
            this.fullscreenEscapeHandler = null;
        }
    }
    
    /**
     * Schedule auto-save
     */
    scheduleAutoSave() {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = setTimeout(() => {
            this.saveContent();
        }, this.options.autoSaveInterval);
    }
    
    /**
     * Save content
     */
    saveContent() {
        // This would typically save to a backend or local storage
        // For now, just mark as saved and update timestamp
        this.isDirty = false;
        this.lastSaved = new Date().toISOString();
        
        const lastSavedElement = this.container.querySelector('#last-saved');
        if (lastSavedElement) {
            lastSavedElement.textContent = `最終保存: ${new Date().toLocaleTimeString()}`;
        }
        
        this.updateStatusIndicator();
        
        // Emit save event
        this.emit('save', {
            content: this.content,
            timestamp: this.lastSaved
        });
        
        console.log('Content saved at', this.lastSaved);
    }
    
    /**
     * Save undo state
     */
    saveUndoState(content) {
        if (!this.undoStack) {
            this.undoStack = [];
        }
        
        this.undoStack.push(content);
        
        // Limit undo stack size
        if (this.undoStack.length > 50) {
            this.undoStack.shift();
        }
        
        // Clear redo stack when new action is performed
        this.redoStack = [];
    }
    
    /**
     * Show error message
     */
    showError(message) {
        console.error('Enhanced Results Layout error:', message);
        this.showFeedback(message, 'error');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedResultsLayout;
} else if (typeof window !== 'undefined') {
    window.EnhancedResultsLayout = EnhancedResultsLayout;
}