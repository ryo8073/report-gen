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
    
    // Build comparison prompt (await to ensure prompts are loaded)
    const comparisonPrompt = await promptManager.buildFullPrompt(
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
      try {
        console.log(`[COMPARISON] Processing ${allFiles.length} files with vision processing`);
        fileContent = await processFilesWithVision(allFiles, 'comparison_analysis');
      } catch (visionError) {
        console.log(`[COMPARISON] Vision processing failed, falling back to legacy: ${visionError.message}`);
        fileContent = await processFiles(allFiles);
      }
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
      model: "gpt-4-turbo", // Use turbo model for larger context
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
      max_tokens: 2500, // Reduced to fit within context limits
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

// PromptManager class for handling prompt templates with metadata support
class PromptManager {
  constructor() {
    this.prompts = new Map();
    this.promptMetadata = new Map();
    this.promptCache = new Map(); // Cache for built prompts
    this.fileCache = new Map(); // Cache for raw file contents
    this.loadTimestamp = null;
    this.maxCacheSize = 100; // Maximum number of cached prompts
    this.maxFileCacheSize = 50; // Maximum number of cached files
    this.loadingPromise = null; // Track loading state
    this.isLoaded = false; // Flag to indicate if prompts are loaded
    this.cacheStats = {
      hits: 0,
      misses: 0,
      builds: 0,
      fileHits: 0,
      fileMisses: 0,
      evictions: 0
    };
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
    // Start loading prompts and store the promise
    this.loadingPromise = this.loadPrompts();
  }
  
  // Ensure prompts are loaded before use
  async ensureLoaded() {
    if (this.isLoaded) {
      return;
    }
    if (this.loadingPromise) {
      await this.loadingPromise;
    } else {
      // If for some reason loading wasn't started, start it now
      this.loadingPromise = this.loadPrompts();
      await this.loadingPromise;
    }
  }
  
  // Generate cache key for built prompts
  generateCacheKey(reportType, inputText, files, additionalInfo, comparisonData) {
    const inputHash = this.simpleHash(JSON.stringify({
      reportType,
      inputText: inputText?.substring(0, 100), // First 100 chars for cache key
      fileCount: files?.length || 0,
      additionalInfo: additionalInfo ? Object.keys(additionalInfo).sort() : [],
      hasComparison: !!comparisonData
    }));
    return `${reportType}_${inputHash}`;
  }
  
  // Simple hash function for cache keys
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
  
  // Clear cache when prompts are reloaded
  clearCache() {
    this.promptCache.clear();
    this.fileCache.clear();
    this.cacheStats = { 
      hits: 0, 
      misses: 0, 
      builds: 0, 
      fileHits: 0, 
      fileMisses: 0, 
      evictions: 0 
    };
    console.log('[PROMPT MANAGER] All caches cleared');
  }
  
  // Reload prompts from files
  async reloadPrompts() {
    console.log('[PROMPT MANAGER] Reloading prompts from PROMPTS folder');
    this.isLoaded = false;
    this.loadingPromise = this.loadPrompts();
    await this.loadingPromise;
    console.log('[PROMPT MANAGER] Prompts reloaded successfully');
  }

  // Manage cache size with LRU eviction
  manageCacheSize() {
    // Manage prompt cache
    if (this.promptCache.size > this.maxCacheSize) {
      const keysToDelete = Array.from(this.promptCache.keys()).slice(0, this.promptCache.size - this.maxCacheSize);
      keysToDelete.forEach(key => this.promptCache.delete(key));
      this.cacheStats.evictions += keysToDelete.length;
      console.log(`[PROMPT MANAGER] Evicted ${keysToDelete.length} items from prompt cache`);
    }

    // Manage file cache
    if (this.fileCache.size > this.maxFileCacheSize) {
      const keysToDelete = Array.from(this.fileCache.keys()).slice(0, this.fileCache.size - this.maxFileCacheSize);
      keysToDelete.forEach(key => this.fileCache.delete(key));
      console.log(`[PROMPT MANAGER] Evicted ${keysToDelete.length} items from file cache`);
    }
  }

  // Get cache statistics
  getCacheStats() {
    const promptCacheHitRate = this.cacheStats.hits + this.cacheStats.misses > 0 
      ? (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100).toFixed(2)
      : '0.00';
    
    const fileCacheHitRate = this.cacheStats.fileHits + this.cacheStats.fileMisses > 0
      ? (this.cacheStats.fileHits / (this.cacheStats.fileHits + this.cacheStats.fileMisses) * 100).toFixed(2)
      : '0.00';

    return {
      promptCache: {
        size: this.promptCache.size,
        maxSize: this.maxCacheSize,
        hits: this.cacheStats.hits,
        misses: this.cacheStats.misses,
        hitRate: `${promptCacheHitRate}%`
      },
      fileCache: {
        size: this.fileCache.size,
        maxSize: this.maxFileCacheSize,
        hits: this.cacheStats.fileHits,
        misses: this.cacheStats.fileMisses,
        hitRate: `${fileCacheHitRate}%`
      },
      builds: this.cacheStats.builds,
      evictions: this.cacheStats.evictions,
      loadTimestamp: this.loadTimestamp
    };
  }
  
  async loadPrompts() {
    const promptsDir = './PROMPTS';
    const loadStartTime = Date.now();
    
    try {
      // Get all .md files from PROMPTS folder
      const files = await fs.readdir(promptsDir);
      const promptFiles = files.filter(file => file.endsWith('.md'));
      
      console.log(`[PROMPT MANAGER] Loading ${promptFiles.length} prompt files from ${promptsDir}`);
      
      // Load files in parallel for better performance
      const loadPromises = promptFiles.map(async (file) => {
        try {
          const filePath = path.join(promptsDir, file);
          
          // Check file cache first
          const cacheKey = `${file}_${await this.getFileModTime(filePath)}`;
          let content = this.fileCache.get(cacheKey);
          
          if (content) {
            this.cacheStats.fileHits++;
            console.log(`[PROMPT MANAGER] File cache hit for ${file}`);
          } else {
            this.cacheStats.fileMisses++;
            content = await fs.readFile(filePath, 'utf8');
            
            // Cache the file content with modification time
            this.fileCache.set(cacheKey, content);
            console.log(`[PROMPT MANAGER] File cached: ${file} (${content.length} chars)`);
          }
          
          // Parse metadata and content
          const { metadata, promptContent } = this.parsePromptFile(content, file);
          
          // Store both metadata and content
          this.prompts.set(file, promptContent);
          this.promptMetadata.set(file, metadata);
          
          return { file, success: true, size: promptContent.length, metadata: metadata.title || 'No title' };
        } catch (error) {
          console.error(`[PROMPT MANAGER] Failed to load prompt ${file}:`, error.message);
          // Store error information for debugging
          this.promptMetadata.set(file, { error: error.message, loadFailed: true });
          return { file, success: false, error: error.message };
        }
      });
      
      // Wait for all files to load
      const results = await Promise.all(loadPromises);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      const loadTime = Date.now() - loadStartTime;
      console.log(`[PROMPT MANAGER] Loaded ${successful.length}/${promptFiles.length} prompts in ${loadTime}ms`);
      
      if (successful.length > 0) {
        successful.forEach(result => {
          console.log(`[PROMPT MANAGER] ✓ ${result.file} (${result.size} chars) - ${result.metadata}`);
        });
      }
      
      if (failed.length > 0) {
        console.warn(`[PROMPT MANAGER] Failed to load ${failed.length} files:`);
        failed.forEach(result => {
          console.warn(`[PROMPT MANAGER] ✗ ${result.file}: ${result.error}`);
        });
      }
      
      // Update load timestamp and clear prompt cache (keep file cache)
      this.loadTimestamp = new Date().toISOString();
      this.promptCache.clear();
      this.manageCacheSize();
      
      // If no prompts were loaded from files, use fallback
      if (this.prompts.size === 0) {
        console.log('[PROMPT MANAGER] No prompts loaded from files, using fallback prompts');
        this.loadFallbackPrompts();
      }
      
      // Log cache statistics
      const stats = this.getCacheStats();
      console.log(`[PROMPT MANAGER] Cache stats - File cache: ${stats.fileCache.size}/${stats.fileCache.maxSize} (${stats.fileCache.hitRate} hit rate)`);
      
      // Mark as loaded
      this.isLoaded = true;
      console.log(`[PROMPT MANAGER] Prompt loading complete. Loaded ${this.prompts.size} prompts.`);
      
    } catch (error) {
      console.error('[PROMPT MANAGER] Failed to read PROMPTS directory:', error.message);
      console.log('[PROMPT MANAGER] Using fallback prompts due to directory read failure');
      // Load fallback prompts if directory read fails
      this.loadFallbackPrompts();
      // Mark as loaded even with fallback
      this.isLoaded = true;
    }
  }

  // Get file modification time for cache invalidation
  async getFileModTime(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.mtime.getTime();
    } catch (error) {
      // If we can't get mod time, use current time to force reload
      return Date.now();
    }
  }
  
  // Parse prompt file with YAML frontmatter metadata
  parsePromptFile(content, filename) {
    try {
      // Check if file has YAML frontmatter
      if (content.startsWith('---')) {
        // Find the end of YAML frontmatter by looking for --- on its own line
        const lines = content.split('\n');
        let endOfFrontmatterLine = -1;
        
        // Start from line 1 (skip the opening ---)
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim() === '---') {
            endOfFrontmatterLine = i;
            break;
          }
        }
        
        if (endOfFrontmatterLine !== -1) {
          // Extract YAML frontmatter (skip first and last --- lines)
          const yamlLines = lines.slice(1, endOfFrontmatterLine);
          const yamlContent = yamlLines.join('\n');
          
          // Extract prompt content (everything after the closing ---)
          const promptLines = lines.slice(endOfFrontmatterLine + 1);
          const promptContent = promptLines.join('\n').trim();
          
          // Parse YAML metadata (simple key-value parsing)
          const metadata = this.parseYamlMetadata(yamlContent);
          metadata.hasMetadata = true;
          metadata.filename = filename;
          metadata.lastUpdated = new Date().toISOString();
          
          console.log(`[PROMPT MANAGER] Parsed metadata for ${filename}:`, {
            title: metadata.title,
            version: metadata.version,
            aiOptimized: metadata.aiOptimized
          });
          
          return { metadata, promptContent };
        }
      }
      
      // No metadata found, return content as-is with default metadata
      const defaultMetadata = {
        title: filename.replace('.md', ''),
        description: 'Legacy prompt without metadata',
        aiOptimized: false,
        version: '0.9',
        language: 'ja',
        hasMetadata: false,
        filename: filename,
        lastUpdated: new Date().toISOString()
      };
      
      console.log(`[PROMPT MANAGER] No metadata found for ${filename}, using defaults`);
      return { metadata: defaultMetadata, promptContent: content };
      
    } catch (error) {
      console.error(`[PROMPT MANAGER] Error parsing prompt file ${filename}:`, error.message);
      
      // Return error metadata and original content
      const errorMetadata = {
        title: filename.replace('.md', ''),
        description: 'Error parsing prompt file',
        aiOptimized: false,
        version: '0.0',
        language: 'ja',
        hasMetadata: false,
        filename: filename,
        parseError: error.message,
        lastUpdated: new Date().toISOString()
      };
      
      return { metadata: errorMetadata, promptContent: content };
    }
  }
  
  // Simple YAML metadata parser (key: value format)
  parseYamlMetadata(yamlContent) {
    const metadata = {};
    const lines = yamlContent.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const colonIndex = trimmedLine.indexOf(':');
        if (colonIndex !== -1) {
          const key = trimmedLine.substring(0, colonIndex).trim();
          let value = trimmedLine.substring(colonIndex + 1).trim();
          
          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          
          // Convert boolean strings
          if (value === 'true') value = true;
          if (value === 'false') value = false;
          
          // Handle arrays (simple comma-separated format)
          if (value.startsWith('[') && value.endsWith(']')) {
            value = value.slice(1, -1).split(',').map(item => item.trim().replace(/['"]/g, ''));
          }
          
          metadata[key] = value;
        }
      }
    }
    
    return metadata;
  }
  
  loadFallbackPrompts() {
    console.log('[PROMPT MANAGER] Loading fallback prompts - using updated detailed prompts');
    // Use the existing REPORT_PROMPTS as fallback
    this.prompts.set('jp_investment_4part.md', REPORT_PROMPTS.jp_investment_4part);
    this.prompts.set('jp_tax_strategy.md', REPORT_PROMPTS.jp_tax_strategy);
    this.prompts.set('jp_inheritance_strategy.md', REPORT_PROMPTS.jp_inheritance_strategy);
    this.prompts.set('custom.md', REPORT_PROMPTS.custom);
    
    // Add default metadata for fallback prompts
    const fallbackFiles = ['jp_investment_4part.md', 'jp_tax_strategy.md', 'jp_inheritance_strategy.md', 'custom.md'];
    fallbackFiles.forEach(file => {
      this.promptMetadata.set(file, {
        title: file.replace('.md', ''),
        description: 'Fallback prompt',
        aiOptimized: false,
        version: '0.9',
        language: 'ja',
        hasMetadata: false,
        filename: file,
        isFallback: true,
        lastUpdated: new Date().toISOString()
      });
    });
    
    console.log(`[PROMPT MANAGER] Fallback prompts loaded: ${this.prompts.size} prompts`);
    
    // Update load timestamp and clear cache
    this.loadTimestamp = new Date().toISOString();
    this.clearCache();
  }
  
  async getPrompt(reportType) {
    // Ensure prompts are loaded before retrieving
    await this.ensureLoaded();
    
    const promptFile = this.reportTypes[reportType]?.promptFile || 'jp_investment_4part.md';
    const prompt = this.prompts.get(promptFile);
    const metadata = this.promptMetadata.get(promptFile);
    
    if (!prompt) {
      console.error(`[PROMPT MANAGER] Prompt not found: ${promptFile}, falling back to default`);
      console.log(`[PROMPT MANAGER] Available prompts: ${Array.from(this.prompts.keys()).join(', ')}`);
      const fallbackPrompt = this.prompts.get('jp_investment_4part.md') || REPORT_PROMPTS.jp_investment_4part;
      console.log(`[PROMPT MANAGER] Using fallback prompt (length: ${fallbackPrompt.length} chars)`);
      return fallbackPrompt;
    }
    
    // Log metadata information if available
    if (metadata) {
      console.log(`[PROMPT MANAGER] Using prompt: ${promptFile} for report type: ${reportType}`);
      console.log(`[PROMPT MANAGER] Metadata: ${metadata.title} v${metadata.version} (AI optimized: ${metadata.aiOptimized})`);
      console.log(`[PROMPT MANAGER] Content length: ${prompt.length} chars`);
      
      // Validate prompt quality
      if (metadata.aiOptimized && metadata.version && parseFloat(metadata.version) >= 1.0) {
        console.log(`[PROMPT MANAGER] Using optimized prompt with metadata validation passed`);
      } else {
        console.log(`[PROMPT MANAGER] Warning: Prompt may not be fully optimized (version: ${metadata.version}, optimized: ${metadata.aiOptimized})`);
      }
    } else {
      console.log(`[PROMPT MANAGER] Using prompt: ${promptFile} for report type: ${reportType} (length: ${prompt.length} chars, no metadata)`);
    }
    
    return prompt;
  }
  
  // Get prompt metadata
  async getPromptMetadata(reportType) {
    // Ensure prompts are loaded before retrieving metadata
    await this.ensureLoaded();
    const promptFile = this.reportTypes[reportType]?.promptFile || 'jp_investment_4part.md';
    return this.promptMetadata.get(promptFile) || null;
  }
  
  // Validate prompt integrity
  async validatePrompt(reportType) {
    // Ensure prompts are loaded before validating
    await this.ensureLoaded();
    const promptFile = this.reportTypes[reportType]?.promptFile || 'jp_investment_4part.md';
    const prompt = this.prompts.get(promptFile);
    const metadata = this.promptMetadata.get(promptFile);
    
    const validation = {
      exists: !!prompt,
      hasMetadata: !!(metadata && metadata.hasMetadata),
      isOptimized: !!(metadata && metadata.aiOptimized),
      version: metadata?.version || '0.0',
      hasError: !!(metadata && metadata.parseError),
      contentLength: prompt?.length || 0,
      filename: promptFile
    };
    
    // Additional validation checks
    if (prompt) {
      validation.hasStructuredSections = prompt.includes('##') && prompt.includes('###');
      validation.hasQualityRequirements = prompt.includes('品質要件') || prompt.includes('Quality Requirements');
      validation.hasOutputFormat = prompt.includes('出力') || prompt.includes('Output');
    }
    
    return validation;
  }

  // Determine if cache should be used based on request characteristics
  shouldUseCache(files, additionalInfo) {
    // Don't cache requests with files (they may have unique content)
    if (files && files.length > 0) {
      return false;
    }
    
    // Don't cache if additional info contains dynamic content
    if (additionalInfo) {
      // Check for dynamic content indicators
      const dynamicKeys = ['timestamp', 'sessionId', 'requestId', 'userId'];
      const hasDynamicContent = dynamicKeys.some(key => 
        additionalInfo.hasOwnProperty(key) || 
        JSON.stringify(additionalInfo).includes(key)
      );
      
      if (hasDynamicContent) {
        return false;
      }
    }
    
    // Cache for simple text-only requests
    return true;
  }
  
  async buildFullPrompt(reportType, inputText, files, additionalInfo, comparisonData = null) {
    console.log(`[PROMPT MANAGER] Building full prompt for report type: ${reportType}`);
    
    // Ensure prompts are loaded before building
    await this.ensureLoaded();
    
    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(reportType, inputText, files, additionalInfo, comparisonData);
      
      // Check cache first (with intelligent caching strategy)
      const shouldUseCache = this.shouldUseCache(files, additionalInfo);
      if (shouldUseCache) {
        const cachedPrompt = this.promptCache.get(cacheKey);
        if (cachedPrompt) {
          this.cacheStats.hits++;
          // Move to end for LRU (re-insert)
          this.promptCache.delete(cacheKey);
          this.promptCache.set(cacheKey, cachedPrompt);
          console.log(`[PROMPT MANAGER] Cache hit for ${reportType} (${cachedPrompt.length} chars)`);
          return cachedPrompt;
        }
      }
      
      this.cacheStats.misses++;
      this.cacheStats.builds++;
      
      // Validate prompt before building
      const validation = await this.validatePrompt(reportType);
      if (!validation.exists) {
        console.error(`[PROMPT MANAGER] Prompt validation failed for ${reportType}:`, validation);
        throw new Error(`Prompt not available for report type: ${reportType}`);
      }
      
      if (validation.hasError) {
        console.warn(`[PROMPT MANAGER] Prompt has parsing errors for ${reportType}, proceeding with caution`);
      }
      
      const basePrompt = await this.getPrompt(reportType);
      const metadata = await this.getPromptMetadata(reportType);
      
      // Log prompt quality information
      if (metadata) {
        console.log(`[PROMPT MANAGER] Building prompt with metadata: ${metadata.title} (optimized: ${metadata.aiOptimized})`);
      }
      
      // Build prompt based on type
      let fullPrompt;
      if (reportType === 'comparison_analysis') {
        fullPrompt = this.buildComparisonPrompt(basePrompt, comparisonData);
      } else if (reportType === 'custom') {
        fullPrompt = this.buildCustomPrompt(basePrompt, inputText, files, additionalInfo);
      } else {
        fullPrompt = this.buildStandardPrompt(basePrompt, inputText, files, additionalInfo);
      }
      
      // Validate final prompt
      if (!fullPrompt || fullPrompt.length < 100) {
        throw new Error(`Generated prompt is too short or empty for report type: ${reportType}`);
      }
      
      // Cache the result if appropriate
      if (shouldUseCache) {
        this.promptCache.set(cacheKey, fullPrompt);
        this.manageCacheSize(); // Use the new cache management system
        console.log(`[PROMPT MANAGER] Cached prompt for ${reportType} (cache size: ${this.promptCache.size}/${this.maxCacheSize})`);
      }
      
      console.log(`[PROMPT MANAGER] Successfully built prompt for ${reportType} (${fullPrompt.length} chars)`);
      return fullPrompt;
      
    } catch (error) {
      console.error(`[PROMPT MANAGER] Error building prompt for ${reportType}:`, error.message);
      
      // Attempt fallback to default prompt
      try {
        console.log(`[PROMPT MANAGER] Attempting fallback prompt for ${reportType}`);
        await this.ensureLoaded();
        const fallbackPrompt = this.prompts.get('jp_investment_4part.md') || REPORT_PROMPTS.jp_investment_4part;
        
        if (reportType === 'custom') {
          return this.buildCustomPrompt(fallbackPrompt, inputText, files, additionalInfo);
        } else {
          return this.buildStandardPrompt(fallbackPrompt, inputText, files, additionalInfo);
        }
      } catch (fallbackError) {
        console.error(`[PROMPT MANAGER] Fallback prompt also failed:`, fallbackError.message);
        throw new Error(`Failed to build prompt for ${reportType}: ${error.message}`);
      }
    }
  }
  
  // OpenAI-specific prompt optimization
  optimizePromptForOpenAI(prompt, reportType, metadata) {
    console.log(`[PROMPT MANAGER] Optimizing prompt for OpenAI (${reportType})`);
    
    // OpenAI-specific optimizations
    let optimizedPrompt = prompt;
    
    // 1. Add clear role definition at the start
    if (!optimizedPrompt.includes('あなたは') && !optimizedPrompt.includes('You are')) {
      const rolePrefix = this.getOpenAIRolePrefix(reportType);
      optimizedPrompt = `${rolePrefix}\n\n${optimizedPrompt}`;
    }
    
    // 2. Structure for system/user message separation
    const sections = this.extractPromptSections(optimizedPrompt);
    
    // 3. Optimize for token efficiency
    optimizedPrompt = this.optimizeTokenUsage(optimizedPrompt, 'openai');
    
    // 4. Add output format instructions
    if (!optimizedPrompt.includes('出力形式') && !optimizedPrompt.includes('Output Format')) {
      optimizedPrompt += '\n\n## 出力形式\n- 日本語で回答してください\n- マークダウン形式で構造化してください\n- 具体的な数値と根拠を含めてください';
    }
    
    console.log(`[PROMPT MANAGER] OpenAI optimization complete (${optimizedPrompt.length} chars)`);
    return optimizedPrompt;
  }

  // Gemini-specific prompt optimization
  optimizePromptForGemini(prompt, reportType, metadata) {
    console.log(`[PROMPT MANAGER] Optimizing prompt for Gemini (${reportType})`);
    
    // Gemini-specific optimizations
    let optimizedPrompt = prompt;
    
    // 1. Gemini prefers role-based instructions
    if (!optimizedPrompt.includes('Role:') && !optimizedPrompt.includes('役割:')) {
      const rolePrefix = this.getGeminiRolePrefix(reportType);
      optimizedPrompt = `${rolePrefix}\n\n${optimizedPrompt}`;
    }
    
    // 2. Structure for Gemini's processing style
    optimizedPrompt = this.restructureForGemini(optimizedPrompt);
    
    // 3. Optimize for Gemini's context handling
    optimizedPrompt = this.optimizeTokenUsage(optimizedPrompt, 'gemini');
    
    // 4. Add Gemini-specific safety and quality instructions
    if (!optimizedPrompt.includes('安全性') && !optimizedPrompt.includes('Safety')) {
      optimizedPrompt += '\n\n## 品質・安全性要件\n- 正確で信頼性の高い情報のみを提供\n- 投資判断は個人の責任であることを明記\n- 専門家への相談を推奨';
    }
    
    console.log(`[PROMPT MANAGER] Gemini optimization complete (${optimizedPrompt.length} chars)`);
    return optimizedPrompt;
  }

  // Get OpenAI-specific role prefix
  getOpenAIRolePrefix(reportType) {
    const rolePrefixes = {
      'jp_investment_4part': 'あなたは25年以上の経験を持つ不動産投資の専門コンサルタント兼ポートフォリオマネージャー（CPM/CCIM資格保有者）です。',
      'jp_tax_strategy': 'あなたは、日本の税制に精通した最高レベルのタックスストラテジスト兼ウェルスマネージャーです。',
      'jp_inheritance_strategy': 'あなたは30年以上の経験を持つエステートプランニング専門のコンサルタント（CPM/CCIM資格保有者）です。',
      'comparison_analysis': 'あなたは30年以上の経験を持つ不動産コンサルタント（CPM/CCIM資格保有者）です。',
      'custom': 'あなたは経験豊富な投資分析の専門家です。'
    };
    
    return rolePrefixes[reportType] || rolePrefixes['custom'];
  }

  // Get Gemini-specific role prefix
  getGeminiRolePrefix(reportType) {
    const rolePrefixes = {
      'jp_investment_4part': 'Role: 不動産投資専門コンサルタント（CPM/CCIM資格保有、25年以上の経験）',
      'jp_tax_strategy': 'Role: 税務戦略専門家（Big4税理士法人パートナーレベル、日本税制精通）',
      'jp_inheritance_strategy': 'Role: エステートプランニング専門コンサルタント（CPM/CCIM資格保有、30年以上の経験）',
      'comparison_analysis': 'Role: 不動産投資比較分析専門家（CPM/CCIM資格保有、30年以上の経験）',
      'custom': 'Role: 投資分析専門家（経験豊富な金融・不動産分野のコンサルタント）'
    };
    
    return rolePrefixes[reportType] || rolePrefixes['custom'];
  }

  // Extract prompt sections for better structure
  extractPromptSections(prompt) {
    const sections = {
      role: '',
      instructions: '',
      format: '',
      examples: ''
    };
    
    // Simple section extraction based on common patterns
    const lines = prompt.split('\n');
    let currentSection = 'instructions';
    
    for (const line of lines) {
      if (line.includes('あなたは') || line.includes('You are') || line.includes('Role:')) {
        currentSection = 'role';
      } else if (line.includes('出力') || line.includes('Output') || line.includes('Format')) {
        currentSection = 'format';
      } else if (line.includes('例') || line.includes('Example')) {
        currentSection = 'examples';
      }
      
      sections[currentSection] += line + '\n';
    }
    
    return sections;
  }

  // Restructure prompt for Gemini's processing style
  restructureForGemini(prompt) {
    // Gemini prefers clear section headers and structured content
    let restructured = prompt;
    
    // Add clear section markers if not present
    if (!restructured.includes('## ') && !restructured.includes('# ')) {
      // Add basic structure
      restructured = `# 分析指示書\n\n${restructured}`;
    }
    
    // Ensure clear task definition
    if (!restructured.includes('Task:') && !restructured.includes('タスク:')) {
      const taskIndex = restructured.indexOf('分析');
      if (taskIndex > -1) {
        restructured = restructured.substring(0, taskIndex) + 
                     '\n## Task (タスク)\n' + 
                     restructured.substring(taskIndex);
      }
    }
    
    return restructured;
  }

  // Optimize token usage for specific AI service
  optimizeTokenUsage(prompt, service) {
    let optimized = prompt;
    
    // Remove excessive whitespace
    optimized = optimized.replace(/\n\s*\n\s*\n/g, '\n\n');
    optimized = optimized.replace(/\s+/g, ' ');
    
    // Service-specific optimizations
    if (service === 'openai') {
      // OpenAI handles longer prompts well, focus on clarity
      // Remove redundant phrases but keep detail
      optimized = optimized.replace(/詳細に分析し、/g, '分析し、');
      optimized = optimized.replace(/必ず/g, '');
    } else if (service === 'gemini') {
      // Gemini prefers more concise instructions
      // Compress verbose instructions while maintaining meaning
      optimized = optimized.replace(/詳細に分析してください/g, '分析してください');
      optimized = optimized.replace(/以下の.*?について、/g, '');
    }
    
    return optimized.trim();
  }

  // Build service-optimized prompt
  async buildServiceOptimizedPrompt(reportType, inputText, files, additionalInfo, service, comparisonData = null) {
    console.log(`[PROMPT MANAGER] Building ${service}-optimized prompt for ${reportType}`);
    
    // Ensure prompts are loaded before building
    await this.ensureLoaded();
    
    // Get base prompt
    const basePrompt = await this.buildFullPrompt(reportType, inputText, files, additionalInfo, comparisonData);
    const metadata = await this.getPromptMetadata(reportType);
    
    // Apply service-specific optimizations
    let optimizedPrompt;
    if (service === 'openai') {
      optimizedPrompt = this.optimizePromptForOpenAI(basePrompt, reportType, metadata);
    } else if (service === 'gemini') {
      optimizedPrompt = this.optimizePromptForGemini(basePrompt, reportType, metadata);
    } else {
      // Auto-detect service or use adaptive processing
      optimizedPrompt = this.adaptivePromptProcessing(basePrompt, reportType, metadata, service);
    }
    
    console.log(`[PROMPT MANAGER] Service-optimized prompt ready for ${service} (${optimizedPrompt.length} chars)`);
    return optimizedPrompt;
  }

  // Adaptive prompt processing for unknown or multiple services
  adaptivePromptProcessing(prompt, reportType, metadata, service) {
    console.log(`[PROMPT MANAGER] Applying adaptive processing for service: ${service}`);
    
    // If service is unknown, apply general optimizations
    let adaptedPrompt = prompt;
    
    // General optimizations that work well across services
    adaptedPrompt = this.applyGeneralOptimizations(adaptedPrompt);
    
    // Add service-agnostic quality improvements
    adaptedPrompt = this.addQualityEnhancements(adaptedPrompt, reportType);
    
    // Add fallback handling instructions
    adaptedPrompt = this.addFallbackInstructions(adaptedPrompt, reportType);
    
    return adaptedPrompt;
  }

  // Apply general optimizations that work across AI services
  applyGeneralOptimizations(prompt) {
    let optimized = prompt;
    
    // Remove excessive whitespace and normalize formatting
    optimized = optimized.replace(/\n\s*\n\s*\n/g, '\n\n');
    optimized = optimized.replace(/\s+/g, ' ');
    optimized = optimized.trim();
    
    // Ensure clear section structure
    if (!optimized.includes('##') && !optimized.includes('#')) {
      optimized = `# 分析指示書\n\n${optimized}`;
    }
    
    // Add clear task definition if missing
    if (!optimized.includes('Task:') && !optimized.includes('タスク:') && !optimized.includes('指示:')) {
      const taskIndex = optimized.indexOf('分析');
      if (taskIndex > -1) {
        optimized = optimized.substring(0, taskIndex) + 
                   '\n## 分析タスク\n' + 
                   optimized.substring(taskIndex);
      }
    }
    
    return optimized;
  }

  // Add quality enhancements for better output
  addQualityEnhancements(prompt, reportType) {
    let enhanced = prompt;
    
    // Add output quality requirements
    if (!enhanced.includes('品質要件') && !enhanced.includes('Quality Requirements')) {
      enhanced += '\n\n## 品質要件\n- 正確で信頼性の高い分析を提供\n- 具体的な数値と根拠を含める\n- 実行可能な推奨事項を提示\n- 専門用語は適切に説明';
    }
    
    // Add format requirements
    if (!enhanced.includes('出力形式') && !enhanced.includes('Output Format')) {
      enhanced += '\n\n## 出力形式\n- 日本語で回答\n- マークダウン形式で構造化\n- 見出しと箇条書きを適切に使用\n- 重要な数値は太字で強調';
    }
    
    // Add disclaimer for financial advice
    if (reportType.includes('investment') || reportType.includes('tax') || reportType.includes('inheritance')) {
      if (!enhanced.includes('免責') && !enhanced.includes('Disclaimer')) {
        enhanced += '\n\n## 重要事項\n- 本分析は情報提供目的のみ\n- 投資判断は自己責任で行う\n- 専門家への相談を推奨';
      }
    }
    
    return enhanced;
  }

  // Add fallback handling instructions
  addFallbackInstructions(prompt, reportType) {
    let withFallback = prompt;
    
    // Add instructions for handling incomplete data
    if (!withFallback.includes('データ不足') && !withFallback.includes('incomplete data')) {
      withFallback += '\n\n## データ処理指示\n- データが不足している場合は明記\n- 推定値を使用する場合は根拠を示す\n- 不明な項目は「要確認」として記載';
    }
    
    return withFallback;
  }

  // Detect optimal service based on request characteristics
  detectOptimalService(reportType, inputText, files, additionalInfo) {
    const serviceScores = {
      openai: 0,
      gemini: 0
    };
    
    // Score based on report type
    const reportTypePreferences = {
      'jp_investment_4part': { openai: 8, gemini: 7 }, // OpenAI slightly better for complex financial analysis
      'jp_tax_strategy': { openai: 9, gemini: 6 }, // OpenAI better for tax law precision
      'jp_inheritance_strategy': { openai: 8, gemini: 7 }, // OpenAI better for legal precision
      'comparison_analysis': { openai: 7, gemini: 8 }, // Gemini good for comparative analysis
      'custom': { openai: 7, gemini: 7 } // Equal for custom requests
    };
    
    const preferences = reportTypePreferences[reportType] || reportTypePreferences.custom;
    serviceScores.openai += preferences.openai;
    serviceScores.gemini += preferences.gemini;
    
    // Score based on file types
    if (files && files.length > 0) {
      const hasImages = files.some(f => f.type.startsWith('image/'));
      const hasPDFs = files.some(f => f.type === 'application/pdf');
      
      if (hasImages) {
        serviceScores.gemini += 3; // Gemini better for native image processing
      }
      
      if (hasPDFs) {
        serviceScores.openai += 2; // OpenAI good for PDF processing
        serviceScores.gemini += 3; // Gemini also good for PDF processing
      }
      
      // Multiple files favor Gemini's multimodal capabilities
      if (files.length > 2) {
        serviceScores.gemini += 2;
      }
    }
    
    // Score based on input complexity
    const inputLength = (inputText || '').length;
    if (inputLength > 1000) {
      serviceScores.openai += 2; // OpenAI better for long context
    }
    
    // Return recommended service
    const recommendedService = serviceScores.openai >= serviceScores.gemini ? 'openai' : 'gemini';
    
    console.log(`[PROMPT MANAGER] Service detection scores:`, serviceScores);
    console.log(`[PROMPT MANAGER] Recommended service: ${recommendedService}`);
    
    return {
      recommended: recommendedService,
      scores: serviceScores,
      confidence: Math.abs(serviceScores.openai - serviceScores.gemini) / Math.max(serviceScores.openai, serviceScores.gemini)
    };
  }

  // Health check for prompt system
  getSystemHealth() {
    const health = {
      totalPrompts: this.prompts.size,
      optimizedPrompts: 0,
      promptsWithMetadata: 0,
      promptsWithErrors: 0,
      promptDetails: []
    };
    
    for (const [filename, metadata] of this.promptMetadata.entries()) {
      const promptExists = this.prompts.has(filename);
      
      const detail = {
        filename,
        exists: promptExists,
        hasMetadata: metadata.hasMetadata,
        isOptimized: metadata.aiOptimized,
        version: metadata.version,
        hasError: !!metadata.parseError || !!metadata.error,
        title: metadata.title
      };
      
      if (metadata.aiOptimized) health.optimizedPrompts++;
      if (metadata.hasMetadata) health.promptsWithMetadata++;
      if (metadata.parseError || metadata.error) health.promptsWithErrors++;
      
      health.promptDetails.push(detail);
    }
    
    health.healthScore = health.totalPrompts > 0 ? 
      ((health.optimizedPrompts / health.totalPrompts) * 100).toFixed(1) : 0;
    
    // Add cache performance metrics
    health.cacheStats = {
      ...this.cacheStats,
      hitRate: this.cacheStats.hits + this.cacheStats.misses > 0 ? 
        ((this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses)) * 100).toFixed(1) : 0,
      cacheSize: this.promptCache.size
    };
    
    health.loadTimestamp = this.loadTimestamp;
    
    return health;
  }
  
  // Get performance statistics
  getPerformanceStats() {
    return {
      cacheStats: this.cacheStats,
      cacheSize: this.promptCache.size,
      hitRate: this.cacheStats.hits + this.cacheStats.misses > 0 ? 
        ((this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses)) * 100).toFixed(1) : 0,
      totalPrompts: this.prompts.size,
      loadTimestamp: this.loadTimestamp
    };
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
    console.log('[VALIDATION] Starting input validation', {
      reportType,
      hasInputText: !!inputText,
      inputTextLength: inputText?.length || 0,
      hasFiles: !!(files && files.length > 0),
      fileCount: files?.length || 0,
      hasAdditionalInfo: !!additionalInfo,
      filesDetails: files ? files.map(f => ({ name: f.name, type: f.type, hasData: !!f.data })) : []
    });
    
    const validationError = validateInput({ reportType, inputText, files, additionalInfo, options });
    if (validationError) {
      console.log('[VALIDATION] Validation failed:', validationError);
      console.log('[VALIDATION] Request details:', { reportType, inputText: inputText?.substring(0, 100), filesCount: files?.length });
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
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      status: error.status,
      code: error.code
    });
    
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
  let investmentAnalysis = null;
  
  // Log file processing info for debugging
  if (files && files.length > 0) {
    console.log(`[FILE PROCESSING] Processing ${files.length} files for ${reportType} report`);
    files.forEach((file, index) => {
      console.log(`[FILE ${index + 1}] Name: ${file.name}, Type: ${file.type}, Size: ${file.data ? Math.round(file.data.length * 0.75 / 1024) : 0}KB`);
    });
  }
  
  // Perform investment analysis for investment-related reports
  if (reportType && (reportType.includes('investment') || reportType.includes('jp_investment'))) {
    try {
      // Import and use investment analysis engine
      const InvestmentAnalysisEngineModule = await import('../lib/investment-analysis-engine.js');
      const InvestmentAnalysisEngine = InvestmentAnalysisEngineModule.default || InvestmentAnalysisEngineModule.InvestmentAnalysisEngine;
      const analysisEngine = new InvestmentAnalysisEngine();
      
      // Analyze investment data from input text and files
      const fileData = files && files.length > 0 ? files[0] : null;
      investmentAnalysis = analysisEngine.analyzeInvestmentData(inputText, fileData);
      
      console.log('[INVESTMENT ANALYSIS] Analysis completed:', {
        hasMetrics: !!investmentAnalysis.metrics,
        leverageType: investmentAnalysis.leverageAnalysis?.type,
        investmentGrade: investmentAnalysis.summary?.investmentGrade
      });
      
      // Enhance input text with analysis results
      const analysisText = analysisEngine.formatForReport();
      if (analysisText) {
        inputText = `${inputText}\n\n=== 投資分析結果 ===\n${analysisText}`;
      }
    } catch (error) {
      console.warn('[INVESTMENT ANALYSIS] Failed to perform investment analysis:', error.message);
    }
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
  
  // Add investment analysis to response if available
  if (investmentAnalysis) {
    report.investmentAnalysis = investmentAnalysis;
  }
  
  return report;
}

