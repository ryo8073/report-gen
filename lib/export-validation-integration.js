/**
 * Export Validation Integration
 * Integrates content validation and error handling with export managers
 * Provides unified interface for validated exports with error recovery
 * Requirements 1.5, 3.5, 7.4: Comprehensive validation and error handling
 */

class ExportValidationIntegration {
    constructor(options = {}) {
        this.options = {
            enableValidation: true,
            enableErrorHandling: true,
            enableProgressTracking: true,
            showUserFeedback: true,
            ...options
        };
        
        // Initialize components
        this.contentValidator = null;
        this.errorHandler = null;
        this.enhancedErrorHandler = null;
        
        this.initializeComponents();
    }

    /**
     * Initialize validation and error handling components
     */
    initializeComponents() {
        try {
            // Initialize content validator
            if (this.options.enableValidation && window.ContentValidator) {
                this.contentValidator = new ContentValidator({
                    strictMode: false,
                    maxContentLength: 2000000, // 2MB for exports
                    maxImageSize: 10 * 1024 * 1024 // 10MB for export images
                });
            }
            
            // Initialize export error handler
            if (this.options.enableErrorHandling && window.ExportErrorHandler) {
                this.errorHandler = new ExportErrorHandler({
                    maxRetries: 3,
                    retryDelay: 2000,
                    exponentialBackoff: true,
                    showUserNotifications: this.options.showUserFeedback
                });
            }
            
            // Get enhanced error handler if available
            this.enhancedErrorHandler = window.enhancedErrorHandler || null;
            
        } catch (error) {
            console.warn('Failed to initialize validation components:', error);
        }
    }

    /**
     * Validate and export content with comprehensive error handling
     * @param {HTMLElement|string} content - Content to export
     * @param {string} format - Export format ('pdf', 'word')
     * @param {Object} options - Export options
     * @returns {Promise<Object>} Export result
     */
    async validateAndExport(content, format, options = {}) {
        const exportResult = {
            success: false,
            format: format,
            validationResult: null,
            errorInfo: null,
            warnings: [],
            exportTime: null,
            retryCount: 0,
            fallbackUsed: null
        };

        const startTime = Date.now();
        let progressId = null;

        try {
            // Show progress indicator
            if (this.options.enableProgressTracking && this.enhancedErrorHandler) {
                progressId = this.enhancedErrorHandler.showProgress(
                    `Preparing ${format.toUpperCase()} export...`,
                    {
                        steps: [
                            'Validating content',
                            'Processing content',
                            'Generating document',
                            'Finalizing export'
                        ],
                        estimatedTime: '30-60 seconds'
                    }
                );
            }

            // Step 1: Validate content
            if (this.contentValidator) {
                if (progressId) {
                    this.enhancedErrorHandler.updateProgress(progressId, 'Validating content...', 0);
                }

                exportResult.validationResult = await this.contentValidator.validateContent(content, {
                    format: format,
                    ...options
                });

                if (!exportResult.validationResult.isValid) {
                    throw this.createValidationError(exportResult.validationResult);
                }

                // Collect warnings
                exportResult.warnings = exportResult.validationResult.warnings;
            }

            // Step 2: Get appropriate export manager
            if (progressId) {
                this.enhancedErrorHandler.updateProgress(progressId, 'Initializing export manager...', 1);
            }

            const exportManager = this.getExportManager(format);
            if (!exportManager) {
                throw new Error(`Export manager not available for format: ${format}`);
            }

            // Step 3: Perform export with error handling
            if (progressId) {
                this.enhancedErrorHandler.updateProgress(progressId, 'Generating document...', 2);
            }

            const exportSuccess = await this.performExportWithErrorHandling(
                exportManager,
                content,
                format,
                options,
                exportResult
            );

            if (progressId) {
                this.enhancedErrorHandler.updateProgress(progressId, 'Finalizing export...', 3);
            }

            exportResult.success = exportSuccess;
            exportResult.exportTime = Date.now() - startTime;

            // Show success message
            if (exportResult.success && this.options.showUserFeedback) {
                this.showSuccessMessage(format, exportResult);
            }

        } catch (error) {
            console.error('Export validation and processing failed:', error);
            exportResult.errorInfo = {
                message: error.message,
                type: error.name || 'ExportError',
                stack: error.stack
            };

            // Handle the error through error handler if available
            if (this.errorHandler) {
                const errorHandlingResult = await this.errorHandler.handleExportError(
                    error,
                    { format, content, ...options },
                    null // No retry function at this level
                );

                if (errorHandlingResult.success) {
                    exportResult.success = true;
                    exportResult.fallbackUsed = errorHandlingResult.fallbackUsed;
                    exportResult.retryCount = errorHandlingResult.retriesUsed || 0;
                }
            }

        } finally {
            // Hide progress indicator
            if (progressId && this.enhancedErrorHandler) {
                this.enhancedErrorHandler.hideProgress(progressId);
            }
        }

        return exportResult;
    }  
  /**
     * Perform export with comprehensive error handling
     * @param {Object} exportManager - Export manager instance
     * @param {HTMLElement|string} content - Content to export
     * @param {string} format - Export format
     * @param {Object} options - Export options
     * @param {Object} exportResult - Export result object to update
     * @returns {Promise<boolean>} Success status
     */
    async performExportWithErrorHandling(exportManager, content, format, options, exportResult) {
        const exportContext = {
            format: format,
            content: content,
            ...options
        };

        const retryFunction = async (retryContext) => {
            if (format === 'pdf' && exportManager.performPDFExport) {
                return await exportManager.performPDFExport(retryContext.content, retryContext);
            } else if (format === 'word' && exportManager.performWordExport) {
                return await exportManager.performWordExport(retryContext.content, retryContext);
            } else {
                // Fallback to main export method
                return await exportManager[`exportTo${format.charAt(0).toUpperCase() + format.slice(1)}`](
                    retryContext.content, 
                    retryContext
                );
            }
        };

        try {
            // Try the main export method
            if (format === 'pdf') {
                return await exportManager.exportToPDF(content, options);
            } else if (format === 'word') {
                return await exportManager.exportToWord(content, options);
            } else {
                throw new Error(`Unsupported export format: ${format}`);
            }

        } catch (error) {
            console.warn('Primary export method failed, attempting error recovery:', error);

            if (this.errorHandler) {
                const errorResult = await this.errorHandler.handleExportError(
                    error,
                    exportContext,
                    retryFunction
                );

                if (errorResult.success) {
                    exportResult.retryCount = errorResult.retriesUsed || 0;
                    exportResult.fallbackUsed = errorResult.fallbackUsed;
                    return true;
                }
            }

            throw error;
        }
    }

