// Vision Processing Diagnostic Test
const fs = require('fs').promises;

async function testVisionProcessing() {
  console.log('🔍 Vision Processing Diagnostic Test');
  console.log('=' .repeat(50));

  // Test 1: Check environment variables
  console.log('\n1. Environment Variables:');
  console.log(`OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'Set' : 'Missing'}`);
  console.log(`GOOGLE_AI_API_KEY: ${process.env.GOOGLE_AI_API_KEY ? 'Set' : 'Missing'}`);

  // Test 2: Test file processing endpoint
  console.log('\n2. Testing file processing endpoint...');
  
  try {
    const testData = {
      reportType: 'jp_investment_4part',
      inputText: 'テスト用の投資分析',
      files: [
        {
          name: 'test-image.png',
          type: 'image/png',
          data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' // 1x1 pixel PNG
        }
      ],
      additionalInfo: 'テスト用'
    };

    const response = await fetch('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log(`Response status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ File processing successful');
      console.log(`Report generated: ${result.title}`);
      console.log(`AI Service used: ${result.aiService || 'unknown'}`);
      console.log(`Content length: ${result.content?.length || 0} characters`);
    } else {
      const error = await response.json();
      console.log('❌ File processing failed');
      console.log(`Error: ${error.error?.message || 'Unknown error'}`);
    }

  } catch (error) {
    console.log('❌ Test failed with exception:');
    console.log(error.message);
  }

  // Test 3: Check for common issues
  console.log('\n3. Common Issues Check:');
  
  // Check if server is running
  try {
    const healthCheck = await fetch('http://localhost:3000/api/generate', {
      method: 'GET'
    });
    console.log(`✅ Server is responding (status: ${healthCheck.status})`);
  } catch (error) {
    console.log('❌ Server not responding - make sure the server is running');
  }

  console.log('\n' + '=' .repeat(50));
  console.log('Diagnostic complete. Check the logs above for issues.');
}

// Run the test
testVisionProcessing().catch(console.error);