import React, { useState } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import { shopAPI } from '../services/api';
import { ROUTES } from '../constants/navigation';

/**
 * InputField component for cashier password reset form
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

const CashierResetPasswordScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const cashierName = route.params?.cashierName || '';
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);
  const [formData, setFormData] = useState({
    owner_email: '',
    owner_password: '',
    cashier_name: cashierName,
    new_password: '',
    confirm_password: '',
  });

  const handleInputFocus = (field) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.owner_email.trim()) {
      newErrors.owner_email = 'Owner email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.owner_email)) {
      newErrors.owner_email = 'Please enter a valid email';
    }
    
    if (!formData.owner_password.trim()) {
      newErrors.owner_password = 'Owner password is required';
    }
    
    if (!formData.cashier_name.trim()) {
      newErrors.cashier_name = 'Cashier name is required';
    }
    
    if (!formData.new_password.trim()) {
      newErrors.new_password = 'New password is required';
    } else if (formData.new_password.length < 6) {
      newErrors.new_password = 'Password must be at least 6 characters';
    }
    
    if (formData.new_password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setErrors({});

    try {
      await shopAPI.resetCashierPassword({
        owner_email: formData.owner_email,
        owner_password: formData.owner_password,
        cashier_name: formData.cashier_name,
        new_password: formData.new_password
      });
      
      setSuccess(true);
      
      // Auto-navigate back to login after 3 seconds
      setTimeout(() => {
        navigation.navigate(ROUTES.LOGIN);
      }, 3000);
      
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Password reset failed. Please check your credentials and try again.';
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate(ROUTES.LOGIN);
  };

  if (success) {
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
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.title}>Password Reset Successful</Text>
              <Text style={styles.subtitle}>Cashier password has been updated</Text>
            </View>

            <View style={styles.successContainer}>
              <Text style={styles.successText}>
                The password for cashier "{formData.cashier_name}" has been successfully reset.
              </Text>
              
              <Text style={styles.noteText}>
                📝 Please inform the cashier of their new password and ask them to sign in with the updated credentials.
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.backToLoginButton} 
              onPress={handleBackToLogin}
            >
              <Text style={styles.backToLoginButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
      >
        <View style={styles.glassCard}>
          <View style={styles.header}>
            <Text style={styles.title}>Reset Cashier Password</Text>
            <Text style={styles.subtitle}>Owner authorization required</Text>
          </View>

          {errors.general && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errors.general}</Text>
            </View>
          )}

          <View style={styles.formContainer}>
            <InputField
              label="Owner Email"
              field="owner_email"
              icon={<Text style={styles.iconText}>✉️</Text>}
              placeholder="owner@shop.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={formData.owner_email}
              onChangeText={(text) => setFormData(prev => ({ ...prev, owner_email: text }))}
              onFocus={() => handleInputFocus('owner_email')}
              error={errors.owner_email}
            />

            <InputField
              label="Owner Password"
              field="owner_password"
              icon={<Text style={styles.iconText}>🔐</Text>}
              placeholder="Enter owner password"
              secureTextEntry
              showPasswordToggle
              isPasswordVisible={showOwnerPassword}
              onTogglePassword={() => setShowOwnerPassword(!showOwnerPassword)}
              value={formData.owner_password}
              onChangeText={(text) => setFormData(prev => ({ ...prev, owner_password: text }))}
              onFocus={() => handleInputFocus('owner_password')}
              error={errors.owner_password}
            />

            <InputField
              label="Cashier Name"
              field="cashier_name"
              icon={<Text style={styles.iconText}>👤</Text>}
              placeholder="Enter cashier name"
              value={formData.cashier_name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, cashier_name: text }))}
              onFocus={() => handleInputFocus('cashier_name')}
              error={errors.cashier_name}
            />

            <InputField
              label="New Password"
              field="new_password"
              icon={<Text style={styles.iconText}>🔒</Text>}
              placeholder="Enter new password"
              secureTextEntry
              showPasswordToggle
              isPasswordVisible={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
              value={formData.new_password}
              onChangeText={(text) => setFormData(prev => ({ ...prev, new_password: text }))}
              onFocus={() => handleInputFocus('new_password')}
              error={errors.new_password}
            />

            <InputField
              label="Confirm New Password"
              field="confirm_password"
              icon={<Text style={styles.iconText}>🔒</Text>}
              placeholder="Confirm new password"
              secureTextEntry
              showPasswordToggle
              isPasswordVisible={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
              value={formData.confirm_password}
              onChangeText={(text) => setFormData(prev => ({ ...prev, confirm_password: text }))}
              onFocus={() => handleInputFocus('confirm_password')}
              error={errors.confirm_password}
            />

            <TouchableOpacity
              style={[styles.resetButton, loading && styles.resetButtonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.resetButtonText}>Reset Cashier Password</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.backButton} onPress={handleBackToLogin}>
            <Text style={styles.backButtonText}>← Back to Login</Text>
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
  successIcon: { fontSize: 48, marginBottom: 16 },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorBannerText: { color: '#ef4444', fontSize: 14, textAlign: 'center' },
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
  resetButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  resetButtonDisabled: { opacity: 0.5 },
  resetButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  backButton: { marginTop: 20, alignSelf: 'center' },
  backButtonText: { color: 'rgba(255, 255, 255, 0.5)' },
  iconText: { fontSize: 16 },
  // Success screen styles
  successContainer: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  successText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  noteText: {
    color: '#22c55e',
    fontSize: 12,
    textAlign: 'center',
  },
  backToLoginButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  backToLoginButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});

export default CashierResetPasswordScreen;