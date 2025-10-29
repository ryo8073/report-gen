#!/usr/bin/env node

/**
 * Google AI Studio/Gemini API Setup Test
 * Tests the Google AI API key configuration and basic connectivity
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;

console.log('🔍 Testing Google AI Studio/Gemini API Setup...\n');

// Test 1: Check if API key is configured
console.log('1. Checking API Key Configuration...');
if (!GOOGLE_AI_API_KEY) {
    console.error('❌ GOOGLE_AI_API_KEY not found in environment variables');
    console.log('   Please add GOOGLE_AI_API_KEY to your .env file');
    process.exit(1);
}

if (GOOGLE_AI_API_KEY === 'your_google_ai_api_key_here') {
    console.error('❌ GOOGLE_AI_API_KEY is still set to placeholder value');
    console.log('   Please replace with your actual Google AI Studio API key');
    process.exit(1);
}

console.log('✅ API key found in environment variables');
console.log(`   Key format: ${GOOGLE_AI_API_KEY.substring(0, 10)}...${GOOGLE_AI_API_KEY.substring(GOOGLE_AI_API_KEY.length - 4)}`);

// Test 2: Initialize Google AI client
console.log('\n2. Initializing Google AI Client...');
let genAI;
try {
    genAI = new GoogleGenerativeAI(GOOGLE_AI_API_KEY);
    console.log('✅ Google AI client initialized successfully');
} catch (error) {
    console.error('❌ Failed to initialize Google AI client:', error.message);
    process.exit(1);
}

// Test 3: Test basic API connectivity with a simple prompt
console.log('\n3. Testing API Connectivity...');
try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    const prompt = "Hello! Please respond with 'API connection successful' to confirm the connection is working.";
    
    console.log('   Sending test prompt to Gemini API...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ API connection successful!');
    console.log(`   Response: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
    
    // Test 4: Validate response structure
    console.log('\n4. Validating Response Structure...');
    if (response && typeof response.text === 'function') {
        console.log('✅ Response structure is valid');
        console.log(`   Response length: ${text.length} characters`);
    } else {
        console.warn('⚠️  Unexpected response structure');
        console.log('   Response object:', typeof response);
    }
    
} catch (error) {
    console.error('❌ API connection failed:', error.message);
    
    // Provide helpful error messages
    if (error.message.includes('API_KEY_INVALID')) {
        console.log('   → The API key appears to be invalid');
        console.log('   → Please check your Google AI Studio API key');
    } else if (error.message.includes('PERMISSION_DENIED')) {
        console.log('   → Permission denied - check API key permissions');
    } else if (error.message.includes('QUOTA_EXCEEDED')) {
        console.log('   → API quota exceeded - check your usage limits');
    } else {
        console.log('   → Check your internet connection and API key');
    }
    
    process.exit(1);
}

// Test 5: Test model configuration options
console.log('\n5. Testing Model Configuration...');
try {
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash-exp",
        generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 100,
        }
    });
    
    const testPrompt = "Say 'Configuration test successful' in exactly 3 words.";
    const result = await model.generateContent(testPrompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Model configuration test successful');
    console.log(`   Configured response: ${text.trim()}`);
    
} catch (error) {
    console.error('❌ Model configuration test failed:', error.message);
    process.exit(1);
}

console.log('\n🎉 All Google AI Studio/Gemini API tests passed!');
console.log('   The API is ready for use in the backup service implementation.');
console.log('\n📝 Next steps:');
console.log('   1. The Google AI SDK has been installed');
console.log('   2. Environment variables are configured');
console.log('   3. API connectivity has been verified');
console.log('   4. You can now proceed with implementing the Gemini integration');