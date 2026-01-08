import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { shopAPI } from '../services/api';
import { useNavigation } from '@react-navigation/native';

const LicenseRenewalScreen = ({ route }) => {
  const navigation = useNavigation();
  const { shopId, currentLicense } = route.params || {};
  
  const [licenseStatus, setLicenseStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [renewing, setRenewing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('MONTHLY');

  const RENEWAL_PLANS = [
    {
      id: 'MONTHLY',
      name: 'Monthly License',
      price: '$29.99',
      duration: '1 Month',
      description: 'Full access for 30 days',
      features: ['All POS features', 'Unlimited transactions', 'Priority support', 'Data backup']
    },
    {
      id: 'ANNUAL',
      name: 'Annual License',
      price: '$299.99',
      duration: '12 Months',
      description: 'Save 17% with annual plan',
      features: ['All POS features', 'Unlimited transactions', 'Priority support', 'Data backup', '17% discount'],
      savings: '$59.89'
    },
    {
      id: 'LIFETIME',
      name: 'Lifetime License',
      price: '$999.99',
      duration: 'Lifetime',
      description: 'One-time payment, forever',
      features: ['All POS features', 'Unlimited transactions', 'Priority support', 'Data backup', 'No recurring fees'],
      savings: 'Unlimited'
    }
  ];

  useEffect(() => {
    loadLicenseStatus();
  }, []);

  const loadLicenseStatus = async () => {
    try {
      const response = await shopAPI.getLicenseStatus(shopId);
      setLicenseStatus(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load license status');
      console.error('License status error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRenewal = async (plan) => {
    setRenewing(true);
    try {
      const months = plan.id === 'MONTHLY' ? 1 : plan.id === 'ANNUAL' ? 12 : 1200; // 100 years for lifetime
      const response = await shopAPI.renewLicense(shopId, months);
      
      if (response.data.success) {
        Alert.alert(
          'Success',
          `License renewed successfully! You now have ${response.data.license.days_remaining} days remaining.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        throw new Error('Renewal failed');
      }
    } catch (error) {
      Alert.alert(
        'Renewal Failed',
        error.response?.data?.error || 'Failed to renew license. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setRenewing(false);
    }
  };

  const renderCurrentLicense = () => {
    if (!licenseStatus || !licenseStatus.license) return null;

    const { license } = licenseStatus;
    const isExpiring = license.days_remaining <= 7;

    return (
      <View style={styles.currentLicenseContainer}>
        <View style={styles.currentLicenseHeader}>
          <Ionicons 
            name={isExpiring ? "warning" : "shield-checkmark"} 
            size={24} 
            color={isExpiring ? "#f59e0b" : "#22c55e"} 
          />
          <Text style={styles.currentLicenseTitle}>
            Current License Status
          </Text>
        </View>
        
        <View style={styles.currentLicenseDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type:</Text>
            <Text style={styles.detailValue}>{license.type}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status:</Text>
            <Text style={[styles.detailValue, { color: license.is_valid ? '#22c55e' : '#ef4444' }]}>
              {license.status}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Days Remaining:</Text>
            <Text style={[
              styles.detailValue, 
              { color: license.days_remaining <= 7 ? '#ef4444' : '#22c55e' }
            ]}>
              {license.days_remaining} days
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Expiry Date:</Text>
            <Text style={styles.detailValue}>
              {license.expiry_date ? new Date(license.expiry_date).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
        </View>

        {license.days_remaining <= 7 && (
          <View style={styles.expiryWarning}>
            <Ionicons name="warning" size={16} color="#f59e0b" />
            <Text style={styles.expiryWarningText}>
              Your license expires soon! Renew now to avoid interruption.
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderPlanCard = (plan) => {
    const isSelected = selectedPlan === plan.id;
    
    return (
      <TouchableOpacity
        key={plan.id}
        style={[
          styles.planCard,
          isSelected && styles.selectedPlanCard
        ]}
        onPress={() => setSelectedPlan(plan.id)}
      >
        <View style={styles.planHeader}>
          <Text style={styles.planName}>{plan.name}</Text>
          <View style={styles.planPriceContainer}>
            <Text style={styles.planPrice}>{plan.price}</Text>
            <Text style={styles.planDuration}>/{plan.duration}</Text>
          </View>
        </View>
        
        <Text style={styles.planDescription}>{plan.description}</Text>
        
        <View style={styles.featuresContainer}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons name="checkmark" size={14} color="#22c55e" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
        
        {plan.savings && (
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>Save {plan.savings}</Text>
          </View>
        )}
        
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Ionicons name="checkmark-circle" size={20} color="#3b82f6" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading license information...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, Platform.OS === 'web' && styles.webContainer]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>License Renewal</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={true}
        scrollEventThrottle={16}
        nestedScrollEnabled={Platform.OS === 'web'}
        removeClippedSubviews={false}
      >
        {renderCurrentLicense()}
        
        <View style={styles.plansSection}>
          <Text style={styles.sectionTitle}>Choose Your Plan</Text>
          <Text style={styles.sectionSubtitle}>
            Select a renewal plan to continue using LuminaN POS
          </Text>
          
          {RENEWAL_PLANS.map(renderPlanCard)}
        </View>

        <View style={styles.securitySection}>
          <Text style={styles.sectionTitle}>Security & Trust</Text>
          <View style={styles.securityFeatures}>
            <View style={styles.securityFeature}>
              <Ionicons name="shield-checkmark" size={20} color="#22c55e" />
              <Text style={styles.securityText}>Secure payment processing</Text>
            </View>
            <View style={styles.securityFeature}>
              <Ionicons name="lock-closed" size={20} color="#22c55e" />
              <Text style={styles.securityText}>License protection</Text>
            </View>
            <View style={styles.securityFeature}>
              <Ionicons name="cloud-checkmark" size={20} color="#22c55e" />
              <Text style={styles.securityText}>Automatic backups</Text>
            </View>
          </View>
        </View>
        
        {/* Bottom padding for web scrolling */}
        <View style={{ 
          height: Platform.OS === 'web' ? 100 : 20,
          minHeight: Platform.OS === 'web' ? 100 : 0
        }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.renewButton}
          onPress={() => {
            const selectedPlanData = RENEWAL_PLANS.find(p => p.id === selectedPlan);
            if (selectedPlanData) {
              Alert.alert(
                'Confirm Renewal',
                `Renew with ${selectedPlanData.name} for ${selectedPlanData.price}?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Confirm', onPress: () => handleRenewal(selectedPlanData) }
                ]
              );
            }
          }}
          disabled={renewing}
        >
          {renewing ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="card" size={20} color="#ffffff" />
              <Text style={styles.renewButtonText}>
                Renew License - {RENEWAL_PLANS.find(p => p.id === selectedPlan)?.price}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1f2937',
  },
  webContainer: {
    ...Platform.select({
      web: {
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'auto',
        WebkitOverflowScrolling: 'auto',
        scrollBehavior: 'smooth',
      },
    }),
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'web' ? 100 : 40,
    ...Platform.select({
      web: {
        minHeight: '100vh',
        width: '100%',
        flexGrow: 1,
      },
    }),
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1f2937',
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  currentLicenseContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  currentLicenseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  currentLicenseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  currentLicenseDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#9ca3af',
  },
  detailValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  expiryWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  expiryWarningText: {
    color: '#f59e0b',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  plansSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  selectedPlanCard: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  planPriceContainer: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  planDuration: {
    fontSize: 12,
    color: '#9ca3af',
  },
  planDescription: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 12,
  },
  featuresContainer: {
    gap: 6,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 14,
    color: '#e5e7eb',
    marginLeft: 8,
  },
  savingsBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savingsText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  securitySection: {
    marginBottom: 24,
  },
  securityFeatures: {
    gap: 12,
  },
  securityFeature: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityText: {
    fontSize: 14,
    color: '#e5e7eb',
    marginLeft: 12,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  renewButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  renewButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LicenseRenewalScreen;