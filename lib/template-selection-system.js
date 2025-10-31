/**
 * Template Selection System
 * Provides template management and selection functionality for business documents
 */

class TemplateSelectionSystem {
  constructor() {
    this.currentTemplate = 'simple';
    this.templates = {
      simple: {
        name: 'Simple',
        description: 'Clean and minimal design for everyday business documents',
        preview: 'シンプルで読みやすいレイアウト',
        styles: {
          fontFamily: 'sans',
          fontSize: 'normal',
          lineHeight: 'normal',
          textAlign: 'left',
          headingStyle: 'minimal',
          colorScheme: 'neutral'
        },
        cssClass: 'business-template-simple'
      },
      formal: {
        name: 'Formal',
        description: 'Traditional business format with serif fonts and justified text',
        preview: '正式なビジネス文書に適した伝統的なスタイル',
        styles: {
          fontFamily: 'serif',
          fontSize: 'normal',
          lineHeight: 'normal',
          textAlign: 'justify',
          headingStyle: 'traditional',
          colorScheme: 'conservative'
        },
        cssClass: 'business-template-formal'
      },
      modern: {
        name: 'Modern',
        description: 'Contemporary design with clean lines and modern typography',
        preview: 'モダンで洗練されたデザイン',
        styles: {
          fontFamily: 'sans',
          fontSize: 'normal',
          lineHeight: 'relaxed',
          textAlign: 'left',
          headingStyle: 'modern',
          colorScheme: 'accent'
        },
        cssClass: 'business-template-modern'
      }
    };
    
    this.onTemplateChange = null;
    this.previewContainer = null;
    this.initialized = false;
  }

  /**
   * Initialize the template selection system
   * @param {Object} options - Configuration options
   */
  initialize(options = {}) {
    this.onTemplateChange = options.onTemplateChange || null;
    this.previewContainer = options.previewContainer || null;
    
    // Create template-specific CSS if not already present
    this.injectTemplateCSS();
    
    this.initialized = true;
    console.log('TemplateSelectionSystem initialized');
  }

  /**
   * Get all available templates
   * @returns {Object} Templates object
   */
  getTemplates() {
    return this.templates;
  }

  /**
   * Get current template
   * @returns {Object} Current template object
   */
  getCurrentTemplate() {
    return this.templates[this.currentTemplate];
  }

  /**
   * Get current template name
   * @returns {string} Current template name
   */
  getCurrentTemplateName() {
    return this.currentTemplate;
  }

  /**
   * Apply a template to the document
   * @param {string} templateName - Name of the template to apply
   * @param {HTMLElement} targetElement - Element to apply template to
   */
  applyTemplate(templateName, targetElement = null) {
    if (!this.templates[templateName]) {
      console.error(`Template "${templateName}" not found`);
      return false;
    }

    const previousTemplate = this.currentTemplate;
    this.currentTemplate = templateName;
    const template = this.templates[templateName];

    // Remove previous template classes from document root
    const root = document.documentElement;
    Object.keys(this.templates).forEach(name => {
      root.classList.remove(this.templates[name].cssClass);
    });

    // Apply new template class to document root
    root.classList.add(template.cssClass);

    // Apply template to specific element if provided
    if (targetElement) {
      this.applyTemplateToElement(template, targetElement);
    }

    // Apply template styles to document
    this.applyTemplateStyles(template);

    // Trigger change callback
    if (this.onTemplateChange) {
      this.onTemplateChange(templateName, template, previousTemplate);
    }

    console.log(`Template applied: ${templateName}`);
    return true;
  }

  /**
   * Apply template styles to a specific element
   * @param {Object} template - Template object
   * @param {HTMLElement} element - Target element
   */
  applyTemplateToElement(template, element) {
    // Remove existing template classes
    Object.keys(this.templates).forEach(name => {
      element.classList.remove(this.templates[name].cssClass);
    });

    // Add new template class
    element.classList.add(template.cssClass);

    // Apply template-specific styling
    const styles = template.styles;
    
    if (styles.fontFamily === 'sans') {
      element.classList.add('business-document-sans');
    } else {
      element.classList.remove('business-document-sans');
    }

    // Apply text alignment
    element.classList.remove('business-text-left', 'business-text-center', 'business-text-right', 'business-text-justify');
    element.classList.add(`business-text-${styles.textAlign}`);
  }

  /**
   * Apply template styles to the document
   * @param {Object} template - Template object
   */
  applyTemplateStyles(template) {
    const root = document.documentElement;
    const styles = template.styles;

    // Set CSS custom properties based on template
    if (styles.fontFamily === 'sans') {
      root.style.setProperty('--business-font-family', 'var(--business-font-family-sans)');
    } else {
      root.style.setProperty('--business-font-family', '"Times New Roman", "Georgia", "Hiragino Mincho ProN", "Yu Mincho", serif');
    }

    // Set font size
    const fontSizeMap = {
      small: '11pt',
      normal: '12pt',
      large: '14pt'
    };
    root.style.setProperty('--business-font-size-body', fontSizeMap[styles.fontSize] || '12pt');

    // Set line height
    const lineHeightMap = {
      tight: '1.2',
      normal: '1.5',
      relaxed: '1.8'
    };
    root.style.setProperty('--business-line-height-normal', lineHeightMap[styles.lineHeight] || '1.5');

    // Apply color scheme
    this.applyColorScheme(styles.colorScheme);
  }

  /**
   * Apply color scheme based on template
   * @param {string} colorScheme - Color scheme name
   */
  applyColorScheme(colorScheme) {
    const root = document.documentElement;

    switch (colorScheme) {
      case 'conservative':
        root.style.setProperty('--business-color-accent', '#1a365d');
        root.style.setProperty('--business-color-heading', '#2d3748');
        break;
      case 'accent':
        root.style.setProperty('--business-color-accent', '#2563eb');
        root.style.setProperty('--business-color-heading', '#1e40af');
        break;
      default: // neutral
        root.style.setProperty('--business-color-accent', '#374151');
        root.style.setProperty('--business-color-heading', '#1f2937');
        break;
    }
  }

  /**
   * Create template selection UI
   * @param {HTMLElement} container - Container element for the UI
   * @returns {HTMLElement} Created template selector element
   */
  createTemplateSelector(container) {
    const selectorContainer = document.createElement('div');
    selectorContainer.className = 'template-selector-container';

    // Create header
    const header = document.createElement('div');
    header.className = 'template-selector-header';
    header.innerHTML = `
      <h3 class="template-selector-title">テンプレート選択</h3>
      <p class="template-selector-description">文書のスタイルを選択してください</p>
    `;

    // Create template grid
    const templateGrid = document.createElement('div');
    templateGrid.className = 'template-grid';

    Object.keys(this.templates).forEach(templateName => {
      const template = this.templates[templateName];
      const templateCard = this.createTemplateCard(templateName, template);
      templateGrid.appendChild(templateCard);
    });

    // Create preview section
    const previewSection = document.createElement('div');
    previewSection.className = 'template-preview-section';
    previewSection.innerHTML = `
      <h4 class="template-preview-title">プレビュー</h4>
      <div class="template-preview-container" id="templatePreviewContainer">
        <div class="template-preview-content">
          <h1>サンプル見出し</h1>
          <p>これはテンプレートのプレビューです。実際の文書がどのように表示されるかを確認できます。</p>
          <h2>副見出し</h2>
          <ul>
            <li>リスト項目 1</li>
            <li>リスト項目 2</li>
          </ul>
        </div>
      </div>
    `;

    selectorContainer.appendChild(header);
    selectorContainer.appendChild(templateGrid);
    selectorContainer.appendChild(previewSection);

    if (container) {
      container.appendChild(selectorContainer);
    }

    // Set initial preview
    this.updatePreview();

    return selectorContainer;
  }

  /**
   * Create a template card element
   * @param {string} templateName - Template name
   * @param {Object} template - Template object
   * @returns {HTMLElement} Template card element
   */
  createTemplateCard(templateName, template) {
    const card = document.createElement('div');
    card.className = `template-card ${templateName === this.currentTemplate ? 'active' : ''}`;
    card.dataset.template = templateName;

    card.innerHTML = `
      <div class="template-card-preview">
        <div class="template-preview-mini ${template.cssClass}">
          <div class="mini-heading">見出し</div>
          <div class="mini-text">本文テキストのサンプル</div>
        </div>
      </div>
      <div class="template-card-info">
        <h4 class="template-card-name">${template.name}</h4>
        <p class="template-card-description">${template.description}</p>
        <div class="template-card-features">
          <span class="template-feature">${template.styles.fontFamily === 'serif' ? 'セリフ体' : 'サンセリフ体'}</span>
          <span class="template-feature">${template.styles.textAlign === 'justify' ? '両端揃え' : '左揃え'}</span>
        </div>
      </div>
      <button class="template-select-btn" onclick="templateSystem.selectTemplate('${templateName}')">
        ${templateName === this.currentTemplate ? '選択中' : '選択'}
      </button>
    `;

    return card;
  }

  /**
   * Select a template (called from UI)
   * @param {string} templateName - Template name to select
   */
  selectTemplate(templateName) {
    if (this.applyTemplate(templateName)) {
      // Update UI
      this.updateTemplateCards();
      this.updatePreview();
    }
  }

  /**
   * Update template card UI states
   */
  updateTemplateCards() {
    const cards = document.querySelectorAll('.template-card');
    cards.forEach(card => {
      const templateName = card.dataset.template;
      const button = card.querySelector('.template-select-btn');
      
      if (templateName === this.currentTemplate) {
        card.classList.add('active');
        if (button) button.textContent = '選択中';
      } else {
        card.classList.remove('active');
        if (button) button.textContent = '選択';
      }
    });
  }

  /**
   * Update template preview
   */
  updatePreview() {
    const previewContainer = document.getElementById('templatePreviewContainer');
    if (previewContainer) {
      const template = this.getCurrentTemplate();
      previewContainer.className = `template-preview-container ${template.cssClass}`;
    }
  }

