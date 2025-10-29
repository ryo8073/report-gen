/**
 * Report Service for Investment Analysis Reports
 * Handles report storage, retrieval, and management in Firestore
 * 
 * This service acts as a wrapper around the existing FirebaseDatabase class
 * to provide report-specific functionality with proper error handling.
 */

export class ReportService {
  constructor() {
    // We'll initialize the Firebase database when needed to avoid import issues
    this.firebaseDb = null;
  }

  async getFirebaseDb() {
    if (!this.firebaseDb) {
      try {
        const { default: firebaseDb } = await import('./firebase-db.js');
        this.firebaseDb = firebaseDb;
      } catch (error) {
        console.error('Failed to initialize Firebase database:', error);
        throw new Error('Database service unavailable');
      }
    }
    return this.firebaseDb;
  }

  /**
   * Save a generated investment report to Firestore
   * @param {string} userId - User ID who owns the report
   * @param {object} reportData - Complete report data
   * @param {object} metadata - Additional metadata (processing time, API costs, etc.)
   * @returns {Promise<object>} Result with success status and report ID
   */
  async saveReport(userId, reportData, metadata = {}) {
    try {
      const reportDocument = {
        userId: userId,
        title: reportData.title || `Investment Report - ${new Date().toLocaleDateString()}`,
        reportType: reportData.reportType || 'basic',
        
        // Investment data used for the report
        investmentData: {
          portfolio: reportData.investmentData?.portfolio || {},
          goals: reportData.investmentData?.goals || '',
          riskTolerance: reportData.investmentData?.riskTolerance || '',
          timeHorizon: reportData.investmentData?.timeHorizon || '',
          currentAge: reportData.investmentData?.currentAge || null,
          retirementAge: reportData.investmentData?.retirementAge || null,
          annualIncome: reportData.investmentData?.annualIncome || null,
          monthlyExpenses: reportData.investmentData?.monthlyExpenses || null,
          existingSavings: reportData.investmentData?.existingSavings || null
        },
        
        // Generated report content
        generatedReport: {
          summary: reportData.generatedReport?.summary || '',
          analysis: reportData.generatedReport?.analysis || '',
          recommendations: reportData.generatedReport?.recommendations || '',
          riskAssessment: reportData.generatedReport?.riskAssessment || '',
          fullContent: reportData.generatedReport?.fullContent || '',
          sections: reportData.generatedReport?.sections || {},
          contentLength: reportData.generatedReport?.contentLength || 0,
          wordCount: reportData.generatedReport?.wordCount || 0
        },
        
        // Metadata tracking
        metadata: {
          createdAt: new Date(),
          processingTime: metadata.processingTime || 0,
          apiCost: metadata.apiCost || 0,
          promptTokens: metadata.promptTokens || 0,
          completionTokens: metadata.completionTokens || 0,
          totalTokens: metadata.totalTokens || 0,
          model: metadata.model || 'gpt-4o',
          userAgent: metadata.userAgent || '',
          ipAddress: metadata.ipAddress || '',
          fallback: metadata.fallback || false,
          fallbackReason: metadata.fallbackReason || null
        },
        
        // User preferences used for generation
        preferences: {
          focusAreas: reportData.preferences?.focusAreas || [],
          analysisDepth: reportData.preferences?.analysisDepth || 'standard',
          includeCharts: reportData.preferences?.includeCharts || false,
          language: reportData.preferences?.language || 'en',
          currency: reportData.preferences?.currency || 'USD'
        },
        
        // Status and versioning
        status: 'completed',
        version: '1.0',
        isArchived: false,
        tags: reportData.tags || []
      };

      // Use the existing firebase-db methods
      const db = await this.getFirebaseDb();
      const result = await db.saveInvestmentReport(reportDocument);
      
      if (result.success) {
        console.log(`Report saved successfully with ID: ${result.id}`);
        return {
          success: true,
          id: result.id,
          message: 'Report saved successfully'
        };
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      console.error('Error saving report to Firestore:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to save report'
      };
    }
  }

  /**
   * Retrieve user's report history with pagination
   * @param {string} userId - User ID
   * @param {number} limitCount - Number of reports to retrieve (default: 20)
   * @param {string} lastReportId - ID of last report for pagination (optional)
   * @returns {Promise<object>} Result with reports array and pagination info
   */
  async getUserReports(userId, limitCount = 20, lastReportId = null) {
    try {
      // Use the existing firebase-db method
      const db = await this.getFirebaseDb();
      const result = await db.getUserInvestmentReports(userId, limitCount, lastReportId);
      
      if (result.success) {
        return {
          success: true,
          data: result.data,
          pagination: result.pagination,
          message: `Retrieved ${result.data.length} reports`
        };
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      console.error('Error retrieving user reports:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve reports'
      };
    }
  }

  /**
   * Retrieve a specific report by ID
   * @param {string} reportId - Report ID
   * @param {string} userId - User ID (for ownership validation)
   * @returns {Promise<object>} Result with complete report data
   */
  async getReportById(reportId, userId) {
    try {
      // Use the existing firebase-db method
      const db = await this.getFirebaseDb();
      const result = await db.getInvestmentReportById(reportId);
      
      if (!result.success) {
        return {
          success: false,
          error: 'Report not found',
          message: 'The requested report does not exist'
        };
      }

      // Verify user ownership
      if (result.data.userId !== userId) {
        return {
          success: false,
          error: 'Access denied',
          message: 'You do not have permission to access this report'
        };
      }

      return {
        success: true,
        data: result.data,
        message: 'Report retrieved successfully'
      };
      
    } catch (error) {
      console.error('Error retrieving report by ID:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve report'
      };
    }
  }

  /**
   * Delete a report (soft delete by archiving)
   * @param {string} reportId - Report ID
   * @param {string} userId - User ID (for ownership validation)
   * @returns {Promise<object>} Result with success status
   */
  async deleteReport(reportId, userId) {
    try {
      // First verify ownership
      const reportResult = await this.getReportById(reportId, userId);
      if (!reportResult.success) {
        return reportResult; // Return the error from getReportById
      }

      // Use the existing firebase-db method
      const db = await this.getFirebaseDb();
      const result = await db.deleteInvestmentReport(reportId);
      
      if (result.success) {
        return {
          success: true,
          message: 'Report deleted successfully'
        };
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      console.error('Error deleting report:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to delete report'
      };
    }
  }

  /**
   * Update report metadata (tags, title, etc.)
   * @param {string} reportId - Report ID
   * @param {string} userId - User ID (for ownership validation)
   * @param {object} updates - Updates to apply
   * @returns {Promise<object>} Result with success status
   */
  async updateReport(reportId, userId, updates) {
    try {
      // First verify ownership
      const reportResult = await this.getReportById(reportId, userId);
      if (!reportResult.success) {
        return reportResult; // Return the error from getReportById
      }

      // Only allow certain fields to be updated
      const allowedUpdates = {};
      if (updates.title) allowedUpdates.title = updates.title;
      if (updates.tags) allowedUpdates.tags = updates.tags;
      if (updates.status) allowedUpdates.status = updates.status;
      
      allowedUpdates.updatedAt = new Date();

      // Use the existing firebase-db method
      const db = await this.getFirebaseDb();
      const result = await db.updateInvestmentReport(reportId, allowedUpdates);
      
      if (result.success) {
        return {
          success: true,
          message: 'Report updated successfully'
        };
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      console.error('Error updating report:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to update report'
      };
    }
  }

  /**
   * Get user's report statistics
   * @param {string} userId - User ID
   * @returns {Promise<object>} Result with statistics
   */
  async getUserReportStats(userId) {
    try {
      // Use the existing firebase-db method
      const db = await this.getFirebaseDb();
      const result = await db.getInvestmentReportStats(userId);
      
      if (result.success) {
        return {
          success: true,
          data: result.data,
          message: 'Statistics retrieved successfully'
        };
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      console.error('Error retrieving user report stats:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve statistics'
      };
    }
  }
}

// Export singleton instance
export default new ReportService();