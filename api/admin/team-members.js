// Admin team member management endpoint
import { FirebaseDatabase } from '../lib/firebase-db.js';

const db = new FirebaseDatabase();
import { verifyToken, hashPassword } from '../../lib/auth.js';

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
      // Get all users or filter by role
      const { role, stats } = req.query;

      if (stats === 'true') {
        // Get user statistics
        const statsResult = await db.getUserStats();
        if (statsResult.success) {
          return res.status(200).json({
            success: true,
            stats: statsResult.data
          });
        } else {
          return res.status(500).json({ error: 'Failed to retrieve user statistics' });
        }
      } else if (role) {
        // Get users by specific role
        const usersResult = await db.getUsersByRole(role);
        if (usersResult.success) {
          return res.status(200).json({
            success: true,
            users: usersResult.data
          });
        } else {
          return res.status(500).json({ error: 'Failed to retrieve users' });
        }
      } else {
        // Get all users
        const usersResult = await db.getAllUsers(200);
        if (usersResult.success) {
          return res.status(200).json({
            success: true,
            users: usersResult.data
          });
        } else {
          return res.status(500).json({ error: 'Failed to retrieve users' });
        }
      }

    } else if (req.method === 'POST') {
      // Create new team member
      const { email, name, password, permissions } = req.body;

      // Validation
      if (!email || !name || !password) {
        return res.status(400).json({ error: 'Email, name, and password are required' });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
      }

      // Check if user already exists
      const existingUser = await db.getUserByEmail(email);
      if (existingUser.success) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create team member
      const userData = {
        id: 'team-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        email: email.toLowerCase(),
        name: name.trim(),
        password: hashedPassword,
        isActive: true,
        teamPermissions: {
          canGenerateReports: permissions?.canGenerateReports !== false,
          canViewAllReports: permissions?.canViewAllReports || false,
          canManageCustomPrompts: permissions?.canManageCustomPrompts !== false,
          canViewAnalytics: permissions?.canViewAnalytics || false,
          maxReportsPerMonth: permissions?.maxReportsPerMonth || 100
        }
      };

      const result = await db.createTeamMember(userData);
      
      if (result.success) {
        // Log the action
        await db.logUsage({
          action: 'team_member_created',
          userId: decoded.userId,
          email: userResult.data.email,
          targetUserId: userData.id,
          targetUserEmail: userData.email,
          ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          userAgent: req.headers['user-agent']
        });

        return res.status(201).json({ 
          success: true, 
          message: 'Team member created successfully',
          userId: userData.id
        });
      } else {
        return res.status(500).json({ error: result.error });
      }

    } else if (req.method === 'PUT') {
      // Update user role or permissions
      const { userId, role, permissions } = req.body;

      if (!userId || !role) {
        return res.status(400).json({ error: 'User ID and role are required' });
      }

      const validRoles = ['admin', 'team_member', 'user'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      const result = await db.updateUserRole(userId, role, permissions);
      
      if (result.success) {
        // Log the action
        await db.logUsage({
          action: 'user_role_updated',
          userId: decoded.userId,
          email: userResult.data.email,
          targetUserId: userId,
          newRole: role,
          permissions: permissions,
          ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          userAgent: req.headers['user-agent']
        });

        return res.status(200).json({
          success: true,
          message: 'User role updated successfully'
        });
      } else {
        return res.status(500).json({ error: 'Failed to update user role' });
      }

    } else if (req.method === 'DELETE') {
      // Deactivate user
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Get user info before deactivation
      const targetUserResult = await db.getUserById(userId);
      if (!targetUserResult.success) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent admin from deactivating themselves
      if (userId === decoded.userId) {
        return res.status(400).json({ error: 'Cannot deactivate your own account' });
      }

      // Deactivate user
      const userRef = doc(db.db, 'users', userId);
      await updateDoc(userRef, {
        isActive: false,
        deactivatedAt: serverTimestamp(),
        deactivatedBy: decoded.userId,
        updatedAt: serverTimestamp()
      });

      // Log the action
      await db.logUsage({
        action: 'user_deactivated',
        userId: decoded.userId,
        email: userResult.data.email,
        targetUserId: userId,
        targetUserEmail: targetUserResult.data.email,
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      });

      return res.status(200).json({
        success: true,
        message: 'User deactivated successfully'
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Admin team members error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}