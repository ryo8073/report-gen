#!/usr/bin/env node

/**
 * Response Consistency Validation Test
 * Tests that both OpenAI and Gemini services return consistent response formats:
 * - Compare report formats between OpenAI and Gemini
 * - Ensure metadata and usage tracking work for both services
 * - Test existing frontend compatibility with backup service responses
 */

import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔍 Testing Response Consistency Between AI Services...\n');

// Test data for report generation
const testReportData = {
  reportType: 'jp_investment_4part',
  inputText: `投資ポートフォリオ分析
現在の資産: 800万円
- 株式: 480万円 (60%)
- 債券: 160万円 (20%)
- 現金: 160万円 (20%)

投資目標: 5年間で1200万円
リスク許容度: 中程度
年齢: 40歳`,
  files: [],
  additionalInfo: {
    investmentHorizon: '5年',
    riskTolerance: '中程度',
    currentAge: 40
  }
};

// Initialize clients
let openai, geminiModel;

try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
} catch (error) {
  console.error('Failed to initialize OpenAI client:', error);
}

try {
  if (process.env.GOOGLE_AI_API_KEY) {
    const gemini = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    geminiModel = gemini.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4000,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        }
      ]
    });
  }
} catch (error) {
  console.error('Failed to initialize Gemini client:', error);
}

// Report type prompts (from generate.js)
const REPORT_PROMPTS = {
  jp_investment_4part: `あなたは経験豊富な投資アドバイザーです。以下の情報を基に、4部構成の投資分析レポートを作成してください。

構成:
1. 投資概要と現状分析
2. リスク評価と市場分析
3. 推奨投資戦略
4. 実行計画と注意事項

レポートは専門的でありながら、クライアントが理解しやすい内容にしてください。`,

  jp_tax_strategy: `あなたは税務の専門家です。以下の情報を基に、減価償却を活用した税務戦略レポートを作成してください。

含めるべき内容:
- 現在の税務状況分析
- 減価償却による節税効果の試算
- 推奨する投資商品と戦略
- 実行スケジュールと注意点
- 長期的な税務メリット

具体的な数値を用いて、わかりやすく説明してください。`,

  jp_inheritance_strategy: `あなたは相続対策の専門家です。以下の情報を基に、相続対策戦略レポートを作成してください。

含めるべき内容:
- 現在の資産状況と相続税試算
- 相続税軽減策の提案
- 不動産投資による相続対策効果
- 生前贈与や信託の活用方法
- 実行優先順位と具体的手順

法的な観点も含めて、実践的なアドバイスを提供してください。`,

  custom: `以下の要求に基づいて、専門的で詳細なレポートを作成してください。`
};

function getReportTitle(reportType) {
  const titles = {
    jp_investment_4part: '投資分析レポート（4部構成）',
    jp_tax_strategy: '税務戦略レポート（減価償却活用）',
    jp_inheritance_strategy: '相続対策戦略レポート',
    custom: 'カスタムレポート'
  };
  
  return titles[reportType] || 'レポート';
}

async function generateWithOpenAI(reportData) {
  console.log('1. Generating report with OpenAI...');
  
  if (!openai) {
    throw new Error('OpenAI client not available');
  }
  
  const startTime = Date.now();
  
  // Get the appropriate prompt
  const basePrompt = REPORT_PROMPTS[reportData.reportType] || REPORT_PROMPTS.custom;

  // Build the full prompt
  let fullPrompt = basePrompt;
  
  if (reportData.inputText) {
    fullPrompt += `\n\n【入力データ】\n${reportData.inputText}`;
  }

  if (reportData.additionalInfo && Object.keys(reportData.additionalInfo).length > 0) {
    fullPrompt += `\n\n【追加情報】\n${JSON.stringify(reportData.additionalInfo, null, 2)}`;
  }

  // Call OpenAI API
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "あなたは経験豊富な投資・税務・相続の専門家です。クライアント向けに専門的で実践的なレポートを作成してください。"
      },
      {
        role: "user",
        content: fullPrompt
      }
    ],
    max_tokens: 4000,
    temperature: 0.7,
  });

  const content = completion.choices[0].message.content;
  const responseTime = Date.now() - startTime;

  console.log(`   ✅ OpenAI report generated (${responseTime}ms)`);
  console.log(`   📊 Content length: ${content.length} characters`);
  console.log(`   📊 Token usage: ${completion.usage.total_tokens} tokens`);

  return {
    id: Date.now().toString(),
    title: getReportTitle(reportData.reportType),
    content: content,
    createdAt: new Date().toISOString(),
    usage: {
      promptTokens: completion.usage.prompt_tokens,
      completionTokens: completion.usage.completion_tokens,
      totalTokens: completion.usage.total_tokens,
      estimatedCost: `${(completion.usage.total_tokens * 0.00003).toFixed(4)}`
    },
    aiService: 'openai',
    responseTime
  };
}

