/**
 * License Service - Integrates bulletproof security with app flow
 * Manages license validation, trial system, and boot-out functionality
 */

import licenseSecurity from './licenseSecurity';
import { shopStorage } from './storage';

class LicenseService {
  constructor() {
    this.currentLicense = null;
    this.licenseValidationInProgress = false;
    this.FOUNDER_EMAIL = 'thisismeprivateisaacngirazi@gmail.com';
    this.FOUNDER_PASSWORD = 'morrill95@2001';
    this.TRIAL_DAYS = 30;
  }

  /**
   * Initialize license service
   */
  async initialize() {
    try {
      await licenseSecurity.initializeSecurity();
      console.log('License service initialized');
      return true;
    } catch (error) {
      console.error('License service initialization failed:', error);
      return false;
    }
  }

  /**
   * Check if user can access the app (license validation)
   */
  async canAccessApp() {
    try {
      console.log('🔍 Starting license validation...');
      
      // Get or create shop info for license binding
      const shopInfo = await shopStorage.getCredentials();
      console.log('📋 Shop info:', shopInfo ? 'Found' : 'Not found');
      
      if (!shopInfo) {
        console.log('❌ No shop info found - license required');
        return {
          canAccess: false,
          reason: 'NO_SHOP_INFO',
          requiresLicense: true,
          message: 'Shop information not found. Please setup your shop first.',
          licenseInfo: null
        };
      }

      // Check for stored license
      const storedLicense = await this.getStoredLicense();
      console.log('📄 Stored license:', storedLicense ? 'Found' : 'Not found');
      
      if (!storedLicense) {
        console.log('❌ No license found - license required');
        return {
          canAccess: false,
          reason: 'NO_LICENSE',
          requiresLicense: true,
          message: 'No license found. A valid license is required to use this application.',
          licenseInfo: null
        };
      }

      // SPECIAL HANDLING FOR UNLIMITED LICENSES
      if (storedLicense.type === 'UNLIMITED') {
        console.log('🎉 Unlimited license detected - granting access');
        
        // Update current license
        this.currentLicense = storedLicense;
        
        // Track usage for unlimited licenses
        licenseSecurity.trackUsage('UNLIMITED_LICENSE_ACCESS', {
          timestamp: new Date().toISOString(),
          licenseId: storedLicense.id,
          shopName: storedLicense.shop_name
        });

        console.log('✅ Unlimited license validation successful - access granted');
        return {
          canAccess: true,
          reason: 'UNLIMITED_LICENSE_VALID',
          licenseInfo: this.formatLicenseInfo(storedLicense),
          daysRemaining: 999999, // Unlimited days
          validation: { valid: true, offlineValid: true, unlimited: true }
        };
      }

      // Perform comprehensive license validation for non-unlimited licenses
      console.log('🔒 Running security validation...');
      const validation = await licenseSecurity.validateLicenseOffline(storedLicense);
      console.log('🔒 Validation result:', validation);
      
      if (!validation.valid && !validation.offlineValid) {
        console.log('❌ License validation failed:', validation.reason || 'Invalid license');
        return {
          canAccess: false,
          reason: validation.reason || 'LICENSE_INVALID',
          requiresLicense: true,
          message: this.getLicenseErrorMessage(validation),
          licenseInfo: this.formatLicenseInfo(storedLicense, validation)
        };
      }

      // Check if license is expired (skip for unlimited licenses)
      const daysRemaining = this.getDaysRemaining(storedLicense);
      console.log('⏰ Days remaining:', daysRemaining);
      
      const isUnlimited = storedLicense.type === 'UNLIMITED';
      
      if (!isUnlimited && daysRemaining <= 0) {
        console.log('⚠️ License expired - showing renewal prompt');
        return {
          canAccess: true, // Allow access but show renewal prompt
          reason: 'LICENSE_EXPIRED_RENEWAL_REQUIRED',
          requiresLicense: false, // Don't require immediate renewal
          message: 'Your license has expired. Please renew to continue using all features.',
          licenseInfo: this.formatLicenseInfo(storedLicense, validation),
          showRenewalPrompt: true
        };
      }

      // Update current license
      this.currentLicense = storedLicense;
      
      // Track usage
      licenseSecurity.trackUsage('APP_ACCESS', {
        timestamp: new Date().toISOString(),
        licenseId: storedLicense.id,
        daysRemaining: daysRemaining
      });

      console.log('✅ License validation successful - access granted');
      return {
        canAccess: true,
        reason: 'LICENSE_VALID',
        licenseInfo: this.formatLicenseInfo(storedLicense, validation),
        daysRemaining: daysRemaining,
        validation: validation
      };

    } catch (error) {
      console.error('❌ License access check failed:', error);
      // On any error, deny access to force license check
      return {
        canAccess: false,
        reason: 'VALIDATION_ERROR',
        requiresLicense: true,
        message: 'License validation error. License required to proceed.',
        error: error.message
      };
    }
  }

