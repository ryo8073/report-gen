/**
 * Prompt Template Manager
 * Ensures reports always use the latest prompt templates
 * Addresses the critical issue of reports not reflecting current prompts
 */

class PromptTemplateManager {
    constructor() {
        this.templates = new Map();
        this.loadedTemplates = new Set();
        this.templateCache = new Map();
        this.lastLoadTime = new Map();
        this.templateModTimes = new Map(); // Track file modification times
        this.cacheTimeout = 30000; // 30 seconds cache timeout to ensure freshness
        
        // Template file mappings
        this.templateFiles = {
            'jp_investment_4part': '/PROMPTS/jp_investment_4part.md',
            'jp_tax_strategy': '/PROMPTS/jp_tax_strategy.md', 
            'jp_inheritance_strategy': '/PROMPTS/jp_inheritance_strategy.md',
            'comparison_analysis': '/PROMPTS/comparison_analysis.md',
            'custom': null // Custom prompts are user-provided
        };
        
        console.log('PromptTemplateManager initialized');
    }
    
    /**
     * Load a template with cache invalidation to ensure freshness
     * @param {string} templateName - Name of the template to load
     * @returns {Promise<string>} Template content
     */
    async loadTemplate(templateName) {
        try {
            console.log(`Loading template: ${templateName}`);
            
            // Check template freshness using modification time
            const templateFile = this.templateFiles[templateName];
            if (!templateFile) {
                throw new Error(`No template file defined for: ${templateName}`);
            }
            
            const filePath = `.${templateFile}`;
            const currentModTime = await this.getFileModificationTime(filePath);
            const cachedModTime = this.templateModTimes.get(templateName);
            const lastLoad = this.lastLoadTime.get(templateName);
            const now = Date.now();
            
            // Determine if we need to reload
            const fileModified = cachedModTime && currentModTime > cachedModTime;
            const cacheExpired = !lastLoad || (now - lastLoad) > this.cacheTimeout;
            const notCached = !this.templateCache.has(templateName);
            const shouldReload = fileModified || cacheExpired || notCached;
            
            if (shouldReload) {
                if (fileModified) {
                    console.log(`Template file modified, reloading: ${templateName} (mod time: ${new Date(currentModTime).toISOString()})`);
                } else if (cacheExpired) {
                    console.log(`Cache expired, reloading: ${templateName}`);
                } else {
                    console.log(`Template not cached, loading: ${templateName}`);
                }
                
                const templateContent = await this.fetchTemplate(templateName);
                
                // Cache the template with timestamps
                this.templateCache.set(templateName, templateContent);
                this.lastLoadTime.set(templateName, now);
                this.templateModTimes.set(templateName, currentModTime);
                this.loadedTemplates.add(templateName);
                
                console.log(`Template ${templateName} loaded successfully (${templateContent.length} chars)`);
                return templateContent;
            } else {
                console.log(`Using cached template: ${templateName} (cached at: ${new Date(lastLoad).toISOString()})`);
                return this.templateCache.get(templateName);
            }
        } catch (error) {
            console.error(`Error loading template ${templateName}:`, error);
            return this.getFallbackTemplate(templateName);
        }
    }
    
    /**
     * Get file modification time for freshness checking
     * @param {string} filePath - Path to the template file
     * @returns {Promise<number>} Modification time in milliseconds
     */
    async getFileModificationTime(filePath) {
        try {
            // For browser environment, we'll use HEAD request to get Last-Modified header
            const response = await fetch(filePath, { method: 'HEAD' });
            
            if (response.ok) {
                const lastModified = response.headers.get('Last-Modified');
                if (lastModified) {
                    const modTime = new Date(lastModified).getTime();
                    console.log(`File modification time for ${filePath}: ${new Date(modTime).toISOString()}`);
                    return modTime;
                }
            }
            
            // Fallback: use current time to force reload if we can't get mod time
            console.log(`Could not get modification time for ${filePath}, using current time`);
            return Date.now();
        } catch (error) {
            console.warn(`Error getting modification time for ${filePath}:`, error.message);
            // Return current time to force reload on error
            return Date.now();
        }
    }

