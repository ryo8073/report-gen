import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

// Create database directory if it doesn't exist
const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'users.db');

class Database {
  constructor() {
    this.db = new sqlite3.Database(dbPath);
    this.init();
  }

  async init() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Create users table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            firebase_uid TEXT UNIQUE,
            name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME,
            is_active BOOLEAN DEFAULT 1,
            role TEXT DEFAULT 'user',
            email_verified BOOLEAN DEFAULT 0,
            auth_provider TEXT DEFAULT 'custom'
          )
        `);

        // Create user_sessions table for tracking
        this.db.run(`
          CREATE TABLE IF NOT EXISTS user_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            session_token TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            ip_address TEXT,
            user_agent TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id)
          )
        `);

        // Create usage_logs table for tracking
        this.db.run(`
          CREATE TABLE IF NOT EXISTS usage_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            action TEXT NOT NULL,
            report_type TEXT,
            file_count INTEGER DEFAULT 0,
            file_size INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            ip_address TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id)
          )
        `);

        // Create indexes for better performance
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_usage_user_id ON usage_logs(user_id)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_usage_created_at ON usage_logs(created_at)`);

        resolve();
      });
    });
  }

  // User management methods
  async createUser(email, passwordHash, name) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO users (email, password_hash, name)
        VALUES (?, ?, ?)
      `);
      
      stmt.run([email, passwordHash, name], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, email, name });
        }
      });
      
      stmt.finalize();
    });
  }

  async getUserByEmail(email) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM users WHERE email = ? AND is_active = 1',
        [email],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  async getUserById(id) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT id, email, name, created_at, last_login, role FROM users WHERE id = ? AND is_active = 1',
        [id],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  async updateLastLogin(userId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [userId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  // Firebase-specific user methods
  async getUserByFirebaseUid(firebaseUid) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM users WHERE firebase_uid = ? AND is_active = 1',
        [firebaseUid],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  async createUserFromFirebase(userData) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO users (firebase_uid, email, name, email_verified, auth_provider)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      stmt.run([
        userData.firebaseUid,
        userData.email,
        userData.name,
        userData.emailVerified ? 1 : 0,
        'firebase'
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ 
            id: this.lastID, 
            firebase_uid: userData.firebaseUid,
            email: userData.email, 
            name: userData.name,
            role: userData.role || 'user'
          });
        }
      });
      
      stmt.finalize();
    });
  }

  async updateUserFromFirebase(userId, userData) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        UPDATE users 
        SET email = ?, name = ?, email_verified = ?, last_login = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      stmt.run([
        userData.email,
        userData.name,
        userData.emailVerified ? 1 : 0,
        userId
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: userId });
        }
      });
      
      stmt.finalize();
    });
  }

  // Session management
  async createSession(userId, sessionToken, expiresAt, ipAddress, userAgent) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      stmt.run([userId, sessionToken, expiresAt, ipAddress, userAgent], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID });
        }
      });
      
      stmt.finalize();
    });
  }

  async getSession(sessionToken) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM user_sessions WHERE session_token = ? AND expires_at > CURRENT_TIMESTAMP',
        [sessionToken],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  async deleteSession(sessionToken) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM user_sessions WHERE session_token = ?',
        [sessionToken],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  async deleteExpiredSessions() {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM user_sessions WHERE expires_at <= CURRENT_TIMESTAMP',
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  // Usage tracking
  async logUsage(userId, action, reportType = null, fileCount = 0, fileSize = 0, ipAddress = null) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO usage_logs (user_id, action, report_type, file_count, file_size, ip_address)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run([userId, action, reportType, fileCount, fileSize, ipAddress], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID });
        }
      });
      
      stmt.finalize();
    });
  }

  async getUserUsageStats(userId, days = 30) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT 
          DATE(created_at) as date,
          COUNT(*) as total_requests,
          COUNT(CASE WHEN action = 'report_generated' THEN 1 END) as reports_generated,
          SUM(file_count) as total_files,
          SUM(file_size) as total_size
        FROM usage_logs 
        WHERE user_id = ? AND created_at >= datetime('now', '-${days} days')
        GROUP BY DATE(created_at)
        ORDER BY date DESC`,
        [userId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  async getTotalUsageStats() {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT 
          COUNT(DISTINCT user_id) as total_users,
          COUNT(*) as total_requests,
          COUNT(CASE WHEN action = 'report_generated' THEN 1 END) as total_reports,
          SUM(file_count) as total_files,
          SUM(file_size) as total_size
        FROM usage_logs 
        WHERE created_at >= datetime('now', '-30 days')`,
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  async getRecentActivity(limit = 50) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT 
          ul.action,
          ul.report_type,
          ul.file_count,
          ul.file_size,
          ul.created_at,
          u.name as user_name,
          u.email as user_email
        FROM usage_logs ul
        JOIN users u ON ul.user_id = u.id
        ORDER BY ul.created_at DESC
        LIMIT ?`,
        [limit],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  close() {
    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        }
        resolve();
      });
    });
  }
}

// Singleton instance
let dbInstance = null;

export function getDatabase() {
  if (!dbInstance) {
    dbInstance = new Database();
  }
  return dbInstance;
}

export default Database;
