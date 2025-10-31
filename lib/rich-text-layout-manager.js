/**
 * RichTextLayoutManager - Manages split-panel and tabbed layouts for rich text editor
 * Implements requirements 3.1, 3.2, 3.4 for improved editor layout
 */
class RichTextLayoutManager {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            defaultLayout: 'split', // 'split', 'tabbed', 'full-width'
            enableResizablePanels: true,
            enableLayoutToggle: true,
            enableResponsiveDesign: true,
            minPanelWidth: 300,
            defaultSplitRatio: 0.5,
            enablePreviewSync: true,
            ...options
        };
        
        // Layout state
        this.currentLayout = this.options.defaultLayout;
        this.splitRatio = this.options.defaultSplitRatio;
        this.isResizing = false;
        this.isInitialized = false;
        
        // Component references
        this.editorPanel = null;
        this.previewPanel = null;
        this.resizeHandle = null;
        this.layoutToggle = null;
        this.tabContainer = null;
        
        // Editor and preview instances
        this.richTextEditor = null;
        this.previewTab = null;
        
        // Event callbacks
        this.callbacks = {
            onLayoutChange: options.onLayoutChange || (() => {}),
            onContentChange: options.onContentChange || (() => {}),
            onResize: options.onResize || (() => {}),
            ...options.callbacks
        };
        
        this.init();
    }
    
    /**
     * Initialize the layout manager
     */
    init() {
        try {
            this.injectStyles();
            this.createLayoutStructure();
            this.setupEventListeners();
            this.setupResponsiveDesign();
            this.isInitialized = true;
            console.log('RichTextLayoutManager initialized');
        } catch (error) {
            console.error('RichTextLayoutManager initialization error:', error);
            this.showError('レイアウトマネージャーの初期化に失敗しました');
        }
    }
    
    /**
     * Inject CSS styles for the layout manager
     */
    injectStyles() {
        const styleId = 'rich-text-layout-manager-styles';
        
        if (document.getElementById(styleId)) {
            return;
        }

        // Load enhanced tabbed interface styles
        this.loadEnhancedTabbedStyles();

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .rich-text-layout-container {
                display: flex;
                flex-direction: column;
                height: 100%;
                min-height: 500px;
                border: 1px solid var(--color-gray-300, #d1d5db);
                border-radius: 8px;
                background: white;
                overflow: hidden;
            }

            .layout-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: var(--space-2, 0.5rem) var(--space-4, 1rem);
                background: var(--color-gray-50, #f9fafb);
                border-bottom: 1px solid var(--color-gray-200, #e5e7eb);
                min-height: 48px;
            }

            .layout-title {
                font-size: 0.875rem;
                font-weight: 600;
                color: var(--color-gray-700, #374151);
                margin: 0;
            }

            .layout-controls {
                display: flex;
                align-items: center;
                gap: var(--space-2, 0.5rem);
            }

            .layout-toggle-btn {
                display: flex;
                align-items: center;
                gap: var(--space-1, 0.25rem);
                padding: var(--space-1, 0.25rem) var(--space-2, 0.5rem);
                background: white;
                border: 1px solid var(--color-gray-300, #d1d5db);
                border-radius: 4px;
                font-size: 0.75rem;
                color: var(--color-gray-600, #4b5563);
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .layout-toggle-btn:hover {
                background: var(--color-gray-50, #f9fafb);
                border-color: var(--color-gray-400, #9ca3af);
            }

            .layout-toggle-btn.active {
                background: var(--color-primary, #3b82f6);
                border-color: var(--color-primary, #3b82f6);
                color: white;
            }

            .layout-content {
                flex: 1;
                display: flex;
                overflow: hidden;
            }

            /* Split Layout Styles */
            .layout-content.split {
                flex-direction: row;
            }

            .editor-panel {
                flex: 1;
                display: flex;
                flex-direction: column;
                min-width: 0;
                background: white;
            }

            .preview-panel {
                flex: 1;
                display: flex;
                flex-direction: column;
                min-width: 0;
                background: var(--color-gray-50, #f9fafb);
                border-left: 1px solid var(--color-gray-200, #e5e7eb);
            }

            .panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: var(--space-2, 0.5rem) var(--space-4, 1rem);
                background: var(--color-gray-100, #f3f4f6);
                border-bottom: 1px solid var(--color-gray-200, #e5e7eb);
                font-size: 0.75rem;
                font-weight: 600;
                color: var(--color-gray-600, #4b5563);
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            
            .panel-toggle-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
                background: transparent;
                border: 1px solid var(--color-gray-300, #d1d5db);
                border-radius: 4px;
                color: var(--color-gray-500, #6b7280);
                cursor: pointer;
                transition: all 0.2s ease;
                padding: 0;
            }
            
            .panel-toggle-btn:hover {
                background: var(--color-gray-200, #e5e7eb);
                border-color: var(--color-gray-400, #9ca3af);
                color: var(--color-gray-700, #374151);
            }
            
            .panel-toggle-btn.active {
                background: var(--color-red-50, #fef2f2);
                border-color: var(--color-red-300, #fca5a5);
                color: var(--color-red-600, #dc2626);
            }
            
            .panel-toggle-btn svg {
                width: 12px;
                height: 12px;
            }

            .panel-content {
                flex: 1;
                overflow: hidden;
                position: relative;
            }

            .resize-handle {
                width: 4px;
                background: var(--color-gray-200, #e5e7eb);
                cursor: col-resize;
                position: relative;
                transition: background-color 0.2s ease;
                flex-shrink: 0;
            }

            .resize-handle:hover,
            .resize-handle.resizing {
                background: var(--color-primary, #3b82f6);
            }

            .resize-handle::before {
                content: '';
                position: absolute;
                top: 0;
                left: -2px;
                right: -2px;
                bottom: 0;
                cursor: col-resize;
            }

            /* Tabbed Layout Styles */
            .layout-content.tabbed {
                flex-direction: column;
            }

            .tab-container {
                display: flex;
                background: var(--color-gray-100, #f3f4f6);
                border-bottom: 1px solid var(--color-gray-200, #e5e7eb);
            }

            .tab-button {
                flex: 1;
                padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
                background: transparent;
                border: none;
                font-size: 0.875rem;
                font-weight: 500;
                color: var(--color-gray-600, #4b5563);
                cursor: pointer;
                transition: all 0.2s ease;
                position: relative;
            }

            .tab-button:hover {
                background: var(--color-gray-200, #e5e7eb);
                color: var(--color-gray-800, #1f2937);
            }

            .tab-button.active {
                background: white;
                color: var(--color-primary, #3b82f6);
                border-bottom: 2px solid var(--color-primary, #3b82f6);
            }

            .tab-content {
                flex: 1;
                overflow: hidden;
                position: relative;
            }

            .tab-panel {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.2s ease;
            }

            .tab-panel.active {
                opacity: 1;
                visibility: visible;
            }

            /* Full-width Layout Styles */
            .layout-content.full-width .editor-panel {
                flex: 1;
            }

            .layout-content.full-width .preview-panel {
                display: none;
            }

            /* Responsive Design - Enhanced for better mobile experience */
            
            /* Tablet Layout (768px - 1024px) */
            @media (max-width: 1024px) and (min-width: 769px) {
                .rich-text-layout-container {
                    min-height: 600px;
                }
                
                .layout-header {
                    padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
                }
                
                .layout-toggle-btn {
                    padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
                    font-size: 0.8rem;
                }
                
                .panel-content {
                    padding: var(--space-4, 1rem);
                }
                
                /* Ensure minimum touch target size */
                .resize-handle {
                    min-width: 44px;
                    min-height: 44px;
                }
            }

            /* Mobile Layout (up to 768px) */
            @media (max-width: 768px) {
                .rich-text-layout-container {
                    border-radius: 4px;
                    min-height: 500px;
                }
                
                .layout-content.split {
                    flex-direction: column;
                }

                .editor-panel,
                .preview-panel {
                    min-height: 250px;
                }

                .preview-panel {
                    border-left: none;
                    border-top: 1px solid var(--color-gray-200, #e5e7eb);
                }

                .resize-handle {
                    width: 100%;
                    height: 8px;
                    cursor: row-resize;
                    background: var(--color-gray-300, #d1d5db);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 44px; /* Touch-friendly size */
                }

                .resize-handle::before {
                    content: '';
                    width: 40px;
                    height: 4px;
                    background: var(--color-gray-500, #6b7280);
                    border-radius: 2px;
                    cursor: row-resize;
                }

                .resize-handle::after {
                    content: '';
                    position: absolute;
                    top: -10px;
                    bottom: -10px;
                    left: 0;
                    right: 0;
                    cursor: row-resize;
                }

                .layout-header {
                    padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
                    flex-wrap: wrap;
                    gap: var(--space-2, 0.5rem);
                }

                .layout-title {
                    font-size: 0.875rem;
                    flex: 1;
                    min-width: 120px;
                }

                .layout-controls {
                    gap: var(--space-2, 0.5rem);
                    flex-wrap: wrap;
                }

                .layout-toggle-btn {
                    padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
                    font-size: 0.75rem;
                    min-height: 44px; /* Touch-friendly */
                    min-width: 44px;
                    border-radius: 6px;
                }

                .layout-toggle-btn svg {
                    width: 18px;
                    height: 18px;
                }

                .panel-header {
                    padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
                    font-size: 0.875rem;
                }

                .panel-content {
                    padding: var(--space-3, 0.75rem);
                }

                /* Enhanced tabbed interface for mobile */
                .tab-button {
                    padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
                    font-size: 0.875rem;
                    min-height: 48px; /* Touch-friendly */
                }

                .enhanced-tab-button {
                    padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
                    min-height: 48px;
                    gap: var(--space-2, 0.5rem);
                }

                .enhanced-tab-button .tab-icon {
                    width: 20px;
                    height: 20px;
                }

                /* Improve touch scrolling */
                .panel-content {
                    -webkit-overflow-scrolling: touch;
                    overscroll-behavior: contain;
                }

                /* Stack layout controls vertically on very narrow screens */
                @media (max-width: 600px) {
                    .layout-header {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    
                    .layout-controls {
                        justify-content: center;
                        margin-top: var(--space-2, 0.5rem);
                    }
                }
            }

            /* Small Mobile Layout (up to 480px) */
            @media (max-width: 480px) {
                .rich-text-layout-container {
                    min-height: 400px;
                    border-radius: 0;
                    border-left: none;
                    border-right: none;
                }

                .layout-header {
                    padding: var(--space-2, 0.5rem);
                    flex-direction: column;
                    align-items: stretch;
                    gap: var(--space-2, 0.5rem);
                }

                .layout-title {
                    font-size: 0.75rem;
                    text-align: center;
                }

                .layout-controls {
                    gap: var(--space-1, 0.25rem);
                    justify-content: center;
                }

                .layout-toggle-btn {
                    padding: var(--space-2, 0.5rem);
                    font-size: 0.625rem;
                    min-height: 40px;
                    min-width: 40px;
                    flex: 1;
                    max-width: 80px;
                }

                .layout-toggle-btn svg {
                    width: 16px;
                    height: 16px;
                }

                .tab-button {
                    padding: var(--space-2, 0.5rem);
                    font-size: 0.75rem;
                    min-height: 44px;
                }

                .enhanced-tab-button {
                    padding: var(--space-2, 0.5rem);
                    flex-direction: column;
                    gap: var(--space-1, 0.25rem);
                    min-height: 60px;
                }

                .enhanced-tab-button .tab-text {
                    font-size: 0.625rem;
                    line-height: 1.2;
                }

                .enhanced-tab-button .tab-icon {
                    width: 18px;
                    height: 18px;
                }

                .panel-header {
                    padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
                    font-size: 0.75rem;
                }

                .panel-content {
                    padding: var(--space-2, 0.5rem);
                }

                .resize-handle {
                    height: 12px;
                    min-height: 48px;
                }

                .resize-handle::before {
                    width: 60px;
                    height: 6px;
                }

                /* Force single column layout */
                .layout-content.split {
                    flex-direction: column !important;
                }

                .editor-panel,
                .preview-panel {
                    min-height: 200px;
                }
            }

            /* Extra Small Screens (up to 360px) */
            @media (max-width: 360px) {
                .layout-toggle-btn {
                    padding: var(--space-1, 0.25rem);
                    font-size: 0.5rem;
                    min-height: 36px;
                    min-width: 36px;
                }

                .layout-toggle-btn svg {
                    width: 14px;
                    height: 14px;
                }

                .enhanced-tab-button {
                    min-height: 56px;
                    padding: var(--space-1, 0.25rem);
                }

                .enhanced-tab-button .tab-text {
                    font-size: 0.5rem;
                }

                .enhanced-tab-button .tab-icon {
                    width: 16px;
                    height: 16px;
                }
            }

            /* Animation for layout transitions */
            .layout-content {
                transition: all 0.3s ease;
            }

            .editor-panel,
            .preview-panel {
                transition: flex 0.3s ease, width 0.3s ease;
            }
            
            /* Enhanced tab transition animations */
            .tab-entering {
                animation: tabEnter 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .tab-exiting {
                animation: tabExit 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .tab-transition-enter {
                opacity: 0;
                transform: translateX(30px) scale(0.95);
            }
            
            .tab-transition-exit {
                opacity: 1;
                transform: translateX(0) scale(1);
            }
            
            .slide-in-left {
                animation: slideInLeft 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .slide-in-right {
                animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .slide-out-left {
                animation: slideOutLeft 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .slide-out-right {
                animation: slideOutRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .transition-loading .enhanced-tab-nav::before {
                animation: loadingPulse 1s ease-in-out infinite;
            }
            
            @keyframes tabEnter {
                0% {
                    transform: translateY(0) scale(1);
                    box-shadow: none;
                }
                50% {
                    transform: translateY(-3px) scale(1.05);
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
                }
                100% {
                    transform: translateY(-2px) scale(1.02);
                    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
                }
            }
            
            @keyframes tabExit {
                0% {
                    transform: translateY(-2px) scale(1.02);
                    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
                }
                100% {
                    transform: translateY(0) scale(1);
                    box-shadow: none;
                }
            }
            
            @keyframes slideInLeft {
                0% {
                    opacity: 0;
                    transform: translateX(-30px) scale(0.95);
                }
                100% {
                    opacity: 1;
                    transform: translateX(0) scale(1);
                }
            }
            
            @keyframes slideInRight {
                0% {
                    opacity: 0;
                    transform: translateX(30px) scale(0.95);
                }
                100% {
                    opacity: 1;
                    transform: translateX(0) scale(1);
                }
            }
            
            @keyframes slideOutLeft {
                0% {
                    opacity: 1;
                    transform: translateX(0) scale(1);
                }
                100% {
                    opacity: 0;
                    transform: translateX(-30px) scale(0.95);
                }
            }
            
            @keyframes slideOutRight {
                0% {
                    opacity: 1;
                    transform: translateX(0) scale(1);
                }
                100% {
                    opacity: 0;
                    transform: translateX(30px) scale(0.95);
                }
            }
            
            @keyframes loadingPulse {
                0%, 100% {
                    opacity: 0.5;
                    transform: scaleX(0.8);
                }
                50% {
                    opacity: 1;
                    transform: scaleX(1);
                }
            }
            
            @keyframes ripple {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
            
            @keyframes slideInRight {
                0% {
                    opacity: 0;
                    transform: translateX(100px);
                }
                100% {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            @keyframes slideOutRight {
                0% {
                    opacity: 1;
                    transform: translateX(0);
                }
                100% {
                    opacity: 0;
                    transform: translateX(100px);
                }
            }
            
            /* Layout change notification styles */
            .layout-change-notification .notification-content {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            /* Focus states for integrated components */
            .rich-text-layout-container.editor-focused .editor-panel {
                box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
            }
            
            .rich-text-layout-container.preview-focused .preview-panel {
                box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
            }
            
            /* Preview error styles */
            .preview-error {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 2rem;
                color: #ef4444;
                text-align: center;
            }
            
            .preview-error svg {
                margin-bottom: 1rem;
                opacity: 0.7;
            }
            
            .preview-error h3 {
                margin: 0 0 0.5rem 0;
                font-size: 1.125rem;
                font-weight: 600;
            }
            
            .preview-error p {
                margin: 0;
                color: #6b7280;
            }

            /* Focus and accessibility styles */
            .layout-toggle-btn:focus,
            .tab-button:focus {
                outline: 2px solid var(--color-primary, #3b82f6);
                outline-offset: 2px;
            }

            .resize-handle:focus {
                outline: 2px solid var(--color-primary, #3b82f6);
                outline-offset: 1px;
            }

            /* Error state */
            .layout-error {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: var(--space-8, 2rem);
                color: var(--color-red-600, #dc2626);
                text-align: center;
            }

            /* Loading state */
            .layout-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: var(--space-8, 2rem);
                color: var(--color-gray-500, #6b7280);
            }

            .loading-spinner {
                width: 20px;
                height: 20px;
                border: 2px solid var(--color-gray-300, #d1d5db);
                border-top: 2px solid var(--color-primary, #3b82f6);
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-right: var(--space-2, 0.5rem);
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            @keyframes swipeFeedback {
                0% {
                    opacity: 0;
                    transform: translateY(-50%) scale(0.5);
                }
                50% {
                    opacity: 1;
                    transform: translateY(-50%) scale(1.1);
                }
                100% {
                    opacity: 0;
                    transform: translateY(-50%) scale(0.8);
                }
            }

            /* High contrast mode */
            @media (prefers-contrast: high) {
                .rich-text-layout-container {
                    border: 2px solid #000;
                }

                .layout-toggle-btn,
                .tab-button {
                    border: 2px solid #000;
                }

                .resize-handle {
                    background: #000;
                }
            }

            /* Reduced motion */
            @media (prefers-reduced-motion: reduce) {
                .layout-content,
                .editor-panel,
                .preview-panel,
                .tab-panel,
                .layout-toggle-btn,
                .tab-button {
                    transition: none !important;
                }

                .loading-spinner {
                    animation: none !important;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Load enhanced tabbed interface styles
     */
    loadEnhancedTabbedStyles() {
        const enhancedStyleId = 'enhanced-tabbed-interface-styles';
        
        if (document.getElementById(enhancedStyleId)) {
            return;
        }
        
        // Try to load from external CSS file first
        const existingLink = document.querySelector('link[href*="enhanced-tabbed-interface.css"]');
        if (existingLink) {
            return;
        }
        
        // Create link element to load the CSS file
        const link = document.createElement('link');
        link.id = enhancedStyleId;
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = './lib/enhanced-tabbed-interface.css';
        
        // Fallback: if CSS file fails to load, inject styles directly
        link.onerror = () => {
            console.warn('Enhanced tabbed interface CSS file not found, using inline styles');
            // The styles are already included in the enhanced-tabbed-interface.css file
        };
        
        document.head.appendChild(link);
    }
    
    /**
     * Create the layout structure
     */
    createLayoutStructure() {
        if (!this.container) {
            throw new Error('Container element not found');
        }

        this.container.className = 'rich-text-layout-container';
        this.container.setAttribute('role', 'application');
        this.container.setAttribute('aria-label', 'リッチテキストエディターレイアウト');

        this.container.innerHTML = `
            <div class="layout-header">
                <h2 class="layout-title">レポートエディター</h2>
                <div class="layout-controls">
                    <button class="layout-toggle-btn" data-layout="split" title="分割表示">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="12" y1="3" x2="12" y2="21"></line>
                        </svg>
                        分割
                    </button>
                    <button class="layout-toggle-btn" data-layout="tabbed" title="タブ表示">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M2 3h6l2 3h10a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3z"></path>
                        </svg>
                        タブ
                    </button>
                    <button class="layout-toggle-btn" data-layout="full-width" title="全幅表示">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        </svg>
                        全幅
                    </button>
                </div>
            </div>
            <div class="layout-content ${this.currentLayout}">
                <!-- Content will be populated based on layout -->
            </div>
        `;

        // Get references to key elements
        this.layoutContent = this.container.querySelector('.layout-content');
        this.layoutControls = this.container.querySelector('.layout-controls');
        
        // Create layout based on current mode
        this.createLayout(this.currentLayout);
        
        // Set active layout button
        this.updateLayoutButtons();
    }
    
    /**
     * Create layout based on mode
     */
    createLayout(layoutMode) {
        switch (layoutMode) {
            case 'split':
                this.createSplitLayout();
                break;
            case 'tabbed':
                this.createTabbedLayout();
                break;
            case 'full-width':
                this.createFullWidthLayout();
                break;
            default:
                this.createSplitLayout();
        }
    }
    
    /**
     * Create split-panel layout
     */
    createSplitLayout() {
        this.layoutContent.className = 'layout-content split';
        this.layoutContent.innerHTML = `
            <div class="editor-panel" style="flex: ${this.splitRatio}">
                <div class="panel-header">編集</div>
                <div class="panel-content" id="editor-content">
                    <!-- Rich text editor will be inserted here -->
                </div>
            </div>
            <div class="resize-handle" tabindex="0" role="separator" aria-label="パネルサイズ調整" aria-orientation="vertical"></div>
            <div class="preview-panel" style="flex: ${1 - this.splitRatio}">
                <div class="panel-header">プレビュー</div>
                <div class="panel-content" id="preview-content">
                    <!-- Preview will be inserted here -->
                </div>
            </div>
        `;
        
        // Get panel references
        this.editorPanel = this.layoutContent.querySelector('.editor-panel');
        this.previewPanel = this.layoutContent.querySelector('.preview-panel');
        this.resizeHandle = this.layoutContent.querySelector('.resize-handle');
        
        // Setup resize functionality
        if (this.options.enableResizablePanels) {
            this.setupResizeHandle();
        }
        
        // Initialize split layout
        this.initializeSplitLayout();
        
        // Initialize editor and preview
        this.initializeEditor();
        this.initializePreview();
    }
    
    /**
     * Initialize split-panel layout functionality
     * Implements requirement 3.1 - Complete Split-Panel Layout Implementation
     */
    initializeSplitLayout() {
        if (!this.editorPanel || !this.previewPanel) {
            console.error('Split layout panels not found');
            return;
        }
        
        // Set initial panel sizes with proper constraints
        this.setSplitRatio(this.splitRatio);
        
        // Add split layout specific classes
        this.container.classList.add('split-layout-active');
        
        // Setup panel visibility toggle
        this.setupPanelVisibilityToggle();
        
        // Setup real-time content synchronization
        if (this.options.enablePreviewSync) {
            this.setupRealTimeSync();
        }
        
        // Add keyboard shortcuts for split layout
        this.setupSplitLayoutKeyboardShortcuts();
        
        // Initialize panel state tracking
        this.panelState = {
            editorVisible: true,
            previewVisible: true,
            lastFocusedPanel: 'editor'
        };
        
        console.log('Split layout initialized with ratio:', this.splitRatio);
    }
    
    /**
     * Setup panel visibility toggle functionality
     */
    setupPanelVisibilityToggle() {
        // Add toggle buttons to panel headers
        const editorHeader = this.editorPanel.querySelector('.panel-header');
        const previewHeader = this.previewPanel.querySelector('.panel-header');
        
        if (editorHeader) {
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'panel-toggle-btn';
            toggleBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"></path>
                </svg>
            `;
            toggleBtn.title = 'プレビューパネルを切り替え';
            toggleBtn.addEventListener('click', () => this.togglePreviewMode());
            editorHeader.appendChild(toggleBtn);
        }
        
        if (previewHeader) {
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'panel-toggle-btn';
            toggleBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"></path>
                </svg>
            `;
            toggleBtn.title = 'エディターパネルを切り替え';
            toggleBtn.addEventListener('click', () => this.toggleEditorMode());
            previewHeader.appendChild(toggleBtn);
        }
    }
    
    /**
     * Setup real-time content synchronization
     */
    setupRealTimeSync() {
        // Debounced sync function for performance
        this.debouncedSync = this.debounce(() => {
            this.synchronizeContent();
        }, 300);
        
        // Listen for content changes in editor
        if (this.richTextEditor) {
            // Will be connected when editor is initialized
            this.syncEnabled = true;
        }
    }
    
    /**
     * Setup keyboard shortcuts for split layout
     */
    setupSplitLayoutKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when split layout is active
            if (this.currentLayout !== 'split') return;
            
            // Ctrl/Cmd + Shift + P: Toggle preview panel
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                this.togglePreviewMode();
            }
            
            // Ctrl/Cmd + Shift + E: Toggle editor panel
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
                e.preventDefault();
                this.toggleEditorMode();
            }
            
            // Ctrl/Cmd + Shift + S: Sync content manually
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                this.synchronizeContent();
            }
            
            // Ctrl/Cmd + Shift + R: Reset panel ratio
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
                e.preventDefault();
                this.setSplitRatio(0.5);
            }
        });
    }
    
    /**
     * Toggle preview panel visibility
     * Implements requirement 3.1 - Add togglePreviewMode functionality
     */
    togglePreviewMode() {
        if (!this.previewPanel) return;
        
        this.panelState.previewVisible = !this.panelState.previewVisible;
        
        if (this.panelState.previewVisible) {
            // Show preview panel
            this.previewPanel.style.display = 'flex';
            this.resizeHandle.style.display = 'block';
            this.setSplitRatio(this.splitRatio);
            
            // Sync content when showing preview
            this.synchronizeContent();
        } else {
            // Hide preview panel
            this.previewPanel.style.display = 'none';
            this.resizeHandle.style.display = 'none';
            this.editorPanel.style.flex = '1';
        }
        
        // Update toggle button states
        this.updateToggleButtonStates();
        
        // Trigger callback
        this.callbacks.onLayoutChange(
            `split-preview-${this.panelState.previewVisible ? 'visible' : 'hidden'}`,
            `split-preview-${!this.panelState.previewVisible ? 'visible' : 'hidden'}`
        );
        
        console.log('Preview panel toggled:', this.panelState.previewVisible);
    }
    
    /**
     * Toggle editor panel visibility
     */
    toggleEditorMode() {
        if (!this.editorPanel) return;
        
        this.panelState.editorVisible = !this.panelState.editorVisible;
        
        if (this.panelState.editorVisible) {
            // Show editor panel
            this.editorPanel.style.display = 'flex';
            this.resizeHandle.style.display = 'block';
            this.setSplitRatio(this.splitRatio);
        } else {
            // Hide editor panel
            this.editorPanel.style.display = 'none';
            this.resizeHandle.style.display = 'none';
            this.previewPanel.style.flex = '1';
        }
        
        // Update toggle button states
        this.updateToggleButtonStates();
        
        // Trigger callback
        this.callbacks.onLayoutChange(
            `split-editor-${this.panelState.editorVisible ? 'visible' : 'hidden'}`,
            `split-editor-${!this.panelState.editorVisible ? 'visible' : 'hidden'}`
        );
        
        console.log('Editor panel toggled:', this.panelState.editorVisible);
    }
    
    /**
     * Update toggle button states
     */
    updateToggleButtonStates() {
        const toggleButtons = this.container.querySelectorAll('.panel-toggle-btn');
        toggleButtons.forEach(btn => {
            const isPreviewBtn = btn.closest('.preview-panel');
            const isEditorBtn = btn.closest('.editor-panel');
            
            if (isPreviewBtn) {
                btn.classList.toggle('active', !this.panelState.previewVisible);
            } else if (isEditorBtn) {
                btn.classList.toggle('active', !this.panelState.editorVisible);
            }
        });
    }
    
    /**
     * Synchronize content between editor and preview
     * Implements requirement 3.1 - Implement synchronizeContent method for real-time preview updates
     */
    synchronizeContent() {
        if (!this.richTextEditor || !this.previewTab) {
            console.warn('Editor or preview not available for synchronization');
            return;
        }
        
        try {
            // Get content from editor
            const htmlContent = this.richTextEditor.getContent();
            const textContent = this.richTextEditor.getTextContent ? 
                               this.richTextEditor.getTextContent() : 
                               this.richTextEditor.getContent();
            
            // Update preview with loading state
            this.updateContentState('preview', 'loading');
            
            // Process content for preview
            const processedContent = this.processContentForPreview(htmlContent);
            
            // Update preview
            this.previewTab.setContent(processedContent);
            
            // Update content state
            this.updateContentState('editor', 'synced');
            this.updateContentState('preview', 'synced');
            
            // Update last sync time
            this.lastSyncTime = Date.now();
            
            // Trigger content change callback
            this.callbacks.onContentChange(htmlContent, textContent);
            
            console.log('Content synchronized successfully');
            
        } catch (error) {
            console.error('Content synchronization error:', error);
            this.updateContentState('preview', 'error');
        }
    }
    
    /**
     * Process content for preview display
     */
    processContentForPreview(htmlContent) {
        if (!htmlContent || htmlContent.trim() === '') {
            return '<p style="color: #6b7280; font-style: italic;">プレビューを表示するには、コンテンツを入力してください。</p>';
        }
        
        // Basic content processing
        let processedContent = htmlContent;
        
        // Ensure proper styling for preview
        processedContent = `
            <div class="preview-content-wrapper" style="
                font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif;
                font-size: 16px;
                line-height: 1.6;
                color: #374151;
                max-width: 100%;
                word-wrap: break-word;
            ">
                ${processedContent}
            </div>
        `;
        
        return processedContent;
    }
    
    /**
     * Debounce utility function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    /**
     * Create enhanced tabbed layout
     */
    createTabbedLayout() {
        this.layoutContent.className = 'layout-content tabbed';
        this.layoutContent.innerHTML = `
            <div class="enhanced-tab-container">
                <div class="layout-mode-selector">
                    <span class="layout-mode-label">レイアウト</span>
                    <div class="layout-mode-buttons">
                        <button class="layout-mode-button" data-layout="split" title="分割表示">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="12" y1="3" x2="12" y2="21"></line>
                            </svg>
                        </button>
                        <button class="layout-mode-button active" data-layout="tabbed" title="タブ表示">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M2 3h6l2 3h10a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3z"></path>
                            </svg>
                        </button>
                        <button class="layout-mode-button" data-layout="full-width" title="全幅表示">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="enhanced-tab-nav active">
                    <button class="enhanced-tab-button active" data-tab="editor" role="tab" aria-selected="true" aria-controls="editor-tab-panel">
                        <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        <span class="tab-text">編集</span>
                    </button>
                    <button class="enhanced-tab-button" data-tab="preview" role="tab" aria-selected="false" aria-controls="preview-tab-panel">
                        <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        <span class="tab-text">プレビュー</span>
                    </button>
                </div>
                <div class="enhanced-tab-content">
                    <div class="content-state-indicator">
                        <div class="state-dot synced" aria-hidden="true"></div>
                        <span class="state-text">同期済み</span>
                    </div>
                    <div class="user-preference-badge">タブモード</div>
                    <div class="enhanced-tab-panel active" id="editor-tab-panel" role="tabpanel" aria-labelledby="editor-tab">
                        <div class="enhanced-tab-panel-content">
                            <div id="editor-content">
                                <!-- Rich text editor will be inserted here -->
                            </div>
                        </div>
                    </div>
                    <div class="enhanced-tab-panel" id="preview-tab-panel" role="tabpanel" aria-labelledby="preview-tab">
                        <div class="enhanced-tab-panel-content">
                            <div id="preview-content">
                                <!-- Preview will be inserted here -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Get tab references
        this.tabContainer = this.layoutContent.querySelector('.enhanced-tab-nav');
        this.editorPanel = this.layoutContent.querySelector('#editor-tab-panel');
        this.previewPanel = this.layoutContent.querySelector('#preview-tab-panel');
        this.contentStateIndicator = this.layoutContent.querySelector('.content-state-indicator');
        
        // Setup enhanced tab functionality
        this.setupEnhancedTabNavigation();
        this.setupLayoutModeSelector();
        this.setupContentStateTracking();
        
        // Initialize editor and preview
        this.initializeEditor();
        this.initializePreview();
        
        // Set up user preferences
        this.loadUserPreferences();
        
        // Restore persisted state
        setTimeout(() => {
            this.restorePersistedState();
        }, 200);
    }
    
    /**
     * Create full-width layout
     */
    createFullWidthLayout() {
        this.layoutContent.className = 'layout-content full-width';
        this.layoutContent.innerHTML = `
            <div class="editor-panel">
                <div class="panel-content" id="editor-content">
                    <!-- Rich text editor will be inserted here -->
                </div>
            </div>
        `;
        
        // Get panel reference
        this.editorPanel = this.layoutContent.querySelector('.editor-panel');
        this.previewPanel = null;
        
        // Initialize editor only
        this.initializeEditor();
    }    

    /**
     * Initialize the rich text editor with enhanced integration
     * Implements requirement 3.3 - Connect RichTextLayoutManager with existing rich text editor components
     */
    initializeEditor() {
        const editorContainer = this.container.querySelector('#editor-content');
        if (!editorContainer) return;
        
        try {
            // Initialize enhanced WYSIWYG editor if available
            if (typeof EnhancedWYSIWYGEditor !== 'undefined') {
                this.richTextEditor = new EnhancedWYSIWYGEditor(editorContainer, {
                    enableToolbar: true,
                    enableRealTimePreview: this.options.enablePreviewSync,
                    enableAutoSave: true,
                    enableMarkdownParsing: true,
                    enableBusinessFormatting: true,
                    placeholder: 'ここでレポートを編集してください...',
                    onContentChange: (content, textContent) => {
                        this.handleContentChange(content, textContent);
                    },
                    onMarkdownChange: (markdown) => {
                        this.handleMarkdownChange(markdown);
                    },
                    onAutoSave: (content) => {
                        this.handleAutoSave(content);
                    }
                });
            } else if (typeof RichTextEditor !== 'undefined') {
                // Fallback to basic rich text editor
                this.richTextEditor = new RichTextEditor(editorContainer, {
                    enableToolbar: true,
                    enableRealTimePreview: this.options.enablePreviewSync,
                    enableAutoSave: true,
                    placeholder: 'ここでレポートを編集してください...',
                    onContentChange: (content, textContent) => {
                        this.handleContentChange(content, textContent);
                    },
                    onAutoSave: (content) => {
                        this.handleAutoSave(content);
                    }
                });
            } else {
                // Create simple fallback editor
                this.createFallbackEditor(editorContainer);
            }
            
            // Set up editor integration callbacks
            this.setupEditorIntegration();
            
        } catch (error) {
            console.error('Editor initialization error:', error);
            this.createFallbackEditor(editorContainer);
        }
    }
    
    /**
     * Setup editor integration with layout manager
     * Implements requirement 3.3 - Ensure backward compatibility with existing editor functionality
     */
    setupEditorIntegration() {
        if (!this.richTextEditor) return;
        
        // Connect real-time sync if enabled
        if (this.options.enablePreviewSync && this.debouncedSync) {
            // Override the editor's content change handler to use our enhanced sync
            const originalOnContentChange = this.richTextEditor.callbacks?.onContentChange;
            
            if (this.richTextEditor.callbacks) {
                this.richTextEditor.callbacks.onContentChange = (content, textContent) => {
                    // Call original handler first
                    if (originalOnContentChange) {
                        originalOnContentChange(content, textContent);
                    }
                    
                    // Then handle our layout-specific logic
                    this.handleContentChange(content, textContent);
                };
            }
        }
        
        // Add layout-specific keyboard shortcuts
        this.addEditorKeyboardShortcuts();
        
        // Set up focus management
        this.setupEditorFocusManagement();
        
        console.log('Editor integration setup complete');
    }
    
    /**
     * Add layout-specific keyboard shortcuts to editor
     */
    addEditorKeyboardShortcuts() {
        if (!this.richTextEditor || !this.richTextEditor.editor) return;
        
        this.richTextEditor.editor.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Shift + L: Toggle layout mode
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'L') {
                e.preventDefault();
                this.cycleLayoutMode();
            }
            
            // Ctrl/Cmd + Shift + F: Focus preview (if visible)
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
                e.preventDefault();
                this.focusPreview();
            }
            
            // Escape: Return focus to editor
            if (e.key === 'Escape') {
                this.richTextEditor.focus();
            }
        });
    }
    
    /**
     * Setup editor focus management
     */
    setupEditorFocusManagement() {
        if (!this.richTextEditor || !this.richTextEditor.editor) return;
        
        // Track focus state for layout management
        this.richTextEditor.editor.addEventListener('focus', () => {
            this.lastFocusedComponent = 'editor';
            this.container.classList.add('editor-focused');
            
            // Update panel state if in split layout
            if (this.currentLayout === 'split' && this.panelState) {
                this.panelState.lastFocusedPanel = 'editor';
            }
        });
        
        this.richTextEditor.editor.addEventListener('blur', () => {
            this.container.classList.remove('editor-focused');
        });
    }
    
    /**
     * Handle markdown content changes (for enhanced editor)
     */
    handleMarkdownChange(markdown) {
        this.markdownContent = markdown;
        
        // Trigger markdown-specific callbacks
        if (this.callbacks.onMarkdownChange) {
            this.callbacks.onMarkdownChange(markdown);
        }
        
        // Update preview if in markdown mode
        if (this.previewTab && this.previewTab.setMarkdownContent) {
            this.previewTab.setMarkdownContent(markdown);
        }
    }
    
    /**
     * Handle auto-save events from editor
     */
    handleAutoSave(content) {
        // Update last save time
        this.lastSaveTime = Date.now();
        
        // Update status
        this.updateContentState('editor', 'saved');
        
        // Trigger layout-specific auto-save callback
        if (this.callbacks.onAutoSave) {
            this.callbacks.onAutoSave(content, {
                layout: this.currentLayout,
                timestamp: this.lastSaveTime,
                splitRatio: this.splitRatio
            });
        }
    }
    
    /**
     * Cycle through layout modes
     */
    cycleLayoutMode() {
        const modes = ['split', 'tabbed', 'full-width'];
        const currentIndex = modes.indexOf(this.currentLayout);
        const nextIndex = (currentIndex + 1) % modes.length;
        const nextMode = modes[nextIndex];
        
        this.setLayout(nextMode);
        
        // Show brief notification
        this.showLayoutChangeNotification(nextMode);
    }
    
    /**
     * Focus preview component
     */
    focusPreview() {
        if (this.currentLayout === 'split' && this.previewPanel) {
            // Focus preview panel in split layout
            const previewContent = this.previewPanel.querySelector('#preview-content');
            if (previewContent) {
                previewContent.focus();
                this.lastFocusedComponent = 'preview';
            }
        } else if (this.currentLayout === 'tabbed') {
            // Switch to preview tab
            const previewButton = this.tabContainer.querySelector('[data-tab="preview"]');
            if (previewButton) {
                previewButton.click();
            }
        }
    }
    
    /**
     * Show layout change notification
     */
    showLayoutChangeNotification(layoutMode) {
        const notification = document.createElement('div');
        notification.className = 'layout-change-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 12l2 2 4-4"></path>
                    <circle cx="12" cy="12" r="10"></circle>
                </svg>
                レイアウト: ${this.getLayoutDisplayName(layoutMode)}
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(59, 130, 246, 0.9);
            color: white;
            padding: 0.75rem 1rem;
            border-radius: 8px;
            font-size: 0.875rem;
            font-weight: 500;
            z-index: 1000;
            animation: slideInRight 0.3s ease-out;
            backdrop-filter: blur(8px);
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 2000);
    }
    
    /**
     * Get display name for layout mode
     */
    getLayoutDisplayName(layoutMode) {
        const names = {
            'split': '分割表示',
            'tabbed': 'タブ表示',
            'full-width': '全幅表示'
        };
        return names[layoutMode] || layoutMode;
    }
    
    /**
     * Initialize the preview component with enhanced integration
     * Implements requirement 3.3 - Test integration with preview tab and markdown renderer
     */
    initializePreview() {
        const previewContainer = this.container.querySelector('#preview-content');
        if (!previewContainer) return;
        
        try {
            // Initialize preview tab if available
            if (typeof PreviewTab !== 'undefined') {
                this.previewTab = new PreviewTab(previewContainer, {
                    enableScrollSync: this.options.enablePreviewSync,
                    enableResponsiveDesign: true,
                    enableErrorHandling: true,
                    enableMarkdownRendering: true,
                    onRenderComplete: (content) => {
                        this.handlePreviewRenderComplete(content);
                    },
                    onRenderError: (error) => {
                        this.handlePreviewRenderError(error);
                    }
                });
            } else {
                // Create enhanced fallback preview with markdown support
                this.createEnhancedFallbackPreview(previewContainer);
            }
            
            // Set up preview integration
            this.setupPreviewIntegration();
            
        } catch (error) {
            console.error('Preview initialization error:', error);
            this.createEnhancedFallbackPreview(previewContainer);
        }
    }
    
    /**
     * Setup preview integration with layout manager
     */
    setupPreviewIntegration() {
        if (!this.previewTab) return;
        
        // Set up scroll synchronization if enabled
        if (this.options.enablePreviewSync) {
            this.setupScrollSync();
        }
        
        // Set up preview focus management
        this.setupPreviewFocusManagement();
        
        // Set up preview keyboard shortcuts
        this.setupPreviewKeyboardShortcuts();
        
        console.log('Preview integration setup complete');
    }
    
    /**
     * Setup scroll synchronization between editor and preview
     */
    setupScrollSync() {
        if (!this.richTextEditor || !this.previewTab) return;
        
        const editorElement = this.richTextEditor.editor;
        const previewElement = this.container.querySelector('#preview-content');
        
        if (!editorElement || !previewElement) return;
        
        let isEditorScrolling = false;
        let isPreviewScrolling = false;
        
        // Sync preview scroll when editor scrolls
        editorElement.addEventListener('scroll', () => {
            if (isPreviewScrolling) return;
            
            isEditorScrolling = true;
            const scrollRatio = editorElement.scrollTop / (editorElement.scrollHeight - editorElement.clientHeight);
            const previewScrollTop = scrollRatio * (previewElement.scrollHeight - previewElement.clientHeight);
            
            previewElement.scrollTop = previewScrollTop;
            
            setTimeout(() => {
                isEditorScrolling = false;
            }, 100);
        });
        
        // Sync editor scroll when preview scrolls
        previewElement.addEventListener('scroll', () => {
            if (isEditorScrolling) return;
            
            isPreviewScrolling = true;
            const scrollRatio = previewElement.scrollTop / (previewElement.scrollHeight - previewElement.clientHeight);
            const editorScrollTop = scrollRatio * (editorElement.scrollHeight - editorElement.clientHeight);
            
            editorElement.scrollTop = editorScrollTop;
            
            setTimeout(() => {
                isPreviewScrolling = false;
            }, 100);
        });
    }
    
    /**
     * Setup preview focus management
     */
    setupPreviewFocusManagement() {
        const previewElement = this.container.querySelector('#preview-content');
        if (!previewElement) return;
        
        // Make preview focusable
        previewElement.setAttribute('tabindex', '0');
        previewElement.setAttribute('role', 'document');
        previewElement.setAttribute('aria-label', 'プレビューコンテンツ');
        
        previewElement.addEventListener('focus', () => {
            this.lastFocusedComponent = 'preview';
            this.container.classList.add('preview-focused');
            
            // Update panel state if in split layout
            if (this.currentLayout === 'split' && this.panelState) {
                this.panelState.lastFocusedPanel = 'preview';
            }
        });
        
        previewElement.addEventListener('blur', () => {
            this.container.classList.remove('preview-focused');
        });
    }
    
    /**
     * Setup preview keyboard shortcuts
     */
    setupPreviewKeyboardShortcuts() {
        const previewElement = this.container.querySelector('#preview-content');
        if (!previewElement) return;
        
        previewElement.addEventListener('keydown', (e) => {
            // Escape: Return focus to editor
            if (e.key === 'Escape') {
                e.preventDefault();
                if (this.richTextEditor) {
                    this.richTextEditor.focus();
                }
            }
            
            // Ctrl/Cmd + E: Focus editor
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                if (this.richTextEditor) {
                    this.richTextEditor.focus();
                }
            }
        });
    }
    
    /**
     * Handle preview render completion
     */
    handlePreviewRenderComplete(content) {
        this.updateContentState('preview', 'synced');
        
        // Trigger callback
        if (this.callbacks.onPreviewRenderComplete) {
            this.callbacks.onPreviewRenderComplete(content);
        }
    }
    
    /**
     * Handle preview render errors
     */
    handlePreviewRenderError(error) {
        console.error('Preview render error:', error);
        this.updateContentState('preview', 'error');
        
        // Show error in preview
        const previewElement = this.container.querySelector('#preview-content');
        if (previewElement) {
            previewElement.innerHTML = `
                <div class="preview-error">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                    <div>
                        <h3>プレビューエラー</h3>
                        <p>コンテンツの表示中にエラーが発生しました。</p>
                    </div>
                </div>
            `;
        }
        
        // Trigger callback
        if (this.callbacks.onPreviewRenderError) {
            this.callbacks.onPreviewRenderError(error);
        }
    }
    
    /**
     * Create enhanced fallback preview with markdown support
     */
    createEnhancedFallbackPreview(container) {
        container.innerHTML = `
            <div class="enhanced-fallback-preview" style="
                padding: 1rem;
                font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif;
                font-size: 16px;
                line-height: 1.6;
                color: #374151;
                background: white;
                height: 100%;
                overflow-y: auto;
            ">
                <p style="color: #6b7280; font-style: italic;">プレビューを表示するには、コンテンツを入力してください。</p>
            </div>
        `;
        
        const preview = container.querySelector('.enhanced-fallback-preview');
        
        // Create enhanced preview interface with markdown support
        this.previewTab = {
            setContent: (content) => {
                if (content && content.trim()) {
                    // Try to render markdown if MarkdownRenderer is available
                    if (typeof MarkdownRenderer !== 'undefined') {
                        try {
                            const renderer = new MarkdownRenderer();
                            const renderedContent = renderer.render(content);
                            preview.innerHTML = renderedContent;
                        } catch (error) {
                            // Fallback to simple HTML rendering
                            preview.innerHTML = this.processContentForPreview(content);
                        }
                    } else {
                        // Simple HTML rendering
                        preview.innerHTML = this.processContentForPreview(content);
                    }
                } else {
                    preview.innerHTML = '<p style="color: #6b7280; font-style: italic;">プレビューを表示するには、コンテンツを入力してください。</p>';
                }
            },
            setMarkdownContent: (markdown) => {
                if (typeof MarkdownRenderer !== 'undefined') {
                    try {
                        const renderer = new MarkdownRenderer();
                        const renderedContent = renderer.render(markdown);
                        preview.innerHTML = renderedContent;
                    } catch (error) {
                        preview.innerHTML = `<pre style="color: #6b7280;">${markdown}</pre>`;
                    }
                } else {
                    preview.innerHTML = `<pre style="color: #6b7280;">${markdown}</pre>`;
                }
            },
            getContent: () => preview.innerHTML,
            isReady: () => true,
            clear: () => {
                preview.innerHTML = '<p style="color: #6b7280; font-style: italic;">プレビューを表示するには、コンテンツを入力してください。</p>';
            }
        };
    }
    
    /**
     * Create fallback editor if components are not available
     */
    createFallbackEditor(container) {
        container.innerHTML = `
            <div class="fallback-editor" 
                 contenteditable="true" 
                 data-placeholder="ここでレポートを編集してください..."
                 style="
                     min-height: 400px; 
                     padding: 1rem; 
                     border: none; 
                     outline: none;
                     font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif;
                     font-size: 16px;
                     line-height: 1.6;
                 ">
            </div>
        `;
        
        const editor = container.querySelector('.fallback-editor');
        
        // Add placeholder functionality
        editor.addEventListener('focus', () => {
            if (editor.textContent.trim() === '') {
                editor.style.color = '#000';
            }
        });
        
        editor.addEventListener('blur', () => {
            if (editor.textContent.trim() === '') {
                editor.style.color = '#9ca3af';
            }
        });
        
        // Add content change handling
        editor.addEventListener('input', () => {
            this.handleContentChange(editor.innerHTML, editor.textContent);
        });
        
        // Create simple editor interface
        this.richTextEditor = {
            setContent: (content) => {
                editor.innerHTML = content || '';
            },
            getContent: () => editor.innerHTML,
            getTextContent: () => editor.textContent,
            focus: () => editor.focus(),
            isReady: () => true,
            clear: () => {
                editor.innerHTML = '';
            }
        };
    }
    
    /**
     * Create fallback preview if components are not available
     */
    createFallbackPreview(container) {
        container.innerHTML = `
            <div class="fallback-preview" style="
                padding: 1rem;
                font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif;
                font-size: 16px;
                line-height: 1.6;
                color: #374151;
                background: white;
                height: 100%;
                overflow-y: auto;
            ">
                <p style="color: #6b7280; font-style: italic;">プレビューを表示するには、コンテンツを入力してください。</p>
            </div>
        `;
        
        const preview = container.querySelector('.fallback-preview');
        
        // Create simple preview interface
        this.previewTab = {
            setContent: (content) => {
                if (content && content.trim()) {
                    // Simple HTML rendering
                    preview.innerHTML = content;
                } else {
                    preview.innerHTML = '<p style="color: #6b7280; font-style: italic;">プレビューを表示するには、コンテンツを入力してください。</p>';
                }
            },
            getContent: () => preview.innerHTML,
            isReady: () => true,
            clear: () => {
                preview.innerHTML = '<p style="color: #6b7280; font-style: italic;">プレビューを表示するには、コンテンツを入力してください。</p>';
            }
        };
    }
    
    /**
     * Handle content changes from the editor
     */
    handleContentChange(htmlContent, textContent) {
        // Update content state
        this.updateContentState('editor', 'dirty');
        
        // Update preview if enabled and available
        if (this.options.enablePreviewSync && this.previewTab) {
            if (this.currentLayout === 'split' && this.debouncedSync) {
                // Use enhanced synchronization for split layout
                this.debouncedSync();
            } else {
                // Fallback to simple preview update
                clearTimeout(this.previewUpdateTimer);
                this.previewUpdateTimer = setTimeout(() => {
                    this.previewTab.setContent(htmlContent);
                    this.updateContentState('preview', 'synced');
                }, 300);
            }
        }
        
        // Trigger callback
        this.callbacks.onContentChange(htmlContent, textContent);
    }
    
    /**
     * Setup layout mode selector
     */
    setupLayoutModeSelector() {
        const layoutButtons = this.layoutContent.querySelectorAll('.layout-mode-button');
        
        layoutButtons.forEach(button => {
            button.addEventListener('click', () => {
                const layout = button.dataset.layout;
                this.setLayout(layout);
                this.updateLayoutModeButtons(layout);
            });
        });
    }
    
    /**
     * Update layout mode button states
     */
    updateLayoutModeButtons(activeLayout) {
        const layoutButtons = this.layoutContent.querySelectorAll('.layout-mode-button');
        
        layoutButtons.forEach(button => {
            const isActive = button.dataset.layout === activeLayout;
            button.classList.toggle('active', isActive);
        });
    }
    
    /**
     * Setup content state tracking
     */
    setupContentStateTracking() {
        // Initialize state
        this.contentState = {
            editor: 'synced',
            preview: 'synced'
        };
        
        // Update state indicator
        this.updateContentStateIndicator();
    }
    
    /**
     * Update content state
     */
    updateContentState(component, state) {
        if (!this.contentState) return;
        
        this.contentState[component] = state;
        this.updateContentStateIndicator();
    }
    
    /**
     * Update content state indicator UI
     */
    updateContentStateIndicator() {
        if (!this.contentStateIndicator) return;
        
        const stateDot = this.contentStateIndicator.querySelector('.state-dot');
        const stateText = this.contentStateIndicator.querySelector('.state-text');
        
        if (!stateDot || !stateText) return;
        
        // Determine overall state
        let overallState = 'synced';
        if (Object.values(this.contentState).includes('error')) {
            overallState = 'error';
        } else if (Object.values(this.contentState).includes('dirty') || 
                   Object.values(this.contentState).includes('loading')) {
            overallState = 'dirty';
        }
        
        // Update UI
        stateDot.className = `state-dot ${overallState}`;
        
        const stateMessages = {
            'synced': '同期済み',
            'dirty': '更新中',
            'loading': '読み込み中',
            'error': 'エラー'
        };
        
        stateText.textContent = stateMessages[overallState] || '不明';
    }
    
    /**
     * Load user preferences
     */
    loadUserPreferences() {
        try {
            const preferences = localStorage.getItem('richTextLayoutPreferences');
            if (preferences) {
                this.userPreferences = JSON.parse(preferences);
                
                // Apply saved active tab
                if (this.userPreferences.activeTab && this.currentLayout === 'tabbed') {
                    setTimeout(() => {
                        const tabButtons = this.tabContainer.querySelectorAll('.enhanced-tab-button');
                        tabButtons.forEach((button, index) => {
                            if (button.dataset.tab === this.userPreferences.activeTab) {
                                this.switchEnhancedTab(this.userPreferences.activeTab, index);
                            }
                        });
                    }, 100);
                }
            } else {
                this.userPreferences = {
                    activeTab: 'editor',
                    layoutMode: 'tabbed'
                };
            }
        } catch (error) {
            console.error('Error loading user preferences:', error);
            this.userPreferences = {
                activeTab: 'editor',
                layoutMode: 'tabbed'
            };
        }
    }
    
    /**
     * Save user preference
     */
    saveUserPreference(key, value) {
        try {
            if (!this.userPreferences) {
                this.userPreferences = {};
            }
            
            this.userPreferences[key] = value;
            localStorage.setItem('richTextLayoutPreferences', JSON.stringify(this.userPreferences));
        } catch (error) {
            console.error('Error saving user preference:', error);
        }
    }
    
    /**
     * Setup resize handle functionality
     */
    setupResizeHandle() {
        if (!this.resizeHandle) return;
        
        let startX = 0;
        let startY = 0;
        let startRatio = this.splitRatio;
        
        const handleMouseDown = (e) => {
            e.preventDefault();
            this.isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startRatio = this.splitRatio;
            
            this.resizeHandle.classList.add('resizing');
            document.body.style.cursor = window.innerWidth <= 768 ? 'row-resize' : 'col-resize';
            document.body.style.userSelect = 'none';
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        };
        
        const handleMouseMove = (e) => {
            if (!this.isResizing) return;
            
            const containerRect = this.layoutContent.getBoundingClientRect();
            let newRatio;
            
            if (window.innerWidth <= 768) {
                // Vertical resize on mobile
                const deltaY = e.clientY - startY;
                const containerHeight = containerRect.height;
                const ratioChange = deltaY / containerHeight;
                newRatio = Math.max(0.2, Math.min(0.8, startRatio + ratioChange));
            } else {
                // Horizontal resize on desktop
                const deltaX = e.clientX - startX;
                const containerWidth = containerRect.width;
                const ratioChange = deltaX / containerWidth;
                newRatio = Math.max(0.2, Math.min(0.8, startRatio + ratioChange));
            }
            
            this.setSplitRatio(newRatio);
        };
        
        const handleMouseUp = () => {
            this.isResizing = false;
            this.resizeHandle.classList.remove('resizing');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            
            // Trigger resize callback
            this.callbacks.onResize(this.splitRatio);
        };
        
        // Mouse events
        this.resizeHandle.addEventListener('mousedown', handleMouseDown);
        
        // Touch events for mobile devices
        this.resizeHandle.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            handleMouseDown(mouseEvent);
        }, { passive: false });
        
        // Enhanced touch move handling
        document.addEventListener('touchmove', (e) => {
            if (!this.isResizing) return;
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            handleMouseMove(mouseEvent);
        }, { passive: false });
        
        // Enhanced touch end handling
        document.addEventListener('touchend', (e) => {
            if (!this.isResizing) return;
            handleMouseUp();
        }, { passive: true });
        
        // Keyboard events for accessibility
        this.resizeHandle.addEventListener('keydown', (e) => {
            const step = 0.05;
            let newRatio = this.splitRatio;
            
            switch (e.key) {
                case 'ArrowLeft':
                case 'ArrowUp':
                    e.preventDefault();
                    newRatio = Math.max(0.2, this.splitRatio - step);
                    break;
                case 'ArrowRight':
                case 'ArrowDown':
                    e.preventDefault();
                    newRatio = Math.min(0.8, this.splitRatio + step);
                    break;
                case 'Home':
                    e.preventDefault();
                    newRatio = 0.2;
                    break;
                case 'End':
                    e.preventDefault();
                    newRatio = 0.8;
                    break;
                default:
                    return;
            }
            
            this.setSplitRatio(newRatio);
            this.callbacks.onResize(this.splitRatio);
        });
    }
    
    /**
     * Set split ratio for panels
     */
    setSplitRatio(ratio) {
        this.splitRatio = Math.max(0.2, Math.min(0.8, ratio));
        
        if (this.editorPanel && this.previewPanel) {
            this.editorPanel.style.flex = this.splitRatio;
            this.previewPanel.style.flex = 1 - this.splitRatio;
        }
    }
    
    /**
     * Setup enhanced tab navigation functionality
     */
    setupEnhancedTabNavigation() {
        if (!this.tabContainer) return;
        
        const tabButtons = this.tabContainer.querySelectorAll('.enhanced-tab-button');
        const tabPanels = this.layoutContent.querySelectorAll('.enhanced-tab-panel');
        
        // Current active tab tracking
        this.activeTabIndex = 0;
        this.previousTabIndex = 0;
        
        tabButtons.forEach((button, index) => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchEnhancedTab(button.dataset.tab, index);
            });
            
            // Enhanced keyboard navigation
            button.addEventListener('keydown', (e) => {
                let targetIndex = index;
                
                switch (e.key) {
                    case 'ArrowLeft':
                        e.preventDefault();
                        targetIndex = index > 0 ? index - 1 : tabButtons.length - 1;
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        targetIndex = index < tabButtons.length - 1 ? index + 1 : 0;
                        break;
                    case 'Home':
                        e.preventDefault();
                        targetIndex = 0;
                        break;
                    case 'End':
                        e.preventDefault();
                        targetIndex = tabButtons.length - 1;
                        break;
                    case 'Enter':
                    case ' ':
                        e.preventDefault();
                        this.switchEnhancedTab(button.dataset.tab, index);
                        return;
                    default:
                        return;
                }
                
                tabButtons[targetIndex].focus();
                this.switchEnhancedTab(tabButtons[targetIndex].dataset.tab, targetIndex);
            });
            
            // Touch support for mobile
            button.addEventListener('touchstart', (e) => {
                button.style.transform = 'scale(0.95)';
            });
            
            button.addEventListener('touchend', (e) => {
                button.style.transform = '';
                this.switchEnhancedTab(button.dataset.tab, index);
            });
        });
        
        // Swipe gesture support for mobile
        this.setupSwipeGestures();
    }
    
    /**
     * Setup enhanced swipe gestures for mobile tab navigation
     */
    setupSwipeGestures() {
        let startX = 0;
        let startY = 0;
        let currentX = 0;
        let currentY = 0;
        let isSwipe = false;
        let swipeDirection = null;
        let swipeStartTime = 0;
        
        const tabContent = this.layoutContent.querySelector('.enhanced-tab-content');
        if (!tabContent) return;
        
        // Enhanced touch start handler
        tabContent.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            currentX = startX;
            currentY = startY;
            isSwipe = false;
            swipeDirection = null;
            swipeStartTime = Date.now();
            
            // Add visual feedback
            tabContent.style.transition = 'none';
        }, { passive: true });
        
        // Enhanced touch move handler with visual feedback
        tabContent.addEventListener('touchmove', (e) => {
            if (!startX || !startY) return;
            
            currentX = e.touches[0].clientX;
            currentY = e.touches[0].clientY;
            
            const deltaX = currentX - startX;
            const deltaY = currentY - startY;
            const absDeltaX = Math.abs(deltaX);
            const absDeltaY = Math.abs(deltaY);
            
            // Determine if this is a horizontal swipe
            if (absDeltaX > absDeltaY && absDeltaX > 20) {
                isSwipe = true;
                swipeDirection = deltaX > 0 ? 'right' : 'left';
                
                // Prevent default scrolling for horizontal swipes
                e.preventDefault();
                
                // Add visual feedback - slight transform
                const transformAmount = Math.min(Math.abs(deltaX) * 0.1, 20);
                const direction = deltaX > 0 ? 1 : -1;
                tabContent.style.transform = `translateX(${direction * transformAmount}px)`;
                tabContent.style.opacity = Math.max(0.8, 1 - Math.abs(deltaX) * 0.001);
            }
        }, { passive: false });
        
        // Enhanced touch end handler
        tabContent.addEventListener('touchend', (e) => {
            if (!isSwipe || !startX) {
                this.resetSwipeVisuals(tabContent);
                return;
            }
            
            const deltaX = e.changedTouches[0].clientX - startX;
            const swipeTime = Date.now() - swipeStartTime;
            const swipeVelocity = Math.abs(deltaX) / swipeTime;
            const tabButtons = this.tabContainer.querySelectorAll('.enhanced-tab-button');
            
            // Determine if swipe is significant enough
            const isSignificantSwipe = Math.abs(deltaX) > 80 || 
                                     (Math.abs(deltaX) > 40 && swipeVelocity > 0.3);
            
            if (isSignificantSwipe) {
                if (deltaX > 0 && this.activeTabIndex > 0) {
                    // Swipe right - previous tab
                    const targetIndex = this.activeTabIndex - 1;
                    this.switchEnhancedTab(tabButtons[targetIndex].dataset.tab, targetIndex);
                    this.showSwipeFeedback('previous');
                } else if (deltaX < 0 && this.activeTabIndex < tabButtons.length - 1) {
                    // Swipe left - next tab
                    const targetIndex = this.activeTabIndex + 1;
                    this.switchEnhancedTab(tabButtons[targetIndex].dataset.tab, targetIndex);
                    this.showSwipeFeedback('next');
                } else {
                    // Swipe at boundary - show bounce feedback
                    this.showBoundaryFeedback(deltaX > 0 ? 'start' : 'end');
                }
            }
            
            // Reset state and visuals
            this.resetSwipeVisuals(tabContent);
            startX = 0;
            startY = 0;
            currentX = 0;
            currentY = 0;
            isSwipe = false;
            swipeDirection = null;
        }, { passive: true });
        
        // Handle touch cancel
        tabContent.addEventListener('touchcancel', (e) => {
            this.resetSwipeVisuals(tabContent);
            startX = 0;
            startY = 0;
            isSwipe = false;
        }, { passive: true });
    }
    
    /**
     * Reset swipe visual effects
     */
    resetSwipeVisuals(element) {
        element.style.transition = 'all 0.3s ease';
        element.style.transform = '';
        element.style.opacity = '';
        
        // Remove transition after animation
        setTimeout(() => {
            element.style.transition = '';
        }, 300);
    }
    
    /**
     * Show swipe feedback animation
     */
    showSwipeFeedback(direction) {
        const indicator = document.createElement('div');
        indicator.className = `swipe-indicator swipe-${direction}`;
        indicator.innerHTML = direction === 'next' ? '→' : '←';
        indicator.style.cssText = `
            position: fixed;
            top: 50%;
            ${direction === 'next' ? 'right: 20px' : 'left: 20px'};
            transform: translateY(-50%);
            background: rgba(59, 130, 246, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 18px;
            font-weight: bold;
            z-index: 1000;
            pointer-events: none;
            animation: swipeFeedback 0.6s ease-out forwards;
        `;
        
        document.body.appendChild(indicator);
        
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 600);
    }
    
    /**
     * Show boundary feedback when swiping at limits
     */
    showBoundaryFeedback(boundary) {
        const tabContent = this.layoutContent.querySelector('.enhanced-tab-content');
        if (!tabContent) return;
        
        tabContent.style.transition = 'transform 0.2s ease-out';
        tabContent.style.transform = boundary === 'start' ? 'translateX(10px)' : 'translateX(-10px)';
        
        setTimeout(() => {
            tabContent.style.transform = '';
            setTimeout(() => {
                tabContent.style.transition = '';
            }, 200);
        }, 100);
    }
    
    /**
     * Switch to specified tab with enhanced transitions
     * Implements requirement 3.2 - Implement smooth transitions between Edit and Preview tabs
     */
    switchEnhancedTab(tabName, tabIndex = null) {
        const tabButtons = this.tabContainer.querySelectorAll('.enhanced-tab-button');
        const tabPanels = this.layoutContent.querySelectorAll('.enhanced-tab-panel');
        
        // Find tab index if not provided
        if (tabIndex === null) {
            tabButtons.forEach((button, index) => {
                if (button.dataset.tab === tabName) {
                    tabIndex = index;
                }
            });
        }
        
        // Don't switch if already active
        if (tabIndex === this.activeTabIndex) return;
        
        // Store previous tab for transition direction
        this.previousTabIndex = this.activeTabIndex;
        this.activeTabIndex = tabIndex;
        
        // Determine transition direction
        const isForward = tabIndex > this.previousTabIndex;
        
        // Start transition with loading state
        this.setTabTransitionState('loading');
        
        // Update button states with enhanced animation
        this.updateTabButtonStates(tabButtons, tabIndex, isForward);
        
        // Update panel states with smooth transitions
        this.updateTabPanelStates(tabPanels, tabIndex, isForward);
        
        // Handle content state persistence and synchronization
        this.handleTabContentPersistence(tabName);
        
        // Save user preference for active tab
        this.saveUserPreference('activeTab', tabName);
        this.saveUserPreference('lastTabSwitchTime', Date.now());
        
        // Update content state and sync
        this.updateContentState(tabName);
        
        // Handle content synchronization
        if (tabName === 'preview' && this.richTextEditor && this.previewTab) {
            this.syncContentToPreview();
        } else if (tabName === 'editor' && this.richTextEditor) {
            // Focus editor when switching to edit tab
            setTimeout(() => {
                this.richTextEditor.focus();
            }, 300);
        }
        
        // Complete transition
        setTimeout(() => {
            this.setTabTransitionState('complete');
        }, 400);
        
        // Trigger callback
        this.callbacks.onLayoutChange(`tabbed-${tabName}`, `tabbed-${this.getTabNameByIndex(this.previousTabIndex)}`);
        
        console.log(`Enhanced tab switch: ${tabName} (index: ${tabIndex})`);
    }
    
    /**
     * Update tab button states with enhanced animations
     */
    updateTabButtonStates(tabButtons, activeIndex, isForward) {
        tabButtons.forEach((button, index) => {
            const isActive = index === activeIndex;
            const wasPrevious = index === this.previousTabIndex;
            
            // Update ARIA attributes
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-selected', isActive);
            
            // Add enhanced transition classes
            if (isActive) {
                button.classList.add('tab-entering');
                button.style.transform = 'translateY(-2px) scale(1.02)';
                
                // Add ripple effect
                this.addRippleEffect(button);
                
                setTimeout(() => {
                    button.classList.remove('tab-entering');
                    button.style.transform = 'translateY(-2px)';
                }, 200);
            } else if (wasPrevious) {
                button.classList.add('tab-exiting');
                button.style.transform = '';
                
                setTimeout(() => {
                    button.classList.remove('tab-exiting');
                }, 200);
            } else {
                button.style.transform = '';
            }
        });
    }
    
    /**
     * Update tab panel states with smooth transitions
     */
    updateTabPanelStates(tabPanels, activeIndex, isForward) {
        tabPanels.forEach((panel, index) => {
            const isActive = index === activeIndex;
            const wasPrevious = index === this.previousTabIndex;
            
            if (wasPrevious) {
                // Animate out the previous panel with direction-aware transition
                panel.classList.add('tab-transition-exit');
                panel.classList.add(isForward ? 'slide-out-left' : 'slide-out-right');
                
                setTimeout(() => {
                    panel.classList.remove('active', 'tab-transition-exit', 'slide-out-left', 'slide-out-right');
                }, 300);
            }
            
            if (isActive) {
                // Animate in the new panel with direction-aware transition
                panel.classList.add('tab-transition-enter');
                panel.classList.add(isForward ? 'slide-in-right' : 'slide-in-left');
                
                setTimeout(() => {
                    panel.classList.add('active');
                    panel.style.transform = 'translateX(0)';
                }, 50);
                
                setTimeout(() => {
                    panel.classList.remove('tab-transition-enter', 'slide-in-left', 'slide-in-right');
                }, 350);
            }
        });
    }
    
    /**
     * Handle content state persistence when switching tabs
     * Implements requirement 3.2 - Ensure content state persistence when switching tabs
     */
    handleTabContentPersistence(tabName) {
        // Store current content state
        if (this.richTextEditor) {
            const currentContent = this.richTextEditor.getContent();
            this.persistedContent = {
                html: currentContent,
                text: this.richTextEditor.getTextContent ? this.richTextEditor.getTextContent() : currentContent,
                timestamp: Date.now(),
                activeTab: tabName
            };
            
            // Store in session storage for persistence across page reloads
            try {
                sessionStorage.setItem('richTextLayoutContent', JSON.stringify(this.persistedContent));
            } catch (error) {
                console.warn('Could not persist content to session storage:', error);
            }
        }
        
        // Update content state indicator
        this.updateContentStateForTab(tabName);
    }
    
    /**
     * Update content state for specific tab
     */
    updateContentStateForTab(tabName) {
        if (tabName === 'preview') {
            this.updateContentState('preview', 'loading');
        } else if (tabName === 'editor') {
            this.updateContentState('editor', 'synced');
        }
    }
    
    /**
     * Set tab transition state
     */
    setTabTransitionState(state) {
        const tabContainer = this.layoutContent.querySelector('.enhanced-tab-container');
        if (!tabContainer) return;
        
        tabContainer.classList.remove('transition-loading', 'transition-complete');
        
        if (state === 'loading') {
            tabContainer.classList.add('transition-loading');
        } else if (state === 'complete') {
            tabContainer.classList.add('transition-complete');
        }
    }
    
    /**
     * Add ripple effect to button
     */
    addRippleEffect(button) {
        const ripple = document.createElement('span');
        ripple.className = 'button-ripple';
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(59, 130, 246, 0.3);
            transform: scale(0);
            animation: ripple 0.6s linear;
            pointer-events: none;
            left: 50%;
            top: 50%;
            width: 20px;
            height: 20px;
            margin-left: -10px;
            margin-top: -10px;
        `;
        
        button.style.position = 'relative';
        button.style.overflow = 'hidden';
        button.appendChild(ripple);
        
        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 600);
    }
    
    /**
     * Restore persisted content and tab state
     * Implements requirement 3.2 - Content state persistence
     */
    restorePersistedState() {
        try {
            const persistedData = sessionStorage.getItem('richTextLayoutContent');
            if (persistedData) {
                this.persistedContent = JSON.parse(persistedData);
                
                // Restore content if editor is available
                if (this.richTextEditor && this.persistedContent.html) {
                    this.richTextEditor.setContent(this.persistedContent.html);
                }
                
                // Restore active tab if in tabbed mode
                if (this.currentLayout === 'tabbed' && this.persistedContent.activeTab) {
                    setTimeout(() => {
                        const tabButtons = this.tabContainer.querySelectorAll('.enhanced-tab-button');
                        tabButtons.forEach((button, index) => {
                            if (button.dataset.tab === this.persistedContent.activeTab) {
                                this.switchEnhancedTab(this.persistedContent.activeTab, index);
                            }
                        });
                    }, 100);
                }
                
                console.log('Restored persisted content and tab state');
            }
        } catch (error) {
            console.warn('Could not restore persisted state:', error);
        }
    }
    
    /**
     * Enhanced user preference management
     * Implements requirement 3.2 - Add user preference storage for layout mode
     */
    saveUserPreference(key, value) {
        try {
            if (!this.userPreferences) {
                this.userPreferences = {};
            }
            
            this.userPreferences[key] = value;
            
            // Add timestamp for preference tracking
            this.userPreferences.lastUpdated = Date.now();
            
            // Store both in localStorage and sessionStorage for different persistence levels
            localStorage.setItem('richTextLayoutPreferences', JSON.stringify(this.userPreferences));
            sessionStorage.setItem('richTextLayoutPreferencesSession', JSON.stringify(this.userPreferences));
            
            // Trigger preference change callback if available
            if (this.callbacks.onPreferenceChange) {
                this.callbacks.onPreferenceChange(key, value, this.userPreferences);
            }
            
            console.log(`User preference saved: ${key} = ${value}`);
        } catch (error) {
            console.error('Error saving user preference:', error);
        }
    }
    
    /**
     * Load and apply user preferences with enhanced fallback
     */
    loadUserPreferences() {
        try {
            // Try session storage first (current session preferences)
            let preferences = sessionStorage.getItem('richTextLayoutPreferencesSession');
            
            // Fallback to localStorage (persistent preferences)
            if (!preferences) {
                preferences = localStorage.getItem('richTextLayoutPreferences');
            }
            
            if (preferences) {
                this.userPreferences = JSON.parse(preferences);
                
                // Apply layout mode preference
                if (this.userPreferences.layoutMode && this.userPreferences.layoutMode !== this.currentLayout) {
                    this.setLayout(this.userPreferences.layoutMode);
                }
                
                // Apply active tab preference for tabbed mode
                if (this.userPreferences.activeTab && this.currentLayout === 'tabbed') {
                    setTimeout(() => {
                        const tabButtons = this.tabContainer.querySelectorAll('.enhanced-tab-button');
                        tabButtons.forEach((button, index) => {
                            if (button.dataset.tab === this.userPreferences.activeTab) {
                                this.switchEnhancedTab(this.userPreferences.activeTab, index);
                            }
                        });
                    }, 100);
                }
                
                // Apply split ratio preference
                if (this.userPreferences.splitRatio && this.currentLayout === 'split') {
                    this.setSplitRatio(this.userPreferences.splitRatio);
                }
                
                console.log('User preferences loaded and applied:', this.userPreferences);
            } else {
                // Initialize default preferences
                this.userPreferences = {
                    activeTab: 'editor',
                    layoutMode: 'tabbed',
                    splitRatio: 0.5,
                    enableAnimations: true,
                    autoSync: true
                };
                this.saveUserPreference('initialized', true);
            }
        } catch (error) {
            console.error('Error loading user preferences:', error);
            this.userPreferences = {
                activeTab: 'editor',
                layoutMode: 'tabbed',
                splitRatio: 0.5,
                enableAnimations: true,
                autoSync: true
            };
        }
    }
    
    /**
     * Get user preference with fallback
     */
    getUserPreference(key, defaultValue = null) {
        return this.userPreferences && this.userPreferences[key] !== undefined ? 
               this.userPreferences[key] : defaultValue;
    }
    
    /**
     * Clear user preferences
     */
    clearUserPreferences() {
        try {
            localStorage.removeItem('richTextLayoutPreferences');
            sessionStorage.removeItem('richTextLayoutPreferencesSession');
            sessionStorage.removeItem('richTextLayoutContent');
            
            this.userPreferences = {
                activeTab: 'editor',
                layoutMode: 'tabbed',
                splitRatio: 0.5,
                enableAnimations: true,
                autoSync: true
            };
            
            console.log('User preferences cleared');
        } catch (error) {
            console.error('Error clearing user preferences:', error);
        }
    }
    
    /**
     * Get tab name by index
     */
    getTabNameByIndex(index) {
        const tabButtons = this.tabContainer.querySelectorAll('.enhanced-tab-button');
        return tabButtons[index] ? tabButtons[index].dataset.tab : 'editor';
    }
    
    /**
     * Sync content to preview with loading state
     */
    syncContentToPreview() {
        if (!this.richTextEditor || !this.previewTab) return;
        
        // Show loading state
        this.updateContentState('preview', 'loading');
        
        try {
            const content = this.richTextEditor.getContent();
            
            // Simulate processing time for smooth UX
            setTimeout(() => {
                this.previewTab.setContent(content);
                this.updateContentState('preview', 'synced');
            }, 150);
            
        } catch (error) {
            console.error('Preview sync error:', error);
            this.updateContentState('preview', 'error');
        }
    }
    
    /**
     * Bidirectional sync - sync content from preview back to editor if supported
     */
    syncContentFromPreview() {
        if (!this.richTextEditor || !this.previewTab) return;
        
        try {
            // Check if preview has editable content or changes to sync back
            if (this.previewTab.getContent && this.previewTab.hasChanges) {
                const previewContent = this.previewTab.getContent();
                
                // Update editor with preview content
                this.richTextEditor.setContent(previewContent);
                this.updateContentState('editor', 'synced');
                
                console.log('Bidirectional sync: Preview → Editor');
            }
        } catch (error) {
            console.error('Bidirectional sync error:', error);
            this.updateContentState('editor', 'error');
        }
    }
    
    /**
     * Setup bidirectional sync if supported by preview component
     */
    setupBidirectionalSync() {
        if (!this.previewTab) return;
        
        // Check if preview supports bidirectional sync
        if (this.previewTab.onContentChange) {
            this.previewTab.onContentChange = (content) => {
                // Sync changes back to editor
                if (this.richTextEditor && content !== this.richTextEditor.getContent()) {
                    this.richTextEditor.setContent(content);
                    this.updateContentState('editor', 'synced');
                }
            };
            
            console.log('Bidirectional sync enabled');
        }
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Layout toggle buttons
        const layoutButtons = this.layoutControls.querySelectorAll('.layout-toggle-btn');
        layoutButtons.forEach(button => {
            button.addEventListener('click', () => {
                const layout = button.dataset.layout;
                this.setLayout(layout);
            });
        });
        
        // Window resize handling
        window.addEventListener('resize', () => {
            this.handleWindowResize();
        });
    }
    
    /**
     * Setup responsive design with device detection
     */
    setupResponsiveDesign() {
        if (!this.options.enableResponsiveDesign) return;
        
        // Detect device capabilities
        this.detectDeviceCapabilities();
        
        // Initial responsive check
        this.handleWindowResize();
        
        // Create resize observer for container
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => {
                this.handleContainerResize();
            });
            
            this.resizeObserver.observe(this.container);
        }
        
        // Listen for orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleWindowResize();
            }, 100);
        });
        
        // Listen for device pixel ratio changes (zoom)
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(resolution: 1dppx)');
            mediaQuery.addListener(() => {
                this.handleWindowResize();
            });
        }
    }
    
    /**
     * Detect device capabilities and preferences
     */
    detectDeviceCapabilities() {
        this.deviceCapabilities = {
            hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
            hasHover: window.matchMedia('(hover: hover)').matches,
            prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            supportsPassiveEvents: this.checkPassiveEventSupport(),
            devicePixelRatio: window.devicePixelRatio || 1,
            isHighDPI: (window.devicePixelRatio || 1) > 1.5
        };
        
        // Apply device-specific classes
        if (this.deviceCapabilities.hasTouch) {
            this.container.classList.add('has-touch');
        }
        
        if (!this.deviceCapabilities.hasHover) {
            this.container.classList.add('no-hover');
        }
        
        if (this.deviceCapabilities.prefersReducedMotion) {
            this.container.classList.add('reduced-motion');
        }
        
        console.log('Device capabilities detected:', this.deviceCapabilities);
    }
    
    /**
     * Check if passive event listeners are supported
     */
    checkPassiveEventSupport() {
        let passiveSupported = false;
        try {
            const options = {
                get passive() {
                    passiveSupported = true;
                    return false;
                }
            };
            window.addEventListener('test', null, options);
            window.removeEventListener('test', null, options);
        } catch (err) {
            passiveSupported = false;
        }
        return passiveSupported;
    }
    
    /**
     * Handle window resize with enhanced responsive behavior
     */
    handleWindowResize() {
        const width = window.innerWidth;
        const isMobile = width <= 768;
        const isTablet = width > 768 && width <= 1024;
        const isSmallMobile = width <= 480;
        const isExtraSmall = width <= 360;
        
        // Store current device type for other methods
        this.deviceType = isExtraSmall ? 'extra-small' : 
                         isSmallMobile ? 'small-mobile' : 
                         isMobile ? 'mobile' : 
                         isTablet ? 'tablet' : 'desktop';
        
        // Force appropriate layout based on screen size
        if (isSmallMobile && this.currentLayout === 'split') {
            console.log('Switching to tabbed layout for small mobile screen');
            this.setLayout('tabbed');
            return;
        }
        
        // Update container classes for responsive styling
        this.updateResponsiveClasses();
        
        // Update resize handle orientation and accessibility
        if (this.resizeHandle) {
            if (isMobile) {
                this.resizeHandle.setAttribute('aria-orientation', 'horizontal');
                this.resizeHandle.setAttribute('aria-label', 'パネル高さ調整');
                this.resizeHandle.style.cursor = 'row-resize';
            } else {
                this.resizeHandle.setAttribute('aria-orientation', 'vertical');
                this.resizeHandle.setAttribute('aria-label', 'パネル幅調整');
                this.resizeHandle.style.cursor = 'col-resize';
            }
        }
        
        // Adjust split ratio for mobile if needed
        if (isMobile && this.currentLayout === 'split') {
            // Ensure reasonable panel sizes on mobile
            if (this.splitRatio < 0.3 || this.splitRatio > 0.7) {
                this.setSplitRatio(0.5); // Reset to balanced split on mobile
            }
        }
        
        // Update touch-friendly elements
        this.updateTouchFriendlyElements();
        
        // Trigger layout-specific responsive updates
        this.handleLayoutSpecificResize();
        
        console.log(`Responsive layout updated for ${this.deviceType} (${width}px)`);
    }
    
    /**
     * Update responsive classes on container
     */
    updateResponsiveClasses() {
        const classes = ['mobile', 'tablet', 'desktop', 'small-mobile', 'extra-small'];
        classes.forEach(cls => this.container.classList.remove(cls));
        
        this.container.classList.add(this.deviceType);
        
        // Add additional utility classes
        if (this.deviceType === 'mobile' || this.deviceType === 'small-mobile' || this.deviceType === 'extra-small') {
            this.container.classList.add('touch-device');
        } else {
            this.container.classList.remove('touch-device');
        }
    }
    
    /**
     * Update touch-friendly elements
     */
    updateTouchFriendlyElements() {
        const isTouchDevice = this.deviceType.includes('mobile') || this.deviceType === 'tablet';
        
        // Update button sizes and spacing
        const buttons = this.container.querySelectorAll('.layout-toggle-btn, .enhanced-tab-button, .tab-button');
        buttons.forEach(button => {
            if (isTouchDevice) {
                button.style.minHeight = '44px';
                button.style.minWidth = '44px';
                button.classList.add('touch-friendly');
            } else {
                button.style.minHeight = '';
                button.style.minWidth = '';
                button.classList.remove('touch-friendly');
            }
        });
        
        // Update resize handle for touch
        if (this.resizeHandle && isTouchDevice) {
            this.resizeHandle.style.minHeight = '44px';
            this.resizeHandle.classList.add('touch-friendly');
        } else if (this.resizeHandle) {
            this.resizeHandle.style.minHeight = '';
            this.resizeHandle.classList.remove('touch-friendly');
        }
    }
    
    /**
     * Handle layout-specific responsive updates
     */
    handleLayoutSpecificResize() {
        switch (this.currentLayout) {
            case 'split':
                this.handleSplitLayoutResize();
                break;
            case 'tabbed':
                this.handleTabbedLayoutResize();
                break;
            case 'full-width':
                this.handleFullWidthLayoutResize();
                break;
        }
    }
    
    /**
     * Handle split layout responsive updates
     */
    handleSplitLayoutResize() {
        const isMobile = this.deviceType.includes('mobile');
        
        if (isMobile && this.editorPanel && this.previewPanel) {
            // Ensure vertical stacking on mobile
            this.layoutContent.style.flexDirection = 'column';
            
            // Update panel flex properties for mobile
            this.editorPanel.style.flex = `${this.splitRatio} 1 0`;
            this.previewPanel.style.flex = `${1 - this.splitRatio} 1 0`;
            
            // Ensure minimum heights
            this.editorPanel.style.minHeight = '200px';
            this.previewPanel.style.minHeight = '200px';
        } else if (this.editorPanel && this.previewPanel) {
            // Desktop horizontal layout
            this.layoutContent.style.flexDirection = 'row';
            this.editorPanel.style.flex = this.splitRatio;
            this.previewPanel.style.flex = 1 - this.splitRatio;
            this.editorPanel.style.minHeight = '';
            this.previewPanel.style.minHeight = '';
        }
    }
    
    /**
     * Handle tabbed layout responsive updates
     */
    handleTabbedLayoutResize() {
        const isSmallMobile = this.deviceType === 'small-mobile' || this.deviceType === 'extra-small';
        
        // Update tab button layout for small screens
        const tabButtons = this.container.querySelectorAll('.enhanced-tab-button');
        tabButtons.forEach(button => {
            if (isSmallMobile) {
                button.style.flexDirection = 'column';
                button.style.padding = '0.5rem';
            } else {
                button.style.flexDirection = 'row';
                button.style.padding = '';
            }
        });
        
        // Update tab content padding
        const tabPanels = this.container.querySelectorAll('.enhanced-tab-panel-content');
        tabPanels.forEach(panel => {
            if (isSmallMobile) {
                panel.style.padding = '0.5rem';
            } else {
                panel.style.padding = '';
            }
        });
    }
    
    /**
     * Handle full-width layout responsive updates
     */
    handleFullWidthLayoutResize() {
        // Update editor padding based on screen size
        const editorContent = this.container.querySelector('#editor-content');
        if (editorContent) {
            const isSmallMobile = this.deviceType === 'small-mobile' || this.deviceType === 'extra-small';
            if (isSmallMobile) {
                editorContent.style.padding = '0.5rem';
            } else {
                editorContent.style.padding = '';
            }
        }
    }
    
    /**
     * Handle container resize
     */
    handleContainerResize() {
        // Ensure minimum panel widths are maintained
        if (this.currentLayout === 'split' && this.editorPanel && this.previewPanel) {
            const containerWidth = this.container.offsetWidth;
            const minRatio = this.options.minPanelWidth / containerWidth;
            
            if (this.splitRatio < minRatio) {
                this.setSplitRatio(minRatio);
            } else if (this.splitRatio > 1 - minRatio) {
                this.setSplitRatio(1 - minRatio);
            }
        }
    }
    
    /**
     * Set layout mode
     */
    setLayout(layoutMode) {
        if (layoutMode === this.currentLayout) return;
        
        const previousLayout = this.currentLayout;
        this.currentLayout = layoutMode;
        
        // Preserve content before layout change
        const editorContent = this.richTextEditor ? this.richTextEditor.getContent() : '';
        
        // Create new layout
        this.createLayout(layoutMode);
        
        // Restore content
        if (editorContent && this.richTextEditor) {
            this.richTextEditor.setContent(editorContent);
        }
        
        // Update button states
        this.updateLayoutButtons();
        
        // Trigger callback
        this.callbacks.onLayoutChange(layoutMode, previousLayout);
        
        console.log(`Layout changed from ${previousLayout} to ${layoutMode}`);
    }
    
    /**
     * Update layout button states
     */
    updateLayoutButtons() {
        const layoutButtons = this.layoutControls.querySelectorAll('.layout-toggle-btn');
        layoutButtons.forEach(button => {
            const isActive = button.dataset.layout === this.currentLayout;
            button.classList.toggle('active', isActive);
        });
    }
    
    /**
     * Toggle between split and full-width modes
     */
    toggleSplitMode() {
        const newLayout = this.currentLayout === 'split' ? 'full-width' : 'split';
        this.setLayout(newLayout);
    }
    
    /**
     * Get current layout mode
     */
    getCurrentLayout() {
        return this.currentLayout;
    }
    
    /**
     * Get current split ratio
     */
    getSplitRatio() {
        return this.splitRatio;
    }
    
    /**
     * Set content in the editor
     */
    setContent(content, format = 'html') {
        if (this.richTextEditor) {
            this.richTextEditor.setContent(content);
        }
    }
    
    /**
     * Get content from the editor
     */
    getContent(format = 'html') {
        return this.richTextEditor ? this.richTextEditor.getContent() : '';
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
     * Check if layout manager is ready
     */
    isReady() {
        return this.isInitialized && this.richTextEditor && 
               (this.currentLayout === 'full-width' || this.previewTab);
    }
    
    /**
     * Show error state
     */
    showError(message) {
        this.container.innerHTML = `
            <div class="layout-error">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                <div>
                    <h3>レイアウトエラー</h3>
                    <p>${message}</p>
                </div>
            </div>
        `;
    }
    
    /**
     * Test responsive design across different screen sizes
     * This method is useful for automated testing and validation
     */
    testResponsiveDesign() {
        const testSizes = [
            { width: 320, height: 568, name: 'iPhone SE' },
            { width: 375, height: 667, name: 'iPhone 8' },
            { width: 414, height: 896, name: 'iPhone 11 Pro Max' },
            { width: 768, height: 1024, name: 'iPad Portrait' },
            { width: 1024, height: 768, name: 'iPad Landscape' },
            { width: 1366, height: 768, name: 'Laptop' },
            { width: 1920, height: 1080, name: 'Desktop' }
        ];
        
        const results = [];
        
        testSizes.forEach(size => {
            // Simulate screen size
            const originalWidth = window.innerWidth;
            const originalHeight = window.innerHeight;
            
            // Mock window dimensions
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: size.width
            });
            
            Object.defineProperty(window, 'innerHeight', {
                writable: true,
                configurable: true,
                value: size.height
            });
            
            // Test responsive behavior
            this.handleWindowResize();
            
            const result = {
                device: size.name,
                width: size.width,
                height: size.height,
                deviceType: this.deviceType,
                layout: this.currentLayout,
                splitRatio: this.splitRatio,
                touchFriendly: this.container.classList.contains('touch-device'),
                classes: Array.from(this.container.classList)
            };
            
            results.push(result);
            
            // Restore original dimensions
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: originalWidth
            });
            
            Object.defineProperty(window, 'innerHeight', {
                writable: true,
                configurable: true,
                value: originalHeight
            });
        });
        
        // Restore original state
        this.handleWindowResize();
        
        console.log('Responsive design test results:', results);
        return results;
    }
    
    /**
     * Validate responsive design implementation
     */
    validateResponsiveDesign() {
        const issues = [];
        
        // Check if responsive design is enabled
        if (!this.options.enableResponsiveDesign) {
            issues.push('Responsive design is disabled');
        }
        
        // Check for required CSS classes
        const requiredClasses = ['rich-text-layout-container'];
        requiredClasses.forEach(className => {
            if (!this.container.classList.contains(className)) {
                issues.push(`Missing required class: ${className}`);
            }
        });
        
        // Check for touch-friendly elements on mobile
        if (this.deviceCapabilities && this.deviceCapabilities.hasTouch) {
            const touchElements = this.container.querySelectorAll('.layout-toggle-btn, .enhanced-tab-button');
            touchElements.forEach(element => {
                const rect = element.getBoundingClientRect();
                if (rect.height < 44 || rect.width < 44) {
                    issues.push(`Element not touch-friendly: ${element.className} (${rect.width}x${rect.height})`);
                }
            });
        }
        
        // Check for proper ARIA attributes
        if (this.resizeHandle) {
            if (!this.resizeHandle.hasAttribute('aria-orientation')) {
                issues.push('Resize handle missing aria-orientation attribute');
            }
            if (!this.resizeHandle.hasAttribute('aria-label')) {
                issues.push('Resize handle missing aria-label attribute');
            }
        }
        
        // Check for proper role attributes
        if (!this.container.hasAttribute('role')) {
            issues.push('Container missing role attribute');
        }
        
        const validation = {
            isValid: issues.length === 0,
            issues: issues,
            deviceCapabilities: this.deviceCapabilities,
            currentDeviceType: this.deviceType
        };
        
        console.log('Responsive design validation:', validation);
        return validation;
    }
    
    /**
     * Get responsive design metrics
     */
    getResponsiveMetrics() {
        return {
            deviceType: this.deviceType,
            deviceCapabilities: this.deviceCapabilities,
            currentLayout: this.currentLayout,
            splitRatio: this.splitRatio,
            containerDimensions: {
                width: this.container.offsetWidth,
                height: this.container.offsetHeight
            },
            viewportDimensions: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            touchFriendly: this.container.classList.contains('touch-device'),
            responsiveClasses: Array.from(this.container.classList).filter(cls => 
                ['mobile', 'tablet', 'desktop', 'small-mobile', 'extra-small', 'touch-device', 'has-touch', 'no-hover'].includes(cls)
            )
        };
    }
    
    /**
     * Destroy the layout manager and clean up resources
     */
    destroy() {
        // Destroy editor and preview components
        if (this.richTextEditor && this.richTextEditor.destroy) {
            this.richTextEditor.destroy();
        }
        
        if (this.previewTab && this.previewTab.destroy) {
            this.previewTab.destroy();
        }
        
        // Remove resize observer
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        // Remove event listeners
        window.removeEventListener('resize', this.handleWindowResize);
        
        // Clear container
        if (this.container) {
            this.container.innerHTML = '';
            this.container.className = '';
        }
        
        // Remove styles if no other instances exist
        const styleElement = document.getElementById('rich-text-layout-manager-styles');
        if (styleElement && document.querySelectorAll('.rich-text-layout-container').length === 0) {
            styleElement.remove();
        }
        
        this.isInitialized = false;
        console.log('RichTextLayoutManager destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RichTextLayoutManager;
} else if (typeof window !== 'undefined') {
    window.RichTextLayoutManager = RichTextLayoutManager;
}