function formatPromptForGemini(reportType, inputText, files, additionalInfo) {
  // Get base prompt and adapt it for Gemini's format
  const basePrompt = REPORT_PROMPTS[reportType] || REPORT_PROMPTS.custom;
  
  // Gemini works better with role-based prompting
  const geminiPrompt = `あなたは経験豊富な投資・税務・相続の専門家です。クライアント向けに専門的で実践的なレポートを作成してください。

${basePrompt}

以下の指示に従って、構造化された高品質なレポートを作成してください：

1. 明確で論理的な構成を使用する
2. 具体的で実行可能な推奨事項を提供する
3. 専門用語を使用しつつ、クライアントが理解しやすい説明を心がける
4. 数値や計算が含まれる場合は、根拠を明確にする
5. リスクや注意点も適切に言及する

レポートの品質と実用性を最優先に作成してください。`;

  return geminiPrompt;
}

function normalizeGeminiResponse(geminiResponse, reportType) {
  // Normalize Gemini response to match OpenAI format
  let content = geminiResponse.content;
  
  // Ensure consistent report structure
  if (content && typeof content === 'string') {
    // Clean up any formatting inconsistencies
    content = content.trim();
  }
  
  return {
    ...geminiResponse,
    content: content,
    // Ensure usage tracking format is consistent
    usage: {
      promptTokens: geminiResponse.usage?.promptTokens || 0,
      completionTokens: geminiResponse.usage?.completionTokens || 0,
      totalTokens: geminiResponse.usage?.totalTokens || 0,
      estimatedCost: geminiResponse.usage?.estimatedCost || '0.0000'
    }
  };
}

async function generateWithGemini(reportData) {
  console.log('\n2. Generating report with Gemini...');
  
  if (!geminiModel) {
    throw new Error('Gemini client not available');
  }
  
  const startTime = Date.now();

  // Get the appropriate prompt adapted for Gemini
  const basePrompt = formatPromptForGemini(reportData.reportType, reportData.inputText, reportData.files, reportData.additionalInfo);
  
  // Build the full prompt for Gemini
  let fullPrompt = basePrompt;
  
  if (reportData.inputText) {
    fullPrompt += `\n\n【入力データ】\n${reportData.inputText}`;
  }

  if (reportData.additionalInfo && Object.keys(reportData.additionalInfo).length > 0) {
    fullPrompt += `\n\n【追加情報】\n${JSON.stringify(reportData.additionalInfo, null, 2)}`;
  }

  // Call Gemini API
  const result = await geminiModel.generateContent(fullPrompt);
  const response = await result.response;
  const content = response.text();

  // Estimate token usage (Gemini doesn't provide exact counts like OpenAI)
  const estimatedPromptTokens = Math.ceil(fullPrompt.length / 4);
  const estimatedCompletionTokens = Math.ceil(content.length / 4);
  const estimatedTotalTokens = estimatedPromptTokens + estimatedCompletionTokens;

  const responseTime = Date.now() - startTime;

  console.log(`   ✅ Gemini report generated (${responseTime}ms)`);
  console.log(`   📊 Content length: ${content.length} characters`);
  console.log(`   📊 Estimated token usage: ${estimatedTotalTokens} tokens`);

  const rawResponse = {
    id: Date.now().toString(),
    title: getReportTitle(reportData.reportType),
    content: content,
    createdAt: new Date().toISOString(),
    usage: {
      promptTokens: estimatedPromptTokens,
      completionTokens: estimatedCompletionTokens,
      totalTokens: estimatedTotalTokens,
      estimatedCost: `${(estimatedTotalTokens * 0.000015).toFixed(4)}` // Gemini Pro pricing estimate
    },
    aiService: 'gemini',
    responseTime
  };

  // Normalize response to ensure consistency with OpenAI format
  return normalizeGeminiResponse(rawResponse, reportData.reportType);
}