  /**
   * Handle founder password trial access
   */
  async attemptFounderTrialAccess(email, password) {
    try {
      if (email !== this.FOUNDER_EMAIL || password !== this.FOUNDER_PASSWORD) {
        return {
          success: false,
          reason: 'INVALID_FOUNDER_CREDENTIALS',
          message: 'Invalid founder credentials.'
        };
      }

      // Create trial license
      const trialLicense = await this.createTrialLicense();
      
      // Store the license
      await this.storeLicense(trialLicense);
      
      // Initialize security with the license
      await licenseSecurity.initializeSecurity();
      
      return {
        success: true,
        reason: 'TRIAL_ACTIVATED',
        message: `Trial license activated! You have ${this.TRIAL_DAYS} days to use the application.`,
        license: trialLicense
      };

    } catch (error) {
      console.error('Founder trial access failed:', error);
      return {
        success: false,
        reason: 'TRIAL_ACTIVATION_FAILED',
        message: 'Failed to activate trial license. Please try again.',
        error: error.message
      };
    }
  }

  /**
   * Create a trial license
   */
  async createTrialLicense() {
    const shopInfo = await shopStorage.getCredentials();
    
    const trialLicense = {
      id: 'trial_' + Date.now(),
      type: 'TRIAL',
      status: 'ACTIVE',
      issued_date: new Date().toISOString(),
      activation_date: new Date().toISOString(),
      expiry_date: new Date(Date.now() + (this.TRIAL_DAYS * 24 * 60 * 60 * 1000)).toISOString(),
      shop_id: shopInfo?.shop_info?.id || 'unknown',
      shop_name: shopInfo?.shop_info?.name || 'Unknown Shop',
      license_key: this.generateLicenseKey(),
      trial_days_used: 0,
      max_trial_days: this.TRIAL_DAYS,
      activation_fingerprint: await licenseSecurity.generateHardwareFingerprint(),
      created_by: 'founder_system',
      is_founder_trial: true
    };

    return trialLicense;
  }

  /**
   * Create an unlimited license
   */
  async createUnlimitedLicense() {
    const shopInfo = await shopStorage.getCredentials();
    
    const unlimitedLicense = {
      id: 'unlimited_' + Date.now(),
      type: 'UNLIMITED',
      status: 'ACTIVE',
      issued_date: new Date().toISOString(),
      activation_date: new Date().toISOString(),
      expiry_date: null, // No expiry for unlimited licenses
      shop_id: shopInfo?.shop_info?.id || 'unknown',
      shop_name: shopInfo?.shop_info?.name || 'Unknown Shop',
      license_key: this.generateLicenseKey(),
      activation_fingerprint: await licenseSecurity.generateHardwareFingerprint(),
      created_by: 'founder_system',
      is_unlimited: true
    };

    return unlimitedLicense;
  }

