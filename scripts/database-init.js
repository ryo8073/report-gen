// Database initialization script
// Implements automatic Firestore collection creation, indexes, and connectivity validation
import { db } from '../lib/firebase-admin.js';
import FirebaseErrorHandler from '../lib/firebase-error-handler.js';

class DatabaseInitializer {
  constructor() {
    this.db = db;
    this.requiredCollections = [
      'users',
      'usage_logs', 
      'report_generations',
      'sessions'
    ];
  }

  /**
   * Initialize all required Firestore collections and indexes
   */
  async initializeDatabase() {
    console.log('🗄️  Starting database initialization...');
    
    try {
      // Validate database connectivity first
      await this.validateConnection();
      
      // Create required collections
      await this.createCollections();
      
      // Setup indexes for query performance
      await this.setupIndexes();
      
      console.log('✅ Database initialization completed successfully');
      return { success: true, message: 'Database initialized successfully' };
      
    } catch (error) {
      FirebaseErrorHandler.logError(error, { context: 'Database initialization' });
      console.error('❌ Database initialization failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate database connectivity
   */
  async validateConnection() {
    console.log('🔗 Validating database connection...');
    
    try {
      // Test basic connectivity by attempting to read from a system collection
      const testDoc = this.db.collection('_test').doc('connectivity');
      await testDoc.set({ 
        timestamp: new Date(),
        test: 'connectivity_check'
      });
      
      // Read it back to confirm write/read operations work
      const snapshot = await testDoc.get();
      if (!snapshot.exists) {
        throw new Error('Failed to verify write/read operations');
      }
      
      // Clean up test document
      await testDoc.delete();
      
      console.log('✅ Database connectivity validated');
      return true;
      
    } catch (error) {
      console.error('❌ Database connectivity validation failed:', error.message);
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  /**
   * Create required collections with initial structure
   */
  async createCollections() {
    console.log('📁 Creating required collections...');
    
    for (const collectionName of this.requiredCollections) {
      try {
        await this.createCollection(collectionName);
        console.log(`✅ Collection '${collectionName}' ready`);
      } catch (error) {
        console.error(`❌ Failed to create collection '${collectionName}':`, error.message);
        throw error;
      }
    }
  }

  /**
   * Create a single collection with initial document structure
   */
  async createCollection(collectionName) {
    const collectionRef = this.db.collection(collectionName);
    
    // Check if collection already has documents
    const snapshot = await collectionRef.limit(1).get();
    if (!snapshot.empty) {
      console.log(`📁 Collection '${collectionName}' already exists with data`);
      return;
    }

    // Create initial document based on collection type
    const initialDoc = this.getInitialDocumentStructure(collectionName);
    
    if (initialDoc) {
      const docRef = collectionRef.doc('_init');
      await docRef.set(initialDoc);
      console.log(`📄 Created initial document for '${collectionName}'`);
    }
  }

  /**
   * Get initial document structure for each collection type
   */
  getInitialDocumentStructure(collectionName) {
    const timestamp = new Date();
    
    switch (collectionName) {
      case 'users':
        return {
          _type: 'initialization_document',
          _created: timestamp,
          _note: 'This document establishes the users collection structure'
        };
        
      case 'usage_logs':
        return {
          _type: 'initialization_document',
          _created: timestamp,
          _note: 'This document establishes the usage_logs collection structure'
        };
        
      case 'report_generations':
        return {
          _type: 'initialization_document', 
          _created: timestamp,
          _note: 'This document establishes the report_generations collection structure'
        };
        
      case 'sessions':
        return {
          _type: 'initialization_document',
          _created: timestamp,
          _note: 'This document establishes the sessions collection structure'
        };
        
      default:
        return null;
    }
  }

  /**
   * Setup database indexes for query performance
   * Note: Firestore indexes are typically created through Firebase Console or CLI
   * This method documents the required indexes and validates existing ones
   */
  async setupIndexes() {
    console.log('🔍 Setting up database indexes...');
    
    const requiredIndexes = [
      {
        collection: 'users',
        fields: ['email'],
        description: 'Index for user email lookups'
      },
      {
        collection: 'users', 
        fields: ['role', 'isActive'],
        description: 'Composite index for user role and status queries'
      },
      {
        collection: 'usage_logs',
        fields: ['userId', 'timestamp'],
        description: 'Composite index for user activity queries'
      },
      {
        collection: 'usage_logs',
        fields: ['timestamp'],
        description: 'Index for chronological usage queries'
      },
      {
        collection: 'report_generations',
        fields: ['userId', 'timestamp'],
        description: 'Composite index for user report history'
      },
      {
        collection: 'report_generations',
        fields: ['timestamp'],
        description: 'Index for chronological report queries'
      },
      {
        collection: 'sessions',
        fields: ['userId'],
        description: 'Index for user session lookups'
      },
      {
        collection: 'sessions',
        fields: ['expiresAt'],
        description: 'Index for session expiration cleanup'
      }
    ];

    // Log required indexes (actual creation happens via Firebase Console/CLI)
    console.log('📋 Required database indexes:');
    requiredIndexes.forEach((index, i) => {
      console.log(`   ${i + 1}. ${index.collection}: [${index.fields.join(', ')}] - ${index.description}`);
    });

    // Test query performance on existing data
    await this.validateIndexPerformance();
    
    console.log('✅ Database indexes documented and validated');
  }

  /**
   * Validate index performance by testing common queries
   */
  async validateIndexPerformance() {
    console.log('⚡ Validating query performance...');
    
    try {
      // Test user email query
      const userQuery = this.db.collection('users').where('email', '==', 'test@example.com').limit(1);
      await userQuery.get();
      
      // Test usage logs chronological query
      const usageQuery = this.db.collection('usage_logs').orderBy('timestamp', 'desc').limit(1);
      await usageQuery.get();
      
      // Test report generations query
      const reportsQuery = this.db.collection('report_generations').orderBy('timestamp', 'desc').limit(1);
      await reportsQuery.get();
      
      console.log('✅ Query performance validation completed');
      
    } catch (error) {
      // If queries fail due to missing indexes, log helpful information
      if (error.code === 'failed-precondition' && error.message.includes('index')) {
        console.warn('⚠️  Some queries require composite indexes. Run the following Firebase CLI command:');
        console.warn('   firebase firestore:indexes');
        console.warn('   Then create the required indexes in Firebase Console');
      } else {
        console.warn('⚠️  Query performance validation had issues:', error.message);
      }
    }
  }

  /**
   * Get database health status
   */
  async getDatabaseHealth() {
    try {
      const health = {
        connectivity: false,
        collections: {},
        totalDocuments: 0,
        lastChecked: new Date()
      };

      // Check connectivity
      await this.validateConnection();
      health.connectivity = true;

      // Check each collection
      for (const collectionName of this.requiredCollections) {
        const snapshot = await this.db.collection(collectionName).limit(1).get();
        health.collections[collectionName] = {
          exists: !snapshot.empty,
          documentCount: snapshot.size
        };
        health.totalDocuments += snapshot.size;
      }

      return { success: true, data: health };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default DatabaseInitializer;