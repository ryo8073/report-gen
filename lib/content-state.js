/**
 * ContentState Manager
 * Manages state for original and edited content across tab switches
 * Implements content persistence and dirty state tracking
 */
class ContentState {
    constructor(options = {}) {
        this.options = {
            autoSave: true,
            autoSaveInterval: 5000, // 5 seconds
            enableLocalStorage: true,
            storageKey: 'report-preview-content-state',
            ...options
        };
        
        // Core state
        this.state = {
            original: {
                content: '',
                timestamp: null,
                metadata: {}
            },
            edited: {
                content: '',
                timestamp: null,
                formatting: [],
                changes: []
            },
            activeTab: 'raw',
            isDirty: false,
            lastSaved: null,
            version: 1
        };
        
        // Event listeners
        this.listeners = {
            stateChange: [],
            contentChange: [],
            tabChange: [],
            save: [],
            error: []
        };
        
        // Auto-save timer
        this.autoSaveTimer = null;
        
        // Initialize
        this.init();
    }
    
    init() {
        // Load persisted state if available
        if (this.options.enableLocalStorage) {
            this.loadFromStorage();
        }
        
        // Set up auto-save if enabled
        if (this.options.autoSave) {
            this.setupAutoSave();
        }
        
        // Set up beforeunload handler to warn about unsaved changes
        this.setupUnloadHandler();
        
        console.log('ContentState initialized:', this.getState());
    }
    
    /**
     * Set original content (from report generation)
     */
    setOriginalContent(content, metadata = {}) {
        const timestamp = new Date().toISOString();
        
        this.state.original = {
            content: content || '',
            timestamp,
            metadata: { ...metadata }
        };
        
        // If no edited content exists, initialize with original
        if (!this.state.edited.content) {
            this.state.edited = {
                content: content || '',
                timestamp,
                formatting: [],
                changes: []
            };
        }
        
        this.state.version++;
        this.emit('contentChange', {
            type: 'original',
            content: this.state.original.content,
            metadata: this.state.original.metadata
        });
        
        this.persistState();
        console.log('Original content set:', content?.length, 'characters');
    }
    
    /**
     * Update edited content (from rich text editor)
     */
    setEditedContent(content, formatting = []) {
        const timestamp = new Date().toISOString();
        const previousContent = this.state.edited.content;
        
        this.state.edited = {
            content: content || '',
            timestamp,
            formatting: [...formatting],
            changes: this.calculateChanges(previousContent, content)
        };
        
        // Update dirty state
        const wasDirty = this.state.isDirty;
        this.state.isDirty = this.state.original.content !== content;
        
        this.state.version++;
        
        // Emit events
        this.emit('contentChange', {
            type: 'edited',
            content: this.state.edited.content,
            formatting: this.state.edited.formatting,
            changes: this.state.edited.changes,
            isDirty: this.state.isDirty
        });
        
        if (!wasDirty && this.state.isDirty) {
            this.emit('stateChange', { type: 'dirty', isDirty: true });
        } else if (wasDirty && !this.state.isDirty) {
            this.emit('stateChange', { type: 'clean', isDirty: false });
        }
        
        this.persistState();
        console.log('Edited content updated:', content?.length, 'characters, dirty:', this.state.isDirty);
    }
    
    /**
     * Switch active tab
     */
    setActiveTab(tabName) {
        if (!['raw', 'preview', 'editor', 'comparison'].includes(tabName)) {
            console.warn('Invalid tab name:', tabName);
            return false;
        }
        
        const previousTab = this.state.activeTab;
        this.state.activeTab = tabName;
        this.state.version++;
        
        this.emit('tabChange', {
            from: previousTab,
            to: tabName,
            timestamp: new Date().toISOString()
        });
        
        this.persistState();
        console.log('Active tab changed:', previousTab, '->', tabName);
        return true;
    }
    
    /**
     * Get current state (read-only copy)
     */
    getState() {
        return JSON.parse(JSON.stringify(this.state));
    }
    
    /**
     * Get original content
     */
    getOriginalContent() {
        return {
            content: this.state.original.content,
            timestamp: this.state.original.timestamp,
            metadata: { ...this.state.original.metadata }
        };
    }
    
    /**
     * Get edited content
     */
    getEditedContent() {
        return {
            content: this.state.edited.content,
            timestamp: this.state.edited.timestamp,
            formatting: [...this.state.edited.formatting],
            changes: [...this.state.edited.changes]
        };
    }
    
    /**
     * Get active tab
     */
    getActiveTab() {
        return this.state.activeTab;
    }
    
    /**
     * Check if content has unsaved changes
     */
    isDirty() {
        return this.state.isDirty;
    }
    
    /**
     * Get content for specific tab
     */
    getContentForTab(tabName) {
        switch (tabName) {
            case 'raw':
            case 'preview':
                return this.state.original.content;
            case 'editor':
            case 'comparison':
                return this.state.edited.content;
            default:
                console.warn('Unknown tab for content:', tabName);
                return this.state.original.content;
        }
    }
    
