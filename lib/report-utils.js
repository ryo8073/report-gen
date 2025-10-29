/**
 * Report Utilities
 * Helper functions for report operations and data formatting
 */

/**
 * Generate a unique report ID
 * @returns {string} Unique report identifier
 */
export function generateReportId() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `rpt_${timestamp}_${randomStr}`;
}

/**
 * Format report data for storage
 * @param {object} rawReportData - Raw report data from ChatGPT
 * @param {object} investmentData - Original investment data
 * @param {object} metadata - Processing metadata
 * @param {object} preferences - User preferences
 * @returns {object} Formatted report data ready for storage
 */
export function formatReportForStorage(rawReportData, investmentData, metadata, preferences) {
  return {
    title: rawReportData.title || `Investment Report - ${new Date().toLocaleDateString()}`,
    reportType: metadata.reportType || 'basic',
    
    // Investment data used for the report
    investmentData: {
      portfolio: investmentData.portfolio || {},
      goals: investmentData.goals || '',
      riskTolerance: investmentData.riskTolerance || '',
      timeHorizon: investmentData.timeHorizon || '',
      currentAge: investmentData.currentAge || null,
      retirementAge: investmentData.retirementAge || null,
      annualIncome: investmentData.annualIncome || null,
      monthlyExpenses: investmentData.monthlyExpenses || null,
      existingSavings: investmentData.existingSavings || null
    },
    
    // Generated report content
    generatedReport: {
      summary: rawReportData.summary || '',
      analysis: rawReportData.analysis || '',
      recommendations: rawReportData.recommendations || '',
      riskAssessment: rawReportData.riskAssessment || '',
      fullContent: rawReportData.fullContent || '',
      sections: rawReportData.sections || {},
      contentLength: rawReportData.contentLength || 0,
      wordCount: rawReportData.wordCount || 0
    },
    
    // Metadata tracking
    metadata: {
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
      focusAreas: preferences.focusAreas || [],
      analysisDepth: preferences.analysisDepth || 'standard',
      includeCharts: preferences.includeCharts || false,
      language: preferences.language || 'en',
      currency: preferences.currency || 'USD'
    },
    
    // Default values
    status: 'completed',
    version: '1.0',
    isArchived: false,
    tags: []
  };
}

/**
 * Format report data for API response
 * @param {object} reportData - Report data from database
 * @param {boolean} includeFullContent - Whether to include full report content
 * @returns {object} Formatted report data for API response
 */
export function formatReportForResponse(reportData, includeFullContent = true) {
  const formatted = {
    id: reportData.id,
    title: reportData.title,
    reportType: reportData.reportType,
    status: reportData.status,
    createdAt: reportData.metadata?.createdAt || reportData.createdAt,
    updatedAt: reportData.updatedAt,
    tags: reportData.tags || [],
    
    // Summary information always included
    summary: reportData.generatedReport?.summary || '',
    wordCount: reportData.generatedReport?.wordCount || 0,
    
    // Metadata
    metadata: {
      processingTime: reportData.metadata?.processingTime || 0,
      apiCost: reportData.metadata?.apiCost || 0,
      totalTokens: reportData.metadata?.totalTokens || 0,
      model: reportData.metadata?.model || 'gpt-4o',
      fallback: reportData.metadata?.fallback || false
    }
  };

  // Include full content if requested
  if (includeFullContent) {
    formatted.generatedReport = reportData.generatedReport;
    formatted.investmentData = reportData.investmentData;
    formatted.preferences = reportData.preferences;
  }

  return formatted;
}

/**
 * Validate report data before storage
 * @param {object} reportData - Report data to validate
 * @returns {object} Validation result
 */
