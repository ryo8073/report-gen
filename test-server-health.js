// Simple server health check
import http from 'http';

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

async function checkServerHealth() {
  try {
    console.log('Checking server health...');
    
    // Try to access the main page
    const response = await makeRequest('http://localhost:3000/');
    console.log(`Main page status: ${response.status}`);
    
    if (response.status === 200) {
      console.log('✅ Server is responding');
      return true;
    } else {
      console.log(`❌ Server returned status: ${response.status}`);
      console.log('Response:', response.rawData.substring(0, 200));
      return false;
    }
  } catch (error) {
    console.log(`❌ Server connection failed: ${error.message}`);
    return false;
  }
}

async function testAuthEndpoint() {
  try {
    console.log('Testing auth endpoint...');
    
    const response = await makeRequest('http://localhost:3000/api/auth/login-firebase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin123'
      })
    });

    console.log(`Auth endpoint status: ${response.status}`);
    console.log('Auth response:', response.rawData);
    
    return response.status === 200;
  } catch (error) {
    console.log(`❌ Auth endpoint failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🔍 Server Health Check');
  console.log('=' .repeat(40));
  
  const serverHealthy = await checkServerHealth();
  if (!serverHealthy) {
    console.log('Server is not responding properly');
    return;
  }
  
  await testAuthEndpoint();
}

main().catch(console.error);