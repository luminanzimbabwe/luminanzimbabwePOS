import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

const OrderConfirmationScreen = ({ route, navigation }) => {
  const [orderData, setOrderData] = useState(null);
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
    console.log('🔄 Manual refresh triggered by user');
    setRefreshing(true);
    loadOrders();
  };

  // Helper function to update additional barcodes
  const updateAdditionalBarcodes = (currentProduct, newBarcode) => {
    if (!newBarcode) return currentProduct.additional_barcodes || [];
    
    const existingBarcodes = currentProduct.additional_barcodes || [];
    
    // Don't add duplicate barcodes
    if (existingBarcodes.includes(newBarcode)) {
      return existingBarcodes;
    }
    
    // Add new barcode to the list
    return [...existingBarcodes, newBarcode];
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
          
          // Prepare update data with enhanced barcode and supplier tracking
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
            supplier: item.supplierName || currentProduct.supplier || '',
            currency: currentProduct.currency || 'USD',
            price_type: currentProduct.price_type || 'unit',
            line_code: currentProduct.line_code,
            // Enhanced barcode tracking
            barcode: currentProduct.barcode || item.batchBarcode || '',
            additional_barcodes: updateAdditionalBarcodes(currentProduct, item.batchBarcode)
          };
          
          console.log(`📤 Enhanced update data for ${product.name}:`, updateData);
          
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
      <ScrollView 
        style={[styles.container, Platform.OS === 'web' && styles.webContainer]}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={true}
        scrollEventThrottle={16}
        nestedScrollEnabled={Platform.OS === 'web'}
        removeClippedSubviews={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Ultimate Order Command Center Header */}
        <View style={styles.ultimateHeader}>
          {/* Header Background Overlay */}
          <View style={styles.headerBackgroundOverlay} />
          
          {/* Command Center Badge */}
          <View style={styles.commandCenterBadge}>
            <Icon name="military-tech" size={20} color="#fbbf24" />
            <Text style={styles.commandCenterBadgeText}>ORDER CENTER</Text>
          </View>
          
          {/* Main Title */}
          <Text style={styles.ultimateHeaderTitle}>🚀 Order Management Command Center</Text>
          
          {/* Subtitle with Enhanced Styling */}
          <View style={styles.ultimateHeaderSubtitleContainer}>
            <Icon name="assignment" size={16} color="#8b5cf6" />
            <Text style={styles.ultimateHeaderSubtitle}>Enterprise Order Processing & Inventory Control</Text>
            <Icon name="auto-awesome" size={16} color="#10b981" />
          </View>
          
          {/* Premium Status Metrics */}
          <View style={styles.ultimateGrowthMetrics}>
            <View style={styles.growthMetricCard}>
              <View style={styles.growthMetricIconContainer}>
                <Icon name="assignment" size={16} color="#fbbf24" />
              </View>
              <View style={styles.growthMetricContent}>
                <Text style={styles.growthMetricLabel}>Pending Orders</Text>
                <Text style={styles.growthMetricValue}>{pendingOrders.length}</Text>
              </View>
              <View style={styles.growthTrendIndicator}>
                <Icon name="hourglass-empty" size={14} color="#fbbf24" />
              </View>
            </View>
            
            <View style={styles.growthMetricCard}>
              <View style={styles.growthMetricIconContainer}>
                <Icon name="check-circle" size={16} color="#10b981" />
              </View>
              <View style={styles.growthMetricContent}>
                <Text style={styles.growthMetricLabel}>Confirmed Orders</Text>
                <Text style={styles.growthMetricValue}>{confirmedOrders.length}</Text>
              </View>
              <View style={styles.growthTrendIndicator}>
                <Icon name="trending-up" size={14} color="#10b981" />
              </View>
            </View>
          </View>
          
          {/* Real-time Status Indicator */}
          <View style={styles.realtimeStatus}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Live Order Management Active</Text>
            <Icon name="sync" size={14} color="#10b981" />
          </View>
          
          {/* Performance Summary */}
          <View style={styles.performanceSummary}>
            <Text style={styles.performanceSummaryText}>
              🏆 Elite Order Processing • {pendingOrders.length + confirmedOrders.length} Total Orders • {((confirmedOrders.length / Math.max(pendingOrders.length + confirmedOrders.length, 1)) * 100).toFixed(1)}% Completion Rate
            </Text>
          </View>
        </View>

        {/* Enterprise Tab Management System */}
        <View style={styles.section}>
          <View style={styles.categorySectionHeader}>
            <Text style={styles.sectionTitle}>📋 Enterprise Order Management</Text>
            <View style={styles.categoryStatusBadge}>
              <Icon name="business" size={16} color="#8b5cf6" />
              <Text style={styles.categoryStatusText}>Order Processing Intelligence</Text>
            </View>
          </View>
          
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, selectedTab === 'pending' && styles.activeTab]}
              onPress={() => setSelectedTab('pending')}
            >
              <Icon name="hourglass-empty" size={16} color={selectedTab === 'pending' ? '#fff' : '#999'} />
              <Text style={[styles.tabText, selectedTab === 'pending' && styles.activeTabText]}>
                Pending ({pendingOrders.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, selectedTab === 'confirmed' && styles.activeTab]}
              onPress={() => setSelectedTab('confirmed')}
            >
              <Icon name="check-circle" size={16} color={selectedTab === 'confirmed' ? '#fff' : '#999'} />
              <Text style={[styles.tabText, selectedTab === 'confirmed' && styles.activeTabText]}>
                Confirmed ({confirmedOrders.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Orders List */}
        <View style={styles.ordersListContent}>
          {currentOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="inbox" size={64} color="#666" />
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
          ) : (
            currentOrders.map((order, index) => (
              <TouchableOpacity 
                key={`${order.id}-${index}`}
                style={[
                  styles.ultimateOrderCard,
                  order.status === 'confirmed' ? styles.confirmedOrderCard : styles.pendingOrderCard
                ]}
                onPress={() => handleViewOrder(order)}
              >
                {/* Elite Order Header */}
                <View style={styles.ultimateOrderHeader}>
                  <View style={styles.orderRankContainer}>
                    <View style={[
                      styles.eliteOrderRankBadge, 
                      { backgroundColor: order.status === 'confirmed' ? '#10b981' : '#fbbf24' }
                    ]}>
                      <Text style={styles.eliteOrderRankText}>#{index + 1}</Text>
                    </View>
                    <View style={[styles.orderBadge, { backgroundColor: order.status === 'confirmed' ? '#10b981' : '#fbbf24'}]}>
                      <Icon name={order.status === 'confirmed' ? 'check-circle' : 'hourglass-empty'} size={12} color="#ffffff" />
                      <Text style={styles.orderBadgeText}>{order.status === 'confirmed' ? 'CONFIRMED' : 'PENDING'}</Text>
                    </View>
                  </View>
                  <View style={[styles.orderPerformanceCrown, { backgroundColor: order.status === 'confirmed' ? '#10b981' : '#fbbf24'}]}>
                    <Icon name="assignment" size={16} color="#ffffff" />
                  </View>
                </View>
                
                {/* Order Name */}
                <Text style={styles.ultimateOrderName}>📋 Order {order.id}</Text>
                
                {/* Elite Order Metrics */}
                <View style={styles.ultimateOrderMetrics}>
                  <View style={styles.orderMetricRow}>
                    <View style={styles.orderMetricIconContainer}>
                      <Icon name="business" size={14} color="#3b82f6" />
                    </View>
                    <View style={styles.orderMetricContent}>
                      <Text style={styles.orderMetricLabel}>Supplier</Text>
                      <Text style={styles.orderMetricValue}>{order.supplierName}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.orderMetricRow}>
                    <View style={styles.orderMetricIconContainer}>
                      <Icon name="inventory" size={14} color="#8b5cf6" />
                    </View>
                    <View style={styles.orderMetricContent}>
                      <Text style={styles.orderMetricLabel}>Items</Text>
                      <Text style={styles.orderMetricValue}>{order.receivingItems?.length || 0}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.orderMetricRow}>
                    <View style={styles.orderMetricIconContainer}>
                      <Icon name="attach-money" size={14} color="#10b981" />
                    </View>
                    <View style={styles.orderMetricContent}>
                      <Text style={styles.orderMetricLabel}>Total Value</Text>
                      <Text style={[styles.orderMetricValue, { color: '#10b981'}]}>${order.totals?.totalValue?.toFixed(2) || '0.00'}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.orderMetricRow}>
                    <View style={styles.orderMetricIconContainer}>
                      <Icon name="schedule" size={14} color="#f59e0b" />
                    </View>
                    <View style={styles.orderMetricContent}>
                      <Text style={styles.orderMetricLabel}>Date</Text>
                      <Text style={styles.orderMetricValue}>{new Date(order.createdAt).toLocaleDateString()}</Text>
                    </View>
                  </View>
                </View>
                
                {/* Elite Order Progress */}
                <View style={styles.ultimateOrderProgress}>
                  <View style={styles.orderProgressBarBg}>
                    <View 
                      style={[
                        styles.orderProgressBarFill,
                        { 
                          width: order.status === 'confirmed' ? '100%' : '60%',
                          backgroundColor: order.status === 'confirmed' ? '#10b981' : '#fbbf24'
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.orderProgressLabel}>
                    {order.status === 'confirmed' ? 'Order Completed' : 'Awaiting Confirmation'}
                  </Text>
                </View>
                
                {/* Elite Order Stats */}
                <View style={styles.ultimateOrderStats}>
                  <View style={styles.orderStatItem}>
                    <Text style={styles.orderStatLabel}>Reference</Text>
                    <Text style={styles.orderStatValue}>{order.reference || 'N/A'}</Text>
                  </View>
                  <View style={styles.orderStatItem}>
                    <Text style={styles.orderStatLabel}>Invoice</Text>
                    <Text style={styles.orderStatValue}>{order.invoiceNumber || 'N/A'}</Text>
                  </View>
                  <View style={styles.orderStatItem}>
                    <Text style={styles.orderStatLabel}>Status</Text>
                    <Text style={[styles.orderStatValue, { color: order.status === 'confirmed' ? '#10b981' : '#fbbf24'}]}>
                      {order.status === 'confirmed' ? '✅ Complete' : '⏳ Pending'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
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
        <View style={[styles.container, Platform.OS === 'web' && styles.webContainer]}>
          <View style={styles.ultimateHeader}>
            <View style={styles.headerBackgroundOverlay} />
            <TouchableOpacity onPress={viewingOrder ? handleBackToList : () => navigation.goBack()} style={styles.backButton}>
              <Icon name="arrow-back" size={24} color="#fff" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.ultimateHeaderTitle}>⚠️ Order Not Found</Text>
            <Text style={styles.ultimateHeaderSubtitle}>Invalid Order Data</Text>
          </View>
          <View style={styles.errorContainer}>
            <Icon name="error-outline" size={64} color="#ef4444" />
            <Text style={styles.errorTitle}>⚠️ Invalid Order</Text>
            <Text style={styles.errorText}>
              No order data found. Please go back and create an order first.
            </Text>
            <TouchableOpacity 
              style={styles.errorButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back" size={20} color="#fff" />
              <Text style={styles.errorButtonText}>← Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    
    return (
      <ScrollView 
        style={[styles.container, Platform.OS === 'web' && styles.webContainer]}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Ultimate Order Details Header */}
        <View style={styles.ultimateHeader}>
          <View style={styles.headerBackgroundOverlay} />
          
          <TouchableOpacity onPress={viewingOrder ? handleBackToList : () => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#fff" />
            <Text style={styles.backButtonText}>Back to Orders</Text>
          </TouchableOpacity>
          
          <View style={styles.commandCenterBadge}>
            <Icon name="assignment" size={20} color="#fbbf24" />
            <Text style={styles.commandCenterBadgeText}>ORDER DETAILS</Text>
          </View>
          
          <Text style={styles.ultimateHeaderTitle}>📋 Order {order.id}</Text>
          
          <View style={styles.ultimateHeaderSubtitleContainer}>
            <Icon name="business" size={16} color="#3b82f6" />
            <Text style={styles.ultimateHeaderSubtitle}>{order.supplierName}</Text>
            <Icon name={order.status === 'confirmed' ? "check-circle" : "hourglass-empty"} size={16} color={order.status === 'confirmed' ? "#10b981" : "#fbbf24"} />
          </View>
          
          {/* Premium Status Metrics */}
          <View style={styles.ultimateGrowthMetrics}>
            <View style={styles.growthMetricCard}>
              <View style={styles.growthMetricIconContainer}>
                <Icon name="inventory" size={16} color="#8b5cf6" />
              </View>
              <View style={styles.growthMetricContent}>
                <Text style={styles.growthMetricLabel}>Total Items</Text>
                <Text style={styles.growthMetricValue}>{order.receivingItems?.length || 0}</Text>
              </View>
              <View style={styles.growthTrendIndicator}>
                <Icon name="trending-up" size={14} color="#8b5cf6" />
              </View>
            </View>
            
            <View style={styles.growthMetricCard}>
              <View style={styles.growthMetricIconContainer}>
                <Icon name="attach-money" size={16} color="#10b981" />
              </View>
              <View style={styles.growthMetricContent}>
                <Text style={styles.growthMetricLabel}>Total Value</Text>
                <Text style={styles.growthMetricValue}>${order.totals?.totalValue?.toFixed(2) || '0.00'}</Text>
              </View>
              <View style={styles.growthTrendIndicator}>
                <Icon name="trending-up" size={14} color="#10b981" />
              </View>
            </View>
          </View>
          
          {/* Real-time Status Indicator */}
          <View style={styles.realtimeStatus}>
            <View style={[styles.statusDot, { backgroundColor: order.status === 'confirmed' ? '#10b981' : '#fbbf24'}]} />
            <Text style={[styles.statusText, { color: order.status === 'confirmed' ? '#10b981' : '#fbbf24'}]}>
              {order.status === 'confirmed' ? 'Order Completed' : 'Pending Confirmation'}
            </Text>
            <Icon name={order.status === 'confirmed' ? "verified" : "schedule"} size={14} color={order.status === 'confirmed' ? "#10b981" : "#fbbf24"} />
          </View>
          
          {/* Performance Summary */}
          <View style={styles.performanceSummary}>
            <Text style={styles.performanceSummaryText}>
              📈 Order Intelligence • {order.receivingItems?.length || 0} Items • ${order.totals?.totalValue?.toFixed(2) || '0.00'} Value • {order.status === 'confirmed' ? '✅ Completed' : '⏳ In Progress'}
            </Text>
          </View>
        </View>

        {/* Enterprise Order Information Section */}
        <View style={styles.section}>
          <View style={styles.categorySectionHeader}>
            <Text style={styles.sectionTitle}>📋 Order Information</Text>
            <View style={styles.categoryStatusBadge}>
              <Icon name="info" size={16} color="#3b82f6" />
              <Text style={styles.categoryStatusText}>Order Intelligence</Text>
            </View>
          </View>
          
          <View style={styles.ultimateCategoryCard}>
            <View style={styles.ultimateCategoryHeader}>
              <View style={styles.categoryRankContainer}>
                <Text style={styles.categoryRank}>#1</Text>
                <View style={[styles.categoryBadge, { backgroundColor: '#3b82f6'}]}>
                  <Icon name="assignment" size={12} color="#ffffff" />
                  <Text style={styles.categoryBadgeText}>ORDER</Text>
                </View>
              </View>
              <View style={[styles.categoryPerformanceIndicator, { backgroundColor: order.status === 'confirmed' ? '#10b981' : '#fbbf24'}]}>
                <Icon name={order.status === 'confirmed' ? "check-circle" : "hourglass-empty"} size={14} color="#ffffff" />
              </View>
            </View>
            
            <Text style={styles.ultimateCategoryName}>Order {order.id}</Text>
            
            <View style={styles.ultimateCategoryMetrics}>
              <View style={styles.categoryMetricRow}>
                <View style={styles.categoryMetricIconContainer}>
                  <Icon name="confirmation-number" size={14} color="#3b82f6" />
                </View>
                <View style={styles.categoryMetricContent}>
                  <Text style={styles.categoryMetricLabel}>Order ID</Text>
                  <Text style={[styles.categoryMetricValue, { color: '#3b82f6'}]}>{order.id}</Text>
                </View>
              </View>
              
              <View style={styles.categoryMetricRow}>
                <View style={styles.categoryMetricIconContainer}>
                  <Icon name="receipt" size={14} color="#8b5cf6" />
                </View>
                <View style={styles.categoryMetricContent}>
                  <Text style={styles.categoryMetricLabel}>Reference</Text>
                  <Text style={[styles.categoryMetricValue, { color: '#8b5cf6'}]}>{order.reference || 'N/A'}</Text>
                </View>
              </View>
              
              <View style={styles.categoryMetricRow}>
                <View style={styles.categoryMetricIconContainer}>
                  <Icon name="description" size={14} color="#f59e0b" />
                </View>
                <View style={styles.categoryMetricContent}>
                  <Text style={styles.categoryMetricLabel}>Invoice</Text>
                  <Text style={[styles.categoryMetricValue, { color: '#f59e0b'}]}>{order.invoiceNumber || 'N/A'}</Text>
                </View>
              </View>
              
              <View style={styles.categoryMetricRow}>
                <View style={styles.categoryMetricIconContainer}>
                  <Icon name="business" size={14} color="#10b981" />
                </View>
                <View style={styles.categoryMetricContent}>
                  <Text style={styles.categoryMetricLabel}>Supplier</Text>
                  <Text style={[styles.categoryMetricValue, { color: '#10b981'}]}>{order.supplierName}</Text>
                </View>
              </View>
              
              <View style={styles.categoryMetricRow}>
                <View style={styles.categoryMetricIconContainer}>
                  <Icon name="schedule" size={14} color="#ef4444" />
                </View>
                <View style={styles.categoryMetricContent}>
                  <Text style={styles.categoryMetricLabel}>Date</Text>
                  <Text style={[styles.categoryMetricValue, { color: '#ef4444'}]}>{order.receivingDate}</Text>
                </View>
              </View>
              
              <View style={styles.categoryMetricRow}>
                <View style={styles.categoryMetricIconContainer}>
                  <Icon name={order.status === 'confirmed' ? "verified" : "pending"} size={14} color={order.status === 'confirmed' ? "#10b981" : "#fbbf24"} />
                </View>
                <View style={styles.categoryMetricContent}>
                  <Text style={styles.categoryMetricLabel}>Status</Text>
                  <Text style={[styles.categoryMetricValue, { color: order.status === 'confirmed' ? '#10b981' : '#fbbf24'}]}>
                    {order.status === 'confirmed' ? 'Confirmed' : 'Pending Review'}
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={styles.ultimateCategoryProgress}>
              <View style={styles.categoryProgressBarBg}>
                <View 
                  style={[
                    styles.categoryProgressBarFill,
                    { 
                      width: order.status === 'confirmed' ? '100%' : '60%',
                      backgroundColor: order.status === 'confirmed' ? '#10b981' : '#fbbf24'
                    }
                  ]} 
                />
              </View>
              <Text style={styles.categoryProgressLabel}>
                {order.status === 'confirmed' ? 'Order Completed' : 'Awaiting Confirmation'}
              </Text>
            </View>
          </View>
        </View>

        {/* Enterprise Items Analysis Section */}
        <View style={styles.section}>
          <View style={styles.topProductsSectionHeader}>
            <Text style={styles.sectionTitle}>📦 Items Analysis</Text>
            <View style={styles.topProductsStatusBadge}>
              <Icon name="inventory" size={16} color="#f59e0b" />
              <Text style={styles.topProductsStatusText}>Product Intelligence</Text>
            </View>
          </View>
          
          <View style={[
            styles.ultimateProductGrid, 
            order.receivingItems?.length > 4 ? styles.singleColumnUltimateProductGrid : null
          ]}>
            {order.receivingItems?.map((item, index) => {
              const maxValue = Math.max(...(order.receivingItems?.map(i => i.totalCost) || [1]));
              const valuePercentage = (item.totalCost / maxValue) * 100;
              const performanceColor = valuePercentage > 80 ? '#10b981' : valuePercentage > 50 ? '#f59e0b' : '#3b82f6';
              
              return (
                <View key={item.id || index} style={[
                  styles.ultimateProductCard,
                  { borderLeftColor: performanceColor },
                  index < 3 && styles.topRankCard,
                  order.receivingItems?.length > 4 ? styles.singleColumnUltimateProductCard : null
                ]}>
                  {/* Elite Rank Badge */}
                  <View style={styles.ultimateProductHeader}>
                    <View style={styles.productRankContainer}>
                      <View style={[
                        styles.eliteRankBadge, 
                        { backgroundColor: performanceColor }
                      ]}>
                        <Text style={styles.eliteRankText}>#{index + 1}</Text>
                      </View>
                      <View style={[styles.categoryBadge, { backgroundColor: performanceColor}]}>
                        <Icon name="local-offer" size={10} color="#ffffff" />
                        <Text style={styles.categoryBadgeText}>ITEM</Text>
                      </View>
                    </View>
                    <View style={[styles.performanceCrown, { backgroundColor: performanceColor}]}>
                      <Icon name="inventory" size={14} color="#ffffff" />
                    </View>
                  </View>
                  
                  {/* Product Name */}
                  <Text style={styles.ultimateProductName}>{item.product?.name || `Product ${index + 1}`}</Text>
                  
                  {/* Elite Metrics */}
                  <View style={styles.ultimateProductMetrics}>
                    <View style={styles.productMetricRow}>
                      <View style={styles.productMetricIconContainer}>
                        <Icon name="attach-money" size={14} color={performanceColor} />
                      </View>
                      <View style={styles.productMetricContent}>
                        <Text style={styles.productMetricLabel}>Total Cost</Text>
                        <Text style={[styles.productMetricValue, { color: performanceColor}]}>${item.totalCost?.toFixed(2) || '0.00'}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.productMetricRow}>
                      <View style={styles.productMetricIconContainer}>
                        <Icon name="scale" size={14} color="#3b82f6" />
                      </View>
                      <View style={styles.productMetricContent}>
                        <Text style={styles.productMetricLabel}>Quantity</Text>
                        <Text style={styles.productMetricValue}>{item.quantity}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.productMetricRow}>
                      <View style={styles.productMetricIconContainer}>
                        <Icon name="calculate" size={14} color="#8b5cf6" />
                      </View>
                      <View style={styles.productMetricContent}>
                        <Text style={styles.productMetricLabel}>Unit Cost</Text>
                        <Text style={styles.productMetricValue}>${item.costPrice?.toFixed(2) || '0.00'}</Text>
                      </View>
                    </View>
                  </View>
                  
                  {/* Elite Performance Bar */}
                  <View style={styles.ultimateProductProgress}>
                    <View style={styles.productProgressBarBg}>
                      <View 
                        style={[
                          styles.productProgressBarFill,
                          { 
                            width: `${valuePercentage}%`,
                            backgroundColor: performanceColor
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.productProgressLabel}>{valuePercentage.toFixed(0)}% of highest value</Text>
                  </View>
                  
                  {/* Elite Stats */}
                  <View style={styles.ultimateProductStats}>
                    <View style={styles.productStatItem}>
                      <Text style={styles.productStatLabel}>Value Share</Text>
                      <Text style={styles.productStatValue}>{((item.totalCost / (order.totals?.totalValue || 1)) * 100).toFixed(1)}%</Text>
                    </View>
                    <View style={styles.productStatItem}>
                      <Text style={styles.productStatLabel}>Quality</Text>
                      <Text style={styles.productStatValue}>{item.qualityRating ? `${item.qualityRating}/5` : 'N/A'}</Text>
                    </View>
                    <View style={styles.productStatItem}>
                      <Text style={styles.productStatLabel}>Status</Text>
                      <Text style={[styles.productStatValue, { color: performanceColor}]}>
                        {item.damageCount > 0 ? '⚠️ Damaged' : '✅ Good'}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Additional Info */}
                  {item.updateBaseCost && (
                    <View style={styles.aiInsightRecommendation}>
                      <Text style={styles.aiRecommendationText}>📈 Will update base cost</Text>
                    </View>
                  )}
                  
                  {item.damageNotes && (
                    <View style={styles.notesCard}>
                      <Text style={styles.notesText}>Note: {item.damageNotes}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Enterprise Financial Analysis Section */}
        <View style={styles.section}>
          <View style={styles.currencySectionHeader}>
            <Text style={styles.sectionTitle}>💰 Financial Analysis</Text>
            <View style={styles.currencyStatusBadge}>
              <Icon name="account-balance" size={16} color="#10b981" />
              <Text style={styles.currencyStatusText}>Financial Intelligence</Text>
            </View>
          </View>
          
          <View style={[
            styles.ultimateCurrencyGrid, 
            2 ? styles.singleColumnCurrencyGrid : null
          ]}>
            {/* Total Items */}
            <View style={[
              styles.ultimateCurrencyCard,
              { borderLeftColor: '#3b82f6' },
              styles.singleColumnCurrencyCard
            ]}>
              <View style={styles.ultimateCurrencyHeader}>
                <View style={styles.currencyRankContainer}>
                  <View style={[styles.eliteCurrencyRankBadge, { backgroundColor: '#3b82f6'}]}>
                    <Text style={styles.eliteCurrencyRankText}>#1</Text>
                  </View>
                  <View style={[styles.currencyFlagBadge, { backgroundColor: '#3b82f6'}]}>
                    <Text style={styles.currencyFlagText}>📦</Text>
                  </View>
                  <View style={[styles.currencyBadge, { backgroundColor: '#3b82f6'}]}>
                    <Text style={styles.currencyBadgeText}>ITEMS</Text>
                  </View>
                </View>
                <View style={[styles.currencyPerformanceCrown, { backgroundColor: '#3b82f6'}]}>
                  <Icon name="inventory" size={16} color="#ffffff" />
                </View>
              </View>
              
              <View style={styles.currencyNameContainer}>
                <Text style={styles.ultimateCurrencyName}>Total Items</Text>
                <Text style={styles.currencySubtitle}>Order quantity analysis</Text>
              </View>
              
              <View style={styles.ultimateCurrencyMetrics}>
                <View style={styles.currencyMetricRow}>
                  <View style={styles.currencyMetricIconContainer}>
                    <Icon name="inventory" size={16} color="#3b82f6" />
                  </View>
                  <View style={styles.currencyMetricContent}>
                    <Text style={styles.currencyMetricLabel}>Total Items</Text>
                    <Text style={[styles.currencyMetricValue, { color: '#3b82f6'}]}>{order.totals?.totalItems || order.receivingItems?.length || 0}</Text>
                  </View>
                </View>
                
                <View style={styles.currencyMetricRow}>
                  <View style={styles.currencyMetricIconContainer}>
                    <Icon name="scale" size={16} color="#8b5cf6" />
                  </View>
                  <View style={styles.currencyMetricContent}>
                    <Text style={styles.currencyMetricLabel}>Total Quantity</Text>
                    <Text style={[styles.currencyMetricValue, { color: '#8b5cf6'}]}>{order.totals?.totalQuantity || '0'}</Text>
                  </View>
                </View>
              </View>
            </View>
            
            {/* Total Value */}
            <View style={[
              styles.ultimateCurrencyCard,
              { borderLeftColor: '#10b981' },
              styles.singleColumnCurrencyCard
            ]}>
              <View style={styles.ultimateCurrencyHeader}>
                <View style={styles.currencyRankContainer}>
                  <View style={[styles.eliteCurrencyRankBadge, { backgroundColor: '#10b981'}]}>
                    <Text style={styles.eliteCurrencyRankText}>#2</Text>
                  </View>
                  <View style={[styles.currencyFlagBadge, { backgroundColor: '#10b981'}]}>
                    <Text style={styles.currencyFlagText}>💰</Text>
                  </View>
                  <View style={[styles.currencyBadge, { backgroundColor: '#10b981'}]}>
                    <Text style={styles.currencyBadgeText}>VALUE</Text>
                  </View>
                </View>
                <View style={[styles.currencyPerformanceCrown, { backgroundColor: '#10b981'}]}>
                  <Icon name="attach-money" size={16} color="#ffffff" />
                </View>
              </View>
              
              <View style={styles.currencyNameContainer}>
                <Text style={styles.ultimateCurrencyName}>Total Value</Text>
                <Text style={styles.currencySubtitle}>Order financial total</Text>
              </View>
              
              <View style={styles.ultimateCurrencyMetrics}>
                <View style={styles.currencyMetricRow}>
                  <View style={styles.currencyMetricIconContainer}>
                    <Icon name="attach-money" size={16} color="#10b981" />
                  </View>
                  <View style={styles.currencyMetricContent}>
                    <Text style={styles.currencyMetricLabel}>Total Value</Text>
                    <Text style={[styles.currencyMetricValue, { color: '#10b981', fontSize: 16}]}>${order.totals?.totalValue?.toFixed(2) || '0.00'}</Text>
                  </View>
                </View>
                
                <View style={styles.currencyMetricRow}>
                  <View style={styles.currencyMetricIconContainer}>
                    <Icon name="warning" size={16} color="#ef4444" />
                  </View>
                  <View style={styles.currencyMetricContent}>
                    <Text style={styles.currencyMetricLabel}>Total Damaged</Text>
                    <Text style={[styles.currencyMetricValue, { color: '#ef4444'}]}>{order.totals?.totalDamage || '0'}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Notes Section */}
        {order.notes && (
          <View style={styles.section}>
            <View style={styles.aiInsightsHeader}>
              <Text style={styles.sectionTitle}>📝 Order Notes</Text>
              <View style={styles.aiStatusBadge}>
                <Icon name="note" size={16} color="#8b5cf6" />
                <Text style={styles.aiStatusText}>Additional Information</Text>
              </View>
            </View>
            
            <View style={styles.notesCard}>
              <View style={styles.recommendationIconContainer}>
                <Icon name="note" size={16} color="#8b5cf6" />
              </View>
              <View style={styles.recommendationContent}>
                <Text style={styles.recommendationTitle}>Order Notes</Text>
                <Text style={styles.recommendationDescription}>{order.notes}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        {(!viewingOrder || viewingOrder.status === 'pending_review') && (
          <View style={styles.section}>
            <View style={styles.aiInsightsHeader}>
              <Text style={styles.sectionTitle}>🚀 Order Actions</Text>
              <View style={styles.aiStatusBadge}>
                <Icon name="settings" size={16} color="#f59e0b" />
                <Text style={styles.aiStatusText}>Order Management</Text>
              </View>
            </View>
            
            <View style={[
              styles.enhancedPaymentGrid, 
              2 ? styles.singleColumnPaymentGrid : null
            ]}>
              {!viewingOrder && (
                <TouchableOpacity
                  style={[
                    styles.enhancedPaymentCard,
                    { borderLeftColor: '#6b7280' },
                    styles.singleColumnPaymentCard
                  ]}
                  onPress={handleEditOrder}
                >
                  <View style={styles.enhancedPaymentHeader}>
                    <View style={styles.paymentRankContainer}>
                      <Text style={styles.paymentRank}>#1</Text>
                      <View style={[styles.paymentBadge, { backgroundColor: '#6b7280'}]}>
                        <Icon name="edit" size={12} color="#ffffff" />
                      </View>
                    </View>
                    <View style={[styles.paymentPerformanceIndicator, { backgroundColor: '#6b7280'}]}>
                      <Icon name="edit" size={14} color="#ffffff" />
                    </View>
                  </View>
                  
                  <Text style={styles.enhancedPaymentMethod}>Edit Order</Text>
                  
                  <View style={styles.enhancedPaymentMetrics}>
                    <View style={styles.paymentMetricRow}>
                      <View style={styles.paymentMetricIconContainer}>
                        <Icon name="edit" size={14} color="#6b7280" />
                      </View>
                      <View style={styles.paymentMetricContent}>
                        <Text style={styles.paymentMetricLabel}>Action</Text>
                        <Text style={[styles.paymentMetricValue, { color: '#6b7280'}]}>Modify Order</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[
                  styles.enhancedPaymentCard,
                  { borderLeftColor: '#10b981' },
                  styles.singleColumnPaymentCard
                ]}
                onPress={() => viewingOrder ? handleConfirmOrder(viewingOrder) : handleConfirmOrderFromParams()}
                disabled={savingState}
              >
                <View style={styles.enhancedPaymentHeader}>
                  <View style={styles.paymentRankContainer}>
                    <Text style={styles.paymentRank}>#2</Text>
                    <View style={[styles.paymentBadge, { backgroundColor: '#10b981'}]}>
                      <Icon name="check-circle" size={12} color="#ffffff" />
                    </View>
                  </View>
                  <View style={[styles.paymentPerformanceIndicator, { backgroundColor: '#10b981'}]}>
                    <Icon name="verified" size={14} color="#ffffff" />
                  </View>
                </View>
                
                <Text style={styles.enhancedPaymentMethod}>
                  {savingState ? 'Confirming...' : 'Confirm & Submit'}
                </Text>
                
                <View style={styles.enhancedPaymentMetrics}>
                  <View style={styles.paymentMetricRow}>
                    <View style={styles.paymentMetricIconContainer}>
                      <Icon name="verified" size={14} color="#10b981" />
                    </View>
                    <View style={styles.paymentMetricContent}>
                      <Text style={styles.paymentMetricLabel}>Status</Text>
                      <Text style={[styles.paymentMetricValue, { color: '#10b981'}]}>
                        {savingState ? 'Processing...' : 'Confirm Order'}
                      </Text>
                    </View>
                  </View>
                </View>
                
                {savingState && (
                  <View style={styles.predictiveConfidence}>
                    <View style={styles.confidenceBar}>
                      <View style={[styles.confidenceFill, { width: '100%'}]} />
                    </View>
                    <Text style={styles.confidenceText}>Processing Order...</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Warning */}
        <View style={styles.section}>
          <View style={styles.criticalInsightsSection}>
            <Text style={styles.sectionSubtitle}>⚠️ Important Notice</Text>
            <View style={[styles.criticalInsightCard, styles.alertCard]}>
              <View style={styles.criticalInsightHeader}>
                <Icon name="warning" size={20} color="#ef4444" />
                <Text style={styles.criticalInsightTitle}>Order Confirmation Notice</Text>
              </View>
              <Text style={styles.criticalInsightValue}>Irreversible Action</Text>
              <Text style={styles.criticalInsightText}>
                Once confirmed, this order will be submitted for processing and cannot be easily modified. Please review all details carefully.
              </Text>
              <View style={styles.criticalInsightAction}>
                <Text style={styles.criticalActionText}>⚠️ Confirm Carefully</Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Bottom padding for web scrolling */}
        <View style={{ 
          height: Platform.OS === 'web' ? 100 : 20,
          minHeight: Platform.OS === 'web' ? 100 : 0
        }} />
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, Platform.OS === 'web' && styles.webContainer]}>
        <View style={styles.ultimateHeader}>
          <View style={styles.headerBackgroundOverlay} />
          <Text style={styles.ultimateHeaderTitle}>🚀 Loading Order Center</Text>
          <Text style={styles.ultimateHeaderSubtitle}>Initializing Order Management System</Text>
        </View>
        <View style={styles.loadingContainer}>
          <View style={styles.aiInsightIconContainer}>
            <Icon name="sync" size={32} color="#3b82f6" />
          </View>
          <Text style={styles.loadingText}>Loading order data...</Text>
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
    backgroundColor: '#1e293b',
    padding: 20,
    paddingTop: 20,
  },

  // Ultimate Header Styles
  ultimateHeader: {
    backgroundColor: '#1e293b',
    padding: 24,
    paddingTop: 24,
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 2,
    borderBottomColor: '#374151',
  },
  headerBackgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    opacity: 0.95,
  },
  commandCenterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#fbbf24',
    alignSelf: 'flex-start',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  commandCenterBadgeText: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 8,
    letterSpacing: 1,
  },
  ultimateHeaderTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    position: 'relative',
    zIndex: 1,
  },
  ultimateHeaderSubtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
    zIndex: 1,
  },
  ultimateHeaderSubtitle: {
    fontSize: 18,
    color: '#e2e8f0',
    marginHorizontal: 12,
    fontWeight: '500',
  },
  ultimateGrowthMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    position: 'relative',
    zIndex: 1,
  },
  growthMetricCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  growthMetricIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  growthMetricContent: {
    flex: 1,
  },
  growthMetricLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
    marginBottom: 2,
  },
  growthMetricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  growthTrendIndicator: {
    marginLeft: 8,
  },
  realtimeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
    zIndex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
    marginRight: 8,
  },
  performanceSummary: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    position: 'relative',
    zIndex: 1,
  },
  performanceSummaryText: {
    fontSize: 13,
    color: '#10b981',
    textAlign: 'center',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  section: {
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginBottom: 12,
  },
  categorySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  categoryStatusText: {
    color: '#8b5cf6',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
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
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#374151',
  },
  refreshButtonDisabled: {
    backgroundColor: '#2a2a2a',
    opacity: 0.6,
  },
  refreshButtonText: {
    fontSize: 18,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  // Enhanced Tab styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    backdropFilter: 'blur(10px)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
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
  // Order list styles
  ordersList: {
    flex: 1,
  },
  ordersListContent: {
    padding: 16,
  },
  
  // Ultimate Order Card Styles
  ultimateOrderCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 6,
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
    elevation: 6,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 2,
    borderColor: '#334155',
    position: 'relative',
    overflow: 'hidden',
  },
  pendingOrderCard: {
    borderLeftColor: '#fbbf24',
  },
  confirmedOrderCard: {
    borderLeftColor: '#10b981',
  },
  ultimateOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderRankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eliteOrderRankBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  eliteOrderRankText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  orderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  orderBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '600',
  },
  orderPerformanceCrown: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  ultimateOrderName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    lineHeight: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  ultimateOrderMetrics: {
    marginBottom: 12,
  },
  orderMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  orderMetricIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  orderMetricContent: {
    flex: 1,
  },
  orderMetricLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
    marginBottom: 2,
  },
  orderMetricValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  ultimateOrderProgress: {
    marginBottom: 12,
  },
  orderProgressBarBg: {
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  orderProgressBarFill: {
    height: '100%',
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  orderProgressLabel: {
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'center',
    fontWeight: '500',
  },
  ultimateOrderStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  orderStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  orderStatLabel: {
    fontSize: 9,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  orderStatValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  // Legacy Order Card Styles (kept for compatibility)
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
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    borderStyle: 'dashed',
    margin: 16,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
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
    backgroundColor: '#0f172a',
  },
  loadingText: {
    fontSize: 18,
    color: '#94a3b8',
    marginTop: 16,
    fontWeight: '600',
  },
  aiInsightIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
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