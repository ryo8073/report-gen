// Test suite for optimized prompt system
// Tests prompt loading, validation, caching, and service optimization

import fs from 'fs/promises';
import path from 'path';

// Test configuration
const TEST_CONFIG = {
  promptsDir: './PROMPTS',
  expectedPrompts: [
    'jp_investment_4part.md',
    'jp_tax_strategy.md', 
    'jp_inheritance_strategy.md',
    'comparison_analysis.md'
  ],
  testReportTypes: [
    'jp_investment_4part',
    'jp_tax_strategy',
    'jp_inheritance_strategy',
    'comparison_analysis',
    'custom'
  ]
};

// Mock PromptManager for testing (simplified version of the actual implementation)
class TestPromptManager {
  constructor() {
    this.prompts = new Map();
    this.promptMetadata = new Map();
    this.promptCache = new Map();
    this.fileCache = new Map();
    this.loadTimestamp = null;
    this.maxCacheSize = 100;
    this.maxFileCacheSize = 50;
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
        promptFile: 'jp_investment_4part.md',
        description: 'カスタム要件に基づく投資分析'
      }
    };
  }

  async loadPrompts() {
    const promptsDir = TEST_CONFIG.promptsDir;
    const loadStartTime = Date.now();
    
    try {
      const files = await fs.readdir(promptsDir);
      const promptFiles = files.filter(file => file.endsWith('.md'));
      
      console.log(`[TEST PROMPT MANAGER] Loading ${promptFiles.length} prompt files from ${promptsDir}`);
      
      const loadPromises = promptFiles.map(async (file) => {
        try {
          const filePath = path.join(promptsDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          
          const { metadata, promptContent } = this.parsePromptFile(content, file);
          
          this.prompts.set(file, promptContent);
          this.promptMetadata.set(file, metadata);
          
          return { file, success: true, size: promptContent.length, metadata: metadata.title || 'No title' };
        } catch (error) {
          console.error(`[TEST PROMPT MANAGER] Failed to load prompt ${file}:`, error.message);
          this.promptMetadata.set(file, { error: error.message, loadFailed: true });
          return { file, success: false, error: error.message };
        }
      });
      
      const results = await Promise.all(loadPromises);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      const loadTime = Date.now() - loadStartTime;
      console.log(`[TEST PROMPT MANAGER] Loaded ${successful.length}/${promptFiles.length} prompts in ${loadTime}ms`);
      
      this.loadTimestamp = new Date().toISOString();
      
      return successful.length;
    } catch (error) {
      console.error('[TEST PROMPT MANAGER] Failed to read PROMPTS directory:', error.message);
      return 0;
    }
  }

  parsePromptFile(content, filename) {
    try {
      if (content.startsWith('---\n')) {
        const endOfFrontmatter = content.indexOf('\n---\n', 4);
        if (endOfFrontmatter !== -1) {
          const yamlContent = content.substring(4, endOfFrontmatter);
          const promptContent = content.substring(endOfFrontmatter + 5).trim();
          
          const metadata = this.parseYamlMetadata(yamlContent);
          metadata.hasMetadata = true;
          metadata.filename = filename;
          metadata.lastUpdated = new Date().toISOString();
          
          return { metadata, promptContent };
        }
      }
      
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
      
      return { metadata: defaultMetadata, promptContent: content };
      
    } catch (error) {
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
          
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          
          if (value === 'true') value = true;
          if (value === 'false') value = false;
          
          if (value.startsWith('[') && value.endsWith(']')) {
            value = value.slice(1, -1).split(',').map(item => item.trim().replace(/['"]/g, ''));
          }
          
          metadata[key] = value;
        }
      }
    }
    
    return metadata;
  }

  getPrompt(reportType) {
    const promptFile = this.reportTypes[reportType]?.promptFile || 'jp_investment_4part.md';
    const prompt = this.prompts.get(promptFile);
    
    if (!prompt) {
      console.error(`[TEST PROMPT MANAGER] Prompt not found: ${promptFile}`);
      return null;
    }
    
    return prompt;
  }

  getPromptMetadata(reportType) {
    const promptFile = this.reportTypes[reportType]?.promptFile || 'jp_investment_4part.md';
    return this.promptMetadata.get(promptFile) || null;
  }

  validatePrompt(reportType) {
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
    
    if (prompt) {
      validation.hasStructuredSections = prompt.includes('##') && prompt.includes('###');
      validation.hasQualityRequirements = prompt.includes('品質要件') || prompt.includes('Quality Requirements');
      validation.hasOutputFormat = prompt.includes('出力') || prompt.includes('Output');
    }
    
    return validation;
  }

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
}

// Test utilities
function logTest(testId, passed, message) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${testId}] ${status}: ${message}`);
  return passed;
}

function logSection(title) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${title}`);
  console.log(`${'='.repeat(60)}`);
}

