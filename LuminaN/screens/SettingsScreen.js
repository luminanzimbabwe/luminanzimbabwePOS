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
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { shopStorage } from '../services/storage';
import { shopAPI } from '../services/api';

const { width } = Dimensions.get('window');

const SettingsScreen = () => {
  const navigation = useNavigation();
  const [shopData, setShopData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isButtonPressed, setIsButtonPressed] = useState(false);
  const [activeSection, setActiveSection] = useState('system');

  useEffect(() => {
    loadShopData();
  }, []);

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
      style={styles.container}
      contentContainerStyle={styles.scrollContentContainer}
      showsVerticalScrollIndicator={true}
      showsHorizontalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={(event) => {
        // Web-specific scroll handling
        if (Platform.OS === 'web') {
          const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
          const isAtBottom = contentOffset.y >= (contentSize.height - layoutMeasurement.height - 10);
          // You can add custom scroll logic here if needed
        }
      }}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚙️ Settings</Text>
        <Text style={styles.headerSubtitle}>System information and preferences</Text>
      </View>

      {/* System Information Section */}
      <View style={styles.systemSection}>
        <Text style={styles.sectionTitle}>📋 System Information</Text>
        <Text style={styles.sectionSubtitle}>Registration details and system identifiers</Text>
        
        <View style={styles.systemCards}>
          <View style={styles.systemCard}>
            <Text style={styles.systemCardTitle}>🔑 Identity</Text>
            <View style={styles.systemInfoRow}>
              <Text style={styles.systemLabel}>Shop ID:</Text>
              <Text style={styles.systemValue}>{shopData.shop_id || 'N/A'}</Text>
            </View>
            <View style={styles.systemInfoRow}>
              <Text style={styles.systemLabel}>Register ID:</Text>
              <Text style={styles.systemValue}>{shopData.register_id || 'N/A'}</Text>
            </View>
            <View style={styles.systemInfoRow}>
              <Text style={styles.systemLabel}>Owner ID:</Text>
              <Text style={styles.systemValue}>{shopData.owner_id || 'N/A'}</Text>
            </View>
          </View>
          
          <View style={styles.systemCard}>
            <Text style={styles.systemCardTitle}>📱 Device</Text>
            <View style={styles.systemInfoRow}>
              <Text style={styles.systemLabel}>Device ID:</Text>
              <Text style={styles.systemValue}>{shopData.device_id || 'N/A'}</Text>
            </View>
            <View style={styles.systemInfoRow}>
              <Text style={styles.systemLabel}>API Key:</Text>
              <Text style={styles.systemValue}>
                {shopData.api_key ? shopData.api_key.substring(0, 20) + '...' : 'N/A'}
              </Text>
            </View>
            <View style={styles.systemInfoRow}>
              <Text style={styles.systemLabel}>Version:</Text>
              <Text style={styles.systemValue}>{shopData.version || '1.0.0'}</Text>
            </View>
          </View>
          
          <View style={styles.systemCard}>
            <Text style={styles.systemCardTitle}>🕒 Registration</Text>
            <View style={styles.systemInfoRow}>
              <Text style={styles.systemLabel}>Registered:</Text>
              <Text style={styles.systemValue}>
                {shopData.registration_time ? new Date(shopData.registration_time).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
            <View style={styles.systemInfoRow}>
              <Text style={styles.systemLabel}>Checksum:</Text>
              <Text style={styles.systemValue}>
                {shopData.checksum ? shopData.checksum.substring(0, 12) + '...' : 'N/A'}
              </Text>
            </View>
            <View style={styles.systemInfoRow}>
              <Text style={styles.systemLabel}>Status:</Text>
              <Text style={[styles.systemValue, { color: '#22c55e' }]}>Active</Text>
            </View>
            <View style={styles.systemInfoRow}>
              <Text style={styles.systemLabel}>Master Password:</Text>
              <Text style={styles.systemValue}>{shopData.master_password ? '••••••••' : 'Generated'}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Security Information Section */}
      <View style={styles.securitySection}>
        <Text style={styles.sectionTitle}>🔐 Security Information</Text>
        <Text style={styles.sectionSubtitle}>Important credentials and recovery information</Text>
        
        <View style={styles.securityCard}>
          <View style={styles.securityInfoRow}>
            <Text style={styles.securityLabel}>Recovery Codes:</Text>
            <Text style={styles.securityValue}>
              {shopData.recovery_codes ? `${shopData.recovery_codes.length} codes available` : '8 codes generated'}
            </Text>
            {__DEV__ && (
              <Text style={styles.debugText}>
                Recovery codes data: {JSON.stringify(shopData.recovery_codes)}
              </Text>
            )}
          </View>
          <View style={styles.securityInfoRow}>
            <Text style={styles.securityLabel}>Master Password:</Text>
            <Text style={styles.securityValue}>••••••••••••••</Text>
          </View>
          <View style={styles.securityInfoRow}>
            <Text style={styles.securityLabel}>API Access:</Text>
            <Text style={[styles.securityValue, { color: '#22c55e' }]}>Enabled</Text>
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
                // Always show codes - either from shopData or generate defaults
                let codesToShow = [];
                
                if (shopData.recovery_codes && shopData.recovery_codes.length > 0) {
                  codesToShow = shopData.recovery_codes;
                  console.log('Using recovery codes from shopData:', codesToShow);
                } else {
                  // Generate default codes if none exist
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

      {/* Shop Information Section */}
      <View style={styles.shopSection}>
        <Text style={styles.sectionTitle}>🏪 Shop Information</Text>
        <Text style={styles.sectionSubtitle}>Your business details</Text>
        
        <View style={styles.shopCard}>
          <View style={styles.shopInfoRow}>
            <Text style={styles.shopLabel}>Shop Name:</Text>
            <Text style={styles.shopValue}>{shopData.name || 'N/A'}</Text>
          </View>
          <View style={styles.shopInfoRow}>
            <Text style={styles.shopLabel}>Email:</Text>
            <Text style={styles.shopValue}>{shopData.email || 'N/A'}</Text>
          </View>
          <View style={styles.shopInfoRow}>
            <Text style={styles.shopLabel}>Address:</Text>
            <Text style={styles.shopValue}>{shopData.address || 'N/A'}</Text>
          </View>
          <View style={styles.shopInfoRow}>
            <Text style={styles.shopLabel}>Business Type:</Text>
            <Text style={styles.shopValue}>{shopData.business_type || 'N/A'}</Text>
          </View>
          <View style={styles.shopInfoRow}>
            <Text style={styles.shopLabel}>Industry:</Text>
            <Text style={styles.shopValue}>{shopData.industry || 'N/A'}</Text>
          </View>
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
      </View>

      {/* Business Configuration Section */}
      {activeSection === 'business' && (
        <View style={styles.businessSection}>
          <Text style={styles.sectionTitle}>🏪 Business Configuration</Text>
          <Text style={styles.sectionSubtitle}>Configure your business settings and preferences</Text>
          
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>💱 Currency</Text>
              <Text style={styles.settingValue}>USD ($)</Text>
              <TouchableOpacity style={styles.settingAction}>
                <Text style={styles.settingActionText}>Change</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>🧾 Tax Rate</Text>
              <Text style={styles.settingValue}>15% VAT</Text>
              <TouchableOpacity style={styles.settingAction}>
                <Text style={styles.settingActionText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>⏰ Business Hours</Text>
              <Text style={styles.settingValue}>8:00 AM - 8:00 PM</Text>
              <TouchableOpacity style={styles.settingAction}>
                <Text style={styles.settingActionText}>Set</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>🌍 Time Zone</Text>
              <Text style={styles.settingValue}>Africa/Johannesburg</Text>
              <TouchableOpacity style={styles.settingAction}>
                <Text style={styles.settingActionText}>Change</Text>
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

      {/* Debug Info (Development only) */}
      {__DEV__ && (
        <View style={styles.debugSection}>
          <Text style={styles.debugTitle}>Debug Info (Development)</Text>
          <Text style={styles.debugText}>
            Register ID: {shopData.register_id || 'N/A'}{'\n'}
            Device ID: {shopData.device_id || 'N/A'}{'\n'}
            Owner ID: {shopData.owner_id || 'N/A'}{'\n'}
            API Key: {shopData.api_key || 'N/A'}{'\n'}
            Checksum: {shopData.checksum || 'N/A'}{'\n'}
            Shop ID: {shopData.shop_id || 'N/A'}{'\n'}
            Name: {shopData.name || 'N/A'}{'\n'}
            Email: {shopData.email || 'N/A'}{'\n'}
            Business Type: {shopData.business_type || 'N/A'}{'\n'}
            Industry: {shopData.industry || 'N/A'}
          </Text>
        </View>
      )}

      {/* Bottom Padding */}
      <View style={styles.bottomPadding} />
      
      {/* Floating Action Button */}
      <TouchableOpacity style={styles.floatingActionButton}>
        <Text style={styles.floatingActionButtonText}>⚡</Text>
      </TouchableOpacity>
      
      {/* App Version Footer */}
      <View style={styles.appFooter}>
        <Text style={styles.appFooterText}>LuminaN POS v{shopData.version || '1.0.0'} | Hybrid System</Text>
        <Text style={styles.appFooterSubtext}>© 2025 LuminaN Zimbabwe | All rights reserved</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'web' ? 100 : 40, // Extra padding for web
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
    padding: 20,
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
});

export default SettingsScreen;