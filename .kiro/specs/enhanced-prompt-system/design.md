# Design Document

## Overview

This design enhances the existing report generation system to properly utilize detailed prompts from the PROMPTS folder and adds a comprehensive comparison analysis feature. The system will provide structured, template-driven report generation with support for property comparison and custom analysis requirements.

## Architecture

### Current Architecture Enhancement
```
Frontend → Enhanced UI → API Endpoints → Enhanced Prompt System → AI Services
    ↓           ↓              ↓                    ↓
Report Types → Prompt Loader → Template Engine → Structured Reports
    ↓           ↓              ↓
Comparison UI → Dual Upload → Comparison Engine
```

### Enhanced System Flow
1. **Report Type Selection** → User selects from enhanced dropdown with proper prompt mapping
2. **Prompt Loading** → System loads appropriate template from PROMPTS folder
3. **Input Processing** → Handle single property, custom, or comparison inputs
4. **Template Application** → Apply loaded prompt template with user data
5. **AI Generation** → Generate report using enhanced prompts
6. **Structured Output** → Return formatted report matching template structure

## Components and Interfaces

### 1. Enhanced Report Type Selector (Modified Frontend)
**Purpose**: Provide accurate report type selection that maps to PROMPTS folder

**Enhanced Options**:
```javascript
const reportTypes = {
  'jp_investment_4part': {
    label: '投資分析レポート（4部構成）',
    promptFile: 'jp_investment_4part.md',
    description: 'Executive Summary, Benefits, Risks, Financial Analysis'
  },
  'jp_tax_strategy': {
    label: '税務戦略レポート（減価償却活用）',
    promptFile: 'jp_tax_strategy.md', 
    description: '所得税・住民税の減税戦略分析'
  },
  'jp_inheritance_strategy': {
    label: '相続対策戦略レポート',
    promptFile: 'jp_inheritance_strategy.md',
    description: '収益不動産活用による相続対策分析'
  },
  'comparison_analysis': {
    label: '比較分析レポート',
    promptFile: 'comparison_analysis.md',
    description: '複数物件の比較分析'
  },
  'custom': {
    label: 'カスタムレポート',
    promptFile: 'jp_investment_4part.md', // Default to investment analysis
    description: 'カスタム要件に基づく投資分析'
  }
};
```

### 2. Comparison Analysis Interface (New Frontend Component)
**Purpose**: Handle dual property upload and comparison criteria input

**UI Components**:
```html
<!-- Comparison Analysis Section (shown when comparison_analysis selected) -->
<div id="comparisonSection" class="hidden">
  <div class="comparison-uploads">
    <div class="property-upload">
      <h3>物件A</h3>
      <input type="file" id="propertyAFiles" multiple>
      <textarea id="propertyAText" placeholder="物件Aの詳細情報..."></textarea>
    </div>
    <div class="property-upload">
      <h3>物件B</h3>
      <input type="file" id="propertyBFiles" multiple>
      <textarea id="propertyBText" placeholder="物件Bの詳細情報..."></textarea>
    </div>
  </div>
  
  <div class="comparison-criteria">
    <h3>比較項目</h3>
    <textarea id="comparisonCriteria" placeholder="比較したい項目を指定してください（例：収益性、立地、リスク等）..."></textarea>
    
    <h3>結果表示形式</h3>
    <textarea id="resultFormat" placeholder="結果をどのように表示したいかを指定してください（例：表形式、グラフ、推奨順位等）..."></textarea>
  </div>
</div>
```

### 3. Enhanced Prompt System (Backend Enhancement)
**Purpose**: Load and apply detailed prompts from PROMPTS folder

**Key Functions**:
```javascript
class PromptManager {
  constructor() {
    this.prompts = new Map();
    this.loadPrompts();
  }
  
  async loadPrompts() {
    // Load all .md files from PROMPTS folder
    const promptFiles = ['jp_investment_4part.md', 'jp_tax_strategy.md', 'jp_inheritance_strategy.md'];
    
    for (const file of promptFiles) {
      try {
        const content = await fs.readFile(`./PROMPTS/${file}`, 'utf8');
        this.prompts.set(file, content);
      } catch (error) {
        console.error(`Failed to load prompt ${file}:`, error);
      }
    }
  }
  
  getPrompt(reportType) {
    const promptFile = reportTypes[reportType]?.promptFile || 'jp_investment_4part.md';
    return this.prompts.get(promptFile) || this.prompts.get('jp_investment_4part.md');
  }
  
  buildFullPrompt(reportType, inputText, files, additionalInfo, comparisonData = null) {
    const basePrompt = this.getPrompt(reportType);
    
    if (reportType === 'comparison_analysis') {
      return this.buildComparisonPrompt(basePrompt, comparisonData);
    } else if (reportType === 'custom') {
      return this.buildCustomPrompt(basePrompt, inputText, additionalInfo);
    } else {
      return this.buildStandardPrompt(basePrompt, inputText, files, additionalInfo);
    }
  }
}
```

