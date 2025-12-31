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

    // Poll shop status and drawer status every 5 seconds for near-real-time updates
    const statusInterval = setInterval(() => {
      loadShopStatus();
      loadDrawerStatus();
    }, 5000);

    return () => clearInterval(statusInterval);
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
      {/* Top Section with Shop Info */}
      <View style={styles.topSection} {...panResponder.panHandlers}>
        {/* Sidebar Toggle Button */}
        <TouchableOpacity
          style={styles.sidebarToggle}
          onPress={() => setSidebarVisible(true)}
        >
          <Text style={styles.sidebarToggleIcon}>☰</Text>
        </TouchableOpacity>

        {/* Shop Details on Top Right */}
        <View style={styles.shopDetailsRight}>
          <Text style={styles.shopIdText}>Shop ID: {shopData.shop_id || 'N/A'}</Text>
          <Text style={styles.shopEmailText}>{shopData.email || 'No email'}</Text>
          <TouchableOpacity style={styles.refreshSmallButton} onPress={() => { loadShopStatus(); loadDrawerStatus(); }}>
            <Text style={styles.refreshSmallButtonText}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Main Shop Name - HUGE */}
        <View style={styles.shopNameContainer}>
          <Text style={styles.shopName}>
            {shopData.name || shopData.shop_name || 'Your Shop'}
          </Text>
        </View>

        {/* Small Shop Details */}
        <View style={styles.shopDetailsBottom}>
          <Text style={styles.shopAddress}>
            {shopData.address || 'Address not set'}
          </Text>
          <Text style={styles.shopType}>
            {`${shopData.business_type || 'Business'} • ${shopData.industry || 'Industry'}`}
          </Text>
          <Text style={styles.shopDescription}>
            {shopData.description || 'No description available'}
          </Text>
        </View>
      </View>

      {/* Shop Status Section */}
      {shopStatus && (
        <View style={styles.statusSection}>
          <Text style={styles.statusTitle}>Shop Status</Text>
          <View style={[
            styles.statusCard,
            { backgroundColor: shopStatus.is_open ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)' }
          ]}>
            <View style={styles.statusHeader}>
              <View style={[
                styles.statusDot,
                { backgroundColor: shopStatus.is_open ? '#22c55e' : '#ef4444' }
              ]} />
              <Text style={[
                styles.statusText,
                { color: shopStatus.is_open ? '#22c55e' : '#ef4444' }
              ]}>
                {shopStatus.is_open ? '🟢 OPEN' : '🔴 CLOSED'}
              </Text>
            </View>
            
            {shopStatus.is_open && shopStatus.current_shop_day && (
              <View style={styles.statusDetails}>
                <Text style={styles.statusDetailText}>
                  Opened: {new Date(shopStatus.current_shop_day.opened_at).toLocaleString()}
                </Text>
                {shopStatus.active_cashiers && shopStatus.active_cashiers.length > 0 && (
                  <Text style={styles.statusDetailText}>
                    Active Cashiers: {shopStatus.active_cashiers.length}
                  </Text>
                )}
              </View>
            )}
            
            {!shopStatus.is_open && (
              <Text style={styles.statusDetailText}>
                Shop is currently closed. Use the controls below to start the day.
              </Text>
            )}
            
            <View style={styles.statusControls}>
              {!shopStatus.is_open ? (
                <TouchableOpacity 
                  style={styles.startDayButton}
                  onPress={handleStartDay}
                >
                  <Text style={styles.startDayButtonText}>🚀 Start Day</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[
                    styles.endDayButton,
                    statusLoading && styles.disabledButton
                  ]}
                  onPress={handleEndDay}
                  disabled={statusLoading}
                >
                  <Text style={styles.endDayButtonText}>
                    {statusLoading ? 'Closing...' : '🏪 End Day'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Cash Drawer Status Section */}
      {drawerStatus && (
        <View style={styles.drawerStatusSection}>
          <Text style={styles.drawerStatusTitle}>💰 Cash Drawer Status</Text>
          <View style={styles.drawerStatusCard}>
            <View style={styles.drawerSummaryRow}>
              <Text style={styles.drawerSummaryLabel}>Active Drawers:</Text>
              <Text style={styles.drawerSummaryValue}>{drawerStatus.active_drawers || 0}</Text>
            </View>
            <View style={styles.drawerSummaryRow}>
              <Text style={styles.drawerSummaryLabel}>Total Expected Cash:</Text>
              <Text style={styles.drawerSummaryValue}>${(drawerStatus.cash_flow?.total_expected_cash || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.drawerSummaryRow}>
              <Text style={styles.drawerSummaryLabel}>Current Cash Total:</Text>
              <Text style={styles.drawerSummaryValue}>${(drawerStatus.cash_flow?.total_current_cash || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.drawerSummaryRow}>
              <Text style={styles.drawerSummaryLabel}>Variance:</Text>
              <Text style={[
                styles.drawerSummaryValue,
                { color: (drawerStatus.cash_flow?.variance || 0) >= 0 ? '#22c55e' : '#ef4444' }
              ]}>
                ${(drawerStatus.cash_flow?.variance || 0).toFixed(2)}
              </Text>
            </View>
            
            {/* Quick Drawer List */}
            {drawerStatus.drawers && drawerStatus.drawers.length > 0 && (
              <View style={styles.drawerList}>
                <Text style={styles.drawerListTitle}>Current Drawers:</Text>
                {drawerStatus.drawers.slice(0, 3).map((drawer, index) => (
                  <View key={index} style={styles.drawerItem}>
                    <View style={styles.drawerItemLeft}>
                      <Text style={styles.drawerItemName}>{drawer.cashier}</Text>
                      <Text style={styles.drawerItemDetails}>Float: ${drawer.float_amount.toFixed(2)} | Cash: ${drawer.current_breakdown.cash.toFixed(2)}</Text>
                    </View>
                    <View style={[
                      styles.drawerStatusDot,
                      { backgroundColor: drawer.status === 'ACTIVE' ? '#22c55e' : drawer.status === 'SETTLED' ? '#3b82f6' : '#6b7280' }
                    ]} />
                  </View>
                ))}
                {drawerStatus.drawers.length > 3 && (
                  <Text style={styles.drawerMoreText}>... and {drawerStatus.drawers.length - 3} more</Text>
                )}
              </View>
            )}
          </View>
        </View>
      )}

      {/* Quick Actions Section */}
      <View style={styles.actionsSection}>
        <Text style={styles.actionsTitle}>Quick Actions</Text>
        
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('Sales')}
          >
            <Text style={styles.actionEmoji}>🛒</Text>
            <Text style={styles.actionTitle}>Sales</Text>
            <Text style={styles.actionSubtitle}>View today's sales</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionEmoji}>📦</Text>
            <Text style={styles.actionTitle}>Inventory</Text>
            <Text style={styles.actionSubtitle}>Manage products</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('StaffManagement')}
          >
            <Text style={styles.actionEmoji}>👥</Text>
            <Text style={styles.actionTitle}>Staff</Text>
            <Text style={styles.actionSubtitle}>Manage cashiers</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('Reports')}
          >
            <Text style={styles.actionEmoji}>📊</Text>
            <Text style={styles.actionTitle}>Reports</Text>
            <Text style={styles.actionSubtitle}>View analytics</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('StockValuation')}
          >
            <Text style={styles.actionEmoji}>💰</Text>
            <Text style={styles.actionTitle}>Stock Valuation</Text>
            <Text style={styles.actionSubtitle}>Calculate inventory value</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('RestockManager')}
          >
            <Text style={styles.actionEmoji}>📦</Text>
            <Text style={styles.actionTitle}>Restock Manager</Text>
            <Text style={styles.actionSubtitle}>Manage negative stock</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('StartOfDay')}
          >
            <Text style={styles.actionEmoji}>💰</Text>
            <Text style={styles.actionTitle}>Cash Drawer Management</Text>
            <Text style={styles.actionSubtitle}>
              {drawerStatus ? `${drawerStatus.active_drawers || 0} active drawers` : 'Manage cash floats'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('SalesAndRefunds')}
          >
            <Text style={styles.actionEmoji}>🧑‍🤝‍🧑</Text>
            <Text style={styles.actionTitle}>Customer Management</Text>
            <Text style={styles.actionSubtitle}>Manage refunds & customer records</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Today's Summary */}
      <View style={styles.summarySection}>
        <Text style={styles.summaryTitle}>Today's Summary</Text>
        
        <View style={styles.summaryCards}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>$0.00</Text>
            <Text style={styles.summaryLabel}>Revenue</Text>
          </View>
          
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>0</Text>
            <Text style={styles.summaryLabel}>Orders</Text>
          </View>
          
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>0</Text>
            <Text style={styles.summaryLabel}>Products</Text>
          </View>
        </View>
      </View>



      {/* Debug Info (Development only) */}
      {__DEV__ && (
        <View style={styles.debugSection}>
          <Text style={styles.debugTitle}>Debug Info (Development)</Text>
          <Text style={styles.debugText}>
            Shop ID: {shopData.shop_id || 'N/A'}{'\n'}
            Name: {shopData.name || 'N/A'}{'\n'}
            Email: {shopData.email || 'N/A'}{'\n'}
            Business Type: {shopData.business_type || 'N/A'}{'\n'}
            Industry: {shopData.industry || 'N/A'}
          </Text>
        </View>
      )}

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
  topSection: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  sidebarToggle: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }
    })
  },
  sidebarToggleIcon: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  shopDetailsRight: {
    position: 'absolute',
    top: 20,
    right: 20,
    alignItems: 'flex-end',
  },
  shopIdText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  shopEmailText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    marginTop: 2,
  },
  shopNameContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 40,
  },
  shopName: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 52,
  },
  shopDetailsBottom: {
    alignItems: 'center',
  },
  shopAddress: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  shopType: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  shopDescription: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  actionsSection: {
    padding: 20,
  },
  actionsTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  actionCard: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderRadius: 16,
    padding: 20,
    width: (width - 60) / 2, // Keep 2 columns for better layout
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
    boxShadow: '0 4px 8px rgba(6, 182, 212, 0.1)',
    elevation: 3,
  },
  actionEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionTitle: {
    color: '#06b6d4',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  actionSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
  },
  summarySection: {
    padding: 20,
    paddingTop: 0,
  },
  statusSection: {
    padding: 20,
    paddingTop: 0,
  },
  statusTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statusCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusDetails: {
    marginBottom: 16,
  },
  statusDetailText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 4,
  },
  statusControls: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  startDayButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  startDayButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  endDayButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  endDayButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  summaryTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  summaryCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCard: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderRadius: 16,
    padding: 20,
    width: (width - 80) / 3,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
    boxShadow: '0 2px 6px rgba(6, 182, 212, 0.1)',
    elevation: 2,
  },
  summaryValue: {
    color: '#06b6d4',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  summaryLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    textAlign: 'center',
  },
  debugSection: {
    margin: 20,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  debugTitle: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  debugText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    lineHeight: 16,
  },
  bottomPadding: {
    height: 40,
  },
  
  // Drawer Status Styles
  drawerStatusSection: {
    padding: 20,
    paddingTop: 0,
  },
  drawerStatusTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  drawerStatusCard: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
    boxShadow: '0 4px 8px rgba(6, 182, 212, 0.1)',
    elevation: 3,
  },
  drawerSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(6, 182, 212, 0.2)',
  },
  drawerSummaryLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  drawerSummaryValue: {
    color: '#06b6d4',
    fontSize: 14,
    fontWeight: '600',
  },
  drawerList: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(6, 182, 212, 0.2)',
  },
  drawerListTitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  drawerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginBottom: 4,
  },
  drawerItemLeft: {
    flex: 1,
  },
  drawerItemName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  drawerItemDetails: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
  },
  drawerStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  drawerMoreText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  

});

export default OwnerDashboardScreen;