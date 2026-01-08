import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { shopAPI } from '../services/api';
import WeightInputModal from '../components/WeightInputModal';

const OptimizedCashierProductsScreen = () => {
  const navigation = useNavigation();
  
  // State management
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  
  // Selection cart state
  const [selectedProducts, setSelectedProducts] = useState([]);
  
  // Weight input modal state
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [selectedProductForWeight, setSelectedProductForWeight] = useState(null);

  // Search debouncing
  const [searchTimeout, setSearchTimeout] = useState(null);

  // Performance optimization: Memoize filtered products
  const displayedProducts = useMemo(() => {
    return products;
  }, [products]);

  // Load categories once
  useEffect(() => {
    loadCategories();
  }, []);

  // Load products with current filters
  const loadProducts = useCallback(async (page = 1, append = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const params = new URLSearchParams({
        page: page.toString(),
        page_size: '50', // Load 50 products per page for better performance
        search: searchQuery,
        category: selectedCategory,
        sort_by: sortBy,
        sort_order: sortOrder
      });

      console.log('Loading products with params:', params.toString());
      
      const response = await fetch(`${shopAPI.baseURL}/products/optimized/?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Products loaded:', data.data?.length || 0, 'products');
        
        if (data.success) {
          const newProducts = data.data || [];
          const pagination = data.pagination || {};
          
          if (append) {
            // Append new products for infinite scroll
            setProducts(prev => [...prev, ...newProducts]);
          } else {
            // Replace products for new search/filter
            setProducts(newProducts);
          }
          
          // Update pagination state
          setCurrentPage(pagination.current_page || 1);
          setTotalPages(pagination.total_pages || 1);
          setTotalCount(pagination.total_count || 0);
          setHasNextPage(pagination.has_next || false);
          setHasPreviousPage(pagination.has_previous || false);
        }
      }
    } catch (error) {
      console.error('Error loading products:', error);
      if (!append) {
        setProducts([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [searchQuery, selectedCategory, sortBy, sortOrder]);

  // Load categories
  const loadCategories = async () => {
    try {
      const response = await fetch(`${shopAPI.baseURL}/products/categories/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const categoryList = data.data.categories || [];
          setCategories(['all', ...categoryList.map(cat => cat.name)]);
        }
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  // Debounced search
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const timeout = setTimeout(() => {
      setCurrentPage(1);
      loadProducts(1, false);
    }, 500); // 500ms debounce

    setSearchTimeout(timeout);

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [searchQuery]);

  // Load products when filters change
  useEffect(() => {
    if (searchQuery === '') {
      loadProducts(1, false);
    }
  }, [selectedCategory, sortBy, sortOrder]);

  // Refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setCurrentPage(1);
    loadProducts(1, false);
  }, [loadProducts]);

  // Load more products for infinite scroll
  const loadMoreProducts = useCallback(() => {
    if (hasNextPage && !loadingMore) {
      loadProducts(currentPage + 1, true);
    }
  }, [currentPage, hasNextPage, loadingMore, loadProducts]);

  // Optimized search handler
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  // Add to cart functionality
  const addToCart = (product) => {
    const isSelected = selectedProducts.find(item => item.id === product.id);
    
    if (isSelected) {
      setSelectedProducts(selectedProducts.filter(item => item.id !== product.id));
    } else {
      if (product.price_type !== 'unit') {
        setSelectedProductForWeight(product);
        setShowWeightModal(true);
      } else {
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
        quantity: 0,
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
        return total + (item.price * item.quantity);
      } else {
        return total + (item.price * (item.weight || 0));
      }
    }, 0);
  };

  const goToDashboardWithSelection = () => {
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

  // Render individual product item
  const renderProductItem = ({ item: product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => addToCart(product)}
      activeOpacity={0.7}
    >
      <View style={styles.productCardHeader}>
        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.productCode}>Code: {product.line_code || 'N/A'}</Text>
      </View>
      
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
              {(product.stock_quantity || 0) < 0 && ' - NEGATIVE'}
            </Text>
          </View>
        </View>
        
        <View style={styles.productPriceSection}>
          <Text style={styles.priceText}>
            {formatCurrency(product.price)}/{product.price_type === 'unit' ? 'unit' : product.price_type}
          </Text>
          
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
          
          {selectedProducts.find(item => item.id === product.id) && (
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.qtyButton}
                onPress={() => updateSelectedQuantity(product.id, (selectedProducts.find(item => item.id === product.id)?.quantity || 1) - 1)}
              >
                <Text style={styles.qtyButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.qtyText}>
                {selectedProducts.find(item => item.id === product.id)?.quantity || 1}
              </Text>
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
    </TouchableOpacity>
  );

  // Render load more indicator
  const renderLoadMore = () => {
    if (!hasNextPage || loadingMore) {
      return null;
    }
    
    return (
      <View style={styles.loadMoreContainer}>
        <TouchableOpacity
          style={styles.loadMoreButton}
          onPress={loadMoreProducts}
        >
          <Text style={styles.loadMoreButtonText}>Load More Products</Text>
          <Icon name="expand-more" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  // Render loading indicator
  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#8B4513" />
      <Text style={styles.loadingText}>
        {loading ? 'Loading products...' : 'Loading more...'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#fff" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
        {renderLoading()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
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

      {/* Search and Filter Section */}
      <View style={styles.searchFilterSection}>
        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchLabel}>🔍 SEARCH PRODUCTS:</Text>
          <View style={styles.searchInputContainer}>
            <Icon name="search" size={20} color="#8B4513" />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Search by name, code, or barcode..."
              placeholderTextColor="#8B4513"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <Icon name="clear" size={20} color="#8B4513" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        
        {/* Category Filter */}
        <View style={styles.categoryContainer}>
          <Text style={styles.categoryLabel}>📁 FILTER BY CATEGORY:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {categories.map((category) => (
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

        {/* Sort Options */}
        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>🔄 SORT BY:</Text>
          <View style={styles.sortOptions}>
            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'name' && styles.sortButtonActive]}
              onPress={() => setSortBy('name')}
            >
              <Text style={[styles.sortButtonText, sortBy === 'name' && styles.sortButtonTextActive]}>Name</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'price' && styles.sortButtonActive]}
              onPress={() => setSortBy('price')}
            >
              <Text style={[styles.sortButtonText, sortBy === 'price' && styles.sortButtonTextActive]}>Price</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'stock_quantity' && styles.sortButtonActive]}
              onPress={() => setSortBy('stock_quantity')}
            >
              <Text style={[styles.sortButtonText, sortBy === 'stock_quantity' && styles.sortButtonTextActive]}>Stock</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sortOrderButton}
              onPress={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              <Icon name={sortOrder === 'asc' ? 'arrow-upward' : 'arrow-downward'} size={16} color="#8B4513" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Performance Stats */}
      <View style={styles.performanceStats}>
        <Text style={styles.performanceStatsText}>
          📊 {totalCount} Products • Page {currentPage}/{totalPages} • {displayedProducts.length} Displayed
        </Text>
      </View>

      {/* Products List */}
      <FlatList
        data={displayedProducts}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.productsList}
        contentContainerStyle={styles.productsContainer}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMoreProducts}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? renderLoading() : renderLoadMore()
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={10}
      />

      {/* Weight Input Modal */}
      <WeightInputModal
        visible={showWeightModal}
        product={selectedProductForWeight}
        onAdd={handleWeightAdd}
        onCancel={handleWeightCancel}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  
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
  },
  goToDashboardButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },

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
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4b5563',
    padding: 12,
    borderRadius: 8,
  },
  categoryContainer: {
    marginBottom: 15,
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

  sortContainer: {
    marginBottom: 10,
  },
  sortLabel: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  sortOptions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortButton: {
    backgroundColor: '#374151',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  sortButtonActive: {
    backgroundColor: '#10b981',
    borderColor: '#059669',
  },
  sortButtonText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
  },
  sortButtonTextActive: {
    color: '#ffffff',
  },
  sortOrderButton: {
    padding: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#4b5563',
  },

  performanceStats: {
    backgroundColor: '#111827',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  performanceStatsText: {
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'center',
  },

  productsList: {
    flex: 1,
  },
  productsContainer: {
    padding: 20,
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
  loadMoreContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadMoreButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadMoreButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
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
  productPriceSection: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  priceText: {
    color: '#10b981',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#10b981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  addButtonSelected: {
    backgroundColor: '#22c55e',
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
});

export default OptimizedCashierProductsScreen;