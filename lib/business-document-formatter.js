/**
 * Business Document Formatter
 * Handles professional document styling and formatting for business proposals
 */

class BusinessDocumentFormatter {
  constructor() {
    this.currentTemplate = 'standard';
    this.settings = {
      fontFamily: 'serif', // 'serif' or 'sans'
      fontSize: 'normal', // 'small', 'normal', 'large'
      lineHeight: 'normal', // 'tight', 'normal', 'relaxed'
      textAlign: 'justify', // 'left', 'center', 'right', 'justify'
      pageSize: 'letter', // 'letter', 'a4'
      margins: 'normal' // 'narrow', 'normal', 'wide'
    };
    this.headerFooter = {
      header: '',
      footer: '',
      showPageNumbers: true,
      showDate: true
    };
  }

  /**
   * Apply standard business document styling to content
   * @param {HTMLElement} contentElement - The element containing the document content
   */
  applyStandardStyling(contentElement) {
    if (!contentElement) {
      console.error('BusinessDocumentFormatter: No content element provided');
      return;
    }

    // Remove existing business styling classes
    this.removeBusinessStyling(contentElement);

    // Apply main business document class
    contentElement.classList.add('business-document');
    
    // Apply font family setting
    if (this.settings.fontFamily === 'sans') {
      contentElement.classList.add('business-document-sans');
    }

    // Apply business styling to all child elements
    this.styleHeadings(contentElement);
    this.styleParagraphs(contentElement);
    this.styleLists(contentElement);
    this.styleTables(contentElement);
    this.styleCodeBlocks(contentElement);
    this.styleQuotes(contentElement);

    // Apply responsive classes for screen display
    this.applyResponsiveClasses(contentElement);

    console.log('BusinessDocumentFormatter: Standard styling applied');
  }

  /**
   * Remove business document styling from content
   * @param {HTMLElement} contentElement - The element to remove styling from
   */
  removeBusinessStyling(contentElement) {
    const businessClasses = [
      'business-document',
      'business-document-sans',
      'business-styled'
    ];

    businessClasses.forEach(className => {
      contentElement.classList.remove(className);
    });

    // Remove business classes from child elements
    const styledElements = contentElement.querySelectorAll('[class*="business-"]');
    styledElements.forEach(element => {
      const classes = Array.from(element.classList);
      classes.forEach(className => {
        if (className.startsWith('business-')) {
          element.classList.remove(className);
        }
      });
    });
  }

  /**
   * Style heading elements with business formatting
   * @param {HTMLElement} contentElement - The container element
   */
  styleHeadings(contentElement) {
    const headings = contentElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach(heading => {
      const level = heading.tagName.toLowerCase();
      heading.classList.add(`business-${level}`);
    });
  }

  /**
   * Style paragraph elements with business formatting
   * @param {HTMLElement} contentElement - The container element
   */
  styleParagraphs(contentElement) {
    const paragraphs = contentElement.querySelectorAll('p');
    paragraphs.forEach(paragraph => {
      paragraph.classList.add('business-paragraph');
    });
  }

  /**
   * Style list elements with business formatting
   * @param {HTMLElement} contentElement - The container element
   */
  styleLists(contentElement) {
    const lists = contentElement.querySelectorAll('ul, ol');
    lists.forEach(list => {
      list.classList.add('business-list');
    });

    const listItems = contentElement.querySelectorAll('li');
    listItems.forEach(item => {
      item.classList.add('business-list-item');
    });
  }

  /**
   * Style table elements with business formatting
   * @param {HTMLElement} contentElement - The container element
   */
  styleTables(contentElement) {
    const tables = contentElement.querySelectorAll('table');
    tables.forEach(table => {
      table.classList.add('business-table');
    });

    const headers = contentElement.querySelectorAll('th');
    headers.forEach(header => {
      header.classList.add('business-table-header');
    });

    const cells = contentElement.querySelectorAll('td');
    cells.forEach(cell => {
      cell.classList.add('business-table-cell');
    });

    // Add alternating row styling
    const rows = contentElement.querySelectorAll('tbody tr');
    rows.forEach((row, index) => {
      if (index % 2 === 1) {
        row.classList.add('business-table-row-even');
      }
    });
  }

