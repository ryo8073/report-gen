import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDatabase } from './database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
const SESSION_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Password utilities
export async function hashPassword(password) {
  const saltRounds = 12; // High security salt rounds
  return await bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// JWT utilities
export function generateToken(userId, email) {
  return jwt.sign(
    { 
      userId, 
      email,
      iat: Math.floor(Date.now() / 1000)
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Session management
export async function createSession(userId, ipAddress, userAgent) {
  const db = getDatabase();
  const sessionToken = generateToken(userId, 'session');
  const expiresAt = new Date(Date.now() + SESSION_EXPIRES_IN);
  
  await db.createSession(userId, sessionToken, expiresAt, ipAddress, userAgent);
  return sessionToken;
}

export async function validateSession(sessionToken) {
  const db = getDatabase();
  const session = await db.getSession(sessionToken);
  
  if (!session) {
    return null;
  }
  
  // Update last login
  await db.updateLastLogin(session.user_id);
  
  return {
    userId: session.user_id,
    sessionId: session.id
  };
}

export async function destroySession(sessionToken) {
  const db = getDatabase();
  await db.deleteSession(sessionToken);
}

// User authentication
export async function authenticateUser(email, password, ipAddress, userAgent) {
  const db = getDatabase();
  
  try {
    // Get user by email
    const user = await db.getUserByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }
    
    // Create session
    const sessionToken = await createSession(user.id, ipAddress, userAgent);
    
    // Log login
    await db.logUsage(user.id, 'user_login', null, 0, 0, ipAddress);
    
    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      sessionToken
    };
  } catch (error) {
    throw error;
  }
}

export async function registerUser(email, password, name, ipAddress) {
  const db = getDatabase();
  
  try {
    // Check if user already exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      throw new Error('User already exists');
    }
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Create user
    const user = await db.createUser(email, passwordHash, name);
    
    // Log registration
    await db.logUsage(user.id, 'user_registration', null, 0, 0, ipAddress);
    
    return {
      userId: user.id,
      email: user.email,
      name: user.name
    };
  } catch (error) {
    throw error;
  }
}

// Middleware for protected routes
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const sessionToken = req.headers['x-session-token'];
    
    let token = null;
    
    // Check for Bearer token in Authorization header
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    // Check for session token in custom header
    else if (sessionToken) {
      token = sessionToken;
    }
    // Check for token in cookies
    else if (req.cookies && req.cookies.sessionToken) {
      token = req.cookies.sessionToken;
    }
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    // Validate session
    const session = await validateSession(token);
    if (!session) {
      return res.status(401).json({ 
        error: 'Invalid or expired session',
        code: 'INVALID_SESSION'
      });
    }
    
    // Get user details
    const db = getDatabase();
    const user = await db.getUserById(session.userId);
    if (!user) {
      return res.status(401).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Add user info to request
    req.user = user;
    req.sessionId = session.sessionId;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
}

// Rate limiting for auth endpoints
export function createAuthRateLimit() {
  const attempts = new Map();
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  const MAX_ATTEMPTS = 5; // Max attempts per window
  
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const windowStart = now - WINDOW_MS;
    
    // Clean old attempts
    if (attempts.has(key)) {
      const userAttempts = attempts.get(key).filter(time => time > windowStart);
      attempts.set(key, userAttempts);
    }
    
    // Check current attempts
    const userAttempts = attempts.get(key) || [];
    if (userAttempts.length >= MAX_ATTEMPTS) {
      return res.status(429).json({
        error: 'Too many authentication attempts. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(WINDOW_MS / 1000)
      });
    }
    
    // Add current attempt
    userAttempts.push(now);
    attempts.set(key, userAttempts);
    
    next();
  };
}

// Input validation
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password) {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}

export function validateName(name) {
  return name && name.trim().length >= 2 && name.trim().length <= 50;
}

// Security headers
export function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
}

export default {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  createSession,
  validateSession,
  destroySession,
  authenticateUser,
  registerUser,
  requireAuth,
  createAuthRateLimit,
  validateEmail,
  validatePassword,
  validateName,
  setSecurityHeaders
};
