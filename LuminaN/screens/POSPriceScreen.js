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
  Modal,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { shopAPI } from '../services/api';
import { shopStorage } from '../services/storage';

const POSPriceScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [shopCredentials, setShopCredentials] = useState(null);
  const [shopData, setShopData] = useState(null);
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('name'); // 'name', 'line_code', 'barcode'
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Print settings
  const [priceType, setPriceType] = useState('selling'); // 'selling', 'cost', 'both'
  const [currency, setCurrency] = useState('USD');
  const [showPrintModal, setShowPrintModal] = useState(false);
  
  // Selected products for printing
  const [selectedProducts, setSelectedProducts] = useState([]);

  useEffect(() => {
    loadShopCredentials();
  }, []);

  useEffect(() => {
    if (shopCredentials) {
      loadProducts();
    }
  }, [shopCredentials]);

  useEffect(() => {
    performSearch();
  }, [searchQuery, searchType, products]);

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
      const response = await shopAPI.getProducts();
      const productsData = response.data || [];
      setProducts(productsData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  };

  const performSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    let filtered = products.filter(product => {
      const query = searchQuery.toLowerCase();
      
      switch (searchType) {
        case 'name':
          return (product.name && product.name.toLowerCase().includes(query)) ||
                 (product.category && product.category.toLowerCase().includes(query));
        case 'line_code':
          return product.line_code && product.line_code.toLowerCase().includes(query);
        case 'barcode':
          return product.line_code && product.line_code.toLowerCase() === query;
        default:
          return false;
      }
    });

    setSearchResults(filtered);
  };

  const selectProduct = (product) => {
    setSelectedProduct(product);
    setSearchQuery('');
    setSearchResults([]);
  };

  const addToPrintQueue = (product) => {
    const existingIndex = selectedProducts.findIndex(p => p.id === product.id);
    if (existingIndex >= 0) {
      const updated = [...selectedProducts];
      updated[existingIndex].quantity = (updated[existingIndex].quantity || 1) + 1;
      setSelectedProducts(updated);
    } else {
      setSelectedProducts([...selectedProducts, { ...product, quantity: 1 }]);
    }
  };

  const updatePrintQuantity = (productId, quantity) => {
    setSelectedProducts(prev => 
      prev.map(p => 
        p.id === productId ? { ...p, quantity: Math.max(1, quantity) } : p
      )
    );
  };

  const removeFromPrintQueue = (productId) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== productId));
  };

  const handlePrint = () => {
    if (selectedProducts.length === 0) {
      Alert.alert('No Products', 'Please add products to the print queue.');
      return;
    }

    setShowPrintModal(true);
  };

  const confirmPrint = () => {
    Alert.alert(
      'Print Labels',
      `Print ${selectedProducts.length} price labels?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Print',
          onPress: () => {
            // Here you would implement actual printing logic
            console.log('Printing labels for:', selectedProducts);
            Alert.alert('Success', 'Price labels sent to printer!');
            setSelectedProducts([]);
            setShowPrintModal(false);
          }
        }
      ]
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const getProductPrice = (product, type) => {
    switch (type) {
      case 'selling':
        return product.price || 0;
      case 'cost':
        return product.cost_price || 0;
      default:
        return 0;
    }
  };

  const renderSearchTypeSelector = () => (
    <View style={styles.searchTypeContainer}>
      <Text style={styles.searchTypeLabel}>Search by:</Text>
      <View style={styles.searchTypeButtons}>
        {[
          { key: 'name', label: 'Product Name' },
          { key: 'line_code', label: 'Line Code' },
          { key: 'barcode', label: 'Barcode' }
        ].map((type) => (
          <TouchableOpacity
            key={type.key}
            style={[
              styles.searchTypeButton,
              searchType === type.key && styles.searchTypeButtonActive
            ]}
            onPress={() => setSearchType(type.key)}
          >
            <Text style={[
              styles.searchTypeButtonText,
              searchType === type.key && styles.searchTypeButtonTextActive
            ]}>
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderSearchInput = () => (
    <View style={styles.searchContainer}>
      <TextInput
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={
          searchType === 'name' ? 'Search by product name...' :
          searchType === 'line_code' ? 'Enter line code...' :
          'Scan or enter barcode...'
        }
        placeholderTextColor="#999"
      />
    </View>
  );

  const renderSearchResults = () => {
    if (searchResults.length === 0) return null;

    return (
      <View style={styles.searchResultsContainer}>
        <Text style={styles.searchResultsTitle}>Search Results ({searchResults.length})</Text>
        <ScrollView 
          style={styles.searchResultsList} 
          nestedScrollEnabled={Platform.OS === 'web'}
          showsVerticalScrollIndicator={true}
          scrollEventThrottle={16}
          onScroll={(event) => {
            if (Platform.OS === 'web') {
              // Prevent scroll propagation on web
              event.stopPropagation();
            }
          }}
        >
          {searchResults.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={styles.searchResultItem}
              onPress={() => selectProduct(product)}
            >
              <View style={styles.searchResultInfo}>
                <Text style={styles.searchResultName}>{product.name}</Text>
                <Text style={styles.searchResultDetails}>
                  {`${product.category} • ${product.line_code}`}
                </Text>
                <Text style={styles.searchResultPrice}>
                  {formatCurrency(product.price)}
                </Text>
              </View>
              <Text style={styles.selectButton}>Select</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderSelectedProduct = () => {
    if (!selectedProduct) return null;

    return (
      <View style={styles.selectedProductContainer}>
        <Text style={styles.selectedProductTitle}>Selected Product</Text>
        <View style={styles.selectedProductCard}>
          <View style={styles.selectedProductInfo}>
            <Text style={styles.selectedProductName}>{selectedProduct.name}</Text>
            <Text style={styles.selectedProductDetails}>
              {`${selectedProduct.category} • ${selectedProduct.line_code}`}
            </Text>
            <Text style={styles.selectedProductPrice}>
              {formatCurrency(selectedProduct.price)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addToQueueButton}
            onPress={() => addToPrintQueue(selectedProduct)}
          >
            <Text style={styles.addToQueueButtonText}>Add to Print Queue</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderPriceSettings = () => (
    <View style={styles.priceSettingsContainer}>
      <Text style={styles.priceSettingsTitle}>Price Settings</Text>
      
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Price Type:</Text>
        <View style={styles.settingButtons}>
          {[
            { key: 'selling', label: 'Selling Price' },
            { key: 'cost', label: 'Cost Price' },
            { key: 'both', label: 'Both Prices' }
          ].map((type) => (
            <TouchableOpacity
              key={type.key}
              style={[
                styles.settingButton,
                priceType === type.key && styles.settingButtonActive
              ]}
              onPress={() => setPriceType(type.key)}
            >
              <Text style={[
                styles.settingButtonText,
                priceType === type.key && styles.settingButtonTextActive
              ]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Currency:</Text>
        <TextInput
          style={styles.currencyInput}
          value={currency}
          onChangeText={setCurrency}
          placeholder="USD"
          maxLength={3}
        />
      </View>
    </View>
  );

  const renderPrintQueue = () => {
    if (selectedProducts.length === 0) return null;

    return (
      <View style={styles.printQueueContainer}>
        <View style={styles.printQueueHeader}>
          <Text style={styles.printQueueTitle}>Print Queue ({selectedProducts.length})</Text>
          <TouchableOpacity style={styles.clearQueueButton} onPress={() => setSelectedProducts([])}>
            <Text style={styles.clearQueueButtonText}>Clear All</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          style={styles.printQueueList} 
          nestedScrollEnabled={Platform.OS === 'web'}
          showsVerticalScrollIndicator={true}
          scrollEventThrottle={16}
          onScroll={(event) => {
            if (Platform.OS === 'web') {
              // Prevent scroll propagation on web
              event.stopPropagation();
            }
          }}
        >
          {selectedProducts.map((product) => (
            <View key={product.id} style={styles.printQueueItem}>
              <View style={styles.printQueueInfo}>
                <Text style={styles.printQueueName}>{product.name}</Text>
                <Text style={styles.printQueueDetails}>
                  {`${product.line_code} • ${formatCurrency(getProductPrice(product, priceType))}`}
                </Text>
              </View>
              
              <View style={styles.printQueueActions}>
                <View style={styles.quantityControl}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => updatePrintQuantity(product.id, (product.quantity || 1) - 1)}
                  >
                    <Text style={styles.quantityButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.quantityDisplay}>{product.quantity || 1}</Text>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => updatePrintQuantity(product.id, (product.quantity || 1) + 1)}
                  >
                    <Text style={styles.quantityButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeFromPrintQueue(product.id)}
                >
                  <Text style={styles.removeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
        
        <TouchableOpacity style={styles.printButton} onPress={handlePrint}>
          <Text style={styles.printButtonText}>🖨️ Print {selectedProducts.length} Labels</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderPrintModal = () => (
    <Modal
      visible={showPrintModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowPrintModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Print Price Labels</Text>
          
          <View style={styles.printSummary}>
            <Text style={styles.printSummaryText}>
              {selectedProducts.length} product(s) selected
            </Text>
            <Text style={styles.printSummaryText}>
              Price Type: {priceType}
            </Text>
            <Text style={styles.printSummaryText}>
              Currency: {currency}
            </Text>
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowPrintModal(false)}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.modalPrintButton}
              onPress={confirmPrint}
            >
              <Text style={styles.modalPrintButtonText}>Print</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🏷️ POS Price Labels</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading products...</Text>
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
        <Text style={styles.headerTitle}>🏷️ POS Price Labels</Text>
        <TouchableOpacity onPress={loadProducts}>
          <Text style={styles.refreshButton}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Search Type Selector */}
      {renderSearchTypeSelector()}

      {/* Search Input */}
      {renderSearchInput()}

      {/* Search Results */}
      {renderSearchResults()}

      {/* Selected Product */}
      {renderSelectedProduct()}

      {/* Price Settings */}
      {renderPriceSettings()}

      {/* Print Queue */}
      {renderPrintQueue()}
      
      {/* Bottom padding for web scrolling - force content to be scrollable */}
      <View style={{ 
        height: Platform.OS === 'web' ? 200 : 20,
        minHeight: Platform.OS === 'web' ? 200 : 0
      }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    height: '100vh',
    ...Platform.select({
      web: {
        height: '100vh',
        overflow: 'hidden',
      },
    }),
  },
  webContainer: {
    ...Platform.select({
      web: {
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'auto',
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
  content: {
    flex: 1,
    height: '100vh',
    ...Platform.select({
      web: {
        overflow: 'auto',
        WebkitOverflowScrolling: 'auto',
        maxHeight: '100vh',
        height: 'calc(100vh - 120px)',
      },
    }),
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'web' ? 100 : 0,
    minHeight: Platform.OS === 'web' ? 'calc(100vh - 120px + 200px)' : 0,
    ...Platform.select({
      web: {
        minHeight: 'calc(100vh - 120px + 200px)',
        width: '100%',
      },
    }),
  },
  
  // Search Type Selector
  searchTypeContainer: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  searchTypeLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  searchTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  searchTypeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#444',
  },
  searchTypeButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  searchTypeButtonText: {
    color: '#cccccc',
    fontSize: 12,
    fontWeight: '600',
  },
  searchTypeButtonTextActive: {
    color: '#ffffff',
  },

  // Search Input
  searchContainer: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  searchInput: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#ffffff',
  },

  // Search Results
  searchResultsContainer: {
    backgroundColor: '#1a1a1a',
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    maxHeight: 300,
  },
  searchResultsTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  searchResultsList: {
    maxHeight: 244,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  searchResultDetails: {
    color: '#cccccc',
    fontSize: 12,
    marginBottom: 4,
  },
  searchResultPrice: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: 'bold',
  },
  selectButton: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
  },

  // Selected Product
  selectedProductContainer: {
    backgroundColor: '#1a1a1a',
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  selectedProductTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  selectedProductCard: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedProductInfo: {
    flex: 1,
  },
  selectedProductName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  selectedProductDetails: {
    color: '#cccccc',
    fontSize: 12,
    marginBottom: 4,
  },
  selectedProductPrice: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addToQueueButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  addToQueueButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Price Settings
  priceSettingsContainer: {
    backgroundColor: '#1a1a1a',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  priceSettingsTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  settingRow: {
    marginBottom: 16,
  },
  settingLabel: {
    color: '#cccccc',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  settingButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  settingButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#444',
  },
  settingButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  settingButtonText: {
    color: '#cccccc',
    fontSize: 12,
    fontWeight: '600',
  },
  settingButtonTextActive: {
    color: '#ffffff',
  },
  currencyInput: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#ffffff',
    width: 100,
  },

  // Print Queue
  printQueueContainer: {
    backgroundColor: '#1a1a1a',
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  printQueueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  printQueueTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  clearQueueButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  clearQueueButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  printQueueList: {
    maxHeight: 400,
  },
  printQueueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  printQueueInfo: {
    flex: 1,
  },
  printQueueName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  printQueueDetails: {
    color: '#cccccc',
    fontSize: 12,
  },
  printQueueActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
  },
  quantityButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quantityButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quantityDisplay: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 12,
    minWidth: 30,
    textAlign: 'center',
  },
  removeButton: {
    backgroundColor: '#dc2626',
    borderRadius: 6,
    padding: 6,
  },
  removeButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  printButton: {
    backgroundColor: '#10b981',
    margin: 16,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  printButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  printSummary: {
    marginBottom: 24,
  },
  printSummaryText: {
    color: '#cccccc',
    fontSize: 14,
    marginBottom: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    backgroundColor: '#6b7280',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalPrintButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  modalPrintButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default POSPriceScreen;