/**
 * Enhanced Error Handler with Progress Indicators and User Notifications
 * Provides comprehensive error handling, progress tracking, and user feedback
 */

class EnhancedErrorHandler {
  constructor() {
    this.notifications = new Map();
    this.progressTrackers = new Map();
    this.notificationContainer = null;
    this.init();
  }

  /**
   * Initialize the error handler and create notification container
   */
  init() {
    this.createNotificationContainer();
    this.setupGlobalErrorHandlers();
  }

  /**
   * Create notification container for displaying messages
   */
  createNotificationContainer() {
    if (document.getElementById('notification-container')) {
      this.notificationContainer = document.getElementById('notification-container');
      return;
    }

    this.notificationContainer = document.createElement('div');
    this.notificationContainer.id = 'notification-container';
    this.notificationContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      max-width: 400px;
      pointer-events: none;
    `;
    document.body.appendChild(this.notificationContainer);
  }

  /**
   * Setup global error handlers
   */
  setupGlobalErrorHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.showNotification(
        'An unexpected error occurred. Please refresh the page if problems persist.',
        'error',
        5000
      );
    });

    // Handle JavaScript errors
    window.addEventListener('error', (event) => {
      console.error('JavaScript error:', event.error);
      this.showNotification(
        'A technical error occurred. Please refresh the page.',
        'error',
        5000
      );
    });
  }

  /**
   * Show enhanced notification with detailed error information
   * @param {string} message - Main message to display
   * @param {string} type - Notification type (success, warning, error, info)
   * @param {number} duration - Duration in milliseconds (0 for persistent)
   * @param {object} options - Additional options
   */
  showNotification(message, type = 'info', duration = 5000, options = {}) {
    const notification = this.createNotificationElement(message, type, options);
    const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    notification.id = notificationId;
    this.notifications.set(notificationId, notification);
    
    this.notificationContainer.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
      notification.style.opacity = '1';
    }, 10);

    // Auto-remove after duration (if not persistent)
    if (duration > 0) {
      setTimeout(() => {
        this.removeNotification(notificationId);
      }, duration);
    }

    return notificationId;
  }

  /**
   * Create notification element with enhanced styling and actions
   * @param {string} message - Message text
   * @param {string} type - Notification type
   * @param {object} options - Additional options
   * @returns {HTMLElement} Notification element
   */
  createNotificationElement(message, type, options = {}) {
    const notification = document.createElement('div');
    
    const colors = {
      success: { bg: '#10b981', border: '#059669', icon: '✓' },
      warning: { bg: '#f59e0b', border: '#d97706', icon: '⚠' },
      error: { bg: '#ef4444', border: '#dc2626', icon: '✕' },
      info: { bg: '#3b82f6', border: '#2563eb', icon: 'ℹ' }
    };

    const color = colors[type] || colors.info;
    
    notification.style.cssText = `
      background: ${color.bg};
      border-left: 4px solid ${color.border};
      color: white;
      padding: 16px;
      margin-bottom: 12px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transform: translateX(100%);
      opacity: 0;
      transition: all 0.3s ease;
      pointer-events: auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      position: relative;
      overflow: hidden;
    `;

    let content = `
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <div style="font-size: 18px; font-weight: bold; margin-top: 1px;">
          ${color.icon}
        </div>
        <div style="flex: 1;">
          <div style="font-weight: 600; margin-bottom: 4px;">
            ${message}
          </div>
    `;

    // Add user actions if provided
    if (options.userActions && options.userActions.length > 0) {
      content += `
        <div style="margin-top: 8px; font-size: 13px; opacity: 0.9;">
          <strong>Suggested actions:</strong>
          <ul style="margin: 4px 0 0 16px; padding: 0;">
            ${options.userActions.map(action => `<li style="margin-bottom: 2px;">${action}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    // Add retry button if retryable
    if (options.shouldRetry && options.retryCallback) {
      content += `
        <div style="margin-top: 12px;">
          <button 
            onclick="window.enhancedErrorHandler.handleRetry('${notification.id}', ${JSON.stringify(options.retryCallback).replace(/"/g, '&quot;')})"
            style="
              background: rgba(255, 255, 255, 0.2);
              border: 1px solid rgba(255, 255, 255, 0.3);
              color: white;
              padding: 6px 12px;
              border-radius: 4px;
              font-size: 12px;
              cursor: pointer;
              transition: background 0.2s;
            "
            onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'"
            onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'"
          >
            ${options.retryAfter ? `Retry in ${options.retryAfter}s` : 'Retry'}
          </button>
        </div>
      `;
    }

    // Add error ID if provided
    if (options.errorId) {
      content += `
        <div style="margin-top: 8px; font-size: 11px; opacity: 0.7; font-family: monospace;">
          Error ID: ${options.errorId}
        </div>
      `;
    }

    content += `
        </div>
        <button 
          onclick="window.enhancedErrorHandler.removeNotification('${notification.id}')"
          style="
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0.7;
            transition: opacity 0.2s;
          "
          onmouseover="this.style.opacity='1'"
          onmouseout="this.style.opacity='0.7'"
        >
          ×
        </button>
      </div>
    `;

    notification.innerHTML = content;
    return notification;
  }

  /**
   * Remove notification by ID
   * @param {string} notificationId - Notification ID to remove
   */
  removeNotification(notificationId) {
    const notification = this.notifications.get(notificationId);
    if (!notification) return;

    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      this.notifications.delete(notificationId);
    }, 300);
  }

  /**
   * Show progress indicator for long-running operations
   * @param {string} message - Progress message
   * @param {object} options - Progress options
   * @returns {string} Progress tracker ID
   */
  showProgress(message, options = {}) {
    const progressId = `progress_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    const progressElement = document.createElement('div');
    progressElement.id = progressId;
    progressElement.style.cssText = `
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin: 16px 0;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    `;

