/**
 * Accessibility Manager
 * Provides comprehensive accessibility features for the proposal editor
 * Implements WCAG 2.1 AA compliance standards
 */

class AccessibilityManager {
    constructor(options = {}) {
        this.options = {
            enableKeyboardNavigation: true,
            enableScreenReaderSupport: true,
            enableHighContrast: true,
            enableFocusManagement: true,
            enableAriaLiveRegions: true,
            enableReducedMotion: true,
            announceChanges: true,
            keyboardShortcuts: true,
            ...options
        };
        
        // State management
        this.isHighContrast = false;
        this.isReducedMotion = false;
        this.focusHistory = [];
        this.currentFocusIndex = -1;
        this.modalStack = [];
        this.keyboardTrapStack = [];
        
        // ARIA live regions
        this.liveRegions = {
            polite: null,
            assertive: null,
            status: null
        };
        
        // Keyboard navigation
        this.keyboardHandlers = new Map();
        this.focusableSelectors = [
            'button:not([disabled])',
            '[href]',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
            '[contenteditable="true"]',
            '[role="button"]:not([aria-disabled="true"])',
            '[role="link"]:not([aria-disabled="true"])',
            '[role="textbox"]:not([aria-disabled="true"])',
            '[role="combobox"]:not([aria-disabled="true"])',
            '[role="listbox"]:not([aria-disabled="true"])',
            '[role="option"]:not([aria-disabled="true"])',
            '[role="tab"]:not([aria-disabled="true"])',
            '[role="menuitem"]:not([aria-disabled="true"])'
        ];
        
        // Event listeners
        this.listeners = {
            focusChange: [],
            keyboardNavigation: [],
            screenReaderAnnouncement: [],
            contrastChange: [],
            modalStateChange: []
        };
        
        this.init();
    }
    
    /**
     * Initialize accessibility features
     */
    init() {
        try {
            // Create ARIA live regions
            this.createLiveRegions();
            
            // Set up keyboard navigation
            if (this.options.enableKeyboardNavigation) {
                this.setupKeyboardNavigation();
            }
            
            // Set up screen reader support
            if (this.options.enableScreenReaderSupport) {
                this.setupScreenReaderSupport();
            }
            
            // Set up focus management
            if (this.options.enableFocusManagement) {
                this.setupFocusManagement();
            }
            
            // Set up high contrast mode
            if (this.options.enableHighContrast) {
                this.setupHighContrastMode();
            }
            
            // Set up reduced motion support
            if (this.options.enableReducedMotion) {
                this.setupReducedMotionSupport();
            }
            
            // Set up global keyboard shortcuts
            if (this.options.keyboardShortcuts) {
                this.setupGlobalKeyboardShortcuts();
            }
            
            // Monitor for accessibility preference changes
            this.monitorAccessibilityPreferences();
            
            console.log('Accessibility Manager initialized');
            this.announce('アクセシビリティ機能が有効になりました', 'polite');
            
        } catch (error) {
            console.error('Accessibility Manager initialization error:', error);
        }
    }
    
    /**
     * Create ARIA live regions for screen reader announcements
     */
    createLiveRegions() {
        // Polite live region for non-urgent announcements
        this.liveRegions.polite = this.createLiveRegion('polite', 'accessibility-announcements-polite');
        
        // Assertive live region for urgent announcements
        this.liveRegions.assertive = this.createLiveRegion('assertive', 'accessibility-announcements-assertive');
        
        // Status live region for status updates
        this.liveRegions.status = this.createLiveRegion('polite', 'accessibility-status');
        this.liveRegions.status.setAttribute('role', 'status');
    }
    
    /**
     * Create a single live region
     */
    createLiveRegion(politeness, id) {
        const region = document.createElement('div');
        region.setAttribute('aria-live', politeness);
        region.setAttribute('aria-atomic', 'true');
        region.className = 'sr-only';
        region.id = id;
        document.body.appendChild(region);
        return region;
    }
    
