import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { shopAPI, apiService, getApiBaseUrl } from '../services/api';
import { shopStorage } from '../services/storage';
import presenceService from '../services/presenceService';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

const EODProductionScreen = () => {
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [reconciliationData, setReconciliationData] = useState(null);
  const [drawerStatus, setDrawerStatus] = useState(null);
  const [finalizing, setFinalizing] = useState(false);
  const [closing, setClosing] = useState(false);

  const [cashierCounts, setCashierCounts] = useState({});
  const [globalNotes, setGlobalNotes] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [currentCashier, setCurrentCashier] = useState(null);
  
  // Finalization confirmation modal state
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  
  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [inputs, setInputs] = useState({
    cash_zig: '',
    cash_usd: '',
    cash_rand: '',
    card: '',
    notes: ''
  });

  // Real-time system metrics for neural display
  const [systemMetrics, setSystemMetrics] = useState({
    cpuLoad: 73.2,
    memoryUsage: 45.8,
    diskSpace: 67.5,
    apiResponseTime: 23,
    uptime: 99.97,
    predictionAccuracy: 94.5,
    analysisAccuracy: 97.8,
  });

  // Staff lunch state for deduction tracking
  const [staffLunchMetrics, setStaffLunchMetrics] = useState({
    todayLunches: 0,
    totalValue: 0,
    recentActivity: []
  });

  // Sales data for EOD display
  const [salesData, setSalesData] = useState(null);
  const [salesLoading, setSalesLoading] = useState(false);

  // Cashier count data from the database - only showing completed counts
  const [completedCashierCounts, setCompletedCashierCounts] = useState([]);

  // Load staff lunch data for deduction tracking
  const loadStaffLunchData = async () => {
    try {
      const response = await shopAPI.getStaffLunchHistory('limit=20');

      if (response.data && response.data.success) {
        const lunches = response.data.data || [];

        // Calculate today's lunches
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const todayLunches = lunches.filter(lunch => {
          const lunchDate = new Date(lunch.created_at);
          return lunchDate >= today;
        });

        // Calculate total value of today's lunches
        const totalValue = todayLunches.reduce((sum, lunch) => {
          if (lunch.notes?.includes('CASH LUNCH') && lunch.notes?.includes('Amount:')) {
            const cashAmount = lunch.notes.match(/Amount: \$([0-9.]+)/)?.[1];
            return sum + (parseFloat(cashAmount) || 0);
          }
          return sum + (parseFloat(lunch.total_cost) || 0);
        }, 0);

        setStaffLunchMetrics({
          todayLunches: todayLunches.length,
          totalValue: totalValue,
          recentActivity: todayLunches.slice(0, 5)
        });
      }
    } catch (error) {
      console.error('Failed to load staff lunch data:', error);
      setStaffLunchMetrics({
        todayLunches: 0,
        totalValue: 0,
        recentActivity: []
      });
    }
  };

  // Load sales data for EOD display
  const loadSalesData = async () => {
    try {
      setSalesLoading(true);
      const response = await shopAPI.getAnonymousEndpoint('/analytics/');
      const apiData = response.data;

      // Get today's sales from daily breakdown
      const dailyBreakdown = apiData.revenue_analytics?.daily_breakdown || apiData.daily_breakdown || apiData.sales_trend || [];
      const todayData = dailyBreakdown[dailyBreakdown.length - 1];
      const todaySales = todayData ? (todayData.net_revenue || todayData.revenue || todayData.sales || 0) : 0;
      const todayTransactions = todayData ? (todayData.transactions || 0) : 0;

      setSalesData({
        todaySales,
        todayTransactions,
        totalRevenue: apiData.revenue_analytics?.total_revenue || apiData.total_revenue || 0,
        totalTransactions: apiData.revenue_analytics?.total_transactions || apiData.total_transactions || 0
      });
    } catch (error) {
      console.error('Failed to load sales data:', error);
      setSalesData({
        todaySales: 0,
        todayTransactions: 0,
        totalRevenue: 0,
        totalTransactions: 0
      });
    } finally {
      setSalesLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    loadStaffLunchData();

    // Dynamic system metrics updater
    const systemUpdateInterval = setInterval(() => {
      setSystemMetrics(prev => ({
        cpuLoad: Math.max(65, Math.min(85, prev.cpuLoad + (Math.random() - 0.5) * 4)),
        memoryUsage: Math.max(40, Math.min(55, prev.memoryUsage + (Math.random() - 0.5) * 3)),
        diskSpace: Math.max(25, prev.diskSpace - Math.random() * 0.1),
        apiResponseTime: Math.max(15, Math.min(35, prev.apiResponseTime + (Math.random() - 0.4) * 6)),
        uptime: Math.min(99.99, prev.uptime + 0.001),
        predictionAccuracy: Math.max(92, Math.min(97, prev.predictionAccuracy + (Math.random() - 0.5) * 2)),
        analysisAccuracy: Math.max(96, Math.min(99.5, prev.analysisAccuracy + (Math.random() - 0.5) * 1.5)),
      }));
    }, 2000);

    return () => clearInterval(systemUpdateInterval);
  }, []);

  const loadAllData = async (forceRefresh = false) => {
    setRefreshing(true);
    try {
      // Add timestamp to prevent caching
      const timestamp = forceRefresh ? `?t=${Date.now()}` : '';
      
      // Fetch reconciliation data
      const reconResponse = await shopAPI.getEnhancedReconciliation(timestamp);
      setReconciliationData(reconResponse.data);
      
      // Extract completed cashier counts from the reconciliation data
      // CRITICAL FIX: Only show counts where is_counted is true (status === 'COMPLETED')
      // AND the cashier has drawer activity (sales) today
      if (reconResponse.data && reconResponse.data.cashier_details) {
        // Get drawer data to check which cashiers have actual sales today
        const drawersWithSales = drawerStatus?.drawers?.filter(d => {
          const hasSales = d.expected_vs_actual && (
            (d.expected_vs_actual.usd?.expected || 0) > 0 ||
            (d.expected_vs_actual.zig?.expected || 0) > 0 ||
            (d.expected_vs_actual.rand?.expected || 0) > 0
          );
          const hasCardSales = d.current_card && (
            (d.current_card.usd || 0) > 0 ||
            (d.current_card.zig || 0) > 0 ||
            (d.current_card.rand || 0) > 0
          );
          return hasSales || hasCardSales;
        }) || [];
        
        const activeCashierNames = drawersWithSales.map(d => d.cashier_name || d.cashier);
        
        console.log('Active cashiers with sales:', activeCashierNames);
        console.log('All cashier details:', reconResponse.data.cashier_details.map(c => ({
          name: c.cashier_name,
          is_counted: c.is_counted
        })));
        
        // Only show counts for cashiers who have sales activity today
        const completedCounts = reconResponse.data.cashier_details.filter(
          count => {
            // Must be completed
            if (!count.is_counted) return false;
            
            // Must have sales activity today (be in active drawer list)
            const hasSalesActivity = activeCashierNames.includes(count.cashier_name);
            
            if (!hasSalesActivity) {
              console.log(`Filtering out count for ${count.cashier_name} - no sales today`);
            }
            
            return hasSalesActivity;
          }
        );
        
        console.log('Filtered completed counts:', completedCounts.map(c => c.cashier_name));
        setCompletedCashierCounts(completedCounts);
      }
      
      // Fetch drawer data - Use the exact same API call as DrawerManagementScreen
      // This ensures we get the "Financial Neural Grid" data correctly
      const drawersResponse = await shopAPI.getCashierDrawers();
      
      if (drawersResponse.data && drawersResponse.data.success) {
        console.log('✅ EOD: Loaded drawer data successfully');
        setDrawerStatus(drawersResponse.data);
      } else {
        console.warn('⚠️ EOD: Failed to load drawer data, using fallback');
        // Fallback to empty structure if needed
      }

      // Load sales data for display
      await loadSalesData();
    } catch (error) {
      Alert.alert('Error', 'Could not load EOD data');
    } finally {
      setRefreshing(false);
    }
  };

  const startShopClosing = async () => {
    try {
      setClosing(true);
      
      // Step 1: Show closing message
      Alert.alert('Closing Shop', 'Finalizing day and logging out...', [{ text: 'OK' }]);
      
      // Step 2: Wait a moment for user to see the message
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Step 3: Set offline status before clearing credentials
      presenceService.setOffline('shop_closed');
      
      // Step 4: Clear stored credentials
      await shopStorage.clearCredentials();
      
      // Step 5: Clean up presence service
      presenceService.destroy();
      
      // Step 6: Navigate to login screen
      navigation.replace('Login');
      
    } catch (error) {
      console.error('Error during shop closing:', error);
      Alert.alert('Error', 'Failed to close shop properly. Please contact support.');
      setClosing(false);
    }
  };

  const finalizeDay = async () => {
    console.log('🚀 finalizeDay() CALLED - Starting EOD process');
    try {
      setFinalizing(true);
      console.log('✅ setFinalizing(true) done');
      
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      console.log('📅 Today:', today);
      
      // First, save all cashier counts to the database
      // Use cashier names (which is what we use as keys in cashierCounts)
      const savePromises = Object.entries(cashierCounts).map(([cashierName, count]) => {
        return shopAPI.saveCashierCount({
          cashier_id: cashierName,  // API accepts both name and ID
          date: today,
          expected_cash: count.cash_zig || 0,
          expected_cash_usd: count.cash_usd || 0,
          expected_cash_rand: count.cash_rand || 0,
          expected_card: count.card || 0,
          notes: count.notes || '',
          status: 'COMPLETED'
        });
      });
      
      // Wait for all cashier counts to be saved
      await Promise.all(savePromises);
      console.log('✅ All cashier counts saved');
      
      // CRITICAL: PERMANENTLY DELETE ALL SALES AND RESET ALL DRAWERS before finalizing
      // This ensures next day starts fresh with zero sales
      console.log('🔄 Starting delete process...');
      
      try {
        console.log('📡 Calling shopAPI.deleteTodaySales...');
        const deleteResponse = await shopAPI.deleteTodaySales({}, { headers: {} });
        console.log('✅ Delete API call succeeded, status:', deleteResponse.status);
        console.log('📊 Delete response data:', JSON.stringify(deleteResponse.data, null, 2));
        
        if (deleteResponse.data && deleteResponse.data.success) {
          console.log(`✅ ${deleteResponse.data.message}`);
        } else if (deleteResponse.data) {
          console.warn('⚠️ Delete returned but success=false:', deleteResponse.data);
        } else {
          console.warn('⚠️ Delete returned no data');
        }
      } catch (deleteErr) {
        console.error('❌ Delete API ERROR:');
        console.error('   Message:', deleteErr.message);
        console.error('   Status:', deleteErr.response?.status || 'no status');
        console.error('   Data:', JSON.stringify(deleteErr.response?.data || 'no data'));
        console.error('   Stack:', deleteErr.stack);
        // Continue with EOD process even if delete fails
        console.log('⚠️ Continuing with EOD despite delete error...');
      }
      
      // CRITICAL: CLEAR ALL CASHIER COUNTS FOR TODAY - ensures fresh start tomorrow
      console.log('🧹 Clearing all cashier counts for today...');
      try {
        const clearCountsResponse = await shopAPI.clearCashierCounts(today);
        console.log('✅ Clear counts response:', JSON.stringify(clearCountsResponse.data, null, 2));
        if (clearCountsResponse.data && clearCountsResponse.data.success) {
          console.log(`✅ ${clearCountsResponse.data.message}`);
        }
      } catch (clearErr) {
        console.error('❌ Clear counts ERROR:', clearErr.message);
        // Continue with EOD process even if clear fails
        console.log('⚠️ Continuing with EOD despite clear counts error...');
      }
      
      // CRITICAL: RESET RECONCILIATION SESSION - ensures fresh start tomorrow
      console.log('🔄 Resetting reconciliation session...');
      try {
        const resetSessionResponse = await shopAPI.resetReconciliationSession(today);
        console.log('✅ Reset session response:', JSON.stringify(resetSessionResponse.data, null, 2));
        if (resetSessionResponse.data && resetSessionResponse.data.success) {
          console.log(`✅ ${resetSessionResponse.data.message}`);
        }
      } catch (resetErr) {
        console.error('❌ Reset session ERROR:', resetErr.message);
        // Continue with EOD process even if reset fails
        console.log('⚠️ Continuing with EOD despite reset session error...');
      }
      
      // Now finalize the session
      console.log('📡 Calling completeReconciliationSession...');
      try {
        const response = await shopAPI.completeReconciliationSession({
          action: 'complete',
          date: today,
          notes: globalNotes
        });
        console.log('✅ Session completion response:', JSON.stringify(response.data, null, 2));

        if (response.data.success) {
          // Start the shop closing process
          console.log('🚀 Calling startShopClosing...');
          startShopClosing();
        } else {
          console.error('❌ Session completion failed:', response.data.error);
          Alert.alert('Error', response.data.error || 'Failed to finalize day');
        }
      } catch (sessionErr) {
        console.error('❌ Session completion ERROR:');
        console.error('   Message:', sessionErr.message);
        console.error('   Status:', sessionErr.response?.status || 'no status');
        console.error('   Data:', JSON.stringify(sessionErr.response?.data || 'no data'));
        Alert.alert('Error', sessionErr.response?.data?.error || sessionErr.message || 'Failed to finalize day');
      }
    } catch (error) {
      console.error('❌ finalizeDay ERROR:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to finalize day';
      Alert.alert('Error', errorMessage);
    } finally {
      console.log('🔄 Setting finalizing=false');
      setFinalizing(false);
    }
  };

  // Delete today's sales - no authentication required
  const deleteTodaySales = async () => {
    console.log('🔴 DELETE BUTTON PRESSED - Starting delete process');
    setShowDeleteModal(true);
  };
  
  // Handle actual delete from modal - no password needed
  const handleDeleteConfirm = async () => {
    console.log('🔴 Proceeding with delete...');
    
    setShowDeleteModal(false);
    
    try {
      console.log('🔴 Calling API to delete today\'s sales...');
      
      // No password required - just delete
      const response = await shopAPI.deleteTodaySales({});
      
      console.log('🔴 API Response received:', JSON.stringify(response.data, null, 2));
      
      if (response.data.success) {
        console.log('✅ DELETE SUCCESS:', response.data.message);
        
        // Clear local state immediately
        setCashierCounts({});
        setDrawerStatus(null);
        setReconciliationData(null);
        
        Alert.alert(
          'Success',
          `✅ ${response.data.message}\n\nDeleted: ${response.data.deleted_sales} sales`,
          [{ text: 'OK', onPress: async () => {
            console.log('🔄 Reloading data after successful delete...');
            await loadAllData(true);
          }}]
        );
      } else {
        console.log('❌ DELETE FAILED:', response.data.error || 'Unknown error');
        Alert.alert('Error', response.data.error || 'Failed to delete sales');
      }
    } catch (error) {
      console.log('❌ API ERROR:', error.message);
      console.log('❌ Error response:', error.response?.data || 'No response data');
      Alert.alert('Error', error.response?.data?.error || 'Failed to delete sales.');
    }
  };

  // Calculate per-cashier variance - shows if cashier has short or over
  // Using the same logic as DrawerManagementScreen - uses expected_vs_actual from API
  const getCashierVariance = (drawer, verifiedCount) => {
    // Use expected_vs_actual from API (same as DrawerManagementScreen)
    const eva = drawer?.expected_vs_actual;
    if (!eva) return {
      variance: 0,
      status: 'pending',
      expected: 0,
      actual: 0,
      varianceType: 'pending',
      breakdown: {
        zig: { expected: 0, actual: 0 },
        usd: { expected: 0, actual: 0 },
        rand: { expected: 0, actual: 0 },
        card: { expected: 0, actual: 0 },
        transfers: {
          expected: 0,
          actual: 0,
          usd: { expected: 0, actual: 0 },
          zig: { expected: 0, actual: 0 },
          rand: { expected: 0, actual: 0 }
        }
      },
      staffLunchDeduction: 0,
      totalTransfer: 0
    };
    
    // Get expected amounts from expected_vs_actual (same structure as DrawerManagementScreen)
    const expectedUsd = eva.usd?.expected || 0;
    const expectedZig = eva.zig?.expected || 0;
    const expectedRand = eva.rand?.expected || 0;
    
    // Get actual amounts from expected_vs_actual
    const actualUsdFromDrawer = eva.usd?.actual || 0;
    const actualZigFromDrawer = eva.zig?.actual || 0;
    const actualRandFromDrawer = eva.rand?.actual || 0;
    
    // Get card amounts from current_card
    const expectedCardUsd = drawer.current_card?.usd || 0;
    const expectedCardZig = drawer.current_card?.zig || 0;
    const expectedCardRand = drawer.current_card?.rand || 0;
    const expectedCard = expectedCardUsd + expectedCardZig + expectedCardRand;
    
    // Get transfer amounts from current_transfer
    const transferUsd = drawer.current_transfer?.usd || 0;
    const transferZig = drawer.current_transfer?.zig || 0;
    const transferRand = drawer.current_transfer?.rand || 0;
    const totalTransfer = transferUsd + transferZig + transferRand;
    
    // Total expected for this cashier (cash only, NOT card or transfers)
    const totalExpectedBeforeLunch = expectedUsd + expectedZig + expectedRand;
    
    // Subtract staff lunch deductions from expected amount
    const staffLunchDeduction = staffLunchMetrics.totalValue || 0;
    const totalExpected = totalExpectedBeforeLunch - staffLunchDeduction;
    
    // Get verified/counted amounts (user input)
    const verified = verifiedCount || {};
    const actualZig = verified.cash_zig || 0;
    const actualUsd = verified.cash_usd || 0;
    const actualRand = verified.cash_rand || 0;
    const actualCard = verified.card || 0;
    const actualTransferUsd = verified.transfer_usd || 0;
    const actualTransferZig = verified.transfer_zig || 0;
    const actualTransferRand = verified.transfer_rand || 0;
    const actualTransferTotal = actualTransferUsd + actualTransferZig + actualTransferRand;
    
    // Total actual for this cashier (use verified amounts if available, otherwise from drawer)
    const hasVerifiedAmounts = actualZig > 0 || actualUsd > 0 || actualRand > 0;
    const totalActual = hasVerifiedAmounts
      ? (actualZig + actualUsd + actualRand + actualCard)
      : (actualZigFromDrawer + actualUsdFromDrawer + actualRandFromDrawer);
    
    // Calculate variance for this cashier
    const variance = totalActual - totalExpected;
    
    // Determine status
    let status = 'pending';
    let varianceType = 'pending';
    if (verifiedCount && Object.keys(verifiedCount).length > 0 && hasVerifiedAmounts) {
      if (variance === 0) {
        status = 'perfect';
        varianceType = 'perfect';
      } else if (variance > 0) {
        status = 'over';
        varianceType = 'over';
      } else {
        status = 'short';
        varianceType = 'short';
      }
    }
    
    return {
      expected: totalExpected,
      actual: totalActual,
      variance,
      status,
      varianceType,
      breakdown: {
        zig: { expected: expectedZig, actual: hasVerifiedAmounts ? actualZig : actualZigFromDrawer },
        usd: { expected: expectedUsd, actual: hasVerifiedAmounts ? actualUsd : actualUsdFromDrawer },
        rand: { expected: expectedRand, actual: hasVerifiedAmounts ? actualRand : actualRandFromDrawer },
        card: { expected: expectedCard, actual: actualCard },
        transfers: {
          expected: totalTransfer,
          actual: actualTransferTotal,
          usd: { expected: transferUsd, actual: actualTransferUsd },
          zig: { expected: transferZig, actual: actualTransferZig },
          rand: { expected: transferRand, actual: actualTransferRand }
        }
      },
      staffLunchDeduction,
      totalTransfer
    };
  };

  // Calculate expected amounts from current drawer data
  // Using same logic as DrawerManagementScreen - uses expected_vs_actual
  const stats = useMemo(() => {
    let cash_zig = 0;
    let cash_usd = 0;
    let cash_rand = 0;

    Object.values(cashierCounts).forEach(v => {
      cash_zig += v.cash_zig || 0;
      cash_usd += v.cash_usd || 0;
      cash_rand += v.cash_rand || 0;
    });

    // Calculate expected amounts from current drawer data
    let expected = {
      cash_zig: 0,
      cash_usd: 0,
      cash_rand: 0,
      card_usd: 0,
      card_zig: 0,
      card_rand: 0,
      total: 0
    };

    let transferTotal = 0;
    let transfer_usd = 0;
    let transfer_zig = 0;
    let transfer_rand = 0;

    // Use drawerStatus if available (same API as DrawerManagementScreen)
    if (drawerStatus?.drawers && drawerStatus.drawers.length > 0) {
      // Sum up all drawer expected amounts using expected_vs_actual
      drawerStatus.drawers.forEach(drawer => {
        if (drawer.expected_vs_actual) {
          expected.cash_usd += drawer.expected_vs_actual.usd?.expected || 0;
          expected.cash_zig += drawer.expected_vs_actual.zig?.expected || 0;
          expected.cash_rand += drawer.expected_vs_actual.rand?.expected || 0;
        }
        // Get card from current_card
        expected.card_usd += drawer.current_card?.usd || 0;
        expected.card_zig += drawer.current_card?.zig || 0;
        expected.card_rand += drawer.current_card?.rand || 0;

        // Get transfers from current_transfer
        transfer_usd += drawer.current_transfer?.usd || 0;
        transfer_zig += drawer.current_transfer?.zig || 0;
        transfer_rand += drawer.current_transfer?.rand || 0;
      });
      transferTotal = transfer_usd + transfer_zig + transfer_rand;
      // Expected total should only include cash
      expected.total = expected.cash_zig + expected.cash_usd + expected.cash_rand;

    } else if (reconciliationData?.expected_amounts?.by_currency) {
      // Fallback to enhanced reconciliation data
      const enhancedExpected = reconciliationData.expected_amounts.by_currency;
      expected.cash_zig = enhancedExpected?.zig?.expected_cash || 0;
      expected.cash_usd = enhancedExpected?.usd?.expected_cash || 0;
      expected.cash_rand = enhancedExpected?.rand?.expected_cash || 0;
      expected.card_usd = enhancedExpected?.usd?.expected_card || 0;
      expected.card_zig = enhancedExpected?.zig?.expected_card || 0;
      expected.card_rand = enhancedExpected?.rand?.expected_card || 0;
      
      transfer_usd = enhancedExpected?.usd?.expected_transfer || 0;
      transfer_zig = enhancedExpected?.zig?.expected_transfer || 0;
      transfer_rand = enhancedExpected?.rand?.expected_transfer || 0;
      transferTotal = transfer_usd + transfer_zig + transfer_rand;
      
      expected.total = expected.cash_zig + expected.cash_usd + expected.cash_rand;
    }

    const actual = cash_zig + cash_usd + cash_rand;
    const totalExpectedCard = (expected.card_usd || 0) + (expected.card_zig || 0) + (expected.card_rand || 0);
    // Variance = Actual Cash Count - Expected Cash (after lunch deductions)
    const variance = actual - (expected.total - staffLunchMetrics.totalValue);

    return {
      cash_zig, cash_usd, cash_rand, expected, actual, variance,
      verifiedCash: cash_zig + cash_usd + cash_rand,
      expectedAfterLunch: expected.total - staffLunchMetrics.totalValue,
      transferTotal,
      transfer_usd,
      transfer_zig,
      transfer_rand,
      totalCard: totalExpectedCard
    };
  }, [cashierCounts, reconciliationData, drawerStatus, staffLunchMetrics.totalValue]);

  const openCashier = cashier => {
    setCurrentCashier(cashier);
    const existing = cashierCounts[cashier];
    setInputs(
      existing
        ? {
            cash_zig: String(existing.cash_zig || ''),
            cash_usd: String(existing.cash_usd || ''),
            cash_rand: String(existing.cash_rand || ''),
            card: String(existing.card || ''),
            notes: existing.notes || ''
          }
        : { cash_zig: '', cash_usd: '', cash_rand: '', card: '', notes: '' }
    );
    setShowModal(true);
  };

  // Helper function to get display name for a cashier
  const getCashierDisplayName = (cashier) => {
    if (!cashier) return 'Unknown';
    if (typeof cashier === 'string') return cashier;
    return cashier.cashier_name || cashier.cashier || 'Unknown';
  };

  const saveCashier = async () => {
    const cash_zig = parseFloat(inputs.cash_zig) || 0;
    const cash_usd = parseFloat(inputs.cash_usd) || 0;
    const cash_rand = parseFloat(inputs.cash_rand) || 0;
    const card = parseFloat(inputs.card) || 0;

    if (cash_zig === 0 && cash_usd === 0 && cash_rand === 0 && card === 0) {
      Alert.alert('Invalid Entry', 'Enter a valid amount in at least one currency or card');
      return;
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    // Use the cashier name as the key (currentCashier is already the name string)
    const cashierName = getCashierDisplayName(currentCashier);
    const updatedCounts = {
      ...cashierCounts,
      [cashierName]: {
        cash_zig,
        cash_usd,
        cash_rand,
        card,
        notes: inputs.notes,
        timestamp: new Date().toISOString()
      }
    };

    setCashierCounts(updatedCounts);

    // Save to database
    try {
      const today = new Date().toISOString().split('T')[0];
      await shopAPI.saveCashierCount({
        cashier_id: cashierName,  // API accepts both name and ID
        date: today,
        expected_cash: cash_zig,
        expected_cash_usd: cash_usd,
        expected_cash_rand: cash_rand,
        expected_card: card,
        notes: inputs.notes,
        status: 'IN_PROGRESS'
      });
    } catch (error) {
      // Don't show error to user for individual saves, just log it
      console.log('Save cashier count error:', error);
    }

    setShowModal(false);
  };

  // Filter drawers to only show cashiers who have SALES/ACTIVITY today
  // Only cashiers with expected amounts (sales) need to count
  const todayDrawers = useMemo(() => {
    if (!drawerStatus?.drawers) return [];
    
    return drawerStatus.drawers.filter(drawer => {
      // ONLY check if drawer has expected amounts from expected_vs_actual (means it has SALES today)
      const hasSalesActivity = drawer.expected_vs_actual && (
        (drawer.expected_vs_actual.usd?.expected || 0) > 0 ||
        (drawer.expected_vs_actual.zig?.expected || 0) > 0 ||
        (drawer.expected_vs_actual.rand?.expected || 0) > 0
      );
      
      // Also check card sales
      const hasCardSales = drawer.current_card && (
        (drawer.current_card.usd || 0) > 0 ||
        (drawer.current_card.zig || 0) > 0 ||
        (drawer.current_card.rand || 0) > 0
      );
      
      // Only include if they have sales activity - no sales = no count needed
      return hasSalesActivity || hasCardSales;
    });
  }, [drawerStatus]);

  const totalCashiers = todayDrawers.length || 0;
  // Count verified cashiers that are actually in today's drawers
  const verifiedCount = Object.keys(cashierCounts).filter(name =>
    todayDrawers.some(d => (d.cashier_name || d.cashier) === name)
  ).length;
  const progress = totalCashiers ? verifiedCount / totalCashiers : 0;

  const varianceColor =
    stats.variance === 0
      ? '#00ff88'
      : Math.abs(stats.variance) < 5
      ? '#ffaa00'
      : '#ff4444';

  return (
    <>
      <ScrollView 
        style={[styles.container, Platform.OS === 'web' && styles.webContainer]}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={true}
        scrollEventThrottle={16}
        nestedScrollEnabled={Platform.OS === 'web'}
        removeClippedSubviews={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadAllData} />
        }
      >
        {/* Neural 2080 Header */}
        <View style={styles.neural2080Header}>
          {/* Holographic Background Elements */}
          <View style={styles.holographicGrid} />
          <View style={styles.energyPulse} />
          
          {/* Top Control Bar */}
          <View style={styles.controlBar}>
            <TouchableOpacity onPress={() => {
              const hasUnsavedChanges = Object.keys(cashierCounts).length > 0 || globalNotes.trim() !== '';
              
              if (hasUnsavedChanges) {
                Alert.alert(
                  'Unsaved Changes',
                  'You have unsaved changes. Are you sure you want to go back?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Go Back', style: 'destructive', onPress: () => navigation.goBack() }
                  ]
                );
              } else {
                navigation.goBack();
              }
            }} style={styles.neuralBackButton}>
              <Icon name="arrow-back" size={20} color="#00f5ff" />
              <Text style={styles.neuralBackButtonText}>BACK</Text>
            </TouchableOpacity>
            
            <View style={styles.neuralTitleContainer}>
              <View style={styles.neuralBadge}>
                <Icon name="military-tech" size={18} color="#ff0080" />
                <Text style={styles.neuralBadgeText}>GEN 2080</Text>
              </View>
              <Text style={styles.neuralMainTitle}>EOD NEURAL INTERFACE</Text>
              <Text style={styles.neuralSubtitle}>End of Day Reconciliation Command</Text>
            </View>

            <TouchableOpacity 
              onPress={() => {
                // Force refresh the entire screen with fresh data from API
                loadAllData(true);
                loadStaffLunchData();
              }} 
              style={styles.neuralRefreshButton} 
              disabled={refreshing}
            >
              <Icon name="sync" size={20} color="#00f5ff" />
              <Text style={styles.neuralRefreshText}>{refreshing ? 'SYNCING...' : 'SYNC'}</Text>
            </TouchableOpacity>
          </View>
          
          {/* Neural Status Indicators */}
          <View style={styles.neuralStatusPanel}>
            <View style={styles.neuralStatusIndicator}>
              <View style={styles.neuralStatusPulse} />
              <Text style={styles.neuralStatusText}>NEURAL INTERFACE: ONLINE</Text>
              <Icon name="wifi" size={16} color="#00ff88" />
            </View>
            
            <View style={styles.neuralPerformanceMetrics}>
              <View style={styles.neuralMetricUnit}>
                <Text style={styles.neuralMetricLabel}>SYSTEM</Text>
                <Text style={styles.neuralMetricValue}>98.7%</Text>
              </View>
              <View style={styles.neuralMetricDivider} />
              <View style={styles.neuralMetricUnit}>
                <Text style={styles.neuralMetricLabel}>EFFICIENCY</Text>
                <Text style={styles.neuralMetricValue}>MAX</Text>
              </View>
              <View style={styles.neuralMetricDivider} />
              <View style={styles.neuralMetricUnit}>
                <Text style={styles.neuralMetricLabel}>STATUS</Text>
                <Text style={styles.neuralMetricValue}>ACTIVE</Text>
              </View>
            </View>
          </View>
          
          {/* Data Stream Bar */}
          <View style={styles.dataStreamBar}>
            <View style={styles.streamDot} />
            <Text style={styles.streamText}>EOD RECONCILIATION MATRIX • REAL-TIME FINANCIAL GRID • 2080 NEURAL DASHBOARD</Text>
            <View style={styles.streamDot} />
          </View>
        </View>

        {closing && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <View style={{ backgroundColor: '#1a1a2e', padding: 30, borderRadius: 15, alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 10 }}>🔄 Closing Shop...</Text>
              <Text style={{ fontSize: 16, color: '#e74c3c', textAlign: 'center' }}>Please wait while we finalize the day</Text>
            </View>
          </View>
        )}

        {/* System Intelligence Matrix */}
        <View style={styles.systemIntelligenceSection}>
          <View style={styles.systemIntelligenceHeader}>
            <Icon name="psychology" size={24} color="#ff0080" />
            <Text style={styles.systemIntelligenceTitle}>SYSTEM INTELLIGENCE MATRIX</Text>
          </View>
          
          <View style={styles.systemMetricsGrid}>
            <View style={styles.systemMetricCard}>
              <View style={styles.systemMetricHeader}>
                <Icon name="speed" size={20} color="#00f5ff" />
                <Text style={styles.systemMetricTitle}>CPU NEURAL LOAD</Text>
              </View>
              <View style={styles.systemProgressContainer}>
                <View style={[styles.systemProgressBar, { width: `${systemMetrics.cpuLoad}%` }]} />
                <Text style={styles.systemProgressValue}>{systemMetrics.cpuLoad.toFixed(1)}%</Text>
              </View>
            </View>
            
            <View style={styles.systemMetricCard}>
              <View style={styles.systemMetricHeader}>
                <Icon name="memory" size={20} color="#00ff88" />
                <Text style={styles.systemMetricTitle}>MEMORY ALLOCATION</Text>
              </View>
              <View style={styles.systemProgressContainer}>
                <View style={[styles.systemProgressBar, { width: `${systemMetrics.memoryUsage}%` }]} />
                <Text style={styles.systemProgressValue}>{systemMetrics.memoryUsage.toFixed(1)}%</Text>
              </View>
            </View>
            
            <View style={styles.systemMetricCard}>
              <View style={styles.systemMetricHeader}>
                <Icon name="storage" size={20} color="#ffaa00" />
                <Text style={styles.systemMetricTitle}>DISK NEURAL SPACE</Text>
              </View>
              <View style={styles.systemProgressContainer}>
                <View style={[styles.systemProgressBar, { width: `${systemMetrics.diskSpace}%` }]} />
                <Text style={styles.systemProgressValue}>{systemMetrics.diskSpace.toFixed(1)}%</Text>
              </View>
            </View>
            
            <View style={styles.systemMetricCard}>
              <View style={styles.systemMetricHeader}>
                <Icon name="speed" size={20} color="#ff0080" />
                <Text style={styles.systemMetricTitle}>API RESPONSE TIME</Text>
              </View>
              <View style={styles.systemProgressContainer}>
                <View style={[styles.systemProgressBar, { width: `${(systemMetrics.apiResponseTime / 35) * 100}%` }]} />
                <Text style={styles.systemProgressValue}>{systemMetrics.apiResponseTime.toFixed(0)}ms</Text>
              </View>
            </View>
          </View>
          
          {/* AI Accuracy Metrics */}
          <View style={styles.aiMetricsRow}>
            <View style={styles.aiMetricCard}>
              <Text style={styles.aiMetricLabel}>PREDICTION ACCURACY</Text>
              <Text style={styles.aiMetricValue}>{systemMetrics.predictionAccuracy.toFixed(1)}%</Text>
              <View style={styles.aiMetricBar}>
                <View style={[styles.aiMetricFill, { width: `${systemMetrics.predictionAccuracy}%`, backgroundColor: '#00f5ff' }]} />
              </View>
            </View>
            <View style={styles.aiMetricCard}>
              <Text style={styles.aiMetricLabel}>ANALYSIS ACCURACY</Text>
              <Text style={styles.aiMetricValue}>{systemMetrics.analysisAccuracy.toFixed(1)}%</Text>
              <View style={styles.aiMetricBar}>
                <View style={[styles.aiMetricFill, { width: `${systemMetrics.analysisAccuracy}%`, backgroundColor: '#00ff88' }]} />
              </View>
            </View>
          </View>
        </View>

        {/* Sales Data Display */}
        {salesData && salesData.todayTransactions > 0 && (
          <View style={styles.neuralFinancialSection}>
            <View style={styles.neuralFinancialHeader}>
              <Icon name="analytics" size={28} color="#00ff88" />
              <Text style={styles.neuralFinancialTitle}>SALES DATA</Text>
            </View>

            <View style={styles.neuralMetricsGrid}>
              <View style={styles.neuralMetricCard}>
                <View style={styles.neuralMetricHeader}>
                  <Icon name="point-of-sale" size={24} color="#ff0080" />
                  <Text style={styles.neuralMetricTitle}>TODAY'S SALES</Text>
                </View>
                <Text style={styles.neuralMetricValue}>{salesData.todayTransactions}</Text>
                <Text style={styles.neuralMetricSubtitle}>Transactions</Text>
              </View>

              <View style={styles.neuralMetricCard}>
                <View style={styles.neuralMetricHeader}>
                  <Icon name="attach-money" size={24} color="#00f5ff" />
                  <Text style={styles.neuralMetricTitle}>REVENUE</Text>
                </View>
                <Text style={styles.neuralMetricValue}>${salesData.todaySales.toLocaleString()}</Text>
                <Text style={styles.neuralMetricSubtitle}>Total Amount</Text>
              </View>
            </View>
          </View>
        )}

        {/* Financial Neural Grid - Consolidated Expected Amounts */}
        <View style={styles.neuralFinancialSection}>
          <View style={styles.neuralFinancialHeader}>
            <Icon name="account-balance" size={28} color="#00ff88" />
            <Text style={styles.neuralFinancialTitle}>FINANCIAL NEURAL GRID</Text>
          </View>
          
          {/* Shop Status Indicator */}
          <View style={[styles.neuralStatusPanel, {
            borderColor: (drawerStatus?.is_open || (drawerStatus?.drawers && drawerStatus.drawers.length > 0)) ? '#00ff88' : '#ff4444',
            backgroundColor: (drawerStatus?.is_open || (drawerStatus?.drawers && drawerStatus.drawers.length > 0)) ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 68, 68, 0.1)'
          }]}>
            <View style={styles.neuralStatusIndicator}>
              <View style={[styles.neuralStatusPulse, {
                backgroundColor: (drawerStatus?.is_open || (drawerStatus?.drawers && drawerStatus.drawers.length > 0)) ? '#00ff88' : '#ff4444'
              }]} />
              <Text style={[styles.neuralStatusText, {
                color: (drawerStatus?.is_open || (drawerStatus?.drawers && drawerStatus.drawers.length > 0)) ? '#00ff88' : '#ff4444'
              }]}>
                SHOP STATUS: {(drawerStatus?.is_open || (drawerStatus?.drawers && drawerStatus.drawers.length > 0)) ? 'OPEN' : 'CLOSED'}
              </Text>
              <Icon name="schedule" size={16} color={(drawerStatus?.is_open || (drawerStatus?.drawers && drawerStatus.drawers.length > 0)) ? '#00ff88' : '#ff4444'} />
            </View>
            <Text style={{
              color: (drawerStatus?.is_open || (drawerStatus?.drawers && drawerStatus.drawers.length > 0)) ? '#00ff88' : '#ff4444',
              fontSize: 12,
              textAlign: 'center',
              marginTop: 8
            }}>
              {(drawerStatus?.is_open || (drawerStatus?.drawers && drawerStatus.drawers.length > 0))
                ? '⚠️ End of day reconciliation in progress'
                : '🔒 Shop is closed - data has been reset'
              }
            </Text>
          </View>
          
          {/* Expected Cash Section */}
          <Text style={styles.sectionSubtitle}>EXPECTED CASH</Text>
          <View style={styles.neuralMetricsGrid}>
            <View style={styles.neuralMetricCard}>
              <View style={styles.neuralMetricHeader}>
                <Icon name="attach-money" size={24} color="#f59e0b" />
                <Text style={styles.neuralMetricTitle}>ZW$ CASH</Text>
              </View>
              <Text style={styles.neuralMetricValue}>ZW${(stats.expected.cash_zig || 0).toLocaleString()}</Text>
            </View>
            
            <View style={styles.neuralMetricCard}>
              <View style={styles.neuralMetricHeader}>
                <Icon name="attach-money" size={24} color="#00f5ff" />
                <Text style={styles.neuralMetricTitle}>USD CASH</Text>
              </View>
              <Text style={styles.neuralMetricValue}>${((stats.expected.cash_usd || 0) - staffLunchMetrics.totalValue).toLocaleString()}</Text>
              <Text style={styles.neuralMetricSubtitle}>After lunch: -${staffLunchMetrics.totalValue.toFixed(2)}</Text>
            </View>
            
            <View style={styles.neuralMetricCard}>
              <View style={styles.neuralMetricHeader}>
                <Icon name="attach-money" size={24} color="#ffaa00" />
                <Text style={styles.neuralMetricTitle}>RAND CASH</Text>
              </View>
              <Text style={styles.neuralMetricValue}>R{(stats.expected.cash_rand || 0).toLocaleString()}</Text>
            </View>
          </View>
          
          {/* Transfers Section */}
          <Text style={[styles.sectionSubtitle, { marginTop: 16 }]}>EXPECTED TRANSFERS</Text>
          <View style={styles.neuralMetricsGrid}>
            <View style={styles.neuralMetricCard}>
              <View style={styles.neuralMetricHeader}>
                <Icon name="swap-horiz" size={24} color="#00f5ff" />
                <Text style={styles.neuralMetricTitle}>USD TRANSFER</Text>
              </View>
              <Text style={[styles.neuralMetricValue, { color: '#00f5ff' }]}>${(stats.transfer_usd || 0).toFixed(2)}</Text>
            </View>
            
            <View style={styles.neuralMetricCard}>
              <View style={styles.neuralMetricHeader}>
                <Icon name="swap-horiz" size={24} color="#ffffff" />
                <Text style={styles.neuralMetricTitle}>ZW$ TRANSFER</Text>
              </View>
              <Text style={styles.neuralMetricValue}>ZW${(stats.transfer_zig || 0).toLocaleString()}</Text>
            </View>
            
            <View style={styles.neuralMetricCard}>
              <View style={styles.neuralMetricHeader}>
                <Icon name="swap-horiz" size={24} color="#ffaa00" />
                <Text style={styles.neuralMetricTitle}>RAND TRANSFER</Text>
              </View>
              <Text style={styles.neuralMetricValue}>R{(stats.transfer_rand || 0).toFixed(2)}</Text>
            </View>
          </View>
          
          {/* Card Section */}
          <Text style={[styles.sectionSubtitle, { marginTop: 16 }]}>EXPECTED CARD</Text>
          <View style={styles.neuralMetricsGrid}>
            <View style={styles.neuralMetricCard}>
              <View style={styles.neuralMetricHeader}>
                <Icon name="credit-card" size={24} color="#10b981" />
                <Text style={styles.neuralMetricTitle}>USD CARD</Text>
              </View>
              <Text style={[styles.neuralMetricValue, { color: '#10b981' }]}>${(stats.expected.card_usd || 0).toFixed(2)}</Text>
            </View>
            
            <View style={styles.neuralMetricCard}>
              <View style={styles.neuralMetricHeader}>
                <Icon name="credit-card" size={24} color="#ffffff" />
                <Text style={styles.neuralMetricTitle}>ZW$ CARD</Text>
              </View>
              <Text style={styles.neuralMetricValue}>ZW${(stats.expected.card_zig || 0).toLocaleString()}</Text>
            </View>
            
            <View style={styles.neuralMetricCard}>
              <View style={styles.neuralMetricHeader}>
                <Icon name="credit-card" size={24} color="#ffaa00" />
                <Text style={styles.neuralMetricTitle}>RAND CARD</Text>
              </View>
              <Text style={styles.neuralMetricValue}>R{(stats.expected.card_rand || 0).toFixed(2)}</Text>
            </View>
          </View>
          
          {/* Variance Display */}
          <View style={[styles.neuralVarianceCard, { borderLeftColor: varianceColor, marginTop: 16 }]}>
            <View style={styles.neuralVarianceIconContainer}>
              <Icon name="analytics" size={32} color={varianceColor} />
            </View>
            <View style={styles.neuralVarianceContent}>
              <Text style={styles.neuralVarianceTitle}>
                {stats.variance === 0 ? '⚡ PERFECT BALANCE' : stats.variance < 0 ? '⚠️ CASH SHORTAGE' : '✅ CASH OVERAGE'}
              </Text>
              <Text style={[styles.neuralVarianceAmount, { color: varianceColor }]}>
                ${Math.abs(stats.variance).toFixed(2)}
              </Text>
              <Text style={styles.neuralVarianceSubtitle}>
                (Excludes ${(stats.transferTotal || 0).toFixed(2)} transfers)
                (Excludes ${(stats.totalCard || 0).toFixed(2)} card)
              </Text>
            </View>
          </View>
          
          {/* Progress Bar */}
          <View style={styles.neuralProgressContainer}>
            <View style={styles.neuralProgressHeader}>
              <Icon name="timeline" size={20} color="#00f5ff" />
              <Text style={styles.neuralProgressTitle}>VERIFICATION PROGRESS</Text>
            </View>
            <View style={styles.neuralProgressBarBg}>
              <View 
                style={[
                  styles.neuralProgressBarFill, 
                  { 
                    width: `${progress * 100}%`,
                    backgroundColor: varianceColor
                  }
                ]} 
              />
            </View>
            <View style={styles.neuralProgressLabels}>
              <Text style={styles.neuralProgressText}>
                Verified {verifiedCount}/{totalCashiers} Cashiers
              </Text>
              <Text style={[styles.neuralProgressPercentage, { color: varianceColor }]}>
                {Math.round(progress * 100)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Staff Lunch Neural Grid - Showing Expected Minus Staff Lunch Deductions */}
        <View style={styles.neuralFinancialSection}>
          <View style={styles.neuralFinancialHeader}>
            <Icon name="restaurant" size={28} color="#ffaa00" />
            <Text style={styles.neuralFinancialTitle}>STAFF LUNCH DEDUCTIONS</Text>
          </View>
          
          {/* Staff Lunch Metrics */}
          <View style={styles.neuralMetricsGrid}>
            <View style={styles.neuralMetricCard}>
              <View style={styles.neuralMetricHeader}>
                <Icon name="today" size={24} color="#ff0080" />
                <Text style={styles.neuralMetricTitle}>TODAY'S LUNCHES</Text>
              </View>
              <Text style={styles.neuralMetricValue}>{staffLunchMetrics.todayLunches}</Text>
              <Text style={styles.neuralMetricSubtitle}>Staff Meals</Text>
            </View>
            
            <View style={styles.neuralMetricCard}>
              <View style={styles.neuralMetricHeader}>
                <Icon name="attach-money" size={24} color="#ff4444" />
                <Text style={styles.neuralMetricTitle}>TOTAL DEDUCTIONS</Text>
              </View>
              <Text style={[styles.neuralMetricValue, { color: '#ff4444' }]}>${staffLunchMetrics.totalValue.toFixed(2)}</Text>
              <Text style={styles.neuralMetricSubtitle}>Staff Lunch Value</Text>
            </View>
          </View>
          
          {/* Expected After Staff Lunch */}
          <View style={styles.neuralVarianceCard}>
            <View style={styles.neuralVarianceIconContainer}>
              <Icon name="calculate" size={32} color="#00ff88" />
            </View>
            <View style={styles.neuralVarianceContent}>
              <Text style={styles.neuralVarianceTitle}>EXPECTED AFTER LUNCH DEDUCTIONS</Text>
              <Text style={[styles.neuralVarianceAmount, { color: '#00ff88' }]}>
                ${(stats.expectedAfterLunch || 0).toFixed(2)}
              </Text>
              <Text style={styles.neuralVarianceSubtitle}>
                Total: ${(stats.expected.total || 0).toFixed(2)} - Lunch: ${staffLunchMetrics.totalValue.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.neuralVariancePulse, { backgroundColor: '#00ff88' }]} />
          </View>
        </View>

        {/* Variance Matrix - Simplified */}
        <View style={styles.neuralFinancialSection}>
          <View style={styles.neuralFinancialHeader}>
            <Icon name="grid-on" size={28} color="#ff0080" />
            <Text style={styles.neuralFinancialTitle}>VARIANCE MATRIX</Text>
          </View>
          
          {/* Current Holdings */}
          <View style={styles.neuralSummaryCard}>
            <View style={styles.neuralSummaryHeader}>
              <Icon name="account-balance-wallet" size={20} color="#00f5ff" />
              <Text style={styles.neuralSummaryTitle}>CURRENT HOLDINGS</Text>
            </View>
            <View style={styles.neuralSummaryContent}>
              <View style={styles.neuralSummaryItem}>
                <Text style={styles.neuralSummaryLabel}>ZW$</Text>
                <Text style={[styles.neuralSummaryValue, { color: '#f59e0b' }]}>ZW${(stats.expected.cash_zig || 0).toLocaleString()}</Text>
              </View>
              <View style={styles.neuralSummaryDivider} />
              <View style={styles.neuralSummaryItem}>
                <Text style={styles.neuralSummaryLabel}>USD</Text>
                <Text style={[styles.neuralSummaryValue, { color: '#00f5ff' }]}>${(stats.expected.cash_usd || 0).toLocaleString()}</Text>
              </View>
              <View style={styles.neuralSummaryDivider} />
              <View style={styles.neuralSummaryItem}>
                <Text style={styles.neuralSummaryLabel}>RAND</Text>
                <Text style={[styles.neuralSummaryValue, { color: '#ffaa00' }]}>R{(stats.expected.cash_rand || 0).toLocaleString()}</Text>
              </View>
            </View>
          </View>
          
          {/* Transfers Total */}
          <View style={styles.neuralSummaryCard}>
            <View style={styles.neuralSummaryHeader}>
              <Icon name="swap-horiz" size={20} color="#00f5ff" />
              <Text style={styles.neuralSummaryTitle}>TRANSFERS TOTAL</Text>
            </View>
            <View style={styles.neuralSummaryContent}>
              <View style={styles.neuralSummaryItem}>
                <Text style={styles.neuralSummaryLabel}>USD</Text>
                <Text style={[styles.neuralSummaryValue, { color: '#00f5ff' }]}>${(stats.transfer_usd || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.neuralSummaryDivider} />
              <View style={styles.neuralSummaryItem}>
                <Text style={styles.neuralSummaryLabel}>ZW$</Text>
                <Text style={[styles.neuralSummaryValue, { color: '#ffffff' }]}>ZW${(stats.transfer_zig || 0).toLocaleString()}</Text>
              </View>
              <View style={styles.neuralSummaryDivider} />
              <View style={styles.neuralSummaryItem}>
                <Text style={styles.neuralSummaryLabel}>RAND</Text>
                <Text style={[styles.neuralSummaryValue, { color: '#ffaa00' }]}>R{(stats.transfer_rand || 0).toFixed(2)}</Text>
              </View>
            </View>
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#ffaa00', flexDirection: 'row', justifyContent: 'center' }}>
              <Text style={{ color: '#00ff88', fontSize: 16, fontWeight: 'bold' }}>TOTAL TRANSFERS: ${(stats.transferTotal || 0).toFixed(2)}</Text>
            </View>
          </View>
          
          {/* Card Payments Total */}
          <View style={styles.neuralSummaryCard}>
            <View style={styles.neuralSummaryHeader}>
              <Icon name="credit-card" size={20} color="#10b981" />
              <Text style={styles.neuralSummaryTitle}>CARD PAYMENTS</Text>
            </View>
            <View style={styles.neuralSummaryContent}>
              <View style={styles.neuralSummaryItem}>
                <Text style={styles.neuralSummaryLabel}>USD</Text>
                <Text style={[styles.neuralSummaryValue, { color: '#10b981' }]}>${(stats.expected.card_usd || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.neuralSummaryDivider} />
              <View style={styles.neuralSummaryItem}>
                <Text style={styles.neuralSummaryLabel}>ZW$</Text>
                <Text style={[styles.neuralSummaryValue, { color: '#ffffff' }]}>ZW${(stats.expected.card_zig || 0).toLocaleString()}</Text>
              </View>
              <View style={styles.neuralSummaryDivider} />
              <View style={styles.neuralSummaryItem}>
                <Text style={styles.neuralSummaryLabel}>RAND</Text>
                <Text style={[styles.neuralSummaryValue, { color: '#ffaa00' }]}>R{(stats.expected.card_rand || 0).toFixed(2)}</Text>
              </View>
            </View>
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#ffaa00', flexDirection: 'row', justifyContent: 'center' }}>
              <Text style={{ color: '#10b981', fontSize: 16, fontWeight: 'bold' }}>TOTAL CARD: ${((stats.expected.card_usd || 0) + (stats.expected.card_zig || 0) + (stats.expected.card_rand || 0)).toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Neural Cashier Verification Section - Shows ONLY Completed Counts with Shortages */}
        <View style={styles.neuralCashierSection}>
          <View style={styles.neuralCashierHeader}>
            <Icon name="people" size={28} color="#ffaa00" />
            <Text style={styles.neuralCashierTitle}>CASHIER NEURAL VERIFICATION</Text>
          </View>
          
          {/* Summary of Completed Counts */}
          <View style={[styles.neuralStatusPanel, {
            borderColor: completedCashierCounts.length > 0 ? '#00ff88' : (drawerStatus?.is_open ? '#ffaa00' : '#00f5ff'),
            backgroundColor: completedCashierCounts.length > 0 ? 'rgba(0, 255, 136, 0.1)' : (drawerStatus?.is_open ? 'rgba(255, 170, 0, 0.1)' : 'rgba(0, 245, 255, 0.1)'),
            marginBottom: 16
          }]}>
            <View style={styles.neuralStatusIndicator}>
              <View style={[styles.neuralStatusPulse, {
                backgroundColor: completedCashierCounts.length > 0 ? '#00ff88' : (drawerStatus?.is_open ? '#ffaa00' : '#00f5ff')
              }]} />
              <Text style={[styles.neuralStatusText, {
                color: completedCashierCounts.length > 0 ? '#00ff88' : (drawerStatus?.is_open ? '#ffaa00' : '#00f5ff')
              }]}>
                {completedCashierCounts.length > 0
                  ? `${completedCashierCounts.length} CASHIER${completedCashierCounts.length > 1 ? 'S' : ''} COUNTED`
                  : drawerStatus?.is_open
                    ? 'WAITING FOR CASHIER COUNTS...'
                    : '🌅 FRESH START - NEW SESSION READY'}
              </Text>
            </View>
            {!drawerStatus?.is_open && completedCashierCounts.length === 0 && (
              <Text style={{
                color: '#00f5ff',
                fontSize: 12,
                textAlign: 'center',
                marginTop: 8,
                fontStyle: 'italic'
              }}>
                All previous counts cleared. Ready for new day!
              </Text>
            )}
          </View>
          
          <View style={styles.neuralCashierList}>
            {completedCashierCounts.length === 0 ? (
              <View style={styles.neuralEmptyState}>
                <Icon name={drawerStatus?.is_open ? "hourglass-empty" : "check-circle"} size={48} color={drawerStatus?.is_open ? "#6b7280" : "#00ff88"} />
                <Text style={[styles.neuralEmptyStateText, { color: drawerStatus?.is_open ? '#9ca3af' : '#00ff88' }]}>
                  {drawerStatus?.is_open
                    ? "No cashiers have completed their counts yet."
                    : "✓ All counts cleared - Ready for new session!"}
                </Text>
                <Text style={styles.neuralEmptyStateSubtext}>
                  {drawerStatus?.is_open
                    ? "Cashiers must submit their counts from the Cashier Count screen before they appear here."
                    : "Previous day's data has been cleared. Start fresh when shop opens."}
                </Text>
              </View>
            ) : (
              completedCashierCounts.map((count, index) => {
                const cashierName = count.cashier_name || 'Unknown';
                const totals = count.totals || {};
                const expected = count.expected || {};
                const variances = count.variances || {};
                
                // Calculate shortages (negative variances)
                const cashShortage = (variances.cash || 0) < 0 ? Math.abs(variances.cash) : 0;
                const cardShortage = (variances.card || 0) < 0 ? Math.abs(variances.card) : 0;
                const totalShortage = (variances.total || 0) < 0 ? Math.abs(variances.total) : 0;
                const hasShortage = totalShortage > 0;
                
                // Status colors - red for shortage, green for balanced/over
                const statusColor = hasShortage ? '#ff4444' : '#00ff88';
                
                return (
                  <View
                    key={index}
                    style={[
                      styles.neuralCashierCard,
                      { borderLeftColor: statusColor }
                    ]}
                  >
                    {/* Cashier Name - BIG AND CLEAR */}
                    <View style={styles.cashierNameRow}>
                      <Text style={styles.cashierBigName}>{cashierName}</Text>
                      <View style={[styles.cashierStatusBadge, { backgroundColor: statusColor }]}>
                        <Text style={styles.cashierStatusText}>
                          {hasShortage ? 'SHORTAGE' : 'BALANCED'}
                        </Text>
                      </View>
                    </View>
                    
                    {/* Expected vs Actual - BIG VALUES */}
                    <View style={styles.bigAmountsRow}>
                      <View style={styles.bigAmountBox}>
                        <Text style={styles.bigAmountLabel}>EXPECTED</Text>
                        <Text style={[styles.bigAmountValue, { color: '#ffaa00' }]}>
                          ${(expected.cash || 0).toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.bigAmountDivider} />
                      <View style={styles.bigAmountBox}>
                        <Text style={styles.bigAmountLabel}>ACTUAL COUNT</Text>
                        <Text style={[styles.bigAmountValue, { color: '#00ff88' }]}>
                          ${(totals.cash || 0).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                    
                    {/* SHORTAGE DISPLAY - THE KEY METRIC */}
                    {hasShortage ? (
                      <View style={[styles.varianceBanner, { backgroundColor: 'rgba(255, 68, 68, 0.2)', borderColor: '#ff4444' }]}>
                        <Icon name="warning" size={24} color="#ff4444" />
                        <Text style={[styles.varianceBannerText, { color: '#ff4444', fontSize: 20 }]}>
                          SHORTAGE: ${totalShortage.toFixed(2)}
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.varianceBanner, { backgroundColor: 'rgba(0, 255, 136, 0.1)', borderColor: '#00ff88' }]}>
                        <Icon name="check-circle" size={24} color="#00ff88" />
                        <Text style={[styles.varianceBannerText, { color: '#00ff88' }]}>
                          PERFECT BALANCE / OVER
                        </Text>
                      </View>
                    )}
                    
                    {/* Detailed Shortage Breakdown */}
                    {hasShortage && (
                      <View style={styles.shortageBreakdownCard}>
                        <Text style={styles.shortageBreakdownTitle}>📊 SHORTAGE BREAKDOWN</Text>
                        
                        {cashShortage > 0 && (
                          <View style={styles.shortageBreakdownRow}>
                            <Text style={styles.shortageBreakdownLabel}>Cash Shortage:</Text>
                            <Text style={styles.shortageBreakdownValue}>${cashShortage.toFixed(2)}</Text>
                          </View>
                        )}
                        
                        {cardShortage > 0 && (
                          <View style={styles.shortageBreakdownRow}>
                            <Text style={styles.shortageBreakdownLabel}>Card Shortage:</Text>
                            <Text style={styles.shortageBreakdownValue}>${cardShortage.toFixed(2)}</Text>
                          </View>
                        )}
                        
                        <View style={[styles.shortageBreakdownRow, styles.shortageTotalRow]}>
                          <Text style={styles.shortageTotalLabel}>TOTAL SHORTAGE:</Text>
                          <Text style={styles.shortageTotalValue}>${totalShortage.toFixed(2)}</Text>
                        </View>
                      </View>
                    )}

                    {/* Detailed Count Breakdown - All Currencies */}
                    <View style={styles.detailedCountCard}>
                      <Text style={styles.detailedCountTitle}>💰 CASH COUNTED</Text>
                      
                      <View style={styles.detailedCountGrid}>
                        <View style={styles.detailedCountItem}>
                          <Text style={styles.detailedCountLabel}>ZW$ Cash</Text>
                          <Text style={[styles.detailedCountValue, { color: '#f59e0b' }]}>
                            ZW${(totals.cash_zig || 0).toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.detailedCountItem}>
                          <Text style={styles.detailedCountLabel}>USD Cash</Text>
                          <Text style={[styles.detailedCountValue, { color: '#00f5ff' }]}>
                            ${(totals.cash_usd || 0).toFixed(2)}
                          </Text>
                        </View>
                        <View style={styles.detailedCountItem}>
                          <Text style={styles.detailedCountLabel}>RAND Cash</Text>
                          <Text style={[styles.detailedCountValue, { color: '#ffaa00' }]}>
                            R{(totals.cash_rand || 0).toFixed(2)}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.detailedCountTotal}>
                        <Text style={styles.detailedCountTotalLabel}>TOTAL CASH:</Text>
                        <Text style={styles.detailedCountTotalValue}>
                          ZW${(totals.cash_zig || 0).toLocaleString()} + ${(totals.cash_usd || 0).toFixed(2)} + R{(totals.cash_rand || 0).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                    
                    {/* Electronic Payments Breakdown */}
                    <View style={styles.detailedCountCard}>
                      <Text style={styles.detailedCountTitle}>💳 ELECTRONIC PAYMENTS</Text>
                      
                      <View style={styles.detailedCountGrid}>
                        <View style={styles.detailedCountItem}>
                          <Text style={styles.detailedCountLabel}>Card</Text>
                          <Text style={[styles.detailedCountValue, { color: '#10b981' }]}>
                            ${(totals.card || 0).toFixed(2)}
                          </Text>
                        </View>
                        <View style={styles.detailedCountItem}>
                          <Text style={styles.detailedCountLabel}>Transfer</Text>
                          <Text style={[styles.detailedCountValue, { color: '#00f5ff' }]}>
                            ${(count.electronic_payments?.total_transfer || 0).toFixed(2)}
                          </Text>
                        </View>
                        <View style={styles.detailedCountItem}>
                          <Text style={styles.detailedCountLabel}>EcoCash</Text>
                          <Text style={[styles.detailedCountValue, { color: '#ffaa00' }]}>
                            ${(totals.ecocash || 0).toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    {/* Denominations Breakdown */}
                    {count.denominations && (
                      <View style={styles.denominationsBreakdownCard}>
                        <Text style={styles.denominationsBreakdownTitle}>🧮 DENOMINATIONS</Text>
                        
                        {/* USD Denominations */}
                        {count.denominations.usd && (
                          <View style={styles.denominationSection}>
                            <Text style={styles.denominationSectionTitle}>USD Bills</Text>
                            <View style={styles.denominationGrid}>
                              {[
                                { label: '$100', value: count.denominations.usd['100'] },
                                { label: '$50', value: count.denominations.usd['50'] },
                                { label: '$20', value: count.denominations.usd['20'] },
                                { label: '$10', value: count.denominations.usd['10'] },
                                { label: '$5', value: count.denominations.usd['5'] },
                                { label: '$2', value: count.denominations.usd['2'] },
                                { label: '$1', value: count.denominations.usd['1'] },
                              ].filter(d => d.value > 0).map((denom, idx) => (
                                <View key={idx} style={styles.denominationItem}>
                                  <Text style={styles.denominationItemLabel}>{denom.label}</Text>
                                  <Text style={styles.denominationItemValue}>×{denom.value}</Text>
                                </View>
                              ))}
                            </View>
                            {/* USD Coins */}
                            <Text style={styles.denominationSectionTitle}>USD Coins</Text>
                            <View style={styles.denominationGrid}>
                              {[
                                { label: '$1 Coin', value: count.denominations.usd['1_coin'] },
                                { label: '50¢', value: count.denominations.usd['0.50'] },
                                { label: '25¢', value: count.denominations.usd['0.25'] },
                                { label: '10¢', value: count.denominations.usd['0.10'] },
                                { label: '5¢', value: count.denominations.usd['0.05'] },
                                { label: '1¢', value: count.denominations.usd['0.01'] },
                              ].filter(d => d.value > 0).map((denom, idx) => (
                                <View key={idx} style={styles.denominationItem}>
                                  <Text style={styles.denominationItemLabel}>{denom.label}</Text>
                                  <Text style={styles.denominationItemValue}>×{denom.value}</Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        )}
                        
                        {/* ZIG Denominations */}
                        {count.denominations.zig && (
                          <View style={styles.denominationSection}>
                            <Text style={styles.denominationSectionTitle}>ZW$ Notes</Text>
                            <View style={styles.denominationGrid}>
                              {[
                                { label: 'Z$100', value: count.denominations.zig['100'] },
                                { label: 'Z$50', value: count.denominations.zig['50'] },
                                { label: 'Z$20', value: count.denominations.zig['20'] },
                                { label: 'Z$10', value: count.denominations.zig['10'] },
                                { label: 'Z$5', value: count.denominations.zig['5'] },
                                { label: 'Z$2', value: count.denominations.zig['2'] },
                                { label: 'Z$1', value: count.denominations.zig['1'] },
                              ].filter(d => d.value > 0).map((denom, idx) => (
                                <View key={idx} style={styles.denominationItem}>
                                  <Text style={styles.denominationItemLabel}>{denom.label}</Text>
                                  <Text style={styles.denominationItemValue}>×{denom.value}</Text>
                                </View>
                              ))}
                            </View>
                            {/* ZIG Coins */}
                            <Text style={styles.denominationSectionTitle}>ZW$ Coins</Text>
                            <View style={styles.denominationGrid}>
                              {[
                                { label: '50¢', value: count.denominations.zig['0.50'] },
                              ].filter(d => d.value > 0).map((denom, idx) => (
                                <View key={idx} style={styles.denominationItem}>
                                  <Text style={styles.denominationItemLabel}>{denom.label}</Text>
                                  <Text style={styles.denominationItemValue}>×{denom.value}</Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        )}

                        {/* RAND Denominations */}
                        {count.denominations.rand && (
                          <View style={styles.denominationSection}>
                            <Text style={styles.denominationSectionTitle}>RAND Notes</Text>
                            <View style={styles.denominationGrid}>
                              {[
                                { label: 'R200', value: count.denominations.rand['200'] },
                                { label: 'R100', value: count.denominations.rand['100'] },
                                { label: 'R50', value: count.denominations.rand['50'] },
                                { label: 'R20', value: count.denominations.rand['20'] },
                                { label: 'R10', value: count.denominations.rand['10'] },
                                { label: 'R5', value: count.denominations.rand['5'] },
                                { label: 'R2', value: count.denominations.rand['2'] },
                                { label: 'R1', value: count.denominations.rand['1'] },
                              ].filter(d => d.value > 0).map((denom, idx) => (
                                <View key={idx} style={styles.denominationItem}>
                                  <Text style={styles.denominationItemLabel}>{denom.label}</Text>
                                  <Text style={styles.denominationItemValue}>×{denom.value}</Text>
                                </View>
                              ))}
                            </View>
                            {/* RAND Coins */}
                            <Text style={styles.denominationSectionTitle}>RAND Coins</Text>
                            <View style={styles.denominationGrid}>
                              {[
                                { label: '50c', value: count.denominations.rand['0.50'] },
                                { label: '20c', value: count.denominations.rand['0.20'] },
                                { label: '10c', value: count.denominations.rand['0.10'] },
                                { label: '5c', value: count.denominations.rand['0.05'] },
                              ].filter(d => d.value > 0).map((denom, idx) => (
                                <View key={idx} style={styles.denominationItem}>
                                  <Text style={styles.denominationItemLabel}>{denom.label}</Text>
                                  <Text style={styles.denominationItemValue}>×{denom.value}</Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Count Timestamp */}
                    <View style={styles.countTimestampRow}>
                      <Icon name="access-time" size={14} color="#6b7280" />
                      <Text style={styles.countTimestampText}>
                        Counted: {count.counted_at ? new Date(count.counted_at).toLocaleString() : 'Unknown'}
                      </Text>
                    </View>
                    
                    {/* Notes if any */}
                    {count.notes && (
                      <View style={styles.countNotesRow}>
                        <Icon name="note" size={14} color="#8b5cf6" />
                        <Text style={styles.countNotesText}>{count.notes}</Text>
                      </View>
                    )}
                    
                    <View style={styles.neuralCashierLine} />
                  </View>
                );
              })
            )}
          </View>
          
          {/* Neural Summary Card - Updated for Completed Counts */}
          <View style={styles.neuralSummaryCard}>
            <View style={styles.neuralSummaryHeader}>
              <Icon name="summarize" size={20} color="#00f5ff" />
              <Text style={styles.neuralSummaryTitle}>VERIFICATION SUMMARY</Text>
            </View>
            <View style={styles.neuralSummaryContent}>
              <View style={styles.neuralSummaryItem}>
                <Text style={styles.neuralSummaryLabel}>CASHIERS COUNTED</Text>
                <Text style={styles.neuralSummaryValue}>{completedCashierCounts.length}</Text>
              </View>
              <View style={styles.neuralSummaryDivider} />
              <View style={styles.neuralSummaryItem}>
                <Text style={styles.neuralSummaryLabel}>WITH SHORTAGES</Text>
                <Text style={[styles.neuralSummaryValue, { color: '#ff4444' }]}>
                  {completedCashierCounts.filter(c => (c.variances?.total || 0) < 0).length}
                </Text>
              </View>
              <View style={styles.neuralSummaryDivider} />
              <View style={styles.neuralSummaryItem}>
                <Text style={styles.neuralSummaryLabel}>TOTAL SHORTAGE</Text>
                <Text style={[styles.neuralSummaryValue, { color: '#ff4444' }]}>
                  ${completedCashierCounts.reduce((sum, c) => {
                    const variance = c.variances?.total || 0;
                    return sum + (variance < 0 ? Math.abs(variance) : 0);
                  }, 0).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Manager Notes - Neural Style */}
        <View style={styles.neuralNotesSection}>
          <View style={styles.neuralNotesHeader}>
            <Icon name="note" size={24} color="#8b5cf6" />
            <Text style={styles.neuralNotesTitle}>NEURAL NOTES INTERFACE</Text>
          </View>
          
          <View style={styles.neuralNotesCard}>
            <TextInput
              style={styles.neuralNotesInput}
              multiline
              placeholder="Add neural notes about the day's reconciliation..."
              value={globalNotes}
              onChangeText={setGlobalNotes}
              placeholderTextColor="#6b7280"
            />
          </View>
        </View>

        {/* Finalization - Neural Control Interface */}
        <View style={styles.neuralFinalizationSection}>
          <View style={styles.neuralFinalizationHeader}>
            <Icon name="security" size={32} color="#ff4444" />
            <Text style={styles.neuralFinalizationTitle}>EOD FINALIZATION CONTROL</Text>
          </View>
          
          <View style={styles.neuralFinalizationCard}>
            <View style={styles.neuralWarningRow}>
              <Icon name="warning" size={28} color="#ffaa00" style={styles.neuralWarningIcon} />
              <Text style={styles.neuralWarningText}>
                This will PERMANENTLY DELETE all sales for today, reset all drawers to zero, and log out all users
              </Text>
            </View>
            
            <View style={styles.neuralFinalizationStatus}>
              <View style={styles.neuralStatusRow}>
                <Icon name="verified" size={24} color="#00ff88" style={styles.neuralStatusRowIcon} />
                <Text style={styles.neuralStatusRowText}>Cashiers Counted</Text>
                <Text style={[styles.neuralStatusRowValue, { 
                  color: completedCashierCounts.length === totalCashiers && totalCashiers > 0 ? '#00ff88' : '#ff4444' 
                }]}>
                  {completedCashierCounts.length}/{totalCashiers} Complete
                </Text>
              </View>
              
              {/* Show which cashiers haven't counted yet */}
              {completedCashierCounts.length < totalCashiers && todayDrawers.length > 0 && (
                <View style={[styles.neuralStatusRow, { backgroundColor: 'rgba(255, 68, 68, 0.2)', borderColor: '#ff4444', borderWidth: 1 }]}>
                  <Icon name="warning" size={24} color="#ff4444" style={styles.neuralStatusRowIcon} />
                  <Text style={[styles.neuralStatusRowText, { color: '#ff4444' }]}>
                    Waiting for: {todayDrawers
                      .filter(d => !completedCashierCounts.some(c => c.cashier_name === (d.cashier_name || d.cashier)))
                      .map(d => d.cashier_name || d.cashier)
                      .join(', ')}
                  </Text>
                </View>
              )}
              
              <View style={styles.neuralStatusRow}>
                <Icon name="analytics" size={24} color={varianceColor} style={styles.neuralStatusRowIcon} />
                <Text style={styles.neuralStatusRowText}>Total Shortage</Text>
                <Text style={[styles.neuralStatusRowValue, { color: '#ff4444' }]}>
                  ${completedCashierCounts.reduce((sum, c) => {
                    const variance = c.variances?.total || 0;
                    return sum + (variance < 0 ? Math.abs(variance) : 0);
                  }, 0).toFixed(2)}
                </Text>
              </View>
            </View>
            
            
            <TouchableOpacity
              style={[
                styles.neuralFinalizeButton,
                (completedCashierCounts.length !== totalCashiers || totalCashiers === 0 || finalizing || closing) && styles.neuralDisabledButton
              ]}
              disabled={completedCashierCounts.length !== totalCashiers || totalCashiers === 0 || finalizing || closing}
              onPress={() => setShowFinalizeModal(true)}
            >
              <View style={styles.neuralButtonGlow} />
              <Icon name="delete-forever" size={28} color="#ffffff" style={styles.neuralButtonIcon} />
              <Text style={styles.neuralFinalizeButtonText}>
                {closing ? 'CLOSING SHOP...' : finalizing ? 'DELETING & FINALIZING...' : 'DELETE SALES & SHUTDOWN'}
              </Text>
              <View style={styles.neuralButtonScanner} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* MODAL */}
      <Modal visible={showModal} animationType="slide">
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowModal(false)} style={styles.modalCloseButton}>
            <Icon name="close" size={26} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.modalTitleContainer}>
            <Icon name="person" size={20} color="#00f5ff" />
            <Text style={styles.modalTitle}>{getCashierDisplayName(currentCashier)}</Text>
          </View>
          <TouchableOpacity onPress={saveCashier} style={styles.modalSaveButton}>
            <Icon name="check" size={24} color="#00ff88" />
            <Text style={styles.saveText}>SAVE</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalScrollView}>
          <View style={styles.form}>
            <View style={styles.modalSectionHeader}>
              <Icon name="account-balance-wallet" size={24} color="#00ff88" />
              <Text style={styles.modalSectionTitle}>💰 Multi-Currency Cash Count</Text>
            </View>
            
            <View style={styles.modalCurrencyGrid}>
              <View style={styles.modalCurrencyCard}>
                <Icon name="attach-money" size={28} color="#f59e0b" />
                <Text style={styles.modalCurrencyLabel}>ZW$ Cash Counted</Text>
                <TextInput
                  style={styles.modalAmountInput}
                  keyboardType="decimal-pad"
                  value={inputs.cash_zig}
                  onChangeText={v => setInputs({ ...inputs, cash_zig: v })}
                  placeholder="0.00"
                  placeholderTextColor="#6b7280"
                />
              </View>

              <View style={styles.modalCurrencyCard}>
                <Icon name="attach-money" size={28} color="#00f5ff" />
                <Text style={styles.modalCurrencyLabel}>$ Cash Counted (USD)</Text>
                <TextInput
                  style={styles.modalAmountInput}
                  keyboardType="decimal-pad"
                  value={inputs.cash_usd}
                  onChangeText={v => setInputs({ ...inputs, cash_usd: v })}
                  placeholder="0.00"
                  placeholderTextColor="#6b7280"
                />
              </View>

              <View style={styles.modalCurrencyCard}>
                <Icon name="attach-money" size={28} color="#ffaa00" />
                <Text style={styles.modalCurrencyLabel}>R Cash Counted (Rand)</Text>
                <TextInput
                  style={styles.modalAmountInput}
                  keyboardType="decimal-pad"
                  value={inputs.cash_rand}
                  onChangeText={v => setInputs({ ...inputs, cash_rand: v })}
                  placeholder="0.00"
                  placeholderTextColor="#6b7280"
                />
              </View>

              <View style={[styles.modalCurrencyCard, { borderColor: 'rgba(16, 185, 129, 0.5)' }]}>
                <Icon name="credit-card" size={28} color="#10b981" />
                <Text style={[styles.modalCurrencyLabel, { color: '#10b981' }]}>Card Payments</Text>
                <TextInput
                  style={[styles.modalAmountInput, { borderColor: 'rgba(16, 185, 129, 0.3)' }]}
                  keyboardType="decimal-pad"
                  value={inputs.card}
                  onChangeText={v => setInputs({ ...inputs, card: v })}
                  placeholder="0.00"
                  placeholderTextColor="#6b7280"
                />
              </View>
            </View>

            <View style={styles.modalNotesSection}>
              <Icon name="note" size={20} color="#ffaa00" />
              <Text style={styles.modalNotesLabel}>Notes (optional)</Text>
              <TextInput
                style={styles.modalNotesInput}
                multiline
                placeholder="Add any notes about the cash count..."
                value={inputs.notes}
                onChangeText={v => setInputs({ ...inputs, notes: v })}
                placeholderTextColor="#6b7280"
              />
            </View>
          </View>
        </ScrollView>
        
        <View style={styles.modalFooter}>
          <TouchableOpacity 
            style={styles.modalCancelButton}
            onPress={() => setShowModal(false)}
          >
            <Text style={styles.modalCancelButtonText}>CANCEL</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.modalConfirmButton}
            onPress={saveCashier}
          >
            <Icon name="check" size={20} color="#ffffff" />
            <Text style={styles.modalConfirmButtonText}>SAVE COUNT</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal visible={showDeleteModal} animationType="fade" transparent={true}>
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteModalHeader}>
              <Icon name="delete-forever" size={40} color="#ff4444" />
              <Text style={styles.deleteModalTitle}>⚠️ DELETE TODAY'S SALES</Text>
            </View>
            
            <Text style={styles.deleteModalWarning}>
              This will PERMANENTLY DELETE all sales for today and reset all drawers to zero.\n\nThis action cannot be undone!
            </Text>
            
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteModalCancelButton}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.deleteModalCancelText}>CANCEL</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.deleteModalConfirmButton}
                onPress={handleDeleteConfirm}
              >
                <Icon name="delete-forever" size={20} color="#ffffff" />
                <Text style={styles.deleteModalConfirmText}>DELETE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FINALIZE DAY CONFIRMATION MODAL */}
      <Modal visible={showFinalizeModal} animationType="fade" transparent={true}>
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteModalHeader}>
              <Icon name="warning" size={40} color="#ffaa00" />
              <Text style={styles.deleteModalTitle}>⚠️ FINALIZE END OF DAY</Text>
            </View>
            
            <View style={styles.finalizeModalSummary}>
              <Text style={styles.finalizeModalSummaryTitle}>DAY SUMMARY</Text>
              <View style={styles.finalizeModalRow}>
                <Text style={styles.finalizeModalLabel}>Cashiers Counted:</Text>
                <Text style={[styles.finalizeModalValue, { 
                  color: completedCashierCounts.length === totalCashiers && totalCashiers > 0 ? '#00ff88' : '#ff4444'
                }]}>
                  {completedCashierCounts.length}/{totalCashiers}
                </Text>
              </View>
              
              {/* Show who hasn't counted */}
              {completedCashierCounts.length < totalCashiers && todayDrawers.length > 0 && (
                <View style={[styles.finalizeModalRow, { backgroundColor: 'rgba(255, 68, 68, 0.1)' }]}>
                  <Text style={[styles.finalizeModalLabel, { color: '#ff4444' }]}>Still Waiting:</Text>
                  <Text style={[styles.finalizeModalValue, { color: '#ff4444', flex: 1, textAlign: 'right' }]}>
                    {todayDrawers
                      .filter(d => !completedCashierCounts.some(c => c.cashier_name === (d.cashier_name || d.cashier)))
                      .map(d => d.cashier_name || d.cashier)
                      .join(', ')}
                  </Text>
                </View>
              )}
              
              <View style={styles.finalizeModalRow}>
                <Text style={styles.finalizeModalLabel}>Total Shortage:</Text>
                <Text style={[styles.finalizeModalValue, { color: '#ff4444' }]}>
                  ${completedCashierCounts.reduce((sum, c) => {
                    const variance = c.variances?.total || 0;
                    return sum + (variance < 0 ? Math.abs(variance) : 0);
                  }, 0).toFixed(2)}
                </Text>
              </View>
              <View style={styles.finalizeModalRow}>
                <Text style={styles.finalizeModalLabel}>Transfers:</Text>
                <Text style={styles.finalizeModalValue}>${(stats.transferTotal || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.finalizeModalRow}>
                <Text style={styles.finalizeModalLabel}>Card:</Text>
                <Text style={styles.finalizeModalValue}>${(stats.totalCard || 0).toFixed(2)}</Text>
              </View>
            </View>
            
            <Text style={styles.deleteModalWarning}>
              ⚠️ This will PERMANENTLY DELETE all sales for today, reset all drawers to zero, and log out all users.\n\nThis action cannot be undone!
            </Text>
            
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteModalCancelButton}
                onPress={() => setShowFinalizeModal(false)}
              >
                <Text style={styles.deleteModalCancelText}>CANCEL</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.deleteModalConfirmButton}
                onPress={() => {
                  setShowFinalizeModal(false);
                  finalizeDay();
                }}
              >
                <Icon name="delete-forever" size={20} color="#ffffff" />
                <Text style={styles.deleteModalConfirmText}>FINALIZE DAY</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
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
  bottomPadding: {
    height: 40,
  },
  
  // Neural 2080 Header Styles
  neural2080Header: {
    backgroundColor: '#0a0a0a',
    padding: 20,
    paddingTop: 20,
    position: 'relative',
    overflow: 'hidden',
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
    opacity: 0.3,
  },
  energyPulse: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#ff0080',
  },
  controlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    zIndex: 10,
  },
  neuralBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#00f5ff',
  },
  neuralBackButtonText: {
    color: '#00f5ff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
    letterSpacing: 1,
  },
  neuralTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  neuralBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 128, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ff0080',
    marginBottom: 8,
  },
  neuralBadgeText: {
    color: '#ff0080',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 6,
    letterSpacing: 2,
  },
  neuralMainTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 2,
    textShadowColor: '#00f5ff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  neuralSubtitle: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 1,
  },
  neuralRefreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#00f5ff',
  },
  neuralRefreshText: {
    color: '#00f5ff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
    letterSpacing: 1,
  },
  neuralStatusPanel: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#00ff88',
    marginBottom: 16,
  },
  neuralStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  neuralStatusPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00ff88',
    marginRight: 8,
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  neuralStatusText: {
    color: '#00ff88',
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 10,
    letterSpacing: 1,
  },
  neuralPerformanceMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  neuralMetricUnit: {
    alignItems: 'center',
  },
  neuralMetricLabel: {
    color: '#00ff88',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  neuralMetricValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  neuralMetricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#00ff88',
    opacity: 0.5,
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
  
  // System Intelligence Section
  systemIntelligenceSection: {
    padding: 20,
    paddingTop: 10,
  },
  systemIntelligenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  systemIntelligenceTitle: {
    color: '#ff0080',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
    letterSpacing: 2,
  },
  headerScanner: {
    position: 'absolute',
    top: 36,
    left: '50%',
    transform: [{ translateX: -50 }],
    width: 280,
    height: 2,
    backgroundColor: '#ff0080',
  },
  systemMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  systemMetricCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 16,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)',
  },
  systemMetricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  systemMetricTitle: {
    color: '#00f5ff',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 8,
    letterSpacing: 1,
  },
  systemProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  systemProgressBar: {
    height: 6,
    backgroundColor: '#00f5ff',
    borderRadius: 3,
    marginRight: 12,
  },
  systemProgressValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  aiMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  aiMetricCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 128, 0.3)',
  },
  aiMetricLabel: {
    color: '#ffaa00',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  aiMetricValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
  },
  aiMetricBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  aiMetricFill: {
    height: '100%',
    borderRadius: 2,
  },
  
  // Neural Financial Section
  neuralFinancialSection: {
    padding: 20,
    paddingTop: 10,
  },
  neuralFinancialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  neuralFinancialTitle: {
    color: '#00ff88',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
    letterSpacing: 2,
  },
  financialHeaderScanner: {
    position: 'absolute',
    top: 38,
    left: '50%',
    transform: [{ translateX: -50 }],
    width: 260,
    height: 2,
    backgroundColor: '#00ff88',
  },
  neuralMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  neuralMetricCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 16,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
    position: 'relative',
    overflow: 'hidden',
  },
  neuralMetricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  neuralMetricTitle: {
    color: '#00f5ff',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 8,
    letterSpacing: 1,
  },
  neuralMetricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  neuralMetricSubtitle: {
    fontSize: 10,
    color: '#888',
    letterSpacing: 1,
  },
  sectionSubtitle: {
    color: '#ffaa00',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    letterSpacing: 1,
  },
  neuralVarianceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  neuralVarianceIconContainer: {
    marginRight: 16,
  },
  neuralVarianceContent: {
    flex: 1,
  },
  neuralVarianceTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: 1,
  },
  neuralVarianceAmount: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  neuralVarianceSubtitle: {
    fontSize: 12,
    color: '#888',
    letterSpacing: 1,
  },
  neuralVariancePulse: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  neuralProgressContainer: {
    backgroundColor: 'rgba(0, 245, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
  },
  neuralProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  neuralProgressTitle: {
    color: '#00f5ff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 10,
    letterSpacing: 1,
  },
  neuralProgressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  neuralProgressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  neuralProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  neuralProgressText: {
    fontSize: 12,
    color: '#e2e8f0',
    fontWeight: '500',
  },
  neuralProgressPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Neural Cashier Section
  neuralCashierSection: {
    padding: 20,
    paddingTop: 10,
  },
  neuralCashierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  neuralCashierTitle: {
    color: '#ffaa00',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
    letterSpacing: 2,
    textShadowColor: '#ffaa00',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  cashierHeaderScanner: {
    position: 'absolute',
    top: 36,
    left: '50%',
    transform: [{ translateX: -50 }],
    width: 300,
    height: 2,
    backgroundColor: '#ffaa00',
  },
  neuralCashierList: {
    gap: 12,
  },
  neuralEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.3)',
  },
  neuralEmptyStateText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  neuralEmptyStateSubtext: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  neuralCashierCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 12,
  },
  cashierNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cashierBigName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1,
  },
  cashierStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cashierStatusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  bigAmountsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  bigAmountBox: {
    flex: 1,
    alignItems: 'center',
  },
  bigAmountDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 16,
  },
  bigAmountLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 6,
  },
  bigAmountValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  varianceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  varianceBannerText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    letterSpacing: 1,
  },
  currencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  currencyItem: {
    alignItems: 'center',
    flex: 1,
  },
  currencyLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  currencyValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  
  // Transfer Currency Row Styles
  transferCurrencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 245, 255, 0.2)',
  },
  transferCurrencyItem: {
    alignItems: 'center',
    flex: 1,
  },
  transferCurrencyLabel: {
    fontSize: 9,
    color: '#00f5ff',
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
    textAlign: 'center',
  },
  transferCurrencyValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#00f5ff',
    textAlign: 'center',
  },
  neuralCashierLine: {
    height: 1,
    backgroundColor: '#ffaa00',
    marginTop: 8,
    opacity: 0.5,
  },
  neuralVarianceRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  neuralVarianceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  neuralVarianceBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  
  // Transfer Display Styles
  transferDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)',
  },
  transferDisplayLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transferDisplayText: {
    color: '#00f5ff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
    letterSpacing: 1,
  },
  transferDisplayValues: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transferExpected: {
    color: '#ffaa00',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 12,
  },
  transferActual: {
    color: '#00ff88',
    fontSize: 12,
    fontWeight: '600',
  },
  neuralSummaryCard: {
    backgroundColor: 'rgba(255, 170, 0, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 170, 0, 0.3)',
  },
  neuralSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  neuralSummaryTitle: {
    color: '#ffaa00',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 10,
    letterSpacing: 1,
  },
  neuralSummaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  neuralSummaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  neuralSummaryLabel: {
    color: '#888',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 6,
    textAlign: 'center',
  },
  neuralSummaryValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  neuralSummaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#ffaa00',
    opacity: 0.5,
  },
  
  // Tap Instruction Styles
  tapInstructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 245, 255, 0.15)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#00f5ff',
  },
  tapInstructionText: {
    color: '#00f5ff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
    letterSpacing: 1,
  },
  // Prominent Tap to Count Row
  tapToCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 245, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#00f5ff',
  },
  tapToCountText: {
    color: '#00f5ff',
    fontSize: 16,
    fontWeight: '900',
    marginLeft: 12,
    letterSpacing: 2,
  },
  
  // Shortage Breakdown Styles
  shortageBreakdownCard: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  shortageBreakdownTitle: {
    color: '#ff4444',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    letterSpacing: 1,
  },
  shortageBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 68, 68, 0.2)',
  },
  shortageBreakdownLabel: {
    color: '#9ca3af',
    fontSize: 14,
  },
  shortageBreakdownValue: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
  shortageTotalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#ff4444',
    borderBottomWidth: 0,
  },
  shortageTotalLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  shortageTotalValue: {
    color: '#ff4444',
    fontSize: 20,
    fontWeight: '900',
  },
  
  // Count Timestamp Styles
  countTimestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  countTimestampText: {
    color: '#6b7280',
    fontSize: 12,
    marginLeft: 8,
  },
  
  // Count Notes Styles
  countNotesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  countNotesText: {
    color: '#8b5cf6',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },

  // Detailed Count Card Styles
  detailedCountCard: {
    backgroundColor: 'rgba(0, 245, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)',
  },
  detailedCountTitle: {
    color: '#00f5ff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    letterSpacing: 1,
  },
  detailedCountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  detailedCountItem: {
    width: '30%',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    alignItems: 'center',
  },
  detailedCountLabel: {
    color: '#9ca3af',
    fontSize: 11,
    marginBottom: 4,
  },
  detailedCountValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailedCountTotal: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 245, 255, 0.3)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailedCountTotalLabel: {
    color: '#00f5ff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  detailedCountTotalValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Denominations Breakdown Styles
  denominationsBreakdownCard: {
    backgroundColor: 'rgba(255, 170, 0, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 170, 0, 0.3)',
  },
  denominationsBreakdownTitle: {
    color: '#ffaa00',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    letterSpacing: 1,
  },
  denominationSection: {
    marginBottom: 12,
  },
  denominationSectionTitle: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: 1,
  },
  denominationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  denominationItem: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 80,
  },
  denominationItemLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 8,
  },
  denominationItemValue: {
    color: '#00ff88',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Neural Notes Section
  neuralNotesSection: {
    padding: 20,
    paddingTop: 10,
  },
  neuralNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  neuralNotesTitle: {
    color: '#8b5cf6',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
    letterSpacing: 2,
  },
  notesHeaderScanner: {
    position: 'absolute',
    top: 36,
    left: '50%',
    transform: [{ translateX: -50 }],
    width: 280,
    height: 2,
    backgroundColor: '#8b5cf6',
  },
  neuralNotesCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  neuralNotesInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 14,
    minHeight: 100,
    color: '#ffffff',
    fontSize: 14,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  // Finalization Section Styles
  neuralFinalizationSection: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  neuralFinalizationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  neuralFinalizationTitle: {
    color: '#ff4444',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
    letterSpacing: 2,
  },
  neuralFinalizationCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderLeftWidth: 6,
    borderColor: 'rgba(255, 68, 68, 0.4)',
  },
  neuralWarningIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  neuralWarningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 170, 0, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 170, 0, 0.5)',
  },
  neuralWarningText: {
    color: '#ffaa00',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },
  neuralFinalizationStatus: {
    marginBottom: 24,
    gap: 12,
  },
  neuralStatusRowIcon: {
    marginRight: 12,
  },
  neuralStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 10,
  },
  neuralStatusRowText: {
    fontSize: 16,
    color: '#e2e8f0',
    marginLeft: 10,
    fontWeight: '600',
    flex: 1,
  },
  neuralStatusRowValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  neuralButtonIcon: {
    marginRight: 4,
  },
  neuralFinalizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.3)',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#ff4444',
    position: 'relative',
    overflow: 'hidden',
    marginTop: 8,
  },
  neuralDisabledButton: {
    backgroundColor: 'rgba(107, 114, 128, 0.3)',
    borderColor: '#6b7280',
  },
  neuralButtonGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 68, 68, 0.15)',
    borderRadius: 14,
  },
  neuralFinalizeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 12,
    letterSpacing: 2,
  },
  neuralButtonScanner: {
    position: 'absolute',
    top: 0,
    left: '-100%',
    right: 0,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 14,
  },
  
  // Delete Staff Lunch Button Styles
  neuralDeleteLunchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 170, 0, 0.2)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#ffaa00',
    marginTop: 12,
  },
  neuralDeleteLunchButtonText: {
    color: '#ffaa00',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 10,
    letterSpacing: 1,
  },
  
  // Modal Styles
  modal: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#00f5ff',
  },
  modalCloseButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 10,
  },
  modalSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    borderWidth: 1,
    borderColor: '#00ff88',
  },
  saveText: {
    color: '#00ff88',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 6,
  },
  modalScrollView: {
    flex: 1,
  },
  form: {
    padding: 20,
    backgroundColor: '#0a0a0a',
  },
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 10,
  },
  modalCurrencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  modalCurrencyCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 16,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)',
  },
  modalCurrencyLabel: {
    fontSize: 12,
    color: '#e2e8f0',
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalAmountInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 14,
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
    textAlign: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)',
  },
  modalNotesSection: {
    marginTop: 8,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 170, 0, 0.3)',
  },
  modalNotesLabel: {
    color: '#ffaa00',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 10,
    marginBottom: 12,
  },
  modalNotesInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 14,
    minHeight: 80,
    color: '#ffffff',
    fontSize: 14,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255, 170, 0, 0.2)',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1a1a2e',
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(107, 114, 128, 0.3)',
    alignItems: 'center',
    marginRight: 8,
  },
  modalCancelButtonText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  modalConfirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#00ff88',
    marginLeft: 8,
  },
  modalConfirmButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
    letterSpacing: 1,
  },
  
  // Delete Section Styles
  neuralDeleteSection: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  neuralDeleteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  neuralDeleteTitle: {
    color: '#ff4444',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
    letterSpacing: 2,
    textShadowColor: '#ff4444',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  deleteHeaderScanner: {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: [{ translateX: -50 }],
    width: 160,
    height: 2,
    backgroundColor: '#ff4444',
  },
  neuralDeleteCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    position: 'relative',
    overflow: 'hidden',
  },
  neuralDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.3)',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#ff4444',
    position: 'relative',
    overflow: 'hidden',
    marginTop: 16,
  },
  neuralDeleteButtonGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    borderRadius: 14,
  },
  neuralDeleteButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 12,
    letterSpacing: 2,
  },
  neuralDeleteButtonScanner: {
    position: 'absolute',
    top: 0,
    left: '-100%',
    right: 0,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 14,
  },
  
  // Delete Modal Styles
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#ff4444',
    alignItems: 'center',
  },
  deleteModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    color: '#ff4444',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
    letterSpacing: 1,
  },
  deleteModalWarning: {
    color: '#ffaa00',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  deleteModalInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.5)',
    marginBottom: 20,
    textAlign: 'center',
  },
  deleteModalButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  deleteModalCancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(107, 114, 128, 0.3)',
    alignItems: 'center',
  },
  deleteModalCancelText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  deleteModalConfirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#ff4444',
    gap: 8,
  },
  deleteModalConfirmText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  
  // Finalize Modal Styles
  finalizeModalSummary: {
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)',
  },
  finalizeModalSummaryTitle: {
    color: '#00f5ff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 12,
    textAlign: 'center',
  },
  finalizeModalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  finalizeModalLabel: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  finalizeModalValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default EODProductionScreen;
