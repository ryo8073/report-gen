#!/usr/bin/env node

// Production Issue Diagnostic Script
// This script helps identify why the AI services are failing in production

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔍 Diagnosing Production AI Service Issues...\n');

// 1. Check Environment Variables
console.log('1. Environment Variables Check:');
console.log('================================');

const requiredEnvVars = [
  'OPENAI_API_KEY',
  'GOOGLE_AI_API_KEY',
  'NODE_ENV'
];

let envIssues = [];

requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`❌ ${varName}: NOT SET`);
    envIssues.push(varName);
  } else {
    // Show partial value for security
    const maskedValue = value.length > 10 ? 
      `${value.substring(0, 6)}...${value.substring(value.length - 4)}` : 
      '***masked***';
    console.log(`✅ ${varName}: ${maskedValue} (${value.length} chars)`);
  }
});

console.log('');

// 2. Check API Key Formats
console.log('2. API Key Format Validation:');
console.log('=============================');

const openaiKey = process.env.OPENAI_API_KEY;
if (openaiKey) {
  if (openaiKey.startsWith('sk-')) {
    console.log('✅ OpenAI API key format appears correct');
  } else {
    console.log('❌ OpenAI API key format appears incorrect (should start with sk-)');
    envIssues.push('OPENAI_API_KEY format');
  }
} else {
  console.log('❌ OpenAI API key not found');
}

const geminiKey = process.env.GOOGLE_AI_API_KEY;
if (geminiKey) {
  if (geminiKey.startsWith('AIza') && geminiKey.length === 39) {
    console.log('✅ Google AI API key format appears correct');
  } else {
    console.log('❌ Google AI API key format appears incorrect');
    envIssues.push('GOOGLE_AI_API_KEY format');
  }
} else {
  console.log('❌ Google AI API key not found');
}

console.log('');

// 3. Test SDK Imports
console.log('3. SDK Import Test:');
console.log('===================');

try {
  const { default: OpenAI } = await import('openai');
  console.log('✅ OpenAI SDK import successful');
  
  if (openaiKey) {
    try {
      const openai = new OpenAI({ apiKey: openaiKey });
      console.log('✅ OpenAI client initialization successful');
    } catch (error) {
      console.log(`❌ OpenAI client initialization failed: ${error.message}`);
      envIssues.push('OpenAI client init');
    }
  }
} catch (error) {
  console.log(`❌ OpenAI SDK import failed: ${error.message}`);
  envIssues.push('OpenAI SDK');
}

try {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  console.log('✅ Google AI SDK import successful');
  
  if (geminiKey) {
    try {
      const gemini = new GoogleGenerativeAI(geminiKey);
      const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
      console.log('✅ Gemini client initialization successful');
    } catch (error) {
      console.log(`❌ Gemini client initialization failed: ${error.message}`);
      envIssues.push('Gemini client init');
    }
  }
} catch (error) {
  console.log(`❌ Google AI SDK import failed: ${error.message}`);
  envIssues.push('Google AI SDK');
}

console.log('');

// 4. Summary and Recommendations
console.log('4. Summary and Recommendations:');
console.log('===============================');

if (envIssues.length === 0) {
  console.log('✅ All checks passed! The issue might be:');
  console.log('   - Network connectivity in production environment');
  console.log('   - Vercel environment variables not properly set');
  console.log('   - API rate limits or service outages');
  console.log('');
  console.log('📝 Next steps:');
  console.log('   1. Check Vercel dashboard environment variables');
  console.log('   2. Verify API keys are active and have sufficient quota');
  console.log('   3. Test API connectivity from production environment');
} else {
  console.log('❌ Issues found:');
  envIssues.forEach(issue => {
    console.log(`   - ${issue}`);
  });
  console.log('');
  console.log('📝 Fix these issues and redeploy to resolve the 503 errors.');
}

console.log('');
console.log('🔧 For Vercel deployment:');
console.log('   1. Go to Vercel dashboard > Project > Settings > Environment Variables');
console.log('   2. Ensure all required variables are set for Production environment');
console.log('   3. Redeploy after adding/updating environment variables');
console.log('');
console.log('💡 Tip: The backup system should work even if one service fails,');
console.log('   so both services failing suggests an environment configuration issue.');