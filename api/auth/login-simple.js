import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import SimpleDatabase from '../../lib/simple-db.js';

export default async function handler(req, res) {
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
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'メールアドレスとパスワードが必要です' 
      });
    }

    // Initialize database
    const db = new SimpleDatabase();
    
    // Find user
    const user = await db.findUserByEmail(email.toLowerCase().trim());
    
    if (!user) {
      return res.status(401).json({ 
        error: 'メールアドレスまたはパスワードが正しくありません' 
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'メールアドレスまたはパスワードが正しくありません' 
      });
    }

    // Update last login
    await db.updateUserLogin(user.id);

    // Log login activity
    await db.logUsage(user.id, 'login', `User ${user.email} logged in`, req.headers['x-forwarded-for'] || req.connection.remoteAddress);

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set HTTP-only cookie
    res.setHeader('Set-Cookie', `token=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict`);

    return res.status(200).json({
      success: true,
      message: 'ログインに成功しました',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      error: 'サーバーエラーが発生しました' 
    });
  }
}