    /**
     * Get appropriate export manager for format
     * @param {string} format - Export format
     * @returns {Object|null} Export manager instance
     */
    getExportManager(format) {
        switch (format.toLowerCase()) {
            case 'pdf':
                return window.PDFExportManager ? new PDFExportManager() : null;
            case 'word':
            case 'docx':
                return window.WordExportManager ? new WordExportManager() : null;
            default:
                return null;
        }
    }

    /**
     * Create validation error from validation result
     * @param {Object} validationResult - Validation result
     * @returns {Error} Validation error
     */
    createValidationError(validationResult) {
        const errorMessages = validationResult.errors.map(error => error.message);
        const error = new Error(`Content validation failed: ${errorMessages.join('; ')}`);
        error.name = 'ValidationError';
        error.validationResult = validationResult;
        return error;
    }

    /**
     * Show success message to user
     * @param {string} format - Export format
     * @param {Object} exportResult - Export result
     */
    showSuccessMessage(format, exportResult) {
        let message = `${format.toUpperCase()} export completed successfully!`;
        
        if (exportResult.retryCount > 0) {
            message += ` (After ${exportResult.retryCount} retry${exportResult.retryCount > 1 ? 'ies' : ''})`;
        }
        
        if (exportResult.fallbackUsed) {
            message += ` (Using ${exportResult.fallbackUsed} method)`;
        }

        const details = [];
        if (exportResult.exportTime) {
            details.push(`Export time: ${(exportResult.exportTime / 1000).toFixed(1)}s`);
        }
        if (exportResult.warnings.length > 0) {
            details.push(`${exportResult.warnings.length} warning(s)`);
        }

        if (this.enhancedErrorHandler) {
            this.enhancedErrorHandler.showNotification(
                message,
                'success',
                5000,
                {
                    userActions: details.length > 0 ? details : undefined
                }
            );
        } else {
            console.log(message, details);
        }
    }

