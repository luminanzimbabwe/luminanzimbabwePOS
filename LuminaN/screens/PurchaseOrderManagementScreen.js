import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  FlatList,
  Switch,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { shopAPI } from '../services/api';
import { shopStorage } from '../services/storage';

const PurchaseOrderManagementScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [shopCredentials, setShopCredentials] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Purchase Order states
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  const [showPOForm, setShowPOForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form states
  const [poNumber, setPoNumber] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [poItems, setPoItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [poStatus, setPoStatus] = useState('draft');
  const [priority, setPriority] = useState('normal');

  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');

  useEffect(() => {
    loadShopCredentials();
  }, []);

  useEffect(() => {
    if (shopCredentials) {
      loadInitialData();
    }
  }, [shopCredentials]);

  const loadShopCredentials = async () => {
    try {
      const credentials = await shopStorage.getCredentials();
      if (credentials) {
        setShopCredentials(credentials);
      } else {
        navigation.replace('Login');
      }
    } catch (error) {
      console.error('❌ Error loading credentials:', error);
      navigation.replace('Login');
    }
  };

  const loadInitialData = async () => {
    try {
      const [productsRes, suppliersRes, poRes] = await Promise.all([
        shopAPI.getProducts(),
        shopAPI.getSuppliers(),
        shopAPI.getPurchaseOrders()
      ]);

      setProducts(productsRes.data || []);
      setSuppliers(suppliersRes.data || []);
      setPurchaseOrders(poRes.data || []);
      
      // Generate PO number if creating new
      if (!isEditing) {
        generatePONumber();
      }
    } catch (error) {
      console.error('❌ Error loading initial data:', error);
      Alert.alert('Error', 'Failed to load initial data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generatePONumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const poNum = `PO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${timestamp}-${random}`;
    setPoNumber(poNum);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadInitialData();
  }, []);

  const handleProductSelect = (product) => {
    const newItem = {
      id: Date.now(),
      product: product,
      quantity: 1,
      unitCost: product.cost_price || 0,
      totalCost: product.cost_price || 0,
    };
    setPoItems([...poItems, newItem]);
  };

  const updatePOItem = (itemId, field, value) => {
    setPoItems(poItems.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitCost') {
          updatedItem.totalCost = updatedItem.quantity * updatedItem.unitCost;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const removePOItem = (itemId) => {
    setPoItems(poItems.filter(item => item.id !== itemId));
  };

  const calculatePOTotals = () => {
    const totalItems = poItems.length;
    const totalQuantity = poItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = poItems.reduce((sum, item) => sum + item.totalCost, 0);
    
    return { totalItems, totalQuantity, totalValue };
  };

  const validatePOForm = () => {
    if (!poNumber.trim()) {
      Alert.alert('Error', 'Please enter a PO number.');
      return false;
    }
    if (!supplierName.trim()) {
      Alert.alert('Error', 'Please select a supplier.');
      return false;
    }
    if (!expectedDate.trim()) {
      Alert.alert('Error', 'Please enter expected date.');
      return false;
    }
    if (poItems.length === 0) {
      Alert.alert('Error', 'Please add at least one item to the purchase order.');
      return false;
    }
    return true;
  };

  const savePurchaseOrder = async () => {
    if (!validatePOForm()) return;

    setSaving(true);
    try {
      const totals = calculatePOTotals();
      
      const payload = {
        poNumber: poNumber,
        supplier: supplierName,
        expectedDate: expectedDate,
        notes: notes,
        status: poStatus,
        priority: priority,
        items: poItems.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitCost: item.unitCost,
          totalCost: item.totalCost,
        })),
        totals: totals,
      };

      console.log('📋 Saving purchase order:', payload);
      
      let response;
      if (isEditing && selectedPO) {
        response = await shopAPI.updatePurchaseOrder(selectedPO.id, payload);
      } else {
        response = await shopAPI.createPurchaseOrder(payload);
      }
      
      console.log('✅ Purchase order saved:', response.data);

      Alert.alert(
        'Success!',
        `Purchase order ${isEditing ? 'updated' : 'created'} successfully!\n\nPO Number: ${poNumber}`,
        [
          {
            text: 'View Orders',
            onPress: () => {
              resetForm();
              setShowPOForm(false);
              loadInitialData();
            }
          },
          {
            text: isEditing ? 'Continue Editing' : 'Create Another',
            onPress: () => {
              if (!isEditing) {
                resetForm();
                generatePONumber();
              }
            }
          }
        ]
      );

    } catch (error) {
      console.error('❌ Error saving purchase order:', error);
      Alert.alert('Error', 'Failed to save purchase order. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setPoNumber('');
    setSupplierName('');
    setExpectedDate('');
    setPoItems([]);
    setNotes('');
    setPoStatus('draft');
    setPriority('normal');
    setSelectedPO(null);
    setIsEditing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return '#6b7280';
      case 'sent': return '#3b82f6';
      case 'confirmed': return '#10b981';
      case 'received': return '#059669';
      case 'cancelled': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low': return '#10b981';
      case 'normal': return '#3b82f6';
      case 'high': return '#f59e0b';
      case 'urgent': return '#dc2626';
      default: return '#3b82f6';
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.backButton}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>📋 Purchase Orders</Text>
      <TouchableOpacity 
        style={styles.newPOButton}
        onPress={() => {
          resetForm();
          generatePONumber();
          setShowPOForm(true);
        }}
      >
        <Text style={styles.newPOButtonText}>+ New PO</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersCard}>
      <Text style={styles.filtersTitle}>Filters</Text>
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            statusFilter === 'all' && styles.filterButtonActive
          ]}
          onPress={() => setStatusFilter('all')}
        >
          <Text style={[
            styles.filterButtonText,
            statusFilter === 'all' && styles.filterButtonTextActive
          ]}>
            All
          </Text>
        </TouchableOpacity>
        
        {['draft', 'sent', 'confirmed', 'received', 'cancelled'].map(status => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterButton,
              statusFilter === status && styles.filterButtonActive
            ]}
            onPress={() => setStatusFilter(status)}
          >
            <Text style={[
              styles.filterButtonText,
              statusFilter === status && styles.filterButtonTextActive
            ]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderPOList = () => {
    const filteredPOs = purchaseOrders.filter(po => {
      const statusMatch = statusFilter === 'all' || po.status === statusFilter;
      const supplierMatch = supplierFilter === 'all' || po.supplier === supplierFilter;
      return statusMatch && supplierMatch;
    });

    return (
      <View style={styles.poListCard}>
        <Text style={styles.poListTitle}>Purchase Orders ({filteredPOs.length})</Text>
        
        {filteredPOs.length === 0 ? (
          <Text style={styles.emptyText}>No purchase orders found</Text>
        ) : (
          <FlatList
            data={filteredPOs}
            keyExtractor={(item) => item.id?.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.poItem}
                onPress={() => {
                  setSelectedPO(item);
                  setPoNumber(item.poNumber);
                  setSupplierName(item.supplier);
                  setExpectedDate(item.expectedDate);
                  setPoItems(item.items || []);
                  setNotes(item.notes || '');
                  setPoStatus(item.status);
                  setPriority(item.priority);
                  setIsEditing(true);
                  setShowPOForm(true);
                }}
              >
                <View style={styles.poItemHeader}>
                  <Text style={styles.poNumber}>{item.poNumber}</Text>
                  <View style={styles.poBadges}>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(item.status) }
                    ]}>
                      <Text style={styles.statusBadgeText}>{item.status}</Text>
                    </View>
                    <View style={[
                      styles.priorityBadge,
                      { backgroundColor: getPriorityColor(item.priority) }
                    ]}>
                      <Text style={styles.priorityBadgeText}>{item.priority}</Text>
                    </View>
                  </View>
                </View>
                
                <Text style={styles.poSupplier}>{item.supplier}</Text>
                <Text style={styles.poDate}>Expected: {item.expectedDate}</Text>
                
                <View style={styles.poStats}>
                  <Text style={styles.poStat}>
                    Items: {item.items?.length || 0}
                  </Text>
                  <Text style={styles.poStat}>
                    Value: ${item.totalValue?.toFixed(2) || '0.00'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            scrollEnabled={false}
          />
        )}
      </View>
    );
  };

  const renderPOForm = () => (
    <Modal
      visible={showPOForm}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowPOForm(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowPOForm(false)}>
            <Text style={styles.modalClose}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {isEditing ? 'Edit Purchase Order' : 'New Purchase Order'}
          </Text>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={savePurchaseOrder}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* PO Basic Info */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>PO Number</Text>
              <TextInput
                style={styles.input}
                value={poNumber}
                onChangeText={setPoNumber}
                placeholder="PO-YYYYMMDD-XXXXXX"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Supplier</Text>
              <TextInput
                style={styles.input}
                value={supplierName}
                onChangeText={setSupplierName}
                placeholder="Enter supplier name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Expected Date</Text>
              <TextInput
                style={styles.input}
                value={expectedDate}
                onChangeText={setExpectedDate}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Status</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => {
                    // Show status picker
                  }}
                >
                  <Text style={styles.pickerText}>{poStatus}</Text>
                </TouchableOpacity>
              </View>
              
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Priority</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => {
                    // Show priority picker
                  }}
                >
                  <Text style={styles.pickerText}>{priority}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* PO Items */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Items</Text>
            
            <TouchableOpacity
              style={styles.addItemButton}
              onPress={() => {
                // Show product selector
              }}
            >
              <Text style={styles.addItemButtonText}>+ Add Product</Text>
            </TouchableOpacity>

            {poItems.map(item => (
              <View key={item.id} style={styles.poItemCard}>
                <View style={styles.poItemHeader}>
                  <Text style={styles.poItemName}>{item.product.name}</Text>
                  <TouchableOpacity
                    style={styles.removeItemButton}
                    onPress={() => removePOItem(item.id)}
                  >
                    <Text style={styles.removeItemText}>✕</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.poItemDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Quantity:</Text>
                    <TextInput
                      style={styles.detailInput}
                      value={item.quantity.toString()}
                      onChangeText={(value) => updatePOItem(item.id, 'quantity', parseFloat(value) || 0)}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Unit Cost:</Text>
                    <TextInput
                      style={styles.detailInput}
                      value={item.unitCost.toString()}
                      onChangeText={(value) => updatePOItem(item.id, 'unitCost', parseFloat(value) || 0)}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Total:</Text>
                    <Text style={styles.detailValue}>${item.totalCost.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            ))}

            {poItems.length > 0 && (
              <View style={styles.poTotalCard}>
                <Text style={styles.poTotalTitle}>Order Total</Text>
                <View style={styles.poTotalRow}>
                  <Text style={styles.poTotalLabel}>Total Items:</Text>
                  <Text style={styles.poTotalValue}>{poItems.length}</Text>
                </View>
                <View style={styles.poTotalRow}>
                  <Text style={styles.poTotalLabel}>Total Quantity:</Text>
                  <Text style={styles.poTotalValue}>
                    {poItems.reduce((sum, item) => sum + item.quantity, 0)}
                  </Text>
                </View>
                <View style={styles.poTotalRow}>
                  <Text style={styles.poTotalLabel}>Total Value:</Text>
                  <Text style={styles.poTotalValue}>
                    ${poItems.reduce((sum, item) => sum + item.totalCost, 0).toFixed(2)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Notes */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional notes about this purchase order..."
              multiline
              numberOfLines={3}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading purchase orders...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderFilters()}
        {renderPOList()}
      </ScrollView>

      {renderPOForm()}
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
    fontWeight: '600',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  newPOButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  newPOButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  filtersCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  filtersTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
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
  poListCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  poListTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  poItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#444',
  },
  poItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  poNumber: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: 'bold',
  },
  poBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  poSupplier: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  poDate: {
    color: '#999',
    fontSize: 12,
    marginBottom: 8,
  },
  poStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  poStat: {
    color: '#ccc',
    fontSize: 12,
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalClose: {
    color: '#3b82f6',
    fontSize: 24,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#444',
  },
  pickerText: {
    color: '#fff',
    fontSize: 16,
  },
  addItemButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  addItemButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  poItemCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#444',
  },
  poItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  poItemName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  removeItemButton: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeItemText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  poItemDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    color: '#ccc',
    fontSize: 14,
    flex: 1,
  },
  detailInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    padding: 8,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#444',
    width: 80,
    textAlign: 'center',
  },
  detailValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    width: 80,
    textAlign: 'right',
  },
  poTotalCard: {
    backgroundColor: '#1e3a8a',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  poTotalTitle: {
    color: '#93c5fd',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  poTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  poTotalLabel: {
    color: '#bfdbfe',
    fontSize: 14,
  },
  poTotalValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default PurchaseOrderManagementScreen;