  /**
   * Inject template-specific CSS into the document
   */
  injectTemplateCSS() {
    if (document.getElementById('template-system-styles')) {
      return; // Already injected
    }

    const style = document.createElement('style');
    style.id = 'template-system-styles';
    style.textContent = `
      /* Template Selection System Styles */
      .template-selector-container {
        background: white;
        border-radius: 8px;
        padding: 24px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        margin-bottom: 24px;
      }

      .template-selector-header {
        margin-bottom: 24px;
        text-align: center;
      }

      .template-selector-title {
        font-size: 20px;
        font-weight: 600;
        color: #1f2937;
        margin: 0 0 8px 0;
      }

      .template-selector-description {
        color: #6b7280;
        margin: 0;
        font-size: 14px;
      }

      .template-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 20px;
        margin-bottom: 32px;
      }

      .template-card {
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        padding: 16px;
        transition: all 0.2s ease;
        cursor: pointer;
        background: white;
      }

      .template-card:hover {
        border-color: #3b82f6;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
      }

      .template-card.active {
        border-color: #3b82f6;
        background: #eff6ff;
      }

      .template-card-preview {
        background: #f9fafb;
        border-radius: 6px;
        padding: 16px;
        margin-bottom: 12px;
        min-height: 80px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .template-preview-mini {
        text-align: center;
        width: 100%;
      }

      .mini-heading {
        font-weight: bold;
        margin-bottom: 8px;
        font-size: 16px;
      }

      .mini-text {
        font-size: 12px;
        color: #6b7280;
        line-height: 1.4;
      }

      .template-card-info {
        margin-bottom: 16px;
      }

      .template-card-name {
        font-size: 16px;
        font-weight: 600;
        color: #1f2937;
        margin: 0 0 4px 0;
      }

      .template-card-description {
        font-size: 13px;
        color: #6b7280;
        margin: 0 0 8px 0;
        line-height: 1.4;
      }

      .template-card-features {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .template-feature {
        background: #f3f4f6;
        color: #374151;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 500;
      }

      .template-select-btn {
        width: 100%;
        padding: 8px 16px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        background: white;
        color: #374151;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .template-select-btn:hover {
        background: #f9fafb;
        border-color: #9ca3af;
      }

      .template-card.active .template-select-btn {
        background: #3b82f6;
        color: white;
        border-color: #3b82f6;
      }

      .template-preview-section {
        border-top: 1px solid #e5e7eb;
        padding-top: 24px;
      }

      .template-preview-title {
        font-size: 16px;
        font-weight: 600;
        color: #1f2937;
        margin: 0 0 16px 0;
      }

      .template-preview-container {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 24px;
        background: white;
        min-height: 200px;
      }

      .template-preview-content h1 {
        font-size: 24px;
        margin: 0 0 16px 0;
      }

      .template-preview-content h2 {
        font-size: 20px;
        margin: 20px 0 12px 0;
      }

      .template-preview-content p {
        margin: 12px 0;
        line-height: 1.6;
      }

      .template-preview-content ul {
        margin: 12px 0;
        padding-left: 24px;
      }

      .template-preview-content li {
        margin: 4px 0;
      }

      /* Template-specific preview styles */
      .business-template-simple .template-preview-content {
        font-family: var(--business-font-family-sans);
        text-align: left;
      }

      .business-template-simple .mini-heading {
        font-family: var(--business-font-family-sans);
        color: #374151;
      }

      .business-template-formal .template-preview-content {
        font-family: var(--business-font-family);
        text-align: justify;
      }

      .business-template-formal .mini-heading {
        font-family: var(--business-font-family);
        color: #2d3748;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 4px;
      }

      .business-template-modern .template-preview-content {
        font-family: var(--business-font-family-sans);
        text-align: left;
        line-height: 1.8;
      }

      .business-template-modern .mini-heading {
        font-family: var(--business-font-family-sans);
        color: #1e40af;
        font-weight: 700;
      }

      /* Responsive design */
      @media (max-width: 768px) {
        .template-grid {
          grid-template-columns: 1fr;
        }
        
        .template-selector-container {
          padding: 16px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Get template configuration for export
   * @returns {Object} Template configuration
   */
  getTemplateConfig() {
    const template = this.getCurrentTemplate();
    return {
      name: this.currentTemplate,
      styles: template.styles,
      cssClass: template.cssClass
    };
  }

  /**
   * Reset to default template
   */
  reset() {
    this.applyTemplate('simple');
  }

  /**
   * Destroy the template system and clean up
   */
  destroy() {
    // Remove template classes from document
    const root = document.documentElement;
    Object.keys(this.templates).forEach(name => {
      root.classList.remove(this.templates[name].cssClass);
    });

    // Remove injected styles
    const styleElement = document.getElementById('template-system-styles');
    if (styleElement) {
      styleElement.remove();
    }

    // Reset properties
    this.currentTemplate = 'simple';
    this.onTemplateChange = null;
    this.previewContainer = null;
    this.initialized = false;

    console.log('TemplateSelectionSystem destroyed');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TemplateSelectionSystem;
} else if (typeof window !== 'undefined') {
  window.TemplateSelectionSystem = TemplateSelectionSystem;
}