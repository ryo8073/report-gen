/**
 * Progress and Timeout Manager for Report Generation
 * Task 7.3: Add Progress and Timeout Handling
 * 
 * This module provides:
 * - Progress indicators for report generation
 * - Timeout handling for requests over 60 seconds
 * - Cancel functionality for long-running requests
 */

class ProgressTimeoutManager {
  constructor() {
    this.activeRequests = new Map();
    this.defaultTimeout = 60000; // 60 seconds
    this.progressUpdateInterval = 1000; // 1 second
    this.timeoutWarningThreshold = 45000; // 45 seconds
    
    // Progress stages for different report types
    this.progressStages = {
      jp_investment_4part: [
        { stage: 'initializing', message: 'Initializing investment analysis...', progress: 5 },
        { stage: 'processing_files', message: 'Processing uploaded files...', progress: 15 },
        { stage: 'extracting_data', message: 'Extracting financial data...', progress: 30 },
        { stage: 'calculating_metrics', message: 'Calculating investment metrics...', progress: 50 },
        { stage: 'generating_analysis', message: 'Generating detailed analysis...', progress: 70 },
        { stage: 'formatting_report', message: 'Formatting final report...', progress: 90 },
        { stage: 'completed', message: 'Report generation completed!', progress: 100 }
      ],
      jp_tax_strategy: [
        { stage: 'initializing', message: 'Initializing tax strategy analysis...', progress: 5 },
        { stage: 'processing_files', message: 'Processing tax documents...', progress: 20 },
        { stage: 'calculating_depreciation', message: 'Calculating depreciation benefits...', progress: 40 },
        { stage: 'analyzing_tax_impact', message: 'Analyzing tax impact scenarios...', progress: 65 },
        { stage: 'generating_strategy', message: 'Generating tax optimization strategy...', progress: 85 },
        { stage: 'completed', message: 'Tax strategy report completed!', progress: 100 }
      ],
      jp_inheritance_strategy: [
        { stage: 'initializing', message: 'Initializing inheritance strategy analysis...', progress: 5 },
        { stage: 'processing_assets', message: 'Processing asset information...', progress: 20 },
        { stage: 'calculating_tax_reduction', message: 'Calculating inheritance tax reduction...', progress: 45 },
        { stage: 'analyzing_strategies', message: 'Analyzing inheritance strategies...', progress: 70 },
        { stage: 'generating_recommendations', message: 'Generating strategic recommendations...', progress: 90 },
        { stage: 'completed', message: 'Inheritance strategy report completed!', progress: 100 }
      ],
      comparison_analysis: [
        { stage: 'initializing', message: 'Initializing property comparison...', progress: 5 },
        { stage: 'processing_properties', message: 'Processing property data...', progress: 25 },
        { stage: 'calculating_metrics', message: 'Calculating comparative metrics...', progress: 50 },
        { stage: 'analyzing_differences', message: 'Analyzing investment differences...', progress: 75 },
        { stage: 'generating_comparison', message: 'Generating comparison report...', progress: 95 },
        { stage: 'completed', message: 'Comparison analysis completed!', progress: 100 }
      ],
      custom: [
        { stage: 'initializing', message: 'Initializing custom analysis...', progress: 10 },
        { stage: 'processing_requirements', message: 'Processing custom requirements...', progress: 30 },
        { stage: 'analyzing_data', message: 'Analyzing provided data...', progress: 60 },
        { stage: 'generating_report', message: 'Generating custom report...', progress: 90 },
        { stage: 'completed', message: 'Custom report completed!', progress: 100 }
      ]
    };
  }

