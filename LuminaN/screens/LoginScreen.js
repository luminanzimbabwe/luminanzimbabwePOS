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
  ScrollView 
} from 'react-native';
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
  const [selectedRole, setSelectedRole] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });

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
        await shopAPI.loginCashier({ name: formData.name, password: formData.password });
        navigation.navigate(ROUTES.SUCCESS);
      }
    } catch (error) {
      setErrors({ general: error.response?.data?.error || 'Login failed. Please try again.' });
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
                <TouchableOpacity 
                  style={styles.registerButton} 
                  onPress={() => navigation.navigate(ROUTES.CASHIER_REGISTER)}
                >
                  <Text style={styles.registerButtonText}>
                    Don't have an account? Register as Staff
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  background: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0f0f0f' },
  gradient: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20, 20, 20, 0.8)' },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 24,
  },
  header: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 30, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  subtitle: { fontSize: 16, color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center' },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorBannerText: { color: '#ef4444', fontSize: 14, textAlign: 'center' },
  roleContainer: { gap: 12 },
  roleButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
  },
  roleButtonSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: 'rgba(59, 130, 256, 0.4)',
  },
  roleButtonTitle: { fontSize: 18, fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.5)' },
  roleButtonTitleSelected: { color: '#ffffff' },
  roleButtonSubtitle: { fontSize: 13, color: 'rgba(255, 255, 255, 0.4)' },
  roleButtonSubtitleSelected: { color: 'rgba(255, 255, 255, 0.7)' },
  formContainer: { marginTop: 24 },
  inputContainer: { marginBottom: 16 },
  inputLabel: { fontSize: 14, color: '#fff', marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  inputError: { borderColor: '#ef4444' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#ffffff', fontSize: 16 },
  eyeButton: { padding: 5 },
  eyeIcon: { fontSize: 18 },
  errorText: { color: '#ef4444', fontSize: 12, marginTop: 4 },
  loginButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonDisabled: { opacity: 0.5 },
  loginButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  forgotPasswordButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  forgotPasswordText: {
    color: '#3b82f6',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  registerButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  registerButtonText: {
    color: '#10b981',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  backButton: { marginTop: 20, alignSelf: 'center' },
  backButtonText: { color: 'rgba(255, 255, 255, 0.5)' },
  iconText: { fontSize: 16 },
});

export default LoginScreen;