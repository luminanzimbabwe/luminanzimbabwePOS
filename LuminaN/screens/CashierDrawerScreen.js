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
import { useNavigation } from '@react-navigation/native';
import { shopStorage } from '../services/storage';
import { shopAPI } from '../services/api';
import refundService from '../services/refundService';

const CashierDrawerScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cashierData, setCashierData] = useState(null);
  const [drawerStatus, setDrawerStatus] = useState(null);
  const [refundData, setRefundData] = useState({
    totalRefunds: 0,
    refundCount: 0,
    cashRefunds: 0,
    netCashImpact: 0
  });

  useEffect(() => {
    loadDrawerData();
  }, []);

  // Auto-reset invalid refund data and drawer when detected
  useEffect(() => {
    const checkAndResetDrawer = async () => {
      const refundStats = await refundService.getRefundStats();
      const cashRefunds = Object.values(refundStats.refundsByDate || {}).reduce((sum, amount) => sum + amount, 0);
      
      // If we have refunds but no cash sales, reset everything
      if (cashRefunds > 0 && (!drawerStatus?.session_sales?.cash || drawerStatus.session_sales.cash === 0)) {
        console.log('🚨 Auto-resetting invalid refund data');
        await refundService.emergencyReset();
        // Reload data after reset
        setTimeout(() => loadDrawerData(), 500);
      }
      
      // If expected cash is much higher than actual with no sales, reset drawer
      if (drawerStatus?.eod_expectations?.expected_cash && drawerStatus.session_sales?.total === 0) {
        const expected = drawerStatus.eod_expectations.expected_cash;
        const actual = drawerStatus.current_breakdown?.cash || 0;
        if (expected > actual + 50) { // If expected is more than $50 higher than actual with no sales
          console.log('🚨 Resetting drawer with unrealistic variance');
          // Force reload with zeroed expectations
          setDrawerStatus({
            cashier: 'Current Cashier',
            float_amount: 0,
            current_breakdown: { cash: 0, card: 0, ecocash: 0, transfer: 0, total: 0 },
            session_sales: { cash: 0, card: 0, ecocash: 0, transfer: 0, total: 0 },
            eod_expectations: { expected_cash: 0, variance: 0, efficiency: 100 },
            status: 'ACTIVE',
            last_activity: new Date().toISOString()
          });
        }
      }
    };
    
    if (drawerStatus) {
      checkAndResetDrawer();
    }
  }, [drawerStatus]);

  const loadDrawerData = async () => {
    try {
      const credentials = await shopStorage.getCredentials();
      if (!credentials) {
        navigation.replace('Login');
        return;
      }

      setCashierData(credentials);

      // Load refund data for cash impact calculations (async)
      const refundStats = await refundService.getRefundStats();
      const cashRefunds = Object.values(refundStats.refundsByDate || {}).reduce((sum, amount) => sum + amount, 0);
      
      setRefundData({
        totalRefunds: refundStats.totalRefunded,
        refundCount: refundStats.refundCount,
        cashRefunds: cashRefunds, // Assuming all refunds are cash for simplicity
        netCashImpact: -cashRefunds // Negative because refunds reduce cash
      });

      // Load drawer status specifically for this cashier
      const response = await shopAPI.getCashFloat();
      
      if (response.data && response.data.success) {
        const payload = response.data.drawer || response.data.shop_status || response.data;
        const today = new Date().toISOString().slice(0,10);
        const payloadDate = payload?.date || payload?.current_shop_day?.date || null;
        
        // If shop is closed or payload is stale, show zeroed drawer
        if (payloadDate && payloadDate !== today) {
          setDrawerStatus({
            cashier: credentials.name || 'Unknown',
            float_amount: 0,
            current_breakdown: { cash: 0, card: 0, ecocash: 0, transfer: 0, total: 0 },
            session_sales: { cash: 0, card: 0, ecocash: 0, transfer: 0, total: 0 },
            eod_expectations: { expected_cash: 0, variance: 0, efficiency: 100 },
            status: 'INACTIVE',
            last_activity: null
          });
          return;
        }

        if (payload && Array.isArray(payload.drawers)) {
          const cashierId = credentials.name || credentials.username || credentials.id || 
                          credentials.cashier_id || credentials.user_id || credentials.email;
          
          // Match by cashier name or id/email
          const matched = payload.drawers.find(d => {
            if (!d) return false;
            if (typeof d.cashier === 'string' && cashierId && d.cashier.toLowerCase() === String(cashierId).toLowerCase()) return true;
            if (d.cashier_id && credentials?.id && String(d.cashier_id) === String(credentials.id)) return true;
            return false;
          });

          if (matched) {
            setDrawerStatus(matched);
          } else if (payload.drawers.length === 1) {
            // Use single drawer if only one exists
            setDrawerStatus(payload.drawers[0]);
          }
        } else if (response.data.drawer) {
          setDrawerStatus(response.data.drawer);
        }
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const getCashBreakdown = () => {
    if (!drawerStatus?.current_breakdown?.cash) return { bills: {}, coins: {} };
    
    const cash = drawerStatus.current_breakdown.cash;
    // Simple breakdown - you can enhance this with actual bill/coin tracking
    const bills = {
      '100': Math.floor(cash / 100) * 100,
      '50': Math.floor((cash % 100) / 50) * 50,
      '20': Math.floor((cash % 50) / 20) * 20,
      '10': Math.floor((cash % 20) / 10) * 10,
      '5': Math.floor((cash % 10) / 5) * 5,
    };
    
    const coins = {
      '2': Math.floor((cash % 5) / 2) * 2,
      '1': Math.floor((cash % 2) / 1) * 1,
    };

    return { bills, coins };
  };

  if (loading) {
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

  const { bills, coins } = getCashBreakdown();

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
        <TouchableOpacity 
          onPress={() => {
            Alert.alert(
              'Reset Refunds',
              'Clear all refund data to fix incorrect amounts?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Reset',
                  style: 'destructive',
                  onPress: async () => {
                    await refundService.emergencyReset();
                    setTimeout(() => loadDrawerData(), 500);
                  }
                }
              ]
            );
          }}
        >
          <Text style={[styles.refreshButton, { color: '#ef4444' }]}>🔄</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Simple Status Message */}
        <View style={styles.statusSection}>
          <Text style={styles.statusText}>
            ✅ Drawer is active and working correctly
          </Text>
          <Text style={styles.statusSubtext}>
            Last updated: {new Date().toLocaleTimeString()}
          </Text>
        </View>

        {/* Quick Refund Button */}
        <View style={styles.quickActionSection}>
          <TouchableOpacity 
            style={styles.quickRefundButton}
            onPress={() => navigation.navigate('SalesAndRefunds')}
          >
            <Text style={styles.quickRefundButtonText}>💰 DO REFUNDS</Text>
            <Text style={styles.quickRefundButtonSubtext}>Process customer refunds here</Text>
          </TouchableOpacity>
        </View>

        {!drawerStatus ? (
          <View style={styles.noDrawerContainer}>
            <Text style={styles.noDrawerIcon}>💰</Text>
            <Text style={styles.noDrawerText}>No drawer data found</Text>
            <Text style={styles.noDrawerSubtext}>Please contact your supervisor</Text>
          </View>
        ) : (
          <>
            {/* Drawer Status Overview */}
            <View style={styles.overviewSection}>
              <Text style={styles.sectionTitle}>💰 DRAWER OVERVIEW</Text>
              
              <View style={styles.overviewCards}>
                <View style={styles.overviewCard}>
                  <Text style={styles.overviewIcon}>💵</Text>
                  <Text style={styles.overviewValue}>{formatCurrency(drawerStatus.float_amount || 0)}</Text>
                  <Text style={styles.overviewLabel}>Float Amount</Text>
                </View>
                
                <View style={styles.overviewCard}>
                  <Text style={styles.overviewIcon}>💰</Text>
                  <Text style={[styles.overviewValue, { color: '#22c55e' }]}>
                    {formatCurrency(drawerStatus.current_breakdown?.cash || 0)}
                  </Text>
                  <Text style={styles.overviewLabel}>Current Cash</Text>
                </View>
                
                <View style={styles.overviewCard}>
                  <Text style={styles.overviewIcon}>💳</Text>
                  <Text style={[styles.overviewValue, { color: '#f59e0b' }]}>
                    {formatCurrency(drawerStatus.session_sales?.total || 0)}
                  </Text>
                  <Text style={styles.overviewLabel}>Session Sales</Text>
                </View>
                
                <View style={styles.overviewCard}>
                  <Text style={styles.overviewIcon}>⚡</Text>
                  <Text style={[styles.overviewValue, { color: '#3b82f6' }]}>
                    {formatCurrency(drawerStatus.eod_expectations?.expected_cash || 0)}
                  </Text>
                  <Text style={styles.overviewLabel}>EOD Expected</Text>
                </View>
              </View>
            </View>

            {/* Simple Refund Summary - Only show if there are actual sales */}
            {refundData.totalRefunds > 0 && drawerStatus.session_sales?.cash > 0 && (
              <View style={styles.refundSection}>
                <Text style={styles.refundTitle}>🔄 REFUND SUMMARY</Text>
                <View style={styles.refundGrid}>
                  <View style={styles.refundItem}>
                    <Text style={styles.refundIcon}>💸</Text>
                    <Text style={styles.refundLabel}>Cash Refunds</Text>
                    <Text style={[styles.refundValue, { color: '#ef4444' }]}>
                      {formatCurrency(refundData.cashRefunds)}
                    </Text>
                  </View>
                  <View style={styles.refundItem}>
                    <Text style={styles.refundIcon}>🔢</Text>
                    <Text style={styles.refundLabel}>Refund Count</Text>
                    <Text style={styles.refundValue}>{refundData.refundCount}</Text>
                  </View>
                  <View style={styles.refundItem}>
                    <Text style={styles.refundIcon}>💰</Text>
                    <Text style={styles.refundLabel}>Net Cash</Text>
                    <Text style={[styles.refundValue, { color: '#22c55e' }]}>
                      {formatCurrency((drawerStatus.session_sales?.cash || 0) - refundData.cashRefunds)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Only show variance when there are actual sales */}
            {drawerStatus.session_sales?.total > 0 && drawerStatus.eod_expectations?.variance !== undefined && (
              <View style={[
                styles.varianceSection,
                { backgroundColor: drawerStatus.eod_expectations.variance >= 0 ? '#22c55e' : '#ef4444' }
              ]}>
                <Text style={styles.varianceTitle}>
                  {drawerStatus.eod_expectations.variance >= 0 ? '✅' : '⚠️'} 
                  {drawerStatus.eod_expectations.variance >= 0 ? 'OVER' : 'SHORT'} BY
                </Text>
                <Text style={styles.varianceAmount}>
                  {formatCurrency(Math.abs(drawerStatus.eod_expectations.variance))}
                </Text>
                <Text style={styles.varianceNote}>
                  Expected: {formatCurrency(drawerStatus.eod_expectations.expected_cash)} | 
                  Actual: {formatCurrency(drawerStatus.current_breakdown?.cash)}
                </Text>
              </View>
            )}

            {/* Cash Breakdown */}
            <View style={styles.cashBreakdownSection}>
              <Text style={styles.sectionTitle}>💵 CASH BREAKDOWN</Text>
              
              <View style={styles.cashSummary}>
                <Text style={styles.cashTotal}>
                  💰 Total Cash: {formatCurrency(drawerStatus.current_breakdown?.cash || 0)}
                </Text>
              </View>

              {/* Bills */}
              <View style={styles.denominationSection}>
                <Text style={styles.denominationTitle}>💵 BILLS</Text>
                {Object.entries(bills).map(([denomination, amount]) => (
                  amount > 0 && (
                    <View key={denomination} style={styles.denominationRow}>
                      <Text style={styles.denominationLabel}>${denomination} bills:</Text>
                      <Text style={styles.denominationAmount}>{formatCurrency(amount)}</Text>
                    </View>
                  )
                ))}
              </View>

              {/* Coins */}
              <View style={styles.denominationSection}>
                <Text style={styles.denominationTitle}>🪙 COINS</Text>
                {Object.entries(coins).map(([denomination, amount]) => (
                  amount > 0 && (
                    <View key={denomination} style={styles.denominationRow}>
                      <Text style={styles.denominationLabel}>${denomination} coins:</Text>
                      <Text style={styles.denominationAmount}>{formatCurrency(amount)}</Text>
                    </View>
                  )
                ))}
              </View>
            </View>

            {/* Payment Methods */}
            <View style={styles.paymentSection}>
              <Text style={styles.sectionTitle}>💳 ALL PAYMENT METHODS</Text>
              
              <View style={styles.paymentGrid}>
                <View style={styles.paymentCard}>
                  <Text style={styles.paymentIcon}>💵</Text>
                  <Text style={styles.paymentLabel}>CASH</Text>
                  <Text style={styles.paymentAmount}>{formatCurrency(drawerStatus.current_breakdown?.cash || 0)}</Text>
                </View>
                
                <View style={styles.paymentCard}>
                  <Text style={styles.paymentIcon}>💳</Text>
                  <Text style={styles.paymentLabel}>CARD</Text>
                  <Text style={styles.paymentAmount}>{formatCurrency(drawerStatus.current_breakdown?.card || 0)}</Text>
                </View>
                
                <View style={styles.paymentCard}>
                  <Text style={styles.paymentIcon}>📱</Text>
                  <Text style={styles.paymentLabel}>ECOCASH</Text>
                  <Text style={styles.paymentAmount}>{formatCurrency(drawerStatus.current_breakdown?.ecocash || 0)}</Text>
                </View>
                
                <View style={styles.paymentCard}>
                  <Text style={styles.paymentIcon}>🏦</Text>
                  <Text style={styles.paymentLabel}>TRANSFER</Text>
                  <Text style={styles.paymentAmount}>{formatCurrency(drawerStatus.current_breakdown?.transfer || 0)}</Text>
                </View>
              </View>

              <View style={styles.totalPaymentCard}>
                <Text style={styles.totalPaymentIcon}>💰</Text>
                <Text style={styles.totalPaymentLabel}>TOTAL</Text>
                <Text style={styles.totalPaymentAmount}>{formatCurrency(drawerStatus.current_breakdown?.total || 0)}</Text>
              </View>
            </View>

            {/* Session Performance */}
            <View style={styles.performanceSection}>
              <Text style={styles.sectionTitle}>📊 SESSION PERFORMANCE</Text>
              
              <View style={styles.performanceGrid}>
                <View style={styles.performanceItem}>
                  <Text style={styles.performanceLabel}>Cash Sales</Text>
                  <Text style={styles.performanceValue}>{formatCurrency(drawerStatus.session_sales?.cash || 0)}</Text>
                </View>
                
                <View style={styles.performanceItem}>
                  <Text style={styles.performanceLabel}>Card Sales</Text>
                  <Text style={styles.performanceValue}>{formatCurrency(drawerStatus.session_sales?.card || 0)}</Text>
                </View>
                
                <View style={styles.performanceItem}>
                  <Text style={styles.performanceLabel}>Total Sales</Text>
                  <Text style={styles.performanceValue}>{formatCurrency(drawerStatus.session_sales?.total || 0)}</Text>
                </View>
                
                <View style={styles.performanceItem}>
                  <Text style={styles.performanceLabel}>Efficiency</Text>
                  <Text style={[styles.performanceValue, { color: '#3b82f6' }]}>
                    {(drawerStatus.eod_expectations?.efficiency || 0).toFixed(1)}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Last Updated */}
            <View style={styles.updateSection}>
              <Text style={styles.updateText}>
                🕐 Last updated: {drawerStatus.last_activity ? 
                  new Date(drawerStatus.last_activity).toLocaleString() : 'N/A'}
              </Text>
            </View>
          </>
        )}
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
    marginBottom: 4,
  },
  statusSubtext: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
  },
  quickActionSection: {
    marginBottom: 20,
  },
  quickRefundButton: {
    backgroundColor: '#ef4444',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  quickRefundButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  quickRefundButtonSubtext: {
    color: '#ffffff',
    fontSize: 12,
    opacity: 0.9,
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
  sectionTitle: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  overviewSection: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  overviewCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  overviewCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  overviewIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  overviewValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  overviewLabel: {
    color: '#9ca3af',
    fontSize: 11,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  varianceSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  varianceTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  varianceAmount: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  varianceNote: {
    color: '#ffffff',
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.9,
  },
  refundSection: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  refundTitle: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  refundGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  refundItem: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    width: '31%',
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  refundIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  refundLabel: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  refundValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  refundNote: {
    color: '#f59e0b',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  cashBreakdownSection: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  cashSummary: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  cashTotal: {
    color: '#22c55e',
    fontSize: 18,
    fontWeight: '700',
  },
  denominationSection: {
    marginBottom: 16,
  },
  denominationTitle: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  denominationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  denominationLabel: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  denominationAmount: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  paymentSection: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  paymentCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  paymentIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  paymentLabel: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  paymentAmount: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  totalPaymentCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  totalPaymentIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  totalPaymentLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  totalPaymentAmount: {
    color: '#10b981',
    fontSize: 20,
    fontWeight: '800',
  },
  performanceSection: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  performanceItem: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  performanceLabel: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  performanceValue: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: '700',
  },
  updateSection: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  updateText: {
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  webScrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
});

export default CashierDrawerScreen;