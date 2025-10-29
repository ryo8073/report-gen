/**
 * User Notification Service
 * Handles user notifications for completed reports and system events
 */

class NotificationService {
  constructor() {
    this.notifications = [];
    this.subscribers = new Map();
    this.init();
  }

  /**
   * Initialize the notification service
   */
  init() {
    // Check for browser notification support
    this.browserNotificationsSupported = 'Notification' in window;
    
    // Request permission for browser notifications
    if (this.browserNotificationsSupported && Notification.permission === 'default') {
      this.requestNotificationPermission();
    }

    // Setup periodic check for completed reports
    this.setupReportCompletionCheck();
  }

  /**
   * Request permission for browser notifications
   */
  async requestNotificationPermission() {
    try {
      const permission = await Notification.requestPermission();
      console.log('Notification permission:', permission);
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Show browser notification
   * @param {string} title - Notification title
   * @param {object} options - Notification options
   */
  showBrowserNotification(title, options = {}) {
    if (!this.browserNotificationsSupported || Notification.permission !== 'granted') {
      return null;
    }

    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options
    });

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

    return notification;
  }

  /**
   * Notify user of completed report
   * @param {object} reportInfo - Report information
   */
  notifyReportCompleted(reportInfo) {
    const title = '投資分析レポートが完成しました';
    const message = `${reportInfo.reportType || '投資分析'}レポートの生成が完了しました。`;

    // Show browser notification
    this.showBrowserNotification(title, {
      body: message,
      tag: 'report-completed',
      requireInteraction: true,
      actions: [
        {
          action: 'view',
          title: 'レポートを表示'
        },
        {
          action: 'dismiss',
          title: '閉じる'
        }
      ]
    });

    // Show in-app notification
    if (window.enhancedErrorHandler) {
      window.enhancedErrorHandler.showNotification(
        title,
        'success',
        8000,
        {
          userActions: [
            message,
            'レポート履歴ページで確認できます',
            'レポートは自動的に保存されました'
          ]
        }
      );
    }

    // Store notification
    this.addNotification({
      id: `report_${reportInfo.reportId || Date.now()}`,
      type: 'report_completed',
      title: title,
      message: message,
      reportInfo: reportInfo,
      timestamp: new Date().toISOString(),
      read: false
    });

    // Notify subscribers
    this.notifySubscribers('report_completed', reportInfo);
  }

  /**
   * Notify user of report generation progress
   * @param {object} progressInfo - Progress information
   */
  notifyReportProgress(progressInfo) {
    const { stage, progress, estimatedTimeRemaining } = progressInfo;
    
    const stageMessages = {
      'validating': 'データを検証中...',
      'processing': 'AI分析を実行中...',
      'generating': 'レポートを生成中...',
      'saving': 'レポートを保存中...',
      'completed': 'レポート生成完了'
    };

    const message = stageMessages[stage] || 'レポートを処理中...';
    
    // Update progress if progress tracker exists
    if (window.enhancedErrorHandler && progressInfo.progressId) {
      let progressMessage = message;
      if (estimatedTimeRemaining) {
        progressMessage += ` (残り約${estimatedTimeRemaining}秒)`;
      }
      
      window.enhancedErrorHandler.updateProgress(
        progressInfo.progressId,
        progressMessage,
        progressInfo.currentStep
      );
    }

    // Notify subscribers
    this.notifySubscribers('report_progress', progressInfo);
  }

  /**
   * Notify user of system events
   * @param {string} eventType - Event type
   * @param {object} eventData - Event data
   */
  notifySystemEvent(eventType, eventData) {
    const eventMessages = {
      'service_maintenance': {
        title: 'システムメンテナンス',
        message: 'システムメンテナンスのため、一時的にサービスが利用できません。',
        type: 'warning'
      },
      'service_restored': {
        title: 'サービス復旧',
        message: 'システムメンテナンスが完了しました。サービスをご利用いただけます。',
        type: 'success'
      },
      'high_demand': {
        title: 'サービス混雑',
        message: '現在サービスが混雑しています。レポート生成に通常より時間がかかる場合があります。',
        type: 'warning'
      },
      'quota_warning': {
        title: '利用制限に近づいています',
        message: '今月の利用制限に近づいています。ご注意ください。',
        type: 'warning'
      }
    };

    const eventInfo = eventMessages[eventType];
    if (!eventInfo) return;

    // Show in-app notification
    if (window.enhancedErrorHandler) {
      window.enhancedErrorHandler.showNotification(
        eventInfo.title,
        eventInfo.type,
        eventType === 'service_maintenance' ? 0 : 8000, // Persistent for maintenance
        {
          userActions: eventData.userActions || [eventInfo.message]
        }
      );
    }

    // Show browser notification for important events
    if (['service_maintenance', 'service_restored'].includes(eventType)) {
      this.showBrowserNotification(eventInfo.title, {
        body: eventInfo.message,
        tag: eventType
      });
    }

    // Store notification
    this.addNotification({
      id: `system_${eventType}_${Date.now()}`,
      type: eventType,
      title: eventInfo.title,
      message: eventInfo.message,
      eventData: eventData,
      timestamp: new Date().toISOString(),
      read: false
    });

    // Notify subscribers
    this.notifySubscribers('system_event', { eventType, eventData });
  }

