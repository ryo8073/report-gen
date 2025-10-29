# Design Document

## Overview

This design extends the existing ChatGPT integration to include Google AI Studio/Gemini API as a backup service. The system will implement intelligent failover logic to automatically switch between OpenAI ChatGPT and Google Gemini Pro when the primary service is unavailable, rate-limited, or experiencing issues. The design maintains backward compatibility with the existing ChatGPT service while adding resilience and reliability through service redundancy.

## Architecture

### Current Architecture
```
Frontend → API Endpoints → ChatGPT Service → OpenAI ChatGPT API
    ↓           ↓              ↓
Auth Layer → Firebase Admin → Report Storage (Firestore)
```

### Simplified Architecture for Vercel Deployment
```
Frontend → Single API Endpoint → Simple AI Router → Primary: OpenAI ChatGPT API
                                      ↓              ↓
                                 Fallback Logic → Backup: Google Gemini API
                                      ↓
                                Response Normalizer
```

### Simplified Service Flow
1. **Request Initiation** → Existing `/api/generate` endpoint receives request
2. **Primary Attempt** → Try OpenAI ChatGPT API first
3. **Immediate Failover** → On any OpenAI failure, immediately try Gemini API
4. **Response Normalization** → Simple format standardization
5. **Report Delivery** → Return report with service indicator

## Components and Interfaces

### 1. Enhanced Generate API (Modified)
**Purpose**: Extend existing `/api/generate.js` to include Gemini fallback

**Key Changes**:
- Add Gemini API client initialization
- Implement simple try-catch fallback logic
- Add response normalization within the same function
- Minimal additional code to existing endpoint

### 2. Gemini Integration Functions (New - within existing file)
**Purpose**: Handle Gemini API calls within the existing generate.js file

**Functions to Add**:
```javascript
async function callGeminiAPI(prompt, options)
async function normalizeGeminiResponse(response)
async function formatPromptForGemini(reportType, inputText, files, additionalInfo)
```

**Key Functions**:
- Simple Gemini API call with basic error handling
- Convert Gemini response to match existing format
- Adapt prompts for Gemini's format requirements

## Data Models

### Simple Environment Configuration
```javascript
// Add to existing .env file
GOOGLE_AI_API_KEY=your_gemini_api_key_here
```

### Enhanced Report Response (Minimal Changes)
```javascript
{
  // Existing fields remain the same...
  id: string,
  title: string,
  content: string,
  createdAt: string,
  usage: {
    promptTokens: number,
    completionTokens: number,
    totalTokens: number,
    estimatedCost: string
  },
  // Add only this new field
  aiService: 'openai' | 'gemini'
}
```

## Google AI Studio/Gemini Integration

### 1. API Configuration
```javascript
// Google AI Studio configuration
const geminiConfig = {
  apiKey: process.env.GOOGLE_AI_API_KEY,
  model: 'gemini-pro',
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
    }
  ]
}
```

### 2. Prompt Adaptation for Gemini
**Gemini-Optimized Prompt Structure**:
```
Role: You are a professional investment advisor with expertise in portfolio analysis.

Context: Analyze the following investment portfolio and provide comprehensive recommendations.

Investment Data:
- Portfolio Holdings: {portfolio_details}
- Investment Goals: {goals}
- Risk Tolerance: {risk_tolerance}
- Time Horizon: {time_horizon}

Task: Generate a structured investment report with the following sections:
1. Executive Summary
2. Portfolio Analysis
3. Risk Assessment
4. Recommendations
5. Implementation Plan

Format: Provide clear, actionable advice suitable for a {report_type} level investor.
```

### 3. Response Processing
- Parse Gemini's response format (different from OpenAI)
- Handle Gemini-specific metadata and safety ratings
- Convert to standardized report structure
- Maintain consistent quality metrics

## Simple Failover Logic

### 1. Basic Try-Catch Fallback (Within existing generate.js)
```javascript
async function generateReportWithFallback(reportData) {
  let aiService = 'openai';
  let report;
  
  try {
    // Try OpenAI first (existing logic)
    report = await generateWithOpenAI(reportData);
  } catch (openaiError) {
    console.log('OpenAI failed, trying Gemini:', openaiError.message);
    
    try {
      // Fallback to Gemini
      aiService = 'gemini';
      report = await generateWithGemini(reportData);
    } catch (geminiError) {
      // Both failed - throw original OpenAI error or combined error
      throw new Error(`Both AI services failed. OpenAI: ${openaiError.message}, Gemini: ${geminiError.message}`);
    }
  }
  
  // Add service indicator to response
  report.aiService = aiService;
  return report;
}
```

