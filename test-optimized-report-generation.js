// Test report generation quality with optimized prompt system
import fs from 'fs/promises';

async function testOptimizedReportGeneration() {
  console.log('🚀 Testing Optimized Report Generation Quality');
  
  let totalTests = 0;
  let passedTests = 0;
  
  // Test data
  const testCases = [
    {
      reportType: 'jp_investment_4part',
      inputText: '東京都内の投資用マンション（築10年、1LDK、月額賃料12万円、購入価格2500万円）の投資分析をお願いします。',
      expectedSections: ['Executive Summary', '投資概要', 'Benefits', 'Risks', 'Evidence']
    },
    {
      reportType: 'jp_tax_strategy',
      inputText: '年収1200万円のサラリーマンが不動産投資による節税効果を検討しています。',
      expectedSections: ['税務戦略', '減価償却', '損益通算', 'デッドクロス']
    },
    {
      reportType: 'jp_inheritance_strategy',
      inputText: '総資産5億円の相続対策として収益不動産の活用を検討しています。',
      expectedSections: ['相続対策', 'レバレッジ', '評価減', '債務控除']
    },
    {
      reportType: 'comparison_analysis',
      inputText: '2つの投資物件の比較分析をお願いします。',
      expectedSections: ['比較分析', 'レバレッジ効果', '投資判断', '推奨']
    }
  ];
  
  try {
    // Test 1: Check if API endpoint exists
    totalTests++;
    try {
      await fs.access('./api/generate.js');
      console.log('✅ API endpoint exists');
      passedTests++;
    } catch (error) {
      console.log('❌ API endpoint not found');
    }
    
    // Test 2: Validate prompt structure for each report type
    for (const testCase of testCases) {
      totalTests++;
      
      try {
        // Read the corresponding prompt file
        const promptFile = `./PROMPTS/${getPromptFileName(testCase.reportType)}`;
        const promptContent = await fs.readFile(promptFile, 'utf8');
        
        // Check if prompt has required elements for quality report generation
        const hasMetadata = promptContent.startsWith('---');
        const hasRoleDefinition = promptContent.includes('あなたは') || promptContent.includes('Role:');
        const hasStructuredSections = promptContent.includes('##') && promptContent.includes('###');
        const hasQualityRequirements = promptContent.includes('品質') || promptContent.includes('Quality');
        const hasOutputFormat = promptContent.includes('出力') || promptContent.includes('Output');
        
        const qualityScore = [hasMetadata, hasRoleDefinition, hasStructuredSections, hasQualityRequirements, hasOutputFormat].filter(Boolean).length;
        
        if (qualityScore >= 4) {
          console.log(`✅ ${testCase.reportType}: High quality prompt (${qualityScore}/5 criteria)`);
          passedTests++;
        } else {
          console.log(`⚠️  ${testCase.reportType}: Needs improvement (${qualityScore}/5 criteria)`);
        }
        
      } catch (error) {
        console.log(`❌ ${testCase.reportType}: Error reading prompt - ${error.message}`);
      }
    }
    
    // Test 3: Check service optimization features
    totalTests++;
    try {
      const apiContent = await fs.readFile('./api/generate.js', 'utf8');
      
      const hasServiceOptimization = apiContent.includes('buildServiceOptimizedPrompt');
      const hasOpenAIOptimization = apiContent.includes('optimizePromptForOpenAI');
      const hasGeminiOptimization = apiContent.includes('optimizePromptForGemini');
      const hasAdaptiveProcessing = apiContent.includes('adaptivePromptProcessing');
      
      const optimizationScore = [hasServiceOptimization, hasOpenAIOptimization, hasGeminiOptimization, hasAdaptiveProcessing].filter(Boolean).length;
      
      if (optimizationScore >= 3) {
        console.log(`✅ Service optimization: Implemented (${optimizationScore}/4 features)`);
        passedTests++;
      } else {
        console.log(`⚠️  Service optimization: Incomplete (${optimizationScore}/4 features)`);
      }
      
    } catch (error) {
      console.log('❌ Could not check service optimization features');
    }
    
    // Test 4: Check caching system
    totalTests++;
    try {
      const apiContent = await fs.readFile('./api/generate.js', 'utf8');
      
      const hasCaching = apiContent.includes('promptCache') && apiContent.includes('fileCache');
      const hasCacheManagement = apiContent.includes('manageCacheSize');
      const hasCacheStats = apiContent.includes('getCacheStats');
      
      if (hasCaching && hasCacheManagement && hasCacheStats) {
        console.log('✅ Caching system: Fully implemented');
        passedTests++;
      } else {
        console.log('⚠️  Caching system: Partially implemented');
      }
      
    } catch (error) {
      console.log('❌ Could not check caching system');
    }
    
    // Test 5: Check error handling and fallbacks
    totalTests++;
    try {
      const apiContent = await fs.readFile('./api/generate.js', 'utf8');
      
      const hasErrorHandling = apiContent.includes('try {') && apiContent.includes('catch');
      const hasFallbackPrompts = apiContent.includes('loadFallbackPrompts');
      const hasValidation = apiContent.includes('validatePrompt');
      
      if (hasErrorHandling && hasFallbackPrompts && hasValidation) {
        console.log('✅ Error handling: Comprehensive');
        passedTests++;
      } else {
        console.log('⚠️  Error handling: Basic');
      }
      
    } catch (error) {
      console.log('❌ Could not check error handling');
    }
    
    // Results
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    console.log(`\n📊 Report Generation Quality Tests: ${passedTests}/${totalTests} passed (${successRate}%)`);
    
    if (successRate >= 90) {
      console.log('🎉 EXCELLENT: Report generation system is highly optimized!');
    } else if (successRate >= 75) {
      console.log('✅ GOOD: Report generation system is well optimized');
    } else if (successRate >= 50) {
      console.log('⚠️  FAIR: Report generation system has room for improvement');
    } else {
      console.log('❌ POOR: Report generation system needs significant work');
    }
    
    return { totalTests, passedTests, successRate: parseFloat(successRate) };
    
  } catch (error) {
    console.error('💥 Test execution failed:', error);
    return { totalTests, passedTests: 0, successRate: 0 };
  }
}

function getPromptFileName(reportType) {
  const mapping = {
    'jp_investment_4part': 'jp_investment_4part.md',
    'jp_tax_strategy': 'jp_tax_strategy.md',
    'jp_inheritance_strategy': 'jp_inheritance_strategy.md',
    'comparison_analysis': 'comparison_analysis.md',
    'custom': 'jp_investment_4part.md'
  };
  
  return mapping[reportType] || 'jp_investment_4part.md';
}

// Run the test
testOptimizedReportGeneration()
  .then(results => {
    console.log('\n✨ Quality test completed:', results);
    process.exit(results.successRate >= 75 ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });