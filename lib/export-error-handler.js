/**
 * Export Error Handler
 * Provides user-friendly error messages and retry mechanisms for export failures
 * Implements graceful fallbacks for unsupported features
 * Requirements 3.5, 7.4: Export error handling and recovery
 */

class ExportErrorHandler {
    constructor(options = {}) {
        this.options = {
            maxRetries: 3,
            retryDelay: 1000,
            exponentialBackoff: true,
            showUserNotifications: true,
            enableFallbacks: true,
            logErrors: true,
            ...options
        };
        
        // Error tracking
        this.errorHistory = [];
        this.retryAttempts = new Map();
        this.fallbacksUsed = new Set();
        
        // Error categories and their handling strategies
        this.errorCategories = {
            VALIDATION_ERROR: {
                retryable: false,
                fallback: 'showValidationErrors',
                userMessage: 'Content validation failed. Please fix the issues and try again.'
            },
            LIBRARY_NOT_FOUND: {
                retryable: false,
                fallback: 'loadLibraryFallback',
                userMessage: 'Export library not available. Trying alternative method...'
            },
            NETWORK_ERROR: {
                retryable: true,
                fallback: 'offlineExport',
                userMessage: 'Network error occurred. Retrying...'
            },
            MEMORY_ERROR: {
                retryable: true,
                fallback: 'reduceQuality',
                userMessage: 'Memory limit reached. Trying with reduced quality...'
            },
            CONTENT_TOO_LARGE: {
                retryable: false,
                fallback: 'splitContent',
                userMessage: 'Content is too large. Consider splitting into smaller sections.'
            },
            UNSUPPORTED_FEATURE: {
                retryable: false,
                fallback: 'removeUnsupportedElements',
                userMessage: 'Some features are not supported. Continuing with compatible elements...'
            },
            BROWSER_COMPATIBILITY: {
                retryable: false,
                fallback: 'basicExport',
                userMessage: 'Browser compatibility issue. Using basic export method...'
            },
            TIMEOUT_ERROR: {
                retryable: true,
                fallback: 'increaseTimeout',
                userMessage: 'Export timed out. Retrying with extended timeout...'
            },
            UNKNOWN_ERROR: {
                retryable: true,
                fallback: 'basicExport',
                userMessage: 'An unexpected error occurred. Trying alternative method...'
            }
        };
        
        // Initialize enhanced error handler if available
        this.enhancedErrorHandler = window.enhancedErrorHandler || null;
    }

    /**
     * Handle export error with retry and fallback mechanisms
     * @param {Error} error - The error that occurred
     * @param {Object} context - Export context information
     * @param {Function} retryFunction - Function to retry the operation
     * @returns {Promise<Object>} Result of error handling
     */
    async handleExportError(error, context, retryFunction) {
        const errorInfo = this.analyzeError(error, context);
        const errorId = this.generateErrorId();
        
        // Log the error
        this.logError(errorInfo, errorId, context);
        
        // Track error in history
        this.errorHistory.push({
            id: errorId,
            error: errorInfo,
            context,
            timestamp: new Date(),
            resolved: false
        });

        // Determine if retry is appropriate
        const shouldRetry = this.shouldRetryError(errorInfo, context);
        
        if (shouldRetry && retryFunction) {
            return await this.attemptRetry(errorInfo, context, retryFunction, errorId);
        }
        
        // Try fallback mechanisms
        const fallbackResult = await this.attemptFallback(errorInfo, context, errorId);
        
        if (fallbackResult.success) {
            return fallbackResult;
        }
        
        // Show final error to user
        await this.showFinalError(errorInfo, context, errorId);
        
        return {
            success: false,
            error: errorInfo,
            errorId,
            fallbackAttempted: fallbackResult.attempted
        };
    }

