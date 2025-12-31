import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DatePicker from 'react-native-datepicker';
import { shopAPI } from '../services/api';
import refundService from '../services/refundService';

const SalesLedgerScreen = () => {
  const navigation = useNavigation();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalSales, setTotalSales] = useState(0);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCashier, setSelectedCashier] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('completed');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  
  // Advanced POS features
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedSales, setSelectedSales] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  
  // Financial summary
  const [financialSummary, setFinancialSummary] = useState({
    totalCostPrice: 0,
    totalSellingPrice: 0,
    netRevenue: 0,
    totalRefunds: 0,
    refundCount: 0,
    totalMargin: 0,
    marginPercentage: 0,
  });

  useEffect(() => {
    console.log('🚀 Initializing SalesLedgerScreen...');
    fetchSales(true);
  }, []);
  


  const fetchSales = async (reset = false) => {
    if (loading) return;
    
    try {
      setLoading(true);
      const currentPage = reset ? 1 : page;
      
      console.log('📊 Fetching sales from backend API...', { currentPage, reset });
      
      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        page_size: '20',
      });
      
      if (searchQuery) params.append('search', searchQuery);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (selectedCashier) params.append('cashier_id', selectedCashier);
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedPaymentMethod) params.append('payment_method', selectedPaymentMethod);
      
      try {
        // Try to fetch from real backend with timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('API timeout')), 5000)
        );
        
        const apiPromise = shopAPI.getAnonymousEndpoint(`/sales/?${params}`);
        const response = await Promise.race([apiPromise, timeoutPromise]);
        const apiData = response.data;
        console.log('✅ Real sales data fetched:', apiData);
        
        // Transform API data to match component format
        const salesArray = apiData.sales || apiData.results || apiData || [];
        // First, get refund status for all sales to avoid multiple async calls
        const refundStatus = await refundService.loadRefundStatus();
        
        const transformedSales = salesArray.map((sale, index) => {
          const totalAmount = parseFloat(sale.total_amount) || 0;
          
          // Enhanced cost price calculation
          let costPrice = 0;
          if (sale.cost_price !== undefined && sale.cost_price !== null) {
            costPrice = parseFloat(sale.cost_price) || 0;
          } else if (sale.cost !== undefined && sale.cost !== null) {
            costPrice = parseFloat(sale.cost) || 0;
          } else if (sale.items && sale.items.length > 0) {
            // Calculate from items if available
            costPrice = sale.items.reduce((itemSum, item) => {
              const itemCost = parseFloat(item.cost_price) || parseFloat(item.cost) || 0;
              const quantity = parseFloat(item.quantity) || 1;
              return itemSum + (itemCost * quantity);
            }, 0);
          }
          
          const marginAmount = parseFloat(sale.margin_amount) || (totalAmount - costPrice);
          const marginPercentage = parseFloat(sale.margin_percentage) || (costPrice > 0 ? (marginAmount / costPrice) * 100 : (totalAmount > 0 ? (marginAmount / totalAmount) * 100 : 0));
          
          // Fix: Check refund status synchronously using the loaded data
          const saleId = sale.id || sale.receipt_number;
          const isRefunded = !!(refundStatus[saleId] && refundStatus[saleId].refunded);
          
          // Debug transformation for R005
          if (sale.receipt_number === 'R005' || sale.id === 5) {
            console.log('🔍 TRANSFORMING SALE R005:', {
              original: sale,
              totalAmount,
              costPrice,
              marginAmount,
              marginPercentage,
              items: sale.items
            });
          }
          
          return {
            id: sale.id || index + 1,
            receipt_number: sale.receipt_number || `R${(sale.id || index + 1).toString().padStart(6, '0')}`,
            created_at: sale.created_at || new Date().toISOString(),
            cashier_name: sale.cashier_name || 'Unknown Cashier',
            customer_name: sale.customer_name || '',
            total_amount: totalAmount,
            cost_price: costPrice,
            margin_amount: marginAmount,
            margin_percentage: marginPercentage,
            payment_method: sale.payment_method || 'cash',
            currency: sale.currency || 'USD',
            status: isRefunded ? 'refunded' : (sale.status || 'completed'),
            item_count: sale.item_count || (sale.items ? sale.items.length : 1),
            items: sale.items || [],
            is_refunded: isRefunded
          };
        });
        
        console.log('✅ Transformed sales data:', transformedSales.length, 'sales');
        
        if (reset) {
          setSales(transformedSales);
          setPage(2);
        } else {
          setSales(prev => [...prev, ...transformedSales]);
          setPage(prev => prev + 1);
        }
        
        setHasMore(apiData.pagination?.has_more || (salesArray && salesArray.length === 20));
        setTotalSales(apiData.pagination?.total || salesArray?.length || transformedSales.length);
        
        // Calculate real financial summary from API data with refund adjustments
        const refundStats = refundService.getRefundStats();
        
        console.log('🔍 SALES LEDGER CALCULATION DEBUG:', {
          salesArrayLength: salesArray.length,
          sampleSale: salesArray[0],
          refundStats
        });
        
        const totals = salesArray.reduce((acc, sale) => {
          // Fix: Check refund status synchronously using the loaded data
          const saleId = sale.id || sale.receipt_number;
          const isRefunded = !!(refundStatus[saleId] && refundStatus[saleId].refunded);
          
          // Enhanced cost price calculation - handle different field names
          let costPrice = 0;
          if (sale.cost_price !== undefined && sale.cost_price !== null) {
            costPrice = parseFloat(sale.cost_price) || 0;
          } else if (sale.cost !== undefined && sale.cost !== null) {
            costPrice = parseFloat(sale.cost) || 0;
          } else if (sale.items && sale.items.length > 0) {
            // Calculate from items if available
            costPrice = sale.items.reduce((itemSum, item) => {
              const itemCost = parseFloat(item.cost_price) || parseFloat(item.cost) || 0;
              const quantity = parseFloat(item.quantity) || 1;
              return itemSum + (itemCost * quantity);
            }, 0);
          }
          
          const sellingPrice = parseFloat(sale.total_amount) || 0;
          
          // Debug individual sale calculation
          if (sale.receipt_number === 'R005' || sale.id === 5) {
            console.log('🔍 SALE R005 CALCULATION:', {
              sale,
              isRefunded,
              costPrice,
              sellingPrice,
              calculatedMargin: sellingPrice - costPrice
            });
          }
          
          // Only include non-refunded sales in calculations
          if (!isRefunded) {
            acc.totalCostPrice += costPrice;
            acc.totalSellingPrice += sellingPrice;
            acc.totalRefunded += 0;
          } else {
            acc.totalRefunded += sellingPrice;
          }
          return acc;
        }, { totalCostPrice: 0, totalSellingPrice: 0, totalRefunded: 0 });
        
        const totalMargin = totals.totalSellingPrice - totals.totalCostPrice;
        const marginPercentage = totals.totalCostPrice > 0 
          ? (totalMargin / totals.totalCostPrice) * 100 
          : (totals.totalSellingPrice > 0 ? (totalMargin / totals.totalSellingPrice) * 100 : 0);
          
        console.log('✅ FINANCIAL TOTALS CALCULATED:', {
          totalCostPrice: totals.totalCostPrice,
          totalSellingPrice: totals.totalSellingPrice,
          totalMargin,
          marginPercentage,
          totalRefunded: totals.totalRefunded
        });
        
        setFinancialSummary({
          totalCostPrice: totals.totalCostPrice,
          totalSellingPrice: totals.totalSellingPrice,
          netRevenue: totals.totalSellingPrice,
          totalRefunds: totals.totalRefunded,
          refundCount: Object.keys(refundStats.refundsBySale || {}).length,
          totalMargin: totalMargin,
          marginPercentage: marginPercentage,
        });
        
        console.log('✅ Financial summary calculated:', {
          totalCostPrice: totals.totalCostPrice,
          totalSellingPrice: totals.totalSellingPrice,
          totalMargin: totalMargin,
          marginPercentage: marginPercentage
        });
        
      } catch (apiError) {
        console.error('❌ API not available:', apiError.message);
        
        // No demo data fallback - only real API data
        if (reset) {
          setSales([]);
          setPage(1);
        }
        setHasMore(false);
        
        // Set empty financial summary
        setFinancialSummary({
          totalCostPrice: 0,
          totalSellingPrice: 0,
          netRevenue: 0,
          totalRefunds: 0,
          refundCount: 0,
          totalMargin: 0,
          marginPercentage: 0,
        });
        
        Alert.alert(
          'Connection Error', 
          'Unable to connect to the server. Please check your internet connection and try again.',
          [{ text: 'Retry', onPress: () => fetchSales(true) }]
        );
      }
      
    } catch (error) {
      console.error('Error fetching sales:', error);
      Alert.alert('Error', 'Failed to load sales data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };





  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    fetchSales(true);
  }, []);
  


  const onEndReached = useCallback(() => {
    if (!loading && hasMore) {
      fetchSales(false);
    }
  }, [loading, hasMore]);

  const applyFilters = () => {
    setShowFilters(false);
    setPage(1);
    fetchSales(true);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setSelectedCashier('');
    setSelectedStatus('completed');
    setSelectedPaymentMethod('');
    setPage(1);
    fetchSales(true);
  };

  const viewSaleDetails = (sale) => {
    navigation.navigate('SalesAuditTrail', { saleId: sale.id });
  };

  const toggleSaleSelection = (saleId) => {
    setSelectedSales(prev => 
      prev.includes(saleId) 
        ? prev.filter(id => id !== saleId)
        : [...prev, saleId]
    );
  };

  const exportSales = (format) => {
    const dataToExport = selectedSales.length > 0 
      ? sales.filter(sale => selectedSales.includes(sale.id))
      : sales;
    
    if (format === 'csv') {
      const csvContent = generateCSV(dataToExport);
      downloadFile(csvContent, 'sales_export.csv', 'text/csv');
    } else if (format === 'pdf') {
      Alert.alert('Export', 'PDF export feature coming soon!');
    }
    
    setShowExportModal(false);
    setSelectedSales([]);
    setShowBulkActions(false);
  };

  const generateCSV = (salesData) => {
    const headers = ['Receipt #', 'Date', 'Cashier', 'Customer', 'Amount', 'Cost', 'Margin', 'Payment', 'Status'];
    const rows = salesData.map(sale => [
      sale.receipt_number,
      new Date(sale.created_at).toLocaleDateString(),
      sale.cashier_name,
      sale.customer_name || 'Walk-in',
      sale.total_amount.toFixed(2),
      sale.cost_price.toFixed(2),
      sale.margin_amount.toFixed(2),
      sale.payment_method,
      sale.status
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const downloadFile = (content, filename, mimeType) => {
    // For web - create download link
    if (Platform.OS === 'web') {
      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } else {
      // For mobile - would need react-native-fs or similar
      Alert.alert('Export', 'File download would be implemented with native modules');
    }
  };

  const deleteSelectedSales = () => {
    Alert.alert(
      'Delete Sales',
      `Are you sure you want to delete ${selectedSales.length} sale(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            // In real app, this would call API to delete
            setSales(prev => prev.filter(sale => !selectedSales.includes(sale.id)));
            setSelectedSales([]);
            setShowBulkActions(false);
            Alert.alert('Success', `${selectedSales.length} sale(s) deleted`);
          }
        }
      ]
    );
  };

  const renderSaleItem = ({ item }) => (
    <View style={[
      styles.saleCard,
      selectedSales.includes(item.id) && styles.saleCardSelected
    ]}>
      {/* Selection Checkbox */}
      <TouchableOpacity 
        style={styles.selectionCheckbox}
        onPress={() => toggleSaleSelection(item.id)}
      >
        <Icon 
          name={selectedSales.includes(item.id) ? 'check-box' : 'check-box-outline-blank'}
          size={20}
          color={selectedSales.includes(item.id) ? '#3b82f6' : '#64748b'}
        />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.saleCardContent}
        onPress={() => viewSaleDetails(item)}
        activeOpacity={0.7}
      >
        <View style={styles.saleHeader}>
          <View style={styles.receiptInfo}>
            <Text style={styles.receiptNumber}>{item.receipt_number}</Text>
            <Text style={styles.saleDate}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.amountInfo}>
            <Text style={styles.totalAmount}>${item.total_amount.toFixed(2)}</Text>
            <Text style={[
              styles.marginText,
              { color: item.margin_percentage >= 40 ? '#10b981' : item.margin_percentage >= 20 ? '#f59e0b' : '#ef4444' }
            ]}>
              {item.margin_percentage.toFixed(1)}% margin
            </Text>
          </View>
        </View>
        
        <View style={styles.saleDetails}>
          <View style={styles.detailRow}>
            <Icon name="person" size={16} color="#94a3b8" />
            <Text style={styles.detailText}>
              {item.customer_name || 'Walk-in Customer'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Icon name="storefront" size={16} color="#94a3b8" />
            <Text style={styles.detailText}>{item.cashier_name}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Icon name="shopping-cart" size={16} color="#94a3b8" />
            <Text style={styles.detailText}>
              {item.item_count} item{item.item_count > 1 ? 's' : ''} • {item.payment_method}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Icon name="attach-money" size={16} color="#94a3b8" />
            <Text style={styles.detailText}>
              Cost: ${item.cost_price.toFixed(2)} • Margin: ${item.margin_amount.toFixed(2)}
            </Text>
          </View>
        </View>
        
        <View style={styles.saleFooter}>
          <TouchableOpacity 
            style={styles.viewButton}
            onPress={() => viewSaleDetails(item)}
          >
            <Icon name="visibility" size={16} color="#3b82f6" />
            <Text style={styles.viewButtonText}>View Details</Text>
          </TouchableOpacity>
          
          <View style={[
            styles.statusBadge,
            { backgroundColor: item.status === 'completed' ? '#064e3b' : 
                             item.status === 'refunded' ? '#7f1d1d' : '#78350f' }
          ]}>
            <Text style={[
              styles.statusText,
              { color: item.status === 'completed' ? '#10b981' : 
                       item.status === 'refunded' ? '#ef4444' : '#f59e0b' }
            ]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderFilterModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowFilters(false)}>
            <Text style={styles.modalCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Filter Sales</Text>
          <TouchableOpacity onPress={applyFilters}>
            <Text style={styles.modalApply}>Apply</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          {/* Search */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Search</Text>
            <TextInput
              style={styles.filterInput}
              placeholder="Search by receipt, customer, or cashier"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          
          {/* Date Range */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Date Range</Text>
            <View style={styles.dateRow}>
              <DatePicker
                style={styles.datePicker}
                date={dateFrom}
                mode="date"
                placeholder="From Date"
                format="YYYY-MM-DD"
                onDateChange={setDateFrom}
              />
              <DatePicker
                style={styles.datePicker}
                date={dateTo}
                mode="date"
                placeholder="To Date"
                format="YYYY-MM-DD"
                onDateChange={setDateTo}
              />
            </View>
          </View>
          
          {/* Status */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Status</Text>
            <View style={styles.filterButtons}>
              {['completed', 'pending', 'refunded'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterButton,
                    selectedStatus === status && styles.filterButtonActive
                  ]}
                  onPress={() => setSelectedStatus(status)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    selectedStatus === status && styles.filterButtonTextActive
                  ]}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Payment Method */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Payment Method</Text>
            <View style={styles.filterButtons}>
              {['cash', 'card', 'ecocash', 'transfer'].map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.filterButton,
                    selectedPaymentMethod === method && styles.filterButtonActive
                  ]}
                  onPress={() => setSelectedPaymentMethod(
                    selectedPaymentMethod === method ? '' : method
                  )}
                >
                  <Text style={[
                    styles.filterButtonText,
                    selectedPaymentMethod === method && styles.filterButtonTextActive
                  ]}>
                    {method.charAt(0).toUpperCase() + method.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Clear Filters */}
          <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
            <Text style={styles.clearFiltersText}>Clear All Filters</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );

  const renderExportModal = () => (
    <Modal
      visible={showExportModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowExportModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowExportModal(false)}>
            <Text style={styles.modalCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Export Sales</Text>
          <TouchableOpacity onPress={() => setShowExportModal(false)}>
            <Text style={styles.modalApply}>Done</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Export Format</Text>
            <View style={styles.filterButtons}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  styles.filterButtonActive
                ]}
                onPress={() => exportSales('csv')}
              >
                <Icon name="description" size={20} color="#fff" />
                <Text style={[
                  styles.filterButtonText,
                  styles.filterButtonTextActive
                ]}>
                  CSV (Excel Compatible)
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => exportSales('pdf')}
              >
                <Icon name="picture-as-pdf" size={20} color="#64748b" />
                <Text style={styles.filterButtonText}>
                  PDF Report (Coming Soon)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Export Scope</Text>
            <View style={styles.exportScopeInfo}>
              <Text style={styles.exportScopeText}>
                {selectedSales.length > 0 
                  ? `${selectedSales.length} selected sale(s)` 
                  : `${sales.length} total sales`
                }
              </Text>
              {selectedSales.length === 0 && (
                <Text style={styles.exportHintText}>
                  💡 Tip: Select specific sales to export only those records
                </Text>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <>
      <ScrollView 
        style={[styles.container, Platform.OS === 'web' && styles.webContainer]}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={true}
        scrollEventThrottle={16}
        nestedScrollEnabled={Platform.OS === 'web'}
        removeClippedSubviews={false}
        onScroll={(event) => {
          if (Platform.OS === 'web') {
            const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
            const isAtBottom = contentOffset.y >= (contentSize.height - layoutMeasurement.height - 10);
          }
        }}
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
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
              <Icon name="refresh" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Ultimate Enterprise Command Center Header */}
        <View style={styles.ultimateHeader}>
          {/* Header Background Overlay */}
          <View style={styles.headerBackgroundOverlay} />
          
          {/* Command Center Badge */}
          <View style={styles.commandCenterBadge}>
            <Icon name="military-tech" size={20} color="#fbbf24" />
            <Text style={styles.commandCenterBadgeText}>COMMAND CENTER</Text>
          </View>
          
          {/* Main Title */}
          <Text style={styles.ultimateHeaderTitle}>🧾 Enterprise Sales Ledger</Text>
          
          {/* Subtitle with Enhanced Styling */}
          <View style={styles.ultimateHeaderSubtitleContainer}>
            <Icon name="psychology" size={16} color="#8b5cf6" />
            <Text style={styles.ultimateHeaderSubtitle}>Real-time Financial Command Center</Text>
            <Icon name="auto-awesome" size={16} color="#10b981" />
          </View>
          
          {/* Premium Growth Metrics */}
          <View style={styles.ultimateGrowthMetrics}>
            <View style={styles.growthMetricCard}>
              <View style={styles.growthMetricIconContainer}>
                <Icon name="attach-money" size={16} color="#10b981" />
              </View>
              <View style={styles.growthMetricContent}>
                <Text style={styles.growthMetricLabel}>Net Revenue</Text>
                <Text style={styles.growthMetricValue}>${(financialSummary.netRevenue || 0).toFixed(0)}</Text>
              </View>
              <View style={styles.growthTrendIndicator}>
                <Icon name="trending-up" size={14} color="#10b981" />
              </View>
            </View>
            
            <View style={styles.growthMetricCard}>
              <View style={styles.growthMetricIconContainer}>
                <Icon name="show-chart" size={16} color="#3b82f6" />
              </View>
              <View style={styles.growthMetricContent}>
                <Text style={styles.growthMetricLabel}>Total Margin</Text>
                <Text style={[styles.growthMetricValue, { color: (financialSummary.totalMargin || 0) >= 0 ? '#10b981' : '#ef4444' }]}>${(financialSummary.totalMargin || 0).toFixed(0)}</Text>
              </View>
              <View style={styles.growthTrendIndicator}>
                <Icon name={((financialSummary.totalMargin || 0) >= 0) ? "trending-up" : "trending-down"} size={14} color={(financialSummary.totalMargin || 0) >= 0 ? '#10b981' : '#ef4444'} />
              </View>
            </View>
          </View>
          
          {/* Real-time Status Indicator */}
          <View style={styles.realtimeStatus}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Live Ledger Active</Text>
            <Icon name="wifi" size={14} color="#10b981" />
          </View>
          
          {/* Performance Summary */}
          <View style={styles.performanceSummary}>
            <Text style={styles.performanceSummaryText}>
              💰 Enterprise Analytics • {sales.length} Transactions • {(financialSummary.marginPercentage || 0).toFixed(1)}% Margin
            </Text>
          </View>
        </View>

        {/* Enterprise Key Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Enterprise Financial Overview</Text>
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, { borderLeftColor: '#10b981' }]}>
              <View style={styles.metricHeader}>
                <Icon name="attach-money" size={24} color="#10b981" />
                <Text style={styles.metricTitle}>Net Revenue</Text>
              </View>
              <Text style={styles.metricValue}>${(financialSummary.netRevenue || 0).toLocaleString()}</Text>
              <Text style={styles.metricSubtitle}>After all adjustments</Text>
            </View>
            <View style={[styles.metricCard, { borderLeftColor: '#3b82f6' }]}>
              <View style={styles.metricHeader}>
                <Icon name="shopping-cart" size={24} color="#3b82f6" />
                <Text style={styles.metricTitle}>Total Sales</Text>
              </View>
              <Text style={styles.metricValue}>${(financialSummary.totalSellingPrice || 0).toLocaleString()}</Text>
              <Text style={styles.metricSubtitle}>Gross revenue</Text>
            </View>
            <View style={[styles.metricCard, { borderLeftColor: '#8b5cf6' }]}>
              <View style={styles.metricHeader}>
                <Icon name="trending-up" size={24} color="#8b5cf6" />
                <Text style={styles.metricTitle}>Total Margin</Text>
              </View>
              <Text style={[styles.metricValue, { color: (financialSummary.totalMargin || 0) >= 0 ? '#10b981' : '#ef4444' }]}>${(financialSummary.totalMargin || 0).toLocaleString()}</Text>
              <Text style={styles.metricSubtitle}>Profit amount</Text>
            </View>
            <View style={[styles.metricCard, { borderLeftColor: (financialSummary.marginPercentage || 0) >= 40 ? '#10b981' : (financialSummary.marginPercentage || 0) >= 20 ? '#f59e0b' : '#ef4444' }]}>
              <View style={styles.metricHeader}>
                <Icon name="percent" size={24} color={(financialSummary.marginPercentage || 0) >= 40 ? '#10b981' : (financialSummary.marginPercentage || 0) >= 20 ? '#f59e0b' : '#ef4444'} />
                <Text style={styles.metricTitle}>Margin %</Text>
              </View>
              <Text style={[styles.metricValue, { color: (financialSummary.marginPercentage || 0) >= 40 ? '#10b981' : (financialSummary.marginPercentage || 0) >= 20 ? '#f59e0b' : '#ef4444' }]}>{(financialSummary.marginPercentage || 0).toFixed(1)}%</Text>
              <Text style={styles.metricSubtitle}>Of total sales</Text>
            </View>
          </View>
        </View>

        {/* Enhanced Financial Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Detailed Financial Analysis</Text>
          <View style={styles.enhancedFinancialGrid}>
            <View style={styles.enhancedFinancialCard}>
              <View style={styles.enhancedFinancialHeader}>
                <Icon name="account-balance" size={20} color="#10b981" />
                <Text style={styles.enhancedFinancialTitle}>Cost Analysis</Text>
              </View>
              <Text style={styles.enhancedFinancialValue}>${(financialSummary.totalCostPrice || 0).toLocaleString()}</Text>
              <Text style={styles.enhancedFinancialSubtitle}>Total Cost Price</Text>
              <View style={styles.enhancedFinancialProgress}>
                <View style={styles.enhancedFinancialBarBg}>
                  <View style={[styles.enhancedFinancialBarFill, { width: `${Math.min(((financialSummary.totalCostPrice || 0) / (financialSummary.totalSellingPrice || 1)) * 100, 100)}%`, backgroundColor: '#3b82f6' }]} />
                </View>
                <Text style={styles.enhancedFinancialBarLabel}>{((financialSummary.totalCostPrice || 0) / (financialSummary.totalSellingPrice || 1) * 100).toFixed(1)}% of revenue</Text>
              </View>
            </View>
            
            <View style={styles.enhancedFinancialCard}>
              <View style={styles.enhancedFinancialHeader}>
                <Icon name="undo" size={20} color="#ef4444" />
                <Text style={styles.enhancedFinancialTitle}>Refund Impact</Text>
              </View>
              <Text style={styles.enhancedFinancialValue}>${(financialSummary.totalRefunds || 0).toLocaleString()}</Text>
              <Text style={styles.enhancedFinancialSubtitle}>Total Refunds</Text>
              <View style={styles.enhancedFinancialProgress}>
                <View style={styles.enhancedFinancialBarBg}>
                  <View style={[styles.enhancedFinancialBarFill, { width: `${Math.min(((financialSummary.totalRefunds || 0) / (financialSummary.totalSellingPrice || 1)) * 100, 100)}%`, backgroundColor: '#ef4444' }]} />
                </View>
                <Text style={styles.enhancedFinancialBarLabel}>{((financialSummary.totalRefunds || 0) / (financialSummary.totalSellingPrice || 1) * 100).toFixed(1)}% refund rate</Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Enhanced Search and Filter Bar */}
        <View style={styles.enhancedSearchBar}>
          <View style={styles.enhancedSearchInputContainer}>
            <Icon name="search" size={20} color="#94a3b8" />
            <TextInput
              style={styles.enhancedSearchInput}
              placeholder="Search sales ledger..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => {
                setPage(1);
                fetchSales(true);
              }}
            />
          </View>
          
          <View style={styles.enhancedActionButtons}>
            {selectedSales.length > 0 && (
              <TouchableOpacity 
                style={styles.enhancedBulkActionButton}
                onPress={() => setShowBulkActions(!showBulkActions)}
              >
                <Icon name="done-all" size={20} color="#10b981" />
                <Text style={styles.enhancedBulkActionText}>{selectedSales.length}</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.enhancedFilterButton}
              onPress={() => setShowFilters(true)}
            >
              <Icon name="filter-list" size={24} color="#ffffff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.enhancedExportButton}
              onPress={() => setShowExportModal(true)}
            >
              <Icon name="download" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Enhanced Bulk Actions Bar */}
        {showBulkActions && selectedSales.length > 0 && (
          <View style={styles.enhancedBulkActionsBar}>
            <View style={styles.enhancedBulkActionsHeader}>
              <Icon name="admin-panel-settings" size={18} color="#3b82f6" />
              <Text style={styles.enhancedBulkActionsTitle}>Bulk Operations ({selectedSales.length} selected)</Text>
            </View>
            <View style={styles.enhancedBulkActionsButtons}>
              <TouchableOpacity style={styles.enhancedBulkActionBtn} onPress={deleteSelectedSales}>
                <Icon name="delete" size={16} color="#ef4444" />
                <Text style={styles.enhancedBulkActionBtnText}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.enhancedBulkActionBtn} onPress={() => setShowExportModal(true)}>
                <Icon name="download" size={16} color="#10b981" />
                <Text style={styles.enhancedBulkActionBtnText}>Export</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.enhancedBulkActionBtn} onPress={() => setSelectedSales([])}>
                <Icon name="clear" size={16} color="#64748b" />
                <Text style={styles.enhancedBulkActionBtnText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Enhanced Empty State */}
        {sales.length === 0 && !loading ? (
          <View style={styles.enhancedEmptyState}>
            <View style={styles.enhancedEmptyStateIcon}>
              <Icon name="receipt" size={64} color="#64748b" />
            </View>
            <Text style={styles.enhancedEmptyStateText}>No sales found</Text>
            <Text style={styles.enhancedEmptyStateSubtext}>
              {searchQuery || dateFrom || dateTo ? 'Try adjusting your filters' : 'No sales data available from the server'}
            </Text>
            <View style={styles.enhancedEmptyStateActions}>
              <TouchableOpacity style={styles.enhancedRefreshButton} onPress={onRefresh}>
                <Icon name="refresh" size={20} color="#3b82f6" />
                <Text style={styles.enhancedRefreshButtonText}>Refresh Data</Text>
              </TouchableOpacity>
              {(searchQuery || dateFrom || dateTo) && (
                <TouchableOpacity style={styles.enhancedClearFiltersButton} onPress={clearFilters}>
                  <Icon name="filter-list" size={20} color="#f59e0b" />
                  <Text style={styles.enhancedClearFiltersButtonText}>Clear Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <>
          <FlatList
            data={sales}
            renderItem={renderSaleItem}
            keyExtractor={(item) => item.id.toString()}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loading && hasMore ? (
                <View style={styles.loadingFooter}>
                  <Text style={styles.loadingText}>Loading more sales...</Text>
                </View>
              ) : !hasMore && sales.length > 0 ? (
                <View style={styles.endFooter}>
                  <Text style={styles.endText}>No more sales to load</Text>
                </View>
              ) : (
                <View style={{ 
                  height: Platform.OS === 'web' ? 100 : 20,
                  minHeight: Platform.OS === 'web' ? 100 : 0
                }} />
              )
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
          
          {/* Bottom padding for web scrolling */}
          <View style={{ 
            height: Platform.OS === 'web' ? 100 : 20,
            minHeight: Platform.OS === 'web' ? 100 : 0
          }} />
          </>
        )}
      </ScrollView>
      
      {renderFilterModal()}
      {renderExportModal()}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
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
  headerWithBack: {
    backgroundColor: '#1e293b',
    padding: 16,
    paddingTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  refreshButton: {
    padding: 8,
  },

  // Ultimate Header Styles
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
    backgroundColor: '#10b981',
    marginRight: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#10b981',
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
  section: {
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    width: '48%',
    borderLeftWidth: 4,
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
    elevation: 4,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 12,
    color: '#e2e8f0',
    marginLeft: 8,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
  },

  // Enhanced Financial Grid Styles
  enhancedFinancialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  enhancedFinancialCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
    elevation: 4,
  },
  enhancedFinancialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  enhancedFinancialTitle: {
    fontSize: 14,
    color: '#e2e8f0',
    marginLeft: 8,
    fontWeight: '600',
  },
  enhancedFinancialValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  enhancedFinancialSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 12,
  },
  enhancedFinancialProgress: {
    marginBottom: 8,
  },
  enhancedFinancialBarBg: {
    height: 6,
    backgroundColor: '#374151',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  enhancedFinancialBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  enhancedFinancialBarLabel: {
    fontSize: 9,
    color: '#9ca3af',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Enhanced Search Bar Styles
  enhancedSearchBar: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    alignItems: 'center',
  },
  enhancedSearchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#475569',
  },
  enhancedSearchInput: {
    flex: 1,
    marginLeft: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
  },
  enhancedActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  enhancedBulkActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  enhancedBulkActionText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  enhancedFilterButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    elevation: 2,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  enhancedExportButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#7c3aed',
    elevation: 2,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  // Enhanced Bulk Actions Bar Styles
  enhancedBulkActionsBar: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  enhancedBulkActionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  enhancedBulkActionsTitle: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  enhancedBulkActionsButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  enhancedBulkActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#334155',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
  },
  enhancedBulkActionBtnText: {
    fontSize: 12,
    marginLeft: 6,
    color: '#e2e8f0',
    fontWeight: '500',
  },

  // Enhanced Empty State Styles
  enhancedEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 400,
  },
  enhancedEmptyStateIcon: {
    marginBottom: 24,
    opacity: 0.6,
  },
  enhancedEmptyStateText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginBottom: 8,
    textAlign: 'center',
  },
  enhancedEmptyStateSubtext: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    maxWidth: 300,
  },
  enhancedEmptyStateActions: {
    flexDirection: 'row',
    gap: 12,
  },
  enhancedRefreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  enhancedRefreshButtonText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
    marginLeft: 8,
  },
  enhancedClearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  enhancedClearFiltersButtonText: {
    fontSize: 14,
    color: '#f59e0b',
    fontWeight: '600',
    marginLeft: 8,
  },
  header: {
    backgroundColor: '#1e293b',
    padding: 16,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 16,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  detailSummaryContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  detailSummaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 8,
  },
  detailSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  detailSummaryLabel: {
    fontSize: 13,
    color: '#cbd5e1',
  },
  detailSummaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 8,
    fontSize: 16,
    color: '#ffffff',
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
  },
  listContent: {
    padding: 16,
  },
  saleCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
    elevation: 4,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  receiptInfo: {
    flex: 1,
  },
  receiptNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  saleDate: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 2,
  },
  amountInfo: {
    alignItems: 'flex-end',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  marginText: {
    fontSize: 12,
    marginTop: 2,
  },
  saleDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#e2e8f0',
    marginLeft: 8,
  },
  saleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
  },
  viewButtonText: {
    fontSize: 12,
    color: '#3b82f6',
    marginLeft: 4,
    fontWeight: '500',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  loadingFooter: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
  },
  endFooter: {
    padding: 20,
    alignItems: 'center',
  },
  endText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  modalCancel: {
    fontSize: 16,
    color: '#64748b',
  },
  modalApply: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  datePicker: {
    width: '48%',
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#64748b',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  clearFiltersButton: {
    padding: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '600',
  },
  
  // Advanced POS Feature Styles
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bulkActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#065f46',
    borderRadius: 8,
  },
  bulkActionText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  exportButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#7c3aed',
  },
  bulkActionsBar: {
    backgroundColor: '#1e293b',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  bulkActionsTitle: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  bulkActionsButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  bulkActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#334155',
    borderRadius: 6,
  },
  bulkActionBtnText: {
    fontSize: 12,
    marginLeft: 4,
    color: '#e2e8f0',
  },
  saleCardSelected: {
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  selectionCheckbox: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 1,
  },
  saleCardContent: {
    marginLeft: 40,
  },
  
  // Export Modal Styles
  exportScopeInfo: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  exportScopeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  exportHintText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },
  
  // Empty State Styles
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 300,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  refreshButtonText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default SalesLedgerScreen;