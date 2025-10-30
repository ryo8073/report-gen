/**
 * MarkdownRenderer - Converts markdown content to professionally styled HTML
 * Implements requirements 1.2 and 1.3 for formatted preview display
 */
class MarkdownRenderer {
    constructor(options = {}) {
        this.options = {
            sanitize: true,
            enableTables: true,
            enableCodeBlocks: true,
            enableLists: true,
            enableVirtualScrolling: false,
            maxContentSize: 1000000, // 1MB
            chunkSize: 50000, // 50KB chunks
            ...options
        };
        
        // Performance optimization: Cache rendered content
        this.renderCache = new Map();
        this.maxCacheSize = 50;
        
        // Performance monitoring
        this.renderTimes = [];
        this.lastRenderTime = 0;
    }

    /**
     * Convert markdown content to HTML with performance optimizations
     * @param {string} markdown - Raw markdown content
     * @returns {string} - Formatted HTML content
     */
    render(markdown) {
        if (!markdown || typeof markdown !== 'string') {
            return '<p style="color: var(--color-gray-500); font-style: italic;">コンテンツがありません</p>';
        }

        const startTime = performance.now();
        
        // Performance: Check cache first
        const cacheKey = this.generateCacheKey(markdown);
        if (this.renderCache.has(cacheKey)) {
            const cached = this.renderCache.get(cacheKey);
            // Update access time for LRU
            cached.lastAccessed = Date.now();
            return cached.html;
        }

        try {
            let html;
            
            // Performance: Handle large content with chunking
            if (markdown.length > this.options.maxContentSize) {
                html = this.renderLargeContent(markdown);
            } else {
                html = this.renderNormalContent(markdown);
            }

            // Performance: Cache the result
            this.cacheResult(cacheKey, html);
            
            // Performance: Track render time
            const renderTime = performance.now() - startTime;
            this.trackRenderTime(renderTime, markdown.length);

            return html;
        } catch (error) {
            console.error('MarkdownRenderer error:', error);
            return `<div style="color: var(--color-red-600); padding: var(--space-4); border: 1px solid var(--color-red-300); border-radius: 6px; background: var(--color-red-50);">
                <strong>レンダリングエラー:</strong> ${error.message}
            </div>`;
        }
    }

    /**
     * Render normal-sized content
     */
    renderNormalContent(markdown) {
        let html = markdown;

        // Process in order of complexity to avoid conflicts
        html = this.processCodeBlocks(html);
        html = this.processHeaders(html);
        html = this.processLists(html);
        html = this.processTables(html);
        html = this.processInlineFormatting(html);
        html = this.processLineBreaks(html);
        html = this.processLinks(html);

        return this.wrapInContainer(html);
    }

    /**
     * Render large content with chunking for performance
     */
    renderLargeContent(markdown) {
        const chunks = this.chunkContent(markdown);
        const renderedChunks = chunks.map(chunk => this.renderNormalContent(chunk));
        
        if (this.options.enableVirtualScrolling) {
            return this.wrapInVirtualScrollContainer(renderedChunks);
        } else {
            return this.wrapInContainer(renderedChunks.join(''));
        }
    }

