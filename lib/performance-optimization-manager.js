/**
 * Performance Optimization Manager
 * Implements lazy loading, caching, chunked processing, and memory optimization
 * Task 14: Add performance optimizations
 * Requirements: Performance and scalability
 */

class PerformanceOptimizationManager {
    constructor(options = {}) {
        this.options = {
            // Lazy loading configuration
            lazyLoadThreshold: 100, // Load libraries when needed
            preloadDelay: 2000, // Delay before preloading libraries
            
            // Caching configuration
            cacheEnabled: true,
            cacheMaxSize: 50, // Maximum cached items
            cacheExpiry: 30 * 60 * 1000, // 30 minutes
            
            // Chunked processing configuration
            chunkSize: 1000, // Process 1000 elements at a time
            chunkDelay: 10, // 10ms delay between chunks
            largeDocumentThreshold: 5000, // Consider document large if > 5000 elements
            
            // Memory optimization configuration
            memoryMonitoringEnabled: true,
            memoryThreshold: 100 * 1024 * 1024, // 100MB threshold
            garbageCollectionInterval: 30000, // 30 seconds
            
            ...options
        };
        
        // State management
        this.loadedLibraries = new Set();
        this.loadingPromises = new Map();
        this.contentCache = new Map();
        this.renderCache = new Map();
        this.memoryUsage = { current: 0, peak: 0, samples: [] };
        
        // Performance metrics
        this.metrics = {
            libraryLoadTimes: new Map(),
            cacheHitRate: { hits: 0, misses: 0 },
            chunkProcessingTimes: [],
            memoryOptimizations: 0
        };
        
        // Initialize performance monitoring
        this.initializePerformanceMonitoring();
        
        console.log('PerformanceOptimizationManager initialized with options:', this.options);
    }

