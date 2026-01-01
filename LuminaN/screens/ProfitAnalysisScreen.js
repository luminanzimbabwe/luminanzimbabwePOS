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
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { shopAPI } from '../services/api';

const ProfitAnalysisScreen = () => {
  const [salesData, setSalesData] = useState([]);
  const [productsData, setProductsData] = useState([]);
  const [financialSummary, setFinancialSummary] = useState({
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    marginPercentage: 0,
    averageTransactionValue: 0,
    totalTransactions: 0,
    costDataSource: 'unknown'
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('all'); // 'today', 'week', 'month', 'all'
  const [selectedView, setSelectedView] = useState('overview'); // 'overview', 'products', 'categories', 'trends'

  const navigation = useNavigation();

  useEffect(() => {
    loadProfitAnalysisData();
  }, [selectedPeriod]);

  const loadProfitAnalysisData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading profit analysis data...');

      // Get sales data with enhanced error handling
      let allSales = [];
      try {
        const salesResponse = await shopAPI.getSales();
        console.log('📡 Raw sales response:', salesResponse);
        
        // Handle multiple possible response formats
        if (salesResponse?.data) {
          allSales = salesResponse.data.results || 
                    salesResponse.data.sales || 
                    salesResponse.data || 
                    [];
        }
        
        // Ensure it's an array
        if (!Array.isArray(allSales)) {
          console.warn('⚠️ Sales data is not an array:', typeof allSales);
          allSales = [];
        }
        
        console.log('📊 Sales data loaded:', allSales.length);
        if (allSales.length > 0) {
          console.log('📊 Sample sale:', allSales[0]);
        }
      } catch (salesError) {
        console.error('❌ Error fetching sales:', salesError);
        allSales = [];
      }
      
      // Get products data with error handling
      let products = [];
      try {
        const productsResponse = await shopAPI.getProducts();
        console.log('📦 Raw products response:', productsResponse);
        
        if (productsResponse?.data) {
          products = Array.isArray(productsResponse.data) ? productsResponse.data : [];
        }
        
        console.log('📦 Products data loaded:', products.length);
      } catch (productsError) {
        console.error('❌ Error fetching products:', productsError);
        products = [];
      }

      // Filter sales by selected period
      const filteredSales = filterSalesByPeriod(allSales, selectedPeriod);
      console.log('🔍 Filtered sales for period', selectedPeriod + ':', filteredSales.length);

      // Calculate financial metrics
      const summary = calculateFinancialSummary(filteredSales);
      console.log('💰 Calculated summary:', summary);
      
      setSalesData(filteredSales);
      setProductsData(products);
      setFinancialSummary(summary);

      // If no real data found, show demo data for demonstration
      if (allSales.length === 0) {
        console.log('ℹ️ No sales data found, using demo data for demonstration');
        
        // Generate demo sales data
        const demoSales = generateDemoSalesData();
        const filteredDemoSales = filterSalesByPeriod(demoSales, selectedPeriod);
        const demoSummary = calculateFinancialSummary(filteredDemoSales);
        
        setSalesData(filteredDemoSales);
        setProductsData([]);
        setFinancialSummary({
          ...demoSummary,
          costDataSource: 'demo'
        });
        
        console.log('📊 Using demo data:', demoSummary);
      }

    } catch (error) {
      console.error('❌ Error loading profit analysis data:', error);
      Alert.alert('Error', `Failed to load profit data: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterSalesByPeriod = (sales, period) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (period) {
      case 'today':
        return sales.filter(sale => {
          const saleDate = new Date(sale.created_at || sale.sale_date);
          return saleDate >= today;
        });
      case 'week':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return sales.filter(sale => {
          const saleDate = new Date(sale.created_at || sale.sale_date);
          return saleDate >= weekAgo;
        });
      case 'month':
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        return sales.filter(sale => {
          const saleDate = new Date(sale.created_at || sale.sale_date);
          return saleDate >= monthAgo;
        });
      default:
        return sales;
    }
  };

  const calculateFinancialSummary = (sales) => {
    console.log('💰 Calculating financial summary for', sales.length, 'sales');
    
    let totalRevenue = 0;
    let totalCost = 0;
    let totalTransactions = sales.length;
    let costDataSource = 'estimated';
    let processedSales = 0;

    sales.forEach((sale, index) => {
      console.log(`💰 Processing sale ${index + 1}:`, sale);
      
      // Handle different possible field names for sale amount
      const saleAmount = parseFloat(
        sale.total_amount || 
        sale.amount || 
        sale.total || 
        sale.price || 
        0
      );
      
      console.log(`💰 Sale amount: ${saleAmount} (from field: ${sale.total_amount ? 'total_amount' : sale.amount ? 'amount' : 'other'})`);
      
      if (saleAmount > 0) {
        totalRevenue += saleAmount;
        processedSales++;

        // Calculate cost using enhanced logic from SalesLedgerScreen
        let costPrice = 0;

        // Method 1: Use cost prices from sale items (most accurate)
        if (sale.items && sale.items.length > 0) {
          console.log(`💰 Sale has ${sale.items.length} items`);
          costPrice = sale.items.reduce((itemSum, item, itemIndex) => {
            const itemCost = parseFloat(
              item.product_cost_price || 
              item.cost_price || 
              item.cost || 
              0
            );
            const quantity = parseFloat(item.quantity || 1);
            const itemTotal = itemCost * quantity;
            console.log(`💰 Item ${itemIndex + 1}: cost=${itemCost}, qty=${quantity}, total=${itemTotal}`);
            return itemSum + itemTotal;
          }, 0);
          if (costPrice > 0) costDataSource = 'actual';
        }
        // Method 2: Check direct cost_price field
        else if (sale.cost_price !== undefined && sale.cost_price !== null && sale.cost_price !== '') {
          costPrice = parseFloat(sale.cost_price) || 0;
          if (costPrice > 0) costDataSource = 'actual';
        }
        // Method 3: Fallback estimation
        else if (saleAmount > 0) {
          costPrice = saleAmount * 0.6; // Estimate 60% cost (40% margin)
          console.log(`💰 Using estimated cost: ${costPrice} (60% of ${saleAmount})`);
        }

        totalCost += costPrice;
        console.log(`💰 Sale ${index + 1} - Revenue: ${saleAmount}, Cost: ${costPrice}, Profit: ${saleAmount - costPrice}`);
      } else {
        console.log(`💰 Sale ${index + 1} has no valid amount, skipping`);
      }
    });

    const totalProfit = totalRevenue - totalCost;
    const marginPercentage = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    const summary = {
      totalRevenue,
      totalCost,
      totalProfit,
      marginPercentage,
      averageTransactionValue,
      totalTransactions,
      costDataSource,
      processedSales
    };
    
    console.log('💰 Final summary:', summary);
    return summary;
  };

  const getTopProfitableProducts = () => {
    const productProfits = {};
    
    salesData.forEach(sale => {
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach(item => {
          const productName = item.name || item.product_name || 'Unknown Product';
          const revenue = (parseFloat(item.price) || 0) * (parseFloat(item.quantity) || 1);
          const cost = (parseFloat(item.product_cost_price) || 0) * (parseFloat(item.quantity) || 1);
          const profit = revenue - cost;

          if (!productProfits[productName]) {
            productProfits[productName] = {
              name: productName,
              totalRevenue: 0,
              totalCost: 0,
              totalProfit: 0,
              quantity: 0
            };
          }

          productProfits[productName].totalRevenue += revenue;
          productProfits[productName].totalCost += cost;
          productProfits[productName].totalProfit += profit;
          productProfits[productName].quantity += parseFloat(item.quantity) || 1;
        });
      }
    });

    return Object.values(productProfits)
      .sort((a, b) => b.totalProfit - a.totalProfit)
      .slice(0, 10);
  };

  const getCategoryAnalysis = () => {
    const categoryData = {};
    
    salesData.forEach(sale => {
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach(item => {
          const category = item.category || 'Uncategorized';
          const revenue = (parseFloat(item.price) || 0) * (parseFloat(item.quantity) || 1);
          const cost = (parseFloat(item.product_cost_price) || 0) * (parseFloat(item.quantity) || 1);
          const profit = revenue - cost;

          if (!categoryData[category]) {
            categoryData[category] = {
              name: category,
              totalRevenue: 0,
              totalCost: 0,
              totalProfit: 0,
              transactions: 0
            };
          }

          categoryData[category].totalRevenue += revenue;
          categoryData[category].totalCost += cost;
          categoryData[category].totalProfit += profit;
          categoryData[category].transactions += 1;
        });
      }
    });

    return Object.values(categoryData)
      .map(cat => ({
        ...cat,
        marginPercentage: cat.totalRevenue > 0 ? (cat.totalProfit / cat.totalRevenue) * 100 : 0
      }))
      .sort((a, b) => b.totalProfit - a.totalProfit);
  };

  const formatCurrency = (amount) => {
    return `$${parseFloat(amount || 0).toFixed(2)}`;
  };

  const formatPercentage = (percentage) => {
    return `${parseFloat(percentage || 0).toFixed(1)}%`;
  };

  const getProfitColor = (profit) => {
    if (profit > 0) return '#10b981'; // Green for profit
    if (profit < 0) return '#ef4444'; // Red for loss
    return '#6b7280'; // Gray for break-even
  };

  const getMarginColor = (margin) => {
    if (margin >= 40) return '#10b981'; // Green for good margin
    if (margin >= 20) return '#f59e0b'; // Yellow for acceptable margin
    return '#ef4444'; // Red for low margin
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProfitAnalysisData();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#fff" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={onRefresh}
            disabled={refreshing}
          >
            <Icon name={refreshing ? "sync" : "refresh"} size={24} color={refreshing ? "#94a3b8" : "#fff"} />
            <Text style={[styles.refreshButtonText, refreshing && { color: '#94a3b8' }]}>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.loadingContainer}>
          <Icon name="sync" size={48} color="#3b82f6" />
          <Text style={styles.loadingText}>Analyzing profit data...</Text>
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
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#fff" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={refreshing}
        >
          <Icon name={refreshing ? "sync" : "refresh"} size={24} color={refreshing ? "#94a3b8" : "#fff"} />
          <Text style={[styles.refreshButtonText, refreshing && { color: '#94a3b8' }]}>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>📊 Profit Analysis</Text>
        <Text style={styles.subtitle}>Revenue, costs & profit insights</Text>
      </View>

      {/* Period Filter */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {[
            { key: 'today', label: 'Today' },
            { key: 'week', label: 'This Week' },
            { key: 'month', label: 'This Month' },
            { key: 'all', label: 'All Time' }
          ].map(period => (
            <TouchableOpacity
              key={period.key}
              style={[styles.filterChip, selectedPeriod === period.key && styles.activeFilterChip]}
              onPress={() => setSelectedPeriod(period.key)}
            >
              <Text style={[styles.filterText, selectedPeriod === period.key && styles.activeFilterText]}>
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* View Selector */}
      <View style={styles.tabContainer}>
        {[
          { key: 'overview', label: 'Overview', icon: 'dashboard' },
          { key: 'products', label: 'Products', icon: 'inventory' },
          { key: 'categories', label: 'Categories', icon: 'category' }
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, selectedView === tab.key && styles.activeTab]}
            onPress={() => setSelectedView(tab.key)}
          >
            <Icon 
              name={tab.icon} 
              size={16} 
              color={selectedView === tab.key ? '#fff' : '#94a3b8'} 
            />
            <Text style={[styles.tabText, selectedView === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {selectedView === 'overview' && (
        <View style={styles.content}>
          {/* Key Metrics Cards */}
          <View style={styles.metricsContainer}>
            <View style={[styles.metricCard, { borderLeftColor: '#10b981' }]}>
              <View style={styles.metricHeader}>
                <Icon name="attach-money" size={24} color="#10b981" />
                <Text style={styles.metricTitle}>Total Revenue</Text>
              </View>
              <Text style={styles.metricValue}>{formatCurrency(financialSummary.totalRevenue)}</Text>
              <Text style={styles.metricSubtitle}>{financialSummary.totalTransactions} transactions</Text>
            </View>

            <View style={[styles.metricCard, { borderLeftColor: getProfitColor(financialSummary.totalProfit) }]}>
              <View style={styles.metricHeader}>
                <Icon name="trending-up" size={24} color={getProfitColor(financialSummary.totalProfit)} />
                <Text style={styles.metricTitle}>Net Profit</Text>
              </View>
              <Text style={[styles.metricValue, { color: getProfitColor(financialSummary.totalProfit) }]}>
                {formatCurrency(financialSummary.totalProfit)}
              </Text>
              <Text style={styles.metricSubtitle}>After costs</Text>
            </View>

            <View style={[styles.metricCard, { borderLeftColor: getMarginColor(financialSummary.marginPercentage) }]}>
              <View style={styles.metricHeader}>
                <Icon name="percent" size={24} color={getMarginColor(financialSummary.marginPercentage)} />
                <Text style={styles.metricTitle}>Profit Margin</Text>
              </View>
              <Text style={[styles.metricValue, { color: getMarginColor(financialSummary.marginPercentage) }]}>
                {formatPercentage(financialSummary.marginPercentage)}
              </Text>
              <Text style={styles.metricSubtitle}>Profit / Revenue</Text>
            </View>

            <View style={[styles.metricCard, { borderLeftColor: '#3b82f6' }]}>
              <View style={styles.metricHeader}>
                <Icon name="shopping-cart" size={24} color="#3b82f6" />
                <Text style={styles.metricTitle}>Avg Transaction</Text>
              </View>
              <Text style={styles.metricValue}>{formatCurrency(financialSummary.averageTransactionValue)}</Text>
              <Text style={styles.metricSubtitle}>Per sale</Text>
            </View>
          </View>

          {/* Cost Analysis */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💰 Cost Analysis</Text>
            <View style={styles.costBreakdownCard}>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Revenue:</Text>
                <Text style={styles.costValue}>{formatCurrency(financialSummary.totalRevenue)}</Text>
              </View>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Total Costs:</Text>
                <Text style={[styles.costValue, { color: '#ef4444' }]}>{formatCurrency(financialSummary.totalCost)}</Text>
              </View>
              <View style={styles.costDivider} />
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Net Profit:</Text>
                <Text style={[styles.costValue, { color: getProfitColor(financialSummary.totalProfit), fontWeight: 'bold' }]}>
                  {formatCurrency(financialSummary.totalProfit)}
                </Text>
              </View>
              
              <View style={styles.costSourceInfo}>
                <Text style={styles.costSourceText}>
                  📊 Cost data source: {financialSummary.costDataSource === 'actual' ? 'Actual costs from sales' : 'Estimated (60% of revenue)'}
                </Text>
              </View>
            </View>
          </View>

          {/* Performance Indicators */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📈 Performance Indicators</Text>
            <View style={styles.performanceGrid}>
              <View style={styles.performanceCard}>
                <Text style={styles.performanceValue}>
                  {financialSummary.totalRevenue > 0 ? formatPercentage((financialSummary.totalCost / financialSummary.totalRevenue) * 100) : '0%'}
                </Text>
                <Text style={styles.performanceLabel}>Cost Ratio</Text>
                <Text style={styles.performanceSubtext}>Costs as % of revenue</Text>
              </View>
              
              <View style={styles.performanceCard}>
                <Text style={styles.performanceValue}>
                  {financialSummary.totalCost > 0 ? formatPercentage((financialSummary.totalProfit / financialSummary.totalCost) * 100) : '0%'}
                </Text>
                <Text style={styles.performanceLabel}>ROI</Text>
                <Text style={styles.performanceSubtext}>Return on investment</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {selectedView === 'products' && (
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>🏆 Top Profitable Products</Text>
          
          {getTopProfitableProducts().length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="inventory" size={64} color="#6b7280" />
              <Text style={styles.emptyText}>No product data available</Text>
              <Text style={styles.emptySubtext}>Sales with item details are needed for product analysis</Text>
            </View>
          ) : (
            getTopProfitableProducts().map((product, index) => (
              <View key={product.name} style={styles.productCard}>
                <View style={styles.productHeader}>
                  <View style={styles.productRank}>
                    <Text style={styles.rankText}>#{index + 1}</Text>
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productQuantity}>{product.quantity.toFixed(1)} units sold</Text>
                  </View>
                  <View style={styles.productProfit}>
                    <Text style={[styles.profitValue, { color: getProfitColor(product.totalProfit) }]}>
                      {formatCurrency(product.totalProfit)}
                    </Text>
                    <Text style={styles.profitLabel}>Profit</Text>
                  </View>
                </View>
                
                <View style={styles.productMetrics}>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Revenue:</Text>
                    <Text style={styles.metricValue}>{formatCurrency(product.totalRevenue)}</Text>
                  </View>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Cost:</Text>
                    <Text style={styles.metricValue}>{formatCurrency(product.totalCost)}</Text>
                  </View>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Margin:</Text>
                    <Text style={[styles.metricValue, { color: getMarginColor((product.totalProfit / product.totalRevenue) * 100) }]}>
                      {formatPercentage((product.totalProfit / product.totalRevenue) * 100)}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {selectedView === 'categories' && (
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>📊 Category Performance</Text>
          
          {getCategoryAnalysis().length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="category" size={64} color="#6b7280" />
              <Text style={styles.emptyText}>No category data available</Text>
              <Text style={styles.emptySubtext}>Products need categories for analysis</Text>
            </View>
          ) : (
            getCategoryAnalysis().map((category, index) => (
              <View key={category.name} style={styles.categoryCard}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.categoryTransactions}>{category.transactions} sales</Text>
                </View>
                
                <View style={styles.categoryMetrics}>
                  <View style={styles.categoryMetricRow}>
                    <Text style={styles.categoryMetricLabel}>Revenue:</Text>
                    <Text style={styles.categoryMetricValue}>{formatCurrency(category.totalRevenue)}</Text>
                  </View>
                  <View style={styles.categoryMetricRow}>
                    <Text style={styles.categoryMetricLabel}>Profit:</Text>
                    <Text style={[styles.categoryMetricValue, { color: getProfitColor(category.totalProfit) }]}>
                      {formatCurrency(category.totalProfit)}
                    </Text>
                  </View>
                  <View style={styles.categoryMetricRow}>
                    <Text style={styles.categoryMetricLabel}>Margin:</Text>
                    <Text style={[styles.categoryMetricValue, { color: getMarginColor(category.marginPercentage) }]}>
                      {formatPercentage(category.marginPercentage)}
                    </Text>
                  </View>
                </View>
                
                {/* Progress bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill,
                        { 
                          width: `${Math.min((category.totalRevenue / Math.max(...getCategoryAnalysis().map(c => c.totalRevenue))) * 100, 100)}%`,
                          backgroundColor: getMarginColor(category.marginPercentage)
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressLabel}>Revenue share</Text>
                </View>
              </View>
            ))
          )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  titleContainer: {
    padding: 20,
    paddingBottom: 16,
    backgroundColor: '#0f172a',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterContent: {
    paddingRight: 16,
  },
  filterChip: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    elevation: 2,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  activeFilterChip: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  filterText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  activeFilterText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#3b82f6',
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#374151',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 11,
    color: '#64748b',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  costBreakdownCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  costLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  costValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  costDivider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 8,
  },
  costSourceInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  costSourceText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },
  performanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  performanceCard: {
    width: '48%',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  performanceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  performanceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 2,
  },
  performanceSubtext: {
    fontSize: 11,
    color: '#64748b',
  },
  productCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  productRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  productQuantity: {
    fontSize: 12,
    color: '#94a3b8',
  },
  productProfit: {
    alignItems: 'flex-end',
  },
  profitValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  profitLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  productMetrics: {
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 13,
    color: '#94a3b8',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  categoryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  categoryTransactions: {
    fontSize: 12,
    color: '#94a3b8',
  },
  categoryMetrics: {
    marginBottom: 12,
  },
  categoryMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  categoryMetricLabel: {
    fontSize: 13,
    color: '#94a3b8',
  },
  categoryMetricValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#374151',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#374151',
    borderStyle: 'dashed',
    margin: 16,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#64748b',
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
});

export default ProfitAnalysisScreen;