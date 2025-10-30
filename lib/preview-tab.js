/**
 * PreviewTab - Component for displaying formatted markdown preview
 * Implements requirements 1.2, 1.3, and 1.4 for formatted preview display
 */
class PreviewTab {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            enableScrollSync: true,
            enableResponsiveDesign: true,
            enableErrorHandling: true,
            ...options
        };
        
        this.renderer = new MarkdownRenderer({
            sanitize: true,
            enableTables: true,
            enableCodeBlocks: true,
            enableLists: true
        });
        
        this.content = '';
        this.isInitialized = false;
        
        this.init();
    }

    /**
     * Initialize the preview tab component
     */
    init() {
        try {
            this.injectStyles();
            this.setupContainer();
            this.setupErrorHandling();
            this.isInitialized = true;
        } catch (error) {
            console.error('PreviewTab initialization error:', error);
            this.showError('プレビュータブの初期化に失敗しました');
        }
    }

    /**
     * Inject CSS styles for the preview tab
     */
    injectStyles() {
        const styleId = 'preview-tab-styles';
        
        // Check if styles already exist
        if (document.getElementById(styleId)) {
            return;
        }

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            ${MarkdownRenderer.getStyles()}
            
            .preview-tab-container {
                padding: var(--space-4, 1rem);
                background: white;
                border-radius: 0 0 8px 8px;
                min-height: 400px;
                max-height: 70vh;
                overflow-y: auto;
                position: relative;
            }

            .preview-tab-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 200px;
                color: var(--color-gray-500, #6b7280);
                font-style: italic;
            }

            .preview-tab-error {
                padding: var(--space-4, 1rem);
                background: var(--color-red-50, #fef2f2);
                border: 1px solid var(--color-red-200, #fecaca);
                border-radius: 6px;
                color: var(--color-red-700, #b91c1c);
                margin: var(--space-4, 1rem) 0;
            }

            .preview-tab-empty {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 300px;
                color: var(--color-gray-500, #6b7280);
                text-align: center;
            }

            .preview-tab-empty-icon {
                width: 64px;
                height: 64px;
                margin-bottom: var(--space-4, 1rem);
                opacity: 0.5;
            }

            .preview-scroll-indicator {
                position: absolute;
                top: 0;
                right: 0;
                width: 4px;
                background: var(--color-primary, #3b82f6);
                border-radius: 2px;
                opacity: 0.3;
                transition: opacity 0.2s ease;
            }

            .preview-scroll-indicator.visible {
                opacity: 0.6;
            }

            /* Responsive design for different screen sizes */
            @media (max-width: 768px) {
                .preview-tab-container {
                    padding: var(--space-3, 0.75rem);
                    max-height: 60vh;
                }

                .markdown-content {
                    font-size: 0.9rem;
                }
            }

            @media (max-width: 480px) {
                .preview-tab-container {
                    padding: var(--space-2, 0.5rem);
                    max-height: 50vh;
                }

                .markdown-content {
                    font-size: 0.85rem;
                }

                .markdown-h1 {
                    font-size: 1.5rem;
                }

                .markdown-h2 {
                    font-size: 1.25rem;
                }
            }

            /* Print styles */
            @media print {
                .preview-tab-container {
                    max-height: none;
                    overflow: visible;
                    padding: 0;
                }

                .preview-scroll-indicator {
                    display: none;
                }
            }

            /* High contrast mode support */
            @media (prefers-contrast: high) {
                .markdown-content {
                    color: #000;
                }

                .markdown-link {
                    color: #0000ff;
                    text-decoration: underline;
                }

                .code-block {
                    border: 2px solid #000;
                }
            }

            /* Reduced motion support */
            @media (prefers-reduced-motion: reduce) {
                .preview-tab-container * {
                    transition: none !important;
                    animation: none !important;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Setup the container structure
     */
    setupContainer() {
        if (!this.container) {
            throw new Error('Container element not found');
        }

        this.container.className = 'preview-tab-container';
        this.container.setAttribute('role', 'document');
        this.container.setAttribute('aria-label', 'レポートプレビュー');
        
        // Add scroll indicator
        if (this.options.enableScrollSync) {
            this.scrollIndicator = document.createElement('div');
            this.scrollIndicator.className = 'preview-scroll-indicator';
            this.container.appendChild(this.scrollIndicator);
            
            this.setupScrollIndicator();
        }
    }

    /**
     * Setup scroll indicator functionality
     */
    setupScrollIndicator() {
        if (!this.scrollIndicator) return;

        this.container.addEventListener('scroll', () => {
            const { scrollTop, scrollHeight, clientHeight } = this.container;
            const scrollPercentage = scrollTop / (scrollHeight - clientHeight);
            
            if (scrollHeight > clientHeight) {
                this.scrollIndicator.style.height = `${clientHeight * (clientHeight / scrollHeight)}px`;
                this.scrollIndicator.style.top = `${scrollTop * (clientHeight / scrollHeight)}px`;
                this.scrollIndicator.classList.add('visible');
            } else {
                this.scrollIndicator.classList.remove('visible');
            }
        });
    }

    /**
     * Setup error handling
     */
    setupErrorHandling() {
        if (!this.options.enableErrorHandling) return;

        window.addEventListener('error', (event) => {
            if (event.target === this.container || this.container.contains(event.target)) {
                this.showError('プレビュー表示中にエラーが発生しました');
            }
        });
    }

    /**
     * Set content for the preview tab
     * @param {string} markdown - Markdown content to display
     */
    setContent(markdown) {
        if (!this.isInitialized) {
            console.warn('PreviewTab not initialized, attempting to initialize...');
            this.init();
        }

        try {
            this.content = markdown || '';
            this.render();
        } catch (error) {
            console.error('PreviewTab setContent error:', error);
            this.showError('コンテンツの設定中にエラーが発生しました');
        }
    }

    /**
     * Render the markdown content
     */
    render() {
        if (!this.container) {
            console.error('Container not available for rendering');
            return;
        }

        try {
            if (!this.content || this.content.trim() === '') {
                this.showEmpty();
                return;
            }

            this.showLoading();
            
            // Use setTimeout to prevent blocking the UI
            setTimeout(() => {
                try {
                    const html = this.renderer.render(this.content);
                    this.container.innerHTML = html;
                    
                    // Re-add scroll indicator if enabled
                    if (this.options.enableScrollSync && this.scrollIndicator) {
                        this.container.appendChild(this.scrollIndicator);
                    }
                    
                    this.onRenderComplete();
                } catch (renderError) {
                    console.error('Render error:', renderError);
                    this.showError('コンテンツのレンダリング中にエラーが発生しました');
                }
            }, 10);
            
        } catch (error) {
            console.error('PreviewTab render error:', error);
            this.showError('プレビューの表示中にエラーが発生しました');
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        this.container.innerHTML = `
            <div class="preview-tab-loading">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div style="width: 16px; height: 16px; border: 2px solid var(--color-gray-300, #d1d5db); border-top: 2px solid var(--color-primary, #3b82f6); border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    プレビューを生成中...
                </div>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
    }

    /**
     * Show empty state
     */
    showEmpty() {
        this.container.innerHTML = `
            <div class="preview-tab-empty">
                <svg class="preview-tab-empty-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
                </svg>
                <h3 style="margin: 0 0 0.5rem 0; font-size: 1.125rem; font-weight: 600; color: var(--color-gray-600, #4b5563);">
                    プレビューするコンテンツがありません
                </h3>
                <p style="margin: 0; color: var(--color-gray-500, #6b7280);">
                    レポートを生成すると、ここに整形されたプレビューが表示されます
                </p>
            </div>
        `;
    }

    /**
     * Show error state
     * @param {string} message - Error message to display
     */
    showError(message) {
        this.container.innerHTML = `
            <div class="preview-tab-error">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <svg style="width: 20px; height: 20px; flex-shrink: 0;" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                    </svg>
                    <strong>エラー</strong>
                </div>
                <p style="margin: 0;">${message}</p>
                <button 
                    onclick="this.closest('.preview-tab-container').dispatchEvent(new CustomEvent('retry-render'))"
                    style="margin-top: 0.75rem; padding: 0.5rem 1rem; background: var(--color-red-600, #dc2626); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem;"
                >
                    再試行
                </button>
            </div>
        `;

        // Add retry functionality
        this.container.addEventListener('retry-render', () => {
            this.render();
        }, { once: true });
    }

    /**
     * Called when rendering is complete
     */
    onRenderComplete() {
        // Scroll to top
        this.container.scrollTop = 0;
        
        // Dispatch custom event for other components
        this.container.dispatchEvent(new CustomEvent('preview-rendered', {
            detail: { content: this.content }
        }));
        
        // Update scroll indicator
        if (this.options.enableScrollSync) {
            this.container.dispatchEvent(new Event('scroll'));
        }
    }

    /**
     * Get current content
     * @returns {string} Current markdown content
     */
    getContent() {
        return this.content;
    }

    /**
     * Check if tab is initialized
     * @returns {boolean} Initialization status
     */
    isReady() {
        return this.isInitialized && this.container !== null;
    }

    /**
     * Refresh the preview (re-render current content)
     */
    refresh() {
        if (this.content) {
            this.render();
        }
    }

    /**
     * Clear the preview content
     */
    clear() {
        this.content = '';
        this.showEmpty();
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
        const styleElement = document.getElementById('preview-tab-styles');
        if (styleElement && document.querySelectorAll('.preview-tab-container').length === 0) {
            styleElement.remove();
        }
        
        this.isInitialized = false;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PreviewTab;
} else if (typeof window !== 'undefined') {
    window.PreviewTab = PreviewTab;
}