  /**
   * Style code blocks with business formatting
   * @param {HTMLElement} contentElement - The container element
   */
  styleCodeBlocks(contentElement) {
    const codeBlocks = contentElement.querySelectorAll('pre');
    codeBlocks.forEach(block => {
      block.classList.add('business-code-block');
    });

    const inlineCode = contentElement.querySelectorAll('code');
    inlineCode.forEach(code => {
      if (!code.closest('pre')) {
        code.classList.add('business-inline-code');
      }
    });
  }

  /**
   * Style blockquotes with business formatting
   * @param {HTMLElement} contentElement - The container element
   */
  styleQuotes(contentElement) {
    const quotes = contentElement.querySelectorAll('blockquote');
    quotes.forEach(quote => {
      quote.classList.add('business-quote');
    });
  }

  /**
   * Apply responsive classes for better screen display
   * @param {HTMLElement} contentElement - The container element
   */
  applyResponsiveClasses(contentElement) {
    // Add responsive utility classes based on current settings
    if (this.settings.textAlign !== 'justify') {
      contentElement.classList.add(`business-text-${this.settings.textAlign}`);
    }
  }

  /**
   * Set header and footer content
   * @param {string} header - Header content
   * @param {string} footer - Footer content
   */
  setHeaderFooter(header, footer) {
    this.headerFooter.header = header || '';
    this.headerFooter.footer = footer || '';
    this.updateHeaderFooterDisplay();
  }

  /**
   * Update header and footer display in the document
   */
  updateHeaderFooterDisplay() {
    // Remove existing header/footer elements
    const existingHeaders = document.querySelectorAll('.business-header');
    const existingFooters = document.querySelectorAll('.business-footer');
    
    existingHeaders.forEach(el => el.remove());
    existingFooters.forEach(el => el.remove());

    // Create new header if content exists
    if (this.headerFooter.header) {
      const headerElement = this.createHeaderElement();
      document.body.appendChild(headerElement);
    }

    // Create new footer if content exists or page numbers are enabled
    if (this.headerFooter.footer || this.headerFooter.showPageNumbers) {
      const footerElement = this.createFooterElement();
      document.body.appendChild(footerElement);
    }
  }

  /**
   * Create header element
   * @returns {HTMLElement} Header element
   */
  createHeaderElement() {
    const header = document.createElement('div');
    header.className = 'business-header business-print-only';
    
    const headerLeft = document.createElement('div');
    headerLeft.className = 'business-header-left';
    
    const headerCenter = document.createElement('div');
    headerCenter.className = 'business-header-center';
    headerCenter.textContent = this.headerFooter.header;
    
    const headerRight = document.createElement('div');
    headerRight.className = 'business-header-right';
    if (this.headerFooter.showDate) {
      headerRight.textContent = new Date().toLocaleDateString();
    }
    
    header.appendChild(headerLeft);
    header.appendChild(headerCenter);
    header.appendChild(headerRight);
    
    return header;
  }

  /**
   * Create footer element
   * @returns {HTMLElement} Footer element
   */
  createFooterElement() {
    const footer = document.createElement('div');
    footer.className = 'business-footer business-print-only';
    
    const footerLeft = document.createElement('div');
    footerLeft.className = 'business-footer-left';
    footerLeft.textContent = this.headerFooter.footer;
    
    const footerCenter = document.createElement('div');
    footerCenter.className = 'business-footer-center';
    
    const footerRight = document.createElement('div');
    footerRight.className = 'business-footer-right';
    if (this.headerFooter.showPageNumbers) {
      const pageNumber = document.createElement('span');
      pageNumber.className = 'business-page-number';
      footerRight.appendChild(pageNumber);
    }
    
    footer.appendChild(footerLeft);
    footer.appendChild(footerCenter);
    footer.appendChild(footerRight);
    
    return footer;
  }

