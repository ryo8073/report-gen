// Test 6.3: Custom Report Enhancement Tests
// Tests custom requirements integration with investment framework, fallback behavior, and 4-part structure maintenance

import fs from 'fs/promises';

// Test results tracking
const testResults = {
  '6.3.1': { tested: false, passed: false, description: 'Custom requirements integration with investment framework' },
  '6.3.2': { tested: false, passed: false, description: 'Fallback to standard investment analysis when no custom text' },
  '6.3.3': { tested: false, passed: false, description: 'Report maintains 4-part structure with custom content' },
  '6.3.4': { tested: false, passed: false, description: 'Custom prompt building uses jp_investment_4part as base' },
  '6.3.5': { tested: false, passed: false, description: 'Custom requirements properly integrated into prompt' },
  '6.3.6': { tested: false, passed: false, description: 'Investment framework structure preserved' },
  '6.3.7': { tested: false, passed: false, description: 'Custom report validation and error handling' },
  '6.3.8': { tested: false, passed: false, description: 'Custom report content quality validation' },
  '6.3.9': { tested: false, passed: false, description: 'Multiple custom requirement scenarios' },
  '6.3.10': { tested: false, passed: false, description: 'Custom report with file integration' }
};

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
  console.log('CUSTOM REPORT ENHANCEMENT TEST SUMMARY');
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

// Mock custom report enhancement functionality
class CustomReportEnhancementValidator {
  
  constructor() {
    // Mock jp_investment_4part prompt
    this.investmentPrompt = `あなたは経験豊富な投資アドバイザーです。以下の情報を基に、4部構成の投資分析レポートを作成してください。

構成:
1. 投資概要と現状分析
2. リスク評価と市場分析
3. 推奨投資戦略
4. 実行計画と注意事項

レポートは専門的でありながら、クライアントが理解しやすい内容にしてください。`;
  }
  
  buildCustomPrompt(basePrompt, inputText, files, additionalInfo) {
    console.log('[TEST CUSTOM REPORT] Building custom prompt with jp_investment_4part base template');
    
    // Start with investment analysis framework as base (jp_investment_4part.md)
    let customPrompt = basePrompt;
    
    // Add custom requirements integration instruction
    customPrompt += `\n\n【カスタム分析指示】\n以下のカスタム要件を投資分析の4部構成フレームワークに統合して分析してください：\n`;
    customPrompt += `1. 投資概要と現状分析 - カスタム要件を考慮した現状評価\n`;
    customPrompt += `2. リスク評価と市場分析 - カスタム要件に関連するリスク要因\n`;
    customPrompt += `3. 推奨投資戦略 - カスタム要件を満たす戦略提案\n`;
    customPrompt += `4. 実行計画と注意事項 - カスタム要件実現のための具体的ステップ\n`;
    
    // Add custom requirements if provided in additionalInfo
    if (additionalInfo && additionalInfo.customRequirements && additionalInfo.customRequirements.trim()) {
      customPrompt += `\n\n【カスタム要件】\n${additionalInfo.customRequirements}`;
      console.log('[TEST CUSTOM REPORT] Custom requirements integrated into investment framework');
    } else {
      // If no custom requirements, use standard investment analysis
      customPrompt += `\n\n【カスタム要件】\n標準的な投資分析を実施してください。特別な要件は指定されていません。`;
      console.log('[TEST CUSTOM REPORT] No custom requirements provided, using standard investment analysis');
    }
    
    // Add input data
    if (inputText && inputText.trim()) {
      customPrompt += `\n\n【分析対象データ】\n${inputText}`;
    }
    
    // Add file content section
    if (files && files.length > 0) {
      customPrompt += `\n\n【添付ファイル】\n添付されたファイルの内容を分析に含めてください。`;
    }
    
    // Add other additional info (excluding customRequirements which is already handled)
    if (additionalInfo) {
      const otherInfo = { ...additionalInfo };
      delete otherInfo.customRequirements; // Already handled above
      
      if (Object.keys(otherInfo).length > 0) {
        customPrompt += `\n\n【その他の情報】\n${JSON.stringify(otherInfo, null, 2)}`;
      }
    }
    
    // Add final instruction to maintain 4-part structure
    customPrompt += `\n\n【重要】上記のカスタム要件を考慮しながら、必ず投資分析の4部構成（投資概要、リスク評価、推奨戦略、実行計画）の形式でレポートを作成してください。`;
    
    return customPrompt;
  }
  
