// Delete custom prompt endpoint
import { FirebaseDatabase } from '../lib/firebase-db.js';

const db = new FirebaseDatabase();
import { verifyToken } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
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

    const { promptId } = req.query;

    if (!promptId) {
      return res.status(400).json({ error: 'Prompt ID is required' });
    }

    // Get the prompt to verify ownership
    const promptResult = await db.getCustomPromptById(promptId);
    if (!promptResult.success) {
      return res.status(404).json({ error: 'Custom prompt not found' });
    }

    // Check if user owns this prompt or is admin
    if (promptResult.data.userId !== decoded.userId && userResult.data.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete the prompt
    const deleteResult = await db.deleteCustomPrompt(promptId);

    if (deleteResult.success) {
      // Log usage
      await db.logUsage({
        action: 'custom_prompt_deleted',
        userId: decoded.userId,
        email: userResult.data.email,
        promptId: promptId,
        promptTitle: promptResult.data.title,
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      });

      return res.status(200).json({
        success: true,
        message: 'Custom prompt deleted successfully'
      });
    } else {
      return res.status(500).json({ error: 'Failed to delete custom prompt' });
    }

  } catch (error) {
    console.error('Delete custom prompt error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}