export function validateReportData(reportData) {
  const errors = [];
  const warnings = [];

  // Required fields
  if (!reportData.userId) {
    errors.push('User ID is required');
  }

  if (!reportData.reportType) {
    errors.push('Report type is required');
  } else if (!['basic', 'intermediate', 'advanced'].includes(reportData.reportType)) {
    errors.push('Invalid report type. Must be basic, intermediate, or advanced');
  }

  if (!reportData.generatedReport) {
    errors.push('Generated report content is required');
  } else {
    if (!reportData.generatedReport.summary && !reportData.generatedReport.fullContent) {
      errors.push('Report must have either summary or full content');
    }
  }

  // Warnings for missing optional data
  if (!reportData.title || reportData.title.trim().length === 0) {
    warnings.push('Report title is empty - will use default title');
  }

  if (!reportData.investmentData || Object.keys(reportData.investmentData).length === 0) {
    warnings.push('No investment data provided');
  }

  if (!reportData.metadata || !reportData.metadata.processingTime) {
    warnings.push('Processing time not recorded');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Calculate report quality score based on various factors
 * @param {object} reportData - Report data
 * @returns {object} Quality assessment
 */
export function calculateReportQuality(reportData) {
  let score = 0;
  const factors = [];

  // Content length factor (0-30 points)
  const wordCount = reportData.generatedReport?.wordCount || 0;
  if (wordCount > 2000) {
    score += 30;
    factors.push('Comprehensive content length');
  } else if (wordCount > 1000) {
    score += 20;
    factors.push('Good content length');
  } else if (wordCount > 500) {
    score += 10;
    factors.push('Adequate content length');
  } else {
    factors.push('Short content length');
  }

  // Investment data completeness (0-25 points)
  const investmentData = reportData.investmentData || {};
  let dataCompleteness = 0;
  const dataFields = ['goals', 'riskTolerance', 'timeHorizon', 'portfolio'];
  dataFields.forEach(field => {
    if (investmentData[field] && investmentData[field].toString().trim().length > 0) {
      dataCompleteness++;
    }
  });
  
  const completenessScore = Math.round((dataCompleteness / dataFields.length) * 25);
  score += completenessScore;
  factors.push(`Data completeness: ${Math.round((dataCompleteness / dataFields.length) * 100)}%`);

  // Report structure (0-20 points)
  const sections = reportData.generatedReport?.sections || {};
  const sectionCount = Object.keys(sections).length;
  if (sectionCount >= 4) {
    score += 20;
    factors.push('Well-structured with multiple sections');
  } else if (sectionCount >= 2) {
    score += 15;
    factors.push('Good structure with some sections');
  } else if (sectionCount >= 1) {
    score += 10;
    factors.push('Basic structure');
  } else {
    factors.push('Limited structure');
  }

  // Processing efficiency (0-15 points)
  const processingTime = reportData.metadata?.processingTime || 0;
  if (processingTime > 0 && processingTime < 30000) { // Less than 30 seconds
    score += 15;
    factors.push('Fast processing time');
  } else if (processingTime < 60000) { // Less than 1 minute
    score += 10;
    factors.push('Good processing time');
  } else if (processingTime < 120000) { // Less than 2 minutes
    score += 5;
    factors.push('Acceptable processing time');
  } else {
    factors.push('Slow processing time');
  }

  // Fallback penalty (-10 points)
  if (reportData.metadata?.fallback) {
    score -= 10;
    factors.push('Fallback report (AI service unavailable)');
  }

  // Report type bonus (0-10 points)
  if (reportData.reportType === 'advanced') {
    score += 10;
    factors.push('Advanced analysis level');
  } else if (reportData.reportType === 'intermediate') {
    score += 5;
    factors.push('Intermediate analysis level');
  }

  // Normalize score to 0-100
  score = Math.max(0, Math.min(100, score));

  let qualityLevel;
  if (score >= 80) {
    qualityLevel = 'Excellent';
  } else if (score >= 60) {
    qualityLevel = 'Good';
  } else if (score >= 40) {
    qualityLevel = 'Fair';
  } else {
    qualityLevel = 'Poor';
  }

  return {
    score,
    qualityLevel,
    factors,
    recommendations: generateQualityRecommendations(score, factors)
  };
}

/**
 * Generate recommendations for improving report quality
 * @param {number} score - Quality score
 * @param {array} factors - Quality factors
 * @returns {array} Recommendations
 */
function generateQualityRecommendations(score, factors) {
  const recommendations = [];

  if (score < 60) {
    recommendations.push('Consider providing more detailed investment information for better analysis');
  }

  if (factors.some(f => f.includes('Short content'))) {
    recommendations.push('Try using intermediate or advanced report types for more comprehensive analysis');
  }

  if (factors.some(f => f.includes('Data completeness') && f.includes('50%'))) {
    recommendations.push('Complete all investment data fields (goals, risk tolerance, time horizon, portfolio)');
  }

  if (factors.some(f => f.includes('Limited structure'))) {
    recommendations.push('Request specific analysis sections in your preferences');
  }

  if (factors.some(f => f.includes('Fallback report'))) {
    recommendations.push('Try again when AI service is fully available for better analysis');
  }

  if (factors.some(f => f.includes('Slow processing'))) {
    recommendations.push('Consider reducing the amount of portfolio data or using basic report type');
  }

  return recommendations;
}

/**
 * Extract key metrics from report data for analytics
 * @param {object} reportData - Report data
 * @returns {object} Key metrics
 */
export function extractReportMetrics(reportData) {
  return {
    reportId: reportData.id,
    userId: reportData.userId,
    reportType: reportData.reportType,
    wordCount: reportData.generatedReport?.wordCount || 0,
    processingTime: reportData.metadata?.processingTime || 0,
    apiCost: reportData.metadata?.apiCost || 0,
    totalTokens: reportData.metadata?.totalTokens || 0,
    createdAt: reportData.metadata?.createdAt || reportData.createdAt,
    fallback: reportData.metadata?.fallback || false,
    quality: calculateReportQuality(reportData)
  };
}

/**
 * Format pagination info for API responses
 * @param {array} reports - Array of reports
 * @param {number} requestedLimit - Requested limit
 * @param {string} lastReportId - Last report ID from request
 * @returns {object} Pagination info
 */
export function formatPaginationInfo(reports, requestedLimit, lastReportId = null) {
  return {
    hasMore: reports.length === requestedLimit,
    lastReportId: reports.length > 0 ? reports[reports.length - 1].id : null,
    count: reports.length,
    previousPageId: lastReportId
  };
}

/**
 * Sanitize report data for public display (remove sensitive info)
 * @param {object} reportData - Report data
 * @returns {object} Sanitized report data
 */
export function sanitizeReportForPublic(reportData) {
  const sanitized = { ...reportData };
  
  // Remove sensitive metadata
  if (sanitized.metadata) {
    delete sanitized.metadata.ipAddress;
    delete sanitized.metadata.userAgent;
    delete sanitized.metadata.apiCost;
  }
  
  // Remove detailed investment data (keep only general info)
  if (sanitized.investmentData) {
    delete sanitized.investmentData.annualIncome;
    delete sanitized.investmentData.monthlyExpenses;
    delete sanitized.investmentData.existingSavings;
    // Keep portfolio structure but remove specific amounts
    if (sanitized.investmentData.portfolio && sanitized.investmentData.portfolio.holdings) {
      sanitized.investmentData.portfolio.holdings = sanitized.investmentData.portfolio.holdings.map(holding => ({
        symbol: holding.symbol,
        name: holding.name,
        type: holding.type
        // Remove value, shares, etc.
      }));
    }
  }
  
  return sanitized;
}