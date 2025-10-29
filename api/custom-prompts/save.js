// Save custom prompt endpoint
import { FirebaseDatabase } from '../lib/firebase-db.js';

const db = new FirebaseDatabase();
import { verifyToken } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
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

    const { title, content, description, tags } = req.body;

    // Validation
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    if (title.length > 100) {
      return res.status(400).json({ error: 'Title must be 100 characters or less' });
    }

    if (content.length > 10000) {
      return res.status(400).json({ error: 'Content must be 10000 characters or less' });
    }

    // Save custom prompt
    const promptData = {
      userId: decoded.userId,
      userEmail: userResult.data.email,
      title: title.trim(),
      content: content.trim(),
      description: description ? description.trim() : '',
      tags: Array.isArray(tags) ? tags.filter(tag => tag.trim()).map(tag => tag.trim()) : [],
      isActive: true
    };

    const result = await db.saveCustomPrompt(promptData);

    if (result.success) {
      // Log usage
      await db.logUsage({
        action: 'custom_prompt_saved',
        userId: decoded.userId,
        email: userResult.data.email,
        promptId: result.id,
        promptTitle: title,
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      });

      return res.status(200).json({
        success: true,
        message: 'Custom prompt saved successfully',
        promptId: result.id
      });
    } else {
      return res.status(500).json({ error: 'Failed to save custom prompt' });
    }

  } catch (error) {
    console.error('Save custom prompt error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}