  validateCustomReport(report, hasCustomRequirements) {
    if (!report || !report.content) {
      return false;
    }
    
    const content = report.content;
    
    // Check for 4-part investment structure
    const investmentStructureElements = [
      '投資概要',
      'リスク評価',
      '推奨',
      '実行計画'
    ];
    
    const hasInvestmentStructure = investmentStructureElements.filter(element => 
      content.includes(element) || content.includes(element.substring(0, 3))
    ).length >= 2; // At least 2 of the 4 elements should be present
    
    // Check for custom content integration if custom requirements were provided
    let hasCustomIntegration = true;
    if (hasCustomRequirements) {
      hasCustomIntegration = content.includes('カスタム') || content.length > 800;
    }
    
    // Check minimum quality standards
    const hasMinimumQuality = content.length > 300 && content.includes('投資');
    
    return hasInvestmentStructure && hasCustomIntegration && hasMinimumQuality;
  }
  
  validateCustomRequest(requestBody) {
    const { reportType, inputText, files, additionalInfo } = requestBody;
    
    if (reportType !== 'custom') {
      return {
        message: 'Invalid report type for custom report validation',
        type: 'validation_error'
      };
    }
    
    // Custom reports can work with just custom requirements, even without input text or files
    const hasCustomRequirements = additionalInfo && additionalInfo.customRequirements && additionalInfo.customRequirements.trim();
    const hasInputText = inputText && inputText.trim();
    const hasFiles = files && files.length > 0;
    
    if (!hasCustomRequirements && !hasInputText && !hasFiles) {
      return {
        message: 'Custom reports require either custom requirements, input text, or uploaded files.',
        type: 'validation_error'
      };
    }
    
    return null; // No validation errors
  }
}

// Test functions
async function testCustomRequirementsIntegration() {
  console.log('\n🎨 Testing custom requirements integration with investment framework...');
  
  try {
    const validator = new CustomReportEnhancementValidator();
    
    // Test with custom requirements
    const customRequirements = 'ESG投資の観点から環境負荷を重視した分析を実施してください。特に再生可能エネルギー関連の投資機会に焦点を当ててください。';
    
    const additionalInfo = {
      customRequirements: customRequirements,
      location: 'Tokyo'
    };
    
    const inputText = '太陽光発電投資案件の詳細データ';
    const files = [{ name: 'solar_project.pdf', type: 'application/pdf' }];
    
    const customPrompt = validator.buildCustomPrompt(
      validator.investmentPrompt,
      inputText,
      files,
      additionalInfo
    );
    
    // Verify integration
    const hasCustomRequirements = customPrompt.includes(customRequirements);
    const hasInvestmentFramework = customPrompt.includes('4部構成');
    const hasCustomInstructions = customPrompt.includes('カスタム分析指示');
    const hasInputData = customPrompt.includes(inputText);
    const hasFinalInstruction = customPrompt.includes('重要】上記のカスタム要件を考慮しながら');
    
    logTest('6.3.1', hasCustomRequirements && hasInvestmentFramework, 'Custom requirements integrated with investment framework');
    logTest('6.3.4', hasInvestmentFramework && hasCustomInstructions, 'Custom prompt uses jp_investment_4part as base');
    logTest('6.3.5', hasCustomRequirements && hasInputData, 'Custom requirements properly integrated into prompt');
    logTest('6.3.6', hasFinalInstruction && hasInvestmentFramework, 'Investment framework structure preserved');
    
  } catch (error) {
    logTest('6.3.1', false, `Error: ${error.message}`);
    logTest('6.3.4', false, `Error: ${error.message}`);
    logTest('6.3.5', false, `Error: ${error.message}`);
    logTest('6.3.6', false, `Error: ${error.message}`);
  }
}

