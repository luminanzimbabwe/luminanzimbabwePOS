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
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { shopAPI } from '../services/api';
import Icon from 'react-native-vector-icons/MaterialIcons';
import WeightInputModal from '../components/WeightInputModal';

const QuickProductsScreen = () => {
  const navigation = useNavigation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Selection cart state
  const [selectedProducts, setSelectedProducts] = useState([]);
  
  // Weight input modal state
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [selectedProductForWeight, setSelectedProductForWeight] = useState(null);

  useEffect(() => {
    loadQuickProducts();
    
    // Add web-specific scrolling CSS (same as CashierProductsScreen)
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.textContent = `
        .quick-products-scroll {
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

  const loadQuickProducts = async () => {
    try {
      setLoading(true);
      const response = await shopAPI.getProducts();
      
      if (response.data && Array.isArray(response.data)) {
        // Debug: Log all products to see their barcode values
        console.log('All products from API:', response.data.map(p => ({name: p.name, barcode: p.barcode, line_code: p.line_code})));
        
        // Filter products without barcodes - more flexible approach
        const quickProducts = response.data.filter(product => {
          const barcode = (product.barcode || '').toString().trim().toUpperCase();
          const lineCode = (product.line_code || '').toString().trim().toUpperCase();
          
          // FIXED: Check if PRIMARY barcode is empty (OR logic, not AND)
          const hasNoBarcode = (
            !barcode || 
            barcode === 'N/A' || 
            barcode === 'NA' || 
            barcode === 'NONE' || 
            barcode === 'NULL' || 
            barcode === 'UNDEFINED' ||
            barcode === ''
          );
          
          console.log('Checking product:', product.name, 'barcode:', `"${barcode}"`, 'line_code:', `"${lineCode}"`, 'isQuick:', hasNoBarcode);
          return hasNoBarcode;
        });
        
        console.log('Filtered quick products:', quickProducts.length);
        setProducts(quickProducts);
      }
    } catch (error) {
      console.error('Error loading quick products:', error);
      Alert.alert('Error', 'Failed to load quick products');
    } finally {
      setLoading(false);
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
  
  const selectAll = () => {
    const availableProducts = getFilteredProducts();
    const selectableProducts = availableProducts.filter(product => product.price_type === 'unit');
    setSelectedProducts(selectableProducts.map(product => ({ 
      ...product, 
      quantity: 1,
      weight: null
    })));
  };
  
  const clearSelection = () => {
    setSelectedProducts([]);
  };
  
  const goToDashboardWithSelection = () => {
    // Pass selected products back to dashboard
    navigation.navigate('CashierDashboard', { 
      selectedProducts: selectedProducts 
    });
  };

  // Get unique categories from quick products
  const getCategories = () => {
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
    return ['all', ...categories];
  };

  // Filter products by category
  const getFilteredProducts = () => {
    if (selectedCategory === 'all') {
      return products;
    }
    return products.filter(product => 
      product.category?.toLowerCase() === selectedCategory.toLowerCase()
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#fff" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>⚡ Quick Products</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading quick products...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, Platform.OS === 'web' && styles.webScrollView]}
      contentContainerStyle={Platform.OS === 'web' ? styles.webContentContainer : undefined}
      showsVerticalScrollIndicator={Platform.OS === 'web'}
      showsHorizontalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadQuickProducts} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#fff" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>⚡ Quick Products</Text>
        <View style={styles.headerRight} />
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
          <View style={styles.selectionButtons}>
            <TouchableOpacity 
              style={styles.selectAllButton}
              onPress={selectAll}
            >
              <Text style={styles.selectAllButtonText}>SELECT ALL</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.clearSelectionButton}
              onPress={clearSelection}
            >
              <Text style={styles.clearSelectionButtonText}>CLEAR</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.goToDashboardButton}
              onPress={goToDashboardWithSelection}
            >
              <Icon name="point-of-sale" size={16} color="#fff" />
              <Text style={styles.goToDashboardButtonText}>ADD TO CART</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Content without extra ScrollView for web - the main ScrollView handles it */}
      <View style={styles.content}>
        {/* Info Section */}
        <View style={styles.infoSection}>
          <Icon name="flash-on" size={32} color="#10b981" />
          <Text style={styles.infoTitle}>Products Without Barcodes</Text>
          <Text style={styles.infoSubtitle}>
            Select multiple products and add them all to your cart at once for faster sales
          </Text>
          {selectedProducts.length === 0 && (
            <TouchableOpacity style={styles.selectAllInfoButton} onPress={selectAll}>
              <Text style={styles.selectAllInfoButtonText}>SELECT ALL PRODUCTS</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Category Filter */}
        {getCategories().length > 1 && (
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
        )}

        {/* Products List */}
        <View style={styles.productsContainer}>
          {getFilteredProducts().length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="inventory-2" size={64} color="#6b7280" />
              <Text style={styles.emptyTitle}>No Quick Products Found</Text>
              <Text style={styles.emptySubtitle}>
                {selectedCategory === 'all' 
                  ? 'No products without barcodes available'
                  : `No products in ${selectedCategory} category`
                }
              </Text>
            </View>
          ) : (
            <View style={styles.productsGrid}>
              {getFilteredProducts().map((product) => {
                const isSelected = selectedProducts.find(item => item.id === product.id);
                return (
                  <TouchableOpacity
                    key={product.id}
                    style={[
                      styles.productCard,
                      isSelected && styles.productCardSelected
                    ]}
                    onPress={() => addToCart(product)}
                  >
                    {/* Product Header */}
                    <View style={styles.productHeader}>
                      <Text style={styles.productName}>{product.name}</Text>
                      <Text style={styles.productCategory}>
                        📁 {product.category || 'General'}
                      </Text>
                    </View>

                    {/* Product Body */}
                    <View style={styles.productBody}>
                      <View style={styles.productInfo}>
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
                            {(product.stock_quantity || 0) < 0 && ' - NEGATIVE STOCK'}
                            {(product.stock_quantity || 0) === 0 && ' - OUT OF STOCK'}
                            {(product.stock_quantity || 0) > 0 && (product.stock_quantity || 0) <= 5 && ' - LOW STOCK'}
                            {(product.stock_quantity || 0) > 5 && ' - IN STOCK'}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.productPriceSection}>
                        <Text style={styles.priceText}>{formatCurrency(product.price)}/{product.price_type === 'unit' ? 'unit' : product.price_type}</Text>
                        <TouchableOpacity
                          style={[
                            styles.addButton,
                            isSelected && styles.addButtonSelected
                          ]}
                          onPress={() => addToCart(product)}
                        >
                          <Text style={[
                            styles.addButtonText,
                            isSelected && styles.addButtonTextSelected
                          ]}>
                            {isSelected ? '✓ SELECTED' : '➕ SELECT'}
                          </Text>
                        </TouchableOpacity>
                        
                        {/* Quantity controls for selected products */}
                        {isSelected && (
                          <View style={styles.quantityControls}>
                            <TouchableOpacity
                              style={styles.qtyButton}
                              onPress={() => updateSelectedQuantity(product.id, (isSelected?.quantity || 1) - 1)}
                            >
                              <Text style={styles.qtyButtonText}>-</Text>
                            </TouchableOpacity>
                            <Text style={styles.qtyText}>{isSelected?.quantity || 1}</Text>
                            <TouchableOpacity
                              style={styles.qtyButton}
                              onPress={() => updateSelectedQuantity(product.id, (isSelected?.quantity || 1) + 1)}
                            >
                              <Text style={styles.qtyButtonText}>+</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                    
                    {/* Product Footer */}
                    <View style={styles.productFooter}>
                      <Text style={styles.quickProductBadge}>⚡ QUICK PRODUCT</Text>
                      <Text style={styles.productDate}>
                        {new Date().toLocaleDateString()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 20 }} />
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
  
  // Web scrolling styles (same as CashierProductsScreen)
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
    padding: 16,
    paddingTop: 40,
    backgroundColor: '#111111',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
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
    flex: 1,
  },
  selectionCartText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  selectionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  selectAllButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  clearSelectionButton: {
    backgroundColor: '#6b7280',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  clearSelectionButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  goToDashboardButton: {
    backgroundColor: '#10b981',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  goToDashboardButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  headerRight: {
    width: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 16,
    marginTop: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoSection: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  infoTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  infoSubtitle: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  selectAllInfoButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 8,
  },
  selectAllInfoButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  categoryContainer: {
    marginBottom: 20,
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
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  categoryButtonText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryButtonTextActive: {
    color: '#ffffff',
  },
  productsContainer: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: '#9ca3af',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
  },
  productsGrid: {
    gap: 16,
  },
  productCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    padding: 16,
  },
  productCardSelected: {
    borderColor: '#10b981',
    borderWidth: 2,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  productHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    paddingBottom: 12,
    marginBottom: 12,
  },
  productName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  productCategory: {
    color: '#9ca3af',
    fontSize: 12,
  },
  productBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productInfo: {
    flex: 1,
  },
  stockIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
  productStock: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500',
  },
  negativeStock: {
    color: '#dc2626',
    fontWeight: '600',
  },
  outOfStock: {
    color: '#ef4444',
    fontWeight: '600',
  },
  lowStock: {
    color: '#f59e0b',
    fontWeight: '600',
  },
  productPriceSection: {
    alignItems: 'center',
    minWidth: 80,
  },
  priceText: {
    color: '#10b981',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#10b981',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
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
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  quickProductBadge: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '600',
  },
  productDate: {
    color: '#6b7280',
    fontSize: 10,
  },
});

export default QuickProductsScreen;