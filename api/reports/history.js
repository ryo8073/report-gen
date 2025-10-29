/**
 * Report History API Endpoint
 * Retrieves user's investment report history with pagination
 * GET /api/reports/history
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
      // Extract query parameters for pagination and filtering
      const {
        limit = '20',
        lastReportId = null,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        reportType = null,
        dateFrom = null,
        dateTo = null,
        search = null
      } = req.query;

      // Validate pagination parameters
      const limitCount = parseInt(limit);
      if (isNaN(limitCount) || limitCount < 1 || limitCount > 100) {
        return res.status(400).json({
          error: 'Invalid limit parameter',
          code: 'INVALID_LIMIT',
          message: 'Limit must be a number between 1 and 100',
          details: { providedLimit: limit, validRange: '1-100' }
        });
      }

      // Validate sort parameters
      const validSortFields = ['createdAt', 'title', 'reportType', 'processingTime'];
      const validSortOrders = ['asc', 'desc'];
      
      if (!validSortFields.includes(sortBy)) {
        return res.status(400).json({
          error: 'Invalid sortBy parameter',
          code: 'INVALID_SORT_FIELD',
          message: `Sort field must be one of: ${validSortFields.join(', ')}`,
          details: { providedSortBy: sortBy, validFields: validSortFields }
        });
      }

      if (!validSortOrders.includes(sortOrder)) {
        return res.status(400).json({
          error: 'Invalid sortOrder parameter',
          code: 'INVALID_SORT_ORDER',
          message: `Sort order must be one of: ${validSortOrders.join(', ')}`,
          details: { providedSortOrder: sortOrder, validOrders: validSortOrders }
        });
      }

      // Validate report type filter
      if (reportType && !['basic', 'intermediate', 'advanced'].includes(reportType)) {
        return res.status(400).json({
          error: 'Invalid reportType filter',
          code: 'INVALID_REPORT_TYPE',
          message: 'Report type must be one of: basic, intermediate, advanced',
          details: { providedReportType: reportType, validTypes: ['basic', 'intermediate', 'advanced'] }
        });
      }

      // Validate date filters
      let dateFromObj = null;
      let dateToObj = null;
      
      if (dateFrom) {
        dateFromObj = new Date(dateFrom);
        if (isNaN(dateFromObj.getTime())) {
          return res.status(400).json({
            error: 'Invalid dateFrom parameter',
            code: 'INVALID_DATE_FROM',
            message: 'dateFrom must be a valid ISO date string',
            details: { providedDateFrom: dateFrom, expectedFormat: 'YYYY-MM-DD or ISO string' }
          });
        }
      }

      if (dateTo) {
        dateToObj = new Date(dateTo);
        if (isNaN(dateToObj.getTime())) {
          return res.status(400).json({
            error: 'Invalid dateTo parameter',
            code: 'INVALID_DATE_TO',
            message: 'dateTo must be a valid ISO date string',
            details: { providedDateTo: dateTo, expectedFormat: 'YYYY-MM-DD or ISO string' }
          });
        }
      }

      // Validate date range
      if (dateFromObj && dateToObj && dateFromObj > dateToObj) {
        return res.status(400).json({
          error: 'Invalid date range',
          code: 'INVALID_DATE_RANGE',
          message: 'dateFrom must be earlier than dateTo',
          details: { dateFrom: dateFrom, dateTo: dateTo }
        });
      }

      console.log(`Fetching report history for user ${req.user.id} with filters:`, {
        limit: limitCount,
        lastReportId,
        sortBy,
        sortOrder,
        reportType,
        dateFrom,
        dateTo,
        search
      });

      // Get user reports with basic pagination (extended filtering will be implemented in future)
      const reportsResult = await reportService.getUserReports(req.user.id, limitCount, lastReportId);
      
      if (!reportsResult.success) {
        throw new Error(reportsResult.error || 'Failed to retrieve reports');
      }

      let reports = reportsResult.data;

      // Apply client-side filtering for now (can be optimized with database queries later)
      if (reportType) {
        reports = reports.filter(report => report.reportType === reportType);
      }

      if (dateFromObj) {
        reports = reports.filter(report => {
          const reportDate = report.createdAt?.toDate ? report.createdAt.toDate() : new Date(report.createdAt);
          return reportDate >= dateFromObj;
        });
      }

      if (dateToObj) {
        reports = reports.filter(report => {
          const reportDate = report.createdAt?.toDate ? report.createdAt.toDate() : new Date(report.createdAt);
          return reportDate <= dateToObj;
        });
      }

      if (search && search.trim()) {
        const searchTerm = search.toLowerCase().trim();
        reports = reports.filter(report => 
          (report.title && report.title.toLowerCase().includes(searchTerm)) ||
          (report.summary && report.summary.toLowerCase().includes(searchTerm)) ||
          (report.tags && report.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
        );
      }

      // Apply sorting (for non-default sorting)
      if (sortBy !== 'createdAt' || sortOrder !== 'desc') {
        reports.sort((a, b) => {
          let aValue = a[sortBy];
          let bValue = b[sortBy];
          
          // Handle date sorting
          if (sortBy === 'createdAt') {
            aValue = aValue?.toDate ? aValue.toDate() : new Date(aValue);
            bValue = bValue?.toDate ? bValue.toDate() : new Date(bValue);
          }
          
          // Handle string sorting
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
          }
          
          if (sortOrder === 'asc') {
            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
          } else {
            return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
          }
        });
      }

      // Format reports for response
      const formattedReports = reports.map(report => ({
        id: report.id,
        title: report.title,
        reportType: report.reportType,
        createdAt: report.createdAt?.toDate ? report.createdAt.toDate().toISOString() : report.createdAt,
        summary: report.summary,
        wordCount: report.wordCount || 0,
        processingTime: report.processingTime || 0,
        status: report.status || 'completed',
        tags: report.tags || []
      }));

      // Calculate summary statistics
      const totalReports = formattedReports.length;
      const reportsByType = formattedReports.reduce((acc, report) => {
        acc[report.reportType] = (acc[report.reportType] || 0) + 1;
        return acc;
      }, {});

      const averageWordCount = totalReports > 0 
        ? Math.round(formattedReports.reduce((sum, report) => sum + report.wordCount, 0) / totalReports)
        : 0;

      const response = {
        success: true,
        data: {
          reports: formattedReports,
          pagination: {
            ...reportsResult.pagination,
            currentCount: formattedReports.length,
            requestedLimit: limitCount,
            hasFilters: !!(reportType || dateFrom || dateTo || search)
          },
          summary: {
            totalReports,
            reportsByType,
            averageWordCount,
            processingTime: Date.now() - startTime
          },
          filters: {
            sortBy,
            sortOrder,
            reportType,
            dateFrom,
            dateTo,
            search: search || null
          }
        },
        message: `Retrieved ${formattedReports.length} reports successfully`
      };

      console.log(`Report history retrieved successfully for user ${req.user.id}: ${formattedReports.length} reports in ${Date.now() - startTime}ms`);
      res.status(200).json(response);

    } catch (error) {
      console.error('Report history retrieval error:', error);
      
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
      userMessage: 'Unable to retrieve your report history. Please try again in a moment.',
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
  
  // Timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('etimedout')) {
    return {
      status: 504,
      code: 'TIMEOUT_ERROR',
      message: 'Request timeout',
      userMessage: 'The request took too long to process. Please try again.',
      shouldRetry: true,
      retryAfter: 10,
      supportInfo: 'Try reducing the number of reports requested or removing filters.'
    };
  }
  
  // Default error response
  return {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
    userMessage: 'An unexpected error occurred while retrieving your report history. Please try again.',
    shouldRetry: true,
    retryAfter: 30,
    supportInfo: 'If the problem continues, please contact support.'
  };
}