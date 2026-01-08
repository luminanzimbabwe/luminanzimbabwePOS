/**
 * License-First Login Screen - Neural 2080 Theme
 * Users cannot login without a valid license
 * Includes founder password trial system with unlimited license option
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  Dimensions,
  Alert
} from 'react-native';

const { width } = Dimensions.get('window');
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { shopAPI } from '../services/api';
import { shopStorage } from '../services/storage';
import { ROUTES } from '../constants/navigation';
import licenseService from '../services/licenseService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';

const InputField = ({ 
  label, 
  field, 
  icon, 
  placeholder, 
  error, 
  value, 
  onChangeText, 
  onFocus,
  showPasswordToggle = false, 
  isPasswordVisible = false, 
  onTogglePassword, 
  ...props 
}) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label} *</Text>
    <View style={[styles.inputWrapper, error && styles.inputError]}>
      {icon && <View style={styles.inputIcon}>{icon}</View>}
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        secureTextEntry={props.secureTextEntry && !isPasswordVisible}
        autoCorrect={false}
        spellCheck={false}
        {...props}
      />
      {showPasswordToggle && (
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={onTogglePassword}
          activeOpacity={0.7}
        >
          <Icon name={isPasswordVisible ? "visibility-off" : "visibility"} size={20} color="#00f5ff" />
        </TouchableOpacity>
      )}
    </View>
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

const LicenseStatusCard = ({ licenseInfo, onRenew, onManage }) => {
  const getStatusColor = () => {
    if (!licenseInfo) return '#ef4444';
    if (licenseInfo.isExpired) return '#ef4444';
    if (licenseInfo.isExpiringSoon) return '#f59e0b';
    if (licenseInfo.isUnlimited) return '#ff0080';
    return '#22c55e';
  };

  const getStatusText = () => {
    if (!licenseInfo) return 'No License';
    if (licenseInfo.isExpired) return 'Expired';
    if (licenseInfo.isExpiringSoon) return 'Expiring Soon';
    if (licenseInfo.isUnlimited) return 'Unlimited';
    return 'Active';
  };

  const getDaysRemaining = () => {
    if (!licenseInfo) return '0';
    if (licenseInfo.isUnlimited) return 'UNLIMITED';
    return licenseInfo.daysRemaining.toString();
  };

  return (
    <View style={[styles.neuralLicenseCard, { borderColor: getStatusColor() }]}>
      <View style={styles.neuralLicenseHeader}>
        <Icon name="verified-user" size={20} color={getStatusColor()} />
        <Text style={styles.neuralLicenseTitle}>NEURAL LICENSE STATUS</Text>
        <View style={[styles.neuralStatusBadge, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.neuralStatusBadgeText}>{getStatusText()}</Text>
        </View>
      </View>
      
      {licenseInfo && (
        <View style={styles.neuralLicenseDetails}>
          <View style={styles.neuralDetailRow}>
            <Icon name="psychology" size={16} color="#00f5ff" />
            <Text style={styles.neuralDetailLabel}>NEURAL TYPE:</Text>
            <Text style={styles.neuralDetailValue}>
              {licenseInfo.type} {licenseInfo.isFounderTrial ? '(FOUNDER NEURAL)' : ''}
            </Text>
          </View>
          <View style={styles.neuralDetailRow}>
            <Icon name="business-center" size={16} color="#00ff88" />
            <Text style={styles.neuralDetailLabel}>SHOP NODE:</Text>
            <Text style={styles.neuralDetailValue}>{licenseInfo.shopName}</Text>
          </View>
          <View style={styles.neuralDetailRow}>
            <Icon name="schedule" size={16} color="#ffaa00" />
            <Text style={styles.neuralDetailLabel}>NEURAL CYCLES:</Text>
            <Text style={[styles.neuralDetailValue, { color: getStatusColor() }]}>
              {getDaysRemaining()}
            </Text>
          </View>
          <View style={styles.neuralDetailRow}>
            <Icon name="timeline" size={16} color="#ff0080" />
            <Text style={styles.neuralDetailLabel}>EXPIRY STATUS:</Text>
            <Text style={styles.neuralDetailValue}>
              {licenseInfo.isUnlimited ? 'NEVER EXPIRES' : new Date(licenseInfo.expiryDate).toLocaleDateString()}
            </Text>
          </View>
        </View>
      )}
      
      <View style={styles.neuralLicenseActions}>
        {licenseInfo && !licenseInfo.isExpired && !licenseInfo.isUnlimited && (
          <TouchableOpacity style={styles.manageNeuralButton} onPress={onManage}>
            <Icon name="settings" size={16} color="#00f5ff" />
            <Text style={styles.manageNeuralButtonText}>MANAGE NEURAL</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={[styles.renewNeuralButton, !licenseInfo && styles.renewNeuralButtonFull]} 
          onPress={onRenew}
        >
          <Icon name="upgrade" size={16} color="#ffffff" />
          <Text style={styles.renewNeuralButtonText}>
            {licenseInfo ? 'UPGRADE NEURAL' : 'GET NEURAL LICENSE'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const EmergencyRecoveryButton = ({ onRecovery }) => {
  const [loading, setLoading] = useState(false);

  const handleRecovery = async () => {
    setLoading(true);
    try {
      if (onRecovery && typeof onRecovery === 'function') {
        await onRecovery();
      }
    } catch (error) {
      console.error('Recovery failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.emergencyRecoverySection}>
      <View style={styles.emergencyRecoveryHeader}>
        <Icon name="warning" size={20} color="#ff4444" />
        <Text style={styles.emergencyRecoveryTitle}>EMERGENCY NEURAL RECOVERY</Text>
      </View>
      <Text style={styles.emergencyRecoveryDescription}>
        If you're locked out due to neural system issues, this will restore basic shop information.
      </Text>
      <TouchableOpacity 
        style={[styles.emergencyRecoveryButton, loading && styles.emergencyRecoveryButtonDisabled]}
        onPress={handleRecovery}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ff4444" size="small" />
        ) : (
          <>
            <Icon name="build" size={16} color="#ffffff" />
            <Text style={styles.emergencyRecoveryButtonText}>NEURAL SYSTEM RESTORE</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const FounderTrialSection = ({ onActivateTrial }) => {
  const [founderEmail, setFounderEmail] = useState('');
  const [founderPassword, setFounderPassword] = useState('');
  const [showFounderForm, setShowFounderForm] = useState(false);
  const [activationType, setActivationType] = useState('trial'); // 'trial' or 'unlimited'
  const [activating, setActivating] = useState(false);

  const handleActivateTrial = async () => {
    if (!founderEmail.trim() || !founderPassword.trim()) {
      Alert.alert('Neural Error', 'Please enter both email and password.');
      return;
    }

    console.log(`🚀 Starting founder ${activationType} activation...`);
    console.log('📧 Email:', founderEmail);
    console.log('🔑 Password length:', founderPassword.length);
    console.log('🎯 Activation type:', activationType);

    try {
      setActivating(true);
      
      // First, make sure license service is initialized
      console.log('📋 Initializing license service...');
      await licenseService.initialize();
      console.log('✅ License service initialized');
      
      if (activationType === 'trial') {
        console.log('🔍 Attempting founder trial access...');
        const result = await licenseService.attemptFounderTrialAccess(founderEmail, founderPassword);
        console.log('📊 Trial activation result:', result);
        
        if (result.success) {
          console.log('✅ Trial activated successfully!');
          await createFounderShopInfo(founderEmail, founderPassword);
          showSuccessAndRefresh(result.message);
        } else {
          console.log('❌ Trial activation failed:', result.message);
          Alert.alert('Neural Error', result.message || 'Failed to activate trial.');
        }
      } else if (activationType === 'unlimited') {
        console.log('🎆 Attempting founder unlimited license activation...');
        const result = await licenseService.createAndStoreUnlimitedLicense();
        console.log('📊 Unlimited activation result:', result);
        
        await createFounderShopInfo(founderEmail, founderPassword);
        showSuccessAndRefresh(
          '🎆 Unlimited Neural License Activated! You now have permanent access to all features with no expiration date.'
        );
      }
    } catch (error) {
      console.error(`💥 Founder ${activationType} activation error:`, error);
      Alert.alert('Neural Error', `Failed to activate ${activationType} license: ${error.message}. Please try again.`);
    } finally {
      setActivating(false);
    }
  };

  const createFounderShopInfo = async (email, password) => {
    console.log('🏪 Creating shop info for founder...');
    const founderShopInfo = {
      email: email,
      name: 'LuminaN Zimbabwe POS',
      business_type: 'Retail',
      industry: 'Technology',
      shop_id: 'LUMINA_2089_ZIM',
      register_id: 'FOUNDER_TERMINAL',
      device_id: 'FOUNDER_DEVICE_2089',
      owner_id: 'FOUNDER_001',
      api_key: 'LUMINA_FOUNDER_2089_KEY',
      master_password: password,
      version: '2.0.89',
      checksum: 'SHA256_LUMINA_2089_FOUNDER'
    };
    
    try {
      await shopStorage.saveCredentials(founderShopInfo);
      console.log('✅ Shop info created successfully');
    } catch (shopError) {
      console.error('❌ Failed to create shop info:', shopError);
    }
  };

  const showSuccessAndRefresh = (message) => {
    // Clear form and hide founder form
    setShowFounderForm(false);
    setFounderEmail('');
    setFounderPassword('');
    
    // Show success message briefly, then automatically refresh
    Alert.alert(
      'Neural Success!', 
      message,
      [{ text: 'Continue Neural Processing', onPress: () => {
        console.log('🔄 Automatically refreshing license check...');
        onActivateTrial(); // Call the refresh function passed from parent
      }}]
    );
    
    // Also auto-refresh after a short delay in case user doesn't press OK
    setTimeout(() => {
      console.log('🔄 Auto-refreshing license check after delay...');
      onActivateTrial();
    }, 2000);
  };

  if (!showFounderForm) {
    return (
      <View style={styles.founderSection}>
        <View style={styles.founderHeader}>
          <Icon name="military-tech" size={24} color="#ff0080" />
          <Text style={styles.founderTitle}>FOUNDER NEURAL ACCESS</Text>
        </View>
        <Text style={styles.founderDescription}>
          Have founder credentials? Activate unlimited or trial neural license access.
        </Text>
        
        <View style={styles.founderOptions}>
          <TouchableOpacity 
            style={styles.founderUnlimitedButton} 
            onPress={() => {
              setActivationType('unlimited');
              setShowFounderForm(true);
            }}
          >
            <Icon name="library-add" size={24} color="#22c55e" />
            <Text style={styles.founderUnlimitedButtonText}>✨ UNLIMITED NEURAL LICENSE</Text>
            <Text style={styles.founderOptionSubtitle}>Permanent access - No expiration</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.founderTrialButton} 
            onPress={() => {
              setActivationType('trial');
              setShowFounderForm(true);
            }}
          >
            <Icon name="schedule" size={24} color="#3b82f6" />
            <Text style={styles.founderTrialButtonText}>🗓️ 30-DAY NEURAL TRIAL</Text>
            <Text style={styles.founderOptionSubtitle}>Free trial - 30 days access</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.founderSection}>
      <View style={styles.founderHeader}>
        <Icon name={activationType === 'unlimited' ? "library-add" : "schedule"} size={24} color="#ff0080" />
        <Text style={styles.founderTitle}>
          {activationType === 'unlimited' ? '✨ UNLIMITED NEURAL ACTIVATION' : '🗓️ TRIAL NEURAL ACTIVATION'}
        </Text>
      </View>
      <Text style={styles.founderDescription}>
        {activationType === 'unlimited' 
          ? 'Enter your founder credentials to activate unlimited permanent neural access.'
          : 'Enter your founder credentials to activate a free 30-day neural trial.'
        }
      </Text>
      
      <InputField
        label="Founder Neural Email"
        field="founder_email"
        icon={<Icon name="email" size={20} color="#00f5ff" />}
        placeholder="Enter founder email"
        value={founderEmail}
        onChangeText={setFounderEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <InputField
        label="Founder Neural Password"
        field="founder_password"
        icon={<Icon name="lock" size={20} color="#00f5ff" />}
        placeholder="Enter founder password"
        secureTextEntry
        showPasswordToggle
        isPasswordVisible={false}
        onTogglePassword={() => {}}
        value={founderPassword}
        onChangeText={setFounderPassword}
      />
      
      <View style={styles.founderActions}>
        <TouchableOpacity 
          style={[styles.founderActivateButton, activating && styles.founderActivateButtonDisabled]} 
          onPress={handleActivateTrial}
          disabled={activating}
        >
          {activating ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Icon name={activationType === 'unlimited' ? "library-add" : "schedule"} size={16} color="#ffffff" />
              <Text style={styles.founderActivateButtonText}>
                {activationType === 'unlimited' ? 'ACTIVATE UNLIMITED NEURAL' : 'ACTIVATE 30-DAY NEURAL TRIAL'}
              </Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.founderCancelButton} 
          onPress={() => setShowFounderForm(false)}
          disabled={activating}
        >
          <Text style={styles.founderCancelButtonText}>Cancel Neural Access</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const LicenseFirstLoginScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [licenseCheck, setLicenseCheck] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });

  useEffect(() => {
    initializeLicenseCheck();
  }, []);

  const initializeLicenseCheck = async () => {
    try {
      setLoading(true);
      console.log('🔍 Starting neural license check...');
      
      // ALWAYS require license check first - no exceptions
      console.log('📋 Checking for existing neural license...');
      const hasLicense = await shopStorage.hasLicenseData();
      console.log('📄 Neural license data exists:', hasLicense);
      
      if (!hasLicense) {
        console.log('❌ No neural license found - forcing license requirement');
        setLicenseCheck({
          canAccess: false,
          reason: 'NO_LICENSE',
          requiresLicense: true,
          message: 'No neural license found. A valid neural license is required to use this neural application.',
          licenseInfo: null
        });
        setLoading(false);
        return;
      }
      
      // Initialize license service only if license exists
      console.log('📋 Initializing neural license service...');
      await licenseService.initialize();
      console.log('✅ Neural license service initialized');
      
      // Check license status
      console.log('🔍 Checking neural license access...');
      const accessResult = await licenseService.canAccessApp();
      console.log('📊 Neural license check result:', accessResult);
      
      setLicenseCheck(accessResult);
      
    } catch (error) {
      console.error('❌ Neural license check failed:', error);
      // Even if there's an error, set license check to fail so we show license screen
      setLicenseCheck({
        canAccess: false,
        reason: 'INITIALIZATION_ERROR',
        message: 'Failed to initialize neural license system. Neural license required to proceed.',
        error: error.message,
        licenseInfo: null
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputFocus = (field) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleEmergencyRecovery = async () => {
    try {
      setRecoveryLoading(true);
      console.log('🔧 Starting neural emergency recovery...');      
      // Clear any corrupted shop data
      await shopStorage.clearAllData();
      
      // Reinitialize with default shop info for founder
      const defaultShopInfo = {
        email: 'thisismeprivateisaacngirazi@gmail.com',
        name: 'LuminaN Zimbabwe POS',
        business_type: 'Retail',
        industry: 'Technology',
        shop_id: 'LUMINA_2089',
        register_id: 'MAIN_TERMINAL',
        device_id: 'FOUNDER_DEVICE',
        owner_id: 'FOUNDER_001',
        api_key: 'LUMINA_FOUNDER_KEY_2089',
        master_password: 'morrill95@2001',
        version: '2.0.89',
        checksum: 'SHA256_LUMINA_2089'
      };
      
      await shopStorage.saveCredentials(defaultShopInfo);
      console.log('✅ Default neural shop info restored');
      
      // Refresh license check
      await initializeLicenseCheck();
      
      Alert.alert(
        'Neural Recovery Successful!', 
        'Neural shop information has been restored. You can now proceed with your founder neural trial.',
        [{ text: 'Continue Neural Processing', onPress: () => {} }]
      );
      
    } catch (error) {
      console.error('Neural emergency recovery failed:', error);
      Alert.alert(
        'Neural Recovery Failed', 
        'Neural emergency recovery failed. Please contact neural support or try manual reset.'
      );
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleRoleSelect = (role) => {
    if (selectedRole && selectedRole !== role) {
      setFormData({ email: '', password: '', name: '' });
    }
    setSelectedRole(role);
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};
    if (selectedRole === 'owner') {
      if (!formData.email.trim()) newErrors.email = 'Neural email is required';
      if (!formData.password.trim()) newErrors.password = 'Neural master password is required';
    } else if (selectedRole === 'cashier') {
      if (!formData.name.trim()) newErrors.name = 'Neural name is required';
      if (!formData.password.trim()) newErrors.password = 'Neural password is required';
    } else {
      newErrors.general = 'Please select a neural role';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setErrors({});

    try {
      if (selectedRole === 'owner') {
        const response = await shopAPI.loginOwner({ email: formData.email, password: formData.password });
        
        await shopStorage.saveCredentials({
          email: formData.email,
          shop_owner_master_password: formData.password,
          shop_info: response.data.shop
        });
        
        navigation.replace('MainApp');
      } else {
        const response = await shopAPI.loginCashier({ name: formData.name, password: formData.password });
        
        await shopStorage.saveCredentials({
          name: formData.name,
          user_type: 'cashier',
          cashier_info: response.data.cashier_info,
          shop_info: response.data.shop_info || response.data.shop
        });
        
        navigation.replace(ROUTES.CASHIER_DASHBOARD);
      }
    } catch (error) {
      console.error('Neural login error:', error);
      let errorMessage = 'Neural login failed. Please try again.';
      
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'Invalid neural credentials. Please check your neural email/username and password.';
        } else if (error.response.status === 404) {
          errorMessage = 'Neural user not found. Please check your neural credentials or register first.';
        } else if (error.response.data?.error) {
          errorMessage = error.response.data.error;
        } else {
          errorMessage = `Neural server error (${error.response.status}): Please try again later.`;
        }
      } else if (error.request) {
        errorMessage = 'Cannot connect to neural server. Please check your neural internet connection and try again.';
      }
      
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleLicenseRenew = () => {
    navigation.navigate(ROUTES.LICENSE_RENEWAL);
  };

  const handleLicenseManage = () => {
    navigation.navigate(ROUTES.LICENSE_MANAGEMENT);
  };

  // Show neural loading screen
  if (loading) {
    return (
      <View style={styles.neuralContainer}>
        <View style={styles.neuralBackground} />
        <View style={styles.holographicGrid} />
        <View style={styles.neuralLoadingPulse} />
        <View style={styles.neuralCentered}>
          <View style={styles.neuralLoadingGrid} />
          <ActivityIndicator size="large" color="#00f5ff" />
          <Text style={styles.neuralLoadingText}>INITIALIZING NEURAL LICENSE MATRIX...</Text>
        </View>
      </View>
    );
  }

  // Show neural license error
  if (!licenseCheck?.canAccess) {
    return (
      <View style={styles.neuralContainer}>
        <View style={styles.neuralBackground} />
        <View style={styles.holographicGrid} />
        <View style={styles.neuralEnergyPulse} />
        
        <ScrollView 
          contentContainerStyle={styles.neuralScrollContent}
          showsVerticalScrollIndicator={true}
          scrollEventThrottle={16}
          nestedScrollEnabled={Platform.OS === 'web'}
          removeClippedSubviews={false}
        >
          <View style={styles.neuralGlassCard}>
            <View style={styles.neuralHeader}>
              <Icon name="psychology" size={32} color="#ff0080" />
              <Text style={styles.neuralTitle}>🔒 NEURAL LICENSE REQUIRED</Text>
              <Text style={styles.neuralSubtitle}>A valid neural license is required to access the neural application</Text>
            </View>

            <LicenseStatusCard 
              licenseInfo={licenseCheck?.licenseInfo}
              onRenew={handleLicenseRenew}
              onManage={handleLicenseManage}
            />

            {licenseCheck?.reason === 'NO_LICENSE' && (
              <FounderTrialSection onActivateTrial={initializeLicenseCheck} />
            )}
            
            {/* Emergency Neural Recovery Button */}
            {licenseCheck?.reason === 'NO_SHOP_INFO' && (
              <EmergencyRecoveryButton onRecovery={handleEmergencyRecovery} />
            )}

            {errors.general && (
              <View style={styles.neuralErrorBanner}>
                <Icon name="error" size={16} color="#ff4444" />
                <Text style={styles.neuralErrorBannerText}>{errors.general}</Text>
              </View>
            )}

            <View style={styles.neuralInfoSection}>
              <View style={styles.neuralInfoHeader}>
                <Icon name="info" size={16} color="#00f5ff" />
                <Text style={styles.neuralInfoTitle}>How to get neural license:</Text>
              </View>
              <Text style={styles.neuralInfoText}>• <Text style={{color: '#22c55e'}}>✨ Unlimited:</Text> Use founder credentials for permanent neural access</Text>
              <Text style={styles.neuralInfoText}>• <Text style={{color: '#3b82f6'}}>🗓️ Trial:</Text> Use founder credentials for 30-day free neural trial</Text>
              <Text style={styles.neuralInfoText}>• Purchase a monthly or annual neural license</Text>
              <Text style={styles.neuralInfoText}>• Contact neural support for enterprise licensing</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Show normal neural login with license info
  return (
    <KeyboardAvoidingView 
      style={styles.neuralContainer} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.neuralBackground} />
      <View style={styles.holographicGrid} />
      <View style={styles.neuralEnergyPulse} />

      <ScrollView 
        contentContainerStyle={styles.neuralScrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        scrollEventThrottle={16}
        nestedScrollEnabled={Platform.OS === 'web'}
        removeClippedSubviews={false}
      >
        <View style={styles.neuralGlassCard}>
          <View style={styles.neuralHeader}>
            <Icon name="psychology" size={32} color="#00f5ff" />
            <Text style={styles.neuralTitle}>NEURAL WELCOME</Text>
            <Text style={styles.neuralSubtitle}>Sign in to continue neural processing</Text>
          </View>

          {/* Show neural license status at top */}
          {licenseCheck?.licenseInfo && (
            <LicenseStatusCard 
              licenseInfo={licenseCheck.licenseInfo}
              onRenew={handleLicenseRenew}
              onManage={handleLicenseManage}
            />
          )}

          {errors.general && (
            <View style={styles.neuralErrorBanner}>
              <Icon name="error" size={16} color="#ff4444" />
              <Text style={styles.neuralErrorBannerText}>{errors.general}</Text>
            </View>
          )}

          <View style={styles.neuralRoleContainer}>
            <TouchableOpacity
              style={[styles.neuralRoleButton, selectedRole === 'owner' && styles.neuralRoleButtonSelected]}
              onPress={() => handleRoleSelect('owner')}
            >
              <Icon name="military-tech" size={24} color={selectedRole === 'owner' ? "#00f5ff" : "rgba(255,255,255,0.5)"} />
              <Text style={[styles.neuralRoleButtonTitle, selectedRole === 'owner' && styles.neuralRoleButtonTitleSelected]}>
                NEURAL OWNER
              </Text>
              <Text style={[styles.neuralRoleButtonSubtitle, selectedRole === 'owner' && styles.neuralRoleButtonSubtitleSelected]}>
                Full access to all neural features
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.neuralRoleButton, selectedRole === 'cashier' && styles.neuralRoleButtonSelected]}
              onPress={() => handleRoleSelect('cashier')}
            >
              <Icon name="store" size={24} color={selectedRole === 'cashier' ? "#00f5ff" : "rgba(255,255,255,0.5)"} />
              <Text style={[styles.neuralRoleButtonTitle, selectedRole === 'cashier' && styles.neuralRoleButtonTitleSelected]}>
                NEURAL CASHIER
              </Text>
              <Text style={[styles.neuralRoleButtonSubtitle, selectedRole === 'cashier' && styles.neuralRoleButtonSubtitleSelected]}>
                Neural point of sale operations
              </Text>
            </TouchableOpacity>
          </View>

          {selectedRole && (
            <View style={styles.neuralFormContainer}>
              {selectedRole === 'owner' ? (
                <InputField
                  label="Neural Email Address"
                  field="email"
                  icon={<Icon name="email" size={20} color="#00f5ff" />}
                  placeholder="owner@neural.shop"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={formData.email}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                  onFocus={() => handleInputFocus('email')}
                  error={errors.email}
                />
              ) : (
                <InputField
                  label="Neural Name"
                  field="name"
                  icon={<Icon name="person" size={20} color="#00f5ff" />}
                  placeholder="Enter your neural name"
                  value={formData.name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  onFocus={() => handleInputFocus('name')}
                  error={errors.name}
                />
              )}

              <InputField
                label={selectedRole === 'owner' ? 'Neural Master Password' : 'Neural Password'}
                field="password"
                icon={<Icon name="lock" size={20} color="#00f5ff" />}
                placeholder={selectedRole === 'owner' ? 'Enter your neural master password' : 'Enter your neural password'}
                secureTextEntry
                showPasswordToggle
                isPasswordVisible={showPassword}
                onTogglePassword={() => setShowPassword(!showPassword)}
                value={formData.password}
                onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
                onFocus={() => handleInputFocus('password')}
                error={errors.password}
              />

              <TouchableOpacity
                style={[styles.neuralLoginButton, loading && styles.neuralLoginButtonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Icon name="psychology" size={16} color="white" />
                    <Text style={styles.neuralLoginButtonText}>
                      NEURAL SIGN IN AS {selectedRole === 'owner' ? 'OWNER' : 'CASHIER'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  neuralContainer: { 
    flex: 1, 
    backgroundColor: '#0f0f0f',
    position: 'relative',
    overflow: 'hidden',
  },
  neuralBackground: {
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: '#0a0a0a',
  },
  holographicGrid: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    backgroundImage: 'linear-gradient(90deg, rgba(0,245,255,0.1) 1px, transparent 1px), linear-gradient(rgba(0,245,255,0.1) 1px, transparent 1px)',
    backgroundSize: '20px 20px',
    opacity: 0.3,
  },
  neuralEnergyPulse: {
    ...StyleSheet.absoluteFillObject,
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'linear-gradient(90deg, #ff0080, #00f5ff, #00ff88, #ffaa00)',
    background: 'linear-gradient(90deg, #ff0080, #00f5ff, #00ff88, #ffaa00)',
    animation: 'pulse 3s infinite',
  },
  neuralScrollContent: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 8,
    paddingTop: 8,
  },
  neuralCentered: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    position: 'relative',
    zIndex: 10,
  },
  neuralLoadingGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    backgroundImage: 'linear-gradient(90deg, rgba(0,245,255,0.05) 1px, transparent 1px), linear-gradient(rgba(0,245,255,0.05) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
    opacity: 0.2,
  },
  neuralLoadingPulse: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    borderWidth: 2,
    borderColor: '#00f5ff',
    animation: 'pulse 2s infinite',
  },
  neuralLoadingText: { 
    color: '#00f5ff', 
    marginTop: 16, 
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
    textAlign: 'center',
    zIndex: 10,
  },
  
  neuralGlassCard: {
    width: '92%',
    maxWidth: 480,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#00f5ff',
    padding: 8,
    alignSelf: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  neuralHeader: { 
    alignItems: 'center', 
    marginBottom: 12,
  },
  neuralTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#ffffff', 
    marginBottom: 3,
    marginTop: 4,
    letterSpacing: 1,
    textShadowColor: '#00f5ff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  neuralSubtitle: { 
    fontSize: 11, 
    color: 'rgba(255, 255, 255, 0.7)', 
    textAlign: 'center',
    letterSpacing: 1,
  },

  // Neural License Card Styles
  neuralLicenseCard: {
    backgroundColor: 'rgba(0, 245, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 2,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  neuralLicenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  neuralLicenseTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#ffffff',
    flex: 1,
    marginLeft: 8,
    letterSpacing: 1,
  },
  neuralStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  neuralStatusBadgeText: { 
    color: '#ffffff', 
    fontSize: 12, 
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  neuralLicenseDetails: { 
    marginBottom: 16,
  },
  neuralDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  neuralDetailLabel: { 
    fontSize: 11, 
    color: '#00f5ff', 
    marginLeft: 8,
    marginRight: 8,
    letterSpacing: 1,
    minWidth: 100,
    fontWeight: 'bold',
  },
  neuralDetailValue: { 
    fontSize: 12, 
    color: '#ffffff', 
    fontWeight: '500',
    flex: 1,
  },
  neuralLicenseActions: { 
    flexDirection: 'row', 
    gap: 8,
  },
  manageNeuralButton: {
    flex: 1,
    backgroundColor: 'rgba(0, 245, 255, 0.2)',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.4)',
  },
  manageNeuralButtonText: { 
    color: '#00f5ff', 
    fontSize: 11, 
    fontWeight: 'bold',
    marginLeft: 4,
    letterSpacing: 1,
  },
  renewNeuralButton: {
    flex: 1,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  renewNeuralButtonFull: { flex: 1 },
  renewNeuralButtonText: { 
    color: '#22c55e', 
    fontSize: 11, 
    fontWeight: 'bold',
    marginLeft: 4,
    letterSpacing: 1,
  },

  // Neural Founder Section
  founderSection: {
    backgroundColor: 'rgba(255, 0, 128, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 0, 128, 0.3)',
    position: 'relative',
    overflow: 'hidden',
  },
  founderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  founderTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#ff0080', 
    marginLeft: 8,
    letterSpacing: 2,
    textAlign: 'center',
  },
  founderDescription: { 
    fontSize: 12, 
    color: 'rgba(255, 255, 255, 0.7)', 
    marginBottom: 20, 
    textAlign: 'center',
    lineHeight: 18,
  },
  
  // Neural Founder Options
  founderOptions: {
    gap: 16,
    marginTop: 8,
  },
  founderUnlimitedButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.4)',
    position: 'relative',
    overflow: 'hidden',
  },
  founderUnlimitedButtonText: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
    letterSpacing: 1,
    textAlign: 'center',
  },
  founderTrialButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    position: 'relative',
    overflow: 'hidden',
  },
  founderTrialButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
    letterSpacing: 1,
    textAlign: 'center',
  },
  founderOptionSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    textAlign: 'center',
    letterSpacing: 1,
  },
  
  founderActions: { 
    flexDirection: 'row', 
    gap: 12, 
    marginTop: 20,
  },
  founderActivateButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 0, 128, 0.8)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 128, 0.6)',
  },
  founderActivateButtonDisabled: {
    backgroundColor: 'rgba(255, 0, 128, 0.5)',
  },
  founderActivateButtonText: { 
    color: '#ffffff', 
    fontSize: 11, 
    fontWeight: 'bold',
    marginLeft: 6,
    letterSpacing: 1,
  },
  founderCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  founderCancelButtonText: { 
    color: '#ffffff', 
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  // Neural Form Styles
  neuralRoleContainer: { 
    gap: 16, 
    marginBottom: 24,
  },
  neuralRoleButton: {
    backgroundColor: 'rgba(0, 245, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'rgba(0, 245, 255, 0.2)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  neuralRoleButtonSelected: {
    backgroundColor: 'rgba(0, 245, 255, 0.2)',
    borderColor: '#00f5ff',
    borderWidth: 2,
  },
  neuralRoleButtonTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 8,
    letterSpacing: 1,
  },
  neuralRoleButtonTitleSelected: { 
    color: '#ffffff' 
  },
  neuralRoleButtonSubtitle: { 
    fontSize: 12, 
    color: 'rgba(255, 255, 255, 0.4)', 
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 16,
  },
  neuralRoleButtonSubtitleSelected: { 
    color: 'rgba(255, 255, 255, 0.7)' 
  },

  neuralFormContainer: { 
    marginTop: 20 
  },
  inputContainer: { 
    marginBottom: 16 
  },
  inputLabel: { 
    fontSize: 13, 
    color: '#00f5ff', 
    marginBottom: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)',
  },
  inputError: { 
    borderColor: '#ff4444',
    borderWidth: 2,
  },
  inputIcon: { 
    marginRight: 8 
  },
  input: { 
    flex: 1, 
    color: '#ffffff', 
    fontSize: 14 
  },
  eyeButton: { 
    padding: 8 
  },
  errorText: { 
    color: '#ff4444', 
    fontSize: 11, 
    marginTop: 4,
    letterSpacing: 1,
  },

  neuralLoginButton: {
    backgroundColor: 'rgba(0, 245, 255, 0.8)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#00f5ff',
  },
  neuralLoginButtonDisabled: { 
    opacity: 0.5 
  },
  neuralLoginButtonText: { 
    color: '#ffffff', 
    fontSize: 14, 
    fontWeight: 'bold',
    marginLeft: 8,
    letterSpacing: 1,
  },

  neuralErrorBanner: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  neuralErrorBannerText: { 
    color: '#ff4444', 
    fontSize: 12, 
    marginLeft: 8,
    flex: 1,
    letterSpacing: 1,
  },

  neuralInfoSection: {
    backgroundColor: 'rgba(0, 245, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
  },
  neuralInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  neuralInfoTitle: { 
    fontSize: 12, 
    fontWeight: 'bold', 
    color: '#00f5ff', 
    marginLeft: 6,
    letterSpacing: 1,
  },
  neuralInfoText: { 
    fontSize: 11, 
    color: 'rgba(255, 255, 255, 0.6)', 
    marginBottom: 4,
    lineHeight: 16,
    letterSpacing: 0.5,
  },

  // Emergency Neural Recovery Styles
  emergencyRecoverySection: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 68, 68, 0.5)',
    alignItems: 'center',
  },
  emergencyRecoveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emergencyRecoveryTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#ff4444', 
    marginLeft: 8,
    letterSpacing: 1,
    textAlign: 'center'
  },
  emergencyRecoveryDescription: { 
    fontSize: 12, 
    color: 'rgba(255, 255, 255, 0.7)', 
    textAlign: 'center', 
    marginBottom: 16,
    lineHeight: 16,
  },
  emergencyRecoveryButton: {
    backgroundColor: '#ff4444',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    minWidth: 200,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  emergencyRecoveryButtonDisabled: {
    backgroundColor: '#666',
  },
  emergencyRecoveryButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
    letterSpacing: 1,
  },
});

export default LicenseFirstLoginScreen;