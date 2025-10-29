/**
 * Investment Data Processor
 * Handles validation, sanitization, and formatting of user investment data
 * for ChatGPT prompt generation and security
 */

/**
 * Investment Data Processor class
 * Validates user input, sanitizes data, and converts to ChatGPT-friendly format
 */
class InvestmentDataProcessor {
  
  /**
   * Validation rules for different data types
   */
  static VALIDATION_RULES = {
    // Required fields with validation patterns
    goals: {
      required: true,
      minLength: 10,
      maxLength: 1000,
      type: 'string',
      sanitize: true
    },
    riskTolerance: {
      required: true,
      allowedValues: ['conservative', 'moderate', 'aggressive', 'very conservative', 'very aggressive'],
      type: 'string',
      sanitize: true
    },
    timeHorizon: {
      required: true,
      pattern: /^(\d+)\s*(year|years|month|months)$/i,
      minValue: 1,
      maxValue: 50,
      type: 'string',
      sanitize: true
    },
    
    // Optional fields with validation
    age: {
      required: false,
      type: 'number',
      minValue: 18,
      maxValue: 100
    },
    income: {
      required: false,
      type: 'number',
      minValue: 0,
      maxValue: 10000000
    },
    netWorth: {
      required: false,
      type: 'number',
      minValue: -1000000,
      maxValue: 100000000
    },
    experience: {
      required: false,
      allowedValues: ['beginner', 'intermediate', 'advanced', 'expert'],
      type: 'string',
      sanitize: true
    },
    taxSituation: {
      required: false,
      maxLength: 500,
      type: 'string',
      sanitize: true
    }
  };

  /**
   * Portfolio validation rules
   */
  static PORTFOLIO_RULES = {
    holdings: {
      required: false,
      type: 'array',
      maxItems: 50,
      itemRules: {
        name: { required: true, maxLength: 100, sanitize: true },
        symbol: { required: false, maxLength: 10, pattern: /^[A-Z0-9.-]+$/i, sanitize: true },
        type: { required: false, allowedValues: ['stock', 'bond', 'etf', 'mutual fund', 'crypto', 'real estate', 'commodity', 'cash', 'other'], sanitize: true },
        value: { required: false, type: 'number', minValue: 0, maxValue: 100000000 },
        percentage: { required: false, type: 'number', minValue: 0, maxValue: 100 },
        description: { required: false, maxLength: 200, sanitize: true }
      }
    },
    totalValue: {
      required: false,
      type: 'number',
      minValue: 0,
      maxValue: 100000000
    }
  };

