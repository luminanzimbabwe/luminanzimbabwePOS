import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DollarSign, Users, Calculator, TrendingUp, RefreshCw } from 'lucide-react-native';
import { apiService } from '../services/api';

const DrawerManagementScreen = () => {
  const [drawerData, setDrawerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDrawerData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔍 DrawerManagement: Loading drawer data...');
      const response = await apiService.getCashierDrawers();
      console.log('🔍 DrawerManagement: API Response:', response);

      if (response.data && response.data.success) {
        console.log('✅ DrawerManagement: API call successful. Setting drawer data.');
        setDrawerData(response.data);

        if (response.data.drawers?.length === 0) {
          console.log('🤔 DrawerManagement: API returned success but no cashier drawers.');
          Alert.alert(
            'No Drawers Found',
            'The server responded successfully but returned no cashier drawer data. If you have active cashiers, there might be a data synchronization issue on the server.'
          );
        }
      } else {
        console.log('⚠️ DrawerManagement: API returned an error or unsuccessful response.', response.data);
        Alert.alert('Data Fetch Error', response.data?.message || 'The server returned an error. Please try again.');
        setDrawerData({
          success: true,
          shop_name: "Demo Shop",
          total_cashiers: 0,
          financial_neural_grid: {
            usd: { cash: 0.0, transfer: 0.0, card: 0.0, ecocash: 0.0, change: 0.0, total: 0.0 },
            zig: { cash: 0.0, transfer: 0.0, card: 0.0, change: 0.0, total: 0.0 },
            rand: { cash: 0.0, transfer: 0.0, card: 0.0, ecocash: 0.0, change: 0.0, total: 0.0 }
          },
          drawers: []
        });
      }
    } catch (error) {
      console.error('❌ Error loading drawer data:', error);
      console.log('⚠️ DrawerManagement: Network or unexpected error, using default data');
      Alert.alert('Application Error', `Could not fetch drawer data: ${error.message}. Please check your connection and pull to refresh.`);
      setDrawerData({
        success: true,
        shop_name: "Demo Shop",
        total_cashiers: 0,
        financial_neural_grid: {
          usd: { cash: 0.0, transfer: 0.0, card: 0.0, ecocash: 0.0, change: 0.0, total: 0.0 },
          zig: { cash: 0.0, transfer: 0.0, card: 0.0, change: 0.0, total: 0.0 },
          rand: { cash: 0.0, transfer: 0.0, card: 0.0, ecocash: 0.0, change: 0.0, total: 0.0 }
        },
        drawers: []
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDrawerData();
    }, [loadDrawerData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadDrawerData();
  };

  const overallExpected = React.useMemo(() => {
    if (!drawerData?.drawers?.length) {
      return null;
    }

    return drawerData.drawers.reduce(
      (totals, cashier) => {
        totals.usd += cashier.expected_vs_actual?.usd?.expected || 0;
        totals.zig += cashier.expected_vs_actual?.zig?.expected || 0;
        totals.rand += cashier.expected_vs_actual?.rand?.expected || 0;
        return totals;
      },
      { usd: 0, zig: 0, rand: 0 }
    );
  }, [drawerData]);

  const formatCurrency = (amount, currency = 'USD') => {
    const symbol = currency === 'USD' ? '$' : currency === 'ZIG' ? 'Z$' : 'R';
    return `${symbol}${parseFloat(amount || 0).toFixed(2)}`;
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading drawer data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  console.log('🎨 DrawerManagement: Rendering with data:', drawerData);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>FINANCIAL NEURAL GRID</Text>
            <Text style={styles.headerSubtitle}>Real-time Drawer Management</Text>
            {__DEV__ && drawerData && (
              <Text style={styles.debugText}>
                DEBUG: USD Cash = ${drawerData.financial_neural_grid?.usd?.cash || 0}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={24} color={refreshing ? "#666" : "#3b82f6"} />
          </TouchableOpacity>
        </View>

        {/* FINANCIAL NEURAL GRID Summary */}
        {drawerData?.financial_neural_grid && (
          <View style={styles.gridContainer}>
            <Text style={styles.sectionTitle}>TOTAL DRAWER SUMMARY</Text>

            {/* USD Row */}
            <View style={styles.currencyRow}>
              <View style={styles.currencyHeader}>
                <DollarSign size={20} color="#10b981" />
                <Text style={styles.currencyTitle}>USD</Text>
              </View>
              <View style={styles.paymentGrid}>
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentLabel}>Cash</Text>
                  <Text style={[styles.paymentAmount, drawerData.financial_neural_grid.usd.cash < 0 && styles.negativeAmount]}>
                    {formatCurrency(drawerData.financial_neural_grid.usd.cash, 'USD')}
                  </Text>
                </View>
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentLabel}>Change</Text>
                  <Text style={[styles.paymentAmount, styles.negativeAmount]}>
                    {formatCurrency(-Math.abs(drawerData.financial_neural_grid.usd.change || 0), 'USD')}
                  </Text>
                </View>
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentLabel}>Transfer</Text>
                  <Text style={[styles.paymentAmount, drawerData.financial_neural_grid.usd.transfer < 0 && styles.negativeAmount]}>
                    {formatCurrency(drawerData.financial_neural_grid.usd.transfer, 'USD')}
                  </Text>
                </View>
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentLabel}>Card</Text>
                  <Text style={[styles.paymentAmount, drawerData.financial_neural_grid.usd.card < 0 && styles.negativeAmount]}>
                    {formatCurrency(drawerData.financial_neural_grid.usd.card, 'USD')}
                  </Text>
                </View>
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentLabel}>EcoCash</Text>
                  <Text style={[styles.paymentAmount, drawerData.financial_neural_grid.usd.ecocash < 0 && styles.negativeAmount]}>
                    {formatCurrency(drawerData.financial_neural_grid.usd.ecocash, 'USD')}
                  </Text>
                </View>
                <View style={[styles.paymentItem, styles.totalItem]}>
                  <Text style={styles.totalLabel}>TOTAL</Text>
                  <Text style={[styles.totalAmount, drawerData.financial_neural_grid.usd.total < 0 && styles.negativeAmount]}>
                    {formatCurrency(drawerData.financial_neural_grid.usd.total, 'USD')}
                  </Text>
                </View>
              </View>
            </View>

            {/* ZIG Row */}
            <View style={styles.currencyRow}>
              <View style={styles.currencyHeader}>
                <Text style={styles.currencySymbol}>Z$</Text>
                <Text style={styles.currencyTitle}>ZIG</Text>
              </View>
              <View style={styles.paymentGrid}>
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentLabel}>Cash</Text>
                  <Text style={[styles.paymentAmount, drawerData.financial_neural_grid.zig.cash < 0 && styles.negativeAmount]}>
                    {formatCurrency(drawerData.financial_neural_grid.zig.cash, 'ZIG')}
                  </Text>
                </View>
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentLabel}>Change</Text>
                  <Text style={[styles.paymentAmount, styles.negativeAmount]}>
                    {formatCurrency(-Math.abs(drawerData.financial_neural_grid.zig.change || 0), 'ZIG')}
                  </Text>
                </View>
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentLabel}>Transfer</Text>
                  <Text style={[styles.paymentAmount, drawerData.financial_neural_grid.zig.transfer < 0 && styles.negativeAmount]}>
                    {formatCurrency(drawerData.financial_neural_grid.zig.transfer, 'ZIG')}
                  </Text>
                </View>
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentLabel}>Card</Text>
                  <Text style={[styles.paymentAmount, drawerData.financial_neural_grid.zig.card < 0 && styles.negativeAmount]}>
                    {formatCurrency(drawerData.financial_neural_grid.zig.card, 'ZIG')}
                  </Text>
                </View>
                <View style={[styles.paymentItem, styles.totalItem]}>
                  <Text style={styles.totalLabel}>TOTAL</Text>
                  <Text style={[styles.totalAmount, drawerData.financial_neural_grid.zig.total < 0 && styles.negativeAmount]}>
                    {formatCurrency(drawerData.financial_neural_grid.zig.total, 'ZIG')}
                  </Text>
                </View>
              </View>
            </View>

            {/* RAND Row */}
            <View style={styles.currencyRow}>
              <View style={styles.currencyHeader}>
                <Text style={styles.currencySymbol}>R</Text>
                <Text style={styles.currencyTitle}>RAND</Text>
              </View>
              <View style={styles.paymentGrid}>
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentLabel}>Cash</Text>
                  <Text style={[styles.paymentAmount, drawerData.financial_neural_grid.rand.cash < 0 && styles.negativeAmount]}>
                    {formatCurrency(drawerData.financial_neural_grid.rand.cash, 'RAND')}
                  </Text>
                </View>
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentLabel}>Change</Text>
                  <Text style={[styles.paymentAmount, styles.negativeAmount]}>
                    {formatCurrency(-Math.abs(drawerData.financial_neural_grid.rand.change || 0), 'RAND')}
                  </Text>
                </View>
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentLabel}>Transfer</Text>
                  <Text style={[styles.paymentAmount, drawerData.financial_neural_grid.rand.transfer < 0 && styles.negativeAmount]}>
                    {formatCurrency(drawerData.financial_neural_grid.rand.transfer, 'RAND')}
                  </Text>
                </View>
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentLabel}>Card</Text>
                  <Text style={[styles.paymentAmount, drawerData.financial_neural_grid.rand.card < 0 && styles.negativeAmount]}>
                    {formatCurrency(drawerData.financial_neural_grid.rand.card, 'RAND')}
                  </Text>
                </View>
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentLabel}>EcoCash</Text>
                  <Text style={[styles.paymentAmount, drawerData.financial_neural_grid.rand.ecocash < 0 && styles.negativeAmount]}>
                    {formatCurrency(drawerData.financial_neural_grid.rand.ecocash, 'RAND')}
                  </Text>
                </View>
                <View style={[styles.paymentItem, styles.totalItem]}>
                  <Text style={styles.totalLabel}>TOTAL</Text>
                  <Text style={[styles.totalAmount, drawerData.financial_neural_grid.rand.total < 0 && styles.negativeAmount]}>
                    {formatCurrency(drawerData.financial_neural_grid.rand.total, 'RAND')}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Individual Cashier Drawers */}
        <View style={styles.cashiersContainer}>
           <Text style={styles.sectionTitle}>CASHIER DRAWERS</Text>

           {drawerData?.drawers?.length > 0 ? (
             drawerData.drawers.map((cashier, index) => (
               <View key={cashier.cashier_id} style={styles.cashierCard}>
                 <View style={styles.cashierHeader}>
                   <Users size={20} color="#3b82f6" />
                   <Text style={styles.cashierName}>{cashier.cashier_name}</Text>
                   <View style={[styles.statusBadge,
                     { backgroundColor: cashier.drawer_status === 'ACTIVE' ? '#10b981' : '#ef4444' }
                   ]}>
                     <Text style={styles.statusText}>{cashier.drawer_status}</Text>
                   </View>
                 </View>

                 {/* Cashier Currency Breakdown */}
                 <View style={styles.cashierCurrencies}>
                   <View style={styles.currencyBreakdown}>
                     <Text style={styles.breakdownTitle}>USD</Text>
                      <Text style={styles.breakdownAmount}>
                        Cash:{' '}
                        <Text style={cashier.current_cash.usd < 0 && styles.negativeAmount}>
                          {formatCurrency(cashier.current_cash.usd, 'USD')}
                        </Text>
                      </Text>
                      <Text style={styles.breakdownAmount}>
                        Change:{' '}
                        <Text style={styles.negativeAmount}>
                          {formatCurrency(-Math.abs(cashier.current_change?.usd || 0), 'USD')}
                        </Text>
                      </Text>
                      <Text style={styles.breakdownAmount}>
                        Card:{' '}
                        <Text style={cashier.current_card.usd < 0 && styles.negativeAmount}>
                          {formatCurrency(cashier.current_card.usd, 'USD')}
                        </Text>
                      </Text>
                      <Text style={styles.breakdownAmount}>
                        Transfer:{' '}
                        <Text style={cashier.current_transfer.usd < 0 && styles.negativeAmount}>
                          {formatCurrency(cashier.current_transfer.usd, 'USD')}
                        </Text>
                      </Text>
                      <Text style={styles.breakdownAmount}>
                        EcoCash:{' '}
                        <Text style={cashier.current_ecocash.usd < 0 && styles.negativeAmount}>
                          {formatCurrency(cashier.current_ecocash.usd, 'USD')}
                        </Text>
                      </Text>
                      <Text style={[styles.breakdownAmount, styles.totalBreakdown]}>
                        Total:{' '}
                        <Text style={cashier.total_by_currency.usd < 0 && styles.negativeAmount}>
                          {formatCurrency(cashier.total_by_currency.usd, 'USD')}
                        </Text>
                      </Text>
                   </View>

                   <View style={styles.currencyBreakdown}>
                     <Text style={styles.breakdownTitle}>ZIG</Text>
                      <Text style={styles.breakdownAmount}>
                        Cash:{' '}
                        <Text style={cashier.current_cash.zig < 0 && styles.negativeAmount}>
                          {formatCurrency(cashier.current_cash.zig, 'ZIG')}
                        </Text>
                      </Text>
                      <Text style={styles.breakdownAmount}>
                        Change:{' '}
                        <Text style={styles.negativeAmount}>
                          {formatCurrency(-Math.abs(cashier.current_change?.zig || 0), 'ZIG')}
                        </Text>
                      </Text>
                      <Text style={styles.breakdownAmount}>
                        Card:{' '}
                        <Text style={cashier.current_card.zig < 0 && styles.negativeAmount}>
                          {formatCurrency(cashier.current_card.zig, 'ZIG')}
                        </Text>
                      </Text>
                      <Text style={styles.breakdownAmount}>
                        Transfer:{' '}
                        <Text style={cashier.current_transfer.zig < 0 && styles.negativeAmount}>
                          {formatCurrency(cashier.current_transfer.zig, 'ZIG')}
                        </Text>
                      </Text>
                      <Text style={[styles.breakdownAmount, styles.totalBreakdown]}>
                        Total:{' '}
                        <Text style={cashier.total_by_currency.zig < 0 && styles.negativeAmount}>
                          {formatCurrency(cashier.total_by_currency.zig, 'ZIG')}
                        </Text>
                      </Text>
                   </View>

                   <View style={styles.currencyBreakdown}>
                     <Text style={styles.breakdownTitle}>RAND</Text>
                      <Text style={styles.breakdownAmount}>
                        Cash:{' '}
                        <Text style={cashier.current_cash.rand < 0 && styles.negativeAmount}>
                          {formatCurrency(cashier.current_cash.rand, 'RAND')}
                        </Text>
                      </Text>
                      <Text style={styles.breakdownAmount}>
                        Change:{' '}
                        <Text style={styles.negativeAmount}>
                          {formatCurrency(-Math.abs(cashier.current_change?.rand || 0), 'RAND')}
                        </Text>
                      </Text>
                      <Text style={styles.breakdownAmount}>
                        Card:{' '}
                        <Text style={cashier.current_card.rand < 0 && styles.negativeAmount}>
                          {formatCurrency(cashier.current_card.rand, 'RAND')}
                        </Text>
                      </Text>
                      <Text style={styles.breakdownAmount}>
                        Transfer:{' '}
                        <Text style={cashier.current_transfer.rand < 0 && styles.negativeAmount}>
                          {formatCurrency(cashier.current_transfer.rand, 'RAND')}
                        </Text>
                      </Text>
                      <Text style={styles.breakdownAmount}>
                        EcoCash:{' '}
                        <Text style={cashier.current_ecocash.rand < 0 && styles.negativeAmount}>
                          {formatCurrency(cashier.current_ecocash.rand, 'RAND')}
                        </Text>
                      </Text>
                      <Text style={[styles.breakdownAmount, styles.totalBreakdown]}>
                        Total:{' '}
                        <Text style={cashier.total_by_currency.rand < 0 && styles.negativeAmount}>
                          {formatCurrency(cashier.total_by_currency.rand, 'RAND')}
                        </Text>
                      </Text>
                   </View>
                 </View>

                 {/* Expected vs Actual */}
                 <View style={styles.expectationsContainer}>
                   <Text style={styles.expectationsTitle}>EXPECTED AMOUNTS</Text>
                   <View style={styles.expectationsGrid}>
                     <View style={styles.expectationItem}>
                       <Text style={styles.expectationLabel}>USD Expected</Text>
                       <Text style={[styles.expectationAmount, cashier.expected_vs_actual.usd.expected < 0 && styles.negativeAmount]}>
                         {formatCurrency(cashier.expected_vs_actual.usd.expected, 'USD')}
                       </Text>
                     </View>
                     <View style={styles.expectationItem}>
                       <Text style={styles.expectationLabel}>USD Actual</Text>
                       <Text style={[styles.expectationAmount, cashier.expected_vs_actual.usd.actual < 0 && styles.negativeAmount]}>
                         {formatCurrency(cashier.expected_vs_actual.usd.actual, 'USD')}
                       </Text>
                     </View>
                     <View style={[styles.expectationItem,
                       { backgroundColor: parseFloat(cashier.expected_vs_actual.usd.variance) >= 0 ? '#10b981' : '#ef4444' }
                     ]}>
                       <Text style={styles.varianceLabel}>USD Variance</Text>
                       <Text style={styles.varianceAmount}>
                         {formatCurrency(cashier.expected_vs_actual.usd.variance, 'USD')}
                       </Text>
                     </View>
                   </View>
                 </View>
               </View>
             ))
           ) : (
             <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No active cashier drawers were returned from the server. Please pull down to refresh.</Text>
             </View>
           )}
        </View>

        {/* Overall Expectations */}
        <View style={styles.overallContainer}>
          <Text style={styles.sectionTitle}>OVERALL EXPECTATIONS</Text>
          <View style={styles.overallCard}>
            <TrendingUp size={24} color="#3b82f6" />
            <Text style={styles.overallText}>
              Total Expected from All Cashiers: {overallExpected ?
                `${formatCurrency(overallExpected.usd, 'USD')} / ${formatCurrency(overallExpected.zig, 'ZIG')} / ${formatCurrency(overallExpected.rand, 'RAND')}`
                : 'Coming Soon'}
            </Text>
            <Text style={styles.overallText}>
              Total Expected from Whole App: {overallExpected ?
                `${formatCurrency(overallExpected.usd, 'USD')} / ${formatCurrency(overallExpected.zig, 'ZIG')} / ${formatCurrency(overallExpected.rand, 'RAND')}`
                : 'Coming Soon'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 10,
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#999',
  },
  debugText: {
    fontSize: 10,
    color: '#ff6b6b',
    marginTop: 5,
    fontFamily: 'monospace',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
    marginTop: 20,
    paddingHorizontal: 20,
  },
  gridContainer: {
    padding: 20,
  },
  currencyRow: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  currencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
    marginRight: 5,
  },
  currencyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  paymentItem: {
    width: '48%',
    backgroundColor: '#2a2a2a',
    padding: 10,
    margin: '1%',
    borderRadius: 8,
    alignItems: 'center',
  },
  totalItem: {
    width: '98%',
    backgroundColor: '#3b82f6',
    marginTop: 10,
  },
  paymentLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  totalLabel: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 5,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  cashiersContainer: {
    padding: 20,
  },
  cashierCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  cashierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  cashierName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 10,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cashierCurrencies: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  currencyBreakdown: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    padding: 10,
    margin: 2,
    borderRadius: 8,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 8,
    textAlign: 'center',
  },
  breakdownAmount: {
    fontSize: 12,
    color: '#ffffff',
    marginBottom: 3,
  },
  totalBreakdown: {
    fontWeight: 'bold',
    color: '#10b981',
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  expectationsContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  expectationsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  expectationsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  expectationItem: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    padding: 8,
    margin: 2,
    borderRadius: 6,
    alignItems: 'center',
  },
  expectationLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 3,
  },
  expectationAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  varianceLabel: {
    fontSize: 10,
    color: '#ffffff',
    marginBottom: 3,
  },
  varianceAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  overallContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  overallCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  overallText: {
    fontSize: 16,
    color: '#ffffff',
    marginVertical: 5,
  },
  emptyState: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  negativeAmount: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
});

export default DrawerManagementScreen;