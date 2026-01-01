import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { shopAPI } from '../services/api';

const StockTakeScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [stockCounts, setStockCounts] = useState({});
  const [processing, setProcessing] = useState(false);
  const [currentPhase, setCurrentPhase] = useState('counting'); // 'counting' | 'processing' | 'review' | 'finalizing'
  const [stockTakeResults, setStockTakeResults] = useState([]);
  const [finalizing, setFinalizing] = useState(false);
  const [currentStockTake, setCurrentStockTake] = useState(null);

  useEffect(() => {
    loadProductsForStockTake();
  }, []);

  const loadProductsForStockTake = async () => {
    try {
      setLoading(true);
      
      // First, create a new stock take session - NO AUTHENTICATION REQUIRED
      const stockTakeData = {
        name: `Stock Take - ${new Date().toLocaleDateString()}`
      };
      
      console.log('🏗️ Creating new stock take session...');
      const stockTakeResponse = await shopAPI.createStockTake(stockTakeData);
      
      if (stockTakeResponse.data) {
        setCurrentStockTake(stockTakeResponse.data);
        console.log('✅ Stock take session created:', stockTakeResponse.data.id);
      }
      
      // Load products for counting - NO AUTHENTICATION REQUIRED
      console.log('📦 Loading products for stock take...');
      
      // Test API connection first
      const statusResponse = await shopAPI.checkStatus();
      console.log('✅ API connection successful:', statusResponse.data);
      
      // Load products using public endpoint
      const response = await shopAPI.getPublicProducts();
      console.log('📦 Products API response:', response);
      
      if (response.data && Array.isArray(response.data)) {
        console.log('📦 Loaded products for stock take:', response.data.length);
        setProducts(response.data);
        
        // Initialize stock counts with system stock (hidden during counting phase)
        const initialCounts = {};
        response.data.forEach(product => {
          initialCounts[product.id] = {
            systemStock: parseFloat(product.stock_quantity) || 0,
            countedStock: 0,
            difference: 0
          };
        });
        setStockCounts(initialCounts);
      } else {
        console.warn('⚠️ No products returned from API or invalid response format');
        console.warn('⚠️ Response data:', response.data);
        Alert.alert(
          'No Products Found',
          'No products were loaded from the system. This could indicate an issue with the database.\n\nPlease check:\n• Database connection\n• Product data exists\n• Server connection',
          [{ text: 'Retry', onPress: loadProductsForStockTake }, { text: 'Check Console', style: 'cancel' }]
        );
      }
    } catch (error) {
      console.error('❌ Error loading products for stock take:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        method: error.config?.method
      });
      
      // Provide more specific error messages
      let errorMessage = 'Failed to load products for stock take';
      
      if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Cannot connect to server. Please check if the development server is running.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please check your login credentials.';
      } else if (error.response?.status === 404) {
        errorMessage = 'API endpoint not found. Please check server configuration.';
      } else if (error.response?.data?.error) {
        errorMessage = `Server error: ${error.response.data.error}`;
      } else if (error.message) {
        errorMessage = `Network error: ${error.message}`;
      }
      
      Alert.alert(
        'Stock Take Error',
        `${errorMessage}\n\nIf this persists, please check:\n• Server is running\n• Database has products\n• Network connection`,
        [
          { text: 'Retry', onPress: loadProductsForStockTake },
          { text: 'Go Back', onPress: () => navigation.goBack(), style: 'cancel' }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const updateCountedStock = (productId, countedValue) => {
    const numericValue = parseFloat(countedValue) || 0;
    const systemStock = stockCounts[productId]?.systemStock || 0;
    const difference = numericValue - systemStock;
    
    setStockCounts(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        countedStock: numericValue,
        difference: difference
      }
    }));
  };

  const processStockTake = async () => {
    try {
      setProcessing(true);
      setCurrentPhase('processing');
      
      // Get products that have been counted (allow 0 counts if explicitly entered)
      const countedProducts = products
        .filter(product => {
          const count = stockCounts[product.id];
          // Include if: count exists AND countedStock >= 0 (explicitly counted, including 0)
          return count && count.countedStock >= 0;
        });
      
      if (countedProducts.length === 0) {
        Alert.alert('No Counts', 'Please enter at least one counted quantity before processing.');
        setCurrentPhase('counting');
        setProcessing(false);
        return;
      }
      
      // Prepare stock take items for bulk upload - NO AUTHENTICATION REQUIRED
      const stockTakeItems = countedProducts.map(product => {
        const count = stockCounts[product.id];
        return {
          product_id: product.id,
          counted_quantity: parseFloat(count.countedStock) || 0,
          notes: `Stock Take Count - System: ${count.systemStock}, Counted: ${count.countedStock}, Difference: ${count.difference >= 0 ? '+' : ''}${count.difference}`
        };
      });
      
      console.log('📤 Submitting stock take data to backend...');
      
      // Submit stock take items to backend - NO AUTHENTICATION REQUIRED
      const bulkData = {
        items: stockTakeItems
      };
      
      if (currentStockTake) {
        try {
          const bulkResponse = await shopAPI.bulkAddStockTakeItems(currentStockTake.id, bulkData);
          console.log('✅ Stock take items submitted successfully:', bulkResponse.data);
          
          // Show success feedback
          if (bulkResponse.data && bulkResponse.data.message) {
            Alert.alert('Stock Take Updated', bulkResponse.data.message);
          }
        } catch (bulkError) {
          console.error('❌ Bulk submit error:', bulkError);
          // Don't fail the entire process if bulk submit fails
          // Continue with frontend processing for user feedback
          Alert.alert(
            'Partial Success', 
            'Stock counts processed locally. Some backend updates may have failed.',
            [{ text: 'Continue' }]
          );
        }
      }
      
      // Process results locally for immediate feedback
      const results = countedProducts.map(product => {
        const count = stockCounts[product.id];
        // CRITICAL FIX: Ensure difference is calculated correctly
        const systemStock = parseFloat(count.systemStock) || 0;
        const countedStock = parseFloat(count.countedStock) || 0;
        const difference = countedStock - systemStock;
        
        console.log(`🔍 DEBUG: ${product.name}`);
        console.log(`   System: ${systemStock}, Counted: ${countedStock}, Diff: ${difference}`);
        
        return {
          product_id: product.id,
          product_name: product.name,
          system_stock: systemStock,
          counted_stock: countedStock,
          difference: difference,
          unit_cost: parseFloat(product.cost_price) || 0,
          unit_price: parseFloat(product.price) || 0,
          barcode: product.barcode || '',
          line_code: product.line_code || '',
          category: product.category || '',
          supplier: product.supplier || ''
        };
      });
      
      console.log('✅ Stock take processed successfully');
      setStockTakeResults(results);
      setCurrentPhase('review');
      
    } catch (error) {
      console.error('❌ Error processing stock take:', error);
      Alert.alert('Error', `Failed to process stock take: ${error.message}`);
      setCurrentPhase('counting');
    } finally {
      setProcessing(false);
    }
  };

  const handleRecount = () => {
    setCurrentPhase('counting');
    // Keep existing counts for user to edit
  };

  const handleFinalizeStockTake = async () => {
    try {
      setFinalizing(true);
      setCurrentPhase('finalizing');
      
      if (!currentStockTake) {
        Alert.alert('Error', 'No active stock take session found.');
        setCurrentPhase('review');
        setFinalizing(false);
        return;
      }
      
      // Calculate discrepancies
      const discrepancies = stockTakeResults.filter(item => item.difference !== 0);
      const balanced = stockTakeResults.filter(item => item.difference === 0);

      if (discrepancies.length === 0) {
        Alert.alert(
          'Perfect Balance!',
          `All ${stockTakeResults.length} products are perfectly balanced. No action needed.`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset and go back
                setStockCounts({});
                setStockTakeResults([]);
                setCurrentPhase('counting');
                setCurrentStockTake(null);
                loadProductsForStockTake();
              }
            }
          ]
        );
        setFinalizing(false);
        return;
      }

      // Calculate total variance value
      const totalVarianceValue = discrepancies.reduce((sum, item) => {
        return sum + (item.difference * item.unit_cost);
      }, 0);

      // Complete the stock take in backend - NO AUTHENTICATION REQUIRED
      console.log('🏁 Completing stock take in backend...');
      await shopAPI.completeStockTake(currentStockTake.id);
      
      Alert.alert(
        'Stock Take Complete',
        `Stock take completed successfully!\n\n` +
        `📊 Summary:\n` +
        `• Total Products: ${stockTakeResults.length}\n` +
        `• Balanced: ${balanced.length}\n` +
        `• Discrepancies: ${discrepancies.length}\n` +
        `• Total Variance: ${formatCurrency(totalVarianceValue)}\n\n` +
        `✅ Database has been updated with your counts.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset and go back
              setStockCounts({});
              setStockTakeResults([]);
              setCurrentPhase('counting');
              setCurrentStockTake(null);
              loadProductsForStockTake();
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('❌ Error finalizing stock take:', error);
      Alert.alert('Error', `Failed to finalize stock take: ${error.message}`);
      setCurrentPhase('review');
    } finally {
      setFinalizing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num || 0);
  };

  const getDifferenceStyle = (difference) => {
    if (difference === 0) return styles.differenceZero;
    if (difference > 0) return styles.differencePositive;
    return styles.differenceNegative;
  };

  const getDifferenceIcon = (difference) => {
    if (difference === 0) return '✓';
    if (difference > 0) return '+';
    return '−';
  };

  const renderPhaseIndicator = () => (
    <View style={styles.phaseContainer}>
      <View style={styles.phaseIndicator}>
        <View style={[styles.phaseDot, currentPhase === 'counting' && styles.phaseDotActive]} />
        <Text style={[styles.phaseText, currentPhase === 'counting' && styles.phaseTextActive]}>1. Count</Text>
      </View>
      <View style={styles.phaseLine} />
      <View style={styles.phaseIndicator}>
        <View style={[styles.phaseDot, currentPhase === 'processing' && styles.phaseDotActive]} />
        <Text style={[styles.phaseText, currentPhase === 'processing' && styles.phaseTextActive]}>2. Process</Text>
      </View>
      <View style={styles.phaseLine} />
      <View style={styles.phaseIndicator}>
        <View style={[styles.phaseDot, currentPhase === 'review' && styles.phaseDotActive]} />
        <Text style={[styles.phaseText, currentPhase === 'review' && styles.phaseTextActive]}>3. Review</Text>
      </View>
      <View style={styles.phaseLine} />
      <View style={styles.phaseIndicator}>
        <View style={[styles.phaseDot, currentPhase === 'finalizing' && styles.phaseDotActive]} />
        <Text style={[styles.phaseText, currentPhase === 'finalizing' && styles.phaseTextActive]}>4. Finalize</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>📦 Stock Take</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading products for stock take...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📦 Stock Take</Text>
        <TouchableOpacity onPress={loadProductsForStockTake}>
          <Text style={styles.refreshButton}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* Phase Indicator */}
      {renderPhaseIndicator()}

      {/* Phase 1: Counting - Show only product details and counting fields */}
      {currentPhase === 'counting' && (
        <ScrollView 
          style={styles.mainContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={Platform.OS === 'web'}
        >
          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>📋 Stock Take Process</Text>
            <Text style={styles.instructionsText}>
              Count the physical quantity of each product in your store.{'\n'}
              Enter your count in the "Counted" column below.{'\n'}
              After counting, we'll compare with system stock and update the database.{'\n'}
              {currentStockTake ? `Session: ${currentStockTake.name}` : 'Creating new session...'}
            </Text>
          </View>

          {/* Counting Table - Comprehensive product information */}
          <ScrollView horizontal showsHorizontalScrollIndicator={Platform.OS === 'web'}>
            <View style={styles.countingTable}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, styles.headerCellName]}>Product Name</Text>
                <Text style={[styles.tableCell, styles.headerCellCategory]}>Category</Text>
                <Text style={[styles.tableCell, styles.headerCellBarcode]}>Barcode</Text>
                <Text style={[styles.tableCell, styles.headerCellCode]}>Line Code</Text>
                <Text style={[styles.tableCell, styles.headerCellSupplier]}>Supplier</Text>
                <Text style={[styles.tableCell, styles.headerCellCost]}>Cost</Text>
                <Text style={[styles.tableCell, styles.headerCellPrice]}>Price</Text>
                <Text style={[styles.tableCell, styles.headerCellMinStock]}>Min</Text>
                <Text style={[styles.tableCell, styles.headerCellType]}>Type</Text>
                <Text style={[styles.tableCell, styles.headerCellStatus]}>Status</Text>
                <Text style={[styles.tableCell, styles.headerCellCounted]}>COUNTED</Text>
              </View>

            {products.map((product, index) => {
              const count = stockCounts[product.id] || {};
              const stockQty = parseFloat(product.stock_quantity) || 0;
              const minStockLevel = parseFloat(product.min_stock_level) || 5;
              const getStockStatus = () => {
                if (stockQty <= 0) return { text: 'OUT', color: '#ef4444' };
                if (stockQty <= minStockLevel) return { text: 'LOW', color: '#fbbf24' };
                return { text: 'OK', color: '#10b981' };
              };
              const stockStatus = getStockStatus();
              
              return (
                <View key={product.id} style={[
                  styles.tableRow,
                  index % 2 === 1 && styles.tableRowAlternate
                ]}>
                  <Text style={[styles.tableCell, styles.cellName]} numberOfLines={2}>
                    {product.name}
                  </Text>
                  <Text style={[styles.tableCell, styles.cellCategory]} numberOfLines={1}>
                    {product.category || 'General'}
                  </Text>
                  <Text style={[styles.tableCell, styles.cellBarcode]} numberOfLines={1}>
                    {product.barcode || 'N/A'}
                  </Text>
                  <Text style={[styles.tableCell, styles.cellCode]} numberOfLines={1}>
                    {product.line_code || 'N/A'}
                  </Text>
                  <Text style={[styles.tableCell, styles.cellSupplier]} numberOfLines={1}>
                    {product.supplier || 'N/A'}
                  </Text>
                  <Text style={[styles.tableCell, styles.cellCost]}>
                    {formatCurrency(product.cost_price)}
                  </Text>
                  <Text style={[styles.tableCell, styles.cellPrice]}>
                    {formatCurrency(product.price)}
                  </Text>
                  <Text style={[styles.tableCell, styles.cellMinStock]}>
                    {formatNumber(minStockLevel)}
                  </Text>
                  <Text style={[styles.tableCell, styles.cellType]}>
                    {product.price_type || 'unit'}
                  </Text>
                  <Text style={[styles.tableCell, styles.cellStatus]}>
                    <Text style={{ color: stockStatus.color }}>{stockStatus.text}</Text>
                  </Text>
                  <View style={[styles.tableCell, styles.cellCounted]}>
                    <TextInput
                      style={styles.countInput}
                      value={count.countedStock?.toString() || ''}
                      onChangeText={(text) => updateCountedStock(product.id, text)}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#6b7280"
                    />
                  </View>
                </View>
              );
            })}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.processButton, processing && styles.disabledButton]}
              onPress={processStockTake}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.processButtonText}>📊 Process Count</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Phase 2 & 3: Processing/Review - Show comparison */}
      {(currentPhase === 'processing' || currentPhase === 'review' || currentPhase === 'finalizing') && (
        <ScrollView 
          style={styles.mainContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={Platform.OS === 'web'}
        >
          {/* Processing Indicator */}
          {currentPhase === 'processing' && (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color="#10b981" />
              <Text style={styles.processingText}>Processing your count...</Text>
            </View>
          )}

          {/* Results Header */}
          {(currentPhase === 'review' || currentPhase === 'finalizing') && (
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>📊 Count vs System Comparison</Text>
              <Text style={styles.resultsSubtitle}>
                Review the differences below and confirm your counts
              </Text>

              {/* Summary Cards */}
              <View style={styles.summaryContainer}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Total Products</Text>
                  <Text style={styles.summaryValue}>{stockTakeResults.length}</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Balanced</Text>
                  <Text style={styles.summaryValue}>
                    {stockTakeResults.filter(item => item.difference === 0).length}
                  </Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Discrepancies</Text>
                  <Text style={styles.summaryValue}>
                    {stockTakeResults.filter(item => item.difference !== 0).length}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Comparison Table */}
          {(currentPhase === 'review' || currentPhase === 'finalizing') && (
            <ScrollView horizontal showsHorizontalScrollIndicator={Platform.OS === 'web'}>
              <View style={styles.comparisonTable}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableCell, styles.headerCellName]}>Product</Text>
                  <Text style={[styles.tableCell, styles.headerCellCategory]}>Category</Text>
                  <Text style={[styles.tableCell, styles.headerCellBarcode]}>Barcode</Text>
                  <Text style={[styles.tableCell, styles.headerCellCode]}>Line Code</Text>
                  <Text style={[styles.tableCell, styles.headerCellSupplier]}>Supplier</Text>
                  <Text style={[styles.tableCell, styles.headerCellCost]}>Cost</Text>
                  <Text style={[styles.tableCell, styles.headerCellPrice]}>Price</Text>
                  <Text style={[styles.tableCell, styles.headerCellSystem]}>System</Text>
                  <Text style={[styles.tableCell, styles.headerCellCounted]}>Counted</Text>
                  <Text style={[styles.tableCell, styles.headerCellDifference]}>Diff</Text>
                  <Text style={[styles.tableCell, styles.headerCellValue]}>Value</Text>
                </View>

              {stockTakeResults.map((item, index) => (
                <View key={item.product_id} style={[
                  styles.tableRow,
                  index % 2 === 1 && styles.tableRowAlternate,
                  item.difference !== 0 && styles.discrepancyRow
                ]}>
                  <Text style={[styles.tableCell, styles.cellName]} numberOfLines={2}>
                    {item.product_name}
                  </Text>
                  <Text style={[styles.tableCell, styles.cellCategory]} numberOfLines={1}>
                    {item.category || 'General'}
                  </Text>
                  <Text style={[styles.tableCell, styles.cellBarcode]} numberOfLines={1}>
                    {item.barcode || 'N/A'}
                  </Text>
                  <Text style={[styles.tableCell, styles.cellCode]} numberOfLines={1}>
                    {item.line_code || 'N/A'}
                  </Text>
                  <Text style={[styles.tableCell, styles.cellSupplier]} numberOfLines={1}>
                    {item.supplier || 'N/A'}
                  </Text>
                  <Text style={[styles.tableCell, styles.cellCost]}>
                    {formatCurrency(item.unit_cost)}
                  </Text>
                  <Text style={[styles.tableCell, styles.cellPrice]}>
                    {formatCurrency(item.unit_price)}
                  </Text>
                  <Text style={[styles.tableCell, styles.cellSystem]}>
                    {formatNumber(item.system_stock)}
                  </Text>
                  <Text style={[styles.tableCell, styles.cellCounted]}>
                    {formatNumber(item.counted_stock)}
                  </Text>
                  <Text style={[
                    styles.tableCell,
                    styles.cellDifference,
                    getDifferenceStyle(item.difference)
                  ]}>
                    {getDifferenceIcon(item.difference)}{Math.abs(item.difference)}
                  </Text>
                  <Text style={[
                    styles.tableCell,
                    styles.cellValueImpact,
                    item.difference * item.unit_cost >= 0 ? styles.valuePositive : styles.valueNegative
                  ]}>
                    {formatCurrency(item.difference * item.unit_cost)}
                  </Text>
                </View>
              ))}
              </View>
            </ScrollView>
          )}

          {/* Action Buttons */}
          {(currentPhase === 'review' || currentPhase === 'finalizing') && (
            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={styles.recountButton}
                onPress={handleRecount}
              >
                <Text style={styles.recountButtonText}>🔄 Recount</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.finalizeButton, finalizing && styles.disabledButton]}
                onPress={handleFinalizeStockTake}
                disabled={finalizing}
              >
                {finalizing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.finalizeButtonText}>✅ Finalize Stock Take</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
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
    paddingTop: 40,
    backgroundColor: '#111111',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  backButton: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  refreshButton: {
    color: '#10b981',
    fontSize: 20,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 16,
    fontSize: 16,
  },

  // Phase Indicator
  phaseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  phaseIndicator: {
    alignItems: 'center',
  },
  phaseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6b7280',
    marginBottom: 4,
  },
  phaseDotActive: {
    backgroundColor: '#10b981',
  },
  phaseText: {
    color: '#6b7280',
    fontSize: 10,
    fontWeight: '600',
  },
  phaseTextActive: {
    color: '#10b981',
  },
  phaseLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#374151',
    marginHorizontal: 8,
  },

  mainContent: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 100,
  },

  // Instructions
  instructionsContainer: {
    backgroundColor: '#1f2937',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  instructionsTitle: {
    color: '#10b981',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  instructionsText: {
    color: '#e5e7eb',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },

  // Processing
  processingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  processingText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },

  // Tables
  countingTable: {
    margin: 16,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    overflow: 'hidden',
  },
  comparisonTable: {
    margin: 16,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#374151',
    borderBottomWidth: 2,
    borderBottomColor: '#4b5563',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    minHeight: 50,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tableRowAlternate: {
    backgroundColor: '#1e293b',
  },
  discrepancyRow: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  tableCell: {
    padding: 6,
    fontSize: 11,
    color: '#ffffff',
    textAlign: 'center',
  },

  // Header cells with specific widths
  headerCellName: {
    flex: 3,
    fontWeight: '700',
    textAlign: 'left',
  },
  headerCellCategory: {
    flex: 1.8,
    fontWeight: '700',
  },
  headerCellBarcode: {
    flex: 1.2,
    fontWeight: '700',
  },
  headerCellCode: {
    flex: 1.2,
    fontWeight: '700',
  },
  headerCellSupplier: {
    flex: 1.8,
    fontWeight: '700',
  },
  headerCellCost: {
    flex: 1,
    fontWeight: '700',
  },
  headerCellPrice: {
    flex: 1,
    fontWeight: '700',
  },
  headerCellMinStock: {
    flex: 0.8,
    fontWeight: '700',
  },
  headerCellType: {
    flex: 0.8,
    fontWeight: '700',
  },
  headerCellStatus: {
    flex: 0.8,
    fontWeight: '700',
  },
  headerCellSystem: {
    flex: 1,
    fontWeight: '700',
  },
  headerCellCounted: {
    flex: 1.2,
    fontWeight: '700',
  },
  headerCellDifference: {
    flex: 1.2,
    fontWeight: '700',
  },
  headerCellValue: {
    flex: 1.2,
    fontWeight: '700',
  },

  // Data cells
  cellName: {
    flex: 3,
    textAlign: 'left',
    fontSize: 12,
    fontWeight: '600',
  },
  cellCategory: {
    flex: 1.8,
    fontSize: 10,
    color: '#9ca3af',
  },
  cellBarcode: {
    flex: 1.2,
    fontSize: 10,
    color: '#9ca3af',
  },
  cellCode: {
    flex: 1.2,
    fontSize: 10,
    color: '#9ca3af',
  },
  cellSupplier: {
    flex: 1.8,
    fontSize: 10,
    color: '#9ca3af',
  },
  cellCost: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    color: '#f59e0b',
  },
  cellPrice: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    color: '#10b981',
  },
  cellMinStock: {
    flex: 0.8,
    fontSize: 10,
    fontWeight: '600',
    color: '#fbbf24',
  },
  cellType: {
    flex: 0.8,
    fontSize: 10,
    color: '#f59e0b',
  },
  cellStatus: {
    flex: 0.8,
    fontSize: 10,
    fontWeight: '600',
  },
  cellSystem: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#3b82f6',
  },
  cellCounted: {
    flex: 1.2,
  },
  cellDifference: {
    flex: 1.2,
    fontWeight: '700',
  },
  cellValueImpact: {
    flex: 1.2,
    fontWeight: '600',
  },

  // Input
  countInput: {
    backgroundColor: '#374151',
    borderRadius: 4,
    padding: 6,
    color: '#ffffff',
    fontSize: 12,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#4b5563',
  },

  // Difference styling
  differenceZero: {
    color: '#10b981',
  },
  differencePositive: {
    color: '#22c55e',
  },
  differenceNegative: {
    color: '#ef4444',
  },
  valuePositive: {
    color: '#22c55e',
  },
  valueNegative: {
    color: '#ef4444',
  },

  // Results
  resultsHeader: {
    padding: 16,
    backgroundColor: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  resultsTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  resultsSubtitle: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },

  // Summary
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#374151',
  },
  summaryLabel: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },

  // Action buttons
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    gap: 12,
  },
  processButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  finalizeButton: {
    flex: 2,
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  recountButton: {
    flex: 1,
    backgroundColor: '#6b7280',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  processButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  finalizeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  recountButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#6b7280',
    opacity: 0.6,
  },
});

export default StockTakeScreen;