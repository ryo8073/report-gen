// Firebase Firestore database service
import { db } from './firebase-admin.js';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp 
} from 'firebase/firestore';

export class FirebaseDatabase {
  constructor() {
    this.db = db;
  }

  // User Management
  async createUser(userData) {
    try {
      const userRef = doc(this.db, 'users', userData.id);
      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: userData.id };
    } catch (error) {
      console.error('Error creating user:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserById(userId) {
    try {
      const userRef = doc(this.db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
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
      const usersRef = collection(this.db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
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
      const userRef = doc(this.db, 'users', userId);
      await updateDoc(userRef, {
        ...updateData,
        updatedAt: serverTimestamp()
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
      const usageRef = collection(this.db, 'usage_logs');
      await addDoc(usageRef, {
        ...usageData,
        timestamp: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error logging usage:', error);
      return { success: false, error: error.message };
    }
  }

  async getUsageStats() {
    try {
      const usageRef = collection(this.db, 'usage_logs');
      const q = query(usageRef, orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      
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
      const reportsRef = collection(this.db, 'report_generations');
      await addDoc(reportsRef, {
        ...reportData,
        timestamp: serverTimestamp()
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
      const usersRef = collection(this.db, 'users');
      const querySnapshot = await getDocs(usersRef);
      return { success: true, data: querySnapshot.size };
    } catch (error) {
      console.error('Error getting total users:', error);
      return { success: false, error: error.message };
    }
  }

  // Initialize admin user
  async initializeAdminUser() {
    try {
      const adminEmail = 'yamanami-ryo@heya.co.jp';
      const existingUser = await this.getUserByEmail(adminEmail);
      
      if (existingUser.success) {
        console.log('Admin user already exists');
        return { success: true, message: 'Admin user already exists' };
      }

      // Create admin user
      const adminUser = {
        id: 'admin-' + Date.now(),
        email: adminEmail,
        password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/9QYzK2u', // hashed password: admin123
        role: 'admin',
        isActive: true,
        createdAt: new Date().toISOString()
      };

      const result = await this.createUser(adminUser);
      if (result.success) {
        console.log('Admin user created successfully');
        return { success: true, message: 'Admin user created' };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error initializing admin user:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new FirebaseDatabase();