  /**
   * Dangerous patterns that could indicate prompt injection attempts
   */
  static SECURITY_PATTERNS = [
    // Direct prompt injection attempts
    /ignore\s+(previous|above|all)\s+(instructions|prompts|rules)/i,
    /forget\s+(everything|all|previous)/i,
    /new\s+(instructions|prompt|role|task)/i,
    /act\s+as\s+(if\s+you\s+are|a|an)/i,
    /pretend\s+(to\s+be|you\s+are)/i,
    /roleplay\s+as/i,
    
    // System prompt manipulation
    /system\s*[:=]\s*/i,
    /assistant\s*[:=]\s*/i,
    /human\s*[:=]\s*/i,
    /user\s*[:=]\s*/i,
    
    // Code injection attempts
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript\s*:/i,
    /on\w+\s*=/i,
    
    // SQL injection patterns
    /union\s+select/i,
    /drop\s+table/i,
    /delete\s+from/i,
    /insert\s+into/i,
    
    // Command injection
    /\$\([^)]*\)/,
    /`[^`]*`/,
    /\|\s*\w+/,
    /&&\s*\w+/,
    /;\s*\w+/
  ];

  /**
   * Validate complete investment data object
   * @param {object} investmentData - Raw investment data from user
   * @returns {object} Validation result with errors, warnings, and sanitized data
   */
  static validateInvestmentData(investmentData) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      sanitizedData: {},
      completeness: 0,
      securityIssues: []
    };

    try {
      // Check if input is an object
      if (!investmentData || typeof investmentData !== 'object') {
        result.isValid = false;
        result.errors.push('Investment data must be a valid object');
        return result;
      }

      // Validate main fields
      const mainFieldResults = this.validateMainFields(investmentData);
      result.errors.push(...mainFieldResults.errors);
      result.warnings.push(...mainFieldResults.warnings);
      result.securityIssues.push(...mainFieldResults.securityIssues);
      Object.assign(result.sanitizedData, mainFieldResults.sanitizedData);

      // Validate portfolio if provided
      if (investmentData.portfolio) {
        const portfolioResults = this.validatePortfolio(investmentData.portfolio);
        result.errors.push(...portfolioResults.errors);
        result.warnings.push(...portfolioResults.warnings);
        result.securityIssues.push(...portfolioResults.securityIssues);
        result.sanitizedData.portfolio = portfolioResults.sanitizedData;
      }

      // Calculate completeness
      result.completeness = this.calculateCompleteness(result.sanitizedData);

      // Set overall validity
      result.isValid = result.errors.length === 0 && result.securityIssues.length === 0;

      return result;

    } catch (error) {
      console.error('Error validating investment data:', error);
      result.isValid = false;
      result.errors.push(`Validation error: ${error.message}`);
      return result;
    }
  }

  /**
   * Validate main investment data fields
   * @param {object} data - Investment data object
   * @returns {object} Validation results for main fields
   */
  static validateMainFields(data) {
    const result = {
      errors: [],
      warnings: [],
      securityIssues: [],
      sanitizedData: {}
    };

    Object.entries(this.VALIDATION_RULES).forEach(([fieldName, rules]) => {
      const value = data[fieldName];
      const fieldResult = this.validateField(fieldName, value, rules);
      
      result.errors.push(...fieldResult.errors);
      result.warnings.push(...fieldResult.warnings);
      result.securityIssues.push(...fieldResult.securityIssues);
      
      if (fieldResult.sanitizedValue !== undefined) {
        result.sanitizedData[fieldName] = fieldResult.sanitizedValue;
      }
    });

    return result;
  }

  /**
   * Validate a single field against its rules
   * @param {string} fieldName - Name of the field
   * @param {any} value - Field value
   * @param {object} rules - Validation rules for the field
   * @returns {object} Field validation result
   */
  static validateField(fieldName, value, rules) {
    const result = {
      errors: [],
      warnings: [],
      securityIssues: [],
      sanitizedValue: undefined
    };

    // Check if required field is missing
    if (rules.required && (value === undefined || value === null || value === '')) {
      result.errors.push(`${fieldName} is required`);
      return result;
    }

    // Skip validation if field is not provided and not required
    if (!rules.required && (value === undefined || value === null || value === '')) {
      return result;
    }

    // Type validation
    if (rules.type === 'string' && typeof value !== 'string') {
      result.errors.push(`${fieldName} must be a string`);
      return result;
    }

    if (rules.type === 'number') {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(numValue)) {
        result.errors.push(`${fieldName} must be a valid number`);
        return result;
      }
      result.sanitizedValue = numValue;
      
      // Number range validation
      if (rules.minValue !== undefined && numValue < rules.minValue) {
        result.errors.push(`${fieldName} must be at least ${rules.minValue}`);
      }
      if (rules.maxValue !== undefined && numValue > rules.maxValue) {
        result.errors.push(`${fieldName} must be at most ${rules.maxValue}`);
      }
      
      return result;
    }

    // String-specific validations
    if (rules.type === 'string') {
      let sanitizedValue = value;

      // Security check for prompt injection
      const securityCheck = this.checkForSecurityIssues(value, fieldName);
      result.securityIssues.push(...securityCheck);

      // Sanitize if required
      if (rules.sanitize) {
        sanitizedValue = this.sanitizeString(value);
      }

      // Length validation
      if (rules.minLength && sanitizedValue.length < rules.minLength) {
        result.errors.push(`${fieldName} must be at least ${rules.minLength} characters long`);
      }
      if (rules.maxLength && sanitizedValue.length > rules.maxLength) {
        result.errors.push(`${fieldName} must be at most ${rules.maxLength} characters long`);
      }

      // Pattern validation
      if (rules.pattern && !rules.pattern.test(sanitizedValue)) {
        result.errors.push(`${fieldName} format is invalid`);
      }

      // Allowed values validation
      if (rules.allowedValues) {
        const normalizedValue = sanitizedValue.toLowerCase().trim();
        const allowedNormalized = rules.allowedValues.map(v => v.toLowerCase());
        if (!allowedNormalized.includes(normalizedValue)) {
          result.errors.push(`${fieldName} must be one of: ${rules.allowedValues.join(', ')}`);
        }
      }

      result.sanitizedValue = sanitizedValue;
    }

    return result;
  }

  /**
   * Validate portfolio data structure
   * @param {object} portfolio - Portfolio data object
   * @returns {object} Portfolio validation results
   */
  static validatePortfolio(portfolio) {
    const result = {
      errors: [],
      warnings: [],
      securityIssues: [],
      sanitizedData: {}
    };

    try {
      if (typeof portfolio !== 'object') {
        result.errors.push('Portfolio must be an object');
        return result;
      }

      // Validate total value if provided
      if (portfolio.totalValue !== undefined) {
        const totalValueResult = this.validateField('totalValue', portfolio.totalValue, this.PORTFOLIO_RULES.totalValue);
        result.errors.push(...totalValueResult.errors);
        result.warnings.push(...totalValueResult.warnings);
        if (totalValueResult.sanitizedValue !== undefined) {
          result.sanitizedData.totalValue = totalValueResult.sanitizedValue;
        }
      }

      // Validate holdings array
      if (portfolio.holdings) {
        const holdingsResult = this.validateHoldings(portfolio.holdings);
        result.errors.push(...holdingsResult.errors);
        result.warnings.push(...holdingsResult.warnings);
        result.securityIssues.push(...holdingsResult.securityIssues);
        result.sanitizedData.holdings = holdingsResult.sanitizedData;
      }

      // Copy other safe fields
      if (portfolio.lastUpdated && typeof portfolio.lastUpdated === 'string') {
        result.sanitizedData.lastUpdated = this.sanitizeString(portfolio.lastUpdated);
      }

      return result;

    } catch (error) {
      console.error('Error validating portfolio:', error);
      result.errors.push(`Portfolio validation error: ${error.message}`);
      return result;
    }
  }

  /**
   * Validate portfolio holdings array
   * @param {array} holdings - Array of portfolio holdings
   * @returns {object} Holdings validation results
   */
  static validateHoldings(holdings) {
    const result = {
      errors: [],
      warnings: [],
      securityIssues: [],
      sanitizedData: []
    };

    if (!Array.isArray(holdings)) {
      result.errors.push('Portfolio holdings must be an array');
      return result;
    }

    if (holdings.length > this.PORTFOLIO_RULES.holdings.maxItems) {
      result.errors.push(`Portfolio can have at most ${this.PORTFOLIO_RULES.holdings.maxItems} holdings`);
      return result;
    }

    holdings.forEach((holding, index) => {
      if (typeof holding !== 'object') {
        result.errors.push(`Holding ${index + 1} must be an object`);
        return;
      }

      const sanitizedHolding = {};
      let holdingValid = true;

      // Validate each field in the holding
      Object.entries(this.PORTFOLIO_RULES.holdings.itemRules).forEach(([fieldName, rules]) => {
        const fieldResult = this.validateField(`holding ${index + 1} ${fieldName}`, holding[fieldName], rules);
        
        result.errors.push(...fieldResult.errors);
        result.warnings.push(...fieldResult.warnings);
        result.securityIssues.push(...fieldResult.securityIssues);
        
        if (fieldResult.errors.length > 0) {
          holdingValid = false;
        }
        
        if (fieldResult.sanitizedValue !== undefined) {
          sanitizedHolding[fieldName] = fieldResult.sanitizedValue;
        }
      });

      // Only add holding if it's valid and has required fields
      if (holdingValid && sanitizedHolding.name) {
        result.sanitizedData.push(sanitizedHolding);
      }
    });

    // Validate percentage totals if provided
    const percentages = result.sanitizedData
      .map(h => h.percentage)
      .filter(p => p !== undefined);
    
    if (percentages.length > 0) {
      const total = percentages.reduce((sum, p) => sum + p, 0);
      if (Math.abs(total - 100) > 1) { // Allow 1% tolerance
        result.warnings.push(`Portfolio percentages total ${total.toFixed(1)}% instead of 100%`);
      }
    }

    return result;
  }

  /**
   * Check for potential security issues in text input
   * @param {string} text - Text to check
   * @param {string} fieldName - Name of the field being checked
   * @returns {array} Array of security issues found
   */
  static checkForSecurityIssues(text, fieldName) {
    const issues = [];

    if (typeof text !== 'string') {
      return issues;
    }

    this.SECURITY_PATTERNS.forEach(pattern => {
      if (pattern.test(text)) {
        issues.push(`Potential security issue detected in ${fieldName}: suspicious pattern found`);
      }
    });

    // Check for excessive special characters (possible injection attempt)
    const specialCharCount = (text.match(/[<>{}[\]()$`|&;]/g) || []).length;
    if (specialCharCount > text.length * 0.1) {
      issues.push(`Potential security issue in ${fieldName}: excessive special characters`);
    }

    // Check for very long strings that might be injection attempts
    if (text.length > 5000) {
      issues.push(`Potential security issue in ${fieldName}: unusually long input`);
    }

    return issues;
  }

  /**
   * Sanitize string input to prevent injection attacks
   * @param {string} input - Input string to sanitize
   * @returns {string} Sanitized string
   */
  static sanitizeString(input) {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      // Remove null bytes
      .replace(/\0/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Remove control characters except newlines and tabs
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Trim whitespace
      .trim()
      // Limit length as safety measure
      .substring(0, 10000);
  }

  /**
   * Calculate data completeness percentage
   * @param {object} data - Sanitized investment data
   * @returns {number} Completeness percentage (0-100)
   */
  static calculateCompleteness(data) {
    const requiredFields = Object.keys(this.VALIDATION_RULES).filter(
      key => this.VALIDATION_RULES[key].required
    );
    const optionalFields = Object.keys(this.VALIDATION_RULES).filter(
      key => !this.VALIDATION_RULES[key].required
    );

    let score = 0;
    let maxScore = 0;

    // Required fields are worth more points
    requiredFields.forEach(field => {
      maxScore += 3;
      if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
        score += 3;
      }
    });

    // Optional fields add bonus points
    optionalFields.forEach(field => {
      maxScore += 1;
      if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
        score += 1;
      }
    });

    // Portfolio adds significant bonus
    if (data.portfolio && data.portfolio.holdings && data.portfolio.holdings.length > 0) {
      maxScore += 2;
      score += 2;
    } else {
      maxScore += 2;
    }

    return Math.round((score / maxScore) * 100);
  }
}