function validateResponseStructure(response, serviceName) {
  console.log(`\n3. Validating ${serviceName} response structure...`);
  
  const requiredFields = ['id', 'title', 'content', 'createdAt', 'usage', 'aiService'];
  const requiredUsageFields = ['promptTokens', 'completionTokens', 'totalTokens', 'estimatedCost'];
  
  const validationResults = {
    hasAllRequiredFields: true,
    hasValidUsage: true,
    hasValidContent: true,
    issues: []
  };
  
  // Check required top-level fields
  requiredFields.forEach(field => {
    if (!(field in response)) {
      validationResults.hasAllRequiredFields = false;
      validationResults.issues.push(`Missing required field: ${field}`);
    }
  });
  
  // Check usage object structure
  if (response.usage) {
    requiredUsageFields.forEach(field => {
      if (!(field in response.usage)) {
        validationResults.hasValidUsage = false;
        validationResults.issues.push(`Missing usage field: ${field}`);
      }
    });
    
    // Validate usage field types
    if (typeof response.usage.promptTokens !== 'number') {
      validationResults.hasValidUsage = false;
      validationResults.issues.push('promptTokens should be a number');
    }
    
    if (typeof response.usage.completionTokens !== 'number') {
      validationResults.hasValidUsage = false;
      validationResults.issues.push('completionTokens should be a number');
    }
    
    if (typeof response.usage.totalTokens !== 'number') {
      validationResults.hasValidUsage = false;
      validationResults.issues.push('totalTokens should be a number');
    }
    
    if (typeof response.usage.estimatedCost !== 'string') {
      validationResults.hasValidUsage = false;
      validationResults.issues.push('estimatedCost should be a string');
    }
  } else {
    validationResults.hasValidUsage = false;
    validationResults.issues.push('Missing usage object');
  }
  
  // Check content validity
  if (!response.content || typeof response.content !== 'string' || response.content.length < 100) {
    validationResults.hasValidContent = false;
    validationResults.issues.push('Content is missing, not a string, or too short');
  }
  
  // Check aiService field
  if (response.aiService !== serviceName) {
    validationResults.issues.push(`aiService field should be '${serviceName}' but is '${response.aiService}'`);
  }
  
  // Check date format
  if (response.createdAt && !Date.parse(response.createdAt)) {
    validationResults.issues.push('createdAt is not a valid ISO date string');
  }
  
  const isValid = validationResults.hasAllRequiredFields && 
                  validationResults.hasValidUsage && 
                  validationResults.hasValidContent && 
                  validationResults.issues.length === 0;
  
  if (isValid) {
    console.log(`   ✅ ${serviceName} response structure is valid`);
  } else {
    console.log(`   ❌ ${serviceName} response structure has issues:`);
    validationResults.issues.forEach(issue => {
      console.log(`      - ${issue}`);
    });
  }
  
  return {
    isValid,
    ...validationResults
  };
}

