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
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { shopStorage } from '../services/storage';
import { shopAPI } from '../services/api';

const CashierDrawerScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerStatus, setDrawerStatus] = useState(null);
  const [shopData, setShopData] = useState(null);
  const [hasDrawerAccess, setHasDrawerAccess] = useState(true);
  const [checkingAccess, setCheckingAccess] = useState(true);
  // Track last refresh date to detect day changes and reset transaction counts
  const [lastRefreshDate, setLastRefreshDate] = useState(new Date().toDateString());
  // Track shop status to determine if we should show drawer data
  const [shopStatus, setShopStatus] = useState(null);
  // Track if shop was closed (for EOD reset detection)
  const [wasShopClosed, setWasShopClosed] = useState(false);

  useEffect(() => {
    checkDrawerAccess();
    loadDrawerData();
    loadShopData();
    checkShopStatus();
  }, []);

  // CRITICAL: Refresh drawer data EVERY TIME the screen comes into focus
  // This ensures we always show fresh data, never cached old data
  useFocusEffect(
    React.useCallback(() => {
      console.log('📱 Drawer screen came into focus - refreshing data...');
      loadDrawerData();
      checkShopStatus();
      return () => {
        console.log('📱 Drawer screen went out of focus');
      };
    }, [])
  );

  // Auto-refresh drawer every 10 seconds to ensure fresh data
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (!loading && !refreshing) {
        console.log('🔄 Auto-refreshing drawer data...');
        loadDrawerData();
      }
    }, 10000); // 10 seconds

    return () => clearInterval(refreshInterval);
  }, [loading, refreshing]);

  // Check shop status to determine if drawer should show data or be empty
  const checkShopStatus = async () => {
    try {
      // Use anonymous endpoint that doesn't require authentication
      const response = await shopAPI.getAnonymousEndpoint('/shop-status-anonymous/');
      if (response.data && response.data.shop_day) {
        setShopStatus(response.data.shop_day);
        console.log('📋 Shop status:', response.data.shop_day);
      }
    } catch (error) {
      console.error('Error checking shop status:', error);
      // Default to showing drawer as active if we can't check
      setShopStatus({ status: 'OPEN', is_open: true, is_closed: false });
    }
  };

  // Check if cashier has drawer access permission
  const checkDrawerAccess = async () => {
    try {
      setCheckingAccess(true);
      const credentials = await shopStorage.getCredentials();
      console.log('🔍 Checking drawer access for credentials:', credentials?.id);
      
      if (!credentials || !credentials.id) {
        console.log('⚠️ No credentials found, defaulting to allow access');
        setHasDrawerAccess(true); // Default to allow if no credentials
        return;
      }
      
      console.log('📡 Calling checkDrawerAccess API for cashier:', credentials.id);
      const response = await shopAPI.checkDrawerAccess(credentials.id);
      console.log('📋 checkDrawerAccess response:', response.data);
      
      if (response.data && response.data.has_access !== undefined) {
        setHasDrawerAccess(response.data.has_access);
        console.log(`✅ Drawer access set to: ${response.data.has_access}`);
      } else {
        console.log('⚠️ No has_access in response, defaulting to allow');
        setHasDrawerAccess(true); // Default to allow if response is unexpected
      }
    } catch (error) {
      console.error('❌ Error checking drawer access:', error);
      console.error('📋 Error response:', error.response?.data);
      setHasDrawerAccess(true); // Default to allow on error
    } finally {
      setCheckingAccess(false);
    }
  };

  // Check if day has changed and reset transaction counts if needed
  const checkAndResetTransactionCounts = (currentDrawerStatus) => {
    if (!currentDrawerStatus) return currentDrawerStatus;
    
    const today = new Date().toDateString();
    const lastDate = lastRefreshDate;
    
    // If it's a new day, reset transaction counts to 0
    if (today !== lastDate) {
      setLastRefreshDate(today);
      
      // Return a copy with reset transaction counts
      return {
        ...currentDrawerStatus,
        usd_transaction_count: 0,
        zig_transaction_count: 0,
        rand_transaction_count: 0,
        total_transaction_count: 0,
        session_sales_by_currency: {
          usd: { ...currentDrawerStatus.session_sales_by_currency?.usd, count: 0 },
          zig: { ...currentDrawerStatus.session_sales_by_currency?.zig, count: 0 },
          rand: { ...currentDrawerStatus.session_sales_by_currency?.rand, count: 0 },
        },
        transaction_counts_by_currency: {
          usd: 0,
          zig: 0,
          rand: 0,
        },
      };
    }
    
    return currentDrawerStatus;
  };

  const loadShopData = async () => {
    try {
      const credentials = await shopStorage.getCredentials();
      if (credentials) {
        const shopInfo = credentials.shop_info || credentials;
        setShopData(shopInfo);
      }
    } catch (error) {
      console.error('Error loading shop data:', error);
    }
  };

  const loadDrawerData = async () => {
    try {
      const credentials = await shopStorage.getCredentials();
      if (!credentials) {
        navigation.replace('Login');
        return;
      }

      // First check shop status - CRITICAL: if shop is closed, drawer should be EMPTY
      // Use anonymous endpoint that doesn't require authentication
      let isShopOpen = true;
      try {
        const statusResponse = await shopAPI.getAnonymousEndpoint('/shop-status-anonymous/');
        if (statusResponse.data && statusResponse.data.shop_day) {
          const shopDay = statusResponse.data.shop_day;
          isShopOpen = shopDay.status === 'OPEN' && !shopDay.is_closed;
          setShopStatus(shopDay);
          console.log('📋 Shop status:', shopDay);
        }
      } catch (statusError) {
        console.warn('Could not check shop status, assuming open:', statusError);
      }

      // CRITICAL: If shop is closed, show ZEROED/EMPTY drawer regardless of date
      // This handles the case where shop opens at 8, closes at 10, reopens at 1
      // When closed, drawer must be empty so it starts fresh when reopened
      if (!isShopOpen) {
        console.log('🔒 Shop is CLOSED - showing empty drawer for new session');
        setDrawerStatus({
          cashier: credentials.name || credentials.username || 'Unknown',
          float_amount: 0,
          float_amount_zig: 0,
          float_amount_rand: 0,
          current_cash_usd: 0,
          current_cash_zig: 0,
          current_cash_rand: 0,
          session_sales_by_currency: {
            usd: { total: 0, count: 0, cash: 0, card: 0, ecocash: 0, transfer: 0 },
            zig: { total: 0, count: 0, cash: 0, card: 0, ecocash: 0, transfer: 0 },
            rand: { total: 0, count: 0, cash: 0, card: 0, ecocash: 0, transfer: 0 }
          },
          transaction_counts_by_currency: {
            usd: 0,
            zig: 0,
            rand: 0
          },
          usd_transaction_count: 0,
          zig_transaction_count: 0,
          rand_transaction_count: 0,
          total_transaction_count: 0,
          status: 'INACTIVE',
          is_shop_closed: true
        });
        setLoading(false);
        return;
      }

      // Shop is OPEN - load drawer data using NEW endpoint that only returns TODAY's sales
      // This endpoint fetches from Sale table filtered by today's date only
      const cashierId = credentials.id;
      if (!cashierId) {
        console.log('⚠️ No cashier ID found, cannot load drawer');
        setLoading(false);
        return;
      }
      
      console.log('📡 Loading today\'s drawer data for cashier:', cashierId);
      const response = await shopAPI.getCashierDrawerToday(cashierId);
      
      if (response.data && response.data.success) {
        const drawerData = response.data.drawer;
        
        // If the new endpoint returned empty drawer data for today, show empty state
        if (drawerData && drawerData.is_empty_drawer) {
          console.log('📋 Today\'s drawer is empty (no sales yet today)');
          setDrawerStatus(drawerData);
        } else if (drawerData) {
          console.log('📋 Today\'s drawer data loaded:', drawerData);
          setDrawerStatus(drawerData);
        } else {
          console.log('📋 No drawer data returned');
          setDrawerStatus(null);
        }
      } else {
        console.log('⚠️ Failed to load drawer data:', response.data);
        setDrawerStatus(null);
      }
    } catch (error) {
      console.error('Error loading drawer data:', error);
      Alert.alert('Error', 'Failed to load drawer data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDrawerData();
  };

  const formatCurrency = (amount, currency = 'USD') => {
    if (currency === 'ZIG') {
      return `${amount.toFixed(2)} ZIG`;
    } else if (currency === 'RAND') {
      return `${amount.toFixed(2)} RAND`;
    } else {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }).format(amount || 0);
    }
  };



  // Get formatted cash display string with proper spacing
  const getFormattedCashDisplay = () => {
    const { usd, zig, rand } = getCashAmounts();
    const parts = [];
    if (usd > 0) parts.push(formatCurrency(usd, 'USD'));
    if (zig > 0) parts.push(formatCurrency(zig, 'ZIG'));
    if (rand > 0) parts.push(formatCurrency(rand, 'RAND'));
    return parts.length > 0 ? parts.join(' + ') : '$0.00';
  };




  // Get cash amounts for each currency (TODAY'S money only)
  const getCashAmounts = () => {
    if (!drawerStatus) return { usd: 0, zig: 0, rand: 0 };
    
    // Use session sales by currency as the source for today's money
    // This ensures we only show money from today's sales
    const usd = drawerStatus.session_sales_by_currency?.usd?.total || 
               drawerStatus.session_cash_sales_usd ||
               drawerStatus.current_cash_usd ||
               0;
    const zig = drawerStatus.session_sales_by_currency?.zig?.total || 
                drawerStatus.session_cash_sales_zig ||
                drawerStatus.current_cash_zig || 0;
    const rand = drawerStatus.session_sales_by_currency?.rand?.total || 
                 drawerStatus.session_cash_sales_rand ||
                 drawerStatus.current_cash_rand || 0;
    
    return { usd, zig, rand };
  };

  // Get float amounts for each currency
  const getFloatAmounts = () => {
    if (!drawerStatus) return { usd: 0, zig: 0, rand: 0 };
    
    return {
      usd: drawerStatus.float_amount || 0,
      zig: drawerStatus.float_amount_zig || 0,
      rand: drawerStatus.float_amount_rand || 0
    };
  };

  // Get session sales by currency
  const getSessionSales = () => {
    if (!drawerStatus) return { usd: 0, zig: 0, rand: 0 };
    
    return {
      usd: drawerStatus.session_sales_by_currency?.usd?.total || drawerStatus.session_sales_usd || 0,
      zig: drawerStatus.session_sales_by_currency?.zig?.total || drawerStatus.session_sales_zig || 0,
      rand: drawerStatus.session_sales_by_currency?.rand?.total || drawerStatus.session_sales_rand || 0
    };
  };

  // Get transaction counts
  const getTransactionCounts = () => {
    if (!drawerStatus) return { usd: 0, zig: 0, rand: 0 };
    
    // Check if this is a new day (session sales are 0 but transaction counts are not)
    // This can happen after EOD reset - show 0 for new day
    const usdSales = drawerStatus.session_sales_by_currency?.usd?.total || 
                    drawerStatus.session_cash_sales_usd ||
                    drawerStatus.session_sales_usd || 0;
    const zigSales = drawerStatus.session_sales_by_currency?.zig?.total || 
                    drawerStatus.session_cash_sales_zig ||
                    drawerStatus.session_sales_zig || 0;
    const randSales = drawerStatus.session_sales_by_currency?.rand?.total || 
                     drawerStatus.session_cash_sales_rand ||
                     drawerStatus.session_sales_rand || 0;
    
    // If all session sales are 0, reset transaction counts to 0 (new day)
    if (usdSales === 0 && zigSales === 0 && randSales === 0) {
      return { usd: 0, zig: 0, rand: 0 };
    }
    
    return {
      usd: drawerStatus.transaction_counts_by_currency?.usd || 
           drawerStatus.session_sales_by_currency?.usd?.count ||
           drawerStatus.usd_transaction_count || 0,
      zig: drawerStatus.transaction_counts_by_currency?.zig || 
           drawerStatus.session_sales_by_currency?.zig?.count ||
           drawerStatus.zig_transaction_count || 0,
      rand: drawerStatus.transaction_counts_by_currency?.rand || 
            drawerStatus.session_sales_by_currency?.rand?.count ||
            drawerStatus.rand_transaction_count || 0
    };
  };

  if (loading || checkingAccess) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>💰 My Drawer</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading drawer information...</Text>
        </View>
      </View>
    );
  }

  // Show access denied message if user doesn't have drawer access
  if (!hasDrawerAccess) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>💰 My Drawer</Text>
        </View>
        <View style={styles.noAccessContainer}>
          <Icon name="lock" size={64} color="#ef4444" />
          <Text style={styles.noAccessTitle}>Access Denied</Text>
          <Text style={styles.noAccessText}>
            You don't have permission to access the cash drawer.
            Please contact your manager or shop owner.
          </Text>
          <TouchableOpacity 
            style={styles.noAccessButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.noAccessButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const { usd, zig, rand } = getCashAmounts();
  const { usd: usdFloat, zig: zigFloat, rand: randFloat } = getFloatAmounts();
  const sessionSales = getSessionSales();
  const transactionCounts = getTransactionCounts();

  return (
    <ScrollView 
      style={[styles.container, Platform.OS === 'web' && styles.webContainer]}
      contentContainerStyle={Platform.OS === 'web' ? styles.webScrollContent : styles.scrollContentContainer}
      showsVerticalScrollIndicator={Platform.OS === 'web'}
      scrollEventThrottle={16}
      nestedScrollEnabled={Platform.OS === 'web'}
      removeClippedSubviews={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>💰 My Drawer</Text>
        <TouchableOpacity onPress={onRefresh} disabled={refreshing}>
          <Text style={styles.refreshButton}>{refreshing ? '⟳' : '↻'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Status */}
        {drawerStatus?.is_shop_closed ? (
          <View style={[styles.statusSection, { borderColor: '#ef4444' }]}>
            <Text style={[styles.statusText, { color: '#ef4444' }]}>🔒 Shop is closed - Drawer is empty for new day</Text>
          </View>
        ) : (
          <View style={styles.statusSection}>
            <Text style={styles.statusText}>✅ Drawer is active and working correctly</Text>
          </View>
        )}

        {!drawerStatus ? (
          <View style={styles.noDrawerContainer}>
            <Text style={styles.noDrawerIcon}>💰</Text>
            <Text style={styles.noDrawerText}>No drawer data found</Text>
            <Text style={styles.noDrawerSubtext}>Please contact your supervisor</Text>
          </View>
        ) : (
          <>
            {/* Today's Sales Summary */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Icon name="analytics" size={20} color="#f59e0b" />
                <Text style={styles.sectionTitle}>📊 TODAY'S SALES SUMMARY</Text>
              </View>
              <Text style={styles.salesSummaryText}>
                Today you sold: {getFormattedCashDisplay()}
              </Text>
            </View>

            {/* Today's Transactions */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Icon name="receipt" size={20} color="#8b5cf6" />
                <Text style={styles.sectionTitle}>📋 TODAY'S TRANSACTIONS</Text>
              </View>
              <View style={styles.transactionGrid}>
                <View style={styles.transactionItem}>
                  <Text style={styles.transactionIcon}>💵</Text>
                  <Text style={styles.transactionCount}>{transactionCounts.usd}</Text>
                  <Text style={styles.transactionLabel}>USD Transactions</Text>
                </View>
                <View style={styles.transactionItem}>
                  <Text style={styles.transactionIcon}>💰</Text>
                  <Text style={styles.transactionCount}>{transactionCounts.zig}</Text>
                  <Text style={styles.transactionLabel}>ZIG Transactions</Text>
                </View>
                <View style={styles.transactionItem}>
                  <Text style={styles.transactionIcon}>💸</Text>
                  <Text style={styles.transactionCount}>{transactionCounts.rand}</Text>
                  <Text style={styles.transactionLabel}>RAND Transactions</Text>
                </View>
              </View>
              <View style={styles.totalTransactionsRow}>
                <Icon name="summarize" size={18} color="#f59e0b" />
                <Text style={styles.totalTransactionsText}>
                  TOTAL TRANSACTIONS TODAY: {transactionCounts.usd + transactionCounts.zig + transactionCounts.rand}
                </Text>
              </View>
            </View>

            {/* Drawer Overview */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Icon name="account-balance-wallet" size={20} color="#10b981" />
                <Text style={styles.sectionTitle}>💰 DRAWER OVERVIEW</Text>
              </View>
              
              <View style={styles.overviewRow}>
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewIcon}>💵</Text>
                  <Text style={styles.overviewLabel}>USD Float</Text>
                  <Text style={styles.overviewValue}>{formatCurrency(usdFloat, 'USD')}</Text>
                </View>
              </View>

              <View style={styles.overviewRow}>
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewIcon}>💰</Text>
                  <Text style={styles.overviewLabel}>ZIG Float</Text>
                  <Text style={styles.overviewValue}>{formatCurrency(zigFloat, 'ZIG')}</Text>
                </View>
              </View>

              <View style={styles.overviewRow}>
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewIcon}>💸</Text>
                  <Text style={styles.overviewLabel}>RAND Float</Text>
                  <Text style={styles.overviewValue}>{formatCurrency(randFloat, 'RAND')}</Text>
                </View>
              </View>

              <View style={styles.overviewRow}>
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewIcon}>💰</Text>
                  <Text style={styles.overviewLabel}>Current Cash</Text>
                  <Text style={styles.overviewValue}>{getFormattedCashDisplay()}</Text>
                </View>
              </View>

              <View style={styles.overviewRow}>
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewIcon}>💳</Text>
                  <Text style={styles.overviewLabel}>Session Sales</Text>
                  <Text style={styles.overviewValue}>{getFormattedCashDisplay()}</Text>
                </View>
              </View>


            </View>

            {/* Payment Methods Breakdown */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Icon name="payment" size={20} color="#3b82f6" />
                <Text style={styles.sectionTitle}>💳 PAYMENT METHODS BREAKDOWN</Text>
              </View>
              
              <View style={styles.paymentMethodRow}>
                <Text style={styles.paymentIcon}>💵</Text>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentLabel}>CASH PAYMENTS</Text>
                  <Text style={styles.paymentValue}>{getFormattedCashDisplay()}</Text>
                </View>
              </View>
            </View>

            {/* Cash by Currency */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Icon name="attach-money" size={20} color="#22c55e" />
                <Text style={styles.sectionTitle}>💱 CASH BY CURRENCY</Text>
              </View>
              
              <View style={styles.currencyCashRow}>
                <View style={styles.currencyCashItem}>
                  <Text style={styles.currencyCashIcon}>💵</Text>
                  <Text style={[styles.currencyCashLabel, { color: '#22c55e' }]}>USD CASH</Text>
                  <Text style={[styles.currencyCashValue, { color: '#22c55e' }]}>{formatCurrency(usd, 'USD')}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: '#22c55e20' }]}>
                    <Text style={[styles.statusBadgeText, { color: '#22c55e' }]}>Active</Text>
                  </View>
                </View>
                
                <View style={styles.currencyCashItem}>
                  <Text style={styles.currencyCashIcon}>💰</Text>
                  <Text style={[styles.currencyCashLabel, { color: '#f59e0b' }]}>ZIG CASH</Text>
                  <Text style={[styles.currencyCashValue, { color: '#f59e0b' }]}>{formatCurrency(zig, 'ZIG')}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: '#f59e0b20' }]}>
                    <Text style={[styles.statusBadgeText, { color: '#f59e0b' }]}>Active</Text>
                  </View>
                </View>
                
                <View style={styles.currencyCashItem}>
                  <Text style={styles.currencyCashIcon}>💸</Text>
                  <Text style={[styles.currencyCashLabel, { color: '#3b82f6' }]}>RAND CASH</Text>
                  <Text style={[styles.currencyCashValue, { color: '#3b82f6' }]}>{formatCurrency(rand, 'RAND')}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: '#3b82f620' }]}>
                    <Text style={[styles.statusBadgeText, { color: '#3b82f6' }]}>Active</Text>
                  </View>
                </View>
              </View>

              <View style={styles.totalCashSalesRow}>
                <Icon name="savings" size={18} color="#f59e0b" />
                <Text style={styles.totalCashSalesLabel}>TOTAL CASH SALES</Text>
                <Text style={styles.totalCashSalesValue}>{getFormattedCashDisplay()}</Text>
                <Text style={styles.totalCashSalesSubtext}>Across all currencies</Text>
              </View>
            </View>




            {/* Cash Breakdown */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Icon name="account-balance" size={20} color="#f59e0b" />
                <Text style={styles.sectionTitle}>💵 CASH BREAKDOWN</Text>
              </View>
              <Text style={styles.cashBreakdownTotal}>
                Total Cash: {getFormattedCashDisplay()}
              </Text>
              <View style={styles.cashBreakdownRow}>
                <View style={styles.cashBreakdownItem}>
                  <Icon name="receipt" size={24} color="#f59e0b" />
                  <Text style={styles.cashBreakdownLabel}>💵 BILLS</Text>
                </View>
                <View style={styles.cashBreakdownItem}>
                  <Icon name="monetization-on" size={24} color="#22c55e" />
                  <Text style={styles.cashBreakdownLabel}>🪙 COINS</Text>
                </View>
              </View>
            </View>

            {/* All Payment Methods */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Icon name="credit-card" size={20} color="#8b5cf6" />
                <Text style={styles.sectionTitle}>💳 ALL PAYMENT METHODS</Text>
              </View>
              
              <View style={styles.allPaymentMethodsGrid}>
                <View style={styles.allPaymentMethodItem}>
                  <Text style={styles.allPaymentIcon}>💵</Text>
                  <Text style={styles.allPaymentLabel}>CASH</Text>
                  <Text style={styles.allPaymentValue}>{getFormattedCashDisplay()}</Text>
                </View>
                
                <View style={styles.allPaymentMethodItem}>
                  <Text style={styles.allPaymentIcon}>💳</Text>
                  <Text style={styles.allPaymentLabel}>CARD</Text>
                  <Text style={styles.allPaymentValue}>$0.00</Text>
                </View>
                
                <View style={styles.allPaymentMethodItem}>
                  <Text style={styles.allPaymentIcon}>🏦</Text>
                  <Text style={styles.allPaymentLabel}>TRANSFER</Text>
                  <Text style={styles.allPaymentValue}>$0.00</Text>
                </View>
              </View>
              
              <View style={styles.allPaymentTotalRow}>
                <Icon name="account-balance" size={18} />
                <Text style={styles.allPaymentTotalLabel}>TOTAL</Text>
                <Text style={styles.allPaymentTotalValue}>{getFormattedCashDisplay()}</Text>
              </View>
            </View>

            {/* Session Performance */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Icon name="speed" size={20} color="#10b981" />
                <Text style={styles.sectionTitle}>📊 SESSION PERFORMANCE</Text>
              </View>
              
              <View style={styles.performanceRow}>
                <View style={styles.performanceItem}>
                  <Text style={styles.performanceIcon}>💵</Text>
                  <Text style={styles.performanceLabel}>Cash Sales</Text>
                  <Text style={styles.performanceValue}>{getFormattedCashDisplay()}</Text>
                </View>
                
                <View style={styles.performanceItem}>
                  <Text style={styles.performanceIcon}>💳</Text>
                  <Text style={styles.performanceLabel}>Card Sales</Text>
                  <Text style={styles.performanceValue}>$0.00</Text>
                </View>
              </View>
              
              <View style={styles.performanceRow}>
                <View style={styles.performanceItem}>
                  <Text style={styles.performanceIcon}>📈</Text>
                  <Text style={styles.performanceLabel}>Total Sales</Text>
                  <Text style={styles.performanceValue}>{getFormattedCashDisplay()}</Text>
                </View>
                

              </View>
              
              <View style={styles.lastUpdatedRow}>
                <Icon name="schedule" size={14} color="#6b7280" />
                <Text style={styles.lastUpdatedText}>
                  Last updated: {new Date().toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Currency Wallet Accounts */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Icon name="account-balance" size={20} color="#8b5cf6" />
                <Text style={styles.sectionTitle}>🏦 CURRENCY WALLET ACCOUNTS</Text>
              </View>
              
              <View style={styles.walletRow}>
                <View style={styles.walletItem}>
                  <Text style={styles.walletIcon}>💵</Text>
                  <Text style={styles.walletLabel}>USD WALLET</Text>
                  <Text style={styles.walletValue}>{formatCurrency(usd, 'USD')}</Text>
                  <Text style={styles.walletTransactions}>{transactionCounts.usd} transactions</Text>
                </View>
                
                <View style={styles.walletItem}>
                  <Text style={styles.walletIcon}>💰</Text>
                  <Text style={styles.walletLabel}>ZIG WALLET</Text>
                  <Text style={styles.walletValue}>{formatCurrency(zig, 'ZIG')}</Text>
                  <Text style={styles.walletTransactions}>{transactionCounts.zig} transactions</Text>
                </View>
                
                <View style={styles.walletItem}>
                  <Text style={styles.walletIcon}>💸</Text>
                  <Text style={styles.walletLabel}>RAND WALLET</Text>
                  <Text style={styles.walletValue}>{formatCurrency(rand, 'RAND')}</Text>
                  <Text style={styles.walletTransactions}>{transactionCounts.rand} transactions</Text>
                </View>
              </View>
              

            </View>

            {/* Main Currency Display - 3 Cards */}
            <View style={styles.currencyContainer}>
              {/* USD Card */}
              <View style={[styles.currencyCard, { borderColor: '#22c55e' }]}>
                <Text style={styles.currencyIcon}>💵</Text>
                <Text style={[styles.currencyLabel, { color: '#22c55e' }]}>USD CASH</Text>
                <Text style={[styles.currencyAmount, { color: '#22c55e' }]}>
                  {formatCurrency(usd, 'USD')}
                </Text>
              </View>

              {/* ZIG Card */}
              <View style={[styles.currencyCard, { borderColor: '#f59e0b' }]}>
                <Text style={styles.currencyIcon}>💰</Text>
                <Text style={[styles.currencyLabel, { color: '#f59e0b' }]}>ZIG CASH</Text>
                <Text style={[styles.currencyAmount, { color: '#f59e0b' }]}>
                  {formatCurrency(zig, 'ZIG')}
                </Text>
              </View>

              {/* RAND Card */}
              <View style={[styles.currencyCard, { borderColor: '#3b82f6' }]}>
                <Text style={styles.currencyIcon}>💸</Text>
                <Text style={[styles.currencyLabel, { color: '#3b82f6' }]}>RAND CASH</Text>
                <Text style={[styles.currencyAmount, { color: '#3b82f6' }]}>
                  {formatCurrency(rand, 'RAND')}
                </Text>
              </View>
            </View>

            {/* Total */}
            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>💰 TOTAL CASH</Text>
              <Text style={styles.totalAmount}>{getFormattedCashDisplay()}</Text>
            </View>

            {/* Last Updated */}
            <View style={styles.updateSection}>
              <Text style={styles.updateText}>
                Last updated: {new Date().toLocaleTimeString()}
              </Text>
            </View>
          </>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('SalesAndRefunds')}
          >
            <Text style={styles.actionButtonText}>💰 Do Refunds</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('CashierDashboard')}
          >
            <Text style={styles.actionButtonText}>📊 Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom padding for web scrolling */}
      <View style={{ 
        height: Platform.OS === 'web' ? 100 : 20,
        minHeight: Platform.OS === 'web' ? 100 : 0
      }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
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
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'web' ? 100 : 0,
    ...Platform.select({
      web: {
        minHeight: '100vh',
        width: '100%',
        flexGrow: 1,
      },
    }),
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
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  refreshButton: {
    color: '#10b981',
    fontSize: 20,
    fontWeight: '600',
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
  noAccessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noAccessTitle: {
    color: '#ef4444',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
  },
  noAccessText: {
    color: '#9ca3af',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  noAccessButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 12,
  },
  noAccessButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statusSection: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  statusText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '600',
  },
  noDrawerContainer: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  noDrawerIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  noDrawerText: {
    color: '#9ca3af',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  noDrawerSubtext: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
  },
  
  // Section Card Styles
  sectionCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  salesSummaryText: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
  },
  
  // Transaction Grid
  transactionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  transactionItem: {
    alignItems: 'center',
    flex: 1,
    padding: 12,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    marginHorizontal: 4,
  },
  transactionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  transactionCount: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  transactionLabel: {
    color: '#9ca3af',
    fontSize: 10,
    textAlign: 'center',
  },
  totalTransactionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#1f2937',
    borderRadius: 8,
  },
  totalTransactionsText: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  
  // Overview Row
  overviewRow: {
    marginBottom: 12,
  },
  overviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1f2937',
    borderRadius: 8,
  },
  overviewIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  overviewLabel: {
    color: '#9ca3af',
    fontSize: 12,
    flex: 1,
  },
  overviewValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  
  // Payment Method Row
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1f2937',
    borderRadius: 12,
  },
  paymentIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 4,
  },
  paymentValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  
  // Currency Cash Row
  currencyCashRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  currencyCashItem: {
    alignItems: 'center',
    flex: 1,
    padding: 16,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    marginHorizontal: 4,
    borderWidth: 1,
  },
  currencyCashIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  currencyCashLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  currencyCashValue: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  
  // Total Cash Sales Row
  totalCashSalesRow: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  totalCashSalesLabel: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  totalCashSalesValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  totalCashSalesSubtext: {
    color: '#6b7280',
    fontSize: 10,
    marginTop: 4,
  },
  
  // Over By
  overByValue: {
    color: '#10b981',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  overBySubtext: {
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  
  // Cash Breakdown
  cashBreakdownTotal: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  cashBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  cashBreakdownItem: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 8,
  },
  cashBreakdownLabel: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  
  // All Payment Methods
  allPaymentMethodsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  allPaymentMethodItem: {
    alignItems: 'center',
    flex: 1,
    padding: 16,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    marginHorizontal: 4,
  },
  allPaymentIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  allPaymentLabel: {
    color: '#9ca3af',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  allPaymentValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  allPaymentTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  allPaymentTotalLabel: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  allPaymentTotalValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 8,
  },
  
  // Performance
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  performanceItem: {
    flex: 1,
    padding: 16,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  performanceIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  performanceLabel: {
    color: '#9ca3af',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  performanceValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  lastUpdatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  lastUpdatedText: {
    color: '#6b7280',
    fontSize: 10,
    marginLeft: 4,
  },
  
  // Wallet
  walletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  walletItem: {
    alignItems: 'center',
    flex: 1,
    padding: 16,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    marginHorizontal: 4,
  },
  walletIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  walletLabel: {
    color: '#9ca3af',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  walletValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  walletTransactions: {
    color: '#6b7280',
    fontSize: 9,
  },
  totalWalletRow: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8b5cf6',
  },
  totalWalletLabel: {
    color: '#8b5cf6',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  totalWalletValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 8,
  },
  totalWalletSubtext: {
    color: '#6b7280',
    fontSize: 10,
    marginTop: 8,
    textAlign: 'center',
  },
  
  // Currency Display
  currencyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  currencyCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 24,
    width: '31%',
    alignItems: 'center',
    borderWidth: 3,
    minHeight: 140,
    justifyContent: 'center',
  },
  currencyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  currencyLabel: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  currencyAmount: {
    fontSize: 22,
    fontWeight: '800',
  },
  totalSection: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10b981',
    marginBottom: 20,
  },
  totalLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  totalAmount: {
    color: '#10b981',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  updateSection: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 20,
  },
  updateText: {
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  actionButton: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  webScrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
});

export default CashierDrawerScreen;
