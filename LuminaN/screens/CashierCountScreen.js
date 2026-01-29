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
  Modal,
  Dimensions,
  TextInput,
  Animated,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { shopStorage } from '../services/storage';
import { shopAPI } from '../services/api';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

const CashierCountScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cashierData, setCashierData] = useState(null);
  const [countData, setCountData] = useState(null);
  const [drawerData, setDrawerData] = useState(null);
  const [shopConfig, setShopConfig] = useState(null);
  
  // Denomination inputs
  const [denominations, setDenominations] = useState({
    // USD denominations (bills)
    usd_100: '',
    usd_50: '',
    usd_20: '',
    usd_10: '',
    usd_5: '',
    usd_2: '',
    usd_1: '',
    // USD coins
    usd_1_coin: '',
    usd_0_50: '',
    usd_0_25: '',
    usd_0_10: '',
    usd_0_05: '',
    usd_0_01: '',
    // ZIG denominations (notes)
    zig_100: '',
    zig_50: '',
    zig_20: '',
    zig_10: '',
    zig_5: '',
    zig_2: '',
    zig_1: '',
    // ZIG coins
    zig_0_50: '',
    // RAND denominations (notes)
    rand_200: '',
    rand_100: '',
    rand_50: '',
    rand_20: '',
    rand_10: '',
    rand_5: '',
    rand_2: '',
    rand_1: '',
    // RAND coins
    rand_0_50: '',
    rand_0_20: '',
    rand_0_10: '',
    rand_0_05: '',
  });
  
  // Electronic payments
  const [electronicPayments, setElectronicPayments] = useState({
    card: '',
    transfer: '',
    ecocash: '',
  });
  
  const [notes, setNotes] = useState('');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Countdown timer state
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes in seconds
  const [countdownActive, setCountdownActive] = useState(true);
  
  // Post-submit variance modal
  const [showVarianceModal, setShowVarianceModal] = useState(false);
  const [submittedCountData, setSubmittedCountData] = useState(null);
  
  // Animated values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    loadCashierData();
    loadShopConfiguration();
    
    // Entry animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  
  // 5-minute countdown timer
  useEffect(() => {
    let timer;
    if (countdownActive && timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining((prev) => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            // Time's up - boot cashier out
            clearInterval(timer);
            // Use setTimeout to ensure state update completes before handling timeout
            setTimeout(() => handleTimeUp(), 100);
            return 0;
          }
          return newTime;
        });
      }, 1000);
    } else if (countdownActive && timeRemaining === 0) {
      // Handle case where timer is at 0
      handleTimeUp();
    }
    return () => clearInterval(timer);
  }, [countdownActive, timeRemaining]);

  const handleTimeUp = async () => {
    if (!countdownActive) return; // Prevent multiple triggers
    setCountdownActive(false);
    
    // Force immediate logout without showing alert (more secure)
    try {
      await shopStorage.clearCredentials();
      // Use replace to prevent going back
      navigation.replace('Login');
    } catch (error) {
      console.error('Error during time-up logout:', error);
      // Fallback navigation
      navigation.replace('Login');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const loadCashierData = async () => {
    try {
      const credentials = await shopStorage.getCredentials();
      if (!credentials) {
        navigation.replace('Login');
        return;
      }

      setCashierData(credentials);
      
      // Load drawer data to get expected amounts
      await loadDrawerData(credentials);
      
      // Load existing count data if any
      await loadExistingCount(credentials);
      
    } catch (error) {
      console.error('Error loading cashier data:', error);
      Alert.alert('Error', 'Failed to load cashier data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const loadDrawerData = async (credentials) => {
    try {
      const response = await shopAPI.getCashierDrawers();
      
      if (response.data && response.data.success) {
        // Find current cashier's drawer
        const currentCashierName = credentials?.cashier_info?.name ||
                                  credentials?.name ||
                                  credentials?.username;
        
        // Skip if no valid cashier name
        if (!currentCashierName) {
          console.error('No cashier name found in credentials');
          return;
        }
        
        const cashierDrawer = response.data.drawers?.find(d => 
          d.cashier_name === currentCashierName || 
          d.cashier === currentCashierName
        );
        
        if (cashierDrawer) {
          setDrawerData(cashierDrawer);
        }
      }
    } catch (error) {
      console.error('Error loading drawer data:', error);
    }
  };
  
  const loadExistingCount = async (credentials) => {
    try {
      const currentCashierName = credentials?.cashier_info?.name ||
                                credentials?.name ||
                                credentials?.username;
      
      // Skip if no valid cashier name
      if (!currentCashierName) {
        console.log('No cashier name found, skipping existing count load');
        return;
      }
      
      const today = new Date().toISOString().split('T')[0];
      
      // Try to get existing count for today
      const response = await shopAPI.getCashierCount(currentCashierName, today);
      
      if (response.data && response.data.success && response.data.count) {
        const count = response.data.count;
        setCountData(count);
        
        // If count is already completed, stop countdown
        if (count.status === 'COMPLETED') {
          setCountdownActive(false);
        }
        
        // Populate denomination fields if count exists
        setDenominations({
          // USD bills
          usd_100: count.usd_100?.toString() || '',
          usd_50: count.usd_50?.toString() || '',
          usd_20: count.usd_20?.toString() || '',
          usd_10: count.usd_10?.toString() || '',
          usd_5: count.usd_5?.toString() || '',
          usd_2: count.usd_2?.toString() || '',
          usd_1: count.usd_1?.toString() || '',
          // USD coins
          usd_1_coin: count.usd_1_coin?.toString() || '',
          usd_0_50: count.usd_0_50?.toString() || '',
          usd_0_25: count.usd_0_25?.toString() || '',
          usd_0_10: count.usd_0_10?.toString() || '',
          usd_0_05: count.usd_0_05?.toString() || '',
          usd_0_01: count.usd_0_01?.toString() || '',
          // ZIG notes
          zig_100: count.zig_100?.toString() || '',
          zig_50: count.zig_50?.toString() || '',
          zig_20: count.zig_20?.toString() || '',
          zig_10: count.zig_10?.toString() || '',
          zig_5: count.zig_5?.toString() || '',
          zig_2: count.zig_2?.toString() || '',
          zig_1: count.zig_1?.toString() || '',
          // ZIG coins
          zig_0_50: count.zig_0_50?.toString() || '',
          // RAND notes
          rand_200: count.rand_200?.toString() || '',
          rand_100: count.rand_100?.toString() || '',
          rand_50: count.rand_50?.toString() || '',
          rand_20: count.rand_20?.toString() || '',
          rand_10: count.rand_10?.toString() || '',
          rand_5: count.rand_5?.toString() || '',
          rand_2: count.rand_2?.toString() || '',
          rand_1: count.rand_1?.toString() || '',
          // RAND coins
          rand_0_50: count.rand_0_50?.toString() || '',
          rand_0_20: count.rand_0_20?.toString() || '',
          rand_0_10: count.rand_0_10?.toString() || '',
          rand_0_05: count.rand_0_05?.toString() || '',
        });
        
        setElectronicPayments({
          card: count.total_card_amount?.toString() || '',
          transfer: count.total_transfer?.toString() || '',
          ecocash: count.total_ecocash?.toString() || '',
        });
        
        setNotes(count.notes || '');
      }
    } catch (error) {
      console.log('No existing count found:', error);
      // No existing count is fine - start fresh
    }
  };

  const loadShopConfiguration = async () => {
    try {
      const credentials = await shopStorage.getCredentials();
      if (!credentials) return;

      const shopInfo = credentials.shop_info || credentials;
      setShopConfig(shopInfo);
    } catch (error) {
      console.error('Error loading shop configuration:', error);
    }
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    loadCashierData();
  };

  // Calculate totals from denominations
  const calculateTotals = () => {
    // USD total (bills + coins)
    const usdTotal = 
      (parseInt(denominations.usd_100) || 0) * 100 +
      (parseInt(denominations.usd_50) || 0) * 50 +
      (parseInt(denominations.usd_20) || 0) * 20 +
      (parseInt(denominations.usd_10) || 0) * 10 +
      (parseInt(denominations.usd_5) || 0) * 5 +
      (parseInt(denominations.usd_2) || 0) * 2 +
      (parseInt(denominations.usd_1) || 0) * 1 +
      (parseInt(denominations.usd_1_coin) || 0) * 1 +
      (parseInt(denominations.usd_0_50) || 0) * 0.50 +
      (parseInt(denominations.usd_0_25) || 0) * 0.25 +
      (parseInt(denominations.usd_0_10) || 0) * 0.10 +
      (parseInt(denominations.usd_0_05) || 0) * 0.05 +
      (parseInt(denominations.usd_0_01) || 0) * 0.01;
    
    // ZIG total (notes + coins)
    const zigTotal = 
      (parseInt(denominations.zig_100) || 0) * 100 +
      (parseInt(denominations.zig_50) || 0) * 50 +
      (parseInt(denominations.zig_20) || 0) * 20 +
      (parseInt(denominations.zig_10) || 0) * 10 +
      (parseInt(denominations.zig_5) || 0) * 5 +
      (parseInt(denominations.zig_2) || 0) * 2 +
      (parseInt(denominations.zig_1) || 0) * 1 +
      (parseInt(denominations.zig_0_50) || 0) * 0.50;
    
    // RAND total (notes + coins)
    const randTotal = 
      (parseInt(denominations.rand_200) || 0) * 200 +
      (parseInt(denominations.rand_100) || 0) * 100 +
      (parseInt(denominations.rand_50) || 0) * 50 +
      (parseInt(denominations.rand_20) || 0) * 20 +
      (parseInt(denominations.rand_10) || 0) * 10 +
      (parseInt(denominations.rand_5) || 0) * 5 +
      (parseInt(denominations.rand_2) || 0) * 2 +
      (parseInt(denominations.rand_1) || 0) * 1 +
      (parseInt(denominations.rand_0_50) || 0) * 0.50 +
      (parseInt(denominations.rand_0_20) || 0) * 0.20 +
      (parseInt(denominations.rand_0_10) || 0) * 0.10 +
      (parseInt(denominations.rand_0_05) || 0) * 0.05;
    
    const cardTotal = parseFloat(electronicPayments.card) || 0;
    const transferTotal = parseFloat(electronicPayments.transfer) || 0;
    const ecocashTotal = parseFloat(electronicPayments.ecocash) || 0;
    
    return {
      usd: usdTotal,
      zig: zigTotal,
      rand: randTotal,
      card: cardTotal,
      transfer: transferTotal,
      ecocash: ecocashTotal,
      total: usdTotal + zigTotal + randTotal + cardTotal + transferTotal + ecocashTotal,
    };
  };
  
  // Get expected amounts from drawer data
  const getExpectedAmounts = () => {
    if (!drawerData?.expected_vs_actual) {
      return { usd: 0, zig: 0, rand: 0, card: 0, total: 0 };
    }
    
    const eva = drawerData.expected_vs_actual;
    const usdExpected = eva.usd?.expected || 0;
    const zigExpected = eva.zig?.expected || 0;
    const randExpected = eva.rand?.expected || 0;
    const cardExpected = (drawerData.current_card?.usd || 0) + 
                        (drawerData.current_card?.zig || 0) + 
                        (drawerData.current_card?.rand || 0);
    
    return {
      usd: usdExpected,
      zig: zigExpected,
      rand: randExpected,
      card: cardExpected,
      total: usdExpected + zigExpected + randExpected + cardExpected,
    };
  };
  
  // Calculate variance
  const calculateVariance = () => {
    const actual = calculateTotals();
    const expected = getExpectedAmounts();
    
    return {
      usd: actual.usd - expected.usd,
      zig: actual.zig - expected.zig,
      rand: actual.rand - expected.rand,
      card: actual.card - expected.card,
      transfer: actual.transfer,
      total: actual.total - expected.total,
    };
  };

  const handleSubmitCount = async () => {
    try {
      setSubmitting(true);
      
      // CRITICAL FIX: Get cashier name from loaded data, fail if not available
      const currentCashierName = cashierData?.cashier_info?.name ||
                                cashierData?.name ||
                                cashierData?.username;
      
      // Validate we have a valid cashier name
      if (!currentCashierName || currentCashierName === 'Unknown') {
        Alert.alert('Error', 'Cashier information not found. Please log in again.');
        setSubmitting(false);
        return;
      }
      
      const today = new Date().toISOString().split('T')[0];
      const totals = calculateTotals();
      const variance = calculateVariance();
      
      const countPayload = {
        cashier_id: currentCashierName,
        date: today,
        // USD Denominations (bills)
        usd_100: parseInt(denominations.usd_100) || 0,
        usd_50: parseInt(denominations.usd_50) || 0,
        usd_20: parseInt(denominations.usd_20) || 0,
        usd_10: parseInt(denominations.usd_10) || 0,
        usd_5: parseInt(denominations.usd_5) || 0,
        usd_2: parseInt(denominations.usd_2) || 0,
        usd_1: parseInt(denominations.usd_1) || 0,
        // USD Coins
        usd_1_coin: parseInt(denominations.usd_1_coin) || 0,
        usd_0_50: parseInt(denominations.usd_0_50) || 0,
        usd_0_25: parseInt(denominations.usd_0_25) || 0,
        usd_0_10: parseInt(denominations.usd_0_10) || 0,
        usd_0_05: parseInt(denominations.usd_0_05) || 0,
        usd_0_01: parseInt(denominations.usd_0_01) || 0,
        // ZIG Denominations (notes)
        zig_100: parseInt(denominations.zig_100) || 0,
        zig_50: parseInt(denominations.zig_50) || 0,
        zig_20: parseInt(denominations.zig_20) || 0,
        zig_10: parseInt(denominations.zig_10) || 0,
        zig_5: parseInt(denominations.zig_5) || 0,
        zig_2: parseInt(denominations.zig_2) || 0,
        zig_1: parseInt(denominations.zig_1) || 0,
        // ZIG Coins
        zig_0_50: parseInt(denominations.zig_0_50) || 0,
        // RAND Denominations (notes)
        rand_200: parseInt(denominations.rand_200) || 0,
        rand_100: parseInt(denominations.rand_100) || 0,
        rand_50: parseInt(denominations.rand_50) || 0,
        rand_20: parseInt(denominations.rand_20) || 0,
        rand_10: parseInt(denominations.rand_10) || 0,
        rand_5: parseInt(denominations.rand_5) || 0,
        rand_2: parseInt(denominations.rand_2) || 0,
        rand_1: parseInt(denominations.rand_1) || 0,
        // RAND Coins
        rand_0_50: parseInt(denominations.rand_0_50) || 0,
        rand_0_20: parseInt(denominations.rand_0_20) || 0,
        rand_0_10: parseInt(denominations.rand_0_10) || 0,
        rand_0_05: parseInt(denominations.rand_0_05) || 0,
        // Electronic payments
        total_card_amount: totals.card,
        total_transfer: totals.transfer,
        total_ecocash: totals.ecocash,
        // Calculated totals
        total_cash_usd: totals.usd,
        total_cash_zig: totals.zig,
        total_cash_rand: totals.rand,
        expected_cash: getExpectedAmounts().zig,
        expected_cash_usd: getExpectedAmounts().usd,
        expected_cash_rand: getExpectedAmounts().rand,
        expected_card: getExpectedAmounts().card,
        notes: notes,
        status: 'COMPLETED',
      };
      
      const response = await shopAPI.saveCashierCount(countPayload);
      
      if (response.data && response.data.success) {
        setCountdownActive(false); // Stop the countdown
        setCountData(response.data.count);
        setSubmittedCountData({
          ...response.data.count,
          variance: variance,
          totals: totals,
          expected: getExpectedAmounts(),
        });
        setShowSubmitModal(false);
        setShowVarianceModal(true); // Show the variance modal after successful submit
      } else {
        throw new Error(response.data?.error || 'Failed to submit count');
      }
    } catch (error) {
      console.error('Error submitting count:', error);
      Alert.alert('Error', error.message || 'Failed to submit count');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseVarianceModal = async () => {
    setShowVarianceModal(false);
    // Boot cashier to login screen after seeing variance
    await shopStorage.clearCredentials();
    navigation.replace('Login');
  };

  const formatCurrency = (amount, currency = 'USD') => {
    const numAmount = parseFloat(amount) || 0;
    if (currency === 'ZIG') {
      return `ZW$${numAmount.toLocaleString()}`;
    } else if (currency === 'RAND') {
      return `R${numAmount.toFixed(2)}`;
    } else {
      return `$${numAmount.toFixed(2)}`;
    }
  };

  const getVarianceColor = (variance) => {
    if (variance === 0) return '#00ff88';
    if (variance > 0) return '#ffaa00';
    return '#ff4444';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.replace('CashierDashboard')}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🧮 Cash Count</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00f5ff" />
          <Text style={styles.loadingText}>Loading count data...</Text>
        </View>
      </View>
    );
  }

  const totals = calculateTotals();
  const expected = getExpectedAmounts();
  const variance = calculateVariance();
  
  // Calculate shortages only (negative variances)
  const shortages = {
    usd: variance.usd < 0 ? Math.abs(variance.usd) : 0,
    zig: variance.zig < 0 ? Math.abs(variance.zig) : 0,
    rand: variance.rand < 0 ? Math.abs(variance.rand) : 0,
    card: variance.card < 0 ? Math.abs(variance.card) : 0,
    total: variance.total < 0 ? Math.abs(variance.total) : 0,
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={[styles.webScrollView]}
        contentContainerStyle={styles.webContentContainer}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
        scrollEventThrottle={16}
        nestedScrollEnabled={Platform.OS === 'web'}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header with Countdown Timer */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.replace('CashierDashboard')}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🧮 Cash Count</Text>
          <View style={styles.timerContainer}>
            <Text style={[styles.timerText, timeRemaining < 60 && styles.timerWarning]}>
              ⏱️ {formatTime(timeRemaining)}
            </Text>
          </View>
        </View>

        {/* Neural Count Interface */}
        <Animated.View 
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          {/* BIG WARNING BANNER - ONE COUNT ONLY */}
          <View style={styles.bigWarningBanner}>
            <View style={styles.warningIconContainer}>
              <Icon name="warning" size={40} color="#ff4444" />
            </View>
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>⚠️ IMPORTANT: ONE COUNT ONLY!</Text>
              <Text style={styles.warningText}>
                You can only submit ONE count. No recounts allowed!
              </Text>
              <Text style={styles.warningText}>
                Once you submit, your count will be saved and shown to the owner.
              </Text>
              <Text style={styles.timerWarningText}>
                ⏰ You have 5 MINUTES to complete this count!
              </Text>
              <Text style={styles.warningFinal}>
                THIS ACTION CANNOT BE UNDONE!
              </Text>
            </View>
          </View>

          {/* Status Banner */}
          <View style={styles.statusBanner}>
            <View style={styles.statusIndicator}>
              <View style={[
                styles.statusDot, 
                { backgroundColor: countData?.status === 'COMPLETED' ? '#00ff88' : '#ffaa00' }
              ]} />
              <Text style={styles.statusText}>
                Status: {countData?.status === 'COMPLETED' ? 'Count Completed ✓' : 'Count In Progress'}
              </Text>
            </View>
          </View>

          {/* USD Denominations Section */}
          <View style={styles.denominationSection}>
            <View style={styles.sectionHeader}>
              <Icon name="attach-money" size={24} color="#00f5ff" />
              <Text style={styles.sectionTitle}>USD Bills</Text>
            </View>

            <View style={styles.denominationsGrid}>
              {[
                { key: 'usd_100', label: '$100', value: 100 },
                { key: 'usd_50', label: '$50', value: 50 },
                { key: 'usd_20', label: '$20', value: 20 },
                { key: 'usd_10', label: '$10', value: 10 },
                { key: 'usd_5', label: '$5', value: 5 },
                { key: 'usd_2', label: '$2', value: 2 },
                { key: 'usd_1', label: '$1', value: 1 },
              ].map((denom) => (
                <View key={denom.key} style={styles.denominationInput}>
                  <Text style={styles.denominationLabel}>{denom.label}</Text>
                  <TextInput
                    style={styles.denominationField}
                    keyboardType="number-pad"
                    value={denominations[denom.key]}
                    onChangeText={(value) => setDenominations(prev => ({
                      ...prev,
                      [denom.key]: value
                    }))}
                    placeholder="0"
                    placeholderTextColor="#6b7280"
                  />
                  <Text style={styles.denominationSubtotal}>
                    = ${((parseInt(denominations[denom.key]) || 0) * denom.value).toFixed(0)}
                  </Text>
                </View>
              ))}
            </View>

            {/* USD Coins Subsection */}
            <View style={styles.sectionHeader}>
              <Icon name="monetization-on" size={20} color="#00f5ff" />
              <Text style={styles.sectionTitle}>USD Coins</Text>
            </View>

            <View style={styles.denominationsGrid}>
              {[
                { key: 'usd_1_coin', label: '$1 Coin', value: 1 },
                { key: 'usd_0_50', label: '50¢', value: 0.50 },
                { key: 'usd_0_25', label: '25¢', value: 0.25 },
                { key: 'usd_0_10', label: '10¢', value: 0.10 },
                { key: 'usd_0_05', label: '5¢', value: 0.05 },
                { key: 'usd_0_01', label: '1¢', value: 0.01 },
              ].map((denom) => (
                <View key={denom.key} style={styles.denominationInput}>
                  <Text style={styles.denominationLabel}>{denom.label}</Text>
                  <TextInput
                    style={styles.denominationField}
                    keyboardType="number-pad"
                    value={denominations[denom.key]}
                    onChangeText={(value) => setDenominations(prev => ({
                      ...prev,
                      [denom.key]: value
                    }))}
                    placeholder="0"
                    placeholderTextColor="#6b7280"
                  />
                  <Text style={styles.denominationSubtotal}>
                    = ${((parseInt(denominations[denom.key]) || 0) * denom.value).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>USD Total:</Text>
              <Text style={[styles.subtotalValue, { color: '#00f5ff' }]}>
                {formatCurrency(totals.usd, 'USD')}
              </Text>
            </View>
          </View>

          {/* ZIG Denominations Section */}
          <View style={styles.denominationSection}>
            <View style={styles.sectionHeader}>
              <Icon name="attach-money" size={24} color="#f59e0b" />
              <Text style={styles.sectionTitle}>ZW$ Notes</Text>
            </View>

            <View style={styles.denominationsGrid}>
              {[
                { key: 'zig_100', label: 'Z$100', value: 100 },
                { key: 'zig_50', label: 'Z$50', value: 50 },
                { key: 'zig_20', label: 'Z$20', value: 20 },
                { key: 'zig_10', label: 'Z$10', value: 10 },
                { key: 'zig_5', label: 'Z$5', value: 5 },
                { key: 'zig_2', label: 'Z$2', value: 2 },
                { key: 'zig_1', label: 'Z$1', value: 1 },
              ].map((denom) => (
                <View key={denom.key} style={styles.denominationInput}>
                  <Text style={styles.denominationLabel}>{denom.label}</Text>
                  <TextInput
                    style={styles.denominationField}
                    keyboardType="number-pad"
                    value={denominations[denom.key]}
                    onChangeText={(value) => setDenominations(prev => ({
                      ...prev,
                      [denom.key]: value
                    }))}
                    placeholder="0"
                    placeholderTextColor="#6b7280"
                  />
                  <Text style={styles.denominationSubtotal}>
                    = ZW${((parseInt(denominations[denom.key]) || 0) * denom.value).toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>

            {/* ZIG Coins Subsection */}
            <View style={styles.sectionHeader}>
              <Icon name="monetization-on" size={20} color="#f59e0b" />
              <Text style={styles.sectionTitle}>ZW$ Coins</Text>
            </View>

            <View style={styles.denominationsGrid}>
              {[
                { key: 'zig_0_50', label: '50¢', value: 0.50 },
              ].map((denom) => (
                <View key={denom.key} style={styles.denominationInput}>
                  <Text style={styles.denominationLabel}>{denom.label}</Text>
                  <TextInput
                    style={styles.denominationField}
                    keyboardType="number-pad"
                    value={denominations[denom.key]}
                    onChangeText={(value) => setDenominations(prev => ({
                      ...prev,
                      [denom.key]: value
                    }))}
                    placeholder="0"
                    placeholderTextColor="#6b7280"
                  />
                  <Text style={styles.denominationSubtotal}>
                    = ZW${((parseInt(denominations[denom.key]) || 0) * denom.value).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>ZW$ Total:</Text>
              <Text style={[styles.subtotalValue, { color: '#f59e0b' }]}>
                {formatCurrency(totals.zig, 'ZIG')}
              </Text>
            </View>
          </View>

          {/* RAND Denominations Section */}
          <View style={styles.denominationSection}>
            <View style={styles.sectionHeader}>
              <Icon name="attach-money" size={24} color="#ffaa00" />
              <Text style={styles.sectionTitle}>RAND Notes</Text>
            </View>

            <View style={styles.denominationsGrid}>
              {[
                { key: 'rand_200', label: 'R200', value: 200 },
                { key: 'rand_100', label: 'R100', value: 100 },
                { key: 'rand_50', label: 'R50', value: 50 },
                { key: 'rand_20', label: 'R20', value: 20 },
                { key: 'rand_10', label: 'R10', value: 10 },
                { key: 'rand_5', label: 'R5', value: 5 },
                { key: 'rand_2', label: 'R2', value: 2 },
                { key: 'rand_1', label: 'R1', value: 1 },
              ].map((denom) => (
                <View key={denom.key} style={styles.denominationInput}>
                  <Text style={styles.denominationLabel}>{denom.label}</Text>
                  <TextInput
                    style={styles.denominationField}
                    keyboardType="number-pad"
                    value={denominations[denom.key]}
                    onChangeText={(value) => setDenominations(prev => ({
                      ...prev,
                      [denom.key]: value
                    }))}
                    placeholder="0"
                    placeholderTextColor="#6b7280"
                  />
                  <Text style={styles.denominationSubtotal}>
                    = R{((parseInt(denominations[denom.key]) || 0) * denom.value).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>

            {/* RAND Coins Subsection */}
            <View style={styles.sectionHeader}>
              <Icon name="monetization-on" size={20} color="#ffaa00" />
              <Text style={styles.sectionTitle}>RAND Coins</Text>
            </View>

            <View style={styles.denominationsGrid}>
              {[
                { key: 'rand_0_50', label: '50c', value: 0.50 },
                { key: 'rand_0_20', label: '20c', value: 0.20 },
                { key: 'rand_0_10', label: '10c', value: 0.10 },
                { key: 'rand_0_05', label: '5c', value: 0.05 },
              ].map((denom) => (
                <View key={denom.key} style={styles.denominationInput}>
                  <Text style={styles.denominationLabel}>{denom.label}</Text>
                  <TextInput
                    style={styles.denominationField}
                    keyboardType="number-pad"
                    value={denominations[denom.key]}
                    onChangeText={(value) => setDenominations(prev => ({
                      ...prev,
                      [denom.key]: value
                    }))}
                    placeholder="0"
                    placeholderTextColor="#6b7280"
                  />
                  <Text style={styles.denominationSubtotal}>
                    = R{((parseInt(denominations[denom.key]) || 0) * denom.value).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>RAND Total:</Text>
              <Text style={[styles.subtotalValue, { color: '#ffaa00' }]}>
                {formatCurrency(totals.rand, 'RAND')}
              </Text>
            </View>
          </View>

          {/* Electronic Payments Section */}
          <View style={styles.denominationSection}>
            <View style={styles.sectionHeader}>
              <Icon name="credit-card" size={24} color="#10b981" />
              <Text style={styles.sectionTitle}>Electronic Payments</Text>
            </View>
            
            <View style={styles.electronicPaymentsGrid}>
              <View style={styles.electronicPaymentInput}>
                <View style={styles.paymentLabelRow}>
                  <Icon name="credit-card" size={20} color="#10b981" />
                  <Text style={styles.paymentLabel}>Card Payments</Text>
                </View>
                <TextInput
                  style={styles.paymentField}
                  keyboardType="decimal-pad"
                  value={electronicPayments.card}
                  onChangeText={(value) => setElectronicPayments(prev => ({
                    ...prev,
                    card: value
                  }))}
                  placeholder="0.00"
                  placeholderTextColor="#6b7280"
                />
              </View>
              
              <View style={styles.electronicPaymentInput}>
                <View style={styles.paymentLabelRow}>
                  <Icon name="swap-horiz" size={20} color="#00f5ff" />
                  <Text style={styles.paymentLabel}>Transfers</Text>
                </View>
                <TextInput
                  style={styles.paymentField}
                  keyboardType="decimal-pad"
                  value={electronicPayments.transfer}
                  onChangeText={(value) => setElectronicPayments(prev => ({
                    ...prev,
                    transfer: value
                  }))}
                  placeholder="0.00"
                  placeholderTextColor="#6b7280"
                />
              </View>
              
              <View style={styles.electronicPaymentInput}>
                <View style={styles.paymentLabelRow}>
                  <Icon name="phone-android" size={20} color="#ffaa00" />
                  <Text style={styles.paymentLabel}>EcoCash</Text>
                </View>
                <TextInput
                  style={styles.paymentField}
                  keyboardType="decimal-pad"
                  value={electronicPayments.ecocash}
                  onChangeText={(value) => setElectronicPayments(prev => ({
                    ...prev,
                    ecocash: value
                  }))}
                  placeholder="0.00"
                  placeholderTextColor="#6b7280"
                />
              </View>
            </View>
          </View>

          {/* Total Counted Section (No Variance!) */}
          <View style={styles.totalCountedCard}>
            <View style={styles.cardHeader}>
              <Icon name="calculate" size={24} color="#00ff88" />
              <Text style={styles.cardTitle}>Total Counted</Text>
            </View>
            
            <View style={styles.totalCountedGrid}>
              <View style={styles.totalCountedItem}>
                <Text style={styles.totalCountedLabel}>USD Cash</Text>
                <Text style={[styles.totalCountedValue, { color: '#00f5ff' }]}>
                  {formatCurrency(totals.usd, 'USD')}
                </Text>
              </View>
              <View style={styles.totalCountedItem}>
                <Text style={styles.totalCountedLabel}>ZW$ Cash</Text>
                <Text style={[styles.totalCountedValue, { color: '#f59e0b' }]}>
                  {formatCurrency(totals.zig, 'ZIG')}
                </Text>
              </View>
              <View style={styles.totalCountedItem}>
                <Text style={styles.totalCountedLabel}>RAND Cash</Text>
                <Text style={[styles.totalCountedValue, { color: '#ffaa00' }]}>
                  {formatCurrency(totals.rand, 'RAND')}
                </Text>
              </View>
              <View style={styles.totalCountedItem}>
                <Text style={styles.totalCountedLabel}>Electronic</Text>
                <Text style={[styles.totalCountedValue, { color: '#10b981' }]}>
                  {formatCurrency(totals.card + totals.transfer + totals.ecocash, 'USD')}
                </Text>
              </View>
            </View>
            
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>GRAND TOTAL:</Text>
              <Text style={styles.grandTotalValue}>
                {formatCurrency(totals.total, 'USD')}
              </Text>
            </View>
          </View>

          {/* Notes Section */}
          <View style={styles.notesSection}>
            <View style={styles.sectionHeader}>
              <Icon name="note" size={24} color="#8b5cf6" />
              <Text style={styles.sectionTitle}>Notes</Text>
            </View>
            <TextInput
              style={styles.notesInput}
              multiline
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any notes about the count..."
              placeholderTextColor="#6b7280"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.submitButton, countData?.status === 'COMPLETED' && styles.submitButtonDisabled]}
            onPress={() => setShowSubmitModal(true)}
            disabled={countData?.status === 'COMPLETED'}
          >
            <Icon name="check-circle" size={24} color="#ffffff" />
            <Text style={styles.submitButtonText}>
              {countData?.status === 'COMPLETED' ? 'Count Already Submitted' : 'Submit Count'}
            </Text>
          </TouchableOpacity>

          {/* Bottom padding */}
          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>

      {/* Submit Confirmation Modal */}
      <Modal
        visible={showSubmitModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSubmitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Icon name="check-circle" size={40} color="#00ff88" />
              <Text style={styles.modalTitle}>Confirm Count Submission</Text>
            </View>
            
            <View style={styles.modalWarningBox}>
              <Icon name="warning" size={24} color="#ff4444" />
              <Text style={styles.modalWarningText}>
                FINAL WARNING: This is your ONLY count. Once submitted, it cannot be changed!
              </Text>
            </View>

            <View style={styles.modalSummary}>
              <Text style={styles.modalSummaryTitle}>Count Summary</Text>
              
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>USD Cash:</Text>
                <Text style={styles.modalValue}>{formatCurrency(totals.usd, 'USD')}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>ZW$ Cash:</Text>
                <Text style={styles.modalValue}>{formatCurrency(totals.zig, 'ZIG')}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>RAND Cash:</Text>
                <Text style={styles.modalValue}>{formatCurrency(totals.rand, 'RAND')}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Card:</Text>
                <Text style={styles.modalValue}>{formatCurrency(totals.card, 'USD')}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Transfer:</Text>
                <Text style={styles.modalValue}>{formatCurrency(totals.transfer, 'USD')}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>EcoCash:</Text>
                <Text style={styles.modalValue}>{formatCurrency(totals.ecocash, 'USD')}</Text>
              </View>
              
              <View style={[styles.modalRow, styles.modalTotalRow]}>
                <Text style={styles.modalTotalLabel}>Total Counted:</Text>
                <Text style={styles.modalTotalValue}>{formatCurrency(totals.total, 'USD')}</Text>
              </View>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowSubmitModal(false)}
                disabled={submitting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalConfirmButton}
                onPress={handleSubmitCount}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Icon name="check" size={20} color="#ffffff" />
                    <Text style={styles.modalConfirmText}>Confirm Submit</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* POST-SUBMIT VARIANCE MODAL - Shows shortages only after submit */}
      <Modal
        visible={showVarianceModal}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCloseVarianceModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.varianceModalContent]}>
            <View style={[styles.modalHeader, styles.varianceModalHeader]}>
              <Icon name="assessment" size={48} color="#ff4444" />
              <Text style={[styles.modalTitle, styles.varianceModalTitle]}>COUNT RESULTS</Text>
              <Text style={styles.varianceModalSubtitle}>
                Your count has been submitted successfully!
              </Text>
            </View>
            
            <View style={styles.varianceResultsContainer}>
              <Text style={styles.varianceResultsTitle}>📊 SHORTAGE REPORT</Text>
              
              {shortages.total === 0 ? (
                <View style={styles.noShortageContainer}>
                  <Icon name="check-circle" size={64} color="#00ff88" />
                  <Text style={styles.noShortageText}>NO SHORTAGES!</Text>
                  <Text style={styles.noShortageSubtext}>
                    Your count matches perfectly. Great job!
                  </Text>
                </View>
              ) : (
                <>
                  {shortages.usd > 0 && (
                    <View style={styles.shortageRow}>
                      <Text style={styles.shortageLabel}>USD Shortage:</Text>
                      <Text style={styles.shortageValue}>
                        {formatCurrency(shortages.usd, 'USD')}
                      </Text>
                    </View>
                  )}
                  
                  {shortages.zig > 0 && (
                    <View style={styles.shortageRow}>
                      <Text style={styles.shortageLabel}>ZW$ Shortage:</Text>
                      <Text style={styles.shortageValue}>
                        {formatCurrency(shortages.zig, 'ZIG')}
                      </Text>
                    </View>
                  )}
                  
                  {shortages.rand > 0 && (
                    <View style={styles.shortageRow}>
                      <Text style={styles.shortageLabel}>RAND Shortage:</Text>
                      <Text style={styles.shortageValue}>
                        {formatCurrency(shortages.rand, 'RAND')}
                      </Text>
                    </View>
                  )}
                  
                  {shortages.card > 0 && (
                    <View style={styles.shortageRow}>
                      <Text style={styles.shortageLabel}>Card Shortage:</Text>
                      <Text style={styles.shortageValue}>
                        {formatCurrency(shortages.card, 'USD')}
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.totalShortageRow}>
                    <Text style={styles.totalShortageLabel}>TOTAL SHORTAGE:</Text>
                    <Text style={styles.totalShortageValue}>
                      {formatCurrency(shortages.total, 'USD')}
                    </Text>
                  </View>
                </>
              )}
              
              {variance.total > 0 && (
                <View style={styles.overCountRow}>
                  <Text style={styles.overCountLabel}>OVER COUNT:</Text>
                  <Text style={styles.overCountValue}>
                    +{formatCurrency(variance.total, 'USD')}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.varianceWarningBox}>
              <Icon name="info" size={24} color="#00f5ff" />
              <Text style={styles.varianceWarningText}>
                This information has been recorded and will be reviewed by management.
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.varianceCloseButton}
              onPress={handleCloseVarianceModal}
            >
              <Text style={styles.varianceCloseButtonText}>Exit to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  webScrollView: {
    ...Platform.select({
      web: {
        height: '100vh',
        maxHeight: '100vh',
      },
    }),
  },
  webContentContainer: {
    flexGrow: 1,
    minHeight: '100vh',
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#111111',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  backButton: {
    color: '#00f5ff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  timerContainer: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#00f5ff',
  },
  timerText: {
    color: '#00f5ff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'Courier New, monospace' : 'Courier New',
  },
  timerWarning: {
    color: '#ff4444',
    borderColor: '#ff4444',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 16,
    fontSize: 16,
  },
  content: {
    padding: 16,
  },
  
  // Big Warning Banner
  bigWarningBanner: {
    backgroundColor: 'rgba(255, 68, 68, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#ff4444',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  warningIconContainer: {
    marginRight: 16,
    marginTop: 4,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    color: '#ff4444',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 12,
    letterSpacing: 1,
  },
  warningText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 20,
  },
  timerWarningText: {
    color: '#ffaa00',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 170, 0, 0.1)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffaa00',
  },
  warningFinal: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 8,
    textAlign: 'center',
    letterSpacing: 2,
  },
  
  // Status Banner
  statusBanner: {
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#00f5ff',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Cards
  totalCountedCard: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#00ff88',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  totalCountedGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalCountedItem: {
    alignItems: 'center',
    flex: 1,
  },
  totalCountedLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 4,
  },
  totalCountedValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#00ff88',
  },
  grandTotalLabel: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  grandTotalValue: {
    color: '#00ff88',
    fontSize: 24,
    fontWeight: '700',
  },
  
  // Denomination Sections
  denominationSection: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  denominationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  denominationInput: {
    width: '48%',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  denominationLabel: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  denominationField: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#4b5563',
    marginBottom: 8,
  },
  denominationSubtotal: {
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'right',
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  subtotalLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  subtotalValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  
  // Electronic Payments
  electronicPaymentsGrid: {
    gap: 12,
  },
  electronicPaymentInput: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  paymentLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  paymentField: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  
  // Notes Section
  notesSection: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  notesInput: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    color: '#ffffff',
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#374151',
  },
  
  // Submit Button
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00ff88',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#6b7280',
  },
  submitButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1f2937',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#00f5ff',
  },
  varianceModalContent: {
    maxWidth: 450,
    borderColor: '#ff4444',
    borderWidth: 3,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  varianceModalHeader: {
    marginBottom: 24,
  },
  modalWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#ff4444',
  },
  modalWarningText: {
    color: '#ff4444',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
  },
  varianceModalTitle: {
    fontSize: 24,
    color: '#ff4444',
    marginTop: 12,
  },
  varianceModalSubtitle: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  modalSummary: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  modalSummaryTitle: {
    color: '#00f5ff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalLabel: {
    color: '#9ca3af',
    fontSize: 14,
  },
  modalValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalTotalRow: {
    borderTopWidth: 2,
    borderTopColor: '#00f5ff',
    marginTop: 8,
    paddingTop: 12,
  },
  modalTotalLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalTotalValue: {
    color: '#00f5ff',
    fontSize: 18,
    fontWeight: '700',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#6b7280',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00ff88',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  modalConfirmText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  
  // Variance Modal Specific Styles
  varianceResultsContainer: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  varianceResultsTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  noShortageContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noShortageText: {
    color: '#00ff88',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
  },
  noShortageSubtext: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  shortageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  shortageLabel: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '600',
  },
  shortageValue: {
    color: '#ff4444',
    fontSize: 18,
    fontWeight: '700',
  },
  totalShortageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#ff4444',
  },
  totalShortageLabel: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  totalShortageValue: {
    color: '#ff4444',
    fontSize: 24,
    fontWeight: '700',
  },
  overCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#00ff88',
  },
  overCountLabel: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  overCountValue: {
    color: '#00ff88',
    fontSize: 24,
    fontWeight: '700',
  },
  varianceWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#00f5ff',
  },
  varianceWarningText: {
    color: '#00f5ff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  varianceCloseButton: {
    backgroundColor: '#ff4444',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  varianceCloseButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default CashierCountScreen;
