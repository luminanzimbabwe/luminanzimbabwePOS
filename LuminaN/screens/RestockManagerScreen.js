import React, { useEffect, useState, useCallback } from 'react';
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
  Switch,
  RefreshControl,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { shopAPI } from '../services/api';
import { shopStorage } from '../services/storage';
import { ROUTES } from '../constants/navigation';

const RestockManagerScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState([]);
  const [shopCredentials, setShopCredentials] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Restock management states
  const [oversoldProducts, setOversoldProducts] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [restockSuggestions, setRestockSuggestions] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Restock configuration
  const [restockQuantities, setRestockQuantities] = useState({});
  const [supplierNames, setSupplierNames] = useState({});
  const [costPrices, setCostPrices] = useState({});
  const [priorityFilter, setPriorityFilter] = useState('ALL'); // ALL, URGENT, HIGH, MEDIUM
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modal states
  const [showRestockDetails, setShowRestockDetails] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [restockHistory, setRestockHistory] = useState([]);

  useEffect(() => {
    loadShopCredentials();
  }, []);

  useEffect(() => {
    if (shopCredentials) {
      loadProductsAndAnalyze();
    }
  }, [shopCredentials]);

  useEffect(() => {
    filterAndAnalyzeProducts();
  }, [products, searchQuery, priorityFilter, categoryFilter]);

  const loadShopCredentials = async () => {
    try {
      const credentials = await shopStorage.getCredentials();
      if (credentials) {
        setShopCredentials(credentials);
      } else {
        navigation.replace(ROUTES.LOGIN);
      }
    } catch (error) {
      console.error('❌ Error loading credentials:', error);
      navigation.replace(ROUTES.LOGIN);
    }
  };

  const loadProductsAndAnalyze = async () => {
    try {
      const response = await shopAPI.getProducts();
      setProducts(response.data || []);
    } catch (error) {
      console.error('❌ Error loading products:', error);
      Alert.alert('Error', 'Failed to load products for restock analysis.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterAndAnalyzeProducts = () => {
    let filtered = products;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product =>
        product.name?.toLowerCase().includes(query) ||
        product.category?.toLowerCase().includes(query) ||
        product.supplier?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (categoryFilter !== 'ALL') {
      filtered = filtered.filter(product => product.category === categoryFilter);
    }

    // Analyze products for restock needs
    const oversold = filtered.filter(p => (parseFloat(p.stock_quantity) || 0) < 0);
    const lowStock = filtered.filter(p => {
      const stock = parseFloat(p.stock_quantity) || 0;
      const minStock = parseFloat(p.min_stock_level) || 5;
      return stock >= 0 && stock <= minStock;
    });

    // Generate restock suggestions
    const suggestions = filtered
      .map(product => generateRestockSuggestion(product))
      .filter(suggestion => suggestion !== null)
      .sort((a, b) => b.priorityScore - a.priorityScore);

    // Apply priority filter
    const filteredSuggestions = suggestions.filter(suggestion => {
      if (priorityFilter === 'ALL') return true;
      return suggestion.priority === priorityFilter;
    });

    setOversoldProducts(oversold);
    setLowStockProducts(lowStock);
    setRestockSuggestions(filteredSuggestions);
  };

  const generateRestockSuggestion = (product) => {
    const stockQuantity = parseFloat(product.stock_quantity) || 0;
    const minStockLevel = parseFloat(product.min_stock_level) || 5;
    const costPrice = parseFloat(product.cost_price) || 0;

    // Determine if restock is needed
    if (stockQuantity > minStockLevel) {
      return null; // No restock needed
    }

    let suggestedQuantity;
    let reason;
    let priority;
    let priorityScore;

    if (stockQuantity < 0) {
      // Oversold items - highest priority
      suggestedQuantity = Math.abs(stockQuantity) + minStockLevel;
      reason = `Clear oversell of ${Math.abs(stockQuantity)} units + safety stock`;
      priority = 'URGENT';
      priorityScore = 1000 + Math.abs(stockQuantity) * 10;
    } else if (stockQuantity === 0) {
      // Out of stock
      suggestedQuantity = minStockLevel * 2;
      reason = 'Out of stock - need to reorder';
      priority = 'HIGH';
      priorityScore = 500 + minStockLevel;
    } else {
      // Low stock
      suggestedQuantity = minStockLevel;
      reason = `Low stock - only ${stockQuantity} units left`;
      priority = 'MEDIUM';
      priorityScore = 100 + (minStockLevel - stockQuantity);
    }

    return {
      product,
      suggestedQuantity,
      reason,
      priority,
      priorityScore,
      estimatedCost: suggestedQuantity * costPrice,
      currentStock: stockQuantity,
      minStockLevel,
      costPrice,
      category: product.category,
      supplier: product.supplier || 'Unknown Supplier'
    };
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProductsAndAnalyze();
  }, []);

  const handleProductSelect = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === restockSuggestions.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(restockSuggestions.map(s => s.product.id));
    }
  };

  const updateRestockQuantity = (productId, quantity) => {
    setRestockQuantities(prev => ({
      ...prev,
      [productId]: quantity
    }));
  };

  const updateSupplierName = (productId, supplier) => {
    setSupplierNames(prev => ({
      ...prev,
      [productId]: supplier
    }));
  };

  const updateCostPrice = (productId, costPrice) => {
    setCostPrices(prev => ({
      ...prev,
      [productId]: costPrice
    }));
  };

  const createBulkRestockOrder = () => {
    if (selectedProducts.length === 0) {
      Alert.alert('Error', 'Please select products to restock.');
      return;
    }

    const selectedSuggestions = restockSuggestions.filter(s => 
      selectedProducts.includes(s.product.id)
    );

    const totalItems = selectedSuggestions.length;
    const totalQuantity = selectedSuggestions.reduce((sum, s) => sum + (parseFloat(restockQuantities[s.product.id]) || s.suggestedQuantity), 0);
    const totalCost = selectedSuggestions.reduce((sum, s) => {
      const quantity = parseFloat(restockQuantities[s.product.id]) || s.suggestedQuantity;
      const cost = parseFloat(costPrices[s.product.id]) || s.costPrice;
      return sum + (quantity * cost);
    }, 0);

    Alert.alert(
      'Create Bulk Restock Order',
      `Create restock order for ${totalItems} products?\n\n` +
      `Total Quantity: ${totalQuantity}\n` +
      `Estimated Cost: $${totalCost.toFixed(2)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Create Order', 
          onPress: () => {
            // Navigate to Inventory Receiving with pre-filled data
            navigation.navigate(ROUTES.INVENTORY_RECEIVING, { 
              bulkRestockData: selectedSuggestions.map(s => ({
                product: s.product,
                quantity: parseFloat(restockQuantities[s.product.id]) || s.suggestedQuantity,
                costPrice: parseFloat(costPrices[s.product.id]) || s.costPrice,
                supplierName: supplierNames[s.product.id] || s.supplier
              }))
            });
          }
        }
      ]
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'URGENT': return '#dc2626';
      case 'HIGH': return '#f59e0b';
      case 'MEDIUM': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'URGENT': return '🚨';
      case 'HIGH': return '⚠️';
      case 'MEDIUM': return '📦';
      default: return '📋';
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.backButton}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>🔄 Restock Manager</Text>
      <TouchableOpacity onPress={() => setShowHistory(true)}>
        <Text style={styles.historyButton}>📋 History</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {/* Priority Filter */}
        <TouchableOpacity
          style={[
            styles.filterButton,
            priorityFilter === 'ALL' && styles.filterButtonActive
          ]}
          onPress={() => setPriorityFilter('ALL')}
        >
          <Text style={[
            styles.filterButtonText,
            priorityFilter === 'ALL' && styles.filterButtonTextActive
          ]}>
            All Priority
          </Text>
        </TouchableOpacity>
        
        {['URGENT', 'HIGH', 'MEDIUM'].map(priority => (
          <TouchableOpacity
            key={priority}
            style={[
              styles.filterButton,
              priorityFilter === priority && styles.filterButtonActive
            ]}
            onPress={() => setPriorityFilter(priority)}
          >
            <Text style={[
              styles.filterButtonText,
              priorityFilter === priority && styles.filterButtonTextActive
            ]}>
              {getPriorityIcon(priority)} {priority}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderStats = () => {
    const urgentCount = restockSuggestions.filter(s => s.priority === 'URGENT').length;
    const highCount = restockSuggestions.filter(s => s.priority === 'HIGH').length;
    const mediumCount = restockSuggestions.filter(s => s.priority === 'MEDIUM').length;
    const totalEstimatedCost = restockSuggestions.reduce((sum, s) => sum + s.estimatedCost, 0);

    return (
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>📊 Restock Analysis</Text>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderLeftColor: '#dc2626' }]}>
            <Text style={styles.statValue}>{urgentCount}</Text>
            <Text style={styles.statTitle}>Urgent</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: '#f59e0b' }]}>
            <Text style={styles.statValue}>{highCount}</Text>
            <Text style={styles.statTitle}>High Priority</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: '#10b981' }]}>
            <Text style={styles.statValue}>{mediumCount}</Text>
            <Text style={styles.statTitle}>Medium Priority</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: '#3b82f6' }]}>
            <Text style={styles.statValue}>{formatCurrency(totalEstimatedCost)}</Text>
            <Text style={styles.statTitle}>Est. Total Cost</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderSearchAndActions = () => (
    <View style={styles.searchActionsContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search products, categories, suppliers..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholderTextColor="#999"
      />
      
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setBulkMode(!bulkMode)}
        >
          <Text style={styles.actionButtonText}>
            {bulkMode ? '📋 Individual' : '✅ Bulk Mode'}
          </Text>
        </TouchableOpacity>
        
        {bulkMode && selectedProducts.length > 0 && (
          <TouchableOpacity
            style={styles.bulkActionButton}
            onPress={createBulkRestockOrder}
          >
            <Text style={styles.bulkActionButtonText}>
              📦 Create Order ({selectedProducts.length})
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderRestockSuggestions = () => (
    <View style={styles.suggestionsContainer}>
      <View style={styles.suggestionsHeader}>
        <Text style={styles.suggestionsTitle}>
          💡 Restock Suggestions ({restockSuggestions.length})
        </Text>
        {bulkMode && (
          <TouchableOpacity style={styles.selectAllButton} onPress={handleSelectAll}>
            <Text style={styles.selectAllButtonText}>
              {selectedProducts.length === restockSuggestions.length ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {restockSuggestions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>✅ All Caught Up!</Text>
          <Text style={styles.emptyText}>
            No products need restocking at the moment.
          </Text>
        </View>
      ) : (
        <FlatList
          data={restockSuggestions}
          keyExtractor={(item) => item.product.id.toString()}
          renderItem={({ item }) => (
            <View style={[
              styles.suggestionCard,
              { borderLeftColor: getPriorityColor(item.priority) }
            ]}>
              {/* Selection checkbox for bulk mode */}
              {bulkMode && (
                <TouchableOpacity
                  style={styles.selectionCheckbox}
                  onPress={() => handleProductSelect(item.product.id)}
                >
                  <Text style={[
                    styles.checkboxIcon,
                    selectedProducts.includes(item.product.id) && styles.checkboxChecked
                  ]}>
                    {selectedProducts.includes(item.product.id) ? '✓' : ''}
                  </Text>
                </TouchableOpacity>
              )}

              <View style={styles.suggestionContent}>
                <View style={styles.suggestionHeader}>
                  <Text style={styles.suggestionProductName}>
                    {item.product.name}
                    {item.currentStock < 0 && ' ⚠️'}
                  </Text>
                  <View style={[
                    styles.priorityBadge,
                    { backgroundColor: getPriorityColor(item.priority) }
                  ]}>
                    <Text style={styles.priorityBadgeText}>
                      {getPriorityIcon(item.priority)} {item.priority}
                    </Text>
                  </View>
                </View>

                <Text style={styles.suggestionDetails}>
                  {item.category} • Current: {item.currentStock} • Min: {item.minStockLevel}
                </Text>
                <Text style={styles.suggestionReason}>{item.reason}</Text>

                <View style={styles.suggestionActions}>
                  <View style={styles.quantityInputContainer}>
                    <Text style={styles.inputLabel}>Restock Qty:</Text>
                    <TextInput
                      style={styles.quantityInput}
                      value={restockQuantities[item.product.id]?.toString() || item.suggestedQuantity.toString()}
                      onChangeText={(text) => updateRestockQuantity(item.product.id, text)}
                      keyboardType="numeric"
                      placeholder={item.suggestedQuantity.toString()}
                    />
                  </View>
                  
                  <View style={styles.costInputContainer}>
                    <Text style={styles.inputLabel}>Cost Price:</Text>
                    <TextInput
                      style={styles.costInput}
                      value={costPrices[item.product.id]?.toString() || item.costPrice.toString()}
                      onChangeText={(text) => updateCostPrice(item.product.id, text)}
                      keyboardType="decimal-pad"
                      placeholder={item.costPrice.toString()}
                    />
                  </View>
                </View>

                <View style={styles.supplierContainer}>
                  <Text style={styles.inputLabel}>Supplier:</Text>
                  <TextInput
                    style={styles.supplierInput}
                    value={supplierNames[item.product.id] || item.supplier}
                    onChangeText={(text) => updateSupplierName(item.product.id, text)}
                    placeholder={item.supplier}
                  />
                </View>

                <View style={styles.costSummary}>
                  <Text style={styles.estimatedCost}>
                    Est. Cost: {formatCurrency(
                      (parseFloat(restockQuantities[item.product.id]) || item.suggestedQuantity) *
                      (parseFloat(costPrices[item.product.id]) || item.costPrice)
                    )}
                  </Text>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.viewDetailsButton}
                    onPress={() => {
                      setSelectedProduct(item);
                      setShowRestockDetails(true);
                    }}
                  >
                    <Text style={styles.viewDetailsButtonText}>📋 Details</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.quickRestockButton}
                    onPress={() => {
                      // Navigate to receiving with this single item
                      navigation.navigate(ROUTES.INVENTORY_RECEIVING, {
                        preSelectedProduct: item.product,
                        suggestedQuantity: parseFloat(restockQuantities[item.product.id]) || item.suggestedQuantity,
                        suggestedCostPrice: parseFloat(costPrices[item.product.id]) || item.costPrice,
                        suggestedSupplier: supplierNames[item.product.id] || item.supplier
                      });
                    }}
                  >
                    <Text style={styles.quickRestockButtonText}>⚡ Quick Restock</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Analyzing inventory for restock needs...</Text>
        </View>
      </View>
    );
  }

  return (
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
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#06b6d4']}
          tintColor="#06b6d4"
        />
      }
    >
      {renderHeader()}
      {renderStats()}
      {renderFilters()}
      {renderSearchAndActions()}
      {renderRestockSuggestions()}
      
      {/* Bottom padding for web scrolling */}
      <View style={{ 
        height: Platform.OS === 'web' ? 100 : 20,
        minHeight: Platform.OS === 'web' ? 100 : 0
      }} />

      {/* Restock Details Modal */}
      <Modal
        visible={showRestockDetails}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRestockDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📋 Restock Details</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowRestockDetails(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {selectedProduct && (
              <ScrollView 
                style={styles.modalBodyScroll}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                <View style={styles.modalBody}>
                  <Text style={styles.modalProductName}>{selectedProduct.product.name}</Text>
                  
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>📊 Product Information</Text>
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalLabel}>Category:</Text>
                      <Text style={styles.modalValue}>{selectedProduct.category || 'Not specified'}</Text>
                    </View>
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalLabel}>Supplier:</Text>
                      <Text style={styles.modalValue}>{selectedProduct.supplier || 'Not specified'}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>📦 Stock Details</Text>
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalLabel}>Current Stock:</Text>
                      <Text style={[styles.modalValue, { color: selectedProduct.currentStock < 0 ? '#dc2626' : '#10b981' }]}>
                        {selectedProduct.currentStock}
                      </Text>
                    </View>
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalLabel}>Minimum Stock:</Text>
                      <Text style={styles.modalValue}>{selectedProduct.minStockLevel}</Text>
                    </View>
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalLabel}>Suggested Quantity:</Text>
                      <Text style={styles.modalValue}>{selectedProduct.suggestedQuantity}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>💰 Cost Analysis</Text>
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalLabel}>Cost Price:</Text>
                      <Text style={styles.modalValue}>{formatCurrency(selectedProduct.costPrice)}</Text>
                    </View>
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalLabel}>Estimated Cost:</Text>
                      <Text style={[styles.modalValue, { color: '#10b981', fontWeight: 'bold' }]}>
                        {formatCurrency(selectedProduct.estimatedCost)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>⚠️ Priority & Status</Text>
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalLabel}>Priority Level:</Text>
                      <View style={[styles.modalPriorityBadge, { backgroundColor: getPriorityColor(selectedProduct.priority) }]}>
                        <Text style={styles.modalPriorityText}>
                          {getPriorityIcon(selectedProduct.priority)} {selectedProduct.priority}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalLabel}>Reason:</Text>
                      <Text style={styles.modalValue}>{selectedProduct.reason}</Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            )}
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalRestockButton}
                onPress={() => {
                  setShowRestockDetails(false);
                  // Navigate to receiving with this item
                  navigation.navigate(ROUTES.INVENTORY_RECEIVING, {
                    preSelectedProduct: selectedProduct.product,
                    suggestedQuantity: parseFloat(restockQuantities[selectedProduct.product.id]) || selectedProduct.suggestedQuantity,
                    suggestedCostPrice: parseFloat(costPrices[selectedProduct.product.id]) || selectedProduct.costPrice,
                    suggestedSupplier: supplierNames[selectedProduct.product.id] || selectedProduct.supplier
                  });
                }}
              >
                <Text style={styles.modalRestockButtonText}>⚡ Start Restock</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingBottom: Platform.OS === 'web' ? 100 : 40,
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
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  historyButton: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
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
  content: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  statsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 16,
    width: '22%',
    borderLeftWidth: 4,
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statTitle: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 4,
  },
  filtersContainer: {
    marginBottom: 16,
  },
  filterButton: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
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
  searchActionsContainer: {
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  bulkActionButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 2,
  },
  bulkActionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  suggestionsContainer: {
    marginBottom: 20,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  suggestionsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  selectAllButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  selectAllButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  suggestionCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
    borderLeftWidth: 4,
  },
  suggestionContent: {
    flex: 1,
  },
  selectionCheckbox: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#666',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
  },
  checkboxIcon: {
    color: 'transparent',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxChecked: {
    color: '#3b82f6',
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  suggestionProductName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  suggestionDetails: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 4,
  },
  suggestionReason: {
    color: '#999',
    fontSize: 12,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  suggestionActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  quantityInputContainer: {
    flex: 1,
  },
  costInputContainer: {
    flex: 1,
  },
  inputLabel: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 4,
  },
  quantityInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
    padding: 8,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#444',
  },
  costInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
    padding: 8,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#444',
  },
  supplierContainer: {
    marginBottom: 12,
  },
  supplierInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
    padding: 8,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#444',
  },
  costSummary: {
    backgroundColor: '#374151',
    borderRadius: 6,
    padding: 8,
    marginBottom: 12,
  },
  estimatedCost: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  viewDetailsButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
  },
  viewDetailsButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  quickRestockButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
  },
  quickRestockButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    color: '#10b981',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#374151',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 16,
  },
  modalBodyScroll: {
    maxHeight: 350,
  },
  modalProductName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalSection: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalSectionTitle: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  modalLabel: {
    color: '#ccc',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  modalValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  modalPriorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  modalPriorityText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  modalActions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: '#1a1a1a',
  },
  modalRestockButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  modalRestockButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});

export default RestockManagerScreen;
