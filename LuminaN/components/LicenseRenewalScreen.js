import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
  Platform,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import licenseService from '../services/licenseService';

const { width } = Dimensions.get('window');

const LicenseRenewalScreen = ({ navigation }) => {
  const [currentLicense, setCurrentLicense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [renewalInProgress, setRenewalInProgress] = useState(false);

  // Renewal plans with futuristic pricing
  const renewalPlans = [
    {
      id: 'monthly',
      name: 'Monthly Neural Access',
      duration: 30,
      price: '$29.99',
      description: 'Essential neural interface access',
      color: '#3B82F6',
      popular: false,
      features: ['Basic AI Processing', 'Standard Analytics', 'Email Support']
    },
    {
      id: 'quarterly',
      name: 'Quarterly Neural Bundle',
      duration: 90,
      price: '$79.99',
      description: 'Enhanced neural processing + 11% savings',
      color: '#10B981',
      popular: true,
      features: ['Advanced AI Processing', 'Real-time Analytics', 'Priority Support', 'Neural Optimization']
    },
    {
      id: 'annual',
      name: 'Annual Neural Dominance',
      duration: 365,
      price: '$299.99',
      description: 'Ultimate neural supremacy - 17% savings',
      color: '#8B5CF6',
      popular: false,
      features: ['Full Neural Access', 'Custom AI Models', '24/7 Premium Support', 'Neural Backup Systems', 'Advanced Security']
    },
  ];

  useEffect(() => {
    loadCurrentLicense();
  }, []);

  const loadCurrentLicense = async () => {
    try {
      const license = await licenseService.getStoredLicense();
      if (license) {
        setCurrentLicense(license);
      }
    } catch (error) {
      console.error('Failed to load current license:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRenewal = async (plan) => {
    try {
      setRenewalInProgress(true);
      
      // Simulate payment processing with neural feedback
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Extend license
      const extendedLicense = await licenseService.extendLicense(plan.duration);
      
      Alert.alert(
        '🎉 Neural License Extended!',
        `Your neural access has been successfully extended by ${plan.duration} days.\n\nNew expiry: ${new Date(extendedLicense.expiry_date).toDateString()}`,
        [
          {
            text: 'Continue Neural Processing',
            onPress: () => {
              navigation.goBack();
              navigation.navigate('OwnerDashboard');
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('License renewal failed:', error);
      Alert.alert(
        '❌ Neural Extension Failed',
        'Unable to process neural license extension. Please verify your neural connection and try again.',
        [
          { text: 'Retry Neural Link' },
          { text: 'Contact Neural Support', onPress: () => console.log('Contact support') }
        ]
      );
    } finally {
      setRenewalInProgress(false);
    }
  };

  const getCurrentDaysRemaining = () => {
    if (!currentLicense) return 0;
    return licenseService.getDaysRemaining(currentLicense);
  };

  const getCurrentExpiryDate = () => {
    if (!currentLicense) return 'Unknown';
    return new Date(currentLicense.expiry_date).toDateString();
  };

  const getCurrentLicenseType = () => {
    if (!currentLicense) return 'Unknown';
    return currentLicense.is_founder_trial ? 'Founder Neural Trial' : 
           currentLicense.type === 'TRIAL' ? 'Neural Trial' : 
           currentLicense.type === 'PAID' ? 'Neural License' : 
           currentLicense.type === 'UNLIMITED' ? 'Unlimited Neural License' : 'Unknown Neural State';
  };

  const isUnlimited = currentLicense?.type === 'UNLIMITED';

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.neuralLoadingContainer}>
          <View style={styles.neuralLoadingGrid} />
          <View style={styles.neuralLoadingPulse} />
          <Text style={styles.neuralLoadingText}>INITIALIZING NEURAL LICENSE MATRIX...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, Platform.OS === 'web' && styles.webContainer]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={true}
        scrollEventThrottle={16}
        nestedScrollEnabled={Platform.OS === 'web'}
        removeClippedSubviews={false}
      >
        {/* Futuristic 2080 Neural Header */}
        <View style={styles.neural2080Header}>
          {/* Holographic Background Elements */}
          <View style={styles.holographicGrid} />
          <View style={styles.energyPulse} />
          <View style={styles.neuralNetworkLines} />
          
          {/* Neural Control Bar */}
          <View style={styles.neuralControlBar}>
            <TouchableOpacity 
              style={styles.neuralBackButton}
              onPress={() => navigation.goBack()}
            >
              <View style={styles.backButtonGlow} />
              <Icon name="arrow-back" size={24} color="#00f5ff" />
              <Text style={styles.backButtonText}>NEURAL LINK</Text>
            </TouchableOpacity>

            <View style={styles.neuralTitleContainer}>
              <Text style={styles.neuralTitle}>NEURAL LICENSE MATRIX</Text>
              <View style={styles.titleScanner} />
            </View>
          </View>
          
          {/* Neural Status Indicator */}
          <View style={styles.neuralStatusPanel}>
            <View style={styles.statusOrb} />
            <Text style={styles.statusText}>NEURAL INTERFACE: {isUnlimited ? 'UNLIMITED ACCESS' : 'ACTIVE'}</Text>
            <Icon name="psychology" size={16} color="#ff0080" />
          </View>
          
          {/* Data Stream Bar */}
          <View style={styles.dataStreamBar}>
            <View style={styles.streamDot} />
            <Text style={styles.streamText}>LICENSE NEURAL GRID • REAL-TIME ACCESS • 2080 NEURAL DASHBOARD</Text>
            <View style={styles.streamDot} />
          </View>
        </View>

        {/* Current Neural License Status */}
        <View style={styles.neuralStatusSection}>
          <View style={styles.statusSectionHeader}>
            <Icon name="fingerprint" size={24} color="#00f5ff" />
            <Text style={styles.statusSectionTitle}>CURRENT NEURAL STATUS</Text>
            <View style={styles.headerScanner} />
          </View>
          
          <View style={[
            styles.neuralStatusCard,
            { 
              borderLeftColor: isUnlimited ? '#ff0080' : '#00ff88',
              backgroundColor: isUnlimited ? 'rgba(255, 0, 128, 0.05)' : 'rgba(0, 255, 136, 0.05)'
            }
          ]}>
            <View style={styles.statusDisplayHeader}>
              <View style={[
                styles.statusOrb,
                { backgroundColor: isUnlimited ? '#ff0080' : '#00ff88' }
              ]} />
              <View style={styles.statusTextContainer}>
                <Text style={[
                  styles.statusMainText,
                  { color: isUnlimited ? '#ff0080' : '#00ff88' }
                ]}>
                  {isUnlimited ? 'NEURAL SUPREMACY' : 'NEURAL ACTIVE'}
                </Text>
                <Text style={styles.statusSubText}>
                  {isUnlimited ? 'UNLIMITED NEURAL ACCESS' : 'RESTRICTED NEURAL ACCESS'}
                </Text>
              </View>
            </View>
            
            <View style={styles.neuralDataStream}>
              <View style={styles.dataStreamItem}>
                <Icon name="card-membership" size={16} color="#00f5ff" />
                <Text style={styles.dataLabel}>NEURAL TYPE:</Text>
                <Text style={styles.dataValue}>{getCurrentLicenseType()}</Text>
              </View>
              
              <View style={styles.dataStreamItem}>
                <Icon name="schedule" size={16} color="#ffaa00" />
                <Text style={styles.dataLabel}>ACCESS TIME:</Text>
                <Text style={styles.dataValue}>
                  {isUnlimited ? 'UNLIMITED' : `${getCurrentDaysRemaining()} NEURAL CYCLES`}
                </Text>
              </View>
              
              <View style={styles.dataStreamItem}>
                <Icon name="timeline" size={16} color="#ff0080" />
                <Text style={styles.dataLabel}>EXPIRY STATUS:</Text>
                <Text style={styles.dataValue}>
                  {isUnlimited ? 'NEVER EXPIRES' : getCurrentExpiryDate()}
                </Text>
              </View>
              
              <View style={styles.dataStreamItem}>
                <Icon name="security" size={16} color="#00ff88" />
                <Text style={styles.dataLabel}>NEURAL STATUS:</Text>
                <Text style={[styles.dataValue, { color: '#00ff88' }]}>FULLY OPERATIONAL</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Unlimited Neural License Display */}
        {isUnlimited ? (
          <View style={styles.unlimitedNeuralSection}>
            <View style={styles.unlimitedHeader}>
              <Icon name="military-tech" size={32} color="#ff0080" />
              <Text style={styles.unlimitedTitle}>NEURAL SUPREMACY ACHIEVED</Text>
            </View>
            
            <Text style={styles.unlimitedDescription}>
              🎉 CONGRATULATIONS! You have achieved unlimited neural access. 
              All systems are permanently unlocked and operating at maximum capacity.
            </Text>
            
            <View style={styles.neuralFeaturesMatrix}>
              <View style={styles.featureHeader}>
                <Icon name="psychology" size={20} color="#ff0080" />
                <Text style={styles.featureTitle}>NEURAL CAPABILITIES UNLOCKED</Text>
              </View>
              
              <View style={styles.featuresGrid}>
                <View style={styles.neuralFeatureCard}>
                  <Icon name="star" size={20} color="#00f5ff" />
                  <Text style={styles.featureName}>AI Processing Max</Text>
                  <Text style={styles.featureStatus}>UNLOCKED</Text>
                </View>
                
                <View style={styles.neuralFeatureCard}>
                  <Icon name="timeline" size={20} color="#00ff88" />
                  <Text style={styles.featureName}>Neural Analytics</Text>
                  <Text style={styles.featureStatus}>UNLOCKED</Text>
                </View>
                
                <View style={styles.neuralFeatureCard}>
                  <Icon name="security" size={20} color="#ffaa00" />
                  <Text style={styles.featureName}>Security Matrix</Text>
                  <Text style={styles.featureStatus}>UNLOCKED</Text>
                </View>
                
                <View style={styles.neuralFeatureCard}>
                  <Icon name="headset" size={20} color="#ff0080" />
                  <Text style={styles.featureName}>Premium Support</Text>
                  <Text style={styles.featureStatus}>UNLOCKED</Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          /* Neural License Upgrade Plans */
          <View style={styles.neuralPlansSection}>
            <View style={styles.plansHeader}>
              <Icon name="upgrade" size={24} color="#00f5ff" />
              <Text style={styles.plansTitle}>NEURAL UPGRADE MATRIX</Text>
              <View style={styles.plansScanner} />
            </View>
            
            <Text style={styles.plansSubtitle}>
              Enhance your neural capabilities with premium access plans
            </Text>

            {renewalPlans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.neuralPlanCard,
                  plan.popular && styles.popularNeuralPlan
                ]}
                onPress={() => handleRenewal(plan)}
                disabled={renewalInProgress}
              >
                {plan.popular && (
                  <View style={styles.popularNeuralBadge}>
                    <Text style={styles.popularText}>NEURAL RECOMMENDED</Text>
                  </View>
                )}
                
                <View style={styles.planHeader}>
                  <Text style={[styles.planName, { color: plan.color }]}>
                    {plan.name}
                  </Text>
                  <Text style={styles.planPrice}>{plan.price}</Text>
                </View>
                
                <Text style={styles.planDuration}>
                  {plan.duration} neural cycles extension
                </Text>
                
                <Text style={styles.planDescription}>
                  {plan.description}
                </Text>
                
                <View style={styles.featuresList}>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <Icon name="check-circle" size={14} color="#00ff88" />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
                
                <TouchableOpacity
                  style={[
                    styles.neuralRenewButton,
                    { backgroundColor: plan.color },
                    renewalInProgress && styles.renewButtonDisabled
                  ]}
                  onPress={() => handleRenewal(plan)}
                  disabled={renewalInProgress}
                >
                  <Text style={styles.renewButtonText}>
                    {renewalInProgress ? 'NEURAL PROCESSING...' : `UPGRADE NEURAL ACCESS`}
                  </Text>
                  <Icon name="psychology" size={16} color="#ffffff" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Neural Payment Matrix - Only show for non-unlimited licenses */}
        {!isUnlimited && (
          <View style={styles.neuralPaymentSection}>
            <View style={styles.paymentHeader}>
              <Icon name="payment" size={20} color="#00f5ff" />
              <Text style={styles.paymentTitle}>NEURAL PAYMENT MATRIX</Text>
            </View>
            
            <View style={styles.paymentMethods}>
              <View style={styles.paymentMethod}>
                <Icon name="credit-card" size={24} color="#3B82F6" />
                <Text style={styles.paymentText}>Neural Card</Text>
              </View>
              <View style={styles.paymentMethod}>
                <Icon name="account-balance" size={24} color="#10B981" />
                <Text style={styles.paymentText}>Neural Transfer</Text>
              </View>
              <View style={styles.paymentMethod}>
                <Icon name="attach-money" size={24} color="#ffaa00" />
                <Text style={styles.paymentText}>Crypto Neural</Text>
              </View>
            </View>
            
            <View style={styles.neuralSecurityNotice}>
              <Icon name="security" size={20} color="#00ff88" />
              <Text style={styles.securityText}>
                Neural transactions are encrypted with quantum security. Your license will be extended immediately after neural verification.
              </Text>
            </View>
          </View>
        )}

        {/* Bottom Neural Padding */}
        <View style={styles.bottomNeuralPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    ...Platform.select({
      web: {
        height: '100vh',
        overflow: 'auto',
        WebkitOverflowScrolling: 'auto',
        scrollBehavior: 'smooth',
      },
    }),
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
  scrollView: {
    flex: 1,
    ...Platform.select({
      web: {
        minHeight: '100vh',
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

  // Neural Loading Styles
  neuralLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
    position: 'relative',
    overflow: 'hidden',
  },
  neuralLoadingGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    backgroundImage: 'linear-gradient(90deg, rgba(0,245,255,0.1) 1px, transparent 1px), linear-gradient(rgba(0,245,255,0.1) 1px, transparent 1px)',
    backgroundSize: '20px 20px',
    opacity: 0.3,
  },
  neuralLoadingPulse: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 245, 255, 0.2)',
    borderWidth: 2,
    borderColor: '#00f5ff',
    animation: 'pulse 2s infinite',
  },
  neuralLoadingText: {
    color: '#00f5ff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
    textAlign: 'center',
    zIndex: 10,
  },

  // Futuristic 2080 Neural Header Styles
  neural2080Header: {
    backgroundColor: '#0a0a0a',
    padding: 20,
    paddingTop: 20,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 300,
    borderBottomWidth: 2,
    borderBottomColor: '#00f5ff',
  },
  holographicGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    backgroundImage: 'linear-gradient(90deg, rgba(0,245,255,0.1) 1px, transparent 1px), linear-gradient(rgba(0,245,255,0.1) 1px, transparent 1px)',
    backgroundSize: '20px 20px',
    opacity: 0.3,
  },
  energyPulse: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'linear-gradient(90deg, #ff0080, #00f5ff, #00ff88, #ffaa00)',
    background: 'linear-gradient(90deg, #ff0080, #00f5ff, #00ff88, #ffaa00)',
    animation: 'pulse 2s infinite',
  },
  neuralNetworkLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  neuralControlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    zIndex: 10,
  },
  neuralBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#00f5ff',
    position: 'relative',
    overflow: 'hidden',
  },
  backButtonGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 245, 255, 0.2)',
    borderRadius: 12,
  },
  backButtonText: {
    color: '#00f5ff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
    letterSpacing: 2,
  },
  neuralTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  neuralTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 3,
    textShadowColor: '#00f5ff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  titleScanner: {
    width: 200,
    height: 2,
    backgroundColor: 'linear-gradient(90deg, #00f5ff, #ff0080, #00ff88)',
    marginTop: 8,
  },
  neuralStatusPanel: {
    backgroundColor: 'rgba(255, 0, 128, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ff0080',
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusOrb: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff0080',
    marginRight: 8,
    shadowColor: '#ff0080',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  statusText: {
    color: '#ff0080',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginRight: 8,
  },
  dataStreamBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 170, 0, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ffaa00',
  },
  streamDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffaa00',
    marginHorizontal: 10,
  },
  streamText: {
    color: '#ffaa00',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  // Neural Status Section Styles
  neuralStatusSection: {
    padding: 20,
    paddingTop: 10,
  },
  statusSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  statusSectionTitle: {
    color: '#00f5ff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
    letterSpacing: 2,
    textShadowColor: '#00f5ff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  headerScanner: {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: [{ translateX: -50 }],
    width: 200,
    height: 2,
    backgroundColor: 'linear-gradient(90deg, #00f5ff, #ff0080, #00f5ff)',
  },
  neuralStatusCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderLeftWidth: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  statusDisplayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusMainText: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 3,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  statusSubText: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    letterSpacing: 1,
  },
  neuralDataStream: {
    backgroundColor: 'rgba(0, 245, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)',
  },
  dataStreamItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dataLabel: {
    color: '#00f5ff',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 10,
    marginRight: 10,
    letterSpacing: 1,
    minWidth: 100,
  },
  dataValue: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  // Unlimited Neural Section
  unlimitedNeuralSection: {
    padding: 20,
    paddingTop: 10,
  },
  unlimitedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  unlimitedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff0080',
    marginLeft: 12,
    letterSpacing: 2,
    textShadowColor: '#ff0080',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  unlimitedDescription: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
    backgroundColor: 'rgba(255, 0, 128, 0.1)',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 128, 0.3)',
  },
  neuralFeaturesMatrix: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: '#ff0080',
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff0080',
    marginLeft: 12,
    letterSpacing: 2,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  neuralFeatureCard: {
    backgroundColor: 'rgba(255, 0, 128, 0.1)',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 128, 0.3)',
  },
  featureName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  featureStatus: {
    color: '#00ff88',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  // Neural Plans Section
  neuralPlansSection: {
    padding: 20,
    paddingTop: 10,
  },
  plansHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  plansTitle: {
    color: '#00f5ff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
    letterSpacing: 2,
    textShadowColor: '#00f5ff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  plansScanner: {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: [{ translateX: -50 }],
    width: 280,
    height: 2,
    backgroundColor: 'linear-gradient(90deg, #00f5ff, #ff0080, #00f5ff)',
  },
  plansSubtitle: {
    color: '#94A3B8',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  neuralPlanCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: 'rgba(0, 245, 255, 0.3)',
    position: 'relative',
    overflow: 'hidden',
  },
  popularNeuralPlan: {
    borderColor: '#10B981',
    borderWidth: 2,
    transform: [{ scale: 1.02 }],
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  popularNeuralBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  popularText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  planPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  planDuration: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 8,
  },
  planDescription: {
    color: '#CBD5E1',
    fontSize: 14,
    marginBottom: 15,
    lineHeight: 20,
  },
  featuresList: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    color: '#ffffff',
    fontSize: 12,
    marginLeft: 8,
  },
  neuralRenewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  renewButtonDisabled: {
    opacity: 0.6,
  },
  renewButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
    letterSpacing: 1,
  },

  // Neural Payment Section
  neuralPaymentSection: {
    padding: 20,
    paddingTop: 10,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  paymentTitle: {
    color: '#00f5ff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
    letterSpacing: 2,
  },
  paymentMethods: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
    marginBottom: 20,
  },
  paymentMethod: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)',
  },
  paymentText: {
    color: '#ffffff',
    fontSize: 12,
    marginTop: 8,
  },
  neuralSecurityNotice: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
  },
  securityText: {
    color: '#00ff88',
    fontSize: 12,
    marginLeft: 10,
    flex: 1,
    lineHeight: 18,
  },

  bottomNeuralPadding: {
    height: 40,
  },
});

export default LicenseRenewalScreen;