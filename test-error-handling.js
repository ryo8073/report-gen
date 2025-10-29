// Test script for API error handling
import fs from 'fs';
import path from 'path';

// Mock the API endpoint for testing
async function testErrorHandling() {
  console.log('Testing API Error Handling...\n');

  // Test 1: Missing report type
  console.log('Test 1: Missing report type');
  try {
    const mockReq = {
      method: 'POST',
      body: {
        inputText: 'Test input'
      }
    };
    
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          console.log(`Status: ${code}`);
          console.log('Response:', JSON.stringify(data, null, 2));
          return data;
        },
        end: () => console.log('Response ended')
      }),
      setHeader: () => {}
    };

    // Import and test the API
    const { default: apiHandler } = await import('./api/generate.js');
    await apiHandler(mockReq, mockRes);
  } catch (error) {
    console.log('Error caught:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Invalid file data
  console.log('Test 2: Invalid file data');
  try {
    const mockReq = {
      method: 'POST',
      body: {
        reportType: 'custom',
        inputText: 'Test input',
        files: [
          {
            name: 'test.pdf',
            type: 'application/pdf',
            data: 'invalid-base64-data!'
          }
        ]
      }
    };
    
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          console.log(`Status: ${code}`);
          console.log('Response:', JSON.stringify(data, null, 2));
          return data;
        }
      }),
      setHeader: () => {}
    };

    const { default: apiHandler } = await import('./api/generate.js');
    await apiHandler(mockReq, mockRes);
  } catch (error) {
    console.log('Error caught:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Valid request structure (will fail due to missing OpenAI key in test)
  console.log('Test 3: Valid request structure');
  try {
    const mockReq = {
      method: 'POST',
      body: {
        reportType: 'custom',
        inputText: 'This is a test input for report generation.',
        files: [],
        additionalInfo: {},
        options: {}
      }
    };
    
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          console.log(`Status: ${code}`);
          console.log('Response:', JSON.stringify(data, null, 2));
          return data;
        }
      }),
      setHeader: () => {}
    };

    const { default: apiHandler } = await import('./api/generate.js');
    await apiHandler(mockReq, mockRes);
  } catch (error) {
    console.log('Error caught:', error.message);
  }
}

// Run the tests
testErrorHandling().catch(console.error);