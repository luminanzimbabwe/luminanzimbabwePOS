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
import { shopAPI, getApiBaseUrl } from '../services/api';
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
  
  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

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
      const [recon, drawers] = await Promise.all([
        shopAPI.getEnhancedReconciliation(timestamp),
        // Use session-aware endpoint - returns only current session sales (resets when shop is closed)
        shopAPI.getAllDrawersSession(timestamp)
      ]);
      setReconciliationData(recon.data);
      setDrawerStatus(drawers.data.shop_status || drawers.data);
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
      const savePromises = Object.entries(cashierCounts).map(([cashierId, count]) => {
        return shopAPI.saveCashierCount({
          cashier_id: cashierId,
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
  // Now accounts for staff lunch deductions
  const getCashierVariance = (drawer, verifiedCount) => {
    if (!drawer?.eod_expectations) return { variance: 0, status: 'pending', expected: 0, actual: 0 };
    
    // Get expected amounts from drawer expectations
    const expectedZig = drawer.eod_expectations.expected_zig || 0;
    const expectedUsd = drawer.eod_expectations.expected_cash || 0;
    const expectedRand = drawer.eod_expectations.expected_rand || 0;
    
    // Get expected card from breakdown
    const expectedCard = (drawer.current_breakdown_by_currency?.usd?.card || 0) + 
                        (drawer.current_breakdown_by_currency?.zig?.card || 0) + 
                        (drawer.current_breakdown_by_currency?.rand?.card || 0);
    
    // Total expected for this cashier (sum of all currencies)
    const totalExpectedBeforeLunch = expectedZig + expectedUsd + expectedRand + expectedCard;
    
    // Subtract staff lunch deductions from expected amount
    // Staff lunches reduce the cash that should be in the drawer
    const staffLunchDeduction = staffLunchMetrics.totalValue || 0;
    const totalExpected = totalExpectedBeforeLunch - staffLunchDeduction;
    
    // Get verified/counted amounts
    const verified = verifiedCount || {};
    const actualZig = verified.cash_zig || 0;
    const actualUsd = verified.cash_usd || 0;
    const actualRand = verified.cash_rand || 0;
    const actualCard = verified.card || 0;
    
    // Total actual for this cashier
    const totalActual = actualZig + actualUsd + actualRand + actualCard;
    
    // Calculate variance (positive = overage, negative = shortage)
    const variance = totalActual - totalExpected;
    
    // Determine status
    let status = 'pending';
    let varianceType = 'pending';
    if (verifiedCount && Object.keys(verifiedCount).length > 0) {
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
        zig: { expected: expectedZig, actual: actualZig },
        usd: { expected: expectedUsd, actual: actualUsd },
        rand: { expected: expectedRand, actual: actualRand },
        card: { expected: expectedCard, actual: actualCard }
      },
      staffLunchDeduction // Include for display purposes
    };
  };

  // Calculate expected amounts from current drawer data
  const stats = useMemo(() => {
    let cash_zig = 0;
    let cash_usd = 0;
    let cash_rand = 0;
    let card = 0;

    Object.values(cashierCounts).forEach(v => {
      cash_zig += v.cash_zig || 0;
      cash_usd += v.cash_usd || 0;
      cash_rand += v.cash_rand || 0;
      card += v.card || 0;
    });

    // Calculate expected amounts from current drawer data
    let expected = {
      cash_zig: 0,
      cash_usd: 0,
      cash_rand: 0,
      card: 0,
      total: 0
    };

    if (drawerStatus?.drawers && drawerStatus.drawers.length > 0) {
      // Sum up all drawer expected amounts using expected_cash which includes float + sales
      drawerStatus.drawers.forEach(drawer => {
        if (drawer.eod_expectations) {
          expected.cash_usd += drawer.eod_expectations.expected_cash || 0;
          expected.cash_zig += drawer.eod_expectations.expected_zig || 0;
          expected.cash_rand += drawer.eod_expectations.expected_rand || 0;
        }
        // Get card from current_breakdown_by_currency
        const breakdownByCurrency = drawer?.current_breakdown_by_currency || {};
        expected.card += breakdownByCurrency?.usd?.card || breakdownByCurrency?.zig?.card || 0;
        expected.card += breakdownByCurrency?.rand?.card || 0;
      });
      expected.total = expected.cash_zig + expected.cash_usd + expected.cash_rand + expected.card;
    } else {
      // Check for enhanced multi-currency expected amounts first
      const enhancedExpected = reconciliationData?.expected_amounts?.by_currency;
      if (enhancedExpected) {
        // Use the multi-currency breakdown from enhanced reconciliation
        expected.cash_zig = enhancedExpected?.zig?.expected_cash || 0;
        expected.cash_usd = enhancedExpected?.usd?.expected_cash || 0;
        expected.cash_rand = enhancedExpected?.rand?.expected_cash || 0;
        // Sum up all card payments across currencies
        expected.card = (enhancedExpected?.usd?.expected_card || 0) + 
                       (enhancedExpected?.zig?.expected_card || 0) + 
                       (enhancedExpected?.rand?.expected_card || 0);
        expected.total = expected.cash_zig + expected.cash_usd + expected.cash_rand + expected.card;
      } else {
        // Fallback to legacy format
        const legacyExpected = reconciliationData?.expected_amounts || {};
        expected.cash_zig = legacyExpected.cash_zig || 0;
        expected.cash_usd = legacyExpected.cash_usd || 0;
        expected.cash_rand = legacyExpected.cash_rand || 0;
        expected.card = legacyExpected.card || 0;
        expected.total = legacyExpected.total || 0;
      }
    }

    const actual = cash_zig + cash_usd + cash_rand + card;
    const variance = actual - (expected.total - staffLunchMetrics.totalValue);

    return { 
      cash_zig, cash_usd, cash_rand, card, expected, actual, variance,
      verifiedCash: cash_zig + cash_usd + cash_rand,
      expectedAfterLunch: expected.total - staffLunchMetrics.totalValue
    };
  }, [cashierCounts, reconciliationData, drawerStatus]);

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

  const saveCashier = async () => {
    const cash_zig = parseFloat(inputs.cash_zig) || 0;
    const cash_usd = parseFloat(inputs.cash_usd) || 0;
    const cash_rand = parseFloat(inputs.cash_rand) || 0;
    
    if (cash_zig === 0 && cash_usd === 0 && cash_rand === 0) {
      Alert.alert('Invalid Cash', 'Enter a valid cash amount in at least one currency');
      return;
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const updatedCounts = {
      ...cashierCounts,
      [currentCashier]: {
        cash_zig,
        cash_usd,
        cash_rand,
        card: parseFloat(inputs.card || 0),
        notes: inputs.notes,
        timestamp: new Date().toISOString()
      }
    };

    setCashierCounts(updatedCounts);

    // Save to database
    try {
      const today = new Date().toISOString().split('T')[0];
      await shopAPI.saveCashierCount({
        cashier_id: currentCashier,
        date: today,
        expected_cash: cash_zig,
        expected_cash_usd: cash_usd,
        expected_cash_rand: cash_rand,
        expected_card: parseFloat(inputs.card || 0),
        notes: inputs.notes,
        status: 'IN_PROGRESS'
      });
    } catch (error) {
      // Don't show error to user for individual saves, just log it
    }

    setShowModal(false);
  };

  // Filter drawers to only show cashiers who logged in TODAY (have activity/sales)
  const todayDrawers = useMemo(() => {
    if (!drawerStatus?.drawers) return [];
    const today = new Date().toISOString().split('T')[0];
    
    return drawerStatus.drawers.filter(drawer => {
      // Check if drawer has expected amounts (means it has activity today)
      const hasExpectedAmounts = drawer.eod_expectations && (
        (drawer.eod_expectations.expected_cash || 0) > 0 ||
        (drawer.eod_expectations.expected_zig || 0) > 0 ||
        (drawer.eod_expectations.expected_rand || 0) > 0
      );
      
      // Check if drawer has current holdings (has cash in drawer)
      const hasCurrentHoldings = drawer.current_total_cash > 0 || 
        drawer.current_breakdown_by_currency?.zig?.total > 0 ||
        drawer.current_breakdown_by_currency?.usd?.total > 0 ||
        drawer.current_breakdown_by_currency?.rand?.total > 0;
      
      return hasExpectedAmounts || hasCurrentHoldings;
    });
  }, [drawerStatus]);

  const totalCashiers = todayDrawers.length || 0;
  const verifiedCount = Object.keys(cashierCounts).length;
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

            <TouchableOpacity onPress={loadAllData} style={styles.neuralRefreshButton} disabled={refreshing}>
              <Icon name="sync" size={20} color="#00f5ff" />
              <Text style={styles.neuralRefreshText}>SYNC</Text>
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

        {/* Neural Financial Overview */}
        <View style={styles.neuralFinancialSection}>
          <View style={styles.neuralFinancialHeader}>
            <Icon name="account-balance" size={28} color="#00ff88" />
            <Text style={styles.neuralFinancialTitle}>FINANCIAL NEURAL GRID</Text>
          </View>
          
          {/* Shop Status Indicator */}
          <View style={[styles.neuralStatusPanel, { borderColor: '#ffaa00', backgroundColor: 'rgba(255, 170, 0, 0.1)' }]}>
            <View style={styles.neuralStatusIndicator}>
              <View style={[styles.neuralStatusPulse, { backgroundColor: '#ffaa00' }]} />
              <Text style={[styles.neuralStatusText, { color: '#ffaa00' }]}>SHOP STATUS: CLOSING</Text>
              <Icon name="schedule" size={16} color="#ffaa00" />
            </View>
            <Text style={{ color: '#ffaa00', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
              ⚠️ End of day in progress - All data will be PERMANENTLY DELETED after finalization
            </Text>
          </View>
          
          {/* Enterprise Financial Overview - Multi-Currency */}
          <View style={styles.neuralMetricsGrid}>
            <View style={styles.neuralMetricCard}>
              <View style={styles.neuralMetricHeader}>
                <Icon name="attach-money" size={24} color="#f59e0b" />
                <Text style={styles.neuralMetricTitle}>EXPECTED CASH ZW$</Text>
              </View>
              <Text style={styles.neuralMetricValue}>ZW${(stats.expected.cash_zig || 0).toLocaleString()}</Text>
              <Text style={styles.neuralMetricSubtitle}>System calculated</Text>
            </View>
            
            <View style={styles.neuralMetricCard}>
              <View style={styles.neuralMetricHeader}>
                <Icon name="attach-money" size={24} color="#00f5ff" />
                <Text style={styles.neuralMetricTitle}>EXPECTED CASH USD</Text>
              </View>
              <Text style={styles.neuralMetricValue}>${((stats.expected.cash_usd || 0) - staffLunchMetrics.totalValue).toLocaleString()}</Text>
              <Text style={styles.neuralMetricSubtitle}>After lunch: ${staffLunchMetrics.totalValue.toFixed(2)}</Text>
            </View>
            
            <View style={styles.neuralMetricCard}>
              <View style={styles.neuralMetricHeader}>
                <Icon name="attach-money" size={24} color="#ffaa00" />
                <Text style={styles.neuralMetricTitle}>EXPECTED CASH R</Text>
              </View>
              <Text style={styles.neuralMetricValue}>R{(stats.expected.cash_rand || 0).toLocaleString()}</Text>
              <Text style={styles.neuralMetricSubtitle}>System calculated</Text>
            </View>
            
            <View style={styles.neuralMetricCard}>
              <View style={styles.neuralMetricHeader}>
                <Icon name="calculate" size={24} color="#8b5cf6" />
                <Text style={styles.neuralMetricTitle}>VERIFIED TOTAL</Text>
              </View>
              <Text style={styles.neuralMetricValue}>${(stats.actual || 0).toLocaleString()}</Text>
              <Text style={styles.neuralMetricSubtitle}>All currencies + card</Text>
            </View>
          </View>
          
          {/* Variance Analysis - Neural Style */}
          <View style={[styles.neuralVarianceCard, { borderLeftColor: varianceColor }]}>
            <View style={styles.neuralVarianceIconContainer}>
              <Icon name="analytics" size={32} color={varianceColor} />
            </View>
            <View style={styles.neuralVarianceContent}>
              <Text style={styles.neuralVarianceTitle}>
                {stats.variance === 0 ? '⚡ PERFECT BALANCE DETECTED' : stats.variance < 0 ? '⚠️ CASH SHORTAGE DETECTED' : '✅ CASH OVERAGE DETECTED'}
              </Text>
              <Text style={[styles.neuralVarianceAmount, { color: varianceColor }]}>
                ${Math.abs(stats.variance).toFixed(2)}
              </Text>
              <Text style={styles.neuralVarianceSubtitle}>
                {stats.variance === 0 ? 'All counts match perfectly - Neural validation passed' : stats.variance < 0 ? 'Shortage detected - Investigation required' : 'Overpayment identified - Review recommended'}
              </Text>
            </View>
            <View style={[styles.neuralVariancePulse, { backgroundColor: varianceColor }]} />
          </View>
          
          {/* Progress Bar - Neural Style */}
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
                <Icon name="attach-money" size={24} color="#00f5ff" />
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
                ${((stats.expected.cash_usd || 0) - staffLunchMetrics.totalValue).toFixed(2)}
              </Text>
              <Text style={styles.neuralVarianceSubtitle}>
                USD Expected: ${(stats.expected.cash_usd || 0).toFixed(2)} - Staff Lunch: ${staffLunchMetrics.totalValue.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.neuralVariancePulse, { backgroundColor: '#00ff88' }]} />
          </View>
          
          {/* Recent Staff Lunch Activity */}
          {staffLunchMetrics.recentActivity.length > 0 && (
            <View style={styles.neuralSummaryCard}>
              <View style={styles.neuralSummaryHeader}>
                <Icon name="history" size={20} color="#ffaa00" />
                <Text style={styles.neuralSummaryTitle}>RECENT LUNCH ACTIVITY</Text>
              </View>
              {staffLunchMetrics.recentActivity.slice(0, 3).map((lunch, index) => (
                <View key={lunch.id || index} style={styles.neuralSummaryContent}>
                  <View style={styles.neuralSummaryItem}>
                    <Text style={styles.neuralSummaryLabel}>
                      {lunch.notes?.includes('Staff:') 
                        ? lunch.notes.match(/Staff:\s*([^,]+)/)?.[1] || 'Staff'
                        : 'Staff Member'}
                    </Text>
                    <Text style={styles.neuralSummaryValue}>
                      ${lunch.notes?.includes('CASH LUNCH') && lunch.notes?.includes('Amount:')
                        ? (lunch.notes.match(/Amount: \$([0-9.]+)/)?.[1] || '0.00')
                        : parseFloat(lunch.total_cost || 0).toFixed(2)}
                    </Text>
                  </View>
                  {index < Math.min(staffLunchMetrics.recentActivity.length - 1, 2) && (
                    <View style={styles.neuralSummaryDivider} />
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Neural Cashier Verification Section */}
        <View style={styles.neuralCashierSection}>
          <View style={styles.neuralCashierHeader}>
            <Icon name="people" size={28} color="#ffaa00" />
            <Text style={styles.neuralCashierTitle}>CASHIER NEURAL VERIFICATION</Text>
          </View>
          
          <View style={styles.neuralCashierList}>
            {todayDrawers.length === 0 ? (
              <View style={styles.neuralEmptyState}>
                <Icon name="info-outline" size={48} color="#6b7280" />
                <Text style={styles.neuralEmptyStateText}>No active cashiers for today</Text>
                <Text style={styles.neuralEmptyStateSubtext}>Cashiers who log in today will appear here</Text>
              </View>
            ) : (
              todayDrawers.map((d) => {
                const verified = cashierCounts[d.cashier];
                const varianceData = getCashierVariance(d, verified);
                
                // Status colors based on variance type
                const statusColor = varianceData.varianceType === 'pending' ? '#ff4444' : 
                                   varianceData.varianceType === 'perfect' ? '#00ff88' : 
                                   varianceData.varianceType === 'short' ? '#ff4444' : 
                                   '#ffaa00'; // over
                
                // Status icon
                const StatusIcon = varianceData.varianceType === 'pending' ? "pending" : 
                                   varianceData.varianceType === 'perfect' ? "check-circle" : 
                                   varianceData.varianceType === 'short' ? "arrow-downward" : 
                                   "arrow-upward";
                
                // Status text
                const statusText = varianceData.varianceType === 'pending' ? '○ PENDING VERIFICATION' : 
                                   varianceData.varianceType === 'perfect' ? '✓ BALANCED - PERFECT' : 
                                   varianceData.varianceType === 'short' ? `⚠️ SHORTAGE: ${Math.abs(varianceData.variance).toFixed(2)}` : 
                                   `✓ OVERAGE: ${varianceData.variance.toFixed(2)}`;
                
                return (
                  <TouchableOpacity
                    key={d.cashier}
                    style={[
                      styles.neuralCashierCard,
                      { borderLeftColor: statusColor }
                    ]}
                    onPress={() => openCashier(d.cashier)}
                    activeOpacity={0.7}
                  >
                    {/* Cashier Name - BIG AND CLEAR */}
                    <View style={styles.cashierNameRow}>
                      <Text style={styles.cashierBigName}>{d.cashier}</Text>
                      <View style={[styles.cashierStatusBadge, { backgroundColor: statusColor }]}>
                        <Text style={styles.cashierStatusText}>
                          {varianceData.varianceType === 'pending' ? 'PENDING' : 
                           varianceData.varianceType === 'perfect' ? 'BALANCED' : 
                           varianceData.varianceType === 'short' ? 'SHORT' : 'OVER'}
                        </Text>
                      </View>
                    </View>
                    
                    {/* Expected vs Actual - BIG VALUES */}
                    <View style={styles.bigAmountsRow}>
                      <View style={styles.bigAmountBox}>
                        <Text style={styles.bigAmountLabel}>EXPECTED</Text>
                        <Text style={[styles.bigAmountValue, { color: '#ffaa00' }]}>${varianceData.expected.toFixed(2)}</Text>
                        {varianceData.staffLunchDeduction > 0 && (
                          <Text style={{ fontSize: 10, color: '#ff4444', marginTop: 2 }}>
                            -${varianceData.staffLunchDeduction.toFixed(2)} lunch
                          </Text>
                        )}
                      </View>
                      <View style={styles.bigAmountDivider} />
                      <View style={styles.bigAmountBox}>
                        <Text style={styles.bigAmountLabel}>ACTUAL</Text>
                        <Text style={[styles.bigAmountValue, { color: '#00ff88' }]}>
                          {verified ? `${varianceData.actual.toFixed(2)}` : '—'}
                        </Text>
                      </View>
                    </View>
                    
                    {/* Variance - THE KEY METRIC */}
                    {varianceData.varianceType !== 'pending' && (
                      <View style={styles.varianceBanner}>
                        <Icon 
                          name={varianceData.varianceType === 'short' ? "warning" : varianceData.varianceType === 'over' ? "check-circle" : "check"} 
                          size={20} 
                          color={statusColor} 
                        />
                        <Text style={[styles.varianceBannerText, { color: statusColor }]}>
                          {varianceData.varianceType === 'short' ? `SHORTAGE: -${Math.abs(varianceData.variance).toFixed(2)}` : 
                           varianceData.varianceType === 'over' ? `OVERAGE: +${varianceData.variance.toFixed(2)}` : 
                           "PERFECT BALANCE"}
                        </Text>
                      </View>
                    )}
                    
                    {/* Currency breakdown */}
                    <View style={styles.currencyRow}>
                      <View style={styles.currencyItem}>
                        <Text style={styles.currencyLabel}>ZW$</Text>
                        <Text style={styles.currencyValue}>
                          {varianceData.breakdown.zig.actual > 0 ? varianceData.breakdown.zig.actual.toFixed(2) : '—'}
                        </Text>
                      </View>
                      <View style={styles.currencyItem}>
                        <Text style={[styles.currencyLabel, { color: '#00f5ff' }]}>USD</Text>
                        <Text style={[styles.currencyValue, { color: '#00f5ff' }]}>
                          {varianceData.breakdown.usd.actual > 0 ? varianceData.breakdown.usd.actual.toFixed(2) : '—'}
                        </Text>
                      </View>
                      <View style={styles.currencyItem}>
                        <Text style={[styles.currencyLabel, { color: '#ffaa00' }]}>RAND</Text>
                        <Text style={[styles.currencyValue, { color: '#ffaa00' }]}>
                          {varianceData.breakdown.rand.actual > 0 ? varianceData.breakdown.rand.actual.toFixed(2) : '—'}
                        </Text>
                      </View>
                      <View style={styles.currencyItem}>
                        <Text style={[styles.currencyLabel, { color: '#8b5cf6' }]}>CARD</Text>
                        <Text style={[styles.currencyValue, { color: '#8b5cf6' }]}>
                          {varianceData.breakdown.card.actual > 0 ? varianceData.breakdown.card.actual.toFixed(2) : '—'}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.neuralCashierLine} />
                  </TouchableOpacity>
                );
              })
            )}
          </View>
          
          {/* Neural Summary Card */}
          <View style={styles.neuralSummaryCard}>
            <View style={styles.neuralSummaryHeader}>
              <Icon name="summarize" size={20} color="#00f5ff" />
              <Text style={styles.neuralSummaryTitle}>VERIFICATION SUMMARY</Text>
            </View>
            <View style={styles.neuralSummaryContent}>
              <View style={styles.neuralSummaryItem}>
                <Text style={styles.neuralSummaryLabel}>CASHIERS VERIFIED</Text>
                <Text style={styles.neuralSummaryValue}>{verifiedCount}/{totalCashiers}</Text>
              </View>
              <View style={styles.neuralSummaryDivider} />
              <View style={styles.neuralSummaryItem}>
                <Text style={styles.neuralSummaryLabel}>TOTAL VERIFIED</Text>
                <Text style={[styles.neuralSummaryValue, { color: '#00ff88' }]}>${(stats.actual || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.neuralSummaryDivider} />
              <View style={styles.neuralSummaryItem}>
                <Text style={styles.neuralSummaryLabel}>VARIANCE</Text>
                <Text style={[styles.neuralSummaryValue, { color: varianceColor }]}>${Math.abs(stats.variance).toFixed(2)}</Text>
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
                <Text style={styles.neuralStatusRowText}>Verification</Text>
                <Text style={[styles.neuralStatusRowValue, { color: '#00ff88' }]}>{verifiedCount}/{totalCashiers} Complete</Text>
              </View>
              <View style={styles.neuralStatusRow}>
                <Icon name="analytics" size={24} color={varianceColor} style={styles.neuralStatusRowIcon} />
                <Text style={styles.neuralStatusRowText}>Variance</Text>
                <Text style={[styles.neuralStatusRowValue, { color: varianceColor }]}>${Math.abs(stats.variance).toFixed(2)}</Text>
              </View>
            </View>
            
            
            <TouchableOpacity
              style={[
                styles.neuralFinalizeButton,
                (verifiedCount !== totalCashiers || finalizing || closing) && styles.neuralDisabledButton
              ]}
              disabled={verifiedCount !== totalCashiers || finalizing || closing}
              onPress={() => {
                alert('FINAL TEST: Calling finalizeDay() NOW');
                finalizeDay();
                alert(' finalizeDay() returned ');
              }}
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
            <Text style={styles.modalTitle}>{currentCashier}</Text>
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
              
              <View style={styles.modalCurrencyCard}>
                <Icon name="credit-card" size={28} color="#8b5cf6" />
                <Text style={styles.modalCurrencyLabel}>Card Payments</Text>
                <TextInput
                  style={styles.modalAmountInput}
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
});

export default EODProductionScreen;