    /**
     * Split large content into manageable chunks
     */
    chunkContent(content) {
        const chunks = [];
        const chunkSize = this.options.chunkSize;
        
        // Split by paragraphs first to maintain content integrity
        const paragraphs = content.split(/\n\s*\n/);
        let currentChunk = '';
        
        for (const paragraph of paragraphs) {
            if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
                chunks.push(currentChunk.trim());
                currentChunk = paragraph;
            } else {
                currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
            }
        }
        
        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }
        
        return chunks;
    }

    /**
     * Wrap content in virtual scroll container
     */
    wrapInVirtualScrollContainer(chunks) {
        const chunkElements = chunks.map((chunk, index) => 
            `<div class="virtual-chunk" data-chunk="${index}">${chunk}</div>`
        ).join('');
        
        return `
            <div class="virtual-scroll-container" role="region" aria-label="スクロール可能なコンテンツ">
                <div class="virtual-scroll-content">
                    ${chunkElements}
                </div>
            </div>
        `;
    }

    /**
     * Generate cache key for content
     */
    generateCacheKey(content) {
        // Simple hash function for cache key
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    /**
     * Cache rendered result with LRU eviction
     */
    cacheResult(key, html) {
        // Remove oldest entries if cache is full
        if (this.renderCache.size >= this.maxCacheSize) {
            const oldestKey = this.findOldestCacheEntry();
            if (oldestKey) {
                this.renderCache.delete(oldestKey);
            }
        }
        
        this.renderCache.set(key, {
            html,
            lastAccessed: Date.now(),
            size: html.length
        });
    }

    /**
     * Find oldest cache entry for LRU eviction
     */
    findOldestCacheEntry() {
        let oldestKey = null;
        let oldestTime = Date.now();
        
        for (const [key, value] of this.renderCache.entries()) {
            if (value.lastAccessed < oldestTime) {
                oldestTime = value.lastAccessed;
                oldestKey = key;
            }
        }
        
        return oldestKey;
    }

    /**
     * Track render performance
     */
    trackRenderTime(renderTime, contentSize) {
        this.renderTimes.push({
            time: renderTime,
            size: contentSize,
            timestamp: Date.now()
        });
        
        // Keep only last 100 measurements
        if (this.renderTimes.length > 100) {
            this.renderTimes.shift();
        }
        
        // Warn about slow renders
        if (renderTime > 100) {
            console.warn(`Slow markdown render: ${renderTime.toFixed(2)}ms for ${contentSize} characters`);
        }
        
        this.lastRenderTime = renderTime;
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        if (this.renderTimes.length === 0) {
            return { averageTime: 0, cacheHitRate: 0, totalRenders: 0 };
        }
        
        const totalTime = this.renderTimes.reduce((sum, entry) => sum + entry.time, 0);
        const averageTime = totalTime / this.renderTimes.length;
        
        return {
            averageTime,
            lastRenderTime: this.lastRenderTime,
            totalRenders: this.renderTimes.length,
            cacheSize: this.renderCache.size,
            maxCacheSize: this.maxCacheSize
        };
    }

    /**
     * Clear render cache
     */
    clearCache() {
        this.renderCache.clear();
    }

    /**
     * Process code blocks (``` blocks)
     */
    processCodeBlocks(text) {
        if (!this.options.enableCodeBlocks) return text;

        // Multi-line code blocks
        text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
            const lang = language || 'text';
            return `<div class="code-block" data-language="${lang}">
                <div class="code-header">
                    <span class="code-language">${lang}</span>
                </div>
                <pre><code>${this.escapeHtml(code.trim())}</code></pre>
            </div>`;
        });

        // Inline code
        text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

        return text;
    }

    /**
     * Process headers (# ## ###)
     */
    processHeaders(text) {
        // H1 headers
        text = text.replace(/^# (.+)$/gm, '<h1 class="markdown-h1">$1</h1>');
        
        // H2 headers
        text = text.replace(/^## (.+)$/gm, '<h2 class="markdown-h2">$1</h2>');
        
        // H3 headers
        text = text.replace(/^### (.+)$/gm, '<h3 class="markdown-h3">$1</h3>');
        
        // H4 headers
        text = text.replace(/^#### (.+)$/gm, '<h4 class="markdown-h4">$1</h4>');
        
        // H5 headers
        text = text.replace(/^##### (.+)$/gm, '<h5 class="markdown-h5">$1</h5>');
        
        // H6 headers
        text = text.replace(/^###### (.+)$/gm, '<h6 class="markdown-h6">$1</h6>');

        return text;
    }

    /**
     * Process lists (- * + for unordered, 1. for ordered)
     */
    processLists(text) {
        if (!this.options.enableLists) return text;

        // Process unordered lists
        text = text.replace(/^(\s*)([-*+])\s+(.+)$/gm, (match, indent, marker, content) => {
            const level = Math.floor(indent.length / 2);
            return `<li class="markdown-list-item" data-level="${level}">${content}</li>`;
        });

        // Process ordered lists
        text = text.replace(/^(\s*)(\d+\.)\s+(.+)$/gm, (match, indent, marker, content) => {
            const level = Math.floor(indent.length / 2);
            return `<li class="markdown-ordered-item" data-level="${level}">${content}</li>`;
        });

        // Wrap consecutive list items in ul/ol tags
        text = this.wrapListItems(text);

        return text;
    }

    /**
     * Wrap list items in appropriate ul/ol containers
     */
    wrapListItems(text) {
        const lines = text.split('\n');
        const result = [];
        let inUnorderedList = false;
        let inOrderedList = false;
        let currentLevel = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.includes('class="markdown-list-item"')) {
                const level = parseInt(line.match(/data-level="(\d+)"/)?.[1] || '0');
                
                if (!inUnorderedList || level !== currentLevel) {
                    if (inUnorderedList) result.push('</ul>');
                    if (inOrderedList) result.push('</ol>');
                    result.push('<ul class="markdown-list">');
                    inUnorderedList = true;
                    inOrderedList = false;
                    currentLevel = level;
                }
                result.push(line);
                
            } else if (line.includes('class="markdown-ordered-item"')) {
                const level = parseInt(line.match(/data-level="(\d+)"/)?.[1] || '0');
                
                if (!inOrderedList || level !== currentLevel) {
                    if (inUnorderedList) result.push('</ul>');
                    if (inOrderedList) result.push('</ol>');
                    result.push('<ol class="markdown-ordered-list">');
                    inOrderedList = true;
                    inUnorderedList = false;
                    currentLevel = level;
                }
                result.push(line);
                
            } else {
                if (inUnorderedList) {
                    result.push('</ul>');
                    inUnorderedList = false;
                }
                if (inOrderedList) {
                    result.push('</ol>');
                    inOrderedList = false;
                }
                result.push(line);
            }
        }

        // Close any remaining lists
        if (inUnorderedList) result.push('</ul>');
        if (inOrderedList) result.push('</ol>');

        return result.join('\n');
    }

    /**
     * Process tables (| column | column |)
     */
    processTables(text) {
        if (!this.options.enableTables) return text;

        const lines = text.split('\n');
        const result = [];
        let inTable = false;
        let tableRows = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.includes('|') && line.split('|').length > 2) {
                if (!inTable) {
                    inTable = true;
                    tableRows = [];
                }
                tableRows.push(line);
            } else {
                if (inTable) {
                    // Process accumulated table rows
                    result.push(this.renderTable(tableRows));
                    inTable = false;
                    tableRows = [];
                }
                result.push(line);
            }
        }

        // Handle table at end of content
        if (inTable && tableRows.length > 0) {
            result.push(this.renderTable(tableRows));
        }

        return result.join('\n');
    }

    /**
     * Render table from rows
     */
    renderTable(rows) {
        if (rows.length === 0) return '';

        let html = '<table class="markdown-table">';
        
        // Process header row
        if (rows.length > 0) {
            const headerCells = rows[0].split('|').filter(cell => cell.trim() !== '');
            html += '<thead><tr>';
            headerCells.forEach(cell => {
                html += `<th class="markdown-th">${cell.trim()}</th>`;
            });
            html += '</tr></thead>';
        }

        // Skip separator row (if exists) and process data rows
        const dataRows = rows.slice(rows.length > 1 && rows[1].includes('---') ? 2 : 1);
        if (dataRows.length > 0) {
            html += '<tbody>';
            dataRows.forEach(row => {
                const cells = row.split('|').filter(cell => cell.trim() !== '');
                html += '<tr>';
                cells.forEach(cell => {
                    html += `<td class="markdown-td">${cell.trim()}</td>`;
                });
                html += '</tr>';
            });
            html += '</tbody>';
        }

        html += '</table>';
        return html;
    }

    /**
     * Process inline formatting (bold, italic, strikethrough)
     */
    processInlineFormatting(text) {
        // Bold (**text** or __text__)
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="markdown-bold">$1</strong>');
        text = text.replace(/__(.*?)__/g, '<strong class="markdown-bold">$1</strong>');
        
        // Italic (*text* or _text_)
        text = text.replace(/\*(.*?)\*/g, '<em class="markdown-italic">$1</em>');
        text = text.replace(/_(.*?)_/g, '<em class="markdown-italic">$1</em>');
        
        // Strikethrough (~~text~~)
        text = text.replace(/~~(.*?)~~/g, '<del class="markdown-strikethrough">$1</del>');

        return text;
    }

    /**
     * Process links [text](url)
     */
    processLinks(text) {
        // Links with title [text](url "title")
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\s+"([^"]+)"\)/g, 
            '<a href="$2" title="$3" class="markdown-link" target="_blank" rel="noopener noreferrer">$1</a>');
        
        // Simple links [text](url)
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, 
            '<a href="$2" class="markdown-link" target="_blank" rel="noopener noreferrer">$1</a>');

        return text;
    }

    /**
     * Process line breaks
     */
    processLineBreaks(text) {
        // Convert double line breaks to paragraphs
        text = text.replace(/\n\n+/g, '</p><p class="markdown-paragraph">');
        
        // Convert single line breaks to <br> (only if not already in HTML tags)
        text = text.replace(/\n(?![<\/])/g, '<br>');

        return text;
    }

    /**
     * Wrap content in styled container
     */
    wrapInContainer(html) {
        // Wrap in paragraphs if not already wrapped
        if (!html.startsWith('<')) {
            html = `<p class="markdown-paragraph">${html}</p>`;
        } else if (!html.includes('<p')) {
            html = `<p class="markdown-paragraph">${html}</p>`;
        }

        return `<div class="markdown-content">${html}</div>`;
    }

    /**
     * Escape HTML characters for security
     */
    escapeHtml(text) {
        if (!this.options.sanitize) return text;
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Get professional CSS styles for markdown content
     */
    static getStyles() {
        return `
            .markdown-content {
                font-family: 'Hiragino Sans', 'Yu Gothic', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.7;
                color: var(--color-gray-800, #1f2937);
                max-width: none;
            }

            .markdown-h1 {
                font-size: 2rem;
                font-weight: 700;
                margin: 2rem 0 1rem 0;
                color: var(--color-gray-900, #111827);
                border-bottom: 3px solid var(--color-primary, #3b82f6);
                padding-bottom: 0.5rem;
                line-height: 1.2;
            }

            .markdown-h2 {
                font-size: 1.5rem;
                font-weight: 600;
                margin: 1.5rem 0 0.75rem 0;
                color: var(--color-primary, #3b82f6);
                line-height: 1.3;
            }

            .markdown-h3 {
                font-size: 1.25rem;
                font-weight: 600;
                margin: 1.25rem 0 0.5rem 0;
                color: var(--color-gray-700, #374151);
                line-height: 1.4;
            }

            .markdown-h4, .markdown-h5, .markdown-h6 {
                font-size: 1.1rem;
                font-weight: 600;
                margin: 1rem 0 0.5rem 0;
                color: var(--color-gray-600, #4b5563);
                line-height: 1.4;
            }

            .markdown-paragraph {
                margin: 0 0 1rem 0;
                line-height: 1.7;
            }

            .markdown-bold {
                font-weight: 600;
                color: var(--color-gray-900, #111827);
            }

            .markdown-italic {
                font-style: italic;
                color: var(--color-gray-700, #374151);
            }

            .markdown-strikethrough {
                text-decoration: line-through;
                color: var(--color-gray-500, #6b7280);
            }

            .markdown-list, .markdown-ordered-list {
                margin: 1rem 0;
                padding-left: 1.5rem;
            }

            .markdown-list-item, .markdown-ordered-item {
                margin: 0.25rem 0;
                line-height: 1.6;
            }

            .markdown-link {
                color: var(--color-primary, #3b82f6);
                text-decoration: underline;
                text-decoration-color: transparent;
                transition: all 0.2s ease;
            }

            .markdown-link:hover {
                text-decoration-color: var(--color-primary, #3b82f6);
                color: var(--color-primary-dark, #2563eb);
            }

            .inline-code {
                background: var(--color-gray-100, #f3f4f6);
                color: var(--color-gray-800, #1f2937);
                padding: 0.125rem 0.25rem;
                border-radius: 0.25rem;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                font-size: 0.875em;
                border: 1px solid var(--color-gray-200, #e5e7eb);
            }

            .code-block {
                margin: 1.5rem 0;
                border-radius: 0.5rem;
                overflow: hidden;
                border: 1px solid var(--color-gray-200, #e5e7eb);
                background: var(--color-gray-50, #f9fafb);
            }

            .code-header {
                background: var(--color-gray-100, #f3f4f6);
                padding: 0.5rem 1rem;
                border-bottom: 1px solid var(--color-gray-200, #e5e7eb);
                font-size: 0.75rem;
                font-weight: 500;
                color: var(--color-gray-600, #4b5563);
            }

            .code-block pre {
                margin: 0;
                padding: 1rem;
                background: white;
                overflow-x: auto;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                font-size: 0.875rem;
                line-height: 1.5;
            }

            .code-block code {
                color: var(--color-gray-800, #1f2937);
            }

            .markdown-table {
                width: 100%;
                border-collapse: collapse;
                margin: 1.5rem 0;
                background: white;
                border-radius: 0.5rem;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }

            .markdown-th {
                background: var(--color-gray-50, #f9fafb);
                padding: 0.75rem 1rem;
                text-align: left;
                font-weight: 600;
                color: var(--color-gray-700, #374151);
                border-bottom: 2px solid var(--color-gray-200, #e5e7eb);
            }

            .markdown-td {
                padding: 0.75rem 1rem;
                border-bottom: 1px solid var(--color-gray-200, #e5e7eb);
                color: var(--color-gray-600, #4b5563);
            }

            .markdown-table tr:hover {
                background: var(--color-gray-50, #f9fafb);
            }

            /* Responsive design */
            @media (max-width: 768px) {
                .markdown-content {
                    font-size: 0.9rem;
                }

                .markdown-h1 {
                    font-size: 1.75rem;
                }

                .markdown-h2 {
                    font-size: 1.375rem;
                }

                .markdown-h3 {
                    font-size: 1.125rem;
                }

                .code-block pre {
                    padding: 0.75rem;
                    font-size: 0.8rem;
                }

                .markdown-table {
                    font-size: 0.875rem;
                }

                .markdown-th, .markdown-td {
                    padding: 0.5rem 0.75rem;
                }
            }
        `;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarkdownRenderer;
} else if (typeof window !== 'undefined') {
    window.MarkdownRenderer = MarkdownRenderer;
}