    /**
     * Analyze error to determine category and handling strategy
     * @param {Error} error - The error object
     * @param {Object} context - Export context
     * @returns {Object} Error analysis result
     */
    analyzeError(error, context) {
        const errorInfo = {
            originalError: error,
            message: error.message || 'Unknown error',
            stack: error.stack,
            category: 'UNKNOWN_ERROR',
            severity: 'medium',
            retryable: false,
            context: context
        };

        // Categorize the error based on message and context
        if (error.name === 'ValidationError' || error.message.includes('validation')) {
            errorInfo.category = 'VALIDATION_ERROR';
            errorInfo.severity = 'high';
        } else if (error.message.includes('not found') || error.message.includes('undefined')) {
            errorInfo.category = 'LIBRARY_NOT_FOUND';
            errorInfo.severity = 'high';
        } else if (error.name === 'NetworkError' || error.message.includes('network')) {
            errorInfo.category = 'NETWORK_ERROR';
            errorInfo.severity = 'medium';
        } else if (error.message.includes('memory') || error.message.includes('out of memory')) {
            errorInfo.category = 'MEMORY_ERROR';
            errorInfo.severity = 'high';
        } else if (error.message.includes('too large') || error.message.includes('size limit')) {
            errorInfo.category = 'CONTENT_TOO_LARGE';
            errorInfo.severity = 'high';
        } else if (error.message.includes('unsupported') || error.message.includes('not supported')) {
            errorInfo.category = 'UNSUPPORTED_FEATURE';
            errorInfo.severity = 'medium';
        } else if (error.message.includes('timeout') || error.name === 'TimeoutError') {
            errorInfo.category = 'TIMEOUT_ERROR';
            errorInfo.severity = 'medium';
        } else if (error.message.includes('browser') || error.message.includes('compatibility')) {
            errorInfo.category = 'BROWSER_COMPATIBILITY';
            errorInfo.severity = 'medium';
        }

        // Set retryable flag based on category
        const categoryInfo = this.errorCategories[errorInfo.category];
        if (categoryInfo) {
            errorInfo.retryable = categoryInfo.retryable;
        }

        return errorInfo;
    }

    /**
     * Determine if error should be retried
     * @param {Object} errorInfo - Error information
     * @param {Object} context - Export context
     * @returns {boolean} True if should retry
     */
    shouldRetryError(errorInfo, context) {
        if (!errorInfo.retryable) {
            return false;
        }

        const retryKey = `${context.format}-${errorInfo.category}`;
        const currentAttempts = this.retryAttempts.get(retryKey) || 0;
        
        return currentAttempts < this.options.maxRetries;
    }

