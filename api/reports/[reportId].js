/**
 * Individual Report Retrieval API Endpoint
 * Retrieves a specific investment report by ID with user ownership validation
 * GET /api/reports/[reportId]
 */

import { requireAuth, setSecurityHeaders } from '../../lib/auth.js';
import reportService from '../../lib/report-service.js';

export default async function handler(req, res) {
  // Set security headers
  setSecurityHeaders(res);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Token');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED',
      message: 'Only GET requests are allowed for this endpoint'
    });
  }

  // Use authentication middleware
  return requireAuth(req, res, async () => {
    const startTime = Date.now();
    
    try {
      // Extract report ID from URL parameters
      const { reportId } = req.query;
      
      // Validate report ID
      if (!reportId || typeof reportId !== 'string' || reportId.trim().length === 0) {
        return res.status(400).json({
          error: 'Invalid report ID',
          code: 'INVALID_REPORT_ID',
          message: 'Report ID is required and must be a valid string',
          details: { providedReportId: reportId }
        });
      }

      // Validate report ID format (basic validation)
      const reportIdTrimmed = reportId.trim();
      if (reportIdTrimmed.length < 10 || reportIdTrimmed.length > 50) {
        return res.status(400).json({
          error: 'Invalid report ID format',
          code: 'INVALID_REPORT_ID_FORMAT',
          message: 'Report ID must be between 10 and 50 characters',
          details: { 
            providedReportId: reportIdTrimmed,
            length: reportIdTrimmed.length,
            validRange: '10-50 characters'
          }
        });
      }

      // Extract query parameters for response formatting
      const {
        includeMetadata = 'true',
        includeInvestmentData = 'false',
        format = 'full'
      } = req.query;

      // Validate format parameter
      const validFormats = ['full', 'summary', 'content-only'];
      if (!validFormats.includes(format)) {
        return res.status(400).json({
          error: 'Invalid format parameter',
          code: 'INVALID_FORMAT',
          message: `Format must be one of: ${validFormats.join(', ')}`,
          details: { providedFormat: format, validFormats }
        });
      }

      console.log(`Retrieving report ${reportIdTrimmed} for user ${req.user.id} with format: ${format}`);

      // Retrieve report with user ownership validation
      const reportResult = await reportService.getReportById(reportIdTrimmed, req.user.id);
      
      if (!reportResult.success) {
        // Handle specific error cases
        if (reportResult.error === 'Report not found') {
          return res.status(404).json({
            error: 'Report not found',
            code: 'REPORT_NOT_FOUND',
            message: 'The requested report does not exist or has been deleted',
            details: { reportId: reportIdTrimmed }
          });
        }
        
        if (reportResult.error === 'Access denied') {
          return res.status(403).json({
            error: 'Access denied',
            code: 'ACCESS_DENIED',
            message: 'You do not have permission to access this report',
            details: { reportId: reportIdTrimmed }
          });
        }
        
        throw new Error(reportResult.error || 'Failed to retrieve report');
      }

      const report = reportResult.data;

      // Format report based on requested format
      let formattedReport;
      
      switch (format) {
        case 'summary':
          formattedReport = {
            id: report.id || reportIdTrimmed,
            title: report.title,
            reportType: report.reportType,
            createdAt: report.metadata?.createdAt?.toDate ? 
              report.metadata.createdAt.toDate().toISOString() : 
              report.metadata?.createdAt || report.createdAt,
            summary: report.generatedReport?.summary || '',
            wordCount: report.generatedReport?.wordCount || 0,
            status: report.status || 'completed',
            tags: report.tags || []
          };
          break;
          
        case 'content-only':
          formattedReport = {
            id: report.id || reportIdTrimmed,
            title: report.title,
            content: report.generatedReport?.fullContent || '',
            sections: report.generatedReport?.sections || {},
            reportType: report.reportType
          };
          break;
          
        case 'full':
        default:
          formattedReport = {
            id: report.id || reportIdTrimmed,
            title: report.title,
            reportType: report.reportType,
            status: report.status || 'completed',
            version: report.version || '1.0',
            tags: report.tags || [],
            
            // Generated report content
            generatedReport: {
              summary: report.generatedReport?.summary || '',
              analysis: report.generatedReport?.analysis || '',
              recommendations: report.generatedReport?.recommendations || '',
              riskAssessment: report.generatedReport?.riskAssessment || '',
              fullContent: report.generatedReport?.fullContent || '',
              sections: report.generatedReport?.sections || {},
              contentLength: report.generatedReport?.contentLength || 0,
              wordCount: report.generatedReport?.wordCount || 0
            },
            
            // User preferences used for generation
            preferences: report.preferences || {},
            
            // Timestamps
            createdAt: report.metadata?.createdAt?.toDate ? 
              report.metadata.createdAt.toDate().toISOString() : 
              report.metadata?.createdAt || report.createdAt,
            updatedAt: report.updatedAt?.toDate ? 
              report.updatedAt.toDate().toISOString() : 
              report.updatedAt
          };
          
          // Include metadata if requested
          if (includeMetadata === 'true') {
            formattedReport.metadata = {
              processingTime: report.metadata?.processingTime || 0,
              apiCost: report.metadata?.apiCost || 0,
              promptTokens: report.metadata?.promptTokens || 0,
              completionTokens: report.metadata?.completionTokens || 0,
              totalTokens: report.metadata?.totalTokens || 0,
              model: report.metadata?.model || 'gpt-4o',
              fallback: report.metadata?.fallback || false,
              fallbackReason: report.metadata?.fallbackReason || null,
              userAgent: report.metadata?.userAgent || '',
              ipAddress: report.metadata?.ipAddress ? 'hidden' : '' // Hide IP for privacy
            };
          }
          
          // Include investment data if requested (be careful with sensitive data)
          if (includeInvestmentData === 'true') {
            formattedReport.investmentData = {
              goals: report.investmentData?.goals || '',
              riskTolerance: report.investmentData?.riskTolerance || '',
              timeHorizon: report.investmentData?.timeHorizon || '',
              // Only include non-sensitive portfolio summary
              portfolioSummary: {
                holdingsCount: report.investmentData?.portfolio?.holdings?.length || 0,
                totalValue: report.investmentData?.portfolio?.totalValue ? 'provided' : 'not provided',
                hasAssetAllocation: !!(report.investmentData?.portfolio?.assetAllocation)
              }
              // Note: Detailed portfolio holdings are excluded for security
            };
          }
          break;
      }

      // Add access information
      const accessInfo = {
        accessedAt: new Date().toISOString(),
        accessedBy: req.user.id,
        format: format,
        includeMetadata: includeMetadata === 'true',
        includeInvestmentData: includeInvestmentData === 'true'
      };

      const response = {
        success: true,
        data: {
          report: formattedReport,
          access: accessInfo,
          processingTime: Date.now() - startTime
        },
        message: 'Report retrieved successfully'
      };

      console.log(`Report ${reportIdTrimmed} retrieved successfully for user ${req.user.id} in ${Date.now() - startTime}ms`);
      res.status(200).json(response);

    } catch (error) {
      console.error('Individual report retrieval error:', error);
      
      // Determine appropriate error response
      const errorResponse = categorizeError(error);
      
      return res.status(errorResponse.status).json({
        error: errorResponse.message,
        code: errorResponse.code,
        message: errorResponse.userMessage,
        shouldRetry: errorResponse.shouldRetry,
        retryAfter: errorResponse.retryAfter,
        supportInfo: errorResponse.supportInfo,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
}

/**
 * Categorize errors and provide appropriate responses
 * @param {Error} error - Error object
 * @returns {object} Categorized error response
 */
function categorizeError(error) {
  const errorMessage = error.message?.toLowerCase() || '';
  
  // Database connection errors
  if (errorMessage.includes('database') || errorMessage.includes('connection') || 
      errorMessage.includes('firestore') || errorMessage.includes('firebase')) {
    return {
      status: 503,
      code: 'DATABASE_ERROR',
      message: 'Database connection error',
      userMessage: 'Unable to retrieve the report. Please try again in a moment.',
      shouldRetry: true,
      retryAfter: 30,
      supportInfo: 'If the problem persists, please contact support.'
    };
  }
  
  // Authentication errors
  if (errorMessage.includes('auth') || errorMessage.includes('unauthorized') ||
      errorMessage.includes('permission')) {
    return {
      status: 401,
      code: 'AUTH_ERROR',
      message: 'Authentication error',
      userMessage: 'Your session has expired. Please log in again.',
      shouldRetry: false,
      supportInfo: 'Please refresh the page and log in again.'
    };
  }
  
  // Report not found errors
  if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
    return {
      status: 404,
      code: 'REPORT_NOT_FOUND',
      message: 'Report not found',
      userMessage: 'The requested report could not be found. It may have been deleted or moved.',
      shouldRetry: false,
      supportInfo: 'Please check the report ID and try again, or contact support if you believe this is an error.'
    };
  }
  
  // Access denied errors
  if (errorMessage.includes('access denied') || errorMessage.includes('forbidden')) {
    return {
      status: 403,
      code: 'ACCESS_DENIED',
      message: 'Access denied',
      userMessage: 'You do not have permission to access this report.',
      shouldRetry: false,
      supportInfo: 'This report belongs to another user or has restricted access.'
    };
  }
  
  // Timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('etimedout')) {
    return {
      status: 504,
      code: 'TIMEOUT_ERROR',
      message: 'Request timeout',
      userMessage: 'The request took too long to process. Please try again.',
      shouldRetry: true,
      retryAfter: 10,
      supportInfo: 'Try requesting the report in summary format for faster loading.'
    };
  }
  
  // Data corruption or parsing errors
  if (errorMessage.includes('parse') || errorMessage.includes('corrupt') ||
      errorMessage.includes('invalid data')) {
    return {
      status: 422,
      code: 'DATA_ERROR',
      message: 'Report data error',
      userMessage: 'The report data appears to be corrupted or invalid.',
      shouldRetry: false,
      supportInfo: 'Please contact support to recover this report.'
    };
  }
  
  // Default error response
  return {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
    userMessage: 'An unexpected error occurred while retrieving the report. Please try again.',
    shouldRetry: true,
    retryAfter: 30,
    supportInfo: 'If the problem continues, please contact support with the report ID.'
  };
}