  /**
   * Add notification to storage
   * @param {object} notification - Notification object
   */
  addNotification(notification) {
    this.notifications.unshift(notification);
    
    // Keep only last 50 notifications
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }

    // Store in localStorage
    try {
      localStorage.setItem('user_notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Error storing notifications:', error);
    }
  }

  /**
   * Get all notifications
   * @param {boolean} unreadOnly - Return only unread notifications
   * @returns {array} Array of notifications
   */
  getNotifications(unreadOnly = false) {
    if (unreadOnly) {
      return this.notifications.filter(n => !n.read);
    }
    return this.notifications;
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   */
  markAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      
      // Update localStorage
      try {
        localStorage.setItem('user_notifications', JSON.stringify(this.notifications));
      } catch (error) {
        console.error('Error updating notifications:', error);
      }
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    
    // Update localStorage
    try {
      localStorage.setItem('user_notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Error updating notifications:', error);
    }
  }

  /**
   * Clear all notifications
   */
  clearAllNotifications() {
    this.notifications = [];
    
    // Update localStorage
    try {
      localStorage.removeItem('user_notifications');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  /**
   * Subscribe to notification events
   * @param {string} eventType - Event type to subscribe to
   * @param {function} callback - Callback function
   * @returns {string} Subscription ID
   */
  subscribe(eventType, callback) {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Map());
    }
    
    this.subscribers.get(eventType).set(subscriptionId, callback);
    return subscriptionId;
  }

  /**
   * Unsubscribe from notification events
   * @param {string} eventType - Event type
   * @param {string} subscriptionId - Subscription ID
   */
  unsubscribe(eventType, subscriptionId) {
    if (this.subscribers.has(eventType)) {
      this.subscribers.get(eventType).delete(subscriptionId);
    }
  }

  /**
   * Notify subscribers of events
   * @param {string} eventType - Event type
   * @param {object} data - Event data
   */
  notifySubscribers(eventType, data) {
    if (this.subscribers.has(eventType)) {
      this.subscribers.get(eventType).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in notification subscriber:', error);
        }
      });
    }
  }

  /**
   * Setup periodic check for completed reports
   */
  setupReportCompletionCheck() {
    // This would typically connect to a WebSocket or use Server-Sent Events
    // For now, we'll simulate with periodic polling
    setInterval(() => {
      this.checkForCompletedReports();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Check for completed reports (placeholder for real implementation)
   */
  async checkForCompletedReports() {
    try {
      // This would make an API call to check for completed reports
      // For now, this is just a placeholder
      
      // Example: Check if there are any pending reports that have completed
      const pendingReports = this.getPendingReports();
      
      for (const reportId of pendingReports) {
        const reportStatus = await this.checkReportStatus(reportId);
        
        if (reportStatus.completed) {
          this.notifyReportCompleted({
            reportId: reportId,
            reportType: reportStatus.reportType,
            completedAt: reportStatus.completedAt
          });
          
          this.removePendingReport(reportId);
        }
      }
    } catch (error) {
      console.error('Error checking for completed reports:', error);
    }
  }

  /**
   * Get pending reports from localStorage
   * @returns {array} Array of pending report IDs
   */
  getPendingReports() {
    try {
      const pending = localStorage.getItem('pending_reports');
      return pending ? JSON.parse(pending) : [];
    } catch (error) {
      console.error('Error getting pending reports:', error);
      return [];
    }
  }

  /**
   * Add report to pending list
   * @param {string} reportId - Report ID
   */
  addPendingReport(reportId) {
    try {
      const pending = this.getPendingReports();
      if (!pending.includes(reportId)) {
        pending.push(reportId);
        localStorage.setItem('pending_reports', JSON.stringify(pending));
      }
    } catch (error) {
      console.error('Error adding pending report:', error);
    }
  }

  /**
   * Remove report from pending list
   * @param {string} reportId - Report ID
   */
  removePendingReport(reportId) {
    try {
      const pending = this.getPendingReports();
      const filtered = pending.filter(id => id !== reportId);
      localStorage.setItem('pending_reports', JSON.stringify(filtered));
    } catch (error) {
      console.error('Error removing pending report:', error);
    }
  }

  /**
   * Check report status (placeholder for API call)
   * @param {string} reportId - Report ID
   * @returns {object} Report status
   */
  async checkReportStatus(reportId) {
    // This would make an actual API call
    // For now, return a placeholder
    return {
      completed: false,
      reportType: 'investment_analysis',
      completedAt: new Date().toISOString()
    };
  }

  /**
   * Load notifications from localStorage
   */
  loadStoredNotifications() {
    try {
      const stored = localStorage.getItem('user_notifications');
      if (stored) {
        this.notifications = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading stored notifications:', error);
      this.notifications = [];
    }
  }
}

// Create global instance
window.notificationService = new NotificationService();

// Load stored notifications
window.notificationService.loadStoredNotifications();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotificationService;
}