### 4. Comparison Analysis Engine (New Backend Component)
**Purpose**: Handle comparison-specific logic and prompt generation

**Comparison Prompt Template**:
```markdown
# 不動産投資比較分析レポート作成指示書

## 指示
以下の2つの投資物件を詳細に比較分析し、プロの不動産コンサルタントとして、投資判断に必要な比較レポートを作成してください。

## 物件情報
### 物件A
{propertyA_data}

### 物件B  
{propertyB_data}

## 比較分析項目
{comparison_criteria}

## 求める結果表示形式
{result_format}

## レポート構成
1. **比較サマリー**
   - 両物件の基本情報比較表
   - 投資判断の結論と推奨物件

2. **収益性比較**
   - FCR、K%、IRR等の指標比較
   - キャッシュフロー比較
   - 投資回収期間比較

3. **リスク比較**
   - 立地リスク、市場リスク、流動性リスク
   - 各物件のリスクプロファイル

4. **総合評価と推奨**
   - 投資目的別の推奨度
   - 具体的な投資判断理由
   - 注意すべきポイント
```

## Data Models

### Enhanced Request Structure
```javascript
// Standard Report Request
{
  reportType: 'jp_investment_4part' | 'jp_tax_strategy' | 'jp_inheritance_strategy' | 'custom',
  inputText: string,
  files: File[],
  additionalInfo: object,
  customRequirements?: string // For custom reports
}

// Comparison Report Request  
{
  reportType: 'comparison_analysis',
  propertyA: {
    inputText: string,
    files: File[]
  },
  propertyB: {
    inputText: string, 
    files: File[]
  },
  comparisonCriteria: string,
  resultFormat: string,
  additionalInfo: object
}
```

### Enhanced Response Structure
```javascript
{
  id: string,
  title: string,
  content: string,
  reportType: string,
  promptUsed: string, // Which prompt template was used
  createdAt: string,
  usage: {
    promptTokens: number,
    completionTokens: number,
    totalTokens: number,
    estimatedCost: string
  },
  aiService: 'openai' | 'gemini',
  metadata: {
    isComparison: boolean,
    propertiesCompared?: number,
    customRequirements?: string
  }
}
```

## Frontend Enhancements

### 1. Dynamic UI Based on Report Type
```javascript
function handleReportTypeChange(reportType) {
  // Hide all conditional sections
  document.getElementById('comparisonSection').classList.add('hidden');
  document.getElementById('customSection').classList.add('hidden');
  
  // Show relevant sections
  if (reportType === 'comparison_analysis') {
    document.getElementById('comparisonSection').classList.remove('hidden');
    document.getElementById('standardUpload').classList.add('hidden');
  } else if (reportType === 'custom') {
    document.getElementById('customSection').classList.remove('hidden');
  } else {
    document.getElementById('standardUpload').classList.remove('hidden');
  }
  
  // Update form validation
  updateFormValidation(reportType);
}
```

### 2. Enhanced Form Validation
```javascript
function validateForm(reportType) {
  if (reportType === 'comparison_analysis') {
    return validateComparisonForm();
  } else {
    return validateStandardForm();
  }
}

function validateComparisonForm() {
  const hasPropertyAData = document.getElementById('propertyAText').value.trim() || 
                          document.getElementById('propertyAFiles').files.length > 0;
  const hasPropertyBData = document.getElementById('propertyBText').value.trim() || 
                          document.getElementById('propertyBFiles').files.length > 0;
  
  return hasPropertyAData && hasPropertyBData;
}
```

## Backend Implementation

