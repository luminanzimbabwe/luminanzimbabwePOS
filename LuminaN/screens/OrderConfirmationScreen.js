import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { shopStorage } from '../services/storage';
import { shopAPI } from '../services/api';

const OrderConfirmationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  // Check if this is being called with specific order data (from navigation)
  const hasSpecificOrder = route.params && route.params.orderId;
  
  // Get order data from route params if available
  const {
    orderId,
    receivingReference,
    invoiceNumber,
    supplierName,
    receivingDate,
    notes,
    receivingItems,
    totals,
    onConfirm,
    onEdit
  } = route.params || {};
  
  // State for order management
  const [pendingOrders, setPendingOrders] = useState([]);
  const [confirmedOrders, setConfirmedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('pending'); // 'pending' or 'confirmed'
  const [viewingOrder, setViewingOrder] = useState(null);
  const [savingState, setSavingState] = useState(false);

  useEffect(() => {
    // Always load orders when screen mounts
    loadOrders();
    
    // Test API connection on mount
    testAPIConnection();
  }, []);
  
  const testAPIConnection = async () => {
    try {
      console.log('🔌 Testing API connection on screen mount...');
      const result = await shopAPI.testConnection();
      console.log('📡 API test result:', result);
      
      if (!result.success) {
        console.warn('⚠️ API connection failed:', result.error);
        Alert.alert(
          'Backend Connection Issue',
          `Cannot connect to backend server:\n${result.error}\n\nThis might be why inventory updates aren't working.`,
          [{ text: 'OK' }]
        );
      } else {
        console.log('✅ API connection successful');
      }
    } catch (error) {
      console.error('❌ API test error:', error);
    }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading orders from storage...');
      
      // Load pending orders
      const pendingJson = await shopStorage.getItem('pending_orders');
      console.log('📦 Pending orders JSON:', pendingJson);
      
      let pending = [];
      try {
        pending = JSON.parse(pendingJson || '[]');
      } catch (parseError) {
        console.warn('⚠️ Failed to parse pending orders:', parseError);
        pending = [];
      }
      
      console.log('📋 Raw pending orders:', pending);
      console.log('📊 Pending orders count:', pending.length);
      
      // Check each order's status
      pending.forEach((order, index) => {
        console.log(`Order ${index + 1}:`, {
          id: order.id,
          status: order.status,
          supplierName: order.supplierName
        });
      });
      
      // Load confirmed orders
      const confirmedJson = await shopStorage.getItem('confirmed_orders');
      console.log('✅ Confirmed orders JSON:', confirmedJson);
      
      let confirmed = [];
      try {
        confirmed = JSON.parse(confirmedJson || '[]');
      } catch (parseError) {
        console.warn('⚠️ Failed to parse confirmed orders:', parseError);
        confirmed = [];
      }
      
      // Filter by status and remove duplicates
      const pendingOrdersList = pending
        .filter(order => order && order.status === 'pending_review')
        .filter((order, index, self) => 
          index === self.findIndex(o => o.id === order.id)
        );
      
      const confirmedOrdersList = confirmed
        .filter(order => order && order.status === 'confirmed')
        .filter((order, index, self) => 
          index === self.findIndex(o => o.id === order.id)
        );
      
      console.log('🔍 Filtered pending orders:', pendingOrdersList);
      console.log('🔍 Filtered confirmed orders:', confirmedOrdersList);
      console.log('📈 Final pending count:', pendingOrdersList.length);
      console.log('📈 Final confirmed count:', confirmedOrdersList.length);
      
      setPendingOrders(pendingOrdersList);
      setConfirmedOrders(confirmedOrdersList);
      
      console.log('✅ Orders loaded successfully!');
      
    } catch (error) {
      console.error('❌ Error loading orders:', error);
      Alert.alert('Error', `Failed to load orders: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const handleConfirmOrder = async (order) => {
    try {
      setSavingState(true);
      console.log('🔄 Starting order confirmation process...');
      
      // Update product inventory first
      const inventoryResult = await updateProductInventory(order);
      
      // Move order from pending to confirmed
      const updatedPendingOrders = pendingOrders.filter(o => o.id !== order.id);
      const confirmedOrder = { 
        ...order, 
        status: 'confirmed', 
        confirmedAt: new Date().toISOString(),
        inventoryUpdated: true,
        inventoryUpdateResult: inventoryResult
      };
      const updatedConfirmedOrders = [...confirmedOrders, confirmedOrder];
      
      // Save to storage
      await shopStorage.setItem('pending_orders', JSON.stringify(updatedPendingOrders));
      await shopStorage.setItem('confirmed_orders', JSON.stringify(updatedConfirmedOrders));
      
      // Update state
      setPendingOrders(updatedPendingOrders);
      setConfirmedOrders(updatedConfirmedOrders);
      setViewingOrder(null);
      
      // Trigger refresh of Products screen by sending a signal
      await shopStorage.setItem('products_need_refresh', 'true');
      console.log('🔄 Triggered Products screen refresh signal');
      
      // Show detailed success message
      let message = `✅ Order ${order.id} confirmed successfully!\n\n📋 Order processed`;
      
      if (inventoryResult) {
        if (inventoryResult.error) {
          message += `\n⚠️ Inventory update had issues: ${inventoryResult.error}`;
        } else {
          message += `\n📦 Inventory updated: ${inventoryResult.successful} products`;
          if (inventoryResult.failed > 0) {
            message += `\n⚠️ Failed updates: ${inventoryResult.failed} products`;
          }
          if (inventoryResult.verified > 0) {
            message += `\n✅ ${inventoryResult.verified} products verified updated`;
          }
        }
      }
      
      message += `\n\n💡 Products screen will show updated stock levels`;
      
      Alert.alert(
        'Order Confirmation Complete',
        message,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('❌ Error confirming order:', error);
      Alert.alert(
        'Order Confirmation Failed', 
        `Failed to confirm order: ${error.message}\n\nPlease try again.`,
        [{ text: 'OK' }]
      );
    } finally {
      setSavingState(false);
    }
  };

  const updateProductInventory = async (order) => {
    try {
      console.log('📦 Starting inventory update for order:', order.id);
      console.log('🔍 Order items:', order.receivingItems?.length || 0);
      
      // Load shop credentials first (like in ProductManagementScreen)
      const credentials = await shopStorage.getCredentials();
      if (!credentials) {
        throw new Error('Shop credentials not found. Please log in again.');
      }
      
      const shopInfo = credentials.shop_info || credentials;
      if (!shopInfo.name && !shopInfo.email) {
        throw new Error('Invalid shop credentials. Please log in again.');
      }
      
      console.log('🔑 Got shop credentials for inventory update');
      console.log('🏪 Shop:', shopInfo.name || shopInfo.email);
      
      // First, test API connection
      console.log('🔌 Testing API connection...');
      try {
        const testConnection = await shopAPI.testConnection();
        console.log('📡 API connection test:', testConnection);
        
        if (!testConnection.success) {
          throw new Error(`API connection failed: ${testConnection.error}`);
        }
      } catch (connError) {
        console.error('❌ API connection failed:', connError);
        throw new Error(`Cannot connect to backend server: ${connError.message}`);
      }
      
      // Get current products from backend
      console.log('📋 Fetching current products from backend...');
      const productsRes = await shopAPI.getProducts();
      const currentProducts = productsRes.data || [];
      
      console.log('📊 Current products count:', currentProducts.length);
      console.log('📋 Sample product:', currentProducts[0]);
      
      // Update each product in the order
      const updatePromises = order.receivingItems.map(async (item, index) => {
        try {
          console.log(`\n🔄 Processing item ${index + 1}/${order.receivingItems.length}:`, item.product?.name);
          
          const product = item.product;
          const receivedQuantity = parseFloat(item.quantity) || 0;
          const newCostPrice = item.costPrice || 0;
          
          // Find current product in backend data
          const currentProduct = currentProducts.find(p => p.id === product.id);
          
          if (!currentProduct) {
            console.warn(`⚠️ Product ${product.name} (ID: ${product.id}) not found in backend products`);
            console.log('🔍 Available products:', currentProducts.map(p => ({ id: p.id, name: p.name })));
            return { success: false, product: product.name, error: 'Product not found in backend' };
          }
          
          const currentStock = parseFloat(currentProduct.stock_quantity) || 0;
          const newStock = currentStock + receivedQuantity;
          
          console.log(`📦 ${product.name}:`);
          console.log(`   Current stock: ${currentStock}`);
          console.log(`   Received: ${receivedQuantity}`);
          console.log(`   New stock: ${newStock}`);
          
          // Prepare update data (matching ProductManagementScreen pattern)
          const updateData = {
            email: credentials.email,
            password: credentials.shop_owner_master_password,
            name: currentProduct.name,
            description: currentProduct.description || '',
            price: currentProduct.price || 0,
            cost_price: item.updateBaseCost ? newCostPrice : currentProduct.cost_price || 0,
            category: currentProduct.category || 'Other',
            stock_quantity: newStock,
            min_stock_level: currentProduct.min_stock_level || 5,
            supplier: currentProduct.supplier || '',
            currency: currentProduct.currency || 'USD',
            price_type: currentProduct.price_type || 'unit',
            line_code: currentProduct.line_code
          };
          
          console.log(`📤 Sending update request for ${product.name} (ID: ${product.id})`);
          console.log('📤 Update data:', updateData);
          
          // Update product in backend
          const response = await shopAPI.updateProduct(product.id, updateData);
          
          console.log(`✅ Backend response for ${product.name}:`, response.status, response.data);
          console.log(`✅ Successfully updated ${product.name} - New stock: ${newStock}`);
          
          if (item.updateBaseCost) {
            console.log(`💰 Updated cost price for ${product.name}: ${newCostPrice}`);
          }
          
          return { success: true, product: product.name, newStock, updatedCost: item.updateBaseCost };
          
        } catch (error) {
          console.error(`❌ Failed to update ${item.product?.name}:`, error);
          console.error(`❌ Error details:`, {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
          });
          return { success: false, product: item.product?.name, error: error.message };
        }
      });
      
      // Wait for all updates to complete
      console.log('\n⏳ Waiting for all updates to complete...');
      const results = await Promise.all(updatePromises);
      
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      console.log('\n📊 Final Update Results:');
      console.log(`   Total items: ${results.length}`);
      console.log(`   Successful: ${successful.length}`);
      console.log(`   Failed: ${failed.length}`);
      
      if (successful.length > 0) {
        console.log('✅ Successfully updated:', successful.map(r => `${r.product} (stock: ${r.newStock})`));
      }
      
      if (failed.length > 0) {
        console.warn('⚠️ Failed updates:', failed);
      }
      
      // Verify updates by reloading products and checking stock levels
      let verifiedCount = 0;
      if (successful.length > 0) {
        console.log('🔄 Verifying updates by reloading products...');
        try {
          const verifyRes = await shopAPI.getProducts();
          const updatedProducts = verifyRes.data || [];
          
          // Check if any of our updated products actually changed
          verifiedCount = 0;
          for (const item of order.receivingItems) {
            const originalProduct = item.product;
            const updatedProduct = updatedProducts.find(p => p.id === originalProduct.id);
            
            if (updatedProduct) {
              const originalStock = parseFloat(originalProduct.stock_quantity) || 0;
              const updatedStock = parseFloat(updatedProduct.stock_quantity) || 0;
              const expectedStock = originalStock + parseFloat(item.quantity);
              
              console.log(`🔍 Verification for ${originalProduct.name}:`);
              console.log(`   Original: ${originalStock}, Expected: ${expectedStock}, Actual: ${updatedStock}`);
              
              if (Math.abs(updatedStock - expectedStock) < 0.01) {
                verifiedCount++;
                console.log(`✅ ${originalProduct.name} stock correctly updated`);
              } else {
                console.warn(`⚠️ ${originalProduct.name} stock mismatch`);
              }
            }
          }
          
          console.log(`🎯 Verification complete: ${verifiedCount}/${successful.length} products confirmed updated`);
        } catch (verifyError) {
          console.warn('⚠️ Could not verify updates:', verifyError.message);
        }
      }
      
      console.log('✅ Product inventory update process completed!');
      return { successful: successful.length, failed: failed.length, verified: verifiedCount || 0 };
      
    } catch (error) {
      console.error('❌ Critical error in inventory update:', error);
      console.error('❌ Error stack:', error.stack);
      
      // Don't throw error - let order confirmation proceed
      console.log('⚠️ Inventory update failed, but continuing with order confirmation...');
      return { error: `${error.message} - Backend server may not be running` };
    }
  };

  const handleViewOrder = (order) => {
    setViewingOrder(order);
  };

  const handleBackToList = () => {
    setViewingOrder(null);
  };

  const handleConfirmOrderFromParams = async () => {
    try {
      // If onConfirm is provided (from navigation), use it
      if (onConfirm) {
        await onConfirm();
        return;
      }
      
      // Otherwise, handle as a direct confirmation
      const order = {
        id: orderId,
        reference: receivingReference,
        invoiceNumber: invoiceNumber,
        supplierName: supplierName,
        receivingDate: receivingDate,
        notes: notes,
        receivingItems: receivingItems,
        totals: totals,
        status: 'pending_review'
      };
      
      await handleConfirmOrder(order);
      
    } catch (error) {
      console.error('❌ Error confirming order:', error);
      Alert.alert('Order Confirmation Failed', `Failed to confirm order: ${error.message}\n\nPlease try again.`, [{ text: 'OK' }]);
    }
  };

  const handleEditOrder = () => {
    if (onEdit) {
      onEdit();
    } else {
      navigation.goBack();
    }
  };

  const renderOrderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.orderCard}
      onPress={() => handleViewOrder(item)}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>📋 {item.id}</Text>
        <Text style={[
          styles.orderStatus, 
          { color: item.status === 'confirmed' ? '#10b981' : '#fbbf24' }
        ]}>
          {item.status === 'confirmed' ? '✅ Confirmed' : '⏳ Pending'}
        </Text>
      </View>
      
      <Text style={styles.orderSupplier}>🏢 {item.supplierName}</Text>
      
      <View style={styles.orderDetails}>
        <Text style={styles.orderDetail}>📦 Items: {item.receivingItems?.length || 0}</Text>
        <Text style={styles.orderDetail}>💰 Total: ${item.totals?.totalValue?.toFixed(2) || '0.00'}</Text>
      </View>
      
      <Text style={styles.orderDate}>📅 {new Date(item.createdAt).toLocaleDateString()}</Text>
    </TouchableOpacity>
  );

  const renderOrderList = () => {
    const currentOrders = selectedTab === 'pending' ? pendingOrders : confirmedOrders;
    
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>✅ Order Confirmations</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, selectedTab === 'pending' && styles.activeTab]}
            onPress={() => setSelectedTab('pending')}
          >
            <Text style={[styles.tabText, selectedTab === 'pending' && styles.activeTabText]}>
              ⏳ Pending ({pendingOrders.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, selectedTab === 'confirmed' && styles.activeTab]}
            onPress={() => setSelectedTab('confirmed')}
          >
            <Text style={[styles.tabText, selectedTab === 'confirmed' && styles.activeTabText]}>
              ✅ Confirmed ({confirmedOrders.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Orders List */}
        <FlatList
          data={currentOrders}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderOrderItem}
          style={styles.ordersList}
          contentContainerStyle={styles.ordersListContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {selectedTab === 'pending' ? 'No pending orders' : 'No confirmed orders'}
              </Text>
              <Text style={styles.emptySubtext}>
                {selectedTab === 'pending' 
                  ? 'Orders will appear here after being created in Receiving tab'
                  : 'Confirmed orders will appear here'
                }
              </Text>
            </View>
          }
        />
      </View>
    );
  };

  const renderOrderDetails = () => {
    const order = viewingOrder || {
      id: orderId,
      reference: receivingReference,
      invoiceNumber: invoiceNumber,
      supplierName: supplierName,
      receivingDate: receivingDate,
      notes: notes,
      receivingItems: receivingItems,
      totals: totals,
      status: 'pending_review'
    };
    
    if (!order || !order.receivingItems || order.receivingItems.length === 0) {
      return (
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>⚠️ Invalid Order</Text>
            <Text style={styles.errorText}>
              No order data found. Please go back and create an order first.
            </Text>
            <TouchableOpacity 
              style={styles.errorButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.errorButtonText}>← Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    
    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={viewingOrder ? handleBackToList : () => navigation.goBack()}>
            <Text style={styles.backButton}>← Back to {viewingOrder ? 'List' : 'Orders'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>📋 Order Details</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Order Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>📋 Order Summary</Text>
          
          <View style={styles.orderInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Order ID:</Text>
              <Text style={styles.infoValue}>{order.id}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Reference:</Text>
              <Text style={styles.infoValue}>{order.reference}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Invoice:</Text>
              <Text style={styles.infoValue}>{order.invoiceNumber}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Supplier:</Text>
              <Text style={styles.infoValue}>{order.supplierName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date:</Text>
              <Text style={styles.infoValue}>{order.receivingDate}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <Text style={[
                styles.infoValue, 
                { color: order.status === 'confirmed' ? '#10b981' : '#fbbf24' }
              ]}>
                {order.status === 'confirmed' ? 'Confirmed' : 'Pending Review'}
              </Text>
            </View>
          </View>
        </View>

        {/* Items List */}
        <View style={styles.itemsCard}>
          <Text style={styles.itemsTitle}>📦 Items ({order.receivingItems?.length || 0})</Text>
          
          {order.receivingItems?.map((item, index) => (
            <View key={item.id || index} style={styles.orderItem}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{item.product?.name || `Product ${index + 1}`}</Text>
                <Text style={styles.itemTotal}>${item.totalCost?.toFixed(2) || '0.00'}</Text>
              </View>
              
              <View style={styles.itemDetails}>
                <Text style={styles.itemDetail}>Quantity: {item.quantity}</Text>
                <Text style={styles.itemDetail}>Unit Cost: ${item.costPrice?.toFixed(2) || '0.00'}</Text>
              </View>

              <View style={styles.itemMeta}>
                {item.qualityRating && (
                  <Text style={styles.qualityText}>⭐ Quality: {item.qualityRating}/5</Text>
                )}
                {item.damageCount > 0 && (
                  <Text style={styles.damageText}>⚠️ {item.damageCount} damaged</Text>
                )}
                {item.updateBaseCost && (
                  <Text style={styles.updateText}>📈 Will update base cost</Text>
                )}
              </View>

              {item.damageNotes && (
                <Text style={styles.notesText}>Note: {item.damageNotes}</Text>
              )}
            </View>
          ))}
        </View>

        {/* Totals Summary */}
        <View style={styles.totalsCard}>
          <Text style={styles.totalsTitle}>💰 Order Totals</Text>
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Items:</Text>
            <Text style={styles.totalValue}>{order.totals?.totalItems || order.receivingItems?.length || 0}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Quantity:</Text>
            <Text style={styles.totalValue}>{order.totals?.totalQuantity || '0'}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Value:</Text>
            <Text style={[styles.totalValue, styles.totalHighlight]}>
              ${order.totals?.totalValue?.toFixed(2) || '0.00'}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Damaged:</Text>
            <Text style={styles.totalValue}>{order.totals?.totalDamage || '0'}</Text>
          </View>
        </View>

        {/* Notes Section */}
        {order.notes && (
          <View style={styles.notesCard}>
            <Text style={styles.notesTitle}>📝 Order Notes</Text>
            <Text style={styles.notesText}>{order.notes}</Text>
          </View>
        )}

        {/* Action Buttons */}
        {(!viewingOrder || viewingOrder.status === 'pending_review') && (
          <View style={styles.actionButtons}>
            {!viewingOrder && (
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={handleEditOrder}
              >
                <Text style={styles.editButtonText}>✏️ Edit Order</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={() => viewingOrder ? handleConfirmOrder(viewingOrder) : handleConfirmOrderFromParams()}
              disabled={savingState}
            >
              {savingState ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.confirmButtonText}>✅ Confirm & Submit Order</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Warning */}
        <View style={styles.warningCard}>
          <Text style={styles.warningText}>
            ⚠️ Once confirmed, this order will be submitted for processing and cannot be easily modified.
          </Text>
        </View>
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </View>
    );
  }

  // If viewing specific order details, show details view
  if (hasSpecificOrder || viewingOrder) {
    return renderOrderDetails();
  }

  // Otherwise show the order list
  return renderOrderList();
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
  placeholder: {
    width: 50,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#3b82f6',
  },
  tabText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  // Order list styles
  ordersList: {
    flex: 1,
  },
  ordersListContent: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: 'bold',
  },
  orderStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  orderSupplier: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderDetail: {
    color: '#ccc',
    fontSize: 14,
  },
  orderDate: {
    color: '#999',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#999',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Existing styles
  summaryCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  summaryTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  orderInfo: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '600',
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusText: {
    color: '#fbbf24',
  },
  itemsCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  itemsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  orderItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#444',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  itemTotal: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemDetail: {
    color: '#ccc',
    fontSize: 14,
  },
  itemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  qualityText: {
    color: '#93c5fd',
    fontSize: 12,
  },
  damageText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: 'bold',
  },
  updateText: {
    color: '#10b981',
    fontSize: 12,
  },
  notesText: {
    color: '#999',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  totalsCard: {
    backgroundColor: '#1e3a8a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  totalsTitle: {
    color: '#93c5fd',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  totalLabel: {
    color: '#bfdbfe',
    fontSize: 14,
  },
  totalValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  totalHighlight: {
    color: '#10b981',
    fontSize: 18,
  },
  notesCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  notesTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  notesText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#374151',
  },
  confirmButton: {
    backgroundColor: '#10b981',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  warningCard: {
    backgroundColor: '#7c2d12',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  warningText: {
    color: '#fed7aa',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    color: '#dc2626',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  errorButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OrderConfirmationScreen;