  /**
   * Start progress tracking for a request
   * @param {string} requestId - Unique request identifier
   * @param {string} reportType - Type of report being generated
   * @param {number} customTimeout - Custom timeout in milliseconds
   * @returns {Object} Progress tracker object
   */
  startProgress(requestId, reportType = 'custom', customTimeout = null) {
    const timeout = customTimeout || this.defaultTimeout;
    const stages = this.progressStages[reportType] || this.progressStages.custom;
    
    const tracker = {
      requestId,
      reportType,
      startTime: Date.now(),
      timeout,
      currentStage: 0,
      stages,
      progress: 0,
      message: stages[0].message,
      status: 'running',
      cancelled: false,
      timeoutWarning: false,
      callbacks: {
        onProgress: [],
        onTimeout: [],
        onCancel: [],
        onComplete: []
      }
    };

    // Set up timeout handler
    tracker.timeoutHandler = setTimeout(() => {
      this.handleTimeout(requestId);
    }, timeout);

    // Set up timeout warning
    tracker.warningHandler = setTimeout(() => {
      this.handleTimeoutWarning(requestId);
    }, this.timeoutWarningThreshold);

    // Set up progress simulation
    tracker.progressInterval = setInterval(() => {
      this.updateProgress(requestId);
    }, this.progressUpdateInterval);

    this.activeRequests.set(requestId, tracker);
    
    console.log(`[PROGRESS] Started tracking for ${requestId} (${reportType}), timeout: ${timeout}ms`);
    
    return tracker;
  }

  /**
   * Update progress to a specific stage
   * @param {string} requestId - Request identifier
   * @param {string} stageName - Name of the stage to advance to
   * @param {string} customMessage - Custom progress message
   */
  advanceToStage(requestId, stageName, customMessage = null) {
    const tracker = this.activeRequests.get(requestId);
    if (!tracker || tracker.cancelled) return;

    const stageIndex = tracker.stages.findIndex(stage => stage.stage === stageName);
    if (stageIndex === -1) return;

    tracker.currentStage = stageIndex;
    tracker.progress = tracker.stages[stageIndex].progress;
    tracker.message = customMessage || tracker.stages[stageIndex].message;

    console.log(`[PROGRESS] ${requestId} advanced to stage: ${stageName} (${tracker.progress}%)`);
    
    this.notifyProgressCallbacks(requestId, tracker);
  }

  /**
   * Simulate progress updates for long-running operations
   * @param {string} requestId - Request identifier
   */
  updateProgress(requestId) {
    const tracker = this.activeRequests.get(requestId);
    if (!tracker || tracker.cancelled || tracker.status === 'completed') return;

    const elapsed = Date.now() - tracker.startTime;
    const timeoutRatio = elapsed / tracker.timeout;
    
    // Simulate gradual progress based on time elapsed
    if (tracker.currentStage < tracker.stages.length - 1) {
      const currentStageProgress = tracker.stages[tracker.currentStage].progress;
      const nextStageProgress = tracker.stages[tracker.currentStage + 1].progress;
      
      // Calculate progress within current stage based on time
      const stageTimeRatio = Math.min(timeoutRatio * tracker.stages.length, 1);
      const progressInStage = (nextStageProgress - currentStageProgress) * stageTimeRatio;
      
      tracker.progress = Math.min(currentStageProgress + progressInStage, nextStageProgress - 1);
      
      // Auto-advance to next stage at certain intervals
      const stageInterval = tracker.timeout / (tracker.stages.length - 1);
      if (elapsed > (tracker.currentStage + 1) * stageInterval && tracker.currentStage < tracker.stages.length - 2) {
        this.advanceToStage(requestId, tracker.stages[tracker.currentStage + 1].stage);
      }
    }

    this.notifyProgressCallbacks(requestId, tracker);
  }

  /**
   * Handle timeout warning (45 seconds)
   * @param {string} requestId - Request identifier
   */
  handleTimeoutWarning(requestId) {
    const tracker = this.activeRequests.get(requestId);
    if (!tracker || tracker.cancelled) return;

    tracker.timeoutWarning = true;
    tracker.message = 'Report generation is taking longer than expected...';
    
    console.log(`[PROGRESS] Timeout warning for ${requestId}`);
    
    this.notifyProgressCallbacks(requestId, tracker);
  }

  /**
   * Handle request timeout (60 seconds)
   * @param {string} requestId - Request identifier
   */
  handleTimeout(requestId) {
    const tracker = this.activeRequests.get(requestId);
    if (!tracker || tracker.cancelled) return;

    tracker.status = 'timeout';
    tracker.message = 'Request timed out after 60 seconds';
    
    console.log(`[PROGRESS] Request ${requestId} timed out`);
    
    this.notifyTimeoutCallbacks(requestId, tracker);
    this.cleanup(requestId);
  }