### 1. Enhanced API Endpoint (Modified generate.js)
```javascript
export default async (req, res) => {
  // ... existing CORS and validation ...
  
  const { reportType, inputText, files, additionalInfo, options } = req.body;
  
  // Handle comparison analysis
  if (reportType === 'comparison_analysis') {
    return await handleComparisonAnalysis(req, res);
  }
  
  // Handle standard reports with enhanced prompts
  return await handleStandardReport(req, res);
};

async function handleComparisonAnalysis(req, res) {
  const { propertyA, propertyB, comparisonCriteria, resultFormat, additionalInfo } = req.body;
  
  // Process both properties
  const propertyAContent = await processPropertyData(propertyA);
  const propertyBContent = await processPropertyData(propertyB);
  
  // Build comparison prompt
  const comparisonPrompt = promptManager.buildComparisonPrompt({
    propertyA: propertyAContent,
    propertyB: propertyBContent,
    criteria: comparisonCriteria || '収益性、リスク、立地を中心とした総合比較',
    format: resultFormat || '表形式での比較と推奨順位'
  });
  
  // Generate report
  const report = await generateReport({
    reportType: 'comparison_analysis',
    prompt: comparisonPrompt,
    additionalInfo
  });
  
  return res.status(200).json({
    success: true,
    report: {
      ...report,
      metadata: {
        isComparison: true,
        propertiesCompared: 2
      }
    }
  });
}
```

### 2. Prompt Template Integration
```javascript
function buildStandardPrompt(basePrompt, inputText, files, additionalInfo) {
  let fullPrompt = basePrompt;
  
  // Add input data section
  if (inputText) {
    fullPrompt += `\n\n【入力データ】\n${inputText}`;
  }
  
  // Add file content section
  if (files && files.length > 0) {
    const fileContent = processFiles(files);
    fullPrompt += `\n\n【添付ファイル内容】\n${fileContent}`;
  }
  
  // Add additional info section
  if (additionalInfo && Object.keys(additionalInfo).length > 0) {
    fullPrompt += `\n\n【追加情報】\n${JSON.stringify(additionalInfo, null, 2)}`;
  }
  
  return fullPrompt;
}

function buildCustomPrompt(basePrompt, inputText, customRequirements) {
  // Start with investment analysis framework
  let customPrompt = basePrompt;
  
  // Add custom requirements
  if (customRequirements) {
    customPrompt += `\n\n【カスタム要件】\n${customRequirements}`;
    customPrompt += `\n\n上記のカスタム要件を考慮しつつ、投資分析の4部構成フレームワークに基づいてレポートを作成してください。`;
  }
  
  // Add input data
  if (inputText) {
    customPrompt += `\n\n【分析対象データ】\n${inputText}`;
  }
  
  return customPrompt;
}
```

## Error Handling and Validation

### 1. Prompt Loading Error Handling
```javascript
class PromptManager {
  getPrompt(reportType) {
    const promptFile = reportTypes[reportType]?.promptFile || 'jp_investment_4part.md';
    const prompt = this.prompts.get(promptFile);
    
    if (!prompt) {
      console.error(`Prompt not found: ${promptFile}, falling back to default`);
      return this.prompts.get('jp_investment_4part.md') || DEFAULT_PROMPT;
    }
    
    return prompt;
  }
}
```

### 2. Comparison Analysis Validation
```javascript
function validateComparisonRequest(req) {
  const { propertyA, propertyB, comparisonCriteria } = req.body;
  
  if (!propertyA || (!propertyA.inputText && !propertyA.files?.length)) {
    throw new Error('Property A data is required');
  }
  
  if (!propertyB || (!propertyB.inputText && !propertyB.files?.length)) {
    throw new Error('Property B data is required');
  }
  
  return true;
}
```

## Testing Strategy

### 1. Prompt System Testing
- Test prompt loading from PROMPTS folder
- Verify correct prompt selection for each report type
- Test fallback behavior for missing prompts
- Validate prompt template variable substitution

### 2. Comparison Analysis Testing
- Test dual property upload and processing
- Verify comparison criteria integration
- Test result format customization
- Validate comparison report structure

### 3. Custom Report Testing
- Test custom requirements integration with investment framework
- Verify fallback to standard investment analysis
- Test custom prompt handling and validation

This design provides a comprehensive enhancement to the prompt system while adding robust comparison analysis capabilities, ensuring users receive structured, template-driven reports that match their specific needs.