// Firebase Firestore database service
import { db } from './firebase-admin.js';
import { 
  FieldValue,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from 'firebase-admin/firestore';

export class FirebaseDatabase {
  constructor() {
    this.db = db;
  }

  // User Management
  async createUser(userData) {
    try {
      const userRef = this.db.collection('users').doc(userData.id);
      await userRef.set({
        ...userData,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
      return { success: true, id: userData.id };
    } catch (error) {
      console.error('Error creating user:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserById(userId) {
    try {
      const userRef = this.db.collection('users').doc(userId);
      const userSnap = await userRef.get();
      
      if (userSnap.exists) {
        return { success: true, data: userSnap.data() };
      } else {
        return { success: false, error: 'User not found' };
      }
    } catch (error) {
      console.error('Error getting user:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserByEmail(email) {
    try {
      const usersRef = this.db.collection('users');
      const querySnapshot = await usersRef.where('email', '==', email).get();
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        return { success: true, data: { id: userDoc.id, ...userDoc.data() } };
      } else {
        return { success: false, error: 'User not found' };
      }
    } catch (error) {
      console.error('Error getting user by email:', error);
      return { success: false, error: error.message };
    }
  }

  async updateUser(userId, updateData) {
    try {
      const userRef = this.db.collection('users').doc(userId);
      await userRef.update({
        ...updateData,
        updatedAt: FieldValue.serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating user:', error);
      return { success: false, error: error.message };
    }
  }

  // Usage Tracking
  async logUsage(usageData) {
    try {
      const usageRef = this.db.collection('usage_logs');
      await usageRef.add({
        ...usageData,
        timestamp: FieldValue.serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error logging usage:', error);
      return { success: false, error: error.message };
    }
  }

  async getUsageStats() {
    try {
      const usageRef = this.db.collection('usage_logs');
      const querySnapshot = await usageRef.orderBy('timestamp', 'desc').get();
      
      const usageData = [];
      querySnapshot.forEach((doc) => {
        usageData.push({ id: doc.id, ...doc.data() });
      });
      
      return { success: true, data: usageData };
    } catch (error) {
      console.error('Error getting usage stats:', error);
      return { success: false, error: error.message };
    }
  }

  async getRecentActivity(limitCount = 50) {
    try {
      const usageRef = collection(this.db, 'usage_logs');
      const q = query(usageRef, orderBy('timestamp', 'desc'), limit(limitCount));
      const querySnapshot = await getDocs(q);
      
      const activityData = [];
      querySnapshot.forEach((doc) => {
        activityData.push({ id: doc.id, ...doc.data() });
      });
      
      return { success: true, data: activityData };
    } catch (error) {
      console.error('Error getting recent activity:', error);
      return { success: false, error: error.message };
    }
  }

  // Report Generation Logs
  async logReportGeneration(reportData) {
    try {
      const reportsRef = this.db.collection('report_generations');
      await reportsRef.add({
        ...reportData,
        timestamp: FieldValue.serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error logging report generation:', error);
      return { success: false, error: error.message };
    }
  }

  async getReportGenerations(userId = null, limitCount = 100) {
    try {
      const reportsRef = collection(this.db, 'report_generations');
      let q;
      
      if (userId) {
        q = query(
          reportsRef, 
          where('userId', '==', userId),
          orderBy('timestamp', 'desc'),
          limit(limitCount)
        );
      } else {
        q = query(
          reportsRef, 
          orderBy('timestamp', 'desc'),
          limit(limitCount)
        );
      }
      
      const querySnapshot = await getDocs(q);
      const reports = [];
      querySnapshot.forEach((doc) => {
        reports.push({ id: doc.id, ...doc.data() });
      });
      
      return { success: true, data: reports };
    } catch (error) {
      console.error('Error getting report generations:', error);
      return { success: false, error: error.message };
    }
  }

  // Admin Functions
  async getTotalUsageStats() {
    try {
      const [usageResult, reportsResult] = await Promise.all([
        this.getUsageStats(),
        this.getReportGenerations()
      ]);

      if (!usageResult.success || !reportsResult.success) {
        return { success: false, error: 'Failed to fetch stats' };
      }

      const totalUsers = await this.getTotalUsers();
      const totalReports = reportsResult.data.length;
      const totalUsage = usageResult.data.length;

      return {
        success: true,
        data: {
          totalUsers: totalUsers.success ? totalUsers.data : 0,
          totalReports,
          totalUsage,
          lastUpdated: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error getting total usage stats:', error);
      return { success: false, error: error.message };
    }
  }

  async getTotalUsers() {
    try {
      const usersRef = this.db.collection('users');
      const querySnapshot = await usersRef.get();
      return { success: true, data: querySnapshot.size };
    } catch (error) {
      console.error('Error getting total users:', error);
      return { success: false, error: error.message };
    }
  }

  // Initialize admin user (delegated to AdminUserService)
  async initializeAdminUser() {
    try {
      const { default: AdminUserService } = await import('./admin-user-service.js');
      const adminService = new AdminUserService();
      return await adminService.initializeAdminUser();
    } catch (error) {
      console.error('Error initializing admin user:', error);
      return { success: false, error: error.message };
    }
  }
  // Custom Prompt Management
  async saveCustomPrompt(promptData) {
    try {
      const promptRef = await addDoc(collection(this.db, 'custom_prompts'), {
        ...promptData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: promptRef.id };
    } catch (error) {
      console.error('Error saving custom prompt:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserCustomPrompts(userId) {
    try {
      const q = query(
        collection(this.db, 'custom_prompts'),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const prompts = [];
      querySnapshot.forEach((doc) => {
        prompts.push({ id: doc.id, ...doc.data() });
      });
      return { success: true, data: prompts };
    } catch (error) {
      console.error('Error getting user custom prompts:', error);
      return { success: false, error: error.message };
    }
  }

  async getCustomPromptById(promptId) {
    try {
      const promptRef = doc(this.db, 'custom_prompts', promptId);
      const promptSnap = await getDoc(promptRef);
      
      if (promptSnap.exists()) {
        return { success: true, data: { id: promptSnap.id, ...promptSnap.data() } };
      } else {
        return { success: false, error: 'Custom prompt not found' };
      }
    } catch (error) {
      console.error('Error getting custom prompt:', error);
      return { success: false, error: error.message };
    }
  }

  async updateCustomPrompt(promptId, updateData) {
    try {
      const promptRef = doc(this.db, 'custom_prompts', promptId);
      await updateDoc(promptRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating custom prompt:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteCustomPrompt(promptId) {
    try {
      const promptRef = doc(this.db, 'custom_prompts', promptId);
      await deleteDoc(promptRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting custom prompt:', error);
      return { success: false, error: error.message };
    }
  }

  // Admin: Get all custom prompts
  async getAllCustomPrompts(limitCount = 100) {
    try {
      const q = query(
        collection(this.db, 'custom_prompts'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      const querySnapshot = await getDocs(q);
      const prompts = [];
      querySnapshot.forEach((doc) => {
        prompts.push({ id: doc.id, ...doc.data() });
      });
      return { success: true, data: prompts };
    } catch (error) {
      console.error('Error getting all custom prompts:', error);
      return { success: false, error: error.message };
    }
  }

  async getCustomPromptStats() {
    try {
      const querySnapshot = await getDocs(collection(this.db, 'custom_prompts'));
      const stats = {
        totalPrompts: querySnapshot.size,
        userStats: {},
        recentActivity: []
      };

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const userId = data.userId;
        
        if (!stats.userStats[userId]) {
          stats.userStats[userId] = {
            count: 0,
            userEmail: data.userEmail || 'Unknown'
          };
        }
        stats.userStats[userId].count++;

        if (stats.recentActivity.length < 10) {
          stats.recentActivity.push({
            id: doc.id,
            title: data.title,
            userEmail: data.userEmail,
            createdAt: data.createdAt
          });
        }
      });

      return { success: true, data: stats };
    } catch (error) {
      console.error('Error getting custom prompt stats:', error);
      return { success: false, error: error.message };
    }
  } 
 // Trial Period Management
  async createTrialUser(userData) {
    try {
      const trialStartDate = new Date();
      const trialEndDate = new Date();
      trialEndDate.setDate(trialStartDate.getDate() + 14); // 2週間後

      const userRef = doc(this.db, 'users', userData.id);
      await setDoc(userRef, {
        ...userData,
        // Trial information
        trialStartDate: serverTimestamp(),
        trialEndDate: trialEndDate,
        trialUsageCount: 0,
        trialMaxUsage: 15,
        subscriptionStatus: 'trial',
        subscriptionPlan: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: userData.id };
    } catch (error) {
      console.error('Error creating trial user:', error);
      return { success: false, error: error.message };
    }
  }

  async checkTrialStatus(userId) {
    try {
      const userResult = await this.getUserById(userId);
      if (!userResult.success) {
        return { success: false, error: 'User not found' };
      }

      const user = userResult.data;
      const now = new Date();
      
      // Check if user is on trial
      if (user.subscriptionStatus !== 'trial') {
        return { 
          success: true, 
          data: { 
            isTrialActive: false, 
            subscriptionStatus: user.subscriptionStatus,
            canUseService: user.subscriptionStatus === 'active'
          } 
        };
      }

      // Check trial expiration by date
      const trialEndDate = user.trialEndDate?.toDate ? user.trialEndDate.toDate() : new Date(user.trialEndDate);
      const isDateExpired = now > trialEndDate;

      // Check trial expiration by usage count
      const isUsageExpired = (user.trialUsageCount || 0) >= (user.trialMaxUsage || 15);

      const isTrialExpired = isDateExpired || isUsageExpired;

      return {
        success: true,
        data: {
          isTrialActive: !isTrialExpired,
          isDateExpired,
          isUsageExpired,
          trialStartDate: user.trialStartDate,
          trialEndDate: user.trialEndDate,
          trialUsageCount: user.trialUsageCount || 0,
          trialMaxUsage: user.trialMaxUsage || 15,
          remainingDays: Math.max(0, Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24))),
          remainingUsage: Math.max(0, (user.trialMaxUsage || 15) - (user.trialUsageCount || 0)),
          subscriptionStatus: user.subscriptionStatus,
          canUseService: !isTrialExpired
        }
      };
    } catch (error) {
      console.error('Error checking trial status:', error);
      return { success: false, error: error.message };
    }
  }

  async incrementTrialUsage(userId) {
    try {
      const userRef = doc(this.db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        return { success: false, error: 'User not found' };
      }

      const currentUsage = userSnap.data().trialUsageCount || 0;
      await updateDoc(userRef, {
        trialUsageCount: currentUsage + 1,
        updatedAt: serverTimestamp()
      });

      return { success: true, newUsageCount: currentUsage + 1 };
    } catch (error) {
      console.error('Error incrementing trial usage:', error);
      return { success: false, error: error.message };
    }
  }

  async expireTrial(userId) {
    try {
      const userRef = doc(this.db, 'users', userId);
      await updateDoc(userRef, {
        subscriptionStatus: 'trial_expired',
        updatedAt: serverTimestamp()
      });

      // Log trial expiration
      await this.logUsage({
        action: 'trial_expired',
        userId: userId,
        ip: 'system',
        userAgent: 'system'
      });

      return { success: true };
    } catch (error) {
      console.error('Error expiring trial:', error);
      return { success: false, error: error.message };
    }
  }

  async upgradeToSubscription(userId, planType) {
    try {
      const userRef = doc(this.db, 'users', userId);
      await updateDoc(userRef, {
        subscriptionStatus: 'active',
        subscriptionPlan: planType,
        subscriptionStartDate: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Log subscription upgrade
      await this.logUsage({
        action: 'subscription_upgraded',
        userId: userId,
        subscriptionPlan: planType,
        ip: 'system',
        userAgent: 'system'
      });

      return { success: true };
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      return { success: false, error: error.message };
    }
  }

  // Admin: Get trial statistics
  async getTrialStats() {
    try {
      const usersSnapshot = await getDocs(collection(this.db, 'users'));
      const stats = {
        totalUsers: 0,
        trialUsers: 0,
        expiredTrials: 0,
        activeSubscriptions: 0,
        trialConversionRate: 0,
        averageTrialUsage: 0,
        trialUsageDistribution: {
          '0-5': 0,
          '6-10': 0,
          '11-15': 0,
          '15+': 0
        }
      };

      let totalTrialUsage = 0;
      let trialUserCount = 0;

      usersSnapshot.forEach((doc) => {
        const user = doc.data();
        stats.totalUsers++;

        switch (user.subscriptionStatus) {
          case 'trial':
            stats.trialUsers++;
            trialUserCount++;
            totalTrialUsage += user.trialUsageCount || 0;
            
            // Usage distribution
            const usage = user.trialUsageCount || 0;
            if (usage <= 5) stats.trialUsageDistribution['0-5']++;
            else if (usage <= 10) stats.trialUsageDistribution['6-10']++;
            else if (usage <= 15) stats.trialUsageDistribution['11-15']++;
            else stats.trialUsageDistribution['15+']++;
            break;
          case 'trial_expired':
            stats.expiredTrials++;
            break;
          case 'active':
            stats.activeSubscriptions++;
            break;
        }
      });

      stats.averageTrialUsage = trialUserCount > 0 ? (totalTrialUsage / trialUserCount).toFixed(1) : 0;
      stats.trialConversionRate = stats.expiredTrials > 0 ? 
        ((stats.activeSubscriptions / (stats.expiredTrials + stats.activeSubscriptions)) * 100).toFixed(1) : 0;

      return { success: true, data: stats };
    } catch (error) {
      console.error('Error getting trial stats:', error);
      return { success: false, error: error.message };
    }
  }

  // Token Usage Management
  async logTokenUsage(tokenData) {
    try {
      const tokenRef = await addDoc(collection(this.db, 'token_usage'), {
        ...tokenData,
        createdAt: serverTimestamp()
      });
      return { success: true, id: tokenRef.id };
    } catch (error) {
      console.error('Error logging token usage:', error);
      return { success: false, error: error.message };
    }
  }

  async getTokenUsageStats(timeRange = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      const q = query(
        collection(this.db, 'token_usage'),
        where('createdAt', '>=', startDate),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const usageRecords = [];
      let totalTokens = 0;
      let totalCost = 0;
      const reportTypeStats = {};
      const userStats = {};
      const dailyStats = {};

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        usageRecords.push({ id: doc.id, ...data });

        // Aggregate statistics
        totalTokens += data.totalTokens || 0;
        totalCost += data.estimatedCost || 0;

        // Report type statistics
        const reportType = data.reportType || 'unknown';
        if (!reportTypeStats[reportType]) {
          reportTypeStats[reportType] = {
            count: 0,
            totalTokens: 0,
            totalCost: 0
          };
        }
        reportTypeStats[reportType].count++;
        reportTypeStats[reportType].totalTokens += data.totalTokens || 0;
        reportTypeStats[reportType].totalCost += data.estimatedCost || 0;

        // User statistics
        const userId = data.userId || 'unknown';
        if (!userStats[userId]) {
          userStats[userId] = {
            email: data.userEmail || 'Unknown',
            count: 0,
            totalTokens: 0,
            totalCost: 0
          };
        }
        userStats[userId].count++;
        userStats[userId].totalTokens += data.totalTokens || 0;
        userStats[userId].totalCost += data.estimatedCost || 0;

        // Daily statistics
        const date = data.createdAt?.toDate ? 
          data.createdAt.toDate().toISOString().split('T')[0] : 
          new Date().toISOString().split('T')[0];
        if (!dailyStats[date]) {
          dailyStats[date] = {
            count: 0,
            totalTokens: 0,
            totalCost: 0
          };
        }
        dailyStats[date].count++;
        dailyStats[date].totalTokens += data.totalTokens || 0;
        dailyStats[date].totalCost += data.estimatedCost || 0;
      });

      return {
        success: true,
        data: {
          summary: {
            totalRecords: usageRecords.length,
            totalTokens,
            totalCost,
            averageTokensPerRequest: usageRecords.length > 0 ? Math.round(totalTokens / usageRecords.length) : 0,
            averageCostPerRequest: usageRecords.length > 0 ? (totalCost / usageRecords.length).toFixed(4) : 0
          },
          reportTypeStats,
          userStats,
          dailyStats,
          recentUsage: usageRecords.slice(0, 50) // Latest 50 records
        }
      };
    } catch (error) {
      console.error('Error getting token usage stats:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserTokenUsage(userId, timeRange = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      const q = query(
        collection(this.db, 'token_usage'),
        where('userId', '==', userId),
        where('createdAt', '>=', startDate),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const usageRecords = [];
      let totalTokens = 0;
      let totalCost = 0;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        usageRecords.push({ id: doc.id, ...data });
        totalTokens += data.totalTokens || 0;
        totalCost += data.estimatedCost || 0;
      });

      return {
        success: true,
        data: {
          totalRecords: usageRecords.length,
          totalTokens,
          totalCost,
          records: usageRecords
        }
      };
    } catch (error) {
      console.error('Error getting user token usage:', error);
      return { success: false, error: error.message };
    }
  }

  // Calculate estimated cost based on OpenAI pricing
  calculateTokenCost(promptTokens, completionTokens, model = 'gpt-4o') {
    // OpenAI pricing (as of 2024) - adjust as needed
    const pricing = {
      'gpt-4o': {
        input: 0.005 / 1000,  // $0.005 per 1K input tokens
        output: 0.015 / 1000  // $0.015 per 1K output tokens
      },
      'gpt-4': {
        input: 0.03 / 1000,   // $0.03 per 1K input tokens
        output: 0.06 / 1000   // $0.06 per 1K output tokens
      }
    };

    const modelPricing = pricing[model] || pricing['gpt-4o'];
    const inputCost = promptTokens * modelPricing.input;
    const outputCost = completionTokens * modelPricing.output;
    
    return inputCost + outputCost;
  }

  // Team Member Management
  async createTeamMember(userData) {
    try {
      const teamMemberRef = doc(this.db, 'users', userData.id);
      await setDoc(teamMemberRef, {
        ...userData,
        role: 'team_member',
        subscriptionStatus: 'team_access',
        subscriptionPlan: 'team',
        teamPermissions: userData.teamPermissions || {
          canGenerateReports: true,
          canViewAllReports: false,
          canManageCustomPrompts: true,
          canViewAnalytics: false,
          maxReportsPerMonth: userData.maxReportsPerMonth || 100
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: userData.id };
    } catch (error) {
      console.error('Error creating team member:', error);
      return { success: false, error: error.message };
    }
  }

  async updateUserRole(userId, newRole, permissions = {}) {
    try {
      const userRef = doc(this.db, 'users', userId);
      const updateData = {
        role: newRole,
        updatedAt: serverTimestamp()
      };

      // Set permissions based on role
      if (newRole === 'team_member') {
        updateData.subscriptionStatus = 'team_access';
        updateData.subscriptionPlan = 'team';
        updateData.teamPermissions = {
          canGenerateReports: permissions.canGenerateReports !== false,
          canViewAllReports: permissions.canViewAllReports || false,
          canManageCustomPrompts: permissions.canManageCustomPrompts !== false,
          canViewAnalytics: permissions.canViewAnalytics || false,
          maxReportsPerMonth: permissions.maxReportsPerMonth || 100,
          ...permissions
        };
      } else if (newRole === 'user') {
        // Convert back to regular user with trial
        updateData.subscriptionStatus = 'trial';
        updateData.subscriptionPlan = null;
        updateData.teamPermissions = null;
        updateData.trialStartDate = serverTimestamp();
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14);
        updateData.trialEndDate = trialEndDate;
        updateData.trialUsageCount = 0;
        updateData.trialMaxUsage = 15;
      }

      await updateDoc(userRef, updateData);
      return { success: true };
    } catch (error) {
      console.error('Error updating user role:', error);
      return { success: false, error: error.message };
    }
  }

  async getAllUsers(limitCount = 100) {
    try {
      const q = query(
        collection(this.db, 'users'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      const querySnapshot = await getDocs(q);
      const users = [];
      querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });
      return { success: true, data: users };
    } catch (error) {
      console.error('Error getting all users:', error);
      return { success: false, error: error.message };
    }
  }

  async getUsersByRole(role) {
    try {
      const q = query(
        collection(this.db, 'users'),
        where('role', '==', role),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const users = [];
      querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });
      return { success: true, data: users };
    } catch (error) {
      console.error('Error getting users by role:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserStats() {
    try {
      const querySnapshot = await getDocs(collection(this.db, 'users'));
      const stats = {
        totalUsers: 0,
        adminUsers: 0,
        teamMembers: 0,
        regularUsers: 0,
        trialUsers: 0,
        activeSubscriptions: 0,
        teamAccess: 0,
        inactiveUsers: 0
      };

      querySnapshot.forEach((doc) => {
        const user = doc.data();
        stats.totalUsers++;

        if (!user.isActive) {
          stats.inactiveUsers++;
          return;
        }

        switch (user.role) {
          case 'admin':
            stats.adminUsers++;
            break;
          case 'team_member':
            stats.teamMembers++;
            stats.teamAccess++;
            break;
          case 'user':
          default:
            stats.regularUsers++;
            break;
        }

        switch (user.subscriptionStatus) {
          case 'trial':
            stats.trialUsers++;
            break;
          case 'active':
            stats.activeSubscriptions++;
            break;
          case 'team_access':
            // Already counted in teamAccess
            break;
        }
      });

      return { success: true, data: stats };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return { success: false, error: error.message };
    }
  }

  async checkTeamMemberPermissions(userId, permission) {
    try {
      const userResult = await this.getUserById(userId);
      if (!userResult.success) {
        return { success: false, error: 'User not found' };
      }

      const user = userResult.data;
      
      // Admin has all permissions
      if (user.role === 'admin') {
        return { success: true, hasPermission: true };
      }

      // Team members check specific permissions
      if (user.role === 'team_member') {
        const permissions = user.teamPermissions || {};
        const hasPermission = permissions[permission] || false;
        return { success: true, hasPermission };
      }

      // Regular users have no team permissions
      return { success: true, hasPermission: false };
    } catch (error) {
      console.error('Error checking team member permissions:', error);
      return { success: false, error: error.message };
    }
  }

  async getTeamMemberUsage(userId, timeRange = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      const q = query(
        collection(this.db, 'usage_logs'),
        where('userId', '==', userId),
        where('action', '==', 'report_generation'),
        where('createdAt', '>=', startDate),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const usageCount = querySnapshot.size;

      // Get user's monthly limit
      const userResult = await this.getUserById(userId);
      const monthlyLimit = userResult.success && userResult.data.teamPermissions 
        ? userResult.data.teamPermissions.maxReportsPerMonth || 100
        : 100;

      return {
        success: true,
        data: {
          usageCount,
          monthlyLimit,
          remainingReports: Math.max(0, monthlyLimit - usageCount),
          canGenerateMore: usageCount < monthlyLimit
        }
      };
    } catch (error) {
      console.error('Error getting team member usage:', error);
      return { success: false, error: error.message };
    }
  }

  // Investment Report Management
  async saveInvestmentReport(reportData) {
    try {
      const reportRef = await addDoc(collection(this.db, 'investment_reports'), {
        ...reportData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isArchived: false,
        status: 'completed',
        version: '1.0'
      });
      return { success: true, id: reportRef.id };
    } catch (error) {
      console.error('Error saving investment report:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserInvestmentReports(userId, limitCount = 20, lastReportId = null) {
    try {
      let q = query(
        collection(this.db, 'investment_reports'),
        where('userId', '==', userId),
        where('isArchived', '==', false),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      // Add pagination if lastReportId is provided
      if (lastReportId) {
        const lastReportDoc = await getDoc(doc(this.db, 'investment_reports', lastReportId));
        if (lastReportDoc.exists()) {
          q = query(
            collection(this.db, 'investment_reports'),
            where('userId', '==', userId),
            where('isArchived', '==', false),
            orderBy('createdAt', 'desc'),
            startAfter(lastReportDoc),
            limit(limitCount)
          );
        }
      }

      const querySnapshot = await getDocs(q);
      const reports = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        reports.push({
          id: doc.id,
          title: data.title,
          reportType: data.reportType,
          createdAt: data.createdAt,
          processingTime: data.metadata?.processingTime || 0,
          wordCount: data.generatedReport?.wordCount || 0,
          summary: data.generatedReport?.summary?.substring(0, 200) + '...' || '',
          status: data.status,
          tags: data.tags || []
        });
      });

      return {
        success: true,
        data: reports,
        pagination: {
          hasMore: reports.length === limitCount,
          lastReportId: reports.length > 0 ? reports[reports.length - 1].id : null,
          count: reports.length
        }
      };
    } catch (error) {
      console.error('Error getting user investment reports:', error);
      return { success: false, error: error.message };
    }
  }

  async getInvestmentReportById(reportId) {
    try {
      const reportRef = doc(this.db, 'investment_reports', reportId);
      const reportSnap = await getDoc(reportRef);
      
      if (reportSnap.exists()) {
        return { success: true, data: { id: reportSnap.id, ...reportSnap.data() } };
      } else {
        return { success: false, error: 'Investment report not found' };
      }
    } catch (error) {
      console.error('Error getting investment report:', error);
      return { success: false, error: error.message };
    }
  }

  async updateInvestmentReport(reportId, updateData) {
    try {
      const reportRef = doc(this.db, 'investment_reports', reportId);
      await updateDoc(reportRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating investment report:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteInvestmentReport(reportId) {
    try {
      const reportRef = doc(this.db, 'investment_reports', reportId);
      await updateDoc(reportRef, {
        isArchived: true,
        archivedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error deleting investment report:', error);
      return { success: false, error: error.message };
    }
  }

  async getInvestmentReportStats(userId = null) {
    try {
      let q;
      if (userId) {
        q = query(
          collection(this.db, 'investment_reports'),
          where('userId', '==', userId),
          where('isArchived', '==', false)
        );
      } else {
        q = query(
          collection(this.db, 'investment_reports'),
          where('isArchived', '==', false)
        );
      }

      const querySnapshot = await getDocs(q);
      const stats = {
        totalReports: 0,
        reportsByType: { basic: 0, intermediate: 0, advanced: 0 },
        totalProcessingTime: 0,
        totalTokensUsed: 0,
        totalApiCost: 0,
        averageWordCount: 0
      };

      let totalWordCount = 0;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        stats.totalReports++;
        
        if (stats.reportsByType.hasOwnProperty(data.reportType)) {
          stats.reportsByType[data.reportType]++;
        }
        
        stats.totalProcessingTime += data.metadata?.processingTime || 0;
        stats.totalTokensUsed += data.metadata?.totalTokens || 0;
        stats.totalApiCost += data.metadata?.apiCost || 0;
        totalWordCount += data.generatedReport?.wordCount || 0;
      });

      stats.averageWordCount = stats.totalReports > 0 ? Math.round(totalWordCount / stats.totalReports) : 0;

      return { success: true, data: stats };
    } catch (error) {
      console.error('Error getting investment report stats:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new FirebaseDatabase();