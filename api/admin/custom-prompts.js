// Admin custom prompts management endpoint
import { FirebaseDatabase } from '../lib/firebase-db.js';

const db = new FirebaseDatabase();
import { verifyToken } from '../../lib/auth.js';

export default async function handler(req, res) {
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

    // Get user data and verify admin role
    const userResult = await db.getUserById(decoded.userId);
    if (!userResult.success || !userResult.data.isActive || userResult.data.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (req.method === 'GET') {
      // Get all custom prompts for admin
      const { limit = 100, stats = false } = req.query;

      if (stats === 'true') {
        // Get statistics
        const statsResult = await db.getCustomPromptStats();
        if (statsResult.success) {
          return res.status(200).json({
            success: true,
            stats: statsResult.data
          });
        } else {
          return res.status(500).json({ error: 'Failed to retrieve statistics' });
        }
      } else {
        // Get all prompts
        const promptsResult = await db.getAllCustomPrompts(parseInt(limit));
        if (promptsResult.success) {
          return res.status(200).json({
            success: true,
            prompts: promptsResult.data
          });
        } else {
          return res.status(500).json({ error: 'Failed to retrieve custom prompts' });
        }
      }

    } else if (req.method === 'DELETE') {
      // Admin delete prompt
      const { promptId } = req.body;

      if (!promptId) {
        return res.status(400).json({ error: 'Prompt ID is required' });
      }

      // Get the prompt first
      const promptResult = await db.getCustomPromptById(promptId);
      if (!promptResult.success) {
        return res.status(404).json({ error: 'Custom prompt not found' });
      }

      // Delete the prompt
      const deleteResult = await db.deleteCustomPrompt(promptId);

      if (deleteResult.success) {
        // Log admin action
        await db.logUsage({
          action: 'admin_custom_prompt_deleted',
          userId: decoded.userId,
          email: userResult.data.email,
          promptId: promptId,
          promptTitle: promptResult.data.title,
          originalUserId: promptResult.data.userId,
          originalUserEmail: promptResult.data.userEmail,
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

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Admin custom prompts error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}