function compareResponseFormats(openaiResponse, geminiResponse) {
  console.log('\n4. Comparing response formats between services...');
  
  const comparison = {
    structuralConsistency: true,
    contentQualityConsistency: true,
    usageTrackingConsistency: true,
    issues: [],
    metrics: {}
  };
  
  // Compare structural consistency
  const openaiFields = Object.keys(openaiResponse);
  const geminiFields = Object.keys(geminiResponse);
  
  const missingInGemini = openaiFields.filter(field => !geminiFields.includes(field));
  const extraInGemini = geminiFields.filter(field => !openaiFields.includes(field));
  
  if (missingInGemini.length > 0) {
    comparison.structuralConsistency = false;
    comparison.issues.push(`Gemini response missing fields: ${missingInGemini.join(', ')}`);
  }
  
  if (extraInGemini.length > 0) {
    comparison.issues.push(`Gemini response has extra fields: ${extraInGemini.join(', ')}`);
  }
  
  // Compare content quality metrics
  const openaiContentLength = openaiResponse.content?.length || 0;
  const geminiContentLength = geminiResponse.content?.length || 0;
  const contentLengthDiff = Math.abs(openaiContentLength - geminiContentLength);
  const contentLengthRatio = Math.min(openaiContentLength, geminiContentLength) / Math.max(openaiContentLength, geminiContentLength);
  
  comparison.metrics.contentLengthDifference = contentLengthDiff;
  comparison.metrics.contentLengthRatio = contentLengthRatio;
  
  // Allow for reasonable content length differences between AI models
  if (contentLengthRatio < 0.2) {
    comparison.contentQualityConsistency = false;
    comparison.issues.push(`Extreme content length difference: OpenAI ${openaiContentLength} vs Gemini ${geminiContentLength}`);
  } else if (contentLengthRatio < 0.5) {
    comparison.issues.push(`Notable content length difference: OpenAI ${openaiContentLength} vs Gemini ${geminiContentLength} (acceptable for different AI models)`);
  }
  
  // Compare usage tracking consistency
  const openaiUsage = openaiResponse.usage;
  const geminiUsage = geminiResponse.usage;
  
  if (openaiUsage && geminiUsage) {
    const usageFields = ['promptTokens', 'completionTokens', 'totalTokens', 'estimatedCost'];
    usageFields.forEach(field => {
      if (typeof openaiUsage[field] !== typeof geminiUsage[field]) {
        comparison.usageTrackingConsistency = false;
        comparison.issues.push(`Usage field type mismatch for ${field}: OpenAI ${typeof openaiUsage[field]} vs Gemini ${typeof geminiUsage[field]}`);
      }
    });
    
    // Compare token usage reasonableness (should be within reasonable range)
    const tokenRatio = Math.min(openaiUsage.totalTokens, geminiUsage.totalTokens) / Math.max(openaiUsage.totalTokens, geminiUsage.totalTokens);
    comparison.metrics.tokenUsageRatio = tokenRatio;
    
    if (tokenRatio < 0.3) {
      comparison.usageTrackingConsistency = false;
      comparison.issues.push(`Significant token usage difference: OpenAI ${openaiUsage.totalTokens} vs Gemini ${geminiUsage.totalTokens}`);
    }
  }
  
  // Check for required sections in both reports
  const requiredSections = [
    '1. 投資概要と現状分析',
    '2. リスク評価と市場分析', 
    '3. 推奨投資戦略',
    '4. 実行計画と注意事項'
  ];
  
  let openaiSections = 0;
  let geminiSections = 0;
  
  requiredSections.forEach(section => {
    if (openaiResponse.content?.includes(section) || openaiResponse.content?.includes(section.substring(3))) {
      openaiSections++;
    }
    if (geminiResponse.content?.includes(section) || geminiResponse.content?.includes(section.substring(3))) {
      geminiSections++;
    }
  });
  
  comparison.metrics.openaiSectionsFound = openaiSections;
  comparison.metrics.geminiSectionsFound = geminiSections;
  
  if (Math.abs(openaiSections - geminiSections) > 1) {
    comparison.contentQualityConsistency = false;
    comparison.issues.push(`Section coverage difference: OpenAI ${openaiSections}/4 vs Gemini ${geminiSections}/4`);
  }
  
  const isConsistent = comparison.structuralConsistency && 
                      comparison.contentQualityConsistency && 
                      comparison.usageTrackingConsistency;
  
  if (isConsistent) {
    console.log('   ✅ Response formats are consistent between services');
  } else {
    console.log('   ⚠️  Response format inconsistencies detected:');
    comparison.issues.forEach(issue => {
      console.log(`      - ${issue}`);
    });
  }
  
  console.log('\n   📊 Comparison Metrics:');
  console.log(`      Content Length Ratio: ${(comparison.metrics.contentLengthRatio * 100).toFixed(1)}%`);
  console.log(`      Token Usage Ratio: ${(comparison.metrics.tokenUsageRatio * 100).toFixed(1)}%`);
  console.log(`      Section Coverage: OpenAI ${comparison.metrics.openaiSectionsFound}/4, Gemini ${comparison.metrics.geminiSectionsFound}/4`);
  
  return {
    isConsistent,
    ...comparison
  };
}

