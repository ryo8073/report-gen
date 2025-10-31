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
            
            // Check if we need to reload due to cache timeout
            const lastLoad = this.lastLoadTime.get(templateName);
            const now = Date.now();
            const shouldReload = !lastLoad || (now - lastLoad) > this.cacheTimeout;
            
            if (shouldReload || !this.templateCache.has(templateName)) {
                console.log(`Fetching fresh template: ${templateName}`);
                const templateContent = await this.fetchTemplate(templateName);
                
                // Cache the template with timestamp
                this.templateCache.set(templateName, templateContent);
                this.lastLoadTime.set(templateName, now);
                this.loadedTemplates.add(templateName);
                
                console.log(`Template ${templateName} loaded successfully`);
                return templateContent;
            } else {
                console.log(`Using cached template: ${templateName}`);
                return this.templateCache.get(templateName);
            }
        } catch (error) {
            console.error(`Error loading template ${templateName}:`, error);
            return this.getFallbackTemplate(templateName);
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
     * @returns {Promise<string>} Processed template
     */
    async applyTemplate(templateName, userData) {
        try {
            console.log(`Applying template ${templateName} with user data`);
            
            // Load the latest template
            const template = await this.loadTemplate(templateName);
            
            // Validate template
            if (!this.validateTemplate(template, templateName)) {
                throw new Error(`Template ${templateName} validation failed`);
            }
            
            // For now, return the template as-is
            // In a full implementation, this would merge user data with template
            console.log(`Template ${templateName} applied successfully`);
            return template;
            
        } catch (error) {
            console.error(`Error applying template ${templateName}:`, error);
            return this.getFallbackTemplate(templateName);
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
            console.log(`Cache cleared for template: ${templateName}`);
        } else {
            this.templateCache.clear();
            this.lastLoadTime.clear();
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
            lastLoadTimes: Object.fromEntries(this.lastLoadTime)
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
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.PromptTemplateManager = PromptTemplateManager;
}

// Also support module exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PromptTemplateManager;
}