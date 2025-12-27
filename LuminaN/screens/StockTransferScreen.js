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
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { shopAPI } from '../services/api';
import { shopStorage } from '../services/storage';
import { ROUTES } from '../constants/navigation';

const StockTransferScreen = () => {
  const navigation = useNavigation();
  
  // State management
  const [loading, setLoading] = useState(false);
  const [shopCredentials, setShopCredentials] = useState(null);
  
  // Transfer data
  const [transferType, setTransferType] = useState('CONVERSION');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  
  // Source product
  const [fromLineCode, setFromLineCode] = useState('');
  const [fromBarcode, setFromBarcode] = useState('');
  const [fromQuantity, setFromQuantity] = useState('');
  const [fromProduct, setFromProduct] = useState(null);
  const [fromProductInfo, setFromProductInfo] = useState(null);
  
  // Destination product
  const [toLineCode, setToLineCode] = useState('');
  const [toBarcode, setToBarcode] = useState('');
  const [toQuantity, setToQuantity] = useState('');
  const [toProduct, setToProduct] = useState(null);
  const [toProductInfo, setToProductInfo] = useState(null);
  
  // Validation and preview
  const [validationResult, setValidationResult] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Search states
  const [searchingFrom, setSearchingFrom] = useState(false);
  const [searchingTo, setSearchingTo] = useState(false);

  useEffect(() => {
    loadShopCredentials();
  }, []);

  const loadShopCredentials = async () => {
    try {
      const credentials = await shopStorage.getCredentials();
      if (credentials) {
        setShopCredentials(credentials);
      } else {
        navigation.replace(ROUTES.LOGIN);
      }
    } catch (error) {
      console.error('❌ Error loading credentials:', error);
      navigation.replace(ROUTES.LOGIN);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getAuthHeaders = async () => {
    const credentials = await shopStorage.getCredentials();
    if (!credentials) {
      throw new Error('Shop credentials not found. Please log in again.');
    }
    
    // Check if this is a shop owner or cashier
    const isShopOwner = !credentials.cashier_info;
    const shopId = credentials.shop_info?.shop_id || credentials.shop_id;
    const cashierId = credentials.cashier_info?.id;
    
    const headers = {
      'X-Shop-ID': shopId
    };
    
    // Only add cashier ID if this is a cashier (not shop owner)
    if (!isShopOwner && cashierId) {
      headers['X-Cashier-ID'] = cashierId;
    }
    
    return { headers, isShopOwner, credentials };
  };

  const searchProduct = async (identifier, isSource = true) => {
    if (!identifier.trim()) return;
    
    const setSearching = isSource ? setSearchingFrom : setSearchingTo;
    const setProduct = isSource ? setFromProduct : setToProduct;
    const setProductInfo = isSource ? setFromProductInfo : setToProductInfo;
    
    setSearching(true);
    
    try {
      const { headers, isShopOwner, credentials } = await getAuthHeaders();
      
      // Debug: log the actual credentials structure
      console.log('🔍 Debug - Full credentials:', JSON.stringify(credentials, null, 2));
      console.log('🔍 Debug - Is shop owner:', isShopOwner);
      console.log('🔍 Debug - Headers:', headers);
      
      const response = await shopAPI.findProductForTransfer({
        identifier: identifier.trim()
      }, {
        headers: headers
      });
      
      if (response.data.success) {
        setProduct(response.data.data.product);
        setProductInfo(response.data.data);
      } else {
        Alert.alert('Product Not Found', response.data.error);
        setProduct(null);
        setProductInfo(null);
      }
    } catch (error) {
      console.error('❌ Error finding product:', error);
      Alert.alert('Error', 'Failed to find product. Please try again.');
      setProduct(null);
      setProductInfo(null);
    } finally {
      setSearching(false);
    }
  };

  const validateTransfer = async () => {
    if (!fromLineCode && !fromBarcode) {
      Alert.alert('Validation Error', 'Please enter source product line code or barcode');
      return;
    }
    
    if (!toLineCode && !toBarcode) {
      Alert.alert('Validation Error', 'Please enter destination product line code or barcode');
      return;
    }
    
    if (!fromQuantity || parseFloat(fromQuantity) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid source quantity');
      return;
    }
    
    if (!toQuantity || parseFloat(toQuantity) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid destination quantity');
      return;
    }
    
    setLoading(true);
    
    try {
      const { headers, isShopOwner, credentials } = await getAuthHeaders();
      
      // Debug: log the actual credentials structure
      console.log('🔍 Debug - Full credentials:', JSON.stringify(credentials, null, 2));
      console.log('🔍 Debug - Is shop owner:', isShopOwner);
      console.log('🔍 Debug - Headers:', headers);

      const response = await shopAPI.validateTransfer({
        transfer_type: transferType,
        from_line_code: fromLineCode,
        from_barcode: fromBarcode,
        from_quantity: parseFloat(fromQuantity),
        to_line_code: toLineCode,
        to_barcode: toBarcode,
        to_quantity: parseFloat(toQuantity),
        reason: reason
      }, {
        headers: headers
      });
      
      if (response.data.success) {
        setValidationResult(response.data);
        setShowPreview(true);
      } else {
        Alert.alert('Validation Failed', response.data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('❌ Error validating transfer:', error);
      Alert.alert('Error', 'Failed to validate transfer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const processTransfer = async () => {
    if (!validationResult || !validationResult.is_valid) {
      Alert.alert('Error', 'Transfer validation failed');
      return;
    }
    
    setLoading(true);
    
    try {
      console.log('🔍 DEBUG: Starting processTransfer');
      const { headers } = await getAuthHeaders();
      console.log('🔍 DEBUG: Auth headers:', headers);
      
      const transferData = {
        transfer_type: transferType,
        from_line_code: fromLineCode,
        from_barcode: fromBarcode,
        from_quantity: parseFloat(fromQuantity),
        to_line_code: toLineCode,
        to_barcode: toBarcode,
        to_quantity: parseFloat(toQuantity),
        reason: reason,
        notes: notes
      };
      
      console.log('🔍 DEBUG: Transfer data:', transferData);
      
      const response = await shopAPI.createTransfer(transferData, {
        headers: headers
      });
      
      console.log('🔍 DEBUG: Transfer response:', response);
      
      console.log('🔍 DEBUG: Response data:', response.data);
      
      if (response.data.success) {
        console.log('✅ DEBUG: Transfer was successful!');
        
        // Show success with financial impact summary
        const data = response.data.data;
        let successMessage = response.data.message || 'Stock transfer completed successfully!';
        
        // Add financial impact to success message if available
        if (data.financial_impact) {
          const impact = data.financial_impact;
          if (impact.costs.net_cost_impact !== 0) {
            successMessage += `\n\nFinancial Impact: ${impact.costs.net_cost_impact > 0 ? '+' : ''}${impact.costs.net_cost_impact.toFixed(2)}`;
          }
          if (impact.business_impact && impact.business_impact.cost_impact_type.includes('SHRINKAGE')) {
            successMessage += '\n\n🚨 SHRINKAGE DETECTED - Review recommended';
          }
        }
        
        Alert.alert(
          'Success',
          successMessage,
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form
                resetForm();
                setShowPreview(false);
                setValidationResult(null);
              }
            }
          ]
        );
      } else {
        console.log('❌ DEBUG: Transfer failed!');
        console.log('❌ DEBUG: Error details:', response.data);
        
        // Show more detailed error information with special handling for critical errors
        let errorMessage = response.data.error || 'Unknown error';
        if (response.data.details && Array.isArray(response.data.details)) {
          // Filter for critical errors
          const criticalErrors = response.data.details.filter(detail => 
            detail.includes('CRITICAL') || detail.includes('SHRINKAGE') || detail.includes('$0.00 cost')
          );
          
          if (criticalErrors.length > 0) {
            errorMessage = '🚨 CRITICAL BUSINESS ALERT:\n\n' + criticalErrors.join('\n');
          } else {
            errorMessage += '\n\nDetails:\n' + response.data.details.join('\n');
          }
        }
        
        Alert.alert('Transfer Failed', errorMessage);
      }
    } catch (error) {
      console.error('❌ Error processing transfer:', error);
      console.error('❌ DEBUG: Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response,
        request: error.request
      });
      
      // More specific error messages
      if (error.response) {
        console.error('❌ DEBUG: Server response:', error.response.data);
        Alert.alert('Transfer Failed', `Server Error: ${error.response.data?.error || error.response.data?.detail || 'Unknown error'}`);
      } else if (error.request) {
        console.error('❌ DEBUG: Network request failed:', error.request);
        Alert.alert('Transfer Failed', 'Network error. Please check your connection and try again.');
      } else {
        Alert.alert('Error', 'Failed to process transfer. Please try again.');
      }
    } finally {
      console.log('🔍 DEBUG: ProcessTransfer completed');
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFromLineCode('');
    setFromBarcode('');
    setFromQuantity('');
    setFromProduct(null);
    setFromProductInfo(null);
    setToLineCode('');
    setToBarcode('');
    setToQuantity('');
    setToProduct(null);
    setToProductInfo(null);
    setReason('');
    setNotes('');
    setValidationResult(null);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.backButton}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>🔄 Stock Transfer</Text>
      <TouchableOpacity onPress={resetForm}>
        <Text style={styles.resetButton}>↻ Reset</Text>
      </TouchableOpacity>
    </View>
  );

  const renderProductInput = (title, isSource = true) => {
    const identifier = isSource ? (fromLineCode || fromBarcode) : (toLineCode || toBarcode);
    const quantity = isSource ? fromQuantity : toQuantity;
    const setQuantity = isSource ? setFromQuantity : setToQuantity;
    const product = isSource ? fromProduct : toProduct;
    const productInfo = isSource ? fromProductInfo : toProductInfo;
    const searching = isSource ? searchingFrom : searchingTo;
    const onSearch = (id) => searchProduct(id, isSource);
    
    const handleLineCodeChange = (text) => {
      if (isSource) {
        setFromLineCode(text);
        setFromBarcode(''); // Clear barcode when line code is used
      } else {
        setToLineCode(text);
        setToBarcode(''); // Clear barcode when line code is used
      }
    };
    
    const handleBarcodeChange = (text) => {
      if (isSource) {
        setFromBarcode(text);
        setFromLineCode(''); // Clear line code when barcode is used
      } else {
        setToBarcode(text);
        setToLineCode(''); // Clear line code when barcode is used
      }
    };
    
    const currentLineCode = isSource ? fromLineCode : toLineCode;
    const currentBarcode = isSource ? fromBarcode : toBarcode;
    
    return (
      <View style={styles.productSection}>
        <Text style={styles.sectionTitle}>{title}</Text>
        
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Line Code:</Text>
          <TextInput
            style={styles.input}
            value={currentLineCode}
            onChangeText={handleLineCodeChange}
            placeholder="Enter line code"
            onBlur={() => currentLineCode && onSearch(currentLineCode)}
          />
        </View>
        
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>OR Barcode:</Text>
          <TextInput
            style={styles.input}
            value={currentBarcode}
            onChangeText={handleBarcodeChange}
            placeholder="Scan or enter barcode"
            onBlur={() => currentBarcode && onSearch(currentBarcode)}
          />
        </View>
      
      <View style={styles.inputRow}>
        <Text style={styles.inputLabel}>Quantity:</Text>
        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={setQuantity}
          placeholder="Enter quantity"
          keyboardType="numeric"
        />
      </View>
      
        {searching && (
          <View style={styles.searchingContainer}>
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text style={styles.searchingText}>Searching for product...</Text>
          </View>
        )}
        
        {product && productInfo && (
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productDetails}>
              Stock: {productInfo.current_stock} | Status: {productInfo.stock_status}
            </Text>
            <Text style={styles.productDetails}>
              Price: {formatCurrency(product.price)} | Cost: {formatCurrency(product.cost_price)}
            </Text>
          </View>
        )}
      </View>
    );
  }; // Close renderProductInput function

  const renderPreviewModal = () => (
    <Modal
      visible={showPreview}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowPreview(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>📋 Transfer Preview</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowPreview(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {validationResult && (
            <View style={styles.modalBody}>
              {validationResult.errors && validationResult.errors.length > 0 ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorTitle}>⚠️ Validation Errors:</Text>
                  {validationResult.errors.map((error, index) => (
                    <Text key={index} style={styles.errorText}>• {error}</Text>
                  ))}
                </View>
              ) : (
                <>
                  <Text style={styles.successTitle}>✅ Transfer Details</Text>
                  
                  <View style={styles.transferDetails}>
                    <Text style={styles.detailLabel}>Conversion Ratio:</Text>
                    <Text style={styles.detailValue}>{validationResult.conversion_ratio}:1</Text>
                  </View>
                  
                  {validationResult.from_product_info && (
                    <View style={styles.productPreview}>
                      <Text style={styles.previewTitle}>📤 From:</Text>
                      <Text style={styles.previewText}>
                        {validationResult.from_product_info.name} ({validationResult.from_product_info.line_code || validationResult.from_product_info.barcode})
                      </Text>
                      <Text style={styles.previewText}>
                        Quantity: {fromQuantity} | Current Stock: {validationResult.from_product_info.current_stock}
                      </Text>
                    </View>
                  )}
                  
                  {validationResult.to_product_info && (
                    <View style={styles.productPreview}>
                      <Text style={styles.previewTitle}>📥 To:</Text>
                      <Text style={styles.previewText}>
                        {validationResult.to_product_info.name} ({validationResult.to_product_info.line_code || validationResult.to_product_info.barcode})
                      </Text>
                      <Text style={styles.previewText}>
                        Quantity: {toQuantity} | Current Stock: {validationResult.to_product_info.current_stock}
                      </Text>
                    </View>
                  )}
                  
                  {reason && (
                    <View style={styles.reasonPreview}>
                      <Text style={styles.previewTitle}>📝 Reason:</Text>
                      <Text style={styles.previewText}>{reason}</Text>
                    </View>
                  )}
                </>
              )}
            </View>
          )}
          
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowPreview(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.confirmButton,
                (!validationResult || !validationResult.is_valid) && styles.confirmButtonDisabled
              ]}
              onPress={processTransfer}
              disabled={!validationResult || !validationResult.is_valid}
            >
              <Text style={styles.confirmButtonText}>
                {loading ? 'Processing...' : '✅ Confirm Transfer'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

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
      
      {/* Transfer Type Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Transfer Type</Text>
        <View style={styles.transferTypeContainer}>
          {[
            { value: 'CONVERSION', label: '🔄 Conversion', desc: 'Transform product' },
            { value: 'SPLIT', label: '✂️ Split', desc: 'Divide into smaller units' },
            { value: 'TRANSFER', label: '📦 Transfer', desc: 'Move between locations' },
            { value: 'ADJUSTMENT', label: '⚖️ Adjustment', desc: 'Manual correction' }
          ].map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.transferTypeButton,
                transferType === type.value && styles.transferTypeButtonActive
              ]}
              onPress={() => setTransferType(type.value)}
            >
              <Text style={[
                styles.transferTypeLabel,
                transferType === type.value && styles.transferTypeLabelActive
              ]}>
                {type.label}
              </Text>
              <Text style={[
                styles.transferTypeDesc,
                transferType === type.value && styles.transferTypeDescActive
              ]}>
                {type.desc}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Source Product */}
      {renderProductInput('📤 Source Product (From)', true)}

      {/* Destination Product */}
      {renderProductInput('📥 Destination Product (To)', false)}

      {/* Reason and Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📝 Additional Information</Text>
        
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Reason:</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={reason}
            onChangeText={setReason}
            placeholder="Why is this transfer needed?"
            multiline
            numberOfLines={3}
          />
        </View>
        
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Notes:</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Additional notes (optional)"
            multiline
            numberOfLines={2}
          />
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.validateButton}
          onPress={validateTransfer}
          disabled={loading}
        >
          <Text style={styles.validateButtonText}>
            {loading ? 'Validating...' : '🔍 Validate Transfer'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bottom padding for web scrolling */}
      <View style={{ 
        height: Platform.OS === 'web' ? 100 : 20,
        minHeight: Platform.OS === 'web' ? 100 : 0
      }} />

      {/* Preview Modal */}
      {renderPreviewModal()}
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
  resetButton: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  productSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputLabel: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '600',
    width: 100,
  },
  input: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#444',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  searchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    marginTop: 8,
  },
  searchingText: {
    color: '#ccc',
    marginLeft: 8,
    fontSize: 14,
  },
  productInfo: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  productName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productDetails: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 2,
  },
  transferTypeContainer: {
    gap: 8,
  },
  transferTypeButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#444',
  },
  transferTypeButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  transferTypeLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  transferTypeDesc: {
    color: '#ccc',
    fontSize: 12,
  },
  transferTypeLabelActive: {
    color: '#fff',
  },
  transferTypeDescActive: {
    color: '#e0e7ff',
  },
  actionButtons: {
    padding: 16,
    gap: 12,
  },
  validateButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  validateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#374151',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  errorTitle: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorText: {
    color: '#7f1d1d',
    fontSize: 14,
    marginBottom: 4,
  },
  successTitle: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  transferDetails: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '600',
  },
  detailValue: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: 'bold',
  },
  productPreview: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  previewTitle: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  previewText: {
    color: '#ccc',
    fontSize: 13,
    marginBottom: 2,
  },
  reasonPreview: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#6b7280',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default StockTransferScreen;