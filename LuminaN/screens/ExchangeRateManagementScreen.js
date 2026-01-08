import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  RefreshControl,
  Animated,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { shopAPI } from '../services/api';

const ExchangeRateManagementScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  // Exchange Rate State
  const [exchangeRates, setExchangeRates] = useState({
    usd_to_zig: '1.00',
    usd_to_rand: '18.50',
    last_updated: null,
  });
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [shopData, setShopData] = useState(null);
  
  // Animation State
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  useEffect(() => {
    loadShopData();
    loadExchangeRates();
    
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadShopData = async () => {
    try {
      const response = await shopAPI.getOwnerDashboard();
      if (response.data) {
        setShopData(response.data.shop_info || response.data);
      }
    } catch (error) {
      console.error('Error loading shop data:', error);
    }
  };

  const loadExchangeRates = async () => {
    try {
      setRefreshing(true);
      const response = await shopAPI.getExchangeRates();
      
      if (response.data && response.data.success) {
        const rates = response.data.data || response.data.rates;
        setExchangeRates({
          usd_to_zig: rates.usd_to_zig?.toString() || '1.00',
          usd_to_rand: rates.usd_to_rand?.toString() || '18.50',
          last_updated: rates.last_updated,
        });
      }
    } catch (error) {
      console.error('Error loading exchange rates:', error);
      Alert.alert(
        '⚠️ Error',
        'Failed to load exchange rates. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const saveExchangeRates = async () => {
    try {
      setSaving(true);
      
      // Validate rates
      const usdToZig = parseFloat(exchangeRates.usd_to_zig);
      const usdToRand = parseFloat(exchangeRates.usd_to_rand);
      
      if (isNaN(usdToZig) || isNaN(usdToRand)) {
        Alert.alert(
          '⚠️ Invalid Input',
          'Please enter valid numeric values for all exchange rates.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      if (usdToZig <= 0 || usdToRand <= 0) {
        Alert.alert(
          '⚠️ Invalid Rates',
          'Exchange rates must be positive numbers.',
          [{ text: 'OK' }]
        );
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const response = await shopAPI.updateExchangeRates({
        date: today,
        usd_to_zig: usdToZig,
        usd_to_rand: usdToRand,
        updated_by: 'owner'
      });

      if (response.data && response.data.success) {
        Alert.alert(
          '✅ RATES UPDATED',
          'Exchange rates have been successfully updated for today!',
          [{ text: 'OK' }]
        );
        
        // Reload rates to get updated timestamp
        await loadExchangeRates();
      }
    } catch (error) {
      console.error('Error saving exchange rates:', error);
      Alert.alert(
        '❌ Save Failed',
        'Failed to save exchange rates. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSaving(false);
    }
  };

  const updateRate = (key, value) => {
    setExchangeRates(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetToDefaults = () => {
    Alert.alert(
      '🔄 Reset Rates',
      'Reset exchange rates to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: () => {
            setExchangeRates({
              usd_to_zig: '1.00',
              usd_to_rand: '18.50',
              last_updated: null,
            });
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#00ffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>💱 Exchange Rates</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00ffff" />
          <Text style={styles.loadingText}>Loading exchange rates...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* NEURAL HEADER */}
      <View style={styles.neuralHeader}>
        <View style={styles.neuralHeaderBackground}>
          <View style={styles.neuralHeaderContent}>
            <TouchableOpacity 
              style={styles.neuralBackButton} 
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back" size={20} color="#00ffff" />
              <Text style={styles.neuralBackText}>BACK</Text>
            </TouchableOpacity>
            
            <View style={styles.neuralTitleContainer}>
              <Text style={styles.neuralGeneration}>GEN 2080</Text>
              <Text style={styles.neuralSubtitle}>💱 EXCHANGE RATE NEURAL CONTROL</Text>
              <Text style={styles.neuralShopName}>
                {shopData?.name || shopData?.business_name || 'SHOP SYSTEM'}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.neuralRefreshButton}
              onPress={loadExchangeRates}
              disabled={refreshing}
            >
              <Icon name="refresh" size={18} color="#00ffff" />
              <Text style={styles.neuralRefreshText}>SYNC</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* NEURAL CONTENT */}
      <Animated.View 
        style={[
          styles.neuralContent,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <ScrollView 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={loadExchangeRates}
              tintColor="#00ffff"
            />
          }
        >
          {/* EXCHANGE RATE CONTROLS */}
          <View style={styles.ratesContainer}>
            <Text style={styles.sectionTitle}>💱 DAILY EXCHANGE RATES</Text>
            <Text style={styles.sectionSubtitle}>
              Set today's exchange rates for Zig Dollar conversions
            </Text>

            {/* RATE INPUTS */}
            <View style={styles.ratesGrid}>
              {/* USD to ZIG */}
              <View style={styles.rateCard}>
                <View style={styles.rateCardHeader}>
                  <Text style={styles.rateIcon}>🇺🇸</Text>
                  <Text style={styles.rateTitle}>USD → ZIG</Text>
                </View>
                <Text style={styles.rateDescription}>US Dollar to Zimbabwe Dollar</Text>
                <View style={styles.rateInputContainer}>
                  <Text style={styles.ratePrefix}>1 USD =</Text>
                  <TextInput
                    style={styles.rateInput}
                    value={exchangeRates.usd_to_zig}
                    onChangeText={(value) => updateRate('usd_to_zig', value)}
                    keyboardType="decimal-pad"
                    placeholder="1.00"
                  />
                  <Text style={styles.rateSuffix}>ZIG</Text>
                </View>
              </View>

              {/* USD to RAND */}
              <View style={styles.rateCard}>
                <View style={styles.rateCardHeader}>
                  <Text style={styles.rateIcon}>🇿🇦</Text>
                  <Text style={styles.rateTitle}>USD → RAND</Text>
                </View>
                <Text style={styles.rateDescription}>US Dollar to South African Rand</Text>
                <View style={styles.rateInputContainer}>
                  <Text style={styles.ratePrefix}>1 USD =</Text>
                  <TextInput
                    style={styles.rateInput}
                    value={exchangeRates.usd_to_rand}
                    onChangeText={(value) => updateRate('usd_to_rand', value)}
                    keyboardType="decimal-pad"
                    placeholder="18.50"
                  />
                  <Text style={styles.rateSuffix}>RAND</Text>
                </View>
              </View>
            </View>

            {/* LAST UPDATED */}
            {exchangeRates.last_updated && (
              <View style={styles.lastUpdatedContainer}>
                <Text style={styles.lastUpdatedText}>
                  📅 Last Updated: {new Date(exchangeRates.last_updated).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            )}

            {/* ACTION BUTTONS */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.resetButton]}
                onPress={resetToDefaults}
              >
                <Icon name="restore" size={20} color="#ffffff" />
                <Text style={styles.actionButtonText}>RESET DEFAULTS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton, 
                  styles.saveButton,
                  saving && styles.saveButtonDisabled
                ]}
                onPress={saveExchangeRates}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Icon name="save" size={20} color="#ffffff" />
                )}
                <Text style={styles.actionButtonText}>
                  {saving ? 'SAVING...' : 'SAVE RATES'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* INFO PANEL */}
            <View style={styles.infoPanel}>
              <Text style={styles.infoTitle}>ℹ️ EXCHANGE RATE INFO</Text>
              <Text style={styles.infoText}>
                • Exchange rates are updated daily for all transactions
              </Text>
              <Text style={styles.infoText}>
                • Rates will be used in all POS calculations automatically
              </Text>
              <Text style={styles.infoText}>
                • Historical rates are maintained for reporting purposes
              </Text>
              <Text style={styles.infoText}>
                • Currency conversion is available in all payment methods
              </Text>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#111111',
    borderBottomWidth: 1,
    borderBottomColor: '#00ffff',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    color: '#00ffff',
    marginTop: 16,
    fontSize: 16,
  },

  // Neural Header Styles
  neuralHeader: {
    backgroundColor: '#000000',
    borderBottomWidth: 2,
    borderBottomColor: '#00ffff',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  neuralHeaderBackground: {
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderWidth: 1,
    borderColor: '#00ffff',
  },
  neuralHeaderContent: {
    padding: 20,
    paddingTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  neuralBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: '#00ffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  neuralBackText: {
    color: '#00ffff',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
    textTransform: 'uppercase',
  },
  neuralTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  neuralGeneration: {
    color: '#00ffff',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  neuralSubtitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  neuralShopName: {
    color: '#00ffff',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  neuralRefreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: '#00ffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  neuralRefreshText: {
    color: '#00ffff',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 6,
    textTransform: 'uppercase',
  },

  // Neural Content Styles
  neuralContent: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  ratesContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#00ffff',
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#00ffff',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionSubtitle: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.8,
  },

  // Rate Cards
  ratesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  rateCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#404040',
    padding: 16,
    width: '48%',
    marginBottom: 16,
  },
  rateCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rateIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  rateTitle: {
    color: '#00ffff',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  rateDescription: {
    color: '#cccccc',
    fontSize: 11,
    marginBottom: 12,
    lineHeight: 14,
  },
  rateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  ratePrefix: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  rateInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 4,
  },
  rateSuffix: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Last Updated
  lastUpdatedContainer: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  lastUpdatedText: {
    color: '#00ffff',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 0,
    flex: 1,
    marginHorizontal: 8,
    justifyContent: 'center',
  },
  resetButton: {
    backgroundColor: '#6b7280',
  },
  saveButton: {
    backgroundColor: '#10b981',
  },
  saveButtonDisabled: {
    backgroundColor: '#6b7280',
    opacity: 0.7,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
    textTransform: 'uppercase',
  },

  // Info Panel
  infoPanel: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  infoTitle: {
    color: '#00ffff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  infoText: {
    color: '#e5e7eb',
    fontSize: 12,
    marginBottom: 4,
    lineHeight: 16,
  },
});

export default ExchangeRateManagementScreen;