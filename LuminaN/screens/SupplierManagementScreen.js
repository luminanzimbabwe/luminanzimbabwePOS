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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { shopAPI } from '../services/api';

const SupplierManagementScreen = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [addLoading, setAddLoading] = useState(false);
  
  // New supplier form state
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    category: '',
    products_supplied: '',
    payment_terms: '',
    notes: ''
  });

  const navigation = useNavigation();

  // Supplier categories
  const supplierCategories = [
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
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading suppliers...');

      // In a real app, this would be a dedicated suppliers API endpoint
      // For now, we'll get suppliers from products data
      const productsResponse = await shopAPI.getProducts();
      const products = productsResponse.data || [];

      // Extract unique suppliers from products
      const suppliersMap = new Map();
      products.forEach(product => {
        if (product.supplier && product.supplier.trim()) {
          const supplierName = product.supplier.trim();
          if (!suppliersMap.has(supplierName)) {
            suppliersMap.set(supplierName, {
              id: suppliersMap.size + 1,
              name: supplierName,
              contact_person: '',
              email: '',
              phone: '',
              address: '',
              category: 'Other',
              products_supplied: [],
              payment_terms: '',
              notes: '',
              product_count: 0,
              total_value: 0
            });
          }
          const supplier = suppliersMap.get(supplierName);
          supplier.products_supplied.push(product);
          supplier.product_count += 1;
          supplier.total_value += (parseFloat(product.price) || 0) * (parseFloat(product.stock_quantity) || 0);
        }
      });

      const suppliersList = Array.from(suppliersMap.values());
      setSuppliers(suppliersList);

      console.log('✅ Suppliers loaded:', suppliersList.length);

    } catch (error) {
      console.error('❌ Error loading suppliers:', error);
      Alert.alert('Error', `Failed to load suppliers: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSuppliers();
  };

  // Filter suppliers based on search and category
  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = !searchQuery || 
      supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.contact_person.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || supplier.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const resetNewSupplierForm = () => {
    setNewSupplier({
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      category: '',
      products_supplied: '',
      payment_terms: '',
      notes: ''
    });
  };

  const handleAddSupplier = async () => {
    if (!newSupplier.name.trim()) {
      Alert.alert('Error', 'Supplier name is required.');
      return;
    }

    try {
      setAddLoading(true);
      
      // In a real app, this would call a suppliers API
      const supplierData = {
        ...newSupplier,
        id: suppliers.length + 1,
        products_supplied: newSupplier.products_supplied.split(',').map(p => p.trim()).filter(p => p),
        product_count: 0,
        total_value: 0
      };

      setSuppliers(prev => [...prev, supplierData]);
      resetNewSupplierForm();
      setShowAddModal(false);
      
      Alert.alert('Success', 'Supplier added successfully!');

    } catch (error) {
      console.error('❌ Error adding supplier:', error);
      Alert.alert('Error', `Failed to add supplier: ${error.message}`);
    } finally {
      setAddLoading(false);
    }
  };

  const handleEditSupplier = (supplier) => {
    setEditingSupplier(supplier);
    setNewSupplier({
      name: supplier.name,
      contact_person: supplier.contact_person,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      category: supplier.category,
      products_supplied: supplier.products_supplied.join(', '),
      payment_terms: supplier.payment_terms,
      notes: supplier.notes
    });
    setShowEditModal(true);
  };

  const handleUpdateSupplier = async () => {
    if (!newSupplier.name.trim()) {
      Alert.alert('Error', 'Supplier name is required.');
      return;
    }

    try {
      setAddLoading(true);
      
      const updatedSupplier = {
        ...editingSupplier,
        ...newSupplier,
        products_supplied: newSupplier.products_supplied.split(',').map(p => p.trim()).filter(p => p)
      };

      setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? updatedSupplier : s));
      setShowEditModal(false);
      setEditingSupplier(null);
      resetNewSupplierForm();
      
      Alert.alert('Success', 'Supplier updated successfully!');

    } catch (error) {
      console.error('❌ Error updating supplier:', error);
      Alert.alert('Error', `Failed to update supplier: ${error.message}`);
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteSupplier = (supplier) => {
    Alert.alert(
      'Delete Supplier',
      `Are you sure you want to delete "${supplier.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setSuppliers(prev => prev.filter(s => s.id !== supplier.id));
            Alert.alert('Success', 'Supplier deleted successfully.');
          }
        }
      ]
    );
  };

  const renderSupplierCard = (supplier) => (
    <View key={supplier.id} style={styles.supplierCard}>
      <View style={styles.supplierHeader}>
        <View style={styles.supplierInfo}>
          <Text style={styles.supplierName}>{supplier.name}</Text>
          <Text style={styles.supplierCategory}>{supplier.category}</Text>
        </View>
        <View style={styles.supplierActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleEditSupplier(supplier)}
          >
            <Icon name="edit" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteSupplier(supplier)}
          >
            <Icon name="delete" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.supplierDetails}>
        {supplier.contact_person && (
          <View style={styles.detailRow}>
            <Icon name="person" size={16} color="#94a3b8" />
            <Text style={styles.detailText}>{supplier.contact_person}</Text>
          </View>
        )}
        
        {supplier.email && (
          <View style={styles.detailRow}>
            <Icon name="email" size={16} color="#94a3b8" />
            <Text style={styles.detailText}>{supplier.email}</Text>
          </View>
        )}
        
        {supplier.phone && (
          <View style={styles.detailRow}>
            <Icon name="phone" size={16} color="#94a3b8" />
            <Text style={styles.detailText}>{supplier.phone}</Text>
          </View>
        )}
        
        {supplier.address && (
          <View style={styles.detailRow}>
            <Icon name="location-on" size={16} color="#94a3b8" />
            <Text style={styles.detailText}>{supplier.address}</Text>
          </View>
        )}
      </View>

      <View style={styles.supplierStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{supplier.product_count}</Text>
          <Text style={styles.statLabel}>Products</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>${supplier.total_value.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Inventory Value</Text>
        </View>
      </View>

      {supplier.products_supplied.length > 0 && (
        <View style={styles.productsSection}>
          <Text style={styles.productsTitle}>Products Supplied:</Text>
          <View style={styles.productsList}>
            {supplier.products_supplied.slice(0, 3).map((product, index) => (
              <Text key={index} style={styles.productTag}>
                {product.name || product}
              </Text>
            ))}
            {supplier.products_supplied.length > 3 && (
              <Text style={styles.moreProducts}>
                +{supplier.products_supplied.length - 3} more
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );

  const renderSupplierModal = (isEdit = false) => (
    <Modal
      visible={isEdit ? showEditModal : showAddModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {
        if (isEdit) {
          setShowEditModal(false);
          setEditingSupplier(null);
        } else {
          setShowAddModal(false);
        }
        resetNewSupplierForm();
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>
            {isEdit ? 'Edit Supplier' : 'Add New Supplier'}
          </Text>
          
          <ScrollView style={styles.formContent}>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Supplier Name *</Text>
              <TextInput
                style={styles.formInput}
                value={newSupplier.name}
                onChangeText={(text) => setNewSupplier({...newSupplier, name: text})}
                placeholder="Enter supplier name"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Contact Person</Text>
              <TextInput
                style={styles.formInput}
                value={newSupplier.contact_person}
                onChangeText={(text) => setNewSupplier({...newSupplier, contact_person: text})}
                placeholder="Enter contact person name"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Email</Text>
              <TextInput
                style={styles.formInput}
                value={newSupplier.email}
                onChangeText={(text) => setNewSupplier({...newSupplier, email: text})}
                placeholder="Enter email address"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Phone</Text>
              <TextInput
                style={styles.formInput}
                value={newSupplier.phone}
                onChangeText={(text) => setNewSupplier({...newSupplier, phone: text})}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Address</Text>
              <TextInput
                style={[styles.formInput, { height: 60, textAlignVertical: 'top' }]}
                value={newSupplier.address}
                onChangeText={(text) => setNewSupplier({...newSupplier, address: text})}
                placeholder="Enter supplier address"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {supplierCategories.slice(1).map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryButton,
                      newSupplier.category === category && styles.categoryButtonActive
                    ]}
                    onPress={() => setNewSupplier({...newSupplier, category})}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      newSupplier.category === category && styles.categoryButtonTextActive
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Products Supplied</Text>
              <TextInput
                style={[styles.formInput, { height: 60, textAlignVertical: 'top' }]}
                value={newSupplier.products_supplied}
                onChangeText={(text) => setNewSupplier({...newSupplier, products_supplied: text})}
                placeholder="Enter product names separated by commas"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Payment Terms</Text>
              <TextInput
                style={styles.formInput}
                value={newSupplier.payment_terms}
                onChangeText={(text) => setNewSupplier({...newSupplier, payment_terms: text})}
                placeholder="e.g., Net 30, COD, etc."
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Notes</Text>
              <TextInput
                style={[styles.formInput, { height: 60, textAlignVertical: 'top' }]}
                value={newSupplier.notes}
                onChangeText={(text) => setNewSupplier({...newSupplier, notes: text})}
                placeholder="Additional notes about the supplier"
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>
          
          <View style={styles.modalButtonContainer}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => {
                if (isEdit) {
                  setShowEditModal(false);
                  setEditingSupplier(null);
                } else {
                  setShowAddModal(false);
                }
                resetNewSupplierForm();
              }}
              disabled={addLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.confirmButton, addLoading && styles.disabledButton]}
              onPress={isEdit ? handleUpdateSupplier : handleAddSupplier}
              disabled={addLoading}
            >
              {addLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>
                  {isEdit ? 'Update Supplier' : 'Add Supplier'}
                </Text>
              )}
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
          <Text style={styles.loadingText}>Loading suppliers...</Text>
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
        <Text style={styles.title}>🏢 Supplier Management</Text>
        <Text style={styles.subtitle}>Manage your supplier relationships and contacts</Text>
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, { borderLeftColor: '#3b82f6' }]}>
          <Text style={styles.summaryNumber}>{suppliers.length}</Text>
          <Text style={styles.summaryLabel}>Total Suppliers</Text>
        </View>
        
        <View style={[styles.summaryCard, { borderLeftColor: '#10b981' }]}>
          <Text style={styles.summaryNumber}>{filteredSuppliers.length}</Text>
          <Text style={styles.summaryLabel}>Filtered Results</Text>
        </View>
        
        <View style={[styles.summaryCard, { borderLeftColor: '#f59e0b' }]}>
          <Text style={styles.summaryNumber}>
            {suppliers.reduce((sum, s) => sum + s.product_count, 0)}
          </Text>
          <Text style={styles.summaryLabel}>Total Products</Text>
        </View>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchFilterContainer}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search suppliers, contacts, or email..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilterContainer}>
          {supplierCategories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryFilter,
                selectedCategory === category && styles.categoryFilterActive
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[
                styles.categoryFilterText,
                selectedCategory === category && styles.categoryFilterTextActive
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Add Supplier Button */}
      <View style={styles.addButtonContainer}>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Icon name="add" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Add New Supplier</Text>
        </TouchableOpacity>
      </View>

      {/* Suppliers List */}
      <View style={styles.content}>
        {filteredSuppliers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="business" size={64} color="#6b7280" />
            <Text style={styles.emptyText}>
              {searchQuery || selectedCategory !== 'All' 
                ? 'No suppliers match your search criteria' 
                : 'No suppliers found'
              }
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || selectedCategory !== 'All'
                ? 'Try adjusting your search or filter settings'
                : 'Start by adding your first supplier'
              }
            </Text>
          </View>
        ) : (
          filteredSuppliers.map(renderSupplierCard)
        )}
      </View>
      
      {/* Bottom padding for web scrolling */}
      <View style={{ 
        height: Platform.OS === 'web' ? 100 : 20,
        minHeight: Platform.OS === 'web' ? 100 : 0
      }} />
    </ScrollView>
  );

  // Render modals
  return (
    <>
      {renderSupplierModal(false)}
      {renderSupplierModal(true)}
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
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: '#374151',
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
  searchFilterContainer: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
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
  categoryFilterContainer: {
    marginBottom: 0,
  },
  categoryFilter: {
    backgroundColor: '#2a2a2a',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  categoryFilterActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  categoryFilterText: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryFilterTextActive: {
    color: '#fff',
  },
  addButtonContainer: {
    padding: 16,
    paddingTop: 0,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  supplierCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  supplierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  supplierCategory: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
  },
  supplierActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#374151',
    padding: 8,
    borderRadius: 6,
  },
  deleteButton: {
    backgroundColor: '#dc2626',
  },
  supplierDetails: {
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
  supplierStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  productsSection: {
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 12,
  },
  productsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 8,
  },
  productsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  productTag: {
    backgroundColor: '#374151',
    color: '#e2e8f0',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  moreProducts: {
    backgroundColor: '#374151',
    color: '#94a3b8',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
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
  categoryScroll: {
    marginBottom: 8,
  },
  categoryButton: {
    backgroundColor: '#2a2a2a',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  categoryButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  categoryButtonText: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: 'bold',
  },
  categoryButtonTextActive: {
    color: '#fff',
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
  disabledButton: {
    opacity: 0.5,
  },
});

export default SupplierManagementScreen;