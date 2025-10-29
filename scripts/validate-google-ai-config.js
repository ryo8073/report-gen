#!/usr/bin/env node

/**
 * Google AI Studio/Gemini API Configuration Validator
 * Validates the Google AI API configuration without making API calls
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;

console.log('🔍 Validating Google AI Studio/Gemini API Configuration...\n');

let hasErrors = false;

// Check if API key exists
console.log('1. Checking API Key Presence...');
if (!GOOGLE_AI_API_KEY) {
    console.error('❌ GOOGLE_AI_API_KEY not found in environment variables');
    console.log('   Add GOOGLE_AI_API_KEY to your .env file');
    hasErrors = true;
} else {
    console.log('✅ GOOGLE_AI_API_KEY found in environment');
}

// Check if API key is not placeholder
console.log('\n2. Checking API Key Value...');
if (GOOGLE_AI_API_KEY === 'your_google_ai_api_key_here') {
    console.error('❌ GOOGLE_AI_API_KEY is set to placeholder value');
    console.log('   Replace with your actual Google AI Studio API key');
    hasErrors = true;
} else if (GOOGLE_AI_API_KEY) {
    console.log('✅ API key appears to be configured');
    console.log(`   Key format: ${GOOGLE_AI_API_KEY.substring(0, 10)}...${GOOGLE_AI_API_KEY.substring(GOOGLE_AI_API_KEY.length - 4)}`);
}

// Check API key format (basic validation)
console.log('\n3. Checking API Key Format...');
if (GOOGLE_AI_API_KEY && GOOGLE_AI_API_KEY !== 'your_google_ai_api_key_here') {
    // Google AI Studio API keys typically start with 'AIza'
    if (GOOGLE_AI_API_KEY.startsWith('AIza')) {
        console.log('✅ API key format appears valid (starts with AIza)');
    } else {
        console.warn('⚠️  API key format may be incorrect');
        console.log('   Google AI Studio API keys typically start with "AIza"');
        console.log('   Please verify your API key is correct');
    }
    
    // Check length (Google AI keys are typically 39 characters)
    if (GOOGLE_AI_API_KEY.length === 39) {
        console.log('✅ API key length appears correct (39 characters)');
    } else {
        console.warn(`⚠️  API key length is ${GOOGLE_AI_API_KEY.length} characters`);
        console.log('   Google AI Studio API keys are typically 39 characters');
    }
}

// Check if Google AI SDK is installed
console.log('\n4. Checking Google AI SDK Installation...');
try {
    await import('@google/generative-ai');
    console.log('✅ Google AI SDK (@google/generative-ai) is installed');
} catch (error) {
    console.error('❌ Google AI SDK not found');
    console.log('   Run: npm install @google/generative-ai');
    hasErrors = true;
}

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
    console.log('❌ Configuration validation failed');
    console.log('   Please fix the issues above before proceeding');
    process.exit(1);
} else {
    console.log('✅ Google AI configuration validation passed');
    console.log('   Configuration appears ready for use');
    
    if (GOOGLE_AI_API_KEY !== 'your_google_ai_api_key_here') {
        console.log('\n📝 To test API connectivity, run:');
        console.log('   npm run test:google-ai');
    } else {
        console.log('\n📝 Next steps:');
        console.log('   1. Add your actual Google AI Studio API key to .env');
        console.log('   2. Run: npm run test:google-ai');
    }
}