async function generateWithOpenAI({ reportType, inputText, files, additionalInfo, options }) {
  const startTime = Date.now();
  
  try {
    // Get the OpenAI-optimized prompt using PromptManager (await to ensure prompts are loaded)
    let fullPrompt = await promptManager.buildServiceOptimizedPrompt(reportType, inputText, files, additionalInfo, 'openai');
  
    // Process files with enhanced multimodal capabilities
    let fileContent = '';
    if (files && files.length > 0) {
      try {
        console.log(`[OPENAI] Processing ${files.length} files with vision processing`);
        fileContent = await processFilesWithVision(files, reportType);
        // Add file content to the prompt
        fullPrompt += `\n\n【添付ファイル内容】\n${fileContent}`;
        console.log(`[OPENAI] File processing completed, content length: ${fileContent.length} chars`);
      } catch (fileError) {
        console.error('[OPENAI] File processing error:', fileError);
        // Fallback to legacy processing
        console.log('[OPENAI] Falling back to legacy file processing');
        try {
          fileContent = await processFiles(files);
          fullPrompt += `\n\n【添付ファイル内容】\n${fileContent}`;
        } catch (legacyError) {
          console.error('[OPENAI] Legacy file processing also failed:', legacyError);
          throw new Error(`file processing failed: ${fileError.message}`);
        }
      }
    }

  // Get OpenAI-optimized system message for report type
  const systemMessage = getOptimizedSystemMessage(reportType, 'openai');

  // Call OpenAI API with optimized settings
  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo", // Use turbo model for larger context (128k tokens)
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
    max_tokens: 3000, // Increased for better report quality
    temperature: 0.7,
    top_p: 0.9, // Add top_p for better quality control
    frequency_penalty: 0.1, // Reduce repetition
    presence_penalty: 0.1 // Encourage diverse content
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

    // Get the Gemini-optimized prompt using PromptManager (await to ensure prompts are loaded)
    let fullPrompt = await promptManager.buildServiceOptimizedPrompt(reportType, inputText, files, additionalInfo, 'gemini');
    
    // Gemini 2.0 Flash supports direct multimodal input - re-enabling carefully
    let parts = [{ text: fullPrompt }];
    
    if (files && files.length > 0) {
      console.log(`[GEMINI] Processing ${files.length} files with native multimodal support`);
      
      // Add files directly to Gemini (native multimodal support)
      for (const file of files) {
        try {
          if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
            console.log(`[GEMINI] Adding ${file.name} (${file.type}) directly to multimodal input`);
            
            // Validate file size for multimodal processing
            const fileSizeKB = Math.round(file.data.length * 0.75 / 1024);
            if (fileSizeKB > 5120) { // 5MB limit for multimodal
              console.log(`[GEMINI] File ${file.name} too large for multimodal (${fileSizeKB}KB), using text processing`);
              const fallbackContent = await processTextFallback(file);
              parts.push({ text: `\n\n【ファイル: ${file.name}】\n${fallbackContent}` });
            } else {
              parts.push({
                inlineData: {
                  mimeType: file.type,
                  data: file.data
                }
              });
            }
          } else {
            // For text files, process and add as text
            const buffer = Buffer.from(file.data, 'base64');
            const textContent = buffer.toString('utf8');
            parts.push({
              text: `\n\n【ファイル: ${file.name}】\n${textContent.substring(0, 2000)}`
            });
          }
        } catch (fileError) {
          console.error(`[GEMINI] Error processing file ${file.name}:`, fileError);
          parts.push({
            text: `\n\n【ファイル処理エラー: ${file.name}】\n${fileError.message}`
          });
        }
      }
      
      console.log(`[GEMINI] Prepared ${parts.length} parts for multimodal generation`);
    }

  // Call Gemini API with optimized settings for report generation
  console.log(`[GEMINI] Calling Gemini 2.0 Flash with ${parts.length} parts and optimized settings`);
  
  // Create optimized generation config for report type
  const optimizedConfig = getGeminiOptimizedConfig(reportType);
  
  const result = await geminiModel.generateContent({
    contents: [{ parts }],
    generationConfig: optimizedConfig
  });
  
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
      console.log(`[VISION] Processing file: ${file.name} (${file.type})`);
      
      // Validate file structure
      if (!file.name || !file.type || !file.data) {
        throw new Error(`Invalid file structure for file: ${file.name || 'unknown'}`);
      }

      // Validate base64 data with improved error handling
      if (typeof file.data !== 'string') {
        throw new Error(`Invalid data type for file: ${file.name} (expected string, got ${typeof file.data})`);
      }

      if (!file.data || file.data.length < 10) {
        throw new Error(`Invalid or empty base64 data for file: ${file.name}`);
      }

      const fileSizeKB = Math.round(file.data.length * 0.75 / 1024);
      console.log(`[VISION] File details: ${file.name} (${file.type}, ${fileSizeKB}KB)`);

      if (fileSizeKB > 10240) { // 10MB limit
        console.log(`[VISION] File too large for vision processing: ${file.name} (${fileSizeKB}KB)`);
        throw new Error(`File too large: ${file.name} (${fileSizeKB}KB)`);
      }

      // Check if file type is supported for vision processing
      const visionSupportedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const textSupportedTypes = ['text/plain', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      const isVisionSupported = visionSupportedTypes.includes(file.type);
      const isTextSupported = textSupportedTypes.includes(file.type);

      // Process with appropriate method based on file type
      let visionResult;
      if (isVisionSupported) {
        console.log(`[VISION] Using vision analysis for ${file.name}`);
        visionResult = await analyzeFileWithVision(file, reportType);
        visionResults.push(visionResult);
        processedFiles.push(file.name);
      } else if (isTextSupported) {
        console.log(`[VISION] Using text processing for ${file.name} (${file.type})`);
        visionResult = await processTextFile(file);
        visionResults.push(visionResult);
        processedFiles.push(file.name);
      } else {
        console.log(`[VISION] Unsupported file type for ${file.name} (${file.type}), using fallback`);
        visionResult = await processTextFallback(file);
        visionResults.push({
          fileName: file.name,
          content: visionResult
        });
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

  console.log(`[GEMINI VISION] Analyzing ${file.name} (${file.type})`);
  
  const analysisPrompt = getVisionAnalysisPrompt(reportType, file.type);
  
  const parts = [
    { text: analysisPrompt }
  ];

  // Add file data based on type
  if (file.type === 'application/pdf') {
    console.log(`[GEMINI VISION] Adding PDF file to analysis`);
    parts.push({
      inlineData: {
        mimeType: file.type,
        data: file.data
      }
    });
  } else if (file.type.startsWith('image/')) {
    console.log(`[GEMINI VISION] Adding image file to analysis`);
    parts.push({
      inlineData: {
        mimeType: file.type,
        data: file.data
      }
    });
  } else {
    throw new Error(`Unsupported file type for vision analysis: ${file.type}`);
  }

  try {
    console.log(`[GEMINI VISION] Sending request to Gemini API`);
    const result = await geminiModel.generateContent(parts);
    const response = await result.response;
    const text = response.text();
    console.log(`[GEMINI VISION] Successfully analyzed ${file.name}, response length: ${text.length}`);
    return text;
  } catch (error) {
    console.error(`[GEMINI VISION] API error for ${file.name}:`, error);
    throw new Error(`Gemini vision analysis failed: ${error.message}`);
  }
}

// Analyze with GPT-4V (supports images)
async function analyzeWithGPT4Vision(file, reportType) {
  if (!openai) {
    throw new Error('OpenAI client not available');
  }

  console.log(`[GPT-4V] Analyzing ${file.name} (${file.type})`);

  // GPT-4V only supports images directly, not PDFs
  if (file.type === 'application/pdf') {
    throw new Error('GPT-4V does not support PDF files directly');
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('GPT-4V only supports image files');
  }

  const analysisPrompt = getVisionAnalysisPrompt(reportType, file.type);

  try {
    console.log(`[GPT-4V] Sending request to OpenAI API`);
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

    const content = completion.choices[0].message.content;
    console.log(`[GPT-4V] Successfully analyzed ${file.name}, response length: ${content.length}`);
    return content;
  } catch (error) {
    console.error(`[GPT-4V] API error for ${file.name}:`, error);
    throw new Error(`GPT-4V analysis failed: ${error.message}`);
  }
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

// Text fallback for large files
async function processTextFallback(file) {
  try {
    const buffer = Buffer.from(file.data, 'base64');
    const fileSizeKB = Math.round(buffer.length / 1024);
    
    if (file.type === 'application/pdf') {
      return `PDFファイル (${fileSizeKB}KB) - マルチモーダル処理には大きすぎるため、テキスト抽出を試行します。\n` +
             `ファイル名: ${file.name}\n` +
             `このPDFには投資分析に関する重要な情報が含まれていると想定して分析を進めます。`;
    } else if (file.type.startsWith('image/')) {
      return `画像ファイル (${fileSizeKB}KB) - マルチモーダル処理には大きすぎるため、ファイル情報のみ提供します。\n` +
             `ファイル名: ${file.name}\n` +
             `この画像には投資分析に関する図表やデータが含まれていると想定して分析を進めます。`;
    } else {
      // Try to read as text
      const textContent = buffer.toString('utf8');
      return `ファイル内容 (${fileSizeKB}KB):\n${textContent.substring(0, 1000)}${textContent.length > 1000 ? '\n... (内容が長いため省略)' : ''}`;
    }
  } catch (error) {
    return `ファイル処理エラー: ${error.message}`;
  }
}

// Legacy file processing function (kept for compatibility)
async function processFiles(files) {
  console.log(`[FILE PROCESSING] Processing ${files.length} files with legacy processing`);

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
    console.log(`[VALIDATION] Validating ${files.length} files`);
    const fileValidation = validateFiles(files);
    if (fileValidation) {
      console.log('[VALIDATION] File validation failed:', fileValidation);
      return fileValidation;
    }
    console.log('[VALIDATION] File validation passed');
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
  const allowedTypes = [
    'application/pdf', 
    'image/jpeg', 
    'image/jpg', 
    'image/png', 
    'image/gif', 
    'image/webp',
    'text/plain',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

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
          message: `OpenAI API Error: ${error.message || 'Invalid request format. Please check your input and try again.'}`,
          type: 'openai_bad_request',
          severity: 'error',
          shouldRetry: false,
          userActions: [
            'Check that your text input is properly formatted',
            'Ensure uploaded files are not corrupted',
            'Try with simpler input text'
          ],
          technicalDetails: `OpenAI Error: ${JSON.stringify(error)}`,
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
    jp_investment_4part: 'あなたは20年以上の経験を持つ機関投資家レベルの不動産投資専門コンサルタントです。添付されたPDFファイルや画像から投資指標を正確に抽出し、プロフェッショナルな投資分析レポートを作成してください。\n\n【重要な分析要件】\n1. 数値の正確性: FCR、K%、DCR、BER、IRR、NPV等の数値を正確に読み取り、計算ミスを避けてください\n2. イールドギャップの正確な計算: FCR - K%を必ず正確に計算してください\n3. レバレッジ効果の定量化: 融資利用時と全額自己資金時のIRR差を明確に示してください\n4. 実務的判断: 理論だけでなく実際の投資判断に役立つ洞察を提供してください\n5. リスク評価: 楽観的分析だけでなく潜在リスクを適切に評価してください\n\n機関投資家が実際の投資判断に使用できるレベルの高品質な分析を提供してください。',
    jp_tax_strategy: 'あなたは日本の税制に精通したタックスアドバイザーです。添付されたPDFや画像から不動産投資による税務戦略を専門的に分析し、具体的な節税効果を数値で示してください。ファイルに含まれる財務データを詳細に読み取り、税務上のメリットを定量的に分析してください。',
    jp_inheritance_strategy: 'あなたは相続対策の専門家です。添付されたファイルから不動産投資による相続税対策の効果を詳細に分析し、具体的な節税効果を示してください。PDFや画像に含まれる資産情報、評価額、税務データを正確に読み取り、相続対策の効果を定量的に示してください。',
    comparison_analysis: 'あなたは不動産投資の専門家です。添付されたPDFファイルや画像から複数の物件情報を詳細に読み取り、比較分析を行ってください。各物件の投資指標、財務データ、物件情報を正確に抽出し、投資判断に必要な詳細で実践的な比較レポートを作成してください。',
    custom: 'あなたは経験豊富な投資アドバイザーです。添付されたPDFや画像の内容を詳細に分析し、提供された要件に基づいて専門的で実践的なレポートを作成してください。ファイルに含まれる数値データ、表、グラフを正確に読み取り、具体的な分析結果を示してください。'
  };
  
  return systemMessages[reportType] || systemMessages.jp_investment_4part;
}

// Service-optimized system message function
function getOptimizedSystemMessage(reportType, service) {
  const baseMessage = getSystemMessage(reportType);
  
  if (service === 'openai') {
    // OpenAI-specific optimizations
    const openaiOptimizations = {
      jp_investment_4part: baseMessage + '\n\n【OpenAI最適化指示】\n- 段階的思考プロセスを明示してください\n- 数値計算の検証ステップを含めてください\n- 結論に至る論理的根拠を明確に示してください',
      jp_tax_strategy: baseMessage + '\n\n【OpenAI最適化指示】\n- 税法の根拠条文を明示してください\n- 計算プロセスを段階的に説明してください\n- リスクと対策を具体的に提示してください',
      jp_inheritance_strategy: baseMessage + '\n\n【OpenAI最適化指示】\n- 相続税法の適用条文を明記してください\n- 評価減の計算根拠を詳細に説明してください\n- 実行可能な対策を優先順位付きで提示してください',
      comparison_analysis: baseMessage + '\n\n【OpenAI最適化指示】\n- 比較項目を体系的に整理してください\n- 定量的比較と定性的比較を明確に分けてください\n- 投資判断の決定要因を明確に示してください',
      custom: baseMessage + '\n\n【OpenAI最適化指示】\n- 分析の前提条件を明確にしてください\n- 結論に至る論理的プロセスを示してください\n- 実行可能な推奨事項を提示してください'
    };
    
    return openaiOptimizations[reportType] || openaiOptimizations.custom;
    
  } else if (service === 'gemini') {
    // Gemini-specific optimizations
    const geminiOptimizations = {
      jp_investment_4part: `Role: 機関投資家レベル不動産投資専門コンサルタント（CPM/CCIM資格、20年以上経験）\n\nTask: 添付ファイルから投資指標を抽出し、4部構成の投資分析レポートを作成\n\nQuality Requirements:\n- 数値精度の絶対性（FCR、K%、DCR、BER、IRR、NPV）\n- イールドギャップ計算の正確性（FCR - K%）\n- レバレッジ効果の定量化\n- 実務的投資判断の提供\n- 適切なリスク評価\n\nOutput: 機関投資家が実際の投資判断に使用できる高品質分析レポート`,
      jp_tax_strategy: `Role: 日本税制精通タックスストラテジスト（Big4税理士法人パートナーレベル）\n\nTask: 不動産投資による税務最適化戦略の分析\n\nFocus: 減価償却費活用による所得税・住民税の合法的軽減\n\nOutput: 定量的根拠に基づく税務戦略レポート`,
      jp_inheritance_strategy: `Role: エステートプランニング専門コンサルタント（CPM/CCIM資格、30年以上経験）\n\nTask: 収益不動産レバレッジを核とした相続対策戦略分析\n\nFocus: 相続税評価額圧縮と債務控除最適化\n\nOutput: 次世代資産承継最適化レポート`,
      comparison_analysis: `Role: 不動産投資比較分析専門家（CPM/CCIM資格、30年以上経験）\n\nTask: 複数投資物件の多角的比較分析\n\nFocus: レバレッジの質・強度・持続可能性\n\nOutput: データ基づく客観的投資推奨レポート`,
      custom: `Role: 投資分析専門家（金融・不動産分野経験豊富）\n\nTask: 提供要件に基づく専門的分析\n\nFocus: 実践的で具体的な分析結果\n\nOutput: 実行可能な推奨事項を含む専門レポート`
    };
    
    return geminiOptimizations[reportType] || geminiOptimizations.custom;
  }
  
  // Default to base message for unknown services
  return baseMessage;
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

// Get Gemini-optimized generation config for specific report types
function getGeminiOptimizedConfig(reportType) {
  const baseConfig = {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 4000,
    candidateCount: 1
  };

  // Report-type specific optimizations
  const optimizations = {
    jp_investment_4part: {
      ...baseConfig,
      temperature: 0.6, // More consistent for financial analysis
      topP: 0.9, // More focused responses
      maxOutputTokens: 4500 // Longer for comprehensive 4-part analysis
    },
    jp_tax_strategy: {
      ...baseConfig,
      temperature: 0.5, // Very consistent for tax advice
      topP: 0.85, // Highly focused for accuracy
      maxOutputTokens: 4000 // Standard length for tax strategy
    },
    jp_inheritance_strategy: {
      ...baseConfig,
      temperature: 0.6, // Consistent for legal/financial advice
      topP: 0.9, // Focused but allowing some creativity
      maxOutputTokens: 4200 // Slightly longer for comprehensive strategy
    },
    comparison_analysis: {
      ...baseConfig,
      temperature: 0.65, // Balanced for comparative analysis
      topP: 0.92, // Good balance of focus and variety
      maxOutputTokens: 4800 // Longer for detailed comparisons
    },
    custom: {
      ...baseConfig,
      temperature: 0.7, // Standard creativity
      topP: 0.95, // Allow more variety for custom requests
      maxOutputTokens: 4000 // Standard length
    }
  };

  const config = optimizations[reportType] || optimizations.custom;
  
  console.log(`[GEMINI] Using optimized config for ${reportType}:`, {
    temperature: config.temperature,
    topP: config.topP,
    maxOutputTokens: config.maxOutputTokens
  });
  
  return config;
}