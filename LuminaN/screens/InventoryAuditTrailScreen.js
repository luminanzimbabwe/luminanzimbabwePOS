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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { shopAPI } from '../services/api';
import { shopStorage } from '../services/storage';

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

  // Product-specific filter
  const [selectedProduct, setSelectedProduct] = useState(null);

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
            <Text style={styles.receiptInfoLabel}>Invoice:</Text>
            <Text style={styles.receiptInfoValue}>{entry.supplier_invoice}</Text>
          </View>
        )}

        {entry.performed_by && (
          <View style={styles.receiptInfo}>
            <Text style={styles.receiptInfoLabel}>Received By:</Text>
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
          <Text style={styles.performedBy}>By: {entry.performed_by}</Text>
        )}

        {entry.notes && (
          <Text style={styles.notes}>Note: {entry.notes}</Text>
        )}

        {entry.supplier_invoice && (
          <Text style={styles.supplierInfo}>Invoice: {entry.supplier_invoice}</Text>
        )}

        {entry.cost_price && (
          <Text style={styles.costPrice}>Cost: ${entry.cost_price}</Text>
        )}

        {entry.reference_number && (
          <Text style={styles.reference}>Ref: {entry.reference_number}</Text>
        )}
      </View>
    </View>
  );

  const renderFilters = () => (
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
      <Text style={styles.headerTitle}>📋 Inventory Audit Trail</Text>
      <TouchableOpacity onPress={() => setRefreshing(true) || loadAuditTrail()}>
        <Text style={styles.refreshButton}>🔄</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStats = () => (
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
      <TouchableOpacity style={styles.actionButton} onPress={handleReceiveInventory}>
        <Text style={styles.actionButtonIcon}>📦</Text>
        <Text style={styles.actionButtonText}>Receive</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionButton} onPress={handleStockAdjustment}>
        <Text style={styles.actionButtonIcon}>⚖️</Text>
        <Text style={styles.actionButtonText}>Adjust</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionButton} onPress={handleStockTake}>
        <Text style={styles.actionButtonIcon}>📊</Text>
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
    <View style={styles.container}>
      {renderHeader()}
      {renderFilters()}
      {renderStats()}
      {renderActionButtons()}

      <FlatList
        data={filteredTrail}
        renderItem={renderAuditEntry}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>📋 No Audit Trail Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery || selectedReasonCode !== 'All' || dateFilter !== 'All'
                ? 'Try adjusting your search or filter criteria.'
                : 'No inventory changes have been recorded yet.'
              }
            </Text>
          </View>
        }
      />
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
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    justifyContent: 'space-around',
  },
  actionButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#444',
  },
  // Receipt-specific styles
  receiptCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    margin: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 2,
    borderColor: '#dee2e6',
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    letterSpacing: 1,
  },
  receiptHeaderRight: {
    alignItems: 'flex-end',
  },
  receiptDate: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 2,
  },
  receiptId: {
    fontSize: 10,
    color: '#6c757d',
    fontWeight: '600',
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#dee2e6',
    marginVertical: 8,
  },
  receiptBody: {
    marginVertical: 4,
  },
  receiptItem: {
    marginBottom: 8,
  },
  receiptProductName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  receiptItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptQty: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500',
  },
  receiptUnitPrice: {
    fontSize: 12,
    color: '#6c757d',
  },
  receiptTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#28a745',
  },
  receiptInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  receiptInfoLabel: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  receiptInfoValue: {
    fontSize: 12,
    color: '#2c3e50',
    fontWeight: '600',
  },
  receiptFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  receiptStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#28a745',
    letterSpacing: 0.5,
  },
  receiptTimestamp: {
    fontSize: 10,
    color: '#6c757d',
  },
  receiptNotes: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f1f3f4',
    borderRadius: 4,
  },
  receiptNotesLabel: {
    fontSize: 11,
    color: '#6c757d',
    marginBottom: 2,
  },
  receiptNotesText: {
    fontSize: 12,
    color: '#2c3e50',
    fontStyle: 'italic',
  },
  performedBy: {
    color: '#999',
    fontSize: 12,
    marginBottom: 2,
  },
  notes: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 2,
    fontStyle: 'italic',
  },
  supplierInfo: {
    color: '#6366f1',
    fontSize: 12,
  },
  costPrice: {
    color: '#999',
    fontSize: 12,
    marginBottom: 2,
  },
  reference: {
    color: '#999',
    fontSize: 12,
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
});

export default InventoryAuditTrailScreen;
