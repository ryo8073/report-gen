/**
 * Content Validator
 * Implements HTML content validation before export
 * Provides comprehensive validation for business documents
 * Requirement 1.5: Content validation and error handling
 */

class ContentValidator {
    constructor(options = {}) {
        this.options = {
            maxContentLength: 1000000, // 1MB max content
            maxImageSize: 5 * 1024 * 1024, // 5MB max image
            maxImages: 50,
            maxTables: 20,
            allowedTags: [
                'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'p', 'div', 'span', 'br', 'hr',
                'strong', 'b', 'em', 'i', 'u', 'mark',
                'ul', 'ol', 'li',
                'table', 'thead', 'tbody', 'tr', 'th', 'td',
                'img', 'a', 'blockquote', 'pre', 'code'
            ],
            allowedAttributes: {
                'img': ['src', 'alt', 'width', 'height', 'data-base64'],
                'a': ['href', 'title', 'target'],
                'table': ['class', 'style'],
                'td': ['colspan', 'rowspan', 'class', 'style'],
                'th': ['colspan', 'rowspan', 'class', 'style'],
                '*': ['class', 'style', 'id']
            },
            strictMode: false,
            ...options
        };
        
        this.validationRules = this.initializeValidationRules();
        this.errorMessages = this.initializeErrorMessages();
    }

    /**
     * Initialize validation rules
     * @returns {Array} Array of validation rule functions
     */
    initializeValidationRules() {
        return [
            this.validateContentLength.bind(this),
            this.validateHTMLStructure.bind(this),
            this.validateImages.bind(this),
            this.validateTables.bind(this),
            this.validateLinks.bind(this),
            this.validateTextContent.bind(this),
            this.validateExportCompatibility.bind(this)
        ];
    }

    /**
     * Initialize error messages
     * @returns {Object} Error message templates
     */
    initializeErrorMessages() {
        return {
            CONTENT_TOO_LARGE: 'Content is too large for export. Maximum size is {maxSize}.',
            INVALID_HTML_STRUCTURE: 'Invalid HTML structure detected: {details}',
            TOO_MANY_IMAGES: 'Too many images in document. Maximum allowed: {maxImages}',
            IMAGE_TOO_LARGE: 'Image "{imageSrc}" is too large. Maximum size: {maxSize}',
            INVALID_IMAGE_FORMAT: 'Unsupported image format: {format}. Supported formats: PNG, JPEG, GIF',
            BROKEN_IMAGE_LINK: 'Broken image link detected: {src}',
            TOO_MANY_TABLES: 'Too many tables in document. Maximum allowed: {maxTables}',
            INVALID_TABLE_STRUCTURE: 'Invalid table structure: {details}',
            BROKEN_LINK: 'Broken link detected: {href}',
            EMPTY_CONTENT: 'Document content is empty or contains only whitespace',
            UNSUPPORTED_TAG: 'Unsupported HTML tag: {tag}',
            UNSUPPORTED_ATTRIBUTE: 'Unsupported attribute "{attribute}" on tag "{tag}"',
            EXPORT_COMPATIBILITY_ISSUE: 'Content may not export correctly: {details}'
        };
    }

    /**
     * Validate HTML content for export
     * @param {HTMLElement|string} content - Content to validate
     * @param {Object} exportOptions - Export options (pdf, word, etc.)
     * @returns {Promise<Object>} Validation result
     */
    async validateContent(content, exportOptions = {}) {
        const validationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: [],
            contentInfo: {}
        };

        try {
            // Prepare content for validation
            const element = await this.prepareContentForValidation(content);
            
            // Gather content information
            validationResult.contentInfo = this.gatherContentInfo(element);
            
            // Run all validation rules
            for (const rule of this.validationRules) {
                try {
                    const ruleResult = await rule(element, exportOptions, validationResult.contentInfo);
                    this.mergeValidationResults(validationResult, ruleResult);
                } catch (ruleError) {
                    console.warn('Validation rule error:', ruleError);
                    validationResult.warnings.push({
                        type: 'VALIDATION_RULE_ERROR',
                        message: `Validation rule failed: ${ruleError.message}`,
                        severity: 'medium'
                    });
                }
            }
            
            // Determine overall validity
            validationResult.isValid = validationResult.errors.length === 0;
            
            // Add export-specific validations
            if (exportOptions.format) {
                const exportValidation = await this.validateForExportFormat(element, exportOptions);
                this.mergeValidationResults(validationResult, exportValidation);
            }
            
        } catch (error) {
            console.error('Content validation failed:', error);
            validationResult.isValid = false;
            validationResult.errors.push({
                type: 'VALIDATION_ERROR',
                message: `Validation failed: ${error.message}`,
                severity: 'high'
            });
        }

