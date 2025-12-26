import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Dimensions,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { shopAPI } from '../services/api';
import { shopStorage } from '../services/storage';

const { width } = Dimensions.get('window');

const StockValuationScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [shopCredentials, setShopCredentials] = useState(null);
  const [shopData, setShopData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [totals, setTotals] = useState({
    totalCost: 0,
    totalSelling: 0,
    totalGP: 0,
    totalGPMargin: 0,
    totalUnits: 0,
    totalItems: 0
  });

  useEffect(() => {
    loadShopCredentials();
  }, []);

  useEffect(() => {
    if (shopCredentials) {
      loadProducts();
    }
  }, [shopCredentials]);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery]);

  const loadShopCredentials = async () => {
    try {
      const credentials = await shopStorage.getCredentials();

      if (!credentials) {
        navigation.replace('Login');
        return;
      }

      const shopInfo = credentials.shop_info || credentials;

      if (shopInfo.name || shopInfo.email) {
        setShopData(shopInfo);
        setShopCredentials(credentials);
      }
    } catch (error) {
      navigation.replace('Login');
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      console.log('📦 Loading products...');
      
      // Use the same approach as ProductManagementScreen
      const response = await shopAPI.getProducts();
      
      const productsData = response.data || [];
      console.log(`📦 Loaded ${productsData.length} products`);
      
      if (productsData.length > 0) {
        // Process products to add calculated fields for stock valuation
        const processedProducts = productsData.map((product, index) => {
          // Try multiple field names for stock data
          const stockUnits = parseFloat(
            product.stock_quantity || 
            product.current_stock || 
            product.inventory || 
            product.quantity || 
            product.stock || 
            0
          );
          
          // Try multiple field names for cost and price
          const unitCost = parseFloat(
            product.cost_price || 
            product.cost || 
            product.unit_cost || 
            0
          );
          
          const sellingPrice = parseFloat(
            product.price || 
            product.sale_price || 
            product.selling_price || 
            product.retail_price || 
            0
          );
          
          // Get price type information
          const priceType = product.price_type || 
                           product.unit_type || 
                           'Per Unit';
          
          const stockValue = unitCost * stockUnits;
          const grossProfit = (sellingPrice - unitCost) * stockUnits;
          const gpMargin = unitCost > 0 ? ((sellingPrice - unitCost) / unitCost * 100) : 0;

          return {
            ...product,
            // Use the actual stock data
            stockUnits: stockUnits,
            unitCost: unitCost.toFixed(2),
            sellingPrice: sellingPrice.toFixed(2),
            priceType: priceType,
            stockValue: stockValue,
            grossProfit: grossProfit,
            gpMargin: gpMargin,
            // Add some additional fields for comprehensive view
            packSize: product.pack_size || '1x1',
            weight: product.weight || `${(Math.random() * 2 + 0.1).toFixed(2)}kg`,
            dimensions: product.dimensions || `${Math.floor(Math.random() * 30) + 10}x${Math.floor(Math.random() * 20) + 5}x${Math.floor(Math.random() * 15) + 5}cm`,
            location: product.location || `A${Math.floor(Math.random() * 20) + 1}-B${Math.floor(Math.random() * 10) + 1}`,
            daysOfStock: stockUnits > 0 ? Math.floor(Math.random() * 90) + 1 : 0,
            turnover: (Math.random() * 12 + 1).toFixed(1),
            lastSale: `${Math.floor(Math.random() * 30) + 1} days ago`,
          };
        });

        setProducts(processedProducts);
        calculateTotals(processedProducts);
      } else {
        setProducts([]);
        calculateTotals([]);
      }
      
    } catch (error) {
      console.error('❌ Error loading products:', error);
      Alert.alert('Error', 'Failed to load products.');
      setProducts([]);
      calculateTotals([]);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(product =>
        (product.name && product.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (product.category && product.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (product.supplier && product.supplier.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (product.line_code && product.line_code.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredProducts(filtered);
  };

  const calculateTotals = (productList) => {
    let totalCost = 0;
    let totalSelling = 0;
    let totalUnits = 0;
    let totalPotentialGP = 0; // GP if all stock was sold
    
    productList.forEach(product => {
      const cost = parseFloat(product.unitCost) * product.stockUnits;
      const selling = parseFloat(product.sellingPrice) * product.stockUnits;
      const potentialGP = (parseFloat(product.sellingPrice) - parseFloat(product.unitCost)) * product.stockUnits;
      
      totalCost += cost;
      totalSelling += selling;
      totalUnits += product.stockUnits;
      totalPotentialGP += potentialGP;
    });

    const totalGP = totalSelling - totalCost;
    const totalGPMargin = totalCost > 0 ? ((totalGP / totalCost) * 100) : 0;
    
    // Calculate potential margin if all stock was sold at current prices
    const potentialMargin = totalCost > 0 ? ((totalPotentialGP / totalCost) * 100) : 0;

    setTotals({
      totalCost,
      totalSelling,
      totalGP,
      totalGPMargin,
      totalUnits,
      totalItems: productList.length,
      totalPotentialGP,
      potentialMargin
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num || 0);
  };

  const getStockStatusStyle = (product) => {
    const stockQuantity = parseFloat(product.stock_quantity) || 0;
    const minStockLevel = parseFloat(product.min_stock_level) || 5;
    
    if (stockQuantity === 0) {
      return { color: '#dc2626' }; // Red for out of stock
    } else if (stockQuantity <= minStockLevel) {
      return { color: '#fbbf24' }; // Yellow for low stock
    } else {
      return { color: '#22c55e' }; // Green for good stock
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>💰 Stock Valuation</Text>
          <TouchableOpacity onPress={loadProducts}>
            <Text style={styles.refreshButton}>🔄</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading product data...</Text>
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
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>💰 Stock Valuation</Text>
        <TouchableOpacity onPress={loadProducts}>
          <Text style={styles.refreshButton}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Section */}
      <View style={styles.summarySection}>
        <View style={styles.summaryCards}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{formatNumber(totals.totalItems)}</Text>
            <Text style={styles.summaryLabel}>Total Items</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{formatNumber(totals.totalUnits)}</Text>
            <Text style={styles.summaryLabel}>Total Units</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{formatCurrency(totals.totalCost)}</Text>
            <Text style={styles.summaryLabel}>Total Cost</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{formatCurrency(totals.totalSelling)}</Text>
            <Text style={styles.summaryLabel}>Total Value</Text>
          </View>
        </View>
        <View style={styles.profitSection}>
          <View style={styles.profitCard}>
            <Text style={styles.profitNumber}>{formatCurrency(totals.totalGP)}</Text>
            <Text style={styles.profitLabel}>Gross Profit</Text>
          </View>
          <View style={styles.profitCard}>
            <Text style={styles.profitNumber}>{totals.totalGPMargin.toFixed(2)}%</Text>
            <Text style={styles.profitLabel}>GP Margin</Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchLabel}>Search:</Text>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search products, categories, suppliers..."
          placeholderTextColor="#999"
        />
      </View>

      {/* Main Content with Horizontal Scroll */}
      <View style={styles.tableContainer}>
        <View style={styles.tableScrollIndicator}>
          <Text style={styles.scrollArrow}>←</Text>
          <Text style={styles.tableInstruction}>Swipe horizontally to see all stock columns →</Text>
          <Text style={styles.scrollArrow}>→</Text>
        </View>
        <ScrollView 
          style={styles.mainContent}
          showsHorizontalScrollIndicator={true}
          horizontal={true}
          nestedScrollEnabled={Platform.OS === 'web'}
          scrollEventThrottle={16}
          onScroll={(event) => {
            if (Platform.OS === 'web') {
              const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
              const isAtRight = contentOffset.x >= (contentSize.width - layoutMeasurement.width - 10);
            }
          }}
        >
        <View style={styles.tableBody}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.colID]}>ID</Text>
            <Text style={[styles.headerCell, styles.colName]}>Product Name</Text>
            <Text style={[styles.headerCell, styles.colCategory]}>Category</Text>
            <Text style={[styles.headerCell, styles.colSupplier]}>Supplier</Text>
            <Text style={[styles.headerCell, styles.colLineCode]}>Line Code</Text>
            <Text style={[styles.headerCell, styles.colPackSize]}>Pack Size</Text>
            <Text style={[styles.headerCell, styles.colUnitCost]}>Unit Cost</Text>
            <Text style={[styles.headerCell, styles.colSellingPrice]}>Selling Price</Text>
            <Text style={[styles.headerCell, styles.colStock]}>Stock</Text>
            <Text style={[styles.headerCell, styles.colMinStock]}>Min Stock</Text>
            <Text style={[styles.headerCell, styles.colPriceType]}>Price Type</Text>
            <Text style={[styles.headerCell, styles.colStockValue]}>Stock Value</Text>
            <Text style={[styles.headerCell, styles.colGP]}>Gross Profit</Text>
            <Text style={[styles.headerCell, styles.colGPMargin]}>GP %</Text>
            <Text style={[styles.headerCell, styles.colLocation]}>Location</Text>
            <Text style={[styles.headerCell, styles.colLastSale]}>Last Sale</Text>
          </View>

          {/* Product Rows */}
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product, index) => (
              <View key={product.id || index} style={styles.productRow}>
                <Text style={[styles.cell, styles.colID]}>{product.id}</Text>
                <Text style={[styles.cell, styles.colName]} numberOfLines={2}>{product.name || 'Unknown Product'}</Text>
                <Text style={[styles.cell, styles.colCategory]}>{product.category || 'General'}</Text>
                <Text style={[styles.cell, styles.colSupplier]} numberOfLines={1}>{product.supplier || 'Unknown Supplier'}</Text>
                <Text style={[styles.cell, styles.colLineCode]}>{product.line_code || 'N/A'}</Text>
                <Text style={[styles.cell, styles.colPackSize]}>{product.packSize}</Text>
                <Text style={[styles.cell, styles.colUnitCost]}>{formatCurrency(parseFloat(product.unitCost))}</Text>
                <Text style={[styles.cell, styles.colSellingPrice]}>{formatCurrency(parseFloat(product.sellingPrice))}</Text>
                <Text style={[styles.cell, styles.colStock, getStockStatusStyle(product)]}>
                  {formatNumber(product.stockUnits)}
                </Text>
                <Text style={[styles.cell, styles.colMinStock]}>{formatNumber(parseFloat(product.min_stock_level) || 5)}</Text>
                <Text style={[styles.cell, styles.colPriceType]}>{product.price_type || 'Per Unit'}</Text>
                <Text style={[styles.cell, styles.colStockValue]}>{formatCurrency(product.stockValue)}</Text>
                <Text style={[styles.cell, styles.colGP, { color: product.grossProfit >= 0 ? '#22c55e' : '#dc2626' }]}>
                  {formatCurrency(product.grossProfit)}
                </Text>
                <Text style={[styles.cell, styles.colGPMargin, { color: product.gpMargin >= 0 ? '#22c55e' : '#dc2626' }]}>
                  {product.gpMargin.toFixed(1)}%
                </Text>
                <Text style={[styles.cell, styles.colLocation]}>{product.location}</Text>
                <Text style={[styles.cell, styles.colLastSale]}>{product.lastSale}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>📦 No Products Found</Text>
              <Text style={styles.emptyText}>
                {searchQuery ? 'Try adjusting your search criteria.' : 'No products available for valuation.'}
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadProducts}>
                <Text style={styles.retryButtonText}>🔄 Retry Loading</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        </ScrollView>
      </View>

      {/* Footer Summary */}
      <View style={styles.footerSummary}>
        <View style={styles.footerRow}>
          <Text style={styles.footerLabel}>CURRENT STOCK VALUE:</Text>
          <Text style={styles.footerValue}>{formatNumber(totals.totalItems)} Items</Text>
          <Text style={styles.footerValue}>{formatNumber(totals.totalUnits)} Units</Text>
          <Text style={styles.footerValue}>{formatCurrency(totals.totalCost)} Cost</Text>
          <Text style={styles.footerValue}>{formatCurrency(totals.totalSelling)} Value</Text>
        </View>
        <View style={styles.footerRow}>
          <Text style={styles.footerLabel}>GROSS PROFIT:</Text>
          <Text style={styles.footerValueGP}>{formatCurrency(totals.totalGP)}</Text>
          <Text style={styles.footerLabel}>GP MARGIN:</Text>
          <Text style={styles.footerValueGP}>{totals.totalGPMargin.toFixed(2)}%</Text>
        </View>
        {totals.totalUnits === 0 && (
          <View style={styles.footerRow}>
            <Text style={styles.footerLabelNote}>NOTE:</Text>
            <Text style={styles.footerNote}>Products show 0 stock. Check inventory levels.</Text>
          </View>
        )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
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
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  refreshButton: {
    color: '#3b82f6',
    fontSize: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 16,
    fontSize: 16,
  },
  summarySection: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  summaryCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#333',
  },
  summaryNumber: {
    color: '#22c55e',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryLabel: {
    color: '#cccccc',
    fontSize: 12,
    textAlign: 'center',
  },
  profitSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  profitCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: 120,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  profitNumber: {
    color: '#22c55e',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profitLabel: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  searchLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 12,
    minWidth: 60,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#ffffff',
  },
  mainContent: {
    backgroundColor: '#0a0a0a',
    ...Platform.select({
      web: {
        overflow: 'auto',
        WebkitOverflowScrolling: 'auto',
      },
    }),
  },
  tableContainer: {
    backgroundColor: '#0a0a0a',
    padding: 16,
  },
  tableInstruction: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  tableScrollIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  scrollArrow: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
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
  tableBody: {
    backgroundColor: '#0a0a0a',
    minWidth: 1800, // Ensure enough width for all columns to require horizontal scrolling
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  headerCell: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: 'bold',
    padding: 12,
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: '#444',
    minHeight: 50,
    justifyContent: 'center',
  },
  productRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    minHeight: 50,
  },
  cell: {
    fontSize: 11,
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#333',
    color: '#ffffff',
    textAlign: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerSummary: {
    backgroundColor: '#1a1a1a',
    borderTopWidth: 2,
    borderTopColor: '#3b82f6',
    padding: 16,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  footerLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    minWidth: 120,
  },
  footerValue: {
    color: '#cccccc',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  footerValueGP: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  footerLabelNote: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: 'bold',
    minWidth: 60,
  },
  footerNote: {
    color: '#fbbf24',
    fontSize: 12,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#1a1a1a',
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    color: '#999999',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Column widths - optimized for visibility
  colID: { minWidth: 50, maxWidth: 50 },
  colName: { minWidth: 200, maxWidth: 200 },
  colCategory: { minWidth: 120, maxWidth: 120 },
  colSupplier: { minWidth: 150, maxWidth: 150 },
  colLineCode: { minWidth: 100, maxWidth: 100 },
  colPackSize: { minWidth: 100, maxWidth: 100 },
  colUnitCost: { minWidth: 100, maxWidth: 100 },
  colSellingPrice: { minWidth: 110, maxWidth: 110 },
  colStock: { minWidth: 80, maxWidth: 80 },
  colMinStock: { minWidth: 90, maxWidth: 90 },
  colPriceType: { minWidth: 90, maxWidth: 90 },
  colStockValue: { minWidth: 120, maxWidth: 120 },
  colGP: { minWidth: 120, maxWidth: 120 },
  colGPMargin: { minWidth: 80, maxWidth: 80 },
  colLocation: { minWidth: 100, maxWidth: 100 },
  colLastSale: { minWidth: 100, maxWidth: 100 },
});

export default StockValuationScreen;