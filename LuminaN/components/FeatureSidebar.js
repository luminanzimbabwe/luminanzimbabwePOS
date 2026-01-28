import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  PanResponder,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(width * 0.75, 350); // Cover up to 75% of screen, max 350px

const FeatureSidebar = ({ isVisible, onClose }) => {
  const navigation = useNavigation();
  const [sidebarX] = useState(new Animated.Value(-SIDEBAR_WIDTH));

  // Animation for opening/closing sidebar
  React.useEffect(() => {
    Animated.timing(sidebarX, {
      toValue: isVisible ? 0 : -SIDEBAR_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible]);

  // Pan responder for swipe gestures
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => {
        return evt.nativeEvent.locationX < 50; // Only respond to touches near the left edge
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return evt.nativeEvent.locationX < 50;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dx > 0 && isVisible) {
          sidebarX.setValue(-SIDEBAR_WIDTH + gestureState.dx);
        } else if (gestureState.dx < 0 && !isVisible) {
          sidebarX.setValue(-SIDEBAR_WIDTH + gestureState.dx);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 100) {
          // Swipe right to open
          onClose();
        } else if (gestureState.dx < -50) {
          // Swipe left to close
          onClose();
        } else {
          // Reset to original position
          Animated.timing(sidebarX, {
            toValue: isVisible ? 0 : -SIDEBAR_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const features = [
    // Sales Command Center Section
    {
      id: 'start-of-day',
      title: '🏪 Start of Day',
      description: 'Open/close shop & manage business day',
      icon: '🏪',
      screen: 'StartOfDay',
      color: '#22c55e',
      section: 'shop-management'
    },
    {
      id: 'dashboard',
      title: '🏠 Main Dashboard',
      description: 'Overview of business operations',
      icon: '🏠',
      screen: 'OwnerDashboard',
      color: '#06b6d4',
      section: 'shop-management'
    },
    {
      id: 'staff-management',
      title: '👥 Staff Management',
      description: 'Manage staff & permissions',
      icon: '👥',
      screen: 'StaffManagement',
      color: '#8b5cf6',
      section: 'shop-management'
    },
    {
      id: 'order-confirmations',
      title: '✅ Order Confirmations',
      description: 'Review & confirm pending orders',
      icon: '✅',
      screen: 'OrderConfirmation',
      color: '#10b981',
      section: 'shop-management'
    },

    {
      id: 'sales-dashboard',
      title: '📊 Sales Dashboard',
      description: 'Real-time sales overview & analytics',
      icon: '📊',
      screen: 'SalesDashboard',
      color: '#06b6d4',
      section: 'sales'
    },
    {
      id: 'sales-ledger',
      title: '📋 Sales Ledger',
      description: 'Detailed transaction records',
      icon: '📋',
      screen: 'SalesLedger',
      color: '#10b981',
      section: 'sales'
    },
    {
      id: 'sales-audit-trail',
      title: '🔍 Sales Audit Trail',
      description: 'Track all sales modifications',
      icon: '🔍',
      screen: 'SalesAuditTrail',
      color: '#f59e0b',
      section: 'sales'
    },

    {
      id: 'eod-reconciliation',
      title: '🔄 EOD Reconciliation',
      description: 'End-of-day cash reconciliation',
      icon: '🔄',
      screen: 'EODReconciliation',
      color: '#8b5cf6',
      section: 'sales'
    },
    {
      id: 'waste-management',
      title: '🗑️ Waste Management',
      description: 'Track & manage product waste',
      icon: '🗑️',
      screen: 'WasteScreen',
      color: '#f97316',
      section: 'sales'
    },
    {
      id: 'drawer-management',
      title: '💰 Drawer Management',
      description: 'FINANCIAL NEURAL GRID - Monitor all cashier drawers',
      icon: '💰',
      screen: 'DrawerManagement',
      color: '#10b981',
      section: 'sales'
    },
    // Analytics & Reports Section

    // Inventory Management Section

    {
      id: 'stock-valuation',
      title: '💎 Stock Valuation',
      description: 'Calculate inventory value',
      icon: '💎',
      screen: 'StockValuation',
      color: '#22c55e',
      section: 'inventory'
    },
    {
      id: 'restock-manager',
      title: '📦 Restock Manager',
      description: 'Manage negative stock transitions',
      icon: '📦',
      screen: 'RestockManager',
      color: '#f59e0b',
      section: 'inventory'
    },
    {
      id: 'stock-transfer',
      title: '🔄 Stock Transfer',
      description: 'Transfer & convert stock between products',
      icon: '🔄',
      screen: 'StockTransfer',
      color: '#8b5cf6',
      section: 'inventory'
    },
    {
      id: 'stock-transfer-history',
      title: '📊 Transfer History',
      description: 'View financial impact & analysis',
      icon: '📊',
      screen: 'StockTransferHistory',
      color: '#06b6d4',
      section: 'inventory'
    },
    {
      id: 'product-split',
      title: '✂️ Product Split',
      description: 'Split products into smaller units',
      icon: '✂️',
      screen: 'ProductSplit',
      color: '#f97316',
      section: 'inventory'
    },
    {
      id: 'half-products',
      title: '🥪 Half Products',
      description: 'Quick access to split products (no barcodes)',
      icon: '🥪',
      screen: 'HalfProducts',
      color: '#fbbf24',
      section: 'inventory'
     },
    {
      id: 'inventory-audit',
      title: '📋 Inventory Audit',
      description: 'Track stock changes',
      icon: '📋',
      screen: 'InventoryAuditTrail',
      color: '#3b82f6',
      section: 'inventory'
    },
    {
      id: 'product-management',
      title: '📦 Product Management',
      description: 'Manage products & categories',
      icon: '📦',
      screen: 'ProductManagement',
      color: '#ef4444',
      section: 'inventory'
    },
    {
      id: 'inventory-receiving',
      title: '📥 Inventory Receiving',
      description: 'Receive & process inventory',
      icon: '📥',
      screen: 'InventoryReceiving',
      color: '#84cc16',
      section: 'inventory'
    },
    // Customer Management Section

    // Business Tools Section
    {
      id: 'low-stock-alerts',
      title: '⚠️ Low Stock Alerts',
      description: 'Monitor critical levels',
      icon: '⚠️',
      screen: 'LowStockAlerts',
      color: '#ef4444',
      section: 'business'
    },
    {
      id: 'profit-analysis',
      title: '📊 Profit Analysis',
      description: 'Revenue & margin reports',
      icon: '📊',
      screen: 'ProfitAnalysis',
      color: '#8b5cf6',
      section: 'business'
    },
    {
      id: 'supplier-management',
      title: '🏢 Supplier Management',
      description: 'Manage vendor relationships',
      icon: '🏢',
      screen: 'SupplierManagement',
      color: '#f59e0b',
      section: 'business'
    },
    {
      id: 'stock-movements',
      title: '📦 Stock Movements',
      description: 'Track inventory flow',
      icon: '📦',
      screen: 'StockMovements',
      color: '#06b6d4',
      section: 'business'
    },
    {
      id: 'price-comparison',
      title: '💲 Price Comparison',
      description: 'Compare supplier prices',
      icon: '💲',
      screen: 'PriceComparison',
      color: '#84cc16',
      section: 'business'
    },
    {
      id: 'demand-forecasting',
      title: '🔮 Demand Forecasting',
      description: 'Predict future demand',
      icon: '🔮',
      screen: 'DemandForecasting',
      color: '#ec4899',
      section: 'business'
    },
    {
      id: 'settings',
      title: '⚙️ Settings',
      description: 'App configuration & preferences',
      icon: '⚙️',
      screen: 'Settings',
      color: '#6b7280',
      section: 'business'
    },
  ];

  const handleFeaturePress = (feature) => {
    onClose(); // Close sidebar first
    
    // Navigate to the feature screen
    switch (feature.screen) {
      // Shop Management screens
      case 'StartOfDay':
        navigation.navigate('StartOfDay');
        break;
      case 'OwnerDashboard':
        navigation.navigate('OwnerDashboard');
        break;
      case 'StaffManagement':
        navigation.navigate('Staff');
        break;
      case 'OrderConfirmation':
        navigation.navigate('Confirmations');
        break;
        
      // Sales Command Center screens
      case 'SalesDashboard':
        navigation.navigate('SalesDashboard');
        break;
      case 'SalesLedger':
        navigation.navigate('SalesLedger');
        break;
      case 'SalesAuditTrail':
        navigation.navigate('SalesAuditTrail');
        break;

      case 'EODReconciliation':
        navigation.navigate('EODReconciliation');
        break;
      case 'WasteScreen':
        navigation.navigate('Waste');
        break;
      case 'DrawerManagement':
        navigation.navigate('Drawers');
        break;
      

      

      
      // Inventory Management screens

      case 'StockValuation':
        navigation.navigate('StockValuation');
        break;
      case 'RestockManager':
        navigation.navigate('RestockManager');
        break;
      case 'StockTransfer':
        navigation.navigate('StockTransfer');
        break;
      case 'StockTransferHistory':
        navigation.navigate('StockTransferHistory');
        break;
      case 'ProductSplit':
        navigation.navigate('ProductSplit');
        break;
      case 'HalfProducts':
        navigation.navigate('HalfProducts');
        break;
      case 'InventoryAuditTrail':
        navigation.navigate('InventoryAuditTrail');
        break;
      case 'ProductManagement':
        navigation.navigate('Products');
        break;
      case 'InventoryReceiving':
        navigation.navigate('Receiving');
        break;
        
      // Business Tools screens
      case 'LowStockAlerts':
        navigation.navigate('LowStockAlerts');
        break;
      case 'ProfitAnalysis':
        navigation.navigate('ProfitAnalysis');
        break;
      case 'SupplierManagement':
        navigation.navigate('SupplierManagement');
        break;
      case 'StockMovements':
        navigation.navigate('StockMovements');
        break;
      case 'PriceComparison':
        navigation.navigate('PriceComparison');
        break;
      case 'DemandForecasting':
        navigation.navigate('DemandForecasting');
        break;
      case 'Settings':
        navigation.navigate('Settings');
        break;
      
      default:
        // For other features, show a placeholder message
        console.log(`🚀 Feature "${feature.title}" pressed - Coming soon!`);
        break;
    }
  };

  const renderFeatureItem = (feature) => (
    <TouchableOpacity
      key={feature.id}
      style={styles.featureItem}
      onPress={() => handleFeaturePress(feature)}
      activeOpacity={0.8}
    >
      <View style={[styles.featureIcon, { backgroundColor: feature.color }]}>
        <Text style={styles.featureIconText}>{feature.icon}</Text>
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{feature.title}</Text>
        <Text style={styles.featureDescription}>{feature.description}</Text>
      </View>
      <Text style={styles.featureArrow}>→</Text>
    </TouchableOpacity>
  );

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Sidebar */}
      <Animated.View
        style={[
          styles.sidebar,
          {
            transform: [{ translateX: sidebarX }],
            width: SIDEBAR_WIDTH,
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Sidebar Header */}
        <View style={styles.sidebarHeader}>
          <View style={styles.sidebarTitleContainer}>
            <Text style={styles.sidebarTitle}>🚀 Features</Text>
            <Text style={styles.sidebarSubtitle}>Quick Access Tools</Text>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Features List */}
        <ScrollView style={styles.featuresList} showsVerticalScrollIndicator={false}>
          {/* Shop Management Section */}
          <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>🏢 Shop Management</Text>
            {features.filter(f => f.section === 'shop-management').map(renderFeatureItem)}
          </View>

          {/* Sales Command Center Section */}
          <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>💰 Sales Command Center</Text>
            {features.filter(f => f.section === 'sales').map(renderFeatureItem)}
          </View>



          {/* Inventory Management Section */}
          <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>📦 Inventory Management</Text>
            {features.filter(f => f.section === 'inventory').map(renderFeatureItem)}
          </View>



          {/* Business Tools Section */}
          <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>🏢 Business Tools</Text>
            {features.filter(f => f.section === 'business').map(renderFeatureItem)}
          </View>
        </ScrollView>

        {/* Sidebar Footer */}
        <View style={styles.sidebarFooter}>
          <Text style={styles.footerText}>💡 Pro Tip</Text>
          <Text style={styles.footerDescription}>
            Swipe from the left edge to quickly access features on mobile devices.
          </Text>
        </View>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#1a1a1a',
    borderRightWidth: 1,
    borderRightColor: '#333',
    zIndex: 1001,
    ...Platform.select({
      web: {
        boxShadow: '4px 0 20px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sidebarTitleContainer: {
    flex: 1,
  },
  sidebarTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sidebarSubtitle: {
    color: '#999',
    fontSize: 12,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#999',
    fontSize: 16,
    fontWeight: 'bold',
  },
  featuresList: {
    flex: 1,
    padding: 16,
  },
  featuresSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    marginLeft: 4,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureIconText: {
    fontSize: 18,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDescription: {
    color: '#999',
    fontSize: 12,
  },
  featureArrow: {
    color: '#666',
    fontSize: 16,
    marginLeft: 8,
  },
  sidebarFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: '#0f0f0f',
  },
  footerText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  footerDescription: {
    color: '#999',
    fontSize: 11,
    lineHeight: 16,
  },
});

export default FeatureSidebar;