// Enhanced Offline-First Login Screen with Cloud Registration Support
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
  Alert,
  NetInfo
} from 'react-native';

const { width } = Dimensions.get('window');
import { useNavigation } from '@react-navigation/native';
import { shopAPI } from '../services/api';
import { shopStorage } from '../services/storage';
import { ROUTES } from '../constants/navigation';
import LocalDatabaseService from '../services/localDatabase';

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
          <Text style={styles.eyeIcon}>
            {isPasswordVisible ? '🙈' : '👁️'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

const StatusCard = ({ type, title, message, onPress, showAction = false }) => {
  const getStyles = () => {
    switch (type) {
      case 'no_shop':
        return {
          container: [styles.statusCard, styles.noShopCard],
          title: styles.noShopTitle,
          message: styles.noShopMessage,
          button: styles.registerButton,
          buttonText: styles.registerButtonText
        };
      case 'has_shop':
        return {
          container: [styles.statusCard, styles.hasShopCard],
          title: styles.hasShopTitle,
          message: styles.hasShopMessage,
          button: styles.loginButton,
          buttonText: styles.loginButtonText
        };
      default:
        return {
          container: styles.statusCard,
          title: styles.statusTitle,
          message: styles.statusMessage,
          button: styles.actionButton,
          buttonText: styles.actionButtonText
        };
    }
  };

  const styles = getStyles();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {showAction && onPress && (
        <TouchableOpacity style={styles.button} onPress={onPress}>
          <Text style={styles.buttonText}>
            {type === 'no_shop' ? 'Register Shop Using Cloud' : 'Continue to Login'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const CloudRegistrationForm = ({ 
  formData, 
  setFormData, 
  errors, 
  setErrors, 
  loading, 
  onSubmit,
  onCancel 
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateCloudRegistration = () => {
    const newErrors = {};
    
    if (!formData.shop_name?.trim()) newErrors.shop_name = 'Shop name is required';
    if (!formData.email?.trim()) newErrors.email = 'Email is required';
    if (!formData.phone?.trim()) newErrors.phone = 'Phone is required';
    if (!formData.address?.trim()) newErrors.address = 'Address is required';
    if (!formData.password?.trim()) newErrors.password = 'Password is required';
    if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
    }
    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateCloudRegistration()) {
      onSubmit();
    }
  };

  return (
    <View style={styles.cloudRegistrationContainer}>
      <Text style={styles.cloudRegistrationTitle}>Register New Shop Using Cloud</Text>
      <Text style={styles.cloudRegistrationSubtitle}>
        Create a shop account in the cloud and sync to this device
      </Text>

      <View style={styles.formContainer}>
        <InputField
          label="Shop Name"
          field="shop_name"
          icon={<Text style={styles.iconText}>🏪</Text>}
          placeholder="Enter your shop name"
          value={formData.shop_name}
          onChangeText={(text) => setFormData(prev => ({ ...prev, shop_name: text }))}
          onFocus={() => handleInputFocus('shop_name', setErrors)}
          error={errors.shop_name}
        />

        <InputField
          label="Email"
          field="email"
          icon={<Text style={styles.iconText}>✉️</Text>}
          placeholder="shop@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={formData.email}
          onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
          onFocus={() => handleInputFocus('email', setErrors)}
          error={errors.email}
        />

        <InputField
          label="Phone"
          field="phone"
          icon={<Text style={styles.iconText}>📞</Text>}
          placeholder="+1234567890"
          keyboardType="phone-pad"
          value={formData.phone}
          onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
          onFocus={() => handleInputFocus('phone', setErrors)}
          error={errors.phone}
        />

        <InputField
          label="Address"
          field="address"
          icon={<Text style={styles.iconText}>📍</Text>}
          placeholder="Enter your shop address"
          value={formData.address}
          onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
          onFocus={() => handleInputFocus('address', setErrors)}
          error={errors.address}
        />

        <InputField
          label="Password"
          field="password"
          icon={<Text style={styles.iconText}>🔒</Text>}
          placeholder="Create a password"
          secureTextEntry
          showPasswordToggle
          isPasswordVisible={showPassword}
          onTogglePassword={() => setShowPassword(!showPassword)}
          value={formData.password}
          onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
          onFocus={() => handleInputFocus('password', setErrors)}
          error={errors.password}
        />

        <InputField
          label="Confirm Password"
          field="confirm_password"
          icon={<Text style={styles.iconText}>🔒</Text>}
          placeholder="Confirm your password"
          secureTextEntry
          showPasswordToggle
          isPasswordVisible={showConfirmPassword}
          onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
          value={formData.confirm_password}
          onChangeText={(text) => setFormData(prev => ({ ...prev, confirm_password: text }))}
          onFocus={() => handleInputFocus('confirm_password', setErrors)}
          error={errors.confirm_password}
        />

        <View style={styles.cloudRegistrationButtons}>
          <TouchableOpacity
            style={[styles.cloudRegisterButton, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.cloudRegisterButtonText}>
                Register Shop & Sync to Device
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const handleInputFocus = (field, setErrors) => {
  setErrors(prev => ({ ...prev, [field]: undefined }));
};

const LoginScreen = () => {
  const navigation = useNavigation();
  const [selectedRole, setSelectedRole] = useState(
    navigation.getState()?.routes?.[navigation.getState().index]?.params?.role === 'cashier' ? 'cashier' : null
  );
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [appStatus, setAppStatus] = useState('checking'); // 'checking', 'no_shop', 'has_shop', 'registering'
  const [isOnline, setIsOnline] = useState(true);
  const [shopInfo, setShopInfo] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    // Cloud registration fields
    shop_name: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirm_password: '',
  });

  // Check if shop exists in local database on component mount
  useEffect(() => {
    checkLocalShopStatus();
    checkNetworkStatus();
  }, []);

  const checkNetworkStatus = async () => {
    try {
      const netInfo = await NetInfo.fetch();
      setIsOnline(netInfo.isConnected && netInfo.isInternetReachable);
    } catch (error) {
      console.log('Network status check failed:', error);
      setIsOnline(true); // Assume online if check fails
    }
  };

  const checkLocalShopStatus = async () => {
    try {
      console.log('🔍 Checking local shop status...');
      await LocalDatabaseService.initialize();
      
      const shops = await LocalDatabaseService.select('shops', '1=1');
      
      if (shops.length > 0) {
        console.log('✅ Shop found in local database');
        setShopInfo(shops[0]);
        setAppStatus('has_shop');
      } else {
        console.log('❌ No shop found in local database');
        setAppStatus('no_shop');
      }
    } catch (error) {
      console.error('❌ Error checking local shop status:', error);
      setAppStatus('no_shop');
    }
  };

  const handleCloudRegistration = async () => {
    setAppStatus('registering');
  };

  const handleCloudRegistrationSubmit = async () => {
    setLoading(true);
    setErrors({});

    try {
      console.log('🌐 Registering shop in cloud...');
      
      // Register shop in cloud
      const registrationData = {
        name: formData.shop_name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        business_type: 'Retail',
        industry: 'General',
        shop_owner_master_password: formData.password
      };

      const response = await shopAPI.registerShop(registrationData);
      
      if (response.success) {
        console.log('✅ Shop registered in cloud successfully');
        
        // Now sync shop data to local database
        console.log('📥 Syncing shop data to local database...');
        
        await LocalDatabaseService.insert('shops', {
          server_id: response.data.shop_id,
          name: formData.shop_name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          business_type: 'Retail',
          industry: 'General',
          registered_at: new Date().toISOString(),
          is_active: 1
        });

        console.log('✅ Shop data synced to local database');
        
        // Update app status
        setShopInfo({
          name: formData.shop_name,
          email: formData.email
        });
        setAppStatus('has_shop');
        
        Alert.alert(
          'Success!',
          'Your shop has been registered and synced to this device. You can now use the app offline.',
          [{ text: 'Continue', onPress: () => {} }]
        );
      }
    } catch (error) {
      console.error('❌ Cloud registration failed:', error);
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.response) {
        if (error.response.status === 400) {
          errorMessage = error.response.data.error || 'Registration data is invalid';
        } else if (error.response.status === 409) {
          errorMessage = 'A shop with this email already exists';
        } else {
          errorMessage = `Server error: ${error.response.status}`;
        }
      } else if (error.request) {
        errorMessage = 'Cannot connect to server. Please check your internet connection.';
      }
      
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!selectedRole) {
      setErrors({ general: 'Please select a role' });
      return;
    }

    if (selectedRole === 'cashier' && !formData.name.trim()) {
      setErrors({ name: 'Name is required' });
      return;
    }

    if (!formData.password.trim()) {
      setErrors({ password: 'Password is required' });
      return;
    }

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
      console.error('Login error:', error);
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'Invalid credentials. Please check your details.';
        } else if (error.response.status === 404) {
          errorMessage = 'User not found. Please check your credentials.';
        } else if (error.response.data?.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error.request) {
        errorMessage = 'Cannot connect to server. Please check your internet connection.';
      }
      
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // Render based on app status
  const renderContent = () => {
    switch (appStatus) {
      case 'checking':
        return (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.checkingText}>Checking local shop data...</Text>
          </View>
        );

      case 'no_shop':
        return (
          <StatusCard
            type="no_shop"
            title="No Shop Registered"
            message={
              isOnline 
                ? "This device doesn't have a shop registered. You can register a new shop using our cloud service and sync it to this device."
                : "This device doesn't have a shop registered. Please connect to the internet to register a new shop."
            }
            onPress={isOnline ? handleCloudRegistration : null}
            showAction={isOnline}
          />
        );

      case 'registering':
        return (
          <CloudRegistrationForm
            formData={formData}
            setFormData={setFormData}
            errors={errors}
            setErrors={setErrors}
            loading={loading}
            onSubmit={handleCloudRegistrationSubmit}
            onCancel={() => setAppStatus('no_shop')}
          />
        );

      case 'has_shop':
        return (
          <View style={styles.mainContent}>
            <StatusCard
              type="has_shop"
              title={`Welcome to ${shopInfo?.name || 'Your Shop'}`}
              message="Shop is registered on this device. Please select your role to continue."
              showAction={true}
              onPress={() => {}}
            />

            {selectedRole && (
              <View style={styles.formContainer}>
                {selectedRole === 'owner' ? (
                  <InputField
                    label="Email Address"
                    field="email"
                    icon={<Text style={styles.iconText}>✉️</Text>}
                    placeholder="owner@shop.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={formData.email}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                    onFocus={() => handleInputFocus('email', setErrors)}
                    error={errors.email}
                  />
                ) : (
                  <InputField
                    label="Name"
                    field="name"
                    icon={<Text style={styles.iconText}>👤</Text>}
                    placeholder="Enter your name"
                    value={formData.name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                    onFocus={() => handleInputFocus('name', setErrors)}
                    error={errors.name}
                  />
                )}

                <InputField
                  label={selectedRole === 'owner' ? 'Master Password' : 'Password'}
                  field="password"
                  icon={<Text style={styles.iconText}>🔒</Text>}
                  placeholder={selectedRole === 'owner' ? 'Enter your master password' : 'Enter your password'}
                  secureTextEntry
                  showPasswordToggle
                  isPasswordVisible={showPassword}
                  onTogglePassword={() => setShowPassword(!showPassword)}
                  value={formData.password}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
                  onFocus={() => handleInputFocus('password', setErrors)}
                  error={errors.password}
                />

                <TouchableOpacity
                  style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.loginButtonText}>
                      Sign In as {selectedRole === 'owner' ? 'Owner' : 'Cashier'}
                    </Text>
                  )}
                </TouchableOpacity>

                {errors.general && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorBannerText}>{errors.general}</Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.roleContainer}>
              <TouchableOpacity
                style={[styles.roleButton, selectedRole === 'owner' && styles.roleButtonSelected]}
                onPress={() => setSelectedRole('owner')}
              >
                <Text style={[styles.roleButtonTitle, selectedRole === 'owner' && styles.roleButtonTitleSelected]}>
                  Owner
                </Text>
                <Text style={[styles.roleButtonSubtitle, selectedRole === 'owner' && styles.roleButtonSubtitleSelected]}>
                  Full access to all features
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleButton, selectedRole === 'cashier' && styles.roleButtonSelected]}
                onPress={() => setSelectedRole('cashier')}
              >
                <Text style={[styles.roleButtonTitle, selectedRole === 'cashier' && styles.roleButtonTitleSelected]}>
                  Cashier
                </Text>
                <Text style={[styles.roleButtonSubtitle, selectedRole === 'cashier' && styles.roleButtonSubtitleSelected]}>
                  Point of sale operations
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const isWeb = Platform.OS === 'web';
  
  if (isWeb) {
    return (
      <View style={styles.container}>
        <View style={styles.background} />
        <View style={styles.gradient} />
        <div style={styles.webScrollContainer}>
          <div style={styles.webCardContainer}>
            <View style={styles.glassCardWeb}>
              <View style={styles.header}>
                <Text style={styles.title}>Welcome</Text>
                <Text style={styles.subtitle}>Offline-First POS System</Text>
              </View>
              <div style={styles.webScrollableContent}>
                {renderContent()}
              </div>
            </View>
          </div>
        </div>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.background} />
      <View style={styles.gradient} />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.glassCard}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome</Text>
            <Text style={styles.subtitle}>Offline-First POS System</Text>
          </View>
          {renderContent()}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  background: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0f0f0f' },
  gradient: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20, 20, 20, 0.8)' },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  checkingText: { color: '#ffffff', marginTop: 16, fontSize: 16 },

  // Web-specific styles
  webScrollContainer: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
    minHeight: '100vh',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  webCardContainer: {
    width: '100%',
    maxWidth: 500,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassCardWeb: {
    width: '100%',
    maxWidth: 450,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 24,
    marginBottom: 20,
  },
  webScrollableContent: {
    maxHeight: '80vh',
    overflowY: 'auto',
    overflowX: 'hidden',
  },

  // Status Cards
  statusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  noShopCard: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  hasShopCard: {
    borderColor: 'rgba(34, 197, 94, 0.3)',
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
  },
  noShopTitle: { color: '#ef4444', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  hasShopTitle: { color: '#22c55e', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  noShopMessage: { color: '#fca5a5', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  hasShopMessage: { color: '#86efac', fontSize: 14, textAlign: 'center', marginBottom: 16 },

  // Cloud Registration
  cloudRegistrationContainer: { width: '100%' },
  cloudRegistrationTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  cloudRegistrationSubtitle: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 14, textAlign: 'center', marginBottom: 20 },

  // Main Content
  mainContent: { width: '100%' },
  glassCard: {
    width: '90%',
    maxWidth: 420,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    alignSelf: 'center',
  },
  header: { alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#ffffff', marginBottom: 6 },
  subtitle: { fontSize: 14, color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center' },

  // Forms
  formContainer: { marginTop: 20 },
  inputContainer: { marginBottom: 12 },
  inputLabel: { fontSize: 13, color: '#fff', marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  inputError: { borderColor: '#ef4444' },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, color: '#ffffff', fontSize: 14 },
  eyeButton: { padding: 4 },
  eyeIcon: { fontSize: 16 },
  errorText: { color: '#ef4444', fontSize: 11, marginTop: 3 },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorBannerText: { color: '#ef4444', fontSize: 12, textAlign: 'center' },

  // Buttons
  roleContainer: { gap: 10, marginTop: 20 },
  roleButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 14,
  },
  roleButtonSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  roleButtonTitle: { fontSize: 16, fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.5)' },
  roleButtonTitleSelected: { color: '#ffffff' },
  roleButtonSubtitle: { fontSize: 12, color: 'rgba(255, 255, 255, 0.4)' },
  roleButtonSubtitleSelected: { color: 'rgba(255, 255, 255, 0.7)' },

  loginButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  registerButton: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  cloudRegisterButton: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    flex: 1,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  cloudRegistrationButtons: {
    flexDirection: 'row',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.5 },
  loginButtonText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  registerButtonText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  cloudRegisterButtonText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  cancelButtonText: { color: '#ffffff', fontSize: 14 },

  iconText: { fontSize: 14 },
});

export default LoginScreen;