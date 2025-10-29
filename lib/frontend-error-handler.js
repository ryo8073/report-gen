// Frontend Error Handling Utility
class ErrorHandler {
    constructor() {
        this.errorContainer = null;
        this.init();
    }

    init() {
        // Create error container if it doesn't exist and DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.createErrorContainer());
        } else {
            this.createErrorContainer();
        }
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
        this.logError(error, context);
        
        if (showToUser) {
            this.showUserError(error, context);
        }

        // Handle specific error types
        if (error.status === 401) {
            this.handleAuthError();
        } else if (error.status === 403) {
            this.handlePermissionError();
        } else if (error.status >= 500) {
            this.handleServerError(error);
        }
    }

    // Log error for debugging
    logError(error, context = '') {
        const errorInfo = {
            message: error.message,
            status: error.status,
            context: context || error.context,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        console.error('Error logged:', errorInfo);
        
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
    window.errorHandler.handleError(event.error, 'global', false);
});

// Global handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    window.errorHandler.handleError(event.reason, 'promise', false);
});

// Export for module systems (not used in browser)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
}