    /**
     * Set up comprehensive keyboard navigation
     */
    setupKeyboardNavigation() {
        // Global keyboard event handler
        document.addEventListener('keydown', (e) => {
            this.handleGlobalKeydown(e);
        });
        
        // Focus tracking
        document.addEventListener('focusin', (e) => {
            this.handleFocusIn(e);
        });
        
        document.addEventListener('focusout', (e) => {
            this.handleFocusOut(e);
        });
        
        // Set up roving tabindex for complex widgets
        this.setupRovingTabindex();
        
        console.log('Keyboard navigation initialized');
    }
    
    /**
     * Handle global keyboard events
     */
    handleGlobalKeydown(e) {
        // Skip if user is typing in an input field
        if (this.isTypingContext(e.target)) {
            return;
        }
        
        // Handle global shortcuts
        if (e.altKey) {
            this.handleAltKeyShortcuts(e);
        } else if (e.ctrlKey || e.metaKey) {
            this.handleCtrlKeyShortcuts(e);
        } else {
            this.handleNavigationKeys(e);
        }
        
        // Emit keyboard navigation event
        this.emit('keyboardNavigation', {
            key: e.key,
            target: e.target,
            handled: e.defaultPrevented
        });
    }
    
    /**
     * Handle Alt key shortcuts for accessibility
     */
    handleAltKeyShortcuts(e) {
        switch (e.key) {
            case '1':
                e.preventDefault();
                this.focusMainContent();
                break;
            case '2':
                e.preventDefault();
                this.focusNavigation();
                break;
            case 'h':
                e.preventDefault();
                this.toggleHighContrast();
                break;
            case 's':
                e.preventDefault();
                this.skipToContent();
                break;
            case 'm':
                e.preventDefault();
                this.openAccessibilityMenu();
                break;
        }
    }
    
    /**
     * Handle Ctrl key shortcuts
     */
    handleCtrlKeyShortcuts(e) {
        // These will be handled by individual components
        // but we track them for accessibility purposes
        const shortcuts = ['b', 'i', 'u', 's', 'z', 'y'];
        if (shortcuts.includes(e.key)) {
            this.announce(`キーボードショートカット: Ctrl+${e.key.toUpperCase()}`, 'polite');
        }
    }
    
    /**
     * Handle navigation keys
     */
    handleNavigationKeys(e) {
        switch (e.key) {
            case 'Escape':
                this.handleEscapeKey(e);
                break;
            case 'F6':
                e.preventDefault();
                this.cycleFocusRegions(e.shiftKey);
                break;
            case 'Tab':
                this.handleTabNavigation(e);
                break;
        }
    }
    
    /**
     * Handle Escape key functionality
     */
    handleEscapeKey(e) {
        // Close modal if one is open
        if (this.modalStack.length > 0) {
            e.preventDefault();
            this.closeTopModal();
            return;
        }
        
        // Exit keyboard trap if active
        if (this.keyboardTrapStack.length > 0) {
            e.preventDefault();
            this.exitKeyboardTrap();
            return;
        }
        
        // Clear focus if on a non-essential element
        const activeElement = document.activeElement;
        if (activeElement && !this.isEssentialElement(activeElement)) {
            activeElement.blur();
            this.announce('フォーカスをクリアしました', 'polite');
        }
    }
    
    /**
     * Set up screen reader support
     */
    setupScreenReaderSupport() {
        // Add missing ARIA labels to elements
        this.addMissingAriaLabels();
        
        // Set up proper heading structure
        this.validateHeadingStructure();
        
        // Add landmark roles where missing
        this.addLandmarkRoles();
        
        // Set up form labels
        this.setupFormLabels();
        
        // Monitor dynamic content changes
        this.monitorDynamicContent();
        
        console.log('Screen reader support initialized');
    }
    
    /**
     * Add missing ARIA labels to interactive elements
     */
    addMissingAriaLabels() {
        const elementsNeedingLabels = document.querySelectorAll(
            'button:not([aria-label]):not([aria-labelledby]), ' +
            'input:not([aria-label]):not([aria-labelledby]), ' +
            'select:not([aria-label]):not([aria-labelledby]), ' +
            'textarea:not([aria-label]):not([aria-labelledby]), ' +
            '[role="button"]:not([aria-label]):not([aria-labelledby]), ' +
            '[role="textbox"]:not([aria-label]):not([aria-labelledby])'
        );
        
        elementsNeedingLabels.forEach(element => {
            this.addAriaLabel(element);
        });
    }
    
