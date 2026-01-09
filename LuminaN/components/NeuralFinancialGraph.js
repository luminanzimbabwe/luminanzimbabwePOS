import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

/**
 * Simplified Neural Financial Matrix Component
 * Uses real sales data passed from parent component
 * Clean, simple bar chart visualization
 * NO demo/mock data - shows real data or zeros
 */
const NeuralFinancialGraph = ({ data, onRefresh }) => {
  // Use data passed from parent component first
  const getSalesData = () => {
    if (!data) {
      console.log('⚠️ No data prop provided to NeuralFinancialGraph');
      return [];
    }

    const realData = data;
    
    console.log('📊 Using real sales data from props:', realData);
    
    // Check if we have real salesTrend data from backend
    if (realData.salesTrend && Array.isArray(realData.salesTrend) && realData.salesTrend.length > 0) {
      // Use the actual daily data from backend
      return realData.salesTrend.slice(-7).map((day, index) => ({
        day: day.day || day.date || `Day ${index + 1}`,
        sales: day.sales || day.revenue || day.net_revenue || 0,
        transactions: day.transactions || 0,
        index,
      }));
    }
    
    // No real trend data available - show zeros for all days
    // This indicates no sales data was found in the backend
    const today = new Date();
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      chartData.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        sales: 0, // Zero - no real data
        transactions: 0,
        index: 6 - i,
      });
    }
    
    console.log('📊 No real trend data available, showing zeros');
    return chartData;
  };

  const salesData = getSalesData();

  // Calculate totals from the chart data
  const calculateTotals = () => {
    if (salesData.length === 0) {
      return { totalSales: 0, totalTransactions: 0, avgTransaction: 0 };
    }
    
    const totalSales = salesData.reduce((sum, item) => sum + item.sales, 0);
    const totalTransactions = salesData.reduce((sum, item) => sum + item.transactions, 0);
    
    return {
      totalSales,
      totalTransactions,
      avgTransaction: totalTransactions > 0 ? totalSales / totalTransactions : 0,
    };
  };

  const totals = calculateTotals();
  
  // Find max value for scaling
  const maxValue = salesData.length > 0 
    ? Math.max(...salesData.map(item => item.sales)) 
    : 1;
  
  // Create grid labels based on max value
  const gridLabels = [];
  const step = Math.ceil(maxValue / 4 / 100) * 100;
  for (let i = 0; i <= 4; i++) {
    gridLabels.push(i * step);
  }

  // Check if we have any real data
  const hasRealData = salesData.some(item => item.sales > 0);

  // Bar chart rendering
  const renderBarChart = () => {
    if (salesData.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Icon name="trending-up" size={32} color="#666" />
          <Text style={styles.noDataText}>No sales data available</Text>
        </View>
      );
    }
    
    const chartHeight = 120;
    const maxScale = maxValue || 1;
    
    return (
      <View style={styles.barChartContainer}>
        {/* Y-axis labels */}
        <View style={styles.yAxisLabels}>
          {gridLabels.map((value, index) => (
            <View key={index} style={styles.yAxisLabel}>
              <Text style={styles.yAxisText}>${value}</Text>
            </View>
          ))}
        </View>
        
        {/* Bars */}
        <View style={styles.barsContainer}>
          {salesData.map((item, index) => {
            const barHeight = Math.max(4, (item.sales / maxScale) * chartHeight);
            const isPositive = item.sales > 0;
            
            return (
              <View key={index} style={styles.barWrapper}>
                <View style={styles.barLabel}>
                  <Text style={styles.barLabelText}>{item.day}</Text>
                </View>
                <View style={styles.barTrack}>
                  <View 
                    style={[
                      styles.bar, 
                      { 
                        height: barHeight,
                        backgroundColor: isPositive ? '#00ff88' : '#ff4444',
                      }
                    ]}
                  />
                </View>
                <View style={styles.barValue}>
                  <Text style={styles.barValueText}>${item.sales.toLocaleString()}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brand}>
          <Icon name="psychology" size={20} color="#ff0080" />
          <Text style={styles.title}>NEURAL FINANCIAL MATRIX</Text>
        </View>
        
        {onRefresh && (
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={onRefresh}
          >
            <Icon name="refresh" size={18} color="#00f5ff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Message if no real data */}
      {!hasRealData && (
        <View style={styles.noDataBanner}>
          <Icon name="info" size={14} color="#ffaa00" />
          <Text style={styles.noDataBannerText}>No sales data found - showing zeros</Text>
        </View>
      )}

      {/* Simple Bar Chart */}
      <View style={styles.chartContainer}>
        {renderBarChart()}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#00ff88' }]} />
          <Text style={styles.legendText}>Sales Revenue</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendValue}>7-Day Total: ${totals.totalSales.toLocaleString()}</Text>
        </View>
      </View>

      {/* Simple Metrics */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>TOTAL SALES</Text>
            <Text style={styles.metricValue}>${totals.totalSales.toLocaleString()}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>TRANSACTIONS</Text>
            <Text style={styles.metricValue}>{totals.totalTransactions}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>AVG SALE</Text>
            <Text style={styles.metricValue}>${totals.avgTransaction.toFixed(2)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#ff0080',
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  title: {
    color: '#ff0080',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
    letterSpacing: 1,
  },
  
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
  },
  
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  
  noDataText: {
    color: '#666',
    fontSize: 12,
    marginTop: 12,
  },
  
  noDataBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 170, 0, 0.1)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  
  noDataBannerText: {
    color: '#ffaa00',
    fontSize: 10,
    marginLeft: 8,
  },
  
  chartContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#00f5ff',
    marginBottom: 12,
  },
  
  barChartContainer: {
    flexDirection: 'row',
    height: 160,
  },
  
  yAxisLabels: {
    width: 50,
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  
  yAxisLabel: {
    height: 20,
    justifyContent: 'center',
  },
  
  yAxisText: {
    color: '#00f5ff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  
  barWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  
  barLabel: {
    marginBottom: 4,
  },
  
  barLabelText: {
    color: '#888',
    fontSize: 8,
    fontWeight: 'bold',
  },
  
  barTrack: {
    width: '70%',
    height: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  
  bar: {
    borderRadius: 4,
    minHeight: 4,
  },
  
  barValue: {
    marginTop: 4,
  },
  
  barValueText: {
    color: '#ffffff',
    fontSize: 7,
    fontWeight: 'bold',
  },
  
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  legendColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  
  legendText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  legendValue: {
    color: '#00ff88',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  metricsContainer: {
    backgroundColor: 'rgba(0, 255, 136, 0.05)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
  },
  
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  
  metricCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    padding: 10,
    width: '31%',
    alignItems: 'center',
  },
  
  metricLabel: {
    color: '#888',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
    textAlign: 'center',
  },
  
  metricValue: {
    color: '#00ff88',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default NeuralFinancialGraph;
