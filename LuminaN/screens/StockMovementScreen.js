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

const StockMovementScreen = () => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMovementType, setSelectedMovementType] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  
  // New movement form state
  const [newMovement, setNewMovement] = useState({
    product_id: '',
    movement_type: 'adjustment',
    quantity: '',
    unit_cost: '',
    reference_number: '',
    notes: '',
    performed_by: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [products, setProducts] = useState([]);
  const navigation = useNavigation();

  // Movement types
  const movementTypes = [
    'All',
    'stock_in',
    'stock_out', 
    'transfer',
    'adjustment',
    'waste',
    'sale',
    'return',
    'damage'
  ];

  const movementTypeLabels = {
    'All': 'All Movements',
    'stock_in': 'Stock In',
    'stock_out': 'Stock Out',
    'transfer': 'Transfer',
    'adjustment': 'Adjustment',
    'waste': 'Waste',
    'sale': 'Sale',
    'return': 'Return',
    'damage': 'Damage'
  };

  const movementTypeColors = {
    'stock_in': '#10b981',
    'stock_out': '#ef4444',
    'transfer': '#3b82f6',
    'adjustment': '#f59e0b',
    'waste': '#8b5cf6',
    'sale': '#06b6d4',
    'return': '#84cc16',
    'damage': '#dc2626'
  };

  useEffect(() => {
    loadStockMovements();
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      console.log('🔄 Loading products for stock movements...');
      const response = await shopAPI.getProducts();
      
      let productsData = [];
      if (response?.data) {
        productsData = Array.isArray(response.data) ? response.data : [];
      }
      
      console.log('📦 Products loaded:', productsData.length);
      if (productsData.length === 0) {
        // Add fallback sample products if none available
        console.log('ℹ️ No products found, adding sample products');
        productsData = [
          { id: 1, name: 'Sample Product 1' },
          { id: 2, name: 'Sample Product 2' },
          { id: 3, name: 'Sample Product 3' }
        ];
      }
      
      setProducts(productsData);
      console.log('✅ Products set in state:', productsData.length);
    } catch (error) {
      console.error('❌ Error loading products:', error);
      // Set fallback products even on error
      const fallbackProducts = [
        { id: 1, name: 'Sample Product 1' },
        { id: 2, name: 'Sample Product 2' },
        { id: 3, name: 'Sample Product 3' }
      ];
      setProducts(fallbackProducts);
      console.log('⚠️ Using fallback products due to error');
    }
  };

  const loadStockMovements = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading stock movements...');

      // In a real app, this would be a dedicated stock movements API
      // For demo purposes, we'll generate sample movement data
      const sampleMovements = generateSampleMovements();
      setMovements(sampleMovements);

      console.log('✅ Stock movements loaded:', sampleMovements.length);

    } catch (error) {
      console.error('❌ Error loading stock movements:', error);
      Alert.alert('Error', `Failed to load stock movements: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateSampleMovements = () => {
    const sampleData = [];
    const types = ['stock_in', 'stock_out', 'transfer', 'adjustment', 'waste', 'sale', 'return', 'damage'];
    const productsList = products.length > 0 ? products : [
      { id: 1, name: 'Sample Product 1' },
      { id: 2, name: 'Sample Product 2' },
      { id: 3, name: 'Sample Product 3' }
    ];

    for (let i = 1; i <= 50; i++) {
      const randomType = types[Math.floor(Math.random() * types.length)];
      const randomProduct = productsList[Math.floor(Math.random() * productsList.length)];
      const quantity = Math.floor(Math.random() * 100) + 1;
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));

      sampleMovements.push({
        id: i,
        product_id: randomProduct.id,
        product_name: randomProduct.name,
        movement_type: randomType,
        quantity: quantity,
        unit_cost: (Math.random() * 50 + 10).toFixed(2),
        total_value: (quantity * (Math.random() * 50 + 10)).toFixed(2),
        reference_number: `MOV${i.toString().padStart(6, '0')}`,
        notes: `Sample movement ${i}`,
        performed_by: ['John Doe', 'Jane Smith', 'Bob Johnson'][Math.floor(Math.random() * 3)],
        created_at: date.toISOString(),
        date: date.toISOString().split('T')[0]
      });
    }

    return sampleMovements.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadStockMovements();
  };

  // Filter movements based on search and filters
  const filteredMovements = movements.filter(movement => {
    const matchesSearch = !searchQuery || 
      movement.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      movement.reference_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      movement.performed_by.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = selectedMovementType === 'All' || movement.movement_type === selectedMovementType;
    const matchesProduct = selectedProduct === 'All' || movement.product_id.toString() === selectedProduct;
    
    let matchesDate = true;
    if (dateFrom && dateTo) {
      const movementDate = new Date(movement.date);
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      matchesDate = movementDate >= fromDate && movementDate <= toDate;
    } else if (dateFrom) {
      const movementDate = new Date(movement.date);
      const fromDate = new Date(dateFrom);
      matchesDate = movementDate >= fromDate;
    } else if (dateTo) {
      const movementDate = new Date(movement.date);
      const toDate = new Date(dateTo);
      matchesDate = movementDate <= toDate;
    }
    
    return matchesSearch && matchesType && matchesProduct && matchesDate;
  });

  const resetNewMovementForm = () => {
    setNewMovement({
      product_id: '',
      movement_type: 'adjustment',
      quantity: '',
      unit_cost: '',
      reference_number: '',
      notes: '',
      performed_by: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const handleAddMovement = async () => {
    console.log('🔄 handleAddMovement called');
    console.log('📝 New movement data:', newMovement);
    
    // Validate required fields
    if (!newMovement.product_id || !newMovement.quantity) {
      Alert.alert('Error', 'Product and quantity are required.');
      return;
    }

    if (isNaN(parseFloat(newMovement.quantity)) || parseFloat(newMovement.quantity) <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity.');
      return;
    }

    try {
      setAddLoading(true);
      console.log('💾 Recording new movement...');
      
      // Create movement data
      const selectedProduct = products.find(p => p.id.toString() === newMovement.product_id);
      const unitCost = parseFloat(newMovement.unit_cost || 0);
      const quantity = parseFloat(newMovement.quantity);
      const totalValue = (unitCost * quantity).toFixed(2);
      
      const movementData = {
        id: movements.length + 1,
        product_id: parseInt(newMovement.product_id),
        product_name: selectedProduct?.name || 'Unknown Product',
        movement_type: newMovement.movement_type,
        quantity: quantity,
        unit_cost: unitCost.toFixed(2),
        total_value: totalValue,
        reference_number: newMovement.reference_number || `MOV${Date.now().toString().slice(-6)}`,
        notes: newMovement.notes || '',
        performed_by: newMovement.performed_by || 'System User',
        created_at: new Date().toISOString(),
        date: newMovement.date
      };

      console.log('✅ Movement data created:', movementData);
      
      // Add to movements list
      setMovements(prev => {
        const updated = [movementData, ...prev];
        console.log('📊 Updated movements count:', updated.length);
        return updated;
      });
      
      // Reset form and close modal
      resetNewMovementForm();
      setShowAddModal(false);
      
      Alert.alert('Success', 'Stock movement recorded successfully!');
      console.log('✅ Movement recorded successfully');

    } catch (error) {
      console.error('❌ Error adding movement:', error);
      Alert.alert('Error', `Failed to record movement: ${error.message}`);
    } finally {
      setAddLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedMovementType('All');
    setSelectedProduct('All');
    setDateFrom('');
    setDateTo('');
  };

  // Calculate summary statistics
  const summaryStats = React.useMemo(() => {
    const stats = {
      totalMovements: filteredMovements.length,
      totalStockIn: 0,
      totalStockOut: 0,
      totalValue: 0,
      netMovement: 0
    };

    filteredMovements.forEach(movement => {
      const quantity = parseFloat(movement.quantity) || 0;
      const value = parseFloat(movement.total_value) || 0;
      
      stats.totalValue += value;
      
      if (['stock_in', 'return'].includes(movement.movement_type)) {
        stats.totalStockIn += quantity;
        stats.netMovement += quantity;
      } else if (['stock_out', 'waste', 'sale', 'damage'].includes(movement.movement_type)) {
        stats.totalStockOut += quantity;
        stats.netMovement -= quantity;
      }
    });

    return stats;
  }, [filteredMovements]);

  const renderMovementCard = ({ item: movement }) => (
    <View key={movement.id} style={styles.movementCard}>
      <View style={styles.movementHeader}>
        <View style={styles.movementInfo}>
          <Text style={styles.productName}>{movement.product_name}</Text>
          <Text style={styles.referenceNumber}>{movement.reference_number}</Text>
        </View>
        <View style={[
          styles.movementTypeBadge, 
          { backgroundColor: movementTypeColors[movement.movement_type] || '#6b7280' }
        ]}>
          <Text style={styles.movementTypeText}>
            {movementTypeLabels[movement.movement_type] || movement.movement_type}
          </Text>
        </View>
      </View>

      <View style={styles.movementDetails}>
        <View style={styles.detailRow}>
          <Icon name="inventory" size={16} color="#94a3b8" />
          <Text style={styles.detailText}>
            Quantity: {movement.quantity} units
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Icon name="attach-money" size={16} color="#94a3b8" />
          <Text style={styles.detailText}>
            Value: ${movement.total_value}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Icon name="person" size={16} color="#94a3b8" />
          <Text style={styles.detailText}>
            By: {movement.performed_by}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Icon name="calendar-today" size={16} color="#94a3b8" />
          <Text style={styles.detailText}>
            {new Date(movement.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {movement.notes && (
        <View style={styles.notesSection}>
          <Text style={styles.notesTitle}>Notes:</Text>
          <Text style={styles.notesText}>{movement.notes}</Text>
        </View>
      )}
    </View>
  );

  const renderAddMovementModal = () => (
    <Modal
      visible={showAddModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {
        setShowAddModal(false);
        resetNewMovementForm();
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Record Stock Movement</Text>
          
          <ScrollView style={styles.formContent}>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Product * ({products.length} available)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.productScroll}>
                {products.map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    style={[
                      styles.productButton,
                      newMovement.product_id === product.id.toString() && styles.productButtonActive
                    ]}
                    onPress={() => {
                      console.log('🏷️ Product selected:', product.name, 'ID:', product.id);
                      setNewMovement({...newMovement, product_id: product.id.toString()});
                    }}
                  >
                    <Text style={[
                      styles.productButtonText,
                      newMovement.product_id === product.id.toString() && styles.productButtonTextActive
                    ]}>
                      {product.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Movement Type *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.movementTypeScroll}>
                {movementTypes.slice(1).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.movementTypeButton,
                      newMovement.movement_type === type && styles.movementTypeButtonActive,
                      { borderColor: movementTypeColors[type] }
                    ]}
                    onPress={() => setNewMovement({...newMovement, movement_type: type})}
                  >
                    <Text style={[
                      styles.movementTypeButtonText,
                      newMovement.movement_type === type && styles.movementTypeButtonTextActive,
                      { color: movementTypeColors[type] }
                    ]}>
                      {movementTypeLabels[type]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Quantity *</Text>
              <TextInput
                style={styles.formInput}
                value={newMovement.quantity}
                onChangeText={(text) => setNewMovement({...newMovement, quantity: text})}
                placeholder="Enter quantity"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Unit Cost</Text>
              <TextInput
                style={styles.formInput}
                value={newMovement.unit_cost}
                onChangeText={(text) => setNewMovement({...newMovement, unit_cost: text})}
                placeholder="0.00"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Reference Number</Text>
              <TextInput
                style={styles.formInput}
                value={newMovement.reference_number}
                onChangeText={(text) => setNewMovement({...newMovement, reference_number: text})}
                placeholder="Enter reference number"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Performed By</Text>
              <TextInput
                style={styles.formInput}
                value={newMovement.performed_by}
                onChangeText={(text) => setNewMovement({...newMovement, performed_by: text})}
                placeholder="Enter staff name"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Date</Text>
              <TextInput
                style={styles.formInput}
                value={newMovement.date}
                onChangeText={(text) => setNewMovement({...newMovement, date: text})}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Notes</Text>
              <TextInput
                style={[styles.formInput, { height: 60, textAlignVertical: 'top' }]}
                value={newMovement.notes}
                onChangeText={(text) => setNewMovement({...newMovement, notes: text})}
                placeholder="Additional notes"
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
                resetNewMovementForm();
              }}
              disabled={addLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.confirmButton, addLoading && styles.disabledButton]}
              onPress={() => {
                console.log('🚨 Record Movement button pressed!');
                console.log('📋 Current form state:', newMovement);
                handleAddMovement();
              }}
              disabled={addLoading}
            >
              {addLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>Record Movement</Text>
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
          <Text style={styles.modalTitle}>Filter Movements</Text>
          
          <ScrollView style={styles.formContent}>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Movement Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                {movementTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.filterButton,
                      selectedMovementType === type && styles.filterButtonActive
                    ]}
                    onPress={() => setSelectedMovementType(type)}
                  >
                    <Text style={[
                      styles.filterButtonText,
                      selectedMovementType === type && styles.filterButtonTextActive
                    ]}>
                      {movementTypeLabels[type]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Product</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    selectedProduct === 'All' && styles.filterButtonActive
                  ]}
                  onPress={() => setSelectedProduct('All')}
                >
                  <Text style={[
                    styles.filterButtonText,
                    selectedProduct === 'All' && styles.filterButtonTextActive
                  ]}>
                    All Products
                  </Text>
                </TouchableOpacity>
                {products.slice(0, 10).map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    style={[
                      styles.filterButton,
                      selectedProduct === product.id.toString() && styles.filterButtonActive
                    ]}
                    onPress={() => setSelectedProduct(product.id.toString())}
                  >
                    <Text style={[
                      styles.filterButtonText,
                      selectedProduct === product.id.toString() && styles.filterButtonTextActive
                    ]}>
                      {product.name.length > 15 ? product.name.substring(0, 15) + '...' : product.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Date Range</Text>
              <View style={styles.dateRow}>
                <TextInput
                  style={[styles.formInput, { flex: 1, marginRight: 8 }]}
                  value={dateFrom}
                  onChangeText={setDateFrom}
                  placeholder="From (YYYY-MM-DD)"
                />
                <TextInput
                  style={[styles.formInput, { flex: 1, marginLeft: 8 }]}
                  value={dateTo}
                  onChangeText={setDateTo}
                  placeholder="To (YYYY-MM-DD)"
                />
              </View>
            </View>
          </ScrollView>
          
          <View style={styles.modalButtonContainer}>
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={clearFilters}
            >
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.applyButton}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
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
          <Text style={styles.loadingText}>Loading stock movements...</Text>
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
        <Text style={styles.title}>📦 Stock Movements</Text>
        <Text style={styles.subtitle}>Track inventory flow and adjustments</Text>
      </View>

      {/* Summary Statistics */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, { borderLeftColor: '#3b82f6' }]}>
          <Text style={styles.summaryNumber}>{summaryStats.totalMovements}</Text>
          <Text style={styles.summaryLabel}>Total Movements</Text>
        </View>
        
        <View style={[styles.summaryCard, { borderLeftColor: '#10b981' }]}>
          <Text style={styles.summaryNumber}>{summaryStats.totalStockIn}</Text>
          <Text style={styles.summaryLabel}>Stock In</Text>
        </View>
        
        <View style={[styles.summaryCard, { borderLeftColor: '#ef4444' }]}>
          <Text style={styles.summaryNumber}>{summaryStats.totalStockOut}</Text>
          <Text style={styles.summaryLabel}>Stock Out</Text>
        </View>
        
        <View style={[styles.summaryCard, { borderLeftColor: summaryStats.netMovement >= 0 ? '#10b981' : '#ef4444' }]}>
          <Text style={styles.summaryNumber}>{summaryStats.netMovement}</Text>
          <Text style={styles.summaryLabel}>Net Movement</Text>
        </View>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchFilterContainer}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search movements, products, or reference..."
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
      {(searchQuery || selectedMovementType !== 'All' || selectedProduct !== 'All' || dateFrom || dateTo) && (
        <View style={styles.activeFilters}>
          <Text style={styles.activeFiltersTitle}>Active Filters:</Text>
          <View style={styles.activeFiltersList}>
            {searchQuery && (
              <View style={styles.filterTag}>
                <Text style={styles.filterTagText}>Search: {searchQuery}</Text>
              </View>
            )}
            {selectedMovementType !== 'All' && (
              <View style={styles.filterTag}>
                <Text style={styles.filterTagText}>Type: {movementTypeLabels[selectedMovementType]}</Text>
              </View>
            )}
            {selectedProduct !== 'All' && (
              <View style={styles.filterTag}>
                <Text style={styles.filterTagText}>Product: {products.find(p => p.id.toString() === selectedProduct)?.name || 'Unknown'}</Text>
              </View>
            )}
            {(dateFrom || dateTo) && (
              <View style={styles.filterTag}>
                <Text style={styles.filterTagText}>
                  Date: {dateFrom || '...'} to {dateTo || '...'}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Movements List */}
      <View style={styles.content}>
        {filteredMovements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="inventory" size={64} color="#6b7280" />
            <Text style={styles.emptyText}>
              {movements.length === 0 ? 'No stock movements recorded' : 'No movements match your filters'}
            </Text>
            <Text style={styles.emptySubtext}>
              {movements.length === 0 
                ? 'Start by recording your first stock movement'
                : 'Try adjusting your search or filter criteria'
              }
            </Text>
            {movements.length === 0 && (
              <TouchableOpacity 
                style={styles.emptyAddButton}
                onPress={() => setShowAddModal(true)}
              >
                <Text style={styles.emptyAddButtonText}>Record First Movement</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredMovements}
            renderItem={renderMovementCard}
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
      
      {/* Render modals */}
      {renderAddMovementModal()}
      {renderFilterModal()}
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
  movementCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  movementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  movementInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  referenceNumber: {
    fontSize: 12,
    color: '#94a3b8',
  },
  movementTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  movementTypeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  movementDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#e2e8f0',
    marginLeft: 8,
  },
  notesSection: {
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 12,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#e2e8f0',
    fontStyle: 'italic',
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
  productScroll: {
    marginBottom: 8,
  },
  productButton: {
    backgroundColor: '#2a2a2a',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  productButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  productButtonText: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: 'bold',
  },
  productButtonTextActive: {
    color: '#fff',
  },
  movementTypeScroll: {
    marginBottom: 8,
  },
  movementTypeButton: {
    backgroundColor: '#2a2a2a',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  movementTypeButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  movementTypeButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  movementTypeButtonTextActive: {
    fontWeight: 'bold',
  },
  filterScroll: {
    marginBottom: 8,
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
  dateRow: {
    flexDirection: 'row',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  clearButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    marginRight: 8,
  },
  clearButtonText: {
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
    marginLeft: 8,
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

export default StockMovementScreen;