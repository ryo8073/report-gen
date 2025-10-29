// Trial upgrade endpoint (demo implementation)
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

    const { planType } = req.body;

    // Validate plan type
    const validPlans = ['basic', 'pro', 'enterprise'];
    if (!validPlans.includes(planType)) {
      return res.status(400).json({ error: 'Invalid plan type' });
    }

    // Get user data
    const userResult = await db.getUserById(decoded.userId);
    if (!userResult.success || !userResult.data.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // In a real implementation, this would:
    // 1. Process payment through Stripe/PayPal/etc.
    // 2. Verify payment success
    // 3. Update subscription status

    // For demo purposes, directly upgrade the user
    const upgradeResult = await db.upgradeToSubscription(decoded.userId, planType);

    if (upgradeResult.success) {
      // Log the upgrade
      await db.logUsage({
        action: 'subscription_upgrade_demo',
        userId: decoded.userId,
        email: userResult.data.email,
        planType: planType,
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      });

      return res.status(200).json({
        success: true,
        message: 'Upgrade successful',
        planType: planType,
        note: 'This is a demo implementation. In production, payment processing would be required.'
      });
    } else {
      return res.status(500).json({ error: 'Failed to upgrade subscription' });
    }

  } catch (error) {
    console.error('Trial upgrade error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}