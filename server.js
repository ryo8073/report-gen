#!/usr/bin/env node

/**
 * Simple development server for testing
 * This serves static files and handles API routes
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serve static files
app.use(express.static('.'));
app.use('/lib', express.static('lib'));
app.use('/public', express.static('public'));

// API routes - dynamically import API handlers
app.use('/api', async (req, res, next) => {
    try {
        // Clean the path and construct file path
        let apiPath = req.path;
        if (apiPath.startsWith('/')) {
            apiPath = apiPath.slice(1);
        }
        
        const handlerPath = path.join(__dirname, 'api', `${apiPath}.js`);
        
        console.log(`API Request: ${req.method} ${req.originalUrl}`);
        console.log(`Looking for handler: ${handlerPath}`);
        
        // Check if file exists first
        const fs = await import('fs');
        if (!fs.existsSync(handlerPath)) {
            console.log(`Handler file not found: ${handlerPath}`);
            return res.status(404).json({ error: `API endpoint not found: ${req.path}` });
        }
        
        // Import and execute handler
        try {
            const handler = await import(`file://${handlerPath}?t=${Date.now()}`);
            if (handler.default && typeof handler.default === 'function') {
                await handler.default(req, res);
            } else {
                console.error(`Handler found but no default export function: ${handlerPath}`);
                res.status(500).json({ error: 'Invalid API handler' });
            }
        } catch (importError) {
            console.error(`Import/execution error for ${handlerPath}:`, importError);
            res.status(500).json({ 
                error: 'API handler error', 
                details: process.env.NODE_ENV === 'development' ? importError.message : 'Internal server error'
            });
        }
    } catch (error) {
        console.error('API middleware error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Serve HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Handle 404
app.use((req, res) => {
    res.status(404).send('Page not found');
});

// Error handler
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, async () => {
    console.log(`🚀 Development server running at http://localhost:${PORT}`);
    console.log('📁 Serving static files from current directory');
    console.log('🔌 API endpoints available at /api/*');
    
    // Check Firebase configuration
    try {
        const { validateFirebaseSetup } = await import('./scripts/validate-firebase-setup.js');
        const isValid = await validateFirebaseSetup();
        if (isValid) {
            console.log('✅ Firebase configuration validated');
        } else {
            console.log('⚠️  Firebase configuration issues detected');
        }
    } catch (error) {
        console.log('⚠️  Could not validate Firebase setup:', error.message);
    }
    
    console.log('\n📋 Available features:');
    console.log('  • User authentication with trial system');
    console.log('  • Report generation (4 types)');
    console.log('  • Custom prompt management');
    console.log('  • Admin dashboard');
    console.log('  • Trial period: 2 weeks or 15 uses');
    
    console.log('\n🧪 Test commands:');
    console.log('  npm run test:auth     - Test authentication');
    console.log('  npm run test:reports  - Test report generation');
    console.log('  npm run test:trial    - Test trial system');
    console.log('  npm run test:all      - Run all tests');
    
    console.log('\nPress Ctrl+C to stop the server');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down development server...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Shutting down development server...');
    process.exit(0);
});