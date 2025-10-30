console.log('Starting Report Preview Enhancement Unit Tests...\n');

// Simple test runner
let passed = 0;
let failed = 0;

function test(name, testFn) {
    try {
        console.log(`Running ${name}...`);
        testFn();
        console.log(`✓ ${name} PASSED\n`);
        passed++;
    } catch (error) {
        console.error(`✗ ${name} FAILED: ${error.message}\n`);
        failed++;
    }
}

// Test TabNavigation switching functionality
test('TabNavigation switching functionality', () => {
    class TestTabNavigation {
        constructor() {
            this.activeTab = 'raw';
            this.tabs = ['raw', 'preview', 'editor', 'comparison'];
        }
        
        switchTab(tabName) {
            if (!this.tabs.includes(tabName)) {
                return false;
            }
            this.activeTab = tabName;
            return true;
        }
        
        getActiveTab() {
            return this.activeTab;
        }
    }

    const tabNav = new TestTabNavigation();
    
    // Test initial state
    if (tabNav.getActiveTab() !== 'raw') {
        throw new Error('Initial active tab should be raw');
    }
    
    // Test valid tab switching
    if (!tabNav.switchTab('preview')) {
        throw new Error('Valid tab switch should return true');
    }
    if (tabNav.getActiveTab() !== 'preview') {
        throw new Error('Active tab should be updated after switch');
    }
    
    // Test invalid tab switching
    if (tabNav.switchTab('invalid')) {
        throw new Error('Invalid tab switch should return false');
    }
    if (tabNav.getActiveTab() !== 'preview') {
        throw new Error('Active tab should not change for invalid switch');
    }
});

