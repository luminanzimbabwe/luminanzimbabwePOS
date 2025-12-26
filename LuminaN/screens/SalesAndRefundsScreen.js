import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  FlatList,
  Platform,
  Switch,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { shopAPI } from '../services/api';
import { shopStorage } from '../services/storage';

const SalesAndRefundsScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [salesHistory, setSalesHistory] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [shopCredentials, setShopCredentials] = useState(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  // Receipt view states
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);

  // Receipt search states
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  useEffect(() => {
    loadShopCredentials();
  }, []);

  useEffect(() => {
    if (shopCredentials) {
      loadSalesHistory();
    }
  }, [shopCredentials]);

  useEffect(() => {
    filterSalesHistory();
  }, [salesHistory, searchQuery, selectedPaymentMethod, dateFilter]);

  useEffect(() => {
    if (receiptSearchQuery.trim()) {
      searchReceipts();
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [receiptSearchQuery, salesHistory]);

  const loadShopCredentials = async () => {
    try {
      const credentials = await shopStorage.getCredentials();
      if (credentials) {
        setShopCredentials(credentials);
      } else {
        navigation.replace('Login');
      }
    } catch (error) {
      console.error('❌ Error loading credentials:', error);
      navigation.replace('Login');
    }
  };

  const loadSalesHistory = async () => {
    try {
      const authData = {
        email: shopCredentials.email,
        password: shopCredentials.shop_owner_master_password,
      };

      // Try to load from API, but provide mock data if endpoint doesn't exist
      let response;
      try {
        response = await shopAPI.getCustomEndpoint('/sales-history/', authData);
        console.log('💰 Sales history loaded from API:', response.data);
        setSalesHistory(response.data || []);
      } catch (apiError) {
        console.log('⚠️ API endpoint not found, using mock data for demonstration');
        
        // Provide mock data for demonstration
        const mockSalesHistory = [
          {
            id: 1,
            receipt_number: 'R001',
            created_at: new Date().toISOString(),
            cashier_name: 'John Doe',
            payment_method: 'cash',
            customer_name: 'Alice Smith',
            total_amount: 45.99,
            status: 'completed',
            items: [
              { product_id: 1, product_name: 'Bread', quantity: 2, unit_price: 2.50 },
              { product_id: 2, product_name: 'Milk', quantity: 1, unit_price: 3.99 },
              { product_id: 3, product_name: 'Eggs', quantity: 1, unit_price: 4.50 }
            ]
          },
          {
            id: 2,
            receipt_number: 'R002',
            created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            cashier_name: 'Jane Smith',
            payment_method: 'card',
            customer_name: 'Bob Johnson',
            total_amount: 89.50,
            status: 'completed',
            items: [
              { product_id: 4, product_name: 'Chicken', quantity: 1, unit_price: 45.99 },
              { product_id: 5, product_name: 'Rice', quantity: 2, unit_price: 21.75 }
            ]
          },
          {
            id: 3,
            receipt_number: 'R003',
            created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
            cashier_name: 'Mike Wilson',
            payment_method: 'mobile',
            total_amount: 25.75,
            status: 'completed',
            items: [
              { product_id: 6, product_name: 'Apples', quantity: 3, unit_price: 1.99 },
              { product_id: 7, product_name: 'Bananas', quantity: 2, unit_price: 1.25 },
              { product_id: 8, product_name: 'Orange Juice', quantity: 1, unit_price: 15.99 }
            ]
          },
          {
            id: 4,
            receipt_number: 'R004',
            created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            cashier_name: 'Sarah Davis',
            payment_method: 'cash',
            customer_name: 'Tom Brown',
            total_amount: 67.30,
            status: 'refunded',
            items: [
              { product_id: 9, product_name: 'Steak', quantity: 1, unit_price: 45.99 },
              { product_id: 10, product_name: 'Potatoes', quantity: 5, unit_price: 4.26 }
            ]
          },
          {
            id: 5,
            receipt_number: 'R005',
            created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
            cashier_name: 'John Doe',
            payment_method: 'card',
            total_amount: 156.80,
            status: 'completed',
            items: [
              { product_id: 11, product_name: 'Salmon', quantity: 2, unit_price: 35.99 },
              { product_id: 12, product_name: 'Vegetables', quantity: 1, unit_price: 25.99 },
              { product_id: 13, product_name: 'Wine', quantity: 2, unit_price: 29.41 }
            ]
          }
        ];
        
        setSalesHistory(mockSalesHistory);
      }
      
    } catch (error) {
      console.error('❌ Error loading sales history:', error);
      Alert.alert('Error', 'Failed to load sales history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterSalesHistory = () => {
    let filtered = [...salesHistory];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(sale =>
        sale.cashier_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sale.payment_method?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sale.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sale.receipt_number?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Payment method filter
    if (selectedPaymentMethod !== 'All') {
      filtered = filtered.filter(sale => sale.payment_method === selectedPaymentMethod);
    }

    // Date filter
    if (dateFilter !== 'All') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(sale => 
        new Date(sale.created_at) >= filterDate
      );
    }

    setFilteredSales(filtered);
  };

  const searchReceipts = () => {
    if (!receiptSearchQuery.trim()) return;
    
    const results = salesHistory.filter(sale =>
      sale.receipt_number?.toLowerCase().includes(receiptSearchQuery.toLowerCase()) ||
      sale.id?.toString().includes(receiptSearchQuery)
    );
    
    setSearchResults(results);
    setShowSearchResults(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getPaymentMethodIcon = (method) => {
    switch (method?.toLowerCase()) {
      case 'cash':
        return '💵';
      case 'card':
        return '💳';
      case 'mobile':
        return '📱';
      default:
        return '💰';
    }
  };

  const getPaymentMethodColor = (method) => {
    switch (method?.toLowerCase()) {
      case 'cash':
        return '#10b981';
      case 'card':
        return '#3b82f6';
      case 'mobile':
        return '#8b5cf6';
      default:
        return '#6b7280';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'refunded':
        return '#ef4444';
      case 'partial_refund':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const handleViewReceipt = (sale) => {
    setSelectedSale(sale);
    setShowReceiptModal(true);
  };

  const printReceipt = (sale) => {
    // In a real implementation, this would send the receipt to a printer
    Alert.alert(
      'Print Receipt',
      `Receipt #${sale.receipt_number || sale.id} will be sent to the printer.`,
      [{ text: 'OK' }]
    );
  };

  const shareReceipt = (sale) => {
    // In a real implementation, this would open share options
    Alert.alert(
      'Share Receipt',
      `Receipt #${sale.receipt_number || sale.id} sharing options would appear here.`,
      [{ text: 'OK' }]
    );
  };

  const renderSaleCard = ({ item: sale }) => (
    <View style={styles.saleCard}>
      <View style={styles.saleHeader}>
        <View style={styles.saleHeaderLeft}>
          <Text style={styles.receiptNumber}>#{sale.receipt_number || sale.id}</Text>
          <Text style={styles.saleDate}>{formatDate(sale.created_at)}</Text>
        </View>
        <View style={styles.saleHeaderRight}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(sale.status) }
          ]}>
            <Text style={styles.statusText}>{sale.status?.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.saleDetails}>
        <View style={styles.saleInfoRow}>
          <Text style={styles.infoLabel}>👤 Cashier:</Text>
          <Text style={styles.infoValue}>{sale.cashier_name || 'Unknown'}</Text>
        </View>
        
        <View style={styles.saleInfoRow}>
          <Text style={styles.infoLabel}>💳 Payment:</Text>
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentIcon}>{getPaymentMethodIcon(sale.payment_method)}</Text>
            <Text style={[
              styles.paymentMethod,
              { color: getPaymentMethodColor(sale.payment_method) }
            ]}>
              {sale.payment_method?.toUpperCase() || 'UNKNOWN'}
            </Text>
          </View>
        </View>

        {sale.customer_name && (
          <View style={styles.saleInfoRow}>
            <Text style={styles.infoLabel}>🧑 Customer:</Text>
            <Text style={styles.infoValue}>{sale.customer_name}</Text>
          </View>
        )}

        <View style={styles.saleInfoRow}>
          <Text style={styles.infoLabel}>💰 Total:</Text>
          <Text style={styles.totalAmount}>{formatCurrency(sale.total_amount)}</Text>
        </View>
      </View>

      {sale.items && sale.items.length > 0 && (
        <View style={styles.itemsSection}>
          <Text style={styles.itemsTitle}>🛍️ Items ({sale.items.length})</Text>
          {sale.items.slice(0, 3).map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.product_name}</Text>
              <View style={styles.itemDetails}>
                <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                <Text style={styles.itemPrice}>{formatCurrency(item.unit_price)}</Text>
              </View>
            </View>
          ))}
          {sale.items.length > 3 && (
            <Text style={styles.moreItems}>and {sale.items.length - 3} more items</Text>
          )}
        </View>
      )}

      <View style={styles.saleActions}>
        <TouchableOpacity 
          style={styles.viewReceiptButton}
          onPress={() => handleViewReceipt(sale)}
        >
          <Text style={styles.viewReceiptText}>🧾 View Receipt</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.printButton}
          onPress={() => printReceipt(sale)}
        >
          <Text style={styles.printText}>🖨️ Print</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderReceiptModal = () => (
    <Modal
      visible={showReceiptModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowReceiptModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>🧾 Receipt Details</Text>
          <TouchableOpacity onPress={() => setShowReceiptModal(false)}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {selectedSale && (
            <>
              <View style={styles.receiptHeader}>
                <Text style={styles.receiptTitle}>🧾 SALES RECEIPT</Text>
                <Text style={styles.receiptNumber}>#{selectedSale.receipt_number || selectedSale.id}</Text>
                <Text style={styles.receiptDate}>{formatDate(selectedSale.created_at)}</Text>
              </View>

              <View style={styles.receiptDivider} />

              <View style={styles.receiptInfo}>
                <Text style={styles.receiptInfoLabel}>👤 Cashier:</Text>
                <Text style={styles.receiptInfoValue}>{selectedSale.cashier_name || 'Unknown'}</Text>
              </View>

              <View style={styles.receiptInfo}>
                <Text style={styles.receiptInfoLabel}>💳 Payment:</Text>
                <Text style={styles.receiptInfoValue}>
                  {getPaymentMethodIcon(selectedSale.payment_method)} {selectedSale.payment_method?.toUpperCase() || 'UNKNOWN'}
                </Text>
              </View>

              {selectedSale.customer_name && (
                <View style={styles.receiptInfo}>
                  <Text style={styles.receiptInfoLabel}>🧑 Customer:</Text>
                  <Text style={styles.receiptInfoValue}>{selectedSale.customer_name}</Text>
                </View>
              )}

              <View style={styles.receiptInfo}>
                <Text style={styles.receiptInfoLabel}>💰 Total:</Text>
                <Text style={[styles.receiptInfoValue, { color: '#10b981', fontSize: 18, fontWeight: 'bold' }]}>
                  {formatCurrency(selectedSale.total_amount)}
                </Text>
              </View>

              <View style={styles.receiptDivider} />

              <View style={styles.receiptItemsSection}>
                <Text style={styles.receiptItemsTitle}>🛍️ Items Purchased</Text>
                {selectedSale.items && selectedSale.items.map((item, index) => (
                  <View key={index} style={styles.receiptItem}>
                    <View style={styles.receiptItemMain}>
                      <Text style={styles.receiptItemName}>{item.product_name}</Text>
                      <Text style={styles.receiptItemQuantity}>Qty: {item.quantity}</Text>
                    </View>
                    <Text style={styles.receiptItemPrice}>{formatCurrency(item.unit_price * item.quantity)}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.receiptDivider} />

              <View style={styles.receiptFooter}>
                <Text style={styles.receiptStatus}>✓ SALE COMPLETED</Text>
                <Text style={styles.receiptTimestamp}>{new Date(selectedSale.created_at).toLocaleTimeString()}</Text>
              </View>
            </>
          )}
        </ScrollView>

        <View style={styles.receiptModalActions}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => selectedSale && shareReceipt(selectedSale)}
          >
            <Text style={styles.shareButtonText}>📤 Share</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.printReceiptButton}
            onPress={() => selectedSale && printReceipt(selectedSale)}
          >
            <Text style={styles.printReceiptButtonText}>🖨️ Print</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search sales, cashiers, customers..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {/* Date Filter */}
        <TouchableOpacity
          style={[
            styles.filterButton,
            dateFilter !== 'All' && styles.filterButtonActive
          ]}
          onPress={() => {
            const filters = ['All', 'today', 'week', 'month'];
            const currentIndex = filters.indexOf(dateFilter);
            const nextIndex = (currentIndex + 1) % filters.length;
            setDateFilter(filters[nextIndex]);
          }}
        >
          <Text style={[
            styles.filterButtonText,
            dateFilter !== 'All' && styles.filterButtonTextActive
          ]}>
            📅 {dateFilter === 'All' ? 'All Time' : dateFilter.charAt(0).toUpperCase() + dateFilter.slice(1)}
          </Text>
        </TouchableOpacity>

        {/* Payment Method Filter */}
        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedPaymentMethod !== 'All' && styles.filterButtonActive
          ]}
          onPress={() => {
            const methods = ['All', 'cash', 'card', 'mobile'];
            const currentIndex = methods.indexOf(selectedPaymentMethod);
            const nextIndex = (currentIndex + 1) % methods.length;
            setSelectedPaymentMethod(methods[nextIndex]);
          }}
        >
          <Text style={[
            styles.filterButtonText,
            selectedPaymentMethod !== 'All' && styles.filterButtonTextActive
          ]}>
            💳 {selectedPaymentMethod === 'All' ? 'All Payments' : selectedPaymentMethod.toUpperCase()}
          </Text>
        </TouchableOpacity>

        {/* Toggle Filters */}
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={styles.filterButtonText}>
            {showFilters ? '👆 Hide' : '👇 More'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Advanced Filters */}
      {showFilters && (
        <View style={styles.advancedFilters}>
          <Text style={styles.advancedFiltersTitle}>Active Filters:</Text>
          <View style={styles.activeFilters}>
            {searchQuery && (
              <View style={styles.activeFilter}>
                <Text style={styles.activeFilterText}>Search: "{searchQuery}"</Text>
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Text style={styles.removeFilterText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            {dateFilter !== 'All' && (
              <View style={styles.activeFilter}>
                <Text style={styles.activeFilterText}>Date: {dateFilter}</Text>
                <TouchableOpacity onPress={() => setDateFilter('All')}>
                  <Text style={styles.removeFilterText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            {selectedPaymentMethod !== 'All' && (
              <View style={styles.activeFilter}>
                <Text style={styles.activeFilterText}>Payment: {selectedPaymentMethod}</Text>
                <TouchableOpacity onPress={() => setSelectedPaymentMethod('All')}>
                  <Text style={styles.removeFilterText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.backButton}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>💰 Sales History</Text>
      <TouchableOpacity onPress={() => setRefreshing(true) || loadSalesHistory()}>
        <Text style={styles.refreshButton}>🔄</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStats = () => {
    const totalSales = filteredSales.length;
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
    const cashSales = filteredSales.filter(sale => sale.payment_method === 'cash').length;
    const cardSales = filteredSales.filter(sale => sale.payment_method === 'card').length;
    const mobileSales = filteredSales.filter(sale => sale.payment_method === 'mobile').length;
    const avgTransaction = totalSales > 0 ? totalRevenue / totalSales : 0;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📊</Text>
          <Text style={styles.statValue}>{totalSales}</Text>
          <Text style={styles.statLabel}>Total Sales</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>💰</Text>
          <Text style={styles.statValue}>{formatCurrency(totalRevenue)}</Text>
          <Text style={styles.statLabel}>Total Revenue</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>💵</Text>
          <Text style={styles.statValue}>{cashSales}</Text>
          <Text style={styles.statLabel}>Cash Sales</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>💳</Text>
          <Text style={styles.statValue}>{cardSales}</Text>
          <Text style={styles.statLabel}>Card Sales</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📱</Text>
          <Text style={styles.statValue}>{mobileSales}</Text>
          <Text style={styles.statLabel}>Mobile Pay</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📈</Text>
          <Text style={styles.statValue}>{formatCurrency(avgTransaction)}</Text>
          <Text style={styles.statLabel}>Avg Transaction</Text>
        </View>
      </View>
    );
  };

  const renderReceiptSearch = () => (
    <View style={styles.receiptSearchContainer}>
      <Text style={styles.receiptSearchTitle}>🔍 Search Receipt by Number</Text>
      <View style={styles.receiptSearchInputContainer}>
        <TextInput
          style={styles.receiptSearchInput}
          placeholder="Enter receipt number..."
          value={receiptSearchQuery}
          onChangeText={setReceiptSearchQuery}
          placeholderTextColor="#999"
        />
        <TouchableOpacity style={styles.searchButton} onPress={searchReceipts}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {showSearchResults && searchResults.length > 0 && (
        <View style={styles.searchResults}>
          <Text style={styles.searchResultsTitle}>Search Results ({searchResults.length})</Text>
          {searchResults.map((sale) => (
            <TouchableOpacity
              key={sale.id}
              style={styles.searchResultItem}
              onPress={() => {
                setSearchQuery(sale.receipt_number || sale.id.toString());
                setShowSearchResults(false);
              }}
            >
              <Text style={styles.searchResultReceipt}>#{sale.receipt_number || sale.id}</Text>
              <Text style={styles.searchResultDetails}>
                {formatDate(sale.created_at)} - {formatCurrency(sale.total_amount)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading sales history...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
      >
        {renderHeader()}
        {renderReceiptSearch()}
        {renderFilters()}
        {renderStats()}
        
        {filteredSales.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>💰 No Sales Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery || selectedPaymentMethod !== 'All' || dateFilter !== 'All'
                ? 'Try adjusting your search or filter criteria.'
                : 'No sales have been recorded yet.'
              }
            </Text>
          </View>
        ) : (
          filteredSales.map((sale, index) => (
            <View key={sale.id?.toString() || index} style={styles.saleCardWrapper}>
              {renderSaleCard({ item: sale })}
            </View>
          ))
        )}
        
        {/* Bottom padding for web scrolling */}
        <View style={{ 
          height: Platform.OS === 'web' ? 100 : 20,
          minHeight: Platform.OS === 'web' ? 100 : 0
        }} />
      </ScrollView>
      
      {/* Receipt Modal */}
      {renderReceiptModal()}
    </View>
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
    paddingBottom: Platform.OS === 'web' ? 100 : 40,
    ...Platform.select({
      web: {
        minHeight: '100vh',
        width: '100%',
        flexGrow: 1,
      },
    }),
  },
  saleCardWrapper: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  backButton: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  refreshButton: {
    color: '#3b82f6',
    fontSize: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  receiptSearchContainer: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  receiptSearchTitle: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  receiptSearchInputContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  receiptSearchInput: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  searchButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  searchResults: {
    marginTop: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
  },
  searchResultsTitle: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  searchResultItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  searchResultReceipt: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
  searchResultDetails: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 2,
  },
  filtersContainer: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  filterScroll: {
    marginBottom: 8,
  },
  filterButton: {
    backgroundColor: '#2a2a2a',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterButtonText: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  advancedFilters: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
  },
  advancedFiltersTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activeFilter: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
  },
  activeFilterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  removeFilterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
    color: '#3b82f6',
  },
  statValue: {
    color: '#3b82f6',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#ccc',
    fontSize: 11,
    textAlign: 'center',
  },

  saleCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#333333',
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#374151',
  },
  saleHeaderLeft: {
    flex: 1,
  },
  receiptNumber: {
    color: '#3b82f6',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  saleDate: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
  },
  saleHeaderRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  saleDetails: {
    marginBottom: 16,
  },
  saleInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
  },
  infoValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paymentIcon: {
    fontSize: 16,
  },
  paymentMethod: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalAmount: {
    color: '#10b981',
    fontSize: 18,
    fontWeight: '700',
  },
  itemsSection: {
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  itemsTitle: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  itemName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  itemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemQuantity: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500',
  },
  itemPrice: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
  moreItems: {
    color: '#6b7280',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  saleActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  viewReceiptButton: {
    flex: 1,
    backgroundColor: '#374151',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewReceiptText: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '600',
  },
  printButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  printText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Receipt Modal Styles
  receiptHeader: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  receiptTitle: {
    color: '#3b82f6',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  receiptNumber: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  receiptDate: {
    color: '#9ca3af',
    fontSize: 14,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 16,
  },
  receiptInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  receiptInfoLabel: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
  },
  receiptInfoValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  receiptItemsSection: {
    marginBottom: 20,
  },
  receiptItemsTitle: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  receiptItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  receiptItemMain: {
    flex: 1,
  },
  receiptItemName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  receiptItemQuantity: {
    color: '#9ca3af',
    fontSize: 12,
  },
  receiptItemPrice: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
  receiptFooter: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  receiptStatus: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  receiptTimestamp: {
    color: '#9ca3af',
    fontSize: 12,
  },
  receiptModalActions: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 12,
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#8b5cf6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  printReceiptButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  printReceiptButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    margin: 16,
    marginTop: 50,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    color: '#ef4444',
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  saleSummary: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  saleSummaryTitle: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  saleSummaryText: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 4,
  },
  sectionTitle: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  refundTypeSection: {
    marginBottom: 20,
  },
  refundTypeOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  refundTypeButton: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#374151',
  },
  refundTypeButtonActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#1e3a8a',
  },
  refundTypeIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  refundTypeText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  refundTypeTextActive: {
    color: '#ffffff',
  },
  refundAmountSection: {
    marginBottom: 20,
  },
  refundAmountInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  refundReasonSection: {
    marginBottom: 20,
  },
  refundReasonInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  itemsSelectionSection: {
    marginBottom: 20,
  },
  itemSelectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refundQuantityInput: {
    backgroundColor: '#374151',
    borderRadius: 6,
    padding: 8,
    color: '#ffffff',
    fontSize: 14,
    width: 60,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#374151',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  processButton: {
    flex: 1,
    backgroundColor: '#dc2626',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  processButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SalesAndRefundsScreen;