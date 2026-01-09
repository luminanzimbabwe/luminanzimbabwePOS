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
  PanResponder,
  Animated,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { shopStorage } from '../services/storage';
import { shopAPI } from '../services/api';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

const CashierSalesScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [cashierData, setCashierData] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [shopConfig, setShopConfig] = useState(null);
  
  // Filter and pagination states
  const [filteredSales, setFilteredSales] = useState([]);
  const [displayedSales, setDisplayedSales] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState('today'); // today, yesterday, week, month, custom
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all'); // all, cash, card, transfer
  const [showAllSales, setShowAllSales] = useState(false);
  const ITEMS_PER_PAGE = 10;
  
  // Sidebar state
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarX] = useState(new Animated.Value(-350));
  
  // Pan responder for swipe gestures
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => {
        return evt.nativeEvent.locationX < 50;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return evt.nativeEvent.locationX < 50;
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 100) {
          setShowSidebar(true);
        } else if (gestureState.dx < -50) {
          setShowSidebar(false);
        }
      },
    })
  ).current;
  
  // Sidebar animation
  useEffect(() => {
    Animated.timing(sidebarX, {
      toValue: showSidebar ? 0 : -350,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showSidebar]);

  useEffect(() => {
    loadCashierSales();
    loadShopConfiguration();
  }, []);

  // Apply filters when data or filter states change
  useEffect(() => {
    if (salesData.length > 0) {
      applyFilters();
    }
  }, [salesData, dateFilter, customStartDate, customEndDate, paymentFilter, showAllSales]);

  const loadCashierSales = async () => {
    try {
      const credentials = await shopStorage.getCredentials();
      if (!credentials) {
        navigation.replace('Login');
        return;
      }

      setCashierData(credentials);

      // Get current cashier's ID using the same approach as drawer system
      // Create comprehensive cashier identifier for matching (like drawer system)
      const currentCashierId = credentials?.cashier_info?.id || 
                               credentials?.id || 
                               credentials?.cashier_id || 
                               credentials?.user_id ||
                               (credentials?.cashier_info?.id ? String(credentials.cashier_info.id) : null);
      
      // Enhanced cashier name extraction - use same source as drawer system
      // Get cashier name from multiple sources like drawer system does
      const currentCashierName = credentials?.cashier_info?.name || 
                                credentials?.name || 
                                credentials?.username || 
                                credentials?.cashier_name ||
                                // Try to get from presence service (like drawer system)
                                (window.currentUser && window.currentUser.name) ||
                                // Use email username part as fallback
                                (credentials?.email && credentials.email.split('@')[0]) ||
                                'Unknown Cashier';

      console.log('🔍 CREDENTIALS STRUCTURE:', {
        credentials,
        cashierIdentifiers: [credentials?.cashier_info?.id, credentials?.id, credentials?.cashier_id],
        cashier_info: credentials?.cashier_info,
        name: credentials?.name,
        username: credentials?.username,
        cashierIdExtracted: currentCashierId,
        cashierNameExtracted: currentCashierName
      });

      console.log('🔍 LOADING CASHIER SALES:', {
        cashierId: currentCashierId,
        cashierName: currentCashierName,
        cashierIdType: typeof currentCashierId,
        credentialsId: credentials?.id,
        credentialsCashierId: credentials?.cashier_id,
        cashierInfoId: credentials?.cashier_info?.id
      });

      let response;
      let cashierSales = [];

      try {
        // Try new ALL SALES HISTORY endpoint that preserves data forever
        console.log('📊 Fetching ALL cashier sales history from permanent storage...');
        
        // Send BOTH id and name to ensure matching works
        // Make sure we pass the numeric ID if available
        const cashierIdParam = currentCashierId ? (typeof currentCashierId === 'string' ? parseInt(currentCashierId, 10) || currentCashierId : currentCashierId) : null;
        
        console.log('🔍 API call params:', { cashierId: cashierIdParam, cashierName: currentCashierName });
        
        const response = await shopAPI.getAllCashierSales(
          cashierIdParam, 
          currentCashierName
        );
        
        console.log('📊 API Response:', response.data);
        
        if (response.data && response.data.success) {
          cashierSales = response.data.cashier_sales || [];
          console.log('✅ All cashier sales history loaded:', cashierSales.length);
          
          // Use summary from server if available
          if (response.data.summary) {
            const serverSummary = response.data.summary;
            const summaryData = {
              totalSales: serverSummary.total_sales || 0,
              totalRevenue: serverSummary.total_revenue || 0,
              cashSales: serverSummary.cash_sales || 0,
              cardSales: serverSummary.card_sales || 0,
              transferSales: serverSummary.transfer_sales || 0,
              cashRevenue: serverSummary.cash_revenue || 0,
              cardRevenue: serverSummary.card_revenue || 0,
              transferRevenue: serverSummary.transfer_revenue || 0,
              averageSale: serverSummary.average_sale || 0
            };
            setSummary(summaryData);
          }
        } else {
          console.log('⚠️ API returned success: false or no data');
          throw new Error('Invalid response from all sales endpoint');
        }
        
      } catch (allSalesError) {
        console.log('⚠️ All sales endpoint failed:', allSalesError);
        console.log('📊 Trying fallback with regular sales...');
        
        try {
          // Fallback: Get all sales and filter client-side
          response = await shopAPI.getSales();
          
          if (response.data) {
            let allSales = [];
            
            // Handle different response formats
            if (response.data.sales && Array.isArray(response.data.sales)) {
              allSales = response.data.sales;
            } else if (response.data.data && Array.isArray(response.data.data)) {
              allSales = response.data.data;
            } else if (Array.isArray(response.data)) {
              allSales = response.data;
            }
            
            console.log('📋 All sales fetched for filtering:', allSales.length);
            
            // Filter sales for current cashier using enhanced matching logic
            cashierSales = allSales.filter(sale => {
              if (!sale) return false;
              
              // Strategy 1: Match by cashier_id
              if (sale.cashier_id && currentCashierId && String(sale.cashier_id) === String(currentCashierId)) {
                return true;
              }
              
              // Strategy 2: Match by cashier_name (case-insensitive)
              if (sale.cashier_name && currentCashierName && sale.cashier_name.toLowerCase() === currentCashierName.toLowerCase()) {
                return true;
              }
              
              // Strategy 3: Match by name field
              if (sale.name && currentCashierName && sale.name.toLowerCase() === currentCashierName.toLowerCase()) {
                return true;
              }
              
              // Strategy 4: Enhanced partial name matching
              if (sale.cashier_name && currentCashierName) {
                const saleCashier = sale.cashier_name.toLowerCase();
                const currentCashier = currentCashierName.toLowerCase();
                
                if (saleCashier.includes(currentCashier) || currentCashier.includes(saleCashier)) {
                  return true;
                }
                
                const saleParts = saleCashier.split(/[^a-zA-Z]/);
                const currentParts = currentCashier.split(/[^a-zA-Z]/);
                const commonPart = saleParts.find(part => part.length > 2 && currentParts.includes(part));
                
                if (commonPart) return true;
              }
              
              return false;
            });
            
            console.log('🔍 Filtered cashier sales:', cashierSales.length);
          }
        } catch (fallbackError) {
          console.log('❌ Fallback also failed:', fallbackError);
          throw new Error('Failed to load sales data from all endpoints');
        }
      }
      
      setSalesData(cashierSales);
      setFilteredSales(cashierSales);
      setDisplayedSales(cashierSales.slice(0, ITEMS_PER_PAGE));

      // Calculate sales summary
      const calculateSalesSummary = (sales) => {
        return {
          sales: sales.length,
          revenue: sales.reduce((sum, sale) => sum + parseFloat(sale.total_amount || 0), 0)
        };
      };

      // Calculate summary for current cashier
      const totalSales = cashierSales.length;
      const totalRevenue = cashierSales.reduce((sum, sale) => sum + parseFloat(sale.total_amount || 0), 0);
      const cashSales = cashierSales.filter(sale => sale.payment_method === 'cash');
      const cardSales = cashierSales.filter(sale => sale.payment_method === 'card');

      const transferSales = cashierSales.filter(sale => sale.payment_method === 'transfer');
      const cashRevenue = cashSales.reduce((sum, sale) => sum + parseFloat(sale.total_amount || 0), 0);
      const cardRevenue = cardSales.reduce((sum, sale) => sum + parseFloat(sale.total_amount || 0), 0);
      const transferRevenue = transferSales.reduce((sum, sale) => sum + parseFloat(sale.total_amount || 0), 0);

      const summaryData = {
        totalSales,
        totalRevenue,
        cashSales: cashSales.length,
        cardSales: cardSales.length,
        transferSales: transferSales.length,
        cashRevenue,
        cardRevenue,
        transferRevenue,
        averageSale: totalSales > 0 ? totalRevenue / totalSales : 0
      };
      
      console.log('📊 CASHIER SALES SUMMARY:', summaryData);
      setSummary(summaryData);
      
    } catch (error) {
      console.error('❌ Error loading cashier sales:', error);
      Alert.alert('Error', `Failed to load sales data: ${error.message}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const loadShopConfiguration = async () => {
    try {
      console.log('🏪 Loading shop configuration for receipt...');
      
      // Use the same approach as CashierDashboardScreen - get from stored credentials
      const credentials = await shopStorage.getCredentials();
      if (!credentials) {
        console.log('⚠️ No credentials found for shop config');
        return;
      }

      // Extract shop info using the same approach as CashierDashboardScreen
      const shopInfo = credentials.shop_info || credentials;
      
      // Create comprehensive shop data (like CashierDashboardScreen does)
      const fullShopData = {
        ...shopInfo,
        // Ensure all registration data is included with fallbacks
        register_id: credentials.register_id || shopInfo.register_id || 'REG-' + Date.now().toString(36).toUpperCase(),
        device_id: credentials.device_id || shopInfo.device_id || 'DEV-' + Math.random().toString(36).substring(2, 15).toUpperCase(),
        shop_id: credentials.shop_id || shopInfo.shop_id || 'SHOP-' + (shopInfo.name || 'UNK').substring(0, 3).toUpperCase() + '-' + Date.now().toString(36).substring(0, 6).toUpperCase(),
        owner_id: credentials.owner_id || shopInfo.owner_id || 'OWN-' + (shopInfo.email || 'unknown').split('@')[0].toUpperCase().substring(0, 6) + '-' + Date.now().toString(36).substring(0, 4).toUpperCase(),
        api_key: credentials.api_key || shopInfo.api_key || 'luminan_' + Math.random().toString(36).substring(2, 34).toUpperCase(),
        master_password: credentials.master_password || shopInfo.master_password || 'Generated during registration',
        recovery_codes: credentials.recovery_codes || shopInfo.recovery_codes || ['1HAEJ9', 'MS1QCX', 'K08XWJ', 'SJXAYI', '1ORIXN', 'XXDURU', 'I4PJIJ', 'P4CFG8'],
        registration_time: credentials.registration_time || shopInfo.registration_time || new Date().toISOString(),
        version: credentials.version || shopInfo.version || '1.0.0',
        checksum: credentials.checksum || shopInfo.checksum || 'CHK-' + Date.now().toString(36).toUpperCase(),
      };
      
      console.log('✅ Shop configuration loaded from storage:', fullShopData);
      setShopConfig(fullShopData);
      
      // Try to get fresh data from API and merge (like CashierDashboardScreen does)
      try {
        const response = await shopAPI.getOwnerDashboard();
        
        let apiData = null;
        if (response.data.shop_info) {
          apiData = response.data.shop_info;
        } else if (response.data.name || response.data.email) {
          apiData = response.data;
        }
        
        if (apiData) {
          // Merge API data with storage data (API takes priority for fresh data)
          const mergedData = {
            ...fullShopData,
            ...apiData,
            // Ensure critical fields are preserved from storage
            register_id: apiData.register_id || fullShopData?.register_id,
            device_id: apiData.device_id || fullShopData?.device_id,
            shop_id: apiData.shop_id || fullShopData?.shop_id,
            owner_id: apiData.owner_id || fullShopData?.owner_id,
            api_key: apiData.api_key || fullShopData?.api_key,
            master_password: fullShopData?.master_password,
            recovery_codes: fullShopData?.recovery_codes,
            checksum: fullShopData?.checksum,
          };
          
          console.log('✅ Shop configuration merged with API data:', mergedData);
          setShopConfig(mergedData);
        }
      } catch (apiError) {
        // Keep the existing fullShopData if API fails
        console.log('⚠️ API call failed, using stored shop data:', apiError);
      }
      
    } catch (error) {
      console.log('❌ Error loading shop configuration:', error);
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    const numAmount = parseFloat(amount) || 0;
    if (currency === 'ZIG') {
      return `${numAmount.toFixed(2)} ZIG`;
    } else if (currency === 'RAND') {
      return `${numAmount.toFixed(2)} RAND`;
    } else {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }).format(numAmount);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const handleViewReceipt = (sale) => {
    setSelectedSale(sale);
    setReceiptModalVisible(true);
  };

  const closeReceiptModal = () => {
    setReceiptModalVisible(false);
    setSelectedSale(null);
  };

  const getPaymentIcon = (method) => {
    switch (method?.toLowerCase()) {
      case 'cash': return '💵';
      case 'card': return '💳';
  
      case 'transfer': return '🏦';
      default: return '💰';
    }
  };

  // Filter and pagination functions
  const applyFilters = () => {
    let filtered = [...salesData];

    // Date filtering
    const now = new Date();
    let startDate, endDate;

    switch (dateFilter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999);
        }
        break;
    }

    if (startDate && endDate) {
      filtered = filtered.filter(sale => {
        const saleDate = new Date(sale.created_at || sale.sale_date);
        return saleDate >= startDate && saleDate <= endDate;
      });
    }

    // Payment method filtering
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(sale => sale.payment_method === paymentFilter);
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.created_at || b.sale_date) - new Date(a.created_at || a.sale_date));

    setFilteredSales(filtered);
    
    // Update displayed sales based on pagination
    if (showAllSales) {
      setDisplayedSales(filtered);
    } else {
      setDisplayedSales(filtered.slice(0, ITEMS_PER_PAGE));
    }
  };

  const loadMoreSales = () => {
    setShowAllSales(true);
    setDisplayedSales(filteredSales);
  };

  const resetFilters = () => {
    setDateFilter('today');
    setCustomStartDate('');
    setCustomEndDate('');
    setPaymentFilter('all');
    setShowAllSales(false);
    setFilteredSales(salesData);
    setDisplayedSales(salesData.slice(0, ITEMS_PER_PAGE));
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.replace('CashierDashboard')}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>📊 My Sales</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading your sales data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={[styles.webScrollView]}
        contentContainerStyle={styles.webContentContainer}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
        scrollEventThrottle={16}
        nestedScrollEnabled={Platform.OS === 'web'}
        removeClippedSubviews={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadCashierSales}
          />
        }
      >
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.replace('CashierDashboard')}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📊 My Sales</Text>
      </View>

      <View style={styles.content}>
        {/* Summary Cards */}
        {summary && (
            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>📈 MY SALES SUMMARY</Text>
              
              <View style={styles.summaryGrid}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryIcon}>💰</Text>
                  <Text style={styles.summaryValue}>{summary.totalSales}</Text>
                  <Text style={styles.summaryLabel}>Total Sales</Text>
                </View>
                
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryIcon}>💵</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(summary.totalRevenue, 'USD')}</Text>
                  <Text style={styles.summaryLabel}>Total Revenue</Text>
                </View>
                
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryIcon}>📊</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(summary.averageSale, 'USD')}</Text>
                  <Text style={styles.summaryLabel}>Average Sale</Text>
                </View>
                
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryIcon}>💳</Text>
                  <Text style={styles.summaryValue}>{summary.cashSales + summary.cardSales}</Text>
                  <Text style={styles.summaryLabel}>Transactions</Text>
                </View>
              </View>



              {/* Payment Method Breakdown */}
              <View style={styles.paymentBreakdown}>
                <Text style={styles.breakdownTitle}>💳 PAYMENT METHODS</Text>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>💵 Cash Sales:</Text>
                  <Text style={styles.breakdownValue}>{summary.cashSales} sales</Text>
                  <Text style={styles.breakdownAmount}>{formatCurrency(summary.cashRevenue, 'USD')}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>💳 Card Sales:</Text>
                  <Text style={styles.breakdownValue}>{summary.cardSales} sales</Text>
                  <Text style={styles.breakdownAmount}>{formatCurrency(summary.cardRevenue, 'USD')}</Text>
                </View>

                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>🏦 Transfer Sales:</Text>
                  <Text style={styles.breakdownValue}>{summary.transferSales} sales</Text>
                  <Text style={styles.breakdownAmount}>{formatCurrency(summary.transferRevenue, 'USD')}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Filter Section */}
          {showFilters && (
            <View style={styles.filterSection}>
              <Text style={styles.sectionTitle}>🔍 FILTER & SEARCH</Text>
              
              {/* Date Filter */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>📅 Date Range:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptions}>
                  {[
                    { value: 'today', label: 'Today' },
                    { value: 'yesterday', label: 'Yesterday' },
                    { value: 'week', label: 'Last 7 Days' },
                    { value: 'month', label: 'This Month' },
                    { value: 'custom', label: 'Custom Range' }
                  ].map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.filterOption,
                        dateFilter === option.value && styles.filterOptionActive
                      ]}
                      onPress={() => setDateFilter(option.value)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        dateFilter === option.value && styles.filterOptionTextActive
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Custom Date Range */}
              {dateFilter === 'custom' && (
                <View style={styles.customDateGroup}>
                  <View style={styles.dateInputGroup}>
                    <Text style={styles.filterLabel}>Start Date:</Text>
                    <TextInput
                      style={styles.dateInput}
                      value={customStartDate}
                      onChangeText={setCustomStartDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                  <View style={styles.dateInputGroup}>
                    <Text style={styles.filterLabel}>End Date:</Text>
                    <TextInput
                      style={styles.dateInput}
                      value={customEndDate}
                      onChangeText={setCustomEndDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>
              )}

              {/* Payment Method Filter */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>💳 Payment Method:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptions}>
                  {[
                    { value: 'all', label: 'All Methods' },
                    { value: 'cash', label: 'Cash Only' },
                    { value: 'card', label: 'Card Only' },
                    { value: 'transfer', label: 'Transfer Only' }
                  ].map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.filterOption,
                        paymentFilter === option.value && styles.filterOptionActive
                      ]}
                      onPress={() => setPaymentFilter(option.value)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        paymentFilter === option.value && styles.filterOptionTextActive
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Filter Actions */}
              <View style={styles.filterActions}>
                <TouchableOpacity style={styles.resetFilterButton} onPress={resetFilters}>
                  <Text style={styles.resetFilterButtonText}>🔄 Reset Filters</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.applyFilterButton} onPress={applyFilters}>
                  <Text style={styles.applyFilterButtonText}>✅ Apply Filters</Text>
                </TouchableOpacity>
              </View>

              {/* Filter Results Summary */}
              <View style={styles.filterSummary}>
                <Text style={styles.filterSummaryText}>
                  Showing {filteredSales.length} of {salesData.length} sales
                </Text>
              </View>
            </View>
          )}

          {/* Sales List */}
          <View style={styles.salesSection}>
            <Text style={styles.sectionTitle}>🧾 MY TRANSACTION HISTORY</Text>
            
            {displayedSales.length === 0 ? (
              <View style={styles.noSalesContainer}>
                <Text style={styles.noSalesIcon}>📊</Text>
                <Text style={styles.noSalesText}>
                  {filteredSales.length === 0 ? 'No sales found for the selected filters' : 'No sales to display'}
                </Text>
                <Text style={styles.noSalesSubtext}>
                  {filteredSales.length === 0 ? 'Try adjusting your filters or make some sales!' : 'Start making sales to see them here!'}
                </Text>
              </View>
            ) : (
              displayedSales.map((sale, index) => (
                <View key={sale.id || index} style={styles.saleCard}>
                  <View style={styles.saleHeader}>
                    <View style={styles.saleInfo}>
                      <Text style={styles.saleId}>Sale #{sale.id || 'N/A'}</Text>
                      <Text style={styles.saleDate}>{formatDate(sale.created_at || sale.sale_date)}</Text>
                    </View>
                    <View style={styles.saleAmount}>
                      <Text style={styles.saleTotal}>
                        {formatCurrency(sale.total_amount, sale.currency || 'USD')}
                      </Text>
                      <Text style={styles.paymentMethod}>
                        {getPaymentIcon(sale.payment_method)} {sale.payment_method?.toUpperCase()}
                      </Text>
                      <TouchableOpacity
                        style={styles.viewReceiptButton}
                        onPress={() => handleViewReceipt(sale)}
                      >
                        <Text style={styles.viewReceiptButtonText}>🧾 VIEW RECEIPT</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  {sale.items && sale.items.length > 0 && (
                    <View style={styles.saleItems}>
                      <Text style={styles.itemsTitle}>Items:</Text>
                      {sale.items.slice(0, 3).map((item, itemIndex) => (
                        <Text key={itemIndex} style={styles.itemText}>
                          • {item.product_name || item.name} x {item.quantity} @ {formatCurrency(item.unit_price, sale.currency || 'USD')}
                        </Text>
                      ))}
                      {sale.items.length > 3 && (
                        <Text style={styles.moreItemsText}>... and {sale.items.length - 3} more items</Text>
                      )}
                    </View>
                  )}
                </View>
              ))
            )}

            {/* Pagination Controls */}
            {filteredSales.length > ITEMS_PER_PAGE && (
              <View style={styles.paginationContainer}>
                {!showAllSales ? (
                  <TouchableOpacity style={styles.seeMoreButton} onPress={loadMoreSales}>
                    <Text style={styles.seeMoreButtonText}>📋 See More Sales ({filteredSales.length - ITEMS_PER_PAGE} more)</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.showLessButton} onPress={() => {
                    setShowAllSales(false);
                    setDisplayedSales(filteredSales.slice(0, ITEMS_PER_PAGE));
                  }}>
                    <Text style={styles.showLessButtonText}>🔼 Show Less</Text>
                  </TouchableOpacity>
                )}
                <Text style={styles.paginationInfo}>
                  Showing {displayedSales.length} of {filteredSales.length} sales
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Bottom padding for web scrolling */}
        <View style={{ 
          height: Platform.OS === 'web' ? 100 : 20,
          minHeight: Platform.OS === 'web' ? 100 : 0
        }} />
      </ScrollView>

      {/* Cashier Sidebar */}
      {showSidebar && (
        <>
          <TouchableOpacity
            style={styles.sidebarBackdrop}
            activeOpacity={1}
            onPress={() => setShowSidebar(false)}
          />
          <Animated.View
            style={[
              styles.sidebar,
              { transform: [{ translateX: sidebarX }] }
            ]}
            {...panResponder.panHandlers}
          >
            <View style={styles.sidebarHeader}>
              <View style={styles.sidebarTitleContainer}>
                <Text style={styles.sidebarTitle}>💰 Cashier Tools</Text>
                <Text style={styles.sidebarSubtitle}>Quick Access Menu</Text>
              </View>
              <TouchableOpacity
                style={styles.sidebarCloseButton}
                onPress={() => setShowSidebar(false)}
              >
                <Text style={styles.sidebarCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sidebarFeaturesList} showsVerticalScrollIndicator={false}>
              <View style={styles.sidebarFeaturesSection}>
                <Text style={styles.sidebarSectionTitle}>🚀 QUICK ACCESS TOOLS</Text>
                <TouchableOpacity 
                  style={styles.sidebarFeatureItem}
                  onPress={() => { setShowSidebar(false); navigation.navigate('CashierDashboard'); }}
                >
                  <View style={[styles.sidebarFeatureIcon, { backgroundColor: '#3b82f6' }]}>
                    <Text style={styles.sidebarFeatureIconText}>🏠</Text>
                  </View>
                  <View style={styles.sidebarFeatureContent}>
                    <Text style={styles.sidebarFeatureTitle}>📊 Dashboard</Text>
                    <Text style={styles.sidebarFeatureDescription}>Back to main dashboard</Text>
                  </View>
                  <Text style={styles.sidebarFeatureArrow}>→</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.sidebarFeatureItem}
                  onPress={() => { setShowSidebar(false); navigation.navigate('CashierSales'); }}
                >
                  <View style={[styles.sidebarFeatureIcon, { backgroundColor: '#10b981' }]}>
                    <Text style={styles.sidebarFeatureIconText}>📊</Text>
                  </View>
                  <View style={styles.sidebarFeatureContent}>
                    <Text style={styles.sidebarFeatureTitle}>📊 My Sales</Text>
                    <Text style={styles.sidebarFeatureDescription}>View transaction history</Text>
                  </View>
                  <Text style={styles.sidebarFeatureArrow}>→</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.sidebarFooter}>
              <Text style={styles.sidebarFooterText}>💡 Quick Tip</Text>
              <Text style={styles.sidebarFooterDescription}>
                Swipe from left edge to open menu on mobile.
              </Text>
            </View>
          </Animated.View>
        </>
      )}

      {/* Receipt Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={receiptModalVisible}
        onRequestClose={closeReceiptModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.receiptModalContainer}>
            <ScrollView style={styles.receiptScrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.receiptContainer}>
                {/* Receipt Header */}
                <View style={styles.receiptHeader}>
                  <Text style={styles.receiptStoreName}>🏪 {shopConfig?.name || 'LUMINA ZIMBABWE'}</Text>
                  <Text style={styles.receiptStoreAddress}>{shopConfig?.address || '123 Main Street, Harare'}</Text>
                  <Text style={styles.receiptStorePhone}>{shopConfig?.phone || '+263 77 123 4567'}</Text>
                  {shopConfig?.business_type && (
                    <Text style={styles.receiptStoreBusiness}>{shopConfig.business_type}</Text>
                  )}
                  <Text style={styles.receiptDivider}>══════════════════════════════</Text>
                </View>

                {selectedSale && (
                  <>
                    {/* Sale Info */}
                    <View style={styles.receiptInfo}>
                      <Text style={styles.receiptLabel}>SALE #{selectedSale.id}</Text>
                      <Text style={styles.receiptText}>Date: {formatDate(selectedSale.created_at || selectedSale.sale_date)}</Text>
                      <Text style={styles.receiptText}>Cashier: {selectedSale.cashier_name || 'N/A'}</Text>
                      <Text style={styles.receiptDivider}>══════════════════════════════</Text>
                    </View>

                    {/* Items */}
                    <View style={styles.receiptItems}>
                      <Text style={styles.receiptItemsTitle}>ITEMS PURCHASED:</Text>
                      {selectedSale.items && selectedSale.items.length > 0 ? (
                        selectedSale.items.map((item, index) => (
                          <View key={index} style={styles.receiptItem}>
                            <View style={styles.receiptItemRow}>
                              <Text style={styles.receiptItemName}>
                                {item.product_name || item.name}
                              </Text>
                              <Text style={styles.receiptItemTotal}>
                                {formatCurrency(item.unit_price * item.quantity, selectedSale.currency || 'USD')}
                              </Text>
                            </View>
                            <Text style={styles.receiptItemDetails}>
                              {item.quantity} × {formatCurrency(item.unit_price, selectedSale.currency || 'USD')}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.receiptNoItems}>No items found</Text>
                      )}
                      <Text style={styles.receiptDivider}>══════════════════════════════</Text>
                    </View>

                    {/* Payment Info */}
                    <View style={styles.receiptPayment}>
                      <View style={styles.receiptTotalRow}>
                        <Text style={styles.receiptTotalLabel}>TOTAL AMOUNT:</Text>
                        <Text style={styles.receiptTotalAmount}>
                          {formatCurrency(selectedSale.total_amount, selectedSale.currency || 'USD')}
                        </Text>
                      </View>
                      <View style={styles.receiptPaymentRow}>
                        <Text style={styles.receiptPaymentLabel}>Payment Method:</Text>
                        <Text style={styles.receiptPaymentValue}>
                          {getPaymentIcon(selectedSale.payment_method)} {selectedSale.payment_method?.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.receiptDivider}>══════════════════════════════</Text>
                    </View>

                    {/* Footer */}
                    <View style={styles.receiptFooter}>
                      <Text style={styles.receiptThankYou}>THANK YOU FOR YOUR BUSINESS!</Text>
                      <Text style={styles.receiptFooterText}>Please come again</Text>
                      <Text style={styles.receiptTimestamp}>
                        Printed: {new Date().toLocaleString()}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.receiptModalActions}>
              <TouchableOpacity
                style={styles.closeReceiptButton}
                onPress={closeReceiptModal}
              >
                <Text style={styles.closeReceiptButtonText}>✕ CLOSE</Text>
              </TouchableOpacity>
            </View>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterButton: {
    color: '#3b82f6',
    fontSize: 20,
    fontWeight: '600',
  },
  
  // Neural Header Styles - GEN 2080
  neuralCashierHeader: {
    backgroundColor: '#0a0a0a',
    padding: 16,
    paddingTop: 16,
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 2,
    borderBottomColor: '#00ffff',
  },
  neuralHeaderBackground: {
    backgroundColor: 'rgba(0, 20, 40, 0.95)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#00ffff',
    position: 'relative',
    overflow: 'hidden',
  },
  neuralHeaderContent: {
    position: 'relative',
    zIndex: 2,
  },
  neuralTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  neuralMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00ffff',
    position: 'relative',
    overflow: 'hidden',
  },
  neuralButtonGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    borderRadius: 8,
  },
  neuralButtonText: {
    color: '#00ffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
    letterSpacing: 1,
  },
  neuralTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  neuralGeneration: {
    color: '#ff0080',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  neuralSubtitle: {
    color: '#00ffff',
    fontSize: 10,
    marginTop: 2,
  },
  neuralCashierName: {
    color: '#ffffff',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  neuralRefreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00ffff',
    position: 'relative',
    overflow: 'hidden',
  },
  neuralRefreshText: {
    color: '#00ffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
    letterSpacing: 1,
  },
  neuralStatusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  neuralStatusCard: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  neuralStatusLabel: {
    color: '#00ffff',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  neuralStatusValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dataStreamBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 170, 0, 0.1)',
    borderRadius: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#ffaa00',
  },
  streamDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#ffaa00',
    marginHorizontal: 8,
  },
  streamText: {
    color: '#ffaa00',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  
  // Vintage Border
  vintageBorder: {
    backgroundColor: '#111111',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    alignItems: 'center',
  },
  borderText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginVertical: 2,
  },
  
  // Inspirational Quote Styles
  inspirationalQuoteSection: {
    backgroundColor: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #06b6d4 100%)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#60a5fa',
    alignItems: 'center',
  },
  inspirationalQuoteText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  inspirationalQuoteAuthor: {
    color: '#bfdbfe',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  quoteDecoration: {
    marginTop: 4,
  },
  quoteDecoText: {
    fontSize: 12,
    textAlign: 'center',
  },
  
  // Filter Section Styles
  filterSection: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  filterGroup: {
    marginBottom: 16,
  },
  filterLabel: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
  },
  filterOption: {
    backgroundColor: '#374151',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  filterOptionActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterOptionText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
  },
  filterOptionTextActive: {
    color: '#ffffff',
  },
  customDateGroup: {
    flexDirection: 'row',
    gap: 16,
  },
  dateInputGroup: {
    flex: 1,
  },
  dateInput: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  resetFilterButton: {
    backgroundColor: '#6b7280',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  resetFilterButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  applyFilterButton: {
    backgroundColor: '#10b981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  applyFilterButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  filterSummary: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  filterSummaryText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Pagination Styles
  paginationContainer: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
    marginTop: 16,
  },
  seeMoreButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 8,
  },
  seeMoreButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  showLessButton: {
    backgroundColor: '#6b7280',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 8,
  },
  showLessButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  paginationInfo: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
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
  summarySection: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  sectionTitle: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  summaryIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryLabel: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  currencyBreakdown: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  paymentBreakdown: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  breakdownTitle: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  breakdownLabel: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  breakdownValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 12,
  },
  breakdownAmount: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '700',
  },
  salesSection: {
    marginBottom: 20,
  },
  noSalesContainer: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  noSalesIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  noSalesText: {
    color: '#9ca3af',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  noSalesSubtext: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
  },
  saleCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  saleInfo: {
    flex: 1,
  },
  saleId: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  saleDate: {
    color: '#9ca3af',
    fontSize: 12,
  },
  saleAmount: {
    alignItems: 'flex-end',
  },
  saleTotal: {
    color: '#10b981',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  paymentMethod: {
    color: '#9ca3af',
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  saleItems: {
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 12,
  },
  itemsTitle: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  itemText: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 2,
  },
  moreItemsText: {
    color: '#6b7280',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  viewReceiptButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  viewReceiptButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptModalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: width * 0.9,
    maxHeight: height * 0.8,
    overflow: 'hidden',
  },
  receiptScrollView: {
    maxHeight: height * 0.7,
  },
  receiptContainer: {
    padding: 20,
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  receiptStoreName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  receiptStoreAddress: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 2,
  },
  receiptStorePhone: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 2,
  },
  receiptStoreBusiness: {
    fontSize: 11,
    color: '#666666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  receiptDivider: {
    fontSize: 12,
    color: '#000000',
    textAlign: 'center',
    marginVertical: 8,
  },
  receiptInfo: {
    marginBottom: 16,
  },
  receiptLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  receiptText: {
    fontSize: 12,
    color: '#333333',
    marginBottom: 2,
  },
  receiptItems: {
    marginBottom: 16,
  },
  receiptItemsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  receiptItem: {
    marginBottom: 8,
  },
  receiptItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptItemName: {
    fontSize: 12,
    color: '#000000',
    flex: 1,
  },
  receiptItemTotal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
  },
  receiptItemDetails: {
    fontSize: 10,
    color: '#666666',
    marginTop: 2,
  },
  receiptNoItems: {
    fontSize: 12,
    color: '#666666',
    fontStyle: 'italic',
  },
  receiptPayment: {
    marginBottom: 16,
  },
  receiptTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  receiptTotalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  receiptTotalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  receiptPaymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  receiptPaymentLabel: {
    fontSize: 12,
    color: '#333333',
  },
  receiptPaymentValue: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '600',
  },
  receiptFooter: {
    alignItems: 'center',
    marginTop: 16,
  },
  receiptThankYou: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
    textAlign: 'center',
  },
  receiptFooterText: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
    textAlign: 'center',
  },
  receiptTimestamp: {
    fontSize: 10,
    color: '#999999',
    textAlign: 'center',
  },
  receiptModalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    alignItems: 'center',
  },
  closeReceiptButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  closeReceiptButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Sidebar Styles
  sidebarBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 1000,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 350,
    height: '100%',
    backgroundColor: '#111111',
    zIndex: 1001,
    elevation: 10,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sidebarTitleContainer: {
    flex: 1,
  },
  sidebarTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  sidebarSubtitle: {
    color: '#9ca3af',
    fontSize: 14,
  },
  sidebarCloseButton: {
    backgroundColor: '#374151',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sidebarCloseButtonText: {
    color: '#ffffff',
    fontSize: 18,
  },
  sidebarFeaturesList: {
    flex: 1,
    padding: 16,
  },
  sidebarFeaturesSection: {
    marginBottom: 20,
  },
  sidebarSectionTitle: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 1,
  },
  sidebarFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  sidebarFeatureIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sidebarFeatureIconText: {
    fontSize: 20,
  },
  sidebarFeatureContent: {
    flex: 1,
  },
  sidebarFeatureTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  sidebarFeatureDescription: {
    color: '#9ca3af',
    fontSize: 12,
  },
  sidebarFeatureArrow: {
    color: '#6b7280',
    fontSize: 16,
  },
  sidebarFooter: {
    padding: 20,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  sidebarFooterText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  sidebarFooterDescription: {
    color: '#9ca3af',
    fontSize: 12,
  },
});

export default CashierSalesScreen;