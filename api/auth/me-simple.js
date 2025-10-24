import jwt from 'jsonwebtoken';
import SimpleDatabase from '../../lib/simple-db.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get token from cookie
    const token = req.cookies?.token || req.headers.cookie?.split('token=')[1]?.split(';')[0];
    
    if (!token) {
      return res.status(401).json({ 
        error: 'No authentication token found' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Initialize database
    const db = new SimpleDatabase();
    
    // Get user
    const user = await db.findUserById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'User not found' 
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Auth check error:', error);
    return res.status(401).json({ 
      error: 'Invalid token' 
    });
  }
}
