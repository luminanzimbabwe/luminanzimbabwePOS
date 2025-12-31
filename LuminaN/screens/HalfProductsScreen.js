import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { shopAPI } from '../services/api';

const HalfProductsScreen = () => {
  const navigation = useNavigation();
  const [splitProducts, setSplitProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      fetchSplitProducts();
    }
  }, [isFocused]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSplitProducts();
  };

  const fetchSplitProducts = async () => {
    try {
      const response = await shopAPI.getProducts();
      const products = response.data;
      console.log('🔍 DEBUG: Total products loaded:', products.length);
        
      // Log first few products for debugging
      products.slice(0, 3).forEach((product, index) => {
        console.log(`🔍 DEBUG: Product ${index + 1}:`, {
          id: product.id,
          name: product.name,
          barcode: product.barcode,
          line_code: product.line_code
        });
      });
        
      // Filter for split products (no barcode, or name contains "half", "quarter", etc.)
      const splitProducts = products.filter(product => {
        // Check for no barcode or empty barcode
        const hasNoBarcode = !product.barcode || 
                            product.barcode === '' || 
                            product.barcode === null || 
                            product.barcode.trim() === '';
        
        // Check if name indicates it's a split product
        const nameIndicatesSplit = /half|quarter|small|mini/i.test(product.name);
        
        // Also check if line code ends with 'H' (common pattern for split products)
        const lineCodeIndicatesSplit = product.line_code && product.line_code.endsWith('H');
        
        const isSplitProduct = hasNoBarcode || nameIndicatesSplit || lineCodeIndicatesSplit;
        
        // Log each product's split status for debugging (first few only)
        console.log(`🔍 DEBUG: Product "${product.name}" split analysis:`, {
          hasNoBarcode,
          nameIndicatesSplit,
          lineCodeIndicatesSplit,
          isSplitProduct
        });
        
        return isSplitProduct;
      });
      
      console.log('🔍 DEBUG: Split products found:', splitProducts.length);

      // Sort by name for better organization
      splitProducts.sort((a, b) => a.name.localeCompare(b.name));
      
      setSplitProducts(splitProducts);
    } catch (error) {
      console.error('Error fetching split products:', error);
      Alert.alert('Error', 'Failed to load split products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const addToCart = (product) => {
    // Navigate to POS screen with product pre-selected
    navigation.navigate('POSPrice', { 
      scannedProduct: product,
      source: 'halfProducts' 
    });
  };

  const formatPrice = (price) => {
    return `$${parseFloat(price).toFixed(2)}`;
  };

  const getStockStatus = (product) => {
    if (product.stock_quantity <= 0) return 'Out of Stock';
    if (product.stock_quantity <= 5) return 'Low Stock';
    return 'In Stock';
  };

  const getStockStatusColor = (product) => {
    if (product.stock_quantity <= 0) return '#ff4444';
    if (product.stock_quantity <= 5) return '#ff8800';
    return '#44aa44';
  };

  // Web-specific scrolling
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Inject CSS for web scrolling
      const style = document.createElement('style');
      style.textContent = `
        .half-products-scroll {
          scrollbar-width: thin;
          scrollbar-color: #ccc #f0f0f0;
        }
        .half-products-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .half-products-scroll::-webkit-scrollbar-track {
          background: #f0f0f0;
        }
        .half-products-scroll::-webkit-scrollbar-thumb {
          background: #ccc;
          border-radius: 4px;
        }
        .half-products-scroll::-webkit-scrollbar-thumb:hover {
          background: #999;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Half Products</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={onRefresh} 
            style={[styles.headerActionButton, styles.refreshButton]}
          >
            <Text style={styles.headerActionText}>🔄</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Manual Refresh Bar - At the very top */}
      <TouchableOpacity 
        style={styles.refreshBar}
        onPress={onRefresh}
        activeOpacity={0.7}
      >
        <Text style={styles.refreshBarText}>🔄 Pull to Refresh - Tap to Refresh Products</Text>
      </TouchableOpacity>

      {/* Main Scrollable Content */}
      <ScrollView 
        style={styles.mainScrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading split products...</Text>
          </View>
        ) : splitProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No split products found</Text>
            <Text style={styles.emptySubtext}>
              Products created through splitting will appear here
            </Text>
          </View>
        ) : (
          <View style={styles.productsGrid}>
            {splitProducts.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.productCard}
                onPress={() => addToCart(product)}
                disabled={product.stock_quantity <= 0}
              >
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {product.name}
                  </Text>
                  
                  <Text style={styles.productPrice}>
                    {formatPrice(product.price)}
                  </Text>
                  
                  <Text style={styles.productCategory}>
                    {product.category || 'Uncategorized'}
                  </Text>
                  
                  <View style={styles.stockInfo}>
                    <Text style={[
                      styles.stockStatus,
                      { color: getStockStatusColor(product) }
                    ]}>
                      {getStockStatus(product)}
                    </Text>
                    <Text style={styles.stockQuantity}>
                      Qty: {product.stock_quantity}
                    </Text>
                  </View>

                  {(!product.barcode || product.barcode.trim() === '') && (
                    <View style={styles.noBarcodeBadge}>
                      <Text style={styles.noBarcodeText}>No Barcode</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0a0a0a' 
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
    fontWeight: '600'
  },
  headerTitle: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#333',
    borderRadius: 6,
  },
  refreshButton: {
    backgroundColor: '#10b981',
  },
  headerActionText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },

  // Manual Refresh Bar at very top
  refreshBar: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#059669',
  },
  refreshBarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Main Scrollable Content
  mainScrollView: {
    flex: 1,
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 40
  },
  loadingText: { 
    color: '#ccc', 
    marginTop: 16,
    fontSize: 16
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
  },
  productCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 16,
    width: '47%',
    minHeight: 140,
    borderWidth: 1,
    borderColor: '#333',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productInfo: {
    padding: 16,
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    lineHeight: 20,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 5,
  },
  productCategory: {
    fontSize: 12,
    color: '#3b82f6',
    marginBottom: 10,
  },
  stockInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  stockStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  stockQuantity: {
    fontSize: 12,
    color: '#666',
  },
  noBarcodeBadge: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  noBarcodeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#92400e',
  },
});

export default HalfProductsScreen;