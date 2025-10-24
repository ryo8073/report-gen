import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

// Simple file-based database for Vercel deployment
const DB_FILE = path.join(process.cwd(), 'data', 'users.json');

class SimpleDatabase {
  constructor() {
    this.ensureDataDir();
    this.users = this.loadUsers();
  }

  ensureDataDir() {
    const dataDir = path.dirname(DB_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  loadUsers() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
    return [];
  }

  saveUsers() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.users, null, 2));
    } catch (error) {
      console.error('Error saving users:', error);
    }
  }

  async createUser(email, passwordHash, name, role = 'user') {
    const user = {
      id: Date.now().toString(),
      email,
      password_hash: passwordHash,
      name,
      role,
      created_at: new Date().toISOString(),
      last_login: null
    };
    
    this.users.push(user);
    this.saveUsers();
    return user;
  }

  async findUserByEmail(email) {
    return this.users.find(user => user.email === email);
  }

  async findUserById(id) {
    return this.users.find(user => user.id === id);
  }

  async updateUserLogin(id) {
    const user = this.users.find(u => u.id === id);
    if (user) {
      user.last_login = new Date().toISOString();
      this.saveUsers();
    }
    return user;
  }

  async logUsage(userId, action, details = '', ip = '') {
    const log = {
      id: Date.now().toString(),
      user_id: userId,
      action,
      details,
      ip_address: ip,
      user_agent: '',
      created_at: new Date().toISOString()
    };
    
    // Load existing logs
    const logsFile = path.join(process.cwd(), 'data', 'usage_logs.json');
    let logs = [];
    try {
      if (fs.existsSync(logsFile)) {
        const data = fs.readFileSync(logsFile, 'utf8');
        logs = JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading logs:', error);
    }
    
    logs.push(log);
    
    try {
      fs.writeFileSync(logsFile, JSON.stringify(logs, null, 2));
    } catch (error) {
      console.error('Error saving logs:', error);
    }
  }

  async getTotalUsageStats() {
    const logsFile = path.join(process.cwd(), 'data', 'usage_logs.json');
    let logs = [];
    try {
      if (fs.existsSync(logsFile)) {
        const data = fs.readFileSync(logsFile, 'utf8');
        logs = JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading logs:', error);
    }

    return {
      totalUsers: this.users.length,
      totalReports: logs.filter(log => log.action === 'report_generated').length,
      totalLogins: logs.filter(log => log.action === 'login').length,
      totalRegistrations: logs.filter(log => log.action === 'registration').length
    };
  }

  async getRecentActivity(limit = 10) {
    const logsFile = path.join(process.cwd(), 'data', 'usage_logs.json');
    let logs = [];
    try {
      if (fs.existsSync(logsFile)) {
        const data = fs.readFileSync(logsFile, 'utf8');
        logs = JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading logs:', error);
    }

    return logs
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
  }
}

// Create admin user if it doesn't exist
async function initializeAdmin() {
  try {
    const db = new SimpleDatabase();
    const adminUser = await db.findUserByEmail('yamanami-ryo@heya.co.jp');
    
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('Admin123!', 12);
      await db.createUser('yamanami-ryo@heya.co.jp', hashedPassword, 'Yamanami Ryo', 'admin');
      console.log('Admin user created');
    }
  } catch (error) {
    console.error('Error initializing admin:', error);
  }
}

// Initialize admin on module load (but don't block)
initializeAdmin().catch(console.error);

export default SimpleDatabase;
