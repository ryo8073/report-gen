# Design Document

## Overview

This design integrates OpenAI's ChatGPT API into the existing investment analysis application to generate comprehensive investment reports. The integration will leverage the current Firebase/Firestore user management system while adding new API endpoints and services for ChatGPT communication. The design prioritizes security, reliability, and user experience while maintaining the existing authentication flow.

## Architecture

### Current System Architecture
```
Frontend (HTML/JS) → API Endpoints → Firebase Admin SDK → Firestore Database
                  ↓
                Authentication Layer (JWT + Cookies)
```

### Enhanced Architecture with ChatGPT Integration
```
Frontend → API Endpoints → ChatGPT Service → OpenAI ChatGPT API
    ↓           ↓              ↓
Auth Layer → Firebase Admin → Report Storage (Firestore)
    ↓           ↓              ↓
User DB → Usage Tracking → Report History
```

### Data Flow
1. **User Input** → Frontend collects investment data and preferences
2. **Authentication** → Verify user session via existing auth system
3. **API Request** → Send structured data to ChatGPT service
4. **ChatGPT Processing** → Format prompt and call OpenAI API
5. **Response Processing** → Parse and format ChatGPT response
6. **Storage** → Save report to Firestore with user association
7. **Display** → Return formatted report to frontend

## Components and Interfaces

### 1. ChatGPT Service Layer
**Purpose**: Handle all interactions with OpenAI ChatGPT API

**Interface**:
```javascript
class ChatGPTService {
  async generateInvestmentReport(investmentData, reportType, userPreferences)
  async validateApiKey()
  async handleRateLimit(retryCount)
  async formatPrompt(data, type, preferences)
}
```

**Key Functions**:
- Construct investment analysis prompts based on user data
- Handle API authentication and rate limiting
- Process and format ChatGPT responses
- Implement retry logic for failed requests

### 2. Report Management Service
**Purpose**: Manage report storage, retrieval, and user association

**Interface**:
```javascript
class ReportService {
  async saveReport(userId, reportData, metadata)
  async getUserReports(userId, limit, offset)
  async getReportById(reportId, userId)
  async deleteReport(reportId, userId)
}
```

**Key Functions**:
- Store generated reports in Firestore
- Associate reports with user accounts
- Implement report history and pagination
- Handle report metadata (creation date, type, etc.)

### 3. Investment Data Processor
**Purpose**: Validate and structure user investment data for ChatGPT

**Interface**:
```javascript
class InvestmentDataProcessor {
  validateInvestmentData(rawData)
  structureDataForPrompt(validatedData)
  sanitizeUserInput(input)
  extractKeyMetrics(data)
}
```

**Key Functions**:
- Validate user input for completeness and format
- Structure data into ChatGPT-friendly format
- Sanitize input to prevent prompt injection
- Extract key financial metrics for analysis

### 4. API Endpoints

#### `/api/generate-investment-report`
- **Method**: POST
- **Authentication**: Required (existing Firebase auth)
- **Input**: Investment data, report type, preferences
- **Output**: Generated report or error message

#### `/api/reports/history`
- **Method**: GET
- **Authentication**: Required
- **Input**: Pagination parameters
- **Output**: List of user's previous reports

#### `/api/reports/:reportId`
- **Method**: GET
- **Authentication**: Required
- **Input**: Report ID
- **Output**: Full report content

## Data Models

### Investment Report Model (Firestore)
```javascript
{
  id: string,
  userId: string,
  title: string,
  reportType: 'basic' | 'intermediate' | 'advanced',
  investmentData: {
    portfolio: object,
    goals: string,
    riskTolerance: string,
    timeHorizon: string,
    // ... other investment data
  },
  generatedReport: {
    summary: string,
    analysis: string,
    recommendations: string,
    riskAssessment: string,
    // ... structured report content
  },
  metadata: {
    createdAt: timestamp,
    processingTime: number,
    apiCost: number,
    promptTokens: number,
    completionTokens: number
  },
  preferences: {
    focusAreas: array,
    analysisDepth: string,
    includeCharts: boolean
  }
}
```

