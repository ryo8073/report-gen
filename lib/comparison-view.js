/**
 * ComparisonView - Side-by-side comparison of original and edited content
 * Provides synchronized scrolling and change reversion functionality
 */
class ComparisonView {
    constructor(container, options = {}) {
        this.container = container;
        this.diffEngine = new DiffEngine();
        this.options = {
            showLineNumbers: true,
            syncScroll: true,
            allowReversion: true,
            ...options
        };
        
        this.originalContent = '';
        this.editedContent = '';
        this.currentDiff = null;
        this.scrollSyncEnabled = true;
        
        this.elements = {
            originalPanel: null,
            editedPanel: null,
            statsPanel: null,
            toolbar: null
        };
        
        this.init();
    }

    /**
     * Initialize the comparison view
     */
    init() {
        this.createStructure();
        this.attachEventListeners();
        this.applyStyles();
    }

    /**
     * Create the HTML structure for the comparison view
     */
    createStructure() {
        this.container.innerHTML = `
            <div class="comparison-view">
                <div class="comparison-toolbar">
                    <div class="comparison-stats">
                        <span class="stats-item" id="total-changes">No changes</span>
                        <span class="stats-item" id="added-lines">+0</span>
                        <span class="stats-item" id="removed-lines">-0</span>
                        <span class="stats-item" id="modified-lines">~0</span>
                    </div>
                    <div class="comparison-controls">
                        <button id="sync-scroll-toggle" class="control-btn active" title="Toggle synchronized scrolling">
                            <span class="sync-icon">⇅</span> Sync Scroll
                        </button>
                        <button id="reset-changes" class="control-btn" title="Reset all changes">
                            <span class="reset-icon">↺</span> Reset
                        </button>
                    </div>
                </div>
                
                <div class="comparison-panels">
                    <div class="comparison-panel original-panel">
                        <div class="panel-header">
                            <h3>Original</h3>
                            <span class="panel-info">Read-only</span>
                        </div>
                        <div class="panel-content" id="original-content">
                            <div class="empty-state">No content to compare</div>
                        </div>
                    </div>
                    
                    <div class="comparison-divider"></div>
                    
                    <div class="comparison-panel edited-panel">
                        <div class="panel-header">
                            <h3>Edited</h3>
                            <span class="panel-info">Modified version</span>
                        </div>
                        <div class="panel-content" id="edited-content">
                            <div class="empty-state">No content to compare</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Store references to key elements
        this.elements.originalPanel = this.container.querySelector('#original-content');
        this.elements.editedPanel = this.container.querySelector('#edited-content');
        this.elements.statsPanel = this.container.querySelector('.comparison-stats');
        this.elements.toolbar = this.container.querySelector('.comparison-toolbar');
    }

    /**
     * Attach event listeners for user interactions
     */
    attachEventListeners() {
        // Synchronized scrolling
        if (this.options.syncScroll) {
            this.elements.originalPanel.addEventListener('scroll', (e) => {
                if (this.scrollSyncEnabled) {
                    this.syncScroll(e.target, this.elements.editedPanel);
                }
            });
            
            this.elements.editedPanel.addEventListener('scroll', (e) => {
                if (this.scrollSyncEnabled) {
                    this.syncScroll(e.target, this.elements.originalPanel);
                }
            });
        }
        
        // Toggle sync scroll
        const syncToggle = this.container.querySelector('#sync-scroll-toggle');
        syncToggle.addEventListener('click', () => {
            this.toggleSyncScroll();
        });
        
        // Reset changes
        const resetBtn = this.container.querySelector('#reset-changes');
        resetBtn.addEventListener('click', () => {
            this.resetChanges();
        });
        
        // Line click handlers for reversion (if enabled)
        if (this.options.allowReversion) {
            this.attachReversionHandlers();
        }
    }

    /**
     * Apply CSS styles for the comparison view
     */
    applyStyles() {
        const styles = `
            <style id="comparison-view-styles">
                .comparison-view {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                }
                
                .comparison-toolbar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 16px;
                    background: #f8f9fa;
                    border-bottom: 1px solid #e9ecef;
                    flex-shrink: 0;
                }
                
                .comparison-stats {
                    display: flex;
                    gap: 16px;
                }
                
                .stats-item {
                    font-size: 14px;
                    font-weight: 500;
                    padding: 4px 8px;
                    border-radius: 4px;
                    background: #e9ecef;
                }
                
