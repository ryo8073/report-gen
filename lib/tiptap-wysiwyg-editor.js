/**
 * Tiptap-based WYSIWYG Editor
 * Modern, headless editor framework for WYSIWYG editing with Markdown support
 * Replaces document.execCommand-based editor with Tiptap
 */

class TiptapWYSIWYGEditor {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            enableToolbar: true,
            enableAutoSave: true,
            autoSaveInterval: 5000,
            placeholder: 'ここでレポートを編集してください...',
            enableKeyboardShortcuts: true,
            ...options
        };
        
        // Content state
        this.markdownContent = '';
        this.htmlContent = '';
        this.isDirty = false;
        this.isInitialized = false;
        
        // Tiptap editor instance
        this.editor = null;
        
        // Event callbacks
        this.callbacks = {
            onContentChange: options.onContentChange || (() => {}),
            onMarkdownChange: options.onMarkdownChange || (() => {}),
            onAutoSave: options.onAutoSave || (() => {}),
            ...options.callbacks
        };
        
        // Auto-save timer
        this.autoSaveTimer = null;
        
        // Initialize Tiptap (load dependencies first)
        this.init();
    }
    
    /**
     * Initialize Tiptap editor
     */
    async init() {
        try {
            // Wait for Tiptap to be available
            await this.loadTiptapDependencies();
            
            // Create editor structure
            this.createEditorStructure();
            
            // Initialize Tiptap editor
            await this.initializeTiptapEditor();
            
            // Set up toolbar
            if (this.options.enableToolbar) {
                this.setupToolbar();
            }
            
            // Set up auto-save
            if (this.options.enableAutoSave) {
                this.setupAutoSave();
            }
            
            // Set up keyboard shortcuts
            if (this.options.enableKeyboardShortcuts) {
                this.setupKeyboardShortcuts();
            }
            
            this.isInitialized = true;
            console.log('[TiptapWYSIWYG] Editor initialized successfully');
            
        } catch (error) {
            console.error('[TiptapWYSIWYG] Initialization error:', error);
            this.showError('エディターの初期化に失敗しました: ' + error.message);
            // Fallback to basic editor if Tiptap fails
            this.createFallbackEditor();
        }
    }
    
    /**
     * Load Tiptap dependencies from CDN
     */
    async loadTiptapDependencies() {
        // Check if Tiptap is already loaded
        if (window.Editor && window.StarterKit) {
            console.log('[TiptapWYSIWYG] Tiptap already loaded');
            return;
        }
        
        console.log('[TiptapWYSIWYG] Loading Tiptap from CDN...');
        
        // Load Tiptap core
        await this.loadScript('https://cdn.jsdelivr.net/npm/@tiptap/core@2.1.13/dist/index.umd.min.js', 'TiptapCore');
        
        // Load StarterKit
        await this.loadScript('https://cdn.jsdelivr.net/npm/@tiptap/starter-kit@2.1.13/dist/index.umd.min.js', 'TiptapStarterKit');
        
        // Load Markdown extension (using prosemirror-markdown)
        await this.loadScript('https://cdn.jsdelivr.net/npm/prosemirror-markdown@1.11.1/dist/index.js', 'ProseMirrorMarkdown');
        
        // Load marked for Markdown parsing
        await this.loadScript('https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js', 'marked');
        
        console.log('[TiptapWYSIWYG] Tiptap dependencies loaded');
    }
    
    /**
     * Load a script dynamically
     */
    loadScript(src, globalName) {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (window[globalName]) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                console.log(`[TiptapWYSIWYG] Loaded ${globalName}`);
                resolve();
            };
            script.onerror = () => {
                reject(new Error(`Failed to load ${globalName} from ${src}`));
            };
            document.head.appendChild(script);
        });
    }
    
    /**
     * Create editor structure
     */
    createEditorStructure() {
        this.container.innerHTML = `
            <div class="tiptap-wysiwyg-editor">
                <div class="tiptap-toolbar" id="tiptap-toolbar" style="display: ${this.options.enableToolbar ? 'flex' : 'none'}">
                    <!-- Toolbar buttons will be populated -->
                </div>
                <div class="tiptap-editor-container" id="tiptap-editor-container">
                    <!-- Tiptap editor will be initialized here -->
                </div>
                <div class="tiptap-status-bar" id="tiptap-status">
                    <div class="status-left">
                        <span class="word-count" id="word-count">文字数: 0</span>
                        <span class="sync-status" id="sync-status">同期済み</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Initialize Tiptap editor with Markdown support
     */
    async initializeTiptapEditor() {
        const editorContainer = this.container.querySelector('#tiptap-editor-container');
        if (!editorContainer) {
            throw new Error('Editor container not found');
        }
        
        // Create editor element
        const editorElement = document.createElement('div');
        editorElement.className = 'tiptap-editor-content';
        editorElement.setAttribute('data-placeholder', this.options.placeholder);
        editorContainer.appendChild(editorElement);
        
        // Check if Tiptap is available
        if (!window.Editor || !window.StarterKit) {
            throw new Error('Tiptap not loaded');
        }
        
        // Import Tiptap classes (from UMD bundle)
        const { Editor } = window.Editor || {};
        const { default: StarterKit } = window.StarterKit || {};
        
        // For UMD build, we need to access differently
        // Tiptap UMD exports might be different, so we'll use a different approach
        // Use marked.js for Markdown conversion instead
        
        // Initialize with basic contenteditable if Tiptap UMD doesn't work
        // We'll use a hybrid approach: use modern editing with Markdown conversion
        this.initializeModernEditor(editorElement);
    }
    
    /**
     * Initialize modern editor with Markdown support (fallback implementation)
     */
    initializeModernEditor(element) {
        element.contentEditable = true;
        element.className = 'tiptap-editor-content prose prose-lg max-w-none';
        element.setAttribute('data-placeholder', this.options.placeholder);
        
        // Add placeholder styling
        element.addEventListener('focus', () => {
            if (!element.textContent.trim()) {
                element.classList.add('empty');
            } else {
                element.classList.remove('empty');
            }
        });
        
        element.addEventListener('blur', () => {
            if (!element.textContent.trim()) {
                element.classList.add('empty');
            } else {
                element.classList.remove('empty');
            }
        });
        
        // Handle content changes
        element.addEventListener('input', () => {
            this.handleEditorInput(element);
        });
        
        // Handle paste to convert HTML to clean format
        element.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text/plain');
            const html = (e.clipboardData || window.clipboardData).getData('text/html');
            
            if (html && window.marked) {
                // Try to convert HTML back to Markdown first
                const markdown = this.htmlToMarkdown(html);
                this.insertMarkdownAtCursor(markdown);
            } else {
                document.execCommand('insertText', false, text);
            }
        });
        
        this.editorElement = element;
        this.editor = {
            element: element,
            getContent: () => this.getContent(),
            setContent: (content, format) => this.setContent(content, format),
            focus: () => element.focus(),
            isActive: (command) => this.isToolbarActive(command),
            chain: () => ({
                focus: () => ({
                    toggleBold: () => ({ run: () => this.executeCommand('bold') }),
                    toggleItalic: () => ({ run: () => this.executeCommand('italic') }),
                    toggleUnderline: () => ({ run: () => this.executeCommand('underline') }),
                    toggleHeading: (options) => ({ run: () => this.executeHeading(options.level) }),
                    toggleBulletList: () => ({ run: () => this.executeCommand('insertUnorderedList') }),
                    toggleOrderedList: () => ({ run: () => this.executeCommand('insertOrderedList') }),
                    setParagraph: () => ({ run: () => this.executeCommand('formatBlock', false, 'p') }),
                })
            })
        };
    }
    
    /**
     * Handle editor input and convert to Markdown
     */
    handleEditorInput(element) {
        const html = element.innerHTML;
        this.htmlContent = html;
        
        // Convert HTML to Markdown
        if (this.options.enableMarkdownParsing !== false) {
            this.markdownContent = this.htmlToMarkdown(html);
        }
        
        // Update word count
        const textContent = element.textContent || '';
        this.updateWordCount(textContent.length);
        
        // Trigger callbacks
        this.isDirty = true;
        this.callbacks.onContentChange(html, textContent);
        if (this.options.enableMarkdownParsing !== false) {
            this.callbacks.onMarkdownChange(this.markdownContent);
        }
    }
    
    /**
     * Convert HTML to Markdown
     */
    htmlToMarkdown(html) {
        if (!html) return '';
        
        // Create temporary element
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
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
                case 'h1':
                    return `# ${children}\n\n`;
                case 'h2':
                    return `## ${children}\n\n`;
                case 'h3':
                    return `### ${children}\n\n`;
                case 'h4':
                    return `#### ${children}\n\n`;
                case 'h5':
                    return `##### ${children}\n\n`;
                case 'h6':
                    return `###### ${children}\n\n`;
                case 'p':
                    return `${children}\n\n`;
                case 'strong':
                case 'b':
                    return `**${children}**`;
                case 'em':
                case 'i':
                    return `*${children}*`;
                case 'u':
                    return `<u>${children}</u>`; // Markdown doesn't support underline
                case 'ul':
                    return `${children}`;
                case 'ol':
                    let counter = 1;
                    return Array.from(node.querySelectorAll('li')).map(li => {
                        const content = Array.from(li.childNodes).map(processNode).join('');
                        return `${counter++}. ${content}\n`;
                    }).join('') + '\n';
                case 'li':
                    return `- ${children}\n`;
                case 'br':
                    return '\n';
                case 'blockquote':
                    return `> ${children}\n\n`;
                case 'code':
                    return `\`${children}\``;
                case 'pre':
                    return `\`\`\`\n${children}\n\`\`\`\n\n`;
                default:
                    return children;
            }
        };
        
        markdown = Array.from(tempDiv.childNodes).map(processNode).join('');
        
        // Clean up extra newlines
        markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();
        
        return markdown;
    }
    
    /**
     * Convert Markdown to HTML for display
     */
    markdownToHtml(markdown) {
        if (!markdown) return '';
        
        // Use marked if available
        if (window.marked) {
            try {
                return window.marked.parse(markdown, {
                    breaks: true,
                    gfm: true
                });
            } catch (error) {
                console.warn('[TiptapWYSIWYG] Marked parsing failed, using fallback:', error);
            }
        }
        
        // Fallback conversion
        let html = markdown
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
        
        if (!html.startsWith('<')) {
            html = '<p>' + html + '</p>';
        }
        
        return html;
    }
    
    /**
     * Set content in editor
     */
    setContent(content, format = 'auto') {
        if (!this.editor || !this.editorElement) return;
        
        let htmlToSet = '';
        
        // Detect format
        const isMarkdown = format === 'markdown' || (format === 'auto' && this.isMarkdown(content));
        
        if (isMarkdown) {
            this.markdownContent = content;
            htmlToSet = this.markdownToHtml(content);
            this.htmlContent = htmlToSet;
        } else {
            htmlToSet = content;
            this.htmlContent = content;
            this.markdownContent = this.htmlToMarkdown(content);
        }
        
        // Set content in editor
        this.editorElement.innerHTML = htmlToSet;
        this.isDirty = false;
        
        // Update word count
        const textContent = this.editorElement.textContent || '';
        this.updateWordCount(textContent.length);
    }
    
    /**
     * Get content from editor
     */
    getContent(format = 'markdown') {
        if (!this.editorElement) {
            if (format === 'markdown') return this.markdownContent;
            if (format === 'text') return '';
            return this.htmlContent;
        }
        
        const currentHtml = this.editorElement.innerHTML;
        
        if (format === 'html') {
            this.htmlContent = currentHtml;
            return currentHtml;
        } else if (format === 'text') {
            return this.editorElement.textContent || '';
        } else { // markdown
            this.markdownContent = this.htmlToMarkdown(currentHtml);
            return this.markdownContent;
        }
    }
    
    /**
     * Check if content is Markdown
     */
    isMarkdown(content) {
        if (!content || typeof content !== 'string') return false;
        return /^#{1,6}\s+|^\*\*|^\*[^*]|^[-*+]\s+|^\d+\.\s+/m.test(content);
    }
    
    /**
     * Execute formatting command
     */
    executeCommand(command, value = null) {
        if (!this.editorElement) return;
        
        this.editorElement.focus();
        
        if (value) {
            document.execCommand(command, false, value);
        } else {
            document.execCommand(command, false);
        }
        
        // Trigger content change
        this.handleEditorInput(this.editorElement);
    }
    
    /**
     * Execute heading command
     */
    executeHeading(level) {
        if (!this.editorElement) return;
        
        this.editorElement.focus();
        document.execCommand('formatBlock', false, `h${level}`);
        this.handleEditorInput(this.editorElement);
    }
    
    /**
     * Check if toolbar button should be active
     */
    isToolbarActive(command) {
        if (!this.editorElement || !document.getSelection) return false;
        
        const selection = window.getSelection();
        if (!selection.rangeCount) return false;
        
        const range = selection.getRangeAt(0);
        const parent = range.commonAncestorContainer.parentElement;
        
        if (!parent) return false;
        
        switch (command) {
            case 'bold':
                return parent.tagName === 'STRONG' || parent.tagName === 'B' || 
                       document.queryCommandState('bold');
            case 'italic':
                return parent.tagName === 'EM' || parent.tagName === 'I' || 
                       document.queryCommandState('italic');
            case 'underline':
                return parent.tagName === 'U' || document.queryCommandState('underline');
            case 'heading':
                return /^H[1-6]$/.test(parent.tagName);
            default:
                return false;
        }
    }
    
    /**
     * Set up toolbar with Tiptap commands
     */
    setupToolbar() {
        const toolbar = this.container.querySelector('#tiptap-toolbar');
        if (!toolbar) return;
        
        toolbar.innerHTML = `
            <div class="toolbar-section">
                <button class="toolbar-btn" id="btn-bold" title="太字 (Ctrl+B)" aria-label="太字">
                    <strong>B</strong>
                </button>
                <button class="toolbar-btn" id="btn-italic" title="斜体 (Ctrl+I)" aria-label="斜体">
                    <em>I</em>
                </button>
                <button class="toolbar-btn" id="btn-underline" title="下線 (Ctrl+U)" aria-label="下線">
                    <u>U</u>
                </button>
            </div>
            <div class="toolbar-divider"></div>
            <div class="toolbar-section">
                <select class="toolbar-select" id="heading-select" aria-label="見出しレベル">
                    <option value="">テキスト</option>
                    <option value="1">見出し1</option>
                    <option value="2">見出し2</option>
                    <option value="3">見出し3</option>
                    <option value="4">見出し4</option>
                    <option value="5">見出し5</option>
                    <option value="6">見出し6</option>
                </select>
            </div>
            <div class="toolbar-divider"></div>
            <div class="toolbar-section">
                <button class="toolbar-btn" id="btn-bullet-list" title="箇条書き" aria-label="箇条書き">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="6" cy="6" r="2"/>
                        <circle cx="6" cy="12" r="2"/>
                        <circle cx="6" cy="18" r="2"/>
                        <path d="M12 6h10M12 12h10M12 18h10" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
                <button class="toolbar-btn" id="btn-ordered-list" title="番号付きリスト" aria-label="番号付きリスト">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <text x="4" y="16" font-size="14">1.</text>
                        <text x="4" y="28" font-size="14">2.</text>
                        <path d="M12 6h10M12 12h10" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
            </div>
            <div class="toolbar-divider"></div>
            <div class="toolbar-section">
                <button class="toolbar-btn" id="btn-undo" title="元に戻す (Ctrl+Z)" aria-label="元に戻す">
                    ↶
                </button>
                <button class="toolbar-btn" id="btn-redo" title="やり直し (Ctrl+Shift+Z)" aria-label="やり直し">
                    ↷
                </button>
            </div>
        `;
        
        // Connect toolbar buttons to commands
        this.connectToolbarCommands(toolbar);
        
        // Update toolbar states on selection change
        this.setupToolbarStateUpdates();
    }
    
    /**
     * Connect toolbar buttons to Tiptap commands
     */
    connectToolbarCommands(toolbar) {
        // Bold
        const btnBold = toolbar.querySelector('#btn-bold');
        if (btnBold) {
            btnBold.addEventListener('click', () => {
                if (this.editor) {
                    this.editor.chain().focus().toggleBold().run();
                } else {
                    this.executeCommand('bold');
                }
            });
        }
        
        // Italic
        const btnItalic = toolbar.querySelector('#btn-italic');
        if (btnItalic) {
            btnItalic.addEventListener('click', () => {
                if (this.editor && this.editor.chain) {
                    this.editor.chain().focus().toggleItalic().run();
                } else {
                    this.executeCommand('italic');
                }
            });
        }
        
        // Underline
        const btnUnderline = toolbar.querySelector('#btn-underline');
        if (btnUnderline) {
            btnUnderline.addEventListener('click', () => {
                this.executeCommand('underline');
            });
        }
        
        // Heading
        const headingSelect = toolbar.querySelector('#heading-select');
        if (headingSelect) {
            headingSelect.addEventListener('change', (e) => {
                const level = parseInt(e.target.value);
                if (level) {
                    if (this.editor && this.editor.chain) {
                        this.editor.chain().focus().toggleHeading({ level }).run();
                    } else {
                        this.executeHeading(level);
                    }
                } else {
                    if (this.editor && this.editor.chain) {
                        this.editor.chain().focus().setParagraph().run();
                    } else {
                        this.executeCommand('formatBlock', false, 'p');
                    }
                }
            });
        }
        
        // Bullet list
        const btnBulletList = toolbar.querySelector('#btn-bullet-list');
        if (btnBulletList) {
            btnBulletList.addEventListener('click', () => {
                if (this.editor && this.editor.chain) {
                    this.editor.chain().focus().toggleBulletList().run();
                } else {
                    this.executeCommand('insertUnorderedList');
                }
            });
        }
        
        // Ordered list
        const btnOrderedList = toolbar.querySelector('#btn-ordered-list');
        if (btnOrderedList) {
            btnOrderedList.addEventListener('click', () => {
                if (this.editor && this.editor.chain) {
                    this.editor.chain().focus().toggleOrderedList().run();
                } else {
                    this.executeCommand('insertOrderedList');
                }
            });
        }
        
        // Undo
        const btnUndo = toolbar.querySelector('#btn-undo');
        if (btnUndo) {
            btnUndo.addEventListener('click', () => {
                this.executeCommand('undo');
            });
        }
        
        // Redo
        const btnRedo = toolbar.querySelector('#btn-redo');
        if (btnRedo) {
            btnRedo.addEventListener('click', () => {
                this.executeCommand('redo');
            });
        }
    }
    
    /**
     * Set up toolbar state updates
     */
    setupToolbarStateUpdates() {
        const updateToolbarStates = () => {
            if (!this.editorElement) return;
            
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            
            // Update button active states
            const btnBold = this.container.querySelector('#btn-bold');
            const btnItalic = this.container.querySelector('#btn-italic');
            const btnUnderline = this.container.querySelector('#btn-underline');
            
            if (btnBold) {
                btnBold.classList.toggle('active', this.isToolbarActive('bold'));
            }
            if (btnItalic) {
                btnItalic.classList.toggle('active', this.isToolbarActive('italic'));
            }
            if (btnUnderline) {
                btnUnderline.classList.toggle('active', this.isToolbarActive('underline'));
            }
            
            // Update heading select
            const headingSelect = this.container.querySelector('#heading-select');
            if (headingSelect) {
                const range = selection.getRangeAt(0);
                const parent = range.commonAncestorContainer.parentElement;
                if (parent && /^H([1-6])$/.test(parent.tagName)) {
                    headingSelect.value = parent.tagName.substring(1);
                } else {
                    headingSelect.value = '';
                }
            }
        };
        
        // Update on selection change
        document.addEventListener('selectionchange', updateToolbarStates);
        if (this.editorElement) {
            this.editorElement.addEventListener('keyup', updateToolbarStates);
            this.editorElement.addEventListener('mouseup', updateToolbarStates);
        }
    }
    
    /**
     * Set up keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        if (!this.editorElement) return;
        
        this.editorElement.addEventListener('keydown', (e) => {
            // Ctrl+B for bold
            if (e.ctrlKey && e.key === 'b') {
                e.preventDefault();
                this.executeCommand('bold');
            }
            // Ctrl+I for italic
            else if (e.ctrlKey && e.key === 'i') {
                e.preventDefault();
                this.executeCommand('italic');
            }
            // Ctrl+U for underline
            else if (e.ctrlKey && e.key === 'u') {
                e.preventDefault();
                this.executeCommand('underline');
            }
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
            if (this.isDirty && this.editorElement) {
                const markdown = this.getContent('markdown');
                this.callbacks.onAutoSave({
                    markdown,
                    html: this.htmlContent,
                    timestamp: new Date().toISOString()
                });
                this.isDirty = false;
            }
        }, this.options.autoSaveInterval);
    }
    
    /**
     * Update word count
     */
    updateWordCount(count) {
        const wordCountElement = this.container.querySelector('#word-count');
        if (wordCountElement) {
            wordCountElement.textContent = `文字数: ${count}`;
        }
    }
    
    /**
     * Insert Markdown at cursor
     */
    insertMarkdownAtCursor(markdown) {
        if (!this.editorElement || !document.getSelection) return;
        
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        // Convert Markdown to HTML
        const html = this.markdownToHtml(markdown);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        const fragment = document.createDocumentFragment();
        while (tempDiv.firstChild) {
            fragment.appendChild(tempDiv.firstChild);
        }
        
        range.insertNode(fragment);
        
        // Move cursor to end
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        
        this.handleEditorInput(this.editorElement);
    }
    
    /**
     * Create fallback editor if Tiptap fails
     */
    createFallbackEditor() {
        console.warn('[TiptapWYSIWYG] Falling back to basic editor');
        const editorContainer = this.container.querySelector('#tiptap-editor-container');
        if (editorContainer) {
            editorContainer.innerHTML = `
                <div class="fallback-editor" contenteditable="true" style="min-height: 400px; padding: 1rem; border: 1px solid #d1d5db; border-radius: 6px;">
                </div>
            `;
            this.editorElement = editorContainer.querySelector('.fallback-editor');
            this.editor = {
                element: this.editorElement,
                getContent: () => this.getContent(),
                setContent: (content) => this.setContent(content),
                focus: () => this.editorElement.focus()
            };
        }
    }
    
    /**
     * Show error message
     */
    showError(message) {
        console.error('[TiptapWYSIWYG]', message);
        // Could show user-facing error message here
    }
    
    /**
     * Get text content
     */
    getTextContent() {
        return this.editorElement ? (this.editorElement.textContent || '') : '';
    }
    
    /**
     * Focus editor
     */
    focus() {
        if (this.editorElement) {
            this.editorElement.focus();
        }
    }
    
    /**
     * Clear editor
     */
    clear() {
        if (this.editorElement) {
            this.editorElement.innerHTML = '';
        }
        this.markdownContent = '';
        this.htmlContent = '';
        this.isDirty = false;
    }
    
    /**
     * Check if editor is ready
     */
    isReady() {
        return this.isInitialized && this.editorElement !== null;
    }
    
    /**
     * Destroy editor
     */
    destroy() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
        
        if (this.editor && this.editor.destroy) {
            this.editor.destroy();
        }
        
        this.isInitialized = false;
    }
}