// Exports are at the end of the file
/*
*
 * Investment Data Structure Converter
 * Converts validated user input into ChatGPT-friendly format and extracts key metrics
 */
class InvestmentDataConverter {

  /**
   * Convert validated investment data to ChatGPT-friendly format
   * @param {object} validatedData - Sanitized and validated investment data
   * @param {object} userPreferences - User preferences for report generation
   * @returns {object} Formatted data ready for ChatGPT prompts
   */
  static convertToPromptFormat(validatedData, userPreferences = {}) {
    try {
      const converted = {
        // Basic investment information
        goals: this.formatGoals(validatedData.goals),
        riskTolerance: this.formatRiskTolerance(validatedData.riskTolerance),
        timeHorizon: this.formatTimeHorizon(validatedData.timeHorizon),
        
        // Personal information
        age: this.formatAge(validatedData.age),
        income: this.formatIncome(validatedData.income),
        netWorth: this.formatNetWorth(validatedData.netWorth),
        experience: this.formatExperience(validatedData.experience),
        taxSituation: this.formatTaxSituation(validatedData.taxSituation),
        
        // Portfolio information
        portfolio: this.formatPortfolio(validatedData.portfolio),
        
        // Extracted key metrics
        keyMetrics: this.extractKeyMetrics(validatedData),
        
        // User preferences
        focusAreas: this.formatFocusAreas(userPreferences.focusAreas),
        reportType: userPreferences.reportType || 'basic',
        marketOutlook: userPreferences.marketOutlook || 'neutral',
        
        // Metadata
        dataCompleteness: this.calculateDataCompleteness(validatedData),
        conversionTimestamp: new Date().toISOString()
      };

      return converted;

    } catch (error) {
      console.error('Error converting investment data to prompt format:', error);
      throw new Error(`Data conversion failed: ${error.message}`);
    }
  }

