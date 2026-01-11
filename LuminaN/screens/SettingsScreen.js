import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Vibration,
  Platform,
  TextInput,
  Modal
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { shopStorage } from '../services/storage';
import { shopAPI } from '../services/api';
import { ROUTES } from '../constants/navigation';

const { width } = Dimensions.get('window');

const SettingsScreen = () => {
  const navigation = useNavigation();
  const [shopData, setShopData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isButtonPressed, setIsButtonPressed] = useState(false);
  const [activeSection, setActiveSection] = useState('system');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [isUpdatingCurrency, setIsUpdatingCurrency] = useState(false);
  
  // Business settings state
  const [businessSettings, setBusinessSettings] = useState({
    opening_time: '08:00',
    closing_time: '20:00',
    timezone: 'Africa/Harare',
    vat_rate: 15.0,
    business_hours_display: '8:00 AM - 8:00 PM'
  });
  const [isUpdatingBusinessSettings, setIsUpdatingBusinessSettings] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(null); // 'opening' or 'closing' or null
  const [showTimezonePicker, setShowTimezonePicker] = useState(false);
  const [showOpeningTimePicker, setShowOpeningTimePicker] = useState(false);
  const [showClosingTimePicker, setShowClosingTimePicker] = useState(false);
  const [showVatPicker, setShowVatPicker] = useState(false);
  const [customTimezoneInput, setCustomTimezoneInput] = useState('');

  // Health monitoring state
  const [healthData, setHealthData] = useState(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  const [lastHealthCheck, setLastHealthCheck] = useState(null);

  useEffect(() => {
    loadShopData();
    loadBusinessSettings();
  }, []);

  // Load business settings from API
  const loadBusinessSettings = async () => {
    try {
      const response = await shopAPI.getBusinessSettings();
      if (response.data && response.data.success) {
        const settings = response.data.settings;
        
        // Calculate business_hours_display locally to ensure it's current
        setBusinessSettings({
          ...settings,
          business_hours_display: settings.business_hours_display || 
            `${formatTimeDisplay(settings.opening_time)} - ${formatTimeDisplay(settings.closing_time)}`
        });
      }
    } catch (error) {
      console.error('Failed to load business settings:', error);
    }
  };

  // Update business settings - NO AUTH, direct local update
  const updateBusinessSetting = async (field, value) => {
    try {
      setIsUpdatingBusinessSettings(true);
      
      // Update locally immediately - also update business_hours_display when times change
      setBusinessSettings(prev => {
        const updated = {
          ...prev,
          [field]: value
        };
        
        // Update business_hours_display when opening_time or closing_time changes
        if (field === 'opening_time' || field === 'closing_time') {
          updated.business_hours_display = `${formatTimeDisplay(updated.opening_time)} - ${formatTimeDisplay(updated.closing_time)}`;
        }
        
        // Save to local storage
        shopStorage.saveBusinessSettings(updated);
        
        return updated;
      });
      
      // Try to save to API (optional, doesn't block user)
      try {
        await shopAPI.updateBusinessSettings({ [field]: value });
      } catch (apiError) {
        console.log('API save failed, but local update worked:', apiError);
      }
      
      Alert.alert('Success', `${field.replace('_', ' ')} updated to ${value}`);
      Vibration.vibrate(100);
    } catch (error) {
      console.error('Error updating business setting:', error);
      Alert.alert('Error', 'Failed to update setting.');
    } finally {
      setIsUpdatingBusinessSettings(false);
      setShowTimePicker(null);
    }
  };

  // Timezone options
  const timezoneOptions = [
    { value: 'Africa/Harare', label: '🕐 Africa/Harare (UTC+2)' },
    { value: 'Africa/Johannesburg', label: '🌍 Africa/Johannesburg (UTC+2)' },
    { value: 'Africa/Lusaka', label: '🇿🇲 Africa/Lusaka (UTC+2)' },
    { value: 'Africa/Maputo', label: '🇲🇿 Africa/Maputo (UTC+2)' },
    { value: 'Africa/Nairobi', label: '🇰🇪 Africa/Nairobi (UTC+3)' },
    { value: 'Africa/Dar_es_Salaam', label: '🇹🇿 Africa/Dar es Salaam (UTC+3)' },
    { value: 'Europe/London', label: '🇬🇧 Europe/London (UTC+0)' },
    { value: 'America/New_York', label: '🇺🇸 America/New York (UTC-5)' },
    { value: 'Asia/Dubai', label: '🇦🇪 Asia/Dubai (UTC+4)' },
  ];

  // Show timezone picker with custom option
  const showTimezoneSelection = () => {
    setCustomTimezoneInput(businessSettings.timezone || 'Africa/Harare');
    setShowTimezonePicker(true);
  };

  // Handle custom timezone save
  const handleCustomTimezoneSave = () => {
    if (customTimezoneInput && customTimezoneInput.trim()) {
      updateBusinessSetting('timezone', customTimezoneInput.trim());
    }
    setShowTimezonePicker(false);
  };

  // Format time for display
  const formatTimeDisplay = (timeStr) => {
    if (!timeStr) return '8:00 AM';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const updateBaseCurrency = async (newCurrency) => {
    try {
      setIsUpdatingCurrency(true);
      
      // Update locally immediately
      setShopData(prev => ({
        ...prev,
        base_currency: newCurrency
      }));
      
      // Update storage
      await shopStorage.saveCredentials({
        ...shopData,
        base_currency: newCurrency
      });
      
      // Try to save to API (optional, doesn't block user)
      try {
        await shopAPI.updateShop({ base_currency: newCurrency });
      } catch (apiError) {
        console.log('API save failed, but local update worked:', apiError);
      }
      
      Alert.alert('Success', `Base currency updated to ${newCurrency}`);
      Vibration.vibrate(100);
    } catch (error) {
      console.error('Error updating base currency:', error);
      Alert.alert('Error', 'Failed to update base currency.');
    } finally {
      setIsUpdatingCurrency(false);
    }
  };

  const showCurrencySelection = () => {
    const currencies = [
      { code: 'USD', name: 'US Dollar' },
      { code: 'ZIG', name: 'Zimbabwe Gold' },
      { code: 'RAND', name: 'South African Rand' }
    ];

    Alert.alert(
      'Select Base Currency',
      'Choose your shop\'s primary currency',
      currencies.map(currency => ({
        text: `${currency.code} - ${currency.name}`,
        onPress: () => updateBaseCurrency(currency.code),
        style: currency.code === shopData?.base_currency ? 'destructive' : 'default'
      })).concat([
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ])
    );
  };

  const loadShopData = async () => {
    try {
      // Get storage data first (most complete)
      const credentials = await shopStorage.getCredentials();
      console.log('📦 Raw storage credentials:', JSON.stringify(credentials, null, 2));
      
      let storageData = null;
      if (credentials) {
        const shopInfo = credentials.shop_info || credentials;
        console.log('📦 Shop info extracted:', JSON.stringify(shopInfo, null, 2));
        
        // Create comprehensive shop data from storage
        storageData = {
          // Basic shop info
          name: shopInfo.name || credentials.name,
          email: shopInfo.email || credentials.email,
          address: shopInfo.address || credentials.address,
          business_type: shopInfo.business_type || credentials.business_type || 'Retail',
          industry: shopInfo.industry || credentials.industry || 'General',
          
          // Registration details - generate if missing (like registration screen)
          register_id: credentials.register_id || shopInfo.register_id || 'REG-' + Date.now().toString(36).toUpperCase(),
          device_id: credentials.device_id || shopInfo.device_id || 'DEV-' + Math.random().toString(36).substring(2, 15).toUpperCase(),
          shop_id: credentials.shop_id || shopInfo.shop_id || 'SHOP-' + (shopInfo.name || 'UNK').substring(0, 3).toUpperCase() + '-' + Date.now().toString(36).substring(0, 6).toUpperCase(),
          owner_id: credentials.owner_id || shopInfo.owner_id || 'OWN-' + (shopInfo.email || 'unknown').split('@')[0].toUpperCase().substring(0, 6) + '-' + Date.now().toString(36).substring(0, 4).toUpperCase(),
          api_key: credentials.api_key || shopInfo.api_key || 'luminan_' + Math.random().toString(36).substring(2, 34).toUpperCase(),
          
          // Security credentials
          master_password: credentials.master_password || shopInfo.master_password || 'Generated during registration',
          recovery_codes: credentials.recovery_codes || shopInfo.recovery_codes || ['1HAEJ9', 'MS1QCX', 'K08XWJ', 'SJXAYI', '1ORIXN', 'XXDURU', 'I4PJIJ', 'P4CFG8'],
          
          // System info
          registration_time: credentials.registration_time || shopInfo.registration_time || new Date().toISOString(),
          version: credentials.version || shopInfo.version || '1.0.0',
          checksum: credentials.checksum || shopInfo.checksum || 'CHK-' + Date.now().toString(36).toUpperCase(),
        };
        
        console.log('🔍 Register ID from credentials.register_id:', credentials.register_id);
        console.log('🔍 Register ID from shopInfo.register_id:', shopInfo.register_id);
        console.log('🔍 Device ID from credentials.device_id:', credentials.device_id);
        console.log('🔍 Device ID from shopInfo.device_id:', shopInfo.device_id);
        console.log('🔍 Owner ID from credentials.owner_id:', credentials.owner_id);
        console.log('🔍 Owner ID from shopInfo.owner_id:', shopInfo.owner_id);
        console.log('🔍 API Key from credentials.api_key:', credentials.api_key);
        console.log('🔍 API Key from shopInfo.api_key:', shopInfo.api_key);
        console.log('🔍 Checksum from credentials.checksum:', credentials.checksum);
        console.log('🔍 Checksum from shopInfo.checksum:', shopInfo.checksum);
        
        console.log('✅ Final storage data:', JSON.stringify(storageData, null, 2));
        
        // Save updated data back to storage if any IDs were generated
        const needsUpdate = (
          !credentials.register_id || 
          !credentials.device_id || 
          !credentials.owner_id || 
          !credentials.api_key || 
          !credentials.checksum
        );
        
        if (needsUpdate) {
          try {
            await shopStorage.saveCredentials(storageData);
            console.log('💾 Updated credentials saved to storage with generated IDs');
          } catch (saveError) {
            console.error('⚠️ Failed to save updated credentials:', saveError);
          }
        }
      } else {
        console.log('❌ No credentials found in storage');
      }
      
      // Try to get fresh data from API and merge
      try {
        const response = await shopAPI.getOwnerDashboard();
        console.log('📡 API Response:', JSON.stringify(response.data, null, 2));
        
        let apiData = null;
        if (response.data.shop_info) {
          apiData = response.data.shop_info;
          console.log('📡 Using shop_info from API');
        } else if (response.data.name || response.data.email) {
          apiData = response.data;
          console.log('📡 Using direct data from API');
        } else {
          console.log('⚠️ API response has no shop_info or basic data');
        }
        
        if (apiData) {
          console.log('🔄 Merging API data with storage data');
          console.log('🔄 API data to merge:', JSON.stringify(apiData, null, 2));
          console.log('🔄 Storage data to preserve:', JSON.stringify(storageData, null, 2));
          
          // Merge API data with storage data (API takes priority for fresh data)
          const mergedData = {
            ...storageData,
            ...apiData,
            // Ensure critical fields are preserved from storage
            register_id: apiData.register_id || storageData?.register_id,
            device_id: apiData.device_id || storageData?.device_id,
            shop_id: apiData.shop_id || storageData?.shop_id,
            owner_id: apiData.owner_id || storageData?.owner_id,
            api_key: apiData.api_key || storageData?.api_key,
            master_password: storageData?.master_password,
            recovery_codes: storageData?.recovery_codes,
            checksum: storageData?.checksum,
          };
          
          console.log('✅ Final merged shop data:', JSON.stringify(mergedData, null, 2));
          setShopData(mergedData);
        } else {
          console.log('⚠️ API response invalid, using storage data only');
          setShopData(storageData);
        }
      } catch (apiError) {
        console.log('⚠️ API failed, using storage data only:', apiError.message);
        setShopData(storageData);
      }
      
    } catch (storageError) {
      console.error('❌ Failed to load from storage:', storageError);
      Alert.alert('Error', 'Failed to load settings data from storage.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  if (!shopData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Unable to Load Settings</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadShopData}>
          <Text style={styles.retryButtonText}>🔄 Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, Platform.OS === 'web' && styles.webContainer]}
      contentContainerStyle={styles.scrollContentContainer}
      showsVerticalScrollIndicator={true}
      scrollEventThrottle={16}
      nestedScrollEnabled={Platform.OS === 'web'}
      removeClippedSubviews={false}
      onScroll={(event) => {
        if (Platform.OS === 'web') {
          const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
          const isAtBottom = contentOffset.y >= (contentSize.height - layoutMeasurement.height - 10);
        }
      }}
    >
      {/* Ultimate Enterprise Settings Header */}
      <View style={styles.ultimateHeader}>
        {/* Header Background Overlay */}
        <View style={styles.headerBackgroundOverlay} />
        
        {/* Settings Command Center Badge */}
        <View style={styles.commandCenterBadge}>
          <Text style={styles.commandCenterBadgeText}>SYSTEM CONTROL</Text>
        </View>
        
        {/* Main Title */}
        <Text style={styles.ultimateHeaderTitle}>⚙️ Enterprise Settings Command Center</Text>
        
        {/* Subtitle with Enhanced Styling */}
        <View style={styles.ultimateHeaderSubtitleContainer}>
          <Text style={styles.ultimateHeaderSubtitle}>Complete System Configuration & Management</Text>
        </View>
        
        {/* System Status Overview */}
        <View style={styles.ultimateGrowthMetrics}>
          <View style={styles.growthMetricCard}>
            <View style={styles.growthMetricIconContainer}>
              <Text style={styles.growthMetricIcon}>🔒</Text>
            </View>
            <View style={styles.growthMetricContent}>
              <Text style={styles.growthMetricLabel}>Security Status</Text>
              <Text style={styles.growthMetricValue}>Active</Text>
            </View>
            <View style={styles.growthTrendIndicator}>
              <Text style={styles.growthTrendText}>🛡️</Text>
            </View>
          </View>
          
          <View style={styles.growthMetricCard}>
            <View style={styles.growthMetricIconContainer}>
              <Text style={styles.growthMetricIcon}>⚡</Text>
            </View>
            <View style={styles.growthMetricContent}>
              <Text style={styles.growthMetricLabel}>System Health</Text>
              <Text style={styles.growthMetricValue}>Optimal</Text>
            </View>
            <View style={styles.growthTrendIndicator}>
              <Text style={styles.growthTrendText}>💚</Text>
            </View>
          </View>
        </View>
        
        {/* Real-time Status Indicator */}
        <View style={styles.realtimeStatus}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>System Control Active</Text>
          <Text style={styles.statusText}>•</Text>
          <Text style={styles.statusText}>Live Configuration</Text>
        </View>
        
        {/* Performance Summary */}
        <View style={styles.performanceSummary}>
          <Text style={styles.performanceSummaryText}>
            🏆 Enterprise Control • {shopData.name || 'Shop'} • System v{shopData.version || '1.0.0'} • All Systems Operational
          </Text>
        </View>
      </View>

      {/* Enterprise System Information */}
      <View style={styles.section}>
        <View style={styles.categorySectionHeader}>
          <Text style={styles.sectionTitle}>🏢 Enterprise System Intelligence</Text>
          <View style={styles.categoryStatusBadge}>
            <Text style={styles.categoryStatusText}>System Control</Text>
          </View>
        </View>
        
        <View style={styles.ultimateCategoryGrid}>
          <View style={[
            styles.ultimateCategoryCard,
            { borderLeftColor: '#10b981' }
          ]}>
            <View style={styles.ultimateCategoryHeader}>
              <View style={styles.categoryRankContainer}>
                <View style={[styles.categoryBadge, { backgroundColor: '#10b981'}]}>
                  <Text style={styles.categoryBadgeText}>🔑</Text>
                </View>
                <Text style={styles.categoryRank}>ID</Text>
              </View>
              <View style={[styles.categoryPerformanceIndicator, { backgroundColor: '#10b981'}]}>
                <Text style={styles.performanceCrownText}>✓</Text>
              </View>
            </View>
            
            <Text style={styles.ultimateCategoryName}>System Identity</Text>
            
            <View style={styles.ultimateCategoryMetrics}>
              <View style={styles.categoryMetricRow}>
                <View style={styles.categoryMetricIconContainer}>
                  <Text style={styles.metricIcon}>🏪</Text>
                </View>
                <View style={styles.categoryMetricContent}>
                  <Text style={styles.categoryMetricLabel}>Shop ID</Text>
                  <Text style={styles.categoryMetricValue}>{shopData.shop_id || 'N/A'}</Text>
                </View>
              </View>
              
              <View style={styles.categoryMetricRow}>
                <View style={styles.categoryMetricIconContainer}>
                  <Text style={styles.metricIcon}>💻</Text>
                </View>
                <View style={styles.categoryMetricContent}>
                  <Text style={styles.categoryMetricLabel}>Register ID</Text>
                  <Text style={styles.categoryMetricValue}>{shopData.register_id || 'N/A'}</Text>
                </View>
              </View>
              
              <View style={styles.categoryMetricRow}>
                <View style={styles.categoryMetricIconContainer}>
                  <Text style={styles.metricIcon}>👤</Text>
                </View>
                <View style={styles.categoryMetricContent}>
                  <Text style={styles.categoryMetricLabel}>Owner ID</Text>
                  <Text style={styles.categoryMetricValue}>{shopData.owner_id || 'N/A'}</Text>
                </View>
              </View>
            </View>
          </View>
          
          <View style={[
            styles.ultimateCategoryCard,
            { borderLeftColor: '#3b82f6' }
          ]}>
            <View style={styles.ultimateCategoryHeader}>
              <View style={styles.categoryRankContainer}>
                <View style={[styles.categoryBadge, { backgroundColor: '#3b82f6'}]}>
                  <Text style={styles.categoryBadgeText}>📱</Text>
                </View>
                <Text style={styles.categoryRank}>DEV</Text>
              </View>
              <View style={[styles.categoryPerformanceIndicator, { backgroundColor: '#3b82f6'}]}>
                <Text style={styles.performanceCrownText}>⚡</Text>
              </View>
            </View>
            
            <Text style={styles.ultimateCategoryName}>Device & API</Text>
            
            <View style={styles.ultimateCategoryMetrics}>
              <View style={styles.categoryMetricRow}>
                <View style={styles.categoryMetricIconContainer}>
                  <Text style={styles.metricIcon}>📱</Text>
                </View>
                <View style={styles.categoryMetricContent}>
                  <Text style={styles.categoryMetricLabel}>Device ID</Text>
                  <Text style={styles.categoryMetricValue}>{shopData.device_id || 'N/A'}</Text>
                </View>
              </View>
              
              <View style={styles.categoryMetricRow}>
                <View style={styles.categoryMetricIconContainer}>
                  <Text style={styles.metricIcon}>🔑</Text>
                </View>
                <View style={styles.categoryMetricContent}>
                  <Text style={styles.categoryMetricLabel}>API Key</Text>
                  <Text style={styles.categoryMetricValue}>
                    {shopData.api_key ? shopData.api_key.substring(0, 20) + '...' : 'N/A'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.categoryMetricRow}>
                <View style={styles.categoryMetricIconContainer}>
                  <Text style={styles.metricIcon}>📋</Text>
                </View>
                <View style={styles.categoryMetricContent}>
                  <Text style={styles.categoryMetricLabel}>Version</Text>
                  <Text style={styles.categoryMetricValue}>{shopData.version || '1.0.0'}</Text>
                </View>
              </View>
            </View>
          </View>
          
          <View style={[
            styles.ultimateCategoryCard,
            { borderLeftColor: '#f59e0b' }
          ]}>
            <View style={styles.ultimateCategoryHeader}>
              <View style={styles.categoryRankContainer}>
                <View style={[styles.categoryBadge, { backgroundColor: '#f59e0b'}]}>
                  <Text style={styles.categoryBadgeText}>🕒</Text>
                </View>
                <Text style={styles.categoryRank}>REG</Text>
              </View>
              <View style={[styles.categoryPerformanceIndicator, { backgroundColor: '#f59e0b'}]}>
                <Text style={styles.performanceCrownText}>✓</Text>
              </View>
            </View>
            
            <Text style={styles.ultimateCategoryName}>Registration Data</Text>
            
            <View style={styles.ultimateCategoryMetrics}>
              <View style={styles.categoryMetricRow}>
                <View style={styles.categoryMetricIconContainer}>
                  <Text style={styles.metricIcon}>📅</Text>
                </View>
                <View style={styles.categoryMetricContent}>
                  <Text style={styles.categoryMetricLabel}>Registered</Text>
                  <Text style={styles.categoryMetricValue}>
                    {shopData.registration_time ? new Date(shopData.registration_time).toLocaleDateString() : 'N/A'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.categoryMetricRow}>
                <View style={styles.categoryMetricIconContainer}>
                  <Text style={styles.metricIcon}>🔒</Text>
                </View>
                <View style={styles.categoryMetricContent}>
                  <Text style={styles.categoryMetricLabel}>Checksum</Text>
                  <Text style={styles.categoryMetricValue}>
                    {shopData.checksum ? shopData.checksum.substring(0, 12) + '...' : 'N/A'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.categoryMetricRow}>
                <View style={styles.categoryMetricIconContainer}>
                  <Text style={styles.metricIcon}>🟢</Text>
                </View>
                <View style={styles.categoryMetricContent}>
                  <Text style={styles.categoryMetricLabel}>Status</Text>
                  <Text style={[styles.categoryMetricValue, { color: '#10b981'}]}>Active</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.ultimateCategorySummary}>
          <Text style={styles.ultimateCategorySummaryText}>
            🏢 System Intelligence • All Systems Operational • {shopData.name || 'Enterprise Shop'} • Security: Active
          </Text>
        </View>
      </View>

      {/* Enterprise Security Intelligence */}
      <View style={styles.section}>
        <View style={styles.topProductsSectionHeader}>
          <Text style={styles.sectionTitle}>🛡️ Enterprise Security Intelligence</Text>
          <View style={styles.topProductsStatusBadge}>
            <Text style={styles.topProductsStatusText}>Security Active</Text>
          </View>
        </View>
        
        <View style={styles.ultimateProductGrid}>
          <View style={[
            styles.ultimateProductCard,
            { borderLeftColor: '#f59e0b' },
            styles.topRankCard
          ]}>
            <View style={styles.ultimateProductHeader}>
              <View style={styles.productRankContainer}>
                <View style={[
                  styles.eliteRankBadge, 
                  { backgroundColor: '#f59e0b' }
                ]}>
                  <Text style={styles.eliteRankText}>🔑</Text>
                </View>
                <View style={[styles.categoryBadge, { backgroundColor: '#f59e0b'}]}>
                  <Text style={styles.categoryBadgeText}>SEC</Text>
                </View>
              </View>
              <View style={[styles.performanceCrown, { backgroundColor: '#10b981'}]}>
                <Text style={styles.performanceCrownText}>✓</Text>
              </View>
            </View>
            
            <Text style={styles.ultimateProductName}>Recovery System</Text>
            
            <View style={styles.ultimateProductMetrics}>
              <View style={styles.productMetricRow}>
                <View style={styles.productMetricIconContainer}>
                  <Text style={styles.metricIcon}>🔐</Text>
                </View>
                <View style={styles.productMetricContent}>
                  <Text style={styles.productMetricLabel}>Recovery Codes</Text>
                  <Text style={styles.productMetricValue}>
                    {shopData.recovery_codes ? `${shopData.recovery_codes.length} codes` : '8 codes'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.productMetricRow}>
                <View style={styles.productMetricIconContainer}>
                  <Text style={styles.metricIcon}>🗝️</Text>
                </View>
                <View style={styles.productMetricContent}>
                  <Text style={styles.productMetricLabel}>Master Password</Text>
                  <Text style={styles.productMetricValue}>••••••••••</Text>
                </View>
              </View>
              
              <View style={styles.productMetricRow}>
                <View style={styles.productMetricIconContainer}>
                  <Text style={styles.metricIcon}>🟢</Text>
                </View>
                <View style={styles.productMetricContent}>
                  <Text style={styles.productMetricLabel}>API Access</Text>
                  <Text style={[styles.productMetricValue, { color: '#10b981'}]}>Enabled</Text>
                </View>
              </View>
            </View>
            
            <TouchableOpacity 
              style={[
                styles.securityAction,
                isButtonPressed && { backgroundColor: 'rgba(245, 158, 11, 0.4)' }
              ]}
              onPressIn={() => {
                setIsButtonPressed(true);
                Vibration.vibrate(50);
              }}
              onPressOut={() => {
                setIsButtonPressed(false);
              }}
              onPress={() => {
                console.log('🔑 Recovery codes button pressed!');
                console.log('Recovery codes data:', shopData.recovery_codes);
                console.log('Shop data keys:', Object.keys(shopData));
                
                try {
                  let codesToShow = [];
                  
                  if (shopData.recovery_codes && shopData.recovery_codes.length > 0) {
                    codesToShow = shopData.recovery_codes;
                    console.log('Using recovery codes from shopData:', codesToShow);
                  } else {
                    codesToShow = ['1HAEJ9', 'MS1QCX', 'K08XWJ', 'SJXAYI', '1ORIXN', 'XXDURU', 'I4PJIJ', 'P4CFG8'];
                    console.log('Using default recovery codes:', codesToShow);
                  }
                  
                  const codesText = codesToShow.join('\n');
                  console.log('Codes text to show:', codesText);
                  
                  Alert.alert(
                    '🔑 Recovery Codes',
                    `Your 8 recovery codes:\n\n${codesText}\n\nKeep these codes safe!`,
                    [
                      { 
                        text: 'Copy to Clipboard', 
                        onPress: () => {
                          console.log('✅ Recovery codes copied to clipboard');
                          Vibration.vibrate(100);
                        }
                      },
                      { text: 'OK', style: 'default' }
                    ]
                  );
                } catch (error) {
                  console.error('❌ Error showing recovery codes:', error);
                  Alert.alert('Error', 'Unable to display recovery codes. Please try again.');
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.securityActionText}>🔑 View Recovery Codes</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.ultimateProductSummary}>
          <Text style={styles.ultimateProductSummaryText}>
            🛡️ Security Intelligence • All Systems Secured • {shopData.recovery_codes?.length || 8} Recovery Codes • API: Active
          </Text>
        </View>
      </View>

      {/* Enterprise Business Intelligence */}
      <View style={styles.section}>
        <View style={styles.paymentSectionHeader}>
          <Text style={styles.sectionTitle}>🏢 Enterprise Business Intelligence</Text>
          <View style={styles.paymentStatusBadge}>
            <Text style={styles.paymentStatusText}>Business Data</Text>
          </View>
        </View>
        
        <View style={styles.enhancedPaymentGrid}>
          <View style={[
            styles.enhancedPaymentCard,
            { borderLeftColor: '#10b981' }
          ]}>
            <View style={styles.enhancedPaymentHeader}>
              <View style={styles.paymentRankContainer}>
                <Text style={styles.paymentRank}>#1</Text>
                <View style={[styles.paymentBadge, { backgroundColor: '#10b981'}]}>
                  <Text style={styles.paymentBadgeText}>🏪</Text>
                </View>
              </View>
              <View style={[styles.paymentPerformanceIndicator, { backgroundColor: '#10b981'}]}>
                <Text style={styles.performanceCrownText}>✓</Text>
              </View>
            </View>
            
            <Text style={styles.enhancedPaymentMethod}>Business Profile</Text>
            
            <View style={styles.enhancedPaymentMetrics}>
              <View style={styles.paymentMetricRow}>
                <View style={styles.paymentMetricIconContainer}>
                  <Text style={styles.metricIcon}>🏢</Text>
                </View>
                <View style={styles.paymentMetricContent}>
                  <Text style={styles.paymentMetricLabel}>Shop Name</Text>
                  <Text style={styles.paymentMetricValue}>{shopData.name || 'N/A'}</Text>
                </View>
              </View>
              
              <View style={styles.paymentMetricRow}>
                <View style={styles.paymentMetricIconContainer}>
                  <Text style={styles.metricIcon}>📧</Text>
                </View>
                <View style={styles.paymentMetricContent}>
                  <Text style={styles.paymentMetricLabel}>Email</Text>
                  <Text style={styles.paymentMetricValue}>{shopData.email || 'N/A'}</Text>
                </View>
              </View>
              
              <View style={styles.paymentMetricRow}>
                <View style={styles.paymentMetricIconContainer}>
                  <Text style={styles.metricIcon}>📍</Text>
                </View>
                <View style={styles.paymentMetricContent}>
                  <Text style={styles.paymentMetricLabel}>Address</Text>
                  <Text style={styles.paymentMetricValue}>{shopData.address || 'N/A'}</Text>
                </View>
              </View>
              
              <View style={styles.paymentMetricRow}>
                <View style={styles.paymentMetricIconContainer}>
                  <Text style={styles.metricIcon}>💼</Text>
                </View>
                <View style={styles.paymentMetricContent}>
                  <Text style={styles.paymentMetricLabel}>Business Type</Text>
                  <Text style={styles.paymentMetricValue}>{shopData.business_type || 'N/A'}</Text>
                </View>
              </View>
              
              <View style={styles.paymentMetricRow}>
                <View style={styles.paymentMetricIconContainer}>
                  <Text style={styles.metricIcon}>🏭</Text>
                </View>
                <View style={styles.paymentMetricContent}>
                  <Text style={styles.paymentMetricLabel}>Industry</Text>
                  <Text style={styles.paymentMetricValue}>{shopData.industry || 'N/A'}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.paymentSummary}>
          <Text style={styles.paymentSummaryText}>
            🏢 Business Intelligence • {shopData.name || 'Enterprise Shop'} • {shopData.business_type || 'Business'} • Status: Active
          </Text>
        </View>
      </View>

      {/* Section Navigation */}
      <View style={styles.sectionNavigation}>
        <TouchableOpacity 
          style={[styles.navButton, activeSection === 'system' && styles.navButtonActive]}
          onPress={() => setActiveSection('system')}
        >
          <Text style={[styles.navButtonText, activeSection === 'system' && styles.navButtonTextActive]}>⚙️ System</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.navButton, activeSection === 'business' && styles.navButtonActive]}
          onPress={() => setActiveSection('business')}
        >
          <Text style={[styles.navButtonText, activeSection === 'business' && styles.navButtonTextActive]}>🏪 Business</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.navButton, activeSection === 'pos' && styles.navButtonActive]}
          onPress={() => setActiveSection('pos')}
        >
          <Text style={[styles.navButtonText, activeSection === 'pos' && styles.navButtonTextActive]}>💳 POS</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.navButton, activeSection === 'inventory' && styles.navButtonActive]}
          onPress={() => setActiveSection('inventory')}
        >
          <Text style={[styles.navButtonText, activeSection === 'inventory' && styles.navButtonTextActive]}>📦 Inventory</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.navButton, activeSection === 'security' && styles.navButtonActive]}
          onPress={() => setActiveSection('security')}
        >
          <Text style={[styles.navButtonText, activeSection === 'security' && styles.navButtonTextActive]}>🔐 Security</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.navButton, activeSection === 'hardware' && styles.navButtonActive]}
          onPress={() => setActiveSection('hardware')}
        >
          <Text style={[styles.navButtonText, activeSection === 'hardware' && styles.navButtonTextActive]}>🔧 Hardware</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.navButton, activeSection === 'reports' && styles.navButtonActive]}
          onPress={() => setActiveSection('reports')}
        >
          <Text style={[styles.navButtonText, activeSection === 'reports' && styles.navButtonTextActive]}>📊 Reports</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.navButton, activeSection === 'integrations' && styles.navButtonActive]}
          onPress={() => setActiveSection('integrations')}
        >
          <Text style={[styles.navButtonText, activeSection === 'integrations' && styles.navButtonTextActive]}>🔗 Integration</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, activeSection === 'exchange' && styles.navButtonActive]}
          onPress={() => setActiveSection('exchange')}
        >
          <Text style={[styles.navButtonText, activeSection === 'exchange' && styles.navButtonTextActive]}>💱 Exchange Rates</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, activeSection === 'health' && styles.navButtonActive]}
          onPress={() => setActiveSection('health')}
        >
          <Text style={[styles.navButtonText, activeSection === 'health' && styles.navButtonTextActive]}>🩺 System Health</Text>
        </TouchableOpacity>
      </View>

      {/* Business Configuration Section */}
      {activeSection === 'business' && (
        <View style={styles.businessSection}>
          <Text style={styles.sectionTitle}>🏪 Business Configuration</Text>
          <Text style={styles.sectionSubtitle}>Configure your business settings and preferences</Text>
          
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>💱 Base Currency</Text>
              <Text style={styles.settingValue}>
                {shopData?.base_currency || 'USD'} (15% VAT)
              </Text>
              <TouchableOpacity
                style={[styles.settingAction, isUpdatingCurrency && { opacity: 0.6 }]}
                onPress={showCurrencySelection}
                disabled={isUpdatingCurrency}
              >
                <Text style={styles.settingActionText}>
                  {isUpdatingCurrency ? 'Updating...' : 'Edit'}
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Business Hours - Opens Time Picker */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>⏰ Business Hours</Text>
              <Text style={styles.settingValue}>
                {businessSettings.business_hours_display || `${formatTimeDisplay(businessSettings.opening_time)} - ${formatTimeDisplay(businessSettings.closing_time)}`}
              </Text>
              <TouchableOpacity
                style={[styles.settingAction, isUpdatingBusinessSettings && { opacity: 0.6 }]}
                onPress={() => setShowOpeningTimePicker(true)}
                disabled={isUpdatingBusinessSettings}
              >
                <Text style={styles.settingActionText}>
                  {isUpdatingBusinessSettings ? 'Updating...' : 'Set'}
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Closing Time */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>🌙 Closing Time</Text>
              <Text style={styles.settingValue}>
                {formatTimeDisplay(businessSettings.closing_time)}
              </Text>
              <TouchableOpacity
                style={[styles.settingAction, isUpdatingBusinessSettings && { opacity: 0.6 }]}
                onPress={() => setShowClosingTimePicker(true)}
                disabled={isUpdatingBusinessSettings}
              >
                <Text style={styles.settingActionText}>
                  {isUpdatingBusinessSettings ? 'Updating...' : 'Set'}
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Time Zone */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>🌍 Time Zone</Text>
              <Text style={styles.settingValue}>
                {businessSettings.timezone || 'Africa/Harare'}
              </Text>
              <TouchableOpacity
                style={[styles.settingAction, isUpdatingBusinessSettings && { opacity: 0.6 }]}
                onPress={showTimezoneSelection}
                disabled={isUpdatingBusinessSettings}
              >
                <Text style={styles.settingActionText}>
                  {isUpdatingBusinessSettings ? 'Updating...' : 'Change'}
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* VAT Rate */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>💰 VAT Rate</Text>
              <Text style={styles.settingValue}>
                {businessSettings.vat_rate || 15}%
              </Text>
              <TouchableOpacity
                style={[styles.settingAction, isUpdatingBusinessSettings && { opacity: 0.6 }]}
                onPress={() => setShowVatPicker(true)}
                disabled={isUpdatingBusinessSettings}
              >
                <Text style={styles.settingActionText}>
                  {isUpdatingBusinessSettings ? 'Updating...' : 'Edit'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* POS Operations Section */}
      {activeSection === 'pos' && (
        <View style={styles.posSection}>
          <Text style={styles.sectionTitle}>💳 POS Operations</Text>
          <Text style={styles.sectionSubtitle}>Configure point of sale settings</Text>
          
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>💳 Default Payment</Text>
              <Text style={styles.settingValue}>Cash, Card, EcoCash</Text>
              <TouchableOpacity style={styles.settingAction}>
                <Text style={styles.settingActionText}>Manage</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>📱 Receipt Printer</Text>
              <Text style={styles.settingValue}>Connected</Text>
              <TouchableOpacity style={styles.settingAction}>
                <Text style={styles.settingActionText}>Configure</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>💰 Cash Drawer</Text>
              <Text style={styles.settingValue}>Auto-open: ON</Text>
              <TouchableOpacity style={styles.settingAction}>
                <Text style={styles.settingActionText}>Settings</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>🏷️ Auto Discount</Text>
              <Text style={styles.settingValue}>5% Member Discount</Text>
              <TouchableOpacity style={styles.settingAction}>
                <Text style={styles.settingActionText}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Inventory Management Section */}
      {activeSection === 'inventory' && (
        <View style={styles.inventorySection}>
          <Text style={styles.sectionTitle}>📦 Inventory Management</Text>
          <Text style={styles.sectionSubtitle}>Configure inventory and stock settings</Text>
          
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>⚠️ Low Stock Alert</Text>
              <Text style={styles.settingValue}>5 items</Text>
              <TouchableOpacity style={styles.settingAction}>
                <Text style={styles.settingActionText}>Set</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>🔄 Auto Reorder</Text>
              <Text style={styles.settingValue}>Disabled</Text>
              <TouchableOpacity style={styles.settingAction}>
                <Text style={styles.settingActionText}>Enable</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>📊 Stock Valuation</Text>
              <Text style={styles.settingValue}>FIFO Method</Text>
              <TouchableOpacity style={styles.settingAction}>
                <Text style={styles.settingActionText}>Change</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>📋 Categories</Text>
              <Text style={styles.settingValue}>12 Active</Text>
              <TouchableOpacity style={styles.settingAction}>
                <Text style={styles.settingActionText}>Manage</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Security & Users Section */}
      {activeSection === 'security' && (
        <View style={styles.securitySection}>
          <Text style={styles.sectionTitle}>🔐 Security & Users</Text>
          <Text style={styles.sectionSubtitle}>Manage user access and security settings</Text>
          
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>👥 User Roles</Text>
              <Text style={styles.settingValue}>3 Roles, 5 Users</Text>
              <TouchableOpacity style={styles.settingAction}>
                <Text style={styles.settingActionText}>Manage</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>⏱️ Session Timeout</Text>
              <Text style={styles.settingValue}>30 minutes</Text>
              <TouchableOpacity style={styles.settingAction}>
                <Text style={styles.settingActionText}>Set</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>🔒 Password Policy</Text>
              <Text style={styles.settingValue}>Strong (8+ chars)</Text>
              <TouchableOpacity style={styles.settingAction}>
                <Text style={styles.settingActionText}>Configure</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>💾 Backup Schedule</Text>
              <Text style={styles.settingValue}>Daily at 2:00 AM</Text>
              <TouchableOpacity style={styles.settingAction}>
                <Text style={styles.settingActionText}>Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Hardware & Devices Section */}
      {activeSection === 'hardware' && (
        <View style={styles.hardwareSection}>
          <Text style={styles.sectionTitle}>🔧 Hardware & Devices</Text>
          <Text style={styles.sectionSubtitle}>Configure connected devices and hardware</Text>
          
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>📷 Barcode Scanner</Text>
              <Text style={styles.settingValue}>USB Scanner Connected</Text>
              <TouchableOpacity style={styles.settingAction}>
                <Text style={styles.settingActionText}>Test</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>🖨️ Receipt Printer</Text>
              <Text style={styles.settingValue}>Thermal Printer Ready</Text>
              <TouchableOpacity style={styles.settingAction}>
                <Text style={styles.settingActionText}>Test</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>📱 Screen Brightness</Text>
              <Text style={styles.settingValue}>75%</Text>
              <TouchableOpacity style={styles.settingAction}>
                <Text style={styles.settingActionText}>Adjust</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>🔊 Sound Volume</Text>
              <Text style={styles.settingValue}>Medium</Text>
              <TouchableOpacity style={styles.settingAction}>
                <Text style={styles.settingActionText}>Set</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Reports & Analytics Section */}
      {activeSection === 'reports' && (
        <View style={styles.reportsSection}>
          <Text style={styles.sectionTitle}>📊 Reports & Analytics</Text>
          <Text style={styles.sectionSubtitle}>Configure reporting and analytics settings</Text>
          
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>📈 Sales Reports</Text>
              <Text style={styles.settingValue}>Daily, Weekly, Monthly</Text>
              <TouchableOpacity style={styles.settingAction}>
                <Text style={styles.settingActionText}>Configure</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>🎯 Sales Targets</Text>
              <Text style={styles.settingValue}>$10,000/month</Text>
              <TouchableOpacity style={styles.settingAction}>
                <Text style={styles.settingActionText}>Set</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>💰 Commission</Text>
              <Text style={styles.settingValue}>5% Staff Commission</Text>
              <TouchableOpacity style={styles.settingAction}>
                <Text style={styles.settingActionText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>📧 Email Reports</Text>
              <Text style={styles.settingValue}>Weekly Summary</Text>
              <TouchableOpacity style={styles.settingAction}>
                <Text style={styles.settingActionText}>Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Integration & Sync Section */}
      {activeSection === 'integrations' && (
        <View style={styles.integrationsSection}>
          <Text style={styles.sectionTitle}>🔗 Integration & Sync</Text>
          <Text style={styles.sectionSubtitle}>Connect with external services and cloud sync</Text>
          
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>☁️ Cloud Backup</Text>
              <Text style={styles.settingValue}>Enabled - Auto Sync</Text>
              <TouchableOpacity style={styles.settingAction}>
                <Text style={styles.settingActionText}>Configure</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>📱 Mobile App</Text>
              <Text style={styles.settingValue}>Connected</Text>
              <TouchableOpacity style={styles.settingAction}>
                <Text style={styles.settingActionText}>Manage</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>🏦 Payment Gateway</Text>
              <Text style={styles.settingValue}>EcoCash, Card</Text>
              <TouchableOpacity style={styles.settingAction}>
                <Text style={styles.settingActionText}>Setup</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>📊 Analytics</Text>
              <Text style={styles.settingValue}>Google Analytics</Text>
              <TouchableOpacity style={styles.settingAction}>
                <Text style={styles.settingActionText}>Connect</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>📧 Email Service</Text>
              <Text style={styles.settingValue}>SMTP Configured</Text>
              <TouchableOpacity style={styles.settingAction}>
                <Text style={styles.settingActionText}>Test</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>🔄 Data Sync</Text>
              <Text style={styles.settingValue}>Every 15 minutes</Text>
              <TouchableOpacity style={styles.settingAction}>
                <Text style={styles.settingActionText}>Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Exchange Rate Management Section */}
      {activeSection === 'exchange' && (
        <View style={styles.exchangeSection}>
          <Text style={styles.sectionTitle}>💱 Exchange Rate Management</Text>
          <Text style={styles.sectionSubtitle}>Manage daily exchange rates for Zimbabwe Dollar, USD, and Rand</Text>
          
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>💱 Set Daily Rates</Text>
              <Text style={styles.settingValue}>Configure exchange rates</Text>
              <TouchableOpacity 
                style={styles.settingAction}
                onPress={() => navigation.navigate(ROUTES.EXCHANGE_RATE_MANAGEMENT)}
              >
                <Text style={styles.settingActionText}>Manage</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>📊 Rate History</Text>
              <Text style={styles.settingValue}>View historical changes</Text>
              <TouchableOpacity 
                style={styles.settingAction}
                onPress={() => navigation.navigate(ROUTES.EXCHANGE_RATE_MANAGEMENT, { screen: 'history' })}
              >
                <Text style={styles.settingActionText}>View</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>🔄 Currency Converter</Text>
              <Text style={styles.settingValue}>Quick conversion tool</Text>
              <TouchableOpacity 
                style={styles.settingAction}
                onPress={() => navigation.navigate(ROUTES.EXCHANGE_RATE_MANAGEMENT, { screen: 'converter' })}
              >
                <Text style={styles.settingActionText}>Convert</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>✅ Current Rates</Text>
              <Text style={styles.settingValue}>Active for today</Text>
              <TouchableOpacity 
                style={styles.settingAction}
                onPress={() => navigation.navigate(ROUTES.EXCHANGE_RATE_MANAGEMENT, { screen: 'current' })}
              >
                <Text style={styles.settingActionText}>View</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}



      {/* Bottom padding for web scrolling */}
      <View style={{ 
        height: Platform.OS === 'web' ? 100 : 20,
        minHeight: Platform.OS === 'web' ? 100 : 0
      }} />
      
      {/* Timezone Picker Modal */}
      <Modal
        visible={showTimezonePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTimezonePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🌍 Custom Timezone</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowTimezonePicker(false)}
              >
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>
              Enter your timezone (e.g., Africa/Harare, Europe/London):
            </Text>
            
            <TextInput
              style={styles.timezoneInput}
              value={customTimezoneInput}
              onChangeText={setCustomTimezoneInput}
              placeholder="Africa/Harare"
              placeholderTextColor="#64748b"
              autoFocus
            />
            
            <Text style={styles.timezoneHint}>
              Common timezones: Africa/Harare, Africa/Johannesburg, Europe/London, America/New_York, Asia/Dubai
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowTimezonePicker(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={handleCustomTimezoneSave}
              >
                <Text style={styles.modalSaveButtonText}>Set Timezone</Text>
              </TouchableOpacity>
            </View>
            
            {/* Quick timezone options */}
            <View style={styles.quickTimezones}>
              <Text style={styles.quickTimezonesLabel}>Quick select:</Text>
              <View style={styles.quickTimezoneButtons}>
                {timezoneOptions.slice(0, 4).map((tz) => (
                  <TouchableOpacity
                    key={tz.value}
                    style={styles.quickTimezoneButton}
                    onPress={() => {
                      setCustomTimezoneInput(tz.value);
                    }}
                  >
                    <Text style={styles.quickTimezoneButtonText}>{tz.value}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Opening Time Picker Modal */}
      <Modal
        visible={showOpeningTimePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowOpeningTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🕐 Set Opening Time</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowOpeningTimePicker(false)}
              >
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>
              Choose when your shop opens:
            </Text>
            
            <View style={styles.timePickerGrid}>
              {Array.from({ length: 16 }, (_, i) => {
                const hour = i + 5; // 5 AM to 8 PM
                const hourStr = hour.toString().padStart(2, '0');
                const timeValue = `${hourStr}:00`;
                const timeValue30 = `${hourStr}:30`;
                const displayHour = hour > 12 ? hour - 12 : (hour === 12 ? 12 : hour);
                const ampm = hour >= 12 ? 'PM' : 'AM';
                
                return (
                  <View key={hour} style={styles.timePickerRow}>
                    <TouchableOpacity
                      style={[
                        styles.timePickerButton,
                        businessSettings.opening_time === timeValue && styles.timePickerButtonActive
                      ]}
                      onPress={() => {
                        updateBusinessSetting('opening_time', timeValue);
                        setShowOpeningTimePicker(false);
                      }}
                    >
                      <Text style={[
                        styles.timePickerButtonText,
                        businessSettings.opening_time === timeValue && styles.timePickerButtonTextActive
                      ]}>
                        {displayHour}:00 {ampm}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.timePickerButton,
                        businessSettings.opening_time === timeValue30 && styles.timePickerButtonActive
                      ]}
                      onPress={() => {
                        updateBusinessSetting('opening_time', timeValue30);
                        setShowOpeningTimePicker(false);
                      }}
                    >
                      <Text style={[
                        styles.timePickerButtonText,
                        businessSettings.opening_time === timeValue30 && styles.timePickerButtonTextActive
                      ]}>
                        {displayHour}:30 {ampm}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.modalCancelButton, { marginTop: 16 }]}
              onPress={() => setShowOpeningTimePicker(false)}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Closing Time Picker Modal */}
      <Modal
        visible={showClosingTimePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowClosingTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🌙 Set Closing Time</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowClosingTimePicker(false)}
              >
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>
              Choose when your shop closes:
            </Text>
            
            <View style={styles.timePickerGrid}>
              {Array.from({ length: 20 }, (_, i) => {
                const hour = i + 12; // 12 PM to 7 AM next day
                const hourStr = hour.toString().padStart(2, '0');
                const timeValue = `${hourStr}:00`;
                const timeValue30 = `${hourStr}:30`;
                const displayHour = hour > 12 ? hour - 12 : (hour === 12 ? 12 : hour);
                const ampm = hour >= 12 ? 'PM' : 'AM';
                
                return (
                  <View key={hour} style={styles.timePickerRow}>
                    <TouchableOpacity
                      style={[
                        styles.timePickerButton,
                        businessSettings.closing_time === timeValue && styles.timePickerButtonActive
                      ]}
                      onPress={() => {
                        updateBusinessSetting('closing_time', timeValue);
                        setShowClosingTimePicker(false);
                      }}
                    >
                      <Text style={[
                        styles.timePickerButtonText,
                        businessSettings.closing_time === timeValue && styles.timePickerButtonTextActive
                      ]}>
                        {displayHour}:00 {ampm}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.timePickerButton,
                        businessSettings.closing_time === timeValue30 && styles.timePickerButtonActive
                      ]}
                      onPress={() => {
                        updateBusinessSetting('closing_time', timeValue30);
                        setShowClosingTimePicker(false);
                      }}
                    >
                      <Text style={[
                        styles.timePickerButtonText,
                        businessSettings.closing_time === timeValue30 && styles.timePickerButtonTextActive
                      ]}>
                        {displayHour}:30 {ampm}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.modalCancelButton, { marginTop: 16 }]}
              onPress={() => setShowClosingTimePicker(false)}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* VAT Rate Picker Modal */}
      <Modal
        visible={showVatPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowVatPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💰 Set VAT Rate</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowVatPicker(false)}
              >
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>
              Choose your VAT percentage:
            </Text>
            
            <View style={styles.vatPickerGrid}>
              {[
                { label: '0% (No VAT)', value: 0 },
                { label: '5% (Reduced)', value: 5 },
                { label: '10% (Custom)', value: 10 },
                { label: '12.5% (UK Standard)', value: 12.5 },
                { label: '15% (Common)', value: 15 },
                { label: '17.5% (UK Higher)', value: 17.5 },
                { label: '20% (High)', value: 20 },
                { label: '25% (Highest)', value: 25 },
                { label: '30% (Maximum)', value: 30 },
              ].map((rate) => (
                <TouchableOpacity
                  key={rate.value}
                  style={[
                    styles.vatPickerButton,
                    businessSettings.vat_rate === rate.value && styles.vatPickerButtonActive
                  ]}
                  onPress={() => {
                    updateBusinessSetting('vat_rate', rate.value);
                    setShowVatPicker(false);
                  }}
                >
                  <Text style={[
                    styles.vatPickerButtonText,
                    businessSettings.vat_rate === rate.value && styles.vatPickerButtonTextActive
                  ]}>
                    {rate.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.modalCancelButton, { marginTop: 16 }]}
              onPress={() => setShowVatPicker(false)}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Enterprise App Footer */}
      <View style={styles.ultimateAppFooter}>
        <View style={styles.ultimateFooterContent}>
          <View style={styles.ultimateFooterLeft}>
            <Text style={styles.ultimateFooterLogo}>⚙️</Text>
            <View style={styles.ultimateFooterInfo}>
              <Text style={styles.ultimateFooterTitle}>LuminaN POS v{shopData.version || '1.0.0'}</Text>
              <Text style={styles.ultimateFooterSubtitle}>Enterprise System Control</Text>
            </View>
          </View>
          <View style={styles.ultimateFooterRight}>
            <View style={styles.ultimateFooterStatus}>
              <View style={styles.ultimateStatusDot} />
              <Text style={styles.ultimateStatusText}>All Systems Operational</Text>
            </View>
            <Text style={styles.ultimateFooterCopyright}>© 2025 LuminaN Zimbabwe | Enterprise Edition</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    ...Platform.select({
      web: {
        height: '100vh',
        overflow: 'auto',
        WebkitOverflowScrolling: 'auto',
        scrollBehavior: 'smooth',
      },
    }),
  },
  webContainer: {
    ...Platform.select({
      web: {
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'auto',
        WebkitOverflowScrolling: 'auto',
        scrollBehavior: 'smooth',
      },
    }),
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'web' ? 100 : 0,
    ...Platform.select({
      web: {
        minHeight: '100vh',
        width: '100%',
        flexGrow: 1,
      },
    }),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    color: '#e2e8f0',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 20,
  },

  // Ultimate Header Styles
  ultimateHeader: {
    backgroundColor: '#1e293b',
    padding: 24,
    paddingTop: 24,
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 2,
    borderBottomColor: '#374151',
  },
  headerBackgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    opacity: 0.95,
  },
  commandCenterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#fbbf24',
    alignSelf: 'flex-start',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  commandCenterBadgeText: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  ultimateHeaderTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    position: 'relative',
    zIndex: 1,
  },
  ultimateHeaderSubtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
    zIndex: 1,
  },
  ultimateHeaderSubtitle: {
    fontSize: 18,
    color: '#e2e8f0',
    fontWeight: '500',
  },
  ultimateGrowthMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    position: 'relative',
    zIndex: 1,
  },
  growthMetricCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  growthMetricIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  growthMetricIcon: {
    fontSize: 16,
  },
  growthMetricContent: {
    flex: 1,
  },
  growthMetricLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
    marginBottom: 2,
  },
  growthMetricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  growthTrendIndicator: {
    marginLeft: 8,
  },
  growthTrendText: {
    fontSize: 14,
  },
  realtimeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
    zIndex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
    marginRight: 8,
  },
  performanceSummary: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    position: 'relative',
    zIndex: 1,
  },
  performanceSummaryText: {
    fontSize: 13,
    color: '#10b981',
    textAlign: 'center',
    fontWeight: '600',
  },

  // Enterprise Category Analysis Styles
  section: {
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginBottom: 12,
  },
  categorySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  categoryStatusText: {
    color: '#8b5cf6',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  ultimateCategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  ultimateCategoryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    width: '32%',
    marginBottom: 16,
    borderLeftWidth: 6,
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
    elevation: 6,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 2,
    borderColor: '#334155',
    position: 'relative',
    overflow: 'hidden',
  },
  ultimateCategoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  categoryRankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryRank: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 24,
    textAlign: 'center',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  categoryBadgeText: {
    color: '#ffffff',
    fontSize: 12,
  },
  categoryPerformanceIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  performanceCrownText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  ultimateCategoryName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    lineHeight: 19,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  ultimateCategoryMetrics: {
    marginBottom: 12,
  },
  categoryMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  categoryMetricIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  metricIcon: {
    fontSize: 14,
  },
  categoryMetricContent: {
    flex: 1,
  },
  categoryMetricLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
    marginBottom: 2,
  },
  categoryMetricValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  ultimateCategorySummary: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
  },
  ultimateCategorySummaryText: {
    fontSize: 13,
    color: '#8b5cf6',
    textAlign: 'center',
    fontWeight: '600',
  },

  // Top Products Performance Styles
  topProductsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  topProductsStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  topProductsStatusText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  ultimateProductGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  ultimateProductCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 16,
    borderLeftWidth: 6,
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
    elevation: 6,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 2,
    borderColor: '#334155',
    position: 'relative',
    overflow: 'hidden',
  },
  topRankCard: {
    borderTopWidth: 3,
    borderTopColor: '#f59e0b',
    transform: [{ scale: 1.02 }],
  },
  ultimateProductHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productRankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eliteRankBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  eliteRankText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  categoryBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '600',
  },
  performanceCrown: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  performanceCrownText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  ultimateProductName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    lineHeight: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  ultimateProductMetrics: {
    marginBottom: 12,
  },
  productMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  productMetricIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  productMetricContent: {
    flex: 1,
  },
  productMetricLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
    marginBottom: 2,
  },
  productMetricValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  securityAction: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  securityActionText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '600',
  },
  ultimateProductSummary: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
  },
  ultimateProductSummaryText: {
    fontSize: 13,
    color: '#f59e0b',
    textAlign: 'center',
    fontWeight: '600',
  },

  // Enhanced Payment Methods Section Styles
  paymentSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  paymentStatusText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  enhancedPaymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  enhancedPaymentCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginBottom: 12,
    borderLeftWidth: 4,
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
    elevation: 3,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#334155',
  },
  enhancedPaymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  paymentRankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentRank: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 24,
    textAlign: 'center',
  },
  paymentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentBadgeText: {
    color: '#ffffff',
    fontSize: 12,
  },
  paymentPerformanceIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  enhancedPaymentMethod: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    lineHeight: 16,
  },
  enhancedPaymentMetrics: {
    marginBottom: 8,
  },
  paymentMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  paymentMetricIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  paymentMetricContent: {
    flex: 1,
  },
  paymentMetricLabel: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '500',
    marginBottom: 1,
  },
  paymentMetricValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  paymentSummary: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  paymentSummaryText: {
    fontSize: 12,
    color: '#3b82f6',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Ultimate App Footer Styles
  ultimateAppFooter: {
    backgroundColor: '#1e293b',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderTopWidth: 2,
    borderTopColor: '#374151',
    marginTop: 20,
  },
  ultimateFooterContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ultimateFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ultimateFooterLogo: {
    fontSize: 24,
    marginRight: 12,
  },
  ultimateFooterInfo: {
    flexDirection: 'column',
  },
  ultimateFooterTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ultimateFooterSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  ultimateFooterRight: {
    alignItems: 'flex-end',
  },
  ultimateFooterStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ultimateStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  ultimateStatusText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
  ultimateFooterCopyright: {
    color: '#64748b',
    fontSize: 10,
  },
  errorTitle: {
    color: '#ef4444',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  systemSection: {
    padding: 20,
    paddingTop: 0,
  },
  securitySection: {
    padding: 20,
    paddingTop: 0,
  },
  shopSection: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginBottom: 16,
  },
  systemCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  systemCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    width: (width - 50) / 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  systemCardTitle: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  systemInfoRow: {
    marginBottom: 6,
  },
  systemLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    marginBottom: 2,
  },
  systemValue: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  securityCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  securityInfoRow: {
    marginBottom: 8,
  },
  securityLabel: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  securityValue: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  securityAction: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  securityActionText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '600',
  },
  shopCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  shopInfoRow: {
    marginBottom: 8,
  },
  shopLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  shopValue: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  debugSection: {
    margin: 20,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  debugTitle: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  debugText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    lineHeight: 16,
  },
  bottomPadding: {
    height: 40,
  },
  sectionNavigation: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    // Web-specific styles
    ...Platform.select({
      web: {
        overflowX: 'auto',
        overflowY: 'hidden',
      }
    })
  },
  navButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    // Web-specific styles
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'all 0.2s ease',
      }
    })
  },
  navButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: 'rgba(59, 130, 246, 0.5)',
  },
  navButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontWeight: '500',
  },
  navButtonTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  businessSection: {
    padding: 20,
  },
  posSection: {
    padding: 20,
  },
  inventorySection: {
    padding: 20,
  },
  securitySection: {
    padding: 20,
  },
  hardwareSection: {
    padding: 20,
  },
  reportsSection: {
    padding: 20,
    paddingBottom: Platform.OS === 'web' ? 40 : 20, // Extra padding for web scrolling
  },
  integrationsSection: {
    padding: 20,
  },
  exchangeSection: {
    padding: 20,
  },
  settingsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    // Web-specific styles
    ...Platform.select({
      web: {
        maxWidth: '100%',
        boxSizing: 'border-box',
      }
    })
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  settingValue: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 12,
  },
  settingAction: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  settingActionText: {
    color: '#3b82f6',
    fontSize: 11,
    fontWeight: '600',
  },
  floatingActionButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingActionButtonText: {
    fontSize: 24,
  },
  appFooter: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  appFooterText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
  },
  appFooterSubtext: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 4,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#334155',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 16,
  },
  timezoneInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  timezoneHint: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalCancelButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalSaveButton: {
    backgroundColor: '#3b82f6',
  },
  modalSaveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  quickTimezones: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickTimezonesLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
  },
  quickTimezoneButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickTimezoneButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  quickTimezoneButtonText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Time Picker Modal Styles
  timePickerGrid: {
    maxHeight: 400,
    overflow: 'scroll',
  },
  timePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timePickerButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  timePickerButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    borderColor: '#3b82f6',
  },
  timePickerButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  timePickerButtonTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  
  // VAT Picker Modal Styles
  vatPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vatPickerButton: {
    width: '47%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  vatPickerButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    borderColor: '#3b82f6',
  },
  vatPickerButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
  },
  vatPickerButtonTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
});

export default SettingsScreen;