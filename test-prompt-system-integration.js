// Test 6.1: Prompt System Integration Tests
// Tests prompt loading from PROMPTS folder, prompt selection for each report type, and fallback behavior

import fs from 'fs/promises';
import path from 'path';

// Test results tracking
const testResults = {
  '6.1.1': { tested: false, passed: false, description: 'Prompt files loaded from PROMPTS folder' },
  '6.1.2': { tested: false, passed: false, description: 'Correct prompt selection for jp_investment_4part' },
  '6.1.3': { tested: false, passed: false, description: 'Correct prompt selection for jp_tax_strategy' },
  '6.1.4': { tested: false, passed: false, description: 'Correct prompt selection for jp_inheritance_strategy' },
  '6.1.5': { tested: false, passed: false, description: 'Correct prompt selection for comparison_analysis' },
  '6.1.6': { tested: false, passed: false, description: 'Correct prompt selection for custom (uses jp_investment_4part)' },
  '6.1.7': { tested: false, passed: false, description: 'Fallback behavior for missing prompts' },
  '6.1.8': { tested: false, passed: false, description: 'Prompt content validation' },
  '6.1.9': { tested: false, passed: false, description: 'PromptManager initialization' },
  '6.1.10': { tested: false, passed: false, description: 'buildFullPrompt method functionality' }
};

