import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { shopStorage } from '../services/storage';
import { shopAPI } from '../services/api';

const { width } = Dimensions.get('window');

const OwnerDashboardScreen = () => {
  const navigation = useNavigation();
  const [shopData, setShopData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShopData();
  }, []);

  const loadShopData = async () => {
    try {
      const credentials = await shopStorage.getCredentials();
      console.log('🔍 Raw credentials from storage:', credentials);
      
      if (credentials) {
        // Check if shop data is nested under shop_info or directly in credentials
        const shopInfo = credentials.shop_info || credentials;
        console.log('✅ Extracted shop info:', shopInfo);
        
        // Validate that we have the essential data
        if (shopInfo.name || shopInfo.email) {
          setShopData(shopInfo);
        } else {
          console.log('⚠️ Shop info missing essential data, trying API fallback');
          await fetchFromAPI();
        }
      } else {
        console.log('⚠️ No shop credentials found in storage, fetching from API');
        await fetchFromAPI();
      }
    } catch (error) {
      console.error('❌ Failed to load shop data:', error);
      Alert.alert('Error', 'Failed to load shop data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFromAPI = async () => {
    try {
      console.log('🔄 Fetching shop data from API...');
      const response = await shopAPI.getOwnerDashboard();
      console.log('📡 API Response:', response.data);
      
      if (response.data.shop_info) {
        setShopData(response.data.shop_info);
        console.log('✅ Loaded shop data from API:', response.data.shop_info);
      } else if (response.data.name || response.data.email) {
        // Some APIs return shop data directly
        setShopData(response.data);
        console.log('✅ Loaded shop data directly from API:', response.data);
      } else {
        throw new Error('Invalid API response structure');
      }
    } catch (apiError) {
      console.error('❌ Failed to fetch shop data from API:', apiError);
      // If API fails, show a helpful error message
      Alert.alert(
        'Data Loading Error',
        'Unable to load shop details. Please check your internet connection and try logging in again.',
        [
          { text: 'Retry', onPress: loadShopData },
          { text: 'Go to Login', onPress: () => navigation.navigate('Login') }
        ]
      );
    }
  };

  const handleRetry = () => {
    setLoading(true);
    loadShopData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading shop details...</Text>
      </View>
    );
  }

  if (!shopData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Unable to Load Shop Data</Text>
        <Text style={styles.errorText}>
          We couldn't load your shop details. This might be due to:
        </Text>
        <Text style={styles.errorBullets}>
          • Network connectivity issues{'\n'}
          • Session expired{'\n'}
          • Server temporarily unavailable
        </Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={handleRetry}
        >
          <Text style={styles.retryButtonText}>🔄 Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginButtonText}>🔑 Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Top Section with Shop Info */}
      <View style={styles.topSection}>
        {/* Shop Details on Top Right */}
        <View style={styles.shopDetailsRight}>
          <Text style={styles.shopIdText}>Shop ID: {shopData.shop_id || 'N/A'}</Text>
          <Text style={styles.shopEmailText}>{shopData.email || 'No email'}</Text>
        </View>

        {/* Main Shop Name - HUGE */}
        <View style={styles.shopNameContainer}>
          <Text style={styles.shopName}>
            {shopData.name || shopData.shop_name || 'Your Shop'}
          </Text>
        </View>

        {/* Small Shop Details */}
        <View style={styles.shopDetailsBottom}>
          <Text style={styles.shopAddress}>
            {shopData.address || 'Address not set'}
          </Text>
          <Text style={styles.shopType}>
            {shopData.business_type || 'Business'} • {shopData.industry || 'Industry'}
          </Text>
          <Text style={styles.shopDescription}>
            {shopData.description || 'No description available'}
          </Text>
        </View>
      </View>

      {/* Quick Actions Section */}
      <View style={styles.actionsSection}>
        <Text style={styles.actionsTitle}>Quick Actions</Text>
        
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionEmoji}>🛒</Text>
            <Text style={styles.actionTitle}>Sales</Text>
            <Text style={styles.actionSubtitle}>View today's sales</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionEmoji}>📦</Text>
            <Text style={styles.actionTitle}>Inventory</Text>
            <Text style={styles.actionSubtitle}>Manage products</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('StaffManagement')}
          >
            <Text style={styles.actionEmoji}>👥</Text>
            <Text style={styles.actionTitle}>Staff</Text>
            <Text style={styles.actionSubtitle}>Manage cashiers</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionEmoji}>📊</Text>
            <Text style={styles.actionTitle}>Reports</Text>
            <Text style={styles.actionSubtitle}>View analytics</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Today's Summary */}
      <View style={styles.summarySection}>
        <Text style={styles.summaryTitle}>Today's Summary</Text>
        
        <View style={styles.summaryCards}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>$0.00</Text>
            <Text style={styles.summaryLabel}>Revenue</Text>
          </View>
          
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>0</Text>
            <Text style={styles.summaryLabel}>Orders</Text>
          </View>
          
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>0</Text>
            <Text style={styles.summaryLabel}>Products</Text>
          </View>
        </View>
      </View>

      {/* Debug Info (Development only) */}
      {__DEV__ && (
        <View style={styles.debugSection}>
          <Text style={styles.debugTitle}>Debug Info (Development)</Text>
          <Text style={styles.debugText}>
            Shop ID: {shopData.shop_id || 'N/A'}{'\n'}
            Name: {shopData.name || 'N/A'}{'\n'}
            Email: {shopData.email || 'N/A'}{'\n'}
            Business Type: {shopData.business_type || 'N/A'}{'\n'}
            Industry: {shopData.industry || 'N/A'}
          </Text>
        </View>
      )}

      {/* Bottom Padding */}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
    padding: 20,
  },
  errorTitle: {
    color: '#ef4444',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorBullets: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'left',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#6b7280',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  topSection: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  shopDetailsRight: {
    position: 'absolute',
    top: 20,
    right: 20,
    alignItems: 'flex-end',
  },
  shopIdText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  shopEmailText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    marginTop: 2,
  },
  shopNameContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 40,
  },
  shopName: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 52,
  },
  shopDetailsBottom: {
    alignItems: 'center',
  },
  shopAddress: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  shopType: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  shopDescription: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  actionsSection: {
    padding: 20,
  },
  actionsTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    width: (width - 60) / 2,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionSubtitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    textAlign: 'center',
  },
  summarySection: {
    padding: 20,
    paddingTop: 0,
  },
  summaryTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  summaryCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    width: (width - 60) / 3,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  summaryValue: {
    color: '#22c55e',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    textAlign: 'center',
  },
  debugSection: {
    margin: 20,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  debugTitle: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  debugText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    lineHeight: 16,
  },
  bottomPadding: {
    height: 40,
  },
});

export default OwnerDashboardScreen;