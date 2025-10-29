// Report Generation API - Trial Version with OpenAI Integration and Gemini Backup
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import trialAnalytics from '../lib/trial-analytics.js';
import fs from 'fs/promises';
import path from 'path';

// Initialize OpenAI client
let openai;
try {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY environment variable is not set');
  } else {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
} catch (error) {
  console.error('Failed to initialize OpenAI client:', error);
}

// Initialize Gemini client
let gemini;
let geminiModel;
try {
  if (!process.env.GOOGLE_AI_API_KEY) {
    console.error('GOOGLE_AI_API_KEY environment variable is not set');
  } else {
    gemini = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
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

// PromptManager will be initialized after class definition

// Comparison Analysis Handler
async function handleComparisonAnalysis(req, res) {
  const startTime = Date.now();
  let sessionId = `comparison_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  
  try {
    const { propertyA, propertyB, comparisonCriteria, resultFormat, additionalInfo } = req.body;
    
    console.log('[COMPARISON] Starting comparison analysis validation');
    
    // Enhanced validation for comparison analysis
    const validationError = validateComparisonRequest(req.body);
    if (validationError) {
      console.log('[COMPARISON] Validation failed:', validationError.message);
      
      // Track validation error
      await trialAnalytics.trackReportGeneration({
        reportType: 'comparison_analysis',
        success: false,
        processingTime: Date.now() - startTime,
        hasFiles: false,
        fileCount: 0,
        inputLength: 0,
        errorType: validationError.type,
        errorMessage: validationError.message,
        sessionId,
        userAgent: req.headers['user-agent']
      });
      
      return res.status(400).json({
        success: false,
        error: validationError
      });
    }
    
    console.log('[COMPARISON] Validation passed, processing comparison data');
    
    // Process property data
    const propertyAContent = await processPropertyData(propertyA);
    const propertyBContent = await processPropertyData(propertyB);
    
    // Build comparison data structure
    const comparisonData = {
      propertyA: {
        inputText: propertyAContent.text,
        files: propertyA.files
      },
      propertyB: {
        inputText: propertyBContent.text,
        files: propertyB.files
      },
      comparisonCriteria: comparisonCriteria || '収益性、リスク、立地を中心とした総合比較',
      resultFormat: resultFormat || '表形式での比較と推奨順位'
    };
    
    // Build comparison prompt
    const comparisonPrompt = promptManager.buildFullPrompt(
      'comparison_analysis',
      null, // No single input text for comparison
      null, // Files handled separately
      additionalInfo,
      comparisonData
    );
    
    // Combine all file content for processing
    const allFiles = [];
    if (propertyA.files) allFiles.push(...propertyA.files);
    if (propertyB.files) allFiles.push(...propertyB.files);
    
    let fileContent = '';
    if (allFiles.length > 0) {
      console.log(`[COMPARISON] Processing ${allFiles.length} files with legacy processing`);
      fileContent = await processFiles(allFiles);
    }
    
    // Build final prompt with file content
    let finalPrompt = comparisonPrompt;
    if (fileContent) {
      finalPrompt += `\n\n【添付ファイル分析結果】\n${fileContent}`;
    }
    
    // Generate report using existing AI services
    const report = await generateComparisonReport({
      prompt: finalPrompt,
      additionalInfo,
      sessionId
    });
    
    // Track successful comparison analysis
    const analyticsData = {
      reportType: 'comparison_analysis',
      success: true,
      processingTime: Date.now() - startTime,
      hasFiles: allFiles.length > 0,
      fileCount: allFiles.length,
      inputLength: (propertyAContent.text?.length || 0) + (propertyBContent.text?.length || 0),
      sessionId,
      userAgent: req.headers['user-agent'],
      promptTokens: report.usage?.promptTokens || 0,
      completionTokens: report.usage?.completionTokens || 0,
      totalTokens: report.usage?.totalTokens || 0,
      estimatedCost: parseFloat(report.usage?.estimatedCost || 0),
      aiService: report.aiService || 'openai',
      serviceHealth: getServiceHealthMetrics()
    };
    
    await trialAnalytics.trackReportGeneration(analyticsData);
    
    return res.status(200).json({
      success: true,
      report: {
        ...report,
        metadata: {
          isComparison: true,
          propertiesCompared: 2,
          comparisonCriteria: comparisonData.comparisonCriteria,
          resultFormat: comparisonData.resultFormat
        }
      }
    });
    
  } catch (error) {
    console.error('Comparison analysis error:', error);
    
    // Track error in analytics
    const errorAnalyticsData = {
      reportType: 'comparison_analysis',
      success: false,
      processingTime: Date.now() - startTime,
      errorType: 'comparison_error',
      errorMessage: error.message,
      sessionId,
      userAgent: req.headers['user-agent'],
      serviceHealth: getServiceHealthMetrics()
    };
    
    await trialAnalytics.trackReportGeneration(errorAnalyticsData);
    
    const errorResponse = handleApiError(error);
    return res.status(errorResponse.statusCode).json({
      success: false,
      error: errorResponse.error
    });
  }
}

// Helper function to process individual property data
async function processPropertyData(propertyData) {
  let text = propertyData.inputText || '';
  
  // If there are files, we'll let the main file processing handle them
  // This function just prepares the text content
  return {
    text: text.trim(),
    hasFiles: propertyData.files && propertyData.files.length > 0
  };
}

// Generate comparison report using existing AI infrastructure
async function generateComparisonReport({ prompt, additionalInfo, sessionId }) {
  let aiService = 'openai';
  let report;
  
  try {
    // Try OpenAI first
    report = await generateComparisonWithOpenAI({ prompt, additionalInfo });
  } catch (openaiError) {
    console.log('OpenAI failed for comparison, trying Gemini:', openaiError.message);
    
    if (shouldTryFallback(openaiError)) {
      try {
        // Fallback to Gemini
        aiService = 'gemini';
        report = await generateComparisonWithGemini({ prompt, additionalInfo });
        console.log('Successfully generated comparison report using Gemini fallback');
        
        report.serviceNotification = {
          message: 'Your comparison report was generated using our backup AI service to ensure uninterrupted service.',
          type: 'info',
          details: 'The primary service was temporarily unavailable, but report quality remains consistent.',
          timestamp: new Date().toISOString()
        };
      } catch (geminiError) {
        console.error('Both AI services failed for comparison:', { openaiError: openaiError.message, geminiError: geminiError.message });
        throw createDualServiceFailureError(openaiError, geminiError);
      }
    } else {
      throw openaiError;
    }
  }
  
  report.aiService = aiService;
  return report;
}

// Generate comparison report with OpenAI
async function generateComparisonWithOpenAI({ prompt, additionalInfo }) {
  const startTime = Date.now();
  
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "あなたは経験豊富な不動産投資の専門家です。複数の物件を比較分析し、投資判断に必要な詳細で実践的な比較レポートを作成してください。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.7,
    });

    const content = completion.choices[0].message.content;
    const responseTime = Date.now() - startTime;
    
    recordServiceSuccess('openai', responseTime);

    return {
      id: Date.now().toString(),
      title: '比較分析レポート',
      content: content,
      createdAt: new Date().toISOString(),
      usage: {
        promptTokens: completion.usage.prompt_tokens,
        completionTokens: completion.usage.completion_tokens,
        totalTokens: completion.usage.total_tokens,
        estimatedCost: `${(completion.usage.total_tokens * 0.00003).toFixed(4)}`
      }
    };
    
  } catch (error) {
    recordServiceFailure('openai', error);
    throw error;
  }
}

// Generate comparison report with Gemini
async function generateComparisonWithGemini({ prompt, additionalInfo }) {
  const startTime = Date.now();
  
  try {
    if (!geminiModel) {
      throw new Error('Gemini API is not available');
    }

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    const estimatedPromptTokens = Math.ceil(prompt.length / 4);
    const estimatedCompletionTokens = Math.ceil(content.length / 4);
    const estimatedTotalTokens = estimatedPromptTokens + estimatedCompletionTokens;

    const responseTime = Date.now() - startTime;
    recordServiceSuccess('gemini', responseTime);

    return {
      id: Date.now().toString(),
      title: '比較分析レポート',
      content: content,
      createdAt: new Date().toISOString(),
      usage: {
        promptTokens: estimatedPromptTokens,
        completionTokens: estimatedCompletionTokens,
        totalTokens: estimatedTotalTokens,
        estimatedCost: `${(estimatedTotalTokens * 0.000015).toFixed(4)}`
      },
      aiService: 'gemini'
    };
    
  } catch (error) {
    recordServiceFailure('gemini', error);
    throw error;
  }
}

// Service health tracking
const serviceHealth = {
  openai: {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    lastFailure: null,
    lastSuccess: null,
    averageResponseTime: 0,
    responseTimes: [],
    consecutiveFailures: 0,
    isHealthy: true
  },
  gemini: {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    lastFailure: null,
    lastSuccess: null,
    averageResponseTime: 0,
    responseTimes: [],
    consecutiveFailures: 0,
    isHealthy: true
  }
};

// Service health management functions
function recordServiceSuccess(serviceName, responseTime) {
  const service = serviceHealth[serviceName];
  if (!service) return;
  
  service.totalRequests++;
  service.successfulRequests++;
  service.lastSuccess = new Date().toISOString();
  service.consecutiveFailures = 0;
  service.isHealthy = true;
  
  // Track response times (keep last 10 for average calculation)
  service.responseTimes.push(responseTime);
  if (service.responseTimes.length > 10) {
    service.responseTimes.shift();
  }
  
  // Calculate average response time
  service.averageResponseTime = service.responseTimes.reduce((a, b) => a + b, 0) / service.responseTimes.length;
  
  console.log(`[HEALTH] ${serviceName} success: ${responseTime}ms (avg: ${Math.round(service.averageResponseTime)}ms)`);
}

function recordServiceFailure(serviceName, error) {
  const service = serviceHealth[serviceName];
  if (!service) return;
  
  service.totalRequests++;
  service.failedRequests++;
  service.lastFailure = new Date().toISOString();
  service.consecutiveFailures++;
  
  // Mark as unhealthy after 3 consecutive failures
  if (service.consecutiveFailures >= 3) {
    service.isHealthy = false;
    console.log(`[HEALTH] ${serviceName} marked as unhealthy after ${service.consecutiveFailures} consecutive failures`);
  }
  
  console.log(`[HEALTH] ${serviceName} failure: ${error.message} (consecutive: ${service.consecutiveFailures})`);
}

function getServiceHealthMetrics() {
  const metrics = {};
  
  for (const [serviceName, health] of Object.entries(serviceHealth)) {
    const successRate = health.totalRequests > 0 ? 
      (health.successfulRequests / health.totalRequests * 100).toFixed(1) : 0;
    
    metrics[serviceName] = {
      isHealthy: health.isHealthy,
      totalRequests: health.totalRequests,
      successRate: `${successRate}%`,
      averageResponseTime: Math.round(health.averageResponseTime),
      consecutiveFailures: health.consecutiveFailures,
      lastSuccess: health.lastSuccess,
      lastFailure: health.lastFailure
    };
  }
  
  return metrics;
}

function logServiceHealthSummary() {
  const metrics = getServiceHealthMetrics();
  console.log('[HEALTH SUMMARY]', JSON.stringify(metrics, null, 2));
}

// PromptManager class for handling prompt templates
class PromptManager {
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
    this.loadPrompts();
  }
  
  async loadPrompts() {
    const promptsDir = './PROMPTS';
    
    try {
      // Get all .md files from PROMPTS folder
      const files = await fs.readdir(promptsDir);
      const promptFiles = files.filter(file => file.endsWith('.md'));
      
      console.log(`[PROMPT MANAGER] Loading ${promptFiles.length} prompt files from ${promptsDir}`);
      
      for (const file of promptFiles) {
        try {
          const filePath = path.join(promptsDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          this.prompts.set(file, content);
          console.log(`[PROMPT MANAGER] Loaded prompt: ${file} (${content.length} chars)`);
        } catch (error) {
          console.error(`[PROMPT MANAGER] Failed to load prompt ${file}:`, error.message);
        }
      }
      
      console.log(`[PROMPT MANAGER] Successfully loaded ${this.prompts.size} prompts from files`);
      
      // If no prompts were loaded from files, use fallback
      if (this.prompts.size === 0) {
        console.log('[PROMPT MANAGER] No prompts loaded from files, using fallback prompts');
        this.loadFallbackPrompts();
      }
    } catch (error) {
      console.error('[PROMPT MANAGER] Failed to read PROMPTS directory:', error.message);
      console.log('[PROMPT MANAGER] Using fallback prompts due to directory read failure');
      // Load fallback prompts if directory read fails
      this.loadFallbackPrompts();
    }
  }
  
  loadFallbackPrompts() {
    console.log('[PROMPT MANAGER] Loading fallback prompts - using updated detailed prompts');
    // Use the existing REPORT_PROMPTS as fallback
    this.prompts.set('jp_investment_4part.md', REPORT_PROMPTS.jp_investment_4part);
    this.prompts.set('jp_tax_strategy.md', REPORT_PROMPTS.jp_tax_strategy);
    this.prompts.set('jp_inheritance_strategy.md', REPORT_PROMPTS.jp_inheritance_strategy);
    this.prompts.set('custom.md', REPORT_PROMPTS.custom);
    console.log(`[PROMPT MANAGER] Fallback prompts loaded: ${this.prompts.size} prompts`);
  }
  
  getPrompt(reportType) {
    const promptFile = this.reportTypes[reportType]?.promptFile || 'jp_investment_4part.md';
    const prompt = this.prompts.get(promptFile);
    
    if (!prompt) {
      console.error(`[PROMPT MANAGER] Prompt not found: ${promptFile}, falling back to default`);
      console.log(`[PROMPT MANAGER] Available prompts: ${Array.from(this.prompts.keys()).join(', ')}`);
      const fallbackPrompt = this.prompts.get('jp_investment_4part.md') || REPORT_PROMPTS.jp_investment_4part;
      console.log(`[PROMPT MANAGER] Using fallback prompt (length: ${fallbackPrompt.length} chars)`);
      return fallbackPrompt;
    }
    
    console.log(`[PROMPT MANAGER] Using prompt: ${promptFile} for report type: ${reportType} (length: ${prompt.length} chars)`);
    return prompt;
  }
  
  buildFullPrompt(reportType, inputText, files, additionalInfo, comparisonData = null) {
    console.log(`[PROMPT MANAGER] Building full prompt for report type: ${reportType}`);
    
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
    
    // Add input data section
    if (inputText && inputText.trim()) {
      fullPrompt += `\n\n【入力データ】\n${inputText}`;
    }
    
    // Add file content section (files will be processed separately)
    if (files && files.length > 0) {
      fullPrompt += `\n\n【添付ファイル】\n添付されたファイルの内容を分析に含めてください。`;
    }
    
    // Add additional info section
    if (additionalInfo && Object.keys(additionalInfo).length > 0) {
      fullPrompt += `\n\n【追加情報】\n${JSON.stringify(additionalInfo, null, 2)}`;
    }
    
    return fullPrompt;
  }
  
  buildCustomPrompt(basePrompt, inputText, files, additionalInfo) {
    console.log('[PROMPT MANAGER] Building custom prompt with jp_investment_4part base template');
    
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
      console.log('[PROMPT MANAGER] Custom requirements integrated into investment framework');
    } else {
      // If no custom requirements, use standard investment analysis
      customPrompt += `\n\n【カスタム要件】\n標準的な投資分析を実施してください。特別な要件は指定されていません。`;
      console.log('[PROMPT MANAGER] No custom requirements provided, using standard investment analysis');
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
  
  buildComparisonPrompt(basePrompt, comparisonData) {
    if (!comparisonData || !comparisonData.propertyA || !comparisonData.propertyB) {
      throw new Error('Comparison analysis requires both Property A and Property B data');
    }
    
    let comparisonPrompt = basePrompt;
    
    // Add Property A data
    comparisonPrompt += `\n\n【物件A】\n`;
    if (comparisonData.propertyA.inputText) {
      comparisonPrompt += comparisonData.propertyA.inputText;
    }
    if (comparisonData.propertyA.files && comparisonData.propertyA.files.length > 0) {
      comparisonPrompt += `\n物件Aの添付ファイルを分析に含めてください。`;
    }
    
    // Add Property B data
    comparisonPrompt += `\n\n【物件B】\n`;
    if (comparisonData.propertyB.inputText) {
      comparisonPrompt += comparisonData.propertyB.inputText;
    }
    if (comparisonData.propertyB.files && comparisonData.propertyB.files.length > 0) {
      comparisonPrompt += `\n物件Bの添付ファイルを分析に含めてください。`;
    }
    
    // Add comparison criteria
    if (comparisonData.comparisonCriteria) {
      comparisonPrompt += `\n\n【比較項目】\n${comparisonData.comparisonCriteria}`;
    } else {
      comparisonPrompt += `\n\n【比較項目】\n収益性、リスク、立地を中心とした総合比較`;
    }
    
    // Add result format
    if (comparisonData.resultFormat) {
      comparisonPrompt += `\n\n【求める結果表示形式】\n${comparisonData.resultFormat}`;
    } else {
      comparisonPrompt += `\n\n【求める結果表示形式】\n表形式での比較と推奨順位`;
    }
    
    return comparisonPrompt;
  }
}

// Initialize PromptManager after class definition
const promptManager = new PromptManager();

// Validate API keys function
function validateApiKeys() {
  const validation = {
    openai: !!openai && !!process.env.OPENAI_API_KEY,
    gemini: !!geminiModel && !!process.env.GOOGLE_AI_API_KEY
  };
  
  console.log('API Key validation:', validation);
  return validation;
}

// Failover condition logic - determines when to try backup service
function shouldTryFallback(error) {
  // Handle specific error types that warrant trying the backup service
  
  // Rate limit errors - always try fallback
  if (error.status === 429 || error.message?.includes('rate limit')) {
    console.log('Rate limit detected, trying fallback');
    return true;
  }
  
  // Server errors (5xx) - try fallback
  if (error.status >= 500 || error.message?.includes('server error')) {
    console.log('Server error detected, trying fallback');
    return true;
  }
  
  // Network timeouts and connection issues - try fallback
  if (error.code === 'ETIMEDOUT' || 
      error.code === 'ECONNRESET' || 
      error.code === 'ENOTFOUND' ||
      error.message?.includes('network') ||
      error.message?.includes('timeout') ||
      error.message?.includes('unavailable')) {
    console.log('Network/timeout error detected, trying fallback');
    return true;
  }
  
  // Authentication errors - mark service as unhealthy but try fallback
  if (error.status === 401 || error.message?.includes('authentication')) {
    console.log('Authentication error detected, trying fallback');
    return true;
  }
  
  // Service unavailable errors
  if (error.status === 503 || error.message?.includes('service unavailable')) {
    console.log('Service unavailable, trying fallback');
    return true;
  }
  
  // Don't try fallback for client errors (400, 403) or validation errors
  if (error.status === 400 || error.status === 403 || 
      error.message?.includes('validation') ||
      error.message?.includes('invalid request')) {
    console.log('Client error detected, not trying fallback:', error.message);
    return false;
  }
  
  // For unknown errors, try fallback as a safety measure
  console.log('Unknown error type, trying fallback as safety measure:', error.message);
  return true;
}

// Report type prompts
const REPORT_PROMPTS = {
  jp_investment_4part: `# 投資分析レポート作成指示書

## 指示
添付されたファイル（PDF、画像、テキスト）を詳細に分析し、プロの不動産コンサルタントとして、以下の体系的なレポートを作成してください。

## ファイル分析の指針
- **PDFファイル**: 文書内の数値データ、表、グラフを正確に読み取り、分析に活用してください。FCR、DCR、BER、IRR、NPVなどの投資指標を特に注意深く抽出してください
- **画像ファイル**: 図表、グラフ、写真に含まれる情報を詳細に分析し、数値や傾向を読み取ってください
- **テキストデータ**: 提供された情報を基に、不足している部分は一般的な市場データで補完してください
- **重要**: ファイルから具体的な数値が抽出できない場合でも、「未提供」ではなく、ファイルの内容を基に合理的な分析と推定を行ってください

各項目は、単なる情報の抜き出しだけでなく、データに基づいた客観的な考察も加えてください。添付ファイルの内容を最大限活用し、具体的で実用的な投資分析を提供してください。

---

## 1. Executive Summary（投資概要）
この投資案件の全体像を要約してください。まず**初期分析（FCRとK%等）**から分かる購入時点での収益性に触れ、次にそれが**全体分析（税引前・税引後IRRの比較等）**によって投資期間全体で証明されていることを示し、説得力のある形で結論を記述してください。

## 2. Benefits（投資の優位性）
この物件がもたらす財務的メリットを、以下の3つの観点からデータを根拠に挙げてください。

1. **購入時点での明確な収益性と安全性：** 初期分析の指標（FCR, K%, DCR, BER）を基に、この投資がスタート時点でいかに優れているかを具体的に説明してください。

2. **投資期間全体で証明される強力なレバレッジ効果：** 全体分析における**「税引前IRR」と「税引後IRR」**のそれぞれを、融資利用時と全額自己資金時で比較します。これにより、収益性の増幅効果と、節税効果の両面からレバレッジの有効性を証明してください。

3. **確かな投資価値の創出：** 正味現在価値（NPV）がプラスであることの意味を解説し、この投資が将来的にどれだけの価値を生み出す可能性があるかを説明してください。

## 3. Risks（潜在リスクの分析とヘッジ）
PDFの数値データから直接読み取れないリスクも含め、多角的に分析してください。

* **市場リスク：** （例：周辺エリアの賃貸需要の変化、賃料相場の下落など）
* **物件リスク：** （例：建物の物理的劣化による大規模修繕、管理状態など）
* **財務リスク：** （例：金利上昇がキャッシュフローやレバレッジに与える影響など）
* **税務リスク：** （例：減価償却ルールの変更、各種税率の改正などが税引後リターンに与える影響など）

## 4. Evidence（定量的証拠）
投資判断の裏付けとなる最も重要な定量的データを、「初期分析」と「全体分析」に明確に分けてリストアップしてください。

* **基本情報**
  * 物件名、所在地、構造・築年数

* **初期分析（購入時点・初年度の評価）**
  * 総収益率（FCR）
  * ローン定数（K%）
  * イールドギャップ (FCR - K%)
  * 借入金償還余裕率（DCR）
  * 損益分岐入居率（BER）

* **全体分析（保有期間全体・売却までの評価）**
  * 内部収益率（IRR・税引前・融資利用時）
  * 内部収益率（IRR・税引後・融資利用時）
  * 内部収益率（IRR・税引前・全額自己資金時）
  * 内部収益率（IRR・税引後・全額自己資金時）
  * 正味現在価値（NPV）`,

  jp_tax_strategy: `# 不動産投資による所得税減税効果分析レポート作成プロンプト

## 役割 (Role)
あなたは、日本の税制に精通した、トップレベルのタックスアドバイザー兼ファイナンシャルプランナーです。

## 目的 (Objective)
個人富裕層のお客様に対し、中古不動産投資を活用した所得税・住民税の減税戦略を、論理的かつ説得力のあるプロフェッショナルなレポート形式で提案してください。

## ファイル分析の指針
- **PDFファイル**: 投資物件の詳細情報、収支計算書、税務関連データを正確に読み取ってください
- **画像ファイル**: 物件写真、図表、グラフから投資価値や税務効果を分析してください
- **入力データ**: 提供された年収、家族構成、投資目標などの個人情報を活用してください

## レポート構成要件

### 1. 戦略サマリー
- 減税メカニズムの核心を3行以内で要約
- 年間・総額での節税効果を数値で明示
- 最終的な推奨アクションを1行で提示

### 2. 減税メカニズムの詳細解説
- 減価償却による所得控除の仕組みを図解付きで説明
- 損益通算による他所得との相殺効果を具体例で示す
- 住民税への影響も含めた総合的な節税効果を計算

### 3. シミュレーション分析
- 物件価格・築年数・構造による減価償却額の違いを表形式で比較
- 年収別・税率別での節税効果をシミュレーション
- 投資期間中の累積節税効果をグラフ化

### 4. リスク分析と対策
- 減価償却期間終了後の税務リスク
- 売却時の譲渡所得税への影響
- 税制改正リスクとその対策
- 事業的規模の判定リスク

### 5. 実行に向けた具体的ステップ
- 物件選定のポイント（築年数・構造・立地）
- 必要書類と手続きフロー
- 税務申告での注意点
- 継続的なモニタリング方法`,

  jp_inheritance_strategy: `# 収益不動産活用による相続対策分析レポート作成指示書

## 指示
添付されたファイルと提供された資産・家族情報を基に、プロの相続コンサルタントとして、収益不動産購入が相続に与える影響を分析し、以下の体系的なレポートを作成してください。

## ファイル分析の指針
- **PDFファイル**: 不動産投資分析レポート、相続税計算書、資産評価書などを詳細に分析してください
- **画像ファイル**: 物件写真、相続関係図、資産構成グラフなどから相続対策の効果を読み取ってください
- **入力データ**: 総資産額、法定相続人情報、相続対策目標などの個人情報を活用してください

## レポート構成

### 1. 相続対策戦略サマリー
- 収益不動産活用による相続税評価額圧縮の核心メカニズムを3行以内で要約
- 購入前後の相続税負担額の差額を具体的な金額で明示
- 最終的な推奨アクションを1行で提示

### 2. 相続税評価額圧縮メカニズムの詳細解説
- 収益不動産の相続税評価方法（路線価方式・倍率方式）の説明
- 賃貸借権の設定による評価減の仕組みを図解付きで説明
- 借地権割合・借家権割合の計算方法と実際の評価減効果
- 相続税評価額と時価の乖離を具体例で示す

### 3. シミュレーション分析
- 購入前後の相続税評価額・税額を表形式で比較
- 相続人の人数・関係性による節税効果の違いを分析
- 物件価格・立地による評価減効果の違いをシミュレーション
- 相続発生時期別の累積節税効果をグラフ化

### 4. リスク分析と対策
- 税務調査での否認リスクとその対策
- 物件価値の変動リスクとヘッジ方法
- 家族間での相続争いリスクと対策
- 相続税法改正リスクとその影響

### 5. 実行に向けた具体的ステップ
- 物件選定のポイント（立地・賃貸需要・借地権割合）
- 賃貸借契約の締結方法と注意点
- 相続税申告での書類準備
- 継続的なモニタリングと見直し方法`,

  custom: `以下の要求に基づいて、専門的で詳細なレポートを作成してください。`
};

export default async (req, res) => {
  const { method } = req;
  const startTime = Date.now();
  let sessionId = null;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: {
        message: 'Method not allowed',
        type: 'validation_error',
        severity: 'error',
        shouldRetry: false,
        userActions: ['Use POST method for report generation'],
        errorId: `method_error_${Date.now()}`
      }
    });
  }

  try {
    // Check if OpenAI is available
    if (!openai) {
      return res.status(500).json({ 
        success: false,
        error: {
          message: 'Report generation service is temporarily unavailable. Please try again in a few minutes.',
          type: 'service_error',
          severity: 'error',
          shouldRetry: true,
          retryAfter: 60,
          userActions: [
            'Wait a few minutes and try again',
            'Check your internet connection',
            'Contact support if the problem persists'
          ],
          technicalDetails: 'OpenAI service initialization failed',
          errorId: `openai_init_error_${Date.now()}`
        }
      });
    }

    const { reportType, inputText, files, additionalInfo, options } = req.body;

    // Handle comparison analysis requests
    if (reportType === 'comparison_analysis') {
      console.log('[ROUTER] Routing to comparison analysis handler');
      return await handleComparisonAnalysis(req, res);
    }

    console.log(`[ROUTER] Processing standard report: ${reportType}`);

    // Generate session ID for analytics
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    // Enhanced input validation
    const validationError = validateInput({ reportType, inputText, files, additionalInfo, options });
    if (validationError) {
      // Track validation error
      await trialAnalytics.trackReportGeneration({
        reportType: reportType || 'unknown',
        success: false,
        processingTime: Date.now() - startTime,
        hasFiles: files && files.length > 0,
        fileCount: files ? files.length : 0,
        inputLength: inputText ? inputText.length : 0,
        errorType: validationError.type,
        errorMessage: validationError.message,
        sessionId,
        userAgent: req.headers['user-agent']
      });

      return res.status(400).json({
        success: false,
        error: validationError
      });
    }

    // Process the request with comprehensive error handling
    const report = await generateReport({
      reportType,
      inputText,
      files,
      additionalInfo,
      options
    });

    // Track successful report generation
    const analyticsData = {
      reportType,
      success: true,
      processingTime: Date.now() - startTime,
      hasFiles: files && files.length > 0,
      fileCount: files ? files.length : 0,
      inputLength: inputText ? inputText.length : 0,
      sessionId,
      userAgent: req.headers['user-agent'],
      promptTokens: report.usage?.promptTokens || 0,
      completionTokens: report.usage?.completionTokens || 0,
      totalTokens: report.usage?.totalTokens || 0,
      estimatedCost: parseFloat(report.usage?.estimatedCost || 0),
      aiService: report.aiService || 'openai',
      serviceHealth: getServiceHealthMetrics()
    };
    
    await trialAnalytics.trackReportGeneration(analyticsData);
    
    // Log analytics for debugging
    console.log(`[ANALYTICS] Report generated: ${reportType}, ${analyticsData.processingTime}ms, ${analyticsData.totalTokens} tokens`);
    
    // Log service health summary periodically (every 10th request)
    if (serviceHealth.openai.totalRequests % 10 === 0 || serviceHealth.gemini.totalRequests % 10 === 0) {
      logServiceHealthSummary();
    }

    return res.status(200).json({
      success: true,
      report
    });

  } catch (error) {
    console.error('Generate API error:', error);
    
    // Handle comprehensive error scenarios
    const errorResponse = handleApiError(error);
    
    // Track error in analytics
    if (sessionId) {
      const errorAnalyticsData = {
        reportType: req.body?.reportType || 'unknown',
        success: false,
        processingTime: Date.now() - startTime,
        hasFiles: req.body?.files && req.body.files.length > 0,
        fileCount: req.body?.files ? req.body.files.length : 0,
        inputLength: req.body?.inputText ? req.body.inputText.length : 0,
        errorType: errorResponse.error.type,
        errorMessage: errorResponse.error.message,
        sessionId,
        userAgent: req.headers['user-agent'],
        serviceHealth: getServiceHealthMetrics()
      };
      
      await trialAnalytics.trackReportGeneration(errorAnalyticsData);
      
      // Log error analytics for debugging
      console.log(`[ANALYTICS] Report failed: ${errorAnalyticsData.reportType}, ${errorAnalyticsData.errorType}, ${errorAnalyticsData.processingTime}ms`);
    }
    
    return res.status(errorResponse.statusCode).json({
      success: false,
      error: errorResponse.error
    });
  }
};

async function generateReport({ reportType, inputText, files, additionalInfo, options }) {
  let aiService = 'openai';
  let report;
  
  // Log file processing info for debugging
  if (files && files.length > 0) {
    console.log(`[FILE PROCESSING] Processing ${files.length} files for ${reportType} report`);
    files.forEach((file, index) => {
      console.log(`[FILE ${index + 1}] Name: ${file.name}, Type: ${file.type}, Size: ${file.data ? Math.round(file.data.length * 0.75 / 1024) : 0}KB`);
    });
  }
  
  try {
    // Try OpenAI first (existing logic)
    report = await generateWithOpenAI({ reportType, inputText, files, additionalInfo, options });
  } catch (openaiError) {
    console.log('OpenAI failed, trying Gemini:', openaiError.message);
    
    // Check if we should try fallback based on error type
    if (shouldTryFallback(openaiError)) {
      try {
        // Fallback to Gemini
        aiService = 'gemini';
        report = await generateWithGemini({ reportType, inputText, files, additionalInfo, options });
        console.log('Successfully generated report using Gemini fallback');
        
        // Add user-friendly notification about backup service usage
        report.serviceNotification = {
          message: 'Your report was generated using our backup AI service to ensure uninterrupted service.',
          type: 'info',
          details: 'The primary service was temporarily unavailable, but report quality remains consistent.',
          timestamp: new Date().toISOString()
        };
      } catch (geminiError) {
        console.error('Both AI services failed:', { openaiError: openaiError.message, geminiError: geminiError.message });
        // Both failed - throw enhanced dual-service failure error
        throw createDualServiceFailureError(openaiError, geminiError);
      }
    } else {
      // Don't try fallback for certain error types, just throw original error
      throw openaiError;
    }
  }
  
  // Add service indicator to response
  report.aiService = aiService;
  return report;
}

async function generateWithOpenAI({ reportType, inputText, files, additionalInfo, options }) {
  const startTime = Date.now();
  
  try {
    // Get the appropriate prompt using PromptManager
    let fullPrompt = promptManager.buildFullPrompt(reportType, inputText, files, additionalInfo);
  
    // Process files with enhanced capabilities (temporarily disabled for debugging)
    let fileContent = '';
    if (files && files.length > 0) {
      try {
        console.log(`[OPENAI] Processing ${files.length} files with legacy processing`);
        fileContent = await processFiles(files);
        // Add file content to the prompt
        fullPrompt += `\n\n【添付ファイル内容】\n${fileContent}`;
        console.log(`[OPENAI] File processing completed, content length: ${fileContent.length} chars`);
      } catch (fileError) {
        console.error('[OPENAI] File processing error:', fileError);
        throw new Error(`file processing failed: ${fileError.message}`);
      }
    }

  // Get appropriate system message for report type
  const systemMessage = getSystemMessage(reportType);

  // Call OpenAI API
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: systemMessage
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
  
  // Record successful OpenAI request
  recordServiceSuccess('openai', responseTime);

  return {
    id: Date.now().toString(),
    title: getReportTitle(reportType),
    content: content,
    createdAt: new Date().toISOString(),
    usage: {
      promptTokens: completion.usage.prompt_tokens,
      completionTokens: completion.usage.completion_tokens,
      totalTokens: completion.usage.total_tokens,
      estimatedCost: `$${(completion.usage.total_tokens * 0.00003).toFixed(4)}`
    },

  };
  
  } catch (error) {
    // Record OpenAI failure
    recordServiceFailure('openai', error);
    throw error;
  }
}

async function generateWithGemini({ reportType, inputText, files, additionalInfo, options }) {
  const startTime = Date.now();
  
  try {
    // Check if Gemini is available
    if (!geminiModel) {
      throw new Error('Gemini API is not available');
    }

    // Get the appropriate prompt using PromptManager and adapt for Gemini
    const basePrompt = promptManager.buildFullPrompt(reportType, inputText, files, additionalInfo);
    let fullPrompt = formatPromptForGemini(reportType, basePrompt);
    
    // Process files with legacy processing (temporarily disabled multimodal for debugging)
    let fileContent = '';
    if (files && files.length > 0) {
      try {
        console.log(`[GEMINI] Processing ${files.length} files with legacy processing`);
        fileContent = await processFiles(files);
        // Add file content to the prompt
        fullPrompt += `\n\n【添付ファイル内容】\n${fileContent}`;
      } catch (fileError) {
        console.error('[GEMINI] File processing error:', fileError);
        throw new Error(`file processing failed: ${fileError.message}`);
      }
    }

  // Call Gemini API with text prompt
  console.log(`[GEMINI] Calling Gemini 2.0 Flash with text prompt`);
  const result = await geminiModel.generateContent(fullPrompt);
  const response = await result.response;
  const content = response.text();

  // Estimate token usage (Gemini doesn't provide exact counts like OpenAI)
  const estimatedPromptTokens = Math.ceil(fullPrompt.length / 4);
  const estimatedCompletionTokens = Math.ceil(content.length / 4);
  const estimatedTotalTokens = estimatedPromptTokens + estimatedCompletionTokens;

  const rawResponse = {
    id: Date.now().toString(),
    title: getReportTitle(reportType),
    content: content,
    createdAt: new Date().toISOString(),
    usage: {
      promptTokens: estimatedPromptTokens,
      completionTokens: estimatedCompletionTokens,
      totalTokens: estimatedTotalTokens,
      estimatedCost: `${(estimatedTotalTokens * 0.000015).toFixed(4)}` // Gemini Pro pricing estimate
    },
    aiService: 'gemini'
  };

  const responseTime = Date.now() - startTime;
  
  // Record successful Gemini request
  recordServiceSuccess('gemini', responseTime);

  // Normalize response to ensure consistency with OpenAI format
  return normalizeGeminiResponse(rawResponse, reportType);
  
  } catch (error) {
    // Record Gemini failure
    recordServiceFailure('gemini', error);
    throw error;
  }
}

function formatPromptForGemini(reportType, basePrompt) {
  // Get appropriate system message for report type
  const systemMessage = getSystemMessage(reportType);
  
  // Gemini works better with role-based prompting
  const geminiPrompt = `${systemMessage}

${basePrompt}

以下の指示に従って、構造化された高品質なレポートを作成してください：

1. 明確で論理的な構成を使用する
2. 具体的で実行可能な推奨事項を提供する
3. 専門用語を使用しつつ、クライアントが理解しやすい説明を心がける
4. 数値や計算が含まれる場合は、根拠を明確にする
5. リスクや注意点も適切に言及する
6. 添付ファイルの内容を詳細に分析し、具体的なデータを活用する

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
    
    // Ensure proper section headers based on report type
    content = ensureReportStructure(content, reportType);
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

function ensureReportStructure(content, reportType) {
  // Ensure consistent report structure regardless of AI service
  const reportStructures = {
    jp_investment_4part: [
      '1. 投資概要と現状分析',
      '2. リスク評価と市場分析', 
      '3. 推奨投資戦略',
      '4. 実行計画と注意事項'
    ],
    jp_tax_strategy: [
      '現在の税務状況分析',
      '減価償却による節税効果の試算',
      '推奨する投資商品と戦略',
      '実行スケジュールと注意点',
      '長期的な税務メリット'
    ],
    jp_inheritance_strategy: [
      '現在の資産状況と相続税試算',
      '相続税軽減策の提案',
      '不動産投資による相続対策効果',
      '生前贈与や信託の活用方法',
      '実行優先順位と具体的手順'
    ]
  };
  
  const expectedStructure = reportStructures[reportType];
  if (!expectedStructure) {
    return content; // Return as-is for custom reports
  }
  
  // Check if content already has proper structure
  let hasProperStructure = expectedStructure.some(section => 
    content.includes(section)
  );
  
  if (!hasProperStructure) {
    // Add a note about structure if missing
    console.log(`Report structure may need adjustment for ${reportType}`);
  }
  
  return content;
}

// New multimodal file processing function
async function processFilesWithVision(files, reportType) {
  console.log(`[VISION] Processing ${files.length} files with multimodal AI`);
  
  const processedFiles = [];
  const visionResults = [];
  
  for (const file of files) {
    try {
      // Validate file structure
      if (!file.name || !file.type || !file.data) {
        throw new Error(`Invalid file structure for file: ${file.name || 'unknown'}`);
      }

      // Validate base64 data
      if (typeof file.data !== 'string' || !file.data.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
        throw new Error(`Invalid base64 data for file: ${file.name}`);
      }

      const fileSizeKB = Math.round(file.data.length * 0.75 / 1024);
      console.log(`[VISION] Processing ${file.name} (${file.type}, ${fileSizeKB}KB)`);

      if (fileSizeKB > 10240) { // 10MB limit
        throw new Error(`File too large: ${file.name} (${fileSizeKB}KB)`);
      }

      // Process with appropriate vision model based on file type
      let visionResult;
      if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
        visionResult = await analyzeFileWithVision(file, reportType);
        visionResults.push(visionResult);
        processedFiles.push(file.name);
      } else {
        // Fallback to text processing for other file types
        visionResult = await processTextFile(file);
        visionResults.push(visionResult);
        processedFiles.push(file.name);
      }
      
    } catch (error) {
      console.error(`[VISION] Error processing file ${file.name}:`, error.message);
      visionResults.push({
        fileName: file.name,
        error: error.message,
        content: `ファイル ${file.name} の処理中にエラーが発生しました: ${error.message}`
      });
    }
  }

  // Combine all vision results
  const combinedContent = visionResults.map(result => {
    if (result.error) {
      return result.content;
    }
    return `\n=== ${result.fileName} の分析結果 ===\n${result.content}\n`;
  }).join('\n');

  console.log(`[VISION] Successfully processed ${processedFiles.length}/${files.length} files`);
  return combinedContent;
}

// Analyze file content using vision models
async function analyzeFileWithVision(file, reportType) {
  console.log(`[VISION] Analyzing ${file.name} with vision AI`);
  
  try {
    // Try Gemini 2.0 Flash first (better for documents)
    const geminiResult = await analyzeWithGeminiVision(file, reportType);
    return {
      fileName: file.name,
      content: geminiResult,
      model: 'gemini-2.0-flash'
    };
  } catch (geminiError) {
    console.log(`[VISION] Gemini failed for ${file.name}, trying GPT-4V:`, geminiError.message);
    
    try {
      // Fallback to GPT-4V
      const gptResult = await analyzeWithGPT4Vision(file, reportType);
      return {
        fileName: file.name,
        content: gptResult,
        model: 'gpt-4-vision'
      };
    } catch (gptError) {
      console.error(`[VISION] Both vision models failed for ${file.name}`);
      throw new Error(`Vision analysis failed: ${geminiError.message}`);
    }
  }
}

// Analyze with Gemini 2.0 Flash (supports PDF and images)
async function analyzeWithGeminiVision(file, reportType) {
  if (!geminiModel) {
    throw new Error('Gemini model not available');
  }

  const analysisPrompt = getVisionAnalysisPrompt(reportType, file.type);
  
  const parts = [
    { text: analysisPrompt }
  ];

  // Add file data based on type
  if (file.type === 'application/pdf') {
    parts.push({
      inlineData: {
        mimeType: file.type,
        data: file.data
      }
    });
  } else if (file.type.startsWith('image/')) {
    parts.push({
      inlineData: {
        mimeType: file.type,
        data: file.data
      }
    });
  }

  const result = await geminiModel.generateContent(parts);
  const response = await result.response;
  return response.text();
}

// Analyze with GPT-4V (supports images)
async function analyzeWithGPT4Vision(file, reportType) {
  if (!openai) {
    throw new Error('OpenAI client not available');
  }

  // GPT-4V only supports images directly, not PDFs
  if (file.type === 'application/pdf') {
    throw new Error('GPT-4V does not support PDF files directly');
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('GPT-4V only supports image files');
  }

  const analysisPrompt = getVisionAnalysisPrompt(reportType, file.type);

  const completion = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: analysisPrompt
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${file.type};base64,${file.data}`,
              detail: "high"
            }
          }
        ]
      }
    ],
    max_tokens: 2000,
    temperature: 0.3
  });

  return completion.choices[0].message.content;
}

// Get vision analysis prompt based on report type
function getVisionAnalysisPrompt(reportType, fileType) {
  const basePrompt = `この${fileType === 'application/pdf' ? 'PDF文書' : '画像'}を詳細に分析し、以下の情報を抽出してください：

1. **数値データ**: FCR、DCR、BER、IRR、NPV、K%、利回り、価格、賃料などの投資指標
2. **物件情報**: 物件名、所在地、構造、築年数、面積、最寄り駅などの基本情報
3. **財務データ**: 収入、支出、キャッシュフロー、融資条件などの財務情報
4. **表やグラフ**: 数値表、グラフ、チャートに含まれるデータ
5. **その他重要情報**: 投資分析に関連するあらゆる情報

**重要**: 
- 数値は正確に読み取り、単位も含めて記載してください
- 表の構造も保持して出力してください
- 不明瞭な部分は「推定」として記載してください
- 日本語で詳細に分析結果を出力してください`;

  if (reportType === 'jp_investment_4part') {
    return basePrompt + `

**特に注目する投資指標**:
- FCR (総収益率)
- K% (ローン定数) 
- DCR (借入金償還余裕率)
- BER (損益分岐入居率)
- IRR (内部収益率) - 税引前・税引後、融資利用・全額自己資金
- NPV (正味現在価値)
- イールドギャップ (FCR - K%)`;
  }

  return basePrompt;
}

// Process text files (fallback)
async function processTextFile(file) {
  try {
    const buffer = Buffer.from(file.data, 'base64');
    const textContent = buffer.toString('utf8');
    return {
      fileName: file.name,
      content: `テキストファイル内容:\n${textContent.substring(0, 2000)}${textContent.length > 2000 ? '\n... (内容が長いため省略)' : ''}`
    };
  } catch (error) {
    throw new Error(`Failed to process text file: ${error.message}`);
  }
}

// Legacy file processing function (kept for compatibility)
async function processFiles(files) {
  // Use new vision processing if files contain PDF or images
  const hasVisionFiles = files.some(file => 
    file.type === 'application/pdf' || file.type.startsWith('image/')
  );
  
  if (hasVisionFiles) {
    console.log('[FILE PROCESSING] Using vision-based processing for multimodal files');
    return await processFilesWithVision(files, 'jp_investment_4part');
  }

  // Fallback to legacy processing for text files
  let content = '';
  const processedFiles = [];
  const failedFiles = [];
  
  for (const file of files) {
    try {
      // Validate file structure
      if (!file.name || !file.type || !file.data) {
        throw new Error(`Invalid file structure for file: ${file.name || 'unknown'}`);
      }

      // Validate base64 data
      if (typeof file.data !== 'string' || !file.data.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
        throw new Error(`Invalid base64 data for file: ${file.name}`);
      }

      // Decode base64 file with error handling
      let buffer;
      try {
        buffer = Buffer.from(file.data, 'base64');
      } catch (decodeError) {
        throw new Error(`Failed to decode file data for: ${file.name}`);
      }

      // Validate buffer size
      if (buffer.length === 0) {
        throw new Error(`Empty file detected: ${file.name}`);
      }

      if (buffer.length > 10 * 1024 * 1024) { // 10MB limit
        throw new Error(`File too large: ${file.name} (${Math.round(buffer.length / 1024 / 1024)}MB)`);
      }
      
      if (file.type === 'application/pdf') {
        // Enhanced PDF processing - attempt to extract text content
        content += `\n[PDF File: ${file.name} (${Math.round(buffer.length / 1024)}KB)]\n`;
        
        // Try to extract text from PDF by converting to string and looking for readable content
        try {
          const pdfString = buffer.toString('utf8');
          
          // Look for common PDF text patterns and extract readable content
          const textMatches = pdfString.match(/BT[\s\S]*?ET/g) || [];
          const extractedText = [];
          
          for (const match of textMatches.slice(0, 10)) { // Limit to first 10 text blocks
            // Extract text between parentheses or brackets
            const textContent = match.match(/\((.*?)\)/g) || match.match(/\[(.*?)\]/g);
            if (textContent) {
              textContent.forEach(text => {
                const cleanText = text.replace(/[()[\]]/g, '').trim();
                if (cleanText.length > 2 && /[a-zA-Z0-9]/.test(cleanText)) {
                  extractedText.push(cleanText);
                }
              });
            }
          }
          
          // Also look for numeric patterns that might be financial data
          const numberPatterns = pdfString.match(/\d+\.?\d*%?/g) || [];
          const significantNumbers = numberPatterns.filter(num => 
            parseFloat(num) > 0 && (num.includes('.') || parseFloat(num) > 100)
          ).slice(0, 20);
          
          if (extractedText.length > 0) {
            content += `抽出されたテキスト内容:\n${extractedText.join('\n')}\n`;
          }
          
          if (significantNumbers.length > 0) {
            content += `検出された数値データ: ${significantNumbers.join(', ')}\n`;
          }
          
          // Look for common real estate investment terms in Japanese
          const investmentTerms = [
            'FCR', 'DCR', 'BER', 'IRR', 'NPV', 'K%', 
            '収益率', '利回り', '投資', '物件', '賃料', '価格',
            '築年数', '構造', '所在地', '面積', 'RC造', '木造'
          ];
          
          const foundTerms = [];
          investmentTerms.forEach(term => {
            if (pdfString.includes(term)) {
              foundTerms.push(term);
            }
          });
          
          if (foundTerms.length > 0) {
            content += `検出された投資関連用語: ${foundTerms.join(', ')}\n`;
          }
          
          content += `PDFファイルから投資分析に関連する情報を検出しました。詳細な分析を実施します。\n`;
          
        } catch (pdfError) {
          content += `PDFファイルの内容解析中にエラーが発生しましたが、ファイルは正常に受信されています。\n`;
          content += `ファイル名: ${file.name}\n`;
          content += `ファイルサイズ: ${Math.round(buffer.length / 1024)}KB\n`;
          content += `このPDFファイルには投資分析に関する重要な情報が含まれていると想定して分析を進めます。\n`;
        }
      } else if (file.type.startsWith('image/')) {
        // Enhanced image processing placeholder
        content += `\n[Image File: ${file.name} (${Math.round(buffer.length / 1024)}KB)]\n`;
        content += `Image content extraction would be implemented here using OCR technology.\n`;
        content += `File appears to be a valid ${file.type.split('/')[1].toUpperCase()} image.\n`;
      } else if (file.type === 'text/plain' || file.type.startsWith('text/')) {
        // Enhanced text file processing
        try {
          const textContent = buffer.toString('utf8');
          content += `\n[Text File: ${file.name}]\n`;
          content += textContent.substring(0, 2000); // Increased limit for text files
          if (textContent.length > 2000) {
            content += '\n... (content truncated)\n';
          }
        } catch (textError) {
          throw new Error(`Failed to read text content from: ${file.name}`);
        }
      } else {
        // Try to read as text with fallback
        try {
          const textContent = buffer.toString('utf8');
          // Check if content appears to be valid text
          if (textContent.includes('\0') || textContent.length === 0) {
            throw new Error('Binary file detected');
          }
          content += `\n[File: ${file.name} (treated as text)]\n`;
          content += textContent.substring(0, 1000) + '...\n';
        } catch (textError) {
          content += `\n[Binary File: ${file.name}]\n`;
          content += `Binary file detected. Content extraction not supported for this file type.\n`;
        }
      }

      processedFiles.push(file.name);

    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      failedFiles.push({ name: file.name, error: error.message });
      
      // Add error information to content
      content += `\n[Processing Error: ${file.name}]\n`;
      content += `Error: ${error.message}\n`;
    }
  }

  // Add processing summary
  if (processedFiles.length > 0 || failedFiles.length > 0) {
    content += `\n[File Processing Summary]\n`;
    content += `Successfully processed: ${processedFiles.length} files\n`;
    if (processedFiles.length > 0) {
      content += `Processed files: ${processedFiles.join(', ')}\n`;
    }
    if (failedFiles.length > 0) {
      content += `Failed to process: ${failedFiles.length} files\n`;
      content += `Failed files: ${failedFiles.map(f => `${f.name} (${f.error})`).join(', ')}\n`;
    }
  }

  // If all files failed to process, throw an error
  if (failedFiles.length === files.length && files.length > 0) {
    throw new Error(`Failed to process all uploaded files. Please check file formats and try again.`);
  }
  
  return content;
}

function validateInput({ reportType, inputText, files, additionalInfo, options }) {
  // Check report type
  if (!reportType) {
    return {
      message: 'Please select a report type to continue.',
      type: 'validation_error',
      severity: 'error',
      shouldRetry: false,
      userActions: ['Select a report type from the dropdown menu'],
      errorId: `validation_report_type_${Date.now()}`
    };
  }

  const validReportTypes = ['jp_investment_4part', 'jp_tax_strategy', 'jp_inheritance_strategy', 'custom', 'comparison_analysis'];
  if (!validReportTypes.includes(reportType)) {
    return {
      message: 'Invalid report type selected. Please choose a valid option.',
      type: 'validation_error',
      severity: 'error',
      shouldRetry: false,
      userActions: ['Select a valid report type from the available options'],
      errorId: `validation_invalid_type_${Date.now()}`
    };
  }

  // Special validation for custom reports
  if (reportType === 'custom') {
    console.log('[VALIDATION] Validating custom report request');
    // Custom reports can work with just custom requirements, even without input text or files
    const hasCustomRequirements = additionalInfo && additionalInfo.customRequirements && additionalInfo.customRequirements.trim();
    const hasInputText = inputText && inputText.trim();
    const hasFiles = files && files.length > 0;
    
    if (!hasCustomRequirements && !hasInputText && !hasFiles) {
      return {
        message: 'Custom reports require either custom requirements, input text, or uploaded files.',
        type: 'validation_error',
        severity: 'error',
        shouldRetry: false,
        userActions: [
          'Specify your custom analysis requirements',
          'Enter property or investment data in the text field',
          'Upload relevant documents for analysis'
        ],
        errorId: `validation_custom_no_input_${Date.now()}`
      };
    }
    
    console.log(`[VALIDATION] Custom report validation passed - hasCustomRequirements: ${hasCustomRequirements}, hasInputText: ${hasInputText}, hasFiles: ${hasFiles}`);
  } else {
    // Check input content for non-custom reports
    if (!inputText && (!files || files.length === 0)) {
      return {
        message: 'Please provide either text input or upload files to generate a report.',
        type: 'validation_error',
        severity: 'error',
        shouldRetry: false,
        userActions: [
          'Enter text in the input field',
          'Upload PDF or image files',
          'Provide both text and files for comprehensive analysis'
        ],
        errorId: `validation_no_input_${Date.now()}`
      };
    }
  }

  // Validate text input length
  if (inputText && inputText.length > 10000) {
    return {
      message: 'Input text is too long. Please limit to 10,000 characters.',
      type: 'validation_error',
      severity: 'warning',
      shouldRetry: false,
      userActions: [
        'Reduce the text length to under 10,000 characters',
        'Split long content into multiple reports',
        'Focus on the most important information'
      ],
      errorId: `validation_text_length_${Date.now()}`
    };
  }

  // Validate files
  if (files && files.length > 0) {
    const fileValidation = validateFiles(files);
    if (fileValidation) {
      return fileValidation;
    }
  }

  return null; // No validation errors
}

function validateComparisonRequest(requestBody) {
  const { propertyA, propertyB, comparisonCriteria, resultFormat } = requestBody;
  
  console.log('[VALIDATION] Validating comparison analysis request');
  
  // Validate Property A
  if (!propertyA) {
    return {
      message: 'Property A data is required for comparison analysis.',
      type: 'comparison_validation_error',
      severity: 'error',
      shouldRetry: false,
      userActions: [
        'Provide Property A information in the text field',
        'Upload files for Property A',
        'Ensure Property A section is properly filled'
      ],
      errorId: `validation_property_a_missing_${Date.now()}`
    };
  }
  
  const hasPropertyAText = propertyA.inputText && propertyA.inputText.trim();
  const hasPropertyAFiles = propertyA.files && propertyA.files.length > 0;
  
  if (!hasPropertyAText && !hasPropertyAFiles) {
    return {
      message: 'Property A requires either text input or uploaded files.',
      type: 'comparison_validation_error',
      severity: 'error',
      shouldRetry: false,
      userActions: [
        'Enter Property A details in the text area',
        'Upload documents for Property A',
        'Provide at least one form of Property A data'
      ],
      errorId: `validation_property_a_empty_${Date.now()}`
    };
  }
  
  // Validate Property B
  if (!propertyB) {
    return {
      message: 'Property B data is required for comparison analysis.',
      type: 'comparison_validation_error',
      severity: 'error',
      shouldRetry: false,
      userActions: [
        'Provide Property B information in the text field',
        'Upload files for Property B',
        'Ensure Property B section is properly filled'
      ],
      errorId: `validation_property_b_missing_${Date.now()}`
    };
  }
  
  const hasPropertyBText = propertyB.inputText && propertyB.inputText.trim();
  const hasPropertyBFiles = propertyB.files && propertyB.files.length > 0;
  
  if (!hasPropertyBText && !hasPropertyBFiles) {
    return {
      message: 'Property B requires either text input or uploaded files.',
      type: 'comparison_validation_error',
      severity: 'error',
      shouldRetry: false,
      userActions: [
        'Enter Property B details in the text area',
        'Upload documents for Property B',
        'Provide at least one form of Property B data'
      ],
      errorId: `validation_property_b_empty_${Date.now()}`
    };
  }
  
  // Validate files for both properties if present
  if (hasPropertyAFiles) {
    const fileValidation = validateFiles(propertyA.files);
    if (fileValidation) {
      fileValidation.message = `Property A files: ${fileValidation.message}`;
      return fileValidation;
    }
  }
  
  if (hasPropertyBFiles) {
    const fileValidation = validateFiles(propertyB.files);
    if (fileValidation) {
      fileValidation.message = `Property B files: ${fileValidation.message}`;
      return fileValidation;
    }
  }
  
  // Validate text length for both properties
  if (hasPropertyAText && propertyA.inputText.length > 5000) {
    return {
      message: 'Property A text is too long. Please limit to 5,000 characters for comparison analysis.',
      type: 'comparison_validation_error',
      severity: 'warning',
      shouldRetry: false,
      userActions: [
        'Reduce Property A text to under 5,000 characters',
        'Focus on the most important Property A information',
        'Use file uploads for detailed Property A documents'
      ],
      errorId: `validation_property_a_length_${Date.now()}`
    };
  }
  
  if (hasPropertyBText && propertyB.inputText.length > 5000) {
    return {
      message: 'Property B text is too long. Please limit to 5,000 characters for comparison analysis.',
      type: 'comparison_validation_error',
      severity: 'warning',
      shouldRetry: false,
      userActions: [
        'Reduce Property B text to under 5,000 characters',
        'Focus on the most important Property B information',
        'Use file uploads for detailed Property B documents'
      ],
      errorId: `validation_property_b_length_${Date.now()}`
    };
  }
  
  // Validate comparison criteria length if provided
  if (comparisonCriteria && comparisonCriteria.length > 1000) {
    return {
      message: 'Comparison criteria text is too long. Please limit to 1,000 characters.',
      type: 'comparison_validation_error',
      severity: 'warning',
      shouldRetry: false,
      userActions: [
        'Reduce comparison criteria to under 1,000 characters',
        'Focus on the most important comparison aspects',
        'Use concise language for comparison criteria'
      ],
      errorId: `validation_criteria_length_${Date.now()}`
    };
  }
  
  // Validate result format length if provided
  if (resultFormat && resultFormat.length > 500) {
    return {
      message: 'Result format specification is too long. Please limit to 500 characters.',
      type: 'comparison_validation_error',
      severity: 'warning',
      shouldRetry: false,
      userActions: [
        'Reduce result format specification to under 500 characters',
        'Use simple format descriptions',
        'Focus on essential formatting requirements'
      ],
      errorId: `validation_format_length_${Date.now()}`
    };
  }
  
  console.log('[VALIDATION] Comparison analysis validation passed');
  return null; // No validation errors
}

function validateFiles(files) {
  const maxFiles = 5;
  const maxFileSize = 10 * 1024 * 1024; // 10MB in bytes
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'text/plain'];

  if (files.length > maxFiles) {
    return {
      message: `Too many files uploaded. Please limit to ${maxFiles} files.`,
      type: 'validation_error',
      severity: 'warning',
      shouldRetry: false,
      userActions: [
        `Select only the ${maxFiles} most important files`,
        'Combine multiple documents into a single PDF if possible'
      ],
      errorId: `validation_file_count_${Date.now()}`
    };
  }

  for (const file of files) {
    // Check file size (base64 encoded size approximation)
    const estimatedSize = (file.data.length * 3) / 4; // Base64 to bytes approximation
    if (estimatedSize > maxFileSize) {
      return {
        message: `File "${file.name}" is too large. Please use files smaller than 10MB.`,
        type: 'validation_error',
        severity: 'warning',
        shouldRetry: false,
        userActions: [
          'Compress the file to reduce its size',
          'Split large documents into smaller files',
          'Use a different file format if possible'
        ],
        errorId: `validation_file_size_${Date.now()}`
      };
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return {
        message: `File type "${file.type}" is not supported. Please use PDF, image, or text files.`,
        type: 'validation_error',
        severity: 'error',
        shouldRetry: false,
        userActions: [
          'Convert the file to PDF format',
          'Use supported file types: PDF, JPEG, PNG, GIF, or TXT',
          'Save the document in a different format'
        ],
        errorId: `validation_file_type_${Date.now()}`
      };
    }

    // Check for valid base64 data
    if (!file.data || typeof file.data !== 'string') {
      return {
        message: `File "${file.name}" appears to be corrupted. Please try uploading again.`,
        type: 'validation_error',
        severity: 'error',
        shouldRetry: true,
        userActions: [
          'Try uploading the file again',
          'Check if the file is corrupted',
          'Use a different file if the problem persists'
        ],
        errorId: `validation_file_data_${Date.now()}`
      };
    }

    // Validate base64 format
    if (!file.data.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
      return {
        message: `File "${file.name}" has invalid data format. Please try uploading again.`,
        type: 'validation_error',
        severity: 'error',
        shouldRetry: true,
        userActions: [
          'Try uploading the file again',
          'Ensure the file is not corrupted',
          'Try a different file format if the problem persists'
        ],
        errorId: `validation_file_base64_${Date.now()}`
      };
    }
  }

  return null; // No file validation errors
}

function createDualServiceFailureError(openaiError, geminiError) {
  const errorId = `dual_service_failure_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  
  // Analyze error types to provide specific guidance
  const openaiErrorType = categorizeError(openaiError);
  const geminiErrorType = categorizeError(geminiError);
  
  let userMessage = 'Both AI services are currently unavailable. ';
  let userActions = [];
  let severity = 'error';
  let shouldRetry = true;
  let retryAfter = 300; // 5 minutes default
  
  // Provide specific guidance based on error combinations
  if (openaiErrorType === 'rate_limit' && geminiErrorType === 'rate_limit') {
    userMessage += 'Both services are experiencing high demand.';
    userActions = [
      'Wait 10-15 minutes before trying again',
      'Try during off-peak hours for better availability',
      'Consider breaking large requests into smaller parts'
    ];
    retryAfter = 900; // 15 minutes
  } else if (openaiErrorType === 'auth' || geminiErrorType === 'auth') {
    userMessage += 'There is a service configuration issue.';
    userActions = [
      'Our technical team has been automatically notified',
      'Please try again in a few minutes',
      'Contact support if the issue persists beyond 30 minutes'
    ];
    severity = 'critical';
    retryAfter = 600; // 10 minutes
  } else if (openaiErrorType === 'network' && geminiErrorType === 'network') {
    userMessage += 'There appears to be a network connectivity issue.';
    userActions = [
      'Check your internet connection',
      'Try refreshing the page',
      'Wait a few minutes and try again'
    ];
    retryAfter = 120; // 2 minutes
  } else if (openaiErrorType === 'server' && geminiErrorType === 'server') {
    userMessage += 'Both AI services are experiencing technical difficulties.';
    userActions = [
      'This is likely a temporary issue',
      'Try again in 10-15 minutes',
      'Check our status page for service updates'
    ];
    retryAfter = 600; // 10 minutes
  } else {
    userMessage += 'Multiple service issues are preventing report generation.';
    userActions = [
      'Try again in a few minutes',
      'Simplify your request if the problem persists',
      'Contact support with the error ID if issues continue'
    ];
  }
  
  const error = new Error(userMessage);
  error.isDualServiceFailure = true;
  error.errorDetails = {
    message: userMessage,
    type: 'dual_service_failure',
    severity: severity,
    shouldRetry: shouldRetry,
    retryAfter: retryAfter,
    userActions: userActions,
    technicalDetails: {
      primary: `OpenAI (${openaiErrorType}): ${openaiError.message}`,
      backup: `Gemini (${geminiErrorType}): ${geminiError.message}`
    },
    errorId: errorId,
    timestamp: new Date().toISOString()
  };
  
  return error;
}

function categorizeError(error) {
  if (error.status === 429 || error.message?.includes('rate limit')) {
    return 'rate_limit';
  }
  if (error.status === 401 || error.status === 403 || error.message?.includes('authentication')) {
    return 'auth';
  }
  if (error.status >= 500 || error.message?.includes('server error')) {
    return 'server';
  }
  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET' || error.message?.includes('network')) {
    return 'network';
  }
  if (error.message?.includes('file')) {
    return 'file_processing';
  }
  return 'unknown';
}

function handleApiError(error) {
  const errorId = `api_error_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  
  // Handle dual-service failure errors
  if (error.isDualServiceFailure) {
    return {
      statusCode: 503,
      error: error.errorDetails
    };
  }
  
  // OpenAI API specific errors
  if (error.status || error.code) {
    return handleOpenAIError(error, errorId);
  }

  // File processing errors
  if (error.message && error.message.includes('file')) {
    return handleFileProcessingError(error, errorId);
  }

  // Network and timeout errors
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return {
      statusCode: 503,
      error: {
        message: 'Network connection error. Please check your internet connection and try again.',
        type: 'network_error',
        severity: 'error',
        shouldRetry: true,
        retryAfter: 30,
        userActions: [
          'Check your internet connection',
          'Try again in a few moments',
          'Contact support if the problem persists'
        ],
        technicalDetails: `Network error: ${error.code}`,
        errorId
      }
    };
  }

  // Generic server errors
  return {
    statusCode: 500,
    error: {
      message: 'An unexpected error occurred while generating your report. Please try again.',
      type: 'server_error',
      severity: 'error',
      shouldRetry: true,
      retryAfter: 60,
      userActions: [
        'Try generating the report again',
        'Simplify your input if the error persists',
        'Contact support if you continue to experience issues'
      ],
      technicalDetails: error.message || 'Unknown server error',
      errorId
    }
  };
}

function handleOpenAIError(error, errorId) {
  switch (error.status) {
    case 400:
      return {
        statusCode: 400,
        error: {
          message: 'Invalid request format. Please check your input and try again.',
          type: 'openai_bad_request',
          severity: 'error',
          shouldRetry: false,
          userActions: [
            'Check that your text input is properly formatted',
            'Ensure uploaded files are not corrupted',
            'Try with simpler input text'
          ],
          technicalDetails: error.message || 'Bad request to OpenAI API',
          errorId
        }
      };

    case 401:
      return {
        statusCode: 500,
        error: {
          message: 'Service authentication error. Our team has been notified.',
          type: 'openai_auth_error',
          severity: 'critical',
          shouldRetry: true,
          retryAfter: 300,
          userActions: [
            'Try again in a few minutes',
            'Contact support if the problem persists'
          ],
          technicalDetails: 'OpenAI API authentication failed',
          errorId
        }
      };

    case 429:
      return {
        statusCode: 429,
        error: {
          message: 'Service is experiencing high demand. Please wait a moment and try again.',
          type: 'openai_rate_limit',
          severity: 'warning',
          shouldRetry: true,
          retryAfter: 60,
          userActions: [
            'Wait 1-2 minutes before trying again',
            'Try during off-peak hours for faster response',
            'Consider simplifying your request'
          ],
          technicalDetails: 'OpenAI API rate limit exceeded',
          errorId
        }
      };

    case 500:
    case 502:
    case 503:
      return {
        statusCode: 503,
        error: {
          message: 'AI service is temporarily unavailable. Please try again in a few minutes.',
          type: 'openai_service_error',
          severity: 'error',
          shouldRetry: true,
          retryAfter: 120,
          userActions: [
            'Wait a few minutes and try again',
            'Check service status if available',
            'Contact support if the issue persists'
          ],
          technicalDetails: `OpenAI API server error: ${error.status}`,
          errorId
        }
      };

    default:
      return {
        statusCode: 500,
        error: {
          message: 'AI service error. Please try again or contact support.',
          type: 'openai_unknown_error',
          severity: 'error',
          shouldRetry: true,
          retryAfter: 60,
          userActions: [
            'Try again with the same input',
            'Simplify your request if the error persists',
            'Contact support with the error ID'
          ],
          technicalDetails: `OpenAI API error: ${error.status} - ${error.message}`,
          errorId
        }
      };
  }
}

function handleFileProcessingError(error, errorId) {
  if (error.message.includes('PDF')) {
    return {
      statusCode: 400,
      error: {
        message: 'Unable to process the PDF file. Please ensure it\'s not password-protected or corrupted.',
        type: 'file_processing_error',
        severity: 'error',
        shouldRetry: true,
        userActions: [
          'Try uploading a different PDF file',
          'Ensure the PDF is not password-protected',
          'Convert the PDF to images if the problem persists'
        ],
        technicalDetails: error.message,
        errorId
      }
    };
  }

  if (error.message.includes('image')) {
    return {
      statusCode: 400,
      error: {
        message: 'Unable to process the image file. Please try a different image format.',
        type: 'file_processing_error',
        severity: 'error',
        shouldRetry: true,
        userActions: [
          'Try uploading the image in JPEG or PNG format',
          'Ensure the image file is not corrupted',
          'Reduce the image size if it\'s very large'
        ],
        technicalDetails: error.message,
        errorId
      }
    };
  }

  return {
    statusCode: 400,
    error: {
      message: 'Unable to process one or more uploaded files. Please check the files and try again.',
      type: 'file_processing_error',
      severity: 'error',
      shouldRetry: true,
      userActions: [
        'Check that all uploaded files are valid',
        'Try uploading files one at a time to identify the problematic file',
        'Use supported file formats: PDF, JPEG, PNG, GIF, TXT'
      ],
      technicalDetails: error.message,
      errorId
    }
  };
}

function getSystemMessage(reportType) {
  const systemMessages = {
    jp_investment_4part: 'あなたは経験豊富な不動産投資の専門家です。添付されたPDFファイルや画像を詳細に分析し、プロフェッショナルな投資分析レポートを作成してください。ファイルから抽出された数値データ（FCR、DCR、BER、IRR、NPV等）を正確に読み取り、具体的な投資判断の根拠を示してください。画像やPDFに含まれる表、グラフ、数値を詳細に分析し、実用的な投資レポートを作成してください。',
    jp_tax_strategy: 'あなたは日本の税制に精通したタックスアドバイザーです。添付されたPDFや画像から不動産投資による税務戦略を専門的に分析し、具体的な節税効果を数値で示してください。ファイルに含まれる財務データを詳細に読み取り、税務上のメリットを定量的に分析してください。',
    jp_inheritance_strategy: 'あなたは相続対策の専門家です。添付されたファイルから不動産投資による相続税対策の効果を詳細に分析し、具体的な節税効果を示してください。PDFや画像に含まれる資産情報、評価額、税務データを正確に読み取り、相続対策の効果を定量的に示してください。',
    comparison_analysis: 'あなたは不動産投資の専門家です。添付されたPDFファイルや画像から複数の物件情報を詳細に読み取り、比較分析を行ってください。各物件の投資指標、財務データ、物件情報を正確に抽出し、投資判断に必要な詳細で実践的な比較レポートを作成してください。',
    custom: 'あなたは経験豊富な投資アドバイザーです。添付されたPDFや画像の内容を詳細に分析し、提供された要件に基づいて専門的で実践的なレポートを作成してください。ファイルに含まれる数値データ、表、グラフを正確に読み取り、具体的な分析結果を示してください。'
  };
  
  return systemMessages[reportType] || systemMessages.jp_investment_4part;
}

function getReportTitle(reportType) {
  const titles = {
    jp_investment_4part: '投資分析レポート（4部構成）',
    jp_tax_strategy: '税務戦略レポート（減価償却活用）',
    jp_inheritance_strategy: '相続対策戦略レポート',
    comparison_analysis: '比較分析レポート',
    custom: 'カスタムレポート'
  };
  
  return titles[reportType] || 'レポート';
}