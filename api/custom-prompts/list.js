// List user's custom prompts endpoint
import { FirebaseDatabase } from '../lib/firebase-db.js';

const db = new FirebaseDatabase();
import { verifyToken } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user data
    const userResult = await db.getUserById(decoded.userId);
    if (!userResult.success || !userResult.data.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Get user's custom prompts
    const promptsResult = await db.getUserCustomPrompts(decoded.userId);

    if (promptsResult.success) {
      return res.status(200).json({
        success: true,
        prompts: promptsResult.data
      });
    } else {
      return res.status(500).json({ error: 'Failed to retrieve custom prompts' });
    }

  } catch (error) {
    console.error('List custom prompts error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}