  /**
   * Apply a document template
   * @param {string} templateName - Name of the template ('standard', 'formal', 'modern')
   */
  applyTemplate(templateName) {
    this.currentTemplate = templateName;
    
    const root = document.documentElement;
    
    // Remove existing template classes
    root.classList.remove('business-template-standard', 'business-template-formal', 'business-template-modern');
    
    // Apply new template class
    root.classList.add(`business-template-${templateName}`);
    
    // Update settings based on template
    switch (templateName) {
      case 'formal':
        this.settings.fontFamily = 'serif';
        this.settings.textAlign = 'justify';
        this.settings.lineHeight = 'normal';
        break;
      case 'modern':
        this.settings.fontFamily = 'sans';
        this.settings.textAlign = 'left';
        this.settings.lineHeight = 'relaxed';
        break;
      default: // standard
        this.settings.fontFamily = 'serif';
        this.settings.textAlign = 'justify';
        this.settings.lineHeight = 'normal';
        break;
    }
    
    console.log(`BusinessDocumentFormatter: Applied ${templateName} template`);
  }

  /**
   * Update document settings
   * @param {Object} newSettings - Settings to update
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.applySettingsToDocument();
  }

  /**
   * Apply current settings to the document
   */
  applySettingsToDocument() {
    const root = document.documentElement;
    
    // Apply font family
    if (this.settings.fontFamily === 'sans') {
      root.style.setProperty('--business-font-family', 'var(--business-font-family-sans)');
    } else {
      root.style.setProperty('--business-font-family', '"Times New Roman", "Georgia", "Hiragino Mincho ProN", "Yu Mincho", serif');
    }
    
    // Apply font size
    const fontSizeMap = {
      small: '11pt',
      normal: '12pt',
      large: '14pt'
    };
    root.style.setProperty('--business-font-size-body', fontSizeMap[this.settings.fontSize] || '12pt');
    
    // Apply line height
    const lineHeightMap = {
      tight: '1.2',
      normal: '1.5',
      relaxed: '1.8'
    };
    root.style.setProperty('--business-line-height-normal', lineHeightMap[this.settings.lineHeight] || '1.5');
  }

  /**
   * Generate print-optimized CSS
   * @returns {string} CSS string for print optimization
   */
  generatePrintCSS() {
    return `
      @media print {
        .business-document {
          font-size: ${this.settings.fontSize === 'small' ? '11pt' : this.settings.fontSize === 'large' ? '14pt' : '12pt'};
          line-height: ${this.settings.lineHeight === 'tight' ? '1.2' : this.settings.lineHeight === 'relaxed' ? '1.8' : '1.5'};
        }
        
        @page {
          size: ${this.settings.pageSize === 'a4' ? 'A4' : '8.5in 11in'};
          margin: ${this.settings.margins === 'narrow' ? '0.5in' : this.settings.margins === 'wide' ? '1.5in' : '1in'};
        }
        
        .business-screen-only {
          display: none !important;
        }
        
        .business-print-only {
          display: block !important;
        }
      }
    `;
  }

  /**
   * Get current formatter settings
   * @returns {Object} Current settings object
   */
  getSettings() {
    return {
      template: this.currentTemplate,
      settings: { ...this.settings },
      headerFooter: { ...this.headerFooter }
    };
  }

  /**
   * Reset formatter to default settings
   */
  reset() {
    this.currentTemplate = 'standard';
    this.settings = {
      fontFamily: 'serif',
      fontSize: 'normal',
      lineHeight: 'normal',
      textAlign: 'justify',
      pageSize: 'letter',
      margins: 'normal'
    };
    this.headerFooter = {
      header: '',
      footer: '',
      showPageNumbers: true,
      showDate: true
    };
    
    // Remove all business styling from document
    const businessElements = document.querySelectorAll('[class*="business-"]');
    businessElements.forEach(element => {
      const classes = Array.from(element.classList);
      classes.forEach(className => {
        if (className.startsWith('business-')) {
          element.classList.remove(className);
        }
      });
    });
    
    // Reset CSS custom properties
    const root = document.documentElement;
    root.style.removeProperty('--business-font-family');
    root.style.removeProperty('--business-font-size-body');
    root.style.removeProperty('--business-line-height-normal');
    
    console.log('BusinessDocumentFormatter: Reset to defaults');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessDocumentFormatter;
} else if (typeof window !== 'undefined') {
  window.BusinessDocumentFormatter = BusinessDocumentFormatter;
}