function testFrontendCompatibility(response, serviceName) {
  console.log(`\n5. Testing frontend compatibility for ${serviceName} response...`);
  
  const compatibilityTests = {
    canDisplayTitle: false,
    canDisplayContent: false,
    canDisplayUsage: false,
    canDisplayMetadata: false,
    canHandleServiceIndicator: false,
    issues: []
  };
  
  // Test title display
  if (response.title && typeof response.title === 'string' && response.title.length > 0) {
    compatibilityTests.canDisplayTitle = true;
  } else {
    compatibilityTests.issues.push('Title is missing or invalid for frontend display');
  }
  
  // Test content display
  if (response.content && typeof response.content === 'string' && response.content.length > 0) {
    compatibilityTests.canDisplayContent = true;
    
    // Check for problematic characters that might break frontend
    if (response.content.includes('<script>') || response.content.includes('</script>')) {
      compatibilityTests.issues.push('Content contains potentially dangerous script tags');
    }
  } else {
    compatibilityTests.issues.push('Content is missing or invalid for frontend display');
  }
  
  // Test usage display
  if (response.usage && 
      typeof response.usage.totalTokens === 'number' && 
      typeof response.usage.estimatedCost === 'string') {
    compatibilityTests.canDisplayUsage = true;
  } else {
    compatibilityTests.issues.push('Usage information is missing or invalid for frontend display');
  }
  
  // Test metadata display
  if (response.createdAt && response.id) {
    compatibilityTests.canDisplayMetadata = true;
  } else {
    compatibilityTests.issues.push('Metadata (createdAt, id) is missing for frontend display');
  }
  
  // Test service indicator
  if (response.aiService && ['openai', 'gemini'].includes(response.aiService)) {
    compatibilityTests.canHandleServiceIndicator = true;
  } else {
    compatibilityTests.issues.push('AI service indicator is missing or invalid');
  }
  
  const isCompatible = compatibilityTests.canDisplayTitle && 
                      compatibilityTests.canDisplayContent && 
                      compatibilityTests.canDisplayUsage && 
                      compatibilityTests.canDisplayMetadata && 
                      compatibilityTests.canHandleServiceIndicator;
  
  if (isCompatible) {
    console.log(`   ✅ ${serviceName} response is fully compatible with frontend`);
  } else {
    console.log(`   ⚠️  ${serviceName} response has frontend compatibility issues:`);
    compatibilityTests.issues.forEach(issue => {
      console.log(`      - ${issue}`);
    });
  }
  
  return {
    isCompatible,
    ...compatibilityTests
  };
}

