// Firebase-based user registration endpoint
import { FirebaseDatabase } from '../lib/firebase-db.js';

const db = new FirebaseDatabase();
import { hashPassword } from '../lib/auth.js';
import { createRateLimit } from '../lib/auth.js';

const rateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many registration attempts, please try again later.'
});

export default async function handler(req, res) {
  // Apply rate limiting
  await new Promise((resolve, reject) => {
    rateLimit(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, confirmPassword } = req.body;

    // Validation
    if (!email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Check if user already exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser.success) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create trial user
    const userData = {
      id: 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'user',
      isActive: true,
      createdAt: new Date().toISOString()
    };

    const result = await db.createTrialUser(userData);
    
    if (result.success) {
      // Log usage
      await db.logUsage({
        action: 'user_registration',
        userId: userData.id,
        email: email,
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      });

      return res.status(201).json({ 
        success: true, 
        message: 'User created successfully',
        userId: userData.id
      });
    } else {
      return res.status(500).json({ error: result.error });
    }

  } catch (error) {
    // Enhanced error logging
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      email: req.body?.email,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
      endpoint: '/api/auth/register-firebase'
    };
    
    console.error('Registration error:', errorInfo);
    
    // Log error to database if possible
    try {
      await db.logUsage({
        action: 'registration_error',
        email: req.body?.email,
        error: error.message,
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      });
    } catch (logError) {
      console.error('Failed to log registration error to database:', logError);
    }
    
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
