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
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import Icon from 'react-native-vector-icons/MaterialIcons';
import { shopAPI } from '../services/api';
import { shopStorage } from '../services/storage';

// Import STORAGE_KEYS for verification
const STORAGE_KEYS = {
  CASHIER_RECEIVING_RECORDS: 'cashier_receiving_records'
};

const { width } = Dimensions.get('window');

const OrderConfirmationScreen = () => {
  const [orderData, setOrderData] = useState(null);
  const route = useRoute();
  const navigation = useNavigation();
  
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

  // Modal states
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [showEditOrderModal, setShowEditOrderModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalOrderData, setModalOrderData] = useState(null);

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
      
      // Load cashier receiving records using the dedicated method
      let cashierReceiving = await shopStorage.getCashierReceivingRecords();
      console.log('📦 Cashier receiving records loaded:', cashierReceiving.length, 'records');
      
      console.log('📋 Raw cashier receiving records:', cashierReceiving);
      console.log('📊 Cashier receiving count:', cashierReceiving.length);
      
      // Debug each cashier record in detail
      cashierReceiving.forEach((record, index) => {
        console.log(`💰 Cashier Record ${index + 1} DEBUG:`, {
          id: record.id,
          status: record.status,
          supplierName: record.supplierName,
          createdBy: record.createdBy,
          createdByType: typeof record.createdBy,
          cashierName: record.cashierName,
          allKeys: Object.keys(record)
        });
      });
      
      // Check each order's status
      pending.forEach((order, index) => {
        console.log(`Pending Order ${index + 1}:`, {
          id: order.id,
          status: order.status,
          supplierName: order.supplierName
        });
      });
      
      // Check each cashier receiving record
      cashierReceiving.forEach((record, index) => {
        console.log(`Cashier Receiving ${index + 1}:`, {
          id: record.id,
          status: record.status,
          supplierName: record.supplierName,
          createdBy: record.createdBy,
          cashierName: record.cashierName
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
      
      // Filter by status and remove duplicates - include both owner and cashier pending orders
      const pendingOrdersList = [
        ...pending
          .filter(order => order && order.status === 'pending_review'),
        ...cashierReceiving
          .filter(record => record && record.status === 'pending_review')
          .map(record => ({
            ...record,
            // Ensure consistent structure
            id: record.id,
            status: 'pending_review',
            createdBy: 'cashier'
          }))
      ];
      
      // Remove duplicates based on ID across both arrays
      const uniquePendingOrders = pendingOrdersList.filter((order, index, self) => 
        index === self.findIndex(o => o.id === order.id)
      );
      
      console.log('🔍 Before deduplication:', pendingOrdersList.length, 'orders');
      console.log('🔍 After deduplication:', uniquePendingOrders.length, 'orders');
      console.log('🔍 Duplicate IDs found:', pendingOrdersList.length - uniquePendingOrders.length);
      
      console.log('🔍 Raw confirmed orders before filtering:', confirmed.length);
      
      // Cashier orders now use 'pending_review' status, so they're handled in pending filter
      // No special handling needed - they appear in pending tab with visual distinction
      
      console.log('🔍 Cashier records found:', cashierReceiving.length);
      console.log('🔍 Cashier records will appear in pending tab for review');
      
      // Debug cashier receiving records with names
      console.log('💰 Debug cashier receiving records:', cashierReceiving.map(record => ({
        id: record.id,
        status: record.status,
        supplierName: record.supplierName,
        createdBy: record.createdBy,
        cashierName: record.cashierName
      })));
      
      const confirmedOrdersList = [
        ...confirmed
          .filter(order => order && order.status === 'confirmed')
          .filter((order, index, self) => 
            index === self.findIndex(o => o.id === order.id)
          )
      ];
      
      console.log('🔍 Confirmed orders after filtering:', confirmed.filter(order => order && order.status === 'confirmed').length);
      console.log('🔍 Total confirmed orders (owner only):', confirmed.filter(order => order && order.status === 'confirmed').length);
      
      console.log('🔍 Filtered pending orders:', uniquePendingOrders);
      console.log('🔍 Filtered confirmed orders:', confirmedOrdersList);
      console.log('📈 Final pending count:', uniquePendingOrders.length);
      console.log('📈 Final confirmed count:', confirmedOrdersList.length);
      
      // Debug: Show detailed info about cashier orders in pending
      const cashierOrdersInPending = uniquePendingOrders.filter(order => order.createdBy === 'cashier');
      cashierOrdersInPending.forEach((order, index) => {
        console.log(`🏪 Cashier Order ${index + 1} (pending review):`, {
          id: order.id,
          status: order.status,
          supplierName: order.supplierName,
          createdBy: order.createdBy
        });
      });
      
      setPendingOrders(uniquePendingOrders);
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
      console.log('📦 Confirming order:', order.id);
      console.log('👤 Order created by:', order.createdBy);
      
      // Update product inventory first
      const inventoryResult = await updateProductInventory(order);
      
      // Create confirmed order with additional metadata
      const confirmedOrder = { 
        ...order, 
        status: 'confirmed', 
        confirmedAt: new Date().toISOString(),
        inventoryUpdated: true,
        inventoryUpdateResult: inventoryResult
      };
      
      console.log('✅ Created confirmed order:', confirmedOrder);
      
      // Determine order type by checking if it exists in cashier receiving records
      console.log('🔍 Debug order details:', {
        orderId: order.id,
        createdBy: order.createdBy,
        createdByType: typeof order.createdBy,
        orderKeys: Object.keys(order),
        status: order.status
      });
      
      // Check if order exists in cashier receiving records
      const cashierReceiving = await shopStorage.getCashierReceivingRecords();
      const existsInCashierRecords = cashierReceiving.some(record => record.id === order.id);
      console.log('👤 Exists in cashier records?', existsInCashierRecords);
      console.log('👤 Total cashier records:', cashierReceiving.length);
      
      // Use existence in cashier records as the definitive indicator
      const isCashierOrder = existsInCashierRecords;
      console.log('👤 Is cashier order (by record existence)?', isCashierOrder);
      
      if (isCashierOrder) {
        // For cashier orders: remove from cashier receiving records, add to confirmed
        console.log('👤 Processing cashier order confirmation...');
        
        // Get current cashier receiving records
        let cashierReceiving = await shopStorage.getCashierReceivingRecords();
        console.log('📦 Current cashier records:', cashierReceiving.length);
        console.log('📦 Cashier records:', cashierReceiving.map(r => ({ id: r.id, status: r.status })));
        
        // Remove the confirmed order from cashier receiving records
        const updatedCashierReceiving = cashierReceiving.filter(record => record.id !== order.id);
        console.log('🗑️ Removed order from cashier records. Remaining:', updatedCashierReceiving.length);
        console.log('🗑️ Updated cashier records:', updatedCashierReceiving.map(r => ({ id: r.id, status: r.status })));
        
        // Save updated cashier receiving records
        const saveResult = await shopStorage.saveCashierReceivingRecords(updatedCashierReceiving);
        console.log('💾 Save result for cashier records:', saveResult);
        
        // Add to confirmed orders
        const updatedConfirmedOrders = [...confirmedOrders, confirmedOrder];
        const confirmedSaveResult = await shopStorage.setItem('confirmed_orders', JSON.stringify(updatedConfirmedOrders));
        console.log('💾 Save result for confirmed orders:', confirmedSaveResult);
        
        // Update state
        setConfirmedOrders(updatedConfirmedOrders);
        
        console.log('✅ Cashier order confirmation completed');
        
      } else {
        // For owner orders: remove from pending orders, add to confirmed
        console.log('👤 Processing owner order confirmation...');
        console.log('📦 Current pending orders:', pendingOrders.length);
        
        const updatedPendingOrders = pendingOrders.filter(o => o.id !== order.id);
        const updatedConfirmedOrders = [...confirmedOrders, confirmedOrder];
        
        console.log('🗑️ Updated pending orders count:', updatedPendingOrders.length);
        console.log('✅ Updated confirmed orders count:', updatedConfirmedOrders.length);
        
        // Save to storage
        const pendingSaveResult = await shopStorage.setItem('pending_orders', JSON.stringify(updatedPendingOrders));
        const confirmedSaveResult = await shopStorage.setItem('confirmed_orders', JSON.stringify(updatedConfirmedOrders));
        
        console.log('💾 Save result for pending orders:', pendingSaveResult);
        console.log('💾 Save result for confirmed orders:', confirmedSaveResult);
        
        // Update state
        setPendingOrders(updatedPendingOrders);
        setConfirmedOrders(updatedConfirmedOrders);
        
        console.log('✅ Owner order confirmation completed');
      }
      
      setShowConfirmationModal(false);
      setShowSuccessModal(true);
      
      // Verify storage was updated correctly
      console.log('🔍 Verifying storage updates...');
      
      // Check pending orders
      const verifyPendingJson = await shopStorage.getItem('pending_orders');
      const verifyPending = JSON.parse(verifyPendingJson || '[]');
      console.log('🔍 Verified pending orders count:', verifyPending.length);
      
      // Check confirmed orders
      const verifyConfirmedJson = await shopStorage.getItem('confirmed_orders');
      const verifyConfirmed = JSON.parse(verifyConfirmedJson || '[]');
      console.log('🔍 Verified confirmed orders count:', verifyConfirmed.length);
      
      // Check cashier receiving records (verify removal)
      const verifyCashierJson = await shopStorage.getItem(STORAGE_KEYS.CASHIER_RECEIVING_RECORDS);
      const verifyCashier = JSON.parse(verifyCashierJson || '[]');
      console.log('🔍 Verified cashier records count:', verifyCashier.length);
      console.log('🔍 Remaining cashier records:', verifyCashier.map(r => ({ id: r.id, status: r.status })));
      
      // Check if the order still exists in cashier records (should be removed if it was a cashier order)
      const stillExistsInCashier = verifyCashier.some(r => r.id === order.id);
      console.log('🔍 Order still exists in cashier records:', stillExistsInCashier);
      
      // Check if the confirmed order is in confirmed orders
      const confirmedOrderExists = verifyConfirmed.find(o => o.id === order.id);
      console.log('🔍 Confirmed order exists in storage:', !!confirmedOrderExists);
      
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
      
      // Prepare the receiving data for the bulk inventory receive API
      const receivingData = {
        reference: order.reference || order.id,
        invoiceNumber: order.invoiceNumber || '',
        supplier: order.supplierName || 'Unknown Supplier',
        receivingDate: order.receivingDate || new Date().toISOString().split('T')[0],
        notes: order.notes || '',
        items: order.receivingItems?.map((item, index) => ({
          productId: item.product?.id,
          quantity: parseFloat(item.quantity) || 0,
          costPrice: item.costPrice || 0,
          updateBaseCost: item.updateBaseCost || false
        })) || [],
        totals: order.totals || {}
      };
      
      console.log('📤 Sending bulk inventory receive request:', receivingData);
      
      // Use the dedicated inventory receive API endpoint
      const response = await shopAPI.receiveInventory(receivingData);
      console.log('✅ Inventory receive API response:', response);
      
      if (response && response.data) {
        const result = response.data;
        if (result.success !== false) {
          console.log('✅ Successfully updated inventory via API');
          console.log('📦 Items received:', result.received_items?.length || 0);
          
          return {
            successful: result.received_items?.length || order.receivingItems?.length || 0,
            failed: 0,
            verified: result.received_items?.length || order.receivingItems?.length || 0
          };
        } else {
          console.warn('⚠️ API returned partial success:', result.errors);
          return {
            successful: result.received_items?.length || 0,
            failed: result.errors?.length || 0,
            verified: 0,
            error: result.errors?.join(', ')
          };
        }
      }
      
      console.log('✅ Product inventory update process completed!');
      return { successful: order.receivingItems?.length || 0, failed: 0, verified: order.receivingItems?.length || 0 };
      
    } catch (error) {
      console.error('❌ Critical error in inventory update:', error);
      console.error('❌ Error stack:', error.stack);
      
      // Don't throw error - let order confirmation proceed
      console.log('⚠️ Inventory update failed, but continuing with order confirmation...');
      return { error: `${error.message} - Backend server may not be running` };
    }
  };

  const handleViewOrder = (order) => {
    setModalOrderData(order);
    setShowOrderDetailsModal(true);
  };

  const handleBackToList = () => {
    setShowOrderDetailsModal(false);
    setShowEditOrderModal(false);
    setModalOrderData(null);
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
    setShowOrderDetailsModal(false);
    setShowEditOrderModal(true);
  };

  const handleConfirmOrderClick = (order) => {
    setModalOrderData(order);
    setShowConfirmationModal(true);
  };

  const handleSuccessModalOK = () => {
    setShowSuccessModal(false);
    setModalOrderData(null);
  };

  const closeAllModals = () => {
    setShowOrderDetailsModal(false);
    setShowEditOrderModal(false);
    setShowConfirmationModal(false);
    setModalOrderData(null);
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
          
          {/* Navigation Header */}
          <View style={styles.navigationHeader}>
            <TouchableOpacity 
              style={styles.navButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back" size={24} color="#fff" />
              <Text style={styles.navButtonText}>Back</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.navButton}
              onPress={onRefresh}
              disabled={refreshing}
            >
              <Icon name={refreshing ? "sync" : "refresh"} size={24} color={refreshing ? "#94a3b8" : "#fff"} />
              <Text style={[styles.navButtonText, refreshing && { color: '#94a3b8' }]}>
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Text>
            </TouchableOpacity>
          </View>
          
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

        {/* Orders List Content */}
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
            currentOrders.map((order, index) => {
              // Log to ensure data is flowing correctly
              console.log(`🎨 Rendering Elite Card ${index + 1}: ${order.id}`);
              
              return (
                <TouchableOpacity 
                  key={`${order.id}-${index}`}
                  style={[
                    styles.ultimateOrderCard,
                    order.status === 'confirmed' ? styles.confirmedOrderCard : 
                    order.createdBy === 'cashier' ? styles.cashierPendingOrderCard : 
                    styles.pendingOrderCard
                  ]}
                  onPress={() => handleViewOrder(order)}
                >
                  {/* Elite Order Header */}
                  <View style={styles.ultimateOrderHeader}>
                    <View style={styles.orderRankContainer}>
                      <View style={[
                        styles.eliteOrderRankBadge, 
                        { backgroundColor: order.status === 'confirmed' ? '#10b981' : order.createdBy === 'cashier' ? '#06b6d4' : '#fbbf24' }
                      ]}>
                        <Text style={styles.eliteOrderRankText}>#{index + 1}</Text>
                      </View>
                      <View style={[styles.orderBadge, { backgroundColor: order.status === 'confirmed' ? '#10b981' : order.createdBy === 'cashier' ? '#06b6d4' : '#fbbf24'}]}>
                        <Icon name={order.status === 'confirmed' ? 'check-circle' : order.createdBy === 'cashier' ? 'person' : 'hourglass-empty'} size={12} color="#ffffff" />
                        <Text style={styles.orderBadgeText}>{order.status === 'confirmed' ? 'CONFIRMED' : order.createdBy === 'cashier' ? 'CASHIER' : 'PENDING'}</Text>
                      </View>
                    </View>
                    <View style={[styles.orderPerformanceCrown, { backgroundColor: order.status === 'confirmed' ? '#10b981' : order.createdBy === 'cashier' ? '#06b6d4' : '#fbbf24'}]}>
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
                        <Icon name={order.createdBy === 'cashier' ? "person" : "business"} size={14} color={order.createdBy === 'cashier' ? "#06b6d4" : "#f59e0b"} />
                      </View>
                      <View style={styles.orderMetricContent}>
                        <Text style={styles.orderMetricLabel}>Placed By</Text>
                        <Text style={[styles.orderMetricValue, { color: order.createdBy === 'cashier' ? '#06b6d4' : '#f59e0b' }]}>
                          {order.createdBy === 'cashier' ? (() => {
                            console.log('💰 Debug cashier order display:', {
                              orderId: order.id,
                              createdBy: order.createdBy,
                              cashierName: order.cashierName,
                              cashierNameType: typeof order.cashierName,
                              cashierNameExists: !!order.cashierName
                            });
                            return order.cashierName || 'Cashier';
                          })() : 'Owner'}
                        </Text>
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
                  
                  {/* Elite Order Progress Bar */}
                  <View style={styles.ultimateOrderProgress}>
                    <View style={styles.orderProgressBarBg}>
                      <View 
                        style={[
                          styles.orderProgressBarFill,
                          { 
                            width: order.status === 'confirmed' ? '100%' : order.createdBy === 'cashier' ? '80%' : '60%',
                            backgroundColor: order.status === 'confirmed' ? '#10b981' : order.createdBy === 'cashier' ? '#06b6d4' : '#fbbf24'
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.orderProgressLabel}>
                      {order.status === 'confirmed' ? 'Order Completed' : order.createdBy === 'cashier' ? 'Cashier Order - Awaiting Review' : 'Awaiting Confirmation'}
                    </Text>
                  </View>
                  
                  {/* Elite Order Stats Footer */}
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
                      <Text style={[styles.orderStatValue, { color: order.status === 'confirmed' ? '#10b981' : order.createdBy === 'cashier' ? '#06b6d4' : '#fbbf24'}]}>
                        {order.status === 'confirmed' ? '✅ Complete' : order.createdBy === 'cashier' ? '👤 Cashier' : '⏳ Pending'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ); // Return ends here
            }) // Map ends here
          )}
        </View>
        
        {/* Bottom padding for web scrolling */}
        <View style={{ 
          height: Platform.OS === 'web' ? 100 : 20,
          minHeight: Platform.OS === 'web' ? 100 : 0
        }} />
      </ScrollView>
    ); // Component return ends here
}; // Component function ends here

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
            
            {/* Navigation Header */}
            <View style={styles.navigationHeader}>
              <TouchableOpacity 
                style={styles.navButton}
                onPress={() => navigation.goBack()}
              >
                <Icon name="arrow-back" size={24} color="#fff" />
                <Text style={styles.navButtonText}>Back</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.navButton}
                onPress={onRefresh}
                disabled={refreshing}
              >
                <Icon name={refreshing ? "sync" : "refresh"} size={24} color={refreshing ? "#94a3b8" : "#fff"} />
                <Text style={[styles.navButtonText, refreshing && { color: '#94a3b8' }]}>
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </Text>
              </TouchableOpacity>
            </View>
            
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
          
          {/* Navigation Header */}
          <View style={styles.navigationHeader}>
            <TouchableOpacity 
              style={styles.navButton}
              onPress={viewingOrder ? handleBackToList : () => navigation.goBack()}
            >
              <Icon name="arrow-back" size={24} color="#fff" />
              <Text style={styles.navButtonText}>Back</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.navButton}
              onPress={onRefresh}
              disabled={refreshing}
            >
              <Icon name={refreshing ? "sync" : "refresh"} size={24} color={refreshing ? "#94a3b8" : "#fff"} />
              <Text style={[styles.navButtonText, refreshing && { color: '#94a3b8' }]}>
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Text>
            </TouchableOpacity>
          </View>
          
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
            <Icon name={order.status === 'confirmed' ? "check-circle" : order.status === 'cashier_received' ? "person" : "hourglass-empty"} size={16} color={order.status === 'confirmed' ? "#10b981" : order.status === 'cashier_received' ? "#06b6d4" : "#fbbf24"} />
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
            <View style={[styles.statusDot, { backgroundColor: order.status === 'confirmed' ? '#10b981' : order.createdBy === 'cashier' ? '#06b6d4' : '#fbbf24'}]} />
            <Text style={[styles.statusText, { color: order.status === 'confirmed' ? '#10b981' : order.createdBy === 'cashier' ? '#06b6d4' : '#fbbf24'}]}>
              {order.status === 'confirmed' ? 'Order Completed' : order.createdBy === 'cashier' ? 'Cashier Order - Pending Review' : 'Pending Confirmation'}
            </Text>
            <Icon name={order.status === 'confirmed' ? "verified" : order.createdBy === 'cashier' ? "person" : "schedule"} size={14} color={order.status === 'confirmed' ? "#10b981" : order.createdBy === 'cashier' ? "#06b6d4" : "#fbbf24"} />
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
              <View style={[styles.categoryPerformanceIndicator, { backgroundColor: order.status === 'confirmed' ? '#10b981' : order.createdBy === 'cashier' ? '#06b6d4' : '#fbbf24'}]}>
                <Icon name={order.status === 'confirmed' ? "check-circle" : order.createdBy === 'cashier' ? "person" : "hourglass-empty"} size={14} color="#ffffff" />
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
                  <Icon name={order.status === 'confirmed' ? "verified" : order.status === 'cashier_received' ? "person" : "pending"} size={14} color={order.status === 'confirmed' ? "#10b981" : order.status === 'cashier_received' ? "#06b6d4" : "#fbbf24"} />
                </View>
                <View style={styles.categoryMetricContent}>
                  <Text style={styles.categoryMetricLabel}>Status</Text>
                  <Text style={[styles.categoryMetricValue, { color: order.createdBy === 'cashier' ? '#06b6d4' : '#f59e0b' }]}>
                    {order.createdBy === 'cashier' ? (() => {
                      console.log('💰 Debug modal cashier order display:', {
                        orderId: order.id,
                        createdBy: order.createdBy,
                        cashierName: order.cashierName,
                        cashierNameType: typeof order.cashierName,
                        cashierNameExists: !!order.cashierName
                      });
                      return order.cashierName || 'Cashier';
                    })() : 'Owner'}
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
                      width: order.status === 'confirmed' ? '100%' : order.createdBy === 'cashier' ? '80%' : '60%',
                      backgroundColor: order.status === 'confirmed' ? '#10b981' : order.createdBy === 'cashier' ? '#06b6d4' : '#fbbf24'
                    }
                  ]} 
                />
              </View>
              <Text style={styles.categoryProgressLabel}>
                {order.status === 'confirmed' ? 'Order Completed' : order.createdBy === 'cashier' ? 'Cashier Order - Awaiting Review' : 'Awaiting Confirmation'}
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
                onPress={() => viewingOrder ? handleConfirmOrderClick(viewingOrder) : handleConfirmOrderClick({
                  id: orderId,
                  reference: receivingReference,
                  invoiceNumber: invoiceNumber,
                  supplierName: supplierName,
                  receivingDate: receivingDate,
                  notes: notes,
                  receivingItems: receivingItems,
                  totals: totals,
                  status: 'pending_review'
                })}
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
          
          {/* Navigation Header */}
          <View style={styles.navigationHeader}>
            <TouchableOpacity 
              style={styles.navButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back" size={24} color="#fff" />
              <Text style={styles.navButtonText}>Back</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.navButton}
              onPress={onRefresh}
              disabled={refreshing}
            >
              <Icon name={refreshing ? "sync" : "refresh"} size={24} color={refreshing ? "#94a3b8" : "#fff"} />
              <Text style={[styles.navButtonText, refreshing && { color: '#94a3b8' }]}>
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Text>
            </TouchableOpacity>
          </View>
          
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

  // Modal rendering functions
  const renderOrderDetailsModal = () => {
    if (!showOrderDetailsModal || !modalOrderData) return null;
    
    const order = modalOrderData;
    
    return (
      <Modal
        visible={showOrderDetailsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowOrderDetailsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>📋 Order Details</Text>
            <TouchableOpacity onPress={() => setShowOrderDetailsModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.modalOrderCard}>
              <Text style={styles.modalOrderId}>Order {order.id}</Text>
              <Text style={styles.modalSupplier}>🏢 {order.supplierName}</Text>
              
              <View style={styles.modalInfoRow}>
                <Text style={styles.modalInfoLabel}>Reference:</Text>
                <Text style={styles.modalInfoValue}>{order.reference || 'N/A'}</Text>
              </View>
              
              <View style={styles.modalInfoRow}>
                <Text style={styles.modalInfoLabel}>Invoice:</Text>
                <Text style={styles.modalInfoValue}>{order.invoiceNumber || 'N/A'}</Text>
              </View>
              
              <View style={styles.modalInfoRow}>
                <Text style={styles.modalInfoLabel}>Date:</Text>
                <Text style={styles.modalInfoValue}>{order.receivingDate}</Text>
              </View>
              
              <View style={styles.modalInfoRow}>
                <Text style={styles.modalInfoLabel}>Items:</Text>
                <Text style={styles.modalInfoValue}>{order.receivingItems?.length || 0}</Text>
              </View>
              
              <View style={styles.modalInfoRow}>
                <Text style={styles.modalInfoLabel}>Total Value:</Text>
                <Text style={styles.modalInfoValue}>${order.totals?.totalValue?.toFixed(2) || '0.00'}</Text>
              </View>
              
              <View style={styles.modalInfoRow}>
                <Text style={styles.modalInfoLabel}>Created By:</Text>
                <Text style={[
                  styles.modalInfoValue, 
                  { color: order.createdBy === 'cashier' ? '#06b6d4' : '#f59e0b' }
                ]}>
                  {order.createdBy === 'cashier' ? (() => {
                    console.log('💰 Debug modal order details display:', {
                      orderId: order.id,
                      createdBy: order.createdBy,
                      cashierName: order.cashierName,
                      cashierNameType: typeof order.cashierName,
                      cashierNameExists: !!order.cashierName
                    });
                    return order.cashierName || 'Cashier';
                  })() : 'Owner'}
                </Text>
              </View>
              
              <View style={styles.modalInfoRow}>
                <Text style={styles.modalInfoLabel}>Status:</Text>
                <Text style={[
                  styles.modalInfoValue, 
                  { color: order.status === 'confirmed' ? '#10b981' : order.createdBy === 'cashier' ? '#06b6d4' : '#fbbf24' }
                ]}>
                  {order.status === 'confirmed' ? '✅ Confirmed' : order.createdBy === 'cashier' ? '👤 Cashier Order' : '⏳ Pending'}
                </Text>
              </View>
            </View>
            
            {order.receivingItems && order.receivingItems.length > 0 && (
              <View style={styles.modalItemsSection}>
                <Text style={styles.modalSectionTitle}>📦 Items ({order.receivingItems.length})</Text>
                {order.receivingItems.map((item, index) => (
                  <View key={index} style={styles.modalItemCard}>
                    <Text style={styles.modalItemName}>{item.product?.name || `Item ${index + 1}`}</Text>
                    <View style={styles.modalItemDetails}>
                      <Text style={styles.modalItemDetail}>Qty: {item.quantity}</Text>
                      <Text style={styles.modalItemDetail}>Cost: ${item.costPrice?.toFixed(2) || '0.00'}</Text>
                      <Text style={styles.modalItemDetail}>Total: ${item.totalCost?.toFixed(2) || '0.00'}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
            
            {order.notes && (
              <View style={styles.modalNotesSection}>
                <Text style={styles.modalSectionTitle}>📝 Notes</Text>
                <Text style={styles.modalNotesText}>{order.notes}</Text>
              </View>
            )}
          </ScrollView>
          
          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.modalSecondaryButton}
              onPress={() => setShowOrderDetailsModal(false)}
            >
              <Text style={styles.modalSecondaryButtonText}>Close</Text>
            </TouchableOpacity>
            
            {order.status === 'pending_review' && (
              <TouchableOpacity 
                style={styles.modalPrimaryButton}
                onPress={() => {
                  setShowOrderDetailsModal(false);
                  handleConfirmOrderClick(order);
                }}
              >
                <Text style={styles.modalPrimaryButtonText}>Confirm Order</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  const renderEditOrderModal = () => {
    if (!showEditOrderModal || !modalOrderData) return null;
    
    return (
      <Modal
        visible={showEditOrderModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditOrderModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>✏️ Edit Order</Text>
            <TouchableOpacity onPress={() => setShowEditOrderModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.editWarningCard}>
              <Text style={styles.editWarningText}>
                ⚠️ Order editing is not fully implemented yet. This would typically allow you to modify items, quantities, or supplier information.
              </Text>
            </View>
            
            <View style={styles.modalOrderCard}>
              <Text style={styles.modalOrderId}>Order {modalOrderData.id}</Text>
              <Text style={styles.modalSupplier}>🏢 {modalOrderData.supplierName}</Text>
              
              <Text style={styles.editFeatureText}>
                📋 Available for future implementation:
              </Text>
              
              <View style={styles.featureList}>
                <Text style={styles.featureItem}>• Modify item quantities</Text>
                <Text style={styles.featureItem}>• Add or remove items</Text>
                <Text style={styles.featureItem}>• Update supplier information</Text>
                <Text style={styles.featureItem}>• Change receiving date</Text>
                <Text style={styles.featureItem}>• Update notes</Text>
              </View>
            </View>
          </ScrollView>
          
          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.modalSecondaryButton}
              onPress={() => setShowEditOrderModal(false)}
            >
              <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalPrimaryButton}
              onPress={() => {
                Alert.alert('Feature Not Available', 'Order editing will be available in a future update.');
              }}
            >
              <Text style={styles.modalPrimaryButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderConfirmationModal = () => {
    if (!showConfirmationModal || !modalOrderData) return null;
    
    return (
      <Modal
        visible={showConfirmationModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowConfirmationModal(false)}
      >
        <View style={styles.confirmationModalContainer}>
          <View style={styles.confirmationModalContent}>
            <View style={styles.confirmationIconContainer}>
              <Text style={styles.confirmationIcon}>⚠️</Text>
            </View>
            
            <Text style={styles.confirmationTitle}>Confirm Order</Text>
            
            <Text style={styles.confirmationMessage}>
              Are you sure you want to confirm this order? This action will:
            </Text>
            
            <View style={styles.confirmationEffects}>
              <Text style={styles.confirmationEffect}>📦 Update product inventory</Text>
              <Text style={styles.confirmationEffect}>💰 Process financial totals</Text>
              <Text style={styles.confirmationEffect}>📋 Mark order as confirmed</Text>
              <Text style={styles.confirmationEffect}>⚠️ This action cannot be easily undone</Text>
            </View>
            
            <Text style={styles.confirmationOrderId}>
              Order: {modalOrderData.id}
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalSecondaryButton}
                onPress={() => setShowConfirmationModal(false)}
              >
                <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalPrimaryButton}
                onPress={() => handleConfirmOrder(modalOrderData)}
                disabled={savingState}
              >
                <Text style={[
                  styles.modalPrimaryButtonText,
                  savingState && { opacity: 0.7 }
                ]}>
                  {savingState ? 'Processing...' : 'Confirm Order'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderSuccessModal = () => {
    if (!showSuccessModal) return null;
    
    return (
      <Modal
        visible={showSuccessModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.successModalContainer}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <Text style={styles.successIcon}>✅</Text>
            </View>
            
            <Text style={styles.successTitle}>Order Confirmed Successfully!</Text>
            
            <Text style={styles.successMessage}>
              Your order has been confirmed and processed. Inventory has been updated accordingly.
            </Text>
            
            <View style={styles.successDetails}>
              <Text style={styles.successDetail}>📦 Products updated in inventory</Text>
              <Text style={styles.successDetail}>📋 Order marked as confirmed</Text>
              <Text style={styles.successDetail}>🔄 Products screen will refresh</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.successOKButton}
              onPress={handleSuccessModalOK}
            >
              <Text style={styles.successOKButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Show the order list (modals will overlay when needed)
  return (
    <>
      {renderOrderList()}
      {renderOrderDetailsModal()}
      {renderEditOrderModal()}
      {renderConfirmationModal()}
      {renderSuccessModal()}
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
  // Navigation Header Styles
  navigationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
    zIndex: 2,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    elevation: 2,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  navButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
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
  cashierPendingOrderCard: {
    borderLeftColor: '#06b6d4',  // Cyan for cashier orders in pending
  },
  confirmedOrderCard: {
    borderLeftColor: '#10b981',
  },
  cashierReceivedOrderCard: {
    borderLeftColor: '#06b6d4',
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

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    paddingTop: 50,
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
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalOrderCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalOrderId: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSupplier: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalInfoLabel: {
    color: '#ccc',
    fontSize: 14,
  },
  modalInfoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalItemsSection: {
    marginTop: 16,
  },
  modalSectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modalItemCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  modalItemName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalItemDetail: {
    color: '#ccc',
    fontSize: 12,
  },
  modalNotesSection: {
    marginTop: 16,
  },
  modalNotesText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 12,
  },
  modalPrimaryButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 12,
    paddingHorizontal: 20,
    flex: 1,
  },
  modalPrimaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalSecondaryButton: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    paddingHorizontal: 20,
    flex: 1,
  },
  modalSecondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  editWarningCard: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  editWarningText: {
    color: '#fbbf24',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  editFeatureText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  featureList: {
    marginLeft: 16,
  },
  featureItem: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 4,
  },
  // Confirmation Modal Styles
  confirmationModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  confirmationModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 30,
    margin: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fbbf24',
    maxWidth: '90%',
  },
  confirmationIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fbbf24',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmationIcon: {
    fontSize: 40,
  },
  confirmationTitle: {
    color: '#fbbf24',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  confirmationMessage: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  confirmationEffects: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    width: '100%',
  },
  confirmationEffect: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  confirmationOrderId: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 25,
    textAlign: 'center',
  },
  // Success Modal Styles
  successModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  successModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 30,
    margin: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10b981',
    maxWidth: '90%',
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIcon: {
    fontSize: 40,
  },
  successTitle: {
    color: '#10b981',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  successMessage: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  successDetails: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    width: '100%',
  },
  successDetail: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  successOKButton: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
    width: '80%',
  },
  successOKButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OrderConfirmationScreen;