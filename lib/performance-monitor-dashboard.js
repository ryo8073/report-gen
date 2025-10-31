/**
 * Performance Monitor Dashboard
 * Provides real-time performance monitoring and metrics display
 * Task 14: Add performance optimizations
 * Requirements: Performance and scalability
 */

class PerformanceMonitorDashboard {
    constructor(options = {}) {
        this.options = {
            updateInterval: 1000, // Update every second
            maxDataPoints: 60, // Keep 60 data points (1 minute at 1s intervals)
            showMemoryChart: true,
            showCacheMetrics: true,
            showLibraryMetrics: true,
            position: 'bottom-right', // 'top-left', 'top-right', 'bottom-left', 'bottom-right'
            minimized: false,
            autoHide: false,
            autoHideDelay: 5000,
            ...options
        };
        
        this.isVisible = false;
        this.isMinimized = this.options.minimized;
        this.updateTimer = null;
        this.autoHideTimer = null;
        
        // Performance data
        this.performanceData = {
            memory: [],
            cacheHits: [],
            libraryLoadTimes: new Map(),
            exportTimes: []
        };
        
        // Performance managers to monitor
        this.performanceManagers = new Set();
        
        // DOM elements
        this.dashboardElement = null;
        this.chartCanvas = null;
        
        this.initializeDashboard();
        
        console.log('PerformanceMonitorDashboard initialized');
    }

    /**
     * Initialize the dashboard
     */
    initializeDashboard() {
        this.createDashboardElement();
        this.attachEventListeners();
        
        // Start monitoring if not auto-hide or if visible
        if (!this.options.autoHide || this.isVisible) {
            this.startMonitoring();
        }
    }

    /**
     * Create dashboard DOM element
     */
    createDashboardElement() {
        // Create main dashboard container
        this.dashboardElement = document.createElement('div');
        this.dashboardElement.className = 'performance-monitor-dashboard';
        this.dashboardElement.innerHTML = this.getDashboardHTML();
        
        // Apply styles
        this.applyDashboardStyles();
        
        // Add to document
        document.body.appendChild(this.dashboardElement);
        
        // Initialize chart if enabled
        if (this.options.showMemoryChart) {
            this.initializeChart();
        }
        
        // Set initial visibility
        if (!this.options.autoHide) {
            this.show();
        }
    }

    /**
     * Get dashboard HTML structure
     * @returns {string} HTML string
     */
    getDashboardHTML() {
        return `
            <div class="dashboard-header">
                <div class="dashboard-title">
                    <span class="title-text">Performance Monitor</span>
                    <div class="dashboard-controls">
                        <button class="control-btn minimize-btn" title="Minimize">−</button>
                        <button class="control-btn close-btn" title="Close">×</button>
                    </div>
                </div>
            </div>
            
            <div class="dashboard-content">
                <!-- Memory Usage Section -->
                <div class="metric-section memory-section">
                    <h4 class="section-title">Memory Usage</h4>
                    <div class="metric-row">
                        <span class="metric-label">Current:</span>
                        <span class="metric-value" id="current-memory">0 MB</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Peak:</span>
                        <span class="metric-value" id="peak-memory">0 MB</span>
                    </div>
                    <div class="memory-chart-container" ${!this.options.showMemoryChart ? 'style="display: none;"' : ''}>
                        <canvas id="memory-chart" width="200" height="60"></canvas>
                    </div>
                </div>
                
                <!-- Cache Metrics Section -->
                <div class="metric-section cache-section" ${!this.options.showCacheMetrics ? 'style="display: none;"' : ''}>
                    <h4 class="section-title">Cache Performance</h4>
                    <div class="metric-row">
                        <span class="metric-label">Hit Rate:</span>
                        <span class="metric-value" id="cache-hit-rate">0%</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Cache Size:</span>
                        <span class="metric-value" id="cache-size">0 items</span>
                    </div>
                </div>
                
                <!-- Library Loading Section -->
                <div class="metric-section library-section" ${!this.options.showLibraryMetrics ? 'style="display: none;"' : ''}>
                    <h4 class="section-title">Library Loading</h4>
                    <div class="metric-row">
                        <span class="metric-label">Loaded:</span>
                        <span class="metric-value" id="loaded-libraries">0</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Avg Load Time:</span>
                        <span class="metric-value" id="avg-load-time">0ms</span>
                    </div>
                </div>
                
                <!-- Export Performance Section -->
                <div class="metric-section export-section">
                    <h4 class="section-title">Export Performance</h4>
                    <div class="metric-row">
                        <span class="metric-label">Last Export:</span>
                        <span class="metric-value" id="last-export-time">-</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Avg Export:</span>
                        <span class="metric-value" id="avg-export-time">-</span>
                    </div>
                </div>
                
                <!-- Actions Section -->
                <div class="metric-section actions-section">
                    <button class="action-btn optimize-btn">Optimize Memory</button>
                    <button class="action-btn clear-cache-btn">Clear Cache</button>
                </div>
            </div>
        `;
    }