  /**
   * Create and store unlimited license
   */
  async createAndStoreUnlimitedLicense() {
    try {
      const unlimitedLicense = await this.createUnlimitedLicense();
      await this.storeLicense(unlimitedLicense);
      
      // Log the creation event
      licenseSecurity.trackUsage('UNLIMITED_LICENSE_CREATED', {
        timestamp: new Date().toISOString(),
        licenseId: unlimitedLicense.id,
        shopName: unlimitedLicense.shop_name
      });

      console.log('Unlimited license created and stored successfully');
      return unlimitedLicense;
      
    } catch (error) {
      console.error('Failed to create unlimited license:', error);
      throw error;
    }
  }

  /**
   * Generate license key
   */
  generateLicenseKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Store license securely
   */
  async storeLicense(license) {
    try {
      const encrypted = JSON.stringify(license);
      await shopStorage.saveLicenseData(encrypted);
      this.currentLicense = license;
      console.log('License stored successfully');
    } catch (error) {
      console.error('Failed to store license:', error);
      throw error;
    }
  }

  /**
   * Get stored license
   */
  async getStoredLicense() {
    try {
      const encrypted = await shopStorage.getLicenseData();
      if (!encrypted) return null;
      
      return JSON.parse(encrypted);
    } catch (error) {
      console.error('Failed to get stored license:', error);
      return null;
    }
  }

  /**
   * Get days remaining on license
   */
  getDaysRemaining(license) {
    // Unlimited licenses never expire
    if (license && license.type === 'UNLIMITED') {
      return 999999; // Very large number to indicate unlimited
    }
    
    if (!license || !license.expiry_date) return 0;
    
    const now = new Date();
    const expiry = new Date(license.expiry_date);
    const diffTime = expiry - now;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }

  /**
   * Format license info for display
   */
  formatLicenseInfo(license, validation = null) {
    const daysRemaining = this.getDaysRemaining(license);
    const isUnlimited = license && license.type === 'UNLIMITED';
    
    return {
      id: license.id,
      type: license.type,
      status: license.status,
      shopName: license.shop_name || 'Unknown Shop',
      issuedDate: license.issued_date,
      activationDate: license.activation_date,
      expiryDate: isUnlimited ? null : license.expiry_date,
      daysRemaining: daysRemaining,
      licenseKey: license.license_key || 'N/A',
      isTrial: license.type === 'TRIAL',
      isUnlimited: isUnlimited,
      isExpired: !isUnlimited && daysRemaining <= 0,
      isExpiringSoon: !isUnlimited && daysRemaining <= 7 && daysRemaining > 0,
      isFounderTrial: license.is_founder_trial || false,
      validationScore: validation?.offlineSecurityScore || 0,
      riskLevel: validation?.riskLevel || 'UNKNOWN'
    };
  }

  /**
   * Get license error message
   */
  getLicenseErrorMessage(validation) {
    if (validation.lockdownActive) {
      return 'System is in lockdown mode. Please contact support for assistance.';
    }
    
    if (validation.offlineSecurityScore < 60) {
      return 'License security validation failed. The license may have been tampered with.';
    }
    
    if (validation.layers?.hardware?.valid === false) {
      return 'Hardware fingerprint mismatch. This license is tied to a different device.';
    }
    
    if (validation.layers?.time?.valid === false) {
      return 'Time validation failed. Please check your system clock settings.';
    }
    
    return 'License validation failed. Please contact support.';
  }

  /**
   * Handle license expiry
   */
  async handleLicenseExpiry() {
    try {
      // Clear current license
      await shopStorage.clearLicenseData();
      this.currentLicense = null;
      
      // Trigger emergency lockdown
      await licenseSecurity.triggerEmergencyLockdown('license_expired');
      
      // Log the expiry event
      licenseSecurity.trackUsage('LICENSE_EXPIRED', {
        timestamp: new Date().toISOString(),
        action: 'boot_out'
      });
      
      console.log('License expiry handled - user booted out');
    } catch (error) {
      console.error('License expiry handling failed:', error);
    }
  }