    /**
     * Add appropriate ARIA label to an element
     */
    addAriaLabel(element) {
        let label = '';
        
        // Try to get label from text content
        if (element.textContent && element.textContent.trim()) {
            label = element.textContent.trim();
        }
        // Try to get label from title attribute
        else if (element.title) {
            label = element.title;
        }
        // Try to get label from placeholder
        else if (element.placeholder) {
            label = element.placeholder;
        }
        // Generate label based on element type and context
        else {
            label = this.generateAriaLabel(element);
        }
        
        if (label) {
            element.setAttribute('aria-label', label);
        }
    }
    
    /**
     * Generate ARIA label based on element context
     */
    generateAriaLabel(element) {
        const tagName = element.tagName.toLowerCase();
        const role = element.getAttribute('role');
        const className = element.className;
        
        // Button-like elements
        if (tagName === 'button' || role === 'button') {
            if (className.includes('close')) return '閉じる';
            if (className.includes('save')) return '保存';
            if (className.includes('export')) return 'エクスポート';
            if (className.includes('copy')) return 'コピー';
            if (className.includes('edit')) return '編集';
            if (className.includes('delete')) return '削除';
            return 'ボタン';
        }
        
        // Input elements
        if (tagName === 'input') {
            const type = element.type;
            if (type === 'text') return 'テキスト入力';
            if (type === 'email') return 'メールアドレス入力';
            if (type === 'password') return 'パスワード入力';
            if (type === 'search') return '検索';
            if (type === 'file') return 'ファイル選択';
            return '入力フィールド';
        }
        
        // Other elements
        if (tagName === 'select') return '選択';
        if (tagName === 'textarea') return 'テキストエリア';
        
        return '操作可能な要素';
    }
    
    /**
     * Set up focus management system
     */
    setupFocusManagement() {
        // Track focus changes
        document.addEventListener('focusin', (e) => {
            this.trackFocus(e.target);
        });
        
        // Set up focus indicators
        this.setupFocusIndicators();
        
        // Set up focus restoration
        this.setupFocusRestoration();
        
        console.log('Focus management initialized');
    }
    
    /**
     * Track focus for history and restoration
     */
    trackFocus(element) {
        // Don't track focus on non-interactive elements
        if (!this.isFocusable(element)) {
            return;
        }
        
        // Add to focus history
        this.focusHistory.push({
            element: element,
            timestamp: Date.now(),
            selector: this.getElementSelector(element)
        });
        
        // Limit history size
        if (this.focusHistory.length > 50) {
            this.focusHistory.shift();
        }
        
        this.currentFocusIndex = this.focusHistory.length - 1;
        
        // Emit focus change event
        this.emit('focusChange', {
            element: element,
            selector: this.getElementSelector(element)
        });
    }
    
    /**
     * Set up enhanced focus indicators
     */
    setupFocusIndicators() {
        // Add CSS for enhanced focus indicators
        const style = document.createElement('style');
        style.textContent = `
            .accessibility-focus-indicator {
                outline: 3px solid #0066cc !important;
                outline-offset: 2px !important;
                box-shadow: 0 0 0 1px #ffffff, 0 0 0 4px #0066cc !important;
            }
            
            .accessibility-focus-indicator-high-contrast {
                outline: 3px solid #ffff00 !important;
                outline-offset: 2px !important;
                box-shadow: 0 0 0 1px #000000, 0 0 0 4px #ffff00 !important;
            }
            
            @media (prefers-reduced-motion: reduce) {
                .accessibility-focus-indicator,
                .accessibility-focus-indicator-high-contrast {
                    transition: none !important;
                }
            }
        `;
        document.head.appendChild(style);
        
        // Apply focus indicators to focusable elements
        document.addEventListener('focusin', (e) => {
            this.applyFocusIndicator(e.target);
        });
        
        document.addEventListener('focusout', (e) => {
            this.removeFocusIndicator(e.target);
        });
    }
    