    /**
     * Apply dashboard styles
     */
    applyDashboardStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .performance-monitor-dashboard {
                position: fixed;
                ${this.getPositionStyles()}
                width: 280px;
                background: rgba(255, 255, 255, 0.95);
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 12px;
                z-index: 10000;
                backdrop-filter: blur(10px);
                transition: all 0.3s ease;
                opacity: 0;
                transform: translateY(10px);
            }
            
            .performance-monitor-dashboard.visible {
                opacity: 1;
                transform: translateY(0);
            }
            
            .performance-monitor-dashboard.minimized .dashboard-content {
                display: none;
            }
            
            .performance-monitor-dashboard.minimized {
                width: 200px;
            }
            
            .dashboard-header {
                padding: 8px 12px;
                background: #f9fafb;
                border-bottom: 1px solid #e5e7eb;
                border-radius: 8px 8px 0 0;
                cursor: move;
            }
            
            .dashboard-title {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .title-text {
                font-weight: 600;
                color: #374151;
                font-size: 13px;
            }
            
            .dashboard-controls {
                display: flex;
                gap: 4px;
            }
            
            .control-btn {
                width: 20px;
                height: 20px;
                border: none;
                background: #e5e7eb;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
                color: #6b7280;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background-color 0.2s;
            }
            
            .control-btn:hover {
                background: #d1d5db;
            }
            
            .close-btn:hover {
                background: #ef4444;
                color: white;
            }
            
            .dashboard-content {
                padding: 12px;
                max-height: 400px;
                overflow-y: auto;
            }
            
            .metric-section {
                margin-bottom: 16px;
                padding-bottom: 12px;
                border-bottom: 1px solid #f3f4f6;
            }
            
            .metric-section:last-child {
                border-bottom: none;
                margin-bottom: 0;
            }
            
            .section-title {
                margin: 0 0 8px 0;
                font-size: 11px;
                font-weight: 600;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .metric-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 4px;
            }
            
            .metric-label {
                color: #6b7280;
                font-size: 11px;
            }
            
            .metric-value {
                color: #374151;
                font-weight: 500;
                font-size: 11px;
            }
            
            .memory-chart-container {
                margin-top: 8px;
                padding: 8px;
                background: #f9fafb;
                border-radius: 4px;
            }
            
            #memory-chart {
                width: 100%;
                height: 60px;
            }
            