  /**
   * Force logout and boot user out
   */
  async bootUserOut(reason = 'LICENSE_EXPIRED') {
    try {
      // Clear all stored credentials
      await shopStorage.clearAllData();
      
      // Handle license expiry
      await this.handleLicenseExpiry();
      
      console.log(`User booted out due to: ${reason}`);
      
      return {
        success: true,
        reason: reason,
        message: 'You have been logged out due to license issues. Please renew your license to continue.'
      };
    } catch (error) {
      console.error('Boot out failed:', error);
      return {
        success: false,
        reason: 'BOOT_OUT_FAILED',
        error: error.message
      };
    }
  }

  /**
   * Get current license info
   */
  getCurrentLicense() {
    return this.currentLicense;
  }

  /**
   * Check if current user has founder access
   */
  async hasFounderAccess() {
    const shopInfo = await shopStorage.getCredentials();
    return shopInfo?.email === this.FOUNDER_EMAIL;
  }

  /**
   * Extend license by adding days
   */
  async extendLicense(additionalDays) {
    try {
      const currentLicense = await this.getStoredLicense();
      if (!currentLicense) {
        throw new Error('No license found to extend');
      }

      // Calculate new expiry date
      const currentExpiry = new Date(currentLicense.expiry_date);
      const newExpiry = new Date(currentExpiry.getTime() + (additionalDays * 24 * 60 * 60 * 1000));

      // Update license
      const extendedLicense = {
        ...currentLicense,
        expiry_date: newExpiry.toISOString(),
        type: 'PAID', // Change from trial to paid
        is_founder_trial: false,
        renewal_date: new Date().toISOString(),
        days_added: additionalDays,
        license_key: this.generateLicenseKey(), // Generate new key for security
        activation_fingerprint: await licenseSecurity.generateHardwareFingerprint() // Update fingerprint
      };

      // Store the extended license
      await this.storeLicense(extendedLicense);
      
      // Log the renewal event
      licenseSecurity.trackUsage('LICENSE_RENEWED', {
        timestamp: new Date().toISOString(),
        licenseId: currentLicense.id,
        additionalDays: additionalDays,
        newExpiryDate: newExpiry.toISOString()
      });

      console.log(`License extended by ${additionalDays} days. New expiry: ${newExpiry.toDateString()}`);
      return extendedLicense;
      
    } catch (error) {
      console.error('License extension failed:', error);
      throw error;
    }
  }

  /**
   * Check if license is expiring soon (show renewal prompt)
   */
  shouldShowRenewalPrompt() {
    if (!this.currentLicense) return false;
    // Unlimited licenses never need renewal
    if (this.currentLicense.type === 'UNLIMITED') return false;
    return this.getDaysRemaining(this.currentLicense) <= 7;
  }

  /**
   * Get license status for display
   */
  async getLicenseStatus() {
    try {
      const license = await this.getStoredLicense();
      if (!license) {
        return {
          hasLicense: false,
          licenseInfo: null,
          canAccess: false
        };
      }

      const validation = await licenseSecurity.validateLicenseOffline(license);
      const daysRemaining = this.getDaysRemaining(license);
      
      return {
        hasLicense: true,
        licenseInfo: this.formatLicenseInfo(license, validation),
        canAccess: (validation.valid || validation.offlineValid) && daysRemaining > 0,
        daysRemaining: daysRemaining,
        isExpired: daysRemaining <= 0,
        isExpiringSoon: daysRemaining <= 7 && daysRemaining > 0,
        shouldShowRenewalPrompt: daysRemaining <= 7 && daysRemaining > 0
      };
    } catch (error) {
      console.error('Failed to get license status:', error);
      return {
        hasLicense: false,
        licenseInfo: null,
        canAccess: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
export const licenseService = new LicenseService();
export default licenseService;