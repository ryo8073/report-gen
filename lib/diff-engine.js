/**
 * DiffEngine - Text difference detection and highlighting
 * Implements a simple diff algorithm to compare original and edited content
 */
class DiffEngine {
    constructor() {
        this.changeTypes = {
            ADDED: 'added',
            REMOVED: 'removed',
            MODIFIED: 'modified',
            UNCHANGED: 'unchanged'
        };
    }

    /**
     * Compare two text strings and generate diff results
     * @param {string} originalText - The original text content
     * @param {string} editedText - The edited text content
     * @returns {Object} Diff results with highlighted changes
     */
    compareTexts(originalText, editedText) {
        if (!originalText && !editedText) {
            return { changes: [], hasChanges: false };
        }

        if (!originalText) {
            return {
                changes: [{
                    type: this.changeTypes.ADDED,
                    content: editedText,
                    lineNumber: 1
                }],
                hasChanges: true
            };
        }

        if (!editedText) {
            return {
                changes: [{
                    type: this.changeTypes.REMOVED,
                    content: originalText,
                    lineNumber: 1
                }],
                hasChanges: true
            };
        }

        const originalLines = this.splitIntoLines(originalText);
        const editedLines = this.splitIntoLines(editedText);
        
        return this.generateLineDiff(originalLines, editedLines);
    }

    /**
     * Split text into lines for line-by-line comparison
     * @param {string} text - Text to split
     * @returns {Array} Array of lines
     */
    splitIntoLines(text) {
        return text.split(/\r?\n/);
    }

    /**
     * Generate line-by-line diff using a simple LCS-based algorithm
     * @param {Array} originalLines - Original text lines
     * @param {Array} editedLines - Edited text lines
     * @returns {Object} Diff results
     */
    generateLineDiff(originalLines, editedLines) {
        const changes = [];
        let hasChanges = false;
        
        const maxLength = Math.max(originalLines.length, editedLines.length);
        
        for (let i = 0; i < maxLength; i++) {
            const originalLine = originalLines[i];
            const editedLine = editedLines[i];
            
            if (originalLine === undefined && editedLine !== undefined) {
                // Line added
                changes.push({
                    type: this.changeTypes.ADDED,
                    content: editedLine,
                    lineNumber: i + 1,
                    originalLineNumber: null,
                    editedLineNumber: i + 1
                });
                hasChanges = true;
            } else if (originalLine !== undefined && editedLine === undefined) {
                // Line removed
                changes.push({
                    type: this.changeTypes.REMOVED,
                    content: originalLine,
                    lineNumber: i + 1,
                    originalLineNumber: i + 1,
                    editedLineNumber: null
                });
                hasChanges = true;
            } else if (originalLine !== editedLine) {
                // Line modified
                changes.push({
                    type: this.changeTypes.MODIFIED,
                    originalContent: originalLine,
                    editedContent: editedLine,
                    lineNumber: i + 1,
                    originalLineNumber: i + 1,
                    editedLineNumber: i + 1,
                    wordDiff: this.generateWordDiff(originalLine, editedLine)
                });
                hasChanges = true;
            } else {
                // Line unchanged
                changes.push({
                    type: this.changeTypes.UNCHANGED,
                    content: originalLine,
                    lineNumber: i + 1,
                    originalLineNumber: i + 1,
                    editedLineNumber: i + 1
                });
            }
        }
        
        return { changes, hasChanges };
    }

    /**
     * Generate word-level diff for modified lines
     * @param {string} originalLine - Original line content
     * @param {string} editedLine - Edited line content
     * @returns {Array} Word-level changes
     */
    generateWordDiff(originalLine, editedLine) {
        const originalWords = originalLine.split(/(\s+)/);
        const editedWords = editedLine.split(/(\s+)/);
        const wordChanges = [];
        
        const maxWords = Math.max(originalWords.length, editedWords.length);
        
        for (let i = 0; i < maxWords; i++) {
            const originalWord = originalWords[i];
            const editedWord = editedWords[i];
            
            if (originalWord === undefined && editedWord !== undefined) {
                wordChanges.push({
                    type: this.changeTypes.ADDED,
                    content: editedWord
                });
            } else if (originalWord !== undefined && editedWord === undefined) {
                wordChanges.push({
                    type: this.changeTypes.REMOVED,
                    content: originalWord
                });
            } else if (originalWord !== editedWord) {
                wordChanges.push({
                    type: this.changeTypes.MODIFIED,
                    originalContent: originalWord,
                    editedContent: editedWord
                });
            } else {
                wordChanges.push({
                    type: this.changeTypes.UNCHANGED,
                    content: originalWord
                });
            }
        }
        
        return wordChanges;
    }

