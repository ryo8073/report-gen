/**
 * Clean Tiptap WYSIWYG Editor Implementation
 * Built from scratch following Tiptap design principles
 * Uses tiptap-markdown for bidirectional Markdown binding
 * 
 * This replaces the old broken implementations
 */

class TiptapEditorClean {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            enableToolbar: true,
            enableAutoSave: true,
            autoSaveInterval: 5000,
            placeholder: 'ここでレポートを編集してください...',
            onContentChange: options.onContentChange || (() => {}),
            onMarkdownChange: options.onMarkdownChange || (() => {}),
            onAutoSave: options.onAutoSave || (() => {}),
            ...options
        };
        
        // State
        this.markdownContent = '';
        this.isInitialized = false;
        this.editor = null;
        this.EditorClass = null;
        this.StarterKitClass = null;
        this.TiptapMarkdownClass = null;
        this.TableExtension = null;
        this.TableRowExtension = null;
        this.TableCellExtension = null;
        this.TableHeaderExtension = null;
        this.UnderlineExtension = null;
        this.TextAlignExtension = null;
        this.autoSaveTimer = null;
        
        // Initialize
        this.init();
    }
    
    /**
     * Initialize the editor
     */
    async init() {
        try {
            // Load Tiptap packages
            console.log('[TiptapEditorClean] Starting initialization...');
            const packagesLoaded = await this.loadTiptapPackages();
            
            if (!packagesLoaded) {
                throw new Error('Failed to load Tiptap packages');
            }
            
            // Verify packages are loaded
            if (!this.EditorClass || !this.StarterKitClass || !this.TiptapMarkdownClass) {
                console.error('[TiptapEditorClean] Package loading verification failed:');
                console.error('  EditorClass:', !!this.EditorClass);
                console.error('  StarterKitClass:', !!this.StarterKitClass);
                console.error('  TiptapMarkdownClass:', !!this.TiptapMarkdownClass);
                throw new Error('Tiptap packages loaded but classes are missing');
            }
            
            console.log('[TiptapEditorClean] Packages loaded successfully, creating editor structure...');
            
            // Create editor structure
            this.createEditorStructure();
            
            // Initialize Tiptap editor
            console.log('[TiptapEditorClean] Initializing Tiptap editor instance...');
            await this.initializeEditor();
            
            // Set up toolbar
            if (this.options.enableToolbar) {
                this.setupToolbar();
            }
            
            // Set up auto-save
            if (this.options.enableAutoSave) {
                this.setupAutoSave();
            }
            
            this.isInitialized = true;
            console.log('[TiptapEditorClean] ✅ Editor initialized successfully');
            
        } catch (error) {
            console.error('[TiptapEditorClean] Initialization error:', error);
            console.error('[TiptapEditorClean] Error stack:', error.stack);
            this.showError('エディターの初期化に失敗しました: ' + error.message);
        }
    }
    
    /**
     * Load Tiptap packages
     * Strategy 1: CDN (esm.sh) - automatically resolves all dependencies
     * Strategy 2: Bare imports with import maps (fallback)
     */
    async loadTiptapPackages() {
        // Strategy 1: Use CDN (esm.sh) - automatically resolves all dependencies including @tiptap/pm/*
        // This is the most reliable method for browser ES modules
        try {
            console.log('[TiptapEditorClean] Strategy 1: Loading Tiptap packages from esm.sh CDN (v3.10.1)...');
            
            const cdnBase = 'https://esm.sh';
            
            // Use actual installed versions from package.json (v3.10.1)
            const coreModule = await import(`${cdnBase}/@tiptap/core@3.10.1`);
            const starterKitModule = await import(`${cdnBase}/@tiptap/starter-kit@3.10.1`);
            const markdownModule = await import(`${cdnBase}/tiptap-markdown@0.9.0`);
            const tableModule = await import(`${cdnBase}/@tiptap/extension-table@3.10.1`);
            const tableRowModule = await import(`${cdnBase}/@tiptap/extension-table-row@3.10.1`);
            const tableCellModule = await import(`${cdnBase}/@tiptap/extension-table-cell@3.10.1`);
            const tableHeaderModule = await import(`${cdnBase}/@tiptap/extension-table-header@3.10.1`);
            const underlineModule = await import(`${cdnBase}/@tiptap/extension-underline@3.10.1`);
            const textAlignModule = await import(`${cdnBase}/@tiptap/extension-text-align@3.10.1`);
            
            // Extract classes with proper error handling
            const Editor = coreModule.Editor || coreModule.default?.Editor || coreModule.default;
            const StarterKit = starterKitModule.default || starterKitModule.StarterKit || starterKitModule;
            // tiptap-markdown exports as { Markdown } - see README: import { Markdown } from 'tiptap-markdown'
            const Markdown = markdownModule.Markdown || 
                             markdownModule.default?.Markdown ||
                             markdownModule.default ||
                             markdownModule.TiptapMarkdown ||
                             markdownModule.default?.TiptapMarkdown ||
                             markdownModule;
            const Table = tableModule.Table || tableModule.default?.Table || tableModule.default || tableModule;
            const TableRow = tableRowModule.TableRow || tableRowModule.default?.TableRow || tableRowModule.default || tableRowModule;
            const TableCell = tableCellModule.TableCell || tableCellModule.default?.TableCell || tableCellModule.default || tableCellModule;
            const TableHeader = tableHeaderModule.TableHeader || tableHeaderModule.default?.TableHeader || tableHeaderModule.default || tableHeaderModule;
            const Underline = underlineModule.Underline || underlineModule.default?.Underline || underlineModule.default || underlineModule;
            const TextAlign = textAlignModule.TextAlign || textAlignModule.default?.TextAlign || textAlignModule.default || textAlignModule;
            
            // Verify all classes are loaded
            if (!Editor || !StarterKit || !Markdown) {
                console.error('[TiptapEditorClean] Class extraction failed. Markdown module keys:', Object.keys(markdownModule));
                throw new Error('Failed to extract required classes from CDN modules');
            }
            
            // Store for later use
            this.EditorClass = Editor;
            this.StarterKitClass = StarterKit;
            this.TiptapMarkdownClass = Markdown; // Store as Markdown (correct export name)
            this.TableExtension = Table;
            this.TableRowExtension = TableRow;
            this.TableCellExtension = TableCell;
            this.TableHeaderExtension = TableHeader;
            this.UnderlineExtension = Underline;
            this.TextAlignExtension = TextAlign;
            
            console.log('[TiptapEditorClean] ✅ Tiptap packages loaded successfully from CDN');
            console.log('[TiptapEditorClean] Classes verified:', {
                Editor: !!this.EditorClass,
                StarterKit: !!this.StarterKitClass,
                TiptapMarkdown: !!this.TiptapMarkdownClass,
                Table: !!this.TableExtension
            });
            return true;
        } catch (cdnError) {
            console.warn('[TiptapEditorClean] CDN failed, trying bare imports with import maps:', cdnError.message);
            console.warn('[TiptapEditorClean] CDN error details:', cdnError);
            
            // Strategy 2: Fallback to bare imports (requires import maps in HTML)
            try {
                console.log('[TiptapEditorClean] Strategy 2: Attempting to load Tiptap packages using bare imports (requires import maps)...');
                
                const coreModule = await import('@tiptap/core');
                const starterKitModule = await import('@tiptap/starter-kit');
                const markdownModule = await import('tiptap-markdown');
                const tableModule = await import('@tiptap/extension-table');
                const tableRowModule = await import('@tiptap/extension-table-row');
                const tableCellModule = await import('@tiptap/extension-table-cell');
                const tableHeaderModule = await import('@tiptap/extension-table-header');
                const underlineModule = await import('@tiptap/extension-underline');
                const textAlignModule = await import('@tiptap/extension-text-align');
                
                // Extract classes
                const Editor = coreModule.Editor || coreModule.default?.Editor || coreModule.default;
                const StarterKit = starterKitModule.default || starterKitModule.StarterKit || starterKitModule;
                // tiptap-markdown exports as { Markdown } - see README: import { Markdown } from 'tiptap-markdown'
                const Markdown = markdownModule.Markdown || 
                                 markdownModule.default?.Markdown ||
                                 markdownModule.default ||
                                 markdownModule.TiptapMarkdown ||
                                 markdownModule.default?.TiptapMarkdown ||
                                 markdownModule;
                const Table = tableModule.Table || tableModule.default?.Table || tableModule.default || tableModule;
                const TableRow = tableRowModule.TableRow || tableRowModule.default?.TableRow || tableRowModule.default || tableRowModule;
                const TableCell = tableCellModule.TableCell || tableCellModule.default?.TableCell || tableCellModule.default || tableCellModule;
                const TableHeader = tableHeaderModule.TableHeader || tableHeaderModule.default?.TableHeader || tableHeaderModule.default || tableHeaderModule;
                const Underline = underlineModule.Underline || underlineModule.default?.Underline || underlineModule.default || underlineModule;
                const TextAlign = textAlignModule.TextAlign || textAlignModule.default?.TextAlign || textAlignModule.default || textAlignModule;
                
                // Verify all classes are loaded
                if (!Editor || !StarterKit || !Markdown) {
                    console.error('[TiptapEditorClean] Class extraction failed (bare import). Markdown module keys:', Object.keys(markdownModule));
                    throw new Error('Failed to extract required classes from bare import modules');
                }
                
                // Store for later use
                this.EditorClass = Editor;
                this.StarterKitClass = StarterKit;
                this.TiptapMarkdownClass = Markdown; // Store as Markdown (correct export name)
                this.TableExtension = Table;
                this.TableRowExtension = TableRow;
                this.TableCellExtension = TableCell;
                this.TableHeaderExtension = TableHeader;
                this.UnderlineExtension = Underline;
                this.TextAlignExtension = TextAlign;
                
                console.log('[TiptapEditorClean] ✅ Tiptap packages loaded successfully via bare imports');
                console.log('[TiptapEditorClean] Classes verified:', {
                    Editor: !!this.EditorClass,
                    StarterKit: !!this.StarterKitClass,
                    TiptapMarkdown: !!this.TiptapMarkdownClass,
                    TiptapMarkdownType: typeof this.TiptapMarkdownClass,
                    TiptapMarkdownHasConfigure: !!(this.TiptapMarkdownClass && this.TiptapMarkdownClass.configure),
                    Table: !!this.TableExtension
                });
                return true;
            } catch (bareImportError) {
                console.error('[TiptapEditorClean] ❌ Both import methods failed');
                console.error('[TiptapEditorClean] CDN error:', cdnError.message);
                console.error('[TiptapEditorClean] CDN error stack:', cdnError.stack);
                console.error('[TiptapEditorClean] Bare import error:', bareImportError.message);
                console.error('[TiptapEditorClean] Bare import error stack:', bareImportError.stack);
                throw new Error(`Failed to load Tiptap packages. CDN error: ${cdnError.message}, Bare import error: ${bareImportError.message}`);
            }
        }
    }
    
    /**
     * Create editor DOM structure
     */
    createEditorStructure() {
        this.container.innerHTML = `
            <div class="tiptap-editor-container">
                ${this.options.enableToolbar ? `
                    <div class="tiptap-toolbar" id="tiptap-toolbar">
                        <!-- Text Formatting -->
                        <div class="toolbar-group">
                            <button type="button" data-command="bold" title="太字 (Ctrl+B)" aria-label="太字">
                                <strong>B</strong>
                            </button>
                            <button type="button" data-command="italic" title="斜体 (Ctrl+I)" aria-label="斜体">
                                <em>I</em>
                            </button>
                            <button type="button" data-command="underline" title="下線 (Ctrl+U)" aria-label="下線">
                                <u>U</u>
                            </button>
                            <button type="button" data-command="strike" title="取り消し線" aria-label="取り消し線">
                                <span style="text-decoration: line-through;">S</span>
                            </button>
                            <button type="button" data-command="code" title="インラインコード" aria-label="コード">
                                <code>&lt;/&gt;</code>
                            </button>
                        </div>
                        
                        <!-- Headings -->
                        <div class="toolbar-group">
                            <button type="button" data-command="heading-1" title="見出し1" aria-label="見出し1">
                                H1
                            </button>
                            <button type="button" data-command="heading-2" title="見出し2" aria-label="見出し2">
                                H2
                            </button>
                            <button type="button" data-command="heading-3" title="見出し3" aria-label="見出し3">
                                H3
                            </button>
                        </div>
                        
                        <!-- Lists -->
                        <div class="toolbar-group">
                            <button type="button" data-command="bullet-list" title="箇条書き" aria-label="箇条書き">
                                <span>•</span> <span>リスト</span>
                            </button>
                            <button type="button" data-command="ordered-list" title="番号付きリスト" aria-label="番号付きリスト">
                                <span>1.</span> <span>リスト</span>
                            </button>
                        </div>
                        
                        <!-- Insert Elements -->
                        <div class="toolbar-group">
                            <button type="button" data-command="blockquote" title="引用" aria-label="引用">
                                <span>"</span>
                            </button>
                            <button type="button" data-command="code-block" title="コードブロック" aria-label="コードブロック">
                                <code>{}</code>
                            </button>
                            <button type="button" data-command="horizontal-rule" title="水平線" aria-label="水平線">
                                <span>─</span>
                            </button>
                            <button type="button" data-command="link" title="リンク" aria-label="リンク">
                                🔗
                            </button>
                            <button type="button" data-command="table" title="テーブル挿入" aria-label="テーブル">
                                <span>テーブル</span>
                            </button>
                        </div>
                        
                        <!-- Text Alignment -->
                        <div class="toolbar-group">
                            <button type="button" data-command="align-left" title="左揃え" aria-label="左揃え">
                                ⬅
                            </button>
                            <button type="button" data-command="align-center" title="中央揃え" aria-label="中央揃え">
                                ↔
                            </button>
                            <button type="button" data-command="align-right" title="右揃え" aria-label="右揃え">
                                ➡
                            </button>
                            <button type="button" data-command="align-justify" title="両端揃え" aria-label="両端揃え">
                                ⇄
                            </button>
                        </div>
                        
                        <!-- Undo/Redo -->
                        <div class="toolbar-group">
                            <button type="button" data-command="undo" title="元に戻す (Ctrl+Z)" aria-label="元に戻す">
                                ↶
                            </button>
                            <button type="button" data-command="redo" title="やり直し (Ctrl+Y)" aria-label="やり直し">
                                ↷
                            </button>
                        </div>
                    </div>
                ` : ''}
                <div class="tiptap-editor-content" id="tiptap-editor-content"></div>
                <div class="tiptap-status-bar" id="tiptap-status-bar" style="display: none;">
                    <span class="word-count">文字数: 0</span>
                    <span class="sync-status">同期済み</span>
                </div>
            </div>
        `;
        
        this.toolbarElement = this.container.querySelector('#tiptap-toolbar');
        this.editorElement = this.container.querySelector('#tiptap-editor-content');
        this.statusBarElement = this.container.querySelector('#tiptap-status-bar');
    }
    
    /**
     * Initialize Tiptap editor instance
     */
    async initializeEditor() {
        if (!this.EditorClass || !this.StarterKitClass || !this.TiptapMarkdownClass) {
            throw new Error('Tiptap classes not loaded');
        }
        
        // Initialize Tiptap editor with extensions
        this.editor = new this.EditorClass({
            element: this.editorElement,
            extensions: [
                // StarterKit provides basic formatting (bold, italic, headings, lists, etc.)
                this.StarterKitClass.configure({
                    heading: {
                        levels: [1, 2, 3, 4, 5, 6],
                    },
                }),
                // TiptapMarkdown extension for bidirectional Markdown support
                // Check if configure method exists, otherwise use the class directly
                (this.TiptapMarkdownClass.configure && typeof this.TiptapMarkdownClass.configure === 'function')
                    ? this.TiptapMarkdownClass.configure({
                        html: true,
                        tightLists: true,
                        tightListClass: 'tight',
                        bulletListMarker: '-',
                        linkify: true,
                        breaks: true,
                    })
                    : this.TiptapMarkdownClass, // Use directly if configure is not available
                // Table extensions
                this.TableExtension.configure({
                    resizable: true,
                }),
                this.TableRowExtension,
                this.TableHeaderExtension,
                this.TableCellExtension,
                // Underline extension (not included in StarterKit)
                this.UnderlineExtension,
                // Text alignment extension
                this.TextAlignExtension.configure({
                    types: ['heading', 'paragraph'],
                }),
            ],
            content: this.markdownContent || '',
            editorProps: {
                attributes: {
                    class: 'tiptap-editor-content',
                    'data-placeholder': this.options.placeholder,
                },
            },
            onUpdate: ({ editor }) => {
                this.handleEditorUpdate(editor);
            },
            onSelectionUpdate: () => {
                this.updateToolbarState();
            },
        });
        
        console.log('[TiptapEditorClean] Tiptap editor instance created');
    }
    
    /**
     * Handle editor content updates
     */
    handleEditorUpdate(editor) {
        // Get Markdown from tiptap-markdown extension
        // Try both v1 and v2 API formats
        let markdown = '';
        try {
            // v1 API: editor.storage.markdown.getMarkdown()
            if (editor.storage && editor.storage.markdown && editor.storage.markdown.getMarkdown) {
                markdown = editor.storage.markdown.getMarkdown();
            } else if (editor.getMarkdown) {
                // v2 API: editor.getMarkdown()
                markdown = editor.getMarkdown();
            } else {
                // Fallback: convert HTML to Markdown manually (should not happen)
                console.warn('[TiptapEditorClean] Markdown API not found, using HTML fallback');
                markdown = this.htmlToMarkdown(editor.getHTML());
            }
        } catch (error) {
            console.error('[TiptapEditorClean] Error getting Markdown:', error);
            markdown = this.htmlToMarkdown(editor.getHTML());
        }
        
        this.markdownContent = markdown;
        
        // Update word count
        const textContent = editor.getText();
        this.updateWordCount(textContent.length);
        
        // Trigger callbacks
        this.options.onContentChange(editor.getHTML(), textContent);
        this.options.onMarkdownChange(markdown);
    }
    
    /**
     * Set up toolbar buttons
     */
    setupToolbar() {
        if (!this.toolbarElement) return;
        
        const buttons = this.toolbarElement.querySelectorAll('button[data-command]');
        
        buttons.forEach(button => {
            const command = button.getAttribute('data-command');
            
            button.addEventListener('click', () => {
                if (!this.editor) return;
                
                this.editor.chain().focus();
                
                switch (command) {
                    // Text Formatting
                    case 'bold':
                        this.editor.chain().focus().toggleBold().run();
                        break;
                    case 'italic':
                        this.editor.chain().focus().toggleItalic().run();
                        break;
                    case 'underline':
                        this.editor.chain().focus().toggleUnderline().run();
                        break;
                    case 'strike':
                        this.editor.chain().focus().toggleStrike().run();
                        break;
                    case 'code':
                        this.editor.chain().focus().toggleCode().run();
                        break;
                    
                    // Headings
                    case 'heading-1':
                        this.editor.chain().focus().toggleHeading({ level: 1 }).run();
                        break;
                    case 'heading-2':
                        this.editor.chain().focus().toggleHeading({ level: 2 }).run();
                        break;
                    case 'heading-3':
                        this.editor.chain().focus().toggleHeading({ level: 3 }).run();
                        break;
                    
                    // Lists
                    case 'bullet-list':
                        this.editor.chain().focus().toggleBulletList().run();
                        break;
                    case 'ordered-list':
                        this.editor.chain().focus().toggleOrderedList().run();
                        break;
                    
                    // Insert Elements
                    case 'blockquote':
                        this.editor.chain().focus().toggleBlockquote().run();
                        break;
                    case 'code-block':
                        this.editor.chain().focus().toggleCodeBlock().run();
                        break;
                    case 'horizontal-rule':
                        this.editor.chain().focus().setHorizontalRule().run();
                        break;
                    case 'link':
                        const url = window.prompt('リンクURLを入力してください:');
                        if (url) {
                            this.editor.chain().focus().setLink({ href: url }).run();
                        }
                        break;
                    case 'table':
                        this.editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                        break;
                    
                    // Text Alignment
                    case 'align-left':
                        this.editor.chain().focus().setTextAlign('left').run();
                        break;
                    case 'align-center':
                        this.editor.chain().focus().setTextAlign('center').run();
                        break;
                    case 'align-right':
                        this.editor.chain().focus().setTextAlign('right').run();
                        break;
                    case 'align-justify':
                        this.editor.chain().focus().setTextAlign('justify').run();
                        break;
                    
                    // Undo/Redo
                    case 'undo':
                        this.editor.chain().focus().undo().run();
                        break;
                    case 'redo':
                        this.editor.chain().focus().redo().run();
                        break;
                }
            });
        });
        
        // Initial toolbar state
        this.updateToolbarState();
    }
    
    /**
     * Update toolbar button active states
     */
    updateToolbarState() {
        if (!this.editor || !this.toolbarElement) return;
        
        const buttons = this.toolbarElement.querySelectorAll('button[data-command]');
        
        buttons.forEach(button => {
            const command = button.getAttribute('data-command');
            let isActive = false;
            
            switch (command) {
                // Text Formatting
                case 'bold':
                    isActive = this.editor.isActive('bold');
                    break;
                case 'italic':
                    isActive = this.editor.isActive('italic');
                    break;
                case 'underline':
                    isActive = this.editor.isActive('underline');
                    break;
                case 'strike':
                    isActive = this.editor.isActive('strike');
                    break;
                case 'code':
                    isActive = this.editor.isActive('code');
                    break;
                
                // Headings
                case 'heading-1':
                    isActive = this.editor.isActive('heading', { level: 1 });
                    break;
                case 'heading-2':
                    isActive = this.editor.isActive('heading', { level: 2 });
                    break;
                case 'heading-3':
                    isActive = this.editor.isActive('heading', { level: 3 });
                    break;
                
                // Lists
                case 'bullet-list':
                    isActive = this.editor.isActive('bulletList');
                    break;
                case 'ordered-list':
                    isActive = this.editor.isActive('orderedList');
                    break;
                
                // Insert Elements
                case 'blockquote':
                    isActive = this.editor.isActive('blockquote');
                    break;
                case 'code-block':
                    isActive = this.editor.isActive('codeBlock');
                    break;
                case 'link':
                    isActive = this.editor.isActive('link');
                    break;
                
                // Text Alignment
                case 'align-left':
                    isActive = this.editor.isActive({ textAlign: 'left' });
                    break;
                case 'align-center':
                    isActive = this.editor.isActive({ textAlign: 'center' });
                    break;
                case 'align-right':
                    isActive = this.editor.isActive({ textAlign: 'right' });
                    break;
                case 'align-justify':
                    isActive = this.editor.isActive({ textAlign: 'justify' });
                    break;
            }
            
            button.classList.toggle('is-active', isActive);
        });
    }
    
    /**
     * Set up auto-save
     */
    setupAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = setInterval(() => {
            if (this.editor && this.markdownContent) {
                this.options.onAutoSave({
                    markdown: this.markdownContent,
                    html: this.editor.getHTML(),
                    timestamp: new Date().toISOString()
                });
            }
        }, this.options.autoSaveInterval);
    }
    
    /**
     * Update word count
     */
    updateWordCount(count) {
        if (this.statusBarElement) {
            const wordCountElement = this.statusBarElement.querySelector('.word-count');
            if (wordCountElement) {
                wordCountElement.textContent = `文字数: ${count}`;
            }
        }
    }
    
    /**
     * Set content (accepts Markdown string)
     * tiptap-markdown automatically parses Markdown when setContent is called
     * According to tiptap-markdown README: editor.commands.setContent('**test**') works directly
     * The extension overrides setContent to parse Markdown automatically
     */
    setContent(content, format = 'markdown') {
        if (!this.editor) {
            console.warn('[TiptapEditorClean] Editor not initialized, storing content for later');
            this.markdownContent = format === 'markdown' ? content : this.htmlToMarkdown(content);
            return;
        }
        
        try {
            if (format === 'markdown') {
                // CRITICAL: tiptap-markdown overrides setContent to automatically parse Markdown
                // We can pass Markdown directly to setContent - it will be parsed by tiptap-markdown
                // See: node_modules/tiptap-markdown/src/Markdown.js line 25-29
                console.log('[TiptapEditorClean] Setting Markdown content (length:', content.length, ')');
                console.log('[TiptapEditorClean] Markdown preview:', content.substring(0, 100) + '...');
                
                // tiptap-markdown's setContent will parse the Markdown automatically
                this.editor.commands.setContent(content);
                this.markdownContent = content;
                
                // Verify content was set (check if ProseMirror content exists)
                const currentHTML = this.editor.getHTML();
                console.log('[TiptapEditorClean] Content set successfully. HTML length:', currentHTML.length);
                console.log('[TiptapEditorClean] HTML preview:', currentHTML.substring(0, 200) + '...');
            } else {
                // HTML format - set directly
                console.log('[TiptapEditorClean] Setting HTML content');
                this.editor.commands.setContent(content);
                // Convert to Markdown after setting
                this.markdownContent = this.getMarkdown();
            }
        } catch (error) {
            console.error('[TiptapEditorClean] Error setting content:', error);
            console.error('[TiptapEditorClean] Error stack:', error.stack);
            throw error; // Re-throw for debugging
        }
    }
    
    /**
     * Get content as Markdown
     */
    getMarkdown() {
        if (!this.editor) {
            return this.markdownContent || '';
        }
        
        try {
            // Try v1 API first
            if (this.editor.storage && this.editor.storage.markdown && this.editor.storage.markdown.getMarkdown) {
                return this.editor.storage.markdown.getMarkdown();
            } else if (this.editor.getMarkdown) {
                // v2 API
                return this.editor.getMarkdown();
            } else {
                // Fallback
                return this.htmlToMarkdown(this.editor.getHTML());
            }
        } catch (error) {
            console.error('[TiptapEditorClean] Error getting Markdown:', error);
            return this.htmlToMarkdown(this.editor.getHTML());
        }
    }
    
    /**
     * Get content as HTML
     */
    getHTML() {
        if (!this.editor) {
            return '';
        }
        return this.editor.getHTML();
    }
    
    /**
     * Get plain text content
     */
    getText() {
        if (!this.editor) {
            return '';
        }
        return this.editor.getText();
    }
    
    /**
     * Clear editor content
     */
    clear() {
        if (this.editor) {
            this.editor.commands.clearContent();
        }
        this.markdownContent = '';
    }
    
    /**
     * Focus editor
     */
    focus() {
        if (this.editor) {
            this.editor.commands.focus();
        }
    }
    
    /**
     * Check if editor is ready
     */
    isReady() {
        return this.isInitialized && this.editor !== null;
    }
    
    /**
     * Destroy editor instance
     */
    destroy() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
        
        if (this.editor) {
            this.editor.destroy();
            this.editor = null;
        }
        
        this.isInitialized = false;
    }
    
    /**
     * Fallback HTML to Markdown converter (should not be needed with tiptap-markdown)
     */
    htmlToMarkdown(html) {
        if (!html) return '';
        
        // Simple fallback - in practice, tiptap-markdown should handle this
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Basic conversion (this is a fallback only)
        let markdown = '';
        const processNode = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                return node.textContent || '';
            }
            
            if (node.nodeType !== Node.ELEMENT_NODE) {
                return '';
            }
            
            const tagName = node.tagName.toLowerCase();
            const children = Array.from(node.childNodes).map(processNode).join('');
            
            switch (tagName) {
                case 'h1': return `# ${children}\n\n`;
                case 'h2': return `## ${children}\n\n`;
                case 'h3': return `### ${children}\n\n`;
                case 'h4': return `#### ${children}\n\n`;
                case 'strong':
                case 'b': return `**${children}**`;
                case 'em':
                case 'i': return `*${children}*`;
                case 'ul': return `\n${children}\n`;
                case 'ol': return `\n${children}\n`;
                case 'li': return `- ${children}\n`;
                case 'p': return `${children}\n\n`;
                default: return children;
            }
        };
        
        markdown = Array.from(tempDiv.childNodes).map(processNode).join('');
        return markdown.trim();
    }
    
    /**
     * Show error message
     */
    showError(message) {
        if (this.container) {
            this.container.innerHTML = `
                <div style="padding: 16px; background: #fee; border: 1px solid #fcc; border-radius: 4px; color: #c00;">
                    <strong>エラー:</strong> ${message}
                </div>
            `;
        }
        console.error('[TiptapEditorClean]', message);
    }
}

// Export for ES modules
export default TiptapEditorClean;

// Also make available globally for compatibility
if (typeof window !== 'undefined') {
    window.TiptapEditorClean = TiptapEditorClean;
}

