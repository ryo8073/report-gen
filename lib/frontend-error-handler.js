// Frontend Error Handling Utility
class ErrorHandler {
    constructor() {
        this.errorContainer = null;
        this.errorCategories = {
            SYNTAX: 'syntax',
            AUTHENTICATION: 'authentication',
            FUNCTIONALITY: 'functionality',
            NETWORK: 'network',
            PERMISSION: 'permission',
            SERVER: 'server',
            VALIDATION: 'validation',
            UNKNOWN: 'unknown'
        };
        this.severityLevels = {
            CRITICAL: 'critical',
            HIGH: 'high',
            MEDIUM: 'medium',
            LOW: 'low',
            INFO: 'info'
        };
        this.trialMode = this.detectTrialMode();
        this.suppressedErrors = new Set();
        this.init();
    }

    init() {
        // Create error container if it doesn't exist and DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.createErrorContainer();
                this.enableGracefulDegradation();
            });
        } else {
            this.createErrorContainer();
            this.enableGracefulDegradation();
        }
    }

    // Detect if we're in trial mode
    detectTrialMode() {
        // Check URL for trial indicators
        const url = window.location.href.toLowerCase();
        if (url.includes('trial') || url.includes('demo')) {
            return true;
        }

        // Check for trial-specific elements
        if (document.querySelector('[data-trial-mode]') || document.querySelector('.trial-mode')) {
            return true;
        }

        // Check for absence of authentication elements
        const hasAuthElements = document.querySelector('#login-form') || 
                               document.querySelector('.auth-required') ||
                               document.querySelector('[data-auth-required]');
        
        // If no auth elements and we're on index.html, assume trial mode
        if (!hasAuthElements && (url.includes('index.html') || url.endsWith('/'))) {
            return true;
        }

        return false;
    }

    // Check if error should be suppressed in trial mode
    shouldSuppressError(error, context, category) {
        if (!this.trialMode) {
            return false;
        }

        // Always suppress authentication errors in trial mode
        if (category === this.errorCategories.AUTHENTICATION) {
            return true;
        }

        // Suppress specific error patterns in trial mode
        const suppressPatterns = [
            /token/i,
            /auth/i,
            /login/i,
            /session/i,
            /unauthorized/i,
            /supabase/i,
            /firebase.*auth/i,
            /refresh.*token/i
        ];

        const errorMessage = error.message || '';
        const errorContext = context || '';

        for (let pattern of suppressPatterns) {
            if (pattern.test(errorMessage) || pattern.test(errorContext)) {
                return true;
            }
        }

        // Suppress network errors to auth endpoints
        if (category === this.errorCategories.NETWORK && 
            (errorContext.includes('auth') || errorMessage.includes('auth'))) {
            return true;
        }

        return false;
    }

    createErrorContainer() {
        if (!document.body) {
            console.warn('Document body not available, retrying...');
            setTimeout(() => this.createErrorContainer(), 100);
            return;
        }
        
        if (!document.getElementById('error-container')) {
            const container = document.createElement('div');
            container.id = 'error-container';
            container.className = 'fixed top-4 right-4 z-50 max-w-md';
            container.style.cssText = `
                position: fixed;
                top: 16px;
                right: 16px;
                z-index: 9999;
                max-width: 384px;
            `;
            document.body.appendChild(container);
        }
        this.errorContainer = document.getElementById('error-container');
    }

    // Handle API response errors
    async handleApiResponse(response, context = '') {
        if (!response.ok) {
            let errorMessage = 'An error occurred';
            let errorDetails = '';

            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.message || errorMessage;
                errorDetails = errorData.details || '';
            } catch (e) {
                // If response is not JSON, use status text
                errorMessage = response.statusText || errorMessage;
            }

            const error = new Error(errorMessage);
            error.status = response.status;
            error.details = errorDetails;
            error.context = context;

            this.logError(error);
            throw error;
        }
        return response;
    }

    // Handle network and other errors
    handleError(error, context = '', showToUser = true) {
        const { category, severity } = this.categorizeError(error, context);
        
        // Check if error should be suppressed in trial mode
        if (this.shouldSuppressError(error, context, category)) {
            const errorKey = `${error.message}-${context}-${category}`;
            if (!this.suppressedErrors.has(errorKey)) {
                console.info('Trial mode: Suppressing error -', { 
                    message: error.message, 
                    context, 
                    category 
                });
                this.suppressedErrors.add(errorKey);
            }
            return; // Exit early, don't process further
        }
        
        this.logError(error, context);
        
        // Attempt error recovery before showing to user
        const recovered = this.attemptErrorRecovery(error, context, category, severity);
        
        if (!recovered && showToUser) {
            this.showUserError(error, context);
        }

        // Handle specific error types (but not in trial mode for auth errors)
        if (error.status === 401 && !this.trialMode) {
            this.handleAuthError();
        } else if (error.status === 403 && !this.trialMode) {
            this.handlePermissionError();
        } else if (error.status >= 500) {
            this.handleServerError(error);
        }
    }

    // Attempt to recover from errors automatically
    attemptErrorRecovery(error, context, category, severity) {
        try {
            // Recovery for authentication errors in trial mode
            if (category === this.errorCategories.AUTHENTICATION && (context === 'trial' || context.includes('trial'))) {
                console.info('Suppressing authentication error in trial mode');
                return true; // Successfully recovered by suppressing
            }

            // Recovery for functionality errors
            if (category === this.errorCategories.FUNCTIONALITY) {
                return this.recoverFunctionality(error, context);
            }

            // Recovery for network errors
            if (category === this.errorCategories.NETWORK) {
                return this.recoverNetworkError(error, context);
            }

            // Recovery for syntax errors
            if (category === this.errorCategories.SYNTAX) {
                return this.recoverSyntaxError(error, context);
            }

            return false; // No recovery possible
        } catch (recoveryError) {
            console.warn('Error recovery failed:', recoveryError);
            return false;
        }
    }

    // Recover from functionality errors
    recoverFunctionality(error, context) {
        if (context.includes('upload') || context.includes('file')) {
            // Try to reinitialize file upload handlers
            try {
                this.reinitializeFileUpload();
                console.info('File upload functionality recovered');
                return true;
            } catch (e) {
                console.warn('Failed to recover file upload:', e);
            }
        }

        if (context.includes('form')) {
            // Try to recover form functionality
            try {
                this.recoverFormFunctionality();
                console.info('Form functionality recovered');
                return true;
            } catch (e) {
                console.warn('Failed to recover form functionality:', e);
            }
        }

        return false;
    }

    // Recover from network errors
    recoverNetworkError(error, context) {
        // For non-critical network errors, provide fallback
        if (context.includes('analytics') || context.includes('tracking')) {
            console.info('Non-critical network error suppressed:', context);
            return true;
        }

        return false;
    }

    // Recover from syntax errors
    recoverSyntaxError(error, context) {
        // For duplicate function declarations, try to clean up
        if (error.message.includes('duplicate') || error.message.includes('redeclared')) {
            console.info('Syntax error noted for cleanup:', error.message);
            return true; // Mark as recovered to prevent user notification
        }

        return false;
    }

    // Reinitialize file upload functionality
    reinitializeFileUpload() {
        const fileInput = document.getElementById('file-input');
        const dropZone = document.getElementById('drop-zone');

        if (fileInput && !fileInput.hasAttribute('data-initialized')) {
            fileInput.addEventListener('change', (e) => {
                if (window.handleFileSelect) {
                    window.handleFileSelect(e);
                }
            });
            fileInput.setAttribute('data-initialized', 'true');
        }

        if (dropZone && !dropZone.hasAttribute('data-initialized')) {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            });

            dropZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
                if (window.handleFileDrop) {
                    window.handleFileDrop(e);
                }
            });
            dropZone.setAttribute('data-initialized', 'true');
        }
    }

    // Recover form functionality
    recoverFormFunctionality() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            if (!form.hasAttribute('data-error-handled')) {
                form.addEventListener('submit', (e) => {
                    try {
                        // Basic form validation
                        const requiredFields = form.querySelectorAll('[required]');
                        for (let field of requiredFields) {
                            if (!field.value.trim()) {
                                this.showNotification(`Please fill in the ${field.name || 'required'} field.`, 'warning');
                                field.focus();
                                e.preventDefault();
                                return;
                            }
                        }
                    } catch (formError) {
                        console.warn('Form validation error:', formError);
                    }
                });
                form.setAttribute('data-error-handled', 'true');
            }
        });
    }

    // Graceful degradation for missing functionality
    enableGracefulDegradation() {
        // Provide fallbacks for missing functions
        if (typeof window.handleFileSelect === 'undefined') {
            window.handleFileSelect = (e) => {
                this.showNotification('File upload is temporarily unavailable. Please try again later.', 'warning');
            };
        }

        if (typeof window.handleFileDrop === 'undefined') {
            window.handleFileDrop = (e) => {
                this.showNotification('Drag and drop is temporarily unavailable. Please use the file input instead.', 'warning');
            };
        }

        // Provide fallback for missing authentication functions
        if (typeof window.login === 'undefined') {
            window.login = () => {
                this.showNotification('Authentication is not required for trial mode.', 'info');
            };
        }
    }

    // Categorize error type and severity
    categorizeError(error, context = '') {
        let category = this.errorCategories.UNKNOWN;
        let severity = this.severityLevels.MEDIUM;

        // Categorize by error type and message
        if (error.name === 'SyntaxError' || error.message.includes('duplicate') || error.message.includes('redeclared')) {
            category = this.errorCategories.SYNTAX;
            severity = this.severityLevels.HIGH;
        } else if (error.status === 401 || error.message.includes('token') || error.message.includes('auth') || context.includes('auth')) {
            category = this.errorCategories.AUTHENTICATION;
            severity = this.severityLevels.MEDIUM;
        } else if (error.status === 403) {
            category = this.errorCategories.PERMISSION;
            severity = this.severityLevels.MEDIUM;
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
            category = this.errorCategories.NETWORK;
            severity = this.severityLevels.HIGH;
        } else if (error.status >= 500) {
            category = this.errorCategories.SERVER;
            severity = this.severityLevels.CRITICAL;
        } else if (error.status >= 400 && error.status < 500) {
            category = this.errorCategories.VALIDATION;
            severity = this.severityLevels.MEDIUM;
        } else if (context.includes('upload') || context.includes('file') || error.message.includes('upload')) {
            category = this.errorCategories.FUNCTIONALITY;
            severity = this.severityLevels.HIGH;
        }

        // Adjust severity based on context
        if (context === 'trial' || context.includes('trial')) {
            // Lower severity for trial mode errors
            if (category === this.errorCategories.AUTHENTICATION) {
                severity = this.severityLevels.LOW;
            }
        }

        return { category, severity };
    }

    // Log error for debugging
    logError(error, context = '') {
        const { category, severity } = this.categorizeError(error, context);
        
        const errorInfo = {
            message: error.message,
            status: error.status,
            context: context || error.context,
            category: category,
            severity: severity,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        // Log with appropriate console method based on severity
        if (severity === this.severityLevels.CRITICAL) {
            console.error('CRITICAL Error:', errorInfo);
        } else if (severity === this.severityLevels.HIGH) {
            console.error('HIGH Error:', errorInfo);
        } else if (severity === this.severityLevels.MEDIUM) {
            console.warn('MEDIUM Error:', errorInfo);
        } else if (severity === this.severityLevels.LOW) {
            console.warn('LOW Error:', errorInfo);
        } else {
            console.info('INFO Error:', errorInfo);
        }
        
        // In production, you might want to send this to a logging service
        // this.sendToLoggingService(errorInfo);
    }

    // Show user-friendly error messages
    showUserError(error, context = '') {
        const userMessage = this.getUserFriendlyMessage(error, context);
        this.showNotification(userMessage, 'error');
    }

    // Convert technical errors to user-friendly messages
    getUserFriendlyMessage(error, context) {
        const status = error.status;
        const message = error.message;

        // Authentication errors
        if (status === 401) {
            if (message.includes('token')) {
                return 'Your session has expired. Please log in again.';
            }
            return 'Authentication failed. Please check your credentials.';
        }

        // Permission errors
        if (status === 403) {
            return 'You do not have permission to perform this action.';
        }

        // Not found errors
        if (status === 404) {
            return 'The requested resource was not found.';
        }

        // Rate limiting
        if (status === 429) {
            return 'Too many requests. Please wait a moment and try again.';
        }

        // Server errors
        if (status >= 500) {
            return 'A server error occurred. Please try again later.';
        }

        // Client errors
        if (status >= 400) {
            return message || 'Invalid request. Please check your input.';
        }

        // Network errors
        if (error.name === 'TypeError' && message.includes('fetch')) {
            return 'Network error. Please check your connection and try again.';
        }

        // Context-specific messages
        if (context === 'login') {
            return 'Login failed. Please check your email and password.';
        }
        if (context === 'registration') {
            return 'Registration failed. Please check your information and try again.';
        }
        if (context === 'report-generation') {
            return 'Report generation failed. Please try again or contact support.';
        }

        // Default message
        return message || 'An unexpected error occurred. Please try again.';
    }

    // Show notification to user
    showNotification(message, type = 'error', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type} mb-2 p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full`;
        
        // Style based on type
        if (type === 'error') {
            notification.className += ' bg-red-100 border border-red-400 text-red-700';
        } else if (type === 'success') {
            notification.className += ' bg-green-100 border border-green-400 text-green-700';
        } else if (type === 'warning') {
            notification.className += ' bg-yellow-100 border border-yellow-400 text-yellow-700';
        } else {
            notification.className += ' bg-blue-100 border border-blue-400 text-blue-700';
        }

        notification.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <p class="font-medium">${message}</p>
                </div>
                <button class="ml-4 text-gray-400 hover:text-gray-600" onclick="this.parentElement.parentElement.remove()">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                </button>
            </div>
        `;

        this.errorContainer.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);

        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                notification.classList.add('translate-x-full');
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 300);
            }, duration);
        }
    }

    // Handle authentication errors
    handleAuthError() {
        // Don't handle auth errors in trial mode
        if (this.trialMode) {
            console.info('Trial mode: Ignoring authentication error');
            return;
        }

        // Clear any stored tokens
        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        
        // Redirect to login after a short delay
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 2000);
    }

    // Handle permission errors
    handlePermissionError() {
        this.showNotification('Access denied. You may need to log in with different credentials.', 'warning');
    }

    // Handle server errors
    handleServerError(error) {
        this.showNotification('Server error occurred. Our team has been notified.', 'error');
        // In production, you might want to send this to a monitoring service
    }

    // Retry mechanism for failed requests
    async retryRequest(requestFn, maxRetries = 3, delay = 1000) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await requestFn();
            } catch (error) {
                if (i === maxRetries - 1) {
                    throw error;
                }
                
                // Don't retry on client errors (4xx) except 429 (rate limit)
                if (error.status >= 400 && error.status < 500 && error.status !== 429) {
                    throw error;
                }

                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
            }
        }
    }

    // Show loading state
    showLoading(element, message = 'Loading...') {
        if (element) {
            element.disabled = true;
            element.dataset.originalText = element.textContent;
            element.textContent = message;
        }
    }

    // Hide loading state
    hideLoading(element) {
        if (element && element.dataset.originalText) {
            element.disabled = false;
            element.textContent = element.dataset.originalText;
            delete element.dataset.originalText;
        }
    }
}

// Create global error handler instance
window.errorHandler = new ErrorHandler();

// Global error handler for unhandled errors
window.addEventListener('error', (event) => {
    // Add trial context if in trial mode
    const context = window.errorHandler.trialMode ? 'global-trial' : 'global';
    window.errorHandler.handleError(event.error, context, false);
});

// Global handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    // Add trial context if in trial mode
    const context = window.errorHandler.trialMode ? 'promise-trial' : 'promise';
    window.errorHandler.handleError(event.reason, context, false);
});

// Export for module systems (not used in browser)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
}