    /**
     * Attempt to retry the failed operation
     * @param {Object} errorInfo - Error information
     * @param {Object} context - Export context
     * @param {Function} retryFunction - Function to retry
     * @param {string} errorId - Error ID
     * @returns {Promise<Object>} Retry result
     */
    async attemptRetry(errorInfo, context, retryFunction, errorId) {
        const retryKey = `${context.format}-${errorInfo.category}`;
        const currentAttempts = this.retryAttempts.get(retryKey) || 0;
        const attemptNumber = currentAttempts + 1;
        
        this.retryAttempts.set(retryKey, attemptNumber);

        // Show retry notification to user
        if (this.options.showUserNotifications) {
            this.showRetryNotification(errorInfo, attemptNumber, this.options.maxRetries);
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateRetryDelay(attemptNumber);
        
        // Wait before retrying
        await this.sleep(delay);

        try {
            // Modify context for retry (e.g., reduce quality, increase timeout)
            const retryContext = this.prepareRetryContext(context, errorInfo, attemptNumber);
            
            // Attempt the retry
            const result = await retryFunction(retryContext);
            
            // Mark error as resolved
            this.markErrorResolved(errorId);
            
            // Show success notification
            if (this.options.showUserNotifications) {
                this.showRetrySuccessNotification(attemptNumber);
            }
            
            return {
                success: true,
                result,
                retriesUsed: attemptNumber,
                errorId
            };
            
        } catch (retryError) {
            console.warn(`Retry attempt ${attemptNumber} failed:`, retryError);
            
            // If this was the last retry, proceed to fallback
            if (attemptNumber >= this.options.maxRetries) {
                return await this.attemptFallback(errorInfo, context, errorId);
            }
            
            // Recursively retry
            return await this.attemptRetry(errorInfo, context, retryFunction, errorId);
        }
    }

    /**
     * Attempt fallback mechanisms
     * @param {Object} errorInfo - Error information
     * @param {Object} context - Export context
     * @param {string} errorId - Error ID
     * @returns {Promise<Object>} Fallback result
     */
    async attemptFallback(errorInfo, context, errorId) {
        if (!this.options.enableFallbacks) {
            return { success: false, attempted: false };
        }

        const categoryInfo = this.errorCategories[errorInfo.category];
        if (!categoryInfo || !categoryInfo.fallback) {
            return { success: false, attempted: false };
        }

        const fallbackMethod = categoryInfo.fallback;
        
        try {
            // Show fallback notification
            if (this.options.showUserNotifications) {
                this.showFallbackNotification(errorInfo);
            }

            // Track fallback usage
            this.fallbacksUsed.add(fallbackMethod);

            // Execute fallback
            const fallbackResult = await this.executeFallback(fallbackMethod, errorInfo, context);
            
            if (fallbackResult.success) {
                // Mark error as resolved
                this.markErrorResolved(errorId);
                
                // Show fallback success notification
                if (this.options.showUserNotifications) {
                    this.showFallbackSuccessNotification(fallbackMethod);
                }
            }
            
            return {
                success: fallbackResult.success,
                result: fallbackResult.result,
                fallbackUsed: fallbackMethod,
                attempted: true,
                errorId
            };
            
        } catch (fallbackError) {
            console.error(`Fallback ${fallbackMethod} failed:`, fallbackError);
            return { success: false, attempted: true, fallbackError };
        }
    }

    /**
     * Execute specific fallback method
     * @param {string} fallbackMethod - Fallback method name
     * @param {Object} errorInfo - Error information
     * @param {Object} context - Export context
     * @returns {Promise<Object>} Fallback execution result
     */
    async executeFallback(fallbackMethod, errorInfo, context) {
        switch (fallbackMethod) {
            case 'showValidationErrors':
                return await this.fallbackShowValidationErrors(errorInfo, context);
            
            case 'loadLibraryFallback':
                return await this.fallbackLoadLibrary(errorInfo, context);
            
            case 'offlineExport':
                return await this.fallbackOfflineExport(errorInfo, context);
            
            case 'reduceQuality':
                return await this.fallbackReduceQuality(errorInfo, context);
            
            case 'splitContent':
                return await this.fallbackSplitContent(errorInfo, context);
            
            case 'removeUnsupportedElements':
                return await this.fallbackRemoveUnsupportedElements(errorInfo, context);
            
            case 'basicExport':
                return await this.fallbackBasicExport(errorInfo, context);
            
            case 'increaseTimeout':
                return await this.fallbackIncreaseTimeout(errorInfo, context);
            
            default:
                throw new Error(`Unknown fallback method: ${fallbackMethod}`);
        }
    }

    /**
     * Fallback: Show validation errors to user
     * @param {Object} errorInfo - Error information
     * @param {Object} context - Export context
     * @returns {Promise<Object>} Fallback result
     */
    async fallbackShowValidationErrors(errorInfo, context) {
        // If we have a content validator, show detailed validation errors
        if (window.ContentValidator && context.content) {
            const validator = new ContentValidator();
            const validationResult = await validator.validateContent(context.content, context);
            
            this.showValidationErrorsDialog(validationResult);
            
            return {
                success: false, // Don't continue export, user needs to fix issues
                result: { validationResult }
            };
        }
        
        return { success: false };
    }

    /**
     * Fallback: Load library using alternative method
     * @param {Object} errorInfo - Error information
     * @param {Object} context - Export context
     * @returns {Promise<Object>} Fallback result
     */
    async fallbackLoadLibrary(errorInfo, context) {
        // Try to load required libraries dynamically
        try {
            if (context.format === 'pdf' && !window.jsPDF) {
                await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            }
            
            if (context.format === 'word' && !window.docx) {
                await this.loadScript('https://unpkg.com/docx@7.8.2/build/index.js');
            }
            
            return { success: true, result: 'Libraries loaded successfully' };
        } catch (loadError) {
            return { success: false, error: loadError };
        }
    }

    /**
     * Fallback: Use browser print dialog for PDF
     * @param {Object} errorInfo - Error information
     * @param {Object} context - Export context
     * @returns {Promise<Object>} Fallback result
     */
    async fallbackOfflineExport(errorInfo, context) {
        if (context.format === 'pdf') {
            // Use browser print dialog as fallback
            this.showPrintDialog(context.content);
            return { 
                success: true, 
                result: 'Print dialog opened - user can save as PDF' 
            };
        }
        
        return { success: false };
    }

    /**
     * Fallback: Reduce export quality to save memory
     * @param {Object} errorInfo - Error information
     * @param {Object} context - Export context
     * @returns {Promise<Object>} Fallback result
     */
    async fallbackReduceQuality(errorInfo, context) {
        // Modify context to use lower quality settings
        const reducedContext = {
            ...context,
            scale: Math.max(0.5, (context.scale || 2) * 0.7),
            quality: Math.max(0.3, (context.quality || 1.0) * 0.7),
            dpi: Math.max(150, (context.dpi || 300) * 0.7)
        };
        
        return { 
            success: true, 
            result: reducedContext,
            message: 'Export quality reduced to prevent memory issues'
        };
    }

    /**
     * Fallback: Split large content into smaller parts
     * @param {Object} errorInfo - Error information
     * @param {Object} context - Export context
     * @returns {Promise<Object>} Fallback result
     */
    async fallbackSplitContent(errorInfo, context) {
        // This would require user interaction to choose how to split
        this.showContentSplitDialog(context);
        
        return { 
            success: false, // Requires user action
            result: 'Content split dialog shown to user'
        };
    }

    /**
     * Fallback: Remove unsupported elements
     * @param {Object} errorInfo - Error information
     * @param {Object} context - Export context
     * @returns {Promise<Object>} Fallback result
     */
    async fallbackRemoveUnsupportedElements(errorInfo, context) {
        if (!context.content) {
            return { success: false };
        }
        
        // Clone content and remove problematic elements
        const cleanContent = context.content.cloneNode(true);
        
        // Remove elements that commonly cause export issues
        const problematicSelectors = [
            'script', 'style', 'iframe', 'embed', 'object',
            'video', 'audio', '[onclick]', '.interactive'
        ];
        
        problematicSelectors.forEach(selector => {
            const elements = cleanContent.querySelectorAll(selector);
            elements.forEach(el => el.remove());
        });
        
        return {
            success: true,
            result: {
                ...context,
                content: cleanContent
            },
            message: 'Unsupported elements removed from content'
        };
    }

    /**
     * Fallback: Use basic export method
     * @param {Object} errorInfo - Error information
     * @param {Object} context - Export context
     * @returns {Promise<Object>} Fallback result
     */
    async fallbackBasicExport(errorInfo, context) {
        if (context.format === 'pdf') {
            // Use browser print as basic PDF export
            return await this.fallbackOfflineExport(errorInfo, context);
        }
        
        if (context.format === 'word') {
            // Offer HTML download as basic Word alternative
            this.downloadAsHTML(context.content);
            return { 
                success: true, 
                result: 'Content downloaded as HTML file'
            };
        }
        
        return { success: false };
    }

    /**
     * Fallback: Increase timeout for slow operations
     * @param {Object} errorInfo - Error information
     * @param {Object} context - Export context
     * @returns {Promise<Object>} Fallback result
     */
    async fallbackIncreaseTimeout(errorInfo, context) {
        const increasedContext = {
            ...context,
            timeout: (context.timeout || 30000) * 2 // Double the timeout
        };
        
        return {
            success: true,
            result: increasedContext,
            message: 'Timeout increased for slower processing'
        };
    }

    /**
     * Show validation errors dialog
     * @param {Object} validationResult - Validation result
     */
    showValidationErrorsDialog(validationResult) {
        if (this.enhancedErrorHandler) {
            const errorMessages = validationResult.errors.map(error => error.message);
            const warningMessages = validationResult.warnings.map(warning => warning.message);
            
            this.enhancedErrorHandler.showNotification(
                'Content validation failed. Please fix the following issues:',
                'error',
                0,
                {
                    userActions: [...errorMessages, ...warningMessages]
                }
            );
        } else {
            console.error('Validation errors:', validationResult);
            alert('Content validation failed. Please check the console for details.');
        }
    }

    /**
     * Show print dialog for PDF fallback
     * @param {HTMLElement} content - Content to print
     */
    showPrintDialog(content) {
        // Create a new window with the content for printing
        const printWindow = window.open('', '_blank');
        printWindow.document.write(\`<!DOCTYPE html>
<html>
<head>
    <title>Print Document</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        @media print { body { margin: 0; } }
    </style>
</head>
<body>
    \${content.innerHTML}
    <script>
        window.onload = function() {
            window.print();
            window.onafterprint = function() {
                window.close();
            };
        };
    </script>
</body>
</html>\`);
        printWindow.document.close();
    }

    /**
     * Show content split dialog
     * @param {Object} context - Export context
     */
    showContentSplitDialog(context) {
        if (this.enhancedErrorHandler) {
            this.enhancedErrorHandler.showNotification(
                'Content is too large for export.',
                'warning',
                0,
                {
                    userActions: [
                        'Consider splitting your document into smaller sections',
                        'Remove some images or tables to reduce size',
                        'Try exporting individual sections separately'
                    ]
                }
            );
        } else {
            alert('Content is too large for export. Please split into smaller sections.');
        }
    }

    /**
     * Download content as HTML file
     * @param {HTMLElement} content - Content to download
     */
    downloadAsHTML(content) {
        const htmlContent = \`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Exported Document</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        h1, h2, h3 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    \${content.innerHTML}
</body>
</html>\`;
        
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'document.html';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Load script dynamically
     * @param {string} src - Script source URL
     * @returns {Promise<void>}
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Show retry notification
     * @param {Object} errorInfo - Error information
     * @param {number} attemptNumber - Current attempt number
     * @param {number} maxRetries - Maximum retry attempts
     */
    showRetryNotification(errorInfo, attemptNumber, maxRetries) {
        const categoryInfo = this.errorCategories[errorInfo.category];
        const message = `${categoryInfo.userMessage} (Attempt ${attemptNumber}/${maxRetries})`;
        
        if (this.enhancedErrorHandler) {
            this.enhancedErrorHandler.showNotification(message, 'warning', 3000);
        } else {
            console.log(message);
        }
    }

    /**
     * Show retry success notification
     * @param {number} attemptNumber - Successful attempt number
     */
    showRetrySuccessNotification(attemptNumber) {
        const message = `Export succeeded after ${attemptNumber} attempt${attemptNumber > 1 ? 's' : ''}!`;
        
        if (this.enhancedErrorHandler) {
            this.enhancedErrorHandler.showNotification(message, 'success', 3000);
        } else {
            console.log(message);
        }
    }

    /**
     * Show fallback notification
     * @param {Object} errorInfo - Error information
     */
    showFallbackNotification(errorInfo) {
        const categoryInfo = this.errorCategories[errorInfo.category];
        const message = categoryInfo.userMessage;
        
        if (this.enhancedErrorHandler) {
            this.enhancedErrorHandler.showNotification(message, 'info', 5000);
        } else {
            console.log(message);
        }
    }

    /**
     * Show fallback success notification
     * @param {string} fallbackMethod - Fallback method used
     */
    showFallbackSuccessNotification(fallbackMethod) {
        const message = `Export completed using alternative method (${fallbackMethod}).`;
        
        if (this.enhancedErrorHandler) {
            this.enhancedErrorHandler.showNotification(message, 'success', 5000);
        } else {
            console.log(message);
        }
    }

    /**
     * Show final error to user
     * @param {Object} errorInfo - Error information
     * @param {Object} context - Export context
     * @param {string} errorId - Error ID
     */
    async showFinalError(errorInfo, context, errorId) {
        const message = `Export failed: ${errorInfo.message}`;
        
        if (this.enhancedErrorHandler) {
            this.enhancedErrorHandler.showNotification(
                message,
                'error',
                0,
                {
                    errorId,
                    userActions: [
                        'Check your content for issues',
                        'Try a different export format',
                        'Contact support if the problem persists'
                    ]
                }
            );
        } else {
            console.error(message);
            alert(message);
        }
    }

    /**
     * Prepare context for retry attempt
     * @param {Object} context - Original context
     * @param {Object} errorInfo - Error information
     * @param {number} attemptNumber - Attempt number
     * @returns {Object} Modified context for retry
     */
    prepareRetryContext(context, errorInfo, attemptNumber) {
        const retryContext = { ...context };
        
        // Adjust settings based on error category and attempt number
        switch (errorInfo.category) {
            case 'MEMORY_ERROR':
                retryContext.scale = Math.max(0.5, (context.scale || 2) * (0.8 ** attemptNumber));
                retryContext.quality = Math.max(0.3, (context.quality || 1.0) * (0.8 ** attemptNumber));
                break;
                
            case 'TIMEOUT_ERROR':
                retryContext.timeout = (context.timeout || 30000) * (1.5 ** attemptNumber);
                break;
                
            case 'NETWORK_ERROR':
                // No specific adjustments needed for network errors
                break;
        }
        
        return retryContext;
    }

    /**
     * Calculate retry delay with exponential backoff
     * @param {number} attemptNumber - Current attempt number
     * @returns {number} Delay in milliseconds
     */
    calculateRetryDelay(attemptNumber) {
        if (!this.options.exponentialBackoff) {
            return this.options.retryDelay;
        }
        
        return this.options.retryDelay * Math.pow(2, attemptNumber - 1);
    }

    /**
     * Sleep for specified duration
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Generate unique error ID
     * @returns {string} Error ID
     */
    generateErrorId() {
        return `export_error_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    }

    /**
     * Log error information
     * @param {Object} errorInfo - Error information
     * @param {string} errorId - Error ID
     * @param {Object} context - Export context
     */
    logError(errorInfo, errorId, context) {
        if (!this.options.logErrors) return;
        
        const logEntry = {
            errorId,
            category: errorInfo.category,
            message: errorInfo.message,
            severity: errorInfo.severity,
            context: {
                format: context.format,
                contentLength: context.content?.innerHTML?.length || 0,
                timestamp: new Date().toISOString()
            },
            stack: errorInfo.stack
        };
        
        console.error('Export Error:', logEntry);
    }

    /**
     * Mark error as resolved
     * @param {string} errorId - Error ID
     */
    markErrorResolved(errorId) {
        const errorEntry = this.errorHistory.find(entry => entry.id === errorId);
        if (errorEntry) {
            errorEntry.resolved = true;
            errorEntry.resolvedAt = new Date();
        }
    }

    /**
     * Get error statistics
     * @returns {Object} Error statistics
     */
    getErrorStatistics() {
        return {
            totalErrors: this.errorHistory.length,
            resolvedErrors: this.errorHistory.filter(e => e.resolved).length,
            errorsByCategory: this.getErrorsByCategory(),
            fallbacksUsed: Array.from(this.fallbacksUsed),
            retryAttempts: Object.fromEntries(this.retryAttempts)
        };
    }

    /**
     * Get errors grouped by category
     * @returns {Object} Errors by category
     */
    getErrorsByCategory() {
        const categories = {};
        
        for (const entry of this.errorHistory) {
            const category = entry.error.category;
            if (!categories[category]) {
                categories[category] = { total: 0, resolved: 0 };
            }
            categories[category].total++;
            if (entry.resolved) {
                categories[category].resolved++;
            }
        }
        
        return categories;
    }

    /**
     * Clear error history
     */
    clearErrorHistory() {
        this.errorHistory = [];
        this.retryAttempts.clear();
        this.fallbacksUsed.clear();
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExportErrorHandler;
} else if (typeof window !== 'undefined') {
    window.ExportErrorHandler = ExportErrorHandler;
}