    let progressContent = `
      <div style="display: flex; align-items: center; gap: 16px;">
        <div class="progress-spinner" style="
          width: 24px;
          height: 24px;
          border: 3px solid #e2e8f0;
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        "></div>
        <div style="flex: 1;">
          <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">
            ${message}
          </div>
    `;

    if (options.steps && options.steps.length > 0) {
      progressContent += `
        <div style="margin-top: 12px;">
          ${options.steps.map((step, index) => `
            <div style="
              display: flex;
              align-items: center;
              gap: 8px;
              margin-bottom: 6px;
              font-size: 14px;
              color: #6b7280;
            ">
              <div style="
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: ${index === 0 ? '#3b82f6' : '#e5e7eb'};
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                color: white;
                font-weight: bold;
              ">
                ${index + 1}
              </div>
              <span>${step}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (options.estimatedTime) {
      progressContent += `
        <div style="margin-top: 8px; font-size: 13px; color: #6b7280;">
          Estimated time: ${options.estimatedTime}
        </div>
      `;
    }

    progressContent += `
        </div>
      </div>
    `;

    progressElement.innerHTML = progressContent;

    // Add CSS animation for spinner
    if (!document.getElementById('progress-spinner-styles')) {
      const style = document.createElement('style');
      style.id = 'progress-spinner-styles';
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }

    this.progressTrackers.set(progressId, {
      element: progressElement,
      startTime: Date.now(),
      options: options
    });

    return progressId;
  }

  /**
   * Update progress message and step
   * @param {string} progressId - Progress tracker ID
   * @param {string} message - New message
   * @param {number} currentStep - Current step index (0-based)
   */
  updateProgress(progressId, message, currentStep = null) {
    const tracker = this.progressTrackers.get(progressId);
    if (!tracker) return;

    const messageElement = tracker.element.querySelector('div[style*="font-weight: 600"]');
    if (messageElement) {
      messageElement.textContent = message;
    }

    if (currentStep !== null && tracker.options.steps) {
      const stepElements = tracker.element.querySelectorAll('div[style*="border-radius: 50%"]');
      stepElements.forEach((element, index) => {
        if (index <= currentStep) {
          element.style.background = '#10b981'; // Green for completed
        } else if (index === currentStep + 1) {
          element.style.background = '#3b82f6'; // Blue for current
        } else {
          element.style.background = '#e5e7eb'; // Gray for pending
        }
      });
    }
  }

  /**
   * Hide progress indicator
   * @param {string} progressId - Progress tracker ID
   */
  hideProgress(progressId) {
    const tracker = this.progressTrackers.get(progressId);
    if (!tracker) return;

    if (tracker.element.parentNode) {
      tracker.element.style.opacity = '0';
      tracker.element.style.transform = 'translateY(-10px)';
      
      setTimeout(() => {
        if (tracker.element.parentNode) {
          tracker.element.parentNode.removeChild(tracker.element);
        }
        this.progressTrackers.delete(progressId);
      }, 300);
    }
  }