    /**
     * Initialize performance monitoring
     */
    initializePerformanceMonitoring() {
        if (this.options.memoryMonitoringEnabled && typeof window !== 'undefined') {
            // Start memory monitoring
            this.startMemoryMonitoring();
            
            // Monitor page visibility for optimization opportunities
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.optimizeMemoryOnHidden();
                }
            });
            
            // Monitor beforeunload for cleanup
            window.addEventListener('beforeunload', () => {
                this.cleanup();
            });
        }
    }

    /**
     * Lazy load export libraries
     * @param {string} libraryType - Type of library ('pdf', 'word', 'all')
     * @returns {Promise<boolean>} Success status
     */
    async lazyLoadLibraries(libraryType = 'all') {
        const startTime = performance.now();
        
        try {
            const librariesToLoad = this.getLibrariesToLoad(libraryType);
            const loadPromises = [];
            
            for (const library of librariesToLoad) {
                if (!this.loadedLibraries.has(library.name)) {
                    // Check if already loading
                    if (this.loadingPromises.has(library.name)) {
                        loadPromises.push(this.loadingPromises.get(library.name));
                    } else {
                        const loadPromise = this.loadLibrary(library);
                        this.loadingPromises.set(library.name, loadPromise);
                        loadPromises.push(loadPromise);
                    }
                }
            }
            
            await Promise.all(loadPromises);
            
            const loadTime = performance.now() - startTime;
            this.metrics.libraryLoadTimes.set(libraryType, loadTime);
            
            console.log(`Lazy loaded ${libraryType} libraries in ${Math.round(loadTime)}ms`);
            return true;
            
        } catch (error) {
            console.error('Failed to lazy load libraries:', error);
            return false;
        }
    }

    /**
     * Get libraries to load based on type
     * @param {string} libraryType - Library type
     * @returns {Array} Array of library configurations
     */
    getLibrariesToLoad(libraryType) {
        const libraries = {
            pdf: [
                {
                    name: 'jspdf',
                    url: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
                    globalName: 'jsPDF',
                    check: () => window.jspdf?.jsPDF || window.jsPDF
                },
                {
                    name: 'html2canvas',
                    url: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
                    globalName: 'html2canvas',
                    check: () => window.html2canvas
                }
            ],
            word: [
                {
                    name: 'docx',
                    url: 'https://unpkg.com/docx@8.5.0/build/index.js',
                    globalName: 'docx',
                    check: () => window.docx
                }
            ]
        };
        
        if (libraryType === 'all') {
            return [...libraries.pdf, ...libraries.word];
        }
        
        return libraries[libraryType] || [];
    }

    /**
     * Load a single library
     * @param {Object} library - Library configuration
     * @returns {Promise<void>}
     */
    async loadLibrary(library) {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (library.check()) {
                this.loadedLibraries.add(library.name);
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = library.url;
            script.async = true;
            
            script.onload = () => {
                // Verify library is available
                if (library.check()) {
                    this.loadedLibraries.add(library.name);
                    console.log(`Loaded library: ${library.name}`);
                    resolve();
                } else {
                    reject(new Error(`Library ${library.name} not available after loading`));
                }
            };
            
            script.onerror = () => {
                reject(new Error(`Failed to load library: ${library.name}`));
            };
            
            document.head.appendChild(script);
        });
    }

    /**
     * Preload libraries with delay
     * @param {string} libraryType - Library type to preload
     */
    preloadLibraries(libraryType = 'all') {
        setTimeout(() => {
            this.lazyLoadLibraries(libraryType).catch(error => {
                console.warn('Preload failed:', error);
            });
        }, this.options.preloadDelay);
    }

    /**
     * Cache content for improved rendering performance
     * @param {string} key - Cache key
     * @param {any} content - Content to cache
     * @param {Object} options - Cache options
     */
    cacheContent(key, content, options = {}) {
        if (!this.options.cacheEnabled) return;
        
        const cacheEntry = {
            content: content,
            timestamp: Date.now(),
            size: this.estimateSize(content),
            options: options
        };
        
        // Check cache size limit
        if (this.contentCache.size >= this.options.cacheMaxSize) {
            this.evictOldestCacheEntry();
        }
        
        this.contentCache.set(key, cacheEntry);
        console.log(`Cached content: ${key} (${cacheEntry.size} bytes)`);
    }

    /**
     * Get cached content
     * @param {string} key - Cache key
     * @returns {any|null} Cached content or null if not found/expired
     */
    getCachedContent(key) {
        if (!this.options.cacheEnabled) return null;
        
        const cacheEntry = this.contentCache.get(key);
        if (!cacheEntry) {
            this.metrics.cacheHitRate.misses++;
            return null;
        }
        
        // Check expiry
        if (Date.now() - cacheEntry.timestamp > this.options.cacheExpiry) {
            this.contentCache.delete(key);
            this.metrics.cacheHitRate.misses++;
            return null;
        }
        
        this.metrics.cacheHitRate.hits++;
        return cacheEntry.content;
    }

    /**
     * Cache rendered content
     * @param {string} key - Cache key
     * @param {HTMLElement} renderedElement - Rendered element
     */
    cacheRenderedContent(key, renderedElement) {
        if (!this.options.cacheEnabled) return;
        
        const cacheEntry = {
            html: renderedElement.outerHTML,
            timestamp: Date.now(),
            size: renderedElement.outerHTML.length
        };
        
        this.renderCache.set(key, cacheEntry);
    }

    /**
     * Get cached rendered content
     * @param {string} key - Cache key
     * @returns {HTMLElement|null} Cached element or null
     */
    getCachedRenderedContent(key) {
        if (!this.options.cacheEnabled) return null;
        
        const cacheEntry = this.renderCache.get(key);
        if (!cacheEntry) return null;
        
        // Check expiry
        if (Date.now() - cacheEntry.timestamp > this.options.cacheExpiry) {
            this.renderCache.delete(key);
            return null;
        }
        
        // Create element from cached HTML
        const div = document.createElement('div');
        div.innerHTML = cacheEntry.html;
        return div.firstElementChild;
    }

    /**
     * Process large documents in chunks
     * @param {Array|HTMLElement} content - Content to process
     * @param {Function} processor - Processing function
     * @param {Object} options - Processing options
     * @returns {Promise<any>} Processing result
     */
    async processInChunks(content, processor, options = {}) {
        const startTime = performance.now();
        
        // Determine if chunked processing is needed
        const elements = this.getProcessableElements(content);
        const shouldChunk = elements.length > this.options.largeDocumentThreshold;
        
        if (!shouldChunk) {
            // Process normally for small documents
            return await processor(elements, options);
        }
        
        console.log(`Processing large document with ${elements.length} elements in chunks`);
        
        const results = [];
        const chunkSize = options.chunkSize || this.options.chunkSize;
        const chunkDelay = options.chunkDelay || this.options.chunkDelay;
        
        for (let i = 0; i < elements.length; i += chunkSize) {
            const chunk = elements.slice(i, i + chunkSize);
            const chunkStartTime = performance.now();
            
            // Process chunk
            const chunkResult = await processor(chunk, {
                ...options,
                chunkIndex: Math.floor(i / chunkSize),
                totalChunks: Math.ceil(elements.length / chunkSize),
                isChunked: true
            });
            
            results.push(chunkResult);
            
            const chunkTime = performance.now() - chunkStartTime;
            this.metrics.chunkProcessingTimes.push(chunkTime);
            
            // Progress callback
            if (options.onProgress) {
                options.onProgress({
                    processed: i + chunk.length,
                    total: elements.length,
                    percentage: Math.round(((i + chunk.length) / elements.length) * 100)
                });
            }
            
            // Yield control to prevent blocking
            if (chunkDelay > 0 && i + chunkSize < elements.length) {
                await this.delay(chunkDelay);
            }
            
            // Memory optimization between chunks
            if (this.shouldOptimizeMemory()) {
                await this.optimizeMemory();
            }
        }
        
        const totalTime = performance.now() - startTime;
        console.log(`Chunked processing completed in ${Math.round(totalTime)}ms`);
        
        return this.combineChunkResults(results, options);
    }

    /**
     * Get processable elements from content
     * @param {Array|HTMLElement} content - Content
     * @returns {Array} Array of elements
     */
    getProcessableElements(content) {
        if (Array.isArray(content)) {
            return content;
        }
        
        if (content instanceof HTMLElement) {
            // Get all child elements for processing
            return Array.from(content.querySelectorAll('*'));
        }
        
        return [content];
    }

    /**
     * Combine chunk processing results
     * @param {Array} results - Array of chunk results
     * @param {Object} options - Processing options
     * @returns {any} Combined result
     */
    combineChunkResults(results, options) {
        if (options.combiner) {
            return options.combiner(results);
        }
        
        // Default combination strategy
        if (results.length === 1) {
            return results[0];
        }
        
        // If results are arrays, flatten them
        if (Array.isArray(results[0])) {
            return results.flat();
        }
        
        // If results are objects, merge them
        if (typeof results[0] === 'object') {
            return Object.assign({}, ...results);
        }
        
        return results;
    }

    /**
     * Start memory monitoring
     */
    startMemoryMonitoring() {
        if (!this.options.memoryMonitoringEnabled) return;
        
        setInterval(() => {
            this.sampleMemoryUsage();
        }, this.options.garbageCollectionInterval);
    }

    /**
     * Sample current memory usage
     */
    sampleMemoryUsage() {
        if (typeof performance !== 'undefined' && performance.memory) {
            const memInfo = performance.memory;
            const currentUsage = memInfo.usedJSHeapSize;
            
            this.memoryUsage.current = currentUsage;
            this.memoryUsage.peak = Math.max(this.memoryUsage.peak, currentUsage);
            this.memoryUsage.samples.push({
                timestamp: Date.now(),
                usage: currentUsage,
                limit: memInfo.jsHeapSizeLimit
            });
            
            // Keep only recent samples
            if (this.memoryUsage.samples.length > 100) {
                this.memoryUsage.samples = this.memoryUsage.samples.slice(-50);
            }
            
            // Trigger optimization if needed
            if (this.shouldOptimizeMemory()) {
                this.optimizeMemory();
            }
        }
    }

    /**
     * Check if memory optimization is needed
     * @returns {boolean} Whether optimization is needed
     */
    shouldOptimizeMemory() {
        return this.memoryUsage.current > this.options.memoryThreshold;
    }

    /**
     * Optimize memory usage
     * @returns {Promise<void>}
     */
    async optimizeMemory() {
        console.log('Optimizing memory usage...');
        
        // Clear old cache entries
        this.clearExpiredCache();
        
        // Limit cache size
        this.limitCacheSize();
        
        // Clear old metrics
        this.clearOldMetrics();
        
        // Force garbage collection if available
        if (typeof window !== 'undefined' && window.gc) {
            window.gc();
        }
        
        this.metrics.memoryOptimizations++;
        console.log('Memory optimization completed');
    }

    /**
     * Optimize memory when page is hidden
     */
    optimizeMemoryOnHidden() {
        // More aggressive optimization when page is not visible
        this.contentCache.clear();
        this.renderCache.clear();
        this.metrics.chunkProcessingTimes = [];
        
        console.log('Aggressive memory optimization on page hidden');
    }

    /**
     * Clear expired cache entries
     */
    clearExpiredCache() {
        const now = Date.now();
        
        // Clear content cache
        for (const [key, entry] of this.contentCache.entries()) {
            if (now - entry.timestamp > this.options.cacheExpiry) {
                this.contentCache.delete(key);
            }
        }
        
        // Clear render cache
        for (const [key, entry] of this.renderCache.entries()) {
            if (now - entry.timestamp > this.options.cacheExpiry) {
                this.renderCache.delete(key);
            }
        }
    }

    /**
     * Limit cache size to prevent memory bloat
     */
    limitCacheSize() {
        // Limit content cache
        while (this.contentCache.size > this.options.cacheMaxSize) {
            this.evictOldestCacheEntry();
        }
        
        // Limit render cache
        while (this.renderCache.size > this.options.cacheMaxSize) {
            const oldestKey = this.renderCache.keys().next().value;
            this.renderCache.delete(oldestKey);
        }
    }

    /**
     * Evict oldest cache entry
     */
    evictOldestCacheEntry() {
        let oldestKey = null;
        let oldestTime = Date.now();
        
        for (const [key, entry] of this.contentCache.entries()) {
            if (entry.timestamp < oldestTime) {
                oldestTime = entry.timestamp;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.contentCache.delete(oldestKey);
        }
    }

    /**
     * Clear old metrics to free memory
     */
    clearOldMetrics() {
        // Keep only recent chunk processing times
        if (this.metrics.chunkProcessingTimes.length > 100) {
            this.metrics.chunkProcessingTimes = this.metrics.chunkProcessingTimes.slice(-50);
        }
    }

    /**
     * Estimate size of content in bytes
     * @param {any} content - Content to estimate
     * @returns {number} Estimated size in bytes
     */
    estimateSize(content) {
        if (typeof content === 'string') {
            return content.length * 2; // Rough estimate for UTF-16
        }
        
        if (content instanceof HTMLElement) {
            return content.outerHTML.length * 2;
        }
        
        try {
            return JSON.stringify(content).length * 2;
        } catch {
            return 1000; // Default estimate
        }
    }

    /**
     * Delay execution
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise<void>}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get performance metrics
     * @returns {Object} Performance metrics
     */
    getMetrics() {
        const cacheHitRate = this.metrics.cacheHitRate.hits + this.metrics.cacheHitRate.misses;
        const hitRatePercentage = cacheHitRate > 0 ? 
            (this.metrics.cacheHitRate.hits / cacheHitRate * 100).toFixed(1) : 0;
        
        return {
            libraryLoadTimes: Object.fromEntries(this.metrics.libraryLoadTimes),
            cacheHitRate: `${hitRatePercentage}% (${this.metrics.cacheHitRate.hits}/${cacheHitRate})`,
            averageChunkTime: this.metrics.chunkProcessingTimes.length > 0 ?
                Math.round(this.metrics.chunkProcessingTimes.reduce((a, b) => a + b, 0) / this.metrics.chunkProcessingTimes.length) : 0,
            memoryOptimizations: this.metrics.memoryOptimizations,
            currentMemoryUsage: this.formatBytes(this.memoryUsage.current),
            peakMemoryUsage: this.formatBytes(this.memoryUsage.peak),
            cacheSize: {
                content: this.contentCache.size,
                render: this.renderCache.size
            },
            loadedLibraries: Array.from(this.loadedLibraries)
        };
    }

    /**
     * Format bytes to human readable format
     * @param {number} bytes - Bytes
     * @returns {string} Formatted string
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        // Clear all caches
        this.contentCache.clear();
        this.renderCache.clear();
        
        // Clear loading promises
        this.loadingPromises.clear();
        
        // Reset metrics
        this.metrics = {
            libraryLoadTimes: new Map(),
            cacheHitRate: { hits: 0, misses: 0 },
            chunkProcessingTimes: [],
            memoryOptimizations: 0
        };
        
        console.log('PerformanceOptimizationManager cleaned up');
    }
}

// Export for use in different module systems
if (typeof window !== 'undefined') {
    window.PerformanceOptimizationManager = PerformanceOptimizationManager;
}

export default PerformanceOptimizationManager;