### API Usage Tracking Model (Firestore)
```javascript
{
  id: string,
  userId: string,
  endpoint: string,
  requestTime: timestamp,
  responseTime: timestamp,
  tokensUsed: number,
  cost: number,
  success: boolean,
  errorMessage?: string
}
```

## ChatGPT Integration Strategy

### 1. Prompt Engineering
**Investment Analysis Prompt Template**:
```
You are a professional investment advisor. Analyze the following investment portfolio and provide a comprehensive report.

Investment Data:
- Portfolio: {portfolio_details}
- Investment Goals: {goals}
- Risk Tolerance: {risk_tolerance}
- Time Horizon: {time_horizon}
- Current Market Conditions: {market_data}

Please provide:
1. Portfolio Analysis Summary
2. Risk Assessment
3. Diversification Analysis
4. Growth Potential Evaluation
5. Specific Recommendations
6. Market Outlook Impact

Format the response as a structured investment report suitable for {report_type} investor.
```

### 2. Response Processing
- Parse ChatGPT response into structured sections
- Extract key metrics and recommendations
- Format for frontend display
- Validate response completeness

### 3. Error Handling
- API rate limit management with exponential backoff
- Token limit handling for large requests
- Network timeout and retry logic
- Graceful degradation for API unavailability

## Security Considerations

### 1. API Key Management
- Store OpenAI API key in environment variables
- Never expose API key to frontend
- Implement key rotation capability
- Monitor API usage for anomalies

### 2. Data Privacy
- Sanitize user investment data before sending to ChatGPT
- Implement data retention policies for reports
- Ensure compliance with financial data regulations
- Log API interactions for audit purposes

### 3. Input Validation
- Validate all user inputs before processing
- Prevent prompt injection attacks
- Sanitize file uploads if implemented
- Rate limit user requests to prevent abuse

## Error Handling

### 1. ChatGPT API Errors
- **Rate Limit Exceeded**: Implement exponential backoff, queue requests
- **Invalid API Key**: Log error, provide setup instructions
- **Token Limit Exceeded**: Split large requests, summarize input
- **Service Unavailable**: Retry with backoff, fallback message

### 2. Data Processing Errors
- **Invalid Investment Data**: Validate input, provide specific error messages
- **Incomplete User Input**: Guide user to complete required fields
- **Processing Timeout**: Implement timeout handling, partial results

### 3. Storage Errors
- **Database Connection Issues**: Retry logic, temporary storage
- **Permission Denied**: Validate user authentication, log security events
- **Storage Quota Exceeded**: Implement cleanup policies, user notifications

## Testing Strategy

### 1. ChatGPT Integration Testing
- Test API key validation and authentication
- Verify prompt formatting and response parsing
- Test rate limit handling and retry logic
- Validate error scenarios and fallback behavior

### 2. Report Generation Testing
- Test various investment data inputs
- Verify report quality and completeness
- Test different report types and preferences
- Validate report storage and retrieval

### 3. Performance Testing
- Test API response times under load
- Verify database performance with report storage
- Test concurrent user report generation
- Monitor token usage and cost optimization

### 4. Security Testing
- Test input sanitization and validation
- Verify API key security and rotation
- Test authentication and authorization
- Validate data privacy and retention policies

## Implementation Priority

### Phase 1: Core Integration (Day 1)
1. Set up OpenAI API key configuration
2. Create basic ChatGPT service with simple prompts
3. Implement report generation API endpoint
4. Add basic report storage to Firestore

### Phase 2: Enhanced Features (Day 2)
1. Implement report history and retrieval
2. Add different report types and customization
3. Implement comprehensive error handling
4. Add usage tracking and monitoring

### Phase 3: Optimization (Day 3)
1. Optimize prompts for better report quality
2. Implement advanced error recovery
3. Add performance monitoring and optimization
4. Implement security enhancements

This design ensures rapid implementation while maintaining security and reliability, leveraging your existing user management system and providing a solid foundation for the ChatGPT integration.