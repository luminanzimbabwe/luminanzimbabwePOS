import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { shopAPI } from '../services/api';
import { shopStorage } from '../services/storage';
import { ROUTES } from '../constants/navigation';

const StockTransferHistoryScreen = () => {
  const navigation = useNavigation();
  
  const [loading, setLoading] = useState(true);
  const [transfers, setTransfers] = useState([]);
  const [shopCredentials, setShopCredentials] = useState(null);

  useEffect(() => {
    loadShopCredentials();
  }, []);

  const loadShopCredentials = async () => {
    try {
      const credentials = await shopStorage.getCredentials();
      if (credentials) {
        setShopCredentials(credentials);
        loadTransferHistory();
      } else {
        navigation.replace(ROUTES.LOGIN);
      }
    } catch (error) {
      console.error('❌ Error loading credentials:', error);
      navigation.replace(ROUTES.LOGIN);
    }
  };

  const getAuthHeaders = async () => {
    const credentials = await shopStorage.getCredentials();
    if (!credentials) {
      throw new Error('Shop credentials not found. Please log in again.');
    }
    
    const isShopOwner = !credentials.cashier_info;
    const shopId = credentials.shop_info?.shop_id || credentials.shop_id;
    const cashierId = credentials.cashier_info?.id;
    
    const headers = {
      'X-Shop-ID': shopId
    };
    
    if (!isShopOwner && cashierId) {
      headers['X-Cashier-ID'] = cashierId;
    }
    
    return { headers, isShopOwner, credentials };
  };

  const loadTransferHistory = async () => {
    try {
      setLoading(true);
      const { headers } = await getAuthHeaders();
      
      const response = await shopAPI.getTransfers({
        headers: headers
      });
      
      if (response.data.success) {
        setTransfers(response.data.data || []);
      } else {
        Alert.alert('Error', 'Failed to load transfer history');
      }
    } catch (error) {
      console.error('❌ Error loading transfer history:', error);
      Alert.alert('Error', 'Failed to load transfer history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransferTypeIcon = (type) => {
    switch (type) {
      case 'SPLIT': return '✂️';
      case 'CONVERSION': return '🔄';
      case 'TRANSFER': return '📦';
      case 'ADJUSTMENT': return '⚖️';
      default: return '📋';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return '#10b981';
      case 'PENDING': return '#f59e0b';
      case 'CANCELLED': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getFinancialImpactColor = (value) => {
    if (value > 0) return '#ef4444'; // Red for cost increase
    if (value < 0) return '#10b981'; // Green for cost savings
    return '#6b7280'; // Gray for neutral
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.backButton}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>📊 Transfer History</Text>
      <TouchableOpacity onPress={loadTransferHistory}>
        <Text style={styles.refreshButton}>↻ Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTransferItem = ({ item }) => (
    <View style={styles.transferCard}>
      {/* Header */}
      <View style={styles.transferHeader}>
        <View style={styles.transferType}>
          <Text style={styles.transferTypeIcon}>
            {getTransferTypeIcon(item.transfer_type)}
          </Text>
          <Text style={styles.transferTypeText}>
            {item.transfer_type}
          </Text>
        </View>
        <View style={styles.statusContainer}>
          <Text style={[
            styles.statusText,
            { color: getStatusColor(item.status) }
          ]}>
            {item.status}
          </Text>
        </View>
      </View>

      {/* Transfer Details */}
      <View style={styles.transferDetails}>
        {/* From Product */}
        <View style={styles.productRow}>
          <Text style={styles.productLabel}>📤 From:</Text>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>
              {item.from_product_name || 'Unknown Product'}
            </Text>
            <Text style={styles.productQuantity}>
              Qty: {item.from_quantity} units
            </Text>
          </View>
        </View>

        {/* To Product */}
        <View style={styles.productRow}>
          <Text style={styles.productLabel}>📥 To:</Text>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>
              {item.to_product_name || 'Unknown Product'}
            </Text>
            <Text style={styles.productQuantity}>
              Qty: {item.to_quantity} units
            </Text>
          </View>
        </View>

        {/* Conversion Ratio */}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Conversion Ratio:</Text>
          <Text style={styles.detailValue}>
            {item.conversion_ratio || 1}:1
          </Text>
        </View>

        {/* Date */}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date:</Text>
          <Text style={styles.detailValue}>
            {formatDate(item.created_at)}
          </Text>
        </View>
      </View>

      {/* Financial Impact */}
      {item.status === 'COMPLETED' && (
        <View style={styles.financialSection}>
          <Text style={styles.sectionTitle}>💰 Financial Impact</Text>
          
          {/* Cost Impact */}
          <View style={styles.financialRow}>
            <Text style={styles.financialLabel}>Cost Impact:</Text>
            <Text style={[
              styles.financialValue,
              { color: getFinancialImpactColor(item.cost_impact) }
            ]}>
              {item.cost_impact > 0 ? '+' : ''}{formatCurrency(item.cost_impact)}
            </Text>
          </View>

          {/* Inventory Value Change */}
          <View style={styles.financialRow}>
            <Text style={styles.financialLabel}>Inventory Value Change:</Text>
            <Text style={[
              styles.financialValue,
              { color: getFinancialImpactColor(item.net_inventory_value_change) }
            ]}>
              {item.net_inventory_value_change > 0 ? '+' : ''}
              {formatCurrency(item.net_inventory_value_change)}
            </Text>
          </View>

          {/* Source Cost */}
          <View style={styles.financialRow}>
            <Text style={styles.financialLabel}>Source Cost:</Text>
            <Text style={styles.financialValue}>
              {formatCurrency(item.from_product_cost)}
            </Text>
          </View>

          {/* Destination Cost */}
          <View style={styles.financialRow}>
            <Text style={styles.financialLabel}>Destination Cost:</Text>
            <Text style={styles.financialValue}>
              {formatCurrency(item.to_product_cost)}
            </Text>
          </View>

          {/* Shrinkage */}
          {item.shrinkage_quantity > 0 && (
            <View style={styles.financialRow}>
              <Text style={styles.financialLabel}>Shrinkage:</Text>
              <Text style={styles.financialValue}>
                {item.shrinkage_quantity} units ({formatCurrency(item.shrinkage_value)})
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Business Analysis */}
      {item.business_analysis && (
        <View style={styles.analysisSection}>
          <Text style={styles.sectionTitle}>📈 Business Analysis</Text>
          
          <View style={styles.analysisRow}>
            <Text style={styles.analysisLabel}>Impact Type:</Text>
            <Text style={styles.analysisValue}>
              {item.business_analysis.cost_impact_type}
            </Text>
          </View>

          <View style={styles.analysisRow}>
            <Text style={styles.analysisLabel}>Impact Level:</Text>
            <Text style={styles.analysisValue}>
              {item.business_analysis.cost_impact_level}
            </Text>
          </View>

          <View style={styles.analysisRow}>
            <Text style={styles.analysisLabel}>Inventory Impact:</Text>
            <Text style={styles.analysisValue}>
              {item.business_analysis.inventory_impact}
            </Text>
          </View>

          {/* Recommendations */}
          {item.business_analysis.recommendations && 
           item.business_analysis.recommendations.length > 0 && (
            <View style={styles.recommendationsSection}>
              <Text style={styles.recommendationsTitle}>💡 Recommendations:</Text>
              {item.business_analysis.recommendations.map((rec, index) => (
                <Text key={index} style={styles.recommendationText}>
                  • {rec}
                </Text>
              ))}
            </View>
          )}

          {/* Critical Alerts */}
          {item.business_analysis.shrinkage_detected && (
            <View style={styles.shrinkageAlert}>
              <Text style={styles.shrinkageAlertText}>
                🚨 SHRINKAGE LOSS DETECTED: ${item.business_analysis.shrinkage_amount?.toFixed(2)}
              </Text>
              <Text style={styles.shrinkageAlertSubtext}>
                Expected yield was higher than actual production
              </Text>
            </View>
          )}
          
          {/* Zero Cost Alert */}
          {item.business_analysis.cost_impact_type.includes('ZERO COST') && (
            <View style={styles.zeroCostAlert}>
              <Text style={styles.zeroCostAlertText}>
                🚨 ZERO COST ALERT
              </Text>
              <Text style={styles.zeroCostAlertSubtext}>
                Products with $0.00 cost mask shrinkage losses!
              </Text>
            </View>
          )}
          
          {/* Review Flag */}
          {item.business_analysis.needs_review && (
            <View style={[
              styles.reviewFlag,
              { backgroundColor: item.business_analysis.alert_level === 'CRITICAL' ? '#fee2e2' : '#fef3c7' }
            ]}>
              <Text style={[
                styles.reviewFlagText,
                { color: item.business_analysis.alert_level === 'CRITICAL' ? '#dc2626' : '#d97706' }
              ]}>
                {item.business_analysis.alert_level === 'CRITICAL' ? '🚨 CRITICAL REVIEW REQUIRED' : '⚠️ REVIEW REQUIRED'}
              </Text>
              <Text style={styles.reviewFlagSubtext}>
                This transfer has significant business impact
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Reason */}
      {item.reason && (
        <View style={styles.reasonSection}>
          <Text style={styles.sectionTitle}>📝 Reason</Text>
          <Text style={styles.reasonText}>{item.reason}</Text>
        </View>
      )}
    </View>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading transfer history...</Text>
        </View>
      );
    }

    if (transfers.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>No stock transfers found</Text>
          <Text style={styles.emptySubtext}>
            Stock transfers will appear here with their financial impacts
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={transfers}
        renderItem={renderTransferItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={true}
        scrollEventThrottle={16}
        nestedScrollEnabled={Platform.OS === 'web'}
        removeClippedSubviews={false}
      />
    );
  };

  return (
    <ScrollView 
      style={[styles.container, Platform.OS === 'web' && styles.webContainer]}
      contentContainerStyle={styles.scrollContentContainer}
      showsVerticalScrollIndicator={true}
      scrollEventThrottle={16}
      nestedScrollEnabled={Platform.OS === 'web'}
      removeClippedSubviews={false}
    >
      {renderHeader()}
      {renderContent()}
      
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
  refreshButton: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#ccc',
    fontSize: 16,
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  transferCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  transferHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  transferType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transferTypeIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  transferTypeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#2a2a2a',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  transferDetails: {
    marginBottom: 16,
  },
  productRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  productLabel: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '600',
    width: 80,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  productQuantity: {
    color: '#ccc',
    fontSize: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    color: '#ccc',
    fontSize: 14,
  },
  detailValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  financialSection: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  financialLabel: {
    color: '#ccc',
    fontSize: 14,
  },
  financialValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  analysisSection: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  analysisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  analysisLabel: {
    color: '#ccc',
    fontSize: 14,
  },
  analysisValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  recommendationsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  recommendationsTitle: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  recommendationText: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 4,
  },
  reviewFlag: {
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  reviewFlagText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  reviewFlagSubtext: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
  shrinkageAlert: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  shrinkageAlertText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: 'bold',
  },
  shrinkageAlertSubtext: {
    color: '#7f1d1d',
    fontSize: 12,
    marginTop: 4,
  },
  zeroCostAlert: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  zeroCostAlertText: {
    color: '#d97706',
    fontSize: 14,
    fontWeight: 'bold',
  },
  zeroCostAlertSubtext: {
    color: '#92400e',
    fontSize: 12,
    marginTop: 4,
  },
  reasonSection: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
  },
  reasonText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
});

export default StockTransferHistoryScreen;