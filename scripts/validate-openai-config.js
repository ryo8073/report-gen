/**
 * OpenAI Configuration Validation Script
 * Tests OpenAI API key configuration and provides setup guidance
 */

import fs from 'fs';

// Load environment variables from .env file FIRST
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
} else {
  console.log('.env file not found');
}

import openaiConfig from '../lib/openai-config.js';

/**
 * Validate OpenAI configuration and display results
 */
function validateOpenAIConfiguration() {
  console.log('🔍 Validating OpenAI API Configuration...\n');

  const status = openaiConfig.getConfigurationStatus();

  console.log('Configuration Status:');
  console.log(`✓ API Key Present: ${status.apiKeyPresent ? '✅ Yes' : '❌ No'}`);
  console.log(`✓ Configuration Valid: ${status.isConfigured ? '✅ Yes' : '❌ No'}`);

  if (status.validationError) {
    console.log(`❌ Validation Error: ${status.validationError}`);
  }

  if (status.setupInstructions) {
    console.log('\n📋 Setup Instructions:');
    console.log(status.setupInstructions);
  }

  if (status.isConfigured) {
    console.log('\n🎉 OpenAI API is properly configured and ready to use!');
    
    // Test basic API key format without making actual API call
    const apiKey = openaiConfig.getApiKey();
    if (apiKey) {
      console.log(`✓ API Key Format: ${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`);
    }
  } else {
    console.log('\n⚠️  OpenAI API configuration needs attention before use.');
  }

  return status.isConfigured;
}

// Run validation if script is executed directly
if (process.argv[1] && process.argv[1].endsWith('validate-openai-config.js')) {
  const isValid = validateOpenAIConfiguration();
  process.exit(isValid ? 0 : 1);
}

export { validateOpenAIConfiguration };