### 2. Simple Failover Conditions
```javascript
function shouldTryFallback(error) {
  // Simple conditions for when to try Gemini
  return (
    error.status === 429 ||    // Rate limit
    error.status >= 500 ||     // Server errors  
    error.code === 'ETIMEDOUT' || // Timeout
    error.message.includes('network') || // Network issues
    error.message.includes('unavailable') // Service unavailable
  );
}
```

## Error Handling and Recovery

### 1. Service-Specific Error Handling
```javascript
const errorHandlers = {
  openai: {
    401: () => ({ action: 'disable', reason: 'Invalid API key' }),
    429: () => ({ action: 'failover', reason: 'Rate limit exceeded' }),
    500: () => ({ action: 'retry', reason: 'Server error' })
  },
  gemini: {
    400: () => ({ action: 'retry', reason: 'Bad request format' }),
    403: () => ({ action: 'disable', reason: 'API key invalid' }),
    429: () => ({ action: 'failover', reason: 'Quota exceeded' })
  }
};
```

### 2. Graceful Degradation Strategy
1. **Primary Service Available** → Use OpenAI ChatGPT
2. **Primary Failed, Backup Available** → Use Google Gemini
3. **Both Services Failed** → Provide template-based basic analysis
4. **All Services Down** → Queue request for retry when services recover

### 3. Recovery Monitoring
- Periodic health checks for failed services
- Automatic re-enabling when services recover
- Gradual traffic restoration using half-open circuit breaker state

## Security Considerations

### 1. API Key Management
```javascript
// Environment variables for both services
const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORG_ID
  },
  gemini: {
    apiKey: process.env.GOOGLE_AI_API_KEY,
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
  }
};
```

### 2. Data Privacy Compliance
- Ensure both services meet data privacy requirements
- Implement consistent data sanitization for both APIs
- Log service usage for audit compliance
- Handle data residency requirements if applicable

### 3. Rate Limit Management
- Implement separate rate limiting for each service
- Track usage across both services for cost management
- Prevent abuse through intelligent request queuing

## Performance Optimization

### 1. Response Caching Strategy
```javascript
class ResponseCache {
  // Cache responses based on input hash
  async getCachedResponse(inputHash) {
    return await redis.get(`report:${inputHash}`);
  }
  
  async cacheResponse(inputHash, response, ttl = 3600) {
    await redis.setex(`report:${inputHash}`, ttl, JSON.stringify(response));
  }
}
```

### 2. Load Balancing
- Distribute requests based on service health and response times
- Implement weighted routing based on service performance
- Consider cost optimization when choosing between services

### 3. Monitoring and Metrics
```javascript
const metrics = {
  serviceUsage: {
    openai: { requests: 0, successRate: 0, avgResponseTime: 0 },
    gemini: { requests: 0, successRate: 0, avgResponseTime: 0 }
  },
  failoverEvents: [],
  costTracking: {
    openai: { totalCost: 0, tokensUsed: 0 },
    gemini: { totalCost: 0, tokensUsed: 0 }
  }
};
```

## Testing Strategy

### 1. Service Integration Testing
- Test both AI services independently
- Verify prompt compatibility across services
- Test response normalization accuracy
- Validate failover scenarios

### 2. Failover Testing
- Simulate primary service failures
- Test circuit breaker functionality
- Verify graceful degradation
- Test service recovery scenarios

### 3. Performance Testing
- Compare response quality between services
- Test concurrent request handling
- Measure failover response times
- Validate cost optimization

## Implementation Approach

### Single Phase: Minimal Integration
1. Add Google AI SDK to existing project
2. Add Gemini API functions to existing `/api/generate.js`
3. Implement simple try-catch fallback logic
4. Add basic response normalization
5. Update environment variables

### Key Benefits of Simplified Approach
- **No new Vercel functions** - Everything in existing `/api/generate.js`
- **Minimal code changes** - Just add fallback logic to existing flow
- **Quick implementation** - Can be done in under 100 lines of additional code
- **Maintains existing functionality** - No breaking changes to current system
- **Easy to remove** - Simple to revert if not needed after 2 weeks

This simplified design provides backup AI service capability without complex architecture, perfect for a temporary deployment with Vercel function limitations.