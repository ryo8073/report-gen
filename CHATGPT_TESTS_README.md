# ChatGPT Integration Test Suite

This directory contains comprehensive tests for the ChatGPT integration feature, covering both unit tests and integration tests.

## Test Files

### Unit Tests
- **`test-chatgpt-service-unit.js`** - Tests the ChatGPT service class in isolation
  - Prompt formatting and validation
  - API communication logic
  - Error handling and retry mechanisms
  - Report parsing and structuring
  - Queue management
  - Graceful degradation

### Integration Tests
- **`test-chatgpt-integration.js`** - Tests the complete report generation flow
  - End-to-end report generation
  - Authentication and authorization
  - Report storage and retrieval
  - API endpoint functionality
  - Data persistence
  - Performance testing

### Comprehensive Test Runner
- **`test-chatgpt-comprehensive.js`** - Runs both unit and integration tests
  - Provides complete test coverage analysis
  - Generates comprehensive reports
  - Validates requirements coverage

## Running the Tests

### Prerequisites
1. Ensure all dependencies are installed: `npm install`
2. For integration tests, the server must be running: `node server.js`
3. Environment variables must be configured (see `.env.example`)

### Running Individual Test Suites

```bash
# Run unit tests only (no server required)
node test-chatgpt-service-unit.js

# Run integration tests only (requires running server)
node test-chatgpt-integration.js

# Run comprehensive test suite (both unit and integration)
node test-chatgpt-comprehensive.js
```

### Test Results

Each test run generates detailed JSON reports:
- `test-chatgpt-service-unit-results.json` - Unit test results
- `test-chatgpt-integration-results.json` - Integration test results  
- `test-chatgpt-comprehensive-results.json` - Combined results

## Test Coverage

### Unit Test Coverage (29 tests)
- ✅ Service initialization and configuration
- ✅ Prompt formatting for all report types
- ✅ Investment data validation
- ✅ Portfolio data formatting
- ✅ Error handling for all error types
- ✅ Retry logic with exponential backoff
- ✅ Report parsing and section extraction
- ✅ Token estimation and analysis
- ✅ Queue management and prioritization
- ✅ Graceful degradation scenarios

### Integration Test Coverage (12 tests)
- ✅ Server health and connectivity
- ✅ User authentication setup
- ✅ Basic and intermediate report generation
- ✅ Invalid data handling
- ✅ Unauthorized access prevention
- ✅ Report history retrieval
- ✅ Individual report access
- ✅ Report access control
- ✅ Error handling and recovery
- ✅ Performance and response times
- ✅ Data persistence and storage

## Requirements Coverage

The tests validate all specified requirements:

- **Requirement 1.1**: Investment data processing and report generation ✅
- **Requirement 1.2**: Report formatting and display ✅
- **Requirement 1.3**: Report storage and user association ✅
- **Requirement 3.1**: Report history retrieval ✅
- **Requirement 3.2**: Chronological sorting ✅
- **Requirement 3.3**: Individual report access ✅
- **Requirement 4.1**: Rate limit handling ✅
- **Requirement 4.2**: Error logging and user-friendly messages ✅

## Test Configuration

### Unit Tests
- No external dependencies required
- Uses mock OpenAI client for isolated testing
- Tests core business logic and error handling

### Integration Tests
- Requires running server on `http://localhost:3000`
- Creates test user account automatically
- Tests real API endpoints and database operations
- Configurable timeout and retry settings

## Troubleshooting

### Common Issues

1. **Integration tests fail with "Server returned 404"**
   - Ensure the server is running: `node server.js`
   - Check that the server is accessible at `http://localhost:3000`

2. **Authentication setup fails**
   - Verify Firebase configuration in `.env`
   - Ensure database is initialized: `node scripts/init-firebase.js`

3. **OpenAI API tests fail**
   - Check `OPENAI_API_KEY` in `.env`
   - Verify API key has sufficient quota
   - Run `node test-openai-setup.js` to validate configuration

### Test Data Cleanup

Integration tests create test data that should be cleaned up:
- Test user account: `integration-test@example.com`
- Generated reports in Firestore
- Usage tracking entries

## Continuous Integration

For CI/CD pipelines:

```bash
# Run unit tests (always safe to run)
npm run test:unit

# Run integration tests (requires environment setup)
npm run test:integration

# Run comprehensive tests
npm run test:comprehensive
```

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "test:unit": "node test-chatgpt-service-unit.js",
    "test:integration": "node test-chatgpt-integration.js", 
    "test:comprehensive": "node test-chatgpt-comprehensive.js"
  }
}
```

## Performance Benchmarks

Expected performance metrics:
- Unit tests: < 100ms total execution time
- Basic report generation: < 30 seconds
- Integration test suite: < 5 minutes (with server running)
- Memory usage: < 100MB during test execution

## Security Testing

The tests include security validations:
- Authentication bypass prevention
- Unauthorized report access prevention
- Input validation and sanitization
- API key protection
- User data isolation

## Maintenance

Update tests when:
- Adding new ChatGPT service features
- Modifying API endpoints
- Changing error handling logic
- Adding new report types
- Updating authentication mechanisms

The test suite is designed to be maintainable and extensible for future ChatGPT integration enhancements.