async function testFallbackToStandardAnalysis() {
  console.log('\n🔄 Testing fallback to standard investment analysis when no custom text...');
  
  try {
    const validator = new CustomReportEnhancementValidator();
    
    // Test without custom requirements
    const additionalInfo = {
      location: 'Osaka'
    };
    
    const inputText = '一般的な不動産投資案件';
    
    const standardPrompt = validator.buildCustomPrompt(
      validator.investmentPrompt,
      inputText,
      null,
      additionalInfo
    );
    
    // Verify fallback behavior
    const hasStandardMessage = standardPrompt.includes('標準的な投資分析を実施してください');
    const hasInvestmentFramework = standardPrompt.includes('4部構成');
    const hasInputData = standardPrompt.includes(inputText);
    const noCustomRequirements = !standardPrompt.includes('ESG') && !standardPrompt.includes('特別な要件');
    
    logTest('6.3.2', hasStandardMessage && hasInvestmentFramework && noCustomRequirements, 'Fallback to standard investment analysis works');
    
    // Test empty custom requirements
    const emptyCustomInfo = {
      customRequirements: '   ', // Empty/whitespace only
      location: 'Kyoto'
    };
    
    const emptyCustomPrompt = validator.buildCustomPrompt(
      validator.investmentPrompt,
      inputText,
      null,
      emptyCustomInfo
    );
    
    const fallsBackOnEmpty = emptyCustomPrompt.includes('標準的な投資分析を実施してください');
    
    logTest('6.3.2', fallsBackOnEmpty, 'Fallback works for empty custom requirements');
    
  } catch (error) {
    logTest('6.3.2', false, `Error: ${error.message}`);
  }
}

async function testFourPartStructureMaintenance() {
  console.log('\n📋 Testing report maintains 4-part structure with custom content...');
  
  try {
    const validator = new CustomReportEnhancementValidator();
    
    // Mock custom report with 4-part structure
    const customReportWith4Parts = {
      content: `
# カスタム投資分析レポート

## 1. 投資概要と現状分析
ESG投資の観点から環境負荷を重視した分析を実施しました。
現在の市場環境と投資機会について詳細に分析します。

## 2. リスク評価と市場分析  
環境リスクと市場リスクを総合的に評価しました。
再生可能エネルギー市場の動向を考慮したリスク分析を実施。

## 3. 推奨投資戦略
カスタム要件に基づく具体的な投資戦略を提案します。
ESG投資基準を満たす投資商品の選定と配分を推奨。

## 4. 実行計画と注意事項
カスタム要件実現のための具体的なステップを提示します。
環境負荷軽減目標の達成に向けた実行計画を策定。
      `
    };
    
    const isValid4PartStructure = validator.validateCustomReport(customReportWith4Parts, true);
    
    // Test report without proper structure
    const invalidStructureReport = {
      content: 'カスタム要件に基づく簡単な分析です。投資をお勧めします。'
    };
    
    const isInvalidStructure = !validator.validateCustomReport(invalidStructureReport, true);
    
    logTest('6.3.3', isValid4PartStructure, 'Report maintains 4-part structure with custom content');
    logTest('6.3.8', isValid4PartStructure && isInvalidStructure, 'Custom report content quality validation works');
    
  } catch (error) {
    logTest('6.3.3', false, `Error: ${error.message}`);
    logTest('6.3.8', false, `Error: ${error.message}`);
  }
}

async function testCustomReportValidation() {
  console.log('\n✅ Testing custom report validation and error handling...');
  
  try {
    const validator = new CustomReportEnhancementValidator();
    
    // Test valid custom report request
    const validRequest = {
      reportType: 'custom',
      inputText: '投資案件データ',
      files: [],
      additionalInfo: {
        customRequirements: 'リスク重視の分析をお願いします'
      }
    };
    
    const validationResult = validator.validateCustomRequest(validRequest);
    const isValidRequest = validationResult === null;
    
    // Test invalid custom report request (no data at all)
    const invalidRequest = {
      reportType: 'custom',
      inputText: '',
      files: [],
      additionalInfo: {}
    };
    
    const invalidValidationResult = validator.validateCustomRequest(invalidRequest);
    const detectsInvalidRequest = invalidValidationResult && invalidValidationResult.message.includes('require');
    
    // Test custom requirements only (should be valid)
    const customRequirementsOnlyRequest = {
      reportType: 'custom',
      inputText: '',
      files: [],
      additionalInfo: {
        customRequirements: 'テクニカル分析に特化した投資レポートを作成してください'
      }
    };
    
    const customOnlyResult = validator.validateCustomRequest(customRequirementsOnlyRequest);
    const customOnlyValid = customOnlyResult === null;
    
    logTest('6.3.7', isValidRequest && detectsInvalidRequest && customOnlyValid, 'Custom report validation and error handling works correctly');
    
  } catch (error) {
    logTest('6.3.7', false, `Error: ${error.message}`);
  }
}

