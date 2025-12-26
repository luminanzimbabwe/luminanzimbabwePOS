import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ROUTES } from '../constants/navigation';
import { shopAPI } from '../services/api';

const WelcomeScreen = () => {
  const navigation = useNavigation();
  const [isChecking, setIsChecking] = useState(true);
  const [shopExists, setShopExists] = useState(false);
  const [networkError, setNetworkError] = useState(false);

  useEffect(() => {
    checkShopStatus();
  }, []);

  const checkShopStatus = async () => {
    try {
      const response = await shopAPI.checkStatus();
      setShopExists(response.data.is_registered);
    } catch (error) {
      console.error('Error checking shop status:', error);
      if (!error.response || error.message.includes('Network')) {
        setNetworkError(true);
      }
      // Default to no shop exists if check fails
      setShopExists(false);
    } finally {
      setIsChecking(false);
    }
  };

  if (isChecking) {
    return (
      <View style={styles.container}>
        <View style={styles.background} />
        <View style={styles.gradient} />
        <View style={styles.centeredContainer}>
          <View style={styles.glassCard}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={[styles.title, { marginTop: 16 }]}>Checking shop status...</Text>
          </View>
        </View>
      </View>
    );
  }

  if (networkError) {
    return (
      <View style={styles.container}>
        <View style={styles.background} />
        <View style={styles.gradient} />
        <View style={styles.centeredContainer}>
          <View style={styles.glassCard}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>📶</Text>
            </View>
            <Text style={styles.title}>No Internet Connection</Text>
            <Text style={styles.subtitle}>
              Please check your internet connection and try again.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                setNetworkError(false);
                setIsChecking(true);
                checkShopStatus();
              }}
            >
              <Text style={styles.primaryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.background} />
      <View style={styles.gradient} />

      <View style={styles.centeredContainer}>
        <View style={styles.glassCard}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>🏪</Text>
          </View>
 
          {shopExists && (
            <View style={styles.successBanner}>
              <Text style={styles.successBannerText}>✅ Shop successfully registered!</Text>
            </View>
          )}
 
          <Text style={styles.title}>Welcome to LuminaN</Text>
          <Text style={styles.subtitle}>
            {shopExists
              ? 'Your shop is ready. Please sign in to continue.'
              : 'Your premium business management solution'
            }
          </Text>
 
          {!shopExists && (
            <View style={styles.noShopBanner}>
              <Text style={styles.noShopBannerText}>❌ No shop registered yet</Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            {shopExists ? (
              <>
                <Text style={styles.shopExistsText}>Shop already registered on this device</Text>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => navigation.replace(ROUTES.LOGIN)}
                >
                  <Text style={styles.primaryButtonText}>Sign In (Owner)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cashierButton}
                  onPress={() => navigation.navigate(ROUTES.LOGIN, { role: 'cashier' })}
                >
                  <Text style={styles.cashierButtonText}>Cashier Login</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => navigation.navigate(ROUTES.REGISTER)}
                >
                  <Text style={styles.primaryButtonText}>Create a New Shop</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => navigation.navigate(ROUTES.LOGIN)}
                >
                  <Text style={styles.secondaryButtonText}>Sign In</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {!shopExists && (
            <Text style={styles.footerText}>
              Join thousands of businesses already using LuminaN
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0f0f0f',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20, 20, 20, 0.8)',
  },
  glassCard: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 20,
  },
  logoContainer: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  primaryButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  secondaryButtonText: {
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
  },
  cashierButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  cashierButtonText: {
    color: '#22c55e',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  shopExistsText: {
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 16,
    fontWeight: '500',
  },
  successBanner: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  successBannerText: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  noShopBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  noShopBannerText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 48,
  },
});

export default WelcomeScreen;