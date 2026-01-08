import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import licenseService from '../services/licenseService';

const { width } = Dimensions.get('window');

const LicenseRenewalPrompt = ({ 
  visible, 
  onClose, 
  onRenew, 
  daysRemaining = 0, 
  isExpired = false,
  licenseType = 'TRIAL' 
}) => {
  const [loading, setLoading] = useState(false);

  const handleRenewNow = async () => {
    setLoading(true);
    try {
      // Navigate to renewal screen
      onRenew();
      onClose();
    } catch (error) {
      console.error('Navigation to renewal failed:', error);
      Alert.alert('Error', 'Unable to open renewal screen. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPromptTitle = () => {
    if (isExpired) {
      return 'License Expired';
    } else if (daysRemaining <= 3) {
      return 'License Expiring Soon';
    } else if (daysRemaining <= 7) {
      return 'License Needs Renewal';
    } else {
      return 'License Expiring';
    }
  };

  const getPromptColor = () => {
    if (isExpired) return '#EF4444'; // Red
    if (daysRemaining <= 3) return '#F59E0B'; // Orange
    return '#F59E0B'; // Yellow
  };

  const getPromptIcon = () => {
    if (isExpired) return 'alert-circle';
    if (daysRemaining <= 3) return 'warning';
    return 'time';
  };

  const getPromptMessage = () => {
    if (isExpired) {
      return `Your ${licenseType.toLowerCase()} license has expired. Renew now to continue using all features without interruption.`;
    } else if (daysRemaining <= 3) {
      return `Your ${licenseType.toLowerCase()} license expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}. Renew now to avoid service interruption.`;
    } else {
      return `Your ${licenseType.toLowerCase()} license expires in ${daysRemaining} days. Consider renewing soon to ensure uninterrupted service.`;
    }
  };

  const getRenewalUrgency = () => {
    if (isExpired) return 'URGENT - Renew Immediately';
    if (daysRemaining <= 3) return 'HIGH PRIORITY';
    if (daysRemaining <= 7) return 'MODERATE PRIORITY';
    return 'PLAN AHEAD';
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f3460']}
            style={styles.gradient}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.iconContainer, { backgroundColor: getPromptColor() + '20' }]}>
                <Ionicons name={getPromptIcon()} size={32} color={getPromptColor()} />
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.title}>{getPromptTitle()}</Text>
              <Text style={styles.urgency}>{getRenewalUrgency()}</Text>
              <Text style={styles.message}>{getPromptMessage()}</Text>

              {/* Days Display */}
              <View style={styles.daysDisplay}>
                <Text style={styles.daysNumber}>{daysRemaining}</Text>
                <Text style={styles.daysLabel}>
                  {daysRemaining === 1 ? 'Day' : 'Days'} Remaining
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.renewButton, { backgroundColor: getPromptColor() }]}
                  onPress={handleRenewNow}
                  disabled={loading}
                >
                  <Text style={styles.renewButtonText}>
                    {loading ? 'Opening...' : 'Renew License Now'}
                  </Text>
                  <Ionicons name="card" size={16} color="#ffffff" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.laterButton} onPress={onClose}>
                  <Text style={styles.laterButtonText}>Remind Me Later</Text>
                </TouchableOpacity>
              </View>

              {/* Features Info */}
              <View style={styles.featuresInfo}>
                <Text style={styles.featuresTitle}>Continue enjoying:</Text>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.featureText}>Full POS functionality</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.featureText}>Inventory management</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.featureText}>Sales reporting & analytics</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.featureText}>All premium features</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: width - 40,
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  gradient: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  urgency: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#F59E0B',
    textAlign: 'center',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  message: {
    fontSize: 16,
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  daysDisplay: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  daysNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  daysLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  renewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  renewButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  laterButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  laterButtonText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  featuresInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: '#CBD5E1',
  },
});

export default LicenseRenewalPrompt;