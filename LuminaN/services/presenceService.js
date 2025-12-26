// Presence Service - Tracks user online/offline status and activity
class PresenceService {
  constructor() {
    this.isOnline = false;
    this.currentUser = null;
    this.lastActivity = null;
    this.heartbeatInterval = null;
    this.inactivityTimeout = null;
    this.INACTIVITY_THRESHOLD = 30000; // 30 seconds
    this.HEARTBEAT_INTERVAL = 10000; // 10 seconds
  }

  // Initialize presence tracking for a user
  initialize(userData) {
    this.currentUser = userData;
    this.setOnline();
    this.setupActivityListeners();
    this.startHeartbeat();
    this.startInactivityMonitoring();
  }

  // Set user as online
  setOnline() {
    this.isOnline = true;
    this.lastActivity = new Date();
    this.logStatusChange('online');
    this.updatePresence();
  }

  // Set user as offline
  setOffline(reason = 'manual') {
    this.isOnline = false;
    this.logStatusChange('offline', reason);
    this.updatePresence();
    this.stopHeartbeat();
    this.stopInactivityMonitoring();
  }

  // Set user as inactive (minimized or inactive window)
  setInactive(reason = 'inactive') {
    if (this.isOnline) {
      this.isOnline = false;
      this.logStatusChange('inactive', reason);
      this.updatePresence();
    }
  }

  // Set user as active (window focused, app active)
  setActive() {
    if (!this.isOnline) {
      this.isOnline = true;
      this.logStatusChange('online', 'window_focused');
      this.updatePresence();
    }
    this.lastActivity = new Date();
    this.resetInactivityTimeout();
  }

  // Setup activity event listeners
  setupActivityListeners() {
    if (typeof window !== 'undefined') {
      // Window focus/blur events
      window.addEventListener('focus', this.handleWindowFocus.bind(this));
      window.addEventListener('blur', this.handleWindowBlur.bind(this));
      
      // Page visibility API for more accurate tracking
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
      
      // User activity events
      window.addEventListener('mousemove', this.handleUserActivity.bind(this));
      window.addEventListener('keydown', this.handleUserActivity.bind(this));
      window.addEventListener('click', this.handleUserActivity.bind(this));
      window.addEventListener('scroll', this.handleUserActivity.bind(this));
      
      // Before page unload
      window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    }
  }

  // Handle window focus
  handleWindowFocus() {
    console.log('Window focused - user is active');
    this.setActive();
  }

  // Handle window blur (user switched apps or minimized)
  handleWindowBlur() {
    console.log('Window blurred - user may be inactive');
    this.setInactive('window_blur');
  }

  // Handle page visibility change
  handleVisibilityChange() {
    if (document.hidden) {
      console.log('Page hidden - user minimized or switched app');
      this.setInactive('page_hidden');
    } else {
      console.log('Page visible - user returned');
      this.setActive();
    }
  }

  // Handle user activity
  handleUserActivity() {
    this.lastActivity = new Date();
    this.resetInactivityTimeout();
  }

  // Handle before page unload
  handleBeforeUnload() {
    this.setOffline('page_unload');
  }

  // Start heartbeat to keep server updated
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isOnline && this.currentUser) {
        this.sendHeartbeat();
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  // Stop heartbeat
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Send heartbeat to server
  async sendHeartbeat() {
    try {
      const response = await fetch('/api/presence/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: this.currentUser?.id,
          user_type: this.currentUser?.user_type || 'cashier',
          timestamp: new Date().toISOString(),
          is_online: this.isOnline,
          last_activity: this.lastActivity?.toISOString(),
        }),
      });
      
      if (!response.ok) {
        console.error('Heartbeat failed:', response.statusText);
      }
    } catch (error) {
      console.error('Heartbeat error:', error);
    }
  }

  // Start inactivity monitoring
  startInactivityMonitoring() {
    this.resetInactivityTimeout();
  }

  // Stop inactivity monitoring
  stopInactivityMonitoring() {
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
      this.inactivityTimeout = null;
    }
  }

  // Reset inactivity timeout
  resetInactivityTimeout() {
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
    }
    
    this.inactivityTimeout = setTimeout(() => {
      console.log('User inactive for too long');
      this.setInactive('inactivity_timeout');
    }, this.INACTIVITY_THRESHOLD);
  }

  // Log status change
  logStatusChange(status, reason = '') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      user_id: this.currentUser?.id,
      user_name: this.currentUser?.name || this.currentUser?.user_name,
      user_type: this.currentUser?.user_type || 'cashier',
      status: status,
      reason: reason,
      ip_address: this.getClientIP(),
      user_agent: navigator?.userAgent || 'Unknown',
    };

    console.log('Presence Status Change:', logEntry);
    
    // Store in localStorage for audit trail
    this.storePresenceLog(logEntry);
    
    // Send to server if available
    this.sendStatusChangeToServer(logEntry);
  }

  // Get client IP (simplified)
  getClientIP() {
    // In a real implementation, you might want to use a service like ipify
    return 'client_ip_placeholder';
  }

  // Store presence log in localStorage
  storePresenceLog(logEntry) {
    try {
      const logs = this.getPresenceLogs();
      logs.push(logEntry);
      
      // Keep only last 1000 entries
      if (logs.length > 1000) {
        logs.splice(0, logs.length - 1000);
      }
      
      localStorage.setItem('presence_logs', JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to store presence log:', error);
    }
  }

  // Get presence logs from localStorage
  getPresenceLogs() {
    try {
      const logs = localStorage.getItem('presence_logs');
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      console.error('Failed to get presence logs:', error);
      return [];
    }
  }

  // Send status change to server
  async sendStatusChangeToServer(logEntry) {
    try {
      const response = await fetch('/api/presence/status-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logEntry),
      });
      
      if (!response.ok) {
        console.error('Status change update failed:', response.statusText);
      }
    } catch (error) {
      console.error('Status change update error:', error);
    }
  }

  // Update presence status
  updatePresence() {
    // This could trigger UI updates or notifications
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('presenceStatusChanged', {
        detail: {
          isOnline: this.isOnline,
          lastActivity: this.lastActivity,
          user: this.currentUser,
        }
      }));
    }
  }

  // Get current presence status
  getPresenceStatus() {
    return {
      isOnline: this.isOnline,
      lastActivity: this.lastActivity,
      user: this.currentUser,
      status: this.isOnline ? 'online' : 'offline',
    };
  }

  // Clean up resources
  destroy() {
    this.setOffline('cleanup');
    this.stopHeartbeat();
    this.stopInactivityMonitoring();
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', this.handleWindowFocus.bind(this));
      window.removeEventListener('blur', this.handleWindowBlur.bind(this));
      document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
      window.removeEventListener('mousemove', this.handleUserActivity.bind(this));
      window.removeEventListener('keydown', this.handleUserActivity.bind(this));
      window.removeEventListener('click', this.handleUserActivity.bind(this));
      window.removeEventListener('scroll', this.handleUserActivity.bind(this));
      window.removeEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    }
  }
}

// Create singleton instance
const presenceService = new PresenceService();

export default presenceService;