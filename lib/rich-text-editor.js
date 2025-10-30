/**
 * RichTextEditor - Rich text editing component with formatting capabilities
 * Implements requirements 2.1, 2.4, and 2.5 for rich text editing functionality
 */
class RichTextEditor {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            enableToolbar: true,
            enableRealTimePreview: true,
            enableAutoSave: true,
            autoSaveInterval: 5000,
            placeholder: 'ここにテキストを入力してください...',
            ...options
        };
        
        this.content = '';
        this.originalContent = '';
        this.isDirty = false;
        this.isInitialized = false;
        
        // Component instances
        this.toolbar = null;
        this.editor = null;
        this.autoSaveTimer = null;
        
        // Callbacks
        this.callbacks = {
            onContentChange: options.onContentChange || (() => {}),
            onSelectionChange: options.onSelectionChange || (() => {}),
            onAutoSave: options.onAutoSave || (() => {}),
            ...options.callbacks
        };
        
        this.init();
    }

    /**
     * Initialize the rich text editor
     */
    init() {
        try {
            this.injectStyles();
            this.createEditor();
            this.setupEventListeners();
            this.setupAutoSave();
            this.isInitialized = true;
        } catch (error) {
            console.error('RichTextEditor initialization error:', error);
            this.showError('リッチテキストエディターの初期化に失敗しました');
        }
    }

    /**
     * Inject CSS styles for the editor
     */
    injectStyles() {
        const styleId = 'rich-text-editor-styles';
        
        if (document.getElementById(styleId)) {
            return;
        }

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .rich-text-editor {
                display: flex;
                flex-direction: column;
                border: 1px solid var(--color-gray-300, #d1d5db);
                border-radius: 6px;
                background: white;
                overflow: hidden;
            }

            .rich-text-editor.focused {
                border-color: var(--color-primary, #3b82f6);
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }

            .editor-content {
                flex: 1;
                min-height: 400px;
                padding: var(--space-4, 1rem);
                font-family: 'Hiragino Sans', 'Yu Gothic', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 16px;
                line-height: 1.6;
                color: var(--color-gray-800, #1f2937);
                outline: none;
                overflow-y: auto;
                white-space: pre-wrap;
                word-wrap: break-word;
            }

            .editor-content:empty::before {
                content: attr(data-placeholder);
                color: var(--color-gray-400, #9ca3af);
                font-style: italic;
                pointer-events: none;
            }

            .editor-content p {
                margin: 0 0 1rem 0;
                min-height: 1.5em;
            }

            .editor-content p:last-child {
                margin-bottom: 0;
            }

            .editor-content h1, .editor-content h2, .editor-content h3,
            .editor-content h4, .editor-content h5, .editor-content h6 {
                margin: 1.5rem 0 0.75rem 0;
                font-weight: 600;
                line-height: 1.3;
            }

            .editor-content h1 { font-size: 2rem; color: var(--color-gray-900, #111827); }
            .editor-content h2 { font-size: 1.5rem; color: var(--color-primary, #3b82f6); }
            .editor-content h3 { font-size: 1.25rem; color: var(--color-gray-700, #374151); }
            .editor-content h4 { font-size: 1.125rem; color: var(--color-gray-600, #4b5563); }
            .editor-content h5 { font-size: 1rem; color: var(--color-gray-600, #4b5563); }
            .editor-content h6 { font-size: 0.875rem; color: var(--color-gray-600, #4b5563); }

            .editor-content ul, .editor-content ol {
                margin: 1rem 0;
                padding-left: 1.5rem;
            }

            .editor-content li {
                margin: 0.25rem 0;
            }

            .editor-content blockquote {
                margin: 1rem 0;
                padding: 0.75rem 1rem;
                border-left: 4px solid var(--color-primary, #3b82f6);
                background: var(--color-gray-50, #f9fafb);
                font-style: italic;
            }

            .editor-content code {
                background: var(--color-gray-100, #f3f4f6);
                padding: 0.125rem 0.25rem;
                border-radius: 0.25rem;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                font-size: 0.875em;
            }

            .editor-content pre {
                background: var(--color-gray-100, #f3f4f6);
                padding: 1rem;
                border-radius: 0.5rem;
                overflow-x: auto;
                margin: 1rem 0;
            }

            .editor-content pre code {
                background: none;
                padding: 0;
            }

            .editor-status {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: var(--space-2, 0.5rem) var(--space-4, 1rem);
                background: var(--color-gray-50, #f9fafb);
                border-top: 1px solid var(--color-gray-200, #e5e7eb);
                font-size: 0.875rem;
                color: var(--color-gray-600, #4b5563);
            }

            .editor-status-left {
                display: flex;
                align-items: center;
                gap: var(--space-4, 1rem);
            }

            .editor-status-right {
                display: flex;
                align-items: center;
                gap: var(--space-2, 0.5rem);
            }

            .status-indicator {
                display: flex;
                align-items: center;
                gap: var(--space-1, 0.25rem);
            }

            .status-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: var(--color-gray-400, #9ca3af);
            }

            .status-dot.saved {
                background: var(--color-green-500, #10b981);
            }

            .status-dot.dirty {
                background: var(--color-yellow-500, #f59e0b);
            }

            .status-dot.error {
                background: var(--color-red-500, #ef4444);
            }

            .editor-error {
                padding: var(--space-4, 1rem);
                background: var(--color-red-50, #fef2f2);
                border: 1px solid var(--color-red-200, #fecaca);
                border-radius: 6px;
                color: var(--color-red-700, #b91c1c);
            }

            /* Selection and focus styles */
            .editor-content::selection {
                background: rgba(59, 130, 246, 0.2);
            }

            .editor-content::-moz-selection {
                background: rgba(59, 130, 246, 0.2);
            }

            /* Responsive design */
            @media (max-width: 768px) {
                .editor-content {
                    padding: var(--space-3, 0.75rem);
                    font-size: 14px;
                    min-height: 300px;
                }

                .editor-status {
                    padding: var(--space-2, 0.5rem);
                    font-size: 0.75rem;
                }

                .editor-status-left {
                    gap: var(--space-2, 0.5rem);
                }
            }

            @media (max-width: 480px) {
                .editor-content {
                    padding: var(--space-2, 0.5rem);
                    min-height: 250px;
                }

                .editor-status {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: var(--space-1, 0.25rem);
                }
            }

            /* Print styles */
            @media print {
                .rich-text-editor {
                    border: none;
                    box-shadow: none;
                }

                .editor-status {
                    display: none;
                }

                .editor-content {
                    padding: 0;
                    min-height: auto;
                }
            }

            /* High contrast mode */
            @media (prefers-contrast: high) {
                .editor-content {
                    border: 2px solid #000;
                }

                .editor-content:focus {
                    outline: 3px solid #000;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Create the editor structure
     */
    createEditor() {
        if (!this.container) {
            throw new Error('Container element not found');
        }

        this.container.className = 'rich-text-editor';
        this.container.setAttribute('role', 'application');
        this.container.setAttribute('aria-label', 'リッチテキストエディター');
        this.container.setAttribute('aria-describedby', 'editor-instructions');

        // Create toolbar if enabled
        let toolbarHTML = '';
        if (this.options.enableToolbar) {
            toolbarHTML = '<div class="editor-toolbar"></div>';
        }

        // Create editor structure
        this.container.innerHTML = `
            <div id="editor-instructions" class="sr-only">
                リッチテキストエディターです。Ctrl+Bで太字、Ctrl+Iで斜体、Ctrl+Uで下線を適用できます。
                Tabキーでインデント、Shift+Enterで改行、Enterで段落を作成します。
            </div>
            ${toolbarHTML}
            <div class="editor-content" 
                 contenteditable="true" 
                 data-placeholder="${this.options.placeholder}"
                 role="textbox"
                 aria-multiline="true"
                 aria-label="テキスト編集エリア"
                 aria-describedby="editor-instructions editor-status-text"
                 spellcheck="true"
                 lang="ja">
            </div>
            <div class="editor-status" role="status" aria-live="polite">
                <div class="editor-status-left">
                    <div class="status-indicator">
                        <div class="status-dot saved" aria-hidden="true"></div>
                        <span class="status-text" id="editor-status-text">保存済み</span>
                    </div>
                    <div class="word-count" aria-label="文字数カウント">
                        文字数: <span class="count" aria-live="polite">0</span>
                    </div>
                </div>
                <div class="editor-status-right">
                    <div class="last-saved">
                        最終保存: <span class="time" aria-live="polite">--</span>
                    </div>
                </div>
            </div>
        `;

        // Get editor element
        this.editor = this.container.querySelector('.editor-content');

        // Initialize toolbar if enabled
        if (this.options.enableToolbar) {
            this.initializeToolbar();
        }
    }

    /**
     * Initialize the formatting toolbar
     */
    initializeToolbar() {
        const toolbarContainer = this.container.querySelector('.editor-toolbar');
        if (!toolbarContainer) return;

        try {
            this.toolbar = new FormattingToolbar(toolbarContainer, {
                onFormatChange: (format, isActive) => this.applyFormatting(format, isActive),
                onFontChange: (property, value) => this.applyFontStyle(property, value),
                onSizeChange: (property, value) => this.applyFontStyle(property, value),
                onColorChange: (property, value) => this.applyColorStyle(property, value),
                onHighlightChange: (property, value) => this.applyColorStyle(property, value)
            });
        } catch (error) {
            console.error('Toolbar initialization error:', error);
            toolbarContainer.innerHTML = '<div class="toolbar-error">ツールバーの初期化に失敗しました</div>';
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        if (!this.editor) return;

        // Content changes with debouncing for performance
        let contentChangeTimer;
        this.editor.addEventListener('input', () => {
            // Debounce content changes to improve performance
            clearTimeout(contentChangeTimer);
            contentChangeTimer = setTimeout(() => {
                this.handleContentChange();
            }, 100);
        });

        // Selection changes
        this.editor.addEventListener('selectionchange', () => {
            this.handleSelectionChange();
        });

        // Focus events
        this.editor.addEventListener('focus', () => {
            this.container.classList.add('focused');
        });

        this.editor.addEventListener('blur', () => {
            this.container.classList.remove('focused');
        });

        // Paste events
        this.editor.addEventListener('paste', (e) => {
            this.handlePaste(e);
        });

        // Keyboard shortcuts
        this.editor.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });

        // Prevent default drag and drop for now
        this.editor.addEventListener('drop', (e) => {
            e.preventDefault();
        });
    }

    /**
     * Handle content changes
     */
    handleContentChange() {
        const newContent = this.editor.innerHTML;
        const textContent = this.editor.textContent || '';
        
        // Update content state
        this.content = newContent;
        this.isDirty = this.content !== this.originalContent;
        
        // Update status
        this.updateStatus();
        this.updateWordCount(textContent.length);
        
        // Trigger callback
        this.callbacks.onContentChange(this.content, textContent);
        
        // Reset auto-save timer
        if (this.options.enableAutoSave) {
            this.resetAutoSaveTimer();
        }
    }

    /**
     * Handle selection changes
     */
    handleSelectionChange() {
        if (!this.toolbar) return;

        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;

        // Get current formatting at selection
        const range = selection.getRangeAt(0);
        const formats = this.getCurrentFormats(range);
        
        // Update toolbar state
        this.toolbar.updateActiveFormats(formats);
        
        // Trigger callback
        this.callbacks.onSelectionChange(selection, formats);
    }

    /**
     * Handle paste events
     */
    handlePaste(e) {
        e.preventDefault();
        
        // Get plain text from clipboard
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        
        // Insert as plain text to maintain formatting control
        document.execCommand('insertText', false, text);
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeydown(e) {
        // Tab key handling
        if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand('insertText', false, '    '); // Insert 4 spaces
            return;
        }

        // Enter key handling for better paragraph structure
        if (e.key === 'Enter' && !e.shiftKey) {
            // Let default behavior handle paragraph creation
            return;
        }

        // Shift+Enter for line breaks
        if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            document.execCommand('insertHTML', false, '<br>');
            return;
        }
    }

    /**
     * Apply formatting (bold, italic, underline)
     */
    applyFormatting(format, isActive) {
        if (!this.editor) return;

        this.editor.focus();
        
        const commands = {
            'bold': 'bold',
            'italic': 'italic',
            'underline': 'underline'
        };

        const command = commands[format];
        if (command) {
            document.execCommand(command, false, null);
        }
    }

    /**
     * Apply font styles (family, size)
     */
    applyFontStyle(property, value) {
        if (!this.editor) return;

        this.editor.focus();
        
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        
        if (range.collapsed) {
            // No selection - apply to editor
            if (property === 'fontFamily') {
                this.editor.style.fontFamily = value;
            } else if (property === 'fontSize') {
                this.editor.style.fontSize = value;
            }
        } else {
            // Apply to selection
            const span = document.createElement('span');
            if (property === 'fontFamily') {
                span.style.fontFamily = value;
            } else if (property === 'fontSize') {
                span.style.fontSize = value;
            }
            
            try {
                range.surroundContents(span);
            } catch (error) {
                // Fallback for complex selections
                const contents = range.extractContents();
                span.appendChild(contents);
                range.insertNode(span);
            }
        }
    }

    /**
     * Apply color styles (text color, background)
     */
    applyColorStyle(property, value) {
        if (!this.editor) return;

        this.editor.focus();
        
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        
        if (!range.collapsed) {
            const span = document.createElement('span');
            span.style[property] = value;
            
            try {
                range.surroundContents(span);
            } catch (error) {
                // Fallback for complex selections
                const contents = range.extractContents();
                span.appendChild(contents);
                range.insertNode(span);
            }
        }
    }

    /**
     * Get current formats at selection
     */
    getCurrentFormats(range) {
        const formats = [];
        
        if (!range) return formats;

        const element = range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
            ? range.commonAncestorContainer.parentElement 
            : range.commonAncestorContainer;

        // Check for formatting
        let current = element;
        while (current && current !== this.editor) {
            const style = window.getComputedStyle(current);
            
            if (style.fontWeight === 'bold' || style.fontWeight >= '600') {
                formats.push('bold');
            }
            if (style.fontStyle === 'italic') {
                formats.push('italic');
            }
            if (style.textDecoration.includes('underline')) {
                formats.push('underline');
            }
            
            current = current.parentElement;
        }

        return [...new Set(formats)]; // Remove duplicates
    }

    /**
     * Setup auto-save functionality
     */
    setupAutoSave() {
        if (!this.options.enableAutoSave) return;

        this.resetAutoSaveTimer();
    }

    /**
     * Reset auto-save timer
     */
    resetAutoSaveTimer() {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }

        this.autoSaveTimer = setTimeout(() => {
            if (this.isDirty) {
                this.autoSave();
            }
        }, this.options.autoSaveInterval);
    }

    /**
     * Perform auto-save
     */
    autoSave() {
        if (!this.isDirty) return;

        try {
            this.callbacks.onAutoSave(this.content);
            this.updateStatus('saved');
            this.updateLastSaved();
        } catch (error) {
            console.error('Auto-save error:', error);
            this.updateStatus('error');
        }
    }

    /**
     * Update editor status
     */
    updateStatus(status = null) {
        const statusDot = this.container.querySelector('.status-dot');
        const statusText = this.container.querySelector('.status-text');
        
        if (!statusDot || !statusText) return;

        // Determine status
        let currentStatus = status;
        if (!currentStatus) {
            if (this.isDirty) {
                currentStatus = 'dirty';
            } else {
                currentStatus = 'saved';
            }
        }

        // Update UI
        statusDot.className = `status-dot ${currentStatus}`;
        
        const statusMessages = {
            'saved': '保存済み',
            'dirty': '未保存',
            'error': 'エラー'
        };
        
        statusText.textContent = statusMessages[currentStatus] || '不明';
    }

    /**
     * Update word count
     */
    updateWordCount(count) {
        const countElement = this.container.querySelector('.count');
        if (countElement) {
            countElement.textContent = count.toLocaleString();
        }
    }

    /**
     * Update last saved time
     */
    updateLastSaved() {
        const timeElement = this.container.querySelector('.time');
        if (timeElement) {
            const now = new Date();
            timeElement.textContent = now.toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    /**
     * Set content in the editor
     */
    setContent(content) {
        if (!this.editor) return;

        this.originalContent = content || '';
        this.content = this.originalContent;
        this.editor.innerHTML = this.content;
        this.isDirty = false;
        
        this.updateStatus();
        this.updateWordCount((this.editor.textContent || '').length);
    }

    /**
     * Get current content
     */
    getContent() {
        return this.content;
    }

    /**
     * Get plain text content
     */
    getTextContent() {
        return this.editor ? (this.editor.textContent || '') : '';
    }

    /**
     * Check if content has been modified
     */
    isDirtyContent() {
        return this.isDirty;
    }

    /**
     * Save content manually
     */
    save() {
        if (this.isDirty) {
            this.autoSave();
        }
    }

    /**
     * Clear editor content
     */
    clear() {
        if (this.editor) {
            this.editor.innerHTML = '';
            this.content = '';
            this.isDirty = false;
            this.updateStatus();
            this.updateWordCount(0);
        }
    }

    /**
     * Focus the editor
     */
    focus() {
        if (this.editor) {
            this.editor.focus();
        }
    }

    /**
     * Show error state
     */
    showError(message) {
        this.container.innerHTML = `
            <div class="editor-error">
                <strong>エラー:</strong> ${message}
            </div>
        `;
    }

    /**
     * Check if editor is initialized
     */
    isReady() {
        return this.isInitialized && this.editor !== null;
    }

    /**
     * Destroy the component and clean up resources
     */
    destroy() {
        // Clear auto-save timer
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }

        // Destroy toolbar
        if (this.toolbar) {
            this.toolbar.destroy();
        }

        // Clear container
        if (this.container) {
            this.container.innerHTML = '';
            this.container.className = '';
        }
        
        // Remove styles if no other instances exist
        const styleElement = document.getElementById('rich-text-editor-styles');
        if (styleElement && document.querySelectorAll('.rich-text-editor').length === 0) {
            styleElement.remove();
        }
        
        this.isInitialized = false;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RichTextEditor;
} else if (typeof window !== 'undefined') {
    window.RichTextEditor = RichTextEditor;
}