  /**
   * Format investment goals for ChatGPT consumption
   * @param {string} goals - User's investment goals
   * @returns {string} Formatted goals description
   */
  static formatGoals(goals) {
    if (!goals || typeof goals !== 'string') {
      return 'No specific investment goals provided';
    }

    // Clean up and structure the goals
    const cleanGoals = goals.trim();
    
    // Add context if goals seem too brief
    if (cleanGoals.length < 50) {
      return `Investment Goals: ${cleanGoals} (Note: Limited detail provided - may need more specific objectives for comprehensive analysis)`;
    }

    return `Investment Goals: ${cleanGoals}`;
  }

  /**
   * Format risk tolerance with additional context
   * @param {string} riskTolerance - User's risk tolerance level
   * @returns {string} Formatted risk tolerance description
   */
  static formatRiskTolerance(riskTolerance) {
    if (!riskTolerance) {
      return 'Risk tolerance not specified';
    }

    const riskDescriptions = {
      'very conservative': 'Very Conservative - Prioritizes capital preservation over growth, minimal volatility tolerance',
      'conservative': 'Conservative - Prefers stable returns with low volatility, limited growth focus',
      'moderate': 'Moderate - Balanced approach between growth and stability, accepts moderate volatility',
      'aggressive': 'Aggressive - Growth-focused with high volatility tolerance, accepts significant risk for higher returns',
      'very aggressive': 'Very Aggressive - Maximum growth orientation, comfortable with high volatility and substantial risk'
    };

    const description = riskDescriptions[riskTolerance.toLowerCase()] || riskTolerance;
    return `Risk Tolerance: ${description}`;
  }

  /**
   * Format time horizon with investment implications
   * @param {string} timeHorizon - User's investment time horizon
   * @returns {string} Formatted time horizon description
   */
  static formatTimeHorizon(timeHorizon) {
    if (!timeHorizon) {
      return 'Investment time horizon not specified';
    }

    // Extract number and unit from time horizon
    const match = timeHorizon.match(/(\d+)\s*(year|years|month|months)/i);
    if (!match) {
      return `Investment Time Horizon: ${timeHorizon}`;
    }

    const number = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    let implications = '';
    if (unit.startsWith('month')) {
      const months = number;
      if (months < 12) {
        implications = ' (Short-term: Focus on capital preservation and liquidity)';
      } else if (months < 36) {
        implications = ' (Medium-term: Balanced approach with moderate growth potential)';
      } else {
        implications = ' (Long-term: Growth-oriented strategies appropriate)';
      }
    } else if (unit.startsWith('year')) {
      const years = number;
      if (years < 3) {
        implications = ' (Short-term: Conservative approach recommended)';
      } else if (years < 10) {
        implications = ' (Medium-term: Balanced growth and stability focus)';
      } else {
        implications = ' (Long-term: Aggressive growth strategies viable)';
      }
    }

    return `Investment Time Horizon: ${timeHorizon}${implications}`;
  }

