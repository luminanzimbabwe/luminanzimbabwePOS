import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

/**
 * Simplified Neural Financial Matrix Component
 * Performance-optimized for smooth scrolling
 */
const NeuralFinancialGraph = ({ data }) => {
  // Simple animation controllers only
  const [animatedValues, setAnimatedValues] = useState({
    salesLine: new Animated.Value(0),
    expenseLine: new Animated.Value(0),
    profitLine: new Animated.Value(0),
  });

  const [neuralData, setNeuralData] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Simple animation ref
  const animationRef = useRef(null);

  // Simple data processing
  useEffect(() => {
    const hasRealData = data && (
      (data.todaySales && data.todaySales > 0) ||
      (data.weekSales && data.weekSales > 0) ||
      (data.monthSales && data.monthSales > 0) ||
      (data.totalRevenue && data.totalRevenue > 0) ||
      (data.totalExpenses && data.totalExpenses > 0) ||
      (data.totalProfit && data.totalProfit > 0)
    );
    
    if (hasRealData) {
      generateSimpleFinancialData(data);
    } else {
      setNeuralData([]);
    }
    
    startSimpleAnimations();
  }, [data]);

  // Simple financial data generation
  const generateSimpleFinancialData = (realData) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const totalRevenue = realData.totalRevenue || realData.monthSales || realData.weekSales * 4 || realData.todaySales * 30 || 0;
    const totalExpenses = realData.totalExpenses || (totalRevenue * 0.72);
    const totalProfit = realData.totalProfit || (totalRevenue - totalExpenses);
    
    const generatedData = months.map((month, index) => {
      const seasonalMultiplier = 0.85 + (Math.sin((index / 12) * 2 * Math.PI) * 0.15);
      const monthlyVariation = 0.8 + (Math.random() * 0.4);
      const combinedMultiplier = seasonalMultiplier * monthlyVariation;
      
      const baseSales = (totalRevenue / 12) * combinedMultiplier;
      const baseExpenses = (totalExpenses / 12) * combinedMultiplier;
      const staffLunch = 800 / 12;
      const waste = (totalRevenue * 0.015) / 12;
      const profit = baseSales - baseExpenses;
      
      return {
        month,
        sales: Math.round(baseSales),
        expenses: Math.round(baseExpenses),
        profit: Math.round(profit),
        staffLunch: Math.round(staffLunch),
        waste: Math.round(waste),
      };
    });
    
    setNeuralData(generatedData);
  };

  // Simple animation system
  const startSimpleAnimations = () => {
    setIsAnimating(true);
    
    const simpleAnimation = Animated.stagger(200, [
      Animated.timing(animatedValues.salesLine, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }),
      Animated.timing(animatedValues.expenseLine, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: false,
      }),
      Animated.timing(animatedValues.profitLine, {
        toValue: 1,
        duration: 1600,
        useNativeDriver: false,
      }),
    ]);
    
    simpleAnimation.start(() => {
      setIsAnimating(false);
    });
    
    animationRef.current = simpleAnimation;
  };

  // Calculate totals
  const calculateTotals = () => {
    if (neuralData.length === 0) return { sales: 0, expenses: 0, profit: 0, staffLunch: 0, waste: 0 };
    
    return neuralData.reduce((acc, item) => ({
      sales: acc.sales + item.sales,
      expenses: acc.expenses + item.expenses,
      profit: acc.profit + item.profit,
      staffLunch: acc.staffLunch + item.staffLunch,
      waste: acc.waste + item.waste,
    }), { sales: 0, expenses: 0, profit: 0, staffLunch: 0, waste: 0 });
  };

  const totals = calculateTotals();

  // Simple grid rendering
  const renderGrid = () => {
    const gridLines = [];
    const maxValue = Math.max(...neuralData.map(item => Math.max(item.sales, item.expenses, item.profit))) || 1;
    const gridHeight = 150;
    
    for (let i = 0; i <= 4; i++) {
      const value = (maxValue / 4) * i;
      const y = gridHeight - (gridHeight / 4) * i;
      
      gridLines.push(
        <View key={i} style={[styles.gridLine, { top: y }]}>
          <Text style={styles.gridLabel}>${Math.round(value).toLocaleString()}</Text>
        </View>
      );
    }
    
    return gridLines;
  };

  // Simple data line rendering
  const renderDataLine = (dataKey, color, animatedValue, style = {}) => {
    if (neuralData.length === 0) return null;
    
    const maxValue = Math.max(...neuralData.map(item => Math.max(item.sales, item.expenses, item.profit))) || 1;
    const gridHeight = 150;
    const pointSpacing = (width - 60) / (neuralData.length - 1);
    
    const points = neuralData.map((item, index) => {
      const value = item[dataKey];
      const x = 30 + (pointSpacing * index);
      const y = gridHeight - ((value / maxValue) * gridHeight);
      
      return { x, y, value };
    });
    
    const pathData = points.map((point, index) => 
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    ).join(' ');
    
    return (
      <View style={[styles.dataLineContainer, style]}>
        <svg width={width} height={gridHeight} style={{ position: 'absolute' }}>
          <path
            d={pathData}
            stroke={color}
            strokeWidth="2"
            fill="none"
            opacity={0.8}
          />
          
          {points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="3"
              fill={color}
              opacity={animatedValue}
            />
          ))}
        </svg>
      </View>
    );
  };

  // Simple neural nodes
  const renderNeuralNodes = () => {
    return neuralData.map((item, index) => {
      const maxValue = Math.max(...neuralData.map(item => Math.max(item.sales, item.expenses, item.profit))) || 1;
      const gridHeight = 150;
      const pointSpacing = (width - 60) / (neuralData.length - 1);
      const x = 30 + (pointSpacing * index);
      
      return (
        <View key={index} style={[styles.neuralNode, { left: x - 5, top: 130 }]}>
          <View style={styles.nodeCore} />
          <Text style={styles.nodeLabel}>{item.month}</Text>
        </View>
      );
    });
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, []);

  const getMaxValue = () => {
    if (neuralData.length === 0) return 1;
    return Math.max(...neuralData.map(item => 
      Math.max(item.sales, item.expenses, item.profit)
    ));
  };

  return (
    <View style={styles.container}>
      {/* Simple Header */}
      <View style={styles.header}>
        <View style={styles.brand}>
          <Icon name="psychology" size={20} color="#ff0080" />
          <Text style={styles.title}>NEURAL FINANCIAL MATRIX</Text>
        </View>
      </View>
      
      {/* Simple Graph */}
      <View style={styles.graphContainer}>
        <View style={styles.graphArea}>
          <View style={styles.gridContainer}>
            {renderGrid()}
          </View>
          
          {renderDataLine('sales', '#00ff88', animatedValues.salesLine)}
          {renderDataLine('expenses', '#ff4444', animatedValues.expenseLine)}
          {renderDataLine('profit', '#00f5ff', animatedValues.profitLine)}
          
          <View style={styles.nodesContainer}>
            {renderNeuralNodes()}
          </View>
        </View>
        
        {/* Simple Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#00ff88' }]} />
            <Text style={styles.legendText}>Sales Revenue</Text>
            <Text style={styles.legendValue}>${totals.sales.toLocaleString()}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#ff4444' }]} />
            <Text style={styles.legendText}>Total Expenses</Text>
            <Text style={styles.legendValue}>${totals.expenses.toLocaleString()}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#00f5ff' }]} />
            <Text style={styles.legendText}>Net Profit</Text>
            <Text style={styles.legendValue}>${totals.profit.toLocaleString()}</Text>
          </View>
        </View>
      </View>
      
      {/* Simple Metrics */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>REVENUE</Text>
            <Text style={styles.metricValue}>${totals.sales.toLocaleString()}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>PROFIT</Text>
            <Text style={[styles.metricValue, { color: totals.profit >= 0 ? '#00ff88' : '#ff4444' }]}>
              ${totals.profit.toLocaleString()}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>MARGIN</Text>
            <Text style={styles.metricValue}>
              {totals.sales > 0 ? ((totals.profit / totals.sales) * 100).toFixed(1) : '0'}%
            </Text>
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
    padding: 20,
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#ff0080',
  },
  
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  title: {
    color: '#ff0080',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    letterSpacing: 1,
  },
  
  graphContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#00f5ff',
    marginBottom: 16,
  },
  
  graphArea: {
    height: 160,
    position: 'relative',
    marginBottom: 16,
  },
  
  gridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0, 245, 255, 0.3)',
  },
  
  gridLabel: {
    position: 'absolute',
    left: -40,
    top: -8,
    color: '#00f5ff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  
  dataLineContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  
  nodesContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
  },
  
  neuralNode: {
    position: 'absolute',
    width: 10,
    height: 10,
    alignItems: 'center',
  },
  
  nodeCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00f5ff',
  },
  
  nodeLabel: {
    position: 'absolute',
    top: 8,
    left: -8,
    color: '#888',
    fontSize: 7,
    fontWeight: 'bold',
    width: 16,
    textAlign: 'center',
  },
  
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    width: '48%',
  },
  
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  
  legendText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    flex: 1,
  },
  
  legendValue: {
    color: '#888',
    fontSize: 9,
    fontWeight: '600',
  },
  
  metricsContainer: {
    backgroundColor: 'rgba(0, 255, 136, 0.05)',
    borderRadius: 12,
    padding: 16,
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
    padding: 12,
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