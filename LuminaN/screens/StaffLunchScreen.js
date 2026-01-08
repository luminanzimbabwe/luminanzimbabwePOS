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
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { shopStorage } from '../services/storage';
import { shopAPI } from '../services/api';
import Icon from 'react-native-vector-icons/MaterialIcons';

const StaffLunchScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [cashierData, setCashierData] = useState(null);
  const [shopData, setShopData] = useState(null);
  const [products, setProducts] = useState([]);
  
  // Staff lunch state
  const [lunchType, setLunchType] = useState('stock'); // 'stock' or 'cash'
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [cashAmount, setCashAmount] = useState('');
  const [lunchReason, setLunchReason] = useState('');
  const [staffName, setStaffName] = useState('');
  
  // UI state
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  
  // History state
  const [showHistory, setShowHistory] = useState(false);
  const [lunchHistory, setLunchHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilters, setHistoryFilters] = useState({
    staff_name: '',
    date_from: '',
    date_to: '',
    search: ''
  });

  // Error and Success Modal State
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultModalData, setResultModalData] = useState({
    type: 'success', // 'success' or 'error'
    title: '',
    message: '',
    details: ''
  });

  useEffect(() => {
    loadStaffData();
    loadProducts();
  }, []);

  // Filter products based on search
  useEffect(() => {
    if (products.length > 0 && searchQuery.trim()) {
      const filtered = products.filter(product =>
        product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.line_code?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [products, searchQuery]);

  const loadStaffData = async () => {
    try {
      const credentials = await shopStorage.getCredentials();
      if (!credentials) {
        navigation.replace('Login');
        return;
      }

      setCashierData(credentials);
      
      // Extract shop info using the same approach as CashierDashboardScreen
      const shopInfo = credentials.shop_info || credentials;
      const fullShopData = {
        ...shopInfo,
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
      
      setShopData(fullShopData);

      // Pre-fill staff name with current cashier name
      const currentCashierName = credentials?.cashier_info?.name || 
                                credentials?.name || 
                                credentials?.username || 
                                credentials?.cashier_name ||
                                (credentials?.email && credentials.email.split('@')[0]) ||
                                'Staff Member';
      setStaffName(currentCashierName);

    } catch (error) {
      console.error('Error loading staff data:', error);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await shopAPI.getProducts();
      
      if (response.data && Array.isArray(response.data)) {
        setProducts(response.data);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts([]);
      
      let errorMessage = 'Failed to load products';
      let errorDetails = '';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Check for network errors
      if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        errorMessage = 'Network Connection Failed';
        errorDetails = 'Cannot load products. Please check your internet connection.';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Server Not Available';
        errorDetails = 'Cannot connect to server. Please make sure the server is running.';
      }
      
      // Only show error modal if we're not in loading state for the main form
      // (products loading failure shouldn't block the entire screen)
      if (!loading) {
        setResultModalData({
          type: 'error',
          title: '❌ Products Load Failed',
          message: errorMessage,
          details: errorDetails || 'Please try refreshing the page.'
        });
        setShowResultModal(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadStaffLunchHistory = async () => {
    try {
      setHistoryLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      
      if (historyFilters.staff_name.trim()) {
        params.append('staff_name', historyFilters.staff_name.trim());
      }
      
      if (historyFilters.date_from.trim()) {
        params.append('date_from', historyFilters.date_from.trim());
      }
      
      if (historyFilters.date_to.trim()) {
        params.append('date_to', historyFilters.date_to.trim());
      }
      
      if (historyFilters.search.trim()) {
        params.append('search', historyFilters.search.trim());
      }
      
      const response = await shopAPI.getStaffLunchHistory(params.toString());
      
      if (response.data && response.data.success) {
        setLunchHistory(response.data.data || []);
      } else {
        setLunchHistory([]);
      }
    } catch (error) {
      console.error('Error loading staff lunch history:', error);
      setLunchHistory([]);
      
      let errorMessage = 'Failed to load staff lunch history';
      let errorDetails = '';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Check for network errors
      if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        errorMessage = 'Network Connection Failed';
        errorDetails = 'Cannot load history. Please check your internet connection.';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Server Not Available';
        errorDetails = 'Cannot connect to server. Please make sure the server is running.';
      }
      
      setResultModalData({
        type: 'error',
        title: '❌ History Load Failed',
        message: errorMessage,
        details: errorDetails || 'Please try refreshing the page or check your connection.'
      });
      setShowResultModal(true);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleHistoryFilterChange = (filterType, value) => {
    setHistoryFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const applyHistoryFilters = () => {
    loadStaffLunchHistory();
  };

  const clearHistoryFilters = () => {
    setHistoryFilters({
      staff_name: '',
      date_from: '',
      date_to: '',
      search: ''
    });
    loadStaffLunchHistory();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'No timestamp';
      
      // Handle different date formats
      let date;
      if (typeof dateString === 'string') {
        // If it's already in a readable format, use it directly
        if (dateString.includes('Time:')) {
          // Extract time from notes field
          const timeMatch = dateString.match(/Time: ([^,]+)/);
          if (timeMatch) {
            return timeMatch[1];
          }
        }
        date = new Date(dateString);
      } else {
        date = new Date(dateString);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Error formatting date';
    }
  };

  const addProductToLunch = (product) => {
    const existingIndex = selectedProducts.findIndex(p => p.id === product.id);
    
    if (existingIndex >= 0) {
      // Update quantity if product already selected
      const updatedProducts = [...selectedProducts];
      updatedProducts[existingIndex].quantity += 1;
      setSelectedProducts(updatedProducts);
    } else {
      // Add new product with quantity 1
      setSelectedProducts([...selectedProducts, { ...product, quantity: 1 }]);
    }
    
    Alert.alert(
      '✅ Product Added',
      `${product.name} added to staff lunch`,
      [{ text: 'OK', timeout: 1000 }]
    );
  };

  const updateProductQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      setSelectedProducts(selectedProducts.filter(p => p.id !== productId));
    } else {
      setSelectedProducts(selectedProducts.map(p => 
        p.id === productId ? { ...p, quantity: newQuantity } : p
      ));
    }
  };

  const removeProductFromLunch = (productId) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== productId));
  };

  const getTotalStockValue = () => {
    return selectedProducts.reduce((total, product) => {
      const quantity = product.price_type === 'unit' ? product.quantity : (product.quantity || 0);
      return total + (product.price * quantity);
    }, 0);
  };

  const validateForm = () => {
    const validationErrors = [];

    if (!staffName.trim()) {
      validationErrors.push('Staff member name is required');
    }

    if (!lunchReason.trim()) {
      validationErrors.push('Reason for staff lunch is required');
    }

    if (lunchType === 'stock' && selectedProducts.length === 0) {
      validationErrors.push('Please select at least one product for stock lunch');
    }

    if (lunchType === 'cash') {
      const amount = parseFloat(cashAmount);
      if (!cashAmount || isNaN(amount) || amount <= 0) {
        validationErrors.push('Please enter a valid cash amount greater than $0.00');
      }
    }

    // Check if any products have invalid quantities
    if (lunchType === 'stock') {
      const invalidProducts = selectedProducts.filter(product => 
        !product.quantity || product.quantity <= 0
      );
      if (invalidProducts.length > 0) {
        validationErrors.push('All selected products must have valid quantities');
      }
    }

    if (validationErrors.length > 0) {
      setResultModalData({
        type: 'error',
        title: '❌ Form Validation Failed',
        message: 'Please fix the following issues:',
        details: validationErrors.map((error, index) => `${index + 1}. ${error}`).join('\n')
      });
      setShowResultModal(true);
      return false;
    }

    return true;
  };

  const processStaffLunch = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const lunchData = {
        staff_name: staffName.trim(),
        lunch_type: lunchType,
        reason: lunchReason.trim(),
        cashier_name: cashierData?.cashier_info?.name || cashierData?.name || 'Unknown Cashier',
        timestamp: new Date().toISOString(),
      };

      if (lunchType === 'stock') {
        lunchData.products = selectedProducts.map(product => ({
          product_id: product.id.toString(),
          product_name: product.name,
          quantity: product.price_type === 'unit' ? product.quantity.toString() : (product.quantity || 0).toString(),
          unit_price: product.price.toString(),
          total_value: (product.price * (product.price_type === 'unit' ? product.quantity : (product.quantity || 0))).toString()
        }));
        lunchData.total_value = getTotalStockValue().toString();
      } else {
        lunchData.cash_amount = parseFloat(cashAmount).toString();
      }

      console.log('Processing staff lunch:', lunchData);

      // Call the API to process staff lunch
      const response = await shopAPI.createStaffLunch(lunchData);

      if (response.data) {
        // Show success modal
        setResultModalData({
          type: 'success',
          title: '✅ Staff Lunch Recorded Successfully!',
          message: `${lunchType === 'stock' ? 'Stock items' : 'Cash amount'} worth ${formatCurrency(lunchType === 'stock' ? getTotalStockValue() : parseFloat(cashAmount))} has been recorded for ${staffName}`,
          details: lunchType === 'stock' 
            ? `Products deducted from inventory and staff lunch record created.`
            : `Cash amount recorded as staff lunch expense.`
        });
        setShowResultModal(true);

        // Reset form after successful submission
        setSelectedProducts([]);
        setCashAmount('');
        setLunchReason('');
        
        // Refresh products to show updated stock
        if (lunchType === 'stock') {
          loadProducts();
        }
      }

    } catch (error) {
      console.error('Error processing staff lunch:', error);
      
      let errorMessage = 'Failed to process staff lunch';
      let errorDetails = '';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else {
          errorMessage = 'Server error occurred';
          errorDetails = JSON.stringify(error.response.data);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Check for specific network errors
      if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        errorMessage = 'Network Connection Failed';
        errorDetails = 'Please check your internet connection and try again.';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Server Not Available';
        errorDetails = 'Cannot connect to the server. Please make sure the server is running.';
      }

      // Show error modal
      setResultModalData({
        type: 'error',
        title: '❌ Staff Lunch Failed',
        message: errorMessage,
        details: errorDetails || 'Please check your input and try again.'
      });
      setShowResultModal(true);
    } finally {
      setLoading(false);
    }
  };

  const renderProductSelector = () => (
    <View style={styles.productSelectorContainer}>
      <View style={styles.productSelectorHeader}>
        <Text style={styles.productSelectorTitle}>Select Products for Staff Lunch</Text>
        <TouchableOpacity 
          style={styles.closeProductSelector}
          onPress={() => setShowProductSelector(false)}
        >
          <Text style={styles.closeProductSelectorText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search products..."
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* Products List */}
      <ScrollView style={styles.productsList}>
        {filteredProducts.map((product) => (
          <TouchableOpacity
            key={product.id}
            style={styles.productItem}
            onPress={() => addProductToLunch(product)}
          >
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productDetails}>
                {product.category} • {formatCurrency(product.price)}/{product.price_type}
              </Text>
              <Text style={[
                styles.stockInfo,
                (product.stock_quantity || 0) <= 0 && styles.outOfStock
              ]}>
                Stock: {product.stock_quantity || 0} {product.price_type}
                {(product.stock_quantity || 0) <= 0 && ' (Out of Stock)'}
              </Text>
            </View>
            <Text style={styles.addProductButton}>+ Add</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderHistoryView = () => {
    if (!showHistory) return null;

    return (
      <ScrollView 
        style={styles.historyScrollContainer}
        contentContainerStyle={styles.historyScrollContent}
        showsVerticalScrollIndicator={true}
        scrollEventThrottle={16}
        nestedScrollEnabled={Platform.OS === 'web'}
        removeClippedSubviews={false}
      >
        {/* History Header */}
        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>📋 Staff Lunch History</Text>
          <View style={styles.historyHeaderButtons}>
            <TouchableOpacity 
              style={[styles.refreshHistoryButton, historyLoading && styles.refreshButtonDisabled]}
              onPress={loadStaffLunchHistory}
              disabled={historyLoading}
            >
              <Text style={styles.refreshHistoryButtonText}>
                {historyLoading ? '⟳' : '↻'} Refresh
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.closeHistoryButton}
              onPress={() => setShowHistory(false)}
            >
              <Text style={styles.closeHistoryButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* History Filters */}
        <View style={styles.historyFilters}>
          <Text style={styles.historyFiltersTitle}>Filter History</Text>
          
          <View style={styles.filterRow}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Staff Name:</Text>
              <TextInput
                style={styles.filterInput}
                value={historyFilters.staff_name}
                onChangeText={(text) => handleHistoryFilterChange('staff_name', text)}
                placeholder="Search by staff name"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          <View style={styles.filterRow}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>From Date:</Text>
              <TextInput
                style={styles.filterInput}
                value={historyFilters.date_from}
                onChangeText={(text) => handleHistoryFilterChange('date_from', text)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>To Date:</Text>
              <TextInput
                style={styles.filterInput}
                value={historyFilters.date_to}
                onChangeText={(text) => handleHistoryFilterChange('date_to', text)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          <View style={styles.filterRow}>
            <View style={[styles.filterGroup, { flex: 1 }]}>
              <Text style={styles.filterLabel}>Search:</Text>
              <TextInput
                style={styles.filterInput}
                value={historyFilters.search}
                onChangeText={(text) => handleHistoryFilterChange('search', text)}
                placeholder="Search products or notes"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          <View style={styles.filterButtons}>
            <TouchableOpacity
              style={styles.applyFilterButton}
              onPress={applyHistoryFilters}
              disabled={historyLoading}
            >
              <Text style={styles.applyFilterButtonText}>Apply Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.clearFilterButton}
              onPress={clearHistoryFilters}
              disabled={historyLoading}
            >
              <Text style={styles.clearFilterButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* History List */}
        <View style={styles.historyListContainer}>
          {historyLoading ? (
            <View style={styles.historyLoading}>
              <ActivityIndicator size="large" color="#10b981" />
              <Text style={styles.historyLoadingText}>Loading history...</Text>
            </View>
          ) : lunchHistory.length === 0 ? (
            <View style={styles.historyEmpty}>
              <Text style={styles.historyEmptyText}>No staff lunch records found</Text>
              <Text style={styles.historyEmptySubtext}>
                Staff lunch history will appear here after you record some lunches
              </Text>
            </View>
          ) : (
            lunchHistory.map((lunch, index) => (
              <View key={lunch.id || index} style={styles.historyItem}>
                <View style={styles.historyItemHeader}>
                  <View style={styles.historyItemInfo}>
                    <Text style={styles.historyItemStaffName}>
                      {lunch.notes?.includes('Staff:') 
                        ? lunch.notes.match(/Staff:\s*([^,]+)/)?.[1] || 'Unknown Staff'
                        : 'Staff Member'
                      }
                    </Text>
                    <Text style={styles.historyItemDate}>
                      {formatDate(lunch.created_at || lunch.notes)}
                    </Text>
                    {/* Show exact time if available in notes */}
                    {lunch.notes?.includes('Time:') && (
                      <Text style={styles.historyItemTime}>
                        🕐 {lunch.notes.match(/Time: ([^,]+)/)?.[1] || ''}
                      </Text>
                    )}
                  </View>
                  <View style={styles.historyItemAmount}>
                    {/* For cash lunches, show the actual cash amount entered */}
                    {lunch.notes?.includes('CASH LUNCH') && lunch.notes?.includes('Amount:') ? (
                      <>
                        <Text style={styles.historyItemAmountText}>
                          {formatCurrency(parseFloat(lunch.notes.match(/Amount: \$([0-9.]+)/)?.[1] || '0'))}
                        </Text>
                        <Text style={styles.cashAmountDetail}>
                          💰 Cash Lunch
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.historyItemAmountText}>
                        {formatCurrency(lunch.total_cost)}
                      </Text>
                    )}
                  </View>
                </View>
                
                <View style={styles.historyItemDetails}>
                  <Text style={styles.historyItemProduct}>
                    📦 {lunch.product_name || 'Unknown Product'}
                  </Text>
                  <Text style={styles.historyItemQuantity}>
                    Quantity: {lunch.quantity} units
                  </Text>
                  {lunch.notes?.includes('Reason:') && (
                    <Text style={styles.historyItemReason}>
                      Reason: {lunch.notes.match(/Reason:\s*(.+)/)?.[1] || 'No reason provided'}
                    </Text>
                  )}
                  {lunch.recorded_by_name && (
                    <Text style={styles.historyItemRecordedBy}>
                      Recorded by: {lunch.recorded_by_name}
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 50 }} />
      </ScrollView>
    );
  };

  const renderNewLunchForm = () => {
    if (showHistory) return null;

    return (
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={true}
        scrollEventThrottle={16}
        nestedScrollEnabled={Platform.OS === 'web'}
        removeClippedSubviews={false}
      >
        {/* Lunch Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🥪 LUNCH TYPE</Text>
          <View style={styles.lunchTypeContainer}>
            <TouchableOpacity
              style={[
                styles.lunchTypeButton,
                lunchType === 'stock' && styles.lunchTypeButtonActive
              ]}
              onPress={() => setLunchType('stock')}
            >
              <Text style={[
                styles.lunchTypeText,
                lunchType === 'stock' && styles.lunchTypeTextActive
              ]}>
                📦 Take Stock Items
              </Text>
              <Text style={[
                styles.lunchTypeDescription,
                lunchType === 'stock' && styles.lunchTypeDescriptionActive
              ]}>
                Deduct products from inventory
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.lunchTypeButton,
                lunchType === 'cash' && styles.lunchTypeButtonActive
              ]}
              onPress={() => setLunchType('cash')}
            >
              <Text style={[
                styles.lunchTypeText,
                lunchType === 'cash' && styles.lunchTypeTextActive
              ]}>
                💰 Take Cash
              </Text>
              <Text style={[
                styles.lunchTypeDescription,
                lunchType === 'cash' && styles.lunchTypeDescriptionActive
              ]}>
                Deduct money from revenue
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Staff Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 STAFF INFORMATION</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Staff Member Name:</Text>
            <TextInput
              style={styles.textInput}
              value={staffName}
              onChangeText={setStaffName}
              placeholder="Enter staff member name"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Reason for Lunch:</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={lunchReason}
              onChangeText={setLunchReason}
              placeholder="e.g., Lunch break, Overtime meal, etc."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Stock Lunch - Product Selection */}
        {lunchType === 'stock' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📦 SELECT PRODUCTS</Text>
              <TouchableOpacity
                style={styles.addProductButton}
                onPress={() => setShowProductSelector(true)}
              >
                <Text style={styles.addProductButtonText}>+ Add Products</Text>
              </TouchableOpacity>
            </View>

            {selectedProducts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No products selected</Text>
                <Text style={styles.emptyStateSubtext}>
                  Tap "Add Products" to select items for staff lunch
                </Text>
              </View>
            ) : (
              <View style={styles.selectedProductsContainer}>
                {selectedProducts.map((product) => (
                  <View key={product.id} style={styles.selectedProductItem}>
                    <View style={styles.selectedProductInfo}>
                      <Text style={styles.selectedProductName}>{product.name}</Text>
                      <Text style={styles.selectedProductPrice}>
                        {formatCurrency(product.price)}/{product.price_type}
                      </Text>
                    </View>
                    <View style={styles.selectedProductControls}>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateProductQuantity(product.id, product.quantity - 1)}
                      >
                        <Text style={styles.quantityButtonText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.quantityText}>
                        {product.quantity} {product.price_type}
                      </Text>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateProductQuantity(product.id, product.quantity + 1)}
                      >
                        <Text style={styles.quantityButtonText}>+</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeProductFromLunch(product.id)}
                      >
                        <Text style={styles.removeButtonText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.productTotal}>
                      Total: {formatCurrency(product.price * product.quantity)}
                    </Text>
                  </View>
                ))}
                
                <View style={styles.totalSection}>
                  <Text style={styles.totalLabel}>Total Value:</Text>
                  <Text style={styles.totalAmount}>{formatCurrency(getTotalStockValue())}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Cash Lunch */}
        {lunchType === 'cash' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💰 CASH AMOUNT</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Cash Amount:</Text>
              <TextInput
                style={styles.textInput}
                value={cashAmount}
                onChangeText={setCashAmount}
                placeholder="0.00"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
              />
            </View>

            {cashAmount && !isNaN(parseFloat(cashAmount)) && parseFloat(cashAmount) > 0 && (
              <View style={styles.cashSummary}>
                <Text style={styles.cashSummaryText}>
                  💰 Cash Amount: {formatCurrency(parseFloat(cashAmount))}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Submit Button */}
        <View style={styles.submitSection}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled
            ]}
            onPress={processStaffLunch}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>
                ✅ Record Staff Lunch
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 50 }} />
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, Platform.OS === 'web' && styles.webContainer]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🍽️ Staff Lunch</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={[styles.refreshButton, loading && styles.refreshButtonDisabled]}
            onPress={() => {
              loadProducts();
              if (showHistory) {
                loadStaffLunchHistory();
              }
            }}
            disabled={loading}
          >
            <Text style={styles.refreshButtonText}>
              {loading ? '⟳' : '↻'} Refresh
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.historyToggleButton}
            onPress={() => {
              setShowHistory(!showHistory);
              if (!showHistory) {
                loadStaffLunchHistory();
              }
            }}
          >
            <Text style={styles.historyToggleButtonText}>
              {showHistory ? '📝 New Lunch' : '📋 History'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {showHistory ? renderHistoryView() : renderNewLunchForm()}

      {/* Product Selector Modal */}
      {showProductSelector && renderProductSelector()}

      {/* Success/Error Result Modal */}
      {showResultModal && (
        <View style={styles.modalOverlay}>
          <View style={[
            styles.resultModalContainer,
            resultModalData.type === 'success' ? styles.successModal : styles.errorModal
          ]}>
            <View style={styles.resultModalHeader}>
              <Text style={[
                styles.resultModalIcon,
                resultModalData.type === 'success' ? styles.successIcon : styles.errorIcon
              ]}>
                {resultModalData.type === 'success' ? '✅' : '❌'}
              </Text>
              <Text style={[
                styles.resultModalTitle,
                resultModalData.type === 'success' ? styles.successTitle : styles.errorTitle
              ]}>
                {resultModalData.title}
              </Text>
            </View>
            
            <View style={styles.resultModalBody}>
              <Text style={styles.resultModalMessage}>
                {resultModalData.message}
              </Text>
              {resultModalData.details && (
                <Text style={styles.resultModalDetails}>
                  {resultModalData.details}
                </Text>
              )}
            </View>
            
            <TouchableOpacity
              style={[
                styles.resultModalButton,
                resultModalData.type === 'success' ? styles.successButton : styles.errorButton
              ]}
              onPress={() => setShowResultModal(false)}
            >
              <Text style={styles.resultModalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
    paddingBottom: Platform.OS === 'web' ? 100 : 0,
    ...Platform.select({
      web: {
        minHeight: '100vh',
        width: '100%',
        flexGrow: 1,
      },
    }),
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#111111',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  refreshButtonDisabled: {
    backgroundColor: '#6b7280',
    opacity: 0.6,
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
  section: {
    backgroundColor: '#1f2937',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  lunchTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  lunchTypeButton: {
    flex: 1,
    backgroundColor: '#374151',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4b5563',
    alignItems: 'center',
  },
  lunchTypeButtonActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  lunchTypeText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  lunchTypeTextActive: {
    color: '#ffffff',
  },
  lunchTypeDescription: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
  },
  lunchTypeDescriptionActive: {
    color: '#ffffff',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4b5563',
    padding: 12,
    fontSize: 16,
    color: '#ffffff',
    borderRadius: 8,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  addProductButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addProductButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
  },
  selectedProductsContainer: {
    gap: 12,
  },
  selectedProductItem: {
    backgroundColor: '#374151',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  selectedProductInfo: {
    marginBottom: 12,
  },
  selectedProductName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedProductPrice: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedProductControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityButton: {
    backgroundColor: '#3b82f6',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  quantityText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 12,
    minWidth: 60,
    textAlign: 'center',
  },
  removeButton: {
    backgroundColor: '#ef4444',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  removeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  productTotal: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'right',
  },
  totalSection: {
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10b981',
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  totalAmount: {
    color: '#10b981',
    fontSize: 18,
    fontWeight: '700',
  },
  cashSummary: {
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10b981',
    marginTop: 8,
  },
  cashSummaryText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  submitSection: {
    padding: 16,
  },
  submitButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#6b7280',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  outOfStock: {
    color: '#ef4444',
  },

  // Product Selector Styles
  productSelectorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0a0a0a',
    zIndex: 1000,
  },
  productSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#111111',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  productSelectorTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  closeProductSelector: {
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  closeProductSelectorText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  searchInput: {
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4b5563',
    padding: 12,
    fontSize: 16,
    color: '#ffffff',
    borderRadius: 8,
  },
  productsList: {
    flex: 1,
    padding: 16,
  },
  productItem: {
    backgroundColor: '#1f2937',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  productDetails: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 2,
  },
  stockInfo: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '500',
  },

  // History Styles
  historyToggleButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  historyToggleButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  historyScrollContainer: {
    flex: 1,
  },
  historyScrollContent: {
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
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#111111',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  historyHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshHistoryButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  refreshHistoryButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  historyTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  closeHistoryButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  closeHistoryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  historyFilters: {
    backgroundColor: '#1f2937',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  historyFiltersTitle: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  filterGroup: {
    flex: 1,
  },
  filterLabel: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  filterInput: {
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4b5563',
    padding: 12,
    fontSize: 16,
    color: '#ffffff',
    borderRadius: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  applyFilterButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
  },
  applyFilterButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  clearFilterButton: {
    backgroundColor: '#6b7280',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
  },
  clearFilterButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  historyListContainer: {
    padding: 16,
  },
  historyLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  historyLoadingText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  historyEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  historyEmptyText: {
    color: '#9ca3af',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  historyEmptySubtext: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  historyItem: {
    backgroundColor: '#1f2937',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  historyItemInfo: {
    flex: 1,
  },
  historyItemStaffName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyItemDate: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  historyItemTime: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  historyItemAmount: {
    alignItems: 'flex-end',
  },
  historyItemAmountText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '700',
  },
  cashAmountDetail: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'right',
  },
  historyItemDetails: {
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 12,
  },
  historyItemProduct: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyItemQuantity: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 2,
  },
  historyItemReason: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 2,
  },
  historyItemRecordedBy: {
    color: '#9ca3af',
    fontSize: 12,
    fontStyle: 'italic',
  },

  // Result Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  resultModalContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    width: '90%',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  successModal: {
    borderColor: '#22c55e',
    shadowColor: '#22c55e',
  },
  errorModal: {
    borderColor: '#ef4444',
    shadowColor: '#ef4444',
  },
  resultModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#4b5563',
  },
  resultModalIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  successIcon: {
    color: '#22c55e',
  },
  errorIcon: {
    color: '#ef4444',
  },
  resultModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'left',
  },
  successTitle: {
    color: '#22c55e',
  },
  errorTitle: {
    color: '#ef4444',
  },
  resultModalBody: {
    marginBottom: 24,
  },
  resultModalMessage: {
    fontSize: 16,
    color: '#ffffff',
    lineHeight: 24,
    textAlign: 'left',
    marginBottom: 12,
  },
  resultModalDetails: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
    textAlign: 'left',
    fontStyle: 'italic',
  },
  resultModalButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  successButton: {
    backgroundColor: '#22c55e',
    shadowColor: '#22c55e',
  },
  errorButton: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
  },
  resultModalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default StaffLunchScreen;