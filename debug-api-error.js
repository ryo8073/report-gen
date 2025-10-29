// Debug API Error
import fetch from 'node-fetch';

async function debugApiError() {
  console.log('🔍 API Error Debug Test');
  console.log('=' .repeat(50));

  const testData = {
    reportType: 'jp_investment_4part',
    inputText: 'テスト用の投資分析',
    files: [
      {
        name: 'test-image.png',
        type: 'image/png',
        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      }
    ],
    additionalInfo: 'テスト用'
  };

  try {
    console.log('Sending request to production API...');
    const response = await fetch('https://report-gen-eight.vercel.app/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, Object.fromEntries(response.headers));

    const responseText = await response.text();
    console.log(`Response body:`, responseText);

    if (response.ok) {
      console.log('✅ Request successful');
    } else {
      console.log('❌ Request failed');
      try {
        const errorData = JSON.parse(responseText);
        console.log('Error details:', errorData);
      } catch (e) {
        console.log('Could not parse error response as JSON');
      }
    }

  } catch (error) {
    console.log('❌ Request failed with exception:');
    console.log(error.message);
  }
}

debugApiError().catch(console.error);