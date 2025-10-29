// Debug authentication issue
import http from 'http';

// Set NODE_ENV to development to get error details
process.env.NODE_ENV = 'development';

const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'yamanami-ryo@heya.co.jp';
const TEST_PASSWORD = 'admin123';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData,
            rawData: data
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: {},
            rawData: data
          });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

async function testAuth() {
  console.log('🔍 Debug Authentication Issue');
  console.log('================================');
  
  try {
    console.log('Testing login endpoint...');
    
    const response = await makeRequest(`${BASE_URL}/api/auth/login-firebase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      })
    });

    console.log('Response Status:', response.status);
    console.log('Response Headers:', response.headers);
    console.log('Response Data:', response.data);
    console.log('Raw Response:', response.rawData);
    
    if (response.status === 500) {
      console.log('\n❌ Server Error Details:');
      if (response.data.details) {
        console.log('Error Details:', response.data.details);
      }
    }
    
  } catch (error) {
    console.error('Request Error:', error);
  }
}

testAuth();