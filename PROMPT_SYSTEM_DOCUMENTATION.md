# Optimized Prompt System Documentation

## Overview

This document describes the optimized prompt system implemented for the report generation service. The system provides intelligent prompt management, service-specific optimizations, caching, and robust error handling.

## Architecture

### Core Components

1. **PromptManager Class** - Central prompt management system
2. **Service Optimization** - AI service-specific prompt adaptations
3. **Caching System** - Multi-level caching for performance
4. **Error Handling** - Comprehensive error recovery mechanisms
5. **Metadata System** - YAML frontmatter for prompt configuration

### System Flow

```
User Request → PromptManager → Service Detection → Prompt Optimization → Cache Check → AI Service → Response
```

## Prompt File Structure

### YAML Frontmatter Metadata

All prompt files must begin with YAML frontmatter containing metadata:

```yaml
---
title: "Report Title"
description: "Brief description of the report type"
aiOptimized: true
version: "1.0"
language: "ja"
targetModels: ["gpt-4", "gemini-pro"]
reportType: "report_type_identifier"
expertise: "Domain expertise description"
framework: "Analysis framework description"
---
```

#### Required Metadata Fields

- **title**: Human-readable title for the prompt
- **description**: Brief description of what the prompt generates
- **aiOptimized**: Boolean indicating if the prompt is optimized for AI processing
- **version**: Semantic version number (e.g., "1.0", "1.2.3")
- **language**: Primary language code ("ja" for Japanese, "en" for English)
- **reportType**: Unique identifier matching the system's report types
- **targetModels**: Array of AI models the prompt is optimized for

#### Optional Metadata Fields

- **expertise**: Domain expertise or role definition
- **framework**: Analysis framework or methodology
- **focus**: Specific focus area or specialization
- **lastUpdated**: ISO timestamp of last update (auto-generated)

### Prompt Content Structure

After the YAML frontmatter, the prompt content should follow this structure:

```markdown
# Main Title

## AI専門家役割定義 (AI Expert Role Definition)
Clear definition of the AI's role and expertise level.

## 分析哲学と品質基準 (Analysis Philosophy and Quality Standards)
Core principles and quality requirements for the analysis.

## ファイル分析の指針 (File Analysis Guidelines)
Instructions for processing different file types.

## レポート構成要件 (Report Structure Requirements)
Detailed structure and content requirements for the output.

### Section 1: [Section Name]
Detailed instructions for this section.

### Section 2: [Section Name]
Detailed instructions for this section.

## 品質要件 (Quality Requirements)
- Accuracy and reliability requirements
- Specific numerical and factual requirements
- Professional standards to maintain

## 出力形式 (Output Format)
- Language requirements
- Formatting specifications
- Structure requirements

## 重要事項 (Important Notes)
- Disclaimers
- Legal considerations
- Professional advice recommendations
```

## Service Optimization

### OpenAI Optimization Features

1. **System Message Optimization**
   - Clear role definitions
   - Step-by-step thinking instructions
   - Verification requirements

2. **Prompt Structure**
   - Logical flow optimization
   - Token efficiency improvements
   - Context window utilization

3. **API Parameters**
   - Temperature: 0.7 (balanced creativity/consistency)
   - Top_p: 0.9 (quality control)
   - Frequency_penalty: 0.1 (reduce repetition)
   - Presence_penalty: 0.1 (encourage diversity)

### Gemini Optimization Features

1. **Role-Based Instructions**
   - Clear role prefixes
   - Task-oriented structure
   - Safety and quality requirements

2. **Content Structure**
   - Section-based organization
   - Clear task definitions
   - Structured output requirements

3. **Generation Config**
   - Report-type specific temperature settings
   - Optimized topK and topP values
   - Appropriate max output tokens

### Service-Adaptive Processing

The system automatically detects the optimal service based on:

- **Report Type**: Different types favor different services
- **File Types**: Image processing favors Gemini, complex text favors OpenAI
- **Input Complexity**: Long context favors OpenAI
- **Multimodal Requirements**: Multiple files favor Gemini

## Caching System

### Two-Level Caching

1. **File Cache**
   - Caches raw file contents with modification time
   - Prevents unnecessary file I/O operations
   - Maximum size: 50 files

2. **Prompt Cache**
   - Caches built prompts for reuse
   - LRU eviction policy
   - Maximum size: 100 prompts

### Cache Management

- **Automatic Eviction**: LRU-based when cache size limits are reached
- **Cache Invalidation**: Automatic when files are modified
- **Statistics Tracking**: Hit rates, miss rates, eviction counts