    /**
     * Fetch template from file system
     * @param {string} templateName - Template name
     * @returns {Promise<string>} Template content
     */
    async fetchTemplate(templateName) {
        const templateFile = this.templateFiles[templateName];
        
        if (!templateFile) {
            throw new Error(`No template file defined for: ${templateName}`);
        }
        
        // Add cache-busting parameter to ensure fresh content
        const cacheBuster = `?t=${Date.now()}`;
        const response = await fetch(templateFile + cacheBuster);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch template: ${response.status} ${response.statusText}`);
        }
        
        const content = await response.text();
        
        if (!content || content.trim().length === 0) {
            throw new Error(`Template ${templateName} is empty`);
        }
        
        return content;
    }
    
    /**
     * Validate template structure and content
     * @param {string} template - Template content
     * @param {string} templateName - Template name for logging
     * @returns {boolean} Whether template is valid
     */
    validateTemplate(template, templateName) {
        try {
            if (!template || typeof template !== 'string') {
                console.error(`Template ${templateName} is not a valid string`);
                return false;
            }
            
            if (template.trim().length === 0) {
                console.error(`Template ${templateName} is empty`);
                return false;
            }
            
            // Check for basic template structure
            const hasInstructions = template.includes('分析') || template.includes('レポート') || template.includes('投資');
            if (!hasInstructions) {
                console.warn(`Template ${templateName} may not contain proper instructions`);
            }
            
            console.log(`Template ${templateName} validation passed`);
            return true;
        } catch (error) {
            console.error(`Template validation error for ${templateName}:`, error);
            return false;
        }
    }
    
    /**
     * Apply template with user data
     * @param {string} templateName - Template name
     * @param {Object} userData - User input data
     * @returns {Promise<Object>} Processed template with validation info
     */
    async applyTemplate(templateName, userData) {
        const applicationResult = {
            templateName,
            timestamp: new Date().toISOString(),
            success: false,
            template: null,
            debugInfo: null,
            validation: null,
            error: null
        };

        try {
            console.log(`Applying template ${templateName} with user data`);
            
            // Generate debug information
            applicationResult.debugInfo = this.generateDebugInfo(templateName, userData);
            
            // Load the latest template
            const template = await this.loadTemplate(templateName);
            
            // Validate template structure
            const templateValidation = this.validateTemplate(template, templateName);
            if (!templateValidation) {
                throw new Error(`Template ${templateName} validation failed`);
            }
            
            // Store template and validation info
            applicationResult.template = template;
            applicationResult.validation = {
                templateStructure: this.extractTemplateStructure(template),
                isValid: templateValidation,
                timestamp: new Date().toISOString()
            };
            
            applicationResult.success = true;
            console.log(`Template ${templateName} applied successfully (${template.length} chars)`);
            
            // Log template application for debugging
            console.log(`[TEMPLATE DEBUG] ${templateName}:`, {
                templateLength: template.length,
                hasStructure: applicationResult.validation.templateStructure.isComplete,
                cacheStatus: applicationResult.debugInfo.templateStatus,
                inputSummary: applicationResult.debugInfo.inputSummary
            });
            
            return applicationResult;
            
        } catch (error) {
            console.error(`Error applying template ${templateName}:`, error);
            applicationResult.error = error.message;
            
            // Try fallback template
            try {
                const fallbackTemplate = this.getFallbackTemplate(templateName);
                applicationResult.template = fallbackTemplate;
                applicationResult.success = true;
                applicationResult.validation = {
                    templateStructure: this.extractTemplateStructure(fallbackTemplate),
                    isValid: true,
                    isFallback: true,
                    timestamp: new Date().toISOString()
                };
                console.log(`Using fallback template for ${templateName}`);
            } catch (fallbackError) {
                applicationResult.error = `Primary error: ${error.message}, Fallback error: ${fallbackError.message}`;
            }
            
            return applicationResult;
        }
    }
    
    /**
     * Get fallback template for error cases
     * @param {string} templateName - Template name
     * @returns {string} Fallback template
     */
    getFallbackTemplate(templateName) {
        const fallbacks = {
            'jp_investment_4part': `# 投資分析レポート

## 概要
投資機会の詳細な分析を行います。

## 分析項目
1. 財務分析
2. リスク評価  
3. 市場分析
4. 推奨事項

提供された情報を基に、包括的な投資分析レポートを作成してください。`,

            'jp_inheritance_strategy': `# 相続対策戦略レポート

## 概要
相続対策の包括的な戦略を提案します。

## 分析項目
1. 現在の資産状況
2. 相続税試算
3. 対策提案
4. 実行計画

提供された情報を基に、効果的な相続対策戦略を提案してください。`,

            'jp_tax_strategy': `# 税務戦略レポート

## 概要
税務最適化の戦略を提案します。

## 分析項目
1. 現在の税務状況
2. 節税機会の特定
3. 戦略提案
4. 実行計画

提供された情報を基に、効果的な税務戦略を提案してください。`,

            'comparison_analysis': `# 比較分析レポート

## 概要
複数の選択肢を比較分析します。

## 分析項目
1. 各選択肢の特徴
2. 比較評価
3. 優劣分析
4. 推奨事項

提供された情報を基に、詳細な比較分析を行ってください。`
        };
        
        const fallback = fallbacks[templateName] || `# ${templateName} レポート

提供された情報を基に、詳細な分析レポートを作成してください。`;
        
        console.log(`Using fallback template for ${templateName}`);
        return fallback;
    }
    
    /**
     * Clear template cache to force reload
     * @param {string} templateName - Optional specific template to clear
     */
    clearCache(templateName = null) {
        if (templateName) {
            this.templateCache.delete(templateName);
            this.lastLoadTime.delete(templateName);
            this.templateModTimes.delete(templateName);
            console.log(`Cache cleared for template: ${templateName}`);
        } else {
            this.templateCache.clear();
            this.lastLoadTime.clear();
            this.templateModTimes.clear();
            console.log('All template cache cleared');
        }
    }
    
    /**
     * Get template loading status
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            loadedTemplates: Array.from(this.loadedTemplates),
            cachedTemplates: Array.from(this.templateCache.keys()),
            cacheTimeout: this.cacheTimeout,
            lastLoadTimes: Object.fromEntries(this.lastLoadTime),
            templateModTimes: Object.fromEntries(this.templateModTimes)
        };
    }
    
    /**
     * Force reload of all templates
     * @returns {Promise<void>}
     */
    async reloadAllTemplates() {
        console.log('Reloading all templates...');
        this.clearCache();
        
        const templateNames = Object.keys(this.templateFiles).filter(name => name !== 'custom');
        const loadPromises = templateNames.map(name => this.loadTemplate(name));
        
        try {
            await Promise.all(loadPromises);
            console.log('All templates reloaded successfully');
        } catch (error) {
            console.error('Error reloading templates:', error);
        }
    }

    /**
     * Check for template updates and reload if necessary
     * @returns {Promise<Object>} Update status for each template
     */
    async checkForUpdates() {
        console.log('Checking for template updates...');
        const updateStatus = {};
        
        const templateNames = Object.keys(this.templateFiles).filter(name => name !== 'custom');
        
        for (const templateName of templateNames) {
            try {
                const templateFile = this.templateFiles[templateName];
                if (!templateFile) continue;
                
                const filePath = `.${templateFile}`;
                const currentModTime = await this.getFileModificationTime(filePath);
                const cachedModTime = this.templateModTimes.get(templateName);
                
                const isUpdated = !cachedModTime || currentModTime > cachedModTime;
                
                updateStatus[templateName] = {
                    hasUpdate: isUpdated,
                    currentModTime: new Date(currentModTime).toISOString(),
                    cachedModTime: cachedModTime ? new Date(cachedModTime).toISOString() : null,
                    filePath: templateFile
                };
                
                if (isUpdated) {
                    console.log(`Template update detected: ${templateName}`);
                    // Force reload by clearing cache for this template
                    this.clearCache(templateName);
                    await this.loadTemplate(templateName);
                    updateStatus[templateName].reloaded = true;
                }
            } catch (error) {
                console.error(`Error checking updates for ${templateName}:`, error);
                updateStatus[templateName] = {
                    hasUpdate: false,
                    error: error.message
                };
            }
        }
        
        const updatedCount = Object.values(updateStatus).filter(status => status.hasUpdate).length;
        console.log(`Template update check complete: ${updatedCount} templates updated`);
        
        return updateStatus;
    }

    /**
     * Get template freshness information
     * @returns {Object} Freshness status for all templates
     */
    getTemplateFreshness() {
        const freshness = {};
        const now = Date.now();
        
        for (const templateName of Object.keys(this.templateFiles)) {
            if (templateName === 'custom') continue;
            
            const lastLoad = this.lastLoadTime.get(templateName);
            const modTime = this.templateModTimes.get(templateName);
            const isCached = this.templateCache.has(templateName);
            
            freshness[templateName] = {
                isCached,
                lastLoadTime: lastLoad ? new Date(lastLoad).toISOString() : null,
                modificationTime: modTime ? new Date(modTime).toISOString() : null,
                cacheAge: lastLoad ? now - lastLoad : null,
                isExpired: lastLoad ? (now - lastLoad) > this.cacheTimeout : true,
                needsReload: !isCached || !lastLoad || (now - lastLoad) > this.cacheTimeout
            };
        }
        
        return freshness;
    }

    /**
     * Extract template structure from template content
     * @param {string} templateContent - The template content
     * @returns {Object} Template structure information
     */
    extractTemplateStructure(templateContent) {
        if (!templateContent || typeof templateContent !== 'string') {
            return { valid: false, error: 'Invalid template content' };
        }

        const structure = {
            valid: true,
            sections: [],
            requirements: [],
            outputFormat: null,
            qualityChecklist: [],
            hasMetadata: false,
            metadata: {}
        };

        try {
            const lines = templateContent.split('\n');
            let currentSection = null;
            let inMetadata = false;
            let metadataEndFound = false;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                // Check for YAML frontmatter
                if (i === 0 && line === '---') {
                    inMetadata = true;
                    structure.hasMetadata = true;
                    continue;
                }

                if (inMetadata && line === '---') {
                    inMetadata = false;
                    metadataEndFound = true;
                    continue;
                }

                if (inMetadata) {
                    // Parse metadata
                    const colonIndex = line.indexOf(':');
                    if (colonIndex > -1) {
                        const key = line.substring(0, colonIndex).trim();
                        let value = line.substring(colonIndex + 1).trim();
                        
                        // Remove quotes
                        if ((value.startsWith('"') && value.endsWith('"')) || 
                            (value.startsWith("'") && value.endsWith("'"))) {
                            value = value.slice(1, -1);
                        }
                        
                        structure.metadata[key] = value;
                    }
                    continue;
                }

                // Skip metadata processing if we're still in it
                if (inMetadata) continue;

                // Extract sections (headers)
                if (line.startsWith('#')) {
                    const level = (line.match(/^#+/) || [''])[0].length;
                    const title = line.replace(/^#+\s*/, '');
                    
                    currentSection = {
                        level,
                        title,
                        line: i + 1,
                        content: []
                    };
                    structure.sections.push(currentSection);
                }

                // Extract requirements
                if (line.includes('Requirements:') || line.includes('要件:') || line.includes('_Requirements:')) {
                    const reqMatch = line.match(/_Requirements?:\s*(.+)/);
                    if (reqMatch) {
                        structure.requirements.push(reqMatch[1].trim());
                    }
                }

                // Extract output format information
                if (line.includes('出力形式') || line.includes('Output Format') || line.includes('出力要件')) {
                    structure.outputFormat = {
                        line: i + 1,
                        content: line
                    };
                }

                // Extract quality checklist items
                if (line.includes('- [ ]') && (line.includes('品質') || line.includes('Quality') || line.includes('チェック'))) {
                    structure.qualityChecklist.push({
                        line: i + 1,
                        item: line.replace(/- \[ \]\s*/, '')
                    });
                }

                // Add content to current section
                if (currentSection && line) {
                    currentSection.content.push(line);
                }
            }

            // Validate structure completeness
            structure.hasExecutiveSummary = structure.sections.some(s => 
                s.title.includes('Executive Summary') || s.title.includes('概要') || s.title.includes('サマリ'));
            
            structure.hasBenefits = structure.sections.some(s => 
                s.title.includes('Benefits') || s.title.includes('優位性') || s.title.includes('メリット'));
            
            structure.hasRisks = structure.sections.some(s => 
                s.title.includes('Risks') || s.title.includes('リスク') || s.title.includes('注意'));
            
            structure.hasEvidence = structure.sections.some(s => 
                s.title.includes('Evidence') || s.title.includes('証拠') || s.title.includes('データ'));

            // Calculate completeness score
            const completenessFactors = [
                structure.hasExecutiveSummary,
                structure.hasBenefits, 
                structure.hasRisks,
                structure.hasEvidence,
                structure.outputFormat !== null,
                structure.requirements.length > 0
            ];
            
            structure.completenessScore = completenessFactors.filter(Boolean).length / completenessFactors.length;
            structure.isComplete = structure.completenessScore >= 0.7; // 70% threshold

        } catch (error) {
            structure.valid = false;
            structure.error = error.message;
        }

        return structure;
    }

    /**
     * Validate that a generated report matches the template structure
     * @param {string} reportContent - The generated report content
     * @param {string} templateName - Name of the template used
     * @returns {Object} Validation results
     */
    validateReportStructure(reportContent, templateName) {
        console.log(`Validating report structure against template: ${templateName}`);
        
        const validation = {
            templateName,
            timestamp: new Date().toISOString(),
            valid: true,
            score: 0,
            issues: [],
            matches: [],
            templateStructure: null,
            reportStructure: null
        };

        try {
            // Get template structure
            const template = this.templateCache.get(templateName);
            if (!template) {
                validation.valid = false;
                validation.issues.push('Template not found in cache');
                return validation;
            }

            validation.templateStructure = this.extractTemplateStructure(template);
            validation.reportStructure = this.extractReportStructure(reportContent);

            // Check for required sections
            const requiredSections = ['Executive Summary', 'Benefits', 'Risks', 'Evidence'];
            const reportSections = validation.reportStructure.sections.map(s => s.title);

            for (const required of requiredSections) {
                const found = reportSections.some(title => 
                    title.includes(required) || 
                    this.translateSectionName(required).some(translated => title.includes(translated))
                );

                if (found) {
                    validation.matches.push(`Required section found: ${required}`);
                    validation.score += 0.25; // Each section worth 25%
                } else {
                    validation.issues.push(`Missing required section: ${required}`);
                }
            }

            // Check for template-specific requirements
            if (validation.templateStructure.requirements.length > 0) {
                const reqMatches = this.validateRequirements(reportContent, validation.templateStructure.requirements);
                validation.matches.push(...reqMatches.matches);
                validation.issues.push(...reqMatches.issues);
                validation.score += reqMatches.score * 0.2; // Requirements worth 20%
            }

            // Check for proper formatting
            const formatValidation = this.validateReportFormat(reportContent);
            validation.matches.push(...formatValidation.matches);
            validation.issues.push(...formatValidation.issues);
            validation.score += formatValidation.score * 0.1; // Format worth 10%

            // Final validation
            validation.valid = validation.score >= 0.7 && validation.issues.length === 0;
            validation.score = Math.min(validation.score, 1.0); // Cap at 100%

            console.log(`Report validation complete: ${(validation.score * 100).toFixed(1)}% match, ${validation.issues.length} issues`);

        } catch (error) {
            validation.valid = false;
            validation.error = error.message;
            validation.issues.push(`Validation error: ${error.message}`);
        }

        return validation;
    }

    /**
     * Extract structure from generated report content
     * @param {string} reportContent - The report content
     * @returns {Object} Report structure
     */
    extractReportStructure(reportContent) {
        const structure = {
            sections: [],
            hasHeaders: false,
            hasLists: false,
            hasNumbers: false,
            wordCount: 0
        };

        if (!reportContent) return structure;

        const lines = reportContent.split('\n');
        structure.wordCount = reportContent.split(/\s+/).length;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Extract headers
            if (line.startsWith('#')) {
                const level = (line.match(/^#+/) || [''])[0].length;
                const title = line.replace(/^#+\s*/, '');
                
                structure.sections.push({
                    level,
                    title,
                    line: i + 1
                });
                structure.hasHeaders = true;
            }

            // Check for lists
            if (line.startsWith('-') || line.startsWith('*') || line.match(/^\d+\./)) {
                structure.hasLists = true;
            }

            // Check for numbers (financial data)
            if (line.match(/\d+[,.]?\d*[%円¥$]/)) {
                structure.hasNumbers = true;
            }
        }

        return structure;
    }

    /**
     * Translate section names between languages
     * @param {string} sectionName - Section name to translate
     * @returns {Array} Array of possible translations
     */
    translateSectionName(sectionName) {
        const translations = {
            'Executive Summary': ['概要', 'エグゼクティブサマリー', '投資概要', 'サマリー'],
            'Benefits': ['優位性', 'メリット', '利点', '投資の優位性'],
            'Risks': ['リスク', '潜在リスク', 'リスク分析', '注意事項'],
            'Evidence': ['証拠', '定量的証拠', 'データ', 'エビデンス']
        };

        return translations[sectionName] || [sectionName];
    }

    /**
     * Validate requirements in report content
     * @param {string} reportContent - The report content
     * @param {Array} requirements - Array of requirements to check
     * @returns {Object} Validation results
     */
    validateRequirements(reportContent, requirements) {
        const result = {
            matches: [],
            issues: [],
            score: 0
        };

        for (const requirement of requirements) {
            // Parse requirement numbers (e.g., "1.1, 1.2, 1.3")
            const reqNumbers = requirement.split(',').map(r => r.trim());
            let found = false;

            for (const reqNum of reqNumbers) {
                if (reportContent.includes(reqNum) || reportContent.includes(`要件${reqNum}`) || reportContent.includes(`Requirement ${reqNum}`)) {
                    found = true;
                    break;
                }
            }

            if (found) {
                result.matches.push(`Requirement reference found: ${requirement}`);
                result.score += 1 / requirements.length;
            } else {
                result.issues.push(`Missing requirement reference: ${requirement}`);
            }
        }

        return result;
    }

    /**
     * Validate report formatting
     * @param {string} reportContent - The report content
     * @returns {Object} Format validation results
     */
    validateReportFormat(reportContent) {
        const result = {
            matches: [],
            issues: [],
            score: 0
        };

        const checks = [
            {
                name: 'Has markdown headers',
                test: () => reportContent.includes('#'),
                weight: 0.3
            },
            {
                name: 'Has structured content',
                test: () => reportContent.includes('##') || reportContent.includes('###'),
                weight: 0.2
            },
            {
                name: 'Has lists or bullets',
                test: () => reportContent.includes('-') || reportContent.includes('*') || /^\d+\./.test(reportContent),
                weight: 0.2
            },
            {
                name: 'Has numerical data',
                test: () => /\d+[,.]?\d*[%円¥$]/.test(reportContent),
                weight: 0.2
            },
            {
                name: 'Adequate length',
                test: () => reportContent.length > 500,
                weight: 0.1
            }
        ];

        for (const check of checks) {
            if (check.test()) {
                result.matches.push(check.name);
                result.score += check.weight;
            } else {
                result.issues.push(`Format issue: ${check.name}`);
            }
        }

        return result;
    }

    /**
     * Generate debugging information for template application
     * @param {string} templateName - Name of the template
     * @param {Object} inputData - Input data used
     * @returns {Object} Debug information
     */
    generateDebugInfo(templateName, inputData = {}) {
        const debugInfo = {
            timestamp: new Date().toISOString(),
            templateName,
            templateStatus: {},
            inputSummary: {},
            cacheStatus: {},
            validationResults: {}
        };

        try {
            // Template status
            debugInfo.templateStatus = {
                exists: this.templateCache.has(templateName),
                lastLoaded: this.lastLoadTime.get(templateName) ? new Date(this.lastLoadTime.get(templateName)).toISOString() : null,
                modificationTime: this.templateModTimes.get(templateName) ? new Date(this.templateModTimes.get(templateName)).toISOString() : null,
                cacheAge: this.lastLoadTime.get(templateName) ? Date.now() - this.lastLoadTime.get(templateName) : null,
                isExpired: this.lastLoadTime.get(templateName) ? (Date.now() - this.lastLoadTime.get(templateName)) > this.cacheTimeout : true
            };

            // Input summary
            debugInfo.inputSummary = {
                hasInputText: !!(inputData.inputText && inputData.inputText.trim()),
                inputLength: inputData.inputText ? inputData.inputText.length : 0,
                hasFiles: !!(inputData.files && inputData.files.length > 0),
                fileCount: inputData.files ? inputData.files.length : 0,
                hasAdditionalInfo: !!(inputData.additionalInfo && Object.keys(inputData.additionalInfo).length > 0)
            };

            // Cache status
            debugInfo.cacheStatus = {
                totalCached: this.templateCache.size,
                cacheTimeout: this.cacheTimeout,
                loadedTemplates: Array.from(this.loadedTemplates)
            };

            // Template validation
            const template = this.templateCache.get(templateName);
            if (template) {
                debugInfo.validationResults = this.validateTemplate(template, templateName);
                debugInfo.templateStructure = this.extractTemplateStructure(template);
            }

        } catch (error) {
            debugInfo.error = error.message;
        }

        return debugInfo;
    }

    /**
     * Validate a generated report against its template
     * @param {string} reportContent - The generated report content
     * @param {string} templateName - Name of the template used
     * @param {Object} generationMetadata - Metadata from report generation
     * @returns {Object} Comprehensive validation results
     */
    validateGeneratedReport(reportContent, templateName, generationMetadata = {}) {
        console.log(`Validating generated report against template: ${templateName}`);
        
        const validation = {
            templateName,
            timestamp: new Date().toISOString(),
            reportLength: reportContent ? reportContent.length : 0,
            generationMetadata,
            structureValidation: null,
            contentValidation: null,
            qualityScore: 0,
            issues: [],
            recommendations: [],
            debugInfo: null,
            success: false
        };

        try {
            // Generate debug info
            validation.debugInfo = this.generateDebugInfo(templateName, generationMetadata);

            // Validate report structure
            validation.structureValidation = this.validateReportStructure(reportContent, templateName);

            // Validate content quality
            validation.contentValidation = this.validateContentQuality(reportContent, templateName);

            // Calculate overall quality score
            const structureScore = validation.structureValidation.score || 0;
            const contentScore = validation.contentValidation.score || 0;
            validation.qualityScore = (structureScore * 0.6) + (contentScore * 0.4); // Structure weighted more

            // Collect all issues
            validation.issues = [
                ...(validation.structureValidation.issues || []),
                ...(validation.contentValidation.issues || [])
            ];

            // Generate recommendations
            validation.recommendations = this.generateRecommendations(validation);

            // Determine success
            validation.success = validation.qualityScore >= 0.7 && validation.issues.length <= 2;

            console.log(`Report validation complete: ${(validation.qualityScore * 100).toFixed(1)}% quality, ${validation.issues.length} issues`);

        } catch (error) {
            validation.error = error.message;
            validation.issues.push(`Validation error: ${error.message}`);
        }

        return validation;
    }

    /**
     * Validate content quality of generated report
     * @param {string} reportContent - The report content
     * @param {string} templateName - Template name for context
     * @returns {Object} Content validation results
     */
    validateContentQuality(reportContent, templateName) {
        const validation = {
            score: 0,
            issues: [],
            matches: [],
            metrics: {}
        };

        if (!reportContent) {
            validation.issues.push('Report content is empty');
            return validation;
        }

        // Calculate basic metrics
        const words = reportContent.split(/\s+/).filter(word => word.length > 0);
        const sentences = reportContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const paragraphs = reportContent.split(/\n\s*\n/).filter(p => p.trim().length > 0);

        validation.metrics = {
            wordCount: words.length,
            sentenceCount: sentences.length,
            paragraphCount: paragraphs.length,
            avgWordsPerSentence: sentences.length > 0 ? words.length / sentences.length : 0,
            avgSentencesPerParagraph: paragraphs.length > 0 ? sentences.length / paragraphs.length : 0
        };

        // Quality checks
        const qualityChecks = [
            {
                name: 'Adequate length',
                test: () => words.length >= 300,
                weight: 0.2,
                issue: 'Report is too short (less than 300 words)'
            },
            {
                name: 'Has numerical data',
                test: () => /\d+[,.]?\d*[%円¥$]/.test(reportContent),
                weight: 0.2,
                issue: 'Report lacks numerical data or financial figures'
            },
            {
                name: 'Has structured sections',
                test: () => (reportContent.match(/##/g) || []).length >= 3,
                weight: 0.2,
                issue: 'Report lacks proper section structure'
            },
            {
                name: 'Contains analysis keywords',
                test: () => {
                    const keywords = ['分析', '評価', '推奨', 'リスク', '収益', 'analysis', 'evaluation', 'recommendation'];
                    return keywords.some(keyword => reportContent.includes(keyword));
                },
                weight: 0.15,
                issue: 'Report lacks analytical keywords'
            },
            {
                name: 'Has actionable recommendations',
                test: () => {
                    const actionWords = ['推奨', '提案', '実行', '検討', 'recommend', 'suggest', 'implement'];
                    return actionWords.some(word => reportContent.includes(word));
                },
                weight: 0.15,
                issue: 'Report lacks actionable recommendations'
            },
            {
                name: 'Proper sentence structure',
                test: () => validation.metrics.avgWordsPerSentence >= 8 && validation.metrics.avgWordsPerSentence <= 25,
                weight: 0.1,
                issue: 'Sentences are too short or too long'
            }
        ];

        // Run quality checks
        for (const check of qualityChecks) {
            if (check.test()) {
                validation.matches.push(check.name);
                validation.score += check.weight;
            } else {
                validation.issues.push(check.issue);
            }
        }

        return validation;
    }

    /**
     * Generate recommendations based on validation results
     * @param {Object} validation - Validation results
     * @returns {Array} Array of recommendations
     */
    generateRecommendations(validation) {
        const recommendations = [];

        // Structure recommendations
        if (validation.structureValidation && validation.structureValidation.score < 0.8) {
            recommendations.push({
                type: 'structure',
                priority: 'high',
                message: 'Improve report structure by ensuring all required sections are present and properly formatted'
            });
        }

        // Content recommendations
        if (validation.contentValidation && validation.contentValidation.score < 0.7) {
            recommendations.push({
                type: 'content',
                priority: 'medium',
                message: 'Enhance content quality by adding more numerical data and specific recommendations'
            });
        }

        // Length recommendations
        if (validation.contentValidation && validation.contentValidation.metrics.wordCount < 300) {
            recommendations.push({
                type: 'length',
                priority: 'medium',
                message: 'Expand report content to provide more comprehensive analysis'
            });
        }

        // Template freshness recommendations
        if (validation.debugInfo && validation.debugInfo.templateStatus.isExpired) {
            recommendations.push({
                type: 'template',
                priority: 'high',
                message: 'Template cache is expired - ensure latest template version is being used'
            });
        }

        return recommendations;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.PromptTemplateManager = PromptTemplateManager;
}

// Also support module exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PromptTemplateManager;
}