  /**
   * Format age with investment lifecycle context
   * @param {number} age - User's age
   * @returns {string} Formatted age description
   */
  static formatAge(age) {
    if (!age || typeof age !== 'number') {
      return 'Age not provided';
    }

    let lifestageContext = '';
    if (age < 30) {
      lifestageContext = ' (Early career: Long investment horizon, can accept higher risk)';
    } else if (age < 45) {
      lifestageContext = ' (Mid-career: Building wealth phase, moderate to aggressive strategies)';
    } else if (age < 60) {
      lifestageContext = ' (Pre-retirement: Wealth preservation becomes important)';
    } else {
      lifestageContext = ' (Retirement age: Focus on income generation and capital preservation)';
    }

    return `Age: ${age}${lifestageContext}`;
  }

  /**
   * Format income with investment capacity context
   * @param {number} income - User's annual income
   * @returns {string} Formatted income description
   */
  static formatIncome(income) {
    if (!income || typeof income !== 'number') {
      return 'Annual income not provided';
    }

    let incomeContext = '';
    if (income < 50000) {
      incomeContext = ' (Focus on emergency fund and low-cost investing)';
    } else if (income < 100000) {
      incomeContext = ' (Good foundation for diversified investing)';
    } else if (income < 250000) {
      incomeContext = ' (Strong investment capacity, tax optimization important)';
    } else {
      incomeContext = ' (High investment capacity, advanced strategies and tax planning crucial)';
    }

    return `Annual Income: $${income.toLocaleString()}${incomeContext}`;
  }

  /**
   * Format net worth with wealth management context
   * @param {number} netWorth - User's net worth
   * @returns {string} Formatted net worth description
   */
  static formatNetWorth(netWorth) {
    if (netWorth === undefined || netWorth === null || typeof netWorth !== 'number') {
      return 'Net worth not provided';
    }

    let wealthContext = '';
    if (netWorth < 0) {
      wealthContext = ' (Debt reduction should be prioritized alongside investing)';
    } else if (netWorth < 100000) {
      wealthContext = ' (Building phase: Focus on consistent contributions and growth)';
    } else if (netWorth < 500000) {
      wealthContext = ' (Accumulation phase: Diversification and optimization important)';
    } else if (netWorth < 1000000) {
      wealthContext = ' (Pre-millionaire: Advanced strategies and tax planning beneficial)';
    } else {
      wealthContext = ' (High net worth: Sophisticated wealth management strategies appropriate)';
    }

    const formattedValue = netWorth >= 0 ? `$${netWorth.toLocaleString()}` : `-$${Math.abs(netWorth).toLocaleString()}`;
    return `Net Worth: ${formattedValue}${wealthContext}`;
  }

  /**
   * Format investment experience with strategy implications
   * @param {string} experience - User's investment experience level
   * @returns {string} Formatted experience description
   */
  static formatExperience(experience) {
    if (!experience) {
      return 'Investment experience level not specified';
    }

    const experienceDescriptions = {
      'beginner': 'Beginner - New to investing, requires educational content and simple strategies',
      'intermediate': 'Intermediate - Some investment knowledge, can handle moderate complexity',
      'advanced': 'Advanced - Experienced investor, comfortable with sophisticated strategies',
      'expert': 'Expert - Highly experienced, can evaluate complex investment approaches'
    };

    const description = experienceDescriptions[experience.toLowerCase()] || experience;
    return `Investment Experience: ${description}`;
  }

  /**
   * Format tax situation with optimization opportunities
   * @param {string} taxSituation - User's tax situation
   * @returns {string} Formatted tax situation description
   */
  static formatTaxSituation(taxSituation) {
    if (!taxSituation || typeof taxSituation !== 'string') {
      return 'Tax situation not provided';
    }

    return `Tax Situation: ${taxSituation.trim()} (Consider tax-efficient investment strategies)`;
  }