## Error Handling

### Fallback Mechanisms

1. **Prompt Loading Failures**
   - Automatic fallback to embedded prompts
   - Graceful degradation with warnings
   - Continued operation with reduced functionality

2. **Service Failures**
   - Automatic failover between OpenAI and Gemini
   - Intelligent retry logic
   - Error classification and handling

3. **Cache Failures**
   - Automatic cache clearing and rebuilding
   - Memory management and cleanup
   - Performance monitoring

### Validation System

- **Prompt Integrity Checks**: Content length, structure validation
- **Metadata Validation**: Required fields, format checking
- **Service Compatibility**: Target model verification

## Performance Monitoring

### Health Metrics

- **Prompt Health Score**: Percentage of optimized prompts
- **Cache Performance**: Hit rates and efficiency metrics
- **Service Performance**: Response times and success rates
- **Error Rates**: Failure frequencies and recovery success

### Logging System

- **Debug Logging**: Detailed operation tracking
- **Error Logging**: Comprehensive error information
- **Performance Logging**: Timing and efficiency metrics

## Usage Examples

### Basic Prompt Loading

```javascript
const promptManager = new PromptManager();
await promptManager.loadPrompts();

const prompt = promptManager.getPrompt('jp_investment_4part');
const metadata = promptManager.getPromptMetadata('jp_investment_4part');
```

### Service-Optimized Prompt Building

```javascript
// Build OpenAI-optimized prompt
const openaiPrompt = promptManager.buildServiceOptimizedPrompt(
  'jp_investment_4part',
  inputText,
  files,
  additionalInfo,
  'openai'
);

// Build Gemini-optimized prompt
const geminiPrompt = promptManager.buildServiceOptimizedPrompt(
  'jp_investment_4part',
  inputText,
  files,
  additionalInfo,
  'gemini'
);
```

### Health Monitoring

```javascript
const health = promptManager.getSystemHealth();
console.log(`Health Score: ${health.healthScore}%`);
console.log(`Cache Hit Rate: ${health.cacheStats.promptCache.hitRate}`);
```

## Best Practices

### Prompt Development

1. **Always include YAML frontmatter** with complete metadata
2. **Use clear section headers** for better AI comprehension
3. **Include specific quality requirements** for consistent output
4. **Test with both OpenAI and Gemini** to ensure compatibility
5. **Version your prompts** and track changes

### Performance Optimization

1. **Keep prompts concise** while maintaining clarity
2. **Use caching effectively** by avoiding unnecessary dynamic content
3. **Monitor cache hit rates** and optimize accordingly
4. **Profile prompt performance** across different services

### Error Prevention

1. **Validate prompts** before deployment
2. **Test error scenarios** thoroughly
3. **Implement comprehensive logging** for debugging
4. **Monitor system health** regularly

## Troubleshooting

### Common Issues

1. **Prompt Not Loading**
   - Check file exists in PROMPTS directory
   - Verify YAML frontmatter syntax
   - Check file permissions

2. **Poor Cache Performance**
   - Monitor cache hit rates
   - Check for excessive dynamic content
   - Verify cache size limits

3. **Service Optimization Not Working**
   - Verify service detection logic
   - Check prompt compatibility
   - Monitor service-specific metrics

### Debug Commands

```javascript
// Check prompt validation
const validation = promptManager.validatePrompt('reportType');
console.log(validation);

// Get cache statistics
const stats = promptManager.getCacheStats();
console.log(stats);

// Get system health
const health = promptManager.getSystemHealth();
console.log(health);
```

## Maintenance

### Regular Tasks

1. **Update prompt versions** when making changes
2. **Monitor system health** and performance metrics
3. **Review and optimize** cache performance
4. **Test error handling** scenarios periodically

### Version Control

- Use semantic versioning for prompt files
- Track changes in metadata
- Test compatibility with target AI models
- Document breaking changes

## Future Enhancements

### Planned Features

1. **Dynamic Prompt Generation** - AI-assisted prompt optimization
2. **A/B Testing Framework** - Compare prompt performance
3. **Advanced Analytics** - Detailed usage and performance analytics
4. **Multi-Language Support** - Automatic language detection and adaptation

### Extensibility

The system is designed to be easily extensible:

- Add new AI services by implementing service-specific optimization methods
- Add new report types by creating corresponding prompt files
- Extend caching strategies by modifying cache management logic
- Add new validation rules by extending the validation system

---

*This documentation is maintained as part of the prompt system optimization project. For questions or contributions, please refer to the development team.*