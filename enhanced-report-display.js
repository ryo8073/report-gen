// Enhanced Report Display Functions

// Enhanced markdown rendering function
function renderMarkdown(text) {
    if (!text) return '<p style="color: var(--color-gray-500);">プレビューがここに表示されます</p>';
    
    let html = text
        // Escape HTML first
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        
        // Headers
        .replace(/^### (.*$)/gm, '<h3 class="markdown-h3">$1</h3>')
        .replace(/^## (.*$)/gm, '<h2 class="markdown-h2">$1</h2>')
        .replace(/^# (.*$)/gm, '<h1 class="markdown-h1">$1</h1>')
        
        // Bold and italic
        .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        
        // Code blocks
        .replace(/```([\s\S]*?)```/g, '<pre class="markdown-code-block"><code>$1</code></pre>')
        .replace(/`([^`]+)`/g, '<code class="markdown-inline-code">$1</code>')
        
        // Lists
        .replace(/^\s*[-*+]\s+(.*)$/gm, '<li class="markdown-list-item">$1</li>')
        .replace(/(<li class="markdown-list-item">.*<\/li>)/g, '<ul class="markdown-list">$1</ul>')
        
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="markdown-link" target="_blank" rel="noopener">$1</a>')
        
        // Line breaks and paragraphs
        .replace(/\n\n/g, '</p><p class="markdown-paragraph">')
        .replace(/\n/g, '<br>')
        
        // Wrap in paragraph if not already wrapped
        .replace(/^(?!<[h1-6]|<ul|<ol|<pre|<table)/gm, '<p class="markdown-paragraph">');
    
    // Clean up and wrap
    if (!html.startsWith('<')) {
        html = '<p class="markdown-paragraph">' + html;
    }
    if (!html.endsWith('>')) {
        html = html + '</p>';
    }
    
    return html;
}

// Tab switching functionality
function switchTab(tab) {
    const editView = document.getElementById('editView');
    const previewView = document.getElementById('previewView');
    const splitView = document.getElementById('splitView');
    const editTab = document.getElementById('editTab');
    const previewTab = document.getElementById('previewTab');
    const splitTab = document.getElementById('splitTab');
    
    // Remove active classes
    [editView, previewView, splitView].forEach(view => view?.classList.remove('active'));
    [editTab, previewTab, splitTab].forEach(tabBtn => tabBtn?.classList.remove('active'));
    
    // Show selected view
    switch(tab) {
        case 'edit':
            editView?.classList.add('active');
            editTab?.classList.add('active');
            break;
        case 'preview':
            previewView?.classList.add('active');
            previewTab?.classList.add('active');
            updatePreview();
            break;
        case 'split':
            splitView?.classList.add('active');
            splitTab?.classList.add('active');
            syncSplitContent();
            updateSplitPreview();
            break;
    }
}

// Initialize report display functionality
function initializeReportDisplay() {
    const reportContent = document.getElementById('reportContent');
    const reportContentSplit = document.getElementById('reportContentSplit');
    
    // Update preview when content changes
    if (reportContent) {
        reportContent.addEventListener('input', updatePreview);
        reportContent.addEventListener('input', updateWordCount);
    }
    
    if (reportContentSplit) {
        reportContentSplit.addEventListener('input', updateSplitPreview);
        reportContentSplit.addEventListener('input', syncMainContent);
        reportContentSplit.addEventListener('input', updateWordCount);
    }
    
    // Initial updates
    updatePreview();
    updateWordCount();
}

// Update preview functions
function updatePreview() {
    const reportContent = document.getElementById('reportContent');
    const reportPreview = document.getElementById('reportPreview');
    
    if (reportContent && reportPreview) {
        const text = reportContent.value;
        reportPreview.innerHTML = renderMarkdown(text);
    }
}

function updateSplitPreview() {
    const reportContentSplit = document.getElementById('reportContentSplit');
    const reportPreviewSplit = document.getElementById('reportPreviewSplit');
    
    if (reportContentSplit && reportPreviewSplit) {
        const text = reportContentSplit.value;
        reportPreviewSplit.innerHTML = renderMarkdown(text);
    }
}

// Content synchronization
function syncSplitContent() {
    const reportContent = document.getElementById('reportContent');
    const reportContentSplit = document.getElementById('reportContentSplit');
    
    if (reportContent && reportContentSplit) {
        reportContentSplit.value = reportContent.value;
    }
}

function syncMainContent() {
    const reportContent = document.getElementById('reportContent');
    const reportContentSplit = document.getElementById('reportContentSplit');
    
    if (reportContent && reportContentSplit) {
        reportContent.value = reportContentSplit.value;
    }
}

// Utility functions
function getCurrentReportContent() {
    const splitView = document.getElementById('splitView');
    if (splitView?.classList.contains('active')) {
        return document.getElementById('reportContentSplit')?.value || '';
    }
    return document.getElementById('reportContent')?.value || '';
}

function formatMarkdown() {
    const currentContent = getCurrentReportContent();
    const formatted = currentContent
        .replace(/^(#{1,6})([^#\s])/gm, '$1 $2') // Add space after headers
        .replace(/([^\n])\n(#{1,6})/g, '$1\n\n$2') // Add line before headers
        .replace(/([^\n])\n([*-])/g, '$1\n\n$2') // Add line before lists
        .replace(/\n{3,}/g, '\n\n'); // Remove excessive line breaks
    
    // Update the active textarea
    const splitView = document.getElementById('splitView');
    if (splitView?.classList.contains('active')) {
        document.getElementById('reportContentSplit').value = formatted;
        updateSplitPreview();
        syncMainContent();
    } else {
        document.getElementById('reportContent').value = formatted;
        updatePreview();
    }
    
    updateWordCount();
    showNotification('マークダウンを整形しました', 'success');
}

function updateWordCount() {
    const content = getCurrentReportContent();
    const charCount = content.length;
    const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
    const lineCount = content.split('\n').length;
    
    const charCountEl = document.getElementById('charCount');
    const wordCountEl = document.getElementById('wordCount');
    const lineCountEl = document.getElementById('lineCount');
    
    if (charCountEl) charCountEl.textContent = `${charCount.toLocaleString()}文字`;
    if (wordCountEl) wordCountEl.textContent = `${wordCount.toLocaleString()}語`;
    if (lineCountEl) lineCountEl.textContent = `${lineCount.toLocaleString()}行`;
}

function showWordCount() {
    const display = document.getElementById('wordCountDisplay');
    if (display) {
        display.classList.toggle('hidden');
        updateWordCount();
    }
}

function showButtonFeedback(button, message, type) {
    const originalText = button.textContent;
    const originalStyle = {
        background: button.style.background,
        color: button.style.color
    };
    
    button.textContent = message;
    
    if (type === 'success') {
        button.style.background = 'var(--color-success)';
        button.style.color = 'white';
    } else if (type === 'error') {
        button.style.background = 'var(--color-error)';
        button.style.color = 'white';
    }
    
    setTimeout(() => {
        button.textContent = originalText;
        button.style.background = originalStyle.background;
        button.style.color = originalStyle.color;
    }, 2000);
}

function showNotification(message, type) {
    if (window.errorHandler && window.errorHandler.showNotification) {
        window.errorHandler.showNotification(message, type, 3000);
    }
}

// Make functions globally accessible
window.switchTab = switchTab;
window.formatMarkdown = formatMarkdown;
window.showWordCount = showWordCount;
window.renderMarkdown = renderMarkdown;
window.initializeReportDisplay = initializeReportDisplay;
window.getCurrentReportContent = getCurrentReportContent;
window.showButtonFeedback = showButtonFeedback;