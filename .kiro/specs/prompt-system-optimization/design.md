# Prompt System Optimization - Design Document

## Overview

This design optimizes the PROMPTS directory files to ensure they are properly formatted for AI processing and seamlessly integrated into the report generation system. The optimization focuses on structural improvements, consistent formatting, and enhanced AI comprehension while maintaining the high-quality content of the existing prompts.

## Architecture

### Current Prompt System Architecture
```
PROMPTS Directory → PromptManager → AI Services (OpenAI/Gemini)
     ↓                    ↓              ↓
Raw .md Files → File Loading → Report Generation
     ↓                    ↓              ↓
Content Parsing → Template Building → Structured Output
```

### Enhanced Prompt System Architecture
```
Optimized PROMPTS → Enhanced PromptManager → AI Services
     ↓                    ↓                      ↓
Structured .md Files → Validation & Loading → Adaptive Processing
     ↓                    ↓                      ↓
Metadata Headers → Template Optimization → Quality Reports
     ↓                    ↓                      ↓
Error Handling → Fallback Management → Consistent Output
```

### Key Improvements
1. **Structured Headers**: Standardized metadata and section headers
2. **AI-Optimized Formatting**: Clear instructions and formatting guidelines
3. **Error Resilience**: Robust loading and validation mechanisms
4. **Multi-Service Compatibility**: Optimized for both OpenAI and Gemini

## Components and Interfaces

### 1. Optimized Prompt File Structure
**Purpose**: Standardize prompt file format for consistent AI processing

**Structure**:
```markdown
---
title: "Report Type Name"
description: "Brief description of the report type"
aiOptimized: true
version: "1.0"
language: "ja"
targetModels: ["gpt-4", "gemini-pro"]
---

# Role Definition
Clear AI role specification

## Analysis Framework
Structured analysis requirements

### Data Processing Instructions
Specific file handling guidelines

### Output Format Requirements
Detailed formatting specifications

### Quality Assurance Checklist
Validation requirements for output
```

### 2. Enhanced PromptManager
**Purpose**: Improved prompt loading and management with validation

**Key Features**:
- Metadata parsing and validation
- Error handling and fallback mechanisms
- AI service adaptation
- Dynamic prompt optimization

### 3. Prompt Validation System
**Purpose**: Ensure prompt file integrity and compatibility

**Validation Checks**:
- Metadata completeness
- Section structure validation
- Character encoding verification
- AI instruction clarity assessment

## Data Models

### Prompt Metadata Model
```javascript
{
  title: string,
  description: string,
  aiOptimized: boolean,
  version: string,
  language: string,
  targetModels: string[],
  lastUpdated: timestamp,
  fileSize: number,
  checksum: string
}
```

### Prompt Template Model
```javascript
{
  metadata: PromptMetadata,
  roleDefinition: string,
  analysisFramework: string,
  dataProcessingInstructions: string,
  outputFormatRequirements: string,
  qualityAssuranceChecklist: string[],
  rawContent: string
}
```

## Prompt Optimization Strategy

### 1. Content Structure Optimization
**Current Issues**:
- Inconsistent section headers
- Mixed formatting styles
- Unclear AI role definitions
- Ambiguous instruction sequences

**Optimization Approach**:
- Standardize section headers across all prompts
- Implement consistent formatting guidelines
- Clarify AI role and expertise definitions
- Structure instructions in logical sequences

### 2. AI Comprehension Enhancement
**Improvements**:
- Clear role-based instructions
- Structured analysis frameworks
- Explicit data handling requirements
- Detailed output formatting specifications

### 3. Multi-Service Compatibility
**Adaptations**:
- OpenAI-specific optimizations (system/user message structure)
- Gemini-specific adaptations (role-based prompting)
- Universal instruction formats
- Service-specific fallback handling

## File-by-File Optimization Plan

### 1. comparison_analysis.md
**Current Issues**:
- Missing structured headers
- Inconsistent formatting
- Unclear variable placeholders

**Optimizations**:
- Add metadata header
- Standardize section structure
- Clarify comparison framework
- Improve variable handling

### 2. jp_investment_4part.md
**Current Issues**:
- Very long content (may exceed token limits)
- Complex nested structure
- Mixed instruction styles

**Optimizations**:
- Add metadata header
- Streamline content structure
- Optimize for token efficiency
- Clarify 4-part framework

### 3. jp_inheritance_strategy.md
**Current Issues**:
- Missing title structure
- Inconsistent formatting
- Complex technical terminology

**Optimizations**:
- Add proper markdown headers
- Standardize terminology
- Improve readability
- Add metadata section

### 4. jp_tax_strategy.md
**Current Issues**:
- Introductory text mixed with instructions
- Inconsistent structure
- Complex formatting

**Optimizations**:
- Separate metadata from instructions
- Standardize structure
- Clarify tax analysis framework
- Improve formatting consistency

## Error Handling and Recovery

### 1. Prompt Loading Errors
**Error Types**:
- File not found
- Invalid metadata format
- Corrupted content
- Encoding issues

**Recovery Strategies**:
- Fallback to default prompts
- Error logging and notification
- Graceful degradation
- User-friendly error messages

### 2. AI Processing Errors
**Error Types**:
- Token limit exceeded
- Unclear instructions
- Formatting inconsistencies
- Service-specific issues

**Recovery Strategies**:
- Prompt truncation and optimization
- Instruction clarification
- Service-specific adaptations
- Quality validation

## Performance Optimization

### 1. Loading Performance
**Optimizations**:
- Efficient file reading
- Metadata caching
- Lazy loading for large prompts
- Compression for storage

### 2. Processing Performance
**Optimizations**:
- Token-efficient formatting
- Streamlined instructions
- Reduced redundancy
- Optimized for AI processing speed

## Testing Strategy

### 1. Prompt Validation Testing
- Metadata parsing accuracy
- Section structure validation
- Character encoding handling
- Error condition testing

### 2. AI Processing Testing
- Report generation quality
- Consistency across services
- Token usage optimization
- Error handling validation

### 3. Integration Testing
- PromptManager functionality
- File loading reliability
- Fallback mechanism testing
- Performance benchmarking

## Implementation Approach

### Phase 1: File Structure Optimization
1. Add metadata headers to all prompt files
2. Standardize section structures
3. Improve formatting consistency
4. Validate content integrity

### Phase 2: PromptManager Enhancement
1. Implement metadata parsing
2. Add validation mechanisms
3. Enhance error handling
4. Optimize loading performance

### Phase 3: AI Service Integration
1. Test with OpenAI services
2. Validate Gemini compatibility
3. Optimize for both services
4. Implement adaptive processing

This design ensures that the prompt system is robust, efficient, and capable of producing high-quality reports consistently across different AI services while maintaining the valuable content and expertise embedded in the existing prompts.