    /**
     * Create export button with integrated validation and error handling
     * @param {string} format - Export format ('pdf', 'word')
     * @param {Object} options - Button options
     * @returns {HTMLElement} Export button
     */
    createValidatedExportButton(format, options = {}) {
        const button = document.createElement('button');
        button.className = options.className || `btn btn-primary export-${format}-btn`;
        
        const formatUpper = format.toUpperCase();
        button.innerHTML = `
            <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14,2 14,8 20,8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            Export ${formatUpper}
        `;

        button.addEventListener('click', async () => {
            if (button.disabled) return;

            // Show loading state
            const originalHTML = button.innerHTML;
            button.innerHTML = `
                <svg class="icon animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
                Generating ${formatUpper}...
            `;
            button.disabled = true;

            try {
                // Get content from options or default selector
                const content = options.getContent ? 
                    options.getContent() : 
                    document.querySelector('.results-preview, .editor-content, .document-content');

                if (!content) {
                    throw new Error('No content found to export');
                }

                // Perform validated export
                const exportResult = await this.validateAndExport(content, format, options);

                if (exportResult.success) {
                    // Show success state
                    button.innerHTML = `
                        <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 6L9 17l-5-5"/>
                        </svg>
                        ${formatUpper} Generated!
                    `;

                    setTimeout(() => {
                        button.innerHTML = originalHTML;
                    }, 3000);
                } else {
                    throw new Error(exportResult.errorInfo?.message || 'Export failed');
                }

            } catch (error) {
                console.error(`${formatUpper} export failed:`, error);
                
                // Show error state
                button.innerHTML = `
                    <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                    Export Failed
                `;

                setTimeout(() => {
                    button.innerHTML = originalHTML;
                }, 3000);

            } finally {
                button.disabled = false;
            }
        });

        return button;
    }

    /**
     * Validate content and show validation results to user
     * @param {HTMLElement|string} content - Content to validate
     * @param {Object} options - Validation options
     * @returns {Promise<Object>} Validation result
     */
    async validateContentForUser(content, options = {}) {
        if (!this.contentValidator) {
            console.warn('Content validator not available');
            return { isValid: true, errors: [], warnings: [] };
        }

        const validationResult = await this.contentValidator.validateContent(content, options);
        
        // Show validation results to user
        if (this.enhancedErrorHandler && (validationResult.errors.length > 0 || validationResult.warnings.length > 0)) {
            const summary = this.contentValidator.getValidationSummary(validationResult);
            
            let message = 'Content validation completed.';
            let type = 'info';
            
            if (summary.errorCount > 0) {
                message = `Found ${summary.errorCount} error(s) that must be fixed before export.`;
                type = 'error';
            } else if (summary.warningCount > 0) {
                message = `Found ${summary.warningCount} warning(s). Export can proceed but may have issues.`;
                type = 'warning';
            }

            const userActions = [
                ...validationResult.errors.map(error => `Error: ${error.message}`),
                ...validationResult.warnings.map(warning => `Warning: ${warning.message}`)
            ].slice(0, 5); // Limit to first 5 issues

            if (validationResult.errors.length + validationResult.warnings.length > 5) {
                userActions.push(`... and ${validationResult.errors.length + validationResult.warnings.length - 5} more issues`);
            }

            this.enhancedErrorHandler.showNotification(
                message,
                type,
                type === 'error' ? 0 : 8000,
                {
                    userActions: userActions.length > 0 ? userActions : undefined
                }
            );
        }

        return validationResult;
    }

    /**
     * Get validation and error handling statistics
     * @returns {Object} Statistics
     */
    getStatistics() {
        const stats = {
            validationEnabled: !!this.contentValidator,
            errorHandlingEnabled: !!this.errorHandler,
            componentsInitialized: {
                contentValidator: !!this.contentValidator,
                errorHandler: !!this.errorHandler,
                enhancedErrorHandler: !!this.enhancedErrorHandler
            }
        };

        if (this.errorHandler) {
            stats.errorStatistics = this.errorHandler.getErrorStatistics();
        }

        return stats;
    }

    /**
     * Reset validation and error handling state
     */
    reset() {
        if (this.errorHandler) {
            this.errorHandler.clearErrorHistory();
        }
        
        console.log('Export validation integration reset');
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExportValidationIntegration;
} else if (typeof window !== 'undefined') {
    window.ExportValidationIntegration = ExportValidationIntegration;
}