/**
 * Enhanced Results Section Layout
 * Implements tabbed interface (Edit/Preview/Split views) with formatting controls
 * Integrates with business document formatting and PDF export functionality
 * Implements requirements 1.1, 1.2, 1.3 for enhanced results presentation
 */

class EnhancedResultsLayout {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            enableBusinessFormatting: true,
            enablePDFExport: true,
            enableFormatControls: true,
            enableResponsiveDesign: true,
            enableAccessibility: true,
            autoSave: true,
            autoSaveInterval: 5000,
            defaultView: 'preview', // 'edit', 'preview', 'split'
            ...options
        };
        
        this.currentView = this.options.defaultView;
        this.content = '';
        this.isBusinessFormatting = false;
        this.formatSettings = {
            fontSize: 'normal',
            lineHeight: 'normal',
            theme: 'default'
        };
        
        // Component instances
        this.markdownRenderer = null;
        this.businessFormatter = null;
        this.pdfExportManager = null;
        this.printPreviewManager = null;
        this.accessibilityManager = null;
        this.contentEditor = null; // TiptapEditorClean instance for edit view
        this.splitEditor = null; // TiptapEditorClean instance for split view
        
        // State management
        this.isDirty = false;
        this.lastSaved = null;
        this.autoSaveTimer = null;
        
        // Event listeners
        this.listeners = {
            viewChange: [],
            contentChange: [],
            formatChange: [],
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
            
            // Set up keyboard navigation
            this.setupKeyboardNavigation();
            
            // Set up responsive design
            this.setupResponsiveDesign();
            
            // Initialize accessibility features
            this.setupAccessibility();
            
            // Set initial view
            this.switchView(this.currentView);
            
            console.log('Enhanced Results Layout initialized');
        } catch (error) {
            console.error('Enhanced Results Layout initialization error:', error);
            this.showError('結果表示レイアウトの初期化に失敗しました');
        }
    }
    
    /**
     * Initialize component dependencies
     */
    initializeComponents() {
        // Initialize Markdown Renderer
        if (typeof MarkdownRenderer !== 'undefined') {
            this.markdownRenderer = new MarkdownRenderer({
                businessFormatting: this.isBusinessFormatting
            });
        }
        
        // Initialize Business Document Formatter
        if (typeof BusinessDocumentFormatter !== 'undefined') {
            this.businessFormatter = new BusinessDocumentFormatter();
        }
        
        // Initialize PDF Export Manager
        if (typeof PDFExportManager !== 'undefined') {
            this.pdfExportManager = new PDFExportManager({
                defaultFilename: 'business-report',
                businessFormatting: this.isBusinessFormatting
            });
        }
        
        // Initialize Header/Footer Manager
        if (typeof HeaderFooterManager !== 'undefined') {
            this.headerFooterManager = new HeaderFooterManager({
                enableLogo: true,
                enablePageNumbers: true,
                enableDateInsertion: true
            });
            
            // Listen for header/footer changes
            this.headerFooterManager.on('headerChange', () => this.updatePreview());
            this.headerFooterManager.on('footerChange', () => this.updatePreview());
            this.headerFooterManager.on('logoChange', () => this.updatePreview());
        }
        
        // Initialize Print Preview Manager
        if (typeof PrintPreviewManager !== 'undefined') {
            const printPreviewContainer = document.createElement('div');
            printPreviewContainer.style.display = 'none';
            document.body.appendChild(printPreviewContainer);
            
            this.printPreviewManager = new PrintPreviewManager(printPreviewContainer, {
                pageSize: 'A4',
                orientation: 'portrait',
                margins: 'normal',
                showPageNumbers: true,
                showDate: true,
                enableNavigation: true,
                enableZoom: true
            });
            
            // Listen for print preview events
            this.printPreviewManager.on('modeChange', (data) => {
                if (!data.active) {
                    // Return to previous view when print preview is closed
                    this.switchView('preview');
                }
            });
        }
    }
    
    /**
     * Create the layout structure
     */
    createLayoutStructure() {
        this.container.innerHTML = `
            <div class="enhanced-results-layout">
                <!-- Header with tabs and controls -->
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
                
                <!-- Tab Navigation -->
                <div class="tab-navigation" role="tablist" aria-label="表示モード選択">
                    <button class="tab-button" data-view="edit" role="tab" aria-selected="false" aria-controls="edit-panel" id="edit-tab">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        編集
                    </button>
                    <button class="tab-button active" data-view="preview" role="tab" aria-selected="true" aria-controls="preview-panel" id="preview-tab">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        プレビュー
                    </button>
                    <button class="tab-button" data-view="print-preview" role="tab" aria-selected="false" aria-controls="print-preview-panel" id="print-preview-tab">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6,9 6,2 18,2 18,9"></polyline>
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                            <polyline points="6,14 6,22 18,22 18,14"></polyline>
                        </svg>
                        印刷プレビュー
                    </button>
                    <button class="tab-button" data-view="split" role="tab" aria-selected="false" aria-controls="split-panel" id="split-tab">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="12" y1="3" x2="12" y2="21"></line>
                        </svg>
                        分割表示
                    </button>
                </div>
                
                <!-- Format Controls -->
                <div class="format-controls-bar" id="format-controls">
                    <div class="format-controls-section">
                        <div class="control-group">
                            <label for="font-size-select">フォントサイズ:</label>
                            <select id="font-size-select" class="format-select">
                                <option value="small">小 (12px)</option>
                                <option value="normal" selected>標準 (14px)</option>
                                <option value="large">大 (16px)</option>
                                <option value="xlarge">特大 (18px)</option>
                            </select>
                        </div>
                        
                        <div class="control-group">
                            <label for="line-height-select">行間:</label>
                            <select id="line-height-select" class="format-select">
                                <option value="tight">狭い (1.4)</option>
                                <option value="normal" selected>標準 (1.6)</option>
                                <option value="relaxed">広い (1.8)</option>
                                <option value="loose">特広 (2.0)</option>
                            </select>
                        </div>
                        
                        <div class="control-group">
                            <label for="theme-select">テーマ:</label>
                            <select id="theme-select" class="format-select">
                                <option value="default" selected>デフォルト</option>
                                <option value="dark">ダーク</option>
                                <option value="sepia">セピア</option>
                                <option value="high-contrast">ハイコントラスト</option>
                            </select>
                        </div>
                        
                        <div class="control-group">
                            <button id="business-format-toggle" class="format-toggle-btn" title="ビジネス文書形式の切り替え">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14,2 14,8 20,8"></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                </svg>
                                ビジネス書式
                            </button>
                        </div>
                        
                        <div class="control-group">
                            <button id="fullscreen-toggle" class="format-toggle-btn" title="フルスクリーン表示">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                                </svg>
                                フルスクリーン
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Content Views -->
                <div class="content-views">
                    <!-- Edit View -->
                    <div class="view-panel edit-view" id="edit-panel" role="tabpanel" aria-labelledby="edit-tab" aria-hidden="true">
                        <div class="edit-toolbar" id="edit-toolbar">
                            <div class="toolbar-section">
                                <button class="toolbar-btn" data-action="bold" title="太字 (Ctrl+B)">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                                        <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                                    </svg>
                                </button>
                                <button class="toolbar-btn" data-action="italic" title="斜体 (Ctrl+I)">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <line x1="19" y1="4" x2="10" y2="4"></line>
                                        <line x1="14" y1="20" x2="5" y2="20"></line>
                                        <line x1="15" y1="4" x2="9" y2="20"></line>
                                    </svg>
                                </button>
                                <button class="toolbar-btn" data-action="underline" title="下線 (Ctrl+U)">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"></path>
                                        <line x1="4" y1="21" x2="20" y2="21"></line>
                                    </svg>
                                </button>
                            </div>
                            
                            <div class="toolbar-section">
                                <select class="toolbar-select" id="heading-select">
                                    <option value="">見出しレベル</option>
                                    <option value="h1">見出し1</option>
                                    <option value="h2">見出し2</option>
                                    <option value="h3">見出し3</option>
                                    <option value="h4">見出し4</option>
                                </select>
                            </div>
                            
                            <div class="toolbar-section">
                                <button class="toolbar-btn" data-action="list-ul" title="箇条書きリスト">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <line x1="8" y1="6" x2="21" y2="6"></line>
                                        <line x1="8" y1="12" x2="21" y2="12"></line>
                                        <line x1="8" y1="18" x2="21" y2="18"></line>
                                        <line x1="3" y1="6" x2="3.01" y2="6"></line>
                                        <line x1="3" y1="12" x2="3.01" y2="12"></line>
                                        <line x1="3" y1="18" x2="3.01" y2="18"></line>
                                    </svg>
                                </button>
                                <button class="toolbar-btn" data-action="list-ol" title="番号付きリスト">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <line x1="10" y1="6" x2="21" y2="6"></line>
                                        <line x1="10" y1="12" x2="21" y2="12"></line>
                                        <line x1="10" y1="18" x2="21" y2="18"></line>
                                        <path d="M4 6h1v4"></path>
                                        <path d="M4 10h2"></path>
                                        <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path>
                                    </svg>
                                </button>
                            </div>
                            
                            <div class="toolbar-section">
                                <button class="toolbar-btn" data-action="undo" title="元に戻す (Ctrl+Z)">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="1 4 1 10 7 10"></polyline>
                                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                                    </svg>
                                </button>
                                <button class="toolbar-btn" data-action="redo" title="やり直し (Ctrl+Y)">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="23 4 23 10 17 10"></polyline>
                                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        
                        <div class="edit-content">
                            <div id="content-editor-container"></div>
                        </div>
                    </div>
                    
                    <!-- Preview View -->
                    <div class="view-panel preview-view active" id="preview-panel" role="tabpanel" aria-labelledby="preview-tab" aria-hidden="false">
                        <div class="preview-content" id="preview-content">
                            <div class="preview-placeholder">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14,2 14,8 20,8"></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                </svg>
                                <p>レポートが生成されるとここに表示されます</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Print Preview View -->
                    <div class="view-panel print-preview-view" id="print-preview-panel" role="tabpanel" aria-labelledby="print-preview-tab" aria-hidden="true">
                        <div class="print-preview-container" id="print-preview-container">
                            <!-- Print preview content will be dynamically generated here -->
                        </div>
                    </div>
                    
                    <!-- Split View -->
                    <div class="view-panel split-view" id="split-panel" role="tabpanel" aria-labelledby="split-tab" aria-hidden="true">
                        <div class="split-container">
                            <div class="split-pane split-edit">
                                <div class="split-header">
                                    <h4>編集</h4>
                                    <div class="split-controls">
                                        <button class="split-sync-btn" id="split-sync-toggle" title="スクロール同期">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M23 4v6h-6"></path>
                                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <div id="split-editor-container"></div>
                            </div>
                            
                            <div class="split-divider" id="split-divider" role="separator" aria-label="分割パネルのサイズ調整"></div>
                            
                            <div class="split-pane split-preview">
                                <div class="split-header">
                                    <h4>プレビュー</h4>
                                    <div class="split-controls">
                                        <button class="split-refresh-btn" id="split-refresh" title="プレビュー更新">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <polyline points="23 4 23 10 17 10"></polyline>
                                                <polyline points="1 20 1 14 7 14"></polyline>
                                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10M3.51 9a9 9 0 1 1 2.13 9.36L1 14"></path>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <div class="split-preview-content" id="split-preview-content">
                                    <div class="preview-placeholder">
                                        <p>編集内容のプレビューがここに表示されます</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Word Count and Status -->
                <div class="content-status-bar" id="content-status">
                    <div class="status-info">
                        <span class="word-count" id="word-count">文字数: 0</span>
                        <span class="line-count" id="line-count">行数: 0</span>
                        <span class="last-saved" id="last-saved"></span>
                    </div>
                    <div class="status-actions">
                        <button class="status-btn" id="auto-save-toggle" title="自動保存の切り替え">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                <polyline points="17,21 17,13 7,13 7,21"></polyline>
                                <polyline points="7,3 7,8 15,8"></polyline>
                            </svg>
                            自動保存: ON
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
        // Tab navigation
        const tabButtons = this.container.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });
        
        // Format controls
        this.setupFormatControlListeners();
        
        // Content editing
        this.setupContentEditingListeners();
        
        // Action buttons
        this.setupActionButtonListeners();
        
        // Split view controls
        this.setupSplitViewListeners();
        
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
     * Switch between views (edit/preview/print-preview/split)
     */
    switchView(viewName) {
        if (!['edit', 'preview', 'print-preview', 'split'].includes(viewName)) {
            console.warn(`Invalid view: ${viewName}`);
            return;
        }
        
        const previousView = this.currentView;
        this.currentView = viewName;
        
        // Update tab buttons
        const tabButtons = this.container.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            const isActive = button.dataset.view === viewName;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-selected', isActive);
        });
        
        // Update view panels
        const viewPanels = this.container.querySelectorAll('.view-panel');
        viewPanels.forEach(panel => {
            const isActive = panel.id === `${viewName}-panel`;
            panel.classList.toggle('active', isActive);
            panel.setAttribute('aria-hidden', !isActive);
        });
        
        // Handle view-specific initialization
        this.initializeView(viewName);
        
        // Emit view change event
        this.emit('viewChange', {
            from: previousView,
            to: viewName,
            timestamp: new Date().toISOString()
        });
        
        console.log(`View switched: ${previousView} -> ${viewName}`);
    }
    
    /**
     * Initialize view-specific functionality
     */
    async initializeView(viewName) {
        switch (viewName) {
            case 'edit':
                await this.initializeEditView();
                break;
            case 'preview':
                this.initializePreviewView();
                break;
            case 'print-preview':
                this.initializePrintPreviewView();
                break;
            case 'split':
                await this.initializeSplitView();
                break;
        }
    }
    
    /**
     * Initialize edit view
     */
    async initializeEditView() {
        const editorContainer = this.container.querySelector('#content-editor-container');
        if (!editorContainer) {
            console.warn('Edit view container not found');
            return;
        }
        
        // Only initialize if not already done and Tiptap is available
        if (this.contentEditor) {
            // Editor already initialized, just ensure content is set
            if (this.content) {
                try {
                    await this.ensureEditorReady(this.contentEditor);
                    this.contentEditor.setContent(this.content, 'markdown');
                } catch (error) {
                    console.error('Error setting content in existing editor:', error);
                }
            }
            return;
        }
        
        if (typeof TiptapEditorClean === 'undefined') {
            console.error('TiptapEditorClean is not available');
            return;
        }
        
        try {
            // Clear container first
            editorContainer.innerHTML = '';
            
            // Initialize TiptapEditorClean
            this.contentEditor = new TiptapEditorClean(editorContainer, {
                enableToolbar: true,
                enableAutoSave: this.options.autoSave,
                autoSaveInterval: this.options.autoSaveInterval || 5000,
                placeholder: 'ここでレポートを編集できます...',
                onContentChange: (htmlContent, textContent) => {
                    // HTML content change
                },
                onMarkdownChange: (markdownContent) => {
                    // Markdown content change - primary callback
                    this.handleContentChange(markdownContent, 'edit');
                },
                onAutoSave: (data) => {
                    // Auto-save callback
                    this.handleAutoSave(data.markdown || data.html);
                }
            });
            
            // Wait for editor to be ready
            await this.ensureEditorReady(this.contentEditor);
            
            // Set content if available
            if (this.content) {
                this.contentEditor.setContent(this.content, 'markdown');
            }
            
            console.log('TiptapEditorClean initialized for edit view');
        } catch (error) {
            console.error('Failed to initialize TiptapEditorClean for edit view:', error);
            this.contentEditor = null;
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
     * Initialize preview view
     */
    initializePreviewView() {
        this.updatePreview();
    }
    
    /**
     * Initialize print preview view
     */
    initializePrintPreviewView() {
        if (!this.printPreviewManager) {
            console.warn('Print Preview Manager not available');
            return;
        }
        
        // Get header and footer content
        let headerContent = '';
        let footerContent = '';
        
        if (this.headerFooterManager) {
            const exportData = this.headerFooterManager.getExportData();
            headerContent = exportData.headerText || '';
            footerContent = exportData.footerText || '';
        }
        
        // Show print preview with current content
        this.printPreviewManager.showPreview(this.content, headerContent, footerContent);
    }
    
    /**
     * Initialize split view
     */
    async initializeSplitView() {
        const editorContainer = this.container.querySelector('#split-editor-container');
        if (!editorContainer) {
            console.warn('Split view container not found');
            return;
        }
        
        // Only initialize if not already done
        if (this.splitEditor) {
            // Editor already initialized, just ensure content is set
            if (this.content) {
                try {
                    await this.ensureEditorReady(this.splitEditor);
                    this.splitEditor.setContent(this.content, 'markdown');
                } catch (error) {
                    console.error('Error setting content in existing split editor:', error);
                }
            }
            this.updateSplitPreview();
            this.setupSplitViewResizing();
            return;
        }
        
        if (typeof TiptapEditorClean === 'undefined') {
            console.error('TiptapEditorClean is not available');
            return;
        }
        
        try {
            // Clear container first
            editorContainer.innerHTML = '';
            
            // Initialize TiptapEditorClean for split view
            this.splitEditor = new TiptapEditorClean(editorContainer, {
                enableToolbar: true,
                enableAutoSave: this.options.autoSave,
                autoSaveInterval: this.options.autoSaveInterval || 5000,
                placeholder: 'ここでレポートを編集...',
                onContentChange: (htmlContent, textContent) => {
                    // HTML content change
                },
                onMarkdownChange: (markdownContent) => {
                    // Markdown content change - primary callback
                    this.handleContentChange(markdownContent, 'split');
                },
                onAutoSave: (data) => {
                    // Auto-save callback
                    this.handleAutoSave(data.markdown || data.html);
                }
            });
            
            // Wait for editor to be ready
            await this.ensureEditorReady(this.splitEditor);
            
            // Set content if available
            if (this.content) {
                this.splitEditor.setContent(this.content, 'markdown');
            }
            
            console.log('TiptapEditorClean initialized for split view');
            
            this.updateSplitPreview();
            this.setupSplitViewResizing();
        } catch (error) {
            console.error('Failed to initialize TiptapEditorClean for split view:', error);
            this.splitEditor = null;
        }
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
     * Set content for all views
     */
    async setContent(content, metadata = {}) {
        this.content = content || '';
        
        // Update Tiptap editors if initialized
        if (this.contentEditor) {
            try {
                await this.ensureEditorReady(this.contentEditor);
                if (typeof this.contentEditor.setContent === 'function') {
                    this.contentEditor.setContent(this.content, 'markdown');
                }
            } catch (error) {
                console.error('Error setting content in edit editor:', error);
            }
        }
        
        if (this.splitEditor) {
            try {
                await this.ensureEditorReady(this.splitEditor);
                if (typeof this.splitEditor.setContent === 'function') {
                    this.splitEditor.setContent(this.content, 'markdown');
                }
            } catch (error) {
                console.error('Error setting content in split editor:', error);
            }
        }
        
        // Update previews
        this.updatePreview();
        this.updateSplitPreview();
        
        // Update status
        this.updateContentStatus();
        
        // Mark as clean
        this.isDirty = false;
        
        console.log('Content set:', this.content.length, 'characters');
    }
    
    /**
     * Update preview content
     */
    updatePreview() {
        const previewContent = this.container.querySelector('#preview-content');
        if (!previewContent) return;
        
        if (!this.content) {
            previewContent.innerHTML = `
                <div class="preview-placeholder">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14,2 14,8 20,8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                    <p>レポートが生成されるとここに表示されます</p>
                </div>
            `;
            return;
        }
        
        try {
            let html;
            if (this.markdownRenderer) {
                html = this.markdownRenderer.render(this.content, this.isBusinessFormatting);
            } else {
                // Fallback rendering
                html = this.content.replace(/\n/g, '<br>');
            }
            
            previewContent.innerHTML = html;
            this.applyFormatSettings(previewContent);
            
        } catch (error) {
            console.error('Preview update error:', error);
            previewContent.innerHTML = `
                <div class="error-message">
                    <p>プレビューの更新中にエラーが発生しました</p>
                    <button onclick="this.closest('.enhanced-results-layout').dispatchEvent(new CustomEvent('retry-preview'))">再試行</button>
                </div>
            `;
        }
    }
    
    /**
     * Handle content changes
     */
    handleContentChange(newContent, source) {
        this.content = newContent;
        this.isDirty = true;
        
        // Update other editors if needed (only if different to avoid infinite loops)
        if (source === 'edit' && this.splitEditor) {
            try {
                const currentContent = this.splitEditor.getMarkdown();
                if (currentContent !== newContent) {
                    // Use setTimeout to avoid blocking and infinite loops
                    setTimeout(() => {
                        if (this.splitEditor && typeof this.splitEditor.setContent === 'function') {
                            this.splitEditor.setContent(newContent, 'markdown');
                        }
                    }, 100);
                }
            } catch (error) {
                console.error('Error syncing to split editor:', error);
            }
        } else if (source === 'split' && this.contentEditor) {
            try {
                const currentContent = this.contentEditor.getMarkdown();
                if (currentContent !== newContent) {
                    // Use setTimeout to avoid blocking and infinite loops
                    setTimeout(() => {
                        if (this.contentEditor && typeof this.contentEditor.setContent === 'function') {
                            this.contentEditor.setContent(newContent, 'markdown');
                        }
                    }, 100);
                }
            } catch (error) {
                console.error('Error syncing to edit editor:', error);
            }
        }
        
        // Update previews
        if (this.currentView === 'preview' || this.currentView === 'split') {
            this.updatePreview();
        }
        
        if (this.currentView === 'split') {
            this.updateSplitPreview();
        }
        
        // Update status
        this.updateContentStatus();
        
        // Auto-save if enabled
        if (this.options.autoSave) {
            this.scheduleAutoSave();
        }
        
        // Emit content change event
        this.emit('contentChange', {
            content: newContent,
            source: source,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Update content status (word count, etc.)
     */
    updateContentStatus() {
        const wordCount = this.container.querySelector('#word-count');
        const lineCount = this.container.querySelector('#line-count');
        
        if (wordCount) {
            const words = this.content.trim() ? this.content.trim().split(/\s+/).length : 0;
            wordCount.textContent = `文字数: ${this.content.length} (単語数: ${words})`;
        }
        
        if (lineCount) {
            const lines = this.content.split('\n').length;
            lineCount.textContent = `行数: ${lines}`;
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
     */
    async copyContent() {
        try {
            await navigator.clipboard.writeText(this.content);
            this.showFeedback('コピーしました', 'success');
        } catch (error) {
            console.error('Copy failed:', error);
            this.showFeedback('コピーに失敗しました', 'error');
        }
    }
    
    /**
     * Download content as markdown file
     */
    downloadContent() {
        try {
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const filename = `report_${timestamp}.md`;
            
            const blob = new Blob([this.content], { type: 'text/markdown; charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showFeedback('ダウンロードしました', 'success');
        } catch (error) {
            console.error('Download failed:', error);
            this.showFeedback('ダウンロードに失敗しました', 'error');
        }
    }
    
    /**
     * Export content to PDF
     */
    async exportToPDF() {
        if (!this.pdfExportManager) {
            this.showFeedback('PDF出力機能が利用できません', 'error');
            return;
        }
        
        const exportBtn = this.container.querySelector('#exportPdfBtn');
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
            
            // Prepare content
            let htmlContent;
            if (this.markdownRenderer) {
                htmlContent = this.markdownRenderer.render(this.content, this.isBusinessFormatting);
            } else {
                htmlContent = this.content.replace(/\n/g, '<br>');
            }
            
            // Get header/footer settings from the manager
            const headerFooterData = this.headerFooterManager ? this.headerFooterManager.getExportData() : null;
            
            // Export options
            const exportOptions = {
                title: 'ビジネスレポート',
                businessFormatting: this.isBusinessFormatting,
                pageSize: 'A4',
                orientation: 'portrait',
                margins: 'normal',
                showPageNumbers: true,
                showDate: true,
                headerFooterManager: this.headerFooterManager,
                headerFooterData: headerFooterData
            };
            
            const success = await this.pdfExportManager.exportToPDF(htmlContent, exportOptions);
            
            if (success) {
                this.showFeedback('PDF出力が完了しました', 'success');
            } else {
                this.showFeedback('PDF出力に失敗しました', 'error');
            }
            
        } catch (error) {
            console.error('PDF export error:', error);
            this.showFeedback('PDF出力エラーが発生しました', 'error');
        } finally {
            // Restore button state
            exportBtn.innerHTML = originalHTML;
            exportBtn.disabled = false;
        }
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
            const editorElement = this.contentEditor.editorElement || 
                                this.container.querySelector('#content-editor-container .ProseMirror');
            if (editorElement) {
                editorElement.setAttribute('aria-label', 'メインエディター');
                editorElement.setAttribute('role', 'textbox');
                editorElement.setAttribute('aria-multiline', 'true');
            }
        }
        
        if (this.splitEditor) {
            const editorElement = this.splitEditor.editorElement || 
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
        const splitEditor = this.container.querySelector('#split-editor');
        const splitPreview = this.container.querySelector('#split-preview-content');
        
        if (!splitEditor || !splitPreview) return;
        
        this.splitSyncHandler = (e) => {
            this.handleSplitScroll(e, 'editor');
        };
        
        splitEditor.addEventListener('scroll', this.splitSyncHandler);
    }
    
    /**
     * Disable split view scroll synchronization
     */
    disableSplitSync() {
        const editorElement = this.splitEditor?.editorElement || 
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