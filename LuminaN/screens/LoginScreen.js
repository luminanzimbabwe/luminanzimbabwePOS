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
  Dimensions
} from 'react-native';

const { width } = Dimensions.get('window');
import { useNavigation } from '@react-navigation/native';
import { shopAPI } from '../services/api';
import { shopStorage } from '../services/storage';
import { ROUTES } from '../constants/navigation';

/**
 * FIXED: Moved helper components outside the main function.
 * This prevents re-creation on every state change (keystroke).
 */
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

const RoleButton = ({ role, title, subtitle, isSelected, onPress }) => (
  <TouchableOpacity
    style={[styles.roleButton, isSelected && styles.roleButtonSelected]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Text style={[styles.roleButtonTitle, isSelected && styles.roleButtonTitleSelected]}>
      {title}
    </Text>
    <Text style={[styles.roleButtonSubtitle, isSelected && styles.roleButtonSubtitleSelected]}>
      {subtitle}
    </Text>
  </TouchableOpacity>
);

const LoginScreen = () => {
  const navigation = useNavigation();
  const [selectedRole, setSelectedRole] = useState(
    navigation.getState()?.routes?.[navigation.getState().index]?.params?.role === 'cashier' ? 'cashier' : null
  );
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });
  const [showDebug, setShowDebug] = useState(false);

  const handleInputFocus = (field) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
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
      if (!formData.email.trim()) newErrors.email = 'Email is required';
      if (!formData.password.trim()) newErrors.password = 'Password is required';
    } else if (selectedRole === 'cashier') {
      if (!formData.name.trim()) newErrors.name = 'Name is required';
      if (!formData.password.trim()) newErrors.password = 'Password is required';
    } else {
      newErrors.general = 'Please select a role';
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
        
        // Save owner credentials for staff management
        await shopStorage.saveCredentials({
          email: formData.email,
          shop_owner_master_password: formData.password,
          shop_info: response.data.shop
        });
        
        console.log('Owner credentials saved for staff management');
        
        // Navigate to main app with tab navigation for owners
        navigation.replace('MainApp');
      } else {
        // Cashier login
        const response = await shopAPI.loginCashier({ name: formData.name, password: formData.password });
        
        // Save cashier credentials - FIXED to include cashier_info with ID
        await shopStorage.saveCredentials({
          name: formData.name,
          user_type: 'cashier',
          cashier_info: response.data.cashier_info, // This contains the ID!
          shop_info: response.data.shop_info || response.data.shop
        });
        
        console.log('Cashier logged in successfully');
        
        // Navigate to cashier dashboard
        navigation.replace(ROUTES.CASHIER_DASHBOARD);
      }
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.response) {
        // Server responded with error status
        if (error.response.status === 401) {
          errorMessage = 'Invalid credentials. Please check your email/username and password.';
        } else if (error.response.status === 404) {
          errorMessage = 'User not found. Please check your credentials or register first.';
        } else if (error.response.data?.error) {
          errorMessage = error.response.data.error;
        } else {
          errorMessage = `Server error (${error.response.status}): Please try again later.`;
        }
      } else if (error.request) {
        // Network error
        errorMessage = 'Cannot connect to server. Please check your internet connection and try again.';
      }
      
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (selectedRole === 'owner') {
      // Owner uses master password system
      navigation.navigate(ROUTES.FORGOT_PASSWORD);
    } else if (selectedRole === 'cashier') {
      // Cashier needs owner authentication - navigate to cashier reset screen
      navigation.navigate(ROUTES.CASHIER_RESET_PASSWORD, { cashierName: formData.name });
    }
  };

  const handleDebugTest = async () => {
    console.log('🧪 Running API debug tests...');
    
    // Test basic connection
    console.log('1. Testing basic API connection...');
    const connectionTest = await shopAPI.testConnection();
    console.log('Connection test result:', connectionTest);
    
    // Test cashier login endpoint
    if (selectedRole === 'cashier' && formData.name && formData.password) {
      console.log('2. Testing cashier login endpoint...');
      const cashierTest = await shopAPI.testCashierLogin({
        name: formData.name,
        password: formData.password
      });
      console.log('Cashier login test result:', cashierTest);
    }
    
    // Test cashier reset endpoint
    if (selectedRole === 'cashier') {
      console.log('3. Testing cashier reset endpoint...');
      const resetTest = await shopAPI.testCashierReset({
        owner_email: 'test@shop.com',
        owner_password: 'test123',
        cashier_name: formData.name || 'test',
        new_password: 'newpass123'
      });
      console.log('Cashier reset test result:', resetTest);
    }
    
    Alert.alert('Debug Complete', 'Check console for detailed API test results.');
  };

  // Web-specific scrolling solution
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
                <Text style={styles.title}>Sign In</Text>
                <Text style={styles.subtitle}>Choose your role to continue</Text>
              </View>

              {errors.general && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{errors.general}</Text>
                </View>
              )}

              <div style={styles.webScrollableContent}>
                <View style={styles.roleContainer}>
                  <RoleButton
                    role="owner"
                    title="Owner"
                    subtitle="Full access to all features"
                    isSelected={selectedRole === 'owner'}
                    onPress={() => handleRoleSelect('owner')}
                  />
                  <RoleButton
                    role="cashier"
                    title="Cashier"
                    subtitle="Point of sale operations"
                    isSelected={selectedRole === 'cashier'}
                    onPress={() => handleRoleSelect('cashier')}
                  />
                </View>

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
                        onFocus={() => handleInputFocus('email')}
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
                        onFocus={() => handleInputFocus('name')}
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
                      onFocus={() => handleInputFocus('password')}
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

                    <TouchableOpacity 
                      style={styles.forgotPasswordButton} 
                      onPress={handleForgotPassword}
                    >
                      <Text style={styles.forgotPasswordText}>
                        {selectedRole === 'owner' 
                          ? 'Forgot Password? (Master Reset)' 
                          : 'Forgot Password? (Contact Owner)'
                        }
                      </Text>
                    </TouchableOpacity>

                    {selectedRole === 'cashier' && (
                      <View>
                        <TouchableOpacity 
                          style={styles.cashierLoginButton} 
                          onPress={() => {
                            // Auto-fill cashier credentials and login
                            if (formData.name && formData.password) {
                              handleLogin();
                            } else {
                              Alert.alert('Info', 'Please enter your name and password to continue as cashier.');
                            }
                          }}
                        >
                          <Text style={styles.cashierLoginButtonText}>
                            Quick Login as Cashier
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.registerButton} 
                          onPress={() => navigation.navigate(ROUTES.CASHIER_REGISTER)}
                        >
                          <Text style={styles.registerButtonText}>
                            Don't have an account? Register as Staff
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </div>

              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              
              {/* Debug button for testing API endpoints */}
              <TouchableOpacity 
                style={styles.debugButton} 
                onPress={handleDebugTest}
              >
                <Text style={styles.debugButtonText}>🧪 Debug API</Text>
              </TouchableOpacity>
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
            <Text style={styles.title}>Sign In</Text>
            <Text style={styles.subtitle}>Choose your role to continue</Text>
          </View>

          {errors.general && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errors.general}</Text>
            </View>
          )}

          <View style={styles.roleContainer}>
            <RoleButton
              role="owner"
              title="Owner"
              subtitle="Full access to all features"
              isSelected={selectedRole === 'owner'}
              onPress={() => handleRoleSelect('owner')}
            />
            <RoleButton
              role="cashier"
              title="Cashier"
              subtitle="Point of sale operations"
              isSelected={selectedRole === 'cashier'}
              onPress={() => handleRoleSelect('cashier')}
            />
          </View>

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
                  onFocus={() => handleInputFocus('email')}
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
                  onFocus={() => handleInputFocus('name')}
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
                onFocus={() => handleInputFocus('password')}
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

              {/* Role-specific forgot password button */}
              <TouchableOpacity 
                style={styles.forgotPasswordButton} 
                onPress={handleForgotPassword}
              >
                <Text style={styles.forgotPasswordText}>
                  {selectedRole === 'owner' 
                    ? 'Forgot Password? (Master Reset)' 
                    : 'Forgot Password? (Contact Owner)'
                  }
                </Text>
              </TouchableOpacity>

              {/* Cashier registration link */}
              {selectedRole === 'cashier' && (
                <View>
                  <TouchableOpacity 
                    style={styles.cashierLoginButton} 
                    onPress={() => {
                      // Auto-fill cashier credentials and login
                      if (formData.name && formData.password) {
                        handleLogin();
                      } else {
                        Alert.alert('Info', 'Please enter your name and password to continue as cashier.');
                      }
                    }}
                  >
                    <Text style={styles.cashierLoginButtonText}>
                      Quick Login as Cashier
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.registerButton} 
                    onPress={() => navigation.navigate(ROUTES.CASHIER_REGISTER)}
                  >
                    <Text style={styles.registerButtonText}>
                      Don't have an account? Register as Staff
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          
          {/* Debug button for testing API endpoints */}
          <TouchableOpacity 
            style={styles.debugButton} 
            onPress={handleDebugTest}
          >
            <Text style={styles.debugButtonText}>🧪 Debug API</Text>
          </TouchableOpacity>
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
  glassCard: {
    width: '90%',
    maxWidth: 380,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    alignSelf: 'center',
  },
  
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
    maxWidth: 400,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassCardWeb: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    marginBottom: 20,
  },
  webScrollableContent: {
    maxHeight: '70vh',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  header: { alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#ffffff', marginBottom: 6 },
  subtitle: { fontSize: 14, color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center' },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorBannerText: { color: '#ef4444', fontSize: 12, textAlign: 'center' },
  roleContainer: { gap: 10 },
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
  loginButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: { opacity: 0.5 },
  loginButtonText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  forgotPasswordButton: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 6,
  },
  forgotPasswordText: {
    color: '#3b82f6',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  registerButton: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 6,
  },
  registerButtonText: {
    color: '#10b981',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  cashierLoginButton: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  cashierLoginButtonText: {
    color: '#22c55e',
    fontSize: 13,
    fontWeight: '600',
  },
  backButton: { marginTop: 16, alignSelf: 'center' },
  backButtonText: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 12 },
  debugButton: { 
    marginTop: 8, 
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 165, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 0, 0.4)',
  },
  debugButtonText: { 
    color: '#ffa500', 
    fontSize: 10,
    fontWeight: '600',
  },
  iconText: { fontSize: 14 },
});

export default LoginScreen;