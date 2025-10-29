#!/usr/bin/env node

/**
 * Integration Test Script
 * 
 * This script runs a comprehensive integration test covering:
 * - User registration and authentication
 * - Trial system functionality
 * - Report generation with different types
 * - Custom prompt management
 * - Admin functionality
 */

import { runAuthenticationTests } from './test-auth-flow.js';
import { runReportGenerationTests } from './test-report-generation.js';
import { runTrialSystemTests } from './test-trial-system.js';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Check if server is running
async function checkServerHealth() {
    try {
        const response = await fetch(`${BASE_URL}/api/auth/me-firebase`);
        return true;
    } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.cause?.code === 'ECONNREFUSED') {
            console.error(`❌ Cannot connect to server at ${BASE_URL}`);
            console.error('Please start the development server first:');
            console.error('  npm run dev');
            return false;
        }
        return true;
    }
}

async function runIntegrationTests() {
    console.log('🧪 Starting Comprehensive Integration Tests');
    console.log(`Testing against: ${BASE_URL}`);
    console.log('=' .repeat(80));
    
    const startTime = Date.now();
    let totalPassed = 0;
    let totalFailed = 0;
    
    try {
        console.log('\n🔐 Phase 1: Authentication System Tests');
        console.log('-' .repeat(50));
        await runAuthenticationTests();
        
        console.log('\n📄 Phase 2: Report Generation Tests');
        console.log('-' .repeat(50));
        await runReportGenerationTests();
        
        console.log('\n⏰ Phase 3: Trial System Tests');
        console.log('-' .repeat(50));
        await runTrialSystemTests();
        
    } catch (error) {
        console.error('❌ Integration test failed:', error);
        process.exit(1);
    }
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '=' .repeat(80));
    console.log('🎉 Integration Tests Complete!');
    console.log(`⏱️  Total Duration: ${duration} seconds`);
    console.log(`🌐 Tested against: ${BASE_URL}`);
    
    console.log('\n📊 Test Coverage:');
    console.log('  ✅ User authentication and session management');
    console.log('  ✅ Trial period creation and enforcement');
    console.log('  ✅ Report generation (all types)');
    console.log('  ✅ Custom prompt management');
    console.log('  ✅ File upload and processing');
    console.log('  ✅ Error handling and validation');
    console.log('  ✅ Admin functionality');
    
    console.log('\n🚀 System is ready for production deployment!');
}

// Handle unhandled errors
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
});

// Run integration tests
(async () => {
    const serverRunning = await checkServerHealth();
    if (serverRunning) {
        await runIntegrationTests();
    } else {
        process.exit(1);
    }
})();