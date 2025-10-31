/**
 * Tiptap-based WYSIWYG Editor with Real Tiptap Integration
 * Uses actual @tiptap/core and @tiptap/starter-kit npm packages
 * Provides reliable WYSIWYG editing with Markdown support
 */

class TiptapWYSIWYGEditorReal {
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
        
        // Initialize Tiptap
        this.init();
    }
    
    /**
     * Initialize Tiptap editor
     */
    async init() {
        try {
            // Load Tiptap from npm packages
            await this.loadTiptapFromNpm();
            
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
            console.log('[TiptapWYSIWYG] Editor initialized successfully with Tiptap');
            
        } catch (error) {
            console.error('[TiptapWYSIWYG] Initialization error:', error);
            this.showError('エディターの初期化に失敗しました: ' + error.message);
            // Fallback to basic editor if Tiptap fails
            this.createFallbackEditor();
        }
    }
    
    /**
     * Load Tiptap from npm packages
     */
    async loadTiptapFromNpm() {
        try {
            // Dynamic import of Tiptap packages from node_modules
            // Use absolute path from server root
            const { Editor } = await import('/node_modules/@tiptap/core/dist/index.js');
            const { default: StarterKit } = await import('/node_modules/@tiptap/starter-kit/dist/index.js');
            
            // Store for later use
            this.EditorClass = Editor;
            this.StarterKitClass = StarterKit;
            
            console.log('[TiptapWYSIWYG] Tiptap loaded from npm packages');
            return true;
        } catch (error) {
            console.error('[TiptapWYSIWYG] Failed to load Tiptap from npm:', error);
            console.error('[TiptapWYSIWYG] Error details:', error.message, error.stack);
            // Try alternative import paths
            try {
                const { Editor } = await import('@tiptap/core');
                const { default: StarterKit } = await import('@tiptap/starter-kit');
                this.EditorClass = Editor;
                this.StarterKitClass = StarterKit;
                console.log('[TiptapWYSIWYG] Tiptap loaded via alternative import');
                return true;
            } catch (altError) {
                throw new Error('Tiptap packages not available. Please run: npm install @tiptap/core @tiptap/starter-kit');
            }
        }
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
     * Initialize Tiptap editor instance
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
        
        if (!this.EditorClass || !this.StarterKitClass) {
            throw new Error('Tiptap classes not loaded');
        }
        
        // Initialize Tiptap editor
        this.editor = new this.EditorClass({
            element: editorElement,
            extensions: [
                this.StarterKitClass.configure({
                    heading: {
                        levels: [1, 2, 3, 4, 5, 6],
                    },
                }),
            ],
            content: '',
            editorProps: {
                attributes: {
                    class: 'tiptap-editor-content',
                    'data-placeholder': this.options.placeholder,
                },
            },
            onUpdate: ({ editor }) => {
                this.handleEditorUpdate(editor);
            },
        });
        
        this.editorElement = editorElement;
        console.log('[TiptapWYSIWYG] Tiptap editor instance created');
    }
    
    /**
     * Handle editor content updates
     */
    handleEditorUpdate(editor) {
        // Get HTML content
        const html = editor.getHTML();
        this.htmlContent = html;
        
        // Convert HTML to Markdown
        this.markdownContent = this.htmlToMarkdown(html);
        
        // Update word count
        const textContent = editor.getText();
        this.updateWordCount(textContent.length);
        
        // Trigger callbacks
        this.isDirty = true;
        this.callbacks.onContentChange(html, textContent);
        this.callbacks.onMarkdownChange(this.markdownContent);
    }
    
    /**
     * Convert HTML to Markdown (simplified but robust)
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
                    return `<u>${children}</u>`;
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
                    if (node.parentElement?.tagName === 'PRE') {
                        return children;
                    }
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
     * Convert Markdown to HTML for Tiptap
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
        if (!this.editor) return;
        
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
        
        // Set content in Tiptap editor
        this.editor.commands.setContent(htmlToSet);
        this.isDirty = false;
        
        // Update word count
        const textContent = this.editor.getText();
        this.updateWordCount(textContent.length);
    }
    
    /**
     * Get content from editor
     */
    getContent(format = 'markdown') {
        if (!this.editor) {
            if (format === 'markdown') return this.markdownContent;
            if (format === 'text') return '';
            return this.htmlContent;
        }
        
        if (format === 'html') {
            const html = this.editor.getHTML();
            this.htmlContent = html;
            return html;
        } else if (format === 'text') {
            return this.editor.getText();
        } else { // markdown
            const html = this.editor.getHTML();
            this.markdownContent = this.htmlToMarkdown(html);
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
            </div>
            <div class="toolbar-divider"></div>
            <div class="toolbar-section">
                <select class="toolbar-select" id="heading-select" aria-label="見出しレベル">
                    <option value="">テキスト</option>
                    <option value="1">見出し1</option>
                    <option value="2">見出し2</option>
                    <option value="3">見出し3</option>
                    <option value="4">見出し4</option>
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
        
        // Connect toolbar buttons to Tiptap commands
        this.connectToolbarCommands(toolbar);
        
        // Update toolbar states on selection change
        this.setupToolbarStateUpdates();
    }
    
    /**
     * Connect toolbar buttons to Tiptap commands
     */
    connectToolbarCommands(toolbar) {
        if (!this.editor) return;
        
        // Bold
        const btnBold = toolbar.querySelector('#btn-bold');
        if (btnBold) {
            btnBold.addEventListener('click', () => {
                this.editor.chain().focus().toggleBold().run();
            });
        }
        
        // Italic
        const btnItalic = toolbar.querySelector('#btn-italic');
        if (btnItalic) {
            btnItalic.addEventListener('click', () => {
                this.editor.chain().focus().toggleItalic().run();
            });
        }
        
        // Heading
        const headingSelect = toolbar.querySelector('#heading-select');
        if (headingSelect) {
            headingSelect.addEventListener('change', (e) => {
                const level = parseInt(e.target.value);
                if (level) {
                    this.editor.chain().focus().toggleHeading({ level }).run();
                } else {
                    this.editor.chain().focus().setParagraph().run();
                }
            });
        }
        
        // Bullet list
        const btnBulletList = toolbar.querySelector('#btn-bullet-list');
        if (btnBulletList) {
            btnBulletList.addEventListener('click', () => {
                this.editor.chain().focus().toggleBulletList().run();
            });
        }
        
        // Ordered list
        const btnOrderedList = toolbar.querySelector('#btn-ordered-list');
        if (btnOrderedList) {
            btnOrderedList.addEventListener('click', () => {
                this.editor.chain().focus().toggleOrderedList().run();
            });
        }
        
        // Undo
        const btnUndo = toolbar.querySelector('#btn-undo');
        if (btnUndo) {
            btnUndo.addEventListener('click', () => {
                this.editor.chain().focus().undo().run();
            });
        }
        
        // Redo
        const btnRedo = toolbar.querySelector('#btn-redo');
        if (btnRedo) {
            btnRedo.addEventListener('click', () => {
                this.editor.chain().focus().redo().run();
            });
        }
    }
    
    /**
     * Set up toolbar state updates
     */
    setupToolbarStateUpdates() {
        if (!this.editor) return;
        
        const updateToolbarStates = () => {
            // Update button active states
            const btnBold = this.container.querySelector('#btn-bold');
            const btnItalic = this.container.querySelector('#btn-italic');
            
            if (btnBold) {
                btnBold.classList.toggle('active', this.editor.isActive('bold'));
            }
            if (btnItalic) {
                btnItalic.classList.toggle('active', this.editor.isActive('italic'));
            }
            
            // Update heading select
            const headingSelect = this.container.querySelector('#heading-select');
            if (headingSelect) {
                for (let i = 1; i <= 6; i++) {
                    if (this.editor.isActive('heading', { level: i })) {
                        headingSelect.value = i.toString();
                        return;
                    }
                }
                headingSelect.value = '';
            }
        };
        
        // Update on editor selection change
        this.editor.on('selectionUpdate', updateToolbarStates);
        this.editor.on('update', updateToolbarStates);
    }
    
    /**
     * Set up keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        if (!this.editor) return;
        
        // Tiptap handles keyboard shortcuts automatically
        // But we can add custom ones if needed
        this.editorElement.addEventListener('keydown', (e) => {
            // Additional shortcuts if needed
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
            if (this.isDirty && this.editor) {
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
            // Fallback implementation would go here
        }
    }
    
    /**
     * Show error message
     */
    showError(message) {
        console.error('[TiptapWYSIWYG]', message);
    }
    
    /**
     * Get text content
     */
    getTextContent() {
        return this.editor ? this.editor.getText() : '';
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
     * Clear editor
     */
    clear() {
        if (this.editor) {
            this.editor.commands.clearContent();
        }
        this.markdownContent = '';
        this.htmlContent = '';
        this.isDirty = false;
    }
    
    /**
     * Check if editor is ready
     */
    isReady() {
        return this.isInitialized && this.editor !== null;
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