    /**
     * Apply focus indicator to element
     */
    applyFocusIndicator(element) {
        if (!this.isFocusable(element)) return;
        
        const className = this.isHighContrast ? 
            'accessibility-focus-indicator-high-contrast' : 
            'accessibility-focus-indicator';
            
        element.classList.add(className);
    }
    
    /**
     * Remove focus indicator from element
     */
    removeFocusIndicator(element) {
        element.classList.remove('accessibility-focus-indicator');
        element.classList.remove('accessibility-focus-indicator-high-contrast');
    }
    
    /**
     * Set up high contrast mode
     */
    setupHighContrastMode() {
        // Check for system preference
        if (window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches) {
            this.enableHighContrast();
        }
        
        // Listen for system preference changes
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-contrast: high)');
            mediaQuery.addEventListener('change', (e) => {
                if (e.matches) {
                    this.enableHighContrast();
                } else {
                    this.disableHighContrast();
                }
            });
        }
        
        console.log('High contrast mode support initialized');
    }
    
    /**
     * Enable high contrast mode
     */
    enableHighContrast() {
        this.isHighContrast = true;
        document.body.classList.add('accessibility-high-contrast');
        
        // Add high contrast CSS
        this.addHighContrastStyles();
        
        // Update focus indicators
        document.querySelectorAll('.accessibility-focus-indicator').forEach(element => {
            element.classList.remove('accessibility-focus-indicator');
            element.classList.add('accessibility-focus-indicator-high-contrast');
        });
        
        this.announce('ハイコントラストモードが有効になりました', 'polite');
        this.emit('contrastChange', { enabled: true });
    }
    
    /**
     * Disable high contrast mode
     */
    disableHighContrast() {
        this.isHighContrast = false;
        document.body.classList.remove('accessibility-high-contrast');
        
        // Remove high contrast CSS
        this.removeHighContrastStyles();
        
        // Update focus indicators
        document.querySelectorAll('.accessibility-focus-indicator-high-contrast').forEach(element => {
            element.classList.remove('accessibility-focus-indicator-high-contrast');
            element.classList.add('accessibility-focus-indicator');
        });
        
        this.announce('ハイコントラストモードが無効になりました', 'polite');
        this.emit('contrastChange', { enabled: false });
    }
    
    /**
     * Toggle high contrast mode
     */
    toggleHighContrast() {
        if (this.isHighContrast) {
            this.disableHighContrast();
        } else {
            this.enableHighContrast();
        }
    }
    
    /**
     * Add high contrast styles
     */
    addHighContrastStyles() {
        if (document.getElementById('accessibility-high-contrast-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'accessibility-high-contrast-styles';
        style.textContent = `
            .accessibility-high-contrast {
                filter: contrast(150%) brightness(1.2);
            }
            
            .accessibility-high-contrast button,
            .accessibility-high-contrast input,
            .accessibility-high-contrast select,
            .accessibility-high-contrast textarea {
                border: 2px solid #000000 !important;
                background: #ffffff !important;
                color: #000000 !important;
            }
            
            .accessibility-high-contrast button:hover,
            .accessibility-high-contrast button:focus {
                background: #ffff00 !important;
                color: #000000 !important;
            }
            
            .accessibility-high-contrast a {
                color: #0000ff !important;
                text-decoration: underline !important;
            }
            
            .accessibility-high-contrast a:visited {
                color: #800080 !important;
            }
            
            .accessibility-high-contrast a:hover,
            .accessibility-high-contrast a:focus {
                background: #ffff00 !important;
                color: #000000 !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Remove high contrast styles
     */
    removeHighContrastStyles() {
        const style = document.getElementById('accessibility-high-contrast-styles');
        if (style) {
            style.remove();
        }
    }
    
    /**
     * Set up modal focus management
     */
    setupModalFocusManagement(modal, options = {}) {
        const modalOptions = {
            returnFocus: true,
            trapFocus: true,
            closeOnEscape: true,
            ...options
        };
        
        // Store current focus for restoration
        const previousFocus = document.activeElement;
        
        // Add modal to stack
        this.modalStack.push({
            element: modal,
            previousFocus: previousFocus,
            options: modalOptions
        });
        
        // Set up keyboard trap
        if (modalOptions.trapFocus) {
            this.setupKeyboardTrap(modal);
        }
        
        // Focus first focusable element in modal
        const firstFocusable = this.getFirstFocusableElement(modal);
        if (firstFocusable) {
            firstFocusable.focus();
        }
        
        // Set ARIA attributes
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        
        // Hide background content from screen readers
        this.hideBackgroundContent(modal);
        
        this.announce('ダイアログが開きました', 'assertive');
        this.emit('modalStateChange', { opened: true, modal: modal });
    }
    
    /**
     * Close modal and restore focus
     */
    closeModal(modal) {
        const modalInfo = this.modalStack.find(m => m.element === modal);
        if (!modalInfo) return;
        
        // Remove from stack
        this.modalStack = this.modalStack.filter(m => m.element !== modal);
        
        // Remove keyboard trap
        this.removeKeyboardTrap(modal);
        
        // Restore focus
        if (modalInfo.options.returnFocus && modalInfo.previousFocus) {
            modalInfo.previousFocus.focus();
        }
        
        // Show background content to screen readers
        this.showBackgroundContent();
        
        this.announce('ダイアログが閉じられました', 'assertive');
        this.emit('modalStateChange', { opened: false, modal: modal });
    }
    
    /**
     * Set up keyboard trap for modal
     */
    setupKeyboardTrap(container) {
        const focusableElements = this.getFocusableElements(container);
        if (focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        const trapHandler = (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    // Shift + Tab
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    // Tab
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        };
        
        container.addEventListener('keydown', trapHandler);
        
        // Store trap info
        this.keyboardTrapStack.push({
            container: container,
            handler: trapHandler,
            firstElement: firstElement,
            lastElement: lastElement
        });
    }
    
    /**
     * Remove keyboard trap
     */
    removeKeyboardTrap(container) {
        const trapIndex = this.keyboardTrapStack.findIndex(trap => trap.container === container);
        if (trapIndex === -1) return;
        
        const trap = this.keyboardTrapStack[trapIndex];
        container.removeEventListener('keydown', trap.handler);
        
        this.keyboardTrapStack.splice(trapIndex, 1);
    }
    
    /**
     * Announce message to screen readers
     */
    announce(message, priority = 'polite') {
        if (!message || !this.options.announceChanges) return;
        
        const region = this.liveRegions[priority] || this.liveRegions.polite;
        
        // Clear and set new message
        region.textContent = '';
        setTimeout(() => {
            region.textContent = message;
        }, 100);
        
        // Emit announcement event
        this.emit('screenReaderAnnouncement', {
            message: message,
            priority: priority
        });
    }
    
    /**
     * Update status message
     */
    updateStatus(message) {
        if (this.liveRegions.status) {
            this.liveRegions.status.textContent = message;
        }
    }
    
    /**
     * Get all focusable elements in container
     */
    getFocusableElements(container = document) {
        return Array.from(container.querySelectorAll(this.focusableSelectors.join(', ')))
            .filter(element => this.isFocusable(element));
    }
    
    /**
     * Check if element is focusable
     */
    isFocusable(element) {
        if (!element || element.disabled || element.getAttribute('aria-disabled') === 'true') {
            return false;
        }
        
        // Check if element is visible
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') {
            return false;
        }
        
        // Check if element has negative tabindex (unless it's -1 and has a role)
        const tabIndex = element.tabIndex;
        if (tabIndex < -1) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Get first focusable element in container
     */
    getFirstFocusableElement(container) {
        const focusableElements = this.getFocusableElements(container);
        return focusableElements.length > 0 ? focusableElements[0] : null;
    }
    
    /**
     * Get last focusable element in container
     */
    getLastFocusableElement(container) {
        const focusableElements = this.getFocusableElements(container);
        return focusableElements.length > 0 ? focusableElements[focusableElements.length - 1] : null;
    }
    
    /**
     * Utility methods
     */
    
    isTypingContext(element) {
        const tagName = element.tagName.toLowerCase();
        const type = element.type;
        const contentEditable = element.contentEditable;
        
        return (
            tagName === 'input' && ['text', 'email', 'password', 'search', 'url', 'tel'].includes(type) ||
            tagName === 'textarea' ||
            contentEditable === 'true' ||
            element.getAttribute('role') === 'textbox'
        );
    }
    
    isEssentialElement(element) {
        const tagName = element.tagName.toLowerCase();
        const role = element.getAttribute('role');
        
        return (
            tagName === 'input' ||
            tagName === 'textarea' ||
            tagName === 'select' ||
            role === 'textbox' ||
            role === 'combobox' ||
            role === 'listbox'
        );
    }
    
    getElementSelector(element) {
        if (element.id) {
            return `#${element.id}`;
        }
        
        let selector = element.tagName.toLowerCase();
        
        if (element.className) {
            selector += '.' + element.className.split(' ').join('.');
        }
        
        return selector;
    }
    
    /**
     * Event system
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
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
                console.error('Accessibility Manager event callback error:', error);
            }
        });
    }
    
    /**
     * Additional helper methods for specific accessibility features
     */
    
    setupReducedMotionSupport() {
        // Check for system preference
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.enableReducedMotion();
        }
        
        // Listen for system preference changes
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            mediaQuery.addEventListener('change', (e) => {
                if (e.matches) {
                    this.enableReducedMotion();
                } else {
                    this.disableReducedMotion();
                }
            });
        }
    }
    
    enableReducedMotion() {
        this.isReducedMotion = true;
        document.body.classList.add('accessibility-reduced-motion');
        
        // Add CSS for reduced motion
        const style = document.createElement('style');
        style.id = 'accessibility-reduced-motion-styles';
        style.textContent = `
            .accessibility-reduced-motion *,
            .accessibility-reduced-motion *::before,
            .accessibility-reduced-motion *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
                scroll-behavior: auto !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    disableReducedMotion() {
        this.isReducedMotion = false;
        document.body.classList.remove('accessibility-reduced-motion');
        
        const style = document.getElementById('accessibility-reduced-motion-styles');
        if (style) {
            style.remove();
        }
    }
    
    setupGlobalKeyboardShortcuts() {
        // Alt+1: Focus main content
        // Alt+2: Focus navigation
        // Alt+H: Toggle high contrast
        // Alt+S: Skip to content
        // Alt+M: Open accessibility menu
        // F6: Cycle focus regions
        
        console.log('Global keyboard shortcuts initialized');
        this.announce('キーボードショートカットが利用可能です。Alt+Mでアクセシビリティメニューを開けます。', 'polite');
    }
    
    focusMainContent() {
        const main = document.querySelector('main, [role="main"], #main-content, .main-content');
        if (main) {
            main.focus();
            this.announce('メインコンテンツにフォーカスしました', 'polite');
        }
    }
    
    focusNavigation() {
        const nav = document.querySelector('nav, [role="navigation"], .navigation, .nav');
        if (nav) {
            const firstFocusable = this.getFirstFocusableElement(nav);
            if (firstFocusable) {
                firstFocusable.focus();
                this.announce('ナビゲーションにフォーカスしました', 'polite');
            }
        }
    }
    
    skipToContent() {
        this.focusMainContent();
    }
    
    openAccessibilityMenu() {
        // This would open an accessibility settings menu
        this.announce('アクセシビリティメニュー機能は開発中です', 'polite');
    }
    
    cycleFocusRegions(reverse = false) {
        const regions = [
            document.querySelector('nav, [role="navigation"]'),
            document.querySelector('main, [role="main"]'),
            document.querySelector('aside, [role="complementary"]'),
            document.querySelector('footer, [role="contentinfo"]')
        ].filter(Boolean);
        
        if (regions.length === 0) return;
        
        // Find current region
        let currentIndex = -1;
        const activeElement = document.activeElement;
        
        for (let i = 0; i < regions.length; i++) {
            if (regions[i].contains(activeElement)) {
                currentIndex = i;
                break;
            }
        }
        
        // Move to next/previous region
        let nextIndex;
        if (reverse) {
            nextIndex = currentIndex <= 0 ? regions.length - 1 : currentIndex - 1;
        } else {
            nextIndex = currentIndex >= regions.length - 1 ? 0 : currentIndex + 1;
        }
        
        const nextRegion = regions[nextIndex];
        const firstFocusable = this.getFirstFocusableElement(nextRegion);
        
        if (firstFocusable) {
            firstFocusable.focus();
        } else {
            nextRegion.focus();
        }
        
        this.announce(`${nextRegion.tagName}領域にフォーカスしました`, 'polite');
    }
    
    monitorAccessibilityPreferences() {
        // Monitor for changes in system accessibility preferences
        if (window.matchMedia) {
            // High contrast
            const contrastQuery = window.matchMedia('(prefers-contrast: high)');
            contrastQuery.addEventListener('change', () => {
                console.log('System contrast preference changed');
            });
            
            // Reduced motion
            const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            motionQuery.addEventListener('change', () => {
                console.log('System motion preference changed');
            });
            
            // Color scheme
            const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
            colorSchemeQuery.addEventListener('change', () => {
                console.log('System color scheme preference changed');
            });
        }
    }
    
    validateHeadingStructure() {
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        let previousLevel = 0;
        let issues = [];
        
        headings.forEach((heading, index) => {
            const currentLevel = parseInt(heading.tagName.charAt(1));
            
            if (index === 0 && currentLevel !== 1) {
                issues.push(`First heading should be h1, found ${heading.tagName}`);
            }
            
            if (currentLevel > previousLevel + 1) {
                issues.push(`Heading level skipped: ${heading.tagName} after h${previousLevel}`);
            }
            
            previousLevel = currentLevel;
        });
        
        if (issues.length > 0) {
            console.warn('Heading structure issues:', issues);
        }
        
        return issues.length === 0;
    }
    
    addLandmarkRoles() {
        // Add main role if missing
        if (!document.querySelector('main, [role="main"]')) {
            const mainContent = document.querySelector('.main-content, #main-content, .content');
            if (mainContent) {
                mainContent.setAttribute('role', 'main');
            }
        }
        
        // Add navigation role if missing
        const navElements = document.querySelectorAll('nav:not([role])');
        navElements.forEach(nav => {
            nav.setAttribute('role', 'navigation');
        });
        
        // Add banner role to header if missing
        const header = document.querySelector('header:not([role])');
        if (header) {
            header.setAttribute('role', 'banner');
        }
        
        // Add contentinfo role to footer if missing
        const footer = document.querySelector('footer:not([role])');
        if (footer) {
            footer.setAttribute('role', 'contentinfo');
        }
    }
    
    setupFormLabels() {
        // Find inputs without labels
        const inputs = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
        
        inputs.forEach(input => {
            // Try to find associated label
            let label = document.querySelector(`label[for="${input.id}"]`);
            
            if (!label && input.id) {
                // Try to find label containing the input
                label = document.querySelector(`label:has(#${input.id})`);
            }
            
            if (!label) {
                // Create label from placeholder or nearby text
                const labelText = input.placeholder || input.title || this.generateAriaLabel(input);
                if (labelText) {
                    input.setAttribute('aria-label', labelText);
                }
            }
        });
    }
    
    monitorDynamicContent() {
        // Set up mutation observer to monitor for dynamic content changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.processNewElement(node);
                        }
                    });
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    processNewElement(element) {
        // Add ARIA labels to new interactive elements
        if (this.isFocusable(element)) {
            this.addAriaLabel(element);
        }
        
        // Process child elements
        const focusableChildren = this.getFocusableElements(element);
        focusableChildren.forEach(child => {
            this.addAriaLabel(child);
        });
    }
    
    setupRovingTabindex() {
        // Set up roving tabindex for complex widgets like toolbars, menus, etc.
        const widgets = document.querySelectorAll('[role="toolbar"], [role="menubar"], [role="tablist"]');
        
        widgets.forEach(widget => {
            this.setupRovingTabindexForWidget(widget);
        });
    }
    
    setupRovingTabindexForWidget(widget) {
        const items = this.getFocusableElements(widget);
        if (items.length === 0) return;
        
        // Set initial tabindex values
        items.forEach((item, index) => {
            item.tabIndex = index === 0 ? 0 : -1;
        });
        
        // Handle arrow key navigation
        widget.addEventListener('keydown', (e) => {
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
                return;
            }
            
            e.preventDefault();
            
            const currentIndex = items.indexOf(document.activeElement);
            if (currentIndex === -1) return;
            
            let nextIndex = currentIndex;
            
            switch (e.key) {
                case 'ArrowLeft':
                case 'ArrowUp':
                    nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
                    break;
                case 'ArrowRight':
                case 'ArrowDown':
                    nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
                    break;
                case 'Home':
                    nextIndex = 0;
                    break;
                case 'End':
                    nextIndex = items.length - 1;
                    break;
            }
            
            // Update tabindex values
            items[currentIndex].tabIndex = -1;
            items[nextIndex].tabIndex = 0;
            items[nextIndex].focus();
        });
    }
    
    handleFocusIn(e) {
        // Add focus indicator
        this.applyFocusIndicator(e.target);
    }
    
    handleFocusOut(e) {
        // Remove focus indicator
        this.removeFocusIndicator(e.target);
    }
    
    handleTabNavigation(e) {
        // Track tab navigation for analytics/debugging
        const direction = e.shiftKey ? 'backward' : 'forward';
        console.debug(`Tab navigation: ${direction}`, e.target);
    }
    
    closeTopModal() {
        if (this.modalStack.length > 0) {
            const topModal = this.modalStack[this.modalStack.length - 1];
            this.closeModal(topModal.element);
        }
    }
    
    exitKeyboardTrap() {
        if (this.keyboardTrapStack.length > 0) {
            const topTrap = this.keyboardTrapStack[this.keyboardTrapStack.length - 1];
            this.removeKeyboardTrap(topTrap.container);
        }
    }
    
    hideBackgroundContent(modal) {
        // Hide background content from screen readers when modal is open
        const allElements = document.querySelectorAll('body > *:not([aria-hidden])');
        allElements.forEach(element => {
            if (!modal.contains(element) && element !== modal) {
                element.setAttribute('aria-hidden', 'true');
                element.dataset.accessibilityHidden = 'true';
            }
        });
    }
    
    showBackgroundContent() {
        // Show background content to screen readers when modal is closed
        const hiddenElements = document.querySelectorAll('[data-accessibility-hidden="true"]');
        hiddenElements.forEach(element => {
            element.removeAttribute('aria-hidden');
            element.removeAttribute('data-accessibility-hidden');
        });
    }
    
    /**
     * Destroy accessibility manager and clean up
     */
    destroy() {
        // Remove event listeners
        document.removeEventListener('keydown', this.handleGlobalKeydown);
        document.removeEventListener('focusin', this.handleFocusIn);
        document.removeEventListener('focusout', this.handleFocusOut);
        
        // Remove live regions
        Object.values(this.liveRegions).forEach(region => {
            if (region && region.parentNode) {
                region.parentNode.removeChild(region);
            }
        });
        
        // Remove added styles
        const stylesToRemove = [
            'accessibility-high-contrast-styles',
            'accessibility-reduced-motion-styles'
        ];
        
        stylesToRemove.forEach(id => {
            const style = document.getElementById(id);
            if (style) {
                style.remove();
            }
        });
        
        // Clear state
        this.focusHistory = [];
        this.modalStack = [];
        this.keyboardTrapStack = [];
        this.listeners = {};
        
        console.log('Accessibility Manager destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AccessibilityManager;
} else if (typeof window !== 'undefined') {
    window.AccessibilityManager = AccessibilityManager;
}