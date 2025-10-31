/**
 * Enhanced TabNavigation - Integrates with ContentState for state management
 * Manages tab switching and coordinates with all preview components
 * Now includes comprehensive error handling and fallback mechanisms
 */
class TabNavigation {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            enableStateManagement: true,
            enableAutoSave: true,
            autoSaveInterval: 5000,
            enableErrorHandling: true,
            enableFallback: true,
            fallbackTab: 'raw',
            maxRetries: 3,
            ...options
        };
        
        this.activeTab = 'raw';
        this.tabs = ['raw', 'preview', 'editor', 'comparison'];
        this.tabButtons = {};
        this.tabPanes = {};
        
        // Component instances
        this.previewTab = null;
        this.richTextEditor = null;
        this.comparisonView = null;
        this.accessibilityManager = null;
        
        // State management
        this.contentState = null;
        
        // Error handling
        this.errorBoundary = null;
        this.componentErrors = new Map();
        
        // Performance optimization
        this.performanceMonitor = null;
        this.renderQueue = [];
        this.isRendering = false;
        this.lastRenderTime = 0;
        this.renderThrottle = 16; // ~60fps
        this.lazyLoadedTabs = new Set();
        this.intersectionObserver = null;
        
        // Event listeners
        this.listeners = {
            tabChange: [],
            contentChange: [],
            stateChange: [],
            error: [],
            performance: []
        };
        
        this.init();
    }
    
    /**
     * Initialize the tab navigation system
     */
    init() {
        try {
            // Initialize error handling first
            if (this.options.enableErrorHandling) {
                this.initializeErrorHandling();
            }
            
            // Initialize ContentState if enabled
            if (this.options.enableStateManagement) {
                this.initializeContentState();
            }
            
            // Get tab buttons and panes
            this.initializeTabElements();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Set up keyboard navigation
            this.setupKeyboardNavigation();
            
            // Initialize accessibility manager
            this.initializeAccessibilityManager();
            
            // Initialize performance monitoring
            this.initializePerformanceMonitoring();
            
            // Setup lazy loading
            this.setupLazyLoading();
            
            console.log('TabNavigation initialized with error handling, state management, accessibility, and performance optimizations');
        } catch (error) {
            console.error('TabNavigation initialization error:', error);
            this.handleInitializationError(error);
        }
    }
    
    /**
     * Initialize error handling system
     */
    initializeErrorHandling() {
        try {
            this.errorBoundary = new ErrorBoundary({
                enableLogging: true,
                enableFallback: this.options.enableFallback,
                enableUserNotification: true,
                fallbackTab: this.options.fallbackTab,
                maxRetries: this.options.maxRetries
            });
            
            // Set up safe tab switching
            this.errorBoundary.createSafeTabSwitcher(this);
            
            console.log('Error handling initialized');
        } catch (error) {
            console.error('Error boundary initialization failed:', error);
            // Continue without error boundary
            this.options.enableErrorHandling = false;
        }
    }

    /**
     * Initialize ContentState manager
     */
    initializeContentState() {
        try {
            this.contentState = new ContentState({
                autoSave: this.options.enableAutoSave,
                autoSaveInterval: this.options.autoSaveInterval,
                enableLocalStorage: true,
                storageKey: 'report-preview-content-state'
            });
            
            // Listen to ContentState events
            this.contentState.on('stateChange', (data) => {
                this.handleStateChange(data);
            });
            
            this.contentState.on('contentChange', (data) => {
                this.handleContentChange(data);
            });
            
            this.contentState.on('tabChange', (data) => {
                this.handleTabChangeFromState(data);
            });
            
            this.contentState.on('save', (data) => {
                this.handleSave(data);
            });
            
            this.contentState.on('error', (data) => {
                console.error('ContentState error:', data);
            });
            
            // Restore active tab from state
            const savedState = this.contentState.getState();
            if (savedState.activeTab && this.tabs.includes(savedState.activeTab)) {
                this.activeTab = savedState.activeTab;
            }
            
        } catch (error) {
            console.error('ContentState initialization error:', error);
            this.options.enableStateManagement = false;
        }
    }
    
    /**
     * Initialize tab elements
     */
    initializeTabElements() {
        this.tabs.forEach(tabName => {
            this.tabButtons[tabName] = document.querySelector(`[data-tab="${tabName}"]`);
            this.tabPanes[tabName] = document.getElementById(`${tabName}Tab`);
            
            if (this.tabButtons[tabName]) {
                this.tabButtons[tabName].addEventListener('click', () => this.switchTab(tabName));
            }
        });
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for component events
        document.addEventListener('preview-rendered', (e) => {
            console.log('Preview rendered:', e.detail);
        });
        
        document.addEventListener('revertChange', (e) => {
            this.handleRevertChange(e.detail);
        });
        
        document.addEventListener('resetAllChanges', (e) => {
            this.handleResetAllChanges(e.detail);
        });
    }
    
    /**
     * Switch to a specific tab
     */
    switchTab(tabName) {
        if (!this.tabs.includes(tabName)) {
            console.warn(`Invalid tab: ${tabName}`);
            return false;
        }
        
        try {
            const previousTab = this.activeTab;
            
            // Update ContentState if enabled
            if (this.contentState) {
                this.contentState.setActiveTab(tabName);
            }
            
            // Update active tab
            this.activeTab = tabName;
            
            // Update button states
            this.updateTabButtons();
            
            // Update pane visibility
            this.updateTabPanes();
            
            // Initialize tab content if needed
            this.initializeTabContent(tabName);
            
            // Emit tab change event
            this.emit('tabChange', {
                from: previousTab,
                to: tabName,
                timestamp: new Date().toISOString()
            });
            
            console.log(`Tab switched: ${previousTab} -> ${tabName}`);
            return true;
            
        } catch (error) {
            console.error('Error switching tab:', error);
            // Fallback to raw tab
            if (tabName !== 'raw') {
                this.switchTab('raw');
            }
            return false;
        }
    }
    
    /**
     * Update tab button states
     */
    updateTabButtons() {
        Object.keys(this.tabButtons).forEach(tab => {
            if (this.tabButtons[tab]) {
                this.tabButtons[tab].classList.toggle('active', tab === this.activeTab);
                this.tabButtons[tab].setAttribute('aria-selected', tab === this.activeTab);
            }
        });
    }
    
    /**
     * Update tab pane visibility
     */
    updateTabPanes() {
        Object.keys(this.tabPanes).forEach(tab => {
            if (this.tabPanes[tab]) {
                this.tabPanes[tab].classList.toggle('active', tab === this.activeTab);
                this.tabPanes[tab].setAttribute('aria-hidden', tab !== this.activeTab);
            }
        });
    }
    
    /**
     * Initialize content for a specific tab
     */
    initializeTabContent(tabName) {
        switch (tabName) {
            case 'preview':
                this.initializePreviewTab();
                break;
            case 'editor':
                this.initializeEditorTab();
                break;
            case 'comparison':
                this.initializeComparisonTab();
                break;
            default:
                // Raw tab is already initialized
                break;
        }
    }
    
    /**
     * Initialize preview tab with error handling
     */
    initializePreviewTab() {
        const previewContent = document.getElementById('previewContent');
        if (!previewContent) {
            this.handleComponentError('PreviewTab', 'Container element not found');
            return;
        }
        
        try {
            if (!this.previewTab) {
                this.previewTab = new PreviewTab(previewContent, {
                    enableScrollSync: true,
                    enableResponsiveDesign: true,
                    enableErrorHandling: true
                });
                
                // Wrap with error boundary if available
                if (this.errorBoundary) {
                    this.previewTab = this.errorBoundary.wrapComponent(this.previewTab);
                }
            }
            
            // Set content from ContentState
            if (this.contentState) {
                const content = this.contentState.getContentForTab('preview');
                if (content) {
                    this.safeSetContent(this.previewTab, content, 'PreviewTab');
                }
            }
            
            // Mark as successfully initialized
            this.componentErrors.delete('PreviewTab');
            
        } catch (error) {
            this.handleComponentError('PreviewTab', error);
            this.showComponentFallback(previewContent, 'PreviewTab', 'プレビュー機能の初期化に失敗しました');
        }
    }
    
    /**
     * Initialize editor tab with error handling
     */
    initializeEditorTab() {
        const editorContent = document.getElementById('editorContent');
        if (!editorContent) {
            this.handleComponentError('EnhancedWYSIWYGEditor', 'Container element not found');
            return;
        }
        
        try {
            if (!this.richTextEditor) {
                // Use TiptapWYSIWYGEditor for modern Word-like WYSIWYG editing experience
                // Try real Tiptap first, then fallback
                if (typeof TiptapWYSIWYGEditorReal !== 'undefined') {
                    this.richTextEditor = new TiptapWYSIWYGEditorReal(editorContent, {
                        enableToolbar: true,
                        enableAutoSave: this.options.enableAutoSave,
                        autoSaveInterval: this.options.autoSaveInterval,
                        placeholder: 'レポートを編集してください...',
                        onContentChange: (htmlContent, textContent) => {
                            // Real Tiptap implementation
                        },
                        onMarkdownChange: (markdownContent) => {
                            // Handle markdown change directly
                            this.safeHandleEditorContentChange(markdownContent, '');
                        },
                        onAutoSave: (data) => {
                            // data contains { markdown, html, timestamp }
                            this.safeHandleEditorAutoSave(data.markdown || data.html);
                        }
                    });
                } else if (typeof TiptapWYSIWYGEditor !== 'undefined') {
                    this.richTextEditor = new TiptapWYSIWYGEditor(editorContent, {
                        enableToolbar: true,
                        enableAutoSave: this.options.enableAutoSave,
                        autoSaveInterval: this.options.autoSaveInterval,
                        placeholder: 'レポートを編集してください...',
                        onContentChange: (htmlContent, textContent) => {
                            // TiptapWYSIWYGEditor returns HTML, convert to markdown for compatibility
                            const markdownContent = this.editorToMarkdown ? this.editorToMarkdown(htmlContent) : '';
                            this.safeHandleEditorContentChange(markdownContent || htmlContent, textContent);
                        },
                        onMarkdownChange: (markdownContent) => {
                            // Handle markdown change directly
                            this.safeHandleEditorContentChange(markdownContent, '');
                        },
                        onAutoSave: (data) => {
                            // data contains { markdown, html, timestamp }
                            this.safeHandleEditorAutoSave(data.markdown || data.html);
                        }
                    });
                } else if (typeof EnhancedWYSIWYGEditor !== 'undefined') {
                    // Fallback to EnhancedWYSIWYGEditor if TiptapWYSIWYGEditor is not available
                    this.richTextEditor = new EnhancedWYSIWYGEditor(editorContent, {
                        enableToolbar: true,
                        enableRealTimePreview: true,
                        enableAutoSave: this.options.enableAutoSave,
                        autoSaveInterval: this.options.autoSaveInterval,
                        enableMarkdownParsing: true,
                        enableBusinessFormatting: false,
                        placeholder: 'レポートを編集してください...',
                        onContentChange: (content, textContent) => {
                            this.safeHandleEditorContentChange(content, textContent);
                        },
                        onAutoSave: (content) => {
                            this.safeHandleEditorAutoSave(content);
                        }
                    });
                } else if (typeof RichTextEditor !== 'undefined') {
                    // Fallback to RichTextEditor if EnhancedWYSIWYGEditor is not available
                    this.richTextEditor = new RichTextEditor(editorContent, {
                        enableToolbar: true,
                        enableRealTimePreview: true,
                        enableAutoSave: this.options.enableAutoSave,
                        autoSaveInterval: this.options.autoSaveInterval,
                        placeholder: 'レポートを編集してください...',
                        onContentChange: (content, textContent) => {
                            this.safeHandleEditorContentChange(content, textContent);
                        },
                        onAutoSave: (content) => {
                            this.safeHandleEditorAutoSave(content);
                        }
                    });
                } else {
                    throw new Error('Neither EnhancedWYSIWYGEditor nor RichTextEditor is available');
                }
                
                // Wrap with error boundary if available
                if (this.errorBoundary) {
                    this.richTextEditor = this.errorBoundary.wrapComponent(this.richTextEditor);
                }
            }
            
            // Set content from ContentState after editor is ready
            // Use setTimeout to ensure editor is fully initialized
            // Also check if richTextEditor is ready
            const setInitialContent = () => {
                if (this.contentState && this.richTextEditor) {
                    // Check if EnhancedWYSIWYGEditor is ready
                    const isReady = this.richTextEditor.isReady ? this.richTextEditor.isReady() : 
                                   (this.richTextEditor.isInitialized !== false);
                    
                    if (!isReady) {
                        console.log('[TabNavigation] Waiting for editor to be ready...');
                        setTimeout(setInitialContent, 100);
                        return;
                    }
                    
                    const editedContent = this.contentState.getEditedContent();
                    if (editedContent.content) {
                        // TiptapWYSIWYGEditor accepts Markdown directly
                        const content = editedContent.content;
                        console.log('[TabNavigation] Setting edited content in editor (Markdown length:', content.length, ')');
                        if (this.richTextEditor instanceof TiptapWYSIWYGEditor) {
                            this.richTextEditor.setContent(content, 'markdown');
                        } else {
                            // Fallback for EnhancedWYSIWYGEditor
                            const htmlContent = this.convertMarkdownToEditableHTML(content);
                            this.safeSetContent(this.richTextEditor, htmlContent, 'EnhancedWYSIWYGEditor');
                        }
                    } else {
                        // Initialize with original content if no edited version exists
                        const originalContent = this.contentState.getOriginalContent();
                        if (originalContent.content) {
                            const content = originalContent.content;
                            console.log('[TabNavigation] Setting original content in editor (Markdown length:', content.length, ')');
                            if (this.richTextEditor instanceof TiptapWYSIWYGEditor) {
                                this.richTextEditor.setContent(content, 'markdown');
                            } else {
                                // Fallback for EnhancedWYSIWYGEditor
                                const htmlContent = this.convertMarkdownToEditableHTML(content);
                                this.safeSetContent(this.richTextEditor, htmlContent, 'EnhancedWYSIWYGEditor');
                            }
                        }
                    }
                }
            };
            
            // Wait a bit for editor structure to be created
            setTimeout(setInitialContent, 150);
            
            // Mark as successfully initialized
            this.componentErrors.delete('EnhancedWYSIWYGEditor');
            this.componentErrors.delete('RichTextEditor'); // Also clear old error key
            
        } catch (error) {
            this.handleComponentError('EnhancedWYSIWYGEditor', error);
            this.showComponentFallback(editorContent, 'EnhancedWYSIWYGEditor', 'リッチテキストエディターの初期化に失敗しました');
        }
    }
    
    /**
     * Initialize comparison tab with error handling
     */
    initializeComparisonTab() {
        const comparisonContent = document.getElementById('comparisonContent');
        if (!comparisonContent) {
            this.handleComponentError('ComparisonView', 'Container element not found');
            return;
        }
        
        try {
            if (!this.comparisonView) {
                this.comparisonView = new ComparisonView(comparisonContent, {
                    showLineNumbers: true,
                    syncScroll: true,
                    allowReversion: true
                });
                
                // Wrap with error boundary if available
                if (this.errorBoundary) {
                    this.comparisonView = this.errorBoundary.wrapComponent(this.comparisonView);
                }
            }
            
            // Update comparison with current content
            if (this.contentState) {
                const originalContent = this.contentState.getOriginalContent();
                const editedContent = this.contentState.getEditedContent();
                
                this.safeUpdateComparison(
                    originalContent.content,
                    editedContent.content
                );
            }
            
            // Mark as successfully initialized
            this.componentErrors.delete('ComparisonView');
            
        } catch (error) {
            this.handleComponentError('ComparisonView', error);
            this.showComponentFallback(comparisonContent, 'ComparisonView', '比較機能の初期化に失敗しました');
        }
    }
    
    /**
     * Set content for all tabs
     */
    setContent(content, metadata = {}) {
        try {
            // Update ContentState
            if (this.contentState) {
                this.contentState.setOriginalContent(content, metadata);
            }
            
            // Update raw tab content
            this.updateRawTabContent(content);
            
            // Update preview tab if initialized
            if (this.previewTab && this.previewTab.isReady()) {
                this.previewTab.setContent(content);
            }
            
            // Update editor tab if initialized
            if (this.richTextEditor && this.richTextEditor.isReady()) {
                // Always convert Markdown to HTML for WYSIWYG editor
                const htmlContent = this.convertMarkdownToEditableHTML(content);
                this.safeSetContent(this.richTextEditor, htmlContent, 'EnhancedWYSIWYGEditor');
            }
            
            // Update comparison tab if initialized
            if (this.comparisonView) {
                this.comparisonView.updateComparison(content, content);
            }
            
            console.log('Content set for all tabs:', content?.length, 'characters');
            
        } catch (error) {
            console.error('Error setting content:', error);
            this.showError('コンテンツの設定中にエラーが発生しました');
        }
    }
    
    /**
     * Update raw tab content
     */
    updateRawTabContent(content) {
        const preview = document.getElementById('preview');
        if (preview) {
            preview.innerHTML = `
                <div style="margin-bottom: var(--space-4);">
                    <div 
                        id="reportContent" 
                        style="
                            border: 1px solid var(--color-gray-300); 
                            border-radius: 6px; 
                            padding: var(--space-4); 
                            background: white;
                            min-height: 400px;
                            font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif;
                            line-height: 1.6;
                        "
                    >${this.formatReportContent(content)}</div>
                </div>
            `;
        }
    }
    
    /**
     * Handle editor content changes
     */
    handleEditorContentChange(content, textContent) {
        if (this.contentState) {
            // Extract formatting information (simplified)
            const formatting = this.extractFormattingInfo(content);
            this.contentState.setEditedContent(content, formatting);
        }
        
        // Update comparison view if active
        if (this.comparisonView && this.activeTab === 'comparison') {
            const originalContent = this.contentState ? 
                this.contentState.getOriginalContent().content : '';
            this.comparisonView.updateComparison(originalContent, content);
        }
        
        this.emit('contentChange', {
            type: 'editor',
            content,
            textContent,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Handle editor auto-save
     */
    handleEditorAutoSave(content) {
        console.log('Editor auto-save triggered');
        if (this.contentState) {
            this.contentState.save();
        }
    }
    
    /**
     * Handle ContentState changes
     */
    handleStateChange(data) {
        console.log('ContentState changed:', data.type);
        this.emit('stateChange', data);
    }
    
    /**
     * Handle content changes from ContentState
     */
    handleContentChange(data) {
        console.log('Content changed from state:', data.type);
        
        // Update comparison view if it's active and content changed
        if (this.comparisonView && (this.activeTab === 'comparison' || data.type === 'edited')) {
            const originalContent = this.contentState.getOriginalContent().content;
            const editedContent = this.contentState.getEditedContent().content;
            this.comparisonView.updateComparison(originalContent, editedContent);
        }
        
        this.emit('contentChange', data);
    }
    
    /**
     * Handle tab changes from ContentState
     */
    handleTabChangeFromState(data) {
        // This prevents infinite loops when tab changes come from ContentState
        if (data.to !== this.activeTab) {
            this.activeTab = data.to;
            this.updateTabButtons();
            this.updateTabPanes();
            this.initializeTabContent(data.to);
        }
    }
    
    /**
     * Handle save events
     */
    handleSave(data) {
        console.log('Content saved:', data.timestamp);
        // Could show a notification or update UI to indicate save status
    }
    
    /**
     * Handle revert change from comparison view
     */
    handleRevertChange(detail) {
        console.log('Reverting change:', detail);
        // Implementation would depend on the specific change type
        // For now, just log the event
    }
    
    /**
     * Handle reset all changes
     */
    handleResetAllChanges(detail) {
        console.log('Resetting all changes');
        if (this.contentState) {
            this.contentState.reset();
            
            // Update editor content
            if (this.richTextEditor && this.richTextEditor.isReady()) {
                const originalContent = this.contentState.getOriginalContent().content;
                const htmlContent = this.convertMarkdownToEditableHTML(originalContent);
                this.richTextEditor.setContent(htmlContent);
            }
        }
    }
    
    /**
     * Initialize accessibility manager
     */
    initializeAccessibilityManager() {
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
                
                this.accessibilityManager.on('focusChange', (data) => {
                    this.handleFocusChange(data);
                });
                
                console.log('Tab navigation accessibility manager initialized');
            }
        } catch (error) {
            console.error('Error initializing accessibility manager:', error);
        }
    }
    
    /**
     * Handle accessibility-related keyboard events
     */
    handleAccessibilityKeyboard(data) {
        // Handle tab navigation specific accessibility shortcuts
        if (data.key === 'F1' && data.target.closest('.tab-navigation')) {
            this.showTabNavigationHelp();
        }
    }
    
    /**
     * Handle contrast changes
     */
    handleContrastChange(data) {
        // Update tab navigation UI for contrast changes
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            if (data.enabled) {
                button.classList.add('high-contrast');
            } else {
                button.classList.remove('high-contrast');
            }
        });
    }
    
    /**
     * Handle focus changes
     */
    handleFocusChange(data) {
        // Track focus for tab navigation analytics
        if (data.element.classList.contains('tab-button')) {
            console.debug('Tab button focused:', data.element.dataset.tab);
        }
    }
    
    /**
     * Show tab navigation help
     */
    showTabNavigationHelp() {
        const helpModal = document.createElement('div');
        helpModal.className = 'tab-navigation-help-modal';
        helpModal.innerHTML = `
            <div class="tab-navigation-help-content">
                <h2>タブナビゲーションのヘルプ</h2>
                <div class="help-sections">
                    <div class="help-section">
                        <h3>キーボードナビゲーション</h3>
                        <ul>
                            <li><kbd>←→</kbd>: タブ間移動</li>
                            <li><kbd>Home/End</kbd>: 最初/最後のタブ</li>
                            <li><kbd>Enter/Space</kbd>: タブ選択</li>
                            <li><kbd>Ctrl+PageUp/PageDown</kbd>: コンテンツ内でのタブ切り替え</li>
                        </ul>
                    </div>
                    <div class="help-section">
                        <h3>タブの説明</h3>
                        <ul>
                            <li><strong>Raw</strong>: 生のマークダウンコンテンツ</li>
                            <li><strong>Preview</strong>: フォーマットされたプレビュー</li>
                            <li><strong>Editor</strong>: リッチテキストエディター</li>
                            <li><strong>Comparison</strong>: 変更の比較表示</li>
                        </ul>
                    </div>
                    <div class="help-section">
                        <h3>アクセシビリティ機能</h3>
                        <ul>
                            <li>スクリーンリーダー対応</li>
                            <li>キーボード完全対応</li>
                            <li>ハイコントラストモード</li>
                            <li>フォーカス管理</li>
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
     * Set up keyboard navigation with enhanced accessibility
     */
    setupKeyboardNavigation() {
        // Enhanced keyboard navigation for tab buttons
        document.addEventListener('keydown', (e) => {
            // Handle keyboard navigation when focus is on tab buttons or within tab content
            const isTabButton = e.target.classList.contains('tab-button');
            const isInTabContent = e.target.closest('.tab-pane');
            
            if (isTabButton) {
                this.handleTabButtonKeydown(e);
            } else if (isInTabContent) {
                this.handleTabContentKeydown(e);
            }
        });

        // Add focus management for tab panels
        this.setupFocusManagement();
        
        // Add screen reader announcements
        this.setupScreenReaderSupport();
    }

    /**
     * Handle keyboard navigation for tab buttons
     */
    handleTabButtonKeydown(e) {
        const currentIndex = this.tabs.indexOf(this.activeTab);
        let newIndex = currentIndex;
        let handled = false;
        
        switch (e.key) {
            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                newIndex = currentIndex > 0 ? currentIndex - 1 : this.tabs.length - 1;
                handled = true;
                break;
            case 'ArrowRight':
            case 'ArrowDown':
                e.preventDefault();
                newIndex = currentIndex < this.tabs.length - 1 ? currentIndex + 1 : 0;
                handled = true;
                break;
            case 'Home':
                e.preventDefault();
                newIndex = 0;
                handled = true;
                break;
            case 'End':
                e.preventDefault();
                newIndex = this.tabs.length - 1;
                handled = true;
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                // Tab button is already focused, just activate it
                this.switchTab(this.tabs[currentIndex]);
                handled = true;
                break;
        }
        
        if (handled && newIndex !== currentIndex) {
            const newTab = this.tabs[newIndex];
            this.switchTab(newTab);
            
            // Focus the new tab button
            setTimeout(() => {
                this.tabButtons[newTab]?.focus();
                this.announceTabChange(newTab);
            }, 50);
        }
    }

    /**
     * Handle keyboard navigation within tab content
     */
    handleTabContentKeydown(e) {
        // Ctrl+PageUp/PageDown for tab switching
        if (e.ctrlKey) {
            const currentIndex = this.tabs.indexOf(this.activeTab);
            let newIndex = currentIndex;
            
            switch (e.key) {
                case 'PageUp':
                    e.preventDefault();
                    newIndex = currentIndex > 0 ? currentIndex - 1 : this.tabs.length - 1;
                    break;
                case 'PageDown':
                    e.preventDefault();
                    newIndex = currentIndex < this.tabs.length - 1 ? currentIndex + 1 : 0;
                    break;
            }
            
            if (newIndex !== currentIndex) {
                const newTab = this.tabs[newIndex];
                this.switchTab(newTab);
                this.focusTabContent(newTab);
                this.announceTabChange(newTab);
            }
        }
    }

    /**
     * Setup focus management for accessibility
     */
    setupFocusManagement() {
        // Ensure tab panels are focusable for screen readers
        Object.keys(this.tabPanes).forEach(tab => {
            const pane = this.tabPanes[tab];
            if (pane) {
                pane.setAttribute('tabindex', '-1');
                
                // Add focus styles for tab panels
                pane.addEventListener('focus', () => {
                    pane.style.outline = '2px solid var(--color-primary, #3b82f6)';
                    pane.style.outlineOffset = '2px';
                });
                
                pane.addEventListener('blur', () => {
                    pane.style.outline = 'none';
                });
            }
        });

        // Manage focus when switching tabs
        this.on('tabChange', (data) => {
            this.manageFocusOnTabChange(data.from, data.to);
        });
    }

    /**
     * Setup screen reader support
     */
    setupScreenReaderSupport() {
        // Create live region for announcements
        this.createLiveRegion();
        
        // Add descriptive labels to tab buttons
        Object.keys(this.tabButtons).forEach(tab => {
            const button = this.tabButtons[tab];
            if (button) {
                const descriptions = {
                    'raw': 'マークダウン形式の生のレポート内容を表示',
                    'preview': 'フォーマットされたレポートのプレビューを表示',
                    'editor': 'リッチテキストエディターでレポートを編集',
                    'comparison': '元のレポートと編集版を比較表示'
                };
                
                button.setAttribute('aria-describedby', `${tab}-description`);
                
                // Create description element
                const description = document.createElement('div');
                description.id = `${tab}-description`;
                description.className = 'sr-only';
                description.textContent = descriptions[tab] || `${tab}タブ`;
                document.body.appendChild(description);
            }
        });
    }

    /**
     * Create live region for screen reader announcements
     */
    createLiveRegion() {
        this.liveRegion = document.createElement('div');
        this.liveRegion.setAttribute('aria-live', 'polite');
        this.liveRegion.setAttribute('aria-atomic', 'true');
        this.liveRegion.className = 'sr-only';
        this.liveRegion.id = 'tab-announcements';
        document.body.appendChild(this.liveRegion);
    }

    /**
     * Announce tab changes to screen readers
     */
    announceTabChange(tabName) {
        if (!this.liveRegion) return;
        
        const announcements = {
            'raw': 'Rawタブが選択されました。マークダウン形式のレポート内容が表示されています。',
            'preview': 'Previewタブが選択されました。フォーマットされたレポートが表示されています。',
            'editor': 'Editorタブが選択されました。リッチテキストエディターが利用できます。',
            'comparison': 'Comparisonタブが選択されました。元のレポートと編集版の比較が表示されています。'
        };
        
        const announcement = announcements[tabName] || `${tabName}タブが選択されました。`;
        
        // Clear and set new announcement
        this.liveRegion.textContent = '';
        setTimeout(() => {
            this.liveRegion.textContent = announcement;
        }, 100);
    }

    /**
     * Manage focus when switching tabs
     */
    manageFocusOnTabChange(fromTab, toTab) {
        // If user was focused on a tab button, keep focus on the new tab button
        const activeElement = document.activeElement;
        if (activeElement && activeElement.classList.contains('tab-button')) {
            setTimeout(() => {
                this.tabButtons[toTab]?.focus();
            }, 50);
        }
    }

    /**
     * Focus tab content for keyboard users
     */
    focusTabContent(tabName) {
        const pane = this.tabPanes[tabName];
        if (pane) {
            // Focus the tab panel for screen readers
            pane.focus();
            
            // If there's focusable content within the tab, focus the first element
            const focusableElements = pane.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'
            );
            
            if (focusableElements.length > 0) {
                setTimeout(() => {
                    focusableElements[0].focus();
                }, 100);
            }
        }
    }
    
    /**
     * Convert markdown to editable HTML
     */
    convertMarkdownToEditableHTML(markdown) {
        if (!markdown) return '';
        
        try {
            // Use MarkdownRenderer if available (preferred method for better rendering)
            if (typeof MarkdownRenderer !== 'undefined') {
                const renderer = new MarkdownRenderer({
                    businessFormatting: false, // Don't use business formatting in editor
                    enableTables: true,
                    enableLists: true,
                    enableCodeBlocks: true
                });
                const html = renderer.render(markdown, false);
                // Extract content from wrapper div if present
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                const contentDiv = tempDiv.querySelector('.markdown-content');
                return contentDiv ? contentDiv.innerHTML : html.replace(/^<div[^>]*>|<\/div>$/g, '');
            }
        } catch (error) {
            console.warn('MarkdownRenderer not available, using fallback conversion:', error);
        }
        
        // Fallback: Enhanced markdown to HTML conversion for editing
        // Process line by line to handle headers correctly
        let lines = markdown.split('\n');
        let html = '';
        let inParagraph = false;
        let inList = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            
            // Skip empty lines
            if (!trimmedLine) {
                if (inParagraph) {
                    html += '</p>\n';
                    inParagraph = false;
                }
                if (inList) {
                    html += '</ul>\n';
                    inList = false;
                }
                continue;
            }
            
            // Headers (must be at start of line)
            if (trimmedLine.match(/^######\s+(.+)$/)) {
                if (inParagraph) { html += '</p>\n'; inParagraph = false; }
                html += '<h6>' + trimmedLine.replace(/^######\s+/, '') + '</h6>\n';
            } else if (trimmedLine.match(/^#####\s+(.+)$/)) {
                if (inParagraph) { html += '</p>\n'; inParagraph = false; }
                html += '<h5>' + trimmedLine.replace(/^#####\s+/, '') + '</h5>\n';
            } else if (trimmedLine.match(/^####\s+(.+)$/)) {
                if (inParagraph) { html += '</p>\n'; inParagraph = false; }
                html += '<h4>' + trimmedLine.replace(/^####\s+/, '') + '</h4>\n';
            } else if (trimmedLine.match(/^###\s+(.+)$/)) {
                if (inParagraph) { html += '</p>\n'; inParagraph = false; }
                html += '<h3>' + trimmedLine.replace(/^###\s+/, '') + '</h3>\n';
            } else if (trimmedLine.match(/^##\s+(.+)$/)) {
                if (inParagraph) { html += '</p>\n'; inParagraph = false; }
                html += '<h2>' + trimmedLine.replace(/^##\s+/, '') + '</h2>\n';
            } else if (trimmedLine.match(/^#\s+(.+)$/)) {
                if (inParagraph) { html += '</p>\n'; inParagraph = false; }
                html += '<h1>' + trimmedLine.replace(/^#\s+/, '') + '</h1>\n';
            } else {
                // Process inline formatting (bold, italic)
                let processedLine = trimmedLine
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');
                
                // Start paragraph if not in one
                if (!inParagraph) {
                    html += '<p>';
                    inParagraph = true;
                } else {
                    html += '<br>';
                }
                html += processedLine;
            }
        }
        
        // Close any open paragraph
        if (inParagraph) {
            html += '</p>\n';
        }
        
        return html.trim();
    }
    
    /**
     * Extract formatting information from HTML content
     */
    extractFormattingInfo(htmlContent) {
        const formatting = [];
        
        // Simple extraction - could be enhanced
        if (htmlContent.includes('<strong>')) {
            formatting.push({ type: 'bold', count: (htmlContent.match(/<strong>/g) || []).length });
        }
        if (htmlContent.includes('<em>')) {
            formatting.push({ type: 'italic', count: (htmlContent.match(/<em>/g) || []).length });
        }
        if (htmlContent.includes('<u>')) {
            formatting.push({ type: 'underline', count: (htmlContent.match(/<u>/g) || []).length });
        }
        
        return formatting;
    }
    
    /**
     * Format report content for raw display
     */
    formatReportContent(content) {
        if (!content) return '';
        
        try {
            // Use MarkdownRenderer if available for better rendering
            if (typeof MarkdownRenderer !== 'undefined') {
                const renderer = new MarkdownRenderer({
                    businessFormatting: false,
                    enableTables: true,
                    enableLists: true,
                    enableCodeBlocks: true
                });
                return renderer.render(content, false);
            }
        } catch (error) {
            console.warn('MarkdownRenderer not available, using fallback conversion:', error);
        }
        
        // Fallback: Enhanced markdown to HTML conversion (same as convertMarkdownToEditableHTML)
        // Process line by line to handle headers correctly
        let lines = content.split('\n');
        let html = '';
        let inParagraph = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            
            // Skip empty lines
            if (!trimmedLine) {
                if (inParagraph) {
                    html += '</p>\n';
                    inParagraph = false;
                }
                continue;
            }
            
            // Headers (must be at start of line)
            if (trimmedLine.match(/^######\s+(.+)$/)) {
                if (inParagraph) { html += '</p>\n'; inParagraph = false; }
                html += '<h6>' + trimmedLine.replace(/^######\s+/, '') + '</h6>\n';
            } else if (trimmedLine.match(/^#####\s+(.+)$/)) {
                if (inParagraph) { html += '</p>\n'; inParagraph = false; }
                html += '<h5>' + trimmedLine.replace(/^#####\s+/, '') + '</h5>\n';
            } else if (trimmedLine.match(/^####\s+(.+)$/)) {
                if (inParagraph) { html += '</p>\n'; inParagraph = false; }
                html += '<h4>' + trimmedLine.replace(/^####\s+/, '') + '</h4>\n';
            } else if (trimmedLine.match(/^###\s+(.+)$/)) {
                if (inParagraph) { html += '</p>\n'; inParagraph = false; }
                html += '<h3>' + trimmedLine.replace(/^###\s+/, '') + '</h3>\n';
            } else if (trimmedLine.match(/^##\s+(.+)$/)) {
                if (inParagraph) { html += '</p>\n'; inParagraph = false; }
                html += '<h2>' + trimmedLine.replace(/^##\s+/, '') + '</h2>\n';
            } else if (trimmedLine.match(/^#\s+(.+)$/)) {
                if (inParagraph) { html += '</p>\n'; inParagraph = false; }
                html += '<h1>' + trimmedLine.replace(/^#\s+/, '') + '</h1>\n';
            } else {
                // Process inline formatting (bold, italic)
                let processedLine = trimmedLine
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');
                
                // Start paragraph if not in one
                if (!inParagraph) {
                    html += '<p>';
                    inParagraph = true;
                } else {
                    html += '<br>';
                }
                html += processedLine;
            }
        }
        
        // Close any open paragraph
        if (inParagraph) {
            html += '</p>\n';
        }
        
        return html.trim();
    }
    
    /**
     * Show error message
     */
    showError(message) {
        console.error('TabNavigation error:', message);
        // Could show a notification or error state in the UI
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
                console.error('Error in TabNavigation event listener:', error);
            }
        });
    }
    
    /**
     * Get current state
     */
    getState() {
        return {
            activeTab: this.activeTab,
            contentState: this.contentState ? this.contentState.getState() : null,
            components: {
                previewTab: this.previewTab ? this.previewTab.isReady() : false,
                richTextEditor: this.richTextEditor ? this.richTextEditor.isReady() : false,
                comparisonView: this.comparisonView ? true : false
            }
        };
    }
    
    /**
     * Get active tab
     */
    getActiveTab() {
        return this.activeTab;
    }
    
    /**
     * Get content state
     */
    getContentState() {
        return this.contentState ? this.contentState.getState() : null;
    }
    
    /**
     * Check if content is dirty
     */
    isDirty() {
        return this.contentState ? this.contentState.isDirty() : false;
    }
    
    /**
     * Save current state
     */
    save() {
        if (this.contentState) {
            return this.contentState.save();
        }
        return false;
    }
    
    /**
     * Clear all content
     */
    clear() {
        if (this.contentState) {
            this.contentState.clear();
        }
        
        // Clear component content
        if (this.previewTab) {
            this.previewTab.clear();
        }
        if (this.richTextEditor) {
            this.richTextEditor.clear();
        }
        if (this.comparisonView) {
            this.comparisonView.updateComparison('', '');
        }
        
        this.updateRawTabContent('');
    }
    
    /**
     * Handle initialization errors
     */
    handleInitializationError(error) {
        console.error('TabNavigation initialization failed:', error);
        
        if (this.container) {
            this.container.innerHTML = `
                <div style="padding: var(--space-4); text-align: center; color: var(--color-red-600); background: var(--color-red-50); border: 1px solid var(--color-red-200); border-radius: 6px; margin: var(--space-4);">
                    <h3 style="margin: 0 0 var(--space-2) 0;">タブナビゲーションの初期化に失敗しました</h3>
                    <p style="margin: 0 0 var(--space-3) 0;">ページを再読み込みしてください。問題が続く場合は、ブラウザのキャッシュをクリアしてください。</p>
                    <button onclick="window.location.reload()" style="padding: var(--space-2) var(--space-4); background: var(--color-red-600); color: white; border: none; border-radius: 4px; cursor: pointer;">
                        ページを再読み込み
                    </button>
                </div>
            `;
        }
        
        // Emit error event
        this.emit('error', {
            type: 'initialization',
            error: error,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Handle component-specific errors
     */
    handleComponentError(componentName, error) {
        const errorInfo = {
            component: componentName,
            error: error,
            timestamp: new Date().toISOString(),
            count: (this.componentErrors.get(componentName)?.count || 0) + 1
        };
        
        this.componentErrors.set(componentName, errorInfo);
        
        console.error(`${componentName} error:`, error);
        
        // Emit error event
        this.emit('error', {
            type: 'component',
            ...errorInfo
        });
        
        // If error boundary is available, let it handle the error
        if (this.errorBoundary) {
            this.errorBoundary.handleComponentError(error, componentName);
        }
    }

    /**
     * Show component fallback UI
     */
    showComponentFallback(container, componentName, message) {
        if (!container) return;
        
        const fallbackMessages = {
            'PreviewTab': 'プレビュー機能が利用できません。Rawタブをご利用ください。',
            'RichTextEditor': 'エディター機能が利用できません。Rawタブで内容を確認してください。',
            'ComparisonView': '比較機能が利用できません。各タブで個別に内容を確認してください。'
        };
        
        const fallbackMessage = fallbackMessages[componentName] || message;
        
        container.innerHTML = `
            <div style="padding: var(--space-4); text-align: center; color: var(--color-red-600); background: var(--color-red-50); border: 1px solid var(--color-red-200); border-radius: 6px;">
                <div style="display: flex; align-items: center; justify-content: center; gap: var(--space-2); margin-bottom: var(--space-2);">
                    <svg style="width: 20px; height: 20px;" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                    </svg>
                    <strong>コンポーネントエラー</strong>
                </div>
                <p style="margin: 0 0 var(--space-3) 0;">${fallbackMessage}</p>
                <div style="display: flex; gap: var(--space-2); justify-content: center; flex-wrap: wrap;">
                    <button onclick="this.closest('[id$=\\"Content\\"]').dispatchEvent(new CustomEvent('retry-component', {detail: '${componentName}'}))" 
                            style="padding: var(--space-2) var(--space-3); background: var(--color-red-600); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem;">
                        再試行
                    </button>
                    <button onclick="document.querySelector('[data-tab=\\"raw\\"]')?.click()" 
                            style="padding: var(--space-2) var(--space-3); background: white; color: var(--color-red-600); border: 1px solid var(--color-red-300); border-radius: 4px; cursor: pointer; font-size: 0.875rem;">
                        Rawタブに移動
                    </button>
                </div>
            </div>
        `;
        
        // Add retry functionality
        container.addEventListener('retry-component', (e) => {
            this.retryComponentInitialization(e.detail);
        }, { once: true });
    }

    /**
     * Retry component initialization
     */
    retryComponentInitialization(componentName) {
        const errorInfo = this.componentErrors.get(componentName);
        
        if (errorInfo && errorInfo.count < this.options.maxRetries) {
            console.log(`Retrying ${componentName} initialization...`);
            
            setTimeout(() => {
                switch (componentName) {
                    case 'PreviewTab':
                        this.initializePreviewTab();
                        break;
                    case 'RichTextEditor':
                        this.initializeEditorTab();
                        break;
                    case 'ComparisonView':
                        this.initializeComparisonTab();
                        break;
                }
            }, 1000);
        } else {
            console.warn(`Max retries exceeded for ${componentName}`);
        }
    }

    /**
     * Safe content setting with error handling
     */
    safeSetContent(component, content, componentName) {
        try {
            if (!component || !content) return false;
            
            // For EnhancedWYSIWYGEditor, ensure Markdown is converted to HTML
            if (componentName === 'EnhancedWYSIWYGEditor' && component.setContent) {
                // Check if content is Markdown
                const isMarkdown = this.isMarkdownContent(content);
                if (isMarkdown) {
                    // Convert Markdown to HTML first
                    const htmlContent = this.convertMarkdownToEditableHTML(content);
                    component.setContent(htmlContent, 'html');
                } else {
                    // Content is already HTML
                    component.setContent(content, 'html');
                }
                return true;
            } else if (component.setContent) {
                // For other components
                component.setContent(content);
                return true;
            }
        } catch (error) {
            this.handleComponentError(componentName, error);
            return false;
        }
        return false;
    }
    
    /**
     * Check if content is Markdown format
     */
    isMarkdownContent(content) {
        if (!content || typeof content !== 'string') return false;
        
        // Check for Markdown patterns
        const markdownPatterns = [
            /^#{1,6}\s+/m,           // Headers
            /\*\*.*?\*\*/,           // Bold
            /\*[^*\n]+?\*/,          // Italic (not part of **)
            /^\s*[-*+]\s+/m,         // Unordered lists
            /^\s*\d+\.\s+/m,         // Ordered lists
            /\[.*?\]\(.*?\)/,        // Links
            /!\[.*?\]\(.*?\)/        // Images
        ];
        
        return markdownPatterns.some(pattern => pattern.test(content));
    }

    /**
     * Safe comparison update with error handling
     */
    safeUpdateComparison(originalContent, editedContent) {
        try {
            if (this.comparisonView && this.comparisonView.updateComparison) {
                this.comparisonView.updateComparison(originalContent, editedContent);
                return true;
            }
        } catch (error) {
            this.handleComponentError('ComparisonView', error);
            return false;
        }
        return false;
    }

    /**
     * Safe editor content change handling
     */
    safeHandleEditorContentChange(content, textContent) {
        try {
            this.handleEditorContentChange(content, textContent);
        } catch (error) {
            this.handleComponentError('RichTextEditor', error);
        }
    }

    /**
     * Safe editor auto-save handling
     */
    safeHandleEditorAutoSave(content) {
        try {
            this.handleEditorAutoSave(content);
        } catch (error) {
            this.handleComponentError('RichTextEditor', error);
        }
    }

    /**
     * Enhanced switch tab with error handling
     */
    switchTabSafely(tabName) {
        if (!this.tabs.includes(tabName)) {
            console.warn(`Invalid tab: ${tabName}`);
            return false;
        }
        
        try {
            const previousTab = this.activeTab;
            
            // Check if target tab has errors
            const hasErrors = this.hasTabErrors(tabName);
            if (hasErrors && this.options.enableFallback && tabName !== this.options.fallbackTab) {
                console.warn(`Tab ${tabName} has errors, falling back to ${this.options.fallbackTab}`);
                if (this.errorBoundary) {
                    this.errorBoundary.showFallbackMessage(tabName);
                }
                return this.switchTabSafely(this.options.fallbackTab);
            }
            
            // Update ContentState if enabled
            if (this.contentState) {
                this.contentState.setActiveTab(tabName);
            }
            
            // Update active tab
            this.activeTab = tabName;
            
            // Update button states
            this.updateTabButtons();
            
            // Update pane visibility
            this.updateTabPanes();
            
            // Initialize tab content if needed
            this.initializeTabContent(tabName);
            
            // Emit tab change event
            this.emit('tabChange', {
                from: previousTab,
                to: tabName,
                timestamp: new Date().toISOString()
            });
            
            console.log(`Tab switched: ${previousTab} -> ${tabName}`);
            return true;
            
        } catch (error) {
            this.handleComponentError('TabNavigation', error);
            
            // Fallback to raw tab if enabled and not already trying raw tab
            if (this.options.enableFallback && tabName !== this.options.fallbackTab) {
                console.warn(`Tab switch to ${tabName} failed, falling back to ${this.options.fallbackTab}`);
                if (this.errorBoundary) {
                    this.errorBoundary.showFallbackMessage(tabName);
                }
                return this.switchTabSafely(this.options.fallbackTab);
            }
            
            return false;
        }
    }

    /**
     * Check if a tab has errors
     */
    hasTabErrors(tabName) {
        const componentMap = {
            'preview': 'PreviewTab',
            'editor': 'RichTextEditor',
            'comparison': 'ComparisonView'
        };
        
        const componentName = componentMap[tabName];
        return componentName && this.componentErrors.has(componentName);
    }

    /**
     * Get error statistics
     */
    getErrorStats() {
        const stats = {
            totalErrors: this.componentErrors.size,
            errorsByComponent: {},
            hasRecentErrors: false
        };
        
        this.componentErrors.forEach((error, component) => {
            stats.errorsByComponent[component] = error.count;
            
            // Check if error occurred in last 5 minutes
            const errorTime = new Date(error.timestamp);
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            if (errorTime > fiveMinutesAgo) {
                stats.hasRecentErrors = true;
            }
        });
        
        return stats;
    }

    /**
     * Clear component errors
     */
    clearErrors() {
        this.componentErrors.clear();
    }

    /**
     * Check if system is healthy
     */
    isHealthy() {
        return this.componentErrors.size === 0;
    }

    /**
     * Initialize performance monitoring
     */
    initializePerformanceMonitoring() {
        this.performanceMonitor = {
            metrics: {
                tabSwitchTimes: [],
                renderTimes: [],
                contentLoadTimes: [],
                memoryUsage: []
            },
            
            startTimer: (operation) => {
                return {
                    operation,
                    startTime: performance.now(),
                    startMemory: this.getMemoryUsage()
                };
            },
            
            endTimer: (timer) => {
                const endTime = performance.now();
                const duration = endTime - timer.startTime;
                const endMemory = this.getMemoryUsage();
                
                const metric = {
                    operation: timer.operation,
                    duration,
                    memoryDelta: endMemory - timer.startMemory,
                    timestamp: new Date().toISOString()
                };
                
                this.recordPerformanceMetric(metric);
                return metric;
            }
        };
        
        // Monitor tab switch performance
        this.on('tabChange', (data) => {
            this.measureTabSwitchPerformance(data);
        });
        
        // Monitor memory usage periodically
        setInterval(() => {
            this.monitorMemoryUsage();
        }, 30000); // Every 30 seconds
    }

    /**
     * Setup lazy loading for tab content
     */
    setupLazyLoading() {
        // Create intersection observer for lazy loading
        if ('IntersectionObserver' in window) {
            this.intersectionObserver = new IntersectionObserver(
                (entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const tabName = entry.target.id.replace('Tab', '');
                            this.lazyLoadTabContent(tabName);
                        }
                    });
                },
                { threshold: 0.1 }
            );
            
            // Observe all tab panes
            Object.values(this.tabPanes).forEach(pane => {
                if (pane) {
                    this.intersectionObserver.observe(pane);
                }
            });
        }
        
        // Setup virtual scrolling for large content
        this.setupVirtualScrolling();
    }

    /**
     * Setup virtual scrolling for large reports
     */
    setupVirtualScrolling() {
        // This will be implemented for each tab component that needs it
        // For now, we'll add the infrastructure
        this.virtualScrollConfig = {
            itemHeight: 50,
            bufferSize: 10,
            enabled: false
        };
    }

    /**
     * Lazy load tab content when needed
     */
    lazyLoadTabContent(tabName) {
        if (this.lazyLoadedTabs.has(tabName)) {
            return; // Already loaded
        }
        
        const timer = this.performanceMonitor.startTimer(`lazy-load-${tabName}`);
        
        try {
            // Only initialize if tab is becoming visible
            if (tabName === this.activeTab || this.isTabVisible(tabName)) {
                this.initializeTabContent(tabName);
                this.lazyLoadedTabs.add(tabName);
                
                this.performanceMonitor.endTimer(timer);
                console.log(`Lazy loaded ${tabName} tab`);
            }
        } catch (error) {
            console.error(`Error lazy loading ${tabName}:`, error);
            this.handleComponentError(`LazyLoad-${tabName}`, error);
        }
    }

    /**
     * Check if tab is visible (for lazy loading)
     */
    isTabVisible(tabName) {
        const pane = this.tabPanes[tabName];
        if (!pane) return false;
        
        const rect = pane.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
    }

    /**
     * Throttled rendering for performance
     */
    scheduleRender(renderFunction, priority = 'normal') {
        const renderTask = {
            function: renderFunction,
            priority,
            timestamp: performance.now()
        };
        
        this.renderQueue.push(renderTask);
        
        if (!this.isRendering) {
            this.processRenderQueue();
        }
    }

    /**
     * Process render queue with throttling
     */
    processRenderQueue() {
        if (this.renderQueue.length === 0) {
            this.isRendering = false;
            return;
        }
        
        this.isRendering = true;
        const now = performance.now();
        
        // Throttle rendering to maintain 60fps
        if (now - this.lastRenderTime < this.renderThrottle) {
            requestAnimationFrame(() => this.processRenderQueue());
            return;
        }
        
        // Sort by priority (high priority first)
        this.renderQueue.sort((a, b) => {
            const priorities = { high: 3, normal: 2, low: 1 };
            return priorities[b.priority] - priorities[a.priority];
        });
        
        // Process one render task
        const task = this.renderQueue.shift();
        if (task) {
            try {
                task.function();
                this.lastRenderTime = now;
            } catch (error) {
                console.error('Render task error:', error);
            }
        }
        
        // Continue processing
        if (this.renderQueue.length > 0) {
            requestAnimationFrame(() => this.processRenderQueue());
        } else {
            this.isRendering = false;
        }
    }

    /**
     * Optimized content setting with debouncing
     */
    setContentOptimized(content, metadata = {}) {
        // Debounce content updates to prevent excessive re-renders
        if (this.contentUpdateTimer) {
            clearTimeout(this.contentUpdateTimer);
        }
        
        this.contentUpdateTimer = setTimeout(() => {
            this.setContent(content, metadata);
        }, 100);
    }

    /**
     * Measure tab switch performance
     */
    measureTabSwitchPerformance(data) {
        const timer = this.performanceMonitor.startTimer('tab-switch');
        
        // Measure after next frame to capture full render
        requestAnimationFrame(() => {
            const metric = this.performanceMonitor.endTimer(timer);
            metric.fromTab = data.from;
            metric.toTab = data.to;
            
            // Warn if tab switch is slow
            if (metric.duration > 100) {
                console.warn(`Slow tab switch detected: ${data.from} -> ${data.to} (${metric.duration.toFixed(2)}ms)`);
                this.emit('performance', {
                    type: 'slow-tab-switch',
                    metric
                });
            }
        });
    }

    /**
     * Monitor memory usage
     */
    monitorMemoryUsage() {
        const memoryUsage = this.getMemoryUsage();
        this.performanceMonitor.metrics.memoryUsage.push({
            usage: memoryUsage,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 100 measurements
        if (this.performanceMonitor.metrics.memoryUsage.length > 100) {
            this.performanceMonitor.metrics.memoryUsage.shift();
        }
        
        // Warn if memory usage is high
        if (memoryUsage > 100) { // 100MB threshold
            console.warn(`High memory usage detected: ${memoryUsage.toFixed(2)}MB`);
            this.emit('performance', {
                type: 'high-memory-usage',
                usage: memoryUsage
            });
        }
    }

    /**
     * Get current memory usage
     */
    getMemoryUsage() {
        if (performance.memory) {
            return performance.memory.usedJSHeapSize / 1024 / 1024; // Convert to MB
        }
        return 0;
    }

    /**
     * Record performance metric
     */
    recordPerformanceMetric(metric) {
        const metricType = metric.operation.replace(/-/g, '');
        if (!this.performanceMonitor.metrics[metricType]) {
            this.performanceMonitor.metrics[metricType] = [];
        }
        
        this.performanceMonitor.metrics[metricType].push(metric);
        
        // Keep only last 50 measurements per metric
        if (this.performanceMonitor.metrics[metricType].length > 50) {
            this.performanceMonitor.metrics[metricType].shift();
        }
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        const stats = {
            averageTabSwitchTime: 0,
            averageRenderTime: 0,
            memoryTrend: 'stable',
            slowOperations: [],
            recommendations: []
        };
        
        // Calculate average tab switch time
        const tabSwitchMetrics = this.performanceMonitor.metrics.tabswitch || [];
        if (tabSwitchMetrics.length > 0) {
            const total = tabSwitchMetrics.reduce((sum, metric) => sum + metric.duration, 0);
            stats.averageTabSwitchTime = total / tabSwitchMetrics.length;
        }
        
        // Calculate average render time
        const renderMetrics = this.performanceMonitor.metrics.render || [];
        if (renderMetrics.length > 0) {
            const total = renderMetrics.reduce((sum, metric) => sum + metric.duration, 0);
            stats.averageRenderTime = total / renderMetrics.length;
        }
        
        // Analyze memory trend
        const memoryMetrics = this.performanceMonitor.metrics.memoryUsage;
        if (memoryMetrics.length >= 2) {
            const recent = memoryMetrics.slice(-5);
            const older = memoryMetrics.slice(-10, -5);
            
            if (recent.length > 0 && older.length > 0) {
                const recentAvg = recent.reduce((sum, m) => sum + m.usage, 0) / recent.length;
                const olderAvg = older.reduce((sum, m) => sum + m.usage, 0) / older.length;
                
                if (recentAvg > olderAvg * 1.2) {
                    stats.memoryTrend = 'increasing';
                } else if (recentAvg < olderAvg * 0.8) {
                    stats.memoryTrend = 'decreasing';
                }
            }
        }
        
        // Generate recommendations
        if (stats.averageTabSwitchTime > 50) {
            stats.recommendations.push('タブ切り替えが遅いです。コンテンツの最適化を検討してください。');
        }
        
        if (stats.memoryTrend === 'increasing') {
            stats.recommendations.push('メモリ使用量が増加傾向にあります。不要なデータのクリーンアップを検討してください。');
        }
        
        return stats;
    }

    /**
     * Optimize for large content
     */
    optimizeForLargeContent(contentSize) {
        // Enable virtual scrolling for large content
        if (contentSize > 1000000) { // 1MB threshold
            this.virtualScrollConfig.enabled = true;
            console.log('Enabled virtual scrolling for large content');
        }
        
        // Adjust render throttle based on content size
        if (contentSize > 500000) { // 500KB threshold
            this.renderThrottle = 32; // ~30fps for large content
        } else {
            this.renderThrottle = 16; // ~60fps for normal content
        }
    }

    /**
     * Destroy the component and clean up resources
     */
    destroy() {
        // Clean up performance monitoring
        if (this.contentUpdateTimer) {
            clearTimeout(this.contentUpdateTimer);
        }
        
        // Clean up intersection observer
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        
        // Clean up live region
        if (this.liveRegion && this.liveRegion.parentNode) {
            this.liveRegion.parentNode.removeChild(this.liveRegion);
        }
        
        // Clean up description elements
        this.tabs.forEach(tab => {
            const description = document.getElementById(`${tab}-description`);
            if (description && description.parentNode) {
                description.parentNode.removeChild(description);
            }
        });
        
        // Destroy error boundary
        if (this.errorBoundary) {
            this.errorBoundary.destroy();
        }
        
        // Destroy ContentState
        if (this.contentState) {
            this.contentState.destroy();
        }
        
        // Destroy components
        if (this.previewTab) {
            this.previewTab.destroy();
        }
        if (this.richTextEditor) {
            this.richTextEditor.destroy();
        }
        if (this.comparisonView) {
            this.comparisonView.destroy();
        }
        
        // Clear error data
        this.componentErrors.clear();
        
        // Clear performance data
        if (this.performanceMonitor) {
            this.performanceMonitor.metrics = {};
        }
        
        // Clear render queue
        this.renderQueue = [];
        this.isRendering = false;
        
        // Clear listeners
        Object.keys(this.listeners).forEach(event => {
            this.listeners[event] = [];
        });
        
        console.log('TabNavigation destroyed with full cleanup');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TabNavigation;
} else if (typeof window !== 'undefined') {
    window.TabNavigation = TabNavigation;
}