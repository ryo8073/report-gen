import bcrypt from 'bcryptjs';
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
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: 'すべてのフィールドが必要です' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: '有効なメールアドレスを入力してください' 
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'パスワードは8文字以上である必要があります' 
      });
    }

    // Initialize database
    const db = new SimpleDatabase();
    
    // Check if user already exists
    const existingUser = await db.findUserByEmail(email.toLowerCase().trim());
    
    if (existingUser) {
      return res.status(400).json({ 
        error: 'このメールアドレスは既に登録されています' 
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await db.createUser(
      email.toLowerCase().trim(),
      hashedPassword,
      name.trim(),
      'user'
    );

    // Log registration activity
    await db.logUsage(user.id, 'registration', `User ${user.email} registered`, req.headers['x-forwarded-for'] || req.connection.remoteAddress);

    return res.status(201).json({
      success: true,
      message: 'アカウントが正常に作成されました',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      error: 'サーバーエラーが発生しました' 
    });
  }
}
