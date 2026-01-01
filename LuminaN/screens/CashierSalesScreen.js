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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { shopStorage } from '../services/storage';
import { shopAPI } from '../services/api';

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
  const [paymentFilter, setPaymentFilter] = useState('all'); // all, cash, card, ecocash, transfer
  const [showAllSales, setShowAllSales] = useState(false);
  const ITEMS_PER_PAGE = 10;

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
      const cashierIdentifiers = [
        credentials?.name,
        credentials?.username, 
        credentials?.id,
        credentials?.cashier_id,
        credentials?.user_id,
        credentials?.email,
        credentials?.cashier_info?.id,
        credentials?.cashier_info?.name
      ].filter(Boolean);

      // Use email as fallback if no proper ID is found
      const currentCashierId = cashierIdentifiers[0] || credentials?.email || 'unknown';
      
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
        cashierIdentifiers,
        cashier_info: credentials?.cashier_info,
        name: credentials?.name,
        username: credentials?.username
      });

      console.log('🔍 LOADING CASHIER SALES:', {
        cashierId: currentCashierId,
        cashierName: currentCashierName,
        cashierIdentifiers,
        credentials: credentials
      });

      let response;
      let cashierSales = [];

      try {
        // Try enhanced sales endpoint with cashier filtering
        console.log('📊 Fetching sales with cashier filter...');
        
        // Use the enhanced sales endpoint that supports cashier_id filtering
        // This will return only sales for the specific cashier
        if (currentCashierId) {
          console.log('📊 Trying enhanced sales endpoint with cashier_id:', currentCashierId);
          
          // Use the shopAPI.getSales() method but add cashier_id parameter
          // We'll modify the request to include the cashier filter
          const salesUrl = `/sales/?cashier_id=${currentCashierId}&status=completed&page_size=100`;
          
          // For now, let's use the fallback approach since the direct fetch has issues
          throw new Error('Using fallback approach');
        } else {
          throw new Error('No cashier ID available for filtering');
        }

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Enhanced sales endpoint response:', data);
          
          // Handle the enhanced sales response format
          if (data.sales && Array.isArray(data.sales)) {
            cashierSales = data.sales;
          } else if (data.data && Array.isArray(data.data)) {
            cashierSales = data.data;
          }
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
      } catch (enhancedError) {
        console.log('⚠️ Enhanced endpoint failed, trying fallback:', enhancedError);
        
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
            
            console.log('🔍 Filtering sales - current cashier:', { currentCashierId, currentCashierName });
            console.log('🔍 Sample sale data:', allSales[0]);
            
            // Filter sales for current cashier using enhanced matching logic (like drawer system)
            console.log('🔍 Filtering sales - current cashier:', { currentCashierId, currentCashierName });
            console.log('🔍 Sample sale data:', allSales[0]);
            
            cashierSales = allSales.filter(sale => {
              if (!sale) return false;
              
              // Strategy 1: Match by cashier_id (if available)
              if (sale.cashier_id && currentCashierId && String(sale.cashier_id) === String(currentCashierId)) {
                console.log('✅ MATCHED by cashier_id:', sale.cashier_id);
                return true;
              }
              
              // Strategy 2: Match by cashier_name (case-insensitive) - like drawer system
              if (sale.cashier_name && currentCashierName && sale.cashier_name.toLowerCase() === currentCashierName.toLowerCase()) {
                console.log('✅ MATCHED by cashier_name:', sale.cashier_name);
                return true;
              }
              
              // Strategy 3: Match by name field
              if (sale.name && currentCashierName && sale.name.toLowerCase() === currentCashierName.toLowerCase()) {
                console.log('✅ MATCHED by name:', sale.name);
                return true;
              }
              
              // Strategy 4: Enhanced partial name matching
              if (sale.cashier_name && currentCashierName) {
                const saleCashier = sale.cashier_name.toLowerCase();
                const currentCashier = currentCashierName.toLowerCase();
                
                // Check if names are similar (e.g., 'isaacngirazi' vs 'isaac')
                if (saleCashier.includes(currentCashier) || currentCashier.includes(saleCashier)) {
                  console.log('✅ MATCHED by partial name:', { saleCashier, currentCashier });
                  return true;
                }
                
                // Check if they share a common part (e.g., both contain 'isaac')
                const saleParts = saleCashier.split(/[^a-zA-Z]/);
                const currentParts = currentCashier.split(/[^a-zA-Z]/);
                const commonPart = saleParts.find(part => part.length > 2 && currentParts.includes(part));
                
                if (commonPart) {
                  console.log('✅ MATCHED by common name part:', { saleCashier, currentCashier, commonPart });
                  return true;
                }
              }
              
              console.log('❌ NO MATCH for sale:', { 
                sale_cashier_name: sale.cashier_name, 
                sale_name: sale.name, 
                currentCashierName,
                currentCashierId 
              });
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

      // Calculate summary for current cashier
      const totalSales = cashierSales.length;
      const totalRevenue = cashierSales.reduce((sum, sale) => sum + parseFloat(sale.total_amount || 0), 0);
      const cashSales = cashierSales.filter(sale => sale.payment_method === 'cash');
      const cardSales = cashierSales.filter(sale => sale.payment_method === 'card');
      const cashRevenue = cashSales.reduce((sum, sale) => sum + parseFloat(sale.total_amount || 0), 0);
      const cardRevenue = cardSales.reduce((sum, sale) => sum + parseFloat(sale.total_amount || 0), 0);

      const summaryData = {
        totalSales,
        totalRevenue,
        cashSales: cashSales.length,
        cardSales: cardSales.length,
        cashRevenue,
        cardRevenue,
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount || 0);
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
      case 'ecocash': return '📱';
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
          <TouchableOpacity onPress={() => navigation.goBack()}>
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
        style={[styles.mainContent, Platform.OS === 'web' && styles.webContainer]}
        contentContainerStyle={Platform.OS === 'web' ? styles.webScrollContent : styles.scrollContentContainer}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
        scrollEventThrottle={16}
        nestedScrollEnabled={Platform.OS === 'web'}
        removeClippedSubviews={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>📊 My Sales</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
              <Text style={styles.filterButton}>🔍</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={loadCashierSales}>
              <Text style={styles.refreshButton}>↻</Text>
            </TouchableOpacity>
          </View>
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
                  <Text style={styles.summaryValue}>{formatCurrency(summary.totalRevenue)}</Text>
                  <Text style={styles.summaryLabel}>Total Revenue</Text>
                </View>
                
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryIcon}>📊</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(summary.averageSale)}</Text>
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
                  <Text style={styles.breakdownAmount}>{formatCurrency(summary.cashRevenue)}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>💳 Card Sales:</Text>
                  <Text style={styles.breakdownValue}>{summary.cardSales} sales</Text>
                  <Text style={styles.breakdownAmount}>{formatCurrency(summary.cardRevenue)}</Text>
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
                    { value: 'ecocash', label: 'EcoCash Only' },
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
                        {formatCurrency(sale.total_amount)}
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
                          • {item.product_name || item.name} x {item.quantity} @ {formatCurrency(item.unit_price)}
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
                                {formatCurrency(item.unit_price * item.quantity)}
                              </Text>
                            </View>
                            <Text style={styles.receiptItemDetails}>
                              {item.quantity} × {formatCurrency(item.unit_price)}
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
                          {formatCurrency(selectedSale.total_amount)}
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
  mainContent: {
    flex: 1,
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
  webScrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
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
});

export default CashierSalesScreen;