  /**
   * Cancel a running request
   * @param {string} requestId - Request identifier
   * @param {string} reason - Cancellation reason
   */
  cancelRequest(requestId, reason = 'User cancelled') {
    const tracker = this.activeRequests.get(requestId);
    if (!tracker) return false;

    tracker.cancelled = true;
    tracker.status = 'cancelled';
    tracker.message = reason;
    
    console.log(`[PROGRESS] Request ${requestId} cancelled: ${reason}`);
    
    this.notifyCancelCallbacks(requestId, tracker);
    this.cleanup(requestId);
    
    return true;
  }

  /**
   * Complete a request successfully
   * @param {string} requestId - Request identifier
   * @param {Object} result - Request result
   */
  completeRequest(requestId, result = null) {
    const tracker = this.activeRequests.get(requestId);
    if (!tracker || tracker.cancelled) return;

    tracker.status = 'completed';
    tracker.progress = 100;
    tracker.message = tracker.stages[tracker.stages.length - 1].message;
    tracker.result = result;
    
    console.log(`[PROGRESS] Request ${requestId} completed successfully`);
    
    this.notifyCompleteCallbacks(requestId, tracker);
    this.cleanup(requestId);
  }

  /**
   * Add progress callback
   * @param {string} requestId - Request identifier
   * @param {Function} callback - Progress callback function
   */
  onProgress(requestId, callback) {
    const tracker = this.activeRequests.get(requestId);
    if (tracker && typeof callback === 'function') {
      tracker.callbacks.onProgress.push(callback);
    }
  }

  /**
   * Add timeout callback
   * @param {string} requestId - Request identifier
   * @param {Function} callback - Timeout callback function
   */
  onTimeout(requestId, callback) {
    const tracker = this.activeRequests.get(requestId);
    if (tracker && typeof callback === 'function') {
      tracker.callbacks.onTimeout.push(callback);
    }
  }

  /**
   * Add cancel callback
   * @param {string} requestId - Request identifier
   * @param {Function} callback - Cancel callback function
   */
  onCancel(requestId, callback) {
    const tracker = this.activeRequests.get(requestId);
    if (tracker && typeof callback === 'function') {
      tracker.callbacks.onCancel.push(callback);
    }
  }

  /**
   * Add completion callback
   * @param {string} requestId - Request identifier
   * @param {Function} callback - Completion callback function
   */
  onComplete(requestId, callback) {
    const tracker = this.activeRequests.get(requestId);
    if (tracker && typeof callback === 'function') {
      tracker.callbacks.onComplete.push(callback);
    }
  }

  /**
   * Get current progress for a request
   * @param {string} requestId - Request identifier
   * @returns {Object|null} Current progress information
   */
  getProgress(requestId) {
    const tracker = this.activeRequests.get(requestId);
    if (!tracker) return null;

    return {
      requestId: tracker.requestId,
      reportType: tracker.reportType,
      progress: Math.round(tracker.progress),
      message: tracker.message,
      status: tracker.status,
      elapsed: Date.now() - tracker.startTime,
      timeoutWarning: tracker.timeoutWarning,
      stage: tracker.stages[tracker.currentStage]?.stage || 'unknown'
    };
  }

  /**
   * Get all active requests
   * @returns {Array} Array of active request information
   */
  getActiveRequests() {
    const active = [];
    for (const [requestId, tracker] of this.activeRequests.entries()) {
      active.push(this.getProgress(requestId));
    }
    return active;
  }