async function runResponseConsistencyTest() {
  try {
    console.log('🚀 Starting Response Consistency Validation...\n');
    
    // Check if both services are available
    if (!openai) {
      throw new Error('OpenAI client not available - check OPENAI_API_KEY');
    }
    
    if (!geminiModel) {
      throw new Error('Gemini client not available - check GOOGLE_AI_API_KEY');
    }
    
    // Generate reports with both services
    const openaiResponse = await generateWithOpenAI(testReportData);
    const geminiResponse = await generateWithGemini(testReportData);
    
    // Validate individual response structures
    const openaiValidation = validateResponseStructure(openaiResponse, 'openai');
    const geminiValidation = validateResponseStructure(geminiResponse, 'gemini');
    
    // Compare response formats
    const formatComparison = compareResponseFormats(openaiResponse, geminiResponse);
    
    // Test frontend compatibility
    const openaiCompatibility = testFrontendCompatibility(openaiResponse, 'OpenAI');
    const geminiCompatibility = testFrontendCompatibility(geminiResponse, 'Gemini');
    
    // Overall assessment
    const overallSuccess = openaiValidation.isValid && 
                          geminiValidation.isValid && 
                          formatComparison.isConsistent && 
                          openaiCompatibility.isCompatible && 
                          geminiCompatibility.isCompatible;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESPONSE CONSISTENCY TEST SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`OpenAI Response Structure: ${openaiValidation.isValid ? '✅ Valid' : '❌ Invalid'}`);
    console.log(`Gemini Response Structure: ${geminiValidation.isValid ? '✅ Valid' : '❌ Invalid'}`);
    console.log(`Format Consistency: ${formatComparison.isConsistent ? '✅ Consistent' : '⚠️  Inconsistent'}`);
    console.log(`OpenAI Frontend Compatibility: ${openaiCompatibility.isCompatible ? '✅ Compatible' : '⚠️  Issues'}`);
    console.log(`Gemini Frontend Compatibility: ${geminiCompatibility.isCompatible ? '✅ Compatible' : '⚠️  Issues'}`);
    
    console.log('\n📋 Performance Comparison:');
    console.log(`OpenAI Response Time: ${openaiResponse.responseTime}ms`);
    console.log(`Gemini Response Time: ${geminiResponse.responseTime}ms`);
    console.log(`OpenAI Token Usage: ${openaiResponse.usage.totalTokens} tokens ($${openaiResponse.usage.estimatedCost})`);
    console.log(`Gemini Token Usage: ${geminiResponse.usage.totalTokens} tokens ($${geminiResponse.usage.estimatedCost})`);
    
    if (overallSuccess) {
      console.log('\n🎉 ALL RESPONSE CONSISTENCY TESTS PASSED!');
      console.log('   ✅ Both services return structurally consistent responses');
      console.log('   ✅ Response formats are compatible between services');
      console.log('   ✅ Frontend can handle responses from both services');
      console.log('   ✅ Usage tracking works correctly for both services');
    } else {
      console.log('\n⚠️  SOME RESPONSE CONSISTENCY ISSUES DETECTED');
      console.log('   Please review the issues above and ensure consistency');
    }
    
    return {
      success: overallSuccess,
      openaiValidation,
      geminiValidation,
      formatComparison,
      openaiCompatibility,
      geminiCompatibility,
      performanceMetrics: {
        openaiResponseTime: openaiResponse.responseTime,
        geminiResponseTime: geminiResponse.responseTime,
        openaiTokens: openaiResponse.usage.totalTokens,
        geminiTokens: geminiResponse.usage.totalTokens,
        openaiCost: parseFloat(openaiResponse.usage.estimatedCost),
        geminiCost: parseFloat(geminiResponse.usage.estimatedCost)
      }
    };
    
  } catch (error) {
    console.error('\n❌ Response Consistency Test Failed:', error.message);
    
    if (error.message.includes('API_KEY')) {
      console.log('   → Check your API key configuration');
    } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
      console.log('   → API quota or rate limit exceeded');
    } else if (error.message.includes('network')) {
      console.log('   → Check your internet connection');
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
runResponseConsistencyTest()
  .then(result => {
    if (result.success) {
      console.log('\n✅ Response consistency validation passed. Both AI services are compatible.');
      process.exit(0);
    } else {
      console.log('\n❌ Response consistency validation failed. Please address the issues.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Unexpected error during consistency testing:', error);
    process.exit(1);
  });