  /**
   * Format portfolio holdings for ChatGPT analysis
   * @param {object} portfolio - Portfolio data object
   * @returns {string} Formatted portfolio description
   */
  static formatPortfolio(portfolio) {
    if (!portfolio || typeof portfolio !== 'object') {
      return 'No portfolio information provided';
    }

    let formatted = 'CURRENT PORTFOLIO:\n\n';

    // Add total value if available
    if (portfolio.totalValue) {
      formatted += `Total Portfolio Value: $${portfolio.totalValue.toLocaleString()}\n\n`;
    }

    // Format holdings
    if (portfolio.holdings && Array.isArray(portfolio.holdings) && portfolio.holdings.length > 0) {
      formatted += 'Holdings Breakdown:\n';
      
      portfolio.holdings.forEach((holding, index) => {
        formatted += `${index + 1}. ${holding.name || 'Unknown Holding'}`;
        
        if (holding.symbol) {
          formatted += ` (${holding.symbol})`;
        }
        
        formatted += '\n';
        
        if (holding.type) {
          formatted += `   Asset Type: ${holding.type}\n`;
        }
        
        if (holding.value) {
          formatted += `   Value: $${holding.value.toLocaleString()}\n`;
        }
        
        if (holding.percentage) {
          formatted += `   Portfolio Allocation: ${holding.percentage}%\n`;
        }
        
        if (holding.description) {
          formatted += `   Notes: ${holding.description}\n`;
        }
        
        formatted += '\n';
      });

      // Add portfolio analysis summary
      const analysis = this.analyzePortfolioComposition(portfolio.holdings);
      if (analysis) {
        formatted += 'Portfolio Composition Summary:\n';
        formatted += analysis;
      }

    } else {
      formatted += 'No specific holdings provided - general analysis will be performed\n';
    }

    // Add last updated info
    if (portfolio.lastUpdated) {
      formatted += `\nLast Updated: ${portfolio.lastUpdated}`;
    }

    return formatted.trim();
  }

  /**
   * Analyze portfolio composition and provide summary
   * @param {array} holdings - Array of portfolio holdings
   * @returns {string} Portfolio composition analysis
   */
  static analyzePortfolioComposition(holdings) {
    if (!Array.isArray(holdings) || holdings.length === 0) {
      return '';
    }

    const composition = {};
    let totalPercentage = 0;
    let hasPercentages = false;

    holdings.forEach(holding => {
      const type = holding.type || 'unknown';
      composition[type] = (composition[type] || 0) + 1;
      
      if (holding.percentage) {
        hasPercentages = true;
        totalPercentage += holding.percentage;
      }
    });

    let analysis = '';
    
    // Asset type distribution
    const types = Object.keys(composition);
    if (types.length > 0) {
      analysis += `Asset Types: ${types.join(', ')} (${holdings.length} total holdings)\n`;
    }

    // Percentage validation
    if (hasPercentages) {
      analysis += `Total Allocation: ${totalPercentage.toFixed(1)}%`;
      if (Math.abs(totalPercentage - 100) > 1) {
        analysis += ' (Note: Allocations do not sum to 100%)';
      }
      analysis += '\n';
    }

    // Diversification assessment
    if (holdings.length === 1) {
      analysis += 'Diversification: Single holding - high concentration risk\n';
    } else if (holdings.length < 5) {
      analysis += 'Diversification: Limited - consider broader diversification\n';
    } else if (holdings.length < 15) {
      analysis += 'Diversification: Moderate - reasonable spread of holdings\n';
    } else {
      analysis += 'Diversification: High - well-diversified portfolio\n';
    }

    return analysis;
  }

  /**
   * Format focus areas for analysis
   * @param {array} focusAreas - User's preferred focus areas
   * @returns {string} Formatted focus areas description
   */
  static formatFocusAreas(focusAreas) {
    if (!Array.isArray(focusAreas) || focusAreas.length === 0) {
      return 'No specific focus areas requested - comprehensive analysis will be provided';
    }

    const validFocusAreas = [
      'risk analysis', 'growth potential', 'income generation', 'tax optimization',
      'diversification', 'cost analysis', 'market trends', 'sector allocation',
      'rebalancing', 'performance review'
    ];

    const filteredAreas = focusAreas.filter(area => 
      typeof area === 'string' && area.trim().length > 0
    );

    if (filteredAreas.length === 0) {
      return 'No valid focus areas specified - general analysis will be provided';
    }

    return `Analysis Focus Areas: ${filteredAreas.join(', ')} - Please emphasize these aspects in the investment analysis`;
  }

  /**
   * Extract key financial metrics from investment data
   * @param {object} validatedData - Validated investment data
   * @returns {object} Key metrics object
   */
  static extractKeyMetrics(validatedData) {
    const metrics = {
      // Risk metrics
      riskProfile: this.determineRiskProfile(validatedData),
      
      // Time-based metrics
      investmentHorizon: this.parseTimeHorizon(validatedData.timeHorizon),
      
      // Financial capacity metrics
      investmentCapacity: this.assessInvestmentCapacity(validatedData),
      
      // Portfolio metrics
      portfolioMetrics: this.calculatePortfolioMetrics(validatedData.portfolio),
      
      // Lifecycle stage
      lifecycleStage: this.determineLifecycleStage(validatedData.age, validatedData.netWorth),
      
      // Data quality metrics
      dataQuality: this.assessDataQuality(validatedData)
    };

    return metrics;
  }

