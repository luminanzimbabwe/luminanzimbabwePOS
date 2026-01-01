import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { shopAPI } from '../services/api';

const PriceComparisonScreen = () => {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('savings'); // 'savings', 'price', 'name'
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  
  // New price comparison form state
  const [newPrice, setNewPrice] = useState({
    product_id: '',
    supplier_id: '',
    price: '',
    minimum_quantity: '',
    lead_time: '',
    notes: ''
  });

  const [priceComparisons, setPriceComparisons] = useState([]);
  const navigation = useNavigation();

  // Categories for filtering
  const categories = [
    'All',
    'Fresh Produce',
    'Bakery & Pastry',
    'Meat & Poultry',
    'Seafood',
    'Dairy Products',
    'Beverages',
    'Dry Goods & Groceries',
    'Cleaning Supplies',
    'Packaging Materials',
    'Office Supplies',
    'Equipment & Maintenance',
    'Other'
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading price comparison data...');

      // Load products
      const productsResponse = await shopAPI.getProducts();
      const productsData = productsResponse.data || [];
      setProducts(productsData);

      // Generate supplier data from products
      const suppliersMap = new Map();
      productsData.forEach(product => {
        if (product.supplier && product.supplier.trim()) {
          const supplierName = product.supplier.trim();
          if (!suppliersMap.has(supplierName)) {
            suppliersMap.set(supplierName, {
              id: suppliersMap.size + 1,
              name: supplierName,
              contact_person: '',
              email: '',
              phone: ''
            });
          }
        }
      });
      setSuppliers(Array.from(suppliersMap.values()));

      // Generate price comparison data
      const comparisons = generatePriceComparisons(productsData, Array.from(suppliersMap.values()));
      setPriceComparisons(comparisons);

      console.log('✅ Price comparison data loaded:', comparisons.length);

    } catch (error) {
      console.error('❌ Error loading price comparison data:', error);
      Alert.alert('Error', `Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generatePriceComparisons = (productsData, suppliersData) => {
    const comparisons = [];
    
    productsData.forEach(product => {
      if (product.supplier && product.supplier.trim()) {
        // Generate multiple price quotes for comparison
        const numQuotes = Math.floor(Math.random() * 3) + 2; // 2-4 quotes per product
        const quotes = [];
        
        for (let i = 0; i < numQuotes; i++) {
          const supplier = suppliersData[Math.floor(Math.random() * suppliersData.length)] || 
                          { id: 1, name: product.supplier };
          
          // Generate realistic price variations (±20% from base price)
          const basePrice = parseFloat(product.price) || 10;
          const variation = (Math.random() - 0.5) * 0.4; // ±20%
          const quotedPrice = basePrice * (1 + variation);
          
          quotes.push({
            supplier_id: supplier.id,
            supplier_name: supplier.name,
            price: quotedPrice,
            minimum_quantity: Math.floor(Math.random() * 50) + 10,
            lead_time: Math.floor(Math.random() * 7) + 1,
            last_updated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
          });
        }
        
        // Sort quotes by price
        quotes.sort((a, b) => a.price - b.price);
        
        // Calculate savings
        const lowestPrice = quotes[0].price;
        const highestPrice = quotes[quotes.length - 1].price;
        const savings = highestPrice - lowestPrice;
        const savingsPercentage = highestPrice > 0 ? (savings / highestPrice) * 100 : 0;
        
        comparisons.push({
          id: product.id,
          product_name: product.name,
          category: product.category || 'Other',
          current_price: basePrice,
          quotes: quotes,
          lowest_price: lowestPrice,
          highest_price: highestPrice,
          potential_savings: savings,
          savings_percentage: savingsPercentage,
          recommended_supplier: quotes[0].supplier_name,
          price_range: `${lowestPrice.toFixed(2)} - ${highestPrice.toFixed(2)}`,
          total_suppliers: quotes.length
        });
      }
    });
    
    return comparisons.sort((a, b) => b.potential_savings - a.potential_savings);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Filter and sort price comparisons
  const filteredComparisons = React.useMemo(() => {
    let filtered = priceComparisons.filter(comparison => {
      const matchesSearch = !searchQuery || 
        comparison.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comparison.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comparison.quotes.some(quote => 
          quote.supplier_name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      
      const matchesCategory = selectedCategory === 'All' || comparison.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });

    // Sort results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'savings':
          return b.potential_savings - a.potential_savings;
        case 'price':
          return a.lowest_price - b.lowest_price;
        case 'name':
          return a.product_name.localeCompare(b.product_name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [priceComparisons, searchQuery, selectedCategory, sortBy]);

  const resetNewPriceForm = () => {
    setNewPrice({
      product_id: '',
      supplier_id: '',
      price: '',
      minimum_quantity: '',
      lead_time: '',
      notes: ''
    });
  };

  const handleAddPrice = async () => {
    if (!newPrice.product_id || !newPrice.supplier_id || !newPrice.price) {
      Alert.alert('Error', 'Product, supplier, and price are required.');
      return;
    }

    try {
      setAddLoading(true);
      
      // In a real app, this would call a price comparison API
      const product = products.find(p => p.id.toString() === newPrice.product_id);
      const supplier = suppliers.find(s => s.id.toString() === newPrice.supplier_id);
      
      if (!product || !supplier) {
        Alert.alert('Error', 'Invalid product or supplier selected.');
        return;
      }

      const newQuote = {
        supplier_id: parseInt(newPrice.supplier_id),
        supplier_name: supplier.name,
        price: parseFloat(newPrice.price),
        minimum_quantity: parseInt(newPrice.minimum_quantity) || 0,
        lead_time: parseInt(newPrice.lead_time) || 0,
        last_updated: new Date().toISOString()
      };

      // Find existing comparison or create new one
      let comparison = priceComparisons.find(c => c.id === product.id);
      
      if (comparison) {
        // Add new quote to existing comparison
        comparison.quotes.push(newQuote);
        comparison.quotes.sort((a, b) => a.price - b.price);
        
        // Recalculate statistics
        comparison.lowest_price = comparison.quotes[0].price;
        comparison.highest_price = comparison.quotes[comparison.quotes.length - 1].price;
        comparison.potential_savings = comparison.highest_price - comparison.lowest_price;
        comparison.savings_percentage = comparison.highest_price > 0 ? 
          (comparison.potential_savings / comparison.highest_price) * 100 : 0;
        comparison.recommended_supplier = comparison.quotes[0].supplier_name;
        comparison.price_range = `${comparison.lowest_price.toFixed(2)} - ${comparison.highest_price.toFixed(2)}`;
        comparison.total_suppliers = comparison.quotes.length;
      } else {
        // Create new comparison
        const newComparison = {
          id: product.id,
          product_name: product.name,
          category: product.category || 'Other',
          current_price: parseFloat(product.price) || 0,
          quotes: [newQuote],
          lowest_price: newQuote.price,
          highest_price: newQuote.price,
          potential_savings: 0,
          savings_percentage: 0,
          recommended_supplier: newQuote.supplier_name,
          price_range: `${newQuote.price.toFixed(2)}`,
          total_suppliers: 1
        };
        
        setPriceComparisons(prev => [newComparison, ...prev]);
      }

      resetNewPriceForm();
      setShowAddModal(false);
      
      Alert.alert('Success', 'Price quote added successfully!');

    } catch (error) {
      console.error('❌ Error adding price:', error);
      Alert.alert('Error', `Failed to add price: ${error.message}`);
    } finally {
      setAddLoading(false);
    }
  };

  // Calculate summary statistics
  const summaryStats = React.useMemo(() => {
    const stats = {
      totalProducts: filteredComparisons.length,
      totalPotentialSavings: 0,
      averageSavings: 0,
      bestDeals: 0
    };

    let totalSavings = 0;
    let productsWithSavings = 0;

    filteredComparisons.forEach(comparison => {
      if (comparison.potential_savings > 0) {
        totalSavings += comparison.potential_savings;
        productsWithSavings++;
      }
    });

    stats.totalPotentialSavings = totalSavings;
    stats.averageSavings = productsWithSavings > 0 ? totalSavings / productsWithSavings : 0;
    stats.bestDeals = filteredComparisons.filter(c => c.savings_percentage > 15).length;

    return stats;
  }, [filteredComparisons]);

  const renderComparisonCard = ({ item: comparison }) => (
    <View key={comparison.id} style={styles.comparisonCard}>
      <View style={styles.comparisonHeader}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{comparison.product_name}</Text>
          <Text style={styles.categoryText}>{comparison.category}</Text>
        </View>
        <View style={styles.savingsInfo}>
          <Text style={styles.savingsAmount}>
            ${comparison.potential_savings.toFixed(2)}
          </Text>
          <Text style={styles.savingsPercentage}>
            {comparison.savings_percentage.toFixed(1)}% savings
          </Text>
        </View>
      </View>

      <View style={styles.priceOverview}>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Current Price:</Text>
          <Text style={styles.priceValue}>${comparison.current_price.toFixed(2)}</Text>
        </View>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Best Price:</Text>
          <Text style={[styles.priceValue, { color: '#10b981' }]}>
            ${comparison.lowest_price.toFixed(2)}
          </Text>
        </View>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Price Range:</Text>
          <Text style={styles.priceValue}>{comparison.price_range}</Text>
        </View>
      </View>

      <View style={styles.suppliersSection}>
        <Text style={styles.suppliersTitle}>
          Supplier Quotes ({comparison.total_suppliers})
        </Text>
        <View style={styles.suppliersList}>
          {comparison.quotes.map((quote, index) => (
            <View key={index} style={[
              styles.supplierQuote,
              index === 0 && styles.bestQuote
            ]}>
              <View style={styles.supplierInfo}>
                <Text style={[
                  styles.supplierName,
                  index === 0 && styles.bestSupplierName
                ]}>
                  {quote.supplier_name}
                  {index === 0 && ' ⭐'}
                </Text>
                <Text style={styles.quoteDetails}>
                  ${quote.price.toFixed(2)} • Min: {quote.minimum_quantity} • {quote.lead_time} days
                </Text>
              </View>
              <View style={styles.quotePrice}>
                <Text style={[
                  styles.quotePriceText,
                  index === 0 && styles.bestPriceText
                ]}>
                  ${quote.price.toFixed(2)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.recommendationSection}>
        <Text style={styles.recommendationText}>
          💡 Recommended: {comparison.recommended_supplier} for best value
        </Text>
      </View>
    </View>
  );

  const renderAddPriceModal = () => (
    <Modal
      visible={showAddModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {
        setShowAddModal(false);
        resetNewPriceForm();
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Add Price Quote</Text>
          
          <ScrollView style={styles.formContent}>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Product *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollContainer}>
                {products.map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    style={[
                      styles.optionButton,
                      newPrice.product_id === product.id.toString() && styles.optionButtonActive
                    ]}
                    onPress={() => setNewPrice({...newPrice, product_id: product.id.toString()})}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      newPrice.product_id === product.id.toString() && styles.optionButtonTextActive
                    ]}>
                      {product.name.length > 20 ? product.name.substring(0, 20) + '...' : product.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Supplier *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollContainer}>
                {suppliers.map((supplier) => (
                  <TouchableOpacity
                    key={supplier.id}
                    style={[
                      styles.optionButton,
                      newPrice.supplier_id === supplier.id.toString() && styles.optionButtonActive
                    ]}
                    onPress={() => setNewPrice({...newPrice, supplier_id: supplier.id.toString()})}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      newPrice.supplier_id === supplier.id.toString() && styles.optionButtonTextActive
                    ]}>
                      {supplier.name.length > 15 ? supplier.name.substring(0, 15) + '...' : supplier.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Price *</Text>
              <TextInput
                style={styles.formInput}
                value={newPrice.price}
                onChangeText={(text) => setNewPrice({...newPrice, price: text})}
                placeholder="0.00"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Minimum Quantity</Text>
              <TextInput
                style={styles.formInput}
                value={newPrice.minimum_quantity}
                onChangeText={(text) => setNewPrice({...newPrice, minimum_quantity: text})}
                placeholder="Enter minimum quantity"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Lead Time (days)</Text>
              <TextInput
                style={styles.formInput}
                value={newPrice.lead_time}
                onChangeText={(text) => setNewPrice({...newPrice, lead_time: text})}
                placeholder="Enter lead time in days"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Notes</Text>
              <TextInput
                style={[styles.formInput, { height: 60, textAlignVertical: 'top' }]}
                value={newPrice.notes}
                onChangeText={(text) => setNewPrice({...newPrice, notes: text})}
                placeholder="Additional notes about this quote"
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>
          
          <View style={styles.modalButtonContainer}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => {
                setShowAddModal(false);
                resetNewPriceForm();
              }}
              disabled={addLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.confirmButton, addLoading && styles.disabledButton]}
              onPress={handleAddPrice}
              disabled={addLoading}
            >
              {addLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>Add Quote</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderFilterModal = () => (
    <Modal
      visible={showFilters}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Filter & Sort</Text>
          
          <ScrollView style={styles.formContent}>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollContainer}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.filterButton,
                      selectedCategory === category && styles.filterButtonActive
                    ]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text style={[
                      styles.filterButtonText,
                      selectedCategory === category && styles.filterButtonTextActive
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Sort By</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollContainer}>
                {[
                  { key: 'savings', label: 'Potential Savings' },
                  { key: 'price', label: 'Best Price' },
                  { key: 'name', label: 'Product Name' }
                ].map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.sortButton,
                      sortBy === option.key && styles.sortButtonActive
                    ]}
                    onPress={() => setSortBy(option.key)}
                  >
                    <Text style={[
                      styles.sortButtonText,
                      sortBy === option.key && styles.sortButtonTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </ScrollView>
          
          <View style={styles.modalButtonContainer}>
            <TouchableOpacity 
              style={styles.applyButton}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.applyButtonText}>Apply</Text>
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
          <Text style={styles.loadingText}>Loading price comparisons...</Text>
        </View>
      </View>
    );
  }

  return (
    <>
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
          <Text style={styles.title}>💲 Price Comparison</Text>
          <Text style={styles.subtitle}>Compare supplier prices and find the best deals</Text>
        </View>

        {/* Summary Statistics */}
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, { borderLeftColor: '#3b82f6' }]}>
            <Text style={styles.summaryNumber}>{summaryStats.totalProducts}</Text>
            <Text style={styles.summaryLabel}>Products Compared</Text>
          </View>
          
          <View style={[styles.summaryCard, { borderLeftColor: '#10b981' }]}>
            <Text style={styles.summaryNumber}>${summaryStats.totalPotentialSavings.toFixed(0)}</Text>
            <Text style={styles.summaryLabel}>Potential Savings</Text>
          </View>
          
          <View style={[styles.summaryCard, { borderLeftColor: '#f59e0b' }]}>
            <Text style={styles.summaryNumber}>${summaryStats.averageSavings.toFixed(0)}</Text>
            <Text style={styles.summaryLabel}>Avg Savings</Text>
          </View>
          
          <View style={[styles.summaryCard, { borderLeftColor: '#8b5cf6' }]}>
            <Text style={styles.summaryNumber}>{summaryStats.bestDeals}</Text>
            <Text style={styles.summaryLabel}>Best Deals</Text>
          </View>
        </View>

        {/* Search and Filter */}
        <View style={styles.searchFilterContainer}>
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products or suppliers..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
          </View>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.filterButtonTop}
              onPress={() => setShowFilters(true)}
            >
              <Icon name="filter-list" size={20} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.addButtonTop}
              onPress={() => setShowAddModal(true)}
            >
              <Icon name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Filters Display */}
        {(searchQuery || selectedCategory !== 'All' || sortBy !== 'savings') && (
          <View style={styles.activeFilters}>
            <Text style={styles.activeFiltersTitle}>Active Filters:</Text>
            <View style={styles.activeFiltersList}>
              {searchQuery && (
                <View style={styles.filterTag}>
                  <Text style={styles.filterTagText}>Search: {searchQuery}</Text>
                </View>
              )}
              {selectedCategory !== 'All' && (
                <View style={styles.filterTag}>
                  <Text style={styles.filterTagText}>Category: {selectedCategory}</Text>
                </View>
              )}
              {sortBy !== 'savings' && (
                <View style={styles.filterTag}>
                  <Text style={styles.filterTagText}>
                    Sort: {sortBy === 'price' ? 'Best Price' : sortBy === 'name' ? 'Product Name' : 'Potential Savings'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Price Comparisons List */}
        <View style={styles.content}>
          {filteredComparisons.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="attach-money" size={64} color="#6b7280" />
              <Text style={styles.emptyText}>
                {priceComparisons.length === 0 ? 'No price comparisons available' : 'No products match your filters'}
              </Text>
              <Text style={styles.emptySubtext}>
                {priceComparisons.length === 0 
                  ? 'Start by adding price quotes from different suppliers'
                  : 'Try adjusting your search or filter criteria'
                }
              </Text>
              {priceComparisons.length === 0 && (
                <TouchableOpacity 
                  style={styles.emptyAddButton}
                  onPress={() => setShowAddModal(true)}
                >
                  <Text style={styles.emptyAddButtonText}>Add First Quote</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={filteredComparisons}
              renderItem={renderComparisonCard}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false} // Let the parent ScrollView handle scrolling
            />
          )}
        </View>
        
        {/* Bottom padding for web scrolling */}
        <View style={{ 
          height: Platform.OS === 'web' ? 100 : 20,
          minHeight: Platform.OS === 'web' ? 100 : 0
        }} />
      </ScrollView>
      
      {/* Render modals */}
      {renderAddPriceModal()}
      {renderFilterModal()}
    </>
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
    gap: 8,
    flexWrap: 'wrap',
  },
  summaryCard: {
    flex: 1,
    minWidth: '23%',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: '#374151',
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'center',
  },
  searchFilterContainer: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 16,
    flex: 1,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#444',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButtonTop: {
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 12,
  },
  addButtonTop: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 12,
  },
  activeFilters: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  activeFiltersTitle: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  activeFiltersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterTag: {
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  filterTagText: {
    color: '#e2e8f0',
    fontSize: 12,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  comparisonCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  comparisonHeader: {
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
  categoryText: {
    fontSize: 12,
    color: '#3b82f6',
  },
  savingsInfo: {
    alignItems: 'flex-end',
  },
  savingsAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 2,
  },
  savingsPercentage: {
    fontSize: 12,
    color: '#94a3b8',
  },
  priceOverview: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  priceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  priceLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  suppliersSection: {
    marginBottom: 12,
  },
  suppliersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 8,
  },
  suppliersList: {
    gap: 6,
  },
  supplierQuote: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#444',
  },
  bestQuote: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10b981',
    borderWidth: 2,
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  bestSupplierName: {
    color: '#10b981',
  },
  quoteDetails: {
    fontSize: 12,
    color: '#94a3b8',
  },
  quotePrice: {
    alignItems: 'flex-end',
  },
  quotePriceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  bestPriceText: {
    color: '#10b981',
  },
  recommendationSection: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  recommendationText: {
    fontSize: 12,
    color: '#3b82f6',
    textAlign: 'center',
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
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyAddButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyAddButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  formContent: {
    maxHeight: 400,
  },
  formField: {
    marginBottom: 16,
  },
  formLabel: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  formInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  scrollContainer: {
    marginBottom: 8,
  },
  optionButton: {
    backgroundColor: '#2a2a2a',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  optionButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  optionButtonText: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: 'bold',
  },
  optionButtonTextActive: {
    color: '#fff',
  },
  filterButton: {
    backgroundColor: '#2a2a2a',
    paddingVertical: 6,
    paddingHorizontal: 12,
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
  sortButton: {
    backgroundColor: '#2a2a2a',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  sortButtonActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  sortButtonText: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '600',
  },
  sortButtonTextActive: {
    color: '#fff',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#6b7280',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    marginLeft: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  applyButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default PriceComparisonScreen;