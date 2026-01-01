import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { shopAPI } from '../services/api';

const LowStockAlertsScreen = () => {
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [outOfStockProducts, setOutOfStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('low-stock'); // 'low-stock' or 'out-of-stock'
  
  const navigation = useNavigation();

  useEffect(() => {
    loadLowStockProducts();
  }, []);

  const loadLowStockProducts = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading products for low stock analysis...');
      
      // Get all products from API
      const response = await shopAPI.getProducts();
      const products = response.data || [];
      
      console.log('📦 Total products loaded:', products.length);
      
      // Separate products by stock level
      const lowStock = [];
      const outOfStock = [];
      
      products.forEach(product => {
        const stockQuantity = parseFloat(product.stock_quantity) || 0;
        const minStockLevel = parseFloat(product.min_stock_level) || 5;
        
        if (stockQuantity <= 0) {
          outOfStock.push({
            ...product,
            stockQuantity,
            minStockLevel,
            severity: 'critical'
          });
        } else if (stockQuantity <= minStockLevel) {
          lowStock.push({
            ...product,
            stockQuantity,
            minStockLevel,
            severity: 'warning'
          });
        }
      });
      
      // Sort by severity (out of stock first) then by stock level
      outOfStock.sort((a, b) => a.stockQuantity - b.stockQuantity);
      lowStock.sort((a, b) => a.stockQuantity - b.stockQuantity);
      
      setLowStockProducts(lowStock);
      setOutOfStockProducts(outOfStock);
      
      console.log('⚠️ Low stock products:', lowStock.length);
      console.log('🔴 Out of stock products:', outOfStock.length);
      
    } catch (error) {
      console.error('❌ Error loading low stock products:', error);
      Alert.alert('Error', `Failed to load products: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLowStockProducts();
  };

  const getStockStatusColor = (stockQuantity, minStockLevel) => {
    if (stockQuantity <= 0) return '#ef4444'; // Red for out of stock
    if (stockQuantity <= minStockLevel) return '#f59e0b'; // Yellow for low stock
    return '#10b981'; // Green for normal stock
  };

  const getStockStatusText = (stockQuantity, minStockLevel) => {
    if (stockQuantity <= 0) return 'OUT OF STOCK';
    if (stockQuantity <= minStockLevel) return 'LOW STOCK';
    return 'IN STOCK';
  };

  const getStockStatusIcon = (stockQuantity, minStockLevel) => {
    if (stockQuantity <= 0) return '🔴';
    if (stockQuantity <= minStockLevel) return '🟡';
    return '🟢';
  };

  const navigateToProductManagement = () => {
    navigation.navigate('Products');
  };

  const navigateToRestockManager = () => {
    navigation.navigate('RestockManager');
  };

  const renderProductCard = (product) => (
    <TouchableOpacity key={product.id} style={styles.productCard}>
      <View style={styles.productHeader}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productCategory}>{product.category || 'Uncategorized'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStockStatusColor(product.stockQuantity, product.minStockLevel) }]}>
          <Text style={styles.statusText}>
            {getStockStatusIcon(product.stockQuantity, product.minStockLevel)} {getStockStatusText(product.stockQuantity, product.minStockLevel)}
          </Text>
        </View>
      </View>
      
      <View style={styles.productDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Current Stock:</Text>
          <Text style={[styles.detailValue, { color: getStockStatusColor(product.stockQuantity, product.minStockLevel) }]}>
            {product.stockQuantity.toFixed(2)} units
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Minimum Level:</Text>
          <Text style={styles.detailValue}>{product.minStockLevel.toFixed(2)} units</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Shortage:</Text>
          <Text style={[styles.detailValue, { color: '#ef4444' }]}>
            {(product.minStockLevel - product.stockQuantity).toFixed(2)} units
          </Text>
        </View>
        
        {product.supplier && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Supplier:</Text>
            <Text style={styles.detailValue}>{product.supplier}</Text>
          </View>
        )}
        
        {product.price && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Price:</Text>
            <Text style={styles.detailValue}>${parseFloat(product.price).toFixed(2)}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={navigateToProductManagement}
        >
          <Icon name="edit" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Edit Product</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.restockButton]}
          onPress={navigateToRestockManager}
        >
          <Icon name="add-shopping-cart" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Restock</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#fff" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={onRefresh}
            disabled={refreshing}
          >
            <Icon name={refreshing ? "sync" : "refresh"} size={24} color={refreshing ? "#94a3b8" : "#fff"} />
            <Text style={[styles.refreshButtonText, refreshing && { color: '#94a3b8' }]}>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.loadingContainer}>
          <Icon name="sync" size={48} color="#3b82f6" />
          <Text style={styles.loadingText}>Loading low stock alerts...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, Platform.OS === 'web' && styles.webContainer]}
      contentContainerStyle={styles.scrollContentContainer}
      showsVerticalScrollIndicator={Platform.OS === 'web'}
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#fff" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={refreshing}
        >
          <Icon name={refreshing ? "sync" : "refresh"} size={24} color={refreshing ? "#94a3b8" : "#fff"} />
          <Text style={[styles.refreshButtonText, refreshing && { color: '#94a3b8' }]}>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>⚠️ Low Stock Alerts</Text>
        <Text style={styles.subtitle}>Monitor products that need restocking</Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <TouchableOpacity 
          style={[styles.summaryCard, styles.lowStockCard]}
          onPress={() => setSelectedTab('low-stock')}
        >
          <Text style={styles.summaryNumber}>{lowStockProducts.length}</Text>
          <Text style={styles.summaryLabel}>🟡 Low Stock</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.summaryCard, styles.outOfStockCard]}
          onPress={() => setSelectedTab('out-of-stock')}
        >
          <Text style={styles.summaryNumber}>{outOfStockProducts.length}</Text>
          <Text style={styles.summaryLabel}>🔴 Out of Stock</Text>
        </TouchableOpacity>
        
        <View style={[styles.summaryCard, styles.totalCard]}>
          <Text style={styles.summaryNumber}>{lowStockProducts.length + outOfStockProducts.length}</Text>
          <Text style={styles.summaryLabel}>⚠️ Total Alerts</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'low-stock' && styles.activeTab]}
          onPress={() => setSelectedTab('low-stock')}
        >
          <Text style={[styles.tabText, selectedTab === 'low-stock' && styles.activeTabText]}>
            Low Stock ({lowStockProducts.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'out-of-stock' && styles.activeTab]}
          onPress={() => setSelectedTab('out-of-stock')}
        >
          <Text style={[styles.tabText, selectedTab === 'out-of-stock' && styles.activeTabText]}>
            Out of Stock ({outOfStockProducts.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Products List */}
      <View style={styles.content}>
        {selectedTab === 'low-stock' ? (
          lowStockProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="check-circle" size={64} color="#10b981" />
              <Text style={styles.emptyText}>All products are well stocked!</Text>
              <Text style={styles.emptySubtext}>
                No products are currently below their minimum stock levels.
              </Text>
            </View>
          ) : (
            lowStockProducts.map(renderProductCard)
          )
        ) : (
          outOfStockProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="inventory" size={64} color="#10b981" />
              <Text style={styles.emptyText}>No products are out of stock!</Text>
              <Text style={styles.emptySubtext}>
                All products have positive stock levels.
              </Text>
            </View>
          ) : (
            outOfStockProducts.map(renderProductCard)
          )
        )}
        
        <View style={{ height: 20 }} />
      </View>
      
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  titleContainer: {
    padding: 20,
    paddingBottom: 16,
    backgroundColor: '#0f172a',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  lowStockCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  outOfStockCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  totalCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#3b82f6',
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  productCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
    color: '#94a3b8',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  productDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#374151',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  restockButton: {
    backgroundColor: '#10b981',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#374151',
    borderStyle: 'dashed',
    margin: 16,
  },
  emptyText: {
    color: '#10b981',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    fontSize: 18,
    color: '#94a3b8',
    marginTop: 16,
    fontWeight: '600',
  },
});

export default LowStockAlertsScreen;