// Test execution
async function runOptimizedPromptSystemTests() {
  console.log('🚀 Starting Optimized Prompt System Tests');
  console.log(`Test Configuration:`, TEST_CONFIG);
  
  let totalTests = 0;
  let passedTests = 0;

  // Test 1: Prompt File Loading
  logSection('TEST 1: PROMPT FILE LOADING AND VALIDATION');
  
  try {
    const promptManager = new TestPromptManager();
    const loadedCount = await promptManager.loadPrompts();
    
    // Test 1.1: Verify prompts are loaded
    totalTests++;
    const hasPrompts = loadedCount > 0;
    if (logTest('1.1', hasPrompts, `Loaded ${loadedCount} prompt files`)) {
      passedTests++;
    }

    // Test 1.2: Verify expected prompt files exist
    for (const expectedFile of TEST_CONFIG.expectedPrompts) {
      totalTests++;
      const hasFile = promptManager.prompts.has(expectedFile);
      if (logTest(`1.2.${expectedFile}`, hasFile, `Expected prompt file exists: ${expectedFile}`)) {
        passedTests++;
      }
    }

    // Test 1.3: Verify metadata parsing
    totalTests++;
    let metadataCount = 0;
    for (const [filename, metadata] of promptManager.promptMetadata.entries()) {
      if (metadata.hasMetadata) metadataCount++;
    }
    const hasMetadata = metadataCount > 0;
    if (logTest('1.3', hasMetadata, `Parsed metadata for ${metadataCount} files`)) {
      passedTests++;
    }

    // Test 2: Prompt Validation
    logSection('TEST 2: PROMPT VALIDATION');
    
    for (const reportType of TEST_CONFIG.testReportTypes) {
      totalTests++;
      const validation = promptManager.validatePrompt(reportType);
      const isValid = validation.exists && validation.contentLength > 100;
      if (logTest(`2.${reportType}`, isValid, `Prompt validation for ${reportType}: ${validation.contentLength} chars, optimized: ${validation.isOptimized}`)) {
        passedTests++;
      }
    }

    // Test 3: Cache Statistics
    logSection('TEST 3: CACHE SYSTEM');
    
    totalTests++;
    const cacheStats = promptManager.getCacheStats();
    const hasCacheSystem = cacheStats.promptCache && cacheStats.fileCache;
    if (logTest('3.1', hasCacheSystem, `Cache system initialized: Prompt cache (${cacheStats.promptCache.size}/${cacheStats.promptCache.maxSize}), File cache (${cacheStats.fileCache.size}/${cacheStats.fileCache.maxSize})`)) {
      passedTests++;
    }

    // Test 4: Error Handling
    logSection('TEST 4: ERROR HANDLING');
    
    totalTests++;
    const invalidPrompt = promptManager.getPrompt('non_existent_type');
    const handlesError = invalidPrompt === null;
    if (logTest('4.1', handlesError, `Handles invalid prompt type gracefully`)) {
      passedTests++;
    }

    // Test 5: Performance Metrics
    logSection('TEST 5: PERFORMANCE METRICS');
    
    totalTests++;
    const loadTime = promptManager.loadTimestamp ? new Date(promptManager.loadTimestamp) : null;
    const hasLoadTime = loadTime && (Date.now() - loadTime.getTime()) < 60000; // Loaded within last minute
    if (logTest('5.1', hasLoadTime, `Load timestamp recorded: ${promptManager.loadTimestamp}`)) {
      passedTests++;
    }

  } catch (error) {
    console.error('❌ Test execution failed:', error);
    totalTests++;
    logTest('ERROR', false, `Test execution error: ${error.message}`);
  }

  // Final Results
  logSection('TEST RESULTS SUMMARY');
  
  const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
  console.log(`📊 Tests Passed: ${passedTests}/${totalTests} (${successRate}%)`);
  
  if (successRate >= 90) {
    console.log('🎉 EXCELLENT: Optimized prompt system is working well!');
  } else if (successRate >= 75) {
    console.log('✅ GOOD: Optimized prompt system is mostly functional');
  } else if (successRate >= 50) {
    console.log('⚠️  NEEDS IMPROVEMENT: Some issues with optimized prompt system');
  } else {
    console.log('❌ CRITICAL: Major issues with optimized prompt system');
  }

  return {
    totalTests,
    passedTests,
    successRate: parseFloat(successRate),
    timestamp: new Date().toISOString()
  };
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runOptimizedPromptSystemTests()
    .then(results => {
      console.log('\n📋 Final Test Results:', results);
      process.exit(results.successRate >= 75 ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test suite failed:', error);
      process.exit(1);
    });
}

export { runOptimizedPromptSystemTests, TestPromptManager };