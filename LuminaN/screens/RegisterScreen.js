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
} from 'react-native';
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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Shop name is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

  if (checkingShop) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
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
      >
        <View style={styles.glassCard}>
          <View style={styles.header}>
            <Text style={styles.title}>Create your shop</Text>
            <Text style={styles.subtitle}>Set up your business profile</Text>
          </View>

          {errors.general && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errors.general}</Text>
            </View>
          )}

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

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <InputField
                label="Type"
                field="business_type"
                icon={<Briefcase size={18} color="#6B7280" />}
                placeholder="Retail"
                value={formData.business_type}
                onChangeText={updateFormData}
              />
            </View>
            <View style={styles.halfWidth}>
              <InputField
                label="Industry"
                field="industry"
                placeholder="Grocery"
                value={formData.industry}
                onChangeText={updateFormData}
              />
            </View>
          </View>

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

          <View style={styles.securityInfo}>
            <Text style={styles.securityInfoText}>
              🔒 A master password and recovery codes will be automatically generated for account login and recovery
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.submitButtonText}>Create Shop</Text>}
          </TouchableOpacity>

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
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 16 },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
  },
  header: { marginBottom: 20, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#ffffff', marginBottom: 6 },
  subtitle: { fontSize: 14, color: 'rgba(255, 255, 255, 0.7)' },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  errorBannerText: { color: '#ef4444', fontSize: 13, textAlign: 'center' },
  inputContainer: { marginBottom: 12 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 44,
  },
  inputError: { borderColor: '#ef4444' },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, color: '#ffffff', fontSize: 15 },
  errorText: { color: '#ef4444', fontSize: 11, marginTop: 3 },
  row: { flexDirection: 'row', gap: 8 },
  halfWidth: { flex: 1 },
  securityInfo: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  securityInfoText: {
    color: '#3b82f6',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  backButton: { marginTop: 16, alignSelf: 'center' },
  backButtonText: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 14 },
});

export default RegisterScreen;