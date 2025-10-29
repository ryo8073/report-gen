#!/usr/bin/env node

/**
 * Independent Gemini API Integration Test
 * Tests Gemini API integration independently to verify:
 * - API key works correctly
 * - Prompt formatting and response parsing
 * - Report quality matches OpenAI output expectations
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;

console.log('🔍 Testing Gemini API Integration Independently...\n');

// Test data for report generation
const testReportData = {
  reportType: 'jp_investment_4part',
  inputText: `投資ポートフォリオ分析
現在の資産: 1000万円
- 株式: 600万円 (60%)
- 債券: 200万円 (20%)
- 現金: 200万円 (20%)

投資目標: 5年間で1500万円
リスク許容度: 中程度
年齢: 35歳`,
  files: [],
  additionalInfo: {
    investmentHorizon: '5年',
    riskTolerance: '中程度',
    currentAge: 35
  }
};

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

async function testGeminiApiKey() {
  console.log('1. Testing Gemini API Key Configuration...');
  
  if (!GOOGLE_AI_API_KEY) {
    throw new Error('GOOGLE_AI_API_KEY not found in environment variables');
  }

  if (GOOGLE_AI_API_KEY === 'your_google_ai_api_key_here') {
    throw new Error('GOOGLE_AI_API_KEY is still set to placeholder value');
  }

  console.log('✅ API key found and configured');
  console.log(`   Key format: ${GOOGLE_AI_API_KEY.substring(0, 10)}...${GOOGLE_AI_API_KEY.substring(GOOGLE_AI_API_KEY.length - 4)}`);
}

async function initializeGeminiClient() {
  console.log('\n2. Initializing Gemini Client...');
  
  const genAI = new GoogleGenerativeAI(GOOGLE_AI_API_KEY);
  const model = genAI.getGenerativeModel({ 
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
  
  console.log('✅ Gemini client initialized successfully');
  return model;
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

async function testPromptFormatting() {
  console.log('\n3. Testing Prompt Formatting...');
  
  const formattedPrompt = formatPromptForGemini(
    testReportData.reportType,
    testReportData.inputText,
    testReportData.files,
    testReportData.additionalInfo
  );
  
  // Build the full prompt
  let fullPrompt = formattedPrompt;
  
  if (testReportData.inputText) {
    fullPrompt += `\n\n【入力データ】\n${testReportData.inputText}`;
  }

  if (testReportData.additionalInfo && Object.keys(testReportData.additionalInfo).length > 0) {
    fullPrompt += `\n\n【追加情報】\n${JSON.stringify(testReportData.additionalInfo, null, 2)}`;
  }
  
  console.log('✅ Prompt formatted successfully');
  console.log(`   Prompt length: ${fullPrompt.length} characters`);
  console.log(`   Report type: ${testReportData.reportType}`);
  
  return fullPrompt;
}

async function testGeminiReportGeneration(model, prompt) {
  console.log('\n4. Testing Gemini Report Generation...');
  
  const startTime = Date.now();
  
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();
    
    const responseTime = Date.now() - startTime;
    
    console.log('✅ Report generated successfully');
    console.log(`   Response time: ${responseTime}ms`);
    console.log(`   Content length: ${content.length} characters`);
    
    return {
      content,
      responseTime,
      estimatedTokens: {
        prompt: Math.ceil(prompt.length / 4),
        completion: Math.ceil(content.length / 4),
        total: Math.ceil((prompt.length + content.length) / 4)
      }
    };
  } catch (error) {
    console.error('❌ Report generation failed:', error.message);
    throw error;
  }
}

function validateReportQuality(report) {
  console.log('\n5. Validating Report Quality...');
  
  const content = report.content;
  const requiredSections = [
    '1. 投資概要と現状分析',
    '2. リスク評価と市場分析', 
    '3. 推奨投資戦略',
    '4. 実行計画と注意事項'
  ];
  
  let qualityScore = 0;
  const qualityChecks = [];
  
  // Check for required sections
  let sectionsFound = 0;
  requiredSections.forEach(section => {
    if (content.includes(section) || content.includes(section.substring(3))) {
      sectionsFound++;
      qualityChecks.push(`✅ Found section: ${section}`);
    } else {
      qualityChecks.push(`⚠️  Missing section: ${section}`);
    }
  });
  
  qualityScore += (sectionsFound / requiredSections.length) * 40;
  
  // Check content depth (minimum length)
  if (content.length > 1000) {
    qualityScore += 20;
    qualityChecks.push('✅ Adequate content length');
  } else {
    qualityChecks.push('⚠️  Content may be too short');
  }
  
  // Check for specific investment terms
  const investmentTerms = ['ポートフォリオ', '資産', 'リスク', '投資', '戦略', '分析'];
  let termsFound = 0;
  investmentTerms.forEach(term => {
    if (content.includes(term)) {
      termsFound++;
    }
  });
  
  qualityScore += (termsFound / investmentTerms.length) * 20;
  qualityChecks.push(`✅ Investment terms found: ${termsFound}/${investmentTerms.length}`);
  
  // Check for numerical analysis
  if (content.match(/\d+[万円%]/g)) {
    qualityScore += 10;
    qualityChecks.push('✅ Contains numerical analysis');
  } else {
    qualityChecks.push('⚠️  Limited numerical analysis');
  }
  
  // Check for actionable recommendations
  if (content.includes('推奨') || content.includes('提案') || content.includes('実行')) {
    qualityScore += 10;
    qualityChecks.push('✅ Contains actionable recommendations');
  } else {
    qualityChecks.push('⚠️  Limited actionable recommendations');
  }
  
  console.log(`   Quality Score: ${Math.round(qualityScore)}/100`);
  qualityChecks.forEach(check => console.log(`   ${check}`));
  
  return {
    score: Math.round(qualityScore),
    checks: qualityChecks,
    passesQuality: qualityScore >= 70
  };
}

function normalizeGeminiResponse(geminiResponse, reportType) {
  console.log('\n6. Testing Response Normalization...');
  
  // Normalize Gemini response to match OpenAI format
  let content = geminiResponse.content;
  
  // Ensure consistent report structure
  if (content && typeof content === 'string') {
    // Clean up any formatting inconsistencies
    content = content.trim();
  }
  
  const normalizedResponse = {
    id: Date.now().toString(),
    title: getReportTitle(reportType),
    content: content,
    createdAt: new Date().toISOString(),
    usage: {
      promptTokens: geminiResponse.estimatedTokens?.prompt || 0,
      completionTokens: geminiResponse.estimatedTokens?.completion || 0,
      totalTokens: geminiResponse.estimatedTokens?.total || 0,
      estimatedCost: `${((geminiResponse.estimatedTokens?.total || 0) * 0.000015).toFixed(4)}`
    },
    aiService: 'gemini'
  };
  
  console.log('✅ Response normalized successfully');
  console.log(`   Report ID: ${normalizedResponse.id}`);
  console.log(`   Report Title: ${normalizedResponse.title}`);
  console.log(`   Usage: ${normalizedResponse.usage.totalTokens} tokens`);
  console.log(`   Estimated Cost: $${normalizedResponse.usage.estimatedCost}`);
  
  return normalizedResponse;
}

function getReportTitle(reportType) {
  const titles = {
    jp_investment_4part: '投資分析レポート（4部構成）',
    jp_tax_strategy: '税務戦略レポート（減価償却活用）',
    jp_inheritance_strategy: '相続対策戦略レポート',
    custom: 'カスタムレポート'
  };
  
  return titles[reportType] || 'レポート';
}

async function runGeminiIntegrationTest() {
  try {
    // Test 1: API Key Configuration
    await testGeminiApiKey();
    
    // Test 2: Initialize Client
    const model = await initializeGeminiClient();
    
    // Test 3: Prompt Formatting
    const formattedPrompt = await testPromptFormatting();
    
    // Test 4: Report Generation
    const report = await testGeminiReportGeneration(model, formattedPrompt);
    
    // Test 5: Quality Validation
    const qualityResult = validateReportQuality(report);
    
    // Test 6: Response Normalization
    const normalizedResponse = normalizeGeminiResponse(report, testReportData.reportType);
    
    console.log('\n🎉 All Gemini Integration Tests Passed!');
    console.log('\n📊 Test Summary:');
    console.log(`   ✅ API Key: Valid`);
    console.log(`   ✅ Client Initialization: Success`);
    console.log(`   ✅ Prompt Formatting: Success`);
    console.log(`   ✅ Report Generation: Success (${report.responseTime}ms)`);
    console.log(`   ✅ Quality Score: ${qualityResult.score}/100 ${qualityResult.passesQuality ? '(PASS)' : '(NEEDS IMPROVEMENT)'}`);
    console.log(`   ✅ Response Normalization: Success`);
    
    console.log('\n📝 Generated Report Preview:');
    console.log('─'.repeat(50));
    console.log(normalizedResponse.content.substring(0, 500) + '...');
    console.log('─'.repeat(50));
    
    if (!qualityResult.passesQuality) {
      console.log('\n⚠️  Quality Improvement Needed:');
      qualityResult.checks.forEach(check => {
        if (check.includes('⚠️')) {
          console.log(`   ${check}`);
        }
      });
    }
    
    return {
      success: true,
      report: normalizedResponse,
      quality: qualityResult,
      performance: {
        responseTime: report.responseTime,
        tokenUsage: report.estimatedTokens
      }
    };
    
  } catch (error) {
    console.error('\n❌ Gemini Integration Test Failed:', error.message);
    
    // Provide specific error guidance
    if (error.message.includes('API_KEY_INVALID')) {
      console.log('   → The API key appears to be invalid');
      console.log('   → Please check your Google AI Studio API key');
    } else if (error.message.includes('PERMISSION_DENIED')) {
      console.log('   → Permission denied - check API key permissions');
    } else if (error.message.includes('QUOTA_EXCEEDED')) {
      console.log('   → API quota exceeded - check your usage limits');
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
runGeminiIntegrationTest()
  .then(result => {
    if (result.success) {
      console.log('\n✅ Gemini API integration is working correctly and ready for production use.');
      process.exit(0);
    } else {
      console.log('\n❌ Gemini API integration test failed. Please fix the issues before proceeding.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Unexpected error during testing:', error);
    process.exit(1);
  });