    /**
     * Generate HTML with highlighted changes
     * @param {Object} diffResult - Result from compareTexts
     * @returns {Object} HTML for original and edited versions with highlights
     */
    generateHighlightedHTML(diffResult) {
        const originalHTML = [];
        const editedHTML = [];
        
        diffResult.changes.forEach(change => {
            switch (change.type) {
                case this.changeTypes.ADDED:
                    editedHTML.push(`<div class="diff-line diff-added" data-line="${change.editedLineNumber}">${this.escapeHTML(change.content)}</div>`);
                    break;
                    
                case this.changeTypes.REMOVED:
                    originalHTML.push(`<div class="diff-line diff-removed" data-line="${change.originalLineNumber}">${this.escapeHTML(change.content)}</div>`);
                    break;
                    
                case this.changeTypes.MODIFIED:
                    const originalWordHTML = this.generateWordHighlightHTML(change.wordDiff, 'original');
                    const editedWordHTML = this.generateWordHighlightHTML(change.wordDiff, 'edited');
                    
                    originalHTML.push(`<div class="diff-line diff-modified" data-line="${change.originalLineNumber}">${originalWordHTML}</div>`);
                    editedHTML.push(`<div class="diff-line diff-modified" data-line="${change.editedLineNumber}">${editedWordHTML}</div>`);
                    break;
                    
                case this.changeTypes.UNCHANGED:
                    const unchangedContent = `<div class="diff-line diff-unchanged" data-line="${change.lineNumber}">${this.escapeHTML(change.content)}</div>`;
                    originalHTML.push(unchangedContent);
                    editedHTML.push(unchangedContent);
                    break;
            }
        });
        
        return {
            originalHTML: originalHTML.join('\n'),
            editedHTML: editedHTML.join('\n')
        };
    }

    /**
     * Generate HTML for word-level highlights
     * @param {Array} wordDiff - Word-level diff array
     * @param {string} version - 'original' or 'edited'
     * @returns {string} HTML with word-level highlights
     */
    generateWordHighlightHTML(wordDiff, version) {
        return wordDiff.map(wordChange => {
            switch (wordChange.type) {
                case this.changeTypes.ADDED:
                    return version === 'edited' 
                        ? `<span class="diff-word-added">${this.escapeHTML(wordChange.content)}</span>`
                        : '';
                        
                case this.changeTypes.REMOVED:
                    return version === 'original'
                        ? `<span class="diff-word-removed">${this.escapeHTML(wordChange.content)}</span>`
                        : '';
                        
                case this.changeTypes.MODIFIED:
                    const content = version === 'original' ? wordChange.originalContent : wordChange.editedContent;
                    return `<span class="diff-word-modified">${this.escapeHTML(content)}</span>`;
                    
                case this.changeTypes.UNCHANGED:
                    return this.escapeHTML(wordChange.content);
                    
                default:
                    return '';
            }
        }).join('');
    }

    /**
     * Escape HTML characters to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML
     */
    escapeHTML(text) {
        if (!text) return '';
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Get statistics about the changes
     * @param {Object} diffResult - Result from compareTexts
     * @returns {Object} Change statistics
     */
    getChangeStats(diffResult) {
        const stats = {
            totalLines: diffResult.changes.length,
            addedLines: 0,
            removedLines: 0,
            modifiedLines: 0,
            unchangedLines: 0
        };
        
        diffResult.changes.forEach(change => {
            switch (change.type) {
                case this.changeTypes.ADDED:
                    stats.addedLines++;
                    break;
                case this.changeTypes.REMOVED:
                    stats.removedLines++;
                    break;
                case this.changeTypes.MODIFIED:
                    stats.modifiedLines++;
                    break;
                case this.changeTypes.UNCHANGED:
                    stats.unchangedLines++;
                    break;
            }
        });
        
        return stats;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DiffEngine;
} else if (typeof window !== 'undefined') {
    window.DiffEngine = DiffEngine;
}