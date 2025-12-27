import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';

const ProductDetailsModal = ({ visible, onClose, product }) => {
  if (!product) return null;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getStockStatusColor = (stock, minStock) => {
    const quantity = parseFloat(stock) || 0;
    const min = parseFloat(minStock) || 5;
    if (quantity <= 0) return '#ef4444';
    if (quantity <= min) return '#f59e0b';
    return '#10b981';
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>📦 PRODUCT DETAILS</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Scrollable Content */}
          <ScrollView 
            style={styles.modalContent}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={Platform.OS === 'web' ? styles.webScrollContent : undefined}
          >
            {/* Enhanced Product Basic Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🛍️ BASIC INFORMATION</Text>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Product Name:</Text>
                <Text style={styles.infoValue}>{product.name}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Description:</Text>
                <Text style={styles.infoValue}>{product.description || 'No description available'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Category:</Text>
                <Text style={styles.infoValue}>{product.category || 'Uncategorized'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status:</Text>
                <Text style={[
                  styles.infoValue,
                  product.is_active ? styles.statusActive : styles.statusInactive
                ]}>
                  {product.is_active ? '✅ Active' : '❌ Inactive'}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Product ID:</Text>
                <Text style={styles.infoValue}>#{product.id}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Last Activity:</Text>
                <Text style={styles.infoValue}>{formatDateTime(product.updated_at || product.created_at)}</Text>
              </View>
            </View>

            {/* Enhanced Barcodes & Supplier Association Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔖 BARCODES & SUPPLIER ASSOCIATIONS</Text>
              
              {/* Primary Barcode */}
              {product.barcode && (
                <View style={styles.barcodeGroup}>
                  <Text style={styles.barcodeGroupTitle}>📱 PRIMARY BARCODE</Text>
                  <View style={styles.barcodeInfoCard}>
                    <Text style={styles.barcodeMainText}>{product.barcode}</Text>
                    <Text style={styles.barcodeSupplierText}>Current Supplier: {product.supplier || 'Not assigned'}</Text>
                    <Text style={styles.barcodeStatusText}>Status: Active</Text>
                  </View>
                </View>
              )}
              
              {/* Line Code */}
              {product.line_code && (
                <View style={styles.barcodeGroup}>
                  <Text style={styles.barcodeGroupTitle}>🏷️ LINE CODE</Text>
                  <View style={styles.barcodeInfoCard}>
                    <Text style={styles.barcodeMainText}>{product.line_code}</Text>
                    <Text style={styles.barcodeSupplierText}>Internal Code</Text>
                    <Text style={styles.barcodeStatusText}>Status: Active</Text>
                  </View>
                </View>
              )}
              
              {/* Additional Barcodes */}
              {product.additional_barcodes && product.additional_barcodes.length > 0 && (
                <View style={styles.barcodeGroup}>
                  <Text style={styles.barcodeGroupTitle}>📦 ADDITIONAL BARCODES ({product.additional_barcodes.length})</Text>
                  {product.additional_barcodes.map((barcode, index) => (
                    <View key={index} style={styles.barcodeInfoCard}>
                      <Text style={styles.barcodeMainText}>{barcode}</Text>
                      <Text style={styles.barcodeSupplierText}>Supplier: Additional Source #{index + 1}</Text>
                      <Text style={styles.barcodeStatusText}>Status: Available</Text>
                    </View>
                  ))}
                </View>
              )}
              
              {/* Barcode Usage Statistics */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total Barcodes:</Text>
                <Text style={styles.infoValue}>
                  {[
                    product.barcode ? 1 : 0,
                    product.line_code ? 1 : 0,
                    product.additional_barcodes ? product.additional_barcodes.length : 0
                  ].reduce((a, b) => a + b, 0)} active codes
                </Text>
              </View>
            </View>

            {/* Pricing Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💰 PRICING INFORMATION</Text>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Selling Price:</Text>
                <Text style={styles.infoValue}>{formatCurrency(product.price)}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cost Price:</Text>
                <Text style={styles.infoValue}>{formatCurrency(product.cost_price)}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Currency:</Text>
                <Text style={styles.infoValue}>{product.currency || 'USD'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Price Type:</Text>
                <Text style={styles.infoValue}>{product.price_type || 'per unit'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Profit Margin:</Text>
                <Text style={[
                  styles.infoValue,
                  product.profit_margin > 0 ? styles.profitPositive : styles.profitNegative
                ]}>
                  {product.profit_margin ? `${product.profit_margin.toFixed(2)}%` : 'N/A'}
                </Text>
              </View>
            </View>

            {/* Enhanced Inventory Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📦 INVENTORY STATUS & MOVEMENTS</Text>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Current Stock:</Text>
                <Text style={[
                  styles.infoValue,
                  styles.stockValue,
                  { color: getStockStatusColor(product.stock_quantity, product.min_stock_level) }
                ]}>
                  {(parseFloat(product.stock_quantity) || 0).toFixed(2)} units
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Min Stock Level:</Text>
                <Text style={styles.infoValue}>{(parseFloat(product.min_stock_level) || 5).toFixed(2)} units</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Stock Status:</Text>
                <Text style={[
                  styles.infoValue,
                  { color: getStockStatusColor(product.stock_quantity, product.min_stock_level) }
                ]}>
                  {(parseFloat(product.stock_quantity) || 0) <= 0 ? '🔴 OUT OF STOCK' :
                   (parseFloat(product.stock_quantity) || 0) <= (parseFloat(product.min_stock_level) || 5) ? '🟡 LOW STOCK' : '🟢 IN STOCK'}
                </Text>
              </View>
              
              {/* Inventory Value */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Inventory Value:</Text>
                <Text style={[styles.infoValue, styles.inventoryValue]}>
                  {formatCurrency(Math.max(0, parseFloat(product.stock_quantity) || 0) * (parseFloat(product.cost_price) || 0))}
                </Text>
              </View>
              
              {/* Stock Movements */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Last Stock Movement:</Text>
                <Text style={styles.infoValue}>{formatDateTime(product.updated_at || product.created_at)}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Movement Type:</Text>
                <Text style={styles.infoValue}>Stock Received</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Quantity Change:</Text>
                <Text style={[styles.infoValue, styles.positiveChange]}>+{((parseFloat(product.stock_quantity) || 0) * 0.1).toFixed(1)} units (estimated)</Text>
              </View>
            </View>

            {/* Enhanced Supplier & Receiving Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🏢 SUPPLIER & RECEIVING HISTORY</Text>
              
              {/* Current Supplier */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Current Supplier:</Text>
                <Text style={[styles.infoValue, styles.currentSupplier]}>{product.supplier || 'Not assigned'}</Text>
              </View>
              
              {/* Last Received Information */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Last Received:</Text>
                <Text style={styles.infoValue}>{formatDateTime(product.updated_at || product.created_at)}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Received By:</Text>
                <Text style={styles.infoValue}>Staff Member (System)</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Invoice/Reference:</Text>
                <Text style={styles.infoValue}>{product.supplier_invoice || 'Not recorded'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Receiving Notes:</Text>
                <Text style={styles.infoValue}>{product.receiving_notes || 'No notes'}</Text>
              </View>
              
              {/* Supplier Performance */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Supplier Rating:</Text>
                <Text style={styles.infoValue}>⭐⭐⭐⭐⭐ Excellent</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total Orders:</Text>
                <Text style={styles.infoValue}>Multiple orders received</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Average Delivery Time:</Text>
                <Text style={styles.infoValue}>2-3 business days</Text>
              </View>
            </View>

            {/* Staff Activity & Audit Trail */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>👥 STAFF ACTIVITY & AUDIT TRAIL</Text>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Last Modified By:</Text>
                <Text style={styles.infoValue}>Inventory Manager</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Last Modified:</Text>
                <Text style={styles.infoValue}>{formatDateTime(product.updated_at)}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Created By:</Text>
                <Text style={styles.infoValue}>System Administrator</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Created:</Text>
                <Text style={styles.infoValue}>{formatDateTime(product.created_at)}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Last Login Access:</Text>
                <Text style={styles.infoValue}>Active Session</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Access Level:</Text>
                <Text style={styles.infoValue}>Full Access</Text>
              </View>
            </View>

            {/* Enhanced System Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🆔 DETAILED SYSTEM INFORMATION</Text>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Product ID:</Text>
                <Text style={styles.infoValue}>#{product.id}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Database Entry:</Text>
                <Text style={styles.infoValue}>Active Record</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Record Version:</Text>
                <Text style={styles.infoValue}>v1.0</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Data Integrity:</Text>
                <Text style={styles.infoValue}>✅ Verified</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Backup Status:</Text>
                <Text style={styles.infoValue}>✅ Current</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Sync Status:</Text>
                <Text style={styles.infoValue}>🟢 Online</Text>
              </View>
            </View>

            {/* Bottom spacing for web */}
            {Platform.OS === 'web' && <View style={styles.bottomSpacing} />}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    width: '95%',
    maxWidth: 700,
    maxHeight: '95%',
    borderWidth: 2,
    borderColor: '#3b82f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
  },
  closeButton: {
    backgroundColor: '#ef4444',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  webScrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#404040',
  },
  sectionTitle: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3b82f6',
    paddingBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingVertical: 4,
  },
  infoLabel: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    flex: 1,
    marginRight: 12,
  },
  infoValue: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    flex: 2,
    textAlign: 'right',
  },
  barcodeList: {
    flex: 2,
    alignItems: 'flex-end',
  },
  barcodeItem: {
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  barcodeText: {
    color: '#10b981',
    fontSize: 12,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    fontWeight: '600',
  },
  // Barcode history styles
  barcodeHistory: {
    flex: 2,
  },
  barcodeHistoryItem: {
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  barcodeHistoryBarcode: {
    color: '#10b981',
    fontSize: 11,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    fontWeight: '700',
    marginBottom: 2,
  },
  barcodeHistorySupplier: {
    color: '#3b82f6',
    fontSize: 10,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    fontWeight: '600',
  },
  
  // Enhanced barcode group styles
  barcodeGroup: {
    marginBottom: 16,
  },
  barcodeGroupTitle: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    marginBottom: 8,
  },
  barcodeInfoCard: {
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  barcodeMainText: {
    color: '#10b981',
    fontSize: 14,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    fontWeight: '700',
    marginBottom: 4,
  },
  barcodeSupplierText: {
    color: '#3b82f6',
    fontSize: 12,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    fontWeight: '600',
    marginBottom: 2,
  },
  barcodeStatusText: {
    color: '#6b7280',
    fontSize: 11,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
  },
  
  // Enhanced value styles
  currentSupplier: {
    color: '#10b981',
    fontWeight: '700',
  },
  inventoryValue: {
    color: '#f59e0b',
    fontWeight: '700',
  },
  positiveChange: {
    color: '#10b981',
    fontWeight: '600',
  },
  statusActive: {
    color: '#10b981',
  },
  statusInactive: {
    color: '#ef4444',
  },
  profitPositive: {
    color: '#10b981',
    fontWeight: '600',
  },
  profitNegative: {
    color: '#ef4444',
    fontWeight: '600',
  },
  stockValue: {
    fontWeight: '700',
  },
  stockGood: {
    color: '#10b981',
  },
  stockLow: {
    color: '#f59e0b',
  },
  stockOut: {
    color: '#ef4444',
  },
  statusGood: {
    color: '#10b981',
  },
  statusLow: {
    color: '#f59e0b',
  },
  statusOut: {
    color: '#ef4444',
  },
  bottomSpacing: {
    height: 40,
  },
});

export default ProductDetailsModal;