            .actions-section {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .action-btn {
                flex: 1;
                padding: 6px 8px;
                border: 1px solid #d1d5db;
                background: white;
                border-radius: 4px;
                cursor: pointer;
                font-size: 10px;
                color: #374151;
                transition: all 0.2s;
            }
            
            .action-btn:hover {
                background: #f3f4f6;
                border-color: #9ca3af;
            }
            
            .optimize-btn:hover {
                background: #dbeafe;
                border-color: #3b82f6;
                color: #1d4ed8;
            }
            
            .clear-cache-btn:hover {
                background: #fef3c7;
                border-color: #f59e0b;
                color: #92400e;
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Get position styles based on options
     * @returns {string} CSS position styles
     */
    getPositionStyles() {
        const positions = {
            'top-left': 'top: 20px; left: 20px;',
            'top-right': 'top: 20px; right: 20px;',
            'bottom-left': 'bottom: 20px; left: 20px;',
            'bottom-right': 'bottom: 20px; right: 20px;'
        };
        
        return positions[this.options.position] || positions['bottom-right'];
    }

    /**
     * Initialize memory usage chart
     */
    initializeChart() {
        const canvas = this.dashboardElement.querySelector('#memory-chart');
        if (!canvas) return;
        
        this.chartCanvas = canvas;
        this.chartContext = canvas.getContext('2d');
        
        // Set canvas size
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        this.chartContext.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Minimize/maximize button
        const minimizeBtn = this.dashboardElement.querySelector('.minimize-btn');
        minimizeBtn.addEventListener('click', () => this.toggleMinimize());
        
        // Close button
        const closeBtn = this.dashboardElement.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => this.hide());
        
        // Action buttons
        const optimizeBtn = this.dashboardElement.querySelector('.optimize-btn');
        optimizeBtn.addEventListener('click', () => this.optimizeMemory());
        
        const clearCacheBtn = this.dashboardElement.querySelector('.clear-cache-btn');
        clearCacheBtn.addEventListener('click', () => this.clearCache());
        
        // Make dashboard draggable
        this.makeDraggable();
        
        // Auto-hide functionality
        if (this.options.autoHide) {
            this.dashboardElement.addEventListener('mouseenter', () => this.cancelAutoHide());
            this.dashboardElement.addEventListener('mouseleave', () => this.scheduleAutoHide());
        }
    }

    /**
     * Make dashboard draggable
     */
    makeDraggable() {
        const header = this.dashboardElement.querySelector('.dashboard-header');
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = this.dashboardElement.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });
        
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            this.dashboardElement.style.left = `${startLeft + deltaX}px`;
            this.dashboardElement.style.top = `${startTop + deltaY}px`;
            this.dashboardElement.style.right = 'auto';
            this.dashboardElement.style.bottom = 'auto';
        };
        
        const handleMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }

    /**
     * Register a performance manager for monitoring
     * @param {Object} performanceManager - Performance manager instance
     */
    registerPerformanceManager(performanceManager) {
        this.performanceManagers.add(performanceManager);
        console.log('Registered performance manager for monitoring');
    }

    /**
     * Unregister a performance manager
     * @param {Object} performanceManager - Performance manager instance
     */
    unregisterPerformanceManager(performanceManager) {
        this.performanceManagers.delete(performanceManager);
        console.log('Unregistered performance manager from monitoring');
    }

    /**
     * Start performance monitoring
     */
    startMonitoring() {
        if (this.updateTimer) return;
        
        this.updateTimer = setInterval(() => {
            this.updateMetrics();
        }, this.options.updateInterval);
        
        console.log('Performance monitoring started');
    }

    /**
     * Stop performance monitoring
     */
    stopMonitoring() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
        
        console.log('Performance monitoring stopped');
    }

    /**
     * Update performance metrics
     */
    updateMetrics() {
        // Collect memory usage
        this.updateMemoryMetrics();
        
        // Collect metrics from registered performance managers
        this.updatePerformanceManagerMetrics();
        
        // Update chart
        if (this.options.showMemoryChart && this.chartCanvas) {
            this.updateMemoryChart();
        }
    }

    /**
     * Update memory metrics
     */
    updateMemoryMetrics() {
        if (typeof performance !== 'undefined' && performance.memory) {
            const memInfo = performance.memory;
            const currentUsage = memInfo.usedJSHeapSize;
            const peakUsage = Math.max(...this.performanceData.memory.map(d => d.value), currentUsage);
            
            // Add to memory data
            this.performanceData.memory.push({
                timestamp: Date.now(),
                value: currentUsage
            });
            
            // Keep only recent data points
            if (this.performanceData.memory.length > this.options.maxDataPoints) {
                this.performanceData.memory = this.performanceData.memory.slice(-this.options.maxDataPoints);
            }
            
            // Update UI
            const currentMemoryEl = this.dashboardElement.querySelector('#current-memory');
            const peakMemoryEl = this.dashboardElement.querySelector('#peak-memory');
            
            if (currentMemoryEl) {
                currentMemoryEl.textContent = this.formatBytes(currentUsage);
            }
            
            if (peakMemoryEl) {
                peakMemoryEl.textContent = this.formatBytes(peakUsage);
            }
        }
    }

    /**
     * Update metrics from performance managers
     */
    updatePerformanceManagerMetrics() {
        let totalCacheHits = 0;
        let totalCacheRequests = 0;
        let totalCacheSize = 0;
        let loadedLibrariesCount = 0;
        let totalLoadTime = 0;
        let loadTimeCount = 0;
        
        for (const manager of this.performanceManagers) {
            try {
                const metrics = manager.getMetrics();
                
                // Cache metrics
                if (metrics.cacheHitRate) {
                    const match = metrics.cacheHitRate.match(/(\d+)\/(\d+)/);
                    if (match) {
                        totalCacheHits += parseInt(match[1]);
                        totalCacheRequests += parseInt(match[2]);
                    }
                }
                
                if (metrics.cacheSize) {
                    if (typeof metrics.cacheSize === 'object') {
                        totalCacheSize += (metrics.cacheSize.content || 0) + (metrics.cacheSize.render || 0);
                    } else {
                        totalCacheSize += metrics.cacheSize;
                    }
                }
                
                // Library metrics
                if (metrics.loadedLibraries) {
                    loadedLibrariesCount += metrics.loadedLibraries.length;
                }
                
                if (metrics.libraryLoadTimes) {
                    for (const [, time] of Object.entries(metrics.libraryLoadTimes)) {
                        totalLoadTime += time;
                        loadTimeCount++;
                    }
                }
                
            } catch (error) {
                console.warn('Failed to get metrics from performance manager:', error);
            }
        }
        
        // Update cache metrics
        const cacheHitRate = totalCacheRequests > 0 ? 
            Math.round((totalCacheHits / totalCacheRequests) * 100) : 0;
        
        const cacheHitRateEl = this.dashboardElement.querySelector('#cache-hit-rate');
        const cacheSizeEl = this.dashboardElement.querySelector('#cache-size');
        
        if (cacheHitRateEl) {
            cacheHitRateEl.textContent = `${cacheHitRate}%`;
        }
        
        if (cacheSizeEl) {
            cacheSizeEl.textContent = `${totalCacheSize} items`;
        }
        
        // Update library metrics
        const loadedLibrariesEl = this.dashboardElement.querySelector('#loaded-libraries');
        const avgLoadTimeEl = this.dashboardElement.querySelector('#avg-load-time');
        
        if (loadedLibrariesEl) {
            loadedLibrariesEl.textContent = loadedLibrariesCount.toString();
        }
        
        if (avgLoadTimeEl) {
            const avgTime = loadTimeCount > 0 ? Math.round(totalLoadTime / loadTimeCount) : 0;
            avgLoadTimeEl.textContent = `${avgTime}ms`;
        }
    }

    /**
     * Update memory chart
     */
    updateMemoryChart() {
        if (!this.chartContext || this.performanceData.memory.length === 0) return;
        
        const canvas = this.chartCanvas;
        const ctx = this.chartContext;
        const rect = canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Get data points
        const data = this.performanceData.memory.slice(-this.options.maxDataPoints);
        if (data.length < 2) return;
        
        // Calculate scales
        const maxValue = Math.max(...data.map(d => d.value));
        const minValue = Math.min(...data.map(d => d.value));
        const valueRange = maxValue - minValue || 1;
        
        const xStep = width / (data.length - 1);
        
        // Draw grid lines
        ctx.strokeStyle = '#f3f4f6';
        ctx.lineWidth = 1;
        
        // Horizontal grid lines
        for (let i = 0; i <= 4; i++) {
            const y = (height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // Draw memory usage line
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        data.forEach((point, index) => {
            const x = index * xStep;
            const y = height - ((point.value - minValue) / valueRange) * height;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Draw fill area
        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
        ctx.beginPath();
        
        data.forEach((point, index) => {
            const x = index * xStep;
            const y = height - ((point.value - minValue) / valueRange) * height;
            
            if (index === 0) {
                ctx.moveTo(x, height);
                ctx.lineTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();
    }

    /**
     * Record export time
     * @param {number} exportTime - Export time in milliseconds
     * @param {string} exportType - Type of export ('pdf', 'word')
     */
    recordExportTime(exportTime, exportType = 'unknown') {
        this.performanceData.exportTimes.push({
            timestamp: Date.now(),
            time: exportTime,
            type: exportType
        });
        
        // Keep only recent export times
        if (this.performanceData.exportTimes.length > 20) {
            this.performanceData.exportTimes = this.performanceData.exportTimes.slice(-10);
        }
        
        // Update UI
        const lastExportEl = this.dashboardElement.querySelector('#last-export-time');
        const avgExportEl = this.dashboardElement.querySelector('#avg-export-time');
        
        if (lastExportEl) {
            lastExportEl.textContent = `${Math.round(exportTime)}ms (${exportType})`;
        }
        
        if (avgExportEl && this.performanceData.exportTimes.length > 0) {
            const avgTime = this.performanceData.exportTimes.reduce((sum, entry) => sum + entry.time, 0) / 
                           this.performanceData.exportTimes.length;
            avgExportEl.textContent = `${Math.round(avgTime)}ms`;
        }
    }

    /**
     * Optimize memory across all registered managers
     */
    async optimizeMemory() {
        const optimizeBtn = this.dashboardElement.querySelector('.optimize-btn');
        const originalText = optimizeBtn.textContent;
        
        optimizeBtn.textContent = 'Optimizing...';
        optimizeBtn.disabled = true;
        
        try {
            for (const manager of this.performanceManagers) {
                if (manager.optimizeMemory) {
                    await manager.optimizeMemory();
                }
            }
            
            // Force garbage collection if available
            if (typeof window !== 'undefined' && window.gc) {
                window.gc();
            }
            
            console.log('Memory optimization completed');
            
        } catch (error) {
            console.error('Memory optimization failed:', error);
        } finally {
            optimizeBtn.textContent = originalText;
            optimizeBtn.disabled = false;
        }
    }

    /**
     * Clear cache across all registered managers
     */
    clearCache() {
        const clearBtn = this.dashboardElement.querySelector('.clear-cache-btn');
        const originalText = clearBtn.textContent;
        
        clearBtn.textContent = 'Clearing...';
        clearBtn.disabled = true;
        
        try {
            for (const manager of this.performanceManagers) {
                if (manager.contentCache) {
                    manager.contentCache.clear();
                }
                if (manager.renderCache) {
                    manager.renderCache.clear();
                }
            }
            
            console.log('Cache cleared');
            
        } catch (error) {
            console.error('Cache clearing failed:', error);
        } finally {
            clearBtn.textContent = originalText;
            clearBtn.disabled = false;
        }
    }

    /**
     * Show dashboard
     */
    show() {
        this.isVisible = true;
        this.dashboardElement.classList.add('visible');
        
        if (!this.updateTimer) {
            this.startMonitoring();
        }
        
        if (this.options.autoHide) {
            this.scheduleAutoHide();
        }
    }

    /**
     * Hide dashboard
     */
    hide() {
        this.isVisible = false;
        this.dashboardElement.classList.remove('visible');
        
        if (this.options.autoHide) {
            this.stopMonitoring();
        }
        
        this.cancelAutoHide();
    }

    /**
     * Toggle dashboard visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Toggle minimize state
     */
    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        this.dashboardElement.classList.toggle('minimized', this.isMinimized);
        
        const minimizeBtn = this.dashboardElement.querySelector('.minimize-btn');
        minimizeBtn.textContent = this.isMinimized ? '+' : '−';
    }

    /**
     * Schedule auto-hide
     */
    scheduleAutoHide() {
        if (!this.options.autoHide) return;
        
        this.cancelAutoHide();
        this.autoHideTimer = setTimeout(() => {
            this.hide();
        }, this.options.autoHideDelay);
    }

    /**
     * Cancel auto-hide
     */
    cancelAutoHide() {
        if (this.autoHideTimer) {
            clearTimeout(this.autoHideTimer);
            this.autoHideTimer = null;
        }
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
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    /**
     * Destroy dashboard
     */
    destroy() {
        this.stopMonitoring();
        this.cancelAutoHide();
        
        if (this.dashboardElement && this.dashboardElement.parentNode) {
            this.dashboardElement.parentNode.removeChild(this.dashboardElement);
        }
        
        this.performanceManagers.clear();
        
        console.log('PerformanceMonitorDashboard destroyed');
    }
}

// Export for use in different module systems
if (typeof window !== 'undefined') {
    window.PerformanceMonitorDashboard = PerformanceMonitorDashboard;
}

export default PerformanceMonitorDashboard;