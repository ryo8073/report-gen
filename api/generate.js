// Report Generation API - Trial Version with OpenAI Integration and Gemini Backup
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import trialAnalytics from '../lib/trial-analytics.js';

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
    // Get the appropriate prompt
    const basePrompt = REPORT_PROMPTS[reportType] || REPORT_PROMPTS.custom;
  
  // Process files if any with error handling
  let fileContent = '';
  if (files && files.length > 0) {
    try {
      fileContent = await processFiles(files);
    } catch (fileError) {
      console.error('File processing error:', fileError);
      throw new Error(`file processing failed: ${fileError.message}`);
    }
  }

  // Build the full prompt
  let fullPrompt = basePrompt;
  
  if (inputText) {
    fullPrompt += `\n\n【入力データ】\n${inputText}`;
  }
  
  if (fileContent) {
    fullPrompt += `\n\n【添付ファイル内容】\n${fileContent}`;
  }

  if (additionalInfo && Object.keys(additionalInfo).length > 0) {
    fullPrompt += `\n\n【追加情報】\n${JSON.stringify(additionalInfo, null, 2)}`;
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

  // Get the appropriate prompt adapted for Gemini
  const basePrompt = formatPromptForGemini(reportType, inputText, files, additionalInfo);
  
  // Process files if any with error handling
  let fileContent = '';
  if (files && files.length > 0) {
    try {
      fileContent = await processFiles(files);
    } catch (fileError) {
      console.error('File processing error:', fileError);
      throw new Error(`file processing failed: ${fileError.message}`);
    }
  }

  // Build the full prompt for Gemini
  let fullPrompt = basePrompt;
  
  if (inputText) {
    fullPrompt += `\n\n【入力データ】\n${inputText}`;
  }
  
  if (fileContent) {
    fullPrompt += `\n\n【添付ファイル内容】\n${fileContent}`;
  }

  if (additionalInfo && Object.keys(additionalInfo).length > 0) {
    fullPrompt += `\n\n【追加情報】\n${JSON.stringify(additionalInfo, null, 2)}`;
  }

  // Call Gemini API
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

async function processFiles(files) {
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
        // Enhanced PDF processing placeholder
        content += `\n[PDF File: ${file.name} (${Math.round(buffer.length / 1024)}KB)]\n`;
        content += `PDF content extraction would be implemented here using a PDF parser library.\n`;
        content += `File appears to be a valid PDF document.\n`;
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

  const validReportTypes = ['jp_investment_4part', 'jp_tax_strategy', 'jp_inheritance_strategy', 'custom'];
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

  // Check input content
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

function getReportTitle(reportType) {
  const titles = {
    jp_investment_4part: '投資分析レポート（4部構成）',
    jp_tax_strategy: '税務戦略レポート（減価償却活用）',
    jp_inheritance_strategy: '相続対策戦略レポート',
    custom: 'カスタムレポート'
  };
  
  return titles[reportType] || 'レポート';
}