                .stats-item:nth-child(2) { background: #d4edda; color: #155724; }
                .stats-item:nth-child(3) { background: #f8d7da; color: #721c24; }
                .stats-item:nth-child(4) { background: #fff3cd; color: #856404; }
                
                .comparison-controls {
                    display: flex;
                    gap: 8px;
                }
                
                .control-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    border: 1px solid #dee2e6;
                    background: white;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                    transition: all 0.2s;
                }
                
                .control-btn:hover {
                    background: #f8f9fa;
                    border-color: #adb5bd;
                }
                
                .control-btn.active {
                    background: #007bff;
                    color: white;
                    border-color: #007bff;
                }
                
                .comparison-panels {
                    display: flex;
                    flex: 1;
                    overflow: hidden;
                }
                
                .comparison-panel {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                
                .panel-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 16px;
                    background: #f8f9fa;
                    border-bottom: 1px solid #e9ecef;
                    flex-shrink: 0;
                }
                
                .panel-header h3 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 600;
                }
                
                .panel-info {
                    font-size: 12px;
                    color: #6c757d;
                }
                
                .panel-content {
                    flex: 1;
                    overflow: auto;
                    padding: 16px;
                    background: white;
                    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                    font-size: 14px;
                    line-height: 1.5;
                }
                
                .comparison-divider {
                    width: 1px;
                    background: #e9ecef;
                    flex-shrink: 0;
                }
                
                .diff-line {
                    padding: 2px 8px;
                    margin: 1px 0;
                    border-radius: 3px;
                    cursor: pointer;
                    position: relative;
                }
                
                .diff-line:hover {
                    background: rgba(0, 123, 255, 0.1);
                }
                
                .diff-added {
                    background: #d4edda;
                    border-left: 3px solid #28a745;
                }
                
                .diff-removed {
                    background: #f8d7da;
                    border-left: 3px solid #dc3545;
                }
                
                .diff-modified {
                    background: #fff3cd;
                    border-left: 3px solid #ffc107;
                }
                
                .diff-unchanged {
                    background: transparent;
                }
                
                .diff-word-added {
                    background: #28a745;
                    color: white;
                    padding: 1px 3px;
                    border-radius: 2px;
                }
                
                .diff-word-removed {
                    background: #dc3545;
                    color: white;
                    padding: 1px 3px;
                    border-radius: 2px;
                    text-decoration: line-through;
                }
                
                .diff-word-modified {
                    background: #ffc107;
                    color: #212529;
                    padding: 1px 3px;
                    border-radius: 2px;
                }
                
                .empty-state {
                    text-align: center;
                    color: #6c757d;
                    font-style: italic;
                    padding: 40px 20px;
                }
                
                .revert-btn {
                    position: absolute;
                    right: 8px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: #6c757d;
                    color: white;
                    border: none;
                    border-radius: 3px;
                    padding: 2px 6px;
                    font-size: 11px;
                    cursor: pointer;
                    opacity: 0;
                    transition: opacity 0.2s;
                }
                
                .diff-line:hover .revert-btn {
                    opacity: 1;
                }
                
                .revert-btn:hover {
                    background: #495057;
                }
            </style>
        `;
        
        // Remove existing styles and add new ones
        const existingStyles = document.getElementById('comparison-view-styles');
        if (existingStyles) {
            existingStyles.remove();
        }
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }

    /**
     * Update the comparison with new content
     * @param {string} originalContent - Original content
     * @param {string} editedContent - Edited content
     */
    updateComparison(originalContent, editedContent) {
        this.originalContent = originalContent || '';
        this.editedContent = editedContent || '';
        
        // Generate diff
        this.currentDiff = this.diffEngine.compareTexts(this.originalContent, this.editedContent);
        
        // Update display
        this.renderComparison();
        this.updateStats();
    }

    /**
     * Render the comparison in both panels
     */
    renderComparison() {
        if (!this.currentDiff || this.currentDiff.changes.length === 0) {
            this.elements.originalPanel.innerHTML = '<div class="empty-state">No content to compare</div>';
            this.elements.editedPanel.innerHTML = '<div class="empty-state">No content to compare</div>';
            return;
        }
        
        const highlightedHTML = this.diffEngine.generateHighlightedHTML(this.currentDiff);
        
        this.elements.originalPanel.innerHTML = highlightedHTML.originalHTML || '<div class="empty-state">No original content</div>';
        this.elements.editedPanel.innerHTML = highlightedHTML.editedHTML || '<div class="empty-state">No edited content</div>';
        
        // Re-attach reversion handlers after rendering
        if (this.options.allowReversion) {
            this.attachReversionHandlers();
        }
    }

    /**
     * Update statistics display
     */
    updateStats() {
        if (!this.currentDiff) return;
        
        const stats = this.diffEngine.getChangeStats(this.currentDiff);
        
        const totalChanges = stats.addedLines + stats.removedLines + stats.modifiedLines;
        
        this.container.querySelector('#total-changes').textContent = 
            totalChanges > 0 ? `${totalChanges} changes` : 'No changes';
        this.container.querySelector('#added-lines').textContent = `+${stats.addedLines}`;
        this.container.querySelector('#removed-lines').textContent = `-${stats.removedLines}`;
        this.container.querySelector('#modified-lines').textContent = `~${stats.modifiedLines}`;
    }

    /**
     * Synchronize scrolling between panels
     * @param {Element} source - Source panel that was scrolled
     * @param {Element} target - Target panel to sync
     */
    syncScroll(source, target) {
        const scrollPercentage = source.scrollTop / (source.scrollHeight - source.clientHeight);
        const targetScrollTop = scrollPercentage * (target.scrollHeight - target.clientHeight);
        
        // Temporarily disable sync to prevent infinite loop
        this.scrollSyncEnabled = false;
        target.scrollTop = targetScrollTop;
        
        setTimeout(() => {
            this.scrollSyncEnabled = true;
        }, 50);
    }

    /**
     * Toggle synchronized scrolling
     */
    toggleSyncScroll() {
        this.scrollSyncEnabled = !this.scrollSyncEnabled;
        const toggleBtn = this.container.querySelector('#sync-scroll-toggle');
        
        if (this.scrollSyncEnabled) {
            toggleBtn.classList.add('active');
            toggleBtn.title = 'Disable synchronized scrolling';
        } else {
            toggleBtn.classList.remove('active');
            toggleBtn.title = 'Enable synchronized scrolling';
        }
    }

    /**
     * Attach reversion handlers to diff lines
     */
    attachReversionHandlers() {
        const diffLines = this.container.querySelectorAll('.diff-added, .diff-removed, .diff-modified');
        
        diffLines.forEach(line => {
            // Remove existing revert button
            const existingBtn = line.querySelector('.revert-btn');
            if (existingBtn) {
                existingBtn.remove();
            }
            
            // Add revert button for changes
            if (!line.classList.contains('diff-unchanged')) {
                const revertBtn = document.createElement('button');
                revertBtn.className = 'revert-btn';
                revertBtn.textContent = 'Revert';
                revertBtn.title = 'Revert this change';
                
                revertBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.revertChange(line);
                });
                
                line.appendChild(revertBtn);
            }
        });
    }

    /**
     * Revert a specific change
     * @param {Element} lineElement - The line element to revert
     */
    revertChange(lineElement) {
        const lineNumber = parseInt(lineElement.dataset.line);
        
        if (!this.currentDiff || !lineNumber) return;
        
        const change = this.currentDiff.changes.find(c => 
            c.lineNumber === lineNumber || 
            c.originalLineNumber === lineNumber || 
            c.editedLineNumber === lineNumber
        );
        
        if (!change) return;
        
        // Emit revert event for parent components to handle
        const revertEvent = new CustomEvent('revertChange', {
            detail: {
                change: change,
                lineNumber: lineNumber,
                changeType: change.type
            }
        });
        
        this.container.dispatchEvent(revertEvent);
        
        // Provide visual feedback
        lineElement.style.opacity = '0.5';
        setTimeout(() => {
            lineElement.style.opacity = '1';
        }, 300);
    }

    /**
     * Reset all changes to original content
     */
    resetChanges() {
        const resetEvent = new CustomEvent('resetAllChanges', {
            detail: {
                originalContent: this.originalContent
            }
        });
        
        this.container.dispatchEvent(resetEvent);
    }

    /**
     * Get current diff statistics
     * @returns {Object} Current diff statistics
     */
    getStats() {
        return this.currentDiff ? this.diffEngine.getChangeStats(this.currentDiff) : null;
    }

    /**
     * Scroll to a specific line number
     * @param {number} lineNumber - Line number to scroll to
     */
    scrollToLine(lineNumber) {
        const lineElement = this.container.querySelector(`[data-line="${lineNumber}"]`);
        if (lineElement) {
            lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Highlight the line temporarily
            lineElement.style.background = 'rgba(0, 123, 255, 0.3)';
            setTimeout(() => {
                lineElement.style.background = '';
            }, 2000);
        }
    }

    /**
     * Destroy the comparison view and clean up
     */
    destroy() {
        // Remove event listeners
        this.elements.originalPanel?.removeEventListener('scroll', this.syncScroll);
        this.elements.editedPanel?.removeEventListener('scroll', this.syncScroll);
        
        // Remove styles
        const styles = document.getElementById('comparison-view-styles');
        if (styles) {
            styles.remove();
        }
        
        // Clear container
        this.container.innerHTML = '';
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComparisonView;
} else if (typeof window !== 'undefined') {
    window.ComparisonView = ComparisonView;
}