import React, { useState, useEffect } from 'react';
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
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { shopAPI } from '../services/api';
import { shopStorage } from '../services/storage';
import { ROUTES } from '../constants/navigation';

const StartOfDayScreen = ({ navigation, route }) => {
  const { onStatusChange } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [shopStatus, setShopStatus] = useState(null);
  const [activeShifts, setActiveShifts] = useState([]);
  const [showStartModal, setShowStartModal] = useState(false);
  const [openingNotes, setOpeningNotes] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');

  const [drawerLoading, setDrawerLoading] = useState(false);
  const [lastUpdatedDrawer, setLastUpdatedDrawer] = useState(null);

  // Cash Float Management State - Multi-currency
  const [cashiers, setCashiers] = useState([]);
  const [drawerStatus, setDrawerStatus] = useState(null);
  const [showFloatModal, setShowFloatModal] = useState(false);
  const [selectedCashier, setSelectedCashier] = useState(null);
  
  // Multi-currency float amounts
  const [floatAmountUSD, setFloatAmountUSD] = useState('');
  const [floatAmountZIG, setFloatAmountZIG] = useState('');
  const [floatAmountRAND, setFloatAmountRAND] = useState('');
  const [loadingFloat, setLoadingFloat] = useState(false);

  useEffect(() => {
    fetchShopStatus();
    fetchCashiers();
    fetchDrawerStatus();

    // Add web-specific scrolling CSS
    let styleElement;
    if (Platform.OS === 'web') {
      styleElement = document.createElement('style');
      styleElement.textContent = `
        .start-of-day-scroll {
          overflow-y: auto !important;
          overflow-x: hidden !important;
          height: 100vh !important;
        }
      `;
      document.head.appendChild(styleElement);
    }

    // Poll drawer/shop status every 5 seconds (for near-real-time updates)
    const pollInterval = setInterval(() => {
      fetchDrawerStatus();
      fetchShopStatus();
    }, 5000);

    return () => {
      clearInterval(pollInterval);
      if (styleElement) document.head.removeChild(styleElement);
    };
  }, []);

  const fetchShopStatus = async () => {
    try {
      setLoading(true);
      const response = await shopAPI.getAnonymousEndpoint('/shop-status/');
      const data = response.data;
      
      setShopStatus(data.shop_day);
      setActiveShifts(data.active_shifts || []);
      
    } catch (error) {
      console.error('❌ Error fetching shop status:', error);
      Alert.alert(
        'Error', 
        'Failed to load shop status. Please try again.',
        [{ text: 'Retry', onPress: () => fetchShopStatus() }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchShopStatus();
    fetchCashiers();
    fetchDrawerStatus();
  };

  // Simplified Cash Float Management Functions
  const fetchCashiers = async () => {
    try {
      // Retrieve stored shop credentials and POST to approved-staff endpoint
      const credentials = await shopStorage.getCredentials();
      // Call approved-staff endpoint even if owner credentials are missing.
      // Backend will decide how to handle empty credentials; frontend will send empty strings when absent.
      const ownerEmail = credentials?.email || '';
      const ownerPassword = credentials?.shop_owner_master_password || credentials?.master_password || '';

      const response = await shopAPI.getApprovedStaff({
        email: ownerEmail,
        password: ownerPassword
      });

      if (response && response.data) {
        setCashiers(response.data.staff || response.data.cashiers || []);
      }
    } catch (error) {
      // Show more details for debugging (400 responses will include server body)
      console.error('❌ Error fetching cashiers:', error, error.response?.data);
      // Silently fail - this is not critical for basic functionality
    }
  };

  const fetchDrawerStatus = async () => {
    try {
      setDrawerLoading(true);
      const response = await shopAPI.getCashFloat();

      if (response && response.data) {
        const payload = response.data.shop_status || response.data.drawer || response.data;
        // If shopStatus indicates the shop is closed, show zeroed drawer status instead
        const isClosed = (shopStatus && (shopStatus.status === 'CLOSED' || shopStatus.is_open === false));
        if (isClosed) {
          const zeroed = {
            shop: shopStatus?.shop || '',
            date: new Date().toISOString().slice(0,10),
            total_drawers: 0,
            active_drawers: 0,
            inactive_drawers: 0,
            settled_drawers: 0,
            cash_flow: {
              total_expected_cash: 0,
              total_current_cash: 0,
              variance: 0
            },
            drawers: []
          };
          setDrawerStatus(zeroed);
        } else {
          setDrawerStatus(payload);
        }
        setLastUpdatedDrawer(new Date());
      } else {
        console.warn('⚠️ fetchDrawerStatus: no data in response', response);
      }
    } catch (error) {
      console.error('❌ Error fetching drawer status:', error, error.response?.data);
      Alert.alert('Error', error.response?.data?.error || 'Failed to fetch drawer status.');
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleSetFloat = async () => {
    // Check that at least one currency has a value
    const usdValue = parseFloat(floatAmountUSD) || 0;
    const zigValue = parseFloat(floatAmountZIG) || 0;
    const randValue = parseFloat(floatAmountRAND) || 0;
    
    if (usdValue < 0 || zigValue < 0 || randValue < 0) {
      Alert.alert('Error', 'Float amounts cannot be negative');
      return;
    }
    
    if (usdValue === 0 && zigValue === 0 && randValue === 0) {
      Alert.alert('Error', 'Please enter at least one float amount');
      return;
    }

    try {
      setLoadingFloat(true);
      
      // Resolve cashier id: prefer explicit param, then selectedCashier.cashier_id, then try to match name to known cashiers
      let idToUse = selectedCashier?.cashier_id || null;
      if (!idToUse && selectedCashier?.cashier) {
        const match = cashiers.find(c => (c.name === selectedCashier.cashier) || (c.username === selectedCashier.cashier) || (c.cashier_name === selectedCashier.cashier) || (String(c.id) === String(selectedCashier.cashier)));
        if (match) idToUse = match.id;
      }

      if (!idToUse) {
        Alert.alert('Error', 'Unable to determine cashier id for this drawer. Please select a cashier from the active list first.');
        setLoadingFloat(false);
        return;
      }

      const payload = { 
        cashier_id: idToUse, 
        float_amount_usd: usdValue,
        float_amount_zig: zigValue,
        float_amount_rand: randValue
      };
      
      try {
        await shopAPI.setCashFloat(payload);
      } catch (err) {
        // Surface server validation message if available
        const serverMsg = err.response?.data?.error || err.response?.data?.message || err.response?.data || err.message;
        console.error('❌ Error setting float (server):', err.response?.data || err.message);
        Alert.alert('Error setting float', String(serverMsg));
        throw err;
      }

      const currencyDetails = [];
      if (usdValue > 0) currencyDetails.push(`${usdValue.toFixed(2)} USD`);
      if (zigValue > 0) currencyDetails.push(`${zigValue.toFixed(2)} ZIG`);
      if (randValue > 0) currencyDetails.push(`R${randValue.toFixed(2)} RAND`);
      
      Alert.alert('Success', `Float set successfully: ${currencyDetails.join(', ')}`);
      setShowFloatModal(false);
      setSelectedCashier(null);
      setFloatAmountUSD('');
      setFloatAmountZIG('');
      setFloatAmountRAND('');
      fetchDrawerStatus();
    } catch (error) {
      console.error('❌ Error setting float:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to set float amount'
      );
    } finally {
      setLoadingFloat(false);
    }
  };

  const openFloatModal = (cashier) => {
    // Normalize incoming object (drawer entry, shift entry, or cashier object)
    const payload = {
      cashier_id: cashier?.cashier_id || cashier?.id || cashier?.cashier_id || null,
      cashier: cashier?.cashier || cashier?.cashier_name || cashier?.name || 'Unknown',
      float_amount: cashier?.float_amount ?? cashier?.current_float ?? cashier?.opening_balance ?? 0,
      float_amount_zig: cashier?.float_amount_zig ?? 0,
      float_amount_rand: cashier?.float_amount_rand ?? 0,
    };
    // If we don't have an id but we have a cashier name, try to match against loaded cashiers
    if (!payload.cashier_id && payload.cashier && cashiers && cashiers.length > 0) {
      const match = cashiers.find(c => (c.name === payload.cashier) || (c.username === payload.cashier) || (c.cashier_name === payload.cashier) || (String(c.id) === String(payload.cashier)));
      if (match) payload.cashier_id = match.id;
    }

    setSelectedCashier(payload);
    setFloatAmountUSD(payload.float_amount?.toString() || '');
    setFloatAmountZIG(payload.float_amount_zig?.toString() || '');
    setFloatAmountRAND(payload.float_amount_rand?.toString() || '');
    setShowFloatModal(true);
  };

  const handleStartDay = async () => {
    if (loading) return; // prevent duplicate submissions

    if (!openingNotes.trim()) {
      Alert.alert('Error', 'Please enter opening notes');
      return;
    }
    try {
      console.log('➡️ handleStartDay: sending start-day with notes:', openingNotes);
      setLoading(true);
      // Inform user
      Alert.alert('Starting shop', 'Please wait...');
      // Start the shop (owner) using API helper
      const startResp = await shopAPI.startDay({ action: 'start_day', notes: openingNotes.trim() });
      console.log('✅ start-day response:', startResp?.data);

      // After successful start, fetch current approved staff to reset floats to zero
      let approvedCashiers = [];
      try {
        const credentials = await shopStorage.getCredentials();
        if (credentials) {
          const resp = await shopAPI.getApprovedStaff({ email: credentials.email, password: credentials.shop_owner_master_password || credentials.master_password || '' });
          approvedCashiers = resp?.data?.staff || resp?.data?.cashiers || [];
        }
      } catch (innerErr) {
        console.warn('⚠️ Could not fetch approved staff for float reset:', innerErr?.response?.data || innerErr?.message || innerErr);
      }

      // Reset floats to zero for all approved cashiers (owner action)
      if (approvedCashiers.length > 0) {
        try {
          const resetPromises = approvedCashiers.map((c) => {
            const id = c.id || c.cashier_id || c.pk || null;
            if (!id) return Promise.resolve(null);
            return shopAPI.setCashFloat({ cashier_id: id, float_amount: 0 });
          });
          await Promise.all(resetPromises);
        } catch (resetErr) {
          console.warn('⚠️ Error resetting floats for some cashiers:', resetErr?.response?.data || resetErr?.message || resetErr);
        }
      }

      Alert.alert(
        'Success!',
        'Shop opened successfully. All cashier floats have been reset to 0.',
        [{ text: 'OK', onPress: () => {
          setShowStartModal(false);
          setOpeningNotes('');
          fetchShopStatus();
          fetchCashiers();
          fetchDrawerStatus();
          if (onStatusChange) onStatusChange();
        }}]
      );

    } catch (error) {
      console.error('❌ Error starting day:', error, error.response?.data);
      const statusCode = error.response?.status;
      const serverMsg = error.response?.data?.error || error.response?.data?.message || error.message || '';

      // If shop was already opened by a concurrent request, refresh status instead of error
      if (statusCode === 400 && String(serverMsg).includes('Shop can only be opened when closed')) {
        console.warn('⚠️ start-day: shop already open — refreshing status');
        await fetchShopStatus();
        Alert.alert('Info', 'Shop is already open. Status refreshed.');
        setShowStartModal(false);
        return;
      }

      const msg = serverMsg || 'Failed to open shop. Please try again.';
      Alert.alert('Error', String(msg));
    } finally {
      setLoading(false);
    }
  };

  const quickStartDay = async () => {
    // Quick-start: set a default note and call handleStartDay
    setOpeningNotes('Quick start by owner');
    // Allow the state to update then call start handler
    setTimeout(() => handleStartDay(), 50);
  };



  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN': return '#10b981';
      case 'CLOSED': return '#ef4444';
      case 'CLOSING': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'OPEN': return 'play-circle-filled';
      case 'CLOSED': return 'stop-circle';
      case 'CLOSING': return 'pause-circle';
      default: return 'help';
    }
  };

  if (loading && !shopStatus) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading shop status...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, Platform.OS === 'web' && styles.webScrollView]}
      contentContainerStyle={Platform.OS === 'web' ? styles.webContentContainer : styles.scrollContentContainer}
      showsVerticalScrollIndicator={Platform.OS === 'web'}
      showsHorizontalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header with Back Button */}
      <View style={styles.headerWithBack}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#fff" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Icon name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      
      {/* Ultimate Start Day Command Center Header */}
      <View style={styles.ultimateHeader}>
        {/* Header Background Overlay */}
        <View style={styles.headerBackgroundOverlay} />
        
        {/* Command Center Badge */}
        <View style={styles.commandCenterBadge}>
          <Icon name="military-tech" size={20} color="#fbbf24" />
          <Text style={styles.commandCenterBadgeText}>COMMAND CENTER</Text>
        </View>
        
        {/* Main Title */}
        <Text style={styles.ultimateHeaderTitle}>🚀 Daily Operations Command Center</Text>
        
        {/* Subtitle with Enhanced Styling */}
        <View style={styles.ultimateHeaderSubtitleContainer}>
          <Icon name="schedule" size={16} color="#8b5cf6" />
          <Text style={styles.ultimateHeaderSubtitle}>Start of Day Management System</Text>
          <Icon name="auto-awesome" size={16} color="#10b981" />
        </View>
        
        {/* Premium Status Metrics */}
        <View style={styles.ultimateGrowthMetrics}>
          <View style={styles.growthMetricCard}>
            <View style={styles.growthMetricIconContainer}>
              <Icon name="store" size={16} color={getStatusColor(shopStatus?.status)} />
            </View>
            <View style={styles.growthMetricContent}>
              <Text style={styles.growthMetricLabel}>Shop Status</Text>
              <Text style={[styles.growthMetricValue, { color: getStatusColor(shopStatus?.status) }]}>
                {shopStatus?.status === 'OPEN' ? 'OPERATIONAL' : 'CLOSED'}
              </Text>
            </View>
            <View style={styles.growthTrendIndicator}>
              <Icon name={getStatusIcon(shopStatus?.status)} size={14} color={getStatusColor(shopStatus?.status)} />
            </View>
          </View>
          
          <View style={styles.growthMetricCard}>
            <View style={styles.growthMetricIconContainer}>
              <Icon name="people" size={16} color="#3b82f6" />
            </View>
            <View style={styles.growthMetricContent}>
              <Text style={styles.growthMetricLabel}>Active Cashiers</Text>
              <Text style={styles.growthMetricValue}>
                {drawerStatus?.active_drawers ?? (drawerStatus?.drawers?.filter(d => d.status === 'ACTIVE').length ?? 0)}
              </Text>
            </View>
            <View style={styles.growthTrendIndicator}>
              <Icon name="trending-up" size={14} color="#10b981" />
            </View>
          </View>
        </View>
        
        {/* Real-time Status Indicator */}
        <View style={styles.realtimeStatus}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(shopStatus?.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(shopStatus?.status) }]}>
            {shopStatus?.status === 'OPEN' ? 'Business Active' : 'Ready to Start'}
          </Text>
          <Icon name="schedule" size={14} color={getStatusColor(shopStatus?.status)} />
        </View>
        
        {/* Performance Summary */}
        <View style={styles.performanceSummary}>
          <Text style={styles.performanceSummaryText}>
            🏆 Daily Operations • {drawerStatus?.active_drawers ?? (drawerStatus?.drawers?.filter(d => d.status === 'ACTIVE').length ?? 0)} Active Shifts •
            {shopStatus?.date ? new Date(shopStatus.date).toLocaleDateString() : new Date().toLocaleDateString()}
          </Text>
        </View>
      </View>

      {/* Enterprise Start of Day Actions */}
      <View style={styles.section}>
        <View style={styles.actionSectionHeader}>
          <Text style={styles.sectionTitle}>⚡ Enterprise Start of Day Actions</Text>
          <View style={styles.actionStatusBadge}>
            <Icon name="psychology" size={16} color="#8b5cf6" />
            <Text style={styles.actionStatusText}>Operations Command</Text>
          </View>
        </View>
        <Text style={styles.sectionSubtitle}>Professional daily operations management system. Use EOD Reconciliation for proper shop closure.</Text>
        <View style={styles.actionGrid}>
          {shopStatus?.status === 'CLOSED' ? (
            <TouchableOpacity 
              style={styles.ultimateActionButton}
              onPress={() => setShowStartModal(true)}
            >
              <View style={styles.actionIconContainer}>
                <Icon name="play-circle-filled" size={32} color="#10b981" />
              </View>
              <Text style={styles.ultimateActionButtonText}>Start Day</Text>
              <Text style={styles.ultimateActionButtonSubtext}>Open shop for business operations</Text>
              <View style={styles.actionBadge}>
                <Text style={styles.actionBadgeText}>READY</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.ultimateActionButton, styles.inactiveActionButton]}
              disabled={true}
            >
              <View style={styles.actionIconContainer}>
                <Icon name="stop-circle" size={32} color="#9ca3af" />
              </View>
              <Text style={[styles.ultimateActionButtonText, { color: '#9ca3af' }]}>End Day</Text>
              <Text style={[styles.ultimateActionButtonSubtext, { color: '#9ca3af' }]}>Use EOD Reconciliation</Text>
              <View style={[styles.actionBadge, { backgroundColor: '#9ca3af' }]}>
                <Text style={styles.actionBadgeText}>CLOSED</Text>
              </View>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.ultimateActionButton}
            onPress={() => navigation.navigate('EODReconciliation')}
          >
            <View style={styles.actionIconContainer}>
              <Icon name="assessment" size={32} color="#3b82f6" />
            </View>
            <Text style={styles.ultimateActionButtonText}>EOD Reconciliation</Text>
            <Text style={styles.ultimateActionButtonSubtext}>End of day financial reports</Text>
            <View style={[styles.actionBadge, { backgroundColor: '#3b82f6' }]}>
              <Text style={styles.actionBadgeText}>REPORTS</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.ultimateActionButton}
            onPress={async () => {
              await fetchDrawerStatus();
              Alert.alert('Info', 'Drawer status updated. Check console for data.');
            }}
          >
            <View style={styles.actionIconContainer}>
              <Icon name="account-balance-wallet" size={32} color="#8b5cf6" />
            </View>
            <Text style={styles.ultimateActionButtonText}>Cash Drawer Status</Text>
            <Text style={styles.ultimateActionButtonSubtext}>View all drawer amounts & status</Text>
            <View style={[styles.actionBadge, { backgroundColor: '#8b5cf6' }]}>
              <Text style={styles.actionBadgeText}>STATUS</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.ultimateActionButton}
            onPress={() => navigation.navigate('OwnerDashboard')}
          >
            <View style={styles.actionIconContainer}>
              <Icon name="dashboard" size={32} color="#f59e0b" />
            </View>
            <Text style={styles.ultimateActionButtonText}>Dashboard Overview</Text>
            <Text style={styles.ultimateActionButtonSubtext}>Complete business analytics</Text>
            <View style={[styles.actionBadge, { backgroundColor: '#f59e0b' }]}>
              <Text style={styles.actionBadgeText}>ANALYTICS</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Enterprise Cash Drawer Management */}
      {shopStatus?.status === 'OPEN' && drawerStatus && (
        <View style={styles.section}>
          <View style={styles.cashDrawerSectionHeader}>
            <Text style={styles.sectionTitle}>💰 Enterprise Cash Drawer Management</Text>
            <View style={styles.cashDrawerStatusBadge}>
              <Icon name="account-balance-wallet" size={16} color="#10b981" />
              <Text style={styles.cashDrawerStatusText}>Financial Control</Text>
            </View>
          </View>
          
          <View style={styles.ultimateCashFlowCard}>
            <View style={styles.cashFlowHeader}>
              <Icon name="trending-up" size={20} color="#10b981" />
              <Text style={styles.cashFlowTitle}>Drawer Operations Status</Text>
              <View style={styles.cashFlowStatusIndicator}>
                <Icon name="wifi" size={12} color="#10b981" />
                <Text style={styles.cashFlowStatusText}>Live</Text>
              </View>
            </View>
            
            <Text style={styles.cashFlowValue}>
              {drawerStatus.drawers ? `${drawerStatus.drawers.length} Active Drawers` :
               drawerStatus.active_drawers ? `${drawerStatus.active_drawers} Active Drawers` :
               drawerStatus.total_drawers ? `${drawerStatus.total_drawers} Total Drawers` :
               'No Active Drawers'}
            </Text>

            {/* Enhanced drawer summary */}
            <View style={styles.cashFlowMetricsGrid}>
              <View style={styles.cashFlowMetricCard}>
                <Text style={styles.cashFlowMetricLabel}>Total Drawers</Text>
                <Text style={styles.cashFlowMetricValue}>{drawerStatus.total_drawers ?? (drawerStatus.drawers ? drawerStatus.drawers.length : '0')}</Text>
              </View>
              <View style={styles.cashFlowMetricCard}>
                <Text style={styles.cashFlowMetricLabel}>Active</Text>
                <Text style={[styles.cashFlowMetricValue, { color: '#10b981' }]}>{drawerStatus.active_drawers ?? 0}</Text>
              </View>
              <View style={styles.cashFlowMetricCard}>
                <Text style={styles.cashFlowMetricLabel}>Settled</Text>
                <Text style={[styles.cashFlowMetricValue, { color: '#3b82f6' }]}>{drawerStatus.settled_drawers ?? 0}</Text>
              </View>
            </View>

            <View style={styles.cashFlowFinancialGrid}>
              <View style={styles.cashFlowFinancialCard}>
                <Text style={styles.cashFlowFinancialLabel}>Expected Cash</Text>
                <Text style={styles.cashFlowFinancialValue}>
                  ${(drawerStatus.cash_flow?.expected_usd ?? drawerStatus.cash_flow?.total_expected_cash ?? 0).toFixed(2)} USD
                  {(drawerStatus.cash_flow?.expected_zig ?? 0) > 0 ? `\n${(drawerStatus.cash_flow?.expected_zig ?? 0).toFixed(2)} ZIG` : ''}
                  {(drawerStatus.cash_flow?.expected_rand ?? 0) > 0 ? `\nR${(drawerStatus.cash_flow?.expected_rand ?? 0).toFixed(2)} RAND` : ''}
                </Text>
              </View>
              <View style={styles.cashFlowFinancialCard}>
                <Text style={styles.cashFlowFinancialLabel}>Current Cash</Text>
                <Text style={styles.cashFlowFinancialValue}>
                  ${(drawerStatus.cash_flow?.current_usd ?? drawerStatus.cash_flow?.total_current_cash ?? 0).toFixed(2)} USD
                  {(drawerStatus.cash_flow?.current_zig ?? 0) > 0 ? `\n${(drawerStatus.cash_flow?.current_zig ?? 0).toFixed(2)} ZIG` : ''}
                  {(drawerStatus.cash_flow?.current_rand ?? 0) > 0 ? `\nR${(drawerStatus.cash_flow?.current_rand ?? 0).toFixed(2)} RAND` : ''}
                </Text>
              </View>
              <View style={styles.cashFlowFinancialCard}>
                <Text style={styles.cashFlowFinancialLabel}>Variance</Text>
                <Text style={[styles.cashFlowFinancialValue, { color: (drawerStatus.cash_flow?.usd_variance ?? 0) === 0 ? '#10b981' : '#ef4444' }]}>
                  ${(drawerStatus.cash_flow?.usd_variance ?? drawerStatus.cash_flow?.variance ?? 0).toFixed(2)} USD
                  {(drawerStatus.cash_flow?.zig_variance ?? 0) > 0 ? `\n${(drawerStatus.cash_flow?.zig_variance ?? 0).toFixed(2)} ZIG` : ''}
                  {(drawerStatus.cash_flow?.rand_variance ?? 0) > 0 ? `\nR${(drawerStatus.cash_flow?.rand_variance ?? 0).toFixed(2)} RAND` : ''}
                </Text>
              </View>
            </View>

            {drawerStatus.drawers && drawerStatus.drawers.length > 0 && (
              <View style={styles.drawerDetailsSection}>
                <Text style={styles.drawerDetailsTitle}>🔍 Individual Drawer Analysis</Text>
                {drawerStatus.drawers.map((d, i) => (
                  <View key={`${d.cashier || 'drawer'}-${i}`} style={styles.ultimateDrawerCard}>
                    <View style={styles.ultimateDrawerHeader}>
                      <View style={styles.drawerRankContainer}>
                        <Text style={styles.drawerRank}>#{i + 1}</Text>
                        <View style={styles.drawerBadge}>
                          <Icon name="person" size={12} color="#ffffff" />
                        </View>
                      </View>
                      <View style={styles.drawerPerformanceIndicator}>
                        <Icon name="trending-up" size={14} color="#10b981" />
                      </View>
                    </View>
                    
                    <Text style={styles.ultimateDrawerTitle}>{d.cashier || 'Unknown Cashier'}</Text>
                    
                    <View style={styles.ultimateDrawerMetrics}>
                      {/* Multi-Currency Float Display */}
                      <View style={styles.drawerMetricRow}>
                        <View style={styles.drawerMetricIconContainer}>
                          <Icon name="attach-money" size={14} color="#10b981" />
                        </View>
                        <View style={styles.drawerMetricContent}>
                          <Text style={styles.drawerMetricLabel}>Float (USD/ZIG/RAND)</Text>
                          <Text style={[styles.drawerMetricValue, { color: '#10b981' }]}>
                            ${(d.float_amount ?? 0).toFixed(2)} / {(d.float_amount_zig ?? 0).toFixed(2)} / R{(d.float_amount_rand ?? 0).toFixed(2)}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.drawerMetricRow}>
                        <View style={styles.drawerMetricIconContainer}>
                          <Icon name="account-balance-wallet" size={14} color="#3b82f6" />
                        </View>
                        <View style={styles.drawerMetricContent}>
                          <Text style={styles.drawerMetricLabel}>Current Total</Text>
                          <Text style={styles.drawerMetricValue}>
                            ${(d.current_breakdown?.usd ?? d.current_cash_usd ?? 0).toFixed(2)} USD
                            {(d.current_breakdown?.zig ?? d.current_cash_zig ?? 0) > 0 ? `\n${(d.current_breakdown?.zig ?? d.current_cash_zig ?? 0).toFixed(2)} ZIG` : ''}
                            {(d.current_breakdown?.rand ?? d.current_cash_rand ?? 0) > 0 ? `\nR${(d.current_breakdown?.rand ?? d.current_cash_rand ?? 0).toFixed(2)} RAND` : ''}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.drawerMetricRow}>
                        <View style={styles.drawerMetricIconContainer}>
                          <Icon name="shopping-cart" size={14} color="#8b5cf6" />
                        </View>
                        <View style={styles.drawerMetricContent}>
                          <Text style={styles.drawerMetricLabel}>Session Sales</Text>
                          <Text style={styles.drawerMetricValue}>
                            ${(d.session_sales_by_currency?.usd?.total ?? d.session_sales_usd ?? 0).toFixed(2)} USD
                            {(d.session_sales_by_currency?.zig?.total ?? d.session_sales_zig ?? 0) > 0 ? `\n${(d.session_sales_by_currency?.zig?.total ?? d.session_sales_zig ?? 0).toFixed(2)} ZIG` : ''}
                            {(d.session_sales_by_currency?.rand?.total ?? d.session_sales_rand ?? 0) > 0 ? `\nR${(d.session_sales_by_currency?.rand?.total ?? d.session_sales_rand ?? 0).toFixed(2)} RAND` : ''}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.drawerMetricRow}>
                        <View style={styles.drawerMetricIconContainer}>
                          <Icon name="schedule" size={14} color="#f59e0b" />
                        </View>
                        <View style={styles.drawerMetricContent}>
                          <Text style={styles.drawerMetricLabel}>EOD Expected</Text>
                          <Text style={styles.drawerMetricValue}>
                            ${(d.float_amount ?? 0).toFixed(2)} (float) + ${(d.session_sales_by_currency?.usd?.cash ?? d.session_cash_sales_usd ?? 0).toFixed(2)} (sales)
                            {(d.float_amount_zig ?? 0) > 0 || (d.session_sales_by_currency?.zig?.cash ?? d.session_cash_sales_zig ?? 0) > 0 ? `\n${(d.float_amount_zig ?? 0).toFixed(2)} (float) + ${(d.session_sales_by_currency?.zig?.cash ?? d.session_cash_sales_zig ?? 0).toFixed(2)} ZIG` : ''}
                            {(d.float_amount_rand ?? 0) > 0 || (d.session_sales_by_currency?.rand?.cash ?? d.session_cash_sales_rand ?? 0) > 0 ? `\nR${(d.float_amount_rand ?? 0).toFixed(2)} (float) + R${(d.session_sales_by_currency?.rand?.cash ?? d.session_cash_sales_rand ?? 0).toFixed(2)} RAND` : ''}
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    {d.last_activity && (
                      <>
                        <Text style={styles.drawerActivityText}>Last activity: {new Date(d.last_activity).toLocaleString()}</Text>
                        <TouchableOpacity style={styles.ultimateSetFloatButton} onPress={() => openFloatModal(d)}>
                          <Icon name="tune" size={14} color="#ffffff" />
                          <Text style={styles.ultimateSetFloatButtonText}>Set Float</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      )}

      {/* Enterprise Active Shifts Management */}
      {shopStatus?.status === 'OPEN' && activeShifts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.shiftsSectionHeader}>
            <Text style={styles.sectionTitle}>👥 Enterprise Active Cashiers</Text>
            <View style={styles.shiftsStatusBadge}>
              <Icon name="people" size={16} color="#10b981" />
              <Text style={styles.shiftsStatusText}>Team Management</Text>
            </View>
          </View>
          <View style={styles.ultimateShiftsList}>
            {activeShifts.map((shift, index) => (
              <View key={shift.shift_id} style={styles.ultimateShiftItem}>
                <View style={styles.ultimateShiftHeader}>
                  <View style={styles.shiftRankContainer}>
                    <View style={[styles.eliteRankBadge, { backgroundColor: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#6b7280' }]}>
                      <Text style={styles.eliteRankText}>#{index + 1}</Text>
                    </View>
                    <View style={styles.shiftBadge}>
                      <Icon name="person" size={12} color="#ffffff" />
                    </View>
                  </View>
                  <View style={styles.shiftPerformanceCrown}>
                    <Icon name="emoji-events" size={14} color="#10b981" />
                  </View>
                </View>
                
                <View style={styles.ultimateShiftInfo}>
                  <Text style={styles.ultimateShiftCashierName}>{shift.cashier_name}</Text>
                  <View style={styles.shiftTimeContainer}>
                    <Icon name="schedule" size={12} color="#3b82f6" />
                    <Text style={styles.ultimateShiftTime}>
                      Started: {new Date(shift.start_time).toLocaleTimeString()}
                    </Text>
                  </View>
                  <View style={styles.shiftBalanceContainer}>
                    <Icon name="attach-money" size={12} color="#10b981" />
                    <Text style={styles.ultimateShiftBalance}>
                      Opening Balance: ${shift.opening_balance?.toFixed(2) || '0.00'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.ultimateShiftStatus}>
                  <View style={styles.shiftStatusBadge}>
                    <Icon name="check-circle" size={16} color="#10b981" />
                    <Text style={styles.ultimateShiftStatusText}>Active</Text>
                  </View>
                  <TouchableOpacity style={styles.ultimateSetFloatButtonSmall} onPress={() => openFloatModal({ cashier_id: shift.cashier_id, cashier: shift.cashier_name, opening_balance: shift.opening_balance })}>
                    <Icon name="tune" size={12} color="#ffffff" />
                    <Text style={styles.ultimateSetFloatButtonTextSmall}>Set Float</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Enterprise Daily Summary */}
      {shopStatus?.status === 'OPEN' ? (
        <View style={styles.section}>
          <View style={styles.summarySectionHeader}>
            <Text style={styles.sectionTitle}>📈 Enterprise Daily Summary</Text>
            <View style={styles.summaryStatusBadge}>
              <Icon name="analytics" size={16} color="#3b82f6" />
              <Text style={styles.summaryStatusText}>Performance Analytics</Text>
            </View>
          </View>
          <View style={styles.ultimateSummaryCard}>
            <View style={styles.summaryMetricsGrid}>
              <View style={styles.summaryMetricCard}>
                <View style={styles.summaryMetricIconContainer}>
                  <Icon name="people" size={16} color="#10b981" />
                </View>
                <View style={styles.summaryMetricContent}>
                  <Text style={styles.summaryMetricLabel}>Active Cashiers</Text>
                  <Text style={[styles.summaryMetricValue, { color: '#10b981' }]}>
                    {drawerStatus?.active_drawers ?? (drawerStatus?.drawers?.filter(d => d.status === 'ACTIVE').length ?? 0)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.summaryMetricCard}>
                <View style={styles.summaryMetricIconContainer}>
                  <Icon name="store" size={16} color={getStatusColor(shopStatus?.status)} />
                </View>
                <View style={styles.summaryMetricContent}>
                  <Text style={styles.summaryMetricLabel}>Shop Status</Text>
                  <Text style={[styles.summaryMetricValue, { color: getStatusColor(shopStatus?.status) }]}>
                    {shopStatus?.status || 'Unknown'}
                  </Text>
                </View>
              </View>
            </View>
            
            {shopStatus?.opening_notes && (
              <View style={styles.ultimateNotesSection}>
                <View style={styles.notesHeader}>
                  <Icon name="note" size={16} color="#f59e0b" />
                  <Text style={styles.notesTitle}>Opening Notes</Text>
                </View>
                <Text style={styles.ultimateNotesText}>{shopStatus.opening_notes}</Text>
              </View>
            )}
            {shopStatus?.closing_notes && (
              <View style={styles.ultimateNotesSection}>
                <View style={styles.notesHeader}>
                  <Icon name="note" size={16} color="#ef4444" />
                  <Text style={styles.notesTitle}>Closing Notes</Text>
                </View>
                <Text style={styles.ultimateNotesText}>{shopStatus.closing_notes}</Text>
              </View>
            )}
            
            {/* Enhanced guidance section */}
            <View style={styles.ultimateGuidanceSection}>
              <View style={styles.guidanceHeader}>
                <Icon name="lightbulb" size={18} color="#fbbf24" />
                <Text style={styles.guidanceTitle}>💡 End of Day Guidance</Text>
              </View>
              <Text style={styles.guidanceText}>
                To close the shop and end the business day, use the EOD Reconciliation screen for proper cash counting and shift closure.
              </Text>
              <View style={styles.guidanceFeatures}>
                <View style={styles.guidanceFeature}>
                  <Icon name="check" size={12} color="#10b981" />
                  <Text style={styles.guidanceFeatureText}>Professional cash reconciliation</Text>
                </View>
                <View style={styles.guidanceFeature}>
                  <Icon name="check" size={12} color="#10b981" />
                  <Text style={styles.guidanceFeatureText}>Complete shift closure</Text>
                </View>
                <View style={styles.guidanceFeature}>
                  <Icon name="check" size={12} color="#10b981" />
                  <Text style={styles.guidanceFeatureText}>Financial reporting</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      ) : (
        // Enterprise Closed Shop Prompt
        <View style={styles.section}>
          <View style={styles.closedShopSectionHeader}>
            <Text style={styles.sectionTitle}>📣 Shop Status: Closed</Text>
            <View style={styles.closedShopStatusBadge}>
              <Icon name="stop-circle" size={16} color="#ef4444" />
              <Text style={styles.closedShopStatusText}>Ready to Start</Text>
            </View>
          </View>
          <View style={styles.ultimateClosedShopCard}> 
            <View style={styles.closedShopContent}>
              <Icon name="store" size={48} color="#ef4444" />
              <Text style={styles.closedShopTitle}>Shop is currently closed</Text>
              <Text style={styles.closedShopDescription}>Open the shop to start a new business day and begin operations.</Text>
              <Text style={styles.closedShopGuidance}>💡 When the shop is open, use EOD Reconciliation to close the shop and end the business day.</Text>
            </View>
            <View style={styles.closedShopActions}>
              <TouchableOpacity style={styles.ultimateStartButton} onPress={() => setShowStartModal(true)}>
                <Icon name="play-circle-filled" size={24} color="#ffffff" />
                <Text style={styles.ultimateStartButtonText}>Start Day</Text>
                <Text style={styles.ultimateStartButtonSubtext}>Open shop for business</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ultimateQuickStartButton} onPress={quickStartDay} disabled={loading}>
                <Icon name="bolt" size={20} color="#ffffff" />
                <Text style={styles.ultimateQuickStartButtonText}>{loading ? 'Opening...' : 'Quick Open'}</Text>
                <Text style={styles.ultimateQuickStartButtonSubtext}>Open now with default notes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Start Day Modal */}
      <Modal
        visible={showStartModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowStartModal(false)}
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color="#64748b" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Start New Business Day</Text>
            <TouchableOpacity 
              onPress={handleStartDay}
              style={styles.saveButton}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>{loading ? 'Opening...' : 'Open Shop for Business'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Opening Notes *</Text>
              <TextInput
                style={styles.notesInput}
                value={openingNotes}
                onChangeText={setOpeningNotes}
                placeholder="Enter notes about today's opening (cash float, special instructions, etc.)"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.infoCard}>
              <Icon name="info" size={20} color="#3b82f6" />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>What happens when you start a new day:</Text>
                <Text style={styles.infoText}>• Shop opens for business operations</Text>
                <Text style={styles.infoText}>• Cashiers will be able to log in</Text>
                <Text style={styles.infoText}>• New shifts can be started</Text>
                <Text style={styles.infoText}>• Sales transactions can begin</Text>
                <Text style={[styles.infoText, { fontWeight: 'bold', marginTop: 8 }]}>⚠️ Use EOD Reconciliation to close the shop</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>



      {/* Set Float Modal */}
      <Modal
        visible={showFloatModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowFloatModal(false)}
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color="#64748b" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Set Multi-Currency Cash Float</Text>
            <TouchableOpacity 
              onPress={handleSetFloat}
              style={[styles.saveButton, loadingFloat && styles.disabledButton]}
              disabled={loadingFloat}
            >
              <Text style={styles.saveButtonText}>
                {loadingFloat ? 'Setting...' : 'Set Float'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedCashier && (
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Cashier</Text>
                <Text style={styles.cashierNameDisplay}>{selectedCashier.cashier}</Text>
              </View>
            )}

            {/* USD Float Input */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>💵 USD Float Amount ($)</Text>
              <TextInput
                style={styles.floatInput}
                value={floatAmountUSD}
                onChangeText={setFloatAmountUSD}
                placeholder="0.00"
                keyboardType="numeric"
                editable={!loadingFloat}
              />
            </View>

            {/* ZIG Float Input */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>💰 ZIG Float Amount</Text>
              <TextInput
                style={styles.floatInput}
                value={floatAmountZIG}
                onChangeText={setFloatAmountZIG}
                placeholder="0.00"
                keyboardType="numeric"
                editable={!loadingFloat}
              />
            </View>

            {/* RAND Float Input */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>💴 RAND Float Amount (R)</Text>
              <TextInput
                style={styles.floatInput}
                value={floatAmountRAND}
                onChangeText={setFloatAmountRAND}
                placeholder="0.00"
                keyboardType="numeric"
                editable={!loadingFloat}
              />
            </View>

            <View style={styles.infoCard}>
              <Icon name="info" size={20} color="#3b82f6" />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>About Multi-Currency Floats:</Text>
                <Text style={styles.infoText}>• Set starting cash for the cashier's drawer in each currency</Text>
                <Text style={styles.infoText}>• Each cashier can have USD, ZIG, and RAND floats</Text>
                <Text style={styles.infoText}>• Floats are tracked separately per currency</Text>
                <Text style={styles.infoText}>• You can set or update floats at any time during business hours</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

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
    backgroundColor: '#1e293b',
    ...Platform.select({
      web: {
        height: '100vh',
        overflow: 'auto',
        WebkitOverflowScrolling: 'auto',
        scrollBehavior: 'smooth',
      },
    }),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'web' ? 100 : 0,
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
    backgroundColor: '#1e293b',
    padding: 16,
    paddingTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  refreshButton: {
    padding: 8,
  },
  statusHeader: {
    padding: 16,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  statusIconContainer: {
    marginRight: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 2,
  },
  statusTime: {
    fontSize: 14,
    color: '#94a3b8',
  },
  section: {
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 8,
    textAlign: 'center',
  },
  actionButtonSubtext: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  shiftsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  shiftItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  shiftInfo: {
    flex: 1,
  },
  shiftCashierName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  shiftTime: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  shiftBalance: {
    fontSize: 12,
    color: '#94a3b8',
  },
  shiftStatus: {
    alignItems: 'center',
  },
  shiftStatusText: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '600',
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  notesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalContent: {
    padding: 16,
  },
  formSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1e293b',
    minHeight: 100,
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },

  // Simplified Cash Flow Card
  cashFlowCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  cashFlowLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  cashFlowValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  drawerCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  setFloatButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  setFloatButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  setFloatButtonSmall: {
    marginTop: 6,
    marginLeft: 8,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  setFloatButtonTextSmall: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 11,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  drawerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  drawerStatus: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  drawerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  drawerLabel: {
    color: '#64748b',
    fontSize: 12,
  },
  drawerValue: {
    color: '#1e293b',
    fontWeight: '600',
    fontSize: 12,
  },
  smallText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 6,
  },
  cashierNameDisplay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 8,
  },
  floatInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  disabledButton: {
    opacity: 0.6,
  },

  // Ultimate Header Styles (from Sales Dashboard)
  headerWithBack: {
    backgroundColor: '#1e293b',
    padding: 16,
    paddingTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ultimateHeader: {
    backgroundColor: '#1e293b',
    padding: 24,
    paddingTop: 24,
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 2,
    borderBottomColor: '#374151',
  },
  headerBackgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    opacity: 0.95,
  },
  commandCenterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#fbbf24',
    alignSelf: 'flex-start',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  commandCenterBadgeText: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 8,
    letterSpacing: 1,
  },
  ultimateHeaderTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    position: 'relative',
    zIndex: 1,
  },
  ultimateHeaderSubtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
    zIndex: 1,
  },
  ultimateHeaderSubtitle: {
    fontSize: 18,
    color: '#e2e8f0',
    marginHorizontal: 12,
    fontWeight: '500',
  },
  ultimateGrowthMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    position: 'relative',
    zIndex: 1,
  },
  growthMetricCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  growthMetricIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  growthMetricContent: {
    flex: 1,
  },
  growthMetricLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
    marginBottom: 2,
  },
  growthMetricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  growthTrendIndicator: {
    marginLeft: 8,
  },
  realtimeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
    zIndex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 8,
  },
  performanceSummary: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    position: 'relative',
    zIndex: 1,
  },
  performanceSummaryText: {
    fontSize: 13,
    color: '#10b981',
    textAlign: 'center',
    fontWeight: '600',
  },

  // Action Section Styles
  actionSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  actionStatusText: {
    color: '#8b5cf6',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  ultimateActionButton: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    width: '48%',
    marginBottom: 16,
    alignItems: 'center',
    borderLeftWidth: 6,
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
    elevation: 6,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 2,
    borderColor: '#334155',
    position: 'relative',
    overflow: 'hidden',
  },
  inactiveActionButton: {
    opacity: 0.6,
    borderLeftWidth: 6,
    borderLeftColor: '#9ca3af',
  },
  actionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  ultimateActionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
    textAlign: 'center',
  },
  ultimateActionButtonSubtext: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 12,
  },
  actionBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  actionBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },

  // Cash Drawer Section Styles
  cashDrawerSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cashDrawerStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  cashDrawerStatusText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  ultimateCashFlowCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 6,
    borderLeftColor: '#10b981',
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
    elevation: 6,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 2,
    borderColor: '#334155',
  },
  cashFlowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cashFlowTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    marginLeft: 12,
  },
  cashFlowStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cashFlowStatusText: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '600',
    marginLeft: 4,
  },
  cashFlowValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
  },
  cashFlowMetricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cashFlowMetricCard: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    width: '30%',
    alignItems: 'center',
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#4b5563',
  },
  cashFlowMetricLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },
  cashFlowMetricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  cashFlowFinancialGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  cashFlowFinancialCard: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    width: '30%',
    alignItems: 'center',
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#4b5563',
  },
  cashFlowFinancialLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },
  cashFlowFinancialValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  drawerDetailsSection: {
    marginTop: 20,
  },
  drawerDetailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  ultimateDrawerCard: {
    backgroundColor: '#374151',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 6,
    borderLeftColor: '#10b981',
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 2,
    borderColor: '#4b5563',
  },
  ultimateDrawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  drawerRankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  drawerRank: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 24,
    textAlign: 'center',
  },
  drawerBadge: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#10b981',
  },
  drawerPerformanceIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  ultimateDrawerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  ultimateDrawerMetrics: {
    marginBottom: 12,
  },
  drawerMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  drawerMetricIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  drawerMetricContent: {
    flex: 1,
  },
  drawerMetricLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
    marginBottom: 2,
  },
  drawerMetricValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  drawerActivityText: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  ultimateSetFloatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  ultimateSetFloatButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 6,
  },

  // Shifts Section Styles
  shiftsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  shiftsStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  shiftsStatusText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  ultimateShiftsList: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 6,
    borderLeftColor: '#10b981',
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
    elevation: 6,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 2,
    borderColor: '#334155',
  },
  ultimateShiftItem: {
    backgroundColor: '#374151',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 6,
    borderLeftColor: '#10b981',
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 2,
    borderColor: '#4b5563',
    position: 'relative',
    overflow: 'hidden',
  },
  ultimateShiftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  shiftRankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eliteRankBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  eliteRankText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  shiftBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#10b981',
  },
  shiftPerformanceCrown: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  ultimateShiftInfo: {
    flex: 1,
    marginBottom: 12,
  },
  ultimateShiftCashierName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  shiftTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ultimateShiftTime: {
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 6,
  },
  shiftBalanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ultimateShiftBalance: {
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 6,
  },
  ultimateShiftStatus: {
    alignItems: 'center',
  },
  shiftStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  ultimateShiftStatusText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '600',
    marginLeft: 4,
  },
  ultimateSetFloatButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  ultimateSetFloatButtonTextSmall: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 10,
    marginLeft: 4,
  },

  // Summary Section Styles
  summarySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  summaryStatusText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  ultimateSummaryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 6,
    borderLeftColor: '#3b82f6',
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
    elevation: 6,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 2,
    borderColor: '#334155',
  },
  summaryMetricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryMetricCard: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#4b5563',
  },
  summaryMetricIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryMetricContent: {
    flex: 1,
  },
  summaryMetricLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
    marginBottom: 2,
  },
  summaryMetricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  ultimateNotesSection: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#4b5563',
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginLeft: 8,
  },
  ultimateNotesText: {
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 20,
  },
  ultimateGuidanceSection: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  guidanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  guidanceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fbbf24',
    marginLeft: 8,
  },
  guidanceText: {
    fontSize: 13,
    color: '#e2e8f0',
    lineHeight: 18,
    marginBottom: 12,
  },
  guidanceFeatures: {
    marginTop: 8,
  },
  guidanceFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  guidanceFeatureText: {
    fontSize: 11,
    color: '#94a3b8',
    marginLeft: 8,
  },

  // Closed Shop Section Styles
  closedShopSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  closedShopStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  closedShopStatusText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  ultimateClosedShopCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    borderLeftWidth: 6,
    borderLeftColor: '#ef4444',
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
    elevation: 6,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 2,
    borderColor: '#334155',
  },
  closedShopContent: {
    alignItems: 'center',
    marginBottom: 24,
  },
  closedShopTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  closedShopDescription: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  closedShopGuidance: {
    fontSize: 12,
    color: '#fbbf24',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  closedShopActions: {
    gap: 12,
  },
  ultimateStartButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 2,
    borderColor: '#059669',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  ultimateStartButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 8,
    marginRight: 8,
  },
  ultimateStartButtonSubtext: {
    fontSize: 12,
    color: '#e6fffa',
  },
  ultimateQuickStartButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 2,
    borderColor: '#d97706',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  ultimateQuickStartButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 8,
    marginRight: 8,
  },
  ultimateQuickStartButtonSubtext: {
    fontSize: 12,
    color: '#fef3c7',
  },
});

export default StartOfDayScreen;