// Mock PromptManager class for testing (based on the implementation in generate.js)
class TestPromptManager {
  constructor() {
    this.prompts = new Map();
    this.reportTypes = {
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
  }
  
  async loadPrompts() {
    const promptsDir = './PROMPTS';
    
    try {
      const files = await fs.readdir(promptsDir);
      const promptFiles = files.filter(file => file.endsWith('.md'));
      
      console.log(`[TEST PROMPT MANAGER] Loading ${promptFiles.length} prompt files from ${promptsDir}`);
      
      for (const file of promptFiles) {
        try {
          const filePath = path.join(promptsDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          this.prompts.set(file, content);
          console.log(`[TEST PROMPT MANAGER] Loaded prompt: ${file}`);
        } catch (error) {
          console.error(`[TEST PROMPT MANAGER] Failed to load prompt ${file}:`, error.message);
        }
      }
      
      console.log(`[TEST PROMPT MANAGER] Successfully loaded ${this.prompts.size} prompts`);
      return this.prompts.size;
    } catch (error) {
      console.error('[TEST PROMPT MANAGER] Failed to read PROMPTS directory:', error.message);
      return 0;
    }
  }
  
  getPrompt(reportType) {
    const promptFile = this.reportTypes[reportType]?.promptFile || 'jp_investment_4part.md';
    const prompt = this.prompts.get(promptFile);
    
    if (!prompt) {
      console.error(`[TEST PROMPT MANAGER] Prompt not found: ${promptFile}, falling back to default`);
      const fallbackPrompt = this.prompts.get('jp_investment_4part.md') || 'DEFAULT_FALLBACK_PROMPT';
      return fallbackPrompt;
    }
    
    console.log(`[TEST PROMPT MANAGER] Using prompt: ${promptFile} for report type: ${reportType}`);
    return prompt;
  }
  
  buildFullPrompt(reportType, inputText, files, additionalInfo, comparisonData = null) {
    console.log(`[TEST PROMPT MANAGER] Building full prompt for report type: ${reportType}`);
    
    const basePrompt = this.getPrompt(reportType);
    
    if (reportType === 'comparison_analysis') {
      return this.buildComparisonPrompt(basePrompt, comparisonData);
    } else if (reportType === 'custom') {
      return this.buildCustomPrompt(basePrompt, inputText, files, additionalInfo);
    } else {
      return this.buildStandardPrompt(basePrompt, inputText, files, additionalInfo);
    }
  }
  
  buildStandardPrompt(basePrompt, inputText, files, additionalInfo) {
    let fullPrompt = basePrompt;
    
    if (inputText && inputText.trim()) {
      fullPrompt += `\n\n【入力データ】\n${inputText}`;
    }
    
    if (files && files.length > 0) {
      fullPrompt += `\n\n【添付ファイル】\n添付されたファイルの内容を分析に含めてください。`;
    }
    
    if (additionalInfo && Object.keys(additionalInfo).length > 0) {
      fullPrompt += `\n\n【追加情報】\n${JSON.stringify(additionalInfo, null, 2)}`;
    }
    
    return fullPrompt;
  }
  
  buildCustomPrompt(basePrompt, inputText, files, additionalInfo) {
    let customPrompt = basePrompt;
    
    customPrompt += `\n\n【カスタム分析指示】\n以下のカスタム要件を投資分析の4部構成フレームワークに統合して分析してください：\n`;
    
    if (additionalInfo && additionalInfo.customRequirements && additionalInfo.customRequirements.trim()) {
      customPrompt += `\n\n【カスタム要件】\n${additionalInfo.customRequirements}`;
    } else {
      customPrompt += `\n\n【カスタム要件】\n標準的な投資分析を実施してください。特別な要件は指定されていません。`;
    }
    
    if (inputText && inputText.trim()) {
      customPrompt += `\n\n【分析対象データ】\n${inputText}`;
    }
    
    return customPrompt;
  }
  
  buildComparisonPrompt(basePrompt, comparisonData) {
    if (!comparisonData || !comparisonData.propertyA || !comparisonData.propertyB) {
      throw new Error('Comparison analysis requires both Property A and Property B data');
    }
    
    let comparisonPrompt = basePrompt;
    
    comparisonPrompt += `\n\n【物件A】\n`;
    if (comparisonData.propertyA.inputText) {
      comparisonPrompt += comparisonData.propertyA.inputText;
    }
    
    comparisonPrompt += `\n\n【物件B】\n`;
    if (comparisonData.propertyB.inputText) {
      comparisonPrompt += comparisonData.propertyB.inputText;
    }
    
    if (comparisonData.comparisonCriteria) {
      comparisonPrompt += `\n\n【比較項目】\n${comparisonData.comparisonCriteria}`;
    }
    
    return comparisonPrompt;
  }
}

// Utility functions
function logTest(testId, passed, message = '') {
  testResults[testId].tested = true;
  testResults[testId].passed = passed;
  
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const description = testResults[testId].description;
  console.log(`${status} [${testId}] ${description}${message ? ': ' + message : ''}`);
}

function generateTestSummary() {
  const totalTests = Object.keys(testResults).length;
  const testedCount = Object.values(testResults).filter(r => r.tested).length;
  const passedCount = Object.values(testResults).filter(r => r.passed).length;
  const failedCount = testedCount - passedCount;
  
  console.log('\n' + '='.repeat(80));
  console.log('PROMPT SYSTEM INTEGRATION TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Tests Run: ${testedCount}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Success Rate: ${testedCount > 0 ? ((passedCount / testedCount) * 100).toFixed(1) : 0}%`);
  
  if (failedCount > 0) {
    console.log('\nFailed Tests:');
    Object.entries(testResults).forEach(([id, result]) => {
      if (result.tested && !result.passed) {
        console.log(`  ❌ [${id}] ${result.description}`);
      }
    });
  }
  
  console.log('='.repeat(80));
  
  return {
    total: totalTests,
    tested: testedCount,
    passed: passedCount,
    failed: failedCount,
    successRate: testedCount > 0 ? ((passedCount / testedCount) * 100).toFixed(1) : 0
  };
}

// Test functions
async function testPromptLoading() {
  console.log('\n🔍 Testing prompt loading from PROMPTS folder...');
  
  try {
    const promptManager = new TestPromptManager();
    const loadedCount = await promptManager.loadPrompts();
    
    // Test 6.1.1: Verify prompts are loaded
    logTest('6.1.1', loadedCount > 0, `Loaded ${loadedCount} prompt files`);
    
    // Test 6.1.8: Validate prompt content
    const expectedPrompts = ['jp_investment_4part.md', 'jp_tax_strategy.md', 'jp_inheritance_strategy.md', 'comparison_analysis.md'];
    let allPromptsValid = true;
    
    for (const promptFile of expectedPrompts) {
      const content = promptManager.prompts.get(promptFile);
      if (!content || content.trim().length === 0) {
        allPromptsValid = false;
        console.log(`❌ Missing or empty prompt: ${promptFile}`);
      }
    }
    
    logTest('6.1.8', allPromptsValid, `All expected prompt files have valid content`);
    
    return promptManager;
  } catch (error) {
    logTest('6.1.1', false, `Error loading prompts: ${error.message}`);
    logTest('6.1.8', false, `Error validating prompts: ${error.message}`);
    return null;
  }
}

async function testPromptSelection(promptManager) {
  console.log('\n🎯 Testing prompt selection for each report type...');
  
  if (!promptManager) {
    console.log('❌ Cannot test prompt selection - PromptManager not available');
    return;
  }
  
  // Test 6.1.2: jp_investment_4part
  try {
    const investmentPrompt = promptManager.getPrompt('jp_investment_4part');
    const isValidInvestmentPrompt = investmentPrompt && investmentPrompt.includes('投資') && investmentPrompt.length > 100;
    logTest('6.1.2', isValidInvestmentPrompt, `Investment prompt loaded (${investmentPrompt ? investmentPrompt.length : 0} chars)`);
  } catch (error) {
    logTest('6.1.2', false, `Error: ${error.message}`);
  }
  
  // Test 6.1.3: jp_tax_strategy
  try {
    const taxPrompt = promptManager.getPrompt('jp_tax_strategy');
    const isValidTaxPrompt = taxPrompt && (taxPrompt.includes('税務') || taxPrompt.includes('減価償却')) && taxPrompt.length > 100;
    logTest('6.1.3', isValidTaxPrompt, `Tax strategy prompt loaded (${taxPrompt ? taxPrompt.length : 0} chars)`);
  } catch (error) {
    logTest('6.1.3', false, `Error: ${error.message}`);
  }
  
  // Test 6.1.4: jp_inheritance_strategy
  try {
    const inheritancePrompt = promptManager.getPrompt('jp_inheritance_strategy');
    const isValidInheritancePrompt = inheritancePrompt && inheritancePrompt.includes('相続') && inheritancePrompt.length > 100;
    logTest('6.1.4', isValidInheritancePrompt, `Inheritance strategy prompt loaded (${inheritancePrompt ? inheritancePrompt.length : 0} chars)`);
  } catch (error) {
    logTest('6.1.4', false, `Error: ${error.message}`);
  }
  
  // Test 6.1.5: comparison_analysis
  try {
    const comparisonPrompt = promptManager.getPrompt('comparison_analysis');
    const isValidComparisonPrompt = comparisonPrompt && comparisonPrompt.includes('比較') && comparisonPrompt.length > 100;
    logTest('6.1.5', isValidComparisonPrompt, `Comparison analysis prompt loaded (${comparisonPrompt ? comparisonPrompt.length : 0} chars)`);
  } catch (error) {
    logTest('6.1.5', false, `Error: ${error.message}`);
  }
  
  // Test 6.1.6: custom (should use jp_investment_4part)
  try {
    const customPrompt = promptManager.getPrompt('custom');
    const investmentPrompt = promptManager.getPrompt('jp_investment_4part');
    const usesInvestmentPrompt = customPrompt === investmentPrompt;
    logTest('6.1.6', usesInvestmentPrompt, `Custom report uses investment prompt as base`);
  } catch (error) {
    logTest('6.1.6', false, `Error: ${error.message}`);
  }
}

async function testFallbackBehavior(promptManager) {
  console.log('\n🔄 Testing fallback behavior for missing prompts...');
  
  if (!promptManager) {
    console.log('❌ Cannot test fallback behavior - PromptManager not available');
    return;
  }
  
  try {
    // Test with non-existent report type
    const fallbackPrompt = promptManager.getPrompt('non_existent_type');
    const investmentPrompt = promptManager.getPrompt('jp_investment_4part');
    
    // Should fallback to jp_investment_4part
    const fallbackWorks = fallbackPrompt === investmentPrompt;
    logTest('6.1.7', fallbackWorks, `Fallback to investment prompt for unknown report type`);
  } catch (error) {
    logTest('6.1.7', false, `Error: ${error.message}`);
  }
}

async function testPromptManagerInitialization() {
  console.log('\n🚀 Testing PromptManager initialization...');
  
  try {
    const promptManager = new TestPromptManager();
    
    // Test initialization
    const hasReportTypes = promptManager.reportTypes && Object.keys(promptManager.reportTypes).length > 0;
    const hasPromptsMap = promptManager.prompts instanceof Map;
    
    logTest('6.1.9', hasReportTypes && hasPromptsMap, `PromptManager initialized with report types and prompts map`);
    
    return promptManager;
  } catch (error) {
    logTest('6.1.9', false, `Error: ${error.message}`);
    return null;
  }
}

async function testBuildFullPromptMethod(promptManager) {
  console.log('\n🔧 Testing buildFullPrompt method functionality...');
  
  if (!promptManager) {
    console.log('❌ Cannot test buildFullPrompt - PromptManager not available');
    return;
  }
  
  try {
    // Load prompts first
    await promptManager.loadPrompts();
    
    // Test standard prompt building
    const inputText = 'Test property data';
    const files = [{ name: 'test.pdf', type: 'application/pdf' }];
    const additionalInfo = { location: 'Tokyo' };
    
    const standardPrompt = promptManager.buildFullPrompt('jp_investment_4part', inputText, files, additionalInfo);
    
    const hasBasePrompt = standardPrompt.includes('投資') || standardPrompt.length > 100;
    const hasInputData = standardPrompt.includes('Test property data');
    const hasFileInfo = standardPrompt.includes('添付ファイル');
    const hasAdditionalInfo = standardPrompt.includes('Tokyo');
    
    const standardPromptValid = hasBasePrompt && hasInputData && hasFileInfo && hasAdditionalInfo;
    
    // Test custom prompt building
    const customAdditionalInfo = { customRequirements: 'Focus on ROI analysis' };
    const customPrompt = promptManager.buildFullPrompt('custom', inputText, files, customAdditionalInfo);
    
    const hasCustomRequirements = customPrompt.includes('Focus on ROI analysis');
    const hasCustomFramework = customPrompt.includes('カスタム分析指示');
    
    const customPromptValid = hasCustomRequirements && hasCustomFramework;
    
    // Test comparison prompt building
    const comparisonData = {
      propertyA: { inputText: 'Property A data' },
      propertyB: { inputText: 'Property B data' },
      comparisonCriteria: 'ROI and location'
    };
    
    const comparisonPrompt = promptManager.buildFullPrompt('comparison_analysis', null, null, null, comparisonData);
    
    const hasPropertyA = comparisonPrompt.includes('Property A data');
    const hasPropertyB = comparisonPrompt.includes('Property B data');
    const hasCriteria = comparisonPrompt.includes('ROI and location');
    
    const comparisonPromptValid = hasPropertyA && hasPropertyB && hasCriteria;
    
    const allPromptTypesValid = standardPromptValid && customPromptValid && comparisonPromptValid;
    
    logTest('6.1.10', allPromptTypesValid, `buildFullPrompt works for standard, custom, and comparison prompts`);
    
  } catch (error) {
    logTest('6.1.10', false, `Error: ${error.message}`);
  }
}

// Main test execution
async function runPromptSystemIntegrationTests() {
  console.log('🧪 Starting Prompt System Integration Tests (Task 6.1)');
  console.log('Testing prompt loading, selection, and fallback behavior');
  console.log('Requirements: 1.1, 1.2, 1.3, 5.1, 5.2\n');
  
  try {
    // Test PromptManager initialization
    const promptManager = await testPromptManagerInitialization();
    
    // Test prompt loading
    const loadedPromptManager = await testPromptLoading();
    
    // Test prompt selection for each report type
    await testPromptSelection(loadedPromptManager);
    
    // Test fallback behavior
    await testFallbackBehavior(loadedPromptManager);
    
    // Test buildFullPrompt method
    await testBuildFullPromptMethod(loadedPromptManager);
    
    // Generate summary
    const summary = generateTestSummary();
    
    // Save results to file
    const resultsData = {
      testSuite: 'Prompt System Integration Tests (Task 6.1)',
      timestamp: new Date().toISOString(),
      requirements: ['1.1', '1.2', '1.3', '5.1', '5.2'],
      summary,
      results: testResults
    };
    
    await fs.writeFile('test-prompt-system-integration-results.json', JSON.stringify(resultsData, null, 2));
    console.log('\n📄 Test results saved to test-prompt-system-integration-results.json');
    
    return summary;
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    return { total: 0, tested: 0, passed: 0, failed: 0, successRate: 0 };
  }
}

// Run tests automatically
runPromptSystemIntegrationTests()
  .then(summary => {
    console.log(`\n🏁 Tests completed with ${summary.successRate}% success rate`);
    process.exit(summary.failed > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });

export {
  runPromptSystemIntegrationTests,
  TestPromptManager
};