/**
 * ErrorBoundary - Comprehensive error handling system for report preview components
 * Implements requirements 1.1, 1.2 for graceful error handling and fallback mechanisms
 */
class ErrorBoundary {
    constructor(options = {}) {
        this.options = {
            enableLogging: true,
            enableFallback: true,
            enableUserNotification: true,
            fallbackTab: 'raw',
            maxRetries: 3,
            retryDelay: 1000,
            ...options
        };
        
        this.errors = new Map();
        this.retryCount = new Map();
        this.isInitialized = false;
        
        this.init();
    }

    /**
     * Initialize error boundary system
     */
    init() {
        try {
            this.setupGlobalErrorHandlers();
            this.setupUnhandledRejectionHandler();
            this.injectStyles();
            this.isInitialized = true;
            
            if (this.options.enableLogging) {
                console.log('ErrorBoundary initialized');
            }
        } catch (error) {
            console.error('ErrorBoundary initialization failed:', error);
        }
    }

    /**
     * Setup global error handlers
     */
    setupGlobalErrorHandlers() {
        // Handle JavaScript errors
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'javascript',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error,
                target: event.target,
                timestamp: new Date().toISOString()
            });
        });

        // Handle resource loading errors
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                this.handleResourceError({
                    type: 'resource',
                    element: event.target,
                    source: event.target.src || event.target.href,
                    timestamp: new Date().toISOString()
                });
            }
        }, true);
    }

    /**
     * Setup unhandled promise rejection handler
     */
    setupUnhandledRejectionHandler() {
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'promise',
                message: event.reason?.message || 'Unhandled promise rejection',
                reason: event.reason,
                timestamp: new Date().toISOString()
            });
        });
    }

    /**
     * Inject error boundary styles
     */
    injectStyles() {
        const styleId = 'error-boundary-styles';
        
        if (document.getElementById(styleId)) {
            return;
        }

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .error-boundary {
                padding: var(--space-4, 1rem);
                background: var(--color-red-50, #fef2f2);
                border: 1px solid var(--color-red-200, #fecaca);
                border-radius: 6px;
                margin: var(--space-4, 1rem) 0;
            }

            .error-boundary-header {
                display: flex;
                align-items: center;
                gap: var(--space-2, 0.5rem);
                margin-bottom: var(--space-3, 0.75rem);
                color: var(--color-red-700, #b91c1c);
            }

            .error-boundary-icon {
                width: 20px;
                height: 20px;
                flex-shrink: 0;
            }

            .error-boundary-title {
                font-weight: 600;
                font-size: 1.125rem;
                margin: 0;
            }

            .error-boundary-message {
                color: var(--color-red-600, #dc2626);
                margin: 0 0 var(--space-3, 0.75rem) 0;
                line-height: 1.5;
            }

            .error-boundary-details {
                background: var(--color-red-100, #fee2e2);
                border: 1px solid var(--color-red-200, #fecaca);
                border-radius: 4px;
                padding: var(--space-3, 0.75rem);
                margin: var(--space-3, 0.75rem) 0;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                font-size: 0.875rem;
                color: var(--color-red-800, #991b1b);
                overflow-x: auto;
                white-space: pre-wrap;
            }

            .error-boundary-actions {
                display: flex;
                gap: var(--space-2, 0.5rem);
                flex-wrap: wrap;
            }

            .error-boundary-button {
                padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
                border: 1px solid var(--color-red-300, #fca5a5);
                border-radius: 4px;
                background: white;
                color: var(--color-red-700, #b91c1c);
                cursor: pointer;
                font-size: 0.875rem;
                font-weight: 500;
                transition: all 0.2s ease;
            }

            .error-boundary-button:hover {
                background: var(--color-red-50, #fef2f2);
                border-color: var(--color-red-400, #f87171);
            }

            .error-boundary-button.primary {
                background: var(--color-red-600, #dc2626);
                color: white;
                border-color: var(--color-red-600, #dc2626);
            }

            .error-boundary-button.primary:hover {
                background: var(--color-red-700, #b91c1c);
                border-color: var(--color-red-700, #b91c1c);
            }

            .error-boundary-fallback {
                padding: var(--space-4, 1rem);
                background: var(--color-yellow-50, #fffbeb);
                border: 1px solid var(--color-yellow-200, #fde68a);
                border-radius: 6px;
                margin: var(--space-4, 1rem) 0;
            }

            .error-boundary-fallback-header {
                display: flex;
                align-items: center;
                gap: var(--space-2, 0.5rem);
                margin-bottom: var(--space-2, 0.5rem);
                color: var(--color-yellow-700, #a16207);
            }

            .error-boundary-fallback-title {
                font-weight: 600;
                margin: 0;
            }

            .error-boundary-fallback-message {
                color: var(--color-yellow-600, #ca8a04);
                margin: 0;
                line-height: 1.5;
            }

            .error-notification {
                position: fixed;
                top: var(--space-4, 1rem);
                right: var(--space-4, 1rem);
                max-width: 400px;
                padding: var(--space-4, 1rem);
                background: var(--color-red-600, #dc2626);
                color: white;
                border-radius: 6px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                z-index: 1000;
                animation: slideIn 0.3s ease-out;
            }

            .error-notification-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: var(--space-2, 0.5rem);
            }

            .error-notification-title {
                font-weight: 600;
                margin: 0;
            }

            .error-notification-close {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .error-notification-message {
                margin: 0;
                font-size: 0.875rem;
                line-height: 1.4;
            }

            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            /* Responsive design */
            @media (max-width: 768px) {
                .error-boundary {
                    padding: var(--space-3, 0.75rem);
                    margin: var(--space-3, 0.75rem) 0;
                }

                .error-boundary-actions {
                    flex-direction: column;
                }

                .error-boundary-button {
                    width: 100%;
                    text-align: center;
                }

                .error-notification {
                    top: var(--space-2, 0.5rem);
                    right: var(--space-2, 0.5rem);
                    left: var(--space-2, 0.5rem);
                    max-width: none;
                }
            }

            /* High contrast mode */
            @media (prefers-contrast: high) {
                .error-boundary {
                    border: 2px solid #000;
                }

                .error-boundary-button {
                    border: 2px solid #000;
                }
            }

            /* Reduced motion */
            @media (prefers-reduced-motion: reduce) {
                .error-notification {
                    animation: none;
                }

                .error-boundary-button {
                    transition: none;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Handle JavaScript errors
     */
    handleError(errorInfo) {
        const errorKey = this.generateErrorKey(errorInfo);
        
        // Store error information
        this.errors.set(errorKey, {
            ...errorInfo,
            count: (this.errors.get(errorKey)?.count || 0) + 1,
            lastOccurred: new Date().toISOString()
        });

        if (this.options.enableLogging) {
            console.error('ErrorBoundary caught error:', errorInfo);
        }

        // Show user notification if enabled
        if (this.options.enableUserNotification) {
            this.showErrorNotification(errorInfo);
        }

        // Attempt recovery if possible
        this.attemptRecovery(errorInfo);
    }

    /**
     * Handle resource loading errors
     */
    handleResourceError(errorInfo) {
        if (this.options.enableLogging) {
            console.error('Resource loading error:', errorInfo);
        }

        // For resource errors, we might want to retry loading
        this.retryResourceLoad(errorInfo);
    }

    /**
     * Wrap a component with error boundary
     */
    wrapComponent(component, fallbackContent = null) {
        return {
            render: (...args) => {
                try {
                    return component.render(...args);
                } catch (error) {
                    this.handleComponentError(error, component.constructor.name);
                    return fallbackContent || this.createFallbackContent(component.constructor.name);
                }
            },
            
            init: (...args) => {
                try {
                    return component.init(...args);
                } catch (error) {
                    this.handleComponentError(error, component.constructor.name);
                    return false;
                }
            },

            setContent: (...args) => {
                try {
                    return component.setContent(...args);
                } catch (error) {
                    this.handleComponentError(error, component.constructor.name);
                    return false;
                }
            }
        };
    }

    /**
     * Handle component-specific errors
     */
    handleComponentError(error, componentName) {
        const errorInfo = {
            type: 'component',
            component: componentName,
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        };

        this.handleError(errorInfo);
    }

    /**
     * Create safe tab switcher with error handling
     */
    createSafeTabSwitcher(tabNavigation) {
        const originalSwitchTab = tabNavigation.switchTab.bind(tabNavigation);
        
        tabNavigation.switchTab = (tabName) => {
            try {
                const result = originalSwitchTab(tabName);
                
                // If switching failed and we have fallback enabled
                if (!result && this.options.enableFallback && tabName !== this.options.fallbackTab) {
                    console.warn(`Tab switch to ${tabName} failed, falling back to ${this.options.fallbackTab}`);
                    this.showFallbackMessage(tabName);
                    return originalSwitchTab(this.options.fallbackTab);
                }
                
                return result;
            } catch (error) {
                this.handleTabSwitchError(error, tabName);
                
                // Fallback to raw tab if enabled
                if (this.options.enableFallback && tabName !== this.options.fallbackTab) {
                    this.showFallbackMessage(tabName);
                    return originalSwitchTab(this.options.fallbackTab);
                }
                
                return false;
            }
        };
    }

    /**
     * Handle tab switching errors
     */
    handleTabSwitchError(error, tabName) {
        const errorInfo = {
            type: 'tab-switch',
            tab: tabName,
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        };

        this.handleError(errorInfo);
    }

    /**
     * Show fallback message
     */
    showFallbackMessage(failedTab) {
        const message = this.createFallbackMessage(failedTab);
        
        // Find a suitable container to show the message
        const container = document.querySelector('.tab-content') || 
                         document.querySelector('.preview-container') ||
                         document.body;
        
        // Remove any existing fallback messages
        const existingMessages = container.querySelectorAll('.error-boundary-fallback');
        existingMessages.forEach(msg => msg.remove());
        
        // Insert the fallback message
        const messageElement = document.createElement('div');
        messageElement.innerHTML = message;
        container.insertBefore(messageElement.firstElementChild, container.firstChild);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            const fallbackElement = container.querySelector('.error-boundary-fallback');
            if (fallbackElement) {
                fallbackElement.remove();
            }
        }, 10000);
    }

    /**
     * Create fallback message HTML
     */
    createFallbackMessage(failedTab) {
        const tabNames = {
            'preview': 'プレビュー',
            'editor': 'エディター',
            'comparison': '比較'
        };
        
        const tabDisplayName = tabNames[failedTab] || failedTab;
        
        return `
            <div class="error-boundary-fallback">
                <div class="error-boundary-fallback-header">
                    <svg class="error-boundary-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                    </svg>
                    <h3 class="error-boundary-fallback-title">フォールバック表示</h3>
                </div>
                <p class="error-boundary-fallback-message">
                    ${tabDisplayName}タブの表示中にエラーが発生したため、Rawタブに切り替えました。
                    しばらく時間をおいてから再度お試しください。
                </p>
            </div>
        `;
    }

    /**
     * Show error notification
     */
    showErrorNotification(errorInfo) {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.error-notification');
        existingNotifications.forEach(notification => notification.remove());
        
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.innerHTML = `
            <div class="error-notification-header">
                <h4 class="error-notification-title">エラーが発生しました</h4>
                <button class="error-notification-close" onclick="this.parentElement.parentElement.remove()">
                    <svg fill="currentColor" viewBox="0 0 20 20" width="16" height="16">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                </button>
            </div>
            <p class="error-notification-message">
                ${this.getErrorMessage(errorInfo)}
            </p>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 8 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 8000);
    }

    /**
     * Get user-friendly error message
     */
    getErrorMessage(errorInfo) {
        const messages = {
            'javascript': 'JavaScript実行中にエラーが発生しました。ページを再読み込みしてください。',
            'promise': '非同期処理中にエラーが発生しました。しばらく時間をおいてから再度お試しください。',
            'resource': 'リソースの読み込みに失敗しました。ネットワーク接続を確認してください。',
            'component': 'コンポーネントの初期化に失敗しました。ページを再読み込みしてください。',
            'tab-switch': 'タブの切り替えに失敗しました。Rawタブをご利用ください。'
        };
        
        return messages[errorInfo.type] || '予期しないエラーが発生しました。';
    }

    /**
     * Attempt error recovery
     */
    attemptRecovery(errorInfo) {
        const errorKey = this.generateErrorKey(errorInfo);
        const retryCount = this.retryCount.get(errorKey) || 0;
        
        if (retryCount < this.options.maxRetries) {
            this.retryCount.set(errorKey, retryCount + 1);
            
            setTimeout(() => {
                this.performRecovery(errorInfo);
            }, this.options.retryDelay * (retryCount + 1));
        }
    }

    /**
     * Perform recovery actions
     */
    performRecovery(errorInfo) {
        switch (errorInfo.type) {
            case 'component':
                this.recoverComponent(errorInfo);
                break;
            case 'tab-switch':
                this.recoverTabSwitch(errorInfo);
                break;
            default:
                // Generic recovery - refresh the page as last resort
                if (this.retryCount.get(this.generateErrorKey(errorInfo)) >= this.options.maxRetries) {
                    this.showRecoveryOption();
                }
                break;
        }
    }

    /**
     * Recover component
     */
    recoverComponent(errorInfo) {
        // Try to reinitialize the component
        const componentName = errorInfo.component;
        
        if (window[componentName]) {
            try {
                // This is a simplified recovery - in practice, you'd need more specific logic
                console.log(`Attempting to recover ${componentName}`);
            } catch (error) {
                console.error(`Recovery failed for ${componentName}:`, error);
            }
        }
    }

    /**
     * Recover tab switch
     */
    recoverTabSwitch(errorInfo) {
        // Force switch to fallback tab
        const tabNavigation = window.tabNavigation;
        if (tabNavigation && this.options.enableFallback) {
            try {
                tabNavigation.switchTab(this.options.fallbackTab);
            } catch (error) {
                console.error('Fallback tab switch failed:', error);
            }
        }
    }

    /**
     * Show recovery option to user
     */
    showRecoveryOption() {
        const recoveryMessage = `
            <div class="error-boundary">
                <div class="error-boundary-header">
                    <svg class="error-boundary-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                    </svg>
                    <h3 class="error-boundary-title">復旧が必要です</h3>
                </div>
                <p class="error-boundary-message">
                    複数のエラーが発生しており、自動復旧に失敗しました。
                    ページを再読み込みすることをお勧めします。
                </p>
                <div class="error-boundary-actions">
                    <button class="error-boundary-button primary" onclick="window.location.reload()">
                        ページを再読み込み
                    </button>
                    <button class="error-boundary-button" onclick="this.closest('.error-boundary').remove()">
                        このメッセージを閉じる
                    </button>
                </div>
            </div>
        `;
        
        const container = document.querySelector('.tab-content') || document.body;
        const messageElement = document.createElement('div');
        messageElement.innerHTML = recoveryMessage;
        container.insertBefore(messageElement.firstElementChild, container.firstChild);
    }

    /**
     * Retry resource loading
     */
    retryResourceLoad(errorInfo) {
        const element = errorInfo.element;
        const retryCount = this.retryCount.get(errorInfo.source) || 0;
        
        if (retryCount < this.options.maxRetries && element) {
            this.retryCount.set(errorInfo.source, retryCount + 1);
            
            setTimeout(() => {
                if (element.tagName === 'IMG') {
                    element.src = element.src; // Force reload
                } else if (element.tagName === 'SCRIPT') {
                    const newScript = document.createElement('script');
                    newScript.src = element.src;
                    element.parentNode.replaceChild(newScript, element);
                }
            }, this.options.retryDelay * (retryCount + 1));
        }
    }

    /**
     * Create fallback content for components
     */
    createFallbackContent(componentName) {
        const fallbackMessages = {
            'PreviewTab': 'プレビュー機能が利用できません。Rawタブをご利用ください。',
            'RichTextEditor': 'エディター機能が利用できません。Rawタブで内容を確認してください。',
            'ComparisonView': '比較機能が利用できません。各タブで個別に内容を確認してください。',
            'TabNavigation': 'タブナビゲーションが利用できません。ページを再読み込みしてください。'
        };
        
        const message = fallbackMessages[componentName] || 'コンポーネントが利用できません。';
        
        return `
            <div class="error-boundary">
                <div class="error-boundary-header">
                    <svg class="error-boundary-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                    </svg>
                    <h3 class="error-boundary-title">コンポーネントエラー</h3>
                </div>
                <p class="error-boundary-message">${message}</p>
                <div class="error-boundary-actions">
                    <button class="error-boundary-button primary" onclick="window.location.reload()">
                        ページを再読み込み
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Generate unique error key
     */
    generateErrorKey(errorInfo) {
        return `${errorInfo.type}-${errorInfo.message}-${errorInfo.component || 'global'}`;
    }

    /**
     * Get error statistics
     */
    getErrorStats() {
        const stats = {
            totalErrors: this.errors.size,
            errorsByType: {},
            recentErrors: []
        };
        
        this.errors.forEach((error, key) => {
            stats.errorsByType[error.type] = (stats.errorsByType[error.type] || 0) + error.count;
            
            if (new Date(error.lastOccurred) > new Date(Date.now() - 5 * 60 * 1000)) {
                stats.recentErrors.push(error);
            }
        });
        
        return stats;
    }

    /**
     * Clear error history
     */
    clearErrors() {
        this.errors.clear();
        this.retryCount.clear();
    }

    /**
     * Check if system is healthy
     */
    isHealthy() {
        const stats = this.getErrorStats();
        return stats.recentErrors.length === 0;
    }

    /**
     * Destroy error boundary and clean up
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('error', this.handleError);
        window.removeEventListener('unhandledrejection', this.handleError);
        
        // Clear error data
        this.clearErrors();
        
        // Remove styles
        const styleElement = document.getElementById('error-boundary-styles');
        if (styleElement) {
            styleElement.remove();
        }
        
        this.isInitialized = false;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorBoundary;
} else if (typeof window !== 'undefined') {
    window.ErrorBoundary = ErrorBoundary;
}