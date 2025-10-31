// Simple test for optimized prompt system validation
import fs from 'fs/promises';
import path from 'path';

async function testPromptSystem() {
  console.log('🚀 Testing Optimized Prompt System');
  
  const promptsDir = './PROMPTS';
  const expectedFiles = [
    'jp_investment_4part.md',
    'jp_tax_strategy.md', 
    'jp_inheritance_strategy.md',
    'comparison_analysis.md'
  ];
  
  let totalTests = 0;
  let passedTests = 0;
  
  try {
    // Test 1: Check if PROMPTS directory exists
    totalTests++;
    try {
      await fs.access(promptsDir);
      console.log('✅ PROMPTS directory exists');
      passedTests++;
    } catch (error) {
      console.log('❌ PROMPTS directory not found');
    }
    
    // Test 2: Check if expected files exist
    for (const file of expectedFiles) {
      totalTests++;
      try {
        const filePath = path.join(promptsDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        
        // Check if file has metadata header
        const hasMetadata = content.startsWith('---');
        const hasTitle = content.includes('title:');
        const hasAiOptimized = content.includes('aiOptimized: true');
        const isLongEnough = content.length > 500;
        
        if (hasMetadata && hasTitle && isLongEnough) {
          console.log(`✅ ${file}: Valid (${content.length} chars, metadata: ${hasMetadata}, AI optimized: ${hasAiOptimized})`);
          passedTests++;
        } else {
          console.log(`⚠️  ${file}: Issues (${content.length} chars, metadata: ${hasMetadata}, AI optimized: ${hasAiOptimized})`);
        }
      } catch (error) {
        console.log(`❌ ${file}: Not found or error - ${error.message}`);
      }
    }
    
    // Test 3: Check prompt structure quality
    totalTests++;
    try {
      const testFile = path.join(promptsDir, 'jp_investment_4part.md');
      const content = await fs.readFile(testFile, 'utf8');
      
      const hasStructure = content.includes('##') && content.includes('###');
      const hasInstructions = content.includes('指示') || content.includes('Instructions');
      const hasOutputFormat = content.includes('出力') || content.includes('Output');
      
      if (hasStructure && (hasInstructions || hasOutputFormat)) {
        console.log('✅ Prompt structure quality: Good');
        passedTests++;
      } else {
        console.log('⚠️  Prompt structure quality: Needs improvement');
      }
    } catch (error) {
      console.log('❌ Could not test prompt structure');
    }
    
    // Results
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    console.log(`\n📊 Results: ${passedTests}/${totalTests} tests passed (${successRate}%)`);
    
    if (successRate >= 90) {
      console.log('🎉 EXCELLENT: Prompt system is optimized!');
    } else if (successRate >= 75) {
      console.log('✅ GOOD: Prompt system is mostly optimized');
    } else {
      console.log('⚠️  NEEDS WORK: Prompt system needs optimization');
    }
    
    return { totalTests, passedTests, successRate: parseFloat(successRate) };
    
  } catch (error) {
    console.error('💥 Test failed:', error);
    return { totalTests, passedTests: 0, successRate: 0 };
  }
}

// Run the test
testPromptSystem()
  .then(results => {
    console.log('\n✨ Test completed:', results);
    process.exit(results.successRate >= 75 ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });