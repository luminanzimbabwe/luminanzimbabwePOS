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
  ScrollView,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { shopAPI } from '../services/api';
import { shopStorage } from '../services/storage';
import { ROUTES } from '../constants/navigation';
import { Lock, Key, Eye, EyeOff } from 'lucide-react-native';

/**
 * InputField component for retrieve credentials form
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
  secureTextEntry,
  showPasswordToggle,
  onTogglePassword,
  ...props 
}) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label} *</Text>
    <View style={[styles.inputWrapper, error && styles.inputError]}>
      <View style={styles.inputIcon}>{icon}</View>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        autoCorrect={false}
        spellCheck={false}
        secureTextEntry={secureTextEntry}
        {...props}
      />
      {showPasswordToggle && (
        <TouchableOpacity onPress={onTogglePassword} style={styles.passwordToggle}>
          {secureTextEntry ? <Eye size={16} color="#9CA3AF" /> : <EyeOff size={16} color="#9CA3AF" />}
        </TouchableOpacity>
      )}
    </View>
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

/**
 * Recovery Code Input Component
 */
const RecoveryCodeInput = ({ 
  codes, 
  values, 
  onChangeCode, 
  error 
}) => (
  <View style={styles.recoveryCodesContainer}>
    <Text style={styles.inputLabel}>Recovery Codes *</Text>
    <Text style={styles.recoveryInstructions}>
      Enter any of your 8 recovery codes (6 characters each):
    </Text>
    
    <View style={styles.codesGrid}>
      {Array.from({ length: 8 }, (_, index) => (
        <TextInput
          key={index}
          style={[styles.recoveryCodeInput, error && styles.inputError]}
          placeholder={`Code ${index + 1}`}
          placeholderTextColor="#9CA3AF"
          value={values[index] || ''}
          onChangeText={(text) => onChangeCode(index, text)}
          maxLength={6}
          autoCapitalize="characters"
        />
      ))}
    </View>
    
    <Text style={styles.recoveryNote}>
      💡 Tip: You only need to enter ONE valid recovery code
    </Text>
    
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

const ForgotPasswordScreen = () => {
  const navigation = useNavigation();
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [recoveryMethod, setRecoveryMethod] = useState('shop_owner_master_password'); // 'shop_owner_master_password' or 'recovery_codes'
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [formData, setFormData] = useState({
    master_password: '',
    recovery_codes: Array(8).fill('')
  });
  const [recoveredCredentials, setRecoveredCredentials] = useState(null);

  const handleInputFocus = (field) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (recoveryMethod === 'shop_owner_master_password') {
      if (!formData.master_password.trim()) {
        newErrors.master_password = 'Master password is required';
      }
    } else {
      // Check if any recovery code is entered
      const hasAnyCode = formData.recovery_codes.some(code => code.trim().length > 0);
      if (!hasAnyCode) {
        newErrors.recovery_codes = 'At least one recovery code is required';
      } else {
        // Validate that entered codes are 6 characters
        const invalidCodes = formData.recovery_codes.filter(code => 
          code.trim().length > 0 && code.trim().length !== 6
        );
        if (invalidCodes.length > 0) {
          newErrors.recovery_codes = 'Recovery codes must be exactly 6 characters';
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRetrieveCredentials = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setErrors({});

    try {
      const requestData = {
        recovery_method: recoveryMethod
      };

      if (recoveryMethod === 'shop_owner_master_password') {
        requestData.shop_owner_master_password = formData.master_password;
      } else {
        // Filter out empty codes and send the first valid one
        const validCodes = formData.recovery_codes.filter(code => code.trim().length === 6);
        requestData.recovery_code = validCodes[0];
      }
      
      // DEBUG: Log what we're sending to the backend
      console.error('=== FRONTEND DEBUG: Sending to backend ===');
      console.error('Recovery method:', recoveryMethod);
      console.error('Request data:', JSON.stringify(requestData, null, 2));
      console.error('===========================================');
      
      const response = await shopAPI.retrieveCredentials(requestData);
      
      // Save the retrieved credentials to storage (without password)
      const saved = await shopStorage.saveCredentials(response.data);
      if (saved) {
        console.log('✅ Credentials saved successfully!');
        Alert.alert('Success', 'Your credentials have been retrieved and saved securely!');
      } else {
        console.warn('⚠️ Failed to save credentials, but retrieval was successful');
        Alert.alert('Warning', 'Credentials retrieved successfully, but failed to save locally. Please note down your credentials.');
      }
      
      setSuccess(true);
      setRecoveredCredentials(response.data);
      
      // DEBUG: Log the response data to check all fields
      console.log('=== CREDENTIALS RETRIEVED DEBUG ===');
      console.log('Full response data:', JSON.stringify(response.data, null, 2));
      console.log('Register ID:', response.data.register_id);
      console.log('Shop ID:', response.data.shop_id);
      console.log('Name:', response.data.name);
      console.log('Email:', response.data.email);
      console.log('Phone:', response.data.phone);
      console.log('Owner ID:', response.data.owner_id);
      console.log('Checksum:', response.data.checksum);
      console.log('=====================================');
      
      // Auto-navigate back to login after 5 seconds
      setTimeout(() => {
        navigation.navigate(ROUTES.LOGIN);
      }, 5000);
      
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Credential retrieval failed. Please try again.';
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleRecoveryCodeChange = (index, value) => {
    const newCodes = [...formData.recovery_codes];
    newCodes[index] = value.toUpperCase();
    setFormData(prev => ({ ...prev, recovery_codes: newCodes }));
  };

  const handleBackToLogin = () => {
    navigation.navigate(ROUTES.LOGIN);
  };

  // Modal Success Screen
  if (success && recoveredCredentials) {
    return (
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView 
          style={styles.modalContainer} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <ScrollView 
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              <View style={styles.successCard}>
                {/* Header */}
                <View style={styles.successHeader}>
                  <Text style={styles.successIcon}>🔓</Text>
                  <Text style={styles.successTitle}>Credentials Retrieved</Text>
                  <Text style={styles.successSubtitle}>Your shop credentials have been successfully retrieved</Text>
                </View>

                {/* Credentials Display */}
                <View style={styles.credentialsCard}>
                  <Text style={styles.credentialsHeaderTitle}>Your Shop Credentials</Text>
                  
                  {/* Basic Information */}
                  <View style={styles.infoSection}>
                    <Text style={styles.sectionHeader}>🏪 Shop Information</Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Shop Name:</Text>
                      <Text style={styles.infoValue}>{recoveredCredentials.name || 'Not available'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Email:</Text>
                      <Text style={styles.infoValue}>{recoveredCredentials.email || 'Not available'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Phone:</Text>
                      <Text style={styles.infoValue}>{recoveredCredentials.phone || 'Not available'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Register ID:</Text>
                      <Text style={styles.infoValue}>{recoveredCredentials.register_id || 'Not available'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Shop ID:</Text>
                      <Text style={styles.infoValue}>{recoveredCredentials.shop_id || 'Not available'}</Text>
                    </View>
                  </View>

                  {/* Security Credentials */}
                  <View style={styles.infoSection}>
                    <Text style={styles.sectionHeader}>🔐 Security Credentials</Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Master Password:</Text>
                      <Text style={[styles.infoValue, styles.passwordValue]}>{recoveredCredentials.shop_owner_master_password || 'Not set'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Recovery Codes:</Text>
                      <View style={styles.recoveryCodesContainer}>
                        {(recoveredCredentials.recovery_codes || []).map((code, index) => (
                          <Text key={index} style={[styles.recoveryCodeBadge, styles.passwordValue]}>
                            {code}
                          </Text>
                        ))}
                      </View>
                    </View>
                  </View>

                  {/* Technical Details */}
                  <View style={styles.infoSection}>
                    <Text style={styles.sectionHeader}>🔧 Technical Details</Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Device ID:</Text>
                      <Text style={styles.infoValue}>{recoveredCredentials.device_id || 'Not available'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Owner ID:</Text>
                      <Text style={styles.infoValue}>{recoveredCredentials.owner_id || 'Not available'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>API Key:</Text>
                      <Text style={styles.infoValue}>{recoveredCredentials.api_key || 'Not available'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Version:</Text>
                      <Text style={styles.infoValue}>{recoveredCredentials.version || '1.0.0'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Checksum:</Text>
                      <Text style={styles.infoValue}>{recoveredCredentials.checksum || 'Not available'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Registered:</Text>
                      <Text style={styles.infoValue}>
                        {recoveredCredentials.registration_time 
                          ? new Date(recoveredCredentials.registration_time).toLocaleDateString() 
                          : 'Not available'
                        }
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Success Note */}
                <View style={styles.successMessage}>
                  <Text style={styles.successMessageText}>
                    ✅ Your credentials have been retrieved and are ready to use. Please store this information securely.
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity 
                    style={styles.primaryButton} 
                    onPress={handleBackToLogin}
                  >
                    <Text style={styles.primaryButtonText}>Continue to Login</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
      >
        <View style={styles.glassCard}>
          <View style={styles.header}>
            <Text style={styles.title}>Retrieve Credentials</Text>
            <Text style={styles.subtitle}>Recover your shop credentials using master password or recovery codes</Text>
          </View>

          {/* Recovery Method Selection */}
          <View style={styles.methodSelector}>
            <TouchableOpacity
              style={[styles.methodButton, recoveryMethod === 'shop_owner_master_password' && styles.methodButtonActive]}
              onPress={() => {
                setRecoveryMethod('shop_owner_master_password');
                setErrors({});
              }}
            >
              <Lock size={20} color={recoveryMethod === 'shop_owner_master_password' ? '#ffffff' : '#9CA3AF'} />
              <Text style={[styles.methodButtonText, recoveryMethod === 'shop_owner_master_password' && styles.methodButtonTextActive]}>
                Master Password
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.methodButton, recoveryMethod === 'recovery_codes' && styles.methodButtonActive]}
              onPress={() => {
                setRecoveryMethod('recovery_codes');
                setErrors({});
              }}
            >
              <Key size={20} color={recoveryMethod === 'recovery_codes' ? '#ffffff' : '#9CA3AF'} />
              <Text style={[styles.methodButtonText, recoveryMethod === 'recovery_codes' && styles.methodButtonTextActive]}>
                Recovery Codes
              </Text>
            </TouchableOpacity>
          </View>

          {errors.general && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errors.general}</Text>
            </View>
          )}

          <View style={styles.formContainer}>
            {recoveryMethod === 'shop_owner_master_password' ? (
              <InputField
                label="Master Password"
                field="master_password"
                icon={<Lock size={20} color="#9CA3AF" />}
                placeholder="Enter your master password"
                value={formData.master_password}
                onChangeText={(text) => setFormData(prev => ({ ...prev, master_password: text }))}
                onFocus={() => handleInputFocus('master_password')}
                error={errors.master_password}
                secureTextEntry={!showMasterPassword}
                showPasswordToggle
                onTogglePassword={() => setShowMasterPassword(!showMasterPassword)}
              />
            ) : (
              <RecoveryCodeInput
                codes={formData.recovery_codes}
                values={formData.recovery_codes}
                onChangeCode={handleRecoveryCodeChange}
                error={errors.recovery_codes}
              />
            )}

            <TouchableOpacity
              style={[styles.resetButton, loading && styles.resetButtonDisabled]}
              onPress={handleRetrieveCredentials}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.resetButtonText}>
                  {recoveryMethod === 'shop_owner_master_password' ? 'Retrieve with Master Password' : 'Retrieve with Recovery Code'}
                </Text>
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
  title: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center' },
  successIcon: { fontSize: 64, marginBottom: 16, textAlign: 'center' },
  
  // Method selector styles
  methodSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  methodButtonActive: {
    backgroundColor: '#3b82f6',
  },
  methodButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  methodButtonTextActive: {
    color: '#ffffff',
  },
  
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
  passwordToggle: { padding: 4 },
  errorText: { color: '#ef4444', fontSize: 12, marginTop: 4 },
  
  // Recovery codes styles
  recoveryCodesContainer: { marginBottom: 16 },
  recoveryInstructions: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'center',
  },
  codesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recoveryCodeInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    width: '48%',
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 8,
  },
  recoveryNote: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  resetButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  resetButtonDisabled: { opacity: 0.5 },
  resetButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  backButton: { marginTop: 20, alignSelf: 'center' },
  backButtonText: { color: 'rgba(255, 255, 255, 0.5)' },
  
  // MODAL STYLES
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '95%',
    maxHeight: '92%',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  modalContent: {
    flex: 1,
  },
  modalScrollContent: {
    flexGrow: 1,
    padding: 0,
  },
  
  // SUCCESS SCREEN STYLES - CLEAN DESIGN
  successCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 0,
    borderWidth: 0,
    padding: 24,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 8,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
  credentialsCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  credentialsHeaderTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  infoSection: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionHeader: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  infoLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
  },
  infoValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  passwordValue: {
    fontFamily: 'monospace',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 12,
  },
  recoveryCodesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  recoveryCodeBadge: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 4,
  },
  successMessage: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  successMessageText: {
    color: '#22c55e',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ForgotPasswordScreen;