import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

/**
 * Revolutionary Holographic Business Intelligence Scanner
 * 2089 Futuristic Business Monitoring Interface
 * Features:
 * - Holographic scanning animations
 * - Real-time business metrics display
 * - Neural alert system
 * - 3D progress indicators
 * - Futuristic notification feed
 * - Biometric-style security interface
 */
const HolographicBusinessScanner = ({ data }) => {
  const [scannerActive, setScannerActive] = useState(false);
  const [currentScan, setCurrentScan] = useState(0);
  const [alerts, setAlerts] = useState([
    { id: 1, type: 'success', message: 'Neural Network Optimized', time: '2 min ago', priority: 'low' },
    { id: 2, type: 'info', message: 'Sales Target Exceeded', time: '5 min ago', priority: 'medium' },
    { id: 3, type: 'warning', message: 'Inventory Alert', time: '8 min ago', priority: 'high' },
    { id: 4, type: 'success', message: 'Profit Margin Peak', time: '12 min ago', priority: 'low' },
  ]);
  const [businessMetrics, setBusinessMetrics] = useState({
    neuralEfficiency: 94.7,
    salesVelocity: 87.3,
    profitOptimization: 91.2,
    inventoryNeural: 88.9,
    customerSatisfaction: 96.1,
    operationalHarmony: 93.4
  });

  // Advanced animation controllers
  const [animatedValues, setAnimatedValues] = useState({
    scanner: new Animated.Value(0),
    scanLine: new Animated.Value(0),
    hologram: new Animated.Value(0),
    alerts: new Animated.Value(0),
    metrics: new Animated.Value(0),
    pulse: new Animated.Value(0),
  });

  const scannerAnimationRef = useRef(null);
  const scanLineAnimationRef = useRef(null);

  useEffect(() => {
    startHolographicScanner();
    animateMetrics();
    
    return () => {
      if (scannerAnimationRef.current) {
        scannerAnimationRef.current.stop();
      }
      if (scanLineAnimationRef.current) {
        scanLineAnimationRef.current.stop();
      }
    };
  }, []);

  const startHolographicScanner = () => {
    setScannerActive(true);
    
    // Master scanner animation
    const scannerAnimation = Animated.sequence([
      Animated.timing(animatedValues.scanner, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false,
      }),
      Animated.timing(animatedValues.scanner, {
        toValue: 0.8,
        duration: 1000,
        useNativeDriver: false,
      }),
    ]);

    // Continuous scan line animation
    const scanLineAnimation = Animated.loop(
      Animated.timing(animatedValues.scanLine, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: false,
      })
    );

    scannerAnimation.start(() => {
      // Auto-cycle through different scan types
      setInterval(() => {
        setCurrentScan(prev => (prev + 1) % 4);
        animateScanType();
      }, 4000);
    });

    scanLineAnimation.start();
    scannerAnimationRef.current = scannerAnimation;
    scanLineAnimationRef.current = scanLineAnimation;

    // Start alert animations
    animateAlerts();
  };

  const animateScanType = () => {
    Animated.sequence([
      Animated.timing(animatedValues.hologram, {
        toValue: 0,
        duration: 500,
        useNativeDriver: false,
      }),
      Animated.timing(animatedValues.hologram, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const animateMetrics = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValues.metrics, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValues.metrics, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    ).start();

    // Pulse effects for metrics
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValues.pulse, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValues.pulse, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    ).start();
  };

  const animateAlerts = () => {
    Animated.loop(
      Animated.timing(animatedValues.alerts, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: false,
      })
    ).start();
  };

  const scanTypes = [
    {
      title: 'NEURAL EFFICIENCY SCAN',
      icon: 'psychology',
      color: '#ff0080',
      data: 'Optimizing business processes...'
    },
    {
      title: 'PROFIT MATRIX ANALYSIS',
      icon: 'trending-up',
      color: '#00ff88',
      data: 'Analyzing revenue streams...'
    },
    {
      title: 'INVENTORY NEURAL MAP',
      icon: 'inventory',
      color: '#00f5ff',
      data: 'Scanning product networks...'
    },
    {
      title: 'CUSTOMER SATISFACTION GRID',
      icon: 'people',
      color: '#ffaa00',
      data: 'Measuring experience metrics...'
    }
  ];

  const getAlertIcon = (type) => {
    switch (type) {
      case 'success': return 'check-circle';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'info';
    }
  };

  const getAlertColor = (type, priority) => {
    if (priority === 'high') return '#ff4444';
    if (priority === 'medium') return '#ffaa00';
    switch (type) {
      case 'success': return '#00ff88';
      case 'warning': return '#ffaa00';
      case 'error': return '#ff4444';
      default: return '#00f5ff';
    }
  };

  const renderHolographicScanner = () => {
    const currentScanData = scanTypes[currentScan];
    const scanY = animatedValues.scanLine.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 200],
    });

    return (
      <View style={styles.scannerContainer}>
        {/* Scanner Header */}
        <View style={styles.scannerHeader}>
          <View style={styles.scannerBrand}>
            <Icon name="military-tech" size={24} color="#ff0080" />
            <Text style={styles.scannerTitle}>HOLOGRAPHIC SCANNER 2089</Text>
          </View>
          <View style={styles.scannerStatus}>
            <View style={[styles.statusLed, { backgroundColor: scannerActive ? '#00ff88' : '#ff4444' }]} />
            <Text style={styles.statusText}>{scannerActive ? 'ACTIVE' : 'STANDBY'}</Text>
          </View>
        </View>

        {/* Holographic Display */}
        <View style={styles.hologramContainer}>
          <View style={styles.hologramFrame}>
            <View style={styles.hologramBorder} />
            
            {/* Scan Line Animation */}
            <Animated.View style={[
              styles.scanLine,
              { 
                top: scanY,
                opacity: animatedValues.scanner,
              }
            ]} />
            
            {/* Holographic Content */}
            <Animated.View style={[
              styles.hologramContent,
              { opacity: animatedValues.hologram }
            ]}>
              <View style={styles.scanDataHeader}>
                <Icon 
                  name={currentScanData.icon} 
                  size={32} 
                  color={currentScanData.color} 
                />
                <Text style={[
                  styles.scanTitle,
                  { color: currentScanData.color }
                ]}>
                  {currentScanData.title}
                </Text>
              </View>
              
              <Text style={styles.scanData}>
                {currentScanData.data}
              </Text>
              
              {/* Neural Activity Indicator */}
              <View style={styles.neuralActivity}>
                <View style={styles.activityBar}>
                  <Animated.View style={[
                    styles.activityFill,
                    { 
                      width: `${businessMetrics.neuralEfficiency}%`,
                      backgroundColor: currentScanData.color
                    }
                  ]} />
                </View>
                <Text style={styles.activityText}>
                  {businessMetrics.neuralEfficiency}% NEURAL ACTIVITY
                </Text>
              </View>
            </Animated.View>
          </View>
        </View>

        {/* Scan Controls */}
        <View style={styles.scanControls}>
          {scanTypes.map((scan, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.scanButton,
                currentScan === index && styles.activeScanButton
              ]}
              onPress={() => setCurrentScan(index)}
            >
              <Icon 
                name={scan.icon} 
                size={16} 
                color={currentScan === index ? scan.color : '#666'} 
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderNeuralMetrics = () => {
    const metrics = [
      { key: 'neuralEfficiency', label: 'NEURAL EFFICIENCY', icon: 'psychology', color: '#ff0080' },
      { key: 'salesVelocity', label: 'SALES VELOCITY', icon: 'speed', color: '#00ff88' },
      { key: 'profitOptimization', label: 'PROFIT OPTIMIZATION', icon: 'trending-up', color: '#00f5ff' },
      { key: 'inventoryNeural', label: 'INVENTORY NEURAL', icon: 'inventory', color: '#ffaa00' },
      { key: 'customerSatisfaction', label: 'CUSTOMER SATISFACTION', icon: 'people', color: '#8b5cf6' },
      { key: 'operationalHarmony', label: 'OPERATIONAL HARMONY', icon: 'balance', color: '#10b981' },
    ];

    return (
      <View style={styles.metricsContainer}>
        <View style={styles.metricsHeader}>
          <Icon name="analytics" size={20} color="#00f5ff" />
          <Text style={styles.metricsTitle}>NEURAL METRICS MATRIX</Text>
        </View>
        
        <View style={styles.metricsGrid}>
          {metrics.map((metric, index) => (
            <Animated.View 
              key={metric.key}
              style={[
                styles.metricCard,
                { 
                  opacity: animatedValues.metrics,
                  transform: [{
                    scale: animatedValues.pulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.05],
                    })
                  }]
                }
              ]}
            >
              <View style={styles.metricIcon}>
                <Icon name={metric.icon} size={18} color={metric.color} />
              </View>
              
              <View style={styles.metricContent}>
                <Text style={styles.metricLabel}>{metric.label}</Text>
                <Text style={[
                  styles.metricValue,
                  { color: metric.color }
                ]}>
                  {businessMetrics[metric.key].toFixed(1)}%
                </Text>
                
                <View style={styles.metricProgress}>
                  <View style={styles.progressBackground}>
                    <Animated.View style={[
                      styles.progressFill,
                      {
                        width: `${businessMetrics[metric.key]}%`,
                        backgroundColor: metric.color
                      }
                    ]} />
                  </View>
                </View>
              </View>
              
              <View style={[
                styles.metricPulse,
                { backgroundColor: metric.color }
              ]} />
            </Animated.View>
          ))}
        </View>
      </View>
    );
  };

  const renderAlertSystem = () => {
    return (
      <View style={styles.alertsContainer}>
        <View style={styles.alertsHeader}>
          <Icon name="notification-important" size={20} color="#ffaa00" />
          <Text style={styles.alertsTitle}>NEURAL ALERT GRID</Text>
          <View style={styles.alertCount}>
            <Text style={styles.alertCountText}>{alerts.length}</Text>
          </View>
        </View>
        
        <View style={styles.alertsList}>
          {alerts.map((alert, index) => (
            <Animated.View 
              key={alert.id}
              style={[
                styles.alertItem,
                { opacity: animatedValues.alerts }
              ]}
            >
              <View style={[
                styles.alertIcon,
                { backgroundColor: getAlertColor(alert.type, alert.priority) }
              ]}>
                <Icon 
                  name={getAlertIcon(alert.type)} 
                  size={14} 
                  color="#000" 
                />
              </View>
              
              <View style={styles.alertContent}>
                <Text style={styles.alertMessage}>{alert.message}</Text>
                <Text style={styles.alertTime}>{alert.time}</Text>
              </View>
              
              <View style={[
                styles.priorityIndicator,
                { backgroundColor: getAlertColor(alert.type, alert.priority) }
              ]} />
            </Animated.View>
          ))}
        </View>
      </View>
    );
  };

  const renderSecurityPanel = () => {
    return (
      <View style={styles.securityContainer}>
        <View style={styles.securityHeader}>
          <Icon name="security" size={20} color="#10b981" />
          <Text style={styles.securityTitle}>SECURITY NEURAL GRID</Text>
        </View>
        
        <View style={styles.securityStatus}>
          <View style={styles.securityItem}>
            <Text style={styles.securityLabel}>NEURAL FIREWALL</Text>
            <View style={styles.securityStatusIndicator}>
              <View style={[styles.statusDot, { backgroundColor: '#00ff88' }]} />
              <Text style={styles.securityStatusText}>OPTIMAL</Text>
            </View>
          </View>
          
          <View style={styles.securityItem}>
            <Text style={styles.securityLabel}>DATA ENCRYPTION</Text>
            <View style={styles.securityStatusIndicator}>
              <View style={[styles.statusDot, { backgroundColor: '#00ff88' }]} />
              <Text style={styles.securityStatusText}>ACTIVE</Text>
            </View>
          </View>
          
          <View style={styles.securityItem}>
            <Text style={styles.securityLabel}>ACCESS CONTROL</Text>
            <View style={styles.securityStatusIndicator}>
              <View style={[styles.statusDot, { backgroundColor: '#00f5ff' }]} />
              <Text style={styles.securityStatusText}>MONITORED</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Holographic Scanner */}
      {renderHolographicScanner()}
      
      {/* Neural Metrics */}
      {renderNeuralMetrics()}
      
      {/* Alert System */}
      {renderAlertSystem()}
      
      {/* Security Panel */}
      {renderSecurityPanel()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderRadius: 24,
    padding: 24,
    marginTop: 24,
    borderWidth: 3,
    borderColor: '#8b5cf6',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
    position: 'relative',
    overflow: 'hidden',
  },

  // Scanner Styles
  scannerContainer: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    position: 'relative',
    overflow: 'hidden',
  },

  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  scannerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  scannerTitle: {
    color: '#ff0080',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 12,
    letterSpacing: 2,
    textShadowColor: '#ff0080',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  scannerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusLed: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },

  statusText: {
    color: '#888',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  hologramContainer: {
    height: 200,
    position: 'relative',
    marginBottom: 16,
  },

  hologramFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: '#00f5ff',
    borderRadius: 16,
    overflow: 'hidden',
  },

  hologramBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)',
    borderRadius: 14,
  },

  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'linear-gradient(90deg, transparent, #00f5ff, transparent)',
    shadowColor: '#00f5ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },

  hologramContent: {
    padding: 20,
    alignItems: 'center',
  },

  scanDataHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  scanTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 12,
    letterSpacing: 1,
  },

  scanData: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
  },

  neuralActivity: {
    alignItems: 'center',
    width: '100%',
  },

  activityBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(0, 245, 255, 0.2)',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },

  activityFill: {
    height: '100%',
    borderRadius: 3,
  },

  activityText: {
    color: '#00f5ff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  scanControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },

  scanButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    marginHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },

  activeScanButton: {
    borderColor: '#8b5cf6',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },

  // Metrics Styles
  metricsContainer: {
    backgroundColor: 'rgba(0, 245, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)',
  },

  metricsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  metricsTitle: {
    color: '#00f5ff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
    letterSpacing: 2,
  },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  metricCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 16,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)',
    position: 'relative',
    overflow: 'hidden',
  },

  metricIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
  },

  metricContent: {
    flex: 1,
  },

  metricLabel: {
    color: '#888',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
  },

  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },

  metricProgress: {
    marginBottom: 8,
  },

  progressBackground: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  metricPulse: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2,
    borderRadius: 1,
    opacity: 0.8,
  },

  // Alert Styles
  alertsContainer: {
    backgroundColor: 'rgba(255, 170, 0, 0.05)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 170, 0, 0.3)',
  },

  alertsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  alertsTitle: {
    color: '#ffaa00',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
    letterSpacing: 2,
  },

  alertCount: {
    backgroundColor: 'rgba(255, 170, 0, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 12,
  },

  alertCountText: {
    color: '#ffaa00',
    fontSize: 10,
    fontWeight: 'bold',
  },

  alertsList: {
    maxHeight: 120,
  },

  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 170, 0, 0.2)',
  },

  alertIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  alertContent: {
    flex: 1,
  },

  alertMessage: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },

  alertTime: {
    color: '#888',
    fontSize: 9,
    letterSpacing: 1,
  },

  priorityIndicator: {
    width: 4,
    height: 24,
    borderRadius: 2,
    marginLeft: 8,
  },

  // Security Styles
  securityContainer: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },

  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  securityTitle: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
    letterSpacing: 2,
  },

  securityStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  securityItem: {
    alignItems: 'center',
    flex: 1,
  },

  securityLabel: {
    color: '#888',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: 'center',
  },

  securityStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },

  securityStatusText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

export default HolographicBusinessScanner;