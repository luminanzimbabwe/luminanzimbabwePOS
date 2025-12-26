import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { shopAPI } from '../services/api';
import { Store, User, Mail, Phone, Clock, CheckCircle, AlertCircle } from 'lucide-react-native';
import { ROUTES } from '../constants/navigation';

const InputField = ({
  label,
  field,
  icon,
  placeholder,
  error,
  value,
  onChangeText,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  ...props
}) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label} *</Text>
    <View style={[styles.inputWrapper, error && styles.inputError]}>
      {icon && <View style={styles.inputIcon}>{icon}</View>}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={(text) => onChangeText(field, text)}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete="off"
        textContentType="none"
        importantForAutofill="no"
        autoCorrect={false}
        spellCheck={false}
        returnKeyType="next"
        blurOnSubmit={false}
        {...props}
      />
    </View>
    {error && (
      <View style={styles.errorContainer}>
        <AlertCircle size={14} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    )}
  </View>
);

const CashierRegisterScreen = () => {
  const navigation = useNavigation();
  const { width } = Dimensions.get('window');
  const isWeb = Platform.OS === 'web';
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    shift: '',
    password: '',
    confirmPassword: '',
  });

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (formData.phone.trim().length < 8) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!formData.shift.trim()) {
      newErrors.shift = 'Preferred shift is required';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    console.log('🚀 Starting registration process...');
    
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      Alert.alert(
        'Validation Error',
        'Please fix the errors in the form before submitting.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      console.log('📋 Checking shop registration status...');
      
      // First, we need to get the shop to know which shop this cashier is registering for
      const shopResponse = await shopAPI.checkStatus();
      console.log('🏪 Shop status:', shopResponse.data);

      if (!shopResponse.data.is_registered) {
        console.log('❌ No shop registered');
        Alert.alert(
          'Registration Unavailable',
          'No shop is registered on this device. Please contact your shop owner to set up the shop first.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      // Create self-registration data for cashier
      const registrationData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        preferred_shift: formData.shift.trim(),
        password: formData.password,
      };

      console.log('📝 Submitting registration data:', registrationData);

      // Use the new self-registration endpoint
      const response = await shopAPI.registerCashierSelf(registrationData);

      console.log('✅ Registration successful:', response.data);

      // Set success state
      setSuccess(true);

      // Show detailed success message
      Alert.alert(
        '🎉 Registration Submitted Successfully!',
        `Thank you, ${formData.name}!\n\nYour registration has been submitted to the shop owner for approval.\n\n📋 REGISTRATION DETAILS:\n• Name: ${formData.name}\n• Email: ${formData.email}\n• Phone: ${formData.phone}\n• Preferred Shift: ${formData.shift}\n• Status: PENDING APPROVAL\n\n🔄 NEXT STEPS:\n1. Wait for shop owner approval\n2. You will receive access once approved\n3. Try logging in after approval\n\n💡 TIP: Contact your shop owner to speed up the approval process.`,
        [
          {
            text: 'Got it!',
            onPress: () => navigation.goBack()
          }
        ]
      );

    } catch (error) {
      console.log('❌ Registration failed:', error);
      console.log('Error response:', error.response?.data);

      if (error.response?.data) {
        const errorData = error.response.data;
        
        if (errorData.error) {
          // Handle specific backend errors
          if (errorData.error.includes('already exists')) {
            setErrors({ 
              general: 'A cashier with this name already exists. Please choose a different name or contact the shop owner if you think this is an error.' 
            });
          } else if (errorData.error.includes('Missing required fields')) {
            setErrors({ 
              general: 'Please fill in all required fields: name, phone, preferred shift, and password.' 
            });
          } else {
            setErrors({ 
              general: errorData.error 
            });
          }
        } else {
          setErrors({ 
            general: 'Registration failed. Please check your information and try again.' 
          });
        }
      } else if (error.code === 'ECONNREFUSED') {
        setErrors({ 
          general: 'Cannot connect to server. Please check your internet connection and try again.' 
        });
      } else {
        setErrors({ 
          general: 'Registration failed. Please try again. If the problem persists, contact your shop owner.' 
        });
      }

      // Show error alert for immediate feedback
      Alert.alert(
        'Registration Failed',
        errors.general || 'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Show success state
  if (success) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            isWeb && width > 768 && { maxWidth: 450, alignSelf: 'center', width: '100%' }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[
            styles.glassCard,
            isWeb && { maxHeight: '90vh', overflow: 'auto' }
          ]}>
            <View style={styles.header}>
              <CheckCircle size={64} color="#10b981" />
              <Text style={styles.title}>Registration Submitted!</Text>
              <Text style={styles.subtitle}>Your application is pending approval</Text>
            </View>

            <View style={styles.successBox}>
              <Text style={styles.successBoxText}>
                ✅ Your registration has been successfully submitted to the shop owner.
              </Text>
              <Text style={styles.successBoxSubText}>
                You will receive access once your account is approved.
              </Text>
            </View>

            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>← Back to Login</Text>
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isWeb && width > 768 && { maxWidth: 450, alignSelf: 'center', width: '100%' }
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[
          styles.glassCard,
          isWeb && { maxHeight: '90vh', overflow: 'auto' }
        ]}>
          <View style={styles.header}>
            <Text style={styles.title}>Staff Registration</Text>
            <Text style={styles.subtitle}>Apply to join this shop's team</Text>
          </View>

          {/* General error display */}
          {errors.general && (
            <View style={styles.errorBanner}>
              <AlertCircle size={20} color="#ef4444" />
              <Text style={styles.errorBannerText}>{errors.general}</Text>
            </View>
          )}

          <View style={styles.infoBox}>
            <Text style={styles.infoBoxText}>
              ℹ️ Your registration will be sent to the shop owner for approval. 
              You'll receive access once approved.
            </Text>
          </View>

          <InputField
            label="Full Name"
            field="name"
            icon={<User size={18} color="#6B7280" />}
            placeholder="Enter your full name"
            value={formData.name}
            onChangeText={updateFormData}
            error={errors.name}
          />

          <InputField
            label="Email Address"
            field="email"
            icon={<Mail size={18} color="#6B7280" />}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={formData.email}
            onChangeText={updateFormData}
            error={errors.email}
          />

          <InputField
            label="Phone Number"
            field="phone"
            icon={<Phone size={18} color="#6B7280" />}
            placeholder="+1 234 567 890"
            keyboardType="phone-pad"
            value={formData.phone}
            onChangeText={updateFormData}
            error={errors.phone}
          />

          <InputField
            label="Preferred Shift"
            field="shift"
            icon={<Clock size={18} color="#6B7280" />}
            placeholder="e.g., Morning, Afternoon, Night"
            value={formData.shift}
            onChangeText={updateFormData}
            error={errors.shift}
          />

          <InputField
            label="Password"
            field="password"
            placeholder="Create a password (min 6 characters)"
            secureTextEntry
            value={formData.password}
            onChangeText={updateFormData}
            error={errors.password}
          />

          <InputField
            label="Confirm Password"
            field="confirmPassword"
            placeholder="Confirm your password"
            secureTextEntry
            value={formData.confirmPassword}
            onChangeText={updateFormData}
            error={errors.confirmPassword}
          />

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Application</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  scrollView: { flex: 1 },
  scrollContent: { 
    flexGrow: 1, 
    padding: Platform.OS === 'web' ? 12 : 16,
    paddingHorizontal: Platform.OS === 'web' ? 8 : 16
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: Platform.OS === 'web' ? 12 : 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: Platform.OS === 'web' ? 12 : 16,
    marginVertical: Platform.OS === 'web' ? 8 : 0,
    maxWidth: '100%',
  },
  header: { 
    marginBottom: Platform.OS === 'web' ? 16 : 20, 
    alignItems: 'center' 
  },
  title: { 
    fontSize: Platform.OS === 'web' ? 20 : 24, 
    fontWeight: 'bold', 
    color: '#ffffff', 
    marginBottom: 6,
    textAlign: 'center'
  },
  subtitle: { 
    fontSize: Platform.OS === 'web' ? 12 : 14, 
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center'
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: Platform.OS === 'web' ? 8 : 10,
    padding: Platform.OS === 'web' ? 10 : 12,
    marginBottom: Platform.OS === 'web' ? 12 : 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorBannerText: { 
    color: '#ef4444', 
    fontSize: Platform.OS === 'web' ? 12 : 14, 
    textAlign: 'center',
    marginLeft: 8,
    flex: 1,
  },
  successBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: Platform.OS === 'web' ? 8 : 10,
    padding: Platform.OS === 'web' ? 12 : 16,
    marginBottom: Platform.OS === 'web' ? 16 : 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    alignItems: 'center',
  },
  successBoxText: {
    color: '#10b981',
    fontSize: Platform.OS === 'web' ? 14 : 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Platform.OS === 'web' ? 6 : 8,
  },
  successBoxSubText: {
    color: 'rgba(16, 185, 129, 0.8)',
    fontSize: Platform.OS === 'web' ? 12 : 14,
    textAlign: 'center',
    lineHeight: Platform.OS === 'web' ? 18 : 20,
  },
  infoBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: Platform.OS === 'web' ? 8 : 10,
    padding: Platform.OS === 'web' ? 10 : 12,
    marginBottom: Platform.OS === 'web' ? 12 : 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  infoBoxText: {
    color: '#3b82f6',
    fontSize: Platform.OS === 'web' ? 11 : 13,
    textAlign: 'center',
    lineHeight: Platform.OS === 'web' ? 16 : 18,
  },
  inputContainer: { 
    marginBottom: Platform.OS === 'web' ? 10 : 12 
  },
  inputLabel: { 
    fontSize: Platform.OS === 'web' ? 11 : 13, 
    fontWeight: '600', 
    color: '#fff', 
    marginBottom: Platform.OS === 'web' ? 4 : 6 
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: Platform.OS === 'web' ? 8 : 10,
    paddingHorizontal: Platform.OS === 'web' ? 8 : 10,
    height: Platform.OS === 'web' ? 40 : 44,
  },
  inputError: { borderColor: '#ef4444' },
  inputIcon: { marginRight: 8 },
  input: { 
    flex: 1, 
    color: '#ffffff', 
    fontSize: Platform.OS === 'web' ? 13 : 15,
    paddingVertical: Platform.OS === 'web' ? 10 : 0
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginLeft: 2,
  },
  errorText: { 
    color: '#ef4444', 
    fontSize: Platform.OS === 'web' ? 10 : 11, 
    marginLeft: 4,
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#10b981',
    borderRadius: Platform.OS === 'web' ? 8 : 10,
    paddingVertical: Platform.OS === 'web' ? 10 : 12,
    marginTop: Platform.OS === 'web' ? 12 : 16,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { 
    color: '#ffffff', 
    fontSize: Platform.OS === 'web' ? 13 : 15, 
    fontWeight: 'bold' 
  },
  backButton: { 
    marginTop: Platform.OS === 'web' ? 12 : 16, 
    alignSelf: 'center' 
  },
  backButtonText: { 
    color: 'rgba(255, 255, 255, 0.5)', 
    fontSize: Platform.OS === 'web' ? 12 : 14 
  },
});

export default CashierRegisterScreen;