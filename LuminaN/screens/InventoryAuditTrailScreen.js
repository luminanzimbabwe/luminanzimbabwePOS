import React, { useEffect, useState } from 'react';
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
  RefreshControl,
  FlatList,
  Platform
} 
from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { shopAPI } from '../services/api';
import { shopStorage } from '../services/storage';
import presenceService from '../services/presenceService';

const InventoryAuditTrailScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [auditTrail, setAuditTrail] = useState([]);
  const [filteredTrail, setFilteredTrail] = useState([]);
  const [shopCredentials, setShopCredentials] = useState(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReasonCode, setSelectedReasonCode] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState(null);

  // Presence tracking state
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' or 'presence'
  const [presenceLogs, setPresenceLogs] = useState([]);
  const [filteredPresenceLogs, setFilteredPresenceLogs] = useState([]);
  const [presenceSearchQuery, setPresenceSearchQuery] = useState('');
  const [presenceDateFilter, setPresenceDateFilter] = useState('All');

  useEffect(() => {
    loadShopCredentials();
  }, []);

  useEffect(() => {
    if (shopCredentials) {
      loadAuditTrail();
    }
  }, [shopCredentials]);

  useEffect(() => {
    filterAuditTrail();
  }, [auditTrail, searchQuery, selectedReasonCode, dateFilter, selectedProduct]);

  // Presence tracking effects
  useEffect(() => {
    if (activeTab === 'presence') {
      loadPresenceLogs();
    }
  }, [activeTab]);

  useEffect(() => {
    filterPresenceLogs();
  }, [presenceLogs, presenceSearchQuery, presenceDateFilter]);

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

  const loadAuditTrail = async () => {
    try {
      const authData = {
        email: shopCredentials.email,
        password: shopCredentials.shop_owner_master_password,
      };

      let endpoint = '/audit-trail/';
      if (selectedProduct) {
        endpoint = `/products/${selectedProduct.id}/audit-history/`;
      }

      const response = await shopAPI.getCustomEndpoint(endpoint, authData);
      console.log('📋 Audit trail loaded:', response.data);
      
      setAuditTrail(response.data || []);
      
    } catch (error) {
      console.error('❌ Error loading audit trail:', error);
      Alert.alert('Error', 'Failed to load audit trail.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterAuditTrail = () => {
    let filtered = [...auditTrail];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(entry =>
        entry.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.reason_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.performed_by?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Reason code filter
    if (selectedReasonCode !== 'All') {
      filtered = filtered.filter(entry => entry.reason_code === selectedReasonCode);
    }

    // Date filter
    if (dateFilter !== 'All') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(entry => 
        new Date(entry.timestamp) >= filterDate
      );
    }

    setFilteredTrail(filtered);
  };

  // Presence tracking functions
  const loadPresenceLogs = () => {
    try {
      const logs = presenceService.getPresenceLogs();
      setPresenceLogs(logs);
    } catch (error) {
      console.error('Error loading presence logs:', error);
    }
  };

  const filterPresenceLogs = () => {
    let filtered = [...presenceLogs];

    // Search filter
    if (presenceSearchQuery.trim()) {
      filtered = filtered.filter(entry =>
        entry.user_name?.toLowerCase().includes(presenceSearchQuery.toLowerCase()) ||
        entry.user_type?.toLowerCase().includes(presenceSearchQuery.toLowerCase()) ||
        entry.status?.toLowerCase().includes(presenceSearchQuery.toLowerCase()) ||
        entry.reason?.toLowerCase().includes(presenceSearchQuery.toLowerCase())
      );
    }

    // Date filter
    if (presenceDateFilter !== 'All') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (presenceDateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(entry => 
        new Date(entry.timestamp) >= filterDate
      );
    }

    setFilteredPresenceLogs(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAuditTrail();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const getActionIcon = (reasonCode) => {
    switch (reasonCode?.toLowerCase()) {
      case 'receipt':
        return '📦';
      case 'sale':
        return '💰';
      case 'return':
        return '↩️';
      case 'adjustment':
        return '⚖️';
      case 'damage':
        return '💥';
      case 'theft':
        return '🕵️';
      case 'transfer':
        return '🚚';
      case 'stocktake':
        return '📊';
      case 'supplier_return':
        return '📤';
      case 'expired':
        return '⏰';
      default:
        return '📝';
    }
  };

  const getActionColor = (action) => {
    switch (action?.toLowerCase()) {
      case 'stock_received':
        return '#10b981';
      case 'stock_adjusted':
        return '#f59e0b';
      case 'product_created':
        return '#3b82f6';
      case 'product_updated':
        return '#8b5cf6';
      case 'product_deleted':
        return '#dc2626';
      case 'stock_count':
        return '#6366f1';
      default:
        return '#6b7280';
    }
  };

  const getReasonCodeColor = (reasonCode) => {
    switch (reasonCode?.toLowerCase()) {
      case 'purchase':
        return '#10b981';
      case 'adjustment':
        return '#f59e0b';
      case 'damage':
        return '#dc2626';
      case 'theft':
        return '#dc2626';
      case 'count_variance':
        return '#6366f1';
      case 'return':
        return '#8b5cf6';
      default:
        return '#6b7280';
    }
  };

  const getUniqueReasonCodes = () => {
    const codes = [...new Set(auditTrail.map(entry => entry.reason_code).filter(Boolean))];
    return ['All', ...codes];
  };

  // Presence tracking functions
  const getPresenceStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'online':
        return '🟢';
      case 'offline':
        return '🔴';
      case 'inactive':
        return '🟡';
      default:
        return '⚪';
    }
  };

  const getPresenceStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'online':
        return '#10b981';
      case 'offline':
        return '#ef4444';
      case 'inactive':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getPresenceReasonIcon = (reason) => {
    switch (reason?.toLowerCase()) {
      case 'manual_logout':
        return '🚪';
      case 'window_blur':
        return '⬜';
      case 'page_hidden':
        return '⬇️';
      case 'inactivity_timeout':
        return '😴';
      case 'window_focused':
        return '⬆️';
      case 'page_unload':
        return '🔄';
      default:
        return '⚡';
    }
  };

  const renderPresenceEntry = ({ item: entry }) => (
    <View style={styles.presenceEntryCard}>
      <View style={styles.presenceEntryHeader}>
        <View style={styles.presenceEntryLeft}>
          <Text style={styles.presenceStatusIcon}>
            {getPresenceStatusIcon(entry.status)}
          </Text>
          <View style={styles.presenceEntryInfo}>
            <Text style={styles.presenceUserName}>{entry.user_name || 'Unknown User'}</Text>
            <Text style={styles.presenceUserType}>
              {entry.user_type?.toUpperCase() || 'USER'}
            </Text>
          </View>
        </View>
        <View style={styles.presenceEntryRight}>
          <Text style={styles.presenceTimestamp}>
            {formatDate(entry.timestamp)}
          </Text>
          <View style={[
            styles.presenceStatusBadge,
            { backgroundColor: getPresenceStatusColor(entry.status) }
          ]}>
            <Text style={styles.presenceStatusText}>{entry.status?.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.presenceDetailsContainer}>
        <View style={styles.presenceReason}>
          <Text style={styles.presenceReasonIcon}>
            {getPresenceReasonIcon(entry.reason)}
          </Text>
          <Text style={styles.presenceReasonText}>
            Reason: {entry.reason?.replace('_', ' ') || 'Unknown'}
          </Text>
        </View>

        {entry.ip_address && (
          <Text style={styles.presenceInfo}>IP: {entry.ip_address}</Text>
        )}

        {entry.user_agent && (
          <Text style={styles.presenceInfo}>
            Device: {entry.user_agent.substring(0, 50)}...
          </Text>
        )}
      </View>
    </View>
  );

  const renderAuditEntry = ({ item: entry }) => {
    if (entry.reason_code?.toLowerCase() === 'receipt') {
      return renderReceiptEntry(entry);
    }
    return renderStandardEntry(entry);
  };

  const renderReceiptEntry = (entry) => (
    <View style={styles.receiptCard}>
      <View style={styles.receiptHeader}>
        <Text style={styles.receiptTitle}>🧾 GOODS RECEIPT</Text>
        <View style={styles.receiptHeaderRight}>
          <Text style={styles.receiptDate}>{formatDate(entry.timestamp)}</Text>
          <Text style={styles.receiptId}>REF: {entry.reference_number || 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.receiptDivider} />

      <View style={styles.receiptBody}>
        <View style={styles.receiptItem}>
          <Text style={styles.receiptProductName}>{entry.product_name || 'Unknown Product'}</Text>
          <View style={styles.receiptItemDetails}>
            <Text style={styles.receiptQty}>Qty: {Math.abs(entry.quantity_change || 0)}</Text>
            <Text style={styles.receiptUnitPrice}>@ ${entry.cost_price || '0.00'}</Text>
            <Text style={styles.receiptTotal}>{formatCurrency((entry.cost_price || 0) * Math.abs(entry.quantity_change || 0))}</Text>
          </View>
        </View>

        {entry.supplier_invoice && (
          <View style={styles.receiptInfo}>
            <Text style={styles.receiptInfoLabel}>📋 Invoice:</Text>
            <Text style={styles.receiptInfoValue}>{entry.supplier_invoice}</Text>
          </View>
        )}

        {entry.performed_by && (
          <View style={styles.receiptInfo}>
            <Text style={styles.receiptInfoLabel}>👤 Received By:</Text>
            <Text style={styles.receiptInfoValue}>{entry.performed_by}</Text>
          </View>
        )}
      </View>

      <View style={styles.receiptDivider} />

      <View style={styles.receiptFooter}>
        <Text style={styles.receiptStatus}>✓ STOCK RECEIVED</Text>
        <Text style={styles.receiptTimestamp}>{new Date(entry.timestamp).toLocaleTimeString()}</Text>
      </View>

      {entry.notes && (
        <View style={styles.receiptNotes}>
          <Text style={styles.receiptNotesLabel}>📝 Notes:</Text>
          <Text style={styles.receiptNotesText}>{entry.notes}</Text>
        </View>
      )}
    </View>
  );

  const renderStandardEntry = (entry) => (
    <View style={styles.auditEntryCard}>
      <View style={styles.auditEntryHeader}>
        <View style={styles.auditEntryLeft}>
          <Text style={styles.actionIcon}>{getActionIcon(entry.reason_code)}</Text>
          <View style={styles.auditEntryInfo}>
            <Text style={styles.productName}>{entry.product_name || 'Unknown Product'}</Text>
            <Text style={styles.actionText}>{entry.reason_code?.replace('_', ' ').toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.auditEntryRight}>
          <Text style={styles.timestamp}>{formatDate(entry.timestamp)}</Text>
          {entry.reason_code && (
            <View style={[
              styles.reasonCodeBadge,
              { backgroundColor: getReasonCodeColor(entry.reason_code) }
            ]}>
              <Text style={styles.reasonCodeText}>{entry.reason_code}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.detailsContainer}>
        {entry.quantity_change && (
          <View style={styles.quantityChange}>
            <Text style={styles.quantityChangeText}>
              Quantity: {entry.quantity_change > 0 ? '+' : ''}{entry.quantity_change}
            </Text>
            {entry.new_quantity !== undefined && (
              <Text style={styles.newQuantityText}>
                → New: {entry.new_quantity}
              </Text>
            )}
          </View>
        )}

        {entry.price_change && (
          <View style={styles.priceChange}>
            <Text style={styles.priceChangeText}>
              Price: {formatCurrency(entry.price_change)}
            </Text>
            {entry.new_price !== undefined && (
              <Text style={styles.newPriceText}>
                → New: {formatCurrency(entry.new_price)}
              </Text>
            )}
          </View>
        )}

        {entry.performed_by && (
          <Text style={styles.performedBy}>👤 By: {entry.performed_by}</Text>
        )}

        {entry.notes && (
          <Text style={styles.notes}>💬 Note: {entry.notes}</Text>
        )}

        {entry.supplier_invoice && (
          <Text style={styles.supplierInfo}>📋 Invoice: {entry.supplier_invoice}</Text>
        )}

        {entry.cost_price && (
          <Text style={styles.costPrice}>💰 Cost: ${entry.cost_price}</Text>
        )}

        {entry.reference_number && (
          <Text style={styles.reference}>🔗 Ref: {entry.reference_number}</Text>
        )}
      </View>
    </View>
  );

  const renderFilters = () => {
    if (activeTab === 'presence') {
      return renderPresenceFilters();
    }
    return renderInventoryFilters();
  };

  const renderPresenceFilters = () => (
    <View style={styles.filtersContainer}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users, status, reasons..."
          value={presenceSearchQuery}
          onChangeText={setPresenceSearchQuery}
          placeholderTextColor="#999"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {/* Date Filter */}
        <TouchableOpacity
          style={[
            styles.filterButton,
            presenceDateFilter !== 'All' && styles.filterButtonActive
          ]}
          onPress={() => {
            const filters = ['All', 'today', 'week', 'month'];
            const currentIndex = filters.indexOf(presenceDateFilter);
            const nextIndex = (currentIndex + 1) % filters.length;
            setPresenceDateFilter(filters[nextIndex]);
          }}
        >
          <Text style={[
            styles.filterButtonText,
            presenceDateFilter !== 'All' && styles.filterButtonTextActive
          ]}>
            📅 {presenceDateFilter === 'All' ? 'All Time' : presenceDateFilter.charAt(0).toUpperCase() + presenceDateFilter.slice(1)}
          </Text>
        </TouchableOpacity>

        {/* Refresh Presence Logs */}
        <TouchableOpacity
          style={styles.filterButton}
          onPress={loadPresenceLogs}
        >
          <Text style={styles.filterButtonText}>🔄 Refresh</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Active Filters */}
      {(presenceSearchQuery || presenceDateFilter !== 'All') && (
        <View style={styles.activeFilters}>
          {presenceSearchQuery && (
            <View style={styles.activeFilter}>
              <Text style={styles.activeFilterText}>Search: "{presenceSearchQuery}"</Text>
              <TouchableOpacity onPress={() => setPresenceSearchQuery('')}>
                <Text style={styles.removeFilterText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          {presenceDateFilter !== 'All' && (
            <View style={styles.activeFilter}>
              <Text style={styles.activeFilterText}>Date: {presenceDateFilter}</Text>
              <TouchableOpacity onPress={() => setPresenceDateFilter('All')}>
                <Text style={styles.removeFilterText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );

  const renderInventoryFilters = () => (
    <View style={styles.filtersContainer}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products, actions, notes..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {/* Date Filter */}
        <TouchableOpacity
          style={[
            styles.filterButton,
            dateFilter !== 'All' && styles.filterButtonActive
          ]}
          onPress={() => {
            const filters = ['All', 'today', 'week', 'month'];
            const currentIndex = filters.indexOf(dateFilter);
            const nextIndex = (currentIndex + 1) % filters.length;
            setDateFilter(filters[nextIndex]);
          }}
        >
          <Text style={[
            styles.filterButtonText,
            dateFilter !== 'All' && styles.filterButtonTextActive
          ]}>
            📅 {dateFilter === 'All' ? 'All Time' : dateFilter.charAt(0).toUpperCase() + dateFilter.slice(1)}
          </Text>
        </TouchableOpacity>

        {/* Reason Code Filter */}
        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedReasonCode !== 'All' && styles.filterButtonActive
          ]}
          onPress={() => {
            const codes = getUniqueReasonCodes();
            const currentIndex = codes.indexOf(selectedReasonCode);
            const nextIndex = (currentIndex + 1) % codes.length;
            setSelectedReasonCode(codes[nextIndex]);
          }}
        >
          <Text style={[
            styles.filterButtonText,
            selectedReasonCode !== 'All' && styles.filterButtonTextActive
          ]}>
            🏷️ {selectedReasonCode}
          </Text>
        </TouchableOpacity>

        {/* Toggle Filters */}
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={styles.filterButtonText}>
            {showFilters ? '👆 Hide' : '👇 More'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Advanced Filters */}
      {showFilters && (
        <View style={styles.advancedFilters}>
          <Text style={styles.advancedFiltersTitle}>Filter Results:</Text>
          <View style={styles.activeFilters}>
            {searchQuery && (
              <View style={styles.activeFilter}>
                <Text style={styles.activeFilterText}>Search: "{searchQuery}"</Text>
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Text style={styles.removeFilterText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            {dateFilter !== 'All' && (
              <View style={styles.activeFilter}>
                <Text style={styles.activeFilterText}>Date: {dateFilter}</Text>
                <TouchableOpacity onPress={() => setDateFilter('All')}>
                  <Text style={styles.removeFilterText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            {selectedReasonCode !== 'All' && (
              <View style={styles.activeFilter}>
                <Text style={styles.activeFilterText}>Reason: {selectedReasonCode}</Text>
                <TouchableOpacity onPress={() => setSelectedReasonCode('All')}>
                  <Text style={styles.removeFilterText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.backButton}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>
        {activeTab === 'inventory' ? '📋 Inventory Audit Trail' : '🟢 User Presence Logs'}
      </Text>
      <TouchableOpacity onPress={() => {
        if (activeTab === 'inventory') {
          setRefreshing(true);
          loadAuditTrail();
        } else {
          loadPresenceLogs();
        }
      }}>
        <Text style={styles.refreshButton}>🔄</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTabNavigation = () => (
    <View style={styles.tabNavigation}>
      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === 'inventory' && styles.tabButtonActive
        ]}
        onPress={() => setActiveTab('inventory')}
      >
        <Text style={[
          styles.tabButtonText,
          activeTab === 'inventory' && styles.tabButtonTextActive
        ]}>
          📦 Inventory
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === 'presence' && styles.tabButtonActive
        ]}
        onPress={() => setActiveTab('presence')}
      >
        <Text style={[
          styles.tabButtonText,
          activeTab === 'presence' && styles.tabButtonTextActive
        ]}>
          🟢 Presence
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderStats = () => {
    if (activeTab === 'presence') {
      return renderPresenceStats();
    }
    return renderInventoryStats();
  };

  const renderPresenceStats = () => {
    const onlineUsers = filteredPresenceLogs.filter(log => log.status === 'online').length;
    const offlineUsers = filteredPresenceLogs.filter(log => log.status === 'offline').length;
    const inactiveUsers = filteredPresenceLogs.filter(log => log.status === 'inactive').length;
    const uniqueUsers = [...new Set(filteredPresenceLogs.map(log => log.user_name))].length;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🟢</Text>
          <Text style={styles.statValue}>{onlineUsers}</Text>
          <Text style={styles.statLabel}>Currently Online</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🔴</Text>
          <Text style={styles.statValue}>{offlineUsers}</Text>
          <Text style={styles.statLabel}>Offline</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>👥</Text>
          <Text style={styles.statValue}>{uniqueUsers}</Text>
          <Text style={styles.statLabel}>Unique Users</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📊</Text>
          <Text style={styles.statValue}>{filteredPresenceLogs.length}</Text>
          <Text style={styles.statLabel}>Total Events</Text>
        </View>
      </View>
    );
  };

  const renderInventoryStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Text style={styles.statIcon}>📊</Text>
        <Text style={styles.statValue}>{filteredTrail.length}</Text>
        <Text style={styles.statLabel}>Total Entries</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statIcon}>📦</Text>
        <Text style={styles.statValue}>
          {filteredTrail.filter(e => e.reason_code === 'RECEIPT').length}
        </Text>
        <Text style={styles.statLabel}>Stock Received</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statIcon}>💰</Text>
        <Text style={styles.statValue}>
          {filteredTrail.filter(e => e.reason_code === 'SALE').length}
        </Text>
        <Text style={styles.statLabel}>Sales</Text>
      </View>
    </View>
  );

  const renderActionButtons = () => (
    <View style={styles.actionButtonsContainer}>
      <TouchableOpacity 
        style={[styles.actionButton, { borderColor: '#10b981', backgroundColor: '#065f46' }]} 
        onPress={handleReceiveInventory}
      >
        <Text style={[styles.actionButtonIcon, { color: '#10b981' }]}>📦</Text>
        <Text style={styles.actionButtonText}>Receive Stock</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.actionButton, { borderColor: '#f59e0b', backgroundColor: '#78350f' }]} 
        onPress={handleStockAdjustment}
      >
        <Text style={[styles.actionButtonIcon, { color: '#f59e0b' }]}>⚖️</Text>
        <Text style={styles.actionButtonText}>Adjust Stock</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.actionButton, { borderColor: '#3b82f6', backgroundColor: '#1e3a8a' }]} 
        onPress={handleStockTake}
      >
        <Text style={[styles.actionButtonIcon, { color: '#3b82f6' }]}>📊</Text>
        <Text style={styles.actionButtonText}>Stock Take</Text>
      </TouchableOpacity>
    </View>
  );

  const handleReceiveInventory = () => {
    navigation.navigate('InventoryReceiving');
  };

  const handleStockAdjustment = () => {
    Alert.alert(
      '⚖️ Stock Adjustment',
      'This would open a form to adjust inventory levels for damaged, lost, or counted items.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Proceed', 
          onPress: () => {
            console.log('📋 Navigate to stock adjustment screen');
            Alert.alert('Feature Coming Soon', 'Stock adjustment functionality will be available in the next update.');
          }
        }
      ]
    );
  };

  const handleStockTake = () => {
    Alert.alert(
      '📊 Stock Take',
      'This would start a physical inventory count to verify current stock levels.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start', 
          onPress: () => {
            console.log('🔍 Start stock take process');
            Alert.alert('Feature Coming Soon', 'Stock take functionality will be available in the next update.');
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading audit trail...</Text>
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
      removeClippedSubviews={false}
      onScroll={(event) => {
        if (Platform.OS === 'web') {
          const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
          const isAtBottom = contentOffset.y >= (contentSize.height - layoutMeasurement.height - 10);
        }
      }}
    >
      {renderHeader()}
      {renderTabNavigation()}
      {renderFilters()}
      {renderStats()}
      {activeTab === 'inventory' && renderActionButtons()}

      {activeTab === 'inventory' ? (
        filteredTrail.length > 0 ? (
          filteredTrail.map((entry, index) => (
            <View key={entry.id?.toString() || index.toString()}>
              {renderAuditEntry({ item: entry, index })}
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>📦 No Inventory Records Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery || selectedReasonCode !== 'All' || dateFilter !== 'All'
                ? 'Try adjusting your search or filter criteria.'
                : 'No inventory changes have been recorded yet.'
              }
            </Text>
          </View>
        )
      ) : (
        filteredPresenceLogs.length > 0 ? (
          filteredPresenceLogs.map((entry, index) => (
            <View key={entry.timestamp + index.toString()}>
              {renderPresenceEntry({ item: entry, index })}
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>🟢 No Presence Records Found</Text>
            <Text style={styles.emptyText}>
              {presenceSearchQuery || presenceDateFilter !== 'All'
                ? 'Try adjusting your search or filter criteria.'
                : 'No user presence activity has been recorded yet.'
              }
            </Text>
          </View>
        )
      )}
      
      {/* Bottom padding for web scrolling */}
      <View style={{ 
        height: Platform.OS === 'web' ? 100 : 20,
        minHeight: Platform.OS === 'web' ? 100 : 0
      }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  backButton: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  refreshButton: {
    color: '#3b82f6',
    fontSize: 24,
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
  },
  contentScrollView: {
    flex: 1,
    height: '100vh',
    // Web-specific scroll behavior
    ...Platform.select({
      web: {
        overflow: 'auto',
        WebkitOverflowScrolling: 'auto',
        maxHeight: '100vh',
        height: 'calc(100vh - 120px)',
      }
    })
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'web' ? 100 : 40,
    ...Platform.select({
      web: {
        minHeight: '100vh',
        width: '100%',
        flexGrow: 1,
      },
    }),
  },
  filtersContainer: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  filterScroll: {
    marginBottom: 8,
    // Web-specific scroll behavior
    ...Platform.select({
      web: {
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollBehavior: 'smooth',
        WebkitOverflowScrolling: 'auto',
      }
    })
  },
  filterButton: {
    backgroundColor: '#2a2a2a',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#444',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    // Web-specific styles
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'all 0.2s ease',
      }
    })
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
  advancedFilters: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
  },
  advancedFiltersTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activeFilter: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
  },
  activeFilterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  removeFilterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
    color: '#3b82f6',
  },
  statValue: {
    color: '#3b82f6',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#ccc',
    fontSize: 12,
    textAlign: 'center',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#374151',
    minHeight: 80,
    justifyContent: 'center',
    // Web-specific styles
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'all 0.3s ease',
      }
    })
  },
  actionButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionButtonText: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  // Enhanced Standard Audit Entry Styles
  auditEntryCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    margin: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#333333',
  },
  auditEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#374151',
  },
  auditEntryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    fontSize: 28,
    marginRight: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#374151',
    textAlign: 'center',
    lineHeight: 40,
  },
  auditEntryInfo: {
    flex: 1,
  },
  productName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  actionText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  auditEntryRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  timestamp: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  reasonCodeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  reasonCodeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailsContainer: {
    gap: 12,
  },
  quantityChange: {
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  quantityChangeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  newQuantityText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '700',
  },
  priceChange: {
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  priceChangeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  newPriceText: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '700',
  },

  // Enhanced Receipt Card Styles - Modern Dark Theme
  receiptCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    margin: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#333333',
    position: 'relative',
    overflow: 'hidden',
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  receiptTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#3b82f6',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  receiptHeaderRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  receiptDate: {
    fontSize: 14,
    color: '#e5e7eb',
    fontWeight: '600',
    marginBottom: 2,
  },
  receiptId: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '700',
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  receiptDivider: {
    height: 2,
    backgroundColor: 'linear-gradient(90deg, transparent 0%, #3b82f6 50%, transparent 100%)',
    marginVertical: 16,
    borderRadius: 1,
  },
  receiptBody: {
    marginVertical: 8,
  },
  receiptItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#404040',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  receiptProductName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  receiptItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  receiptQty: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '700',
  },
  receiptUnitPrice: {
    fontSize: 14,
    color: '#e5e7eb',
    fontWeight: '600',
  },
  receiptTotal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10b981',
  },
  receiptInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  receiptInfoLabel: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '600',
  },
  receiptInfoValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '700',
  },
  receiptFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#404040',
  },
  receiptStatus: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10b981',
    letterSpacing: 1,
    textTransform: 'uppercase',
    backgroundColor: '#065f46',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  receiptTimestamp: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '600',
  },
  receiptNotes: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#374151',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  receiptNotesLabel: {
    fontSize: 12,
    color: '#e5e7eb',
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  receiptNotesText: {
    fontSize: 14,
    color: '#d1d5db',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  performedBy: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  notes: {
    color: '#d1d5db',
    fontSize: 14,
    marginBottom: 8,
    fontStyle: 'italic',
    lineHeight: 20,
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  supplierInfo: {
    color: '#8b5cf6',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: '#5b21b6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  costPrice: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '700',
    backgroundColor: '#065f46',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  reference: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    // Web-specific styles
    ...Platform.select({
      web: {
        minHeight: 300,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }
    })
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Tab Navigation Styles
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#3b82f6',
    backgroundColor: '#2a2a2a',
  },
  tabButtonText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#3b82f6',
  },

  // Presence Entry Styles
  presenceEntryCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    margin: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#404040',
  },
  presenceEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  presenceEntryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  presenceStatusIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  presenceEntryInfo: {
    flex: 1,
  },
  presenceUserName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  presenceUserType: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500',
  },
  presenceEntryRight: {
    alignItems: 'flex-end',
  },
  presenceTimestamp: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 4,
  },
  presenceStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  presenceStatusText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  presenceDetailsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#404040',
    paddingTop: 12,
  },
  presenceReason: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  presenceReasonIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  presenceReasonText: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '500',
  },
  presenceInfo: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 4,
  },
});

export default InventoryAuditTrailScreen;