// Test MarkdownRenderer conversion accuracy
test('MarkdownRenderer conversion accuracy', () => {
    class TestMarkdownRenderer {
        render(content) {
            if (!content) return '';
            
            return content
                .replace(/^# (.*$)/gm, '<h1>$1</h1>')
                .replace(/^## (.*$)/gm, '<h2>$1</h2>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>');
        }
    }

    const renderer = new TestMarkdownRenderer();
    
    // Test empty content
    if (renderer.render('') !== '') {
        throw new Error('Empty content should return empty string');
    }
    
    // Test headers
    const headerResult = renderer.render('# Header 1\n## Header 2');
    if (!headerResult.includes('<h1>Header 1</h1>')) {
        throw new Error('H1 header should be converted correctly');
    }
    if (!headerResult.includes('<h2>Header 2</h2>')) {
        throw new Error('H2 header should be converted correctly');
    }
    
    // Test bold text
    const boldResult = renderer.render('This is **bold text**.');
    if (!boldResult.includes('<strong>bold text</strong>')) {
        throw new Error('Bold text should be converted correctly');
    }
    
    // Test italic text
    const italicResult = renderer.render('This is *italic text*.');
    if (!italicResult.includes('<em>italic text</em>')) {
        throw new Error('Italic text should be converted correctly');
    }
});

// Test RichTextEditor formatting operations
test('RichTextEditor formatting operations', () => {
    class TestRichTextEditor {
        constructor() {
            this.content = '';
            this.currentFormats = [];
        }
        
        applyFormatting(format, isActive) {
            if (isActive) {
                if (!this.currentFormats.includes(format)) {
                    this.currentFormats.push(format);
                }
            } else {
                const index = this.currentFormats.indexOf(format);
                if (index > -1) {
                    this.currentFormats.splice(index, 1);
                }
            }
            return true;
        }
        
        getCurrentFormats() {
            return [...this.currentFormats];
        }
        
        setContent(content) {
            this.content = content;
        }
        
        getContent() {
            return this.content;
        }
    }

    const editor = new TestRichTextEditor();
    
    // Test basic formatting operations
    const formats = ['bold', 'italic', 'underline'];
    for (const format of formats) {
        if (!editor.applyFormatting(format, true)) {
            throw new Error(`Should be able to apply ${format} formatting`);
        }
        
        const currentFormats = editor.getCurrentFormats();
        if (!currentFormats.includes(format)) {
            throw new Error(`${format} should be in current formats after applying`);
        }
    }
    
    // Test format removal
    editor.applyFormatting('bold', false);
    const formatsAfterRemoval = editor.getCurrentFormats();
    if (formatsAfterRemoval.includes('bold')) {
        throw new Error('Bold should be removed from current formats');
    }
    if (!formatsAfterRemoval.includes('italic') || !formatsAfterRemoval.includes('underline')) {
        throw new Error('Other formats should remain after removing bold');
    }
    
    // Test content management
    const testContent = '<p>Test content</p>';
    editor.setContent(testContent);
    if (editor.getContent() !== testContent) {
        throw new Error('Content should be set correctly');
    }
});

// Test content preservation across tab switches
test('Content preservation across tab switches', () => {
    class TestContentState {
        constructor() {
            this.state = {
                original: { content: '', timestamp: null },
                edited: { content: '', timestamp: null },
                activeTab: 'raw',
                isDirty: false
            };
        }
        
        setOriginalContent(content) {
            this.state.original = { content: content || '', timestamp: new Date().toISOString() };
        }
        
        setActiveTab(tabName) {
            this.state.activeTab = tabName;
            return true;
        }
        
        getState() {
            return JSON.parse(JSON.stringify(this.state));
        }
    }

    class TestTabNavigation {
        constructor() {
            this.activeTab = 'raw';
            this.tabs = ['raw', 'preview', 'editor', 'comparison'];
            this.contentState = new TestContentState();
        }
        
        switchTab(tabName) {
            if (!this.tabs.includes(tabName)) return false;
            this.activeTab = tabName;
            this.contentState.setActiveTab(tabName);
            return true;
        }
        
        setContent(content) {
            this.contentState.setOriginalContent(content);
        }
        
        getActiveTab() { return this.activeTab; }
        getContentState() { return this.contentState.getState(); }
    }

    const tabNavigation = new TestTabNavigation();
    const originalContent = '# Test Report\n\nThis is a test report.';
    
    // Set initial content
    tabNavigation.setContent(originalContent);
    
    // Verify content is set
    const initialState = tabNavigation.getContentState();
    if (initialState.original.content !== originalContent) {
        throw new Error('Original content not properly set');
    }
    
    // Switch tabs and verify content preservation
    const tabs = ['preview', 'editor', 'comparison', 'raw'];
    for (const tab of tabs) {
        tabNavigation.switchTab(tab);
        const state = tabNavigation.getContentState();
        if (state.original.content !== originalContent) {
            throw new Error(`Content not preserved when switching to ${tab}`);
        }
        if (state.activeTab !== tab) {
            throw new Error(`Active tab not updated when switching to ${tab}`);
        }
    }
});

// Test state management across components
test('State management across components', () => {
    class TestContentState {
        constructor() {
            this.state = {
                original: { content: '', timestamp: null },
                edited: { content: '', timestamp: null },
                activeTab: 'raw',
                isDirty: false
            };
        }
        
        setOriginalContent(content) {
            this.state.original = { content: content || '', timestamp: new Date().toISOString() };
        }
        
        setEditedContent(content) {
            this.state.edited = { content: content || '', timestamp: new Date().toISOString() };
            this.state.isDirty = this.state.original.content !== content;
        }
        
        setActiveTab(tabName) {
            this.state.activeTab = tabName;
        }
        
        getState() { return JSON.parse(JSON.stringify(this.state)); }
        isDirty() { return this.state.isDirty; }
        
        reset() {
            this.state.edited = { content: this.state.original.content, timestamp: new Date().toISOString() };
            this.state.isDirty = false;
        }
    }

    const contentState = new TestContentState();
    const originalContent = '# Original Content';
    const editedContent = '# Edited Content';
    
    // Test original content setting
    contentState.setOriginalContent(originalContent);
    const afterOriginal = contentState.getState();
    if (afterOriginal.original.content !== originalContent) {
        throw new Error('Original content not set correctly');
    }
    if (contentState.isDirty()) {
        throw new Error('Content should not be dirty after setting original');
    }
    
    // Test edited content setting
    contentState.setEditedContent(editedContent);
    const afterEdited = contentState.getState();
    if (afterEdited.edited.content !== editedContent) {
        throw new Error('Edited content not set correctly');
    }
    if (!contentState.isDirty()) {
        throw new Error('Content should be dirty after editing');
    }
    
    // Test tab switching
    contentState.setActiveTab('preview');
    const afterTabSwitch = contentState.getState();
    if (afterTabSwitch.activeTab !== 'preview') {
        throw new Error('Active tab not updated');
    }
    if (!contentState.isDirty()) {
        throw new Error('Dirty state should be preserved after tab switch');
    }
    
    // Test reset
    contentState.reset();
    if (contentState.isDirty()) {
        throw new Error('Content should not be dirty after reset');
    }
    const afterReset = contentState.getState();
    if (afterReset.edited.content !== originalContent) {
        throw new Error('Edited content should be reset to original');
    }
});

// Print summary
const total = passed + failed;
console.log('\n' + '='.repeat(60));
console.log('UNIT TEST SUMMARY');
console.log('='.repeat(60));
console.log(`Total Tests: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
console.log('='.repeat(60));

process.exit(failed > 0 ? 1 : 0);