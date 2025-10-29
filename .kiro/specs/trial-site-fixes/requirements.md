# Trial Site Fixes - Requirements Document

## Introduction

This specification addresses the issues with the simplified trial site to ensure it works correctly without authentication and with the minimal API structure.

## Glossary

- **Trial Site**: A simplified version of the report generation system without user authentication
- **API Generate Endpoint**: The single `/api/generate` endpoint that handles all report generation
- **Frontend**: The HTML/JavaScript client interface
- **Report Generation**: The process of creating reports using OpenAI API

## Requirements

### Requirement 1

**User Story:** As a trial user, I want to generate reports immediately without authentication, so that I can test the service quickly.

#### Acceptance Criteria

1. WHEN a user visits the main page, THE System SHALL load without requiring authentication
2. WHEN a user submits a report generation request, THE System SHALL process it without checking user credentials
3. WHEN the page loads, THE System SHALL not attempt to call authentication endpoints
4. THE System SHALL display the interface immediately without login prompts

### Requirement 2

**User Story:** As a trial user, I want the API to work correctly with the simplified structure, so that my report requests are processed successfully.

#### Acceptance Criteria

1. WHEN a user submits a report request, THE System SHALL call the correct `/api/generate` endpoint
2. THE API Generate Endpoint SHALL accept requests without authentication headers
3. THE API Generate Endpoint SHALL process different report types correctly
4. WHEN the API receives a valid request, THE System SHALL return a properly formatted response

### Requirement 3

**User Story:** As a trial user, I want to see proper error handling, so that I understand what went wrong if something fails.

#### Acceptance Criteria

1. WHEN an API call fails, THE System SHALL display user-friendly error messages
2. WHEN the OpenAI API is unavailable, THE System SHALL show appropriate error messages
3. THE System SHALL not show authentication-related errors to trial users
4. WHEN file uploads fail, THE System SHALL provide clear feedback about the issue

### Requirement 4

**User Story:** As a trial user, I want the report generation to work with different input types, so that I can test various scenarios.

#### Acceptance Criteria

1. THE System SHALL accept text input for report generation
2. THE System SHALL accept file uploads (PDF, images) for processing
3. THE System SHALL handle different report types (investment analysis, tax strategy, inheritance strategy, custom)
4. WHEN files are uploaded, THE System SHALL process them correctly and include content in the report

### Requirement 5

**User Story:** As a trial user, I want to see the generated reports properly formatted, so that I can evaluate the service quality.

#### Acceptance Criteria

1. WHEN a report is generated, THE System SHALL display it in a readable format
2. THE System SHALL allow users to copy the report content
3. THE System SHALL allow users to download the report as a markdown file
4. THE System SHALL show the report generation progress to users