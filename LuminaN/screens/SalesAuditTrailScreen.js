import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { shopAPI } from '../services/api';
import { ROUTES } from '../constants/navigation';

const SalesAuditTrailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { saleId } = route.params || {};
  
  const [auditData, setAuditData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (saleId) {
      fetchAuditTrail();
    } else {
      setLoading(false);
    }
  }, [saleId]);

  const fetchAuditTrail = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Fetching audit trail for sale ID:', saleId);
      
      // Call real backend API for audit trail
      const response = await shopAPI.getAnonymousEndpoint(`/sales/${saleId}/audit/`);
      const auditData = response.data;
      
      console.log('✅ Real audit trail data fetched:', auditData);
      setAuditData(auditData);
      
    } catch (error) {
      console.error('❌ Error fetching audit trail:', error);
      
      // Set empty audit data instead of showing fake data
      setAuditData({
        sale_info: {
          id: saleId,
          receipt_number: `R${saleId.toString().padStart(3, '0')}`,
          status: 'unknown',
          created_at: new Date().toISOString(),
          total_amount: 0,
          currency: 'USD'
        },
        transaction_timeline: [],
        stock_movements: [],
        refund_history: [],
        discrepancy_flags: []
      });
      
      Alert.alert(
        'Connection Error', 
        'Unable to load audit trail data. Please check your connection and try again.',
        [{ text: 'Retry', onPress: () => fetchAuditTrail() }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAuditTrail();
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const renderEventIcon = (event) => {
    switch (event.event) {
      case 'SALE_CREATED':
        return <Icon name="add-circle" size={24} color="#3b82f6" />;
      case 'ITEM_SCANNED':
        return <Icon name="qr-code-scanner" size={24} color="#10b981" />;
      case 'PAYMENT_PROCESSED':
        return <Icon name="payment" size={24} color="#f59e0b" />;
      case 'SALE_COMPLETED':
        return <Icon name="check-circle" size={24} color="#10b981" />;
      default:
        return <Icon name="info" size={24} color="#64748b" />;
    }
  };

  const renderEvent = (event, index) => (
    <View key={index} style={styles.timelineItem}>
      <View style={styles.timelineIcon}>
        {renderEventIcon(event)}
      </View>
      <View style={styles.timelineContent}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventTitle}>{event.event.replace(/_/g, ' ')}</Text>
          <Text style={styles.eventTime}>{formatTimestamp(event.timestamp)}</Text>
        </View>
        <Text style={styles.eventDescription}>{event.description}</Text>
        
        {event.cashier && (
          <View style={styles.eventDetail}>
            <Icon name="person" size={14} color="#64748b" />
            <Text style={styles.eventDetailText}>Cashier: {event.cashier}</Text>
          </View>
        )}
        
        {event.product && (
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{event.product.name}</Text>
            <Text style={styles.productCode}>
              Line Code: {event.product.line_code} | Barcode: {event.product.barcode}
            </Text>
          </View>
        )}
        
        {event.details && (
          <View style={styles.detailsContainer}>
            {Object.entries(event.details).map(([key, value]) => (
              <View key={key} style={styles.detailRow}>
                <Text style={styles.detailKey}>{key.replace(/_/g, ' ').toUpperCase()}:</Text>
                <Text style={styles.detailValue}>
                  {typeof value === 'number' && key.includes('price') || key.includes('amount') 
                    ? `$${value.toFixed(2)}` 
                    : key.includes('quantity') 
                    ? `${value}` 
                    : value}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  const renderStockMovement = (movement, index) => (
    <View key={index} style={styles.stockMovementItem}>
      <View style={styles.stockMovementHeader}>
        <Icon name="inventory" size={20} color="#64748b" />
        <Text style={styles.stockMovementProduct}>{movement.product_name}</Text>
      </View>
      <View style={styles.stockMovementDetails}>
        <View style={styles.stockDetailRow}>
          <Text style={styles.stockDetailLabel}>Quantity Change:</Text>
          <Text style={[
            styles.stockDetailValue,
            { color: movement.quantity_change < 0 ? '#ef4444' : '#10b981' }
          ]}>
            {movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change}
          </Text>
        </View>
        <View style={styles.stockDetailRow}>
          <Text style={styles.stockDetailLabel}>Stock Level:</Text>
          <Text style={styles.stockDetailValue}>
            {movement.previous_stock} → {movement.new_stock}
          </Text>
        </View>
        <View style={styles.stockDetailRow}>
          <Text style={styles.stockDetailLabel}>Cost Value:</Text>
          <Text style={styles.stockDetailValue}>${movement.total_value.toFixed(2)}</Text>
        </View>
      </View>
      <Text style={styles.stockMovementTime}>
        {formatTimestamp(movement.timestamp)}
      </Text>
    </View>
  );

  const renderDiscrepancy = (discrepancy, index) => (
    <View key={index} style={[styles.discrepancyItem, styles[`discrepancy_${discrepancy.severity?.toLowerCase()}`]]}>
      <View style={styles.discrepancyHeader}>
        <Icon name="warning" size={20} color={
          discrepancy.severity === 'HIGH' ? '#ef4444' : 
          discrepancy.severity === 'MEDIUM' ? '#f59e0b' : '#3b82f6'
        } />
        <Text style={styles.discrepancyType}>{discrepancy.type.replace(/_/g, ' ')}</Text>
        <View style={[
          styles.severityBadge,
          { backgroundColor: discrepancy.severity === 'HIGH' ? '#fef2f2' : 
                             discrepancy.severity === 'MEDIUM' ? '#fffbeb' : '#eff6ff' }
        ]}>
          <Text style={[
            styles.severityText,
            { color: discrepancy.severity === 'HIGH' ? '#dc2626' : 
                     discrepancy.severity === 'MEDIUM' ? '#d97706' : '#2563eb' }
          ]}>
            {discrepancy.severity}
          </Text>
        </View>
      </View>
      <Text style={styles.discrepancyDescription}>{discrepancy.description}</Text>
    </View>
  );

  if (!saleId) {
    return (
      <ScrollView 
        style={[styles.container, Platform.OS === 'web' && styles.webContainer]}
        contentContainerStyle={[styles.scrollContentContainer, Platform.OS === 'web' && styles.webScrollContentContainer]}
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
        {/* Header with Back Button */}
        <View style={styles.headerWithBack}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#fff" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🔍 Sale Audit Trail</Text>
          <Text style={styles.headerSubtitle}>Access audit trails from specific sales</Text>
        </View>
        
        {/* Instructions */}
        <View style={styles.section}>
          <View style={styles.instructionCard}>
            <Icon name="info" size={48} color="#3b82f6" style={styles.instructionIcon} />
            <Text style={styles.instructionTitle}>How to Access Sale Audit Trails</Text>
            <Text style={styles.instructionText}>
              To view audit trail details for a specific sale:
            </Text>
            
            <View style={styles.stepsList}>
              <View style={styles.stepItem}>
                <Icon name="shopping-cart" size={20} color="#10b981" />
                <Text style={styles.stepText}>1. Go to Sales Ledger or Sales Dashboard</Text>
              </View>
              <View style={styles.stepItem}>
                <Icon name="visibility" size={20} color="#10b981" />
                <Text style={styles.stepText}>2. Find the sale you want to audit</Text>
              </View>
              <View style={styles.stepItem}>
                <Icon name="search" size={20} color="#10b981" />
                <Text style={styles.stepText}>3. Tap "View Details" on that sale</Text>
              </View>
              <View style={styles.stepItem}>
                <Icon name="timeline" size={20} color="#10b981" />
                <Text style={styles.stepText}>4. The audit trail will load automatically</Text>
              </View>
            </View>
            
            <Text style={styles.instructionNote}>
              💡 <Text style={styles.noteText}>Tip:</Text> You can also access audit trails from any sale details screen by tapping the audit trail option.
            </Text>
          </View>
        </View>
        
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚀 Quick Actions</Text>
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => {
                console.log('🔄 Navigating to Sales Ledger via ROUTES:', ROUTES.SALES_LEDGER);
                navigation.navigate(ROUTES.SALES_LEDGER);
              }}
            >
              <Icon name="receipt" size={24} color="#3b82f6" />
              <Text style={styles.quickActionText}>Go to Sales Ledger</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => {
                console.log('🔄 Navigating to Sales Dashboard via ROUTES:', ROUTES.SALES_DASHBOARD);
                navigation.navigate(ROUTES.SALES_DASHBOARD);
              }}
            >
              <Icon name="dashboard" size={24} color="#10b981" />
              <Text style={styles.quickActionText}>View Sales Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={{ height: 50 }} />
      </ScrollView>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading audit trail...</Text>
      </View>
    );
  }

  if (!auditData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No audit data available</Text>
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
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header with Back Button */}
      <View style={styles.headerWithBack}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#fff" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Icon name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔍 Sale Audit Trail</Text>
        <Text style={styles.headerSubtitle}>Real transaction details and timeline</Text>
        
        <View style={styles.saleInfoCard}>
          <Text style={styles.saleInfoTitle}>
            {auditData.sale_info?.receipt_number || 'Unknown'} • {auditData.sale_info?.status?.toUpperCase() || 'UNKNOWN'}
          </Text>
          <Text style={styles.saleInfoAmount}>
            ${(auditData.sale_info?.total_amount || 0).toFixed(2)} {auditData.sale_info?.currency || 'USD'}
          </Text>
          <Text style={styles.saleInfoDate}>
            {auditData.sale_info?.created_at ? new Date(auditData.sale_info.created_at).toLocaleString() : 'Unknown date'}
          </Text>
        </View>
      </View>

      {/* Transaction Timeline */}
      {auditData.transaction_timeline && auditData.transaction_timeline.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏱️ Transaction Timeline</Text>
          <View style={styles.timeline}>
            {auditData.transaction_timeline.map((event, index) => renderEvent(event, index))}
          </View>
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏱️ Transaction Timeline</Text>
          <Text style={styles.emptyStateText}>No transaction timeline available</Text>
        </View>
      )}

      {/* Stock Movements */}
      {auditData.stock_movements && auditData.stock_movements.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📦 Stock Movement Analysis</Text>
          <Text style={styles.sectionSubtitle}>
            Inventory impact and stock level changes
          </Text>
          {auditData.stock_movements.map((movement, index) => renderStockMovement(movement, index))}
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📦 Stock Movement Analysis</Text>
          <Text style={styles.emptyStateText}>No stock movement data available</Text>
        </View>
      )}

      {/* Refund History */}
      {auditData.refund_history && auditData.refund_history.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💸 Refund History</Text>
          <Text style={styles.sectionSubtitle}>Refund transactions and reversals</Text>
          {/* Render refund history items */}
        </View>
      )}

      {/* Discrepancy Flags */}
      {auditData.discrepancy_flags && auditData.discrepancy_flags.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚨 Discrepancy Flags</Text>
          <Text style={styles.sectionSubtitle}>Potential issues and anomalies detected</Text>
          {auditData.discrepancy_flags.map((discrepancy, index) => renderDiscrepancy(discrepancy, index))}
        </View>
      )}

      {/* Performance Metrics */}
      {auditData.sale_info && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Performance Metrics</Text>
          <View style={styles.metricsContainer}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Sale ID</Text>
              <Text style={styles.metricValue}>#{auditData.sale_info.id || 'N/A'}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Items Count</Text>
              <Text style={styles.metricValue}>{auditData.sale_info.item_count || auditData.transaction_timeline?.filter(e => e.event === 'ITEM_SCANNED').length || 'N/A'}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Payment Method</Text>
              <Text style={styles.metricValue}>
                {auditData.sale_info.payment_method || 
                 auditData.transaction_timeline?.find(e => e.event === 'PAYMENT_PROCESSED')?.details?.payment_method ||
                 auditData.transaction_timeline?.find(e => e.event === 'SALE_CREATED')?.details?.payment_method ||
                 'N/A'}
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Status</Text>
              <Text style={styles.metricValue}>{auditData.sale_info.status || 'Unknown'}</Text>
            </View>
          </View>
        </View>
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
    backgroundColor: '#1e293b',
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
  webScrollContentContainer: {
    ...Platform.select({
      web: {
        minHeight: '100vh',
        width: '100%',
        flexGrow: 1,
      },
    }),
  },
  headerWithBack: {
    backgroundColor: '#1e293b',
    padding: 16,
    paddingTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  refreshButton: {
    padding: 8,
    marginLeft: 'auto',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
  header: {
    backgroundColor: '#1e293b',
    padding: 16,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 16,
  },
  saleInfoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  saleInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  saleInfoAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 4,
  },
  saleInfoDate: {
    fontSize: 14,
    color: '#94a3b8',
  },
  section: {
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  timeline: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineIcon: {
    marginRight: 16,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  eventTime: {
    fontSize: 12,
    color: '#64748b',
  },
  eventDescription: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 8,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventDetailText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 4,
  },
  productInfo: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  productCode: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  detailsContainer: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailKey: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 11,
    color: '#1e293b',
    fontWeight: '600',
  },
  stockMovementItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  stockMovementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stockMovementProduct: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 8,
  },
  stockMovementDetails: {
    marginBottom: 8,
  },
  stockDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  stockDetailLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  stockDetailValue: {
    fontSize: 12,
    color: '#1e293b',
    fontWeight: '600',
  },
  stockMovementTime: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'right',
  },
  discrepancyItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  discrepancy_high: {
    borderLeftColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  discrepancy_medium: {
    borderLeftColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  discrepancy_low: {
    borderLeftColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  discrepancyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  discrepancyType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 8,
    flex: 1,
  },
  severityBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  discrepancyDescription: {
    fontSize: 13,
    color: '#475569',
  },
  metricsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  instructionCard: {
    backgroundColor: '#374151',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionIcon: {
    marginBottom: 16,
  },
  instructionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 12,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 16,
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  stepsList: {
    width: '100%',
    marginBottom: 20,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  stepText: {
    fontSize: 14,
    color: '#f1f5f9',
    marginLeft: 12,
    flex: 1,
  },
  instructionNote: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  noteText: {
    fontWeight: 'bold',
    color: '#1e40af',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickActionButton: {
    backgroundColor: '#475569',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f8fafc',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default SalesAuditTrailScreen;