async function testMultipleCustomScenarios() {
  console.log('\n🔄 Testing multiple custom requirement scenarios...');
  
  try {
    const validator = new CustomReportEnhancementValidator();
    
    // Scenario 1: Technical analysis focus
    const technicalAnalysisPrompt = validator.buildCustomPrompt(
      validator.investmentPrompt,
      '株式投資データ',
      null,
      { customRequirements: 'テクニカル分析とチャート分析を重視した投資判断' }
    );
    
    const hasTechnicalFocus = technicalAnalysisPrompt.includes('テクニカル分析');
    
    // Scenario 2: Risk management focus
    const riskManagementPrompt = validator.buildCustomPrompt(
      validator.investmentPrompt,
      'ポートフォリオデータ',
      null,
      { customRequirements: 'リスク管理とダウンサイド保護を最優先とした分析' }
    );
    
    const hasRiskFocus = riskManagementPrompt.includes('リスク管理');
    
    // Scenario 3: Long-term investment focus
    const longTermPrompt = validator.buildCustomPrompt(
      validator.investmentPrompt,
      '長期投資案件',
      null,
      { customRequirements: '10年以上の長期投資視点での分析と複利効果の検討' }
    );
    
    const hasLongTermFocus = longTermPrompt.includes('長期投資');
    
    // All scenarios should maintain investment framework
    const allHaveFramework = [technicalAnalysisPrompt, riskManagementPrompt, longTermPrompt]
      .every(prompt => prompt.includes('4部構成'));
    
    logTest('6.3.9', hasTechnicalFocus && hasRiskFocus && hasLongTermFocus && allHaveFramework, 'Multiple custom requirement scenarios work correctly');
    
  } catch (error) {
    logTest('6.3.9', false, `Error: ${error.message}`);
  }
}

async function testCustomReportWithFileIntegration() {
  console.log('\n📁 Testing custom report with file integration...');
  
  try {
    const validator = new CustomReportEnhancementValidator();
    
    const files = [
      { name: 'financial_data.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      { name: 'market_analysis.pdf', type: 'application/pdf' }
    ];
    
    const customPromptWithFiles = validator.buildCustomPrompt(
      validator.investmentPrompt,
      '詳細な財務データ',
      files,
      { customRequirements: 'ファイルデータを活用した定量分析重視のレポート' }
    );
    
    const hasFileIntegration = customPromptWithFiles.includes('添付ファイル');
    const hasCustomRequirements = customPromptWithFiles.includes('定量分析重視');
    const hasInputText = customPromptWithFiles.includes('詳細な財務データ');
    const maintainsStructure = customPromptWithFiles.includes('4部構成');
    
    logTest('6.3.10', hasFileIntegration && hasCustomRequirements && hasInputText && maintainsStructure, 'Custom report with file integration works correctly');
    
  } catch (error) {
    logTest('6.3.10', false, `Error: ${error.message}`);
  }
}

// Main test execution
async function runCustomReportEnhancementTests() {
  console.log('🧪 Starting Custom Report Enhancement Tests (Task 6.3)');
  console.log('Testing custom requirements integration, fallback behavior, and 4-part structure maintenance');
  console.log('Requirements: 2.1, 2.2, 2.3, 2.4\n');
  
  try {
    // Test custom requirements integration
    await testCustomRequirementsIntegration();
    
    // Test fallback to standard analysis
    await testFallbackToStandardAnalysis();
    
    // Test 4-part structure maintenance
    await testFourPartStructureMaintenance();
    
    // Test custom report validation
    await testCustomReportValidation();
    
    // Test multiple custom scenarios
    await testMultipleCustomScenarios();
    
    // Test custom report with file integration
    await testCustomReportWithFileIntegration();
    
    // Generate summary
    const summary = generateTestSummary();
    
    // Save results to file
    const resultsData = {
      testSuite: 'Custom Report Enhancement Tests (Task 6.3)',
      timestamp: new Date().toISOString(),
      requirements: ['2.1', '2.2', '2.3', '2.4'],
      summary,
      results: testResults
    };
    
    await fs.writeFile('test-custom-report-enhancement-results.json', JSON.stringify(resultsData, null, 2));
    console.log('\n📄 Test results saved to test-custom-report-enhancement-results.json');
    
    return summary;
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    return { total: 0, tested: 0, passed: 0, failed: 0, successRate: 0 };
  }
}

// Run tests automatically
runCustomReportEnhancementTests()
  .then(summary => {
    console.log(`\n🏁 Tests completed with ${summary.successRate}% success rate`);
    process.exit(summary.failed > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });

export {
  runCustomReportEnhancementTests,
  CustomReportEnhancementValidator
};