  /**
   * Determine overall risk profile based on multiple factors
   * @param {object} data - Investment data
   * @returns {object} Risk profile assessment
   */
  static determineRiskProfile(data) {
    let riskScore = 0; // 0-100 scale
    const factors = [];

    // Risk tolerance (40% weight)
    if (data.riskTolerance) {
      const riskMap = {
        'very conservative': 10,
        'conservative': 25,
        'moderate': 50,
        'aggressive': 75,
        'very aggressive': 90
      };
      const toleranceScore = riskMap[data.riskTolerance.toLowerCase()] || 50;
      riskScore += toleranceScore * 0.4;
      factors.push(`Risk tolerance: ${data.riskTolerance}`);
    }

    // Age factor (25% weight)
    if (data.age) {
      const ageRiskScore = Math.max(0, Math.min(100, 100 - data.age));
      riskScore += ageRiskScore * 0.25;
      factors.push(`Age factor: ${data.age} years`);
    }

    // Time horizon (25% weight)
    const timeHorizon = this.parseTimeHorizon(data.timeHorizon);
    if (timeHorizon.years > 0) {
      const timeRiskScore = Math.min(100, timeHorizon.years * 10);
      riskScore += timeRiskScore * 0.25;
      factors.push(`Time horizon: ${timeHorizon.years} years`);
    }

    // Experience level (10% weight)
    if (data.experience) {
      const expMap = {
        'beginner': 20,
        'intermediate': 50,
        'advanced': 75,
        'expert': 90
      };
      const expScore = expMap[data.experience.toLowerCase()] || 50;
      riskScore += expScore * 0.1;
      factors.push(`Experience: ${data.experience}`);
    }

    return {
      overallScore: Math.round(riskScore),
      level: this.categorizeRiskLevel(riskScore),
      factors: factors,
      recommendation: this.getRiskRecommendation(riskScore)
    };
  }

  /**
   * Parse time horizon into standardized format
   * @param {string} timeHorizon - Time horizon string
   * @returns {object} Parsed time horizon
   */
  static parseTimeHorizon(timeHorizon) {
    if (!timeHorizon) {
      return { years: 0, months: 0, category: 'unknown' };
    }

    const match = timeHorizon.match(/(\d+)\s*(year|years|month|months)/i);
    if (!match) {
      return { years: 0, months: 0, category: 'unknown' };
    }

    const number = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    let years = 0;
    let months = 0;
    
    if (unit.startsWith('year')) {
      years = number;
      months = number * 12;
    } else if (unit.startsWith('month')) {
      months = number;
      years = number / 12;
    }

    let category = 'short-term';
    if (years >= 10) {
      category = 'long-term';
    } else if (years >= 3) {
      category = 'medium-term';
    }

    return { years, months, category };
  }

  /**
   * Assess investment capacity based on income and net worth
   * @param {object} data - Investment data
   * @returns {object} Investment capacity assessment
   */
  static assessInvestmentCapacity(data) {
    const capacity = {
      level: 'unknown',
      monthlyCapacity: 0,
      recommendations: []
    };

    if (data.income && typeof data.income === 'number') {
      // Estimate monthly investment capacity (10-20% of income)
      const monthlyIncome = data.income / 12;
      capacity.monthlyCapacity = Math.round(monthlyIncome * 0.15); // 15% default
      
      if (data.income < 50000) {
        capacity.level = 'limited';
        capacity.recommendations.push('Focus on emergency fund first');
        capacity.recommendations.push('Consider low-cost index funds');
      } else if (data.income < 100000) {
        capacity.level = 'moderate';
        capacity.recommendations.push('Build diversified portfolio');
        capacity.recommendations.push('Consider tax-advantaged accounts');
      } else {
        capacity.level = 'high';
        capacity.recommendations.push('Explore advanced strategies');
        capacity.recommendations.push('Tax optimization important');
      }
    }

    return capacity;
  }

  /**
   * Calculate portfolio-specific metrics
   * @param {object} portfolio - Portfolio data
   * @returns {object} Portfolio metrics
   */
  static calculatePortfolioMetrics(portfolio) {
    const metrics = {
      holdingCount: 0,
      diversificationScore: 0,
      assetAllocation: {},
      concentrationRisk: 'unknown'
    };

    if (!portfolio || !portfolio.holdings || !Array.isArray(portfolio.holdings)) {
      return metrics;
    }

    const holdings = portfolio.holdings;
    metrics.holdingCount = holdings.length;

    // Calculate asset allocation
    holdings.forEach(holding => {
      const type = holding.type || 'unknown';
      metrics.assetAllocation[type] = (metrics.assetAllocation[type] || 0) + 1;
    });

    // Calculate diversification score (0-100)
    const assetTypes = Object.keys(metrics.assetAllocation).length;
    if (assetTypes === 1) {
      metrics.diversificationScore = 20;
      metrics.concentrationRisk = 'high';
    } else if (assetTypes < 3) {
      metrics.diversificationScore = 40;
      metrics.concentrationRisk = 'moderate';
    } else if (assetTypes < 5) {
      metrics.diversificationScore = 70;
      metrics.concentrationRisk = 'low';
    } else {
      metrics.diversificationScore = 90;
      metrics.concentrationRisk = 'very low';
    }

    return metrics;
  }

