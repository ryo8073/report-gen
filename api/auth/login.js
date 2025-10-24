import { 
  authenticateUser, 
  validateEmail,
  createAuthRateLimit,
  setSecurityHeaders 
} from '../../lib/auth.js';

// Apply rate limiting
const rateLimit = createAuthRateLimit();

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

  // Apply rate limiting
  return new Promise((resolve) => {
    rateLimit(req, res, async () => {
      try {
        const { email, password } = req.body;

        // Input validation
        if (!email || !password) {
          return res.status(400).json({ 
            error: 'Email and password are required',
            code: 'MISSING_FIELDS'
          });
        }

        if (!validateEmail(email)) {
          return res.status(400).json({ 
            error: 'Invalid email format',
            code: 'INVALID_EMAIL'
          });
        }

        // Get client IP and User Agent
        const ipAddress = req.headers['x-forwarded-for'] || 
                         req.connection.remoteAddress || 
                         req.socket.remoteAddress ||
                         (req.connection.socket ? req.connection.socket.remoteAddress : null);
        
        const userAgent = req.headers['user-agent'] || 'Unknown';

        // Authenticate user
        const authResult = await authenticateUser(
          email.toLowerCase().trim(), 
          password, 
          ipAddress, 
          userAgent
        );

        // Set secure HTTP-only cookie
        const cookieOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          path: '/'
        };

        res.setHeader('Set-Cookie', `sessionToken=${authResult.sessionToken}; ${Object.entries(cookieOptions).map(([key, value]) => `${key}=${value}`).join('; ')}`);

        // Return success
        res.status(200).json({
          success: true,
          message: 'Login successful',
          user: {
            id: authResult.userId,
            email: authResult.email,
            name: authResult.name,
            role: authResult.role
          }
        });

        resolve();

      } catch (error) {
        console.error('Login error:', error);
        
        if (error.message === 'Invalid credentials') {
          return res.status(401).json({ 
            error: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS'
          });
        }

        res.status(500).json({ 
          error: 'Login failed',
          code: 'LOGIN_ERROR'
        });
        
        resolve();
      }
    });
  });
}