        return validationResult;
    }

    /**
     * Prepare content for validation
     * @param {HTMLElement|string} content - Content to prepare
     * @returns {Promise<HTMLElement>} Prepared element
     */
    async prepareContentForValidation(content) {
        let element;
        
        if (typeof content === 'string') {
            element = document.createElement('div');
            element.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            element = content.cloneNode(true);
        } else {
            throw new Error('Invalid content type for validation');
        }

        return element;
    }

    /**
     * Gather content information for validation
     * @param {HTMLElement} element - Content element
     * @returns {Object} Content information
     */
    gatherContentInfo(element) {
        return {
            textLength: element.textContent?.length || 0,
            htmlLength: element.innerHTML?.length || 0,
            imageCount: element.querySelectorAll('img').length,
            tableCount: element.querySelectorAll('table').length,
            linkCount: element.querySelectorAll('a').length,
            headingCount: element.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
            listCount: element.querySelectorAll('ul, ol').length,
            hasComplexFormatting: this.hasComplexFormatting(element)
        };
    }

    /**
     * Check if content has complex formatting
     * @param {HTMLElement} element - Content element
     * @returns {boolean} True if complex formatting detected
     */
    hasComplexFormatting(element) {
        const complexSelectors = [
            'table table', // Nested tables
            '[style*="position"]', // Positioned elements
            '[style*="float"]', // Floated elements
            '.complex-layout', // Complex layout classes
            '[style*="transform"]' // Transformed elements
        ];

        return complexSelectors.some(selector => 
            element.querySelector(selector) !== null
        );
    }

    /**
     * Validate content length
     * @param {HTMLElement} element - Content element
     * @param {Object} exportOptions - Export options
     * @param {Object} contentInfo - Content information
     * @returns {Object} Validation result
     */
    validateContentLength(element, exportOptions, contentInfo) {
        const result = { errors: [], warnings: [], suggestions: [] };
        
        if (contentInfo.htmlLength > this.options.maxContentLength) {
            result.errors.push({
                type: 'CONTENT_TOO_LARGE',
                message: this.formatErrorMessage('CONTENT_TOO_LARGE', {
                    maxSize: this.formatBytes(this.options.maxContentLength)
                }),
                severity: 'high',
                element: element
            });
        }
        
        if (contentInfo.textLength === 0) {
            result.errors.push({
                type: 'EMPTY_CONTENT',
                message: this.errorMessages.EMPTY_CONTENT,
                severity: 'high',
                element: element
            });
        }
        
        return result;
    }

    /**
     * Validate HTML structure
     * @param {HTMLElement} element - Content element
     * @param {Object} exportOptions - Export options
     * @param {Object} contentInfo - Content information
     * @returns {Object} Validation result
     */
    validateHTMLStructure(element, exportOptions, contentInfo) {
        const result = { errors: [], warnings: [], suggestions: [] };
        
        // Check for unsupported tags
        const allElements = element.querySelectorAll('*');
        for (const el of allElements) {
            const tagName = el.tagName.toLowerCase();
            
            if (!this.options.allowedTags.includes(tagName)) {
                if (this.options.strictMode) {
                    result.errors.push({
                        type: 'UNSUPPORTED_TAG',
                        message: this.formatErrorMessage('UNSUPPORTED_TAG', { tag: tagName }),
                        severity: 'medium',
                        element: el
                    });
                } else {
                    result.warnings.push({
                        type: 'UNSUPPORTED_TAG',
                        message: this.formatErrorMessage('UNSUPPORTED_TAG', { tag: tagName }),
                        severity: 'low',
                        element: el
                    });
                }
            }
            
            // Check attributes
            for (const attr of el.attributes) {
                const attrName = attr.name;
                const allowedAttrs = this.options.allowedAttributes[tagName] || this.options.allowedAttributes['*'] || [];
                
                if (!allowedAttrs.includes(attrName)) {
                    result.warnings.push({
                        type: 'UNSUPPORTED_ATTRIBUTE',
                        message: this.formatErrorMessage('UNSUPPORTED_ATTRIBUTE', {
                            attribute: attrName,
                            tag: tagName
                        }),
                        severity: 'low',
                        element: el
                    });
                }
            }
        }
        
        return result;
    }

    /**
     * Validate images in content
     * @param {HTMLElement} element - Content element
     * @param {Object} exportOptions - Export options
     * @param {Object} contentInfo - Content information
     * @returns {Promise<Object>} Validation result
     */
    async validateImages(element, exportOptions, contentInfo) {
        const result = { errors: [], warnings: [], suggestions: [] };
        const images = element.querySelectorAll('img');
        
        if (images.length > this.options.maxImages) {
            result.errors.push({
                type: 'TOO_MANY_IMAGES',
                message: this.formatErrorMessage('TOO_MANY_IMAGES', {
                    maxImages: this.options.maxImages
                }),
                severity: 'high',
                element: element
            });
        }
        
        for (const img of images) {
            await this.validateSingleImage(img, result);
        }
        
        return result;
    }

    /**
     * Validate a single image
     * @param {HTMLImageElement} img - Image element
     * @param {Object} result - Validation result to update
     * @returns {Promise<void>}
     */
    async validateSingleImage(img, result) {
        const src = img.src || img.getAttribute('src');
        
        if (!src) {
            result.errors.push({
                type: 'BROKEN_IMAGE_LINK',
                message: 'Image element missing src attribute',
                severity: 'medium',
                element: img
            });
            return;
        }
        
        // Check image format
        const format = this.getImageFormat(src);
        if (!['png', 'jpeg', 'jpg', 'gif', 'webp'].includes(format)) {
            result.warnings.push({
                type: 'INVALID_IMAGE_FORMAT',
                message: this.formatErrorMessage('INVALID_IMAGE_FORMAT', { format }),
                severity: 'medium',
                element: img
            });
        }
        
        // Check image size for data URLs
        if (src.startsWith('data:')) {
            const size = this.getDataURLSize(src);
            if (size > this.options.maxImageSize) {
                result.errors.push({
                    type: 'IMAGE_TOO_LARGE',
                    message: this.formatErrorMessage('IMAGE_TOO_LARGE', {
                        imageSrc: src.substring(0, 50) + '...',
                        maxSize: this.formatBytes(this.options.maxImageSize)
                    }),
                    severity: 'high',
                    element: img
                });
            }
        }
        
        // Check if image loads (for external URLs)
        if (src.startsWith('http')) {
            try {
                await this.checkImageLoad(src);
            } catch (error) {
                result.warnings.push({
                    type: 'BROKEN_IMAGE_LINK',
                    message: this.formatErrorMessage('BROKEN_IMAGE_LINK', { src }),
                    severity: 'medium',
                    element: img
                });
            }
        }
    }

    /**
     * Validate tables in content
     * @param {HTMLElement} element - Content element
     * @param {Object} exportOptions - Export options
     * @param {Object} contentInfo - Content information
     * @returns {Object} Validation result
     */
    validateTables(element, exportOptions, contentInfo) {
        const result = { errors: [], warnings: [], suggestions: [] };
        const tables = element.querySelectorAll('table');
        
        if (tables.length > this.options.maxTables) {
            result.errors.push({
                type: 'TOO_MANY_TABLES',
                message: this.formatErrorMessage('TOO_MANY_TABLES', {
                    maxTables: this.options.maxTables
                }),
                severity: 'high',
                element: element
            });
        }
        
        for (const table of tables) {
            this.validateSingleTable(table, result);
        }
        
        return result;
    }

    /**
     * Validate a single table
     * @param {HTMLTableElement} table - Table element
     * @param {Object} result - Validation result to update
     */
    validateSingleTable(table, result) {
        const rows = table.querySelectorAll('tr');
        
        if (rows.length === 0) {
            result.errors.push({
                type: 'INVALID_TABLE_STRUCTURE',
                message: this.formatErrorMessage('INVALID_TABLE_STRUCTURE', {
                    details: 'Table has no rows'
                }),
                severity: 'medium',
                element: table
            });
            return;
        }
        
        // Check for consistent column count
        let expectedCols = null;
        for (const row of rows) {
            const cells = row.querySelectorAll('td, th');
            const colCount = Array.from(cells).reduce((count, cell) => {
                return count + (parseInt(cell.getAttribute('colspan')) || 1);
            }, 0);
            
            if (expectedCols === null) {
                expectedCols = colCount;
            } else if (colCount !== expectedCols) {
                result.warnings.push({
                    type: 'INVALID_TABLE_STRUCTURE',
                    message: this.formatErrorMessage('INVALID_TABLE_STRUCTURE', {
                        details: 'Inconsistent column count across rows'
                    }),
                    severity: 'low',
                    element: table
                });
                break;
            }
        }
    }

    /**
     * Validate links in content
     * @param {HTMLElement} element - Content element
     * @param {Object} exportOptions - Export options
     * @param {Object} contentInfo - Content information
     * @returns {Promise<Object>} Validation result
     */
    async validateLinks(element, exportOptions, contentInfo) {
        const result = { errors: [], warnings: [], suggestions: [] };
        const links = element.querySelectorAll('a[href]');
        
        for (const link of links) {
            const href = link.getAttribute('href');
            
            if (!href || href.trim() === '') {
                result.warnings.push({
                    type: 'BROKEN_LINK',
                    message: 'Link element missing or empty href attribute',
                    severity: 'low',
                    element: link
                });
                continue;
            }
            
            // Warn about external links in exports
            if (href.startsWith('http') && exportOptions.format) {
                result.suggestions.push({
                    type: 'EXTERNAL_LINK_WARNING',
                    message: `External link "${href}" may not be clickable in exported document`,
                    severity: 'info',
                    element: link
                });
            }
        }
        
        return result;
    }

    /**
     * Validate text content
     * @param {HTMLElement} element - Content element
     * @param {Object} exportOptions - Export options
     * @param {Object} contentInfo - Content information
     * @returns {Object} Validation result
     */
    validateTextContent(element, exportOptions, contentInfo) {
        const result = { errors: [], warnings: [], suggestions: [] };
        
        // Check for very long paragraphs that might cause layout issues
        const paragraphs = element.querySelectorAll('p');
        for (const p of paragraphs) {
            if (p.textContent.length > 5000) {
                result.suggestions.push({
                    type: 'LONG_PARAGRAPH',
                    message: 'Very long paragraph detected. Consider breaking into smaller paragraphs for better readability.',
                    severity: 'info',
                    element: p
                });
            }
        }
        
        return result;
    }

    /**
     * Validate export compatibility
     * @param {HTMLElement} element - Content element
     * @param {Object} exportOptions - Export options
     * @param {Object} contentInfo - Content information
     * @returns {Object} Validation result
     */
    validateExportCompatibility(element, exportOptions, contentInfo) {
        const result = { errors: [], warnings: [], suggestions: [] };
        
        if (contentInfo.hasComplexFormatting) {
            result.warnings.push({
                type: 'EXPORT_COMPATIBILITY_ISSUE',
                message: this.formatErrorMessage('EXPORT_COMPATIBILITY_ISSUE', {
                    details: 'Complex formatting may not export correctly'
                }),
                severity: 'medium',
                element: element
            });
        }
        
        return result;
    }

    /**
     * Validate content for specific export format
     * @param {HTMLElement} element - Content element
     * @param {Object} exportOptions - Export options
     * @returns {Promise<Object>} Validation result
     */
    async validateForExportFormat(element, exportOptions) {
        const result = { errors: [], warnings: [], suggestions: [] };
        
        switch (exportOptions.format) {
            case 'pdf':
                return this.validateForPDF(element, exportOptions);
            case 'word':
            case 'docx':
                return this.validateForWord(element, exportOptions);
            default:
                return result;
        }
    }

    /**
     * Validate content for PDF export
     * @param {HTMLElement} element - Content element
     * @param {Object} exportOptions - Export options
     * @returns {Object} Validation result
     */
    validateForPDF(element, exportOptions) {
        const result = { errors: [], warnings: [], suggestions: [] };
        
        // Check for elements that don't render well in PDF
        const problematicElements = element.querySelectorAll('iframe, embed, object, video, audio');
        if (problematicElements.length > 0) {
            result.warnings.push({
                type: 'PDF_COMPATIBILITY_ISSUE',
                message: 'Interactive elements (iframe, video, etc.) will not work in PDF export',
                severity: 'medium',
                element: element
            });
        }
        
        return result;
    }

    /**
     * Validate content for Word export
     * @param {HTMLElement} element - Content element
     * @param {Object} exportOptions - Export options
     * @returns {Object} Validation result
     */
    validateForWord(element, exportOptions) {
        const result = { errors: [], warnings: [], suggestions: [] };
        
        // Check for CSS that won't translate to Word
        const elementsWithComplexCSS = element.querySelectorAll('[style*="transform"], [style*="animation"]');
        if (elementsWithComplexCSS.length > 0) {
            result.warnings.push({
                type: 'WORD_COMPATIBILITY_ISSUE',
                message: 'Complex CSS styling may not be preserved in Word export',
                severity: 'low',
                element: element
            });
        }
        
        return result;
    }

    /**
     * Merge validation results
     * @param {Object} target - Target result object
     * @param {Object} source - Source result object
     */
    mergeValidationResults(target, source) {
        target.errors.push(...(source.errors || []));
        target.warnings.push(...(source.warnings || []));
        target.suggestions.push(...(source.suggestions || []));
    }

    /**
     * Format error message with parameters
     * @param {string} messageKey - Message key
     * @param {Object} params - Parameters to substitute
     * @returns {string} Formatted message
     */
    formatErrorMessage(messageKey, params = {}) {
        let message = this.errorMessages[messageKey] || messageKey;
        
        for (const [key, value] of Object.entries(params)) {
            message = message.replace(new RegExp(`{${key}}`, 'g'), value);
        }
        
        return message;
    }

    /**
     * Get image format from URL or data URL
     * @param {string} src - Image source
     * @returns {string} Image format
     */
    getImageFormat(src) {
        if (src.startsWith('data:')) {
            const match = src.match(/data:image\/([^;]+)/);
            return match ? match[1].toLowerCase() : 'unknown';
        }
        
        const extension = src.split('.').pop().toLowerCase();
        return extension;
    }

    /**
     * Get size of data URL in bytes
     * @param {string} dataUrl - Data URL
     * @returns {number} Size in bytes
     */
    getDataURLSize(dataUrl) {
        const base64 = dataUrl.split(',')[1];
        return base64 ? (base64.length * 3) / 4 : 0;
    }

    /**
     * Check if image loads successfully
     * @param {string} src - Image source URL
     * @returns {Promise<void>}
     */
    checkImageLoad(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = reject;
            img.src = src;
            
            // Timeout after 5 seconds
            setTimeout(() => reject(new Error('Image load timeout')), 5000);
        });
    }

    /**
     * Format bytes to human readable string
     * @param {number} bytes - Bytes
     * @returns {string} Formatted string
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Get validation summary
     * @param {Object} validationResult - Validation result
     * @returns {Object} Summary information
     */
    getValidationSummary(validationResult) {
        return {
            isValid: validationResult.isValid,
            totalIssues: validationResult.errors.length + validationResult.warnings.length,
            errorCount: validationResult.errors.length,
            warningCount: validationResult.warnings.length,
            suggestionCount: validationResult.suggestions.length,
            severity: this.getOverallSeverity(validationResult)
        };
    }

    /**
     * Get overall severity level
     * @param {Object} validationResult - Validation result
     * @returns {string} Severity level
     */
    getOverallSeverity(validationResult) {
        if (validationResult.errors.some(e => e.severity === 'high')) return 'high';
        if (validationResult.errors.length > 0) return 'medium';
        if (validationResult.warnings.some(w => w.severity === 'medium')) return 'medium';
        if (validationResult.warnings.length > 0) return 'low';
        return 'none';
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContentValidator;
} else if (typeof window !== 'undefined') {
    window.ContentValidator = ContentValidator;
}