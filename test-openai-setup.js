/**
 * Test OpenAI API Setup and Configuration
 * Verifies that OpenAI API is properly configured and accessible
 */

import fs from 'fs';

// Load environment variables from .env file
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  const lines = envContent.split('\n');
  
  for (const line of lines) {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        process.env[key.trim()] = value;
      }
    }
  }
}

import OpenAI from 'openai';
import openaiConfig from './lib/openai-config.js';

/**
 * Test OpenAI configuration and basic connectivity
 */
async function testOpenAISetup() {
  console.log('🧪 Testing OpenAI API Setup...\n');

  // Test 1: Configuration validation
  console.log('1. Testing configuration validation...');
  const configStatus = openaiConfig.getConfigurationStatus();
  
  if (!configStatus.isConfigured) {
    console.log('❌ Configuration validation failed');
    console.log(configStatus.setupInstructions);
    return false;
  }
  console.log('✅ Configuration validation passed');

  // Test 2: OpenAI client initialization
  console.log('\n2. Testing OpenAI client initialization...');
  try {
    const apiKey = openaiConfig.getApiKey();
    const client = new OpenAI({
      apiKey: apiKey
    });
    console.log('✅ OpenAI client initialized successfully');

    // Test 3: Basic API connectivity (list models - lightweight test)
    console.log('\n3. Testing API connectivity...');
    try {
      const models = await client.models.list();
      if (models && models.data && models.data.length > 0) {
        console.log('✅ API connectivity test passed');
        console.log(`   Found ${models.data.length} available models`);
        
        // Check for GPT models
        const gptModels = models.data.filter(model => 
          model.id.includes('gpt') || model.id.includes('chatgpt')
        );
        if (gptModels.length > 0) {
          console.log(`   GPT models available: ${gptModels.length}`);
        }
      } else {
        console.log('⚠️  API responded but no models found');
      }
    } catch (apiError) {
      console.log('❌ API connectivity test failed');
      console.log(`   Error: ${apiError.message}`);
      
      if (apiError.status === 401) {
        console.log('   This indicates an invalid API key');
      } else if (apiError.status === 429) {
        console.log('   This indicates rate limiting - API key is valid but quota exceeded');
      }
      return false;
    }

  } catch (clientError) {
    console.log('❌ OpenAI client initialization failed');
    console.log(`   Error: ${clientError.message}`);
    return false;
  }

  console.log('\n🎉 All OpenAI setup tests passed! Ready for ChatGPT integration.');
  return true;
}

// Run tests if script is executed directly
if (process.argv[1] && process.argv[1].endsWith('test-openai-setup.js')) {
  testOpenAISetup()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { testOpenAISetup };