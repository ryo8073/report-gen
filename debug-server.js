#!/usr/bin/env node

/**
 * Debug Server - Simple test to check if basic functionality works
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3002;

// Middleware
app.use(express.json());
app.use(express.static('.'));

// Simple test endpoint
app.get('/api/test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Server is working!',
        timestamp: new Date().toISOString()
    });
});

// Test report generation endpoint (mock)
app.post('/api/generate-firebase', (req, res) => {
    console.log('Received request:', req.body);
    
    // Mock response
    res.json({
        success: true,
        content: 'This is a test report generated successfully!',
        markdown: 'This is a test report generated successfully!',
        reportType: req.body.reportType || 'test',
        timestamp: new Date().toISOString(),
        usage: {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150,
            estimatedCost: '0.001000'
        }
    });
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🧪 Debug server running at http://localhost:${PORT}`);
    console.log('This is a simple test server to check basic functionality');
    console.log('Try accessing:');
    console.log(`  - http://localhost:${PORT}/api/test`);
    console.log(`  - http://localhost:${PORT}/`);
});