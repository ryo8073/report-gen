/**
 * FormattingToolbar - Rich text formatting toolbar component
 * Implements requirements 2.2 and 2.3 for rich text editing controls
 */
class FormattingToolbar {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            enableFontControls: true,
            enableStyleControls: true,
            enableColorControls: true,
            enableHighlightControls: true,
            ...options
        };
        
        this.activeFormats = new Set();
        this.callbacks = {
            onFormatChange: options.onFormatChange || (() => {}),
            onFontChange: options.onFontChange || (() => {}),
            onSizeChange: options.onSizeChange || (() => {}),
            onColorChange: options.onColorChange || (() => {}),
            onHighlightChange: options.onHighlightChange || (() => {})
        };
        
        this.isInitialized = false;
        this.init();
    }

    /**
     * Initialize the formatting toolbar
     */
    init() {
        try {
            this.injectStyles();
            this.createToolbar();
            this.setupEventListeners();
            this.isInitialized = true;
        } catch (error) {
            console.error('FormattingToolbar initialization error:', error);
            this.showError('フォーマットツールバーの初期化に失敗しました');
        }
    }

    /**
     * Inject CSS styles for the toolbar
     */
    injectStyles() {
        const styleId = 'formatting-toolbar-styles';
        
        if (document.getElementById(styleId)) {
            return;
        }

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .formatting-toolbar {
                display: flex;
                flex-wrap: wrap;
                gap: var(--space-2, 0.5rem);
                padding: var(--space-3, 0.75rem);
                background: var(--color-gray-50, #f9fafb);
                border: 1px solid var(--color-gray-200, #e5e7eb);
                border-radius: 6px 6px 0 0;
                border-bottom: none;
                align-items: center;
                min-height: 60px;
            }

            .toolbar-group {
                display: flex;
                align-items: center;
                gap: var(--space-1, 0.25rem);
                padding: 0 var(--space-2, 0.5rem);
                border-right: 1px solid var(--color-gray-300, #d1d5db);
            }

            .toolbar-group:last-child {
                border-right: none;
            }

            .toolbar-button {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
                border: 1px solid var(--color-gray-300, #d1d5db);
                background: white;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 14px;
                font-weight: 500;
                color: var(--color-gray-700, #374151);
            }

            .toolbar-button:hover {
                background: var(--color-gray-100, #f3f4f6);
                border-color: var(--color-gray-400, #9ca3af);
            }

            .toolbar-button.active {
                background: var(--color-primary, #3b82f6);
                border-color: var(--color-primary, #3b82f6);
                color: white;
            }

            .toolbar-button:focus {
                outline: 2px solid var(--color-primary, #3b82f6);
                outline-offset: 2px;
            }

            .toolbar-select {
                padding: 0.375rem 0.75rem;
                border: 1px solid var(--color-gray-300, #d1d5db);
                border-radius: 4px;
                background: white;
                font-size: 14px;
                color: var(--color-gray-700, #374151);
                cursor: pointer;
                min-width: 100px;
            }

            .toolbar-select:focus {
                outline: 2px solid var(--color-primary, #3b82f6);
                outline-offset: 2px;
                border-color: var(--color-primary, #3b82f6);
            }

            .color-picker-wrapper {
                position: relative;
                display: inline-block;
            }

            .color-picker-button {
                display: flex;
                align-items: center;
                gap: 0.25rem;
                padding: 0.375rem 0.75rem;
                border: 1px solid var(--color-gray-300, #d1d5db);
                border-radius: 4px;
                background: white;
                cursor: pointer;
                font-size: 14px;
                color: var(--color-gray-700, #374151);
            }

            .color-preview {
                width: 16px;
                height: 16px;
                border-radius: 2px;
                border: 1px solid var(--color-gray-300, #d1d5db);
            }

            .color-dropdown {
                position: absolute;
                top: 100%;
                left: 0;
                z-index: 1000;
                background: white;
                border: 1px solid var(--color-gray-300, #d1d5db);
                border-radius: 6px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                padding: var(--space-2, 0.5rem);
                display: none;
                min-width: 200px;
            }

            .color-dropdown.show {
                display: block;
            }

            .color-grid {
                display: grid;
                grid-template-columns: repeat(6, 1fr);
                gap: var(--space-1, 0.25rem);
                margin-bottom: var(--space-2, 0.5rem);
            }

            .color-option {
                width: 24px;
                height: 24px;
                border-radius: 4px;
                border: 2px solid transparent;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .color-option:hover {
                border-color: var(--color-gray-400, #9ca3af);
                transform: scale(1.1);
            }

            .color-option.selected {
                border-color: var(--color-primary, #3b82f6);
                transform: scale(1.1);
            }

            .toolbar-label {
                font-size: 12px;
                font-weight: 500;
                color: var(--color-gray-600, #4b5563);
                margin-right: var(--space-1, 0.25rem);
            }

            .toolbar-error {
                padding: var(--space-2, 0.5rem);
                background: var(--color-red-50, #fef2f2);
                border: 1px solid var(--color-red-200, #fecaca);
                border-radius: 4px;
                color: var(--color-red-700, #b91c1c);
                font-size: 14px;
            }

            /* Responsive design */
            @media (max-width: 768px) {
                .formatting-toolbar {
                    padding: var(--space-2, 0.5rem);
                    gap: var(--space-1, 0.25rem);
                }

                .toolbar-group {
                    padding: 0 var(--space-1, 0.25rem);
                }

                .toolbar-button {
                    width: 28px;
                    height: 28px;
                    font-size: 12px;
                }

                .toolbar-select {
                    font-size: 12px;
                    padding: 0.25rem 0.5rem;
                    min-width: 80px;
                }

                .color-picker-button {
                    padding: 0.25rem 0.5rem;
                    font-size: 12px;
                }
            }

            @media (max-width: 480px) {
                .formatting-toolbar {
                    flex-direction: column;
                    align-items: stretch;
                    gap: var(--space-2, 0.5rem);
                }

                .toolbar-group {
                    border-right: none;
                    border-bottom: 1px solid var(--color-gray-300, #d1d5db);
                    padding-bottom: var(--space-2, 0.5rem);
                    justify-content: center;
                }

                .toolbar-group:last-child {
                    border-bottom: none;
                    padding-bottom: 0;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Create the toolbar structure
     */
    createToolbar() {
        if (!this.container) {
            throw new Error('Container element not found');
        }

        this.container.className = 'formatting-toolbar';
        this.container.setAttribute('role', 'toolbar');
        this.container.setAttribute('aria-label', 'テキストフォーマットツール');

        const toolbarHTML = `
            ${this.options.enableFontControls ? this.createFontControls() : ''}
            ${this.options.enableStyleControls ? this.createStyleControls() : ''}
            ${this.options.enableColorControls ? this.createColorControls() : ''}
            ${this.options.enableHighlightControls ? this.createHighlightControls() : ''}
        `;

        this.container.innerHTML = toolbarHTML;
    }

    /**
     * Create font controls (family and size)
     */
    createFontControls() {
        const fontFamilies = [
            { value: 'default', label: 'デフォルト' },
            { value: 'Arial, sans-serif', label: 'Arial' },
            { value: '"Times New Roman", serif', label: 'Times New Roman' },
            { value: 'Helvetica, sans-serif', label: 'Helvetica' },
            { value: 'Georgia, serif', label: 'Georgia' },
            { value: '"Hiragino Sans", "Yu Gothic", sans-serif', label: 'ヒラギノ角ゴ' }
        ];

        const fontSizes = [
            { value: '12px', label: '12px' },
            { value: '14px', label: '14px' },
            { value: '16px', label: '16px' },
            { value: '18px', label: '18px' },
            { value: '20px', label: '20px' },
            { value: '24px', label: '24px' }
        ];

        return `
            <div class="toolbar-group">
                <span class="toolbar-label">フォント</span>
                <select class="toolbar-select" data-action="font-family" aria-label="フォントファミリー">
                    ${fontFamilies.map(font => 
                        `<option value="${font.value}">${font.label}</option>`
                    ).join('')}
                </select>
                <select class="toolbar-select" data-action="font-size" aria-label="フォントサイズ">
                    ${fontSizes.map(size => 
                        `<option value="${size.value}" ${size.value === '16px' ? 'selected' : ''}>${size.label}</option>`
                    ).join('')}
                </select>
            </div>
        `;
    }

    /**
     * Create style controls (bold, italic, underline)
     */
    createStyleControls() {
        return `
            <div class="toolbar-group" role="group" aria-label="テキストスタイル">
                <span class="toolbar-label">スタイル</span>
                <button class="toolbar-button" 
                        data-action="bold" 
                        aria-label="太字" 
                        aria-describedby="bold-desc"
                        aria-pressed="false"
                        title="太字 (Ctrl+B)">
                    <strong>B</strong>
                </button>
                <div id="bold-desc" class="sr-only">選択したテキストを太字にします</div>
                
                <button class="toolbar-button" 
                        data-action="italic" 
                        aria-label="斜体" 
                        aria-describedby="italic-desc"
                        aria-pressed="false"
                        title="斜体 (Ctrl+I)">
                    <em>I</em>
                </button>
                <div id="italic-desc" class="sr-only">選択したテキストを斜体にします</div>
                
                <button class="toolbar-button" 
                        data-action="underline" 
                        aria-label="下線" 
                        aria-describedby="underline-desc"
                        aria-pressed="false"
                        title="下線 (Ctrl+U)">
                    <u>U</u>
                </button>
                <div id="underline-desc" class="sr-only">選択したテキストに下線を引きます</div>
            </div>
        `;
    }

    /**
     * Create color controls
     */
    createColorControls() {
        return `
            <div class="toolbar-group">
                <span class="toolbar-label">文字色</span>
                <div class="color-picker-wrapper">
                    <button class="color-picker-button" data-action="text-color" aria-label="文字色">
                        <div class="color-preview" style="background-color: #000000;"></div>
                        <span>A</span>
                    </button>
                    <div class="color-dropdown" data-dropdown="text-color">
                        <div class="color-grid">
                            ${this.createColorOptions('text')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create highlight controls
     */
    createHighlightControls() {
        return `
            <div class="toolbar-group">
                <span class="toolbar-label">ハイライト</span>
                <div class="color-picker-wrapper">
                    <button class="color-picker-button" data-action="highlight" aria-label="ハイライト">
                        <div class="color-preview" style="background-color: #ffff00;"></div>
                        <span>H</span>
                    </button>
                    <div class="color-dropdown" data-dropdown="highlight">
                        <div class="color-grid">
                            ${this.createColorOptions('highlight')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create color options for dropdowns
     */
    createColorOptions(type) {
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

        return colors.map(color => 
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
     * Setup event listeners
     */
    setupEventListeners() {
        // Style button clicks
        this.container.addEventListener('click', (e) => {
            const button = e.target.closest('[data-action]');
            if (button) {
                this.handleButtonClick(button);
            }

            // Color option clicks
            const colorOption = e.target.closest('.color-option');
            if (colorOption) {
                this.handleColorSelection(colorOption);
            }

            // Color picker button clicks
            const colorPicker = e.target.closest('.color-picker-button');
            if (colorPicker) {
                this.toggleColorDropdown(colorPicker);
            }
        });

        // Select changes
        this.container.addEventListener('change', (e) => {
            if (e.target.matches('[data-action]')) {
                this.handleSelectChange(e.target);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'b':
                        e.preventDefault();
                        this.toggleFormat('bold');
                        break;
                    case 'i':
                        e.preventDefault();
                        this.toggleFormat('italic');
                        break;
                    case 'u':
                        e.preventDefault();
                        this.toggleFormat('underline');
                        break;
                }
            }
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.color-picker-wrapper')) {
                this.closeAllDropdowns();
            }
        });

        // Keyboard navigation for color options
        this.container.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('color-option')) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleColorSelection(e.target);
                }
            }
        });
    }

    /**
     * Handle button clicks
     */
    handleButtonClick(button) {
        const action = button.dataset.action;
        
        switch (action) {
            case 'bold':
            case 'italic':
            case 'underline':
                this.toggleFormat(action);
                break;
            default:
                console.warn(`Unknown button action: ${action}`);
        }
    }

    /**
     * Handle select changes
     */
    handleSelectChange(select) {
        const action = select.dataset.action;
        const value = select.value;
        
        switch (action) {
            case 'font-family':
                this.callbacks.onFontChange('fontFamily', value === 'default' ? '' : value);
                break;
            case 'font-size':
                this.callbacks.onSizeChange('fontSize', value);
                break;
            default:
                console.warn(`Unknown select action: ${action}`);
        }
    }

    /**
     * Toggle format (bold, italic, underline)
     */
    toggleFormat(format) {
        const button = this.container.querySelector(`[data-action="${format}"]`);
        if (!button) return;

        const isActive = this.activeFormats.has(format);
        
        if (isActive) {
            this.activeFormats.delete(format);
            button.classList.remove('active');
        } else {
            this.activeFormats.add(format);
            button.classList.add('active');
        }

        this.callbacks.onFormatChange(format, !isActive);
    }

    /**
     * Handle color selection
     */
    handleColorSelection(colorOption) {
        const color = colorOption.dataset.color;
        const type = colorOption.dataset.type;
        
        // Update preview
        const dropdown = colorOption.closest('.color-dropdown');
        const button = dropdown.previousElementSibling;
        const preview = button.querySelector('.color-preview');
        
        if (preview) {
            preview.style.backgroundColor = color;
        }

        // Update selection state
        dropdown.querySelectorAll('.color-option').forEach(option => {
            option.classList.remove('selected');
        });
        colorOption.classList.add('selected');

        // Trigger callback
        if (type === 'text') {
            this.callbacks.onColorChange('color', color);
        } else if (type === 'highlight') {
            this.callbacks.onHighlightChange('backgroundColor', color);
        }

        // Close dropdown
        this.closeAllDropdowns();
    }

    /**
     * Toggle color dropdown
     */
    toggleColorDropdown(button) {
        const action = button.dataset.action;
        const dropdown = this.container.querySelector(`[data-dropdown="${action}"]`);
        
        if (!dropdown) return;

        // Close other dropdowns
        this.closeAllDropdowns();
        
        // Toggle current dropdown
        dropdown.classList.toggle('show');
    }

    /**
     * Close all color dropdowns
     */
    closeAllDropdowns() {
        this.container.querySelectorAll('.color-dropdown').forEach(dropdown => {
            dropdown.classList.remove('show');
        });
    }

    /**
     * Update active formats from external state
     */
    updateActiveFormats(formats) {
        this.activeFormats.clear();
        
        // Update button states with accessibility attributes
        this.container.querySelectorAll('.toolbar-button').forEach(button => {
            button.classList.remove('active');
            button.setAttribute('aria-pressed', 'false');
        });

        // Set active formats
        formats.forEach(format => {
            this.activeFormats.add(format);
            const button = this.container.querySelector(`[data-action="${format}"]`);
            if (button) {
                button.classList.add('active');
                button.setAttribute('aria-pressed', 'true');
            }
        });
    }

    /**
     * Show error state
     */
    showError(message) {
        this.container.innerHTML = `
            <div class="toolbar-error">
                <strong>エラー:</strong> ${message}
            </div>
        `;
    }

    /**
     * Get current active formats
     */
    getActiveFormats() {
        return Array.from(this.activeFormats);
    }

    /**
     * Check if toolbar is initialized
     */
    isReady() {
        return this.isInitialized && this.container !== null;
    }

    /**
     * Destroy the component and clean up resources
     */
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
            this.container.className = '';
        }
        
        // Remove styles if no other instances exist
        const styleElement = document.getElementById('formatting-toolbar-styles');
        if (styleElement && document.querySelectorAll('.formatting-toolbar').length === 0) {
            styleElement.remove();
        }
        
        this.isInitialized = false;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormattingToolbar;
} else if (typeof window !== 'undefined') {
    window.FormattingToolbar = FormattingToolbar;
}