import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { shopAPI } from '../services/api';

const DemandForecastingScreen = () => {
  const [salesData, setSalesData] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPeriod, setSelectedPeriod] = useState('30'); // days to forecast
  const [forecastingMethod, setForecastingMethod] = useState('moving_average'); // 'moving_average', 'exponential_smoothing', 'linear_regression'
  const [showFilters, setShowFilters] = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);
  const [selectedProductForChart, setSelectedProductForChart] = useState(null);
  
  // Forecast results
  const [forecastResults, setForecastResults] = useState([]);
  const [summaryStats, setSummaryStats] = useState({
    totalProducts: 0,
    highDemandProducts: 0,
    lowDemandProducts: 0,
    averageGrowthRate: 0,
    seasonalProducts: 0
  });

  const navigation = useNavigation();

  // Categories for filtering
  const categories = [
    'All',
    'Fresh Produce',
    'Bakery & Pastry',
    'Meat & Poultry',
    'Seafood',
    'Dairy Products',
    'Beverages',
    'Dry Goods & Groceries',
    'Cleaning Supplies',
    'Packaging Materials',
    'Office Supplies',
    'Equipment & Maintenance',
    'Other'
  ];

  // Forecasting methods
  const forecastingMethods = [
    { key: 'moving_average', label: 'Moving Average', description: 'Simple average of recent periods' },
    { key: 'exponential_smoothing', label: 'Exponential Smoothing', description: 'Weighted average with recent data having more weight' },
    { key: 'linear_regression', label: 'Linear Regression', description: 'Trend-based projection using least squares' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading demand forecasting data...');

      // Load sales data with enhanced error handling
      let sales = [];
      try {
        const salesResponse = await shopAPI.getSales();
        console.log('📡 Raw sales response:', salesResponse);
        
        if (salesResponse?.data) {
          sales = salesResponse.data.results || 
                  salesResponse.data.sales || 
                  salesResponse.data || 
                  [];
        }
        
        if (!Array.isArray(sales)) {
          console.warn('⚠️ Sales data is not an array:', typeof sales);
          sales = [];
        }
        
        console.log('📊 Sales data loaded:', sales.length);
        if (sales.length > 0) {
          console.log('📊 Sample sale:', sales[0]);
        }
      } catch (salesError) {
        console.error('❌ Error fetching sales:', salesError);
        sales = [];
      }
      
      // Load products with error handling
      let productsData = [];
      try {
        const productsResponse = await shopAPI.getProducts();
        console.log('📦 Raw products response:', productsResponse);
        
        if (productsResponse?.data) {
          productsData = Array.isArray(productsResponse.data) ? productsResponse.data : [];
        }
        
        console.log('📦 Products data loaded:', productsData.length);
      } catch (productsError) {
        console.error('❌ Error fetching products:', productsError);
        productsData = [];
      }

      // Generate forecast data
      const forecasts = generateForecastData(sales, productsData);
      setForecastResults(forecasts);
      
      setSalesData(sales);
      setProducts(productsData);

      console.log('✅ Demand forecasting data loaded:', forecasts.length);
      
      // Show info if no data found
      if (sales.length === 0) {
        console.log('ℹ️ No sales data found for demand forecasting');
        setForecastResults([]);
      }

    } catch (error) {
      console.error('❌ Error loading demand forecasting data:', error);
      Alert.alert('Error', `Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateForecastData = (salesData, productsData) => {
    const forecasts = [];
    
    // Group sales by product
    const salesByProduct = new Map();
    salesData.forEach(sale => {
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach(item => {
          const productId = item.product_id || item.id;
          const productName = item.name || item.product_name || 'Unknown Product';
          
          if (!salesByProduct.has(productId)) {
            salesByProduct.set(productId, {
              productId,
              productName,
              category: item.category || 'Other',
              sales: [],
              totalSales: 0
            });
          }
          
          const productData = salesByProduct.get(productId);
          productData.sales.push({
            date: new Date(sale.created_at || sale.sale_date),
            quantity: parseFloat(item.quantity) || 0,
            revenue: parseFloat(item.price || 0) * parseFloat(item.quantity || 0)
          });
          productData.totalSales += parseFloat(item.quantity) || 0;
        });
      }
    });

    // Generate forecasts for each product
    salesByProduct.forEach((productData, productId) => {
      // Sort sales by date
      productData.sales.sort((a, b) => a.date - b.date);
      
      // Calculate forecast
      const forecast = calculateForecast(productData.sales, parseInt(selectedPeriod), forecastingMethod);
      
      // Determine trend
      const trend = calculateTrend(productData.sales);
      
      // Check for seasonality (simple check - products with sales in different months)
      const seasonal = isSeasonal(productData.sales);
      
      // Risk assessment
      const riskLevel = assessRisk(forecast, trend, productData.totalSales);
      
      forecasts.push({
        id: productId,
        productName: productData.productName,
        category: productData.category,
        currentSales: productData.totalSales,
        forecastQuantity: forecast.quantity,
        forecastRevenue: forecast.revenue,
        confidence: forecast.confidence,
        trend: trend,
        seasonal: seasonal,
        riskLevel: riskLevel,
        recommendedStock: Math.ceil(forecast.quantity * 1.2), // 20% buffer
        growthRate: trend.growthRate,
        dataPoints: productData.sales.length,
        historicalData: productData.sales,
        forecastData: forecast.forecastData
      });
    });

    // Calculate summary statistics
    const stats = {
      totalProducts: forecasts.length,
      highDemandProducts: forecasts.filter(f => f.forecastQuantity > 100).length,
      lowDemandProducts: forecasts.filter(f => f.forecastQuantity < 10).length,
      averageGrowthRate: forecasts.reduce((sum, f) => sum + f.growthRate, 0) / forecasts.length || 0,
      seasonalProducts: forecasts.filter(f => f.seasonal).length
    };
    setSummaryStats(stats);

    return forecasts.sort((a, b) => b.forecastQuantity - a.forecastQuantity);
  };

  const calculateForecast = (sales, periods, method) => {
    if (sales.length === 0) {
      return {
        quantity: 0,
        revenue: 0,
        confidence: 0,
        forecastData: []
      };
    }

    // Aggregate sales by month
    const monthlySales = aggregateSalesByMonth(sales);
    const monthlyValues = monthlySales.map(m => m.quantity);
    
    let forecastValue = 0;
    let confidence = 0;
    let forecastData = [];

    switch (method) {
      case 'moving_average':
        forecastValue = calculateMovingAverage(monthlyValues, periods);
        confidence = Math.min(95, 60 + (monthlyValues.length * 5)); // Higher confidence with more data
        break;
      case 'exponential_smoothing':
        forecastValue = calculateExponentialSmoothing(monthlyValues, periods);
        confidence = Math.min(90, 50 + (monthlyValues.length * 4));
        break;
      case 'linear_regression':
        const regression = calculateLinearRegression(monthlyValues);
        forecastValue = Math.max(0, regression.slope * (monthlyValues.length + periods) + regression.intercept);
        confidence = Math.min(85, 40 + (monthlyValues.length * 3));
        break;
      default:
        forecastValue = calculateMovingAverage(monthlyValues, periods);
        confidence = 60;
    }

    // Generate forecast data points
    for (let i = 0; i < periods; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i + 1);
      forecastData.push({
        date: date.toISOString().split('T')[0],
        quantity: Math.max(0, forecastValue * (0.8 + Math.random() * 0.4)), // Add some variance
        type: 'forecast'
      });
    }

    // Calculate average price from historical data
    const avgPrice = sales.reduce((sum, sale) => sum + (sale.revenue / sale.quantity), 0) / sales.length || 10;
    
    return {
      quantity: forecastValue,
      revenue: forecastValue * avgPrice,
      confidence: confidence,
      forecastData: forecastData
    };
  };

  const aggregateSalesByMonth = (sales) => {
    const monthlyMap = new Map();
    
    sales.forEach(sale => {
      const monthKey = `${sale.date.getFullYear()}-${sale.date.getMonth()}`;
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: monthKey,
          quantity: 0,
          revenue: 0,
          date: new Date(sale.date.getFullYear(), sale.date.getMonth(), 1)
        });
      }
      
      const monthData = monthlyMap.get(monthKey);
      monthData.quantity += sale.quantity;
      monthData.revenue += sale.revenue;
    });
    
    return Array.from(monthlyMap.values()).sort((a, b) => a.date - b.date);
  };

  const calculateMovingAverage = (values, periods) => {
    if (values.length === 0) return 0;
    const window = Math.min(3, values.length);
    const recentValues = values.slice(-window);
    return recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
  };

  const calculateExponentialSmoothing = (values, periods) => {
    if (values.length === 0) return 0;
    const alpha = 0.3; // Smoothing factor
    let forecast = values[0];
    
    for (let i = 1; i < values.length; i++) {
      forecast = alpha * values[i] + (1 - alpha) * forecast;
    }
    
    return forecast;
  };

  const calculateLinearRegression = (values) => {
    if (values.length < 2) return { slope: 0, intercept: values[0] || 0 };
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + val * index, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
  };

  const calculateTrend = (sales) => {
    if (sales.length < 2) return { direction: 'stable', growthRate: 0 };
    
    const monthlySales = aggregateSalesByMonth(sales);
    if (monthlySales.length < 2) return { direction: 'stable', growthRate: 0 };
    
    const firstHalf = monthlySales.slice(0, Math.floor(monthlySales.length / 2));
    const secondHalf = monthlySales.slice(Math.floor(monthlySales.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, m) => sum + m.quantity, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, m) => sum + m.quantity, 0) / secondHalf.length;
    
    const growthRate = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
    
    let direction = 'stable';
    if (growthRate > 10) direction = 'increasing';
    else if (growthRate < -10) direction = 'decreasing';
    
    return { direction, growthRate };
  };

  const isSeasonal = (sales) => {
    if (sales.length < 6) return false; // Need at least 6 months of data
    
    const monthlySales = aggregateSalesByMonth(sales);
    const avgSales = monthlySales.reduce((sum, m) => sum + m.quantity, 0) / monthlySales.length;
    const variance = monthlySales.reduce((sum, m) => sum + Math.pow(m.quantity - avgSales, 2), 0) / monthlySales.length;
    const coefficientOfVariation = Math.sqrt(variance) / avgSales;
    
    return coefficientOfVariation > 0.5; // High variation indicates seasonality
  };

  const assessRisk = (forecast, trend, totalSales) => {
    if (forecast.confidence < 40) return 'high';
    if (trend.direction === 'decreasing' && trend.growthRate < -20) return 'high';
    if (totalSales < 10) return 'medium';
    return 'low';
  };



  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Filter forecasts based on search and filters
  const filteredForecasts = React.useMemo(() => {
    let filtered = forecastResults.filter(forecast => {
      const matchesSearch = !searchQuery || 
        forecast.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        forecast.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'All' || forecast.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });

    return filtered;
  }, [forecastResults, searchQuery, selectedCategory]);

  // Re-generate forecasts when parameters change
  useEffect(() => {
    if (salesData.length > 0 && products.length > 0) {
      const forecasts = generateForecastData(salesData, products);
      setForecastResults(forecasts);
    }
  }, [selectedPeriod, forecastingMethod]);

  const renderForecastCard = ({ item: forecast }) => (
    <View key={forecast.id} style={styles.forecastCard}>
      <View style={styles.forecastHeader}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{forecast.productName}</Text>
          <Text style={styles.categoryText}>{forecast.category}</Text>
        </View>
        <View style={[
          styles.riskBadge,
          { backgroundColor: 
            forecast.riskLevel === 'high' ? '#dc2626' :
            forecast.riskLevel === 'medium' ? '#f59e0b' : '#10b981'
          }
        ]}>
          <Text style={styles.riskText}>
            {forecast.riskLevel.toUpperCase()} RISK
          </Text>
        </View>
      </View>

      <View style={styles.forecastMetrics}>
        <View style={styles.metricRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Forecasted Demand</Text>
            <Text style={styles.metricValue}>{forecast.forecastQuantity.toFixed(1)} units</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Confidence</Text>
            <Text style={[
              styles.metricValue,
              { color: forecast.confidence > 70 ? '#10b981' : forecast.confidence > 50 ? '#f59e0b' : '#dc2626' }
            ]}>
              {forecast.confidence.toFixed(0)}%
            </Text>
          </View>
        </View>

        <View style={styles.metricRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Growth Trend</Text>
            <View style={styles.trendContainer}>
              <Text style={[
                styles.trendText,
                { color: 
                  forecast.trend.direction === 'increasing' ? '#10b981' :
                  forecast.trend.direction === 'decreasing' ? '#dc2626' : '#94a3b8'
                }
              ]}>
                {forecast.trend.direction === 'increasing' ? '↗️' : 
                 forecast.trend.direction === 'decreasing' ? '↘️' : '➡️'} 
                {forecast.growthRate > 0 ? '+' : ''}{forecast.growthRate.toFixed(1)}%
              </Text>
            </View>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Recommended Stock</Text>
            <Text style={styles.metricValue}>{forecast.recommendedStock} units</Text>
          </View>
        </View>
      </View>

      <View style={styles.forecastDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Historical Sales:</Text>
          <Text style={styles.detailValue}>{forecast.currentSales.toFixed(1)} units</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Data Points:</Text>
          <Text style={styles.detailValue}>{forecast.dataPoints} records</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Seasonal Pattern:</Text>
          <Text style={[
            styles.detailValue,
            { color: forecast.seasonal ? '#f59e0b' : '#94a3b8' }
          ]}>
            {forecast.seasonal ? 'Yes' : 'No'}
          </Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.chartButton}
          onPress={() => {
            setSelectedProductForChart(forecast);
            setShowChartModal(true);
          }}
        >
          <Icon name="show-chart" size={16} color="#3b82f6" />
          <Text style={styles.chartButtonText}>View Chart</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderChartModal = () => (
    <Modal
      visible={showChartModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {
        setShowChartModal(false);
        setSelectedProductForChart(null);
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { maxWidth: '90%' }]}>
          <Text style={styles.modalTitle}>
            Demand Forecast Chart - {selectedProductForChart?.productName}
          </Text>
          
          <ScrollView style={styles.chartContent}>
            <View style={styles.chartPlaceholder}>
              <Icon name="show-chart" size={64} color="#3b82f6" />
              <Text style={styles.chartPlaceholderText}>
                📈 Interactive Chart View
              </Text>
              <Text style={styles.chartPlaceholderSubtext}>
                Historical data and forecast visualization would be displayed here
              </Text>
              {selectedProductForChart && (
                <View style={styles.chartData}>
                  <Text style={styles.chartDataTitle}>Forecast Data:</Text>
                  <Text style={styles.chartDataText}>
                    Period: {selectedPeriod} days{'\n'}
                    Method: {forecastingMethods.find(m => m.key === forecastingMethod)?.label}{'\n'}
                    Confidence: {selectedProductForChart.confidence.toFixed(0)}%{'\n'}
                    Forecasted Quantity: {selectedProductForChart.forecastQuantity.toFixed(1)} units
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
          
          <View style={styles.modalButtonContainer}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => {
                setShowChartModal(false);
                setSelectedProductForChart(null);
              }}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderFilterModal = () => (
    <Modal
      visible={showFilters}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Forecast Settings</Text>
          
          <ScrollView style={styles.formContent}>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Forecast Period (Days)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollContainer}>
                {['7', '30', '60', '90', '180'].map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.optionButton,
                      selectedPeriod === period && styles.optionButtonActive
                    ]}
                    onPress={() => setSelectedPeriod(period)}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      selectedPeriod === period && styles.optionButtonTextActive
                    ]}>
                      {period} days
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Forecasting Method</Text>
              {forecastingMethods.map((method) => (
                <TouchableOpacity
                  key={method.key}
                  style={[
                    styles.methodButton,
                    forecastingMethod === method.key && styles.methodButtonActive
                  ]}
                  onPress={() => setForecastingMethod(method.key)}
                >
                  <Text style={[
                    styles.methodTitle,
                    forecastingMethod === method.key && styles.methodTitleActive
                  ]}>
                    {method.label}
                  </Text>
                  <Text style={[
                    styles.methodDescription,
                    forecastingMethod === method.key && styles.methodDescriptionActive
                  ]}>
                    {method.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Category Filter</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollContainer}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.filterButton,
                      selectedCategory === category && styles.filterButtonActive
                    ]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text style={[
                      styles.filterButtonText,
                      selectedCategory === category && styles.filterButtonTextActive
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </ScrollView>
          
          <View style={styles.modalButtonContainer}>
            <TouchableOpacity 
              style={styles.applyButton}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.applyButtonText}>Apply Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

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
          <Text style={styles.loadingText}>Analyzing demand patterns...</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <ScrollView 
        style={[styles.container, Platform.OS === 'web' && styles.webContainer]}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
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
          <Text style={styles.title}>🔮 Demand Forecasting</Text>
          <Text style={styles.subtitle}>Predict future demand using historical data and trends</Text>
        </View>

        {/* Summary Statistics */}
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, { borderLeftColor: '#3b82f6' }]}>
            <Text style={styles.summaryNumber}>{summaryStats.totalProducts}</Text>
            <Text style={styles.summaryLabel}>Products Analyzed</Text>
          </View>
          
          <View style={[styles.summaryCard, { borderLeftColor: '#10b981' }]}>
            <Text style={styles.summaryNumber}>{summaryStats.highDemandProducts}</Text>
            <Text style={styles.summaryLabel}>High Demand</Text>
          </View>
          
          <View style={[styles.summaryCard, { borderLeftColor: '#f59e0b' }]}>
            <Text style={styles.summaryNumber}>{summaryStats.lowDemandProducts}</Text>
            <Text style={styles.summaryLabel}>Low Demand</Text>
          </View>
          
          <View style={[styles.summaryCard, { borderLeftColor: '#8b5cf6' }]}>
            <Text style={styles.summaryNumber}>{summaryStats.averageGrowthRate.toFixed(1)}%</Text>
            <Text style={styles.summaryLabel}>Avg Growth</Text>
          </View>
        </View>

        {/* Search and Filter */}
        <View style={styles.searchFilterContainer}>
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products or categories..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
          </View>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.filterButtonTop}
              onPress={() => setShowFilters(true)}
            >
              <Icon name="tune" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Filters Display */}
        {(searchQuery || selectedCategory !== 'All') && (
          <View style={styles.activeFilters}>
            <Text style={styles.activeFiltersTitle}>Active Filters:</Text>
            <View style={styles.activeFiltersList}>
              {searchQuery && (
                <View style={styles.filterTag}>
                  <Text style={styles.filterTagText}>Search: {searchQuery}</Text>
                </View>
              )}
              {selectedCategory !== 'All' && (
                <View style={styles.filterTag}>
                  <Text style={styles.filterTagText}>Category: {selectedCategory}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Forecast Settings Summary */}
        <View style={styles.settingsSummary}>
          <Text style={styles.settingsTitle}>Forecast Settings:</Text>
          <View style={styles.settingsList}>
            <Text style={styles.settingItem}>
              📅 Period: {selectedPeriod} days
            </Text>
            <Text style={styles.settingItem}>
              🔬 Method: {forecastingMethods.find(m => m.key === forecastingMethod)?.label}
            </Text>
            <Text style={styles.settingItem}>
              📊 Products: {filteredForecasts.length}
            </Text>
          </View>
        </View>

        {/* Forecast Results List */}
        <View style={styles.content}>
          {filteredForecasts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="analytics" size={64} color="#6b7280" />
              <Text style={styles.emptyText}>
                {forecastResults.length === 0 ? 'No demand data available' : 'No products match your filters'}
              </Text>
              <Text style={styles.emptySubtext}>
                {forecastResults.length === 0 
                  ? 'Sales data is needed to generate demand forecasts'
                  : 'Try adjusting your search or filter criteria'
                }
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredForecasts}
              renderItem={renderForecastCard}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false} // Let the parent ScrollView handle scrolling
            />
          )}
        </View>
        
        {/* Bottom padding for web scrolling */}
        <View style={{ 
          height: Platform.OS === 'web' ? 100 : 20,
          minHeight: Platform.OS === 'web' ? 100 : 0
        }} />
      </ScrollView>
      
      {/* Render modals */}
      {renderChartModal()}
      {renderFilterModal()}
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
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
    flexWrap: 'wrap',
  },
  summaryCard: {
    flex: 1,
    minWidth: '23%',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: '#374151',
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'center',
  },
  searchFilterContainer: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 16,
    flex: 1,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#444',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButtonTop: {
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 12,
  },
  activeFilters: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  activeFiltersTitle: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  activeFiltersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterTag: {
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  filterTagText: {
    color: '#e2e8f0',
    fontSize: 12,
  },
  settingsSummary: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  settingsTitle: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  settingsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  settingItem: {
    color: '#e2e8f0',
    fontSize: 13,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  forecastCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  forecastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#3b82f6',
  },
  riskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  riskText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  forecastMetrics: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metric: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 14,
    fontWeight: '600',
  },
  forecastDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 13,
    color: '#94a3b8',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  chartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  chartButtonText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
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

  // Modal styles
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
    padding: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  formContent: {
    maxHeight: 400,
  },
  formField: {
    marginBottom: 16,
  },
  formLabel: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  scrollContainer: {
    marginBottom: 8,
  },
  optionButton: {
    backgroundColor: '#2a2a2a',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  optionButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  optionButtonText: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: 'bold',
  },
  optionButtonTextActive: {
    color: '#fff',
  },
  methodButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  methodButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: '#3b82f6',
  },
  methodTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  methodTitleActive: {
    color: '#3b82f6',
  },
  methodDescription: {
    color: '#94a3b8',
    fontSize: 12,
  },
  methodDescriptionActive: {
    color: '#3b82f6',
  },
  filterButton: {
    backgroundColor: '#2a2a2a',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#444',
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
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  applyButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#6b7280',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chartContent: {
    maxHeight: 400,
  },
  chartPlaceholder: {
    alignItems: 'center',
    padding: 40,
  },
  chartPlaceholderText: {
    color: '#3b82f6',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  chartPlaceholderSubtext: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  chartData: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#444',
  },
  chartDataTitle: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  chartDataText: {
    color: '#e2e8f0',
    fontSize: 14,
    lineHeight: 20,
  },
});

export default DemandForecastingScreen;