  /**
   * Determine lifecycle stage based on age and net worth
   * @param {number} age - User's age
   * @param {number} netWorth - User's net worth
   * @returns {object} Lifecycle stage assessment
   */
  static determineLifecycleStage(age, netWorth) {
    const stage = {
      phase: 'unknown',
      characteristics: [],
      recommendations: []
    };

    if (!age) {
      return stage;
    }

    if (age < 30) {
      stage.phase = 'accumulation-early';
      stage.characteristics.push('Long investment horizon');
      stage.characteristics.push('High risk tolerance appropriate');
      stage.recommendations.push('Focus on growth investments');
      stage.recommendations.push('Maximize retirement contributions');
    } else if (age < 45) {
      stage.phase = 'accumulation-peak';
      stage.characteristics.push('Peak earning years');
      stage.characteristics.push('Building wealth rapidly');
      stage.recommendations.push('Diversified growth strategy');
      stage.recommendations.push('Tax optimization important');
    } else if (age < 60) {
      stage.phase = 'pre-retirement';
      stage.characteristics.push('Wealth preservation important');
      stage.characteristics.push('Reducing risk gradually');
      stage.recommendations.push('Balanced growth and income');
      stage.recommendations.push('Estate planning considerations');
    } else {
      stage.phase = 'retirement';
      stage.characteristics.push('Income generation focus');
      stage.characteristics.push('Capital preservation priority');
      stage.recommendations.push('Conservative income strategy');
      stage.recommendations.push('Liquidity management');
    }

    // Adjust based on net worth if available
    if (netWorth !== undefined && netWorth !== null) {
      if (netWorth < 0) {
        stage.recommendations.unshift('Debt reduction priority');
      } else if (netWorth > 1000000) {
        stage.recommendations.push('Advanced wealth management');
        stage.recommendations.push('Tax and estate planning');
      }
    }

    return stage;
  }

  /**
   * Assess overall data quality and completeness
   * @param {object} data - Investment data
   * @returns {object} Data quality assessment
   */
  static assessDataQuality(data) {
    const quality = {
      completeness: 0,
      reliability: 'unknown',
      gaps: [],
      strengths: []
    };

    const requiredFields = ['goals', 'riskTolerance', 'timeHorizon'];
    const optionalFields = ['age', 'income', 'netWorth', 'experience', 'portfolio'];
    
    let providedRequired = 0;
    let providedOptional = 0;

    // Check required fields
    requiredFields.forEach(field => {
      if (data[field] && data[field] !== '') {
        providedRequired++;
        quality.strengths.push(`${field} provided`);
      } else {
        quality.gaps.push(`Missing ${field}`);
      }
    });

    // Check optional fields
    optionalFields.forEach(field => {
      if (data[field] && data[field] !== '') {
        providedOptional++;
        quality.strengths.push(`${field} provided`);
      }
    });

    // Calculate completeness
    quality.completeness = Math.round(
      ((providedRequired / requiredFields.length) * 70 + 
       (providedOptional / optionalFields.length) * 30)
    );

    // Determine reliability
    if (quality.completeness >= 80) {
      quality.reliability = 'high';
    } else if (quality.completeness >= 60) {
      quality.reliability = 'moderate';
    } else {
      quality.reliability = 'low';
    }

    return quality;
  }

  /**
   * Calculate data completeness percentage
   * @param {object} data - Investment data
   * @returns {number} Completeness percentage
   */
  static calculateDataCompleteness(data) {
    return InvestmentDataProcessor.calculateCompleteness(data);
  }

  // Helper methods

  static categorizeRiskLevel(score) {
    if (score < 20) return 'very conservative';
    if (score < 40) return 'conservative';
    if (score < 60) return 'moderate';
    if (score < 80) return 'aggressive';
    return 'very aggressive';
  }

  static getRiskRecommendation(score) {
    if (score < 20) return 'Focus on capital preservation and stable income';
    if (score < 40) return 'Balanced approach with emphasis on stability';
    if (score < 60) return 'Moderate growth with balanced risk management';
    if (score < 80) return 'Growth-oriented with active risk management';
    return 'Maximum growth potential with high risk tolerance';
  }
}

// Export both classes
export { InvestmentDataProcessor, InvestmentDataConverter };