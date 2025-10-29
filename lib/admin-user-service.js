// Admin User Initialization Service
// Implements admin user creation with proper password hashing, role assignment, and validation
import bcrypt from 'bcryptjs';
import { db } from './firebase-admin.js';
import FirebaseErrorHandler from './firebase-error-handler.js';

class AdminUserService {
  constructor() {
    this.db = db;
    this.defaultAdminEmail = 'yamanami-ryo@heya.co.jp';
    this.defaultAdminPassword = 'admin123'; // This should be changed on first login
  }

  /**
   * Initialize admin user if none exists on system startup
   */
  async initializeAdminUser() {
    console.log('👤 Initializing admin user...');
    
    try {
      // Check if any admin user exists
      const existingAdmin = await this.findExistingAdminUser();
      
      if (existingAdmin.success && existingAdmin.data) {
        console.log('✅ Admin user already exists:', existingAdmin.data.email);
        return { 
          success: true, 
          message: 'Admin user already exists',
          adminUser: existingAdmin.data
        };
      }

      // Create new admin user
      const newAdmin = await this.createAdminUser();
      
      if (newAdmin.success) {
        console.log('✅ Admin user created successfully:', newAdmin.data.email);
        return {
          success: true,
          message: 'Admin user created successfully',
          adminUser: newAdmin.data
        };
      } else {
        console.error('❌ Failed to create admin user:', newAdmin.error);
        return { success: false, error: newAdmin.error };
      }
      
    } catch (error) {
      FirebaseErrorHandler.logError(error, { context: 'Admin user initialization' });
      console.error('❌ Admin user initialization failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Find existing admin user in the system
   */
  async findExistingAdminUser() {
    try {
      // Query for users with admin role
      const usersRef = this.db.collection('users');
      const adminQuery = usersRef.where('role', '==', 'admin').where('isActive', '==', true);
      const snapshot = await adminQuery.get();
      
      if (!snapshot.empty) {
        const adminDoc = snapshot.docs[0];
        return {
          success: true,
          data: {
            id: adminDoc.id,
            ...adminDoc.data()
          }
        };
      }
      
      return { success: true, data: null };
      
    } catch (error) {
      console.error('Error finding existing admin user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create new admin user with proper password hashing and validation
   */
  async createAdminUser(email = null, password = null) {
    try {
      const adminEmail = email || this.defaultAdminEmail;
      const adminPassword = password || this.defaultAdminPassword;
      
      // Validate email format
      if (!this.validateEmail(adminEmail)) {
        throw new Error('Invalid email format for admin user');
      }

      // Hash password with proper salt rounds
      const hashedPassword = await this.hashPassword(adminPassword);
      
      // Generate unique admin ID
      const adminId = this.generateAdminId();
      
      // Create admin user object
      const adminUser = {
        id: adminId,
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        isEmailVerified: true, // Admin users are pre-verified
        mustChangePassword: true, // Force password change on first login
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null,
        loginAttempts: 0,
        accountLocked: false,
        permissions: [
          'user_management',
          'system_administration', 
          'report_generation',
          'usage_analytics',
          'database_management'
        ]
      };

      // Validate admin user data
      const validation = this.validateAdminUserData(adminUser);
      if (!validation.isValid) {
        throw new Error(`Admin user validation failed: ${validation.errors.join(', ')}`);
      }

      // Save admin user to database
      const userRef = this.db.collection('users').doc(adminId);
      await userRef.set(adminUser);
      
      // Log admin user creation
      await this.logAdminUserCreation(adminUser);
      
      return {
        success: true,
        data: {
          id: adminUser.id,
          email: adminUser.email,
          role: adminUser.role,
          isActive: adminUser.isActive,
          createdAt: adminUser.createdAt
        }
      };
      
    } catch (error) {
      console.error('Error creating admin user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Hash password with bcrypt
   */
  async hashPassword(password) {
    const saltRounds = 12; // High security salt rounds
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Validate email format
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Generate unique admin ID
   */
  generateAdminId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `admin_${timestamp}_${random}`;
  }

  /**
   * Validate admin user data structure
   */
  validateAdminUserData(adminUser) {
    const errors = [];
    
    // Required fields validation
    const requiredFields = ['id', 'email', 'password', 'role', 'isActive'];
    requiredFields.forEach(field => {
      if (!adminUser[field] && adminUser[field] !== false) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    // Email validation
    if (adminUser.email && !this.validateEmail(adminUser.email)) {
      errors.push('Invalid email format');
    }

    // Role validation
    if (adminUser.role !== 'admin') {
      errors.push('Admin user must have admin role');
    }

    // Password validation (should be hashed)
    if (adminUser.password && adminUser.password.length < 20) {
      errors.push('Password appears to be unhashed');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Log admin user creation for audit purposes
   */
  async logAdminUserCreation(adminUser) {
    try {
      const logEntry = {
        action: 'admin_user_created',
        adminUserId: adminUser.id,
        adminEmail: adminUser.email,
        timestamp: new Date(),
        ip: 'system_initialization',
        userAgent: 'admin_user_service'
      };

      await this.db.collection('usage_logs').add(logEntry);
      
    } catch (error) {
      console.warn('Failed to log admin user creation:', error.message);
      // Don't fail the admin creation if logging fails
    }
  }

  /**
   * Verify admin user credentials
   */
  async verifyAdminCredentials(email, password) {
    try {
      // Find admin user by email
      const usersRef = this.db.collection('users');
      const userQuery = usersRef.where('email', '==', email).where('role', '==', 'admin');
      const snapshot = await userQuery.get();
      
      if (snapshot.empty) {
        return { success: false, error: 'Admin user not found' };
      }

      const adminDoc = snapshot.docs[0];
      const adminData = adminDoc.data();
      
      // Check if account is active
      if (!adminData.isActive) {
        return { success: false, error: 'Admin account is deactivated' };
      }

      // Check if account is locked
      if (adminData.accountLocked) {
        return { success: false, error: 'Admin account is locked' };
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, adminData.password);
      
      if (!passwordMatch) {
        // Increment login attempts
        await this.incrementLoginAttempts(adminDoc.id);
        return { success: false, error: 'Invalid credentials' };
      }

      // Reset login attempts on successful login
      await this.resetLoginAttempts(adminDoc.id);
      
      return {
        success: true,
        data: {
          id: adminDoc.id,
          email: adminData.email,
          role: adminData.role,
          permissions: adminData.permissions,
          mustChangePassword: adminData.mustChangePassword
        }
      };
      
    } catch (error) {
      console.error('Error verifying admin credentials:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Increment login attempts for security
   */
  async incrementLoginAttempts(userId) {
    try {
      const userRef = this.db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (userDoc.exists) {
        const currentAttempts = userDoc.data().loginAttempts || 0;
        const newAttempts = currentAttempts + 1;
        
        const updateData = {
          loginAttempts: newAttempts,
          updatedAt: new Date()
        };

        // Lock account after 5 failed attempts
        if (newAttempts >= 5) {
          updateData.accountLocked = true;
          updateData.lockedAt = new Date();
        }

        await userRef.update(updateData);
      }
    } catch (error) {
      console.error('Error incrementing login attempts:', error);
    }
  }

  /**
   * Reset login attempts on successful login
   */
  async resetLoginAttempts(userId) {
    try {
      const userRef = this.db.collection('users').doc(userId);
      await userRef.update({
        loginAttempts: 0,
        accountLocked: false,
        lockedAt: null,
        lastLogin: new Date(),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error resetting login attempts:', error);
    }
  }

  /**
   * Get admin user status and information
   */
  async getAdminUserStatus() {
    try {
      const adminResult = await this.findExistingAdminUser();
      
      if (!adminResult.success) {
        return { success: false, error: adminResult.error };
      }

      if (!adminResult.data) {
        return {
          success: true,
          data: {
            exists: false,
            message: 'No admin user found in system'
          }
        };
      }

      const admin = adminResult.data;
      return {
        success: true,
        data: {
          exists: true,
          id: admin.id,
          email: admin.email,
          isActive: admin.isActive,
          accountLocked: admin.accountLocked || false,
          mustChangePassword: admin.mustChangePassword || false,
          lastLogin: admin.lastLogin,
          createdAt: admin.createdAt,
          permissions: admin.permissions || []
        }
      };
      
    } catch (error) {
      console.error('Error getting admin user status:', error);
      return { success: false, error: error.message };
    }
  }
}

export default AdminUserService;