    /**
     * Save current state (mark as clean)
     */
    save() {
        const timestamp = new Date().toISOString();
        this.state.lastSaved = timestamp;
        this.state.isDirty = false;
        this.state.version++;
        
        this.emit('save', {
            timestamp,
            originalContent: this.state.original.content,
            editedContent: this.state.edited.content,
            version: this.state.version
        });
        
        this.persistState();
        console.log('Content state saved at:', timestamp);
        return true;
    }
    
    /**
     * Reset to original content (discard changes)
     */
    reset() {
        const originalContent = this.state.original.content;
        const timestamp = new Date().toISOString();
        
        this.state.edited = {
            content: originalContent,
            timestamp,
            formatting: [],
            changes: []
        };
        
        this.state.isDirty = false;
        this.state.version++;
        
        this.emit('stateChange', { type: 'reset', timestamp });
        this.emit('contentChange', {
            type: 'reset',
            content: originalContent
        });
        
        this.persistState();
        console.log('Content state reset to original');
        return true;
    }
    
    /**
     * Clear all content
     */
    clear() {
        this.state = {
            original: { content: '', timestamp: null, metadata: {} },
            edited: { content: '', timestamp: null, formatting: [], changes: [] },
            activeTab: 'raw',
            isDirty: false,
            lastSaved: null,
            version: 1
        };
        
        this.emit('stateChange', { type: 'clear' });
        this.persistState();
        console.log('Content state cleared');
    }
    
    /**
     * Event listener management
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
        return () => this.off(event, callback);
    }
    
    off(event, callback) {
        if (!this.listeners[event]) return;
        const index = this.listeners[event].indexOf(callback);
        if (index > -1) {
            this.listeners[event].splice(index, 1);
        }
    }
    
    emit(event, data) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('Error in ContentState event listener:', error);
                this.emit('error', { event, error, data });
            }
        });
    }
    
    /**
     * Calculate changes between two content versions
     */
    calculateChanges(oldContent, newContent) {
        if (!oldContent || !newContent) return [];
        
        // Simple change detection - could be enhanced with proper diff algorithm
        const changes = [];
        
        if (oldContent.length !== newContent.length) {
            changes.push({
                type: 'length',
                old: oldContent.length,
                new: newContent.length,
                timestamp: new Date().toISOString()
            });
        }
        
        if (oldContent !== newContent) {
            changes.push({
                type: 'content',
                timestamp: new Date().toISOString()
            });
        }
        
        return changes;
    }
    
    /**
     * Set up auto-save functionality
     */
    setupAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = setInterval(() => {
            if (this.state.isDirty) {
                console.log('Auto-saving content state...');
                this.save();
            }
        }, this.options.autoSaveInterval);
    }
    
    /**
     * Set up beforeunload handler
     */
    setupUnloadHandler() {
        window.addEventListener('beforeunload', (e) => {
            if (this.state.isDirty) {
                const message = '未保存の変更があります。ページを離れますか？';
                e.returnValue = message;
                return message;
            }
        });
    }
    
    /**
     * Persist state to localStorage
     */
    persistState() {
        if (!this.options.enableLocalStorage) return;
        
        try {
            const stateToSave = {
                ...this.state,
                persistedAt: new Date().toISOString()
            };
            localStorage.setItem(this.options.storageKey, JSON.stringify(stateToSave));
        } catch (error) {
            console.warn('Failed to persist ContentState:', error);
            this.emit('error', { type: 'persistence', error });
        }
    }
    
    /**
     * Load state from localStorage
     */
    loadFromStorage() {
        try {
            const saved = localStorage.getItem(this.options.storageKey);
            if (saved) {
                const parsedState = JSON.parse(saved);
                
                // Validate and merge saved state
                if (parsedState && typeof parsedState === 'object') {
                    this.state = {
                        ...this.state,
                        ...parsedState,
                        version: (parsedState.version || 0) + 1
                    };
                    console.log('ContentState loaded from storage:', parsedState.persistedAt);
                }
            }
        } catch (error) {
            console.warn('Failed to load ContentState from storage:', error);
            this.emit('error', { type: 'loading', error });
        }
    }
    
    /**
     * Export state for debugging or backup
     */
    export() {
        return {
            state: this.getState(),
            options: { ...this.options },
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * Import state from backup
     */
    import(exportedData) {
        if (!exportedData || !exportedData.state) {
            throw new Error('Invalid import data');
        }
        
        this.state = {
            ...this.state,
            ...exportedData.state,
            version: (exportedData.state.version || 0) + 1
        };
        
        this.emit('stateChange', { type: 'import', data: exportedData });
        this.persistState();
        console.log('ContentState imported from backup');
    }
    
    /**
     * Cleanup resources
     */
    destroy() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
        
        // Clear all listeners
        Object.keys(this.listeners).forEach(event => {
            this.listeners[event] = [];
        });
        
        console.log('ContentState destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContentState;
} else if (typeof window !== 'undefined') {
    window.ContentState = ContentState;
}