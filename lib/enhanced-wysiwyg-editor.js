/**
 * Enhanced WYSIWYG Editor
 * Integrates RichTextEditor with markdown parsing and business formatting
 * Implements requirements 1.1, 1.2, 1.3, 1.4 for enhanced editing capabilities
 */

class EnhancedWYSIWYGEditor {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            enableMarkdownParsing: true,
            enableBusinessFormatting: false,
            enableRealTimePreview: true,
            enableAutoSave: true,
            autoSaveInterval: 5000,
            enableToolbar: true,
            enableKeyboardShortcuts: true,
            placeholder: 'ここでレポートを編集してください...',
            syncMode: 'bidirectional', // 'markdown-to-html', 'html-to-markdown', 'bidirectional'
            ...options
        };
        
        // Content state
        this.markdownContent = '';
        this.htmlContent = '';
        this.isDirty = false;
        this.isInitialized = false;
        
        // Component instances
        this.richTextEditor = null;
        this.markdownRenderer = null;
        this.businessFormatter = null;
        this.toolbar = null;
        
        // Event callbacks
        this.callbacks = {
            onContentChange: options.onContentChange || (() => {}),
            onMarkdownChange: options.onMarkdownChange || (() => {}),
            onAutoSave: options.onAutoSave || (() => {}),
            ...options.callbacks
        };
        
        // Auto-save timer
        this.autoSaveTimer = null;
        
        this.init();
    }
    
    /**
     * Initialize the enhanced WYSIWYG editor
     */
    init() {
        try {
            // Initialize component dependencies
            this.initializeComponents();
            
            // Create the editor structure
            this.createEditorStructure();
            
            // Set up the rich text editor
            this.setupRichTextEditor();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Set up keyboard shortcuts
            if (this.options.enableKeyboardShortcuts) {
                this.setupKeyboardShortcuts();
            }
            
            // Set up auto-save
            if (this.options.enableAutoSave) {
                this.setupAutoSave();
            }
            
            this.isInitialized = true;
            console.log('Enhanced WYSIWYG Editor initialized');
            
        } catch (error) {
            console.error('Enhanced WYSIWYG Editor initialization error:', error);
            this.showError('エディターの初期化に失敗しました');
        }
    } 
   
    /**
     * Initialize component dependencies
     */
    initializeComponents() {
        // Initialize Markdown Renderer
        if (typeof MarkdownRenderer !== 'undefined') {
            this.markdownRenderer = new MarkdownRenderer({
                businessFormatting: this.options.enableBusinessFormatting
            });
        }
        
        // Initialize Business Document Formatter
        if (typeof BusinessDocumentFormatter !== 'undefined') {
            this.businessFormatter = new BusinessDocumentFormatter();
        }
    }
    
    /**
     * Create the editor structure
     */
    createEditorStructure() {
        this.container.innerHTML = `
            <div class="enhanced-wysiwyg-editor">
                <div class="editor-toolbar" id="editor-toolbar" style="display: ${this.options.enableToolbar ? 'flex' : 'none'}">
                    <!-- Toolbar will be populated by setupToolbar -->
                </div>
                <div class="editor-container" id="editor-container">
                    <!-- Rich text editor will be inserted here -->
                </div>
                <div class="editor-status-bar" id="editor-status">
                    <div class="status-left">
                        <span class="word-count" id="word-count">文字数: 0</span>
                        <span class="sync-status" id="sync-status">同期済み</span>
                    </div>
                    <div class="status-right">
                        <button class="mode-toggle" id="mode-toggle" title="編集モード切り替え">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            WYSIWYG
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Set up toolbar if enabled
        if (this.options.enableToolbar) {
            this.setupToolbar();
        }
    }
    
    /**
     * Set up the formatting toolbar
     */
    setupToolbar() {
        const toolbar = this.container.querySelector('#editor-toolbar');
        if (!toolbar) return;
        
        toolbar.innerHTML = `
            <div class="toolbar-section">
                <button class="toolbar-btn" data-command="bold" title="太字 (Ctrl+B)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                        <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                    </svg>
                </button>
                <button class="toolbar-btn" data-command="italic" title="斜体 (Ctrl+I)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="19" y1="4" x2="10" y2="4"></line>
                        <line x1="14" y1="20" x2="5" y2="20"></line>
                        <line x1="15" y1="4" x2="9" y2="20"></line>
                    </svg>
                </button>
                <button class="toolbar-btn" data-command="underline" title="下線 (Ctrl+U)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"></path>
                        <line x1="4" y1="21" x2="20" y2="21"></line>
                    </svg>
                </button>
            </div>
            
            <div class="toolbar-divider"></div>
            
            <div class="toolbar-section">
                <select class="toolbar-select" id="heading-select">
                    <option value="">見出しレベル</option>
                    <option value="h1">見出し1</option>
                    <option value="h2">見出し2</option>
                    <option value="h3">見出し3</option>
                    <option value="h4">見出し4</option>
                    <option value="h5">見出し5</option>
                    <option value="h6">見出し6</option>
                </select>
            </div>
            
            <div class="toolbar-divider"></div>
            
            <div class="toolbar-section">
                <button class="toolbar-btn" data-command="insertUnorderedList" title="箇条書きリスト">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="8" y1="6" x2="21" y2="6"></line>
                        <line x1="8" y1="12" x2="21" y2="12"></line>
                        <line x1="8" y1="18" x2="21" y2="18"></line>
                        <line x1="3" y1="6" x2="3.01" y2="6"></line>
                        <line x1="3" y1="12" x2="3.01" y2="12"></line>
                        <line x1="3" y1="18" x2="3.01" y2="18"></line>
                    </svg>
                </button>
                <button class="toolbar-btn" data-command="insertOrderedList" title="番号付きリスト">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="10" y1="6" x2="21" y2="6"></line>
                        <line x1="10" y1="12" x2="21" y2="12"></line>
                        <line x1="10" y1="18" x2="21" y2="18"></line>
                        <path d="M4 6h1v4"></path>
                        <path d="M4 10h2"></path>
                        <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path>
                    </svg>
                </button>
                <button class="toolbar-btn" data-command="indent" title="インデント">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3,8 7,12 3,16"></polyline>
                        <line x1="21" y1="12" x2="11" y2="12"></line>
                    </svg>
                </button>
                <button class="toolbar-btn" data-command="outdent" title="アウトデント">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="7,8 3,12 7,16"></polyline>
                        <line x1="21" y1="12" x2="11" y2="12"></line>
                    </svg>
                </button>
            </div>
            
            <div class="toolbar-divider"></div>
            
            <div class="toolbar-section">
                <button class="toolbar-btn" data-command="insertImage" title="画像挿入">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21,15 16,10 5,21"></polyline>
                    </svg>
                </button>
                <button class="toolbar-btn" data-command="insertTable" title="表挿入">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"></path>
                    </svg>
                </button>
                <input type="file" id="image-upload" accept="image/*" style="display: none;">
            </div>
            
            <div class="toolbar-divider"></div>
            
            <div class="toolbar-section">
                <div class="color-picker-wrapper">
                    <button class="toolbar-btn color-btn" data-command="textColor" title="文字色">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 20h16"></path>
                            <path d="M6 16l6-12 6 12"></path>
                            <path d="M8 12h8"></path>
                        </svg>
                        <div class="color-indicator" style="background-color: #000000;"></div>
                    </button>
                    <div class="color-dropdown" id="text-color-dropdown">
                        <div class="color-grid" id="text-color-grid">
                            <!-- Color options will be populated by JavaScript -->
                        </div>
                    </div>
                </div>
                <div class="color-picker-wrapper">
                    <button class="toolbar-btn color-btn" data-command="highlightColor" title="ハイライト色">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 11H1l2-2h5.5L12 5.5 13.5 7l-2.5 2.5L13.5 12 12 13.5 8.5 10 7 11.5H9z"></path>
                            <path d="M14 7l3 3L20.5 6.5 18.5 4.5 14 7z"></path>
                            <path d="M8 13l-1.5 1.5-3-3L5 10l3 3z"></path>
                        </svg>
                        <div class="color-indicator" style="background-color: #ffff00;"></div>
                    </button>
                    <div class="color-dropdown" id="highlight-color-dropdown">
                        <div class="color-grid" id="highlight-color-grid">
                            <!-- Color options will be populated by JavaScript -->
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="toolbar-divider"></div>
            
            <div class="toolbar-section">
                <button class="toolbar-btn" data-command="undo" title="元に戻す (Ctrl+Z)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="1 4 1 10 7 10"></polyline>
                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                    </svg>
                </button>
                <button class="toolbar-btn" data-command="redo" title="やり直し (Ctrl+Y)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                    </svg>
                </button>
            </div>
            
            <div class="toolbar-divider"></div>
            
            <div class="toolbar-section">
                <button class="toolbar-btn" id="business-format-toggle" title="ビジネス書式切り替え">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14,2 14,8 20,8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                </button>
            </div>
        `;
    }
    
    /**
     * Set up the rich text editor
     */
    setupRichTextEditor() {
        const editorContainer = this.container.querySelector('#editor-container');
        if (!editorContainer) return;
        
        // Create RichTextEditor instance
        if (typeof RichTextEditor !== 'undefined') {
            this.richTextEditor = new RichTextEditor(editorContainer, {
                enableToolbar: false, // We use our own toolbar
                enableRealTimePreview: this.options.enableRealTimePreview,
                enableAutoSave: false, // We handle auto-save ourselves
                placeholder: this.options.placeholder,
                onContentChange: (content, textContent) => {
                    this.handleContentChange(content, textContent);
                }
            });
        } else {
            // Fallback: create simple contenteditable div
            this.createFallbackEditor(editorContainer);
        }
    }
    
    /**
     * Create fallback editor if RichTextEditor is not available
     */
    createFallbackEditor(container) {
        container.innerHTML = `
            <div class="fallback-editor" 
                 contenteditable="true" 
                 data-placeholder="${this.options.placeholder}"
                 style="min-height: 400px; padding: 1rem; border: 1px solid #d1d5db; border-radius: 6px; outline: none;">
            </div>
        `;
        
        this.richTextEditor = {
            setContent: (content) => {
                const editor = container.querySelector('.fallback-editor');
                if (editor) editor.innerHTML = content;
            },
            getContent: () => {
                const editor = container.querySelector('.fallback-editor');
                return editor ? editor.innerHTML : '';
            },
            getTextContent: () => {
                const editor = container.querySelector('.fallback-editor');
                return editor ? editor.textContent : '';
            },
            focus: () => {
                const editor = container.querySelector('.fallback-editor');
                if (editor) editor.focus();
            },
            isReady: () => true
        };
        
        // Set up fallback event listeners
        const editor = container.querySelector('.fallback-editor');
        if (editor) {
            editor.addEventListener('input', (e) => {
                this.handleContentChange(e.target.innerHTML, e.target.textContent);
            });
        }
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Toolbar button listeners
        const toolbarButtons = this.container.querySelectorAll('.toolbar-btn[data-command]');
        toolbarButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const command = button.dataset.command;
                this.executeCommand(command);
            });
        });
        
        // Heading select listener
        const headingSelect = this.container.querySelector('#heading-select');
        if (headingSelect) {
            headingSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.applyHeading(e.target.value);
                    e.target.value = ''; // Reset selection
                }
            });
        }
        
        // Business format toggle
        const businessToggle = this.container.querySelector('#business-format-toggle');
        if (businessToggle) {
            businessToggle.addEventListener('click', () => {
                this.toggleBusinessFormatting();
            });
        }
        
        // Mode toggle (WYSIWYG/Markdown)
        const modeToggle = this.container.querySelector('#mode-toggle');
        if (modeToggle) {
            modeToggle.addEventListener('click', () => {
                this.toggleEditingMode();
            });
        }
        
        // Color option clicks
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('color-option')) {
                this.handleColorSelection(e.target);
            }
        });
        
        // Close color dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.color-picker-wrapper')) {
                this.container.querySelectorAll('.color-dropdown').forEach(dropdown => {
                    dropdown.classList.remove('show');
                });
            }
        });
        
        // Setup image upload
        this.setupImageUpload();
        
        // Setup image resize on content changes
        this.container.addEventListener('input', () => {
            setTimeout(() => {
                this.setupImageResize();
            }, 100);
        });
    } 
   
    /**
     * Set up keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        this.container.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'b':
                        e.preventDefault();
                        this.executeCommand('bold');
                        break;
                    case 'i':
                        e.preventDefault();
                        this.executeCommand('italic');
                        break;
                    case 'u':
                        e.preventDefault();
                        this.executeCommand('underline');
                        break;
                    case 'z':
                        if (!e.shiftKey) {
                            e.preventDefault();
                            this.executeCommand('undo');
                        }
                        break;
                    case 'y':
                        e.preventDefault();
                        this.executeCommand('redo');
                        break;
                    case 's':
                        e.preventDefault();
                        this.save();
                        break;
                }
            }
        });
    }
    
    /**
     * Set up auto-save functionality
     */
    setupAutoSave() {
        // Auto-save will be triggered by content changes
        // Implementation in scheduleAutoSave method
    }
    
    /**
     * Handle content changes from the rich text editor
     */
    handleContentChange(htmlContent, textContent) {
        this.htmlContent = htmlContent || '';
        this.isDirty = true;
        
        // Convert HTML to Markdown if parsing is enabled
        if (this.options.enableMarkdownParsing) {
            this.markdownContent = this.convertHtmlToMarkdown(this.htmlContent);
        }
        
        // Update word count
        this.updateWordCount(textContent);
        
        // Update sync status
        this.updateSyncStatus('syncing');
        
        // Schedule auto-save
        if (this.options.enableAutoSave) {
            this.scheduleAutoSave();
        }
        
        // Trigger callbacks
        this.callbacks.onContentChange(this.htmlContent, textContent);
        if (this.options.enableMarkdownParsing) {
            this.callbacks.onMarkdownChange(this.markdownContent);
        }
        
        // Update sync status after processing
        setTimeout(() => {
            this.updateSyncStatus('synced');
        }, 100);
    }
    
    /**
     * Execute formatting command
     */
    executeCommand(command) {
        if (!this.richTextEditor) return;
        
        try {
            // Use browser's execCommand for standard formatting
            if (['bold', 'italic', 'underline', 'undo', 'redo', 'insertUnorderedList', 'insertOrderedList', 'indent', 'outdent'].includes(command)) {
                document.execCommand(command, false, null);
            } else if (command === 'insertImage') {
                this.handleImageInsertion();
            } else if (command === 'insertTable') {
                this.handleTableInsertion();
            } else if (command === 'textColor') {
                this.toggleColorDropdown('text-color-dropdown');
            } else if (command === 'highlightColor') {
                this.toggleColorDropdown('highlight-color-dropdown');
            }
            
            // Update toolbar button states
            this.updateToolbarStates();
            
        } catch (error) {
            console.error('Command execution error:', error);
        }
    }
    
    /**
     * Apply heading format
     */
    applyHeading(level) {
        if (!this.richTextEditor) return;
        
        try {
            // Use formatBlock command for headings
            document.execCommand('formatBlock', false, level.toUpperCase());
            this.updateToolbarStates();
        } catch (error) {
            console.error('Heading application error:', error);
        }
    }
    
    /**
     * Toggle business formatting
     */
    toggleBusinessFormatting() {
        this.options.enableBusinessFormatting = !this.options.enableBusinessFormatting;
        
        // Update markdown renderer if available
        if (this.markdownRenderer) {
            this.markdownRenderer.setBusinessFormatting(this.options.enableBusinessFormatting);
        }
        
        // Update business formatter
        if (this.businessFormatter && this.richTextEditor) {
            const editorElement = this.container.querySelector('.editor-content, .fallback-editor');
            if (editorElement) {
                if (this.options.enableBusinessFormatting) {
                    this.businessFormatter.applyStandardStyling(editorElement);
                } else {
                    this.businessFormatter.removeBusinessStyling(editorElement);
                }
            }
        }
        
        // Update toggle button state
        const toggleBtn = this.container.querySelector('#business-format-toggle');
        if (toggleBtn) {
            toggleBtn.classList.toggle('active', this.options.enableBusinessFormatting);
            toggleBtn.title = this.options.enableBusinessFormatting ? 
                'ビジネス書式を無効にする' : 'ビジネス書式を有効にする';
        }
        
        console.log('Business formatting:', this.options.enableBusinessFormatting ? 'enabled' : 'disabled');
    }
    
    /**
     * Toggle editing mode (WYSIWYG/Markdown)
     */
    toggleEditingMode() {
        // This would switch between WYSIWYG and raw markdown editing
        // For now, just show the current mode
        const modeToggle = this.container.querySelector('#mode-toggle');
        if (modeToggle) {
            const currentMode = modeToggle.textContent.trim();
            if (currentMode === 'WYSIWYG') {
                modeToggle.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14,2 14,8 20,8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                    Markdown
                `;
                // Here you would switch to markdown editing mode
            } else {
                modeToggle.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    WYSIWYG
                `;
                // Here you would switch back to WYSIWYG mode
            }
        }
    }
    
    /**
     * Update toolbar button states based on current selection
     */
    updateToolbarStates() {
        const commands = ['bold', 'italic', 'underline'];
        
        commands.forEach(command => {
            const button = this.container.querySelector(`[data-command="${command}"]`);
            if (button) {
                const isActive = document.queryCommandState(command);
                button.classList.toggle('active', isActive);
            }
        });
    }
    
    /**
     * Update word count display
     */
    updateWordCount(textContent) {
        const wordCountElement = this.container.querySelector('#word-count');
        if (wordCountElement && textContent) {
            const charCount = textContent.length;
            const wordCount = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
            wordCountElement.textContent = `文字数: ${charCount} (単語数: ${wordCount})`;
        }
    }
    
    /**
     * Update sync status display
     */
    updateSyncStatus(status) {
        const syncStatusElement = this.container.querySelector('#sync-status');
        if (syncStatusElement) {
            const statusTexts = {
                synced: '同期済み',
                syncing: '同期中...',
                error: '同期エラー'
            };
            
            syncStatusElement.textContent = statusTexts[status] || status;
            syncStatusElement.className = `sync-status ${status}`;
        }
    }
    
    /**
     * Convert HTML to Markdown
     */
    convertHtmlToMarkdown(html) {
        if (!html) return '';
        
        // Simple HTML to Markdown conversion
        // This is a basic implementation - you might want to use a library like Turndown for more robust conversion
        let markdown = html
            // Headers
            .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
            .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
            .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
            .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
            .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
            .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
            // Bold and italic
            .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
            .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
            .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
            .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
            // Underline (not standard markdown, but we'll keep it as HTML)
            .replace(/<u[^>]*>(.*?)<\/u>/gi, '<u>$1</u>')
            // Lists
            .replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
                return content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n') + '\n';
            })
            .replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
                let counter = 1;
                return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${counter++}. $1\n`) + '\n';
            })
            // Paragraphs
            .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
            // Line breaks
            .replace(/<br[^>]*>/gi, '\n')
            // Remove remaining HTML tags
            .replace(/<[^>]*>/g, '')
            // Clean up extra whitespace
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            .trim();
        
        return markdown;
    }
    
    /**
     * Convert Markdown to HTML
     */
    convertMarkdownToHtml(markdown) {
        if (!markdown) return '';
        
        if (this.markdownRenderer) {
            return this.markdownRenderer.render(markdown, this.options.enableBusinessFormatting);
        }
        
        // Fallback: simple markdown to HTML conversion
        let html = markdown
            // Headers
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
            .replace(/^##### (.*$)/gm, '<h5>$1</h5>')
            .replace(/^###### (.*$)/gm, '<h6>$1</h6>')
            // Bold and italic
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Line breaks and paragraphs
            .replace(/\n\n+/g, '</p><p>')
            .replace(/\n/g, '<br>');
        
        // Wrap in paragraphs if not already wrapped
        if (!html.startsWith('<')) {
            html = '<p>' + html + '</p>';
        }
        
        return html;
    }
    
    /**
     * Schedule auto-save
     */
    scheduleAutoSave() {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = setTimeout(() => {
            this.autoSave();
        }, this.options.autoSaveInterval);
    }
    
    /**
     * Perform auto-save
     */
    autoSave() {
        if (this.isDirty) {
            this.callbacks.onAutoSave({
                html: this.htmlContent,
                markdown: this.markdownContent,
                timestamp: new Date().toISOString()
            });
            
            this.isDirty = false;
            console.log('Auto-saved content');
        }
    }
    
    /**
     * Set content in the editor
     */
    setContent(content, format = 'auto') {
        if (!this.richTextEditor) return;
        
        try {
            if (format === 'markdown' || (format === 'auto' && this.isMarkdown(content))) {
                // Convert markdown to HTML and set in editor
                this.markdownContent = content;
                this.htmlContent = this.convertMarkdownToHtml(content);
                this.richTextEditor.setContent(this.htmlContent);
            } else {
                // Set HTML content directly
                this.htmlContent = content;
                this.richTextEditor.setContent(content);
                
                // Convert to markdown if parsing is enabled
                if (this.options.enableMarkdownParsing) {
                    this.markdownContent = this.convertHtmlToMarkdown(content);
                }
            }
            
            this.isDirty = false;
            this.updateWordCount(this.richTextEditor.getTextContent());
            this.updateSyncStatus('synced');
            
        } catch (error) {
            console.error('Error setting content:', error);
            this.updateSyncStatus('error');
        }
    }
    
    /**
     * Get content from the editor
     */
    getContent(format = 'html') {
        switch (format) {
            case 'markdown':
                return this.markdownContent;
            case 'text':
                return this.richTextEditor ? this.richTextEditor.getTextContent() : '';
            case 'html':
            default:
                return this.htmlContent;
        }
    }
    
    /**
     * Check if content is markdown
     */
    isMarkdown(content) {
        if (!content) return false;
        
        // Simple heuristic to detect markdown
        const markdownPatterns = [
            /^#{1,6}\s+/m,  // Headers
            /\*\*.*?\*\*/,   // Bold
            /\*.*?\*/,       // Italic
            /^\s*[-*+]\s+/m, // Unordered lists
            /^\s*\d+\.\s+/m  // Ordered lists
        ];
        
        return markdownPatterns.some(pattern => pattern.test(content));
    }
    
    /**
     * Save content manually
     */
    save() {
        this.autoSave();
    }
    
    /**
     * Clear editor content
     */
    clear() {
        if (this.richTextEditor) {
            this.richTextEditor.clear();
            this.htmlContent = '';
            this.markdownContent = '';
            this.isDirty = false;
            this.updateWordCount('');
            this.updateSyncStatus('synced');
        }
    }
    
    /**
     * Focus the editor
     */
    focus() {
        if (this.richTextEditor) {
            this.richTextEditor.focus();
        }
    }
    
    /**
     * Check if editor is ready
     */
    isReady() {
        return this.isInitialized && this.richTextEditor && this.richTextEditor.isReady();
    }
    
    /**
     * Get current state
     */
    getState() {
        return {
            htmlContent: this.htmlContent,
            markdownContent: this.markdownContent,
            isDirty: this.isDirty,
            isBusinessFormatting: this.options.enableBusinessFormatting,
            isReady: this.isReady()
        };
    }
    
    /**
     * Handle image insertion
     */
    handleImageInsertion() {
        const fileInput = this.container.querySelector('#image-upload');
        if (fileInput) {
            fileInput.click();
        }
    }
    
    /**
     * Handle table insertion
     */
    handleTableInsertion() {
        this.showTableInsertModal();
    }
    
    /**
     * Toggle color dropdown
     */
    toggleColorDropdown(dropdownId) {
        const dropdown = this.container.querySelector(`#${dropdownId}`);
        if (!dropdown) return;
        
        // Close other dropdowns
        this.container.querySelectorAll('.color-dropdown').forEach(d => {
            if (d.id !== dropdownId) {
                d.classList.remove('show');
            }
        });
        
        // Toggle current dropdown
        dropdown.classList.toggle('show');
        
        // Populate color options if not already done
        if (!dropdown.dataset.populated) {
            this.populateColorOptions(dropdown, dropdownId.includes('text') ? 'text' : 'highlight');
            dropdown.dataset.populated = 'true';
        }
    }
    
    /**
     * Populate color options in dropdown
     */
    populateColorOptions(dropdown, type) {
        const colorGrid = dropdown.querySelector('.color-grid');
        if (!colorGrid) return;
        
        const colors = type === 'text' ? [
            { value: '#000000', label: '黒' },
            { value: '#dc2626', label: '赤' },
            { value: '#2563eb', label: '青' },
            { value: '#16a34a', label: '緑' },
            { value: '#7c3aed', label: '紫' },
            { value: '#ea580c', label: 'オレンジ' },
            { value: '#0891b2', label: 'シアン' },
            { value: '#be123c', label: 'ローズ' },
            { value: '#4b5563', label: 'グレー' },
            { value: '#92400e', label: 'ブラウン' },
            { value: '#1f2937', label: 'ダークグレー' },
            { value: '#ffffff', label: '白' }
        ] : [
            { value: 'transparent', label: 'なし' },
            { value: '#fef08a', label: '黄色' },
            { value: '#bbf7d0', label: '緑' },
            { value: '#bfdbfe', label: '青' },
            { value: '#fbcfe8', label: 'ピンク' },
            { value: '#e0e7ff', label: '紫' },
            { value: '#fed7aa', label: 'オレンジ' },
            { value: '#a7f3d0', label: 'エメラルド' },
            { value: '#fecaca', label: '赤' },
            { value: '#d1d5db', label: 'グレー' },
            { value: '#c7d2fe', label: 'インディゴ' },
            { value: '#fde68a', label: 'アンバー' }
        ];
        
        colorGrid.innerHTML = colors.map(color => 
            `<div class="color-option" 
                 data-color="${color.value}" 
                 data-type="${type}"
                 style="background-color: ${color.value}; ${color.value === '#ffffff' ? 'border: 1px solid #d1d5db;' : ''}"
                 title="${color.label}"
                 role="button"
                 tabindex="0"
                 aria-label="${color.label}">
             </div>`
        ).join('');
    }
    
    /**
     * Show table insertion modal
     */
    showTableInsertModal() {
        const modal = document.createElement('div');
        modal.className = 'table-insert-modal';
        modal.innerHTML = `
            <div class="table-insert-content">
                <h3>表を挿入</h3>
                <div class="table-size-selector" id="table-size-selector">
                    ${Array.from({length: 64}, (_, i) => 
                        `<div class="table-cell-preview" data-row="${Math.floor(i / 8) + 1}" data-col="${(i % 8) + 1}"></div>`
                    ).join('')}
                </div>
                <div class="table-size-display" id="table-size-display">1 x 1</div>
                <div class="table-insert-actions">
                    <button class="table-insert-btn" id="table-cancel">キャンセル</button>
                    <button class="table-insert-btn primary" id="table-insert">挿入</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        let selectedRows = 1;
        let selectedCols = 1;
        
        // Handle cell preview hover
        const selector = modal.querySelector('#table-size-selector');
        const display = modal.querySelector('#table-size-display');
        
        selector.addEventListener('mouseover', (e) => {
            if (e.target.classList.contains('table-cell-preview')) {
                const row = parseInt(e.target.dataset.row);
                const col = parseInt(e.target.dataset.col);
                
                selectedRows = row;
                selectedCols = col;
                
                // Update preview
                selector.querySelectorAll('.table-cell-preview').forEach(cell => {
                    const cellRow = parseInt(cell.dataset.row);
                    const cellCol = parseInt(cell.dataset.col);
                    
                    if (cellRow <= row && cellCol <= col) {
                        cell.classList.add('selected');
                    } else {
                        cell.classList.remove('selected');
                    }
                });
                
                display.textContent = `${selectedRows} x ${selectedCols}`;
            }
        });
        
        // Handle insert button
        modal.querySelector('#table-insert').addEventListener('click', () => {
            this.insertTable(selectedRows, selectedCols);
            document.body.removeChild(modal);
        });
        
        // Handle cancel button
        modal.querySelector('#table-cancel').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // Handle click outside modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }
    
    /**
     * Insert table with specified dimensions
     */
    insertTable(rows, cols) {
        let tableHTML = '<table><tbody>';
        
        for (let r = 0; r < rows; r++) {
            tableHTML += '<tr>';
            for (let c = 0; c < cols; c++) {
                if (r === 0) {
                    tableHTML += '<th contenteditable="true">ヘッダー</th>';
                } else {
                    tableHTML += '<td contenteditable="true">セル</td>';
                }
            }
            tableHTML += '</tr>';
        }
        
        tableHTML += '</tbody></table>';
        
        // Insert at cursor position
        if (document.queryCommandSupported('insertHTML')) {
            document.execCommand('insertHTML', false, tableHTML);
        } else {
            // Fallback for browsers that don't support insertHTML
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const tableElement = document.createElement('div');
                tableElement.innerHTML = tableHTML;
                range.insertNode(tableElement.firstChild);
            }
        }
    }
    
    /**
     * Apply text color
     */
    applyTextColor(color) {
        if (color === 'transparent' || color === '#ffffff') {
            document.execCommand('removeFormat', false, null);
        } else {
            document.execCommand('foreColor', false, color);
        }
        
        // Update color indicator
        const indicator = this.container.querySelector('[data-command="textColor"] .color-indicator');
        if (indicator) {
            indicator.style.backgroundColor = color;
        }
    }
    
    /**
     * Apply highlight color
     */
    applyHighlightColor(color) {
        if (color === 'transparent') {
            document.execCommand('hiliteColor', false, 'transparent');
        } else {
            document.execCommand('hiliteColor', false, color);
        }
        
        // Update color indicator
        const indicator = this.container.querySelector('[data-command="highlightColor"] .color-indicator');
        if (indicator) {
            indicator.style.backgroundColor = color;
        }
    }
    
    /**
     * Handle color selection from dropdown
     */
    handleColorSelection(colorOption) {
        const color = colorOption.dataset.color;
        const type = colorOption.dataset.type;
        
        // Apply color
        if (type === 'text') {
            this.applyTextColor(color);
        } else if (type === 'highlight') {
            this.applyHighlightColor(color);
        }
        
        // Update selection state
        const dropdown = colorOption.closest('.color-dropdown');
        dropdown.querySelectorAll('.color-option').forEach(option => {
            option.classList.remove('selected');
        });
        colorOption.classList.add('selected');
        
        // Close dropdown
        dropdown.classList.remove('show');
    }
    
    /**
     * Setup image upload handling
     */
    setupImageUpload() {
        const fileInput = this.container.querySelector('#image-upload');
        if (!fileInput) return;
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('画像ファイルを選択してください。');
                return;
            }
            
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('ファイルサイズは5MB以下にしてください。');
                return;
            }
            
            // Read and insert image
            const reader = new FileReader();
            reader.onload = (e) => {
                this.insertImage(e.target.result, file.name);
            };
            reader.readAsDataURL(file);
            
            // Reset input
            fileInput.value = '';
        });
    }
    
    /**
     * Insert image into editor
     */
    insertImage(src, alt = '') {
        const imageHTML = `<img src="${src}" alt="${alt}" style="max-width: 100%; height: auto;" />`;
        
        if (document.queryCommandSupported('insertHTML')) {
            document.execCommand('insertHTML', false, imageHTML);
        } else {
            // Fallback for browsers that don't support insertHTML
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const img = document.createElement('img');
                img.src = src;
                img.alt = alt;
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                range.insertNode(img);
            }
        }
        
        // Setup image resize functionality
        setTimeout(() => {
            this.setupImageResize();
        }, 100);
    }
    
    /**
     * Setup image resize functionality
     */
    setupImageResize() {
        const images = this.container.querySelectorAll('.editor-content img, .fallback-editor img');
        
        images.forEach(img => {
            if (img.dataset.resizeSetup) return;
            
            img.dataset.resizeSetup = 'true';
            img.style.cursor = 'pointer';
            
            img.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectImage(img);
            });
        });
    }
    
    /**
     * Select image for editing
     */
    selectImage(img) {
        // Remove previous selections
        this.container.querySelectorAll('img.selected').forEach(i => {
            i.classList.remove('selected');
        });
        
        // Remove existing resize handles
        this.container.querySelectorAll('.image-resize-handles').forEach(h => {
            h.remove();
        });
        
        // Select current image
        img.classList.add('selected');
        
        // Add resize handles
        this.addImageResizeHandles(img);
    }
    
    /**
     * Add resize handles to image
     */
    addImageResizeHandles(img) {
        const handles = document.createElement('div');
        handles.className = 'image-resize-handles';
        handles.style.position = 'absolute';
        handles.style.top = img.offsetTop + 'px';
        handles.style.left = img.offsetLeft + 'px';
        handles.style.width = img.offsetWidth + 'px';
        handles.style.height = img.offsetHeight + 'px';
        
        const handlePositions = ['nw', 'ne', 'sw', 'se', 'n', 's', 'w', 'e'];
        
        handlePositions.forEach(position => {
            const handle = document.createElement('div');
            handle.className = `image-resize-handle ${position}`;
            handle.addEventListener('mousedown', (e) => {
                this.startImageResize(e, img, position);
            });
            handles.appendChild(handle);
        });
        
        img.parentNode.appendChild(handles);
    }
    
    /**
     * Start image resize operation
     */
    startImageResize(e, img, position) {
        e.preventDefault();
        
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = img.offsetWidth;
        const startHeight = img.offsetHeight;
        const aspectRatio = startWidth / startHeight;
        
        const handleMouseMove = (e) => {
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            let newWidth = startWidth;
            let newHeight = startHeight;
            
            switch (position) {
                case 'se':
                    newWidth = startWidth + deltaX;
                    newHeight = newWidth / aspectRatio;
                    break;
                case 'sw':
                    newWidth = startWidth - deltaX;
                    newHeight = newWidth / aspectRatio;
                    break;
                case 'ne':
                    newWidth = startWidth + deltaX;
                    newHeight = newWidth / aspectRatio;
                    break;
                case 'nw':
                    newWidth = startWidth - deltaX;
                    newHeight = newWidth / aspectRatio;
                    break;
                case 'e':
                    newWidth = startWidth + deltaX;
                    newHeight = newWidth / aspectRatio;
                    break;
                case 'w':
                    newWidth = startWidth - deltaX;
                    newHeight = newWidth / aspectRatio;
                    break;
                case 'n':
                    newHeight = startHeight - deltaY;
                    newWidth = newHeight * aspectRatio;
                    break;
                case 's':
                    newHeight = startHeight + deltaY;
                    newWidth = newHeight * aspectRatio;
                    break;
            }
            
            // Enforce minimum size
            newWidth = Math.max(50, newWidth);
            newHeight = Math.max(50, newHeight);
            
            // Enforce maximum size
            const maxWidth = img.parentNode.offsetWidth;
            if (newWidth > maxWidth) {
                newWidth = maxWidth;
                newHeight = newWidth / aspectRatio;
            }
            
            img.style.width = newWidth + 'px';
            img.style.height = newHeight + 'px';
            
            // Update resize handles position
            const handles = img.parentNode.querySelector('.image-resize-handles');
            if (handles) {
                handles.style.width = newWidth + 'px';
                handles.style.height = newHeight + 'px';
            }
        };
        
        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error('Enhanced WYSIWYG Editor error:', message);
        
        this.container.innerHTML = `
            <div class="editor-error">
                <div class="error-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                </div>
                <div class="error-content">
                    <h3>エディターエラー</h3>
                    <p>${message}</p>
                    <button onclick="window.location.reload()" class="error-retry-btn">
                        ページを再読み込み
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Destroy the editor and clean up resources
     */
    destroy() {
        // Clear auto-save timer
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }
        
        // Destroy rich text editor
        if (this.richTextEditor && this.richTextEditor.destroy) {
            this.richTextEditor.destroy();
        }
        
        // Clear container
        this.container.innerHTML = '';
        
        // Reset state
        this.isInitialized = false;
        this.htmlContent = '';
        this.markdownContent = '';
        this.isDirty = false;
        
        console.log('Enhanced WYSIWYG Editor destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedWYSIWYGEditor;
} else if (typeof window !== 'undefined') {
    window.EnhancedWYSIWYGEditor = EnhancedWYSIWYGEditor;
}