# Trial Site Fixes - Design Document

## Overview

This design addresses the technical issues in the simplified trial site to ensure proper functionality without authentication and with minimal API structure.

## Architecture

### Current Issues Identified
1. Frontend calling non-existent authentication endpoints
2. API endpoint mismatch (`/api/generate-firebase` vs `/api/generate`)
3. Missing OpenAI integration in the simplified API
4. File processing not implemented in the new API structure
5. Error handling not adapted for trial use

### Proposed Solution Architecture

```
Frontend (No Auth) → /api/generate → OpenAI API → Response
                  ↓
              File Processing
```

## Components and Interfaces

### 1. Frontend Interface
- **Purpose**: Simplified UI without authentication
- **Key Changes**:
  - Remove all authentication-related code
  - Update API endpoints to match simplified structure
  - Remove user management features
  - Simplify error handling for trial use

### 2. API Generate Endpoint (`/api/generate`)
- **Purpose**: Single endpoint for all report generation
- **Current State**: Basic structure exists but lacks functionality
- **Required Enhancements**:
  - OpenAI API integration
  - File processing (PDF, images)
  - Different report type handling
  - Proper error responses

### 3. File Processing System
- **Purpose**: Handle uploaded files (PDF, images)
- **Requirements**:
  - Base64 decode uploaded files
  - Extract text from PDFs
  - Process images (OCR if needed)
  - Include file content in report generation

### 4. Report Generation Engine
- **Purpose**: Generate reports using OpenAI API
- **Components**:
  - Prompt templates for different report types
  - OpenAI API client
  - Response formatting
  - Error handling

## Data Models

### Request Format
```javascript
{
  reportType: string,
  inputText: string,
  files: [
    {
      name: string,
      type: string,
      data: string (base64)
    }
  ],
  additionalInfo: object,
  options: {
    language: string
  }
}
```

### Response Format
```javascript
{
  success: boolean,
  report?: {
    id: string,
    title: string,
    content: string,
    createdAt: string
  },
  error?: string
}
```

## Error Handling

### Frontend Error Handling
- Remove authentication error handling
- Focus on network and API errors
- Provide user-friendly messages for trial users
- Handle OpenAI API rate limits gracefully

### API Error Handling
- Validate input parameters
- Handle OpenAI API errors
- Manage file processing errors
- Return consistent error format

## Testing Strategy

### Unit Tests
- API endpoint functionality
- File processing utilities
- Error handling scenarios

### Integration Tests
- End-to-end report generation
- File upload and processing
- Different report types
- Error scenarios

### Manual Testing
- User interface functionality
- Report generation with various inputs
- File upload scenarios
- Error message display