  /**
   * Create timeout-aware fetch wrapper
   * @param {string} url - Request URL
   * @param {Object} options - Fetch options
   * @param {string} requestId - Request identifier for progress tracking
   * @returns {Promise} Fetch promise with timeout and progress
   */
  async fetchWithTimeout(url, options = {}, requestId = null) {
    const timeout = options.timeout || this.defaultTimeout;
    const controller = new AbortController();
    
    // Set up timeout
    const timeoutId = setTimeout(() => {
      controller.abort();
      if (requestId) {
        this.handleTimeout(requestId);
      }
    }, timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response;

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        const timeoutError = new Error(`Request timed out after ${timeout}ms`);
        timeoutError.isTimeout = true;
        throw timeoutError;
      }
      
      throw error;
    }
  }

  /**
   * Create a timeout-aware Promise wrapper
   * @param {Promise} promise - Promise to wrap
   * @param {number} timeout - Timeout in milliseconds
   * @param {string} requestId - Request identifier
   * @returns {Promise} Promise with timeout handling
   */
  async promiseWithTimeout(promise, timeout = this.defaultTimeout, requestId = null) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        if (requestId) {
          this.handleTimeout(requestId);
        }
        reject(new Error(`Operation timed out after ${timeout}ms`));
      }, timeout);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } catch (error) {
      if (requestId) {
        this.cancelRequest(requestId, `Error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Notify progress callbacks
   * @param {string} requestId - Request identifier
   * @param {Object} tracker - Progress tracker
   */
  notifyProgressCallbacks(requestId, tracker) {
    const progressInfo = this.getProgress(requestId);
    tracker.callbacks.onProgress.forEach(callback => {
      try {
        callback(progressInfo);
      } catch (error) {
        console.error(`[PROGRESS] Error in progress callback for ${requestId}:`, error);
      }
    });
  }

  /**
   * Notify timeout callbacks
   * @param {string} requestId - Request identifier
   * @param {Object} tracker - Progress tracker
   */
  notifyTimeoutCallbacks(requestId, tracker) {
    const progressInfo = this.getProgress(requestId);
    tracker.callbacks.onTimeout.forEach(callback => {
      try {
        callback(progressInfo);
      } catch (error) {
        console.error(`[PROGRESS] Error in timeout callback for ${requestId}:`, error);
      }
    });
  }

  /**
   * Notify cancel callbacks
   * @param {string} requestId - Request identifier
   * @param {Object} tracker - Progress tracker
   */
  notifyCancelCallbacks(requestId, tracker) {
    const progressInfo = this.getProgress(requestId);
    tracker.callbacks.onCancel.forEach(callback => {
      try {
        callback(progressInfo);
      } catch (error) {
        console.error(`[PROGRESS] Error in cancel callback for ${requestId}:`, error);
      }
    });
  }

  /**
   * Notify completion callbacks
   * @param {string} requestId - Request identifier
   * @param {Object} tracker - Progress tracker
   */
  notifyCompleteCallbacks(requestId, tracker) {
    const progressInfo = this.getProgress(requestId);
    tracker.callbacks.onComplete.forEach(callback => {
      try {
        callback(progressInfo, tracker.result);
      } catch (error) {
        console.error(`[PROGRESS] Error in completion callback for ${requestId}:`, error);
      }
    });
  }

  /**
   * Clean up request tracking
   * @param {string} requestId - Request identifier
   */
  cleanup(requestId) {
    const tracker = this.activeRequests.get(requestId);
    if (!tracker) return;

    // Clear timers
    if (tracker.timeoutHandler) {
      clearTimeout(tracker.timeoutHandler);
    }
    if (tracker.warningHandler) {
      clearTimeout(tracker.warningHandler);
    }
    if (tracker.progressInterval) {
      clearInterval(tracker.progressInterval);
    }

    // Remove from active requests
    this.activeRequests.delete(requestId);
    
    console.log(`[PROGRESS] Cleaned up tracking for ${requestId}`);
  }

  /**
   * Get statistics about request handling
   * @returns {Object} Statistics object
   */
  getStatistics() {
    const active = this.activeRequests.size;
    const requestTypes = {};
    const statusCounts = {};
    
    for (const tracker of this.activeRequests.values()) {
      requestTypes[tracker.reportType] = (requestTypes[tracker.reportType] || 0) + 1;
      statusCounts[tracker.status] = (statusCounts[tracker.status] || 0) + 1;
    }

    return {
      activeRequests: active,
      requestsByType: requestTypes,
      requestsByStatus: statusCounts,
      defaultTimeout: this.defaultTimeout,
      warningThreshold: this.timeoutWarningThreshold
    };
  }

  /**
   * Set default timeout for all requests
   * @param {number} timeout - Timeout in milliseconds
   */
  setDefaultTimeout(timeout) {
    if (timeout > 0) {
      this.defaultTimeout = timeout;
      console.log(`[PROGRESS] Default timeout set to ${timeout}ms`);
    }
  }

  /**
   * Clean up all active requests (for shutdown)
   */
  shutdown() {
    console.log(`[PROGRESS] Shutting down, cleaning up ${this.activeRequests.size} active requests`);
    
    for (const requestId of this.activeRequests.keys()) {
      this.cancelRequest(requestId, 'System shutdown');
    }
  }
}

// Export singleton instance
const progressTimeoutManager = new ProgressTimeoutManager();
export default progressTimeoutManager;
export { ProgressTimeoutManager };