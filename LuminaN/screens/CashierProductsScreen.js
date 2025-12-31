import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { shopAPI } from '../services/api';
import WeightInputModal from '../components/WeightInputModal';

const CashierProductsScreen = () => {
  const navigation = useNavigation();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Selection cart state
  const [selectedProducts, setSelectedProducts] = useState([]);
  
  // Weight input modal state
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [selectedProductForWeight, setSelectedProductForWeight] = useState(null);

  useEffect(() => {
    loadProducts();
    
    // Add web-specific scrolling CSS (same as CashierDashboardScreen)
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.textContent = `
        .cashier-dashboard-scroll {
          overflow-y: auto !important;
          overflow-x: hidden !important;
          height: 100vh !important;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  // Filter products based on search and category
  useEffect(() => {
    if (products.length === 0) {
      setFilteredProducts([]);
      return;
    }

    let filtered = products;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => 
        product.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(product => 
        product.name?.toLowerCase().includes(query) ||
        product.line_code?.toLowerCase().includes(query) ||
        product.category?.toLowerCase().includes(query) ||
        product.barcode?.toLowerCase().includes(query)
      );
    }

    setFilteredProducts(filtered);
  }, [products, searchQuery, selectedCategory]);

  const loadProducts = async () => {
    try {
      setProductsLoading(true);
      console.log('Loading products from API...');
      const response = await shopAPI.getProducts();
      
      if (response.data && Array.isArray(response.data)) {
        console.log('Products loaded successfully:', response.data.length, 'products');
        setProducts(response.data);
      } else {
        console.log('No products found or invalid response format');
        setProducts([]);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  const addToCart = (product) => {
    // Add or remove product from selection
    const isSelected = selectedProducts.find(item => item.id === product.id);
    
    if (isSelected) {
      // Remove from selection
      setSelectedProducts(selectedProducts.filter(item => item.id !== product.id));
    } else {
      // For weighable products, show weight input modal
      if (product.price_type !== 'unit') {
        setSelectedProductForWeight(product);
        setShowWeightModal(true);
      } else {
        // For unit products, add directly
        setSelectedProducts([...selectedProducts, { 
          ...product, 
          quantity: 1,
          weight: null
        }]);
      }
    }
  };
  
  const handleWeightAdd = (weight) => {
    if (selectedProductForWeight) {
      setSelectedProducts([...selectedProducts, { 
        ...selectedProductForWeight, 
        quantity: 0, // Don't use quantity for weighable products
        weight: weight
      }]);
      setShowWeightModal(false);
      setSelectedProductForWeight(null);
    }
  };
  
  const handleWeightCancel = () => {
    setShowWeightModal(false);
    setSelectedProductForWeight(null);
  };
  
  const updateSelectedQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setSelectedProducts(selectedProducts.filter(item => item.id !== productId));
      return;
    }
    
    setSelectedProducts(selectedProducts.map(item => 
      item.id === productId ? { ...item, quantity } : item
    ));
  };
  
  const getSelectedTotal = () => {
    return selectedProducts.reduce((total, item) => {
      if (item.price_type === 'unit') {
        // For unit products, use quantity
        return total + (item.price * item.quantity);
      } else {
        // For weighable products, use weight
        return total + (item.price * (item.weight || 0));
      }
    }, 0);
  };
  
  const goToDashboardWithSelection = () => {
    // Pass selected products back to dashboard
    navigation.navigate('CashierDashboard', { 
      selectedProducts: selectedProducts 
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  // Get unique categories from products
  const getCategories = () => {
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
    return ['all', ...categories];
  };

  const onRefresh = () => {
    loadProducts();
  };

  return (
    <ScrollView 
      style={[styles.container, Platform.OS === 'web' && styles.webScrollView]}
      contentContainerStyle={Platform.OS === 'web' ? styles.webContentContainer : undefined}
      showsVerticalScrollIndicator={Platform.OS === 'web'}
      showsHorizontalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={productsLoading} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
          <Text style={styles.backButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={onRefresh}
        >
          <Icon name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Selection Cart Header */}
      {selectedProducts.length > 0 && (
        <View style={styles.selectionCartHeader}>
          <View style={styles.selectionCartInfo}>
            <Icon name="shopping-cart" size={20} color="#10b981" />
            <Text style={styles.selectionCartText}>
              {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected • {formatCurrency(getSelectedTotal())}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.goToDashboardButton}
            onPress={goToDashboardWithSelection}
          >
            <Icon name="point-of-sale" size={16} color="#fff" />
            <Text style={styles.goToDashboardButtonText}>ADD TO CART</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Ultimate Products Header */}
      <View style={styles.ultimateHeader}>
        <View style={styles.headerBackgroundOverlay} />
        
        <View style={styles.commandCenterBadge}>
          <Icon name="inventory" size={20} color="#fbbf24" />
          <Text style={styles.commandCenterBadgeText}>PRODUCT CATALOG</Text>
        </View>
        
        <Text style={styles.ultimateHeaderTitle}>🛍️ All Products</Text>
        
        <View style={styles.ultimateHeaderSubtitleContainer}>
          <Icon name="store" size={16} color="#10b981" />
          <Text style={styles.ultimateHeaderSubtitle}>Browse and Add to Cart</Text>
          <Icon name="shopping-cart" size={16} color="#3b82f6" />
        </View>
        
        <View style={styles.realtimeStatus}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>{products.length} Products Available</Text>
          <Icon name="wifi" size={14} color="#10b981" />
        </View>
        
        <View style={styles.performanceSummary}>
          <Text style={styles.performanceSummaryText}>
            📦 {filteredProducts.length} Products Displayed • {getCategories().length - 1} Categories
          </Text>
        </View>
      </View>

      {/* Search and Filter Section */}
      <View style={styles.searchFilterSection}>
        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchLabel}>🔍 SEARCH PRODUCTS:</Text>
          <View style={styles.searchInputContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name, code, or barcode..."
              placeholderTextColor="#8B4513"
            />
          </View>
        </View>
        
        {/* Category Filter */}
        <View style={styles.categoryContainer}>
          <Text style={styles.categoryLabel}>📁 FILTER BY CATEGORY:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {getCategories().map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  selectedCategory === category && styles.categoryButtonActive
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[
                  styles.categoryButtonText,
                  selectedCategory === category && styles.categoryButtonTextActive
                ]}>
                  {category === 'all' ? 'ALL' : category.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Products Display */}
      <View style={styles.productsContainer}>
        {productsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B4513" />
            <Text style={styles.loadingText}>Loading products...</Text>
          </View>
        ) : filteredProducts.length === 0 ? (
          <View style={styles.noProductsContainer}>
            <Icon name="inventory" size={64} color="#6b7280" />
            <Text style={styles.noProductsText}>
              {searchQuery || selectedCategory !== 'all' 
                ? 'No products match your search criteria'
                : 'No products available'
              }
            </Text>
            <TouchableOpacity 
              style={styles.clearFiltersButton}
              onPress={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
            >
              <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.productsGrid}>
            {filteredProducts.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.productCard}
                onPress={() => addToCart(product)}
              >
                {/* Product Card Header */}
                <View style={styles.productCardHeader}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productCode}>Code: {product.line_code || 'N/A'}</Text>
                </View>
                
                {/* Product Card Body */}
                <View style={styles.productCardBody}>
                  <View style={styles.productInfo}>
                    <Text style={styles.productCategory}>
                      📁 {product.category || 'Uncategorized'}
                    </Text>
                    <View style={styles.stockIndicator}>
                      <View style={[
                        styles.stockDot,
                        (product.stock_quantity || 0) < 0 && styles.stockDotNegative,
                        (product.stock_quantity || 0) === 0 && styles.stockDotOut,
                        (product.stock_quantity || 0) > 0 && (product.stock_quantity || 0) <= 5 && styles.stockDotLow,
                        (product.stock_quantity || 0) > 5 && styles.stockDotActive
                      ]} />
                      <Text style={[
                        styles.productStock,
                        (product.stock_quantity || 0) < 0 && styles.negativeStock,
                        (product.stock_quantity || 0) === 0 && styles.outOfStock,
                        (product.stock_quantity || 0) > 0 && (product.stock_quantity || 0) <= 5 && styles.lowStock
                      ]}>
                        📦 {product.stock_quantity || 0} {product.price_type === 'unit' ? 'units' : product.price_type}
                        {(product.stock_quantity || 0) < 0 && ' - NEGATIVE STOCK (SELLING)'}
                        {(product.stock_quantity || 0) === 0 && ' - OUT OF STOCK'}
                        {(product.stock_quantity || 0) > 0 && (product.stock_quantity || 0) <= 5 && ' - LOW STOCK'}
                        {(product.stock_quantity || 0) > 5 && ' - IN STOCK'}
                      </Text>
                    </View>
                    {/* Display all barcodes for the product */}
                    {((product.barcode || product.line_code) || product.additional_barcodes) && (
                      <View style={styles.productBarcodes}>
                        <Text style={styles.productBarcodeLabel}>🔖 Barcodes:</Text>
                        <Text style={styles.productBarcode}>
                          {product.barcode && `Primary: ${product.barcode}`}
                          {product.line_code && ` | Code: ${product.line_code}`}
                        </Text>
                        {product.additional_barcodes && (
                          <Text style={styles.productBarcode}>
                            {Array.isArray(product.additional_barcodes) 
                              ? `Additional: ${product.additional_barcodes.join(', ')}`
                              : `Additional: ${product.additional_barcodes}`
                            }
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.productPriceSection}>
                    <Text style={styles.priceText}>{formatCurrency(product.price)}/{product.price_type === 'unit' ? 'unit' : product.price_type}</Text>
                    <TouchableOpacity
                      style={[
                        styles.addButton,
                        selectedProducts.find(item => item.id === product.id) && styles.addButtonSelected
                      ]}
                      onPress={() => addToCart(product)}
                    >
                      <Text style={[
                        styles.addButtonText,
                        selectedProducts.find(item => item.id === product.id) && styles.addButtonTextSelected
                      ]}>
                        {selectedProducts.find(item => item.id === product.id) ? '✓ SELECTED' : '➕ SELECT'}
                      </Text>
                    </TouchableOpacity>
                    
                    {/* Quantity controls for selected products */}
                    {selectedProducts.find(item => item.id === product.id) && (
                      <View style={styles.quantityControls}>
                        <TouchableOpacity
                          style={styles.qtyButton}
                          onPress={() => updateSelectedQuantity(product.id, (selectedProducts.find(item => item.id === product.id)?.quantity || 1) - 1)}
                        >
                          <Text style={styles.qtyButtonText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{selectedProducts.find(item => item.id === product.id)?.quantity || 1}</Text>
                        <TouchableOpacity
                          style={styles.qtyButton}
                          onPress={() => updateSelectedQuantity(product.id, (selectedProducts.find(item => item.id === product.id)?.quantity || 1) + 1)}
                        >
                          <Text style={styles.qtyButtonText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
                
                {/* Product Card Footer */}
                <View style={styles.productCardFooter}>
                  <Text style={styles.cardVintageBorder}>✨ Premium Quality Products</Text>
                  <Text style={{color: '#6b7280', fontSize: 10}}>
                    {new Date().toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        {/* Bottom spacing for web */}
        <View style={{ 
          height: Platform.OS === 'web' ? 50 : 20,
          backgroundColor: '#0a0a0a'
        }} />
      </View>
      
      {/* Weight Input Modal */}
      <WeightInputModal
        visible={showWeightModal}
        product={selectedProductForWeight}
        onAdd={handleWeightAdd}
        onCancel={handleWeightCancel}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  
  // Header Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#111111',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  refreshButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },

  // Selection Cart Header Styles
  selectionCartHeader: {
    backgroundColor: '#1f2937',
    padding: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#10b981',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectionCartInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectionCartText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  goToDashboardButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  goToDashboardButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },

  // Ultimate Header Styles
  ultimateHeader: {
    backgroundColor: '#1a1a1a',
    padding: 24,
    paddingTop: 20,
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerBackgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)',
  },
  commandCenterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderWidth: 1,
    borderColor: '#fbbf24',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  commandCenterBadgeText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ultimateHeaderTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
  },
  ultimateHeaderSubtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  ultimateHeaderSubtitle: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '500',
    marginHorizontal: 8,
    textAlign: 'center',
  },
  realtimeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 8,
  },
  statusText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  performanceSummary: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  performanceSummaryText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Search and Filter Styles
  searchFilterSection: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  searchContainer: {
    marginBottom: 15,
  },
  searchLabel: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
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
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryContainer: {
    marginBottom: 10,
  },
  categoryLabel: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryButton: {
    backgroundColor: '#374151',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4b5563',
    minWidth: 70,
    alignItems: 'center',
  },
  categoryButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#2563eb',
  },
  categoryButtonText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryButtonTextActive: {
    color: '#ffffff',
  },

  // Products List
  productsList: {
    flex: 1,
    padding: 20,
  },
  productsContainer: {
    flex: 1,
    padding: 20,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#e5e7eb',
    marginTop: 16,
    fontSize: 18,
    textAlign: 'center',
  },
  noProductsContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noProductsText: {
    color: '#9ca3af',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  clearFiltersButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  clearFiltersButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Product Cards (same as CashierDashboard)
  productsGrid: {
    flexDirection: 'column',
    gap: 16,
  },
  productCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#404040',
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  productCardHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
    paddingBottom: 16,
    marginBottom: 16,
  },
  productName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  productCode: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 4,
  },
  productCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productInfo: {
    flex: 1,
  },
  productCategory: {
    color: '#9ca3af',
    fontSize: 13,
    marginBottom: 8,
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  productStock: {
    color: '#9ca3af',
    fontSize: 13,
    marginBottom: 6,
    fontWeight: '500',
  },
  outOfStock: {
    color: '#ef4444',
    fontWeight: '600',
  },
  negativeStock: {
    color: '#dc2626',
    fontWeight: '600',
  },
  productBarcodes: {
    marginTop: 6,
  },
  productBarcodeLabel: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  productBarcode: {
    color: '#6b7280',
    fontSize: 11,
    marginBottom: 1,
    lineHeight: 14,
  },
  productPriceSection: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  priceText: {
    color: '#10b981',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 0,
    alignItems: 'center',
    minWidth: 80,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  addButtonSelected: {
    backgroundColor: '#22c55e',
    borderColor: '#16a34a',
  },
  addButtonTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    justifyContent: 'center',
  },
  qtyButton: {
    backgroundColor: '#3b82f6',
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  qtyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  qtyText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 8,
    minWidth: 20,
    textAlign: 'center',
  },
  productCardFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#404040',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardVintageBorder: {
    color: '#6b7280',
    fontSize: 10,
    textAlign: 'center',
  },
  stockIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  stockDotActive: {
    backgroundColor: '#10b981',
  },
  stockDotNegative: {
    backgroundColor: '#dc2626',
  },
  stockDotLow: {
    backgroundColor: '#f59e0b',
  },
  stockDotOut: {
    backgroundColor: '#ef4444',
  },
});

export default CashierProductsScreen;