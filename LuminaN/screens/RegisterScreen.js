import React, { useState, useEffect } from 'react';
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
  Dimensions,
} from 'react-native';

const { height: screenHeight } = Dimensions.get('window');
import { useNavigation } from '@react-navigation/native';
import { shopAPI } from '../services/api';
import { Store, MapPin, Mail, Phone, Briefcase } from 'lucide-react-native';
import { ROUTES } from '../constants/navigation';

/**
 * FIXED: Moved InputField outside of the main component.
 * This prevents the input from losing focus on every keystroke.
 */
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
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

const RegisterScreen = () => {
  const navigation = useNavigation();
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [checkingShop, setCheckingShop] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    business_type: '',
    industry: '',
    email: '',
    phone: '',
    register_id: null,
  });

  useEffect(() => {
    checkShopStatus();
  }, []);

  const checkShopStatus = async () => {
    try {
      const response = await shopAPI.checkStatus();
      if (response.data.is_registered) {
        setErrors({ general: 'Shop is already registered on this device.' });
        setTimeout(() => {
          navigation.replace(ROUTES.LOGIN);
        }, 2000);
        return;
      } else if (response.data.register_id) {
        // Capture the register_id from the status check
        setFormData(prev => ({ ...prev, register_id: response.data.register_id }));
      }
    } catch (error) {
      console.error('Error checking shop status:', error);
    } finally {
      setCheckingShop(false);
    }
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.name.trim()) newErrors.name = 'Shop name is required';
      if (!formData.address.trim()) newErrors.address = 'Address is required';
    } else if (step === 2) {
      // Business type and industry are optional, so no validation needed
    } else if (step === 3) {
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
      if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateForm = () => {
    return validateStep(1) && validateStep(2) && validateStep(3);
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
      setErrors({});
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setErrors({});
  };

  // Generate master password and recovery codes automatically
  const generateMasterPassword = () => {
    const words = ['Thunder', 'Lightning', 'Storm', 'Bolt', 'Flash', 'Fire', 'Water', 'Earth', 'Wind', 'Crystal'];
    const numbers = ['123', '456', '789', '2024', '2025'];
    const symbols = ['!', '@', '#', '$', '%'];
    
    const word1 = words[Math.floor(Math.random() * words.length)];
    const word2 = words[Math.floor(Math.random() * words.length)];
    const number = numbers[Math.floor(Math.random() * numbers.length)];
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    
    return `${word1}${word2}${number}${symbol}`.toUpperCase();
  };

  const generateRecoveryCodes = () => {
    const codes = [];
    for (let i = 0; i < 8; i++) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let j = 0; j < 6; j++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      codes.push(code);
    }
    return codes;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      // Generate credentials automatically
      const masterPassword = generateMasterPassword();
      const recoveryCodes = generateRecoveryCodes();
      
      const registrationData = {
        ...formData,
        shop_owner_master_password: masterPassword,
        recovery_codes: recoveryCodes
      };

      console.log("Sending to server:", registrationData);

      await shopAPI.register(registrationData);
      
      // Navigate to details screen with generated credentials
      navigation.navigate(ROUTES.REGISTRATION_DETAILS, {
        generatedCredentials: {
          masterPassword,
          recoveryCodes
        }
      });
    } catch (error) {
      console.log("Server rejected with:", error.response?.data);

      if (error.response?.data) {
        setErrors(error.response.data);
      } else {
        setErrors({ general: 'Registration failed.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const StepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4].map((step) => (
        <View key={step} style={styles.stepItem}>
          <View style={[
            styles.stepCircle,
            currentStep >= step ? styles.stepCircleActive : styles.stepCircleInactive
          ]}>
            <Text style={[
              styles.stepNumber,
              currentStep >= step ? styles.stepNumberActive : styles.stepNumberInactive
            ]}>
              {step}
            </Text>
          </View>
          {step < 4 && (
            <View style={[
              styles.stepLine,
              currentStep > step ? styles.stepLineActive : styles.stepLineInactive
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <InputField
              label="Shop Name"
              field="name"
              icon={<Store size={18} color="#6B7280" />}
              placeholder="e.g. The Daily Market"
              value={formData.name}
              onChangeText={updateFormData}
              error={errors.name}
            />
            <InputField
              label="Address"
              field="address"
              icon={<MapPin size={18} color="#6B7280" />}
              placeholder="123 Business St."
              value={formData.address}
              onChangeText={updateFormData}
              error={errors.address}
            />
          </>
        );
      case 2:
        return (
          <>
            <InputField
              label="Business Type"
              field="business_type"
              icon={<Briefcase size={18} color="#6B7280" />}
              placeholder="e.g. Retail, Wholesale, Service"
              value={formData.business_type}
              onChangeText={updateFormData}
            />
            <InputField
              label="Industry"
              field="industry"
              placeholder="e.g. Grocery, Electronics, Clothing"
              value={formData.industry}
              onChangeText={updateFormData}
            />
          </>
        );
      case 3:
        return (
          <>
            <InputField
              label="Email Address"
              field="email"
              icon={<Mail size={18} color="#6B7280" />}
              placeholder="owner@shop.com"
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
          </>
        );
      case 4:
        return (
          <>
            <View style={styles.reviewSection}>
              <Text style={styles.reviewTitle}>Review Your Information</Text>
              <Text style={styles.reviewSubtitle}>Please verify all details before creating your shop</Text>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Shop Name:</Text>
                <Text style={styles.reviewValue}>{formData.name || 'Not provided'}</Text>
              </View>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Address:</Text>
                <Text style={styles.reviewValue}>{formData.address || 'Not provided'}</Text>
              </View>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Business Type:</Text>
                <Text style={styles.reviewValue}>{formData.business_type || 'Not provided'}</Text>
              </View>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Industry:</Text>
                <Text style={styles.reviewValue}>{formData.industry || 'Not provided'}</Text>
              </View>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Email:</Text>
                <Text style={styles.reviewValue}>{formData.email || 'Not provided'}</Text>
              </View>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Phone:</Text>
                <Text style={styles.reviewValue}>{formData.phone || 'Not provided'}</Text>
              </View>
            </View>
            
            <View style={styles.infoBanner}>
              <Text style={styles.infoBannerText}>
                ℹ️ Make sure all information is correct. You won't be able to change these details after registration.
              </Text>
            </View>
            
            <View style={styles.securityInfo}>
              <Text style={styles.securityInfoText}>
                🔒 A master password and recovery codes will be automatically generated for account login and recovery
              </Text>
            </View>
            
            <View style={styles.extraSpace} />
            
            {/* Additional content to force scrolling */}
            <View style={styles.spacerSection}>
              <Text style={styles.spacerText}>📋 Registration Summary</Text>
              <Text style={styles.spacerDescription}>Complete step 4 of 4</Text>
            </View>
            
            <View style={styles.spacerSection}>
              <Text style={styles.spacerText}>⚡ Next Steps</Text>
              <Text style={styles.spacerDescription}>After creating your shop, you'll receive your login credentials</Text>
            </View>
            
            <View style={styles.spacerSection}>
              <Text style={styles.spacerText}>🔐 Security</Text>
              <Text style={styles.spacerDescription}>Your master password will be generated automatically</Text>
            </View>
            
            <View style={styles.spacerSection}>
              <Text style={styles.spacerText}>💼 Business Profile</Text>
              <Text style={styles.spacerDescription}>Complete business information setup</Text>
            </View>
            
            <View style={styles.mediumExtraSpace} />
          </>
        );
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Basic Information';
      case 2: return 'Business Details';
      case 3: return 'Contact Information';
      case 4: return 'Confirm Registration';
      default: return 'Create your shop';
    }
  };

  const getStepSubtitle = () => {
    switch (currentStep) {
      case 1: return 'Tell us about your shop';
      case 2: return 'Business type and industry';
      case 3: return 'How to reach you';
      case 4: return 'Review and create your shop';
      default: return 'Set up your business profile';
    }
  };

  if (checkingShop) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  // Web-specific scrolling solution
  const isWeb = Platform.OS === 'web';
  
  if (isWeb) {
    return (
      <View style={styles.container}>
        <div style={styles.webScrollContainer}>
          <div style={styles.webCardContainer}>
            <View style={styles.glassCardWeb}>
              <View style={styles.header}>
                <Text style={styles.title}>{getStepTitle()}</Text>
                <Text style={styles.subtitle}>{getStepSubtitle()}</Text>
                <StepIndicator />
              </View>

              {errors.general && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{errors.general}</Text>
                </View>
              )}

              <div style={styles.webScrollableContent}>
                {renderStepContent()}
              </div>

              <View style={styles.navigationButtons}>
                {currentStep > 1 && (
                  <TouchableOpacity style={styles.backButtonStep} onPress={prevStep}>
                    <Text style={styles.backButtonTextStep}>← Back</Text>
                  </TouchableOpacity>
                )}
                
                {currentStep < 4 ? (
                  <TouchableOpacity style={styles.nextButton} onPress={nextStep}>
                    <Text style={styles.nextButtonText}>Next →</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? <ActivityIndicator color="white" /> : <Text style={styles.submitButtonText}>Create Shop</Text>}
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Text style={styles.backButtonText}>← Back</Text>
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        scrollEventThrottle={16}
        alwaysBounceVertical={true}
        bounces={true}
        scrollEnabled={true}
      >
        <View style={styles.glassCard}>
          <View style={styles.header}>
            <Text style={styles.title}>{getStepTitle()}</Text>
            <Text style={styles.subtitle}>{getStepSubtitle()}</Text>
            <StepIndicator />
          </View>

          {errors.general && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errors.general}</Text>
            </View>
          )}

          {renderStepContent()}

          <View style={styles.navigationButtons}>
            {currentStep > 1 && (
              <TouchableOpacity style={styles.backButtonStep} onPress={prevStep}>
                <Text style={styles.backButtonTextStep}>← Back</Text>
              </TouchableOpacity>
            )}
            
            {currentStep < 4 ? (
              <TouchableOpacity style={styles.nextButton} onPress={nextStep}>
                <Text style={styles.nextButtonText}>Next →</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.submitButtonText}>Create Shop</Text>}
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f0f' },
  scrollView: { 
    flex: 1,
    maxHeight: screenHeight * 0.8,
    overflow: 'scroll',
  },
  scrollContent: { 
    flexGrow: 1, 
    paddingHorizontal: 16, 
    paddingVertical: 20, 
    paddingBottom: 40,
    minHeight: 800,
    overflow: 'scroll',
  },
  glassCard: {
    width: '90%',
    maxWidth: 380,
    minHeight: 700,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    alignSelf: 'center',
    marginTop: 20,
  },
  header: { marginBottom: 12, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#ffffff', marginBottom: 3, textAlign: 'center' },
  subtitle: { fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', marginBottom: 12 },
  
  // Step Indicator Styles
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  stepCircleActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  stepCircleInactive: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepNumberActive: {
    color: '#ffffff',
  },
  stepNumberInactive: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  stepLine: {
    width: 30,
    height: 2,
    marginHorizontal: 6,
  },
  stepLineActive: {
    backgroundColor: '#3b82f6',
  },
  stepLineInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  errorBannerText: { color: '#ef4444', fontSize: 11, textAlign: 'center' },
  inputContainer: { marginBottom: 10 },
  inputLabel: { fontSize: 11, fontWeight: '600', color: '#fff', marginBottom: 4 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    height: 36,
  },
  inputError: { borderColor: '#ef4444' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#ffffff', fontSize: 14 },
  errorText: { color: '#ef4444', fontSize: 10, marginTop: 3 },
  
  // Review Section Styles
  reviewSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
    textAlign: 'center',
  },
  reviewSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: 14,
  },
  reviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  reviewLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    flex: 1,
  },
  reviewValue: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  
  infoBanner: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  infoBannerText: {
    color: '#3b82f6',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },
  securityInfo: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 6,
    padding: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  securityInfoText: {
    color: '#f59e0b',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
    fontWeight: '500',
  },
  extraSpace: {
    height: 40,
  },
  spacerSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  spacerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 3,
  },
  spacerDescription: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 12,
  },
  mediumExtraSpace: {
    height: 100,
  },
  
  // Navigation Styles
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  backButtonStep: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'transparent',
    minWidth: 60,
  },
  backButtonTextStep: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  nextButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 5,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flex: 1,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Original Submit Button (for final step)
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 12,
    flex: 1,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  
  // Keep old back button for navigation.goBack()
  backButton: { marginTop: 12, marginBottom: 12, alignSelf: 'center' },
  backButtonText: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 12 },

  // Web-specific styles
  webScrollContainer: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
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
    maxWidth: 480,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    marginBottom: 16,
    alignSelf: 'center',
  },
  webScrollableContent: {
    maxHeight: '50vh',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
});

export default RegisterScreen;