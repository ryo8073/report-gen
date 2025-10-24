import { destroySession, setSecurityHeaders } from '../../lib/auth.js';

export default async function handler(req, res) {
  // Set security headers
  setSecurityHeaders(res);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get session token from various sources
    const authHeader = req.headers.authorization;
    const sessionToken = req.headers['x-session-token'];
    const cookieToken = req.cookies?.sessionToken;
    
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (sessionToken) {
      token = sessionToken;
    } else if (cookieToken) {
      token = cookieToken;
    }

    if (token) {
      // Destroy session
      await destroySession(token);
    }

    // Clear cookie
    res.setHeader('Set-Cookie', 'sessionToken=; HttpOnly; Secure; SameSite=strict; Max-Age=0; Path=/');

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      error: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
}
