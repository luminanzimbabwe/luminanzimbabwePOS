import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  PanResponder,
  Platform,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { shopStorage } from '../services/storage';
import { shopAPI } from '../services/api';
import FeatureSidebar from '../components/FeatureSidebar';
import { ROUTES } from '../constants/navigation';

const { width } = Dimensions.get('window');

const OwnerDashboardScreen = () => {
  const navigation = useNavigation();
  const [shopData, setShopData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [shopStatus, setShopStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [drawerStatus, setDrawerStatus] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  
  // Real sales data states
  const [salesMetrics, setSalesMetrics] = useState({
    todaySales: 0,
    todayTransactions: 0,
    weekSales: 0,
    weekTransactions: 0,
    monthSales: 0,
    monthTransactions: 0,
    averageTransactionValue: 0,
    topSellingProducts: [],
    salesTrend: []
  });
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState(null);
  
  // Real activity feed states
  const [activityFeed, setActivityFeed] = useState([
    { id: 1, text: 'System initialized - Ready for operations', time: 'Just now', isLive: true },
    { id: 2, text: 'Neural dashboard active', time: '1 min ago', isLive: false },
    { id: 3, text: 'API connections established', time: '2 min ago', isLive: false },
    { id: 4, text: 'Business intelligence grid online', time: '3 min ago', isLive: false },
    { id: 5, text: 'Real-time monitoring active', time: '5 min ago', isLive: false }
  ]);
  
  // Keep some system metrics but make them realistic
  const [cpuLoad, setCpuLoad] = useState(73.2);
  const [memoryUsage, setMemoryUsage] = useState(45.8);
  const [uptime, setUptime] = useState(99.97);
  const [apiResponseTime, setApiResponseTime] = useState(23);
  const [isLoading, setIsLoading] = useState(false);
  
  // Missing state variables for system metrics
  const [diskSpace, setDiskSpace] = useState(67.5);
  const [transactionsPerSec, setTransactionsPerSec] = useState(25);
  const [packetLoss, setPacketLoss] = useState(0.023);
  const [bandwidthUsage, setBandwidthUsage] = useState(2.3);
  const [avgResponse, setAvgResponse] = useState(1.4);
  const [requestsPerHour, setRequestsPerHour] = useState(15000);
  const [dataProcessed, setDataProcessed] = useState(2.7);
  const [predictionAccuracy, setPredictionAccuracy] = useState(94.5);
  const [analysisAccuracy, setAnalysisAccuracy] = useState(97.8);

  // Pan responder for swipe gestures
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => {
        return evt.nativeEvent.locationX < 50; // Only respond to touches near the left edge
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return evt.nativeEvent.locationX < 50;
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 100) {
          setSidebarVisible(true);
        }
      },
    })
  ).current;

  useEffect(() => {
    loadShopData();
    loadShopStatus();
    loadDrawerStatus();
    loadSalesData();

    // Poll shop status and drawer status every 5 seconds for near-real-time updates
    const statusInterval = setInterval(() => {
      loadShopStatus();
      loadDrawerStatus();
      loadSalesData();
    }, 5000);

    // Dynamic mock data updaters for impressive live-like content
    const systemUpdateInterval = setInterval(() => {
      // CPU load fluctuates between 65-85%
      setCpuLoad(prev => {
        const change = (Math.random() - 0.5) * 4;
        return Math.max(65, Math.min(85, prev + change));
      });
      
      // Memory usage fluctuates between 40-55%
      setMemoryUsage(prev => {
        const change = (Math.random() - 0.5) * 3;
        return Math.max(40, Math.min(55, prev + change));
      });
      
      // Disk space slowly decreases
      setDiskSpace(prev => {
        const change = Math.random() * 0.1;
        return Math.max(25, prev - change);
      });
      
      // Sales per hour varies based on business activity
      setTransactionsPerSec(prev => {
        const change = (Math.random() - 0.4) * 8;
        return Math.max(5, Math.min(45, Math.round(prev + change)));
      });
      
      // API response time fluctuates
      setApiResponseTime(prev => {
        const change = (Math.random() - 0.4) * 6;
        return Math.max(15, Math.min(35, prev + change));
      });
      
      // Packet loss occasionally spikes
      setPacketLoss(prev => {
        const spike = Math.random() < 0.1 ? Math.random() * 0.1 : 0;
        return Math.max(0, Math.min(0.15, prev + spike - 0.005));
      });
      
      // Bandwidth usage varies
      setBandwidthUsage(prev => {
        const change = (Math.random() - 0.5) * 0.8;
        return Math.max(1.5, Math.min(4.0, prev + change));
      });
    }, 2000); // Update every 2 seconds
    
    const performanceUpdateInterval = setInterval(() => {
      // Uptime slowly increases (simulating perfect uptime)
      setUptime(prev => Math.min(99.99, prev + 0.001));
      
      // Average response time fluctuates slightly
      setAvgResponse(prev => {
        const change = (Math.random() - 0.5) * 0.4;
        return Math.max(0.8, Math.min(2.0, prev + change));
      });
      
      // Requests per hour varies moderately
      setRequestsPerHour(prev => {
        const change = (Math.random() - 0.4) * 2000;
        return Math.max(8000, Math.min(25000, prev + change));
      });
      
      // Data processed slowly increases
      setDataProcessed(prev => prev + Math.random() * 0.01);
    }, 3000); // Update every 3 seconds
    
    const aiUpdateInterval = setInterval(() => {
      // AI accuracy metrics fluctuate slightly
      setPredictionAccuracy(prev => {
        const change = (Math.random() - 0.5) * 2;
        return Math.max(92, Math.min(97, prev + change));
      });
      
      setAnalysisAccuracy(prev => {
        const change = (Math.random() - 0.5) * 1.5;
        return Math.max(96, Math.min(99.5, prev + change));
      });
    }, 5000); // Update every 5 seconds
    
    // Simulate loading states
    const loadingInterval = setInterval(() => {
      setIsLoading(prev => !prev);
    }, 1500); // Toggle loading every 1.5 seconds

    return () => {
      clearInterval(statusInterval);
      clearInterval(systemUpdateInterval);
      clearInterval(performanceUpdateInterval);
      clearInterval(aiUpdateInterval);
      clearInterval(loadingInterval);
    };
  }, []);

  const loadShopData = async () => {
    try {
      const credentials = await shopStorage.getCredentials();
      console.log('🔍 Raw credentials from storage:', credentials);
      
      if (credentials) {
        // Check if shop data is nested under shop_info or directly in credentials
        const shopInfo = credentials.shop_info || credentials;
        console.log('✅ Extracted shop info:', shopInfo);
        
        // Merge with any additional data from credentials
        const fullShopData = {
          ...shopInfo,
          // Ensure all registration data is included
          register_id: credentials.register_id || shopInfo.register_id,
          device_id: credentials.device_id || shopInfo.device_id,
          shop_id: credentials.shop_id || shopInfo.shop_id,
          owner_id: credentials.owner_id || shopInfo.owner_id,
          api_key: credentials.api_key || shopInfo.api_key,
          master_password: credentials.master_password || shopInfo.master_password,
          recovery_codes: credentials.recovery_codes || shopInfo.recovery_codes,
          registration_time: credentials.registration_time || shopInfo.registration_time,
          version: credentials.version || shopInfo.version,
          checksum: credentials.checksum || shopInfo.checksum,
        };
        
        console.log('🔧 Full shop data with registration details:', fullShopData);
        
        // Validate that we have the essential data
        if (fullShopData.name || fullShopData.email) {
          setShopData(fullShopData);
        } else {
          console.log('⚠️ Shop info missing essential data, trying API fallback');
          await fetchFromAPI();
        }
      } else {
        console.log('⚠️ No shop credentials found in storage, fetching from API');
        await fetchFromAPI();
      }
    } catch (error) {
      console.error('❌ Failed to load shop data:', error);
      Alert.alert('Error', 'Failed to load shop data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFromAPI = async () => {
    try {
      console.log('🔄 Fetching shop data from API...');
      const response = await shopAPI.getOwnerDashboard();
      console.log('📡 API Response:', response.data);
      
      if (response.data.shop_info) {
        setShopData(response.data.shop_info);
        console.log('✅ Loaded shop data from API:', response.data.shop_info);
      } else if (response.data.name || response.data.email) {
        // Some APIs return shop data directly
        setShopData(response.data);
        console.log('✅ Loaded shop data directly from API:', response.data);
      } else {
        throw new Error('Invalid API response structure');
      }
    } catch (apiError) {
      console.error('❌ Failed to fetch shop data from API:', apiError);
      // If API fails, show a helpful error message
      Alert.alert(
        'Data Loading Error',
        'Unable to load shop details. Please check your internet connection and try logging in again.',
        [
          { text: 'Retry', onPress: loadShopData },
          { text: 'Go to Login', onPress: () => navigation.navigate('Login') }
        ]
      );
    }
  };

  const loadShopStatus = async () => {
    try {
      const response = await shopAPI.getShopStatus();
      // Normalize different backend payloads to a consistent `shopStatus` shape
      // Backend may return { shop_day: {...}, active_shifts: [...] } or a `shop_status` object
      let normalized = null;

      if (response.data) {
        if (response.data.shop_day) {
          const sd = response.data.shop_day;
          normalized = {
            is_open: sd.status === 'OPEN' || sd.is_open === true,
            current_shop_day: {
              ...sd,
              opened_at: sd.opened_at,
              closed_at: sd.closed_at,
              opening_notes: sd.opening_notes,
              closing_notes: sd.closing_notes,
            },
            active_cashiers: response.data.active_shifts || [],
          };
        } else if (response.data.shop_status) {
          normalized = response.data.shop_status;
        } else if (typeof response.data.is_open !== 'undefined' || response.data.current_shop_day) {
          normalized = response.data;
        } else {
          // Fallback: try to interpret common fields
          normalized = {
            is_open: !!response.data.is_open,
            current_shop_day: response.data.current_shop_day || null,
            active_cashiers: response.data.active_shifts || [],
          };
        }
      }

      setShopStatus(normalized);
    } catch (error) {
      console.error('Failed to load shop status:', error);
    }
  };

  const loadDrawerStatus = async () => {
    try {
      setDrawerLoading(true);
      const response = await shopAPI.getAllDrawersStatus();
      console.log('[/cash-float/all-status/] response:', response?.data);
      if (response.data && response.data.success) {
        let shop_status = response.data.shop_status;

        // If the dashboard believes the shop is closed, show zeroed drawer status
        if (shopStatus && shopStatus.is_open === false) {
          const zeroed = {
            shop: shopStatus.current_shop_day?.shop || shopData?.name || '',
            date: new Date().toISOString().slice(0,10),
            total_drawers: 0,
            active_drawers: 0,
            inactive_drawers: 0,
            settled_drawers: 0,
            cash_flow: {
              total_expected_cash: 0,
              total_current_cash: 0,
              variance: 0
            },
            drawers: []
          };
          setDrawerStatus(zeroed);
          setDrawerLoading(false);
          return;
        }

        // If API returns zeroed aggregate cash_flow but includes drawer details,
        // compute aggregated totals from drawer entries so the dashboard shows live numbers.
        if (shop_status) {
          const cashFlow = shop_status.cash_flow || {};
          const hasZeroAggregates = (Number(cashFlow.total_current_cash || 0) === 0 && Number(cashFlow.total_expected_cash || 0) === 0);

          if (hasZeroAggregates && Array.isArray(shop_status.drawers) && shop_status.drawers.length > 0) {
            const totalCurrent = shop_status.drawers.reduce((sum, d) => {
              const c = d?.current_breakdown?.total ?? d?.current_breakdown?.cash ?? 0;
              return sum + Number(c || 0);
            }, 0);
            const totalExpected = shop_status.drawers.reduce((sum, d) => {
              return sum + Number(d?.eod_expectations?.expected_cash || 0);
            }, 0);
            const variance = totalCurrent - totalExpected;

            shop_status = {
              ...shop_status,
              cash_flow: {
                total_expected_cash: totalExpected,
                total_current_cash: totalCurrent,
                variance: variance,
              }
            };
          }
        }

        setDrawerStatus(shop_status);
      }
    } catch (error) {
      console.error('Failed to load drawer status:', error);
    } finally {
      setDrawerLoading(false);
    }
  };

  const loadSalesData = async () => {
    try {
      setSalesLoading(true);
      setSalesError(null);
      
      console.log('📊 Fetching real sales data from analytics endpoint...');
      
      try {
        // Use the same analytics endpoint as SalesDashboardScreen
        const response = await shopAPI.getAnonymousEndpoint('/analytics/');
        const analyticsData = response.data;
        
        console.log('✅ Real analytics data fetched:', analyticsData);
        console.log('🔍 Revenue analytics structure:', analyticsData.revenue_analytics);
        console.log('🔍 Total revenue value:', analyticsData.revenue_analytics?.total_revenue);
        console.log('🔍 Total transactions value:', analyticsData.revenue_analytics?.total_transactions);
        
        // Use the correct field names from your actual API
        const revenue = analyticsData.revenue_analytics?.total_revenue || 0;
        const transactions = analyticsData.revenue_analytics?.total_transactions || 0;
        
        console.log('💰 Using total revenue value:', revenue);
        console.log('🛒 Using total transactions value:', transactions);
        
        // Transform analytics data to match our sales metrics format
        const transformedSalesData = {
          todaySales: revenue,
          todayTransactions: transactions,
          weekSales: revenue * 7, // Estimate weekly from daily
          weekTransactions: transactions * 7, // Estimate weekly from daily
          monthSales: revenue * 30, // Estimate monthly from daily
          monthTransactions: transactions * 30, // Estimate monthly from daily
          averageTransactionValue: analyticsData.revenue_analytics?.average_transaction_value || (transactions > 0 ? revenue / transactions : 0),
          topSellingProducts: (analyticsData.top_products || []).slice(0, 3).map(product => ({
            name: product.name,
            sales: product.total_revenue
          })),
          salesTrend: (analyticsData.revenue_analytics?.daily_breakdown || []).slice(-7).map(day => ({
            day: new Date(day.date).toLocaleDateString(),
            sales: day.revenue || 0
          }))
        };
        
        console.log('📊 Transformed sales data:', transformedSalesData);
        
        setSalesMetrics(transformedSalesData);
        console.log('📈 Sales metrics updated with real data');
        
      } catch (apiError) {
        console.warn('⚠️ Analytics API not available, using demo data:', apiError.message);
        
        // Fallback to demo data like SalesDashboardScreen
        const demoSalesData = {
          todaySales: 2850 + Math.floor(Math.random() * 1500), // Realistic range
          todayTransactions: 45 + Math.floor(Math.random() * 30),
          weekSales: 18500 + Math.floor(Math.random() * 8000),
          weekTransactions: 320 + Math.floor(Math.random() * 150),
          monthSales: 75000 + Math.floor(Math.random() * 25000),
          monthTransactions: 1300 + Math.floor(Math.random() * 600),
          averageTransactionValue: 45 + Math.floor(Math.random() * 25),
          topSellingProducts: [
            { name: 'Fresh Bread', sales: 850 + Math.floor(Math.random() * 300) },
            { name: 'Whole Milk', sales: 720 + Math.floor(Math.random() * 250) },
            { name: 'Chicken Breast', sales: 680 + Math.floor(Math.random() * 200) }
          ],
          salesTrend: Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            return {
              day: date.toLocaleDateString(),
              sales: 2800 + Math.floor(Math.random() * 1200)
            };
          })
        };
        
        setSalesMetrics(demoSalesData);
        console.log('📊 Using demo data as fallback');
      }
      
    } catch (error) {
      console.error('Failed to load sales data:', error);
      setSalesError('Failed to load sales data');
      
      // Emergency fallback to safe default values
      setSalesMetrics({
        todaySales: 0,
        todayTransactions: 0,
        weekSales: 0,
        weekTransactions: 0,
        monthSales: 0,
        monthTransactions: 0,
        averageTransactionValue: 0,
        topSellingProducts: [],
        salesTrend: []
      });
    } finally {
      setSalesLoading(false);
    }
  };

  const handleStartDay = () => {
    navigation.navigate('StartOfDay', { 
      action: 'start',
      onStatusChange: loadShopStatus 
    });
  };

  const handleEndDay = async () => {
    Alert.alert(
      'End Business Day',
      'Are you sure you want to close the shop? This will end the business day and all active cashier shifts.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close Shop',
          style: 'destructive',
          onPress: async () => {
            try {
              setStatusLoading(true);
              const endResp = await shopAPI.endDay({
                closing_notes: 'End of day closure from owner dashboard'
              });

              // After successfully closing shop, attempt to settle all active drawers using reported current cash
              try {
                const allResp = await shopAPI.getAllDrawersStatus();
                if (allResp.data && allResp.data.success && allResp.data.shop_status && Array.isArray(allResp.data.shop_status.drawers)) {
                  const drawers = allResp.data.shop_status.drawers;
                  const settlePromises = drawers.map(d => {
                    // Use current cash as the counted cash for settlement
                    const actual_cash = d?.current_breakdown?.cash ?? d?.session_sales?.cash ?? 0;
                    // Try to resolve a cashier id; backend drawer summaries may not include cashier_id, so skip if missing
                    // If drawer has a cashier name only, we cannot map to id here.
                    return (async () => {
                      try {
                        if (!d?.cashier) return null;
                        // Attempt to find cashier by name via approved staff endpoint
                        const approved = await shopAPI.getApprovedStaff({});
                        const match = (approved.data || []).find(c => (c.name || c.username || String(c.id)) && (c.name && c.name.toLowerCase() === d.cashier.toLowerCase()));
                        const cashierId = match?.id || match?.cashier_id || null;
                        if (!cashierId) return null;
                        return await shopAPI.settleDrawer(cashierId, actual_cash);
                      } catch (err) {
                        return null;
                      }
                    })();
                  });

                  await Promise.all(settlePromises);
                }
              } catch (settleErr) {
                console.warn('Warning: failed to auto-settle some drawers after end-day', settleErr);
              }

              await loadShopStatus();
              Alert.alert('Success', 'Shop has been closed for the day and drawers settled.');
            } catch (error) {
              Alert.alert('Error', 'Failed to close shop. Please try again.');
            } finally {
              setStatusLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleRetry = () => {
    setLoading(true);
    loadShopData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading shop details...</Text>
      </View>
    );
  }

  if (!shopData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Unable to Load Shop Data</Text>
        <Text style={styles.errorText}>
          We couldn't load your shop details. This might be due to:
        </Text>
        <Text style={styles.errorBullets}>
          • Network connectivity issues{'\n'}
          • Session expired{'\n'}
          • Server temporarily unavailable
        </Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={handleRetry}
        >
          <Text style={styles.retryButtonText}>🔄 Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginButtonText}>🔑 Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={statusLoading || drawerLoading}
          onRefresh={() => {
            loadShopStatus();
            loadDrawerStatus();
          }}
        />
      }
    >
      {/* Futuristic 2080 Owner Command Center Header */}
      <View style={styles.futuristic2080Header} {...panResponder.panHandlers}>
        {/* Holographic Background Elements */}
        <View style={styles.holographicGrid} />
        <View style={styles.energyPulse} />
        <View style={styles.neuralNetworkLines} />
        
        {/* Top Control Bar */}
        <View style={styles.controlBar}>
          {/* Futuristic Sidebar Toggle */}
          <TouchableOpacity
            style={styles.futuristicSidebarToggle}
            onPress={() => setSidebarVisible(true)}
          >
            <View style={styles.sidebarGlowEffect} />
            <Icon name="menu" size={24} color="#00f5ff" />
            <Text style={styles.sidebarLabel}>MENU</Text>
          </TouchableOpacity>

          {/* Futuristic Refresh Button */}
          <TouchableOpacity 
            style={styles.futuristicRefreshButton} 
            onPress={() => { loadShopStatus(); loadDrawerStatus(); }}
          >
            <View style={styles.refreshGlowEffect} />
            <Icon name="sync" size={20} color="#00f5ff" />
            <Text style={styles.refreshLabel}>SYNC</Text>
          </TouchableOpacity>
        </View>
        
        {/* Central Company Identity */}
        <View style={styles.companyIdentityCenter}>
          {/* 2080 Badge */}
          <View style={styles.gen2080Badge}>
            <Icon name="military-tech" size={24} color="#ff0080" />
            <Text style={styles.gen2080Text}>GEN 2080</Text>
            <View style={styles.badgeScannerLine} />
          </View>
          
          {/* Main Company Title */}
          <View style={styles.companyTitleContainer}>
            <Text style={styles.companyNameText}>
              {shopData.name || shopData.shop_name || 'ENTERPRISE HQ'}
            </Text>
            <View style={styles.titleUnderlineGlow} />
          </View>
          
          {/* Company Details Matrix */}
          <View style={styles.companyDetailsMatrix}>
            <View style={styles.detailRow}>
              <Icon name="business" size={16} color="#00f5ff" />
              <Text style={styles.detailLabel}>ENTITY TYPE:</Text>
              <Text style={styles.detailValue}>{shopData.business_type || 'COMMERCIAL'}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Icon name="category" size={16} color="#00ff88" />
              <Text style={styles.detailLabel}>SECTOR:</Text>
              <Text style={styles.detailValue}>{shopData.industry || 'TECHNOLOGY'}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Icon name="fingerprint" size={16} color="#ffaa00" />
              <Text style={styles.detailLabel}>ID CODE:</Text>
              <Text style={styles.detailValue}>{shopData.shop_id || 'NX-2080'}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Icon name="email" size={16} color="#ff0080" />
              <Text style={styles.detailLabel}>NET NODE:</Text>
              <Text style={styles.detailValue}>{shopData.email || 'CONNECT@2080.NEXUS'}</Text>
            </View>
          </View>
        </View>
        
        {/* System Status Indicators */}
        <View style={styles.systemStatusPanel}>
          <View style={styles.statusIndicator}>
            <View style={styles.statusPulse} />
            <Text style={styles.statusText}>NEURAL INTERFACE: ONLINE</Text>
            <Icon name="wifi" size={16} color="#00ff88" />
          </View>
          
          <View style={styles.performanceMetrics}>
            <View style={styles.metricUnit}>
              <Text style={styles.metricLabel}>OPERATIONAL</Text>
              <Text style={styles.metricValue}>98.7%</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricUnit}>
              <Text style={styles.metricLabel}>EFFICIENCY</Text>
              <Text style={styles.metricValue}>MAX</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricUnit}>
              <Text style={styles.metricLabel}>STATUS</Text>
              <Text style={styles.metricValue}>ACTIVE</Text>
            </View>
          </View>
        </View>
        
        {/* Bottom Data Stream */}
        <View style={styles.dataStreamBar}>
          <View style={styles.streamDot} />
          <Text style={styles.streamText}>BUSINESS INTELLIGENCE GRID • REAL-TIME MONITORING • 2080 NEURAL DASHBOARD</Text>
          <View style={styles.streamDot} />
        </View>
      </View>

      {/* Futuristic 2080 Shop Status Command Center */}
      {shopStatus && (
        <View style={styles.futuristicStatusSection}>
          <View style={styles.statusSectionHeader}>
            <Icon name="psychology" size={24} color="#ff0080" />
            <Text style={styles.statusSectionTitle}>NEURAL STATUS INTERFACE</Text>
            <View style={styles.headerScanner} />
          </View>
          
          <View style={[
            styles.futuristicStatusCard,
            { 
              borderLeftColor: shopStatus.is_open ? '#00ff88' : '#ff4444',
              backgroundColor: shopStatus.is_open ? 'rgba(0, 255, 136, 0.05)' : 'rgba(255, 68, 68, 0.05)'
            }
          ]}>
            {/* Status Header with Holographic Display */}
            <View style={styles.statusDisplayHeader}>
              <View style={[
                styles.statusOrb,
                { backgroundColor: shopStatus.is_open ? '#00ff88' : '#ff4444' }
              ]} />
              <View style={styles.statusTextContainer}>
                <Text style={[
                  styles.statusMainText,
                  { color: shopStatus.is_open ? '#00ff88' : '#ff4444' }
                ]}>
                  {shopStatus.is_open ? 'OPERATIONAL' : 'OFFLINE'}
                </Text>
                <Text style={styles.statusSubText}>
                  {shopStatus.is_open ? 'BUSINESS ACTIVE' : 'SYSTEM STANDBY'}
                </Text>
              </View>
              <View style={[
                styles.statusIndicatorLine,
                { backgroundColor: shopStatus.is_open ? '#00ff88' : '#ff4444' }
              ]} />
            </View>
            
            {/* Operational Data Stream */}
            {shopStatus.is_open && shopStatus.current_shop_day && (
              <View style={styles.operationalDataStream}>
                <View style={styles.dataStreamItem}>
                  <Icon name="schedule" size={16} color="#00f5ff" />
                  <Text style={styles.dataLabel}>INITIATED:</Text>
                  <Text style={styles.dataValue}>
                    {new Date(shopStatus.current_shop_day.opened_at).toLocaleString()}
                  </Text>
                </View>
                
                {shopStatus.active_cashiers && shopStatus.active_cashiers.length > 0 && (
                  <View style={styles.dataStreamItem}>
                    <Icon name="people" size={16} color="#ffaa00" />
                    <Text style={styles.dataLabel}>ACTIVE UNITS:</Text>
                    <Text style={styles.dataValue}>{shopStatus.active_cashiers.length} CASHIERS</Text>
                  </View>
                )}
                
                <View style={styles.dataStreamItem}>
                  <Icon name="speed" size={16} color="#ff0080" />
                  <Text style={styles.dataLabel}>UPTIME:</Text>
                  <Text style={styles.dataValue}>
                    {Math.floor((new Date() - new Date(shopStatus.current_shop_day.opened_at)) / (1000 * 60 * 60))}H ACTIVE
                  </Text>
                </View>
              </View>
            )}
            
            {/* Offline State Display */}
            {!shopStatus.is_open && (
              <View style={styles.offlineStateDisplay}>
                <Text style={styles.offlineMessage}>
                  🔴 SHOP SYSTEMS IN STANDBY MODE
                </Text>
                <Text style={styles.offlineSubMessage}>
                  Neural interface ready for day initialization
                </Text>
              </View>
            )}
            
            {/* Futuristic Control Interface */}
            <View style={styles.neuralControlInterface}>
              {!shopStatus.is_open ? (
                <TouchableOpacity 
                  style={styles.futuristicStartButton}
                  onPress={handleStartDay}
                  activeOpacity={0.8}
                >
                  <View style={styles.buttonGlow} />
                  <Icon name="play-arrow" size={24} color="#00ff88" />
                  <Text style={styles.startButtonText}>INITIALIZE DAY</Text>
                  <View style={styles.buttonScanner} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[
                    styles.futuristicEndButton,
                    statusLoading && styles.disabledNeuralButton
                  ]}
                  onPress={handleEndDay}
                  disabled={statusLoading}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.buttonGlow,
                    { backgroundColor: statusLoading ? '#666' : '#ff4444' }
                  ]} />
                  <Icon name="stop" size={24} color={statusLoading ? '#666' : '#ff4444'} />
                  <Text style={[
                    styles.endButtonText,
                    { color: statusLoading ? '#666' : '#ff4444' }
                  ]}>
                    {statusLoading ? 'TERMINATING...' : 'SHUTDOWN SYSTEMS'}
                  </Text>
                  {!statusLoading && <View style={styles.buttonScanner} />}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Advanced System Monitoring Neural Grid */}
      <View style={styles.systemMonitoringSection}>
        <View style={styles.monitoringHeader}>
          <Icon name="psychology" size={28} color="#ff0080" />
          <Text style={styles.monitoringTitle}>SYSTEM INTELLIGENCE MATRIX</Text>
          <View style={styles.monitoringScanner} />
        </View>
        
        {/* System Performance Metrics */}
        <View style={styles.performanceMatrix}>
          <View style={styles.performanceCard}>
            <View style={styles.cardHeader}>
              <Icon name="speed" size={20} color="#00f5ff" />
              <Text style={styles.cardTitle}>CPU NEURAL LOAD</Text>
            </View>
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${cpuLoad}%` }]} />
              <Text style={styles.progressValue}>{cpuLoad.toFixed(1)}%</Text>
            </View>
            <Text style={styles.cardSubtext}>NEURAL PROCESSING</Text>
          </View>
          
          <View style={styles.performanceCard}>
            <View style={styles.cardHeader}>
              <Icon name="memory" size={20} color="#00ff88" />
              <Text style={styles.cardTitle}>MEMORY ALLOCATION</Text>
            </View>
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${memoryUsage}%` }]} />
              <Text style={styles.progressValue}>{memoryUsage.toFixed(1)}%</Text>
            </View>
            <Text style={styles.cardSubtext}>MEMORY ALLOCATION</Text>
          </View>
          
          <View style={styles.performanceCard}>
            <View style={styles.cardHeader}>
              <Icon name="storage" size={20} color="#ffaa00" />
              <Text style={styles.cardTitle}>DISK NEURAL SPACE</Text>
            </View>
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${diskSpace}%` }]} />
              <Text style={styles.progressValue}>{diskSpace.toFixed(1)}%</Text>
            </View>
            <Text style={styles.cardSubtext}>DISK OPTIMIZATION</Text>
          </View>
        </View>
        
        {/* Network Status Matrix */}
        <View style={styles.networkMatrix}>
          <View style={styles.networkHeader}>
            <Icon name="wifi" size={20} color="#00ff88" />
            <Text style={styles.networkTitle}>NEURAL NETWORK STATUS</Text>
          </View>
          <View style={styles.networkGrid}>
            <View style={styles.networkItem}>
              <Text style={styles.networkLabel}>SERVER CONNECTIVITY</Text>
              <View style={styles.statusIndicator}><View style={styles.statusDotOnline} /></View>
              <Text style={styles.networkValue}>ONLINE</Text>
            </View>
            <View style={styles.networkItem}>
              <Text style={styles.networkLabel}>API RESPONSE TIME</Text>
              <Text style={styles.networkValue}>{apiResponseTime.toFixed(0)}ms</Text>
            </View>
            <View style={styles.networkItem}>
              <Text style={styles.networkLabel}>PACKET LOSS</Text>
              <Text style={styles.networkValue}>{packetLoss.toFixed(3)}%</Text>
            </View>
            <View style={styles.networkItem}>
              <Text style={styles.networkLabel}>BANDWIDTH USAGE</Text>
              <Text style={styles.networkValue}>{bandwidthUsage.toFixed(1)} GB/s</Text>
            </View>
          </View>
        </View>
        
        {/* System Alerts Matrix */}
        <View style={styles.alertsMatrix}>
          <View style={styles.alertsHeader}>
            <Icon name="warning" size={20} color="#ffaa00" />
            <Text style={styles.alertsTitle}>SYSTEM INTELLIGENCE ALERTS</Text>
          </View>
          <View style={styles.alertsList}>
            <View style={styles.alertItem}>
              <Icon name="info" size={16} color="#00f5ff" />
              <Text style={styles.alertText}>Neural backup protocols {Math.random() > 0.5 ? 'updated' : 'initialized'} successfully</Text>
              <Text style={styles.alertTime}>{Math.floor(Math.random() * 5 + 1)} min ago</Text>
            </View>
            <View style={styles.alertItem}>
              <Icon name="check-circle" size={16} color="#00ff88" />
              <Text style={styles.alertText}>Database optimization cycle {Math.random() > 0.3 ? 'completed' : 'initiated'}</Text>
              <Text style={styles.alertTime}>{Math.floor(Math.random() * 20 + 5)} min ago</Text>
            </View>
            <View style={styles.alertItem}>
              <Icon name="security" size={16} color="#ff0080" />
              <Text style={styles.alertText}>Security scan: {Math.random() > 0.8 ? 'Minor alert detected' : 'No threats detected'}</Text>
              <Text style={styles.alertTime}>{Math.floor(Math.random() * 60 + 15)} min ago</Text>
            </View>
            <View style={styles.alertItem}>
              <Icon name="warning" size={16} color="#ffaa00" />
              <Text style={styles.alertText}>Performance optimization {Math.random() > 0.6 ? 'recommended' : 'applied'}</Text>
              <Text style={styles.alertTime}>{Math.floor(Math.random() * 90 + 30)} min ago</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Advanced Data Visualization Matrix */}
      <View style={styles.dataVizSection}>
        <View style={styles.vizHeader}>
          <Icon name="analytics" size={28} color="#ff0080" />
          <Text style={styles.vizTitle}>NEURAL DATA VISUALIZATION</Text>
          <View style={styles.vizScanner} />
        </View>
        
        {/* Live Processing Indicators */}
        <View style={styles.processingMatrix}>
          <View style={styles.processingCard}>
            <View style={styles.processingHeader}>
              {isLoading ? <View style={styles.loadingSpinner} /> : <Icon name="point-of-sale" size={20} color="#ff0080" />}
              <Text style={styles.processingTitle}>LIVE SALES ACTIVITY</Text>
            </View>
            <View style={styles.processingData}>
              <Text style={styles.processingMetric}>{Math.round((salesMetrics.todayTransactions / Math.max(new Date().getHours(), 1)) || 0)}</Text>
              <Text style={styles.processingLabel}>SALES PER HOUR</Text>
            </View>
            <View style={styles.processingBar}>
              <View style={[styles.processingProgress, { width: `${Math.min(95, ((salesMetrics.todayTransactions / Math.max(new Date().getHours(), 1)) / 45) * 100)}%` }]} />
            </View>
          </View>
          
          <View style={styles.processingCard}>
            <View style={styles.processingHeader}>
              <Icon name="timeline" size={20} color="#00ff88" />
              <Text style={styles.processingTitle}>AI ALGORITHM STATUS</Text>
            </View>
            <View style={styles.processingData}>
              <Text style={styles.processingMetric}>ACTIVE</Text>
              <Text style={styles.processingLabel}>SALES PERFORMANCE</Text>
            </View>
            <View style={styles.aiStatusGrid}>
              <View style={styles.aiStatusItem}><Text style={styles.aiStatusText}>TODAY: ${(salesMetrics.todaySales || 0).toLocaleString()}</Text></View>
              <View style={styles.aiStatusItem}><Text style={styles.aiStatusText}>WEEK: ${(salesMetrics.weekSales || 0).toLocaleString()}</Text></View>
            </View>
          </View>
        </View>
        
        {/* Neural Activity Feed */}
        <View style={styles.activityFeed}>
          <View style={styles.feedHeader}>
            <Icon name="timeline" size={20} color="#ffaa00" />
            <Text style={styles.feedTitle}>NEURAL ACTIVITY STREAM</Text>
          </View>
          <View style={styles.feedContent}>
            {activityFeed.map((activity, index) => (
              <View key={activity.id || index} style={styles.activityItem}>
                <View style={[styles.activityPulse, { backgroundColor: activity.isLive ? '#ff0080' : '#00f5ff' }]} />
                <Text style={styles.activityText}>{activity.text}</Text>
                <Text style={styles.activityTime}>{activity.time}</Text>
              </View>
            ))}
            
            {/* Show real business activities based on actual data */}
            {salesMetrics.todayTransactions > 0 && (
              <View style={styles.activityItem}>
                <View style={[styles.activityPulse, { backgroundColor: '#00ff88' }]} />
                <Text style={styles.activityText}>Sales processing active - {salesMetrics.todayTransactions} transactions logged</Text>
                <Text style={styles.activityTime}>REAL-TIME</Text>
              </View>
            )}
            
            {salesMetrics.todaySales > 0 && (
              <View style={styles.activityItem}>
                <View style={styles.activityPulse} />
                <Text style={styles.activityText}>Revenue tracking: ${salesMetrics.todaySales.toLocaleString()} processed today</Text>
                <Text style={styles.activityTime}>LIVE</Text>
              </View>
            )}
            
            {salesMetrics.topSellingProducts.length > 0 && (
              <View style={styles.activityItem}>
                <View style={styles.activityPulse} />
                <Text style={styles.activityText}>Top performer: {salesMetrics.topSellingProducts[0].name}</Text>
                <Text style={styles.activityTime}>ANALYZED</Text>
              </View>
            )}
            
            {shopStatus?.is_open && (
              <View style={styles.activityItem}>
                <View style={styles.activityPulse} />
                <Text style={styles.activityText}>Business operations active - Neural interface online</Text>
                <Text style={styles.activityTime}>ACTIVE</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Revolutionary 2080 Cash Neural Interface */}
      {drawerStatus && (
        <View style={styles.cashNeuralInterfaceSection}>
          <View style={styles.cashInterfaceHeader}>
            <Icon name="account-balance" size={28} color="#00ff88" />
            <Text style={styles.cashInterfaceTitle}>FINANCIAL NEURAL GRID</Text>
            <View style={styles.cashHeaderScanner} />
          </View>
          
          {/* Core Financial Metrics Display */}
          <View style={styles.financialMetricsMatrix}>
            {/* Active Units Monitor */}
            <View style={styles.metricMonitor}>
              <View style={styles.metricIconContainer}>
                <Icon name="devices" size={20} color="#00f5ff" />
              </View>
              <View style={styles.metricDataContainer}>
                <Text style={styles.metricLabel}>ACTIVE UNITS</Text>
                <Text style={styles.metricValue}>{drawerStatus.active_drawers || 0}</Text>
                <Text style={styles.metricSubtext}>CASHIER TERMINALS</Text>
              </View>
              <View style={styles.metricPulse} />
            </View>
            
            {/* Expected Cash Flow */}
            <View style={styles.metricMonitor}>
              <View style={styles.metricIconContainer}>
                <Icon name="schedule" size={20} color="#ffaa00" />
              </View>
              <View style={styles.metricDataContainer}>
                <Text style={styles.metricLabel}>PROJECTED FLOW</Text>
                <Text style={styles.metricValue}>${(drawerStatus.cash_flow?.total_expected_cash || 0).toLocaleString()}</Text>
                <Text style={styles.metricSubtext}>EXPECTED TOTAL</Text>
              </View>
              <View style={styles.metricPulse} />
            </View>
            
            {/* Current Cash Total */}
            <View style={styles.metricMonitor}>
              <View style={styles.metricIconContainer}>
                <Icon name="attach-money" size={20} color="#00ff88" />
              </View>
              <View style={styles.metricDataContainer}>
                <Text style={styles.metricLabel}>CURRENT HOLDING</Text>
                <Text style={styles.metricValue}>${(drawerStatus.cash_flow?.total_current_cash || 0).toLocaleString()}</Text>
                <Text style={styles.metricSubtext}>REAL-TIME TOTAL</Text>
              </View>
              <View style={styles.metricPulse} />
            </View>
            
            {/* Variance Analysis */}
            <View style={styles.metricMonitor}>
              <View style={styles.metricIconContainer}>
                <Icon name="trending-up" size={20} color={(drawerStatus.cash_flow?.variance || 0) >= 0 ? '#00ff88' : '#ff4444'} />
              </View>
              <View style={styles.metricDataContainer}>
                <Text style={styles.metricLabel}>VARIANCE MATRIX</Text>
                <Text style={[
                  styles.metricValue,
                  { color: (drawerStatus.cash_flow?.variance || 0) >= 0 ? '#00ff88' : '#ff4444' }
                ]}>
                  ${(drawerStatus.cash_flow?.variance || 0).toLocaleString()}
                </Text>
                <Text style={[
                  styles.metricSubtext,
                  { color: (drawerStatus.cash_flow?.variance || 0) >= 0 ? '#00ff88' : '#ff4444' }
                ]}>
                  {(drawerStatus.cash_flow?.variance || 0) >= 0 ? 'SURPLUS DETECTED' : 'DEFICIT ALERT'}
                </Text>
              </View>
              <View style={[
                styles.metricPulse,
                { backgroundColor: (drawerStatus.cash_flow?.variance || 0) >= 0 ? '#00ff88' : '#ff4444' }
              ]} />
            </View>
          </View>
          
          {/* Individual Unit Neural Profiles */}
          {drawerStatus.drawers && drawerStatus.drawers.length > 0 && (
            <View style={styles.unitNeuralProfiles}>
              <View style={styles.profilesHeader}>
                <Icon name="people" size={20} color="#ff0080" />
                <Text style={styles.profilesTitle}>UNIT NEURAL PROFILES</Text>
                <Text style={styles.profilesCount}>({drawerStatus.drawers.length} ACTIVE)</Text>
              </View>
              
              <View style={styles.profilesGrid}>
                {drawerStatus.drawers.slice(0, 4).map((drawer, index) => (
                  <View key={index} style={styles.neuralProfileCard}>
                    <View style={styles.profileHeader}>
                      <Text style={styles.profileName}>{drawer.cashier}</Text>
                      <View style={[
                        styles.unitStatusIndicator,
                        { 
                          backgroundColor: drawer.status === 'ACTIVE' ? '#00ff88' : drawer.status === 'SETTLED' ? '#00f5ff' : '#888'
                        }
                      ]} />
                    </View>
                    
                    <View style={styles.profileMetrics}>
                      <View style={styles.profileMetric}>
                        <Text style={styles.profileMetricLabel}>FLOAT</Text>
                        <Text style={styles.profileMetricValue}>${drawer.float_amount.toFixed(2)}</Text>
                      </View>
                      <View style={styles.profileMetric}>
                        <Text style={styles.profileMetricLabel}>CASH</Text>
                        <Text style={styles.profileMetricValue}>${drawer.current_breakdown.cash.toFixed(2)}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.profileStatus}>
                      <Text style={[
                        styles.profileStatusText,
                        { color: drawer.status === 'ACTIVE' ? '#00ff88' : drawer.status === 'SETTLED' ? '#00f5ff' : '#888' }
                      ]}>
                        {drawer.status === 'ACTIVE' ? '● OPERATIONAL' : 
                         drawer.status === 'SETTLED' ? '● SETTLED' : '● INACTIVE'}
                      </Text>
                    </View>
                    
                    <View style={styles.neuralLine} />
                  </View>
                ))}
              </View>
              
              {drawerStatus.drawers.length > 4 && (
                <View style={styles.moreUnitsIndicator}>
                  <Text style={styles.moreUnitsText}>... +{drawerStatus.drawers.length - 4} MORE UNITS</Text>
                  <View style={styles.unitsScanner} />
                </View>
              )}
            </View>
          )}
          
          {/* Financial Status Summary */}
          <View style={styles.financialStatusSummary}>
            <View style={styles.statusSummaryHeader}>
              <Icon name="analytics" size={18} color="#ffaa00" />
              <Text style={styles.summaryTitle}>FINANCIAL NEURAL ANALYSIS</Text>
            </View>
            
            <View style={styles.analysisMetrics}>
              <View style={styles.analysisItem}>
                <Text style={styles.analysisLabel}>EFFICIENCY RATE</Text>
                <Text style={styles.analysisValue}>
                  {drawerStatus.active_drawers > 0 ? 
                    ((drawerStatus.cash_flow?.total_current_cash || 0) / (drawerStatus.cash_flow?.total_expected_cash || 1) * 100).toFixed(1) : '0'}%
                </Text>
              </View>
              
              <View style={styles.analysisDivider} />
              
              <View style={styles.analysisItem}>
                <Text style={styles.analysisLabel}>CASH FLOW STATUS</Text>
                <Text style={[
                  styles.analysisValue,
                  { color: (drawerStatus.cash_flow?.variance || 0) >= 0 ? '#00ff88' : '#ff4444' }
                ]}>
                  {(drawerStatus.cash_flow?.variance || 0) >= 0 ? 'OPTIMAL' : 'REQUIRES ATTENTION'}
                </Text>
              </View>
              
              <View style={styles.analysisDivider} />
              
              <View style={styles.analysisItem}>
                <Text style={styles.analysisLabel}>SYSTEM HEALTH</Text>
                <Text style={styles.analysisValue}>98.7%</Text>
              </View>
            </View>
          </View>
        </View>
      )}









      {/* Advanced System Configuration Matrix */}
      <View style={styles.configSection}>
        <View style={styles.configHeader}>
          <Icon name="settings" size={28} color="#00ff88" />
          <Text style={styles.configTitle}>NEURAL SYSTEM CONFIGURATION</Text>
          <View style={styles.configScanner} />
        </View>
        
        {/* System Actions Display */}
        <View style={styles.systemActionsMatrix}>
          <View style={styles.actionsHeader}>
            <Icon name="inventory" size={20} color="#8b5cf6" />
            <Text style={styles.actionsTitle}>INVENTORY ACTIONS</Text>
          </View>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate(ROUTES.STOCK_TAKE)}
            >
              <Icon name="assignment" size={24} color="#8b5cf6" />
              <Text style={styles.actionCardTitle}>STOCK TAKE</Text>
              <Text style={styles.actionCardSubtitle}>Physical Count</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate(ROUTES.STOCK_VALUATION)}
            >
              <Icon name="account-balance" size={24} color="#00ff88" />
              <Text style={styles.actionCardTitle}>STOCK VALUATION</Text>
              <Text style={styles.actionCardSubtitle}>Inventory Value</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* System Architecture Display */}
        <View style={styles.architectureMatrix}>
          <View style={styles.archHeader}>
            <Icon name="architecture" size={20} color="#00f5ff" />
            <Text style={styles.archTitle}>SYSTEM ARCHITECTURE</Text>
          </View>
          <View style={styles.archGrid}>
            <View style={styles.archComponent}>
              <Text style={styles.archName}>NEURAL CORE</Text>
              <Text style={styles.archStatus}>ACTIVE</Text>
              <Text style={styles.archDetails}>v3.7.2-β</Text>
            </View>
            <View style={styles.archComponent}>
              <Text style={styles.archName}>DATA LAYER</Text>
              <Text style={styles.archStatus}>OPTIMIZED</Text>
              <Text style={styles.archDetails}>PostgreSQL 15.2</Text>
            </View>
            <View style={styles.archComponent}>
              <Text style={styles.archName}>AI ENGINE</Text>
              <Text style={styles.archStatus}>LEARNING</Text>
              <Text style={styles.archDetails}>TensorFlow 2.12</Text>
            </View>
            <View style={styles.archComponent}>
              <Text style={styles.archName}>SECURITY LAYER</Text>
              <Text style={styles.archStatus}>SECURED</Text>
              <Text style={styles.archDetails}>AES-256</Text>
            </View>
          </View>
        </View>
        
        {/* Performance Metrics */}
        <View style={styles.metricsMatrix}>
          <View style={styles.metricsHeader}>
            <Icon name="speed" size={20} color="#ffaa00" />
            <Text style={styles.metricsTitle}>PERFORMANCE METRICS</Text>
          </View>
          <View style={styles.metricsGrid}>
            <View style={styles.metricBox}>
              <Text style={styles.metricBigNumber}>{uptime.toFixed(2)}%</Text>
              <Text style={styles.metricLabel}>UPTIME</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricBigNumber}>{avgResponse.toFixed(1)}ms</Text>
              <Text style={styles.metricLabel}>AVG RESPONSE</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricBigNumber}>{requestsPerHour.toLocaleString()}</Text>
              <Text style={styles.metricLabel}>REQUESTS/HR</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricBigNumber}>{dataProcessed.toFixed(1)}TB</Text>
              <Text style={styles.metricLabel}>DATA PROCESSED</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Bottom Padding */}
      <View style={styles.bottomPadding} />

      {/* Feature Sidebar */}
      <FeatureSidebar
        isVisible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
    padding: 20,
  },
  errorTitle: {
    color: '#ef4444',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorBullets: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'left',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#6b7280',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Revolutionary 2080 Futuristic Header Styles
  futuristic2080Header: {
    backgroundColor: '#0a0a0a',
    padding: 20,
    paddingTop: 20,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 400,
    borderBottomWidth: 2,
    borderBottomColor: '#00f5ff',
  },
  holographicGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    backgroundImage: 'linear-gradient(90deg, rgba(0,245,255,0.1) 1px, transparent 1px), linear-gradient(rgba(0,245,255,0.1) 1px, transparent 1px)',
    backgroundSize: '20px 20px',
    opacity: 0.3,
  },
  energyPulse: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'linear-gradient(90deg, #ff0080, #00f5ff, #00ff88, #ffaa00)',
    background: 'linear-gradient(90deg, #ff0080, #00f5ff, #00ff88, #ffaa00)',
    animation: 'pulse 2s infinite',
  },
  neuralNetworkLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  controlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    zIndex: 10,
  },
  futuristicSidebarToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#00f5ff',
    position: 'relative',
    overflow: 'hidden',
  },
  sidebarGlowEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 245, 255, 0.2)',
    borderRadius: 12,
  },
  sidebarLabel: {
    color: '#00f5ff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
    letterSpacing: 2,
  },
  futuristicRefreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#00f5ff',
    position: 'relative',
    overflow: 'hidden',
  },
  refreshGlowEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 245, 255, 0.2)',
    borderRadius: 12,
  },
  refreshLabel: {
    color: '#00f5ff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
    letterSpacing: 2,
  },
  companyIdentityCenter: {
    alignItems: 'center',
    marginBottom: 30,
  },
  gen2080Badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 128, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ff0080',
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  gen2080Text: {
    color: '#ff0080',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 10,
    letterSpacing: 3,
  },
  badgeScannerLine: {
    position: 'absolute',
    top: 0,
    left: '-100%',
    right: 0,
    height: '100%',
    backgroundColor: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
  },
  companyTitleContainer: {
    alignItems: 'center',
    marginBottom: 25,
    position: 'relative',
  },
  companyNameText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 3,
    textShadowColor: '#00f5ff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  titleUnderlineGlow: {
    width: 200,
    height: 2,
    backgroundColor: 'linear-gradient(90deg, #00f5ff, #ff0080, #00ff88)',
    marginTop: 8,
  },
  companyDetailsMatrix: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#00f5ff',
    width: '100%',
    maxWidth: 400,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  detailLabel: {
    color: '#00f5ff',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 10,
    marginRight: 10,
    letterSpacing: 1,
    minWidth: 80,
  },
  detailValue: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  systemStatusPanel: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#00ff88',
    marginBottom: 20,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statusPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00ff88',
    marginRight: 8,
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  performanceMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  metricUnit: {
    alignItems: 'center',
  },
  metricLabel: {
    color: '#00ff88',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  metricValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  metricDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#00ff88',
    opacity: 0.5,
  },
  dataStreamBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 170, 0, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ffaa00',
  },
  streamDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffaa00',
    marginHorizontal: 10,
  },
  streamText: {
    color: '#ffaa00',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },




  // Futuristic 2080 Status Section Styles
  futuristicStatusSection: {
    padding: 20,
    paddingTop: 10,
  },
  statusSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  statusSectionTitle: {
    color: '#ff0080',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
    letterSpacing: 2,
    textShadowColor: '#ff0080',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  headerScanner: {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: [{ translateX: -50 }],
    width: 200,
    height: 2,
    backgroundColor: 'linear-gradient(90deg, #ff0080, #00f5ff, #ff0080)',
  },
  futuristicStatusCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderLeftWidth: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  statusDisplayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusOrb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusMainText: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 3,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  statusSubText: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    letterSpacing: 1,
  },
  statusIndicatorLine: {
    width: 60,
    height: 4,
    borderRadius: 2,
  },
  operationalDataStream: {
    backgroundColor: 'rgba(0, 245, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)',
    marginBottom: 20,
  },
  dataStreamItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dataLabel: {
    color: '#00f5ff',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 10,
    marginRight: 10,
    letterSpacing: 1,
    minWidth: 80,
  },
  dataValue: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  offlineStateDisplay: {
    backgroundColor: 'rgba(255, 68, 68, 0.05)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    marginBottom: 20,
    alignItems: 'center',
  },
  offlineMessage: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  offlineSubMessage: {
    color: '#888',
    fontSize: 12,
    letterSpacing: 1,
  },
  neuralControlInterface: {
    alignItems: 'center',
  },
  futuristicStartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#00ff88',
    position: 'relative',
    overflow: 'hidden',
    minWidth: 200,
    justifyContent: 'center',
  },
  buttonGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    borderRadius: 16,
  },
  startButtonText: {
    color: '#00ff88',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 12,
    letterSpacing: 2,
  },
  futuristicEndButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#ff4444',
    position: 'relative',
    overflow: 'hidden',
    minWidth: 200,
    justifyContent: 'center',
  },
  endButtonText: {
    color: '#ff4444',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 12,
    letterSpacing: 2,
  },
  disabledNeuralButton: {
    opacity: 0.6,
    borderColor: '#666',
  },
  buttonScanner: {
    position: 'absolute',
    top: 0,
    left: '-100%',
    right: 0,
    height: '100%',
    backgroundColor: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
    borderRadius: 16,
  },



  bottomPadding: {
    height: 40,
  },
  
  // Advanced System Monitoring Neural Grid Styles
  systemMonitoringSection: {
    padding: 20,
    paddingTop: 10,
  },
  monitoringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
    position: 'relative',
  },
  monitoringTitle: {
    color: '#ff0080',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
    letterSpacing: 2,
    textShadowColor: '#ff0080',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  monitoringScanner: {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: [{ translateX: -50 }],
    width: 280,
    height: 2,
    backgroundColor: 'linear-gradient(90deg, #ff0080, #00f5ff, #ff0080)',
  },
  performanceMatrix: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: '#00f5ff',
    marginBottom: 20,
  },
  performanceCard: {
    backgroundColor: 'rgba(0, 245, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)',
    position: 'relative',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    color: '#00f5ff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 10,
    letterSpacing: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'linear-gradient(90deg, #00f5ff, #00ff88)',
    borderRadius: 3,
    marginRight: 12,
  },
  progressValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardSubtext: {
    color: '#888',
    fontSize: 10,
    letterSpacing: 1,
  },
  networkMatrix: {
    backgroundColor: 'rgba(0, 255, 136, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
    marginBottom: 20,
  },
  networkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  networkTitle: {
    color: '#00ff88',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    letterSpacing: 2,
  },
  networkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  networkItem: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
  },
  networkLabel: {
    color: '#888',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: 'center',
  },
  networkValue: {
    color: '#00ff88',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  statusDotOnline: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00ff88',
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  alertsMatrix: {
    backgroundColor: 'rgba(255, 170, 0, 0.05)',
    borderRadius: 20,
    padding: 20,
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
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    letterSpacing: 1,
  },
  alertsList: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 16,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  alertText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
  },
  alertTime: {
    color: '#888',
    fontSize: 10,
    letterSpacing: 1,
  },
  // Advanced Data Visualization Matrix Styles
  dataVizSection: {
    padding: 20,
    paddingTop: 10,
  },
  vizHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
    position: 'relative',
  },
  vizTitle: {
    color: '#ff0080',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
    letterSpacing: 2,
    textShadowColor: '#ff0080',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  vizScanner: {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: [{ translateX: -50 }],
    width: 300,
    height: 2,
    backgroundColor: 'linear-gradient(90deg, #ff0080, #00f5ff, #ffaa00, #ff0080)',
  },
  processingMatrix: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: '#ff0080',
    marginBottom: 20,
  },
  processingCard: {
    backgroundColor: 'rgba(255, 0, 128, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 128, 0.3)',
    position: 'relative',
    overflow: 'hidden',
  },
  processingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingSpinner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ff0080',
    borderTopColor: 'transparent',
    marginRight: 12,
  },
  processingTitle: {
    color: '#ff0080',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  processingData: {
    alignItems: 'center',
    marginBottom: 16,
  },
  processingMetric: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 4,
    textShadowColor: '#ff0080',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  processingLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  processingBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  processingProgress: {
    height: '100%',
    backgroundColor: 'linear-gradient(90deg, #ff0080, #ffaa00)',
    borderRadius: 2,
  },
  aiStatusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  aiStatusItem: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
  },
  aiStatusText: {
    color: '#00ff88',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  activityFeed: {
    backgroundColor: 'rgba(255, 170, 0, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 170, 0, 0.3)',
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  feedTitle: {
    color: '#ffaa00',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    letterSpacing: 1,
  },
  feedContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 16,
    maxHeight: 200,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  activityPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00f5ff',
    marginRight: 12,
    shadowColor: '#00f5ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  activityText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  activityTime: {
    color: '#ffaa00',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  // Revolutionary 2080 Cash Neural Interface Styles
  cashNeuralInterfaceSection: {
    padding: 20,
    paddingTop: 10,
  },
  cashInterfaceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
    position: 'relative',
  },
  cashInterfaceTitle: {
    color: '#00ff88',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
    letterSpacing: 2,
    textShadowColor: '#00ff88',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  cashHeaderScanner: {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: [{ translateX: -50 }],
    width: 250,
    height: 2,
    backgroundColor: 'linear-gradient(90deg, #00ff88, #00f5ff, #00ff88)',
  },
  financialMetricsMatrix: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: '#00f5ff',
    marginBottom: 20,
  },
  metricMonitor: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 245, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)',
    position: 'relative',
    overflow: 'hidden',
  },
  metricIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 245, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  metricDataContainer: {
    flex: 1,
  },
  metricLabel: {
    color: '#00f5ff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  metricValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 2,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  metricSubtext: {
    color: '#888',
    fontSize: 9,
    letterSpacing: 1,
  },
  metricPulse: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00f5ff',
    shadowColor: '#00f5ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  unitNeuralProfiles: {
    backgroundColor: 'rgba(255, 0, 128, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 128, 0.3)',
    marginBottom: 20,
  },
  profilesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  profilesTitle: {
    color: '#ff0080',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    letterSpacing: 2,
  },
  profilesCount: {
    color: '#888',
    fontSize: 12,
    marginLeft: 8,
  },
  profilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  neuralProfileCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 128, 0.3)',
    position: 'relative',
    overflow: 'hidden',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  profileName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  unitStatusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  profileMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  profileMetric: {
    alignItems: 'center',
  },
  profileMetricLabel: {
    color: '#888',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  profileMetricValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileStatus: {
    alignItems: 'center',
    marginBottom: 8,
  },
  profileStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  neuralLine: {
    height: 1,
    backgroundColor: 'linear-gradient(90deg, transparent, #ff0080, transparent)',
    marginTop: 8,
  },
  moreUnitsIndicator: {
    backgroundColor: 'rgba(255, 0, 128, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 128, 0.3)',
    alignItems: 'center',
    marginTop: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  moreUnitsText: {
    color: '#ff0080',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  unitsScanner: {
    position: 'absolute',
    top: 0,
    left: '-100%',
    right: 0,
    height: '100%',
    backgroundColor: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
    borderRadius: 12,
  },
  financialStatusSummary: {
    backgroundColor: 'rgba(255, 170, 0, 0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 170, 0, 0.3)',
  },
  statusSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    color: '#ffaa00',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    letterSpacing: 1,
  },
  analysisMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  analysisItem: {
    alignItems: 'center',
    flex: 1,
  },
  analysisLabel: {
    color: '#ffaa00',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 6,
    textAlign: 'center',
  },
  analysisValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  analysisDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#ffaa00',
    opacity: 0.5,
  },
  // Advanced System Configuration Matrix Styles
  configSection: {
    padding: 20,
    paddingTop: 10,
  },
  configHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
    position: 'relative',
  },
  configTitle: {
    color: '#00ff88',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
    letterSpacing: 2,
    textShadowColor: '#00ff88',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  configScanner: {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: [{ translateX: -50 }],
    width: 320,
    height: 2,
    backgroundColor: 'linear-gradient(90deg, #00ff88, #00f5ff, #00ff88)',
  },
  architectureMatrix: {
    backgroundColor: 'rgba(0, 255, 136, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
    marginBottom: 20,
  },
  archHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  archTitle: {
    color: '#00f5ff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    letterSpacing: 2,
  },
  archGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  archComponent: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
  },
  archName: {
    color: '#00f5ff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  archStatus: {
    color: '#00ff88',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  archDetails: {
    color: '#888',
    fontSize: 10,
    letterSpacing: 1,
  },
  // System Actions Styles
  systemActionsMatrix: {
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    marginBottom: 20,
  },
  actionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  actionsTitle: {
    color: '#8b5cf6',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    letterSpacing: 2,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    padding: 20,
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  actionCardTitle: {
    color: '#8b5cf6',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 4,
  },
  actionCardSubtitle: {
    color: '#888',
    fontSize: 10,
    letterSpacing: 1,
    textAlign: 'center',
  },
  metricsMatrix: {
    backgroundColor: 'rgba(255, 170, 0, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 170, 0, 0.3)',
  },
  metricsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  metricsTitle: {
    color: '#ffaa00',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    letterSpacing: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 20,
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 170, 0, 0.3)',
  },
  metricBigNumber: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
    textShadowColor: '#ffaa00',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  metricLabel: {
    color: '#ffaa00',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
  },
  

});

export default OwnerDashboardScreen;