  /**
   * Handle enhanced API errors with detailed user feedback
   * @param {object} error - Error object
   * @param {string} context - Error context
   * @param {boolean} showNotification - Whether to show notification
   * @returns {object} Processed error information
   */
  handleEnhancedError(error, context, showNotification = true) {
    console.error(`Enhanced error in ${context}:`, error);

    let errorInfo = {
      message: 'An unexpected error occurred',
      type: 'error',
      shouldRetry: false,
      userActions: [],
      technicalDetails: error.message || 'Unknown error'
    };

    // Process API error responses
    if (error.error && typeof error.error === 'object') {
      errorInfo = {
        message: error.error.message || errorInfo.message,
        type: this.mapSeverityToType(error.error.severity),
        shouldRetry: error.error.shouldRetry || false,
        retryAfter: error.error.retryAfter,
        userActions: error.error.userActions || [],
        technicalDetails: error.error.technicalDetails,
        errorId: error.error.errorId
      };
    }
    // Process standard errors
    else if (error.message) {
      errorInfo.message = this.getUserFriendlyMessage(error, context);
      errorInfo.shouldRetry = this.isRetryableError(error);
    }

    if (showNotification) {
      this.showNotification(errorInfo.message, errorInfo.type, 0, {
        userActions: errorInfo.userActions,
        shouldRetry: errorInfo.shouldRetry,
        retryAfter: errorInfo.retryAfter,
        errorId: errorInfo.errorId,
        retryCallback: errorInfo.shouldRetry ? { context, originalError: error } : null
      });
    }

    return errorInfo;
  }

  /**
   * Map error severity to notification type
   * @param {string} severity - Error severity
   * @returns {string} Notification type
   */
  mapSeverityToType(severity) {
    const mapping = {
      'critical': 'error',
      'error': 'error',
      'warning': 'warning',
      'info': 'info'
    };
    return mapping[severity] || 'error';
  }

  /**
   * Get user-friendly error message
   * @param {object} error - Error object
   * @param {string} context - Error context
   * @returns {string} User-friendly message
   */
  getUserFriendlyMessage(error, context) {
    const contextMessages = {
      'authentication': 'Authentication failed. Please log in again.',
      'investment-report-generation': 'Failed to generate investment report. Please check your input and try again.',
      'report-save': 'Failed to save report. Please try again.',
      'load-reports': 'Failed to load report history. Please refresh the page.',
      'network': 'Network connection error. Please check your internet connection.',
      'timeout': 'Request timed out. Please try again.'
    };

    return contextMessages[context] || error.message || 'An unexpected error occurred';
  }

  /**
   * Check if error is retryable
   * @param {object} error - Error object
   * @returns {boolean} True if retryable
   */
  isRetryableError(error) {
    const retryableErrors = [
      'NetworkError',
      'TimeoutError',
      'ServiceUnavailable',
      'RateLimitError',
      'ConnectionError'
    ];

    return retryableErrors.some(type => 
      error.name === type || 
      error.code === type || 
      error.message.includes(type.toLowerCase())
    );
  }

  /**
   * Handle retry action from notification
   * @param {string} notificationId - Notification ID
   * @param {object} retryInfo - Retry information
   */
  handleRetry(notificationId, retryInfo) {
    this.removeNotification(notificationId);
    
    // Emit custom event for retry handling
    const retryEvent = new CustomEvent('errorHandlerRetry', {
      detail: retryInfo
    });
    window.dispatchEvent(retryEvent);
  }

  /**
   * Show loading state on button
   * @param {HTMLElement} button - Button element
   * @param {string} text - Loading text
   */
  showLoading(button, text = 'Loading...') {
    if (!button) return;
    
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.dataset.originalHtml = button.innerHTML;
    
    button.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; justify-content: center;">
        <div style="
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        "></div>
        <span>${text}</span>
      </div>
    `;
  }

  /**
   * Hide loading state on button
   * @param {HTMLElement} button - Button element
   */
  hideLoading(button) {
    if (!button) return;
    
    button.disabled = false;
    
    if (button.dataset.originalHtml) {
      button.innerHTML = button.dataset.originalHtml;
    } else if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
    }
  }

  /**
   * Clear all notifications
   */
  clearAllNotifications() {
    this.notifications.forEach((notification, id) => {
      this.removeNotification(id);
    });
  }

  /**
   * Clear all progress indicators
   */
  clearAllProgress() {
    this.progressTrackers.forEach((tracker, id) => {
      this.hideProgress(id);
    });
  }
}

// Create global instance
window.enhancedErrorHandler = new EnhancedErrorHandler();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EnhancedErrorHandler;
}