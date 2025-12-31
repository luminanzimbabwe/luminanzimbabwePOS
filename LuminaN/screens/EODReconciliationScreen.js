import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { shopAPI } from '../services/api';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const EODProductionScreen = () => {
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [reconciliationData, setReconciliationData] = useState(null);
  const [drawerStatus, setDrawerStatus] = useState(null);
  const [finalizing, setFinalizing] = useState(false);
  const [closing, setClosing] = useState(false);

  const [cashierCounts, setCashierCounts] = useState({});
  const [globalNotes, setGlobalNotes] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [currentCashier, setCurrentCashier] = useState(null);

  const [inputs, setInputs] = useState({
    cash: '',
    card: '',
    ecocash: '',
    notes: ''
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setRefreshing(true);
    try {
      const [recon, drawers] = await Promise.all([
        shopAPI.getEnhancedReconciliation(),
        shopAPI.getAllDrawersStatus()
      ]);
      setReconciliationData(recon.data);
      setDrawerStatus(drawers.data.shop_status || drawers.data);
    } catch (error) {
      Alert.alert('Error', 'Could not load EOD data');
    } finally {
      setRefreshing(false);
    }
  };

  const startShopClosing = async () => {
    try {
      setClosing(true);
      
      // Step 1: Show closing message
      Alert.alert('Closing Shop', 'Finalizing day and logging out...', [{ text: 'OK' }]);
      
      // Step 2: Wait a moment for user to see the message
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Step 3: Logout user (clear any stored auth tokens)
      // You would implement actual logout logic here
      
      // Step 4: Navigate to login screen
      // You would implement actual navigation logic here
      
      // For immediate logout effect, reload the app
      setTimeout(() => {
        Alert.alert('Shop Closed', 'Please log in again for tomorrow.');
        setClosing(false);
      }, 2000);
      
    } catch (error) {
      Alert.alert('Error', 'Failed to close shop properly. Please contact support.');
      setClosing(false);
    }
  };

  const finalizeDay = async () => {
    try {
      setFinalizing(true);
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // First, save all cashier counts to the database
      const savePromises = Object.entries(cashierCounts).map(([cashierId, count]) => {
        return shopAPI.saveCashierCount({
          cashier_id: cashierId,
          date: today,
          expected_cash: count.cash || 0,
          expected_card: count.card || 0,
          expected_ecocash: count.ecocash || 0,
          notes: count.notes || '',
          status: 'COMPLETED'
        });
      });
      
      // Wait for all cashier counts to be saved
      await Promise.all(savePromises);
      
      // Now finalize the session
      const response = await shopAPI.completeReconciliationSession({
        action: 'complete',
        date: today,
        notes: globalNotes
      });

      if (response.data.success) {
        // Start the shop closing process
        startShopClosing();
        
      } else {
        Alert.alert('Error', response.data.error || 'Failed to finalize day');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to finalize day';
      Alert.alert('Error', errorMessage);
    } finally {
      setFinalizing(false);
    }
  };

  // Calculate expected amounts from current drawer data
  const stats = useMemo(() => {
    let cash = 0;
    let card = 0;
    let eco = 0;

    Object.values(cashierCounts).forEach(v => {
      cash += v.cash;
      card += v.card;
      eco += v.ecocash;
    });

    // Calculate expected amounts from current drawer data instead of using cached values
    let expected = {
      cash: 0,
      card: 0,
      ecocash: 0,
      total: 0
    };

    if (drawerStatus?.drawers && drawerStatus.drawers.length > 0) {
      // Sum up all drawer expected amounts
      drawerStatus.drawers.forEach(drawer => {
        if (drawer.eod_expectations) {
          expected.cash += drawer.eod_expectations.expected_cash || 0;
        }
        if (drawer.current_breakdown) {
          expected.card += drawer.current_breakdown.card || 0;
          expected.ecocash += (drawer.current_breakdown.ecocash || 0) + (drawer.current_breakdown.transfer || 0);
        }
      });
      expected.total = expected.cash + expected.card + expected.ecocash;
    } else {
      // Fallback to reconciliation data if available
      expected = reconciliationData?.expected_amounts || {
        cash: 0,
        card: 0,
        ecocash: 0,
        total: 0
      };
    }

    const actual = cash + card + eco;
    const variance = actual - expected.total;

    return { cash, card, eco, expected, actual, variance };
  }, [cashierCounts, reconciliationData, drawerStatus]);

  const openCashier = cashier => {
    setCurrentCashier(cashier);
    const existing = cashierCounts[cashier];
    setInputs(
      existing
        ? {
            cash: String(existing.cash),
            card: String(existing.card),
            ecocash: String(existing.ecocash),
            notes: existing.notes || ''
          }
        : { cash: '', card: '', ecocash: '', notes: '' }
    );
    setShowModal(true);
  };

  const saveCashier = async () => {
    const cash = parseFloat(inputs.cash);
    if (isNaN(cash)) {
      Alert.alert('Invalid Cash', 'Enter a valid amount');
      return;
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const updatedCounts = {
      ...cashierCounts,
      [currentCashier]: {
        cash,
        card: parseFloat(inputs.card || 0),
        ecocash: parseFloat(inputs.ecocash || 0),
        notes: inputs.notes,
        timestamp: new Date().toISOString()
      }
    };

    setCashierCounts(updatedCounts);

    // Save to database
    try {
      const today = new Date().toISOString().split('T')[0];
      await shopAPI.saveCashierCount({
        cashier_id: currentCashier,
        date: today,
        expected_cash: cash,
        expected_card: parseFloat(inputs.card || 0),
        expected_ecocash: parseFloat(inputs.ecocash || 0),
        notes: inputs.notes,
        status: 'IN_PROGRESS'
      });
    } catch (error) {
      // Don't show error to user for individual saves, just log it
    }

    setShowModal(false);
  };

  const totalCashiers = drawerStatus?.drawers?.length || 0;
  const verifiedCount = Object.keys(cashierCounts).length;
  const progress = totalCashiers ? verifiedCount / totalCashiers : 0;

  const varianceColor =
    stats.variance === 0
      ? '#2ecc71'
      : Math.abs(stats.variance) < 5
      ? '#f1c40f'
      : '#e74c3c';

  const renderMetricCard = (title, value, subtitle, color, icon) => (
    <View style={[styles.metricCard, { borderLeftColor: color }]}>
      <View style={styles.metricHeader}>
        <Icon name={icon} size={24} color={color} />
        <Text style={styles.metricTitle}>{title}</Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    </View>
  );

  return (
    <>
      <ScrollView 
        style={[styles.container, Platform.OS === 'web' && styles.webContainer]}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={true}
        scrollEventThrottle={16}
        nestedScrollEnabled={Platform.OS === 'web'}
        removeClippedSubviews={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadAllData} />
        }
      >
      {/* Header with Back Button */}
      <View style={styles.headerWithBack}>
        <TouchableOpacity onPress={() => {
          // Check if there are unsaved changes
          const hasUnsavedChanges = Object.keys(cashierCounts).length > 0 || globalNotes.trim() !== '';
          
          if (hasUnsavedChanges) {
            Alert.alert(
              'Unsaved Changes',
              'You have unsaved changes. Are you sure you want to go back?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Go Back', style: 'destructive', onPress: () => navigation.goBack() }
              ]
            );
          } else {
            navigation.goBack();
          }
        }} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#fff" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={loadAllData} style={styles.refreshButton} disabled={refreshing}>
          <Icon name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      
      {/* Ultimate Enterprise Command Center Header */}
      <View style={styles.ultimateHeader}>
        {/* Header Background Overlay */}
        <View style={styles.headerBackgroundOverlay} />
        
        {/* Command Center Badge */}
        <View style={styles.commandCenterBadge}>
          <Icon name="military-tech" size={20} color="#fbbf24" />
          <Text style={styles.commandCenterBadgeText}>COMMAND CENTER</Text>
        </View>
        
        {/* Main Title */}
        <Text style={styles.ultimateHeaderTitle}>🧮 EOD Reconciliation Command</Text>
        
        {/* Subtitle with Enhanced Styling */}
        <View style={styles.ultimateHeaderSubtitleContainer}>
          <Icon name="calculate" size={16} color="#8b5cf6" />
          <Text style={styles.ultimateHeaderSubtitle}>Enterprise End-of-Day Financial Control</Text>
          <Icon name="verified" size={16} color="#10b981" />
        </View>
        
        {/* Real-time Status Indicator */}
        <View style={styles.realtimeStatus}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Live Reconciliation Active</Text>
          <Icon name="wifi" size={14} color="#10b981" />
        </View>
        
        {/* Performance Summary */}
        <View style={styles.performanceSummary}>
          <Text style={styles.performanceSummaryText}>
            📊 Daily Reconciliation • {totalCashiers} Cashiers • ${stats.actual.toLocaleString()} Total Verified
          </Text>
        </View>
      </View>

      {closing && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <View style={{ backgroundColor: '#1a1a2e', padding: 30, borderRadius: 15, alignItems: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 10 }}>🔄 Closing Shop...</Text>
            <Text style={{ fontSize: 16, color: '#e74c3c', textAlign: 'center' }}>Please wait while we finalize the day</Text>
            <Text style={{ fontSize: 12, color: '#95A5A6', textAlign: 'center', marginTop: 10 }}>All data is being saved and users will be logged out</Text>
          </View>
        </View>
      )}

      {/* Enterprise Key Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💰 Enterprise Financial Overview</Text>
        <View style={styles.metricsGrid}>
          {renderMetricCard(
            'Expected Cash',
            `${stats.expected.cash.toLocaleString()}`,
            'System calculated',
            '#f59e0b',
            'attach-money'
          )}
          {renderMetricCard(
            'Verified Cash',
            `${stats.cash.toLocaleString()}`,
            'Manually counted',
            '#10b981',
            'verified'
          )}
          {renderMetricCard(
            'Expected Total',
            `${stats.expected.total.toLocaleString()}`,
            'All payment methods',
            '#3b82f6',
            'account-balance'
          )}
          {renderMetricCard(
            'Verified Total',
            `${stats.actual.toLocaleString()}`,
            'Actual cash counted',
            '#8b5cf6',
            'calculate'
          )}
        </View>
      </View>

      {/* Enterprise Variance Analysis */}
      <View style={[styles.section, styles.alertSection]}>
        <Text style={styles.sectionTitle}>⚠️ Enterprise Variance Analysis</Text>
        <View style={styles.alertCard}>
          <Icon name="warning" size={24} color={varianceColor} />
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>
              {stats.variance === 0 ? 'Perfect Balance' : stats.variance < 0 ? 'Cash Shortage' : 'Cash Overage'}
            </Text>
            <Text style={[styles.alertValue, { color: varianceColor }]}>
              ${Math.abs(stats.variance).toFixed(2)}
            </Text>
            <Text style={styles.alertSubtitle}>
              {stats.variance === 0 ? 'All counts match perfectly' : stats.variance < 0 ? 'Shortage detected' : 'Overpayment identified'}
            </Text>
          </View>
        </View>
        
        {/* Enhanced Progress Bar */}
        <View style={styles.enhancedProgressBar}>
          <View style={styles.enhancedProgressBarBg}>
            <View 
              style={[
                styles.enhancedProgressBarFill, 
                { 
                  width: `${progress * 100}%`,
                  backgroundColor: varianceColor
                }
              ]} 
            />
          </View>
          <Text style={styles.enhancedProgressText}>
            Verified {verifiedCount}/{totalCashiers} Cashiers ({Math.round(progress * 100)}%)
          </Text>
        </View>
      </View>

      {/* Ultimate Cashier Performance Matrix */}
      <View style={styles.section}>
        <View style={styles.cashierSectionHeader}>
          <Text style={styles.sectionTitle}>👥 Cashier Verification Matrix</Text>
          <View style={styles.cashierStatusBadge}>
            <Icon name="security" size={16} color="#10b981" />
            <Text style={styles.cashierStatusText}>Financial Security</Text>
          </View>
        </View>
        
        <View style={styles.enhancedCashierGrid}>
          {drawerStatus?.drawers?.map((d, index) => {
            const verified = cashierCounts[d.cashier];
            const performanceColor = verified ? '#10b981' : '#ef4444';
            
            return (
              <TouchableOpacity
                key={d.cashier}
                style={[
                  styles.enhancedCashierCard,
                  { borderLeftColor: performanceColor },
                  verified && styles.verifiedCashierCard
                ]}
                onPress={() => openCashier(d.cashier)}
                activeOpacity={0.7}
              >
                <View style={styles.enhancedCashierHeader}>
                  <View style={styles.cashierRankContainer}>
                    <View style={[
                      styles.cashierRankBadge, 
                      { backgroundColor: performanceColor }
                    ]}>
                      <Text style={styles.cashierRankText}>#{index + 1}</Text>
                    </View>
                    <View style={styles.cashierNameContainer}>
                      <Text style={styles.enhancedCashierName}>{d.cashier}</Text>
                      <Text style={styles.cashierPerformanceDate}>Today • {verified ? 'Verified' : 'Pending'}</Text>
                    </View>
                  </View>
                  <View style={[styles.cashierVerificationBadge, { backgroundColor: performanceColor}]}>
                    <Icon name={verified ? "verified" : "pending"} size={16} color="#ffffff" />
                  </View>
                </View>
                
                <View style={styles.enhancedCashierMetrics}>
                  <View style={styles.cashierMetricRow}>
                    <View style={styles.cashierMetricIconContainer}>
                      <Icon name="attach-money" size={14} color={performanceColor} />
                    </View>
                    <View style={styles.cashierMetricContent}>
                      <Text style={styles.cashierMetricLabel}>Cash Counted</Text>
                      <Text style={[styles.cashierMetricValue, { color: performanceColor}]}>
                        ${verified ? verified.cash.toFixed(2) : '0.00'}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.cashierMetricRow}>
                    <View style={styles.cashierMetricIconContainer}>
                      <Icon name="card" size={14} color="#3b82f6" />
                    </View>
                    <View style={styles.cashierMetricContent}>
                      <Text style={styles.cashierMetricLabel}>Card Payments</Text>
                      <Text style={styles.cashierMetricValue}>
                        ${verified ? verified.card.toFixed(2) : '0.00'}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.cashierMetricRow}>
                    <View style={styles.cashierMetricIconContainer}>
                      <Icon name="smartphone" size={14} color="#8b5cf6" />
                    </View>
                    <View style={styles.cashierMetricContent}>
                      <Text style={styles.cashierMetricLabel}>EcoCash</Text>
                      <Text style={styles.cashierMetricValue}>
                        ${verified ? verified.ecocash.toFixed(2) : '0.00'}
                      </Text>
                    </View>
                  </View>
                </View>
                
                {verified && (
                  <View style={styles.cashierVerificationStats}>
                    <View style={styles.cashierStatItem}>
                      <Text style={styles.cashierStatLabel}>Total Verified</Text>
                      <Text style={[styles.cashierStatValue, { color: performanceColor}]}>
                        ${(verified.cash + verified.card + verified.ecocash).toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.cashierStatItem}>
                      <Text style={styles.cashierStatLabel}>Status</Text>
                      <Text style={[styles.cashierStatValue, { color: performanceColor}]}>Complete</Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        
        <View style={styles.ultimateCashierSummary}>
          <Text style={styles.ultimateCashierSummaryText}>
            👥 Cashier Matrix • {verifiedCount}/{totalCashiers} Verified • 
            Total Verified: ${Object.values(cashierCounts).reduce((sum, c) => sum + c.cash + c.card + c.ecocash, 0).toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Ultimate Manager Notes & Finalization */}
      <View style={styles.section}>
        <View style={styles.notesSectionHeader}>
          <Text style={styles.sectionTitle}>📝 Manager Executive Notes</Text>
          <View style={styles.notesStatusBadge}>
            <Icon name="edit" size={16} color="#8b5cf6" />
            <Text style={styles.notesStatusText}>Executive Summary</Text>
          </View>
        </View>
        
        <View style={styles.enhancedNotesCard}>
          <TextInput
            style={styles.enhancedNotesInput}
            multiline
            placeholder="Executive observations and notes for owner review..."
            value={globalNotes}
            onChangeText={setGlobalNotes}
            placeholderTextColor="#6b7280"
          />
          <View style={styles.notesMetadata}>
            <Text style={styles.notesMetadataText}>
              📅 {new Date().toLocaleDateString()} • 🔒 Manager Level Access • 💼 End-of-Day Documentation
            </Text>
          </View>
        </View>
      </View>

      {/* Ultimate Finalization Command Center */}
      <View style={styles.ultimateFinalizationSection}>
        <View style={styles.ultimateFinalizationHeader}>
          <Icon name="military-tech" size={24} color="#fbbf24" />
          <Text style={styles.ultimateFinalizationTitle}>🏪 End of Day Finalization</Text>
          <Icon name="security" size={24} color="#ef4444" />
        </View>
        
        <View style={styles.ultimateFinalizationCard}>
          <Text style={styles.ultimateFinalizationWarning}>
            ⚠️ This action will finalize the day and log out all users
          </Text>
          <Text style={styles.ultimateFinalizationDetail}>
            All cashier counts will be permanently saved and the shop will be closed for the day
          </Text>
          
          <View style={styles.finalizationMetrics}>
            <View style={styles.finalizationMetric}>
              <Text style={styles.finalizationMetricLabel}>Verification Status</Text>
              <Text style={[
                styles.finalizationMetricValue, 
                { color: verifiedCount === totalCashiers ? '#10b981' : '#ef4444' }
              ]}>
                {verifiedCount}/{totalCashiers} Complete
              </Text>
            </View>
            <View style={styles.finalizationMetric}>
              <Text style={styles.finalizationMetricLabel}>Financial Status</Text>
              <Text style={[
                styles.finalizationMetricValue,
                { color: varianceColor }
              ]}>
                {stats.variance === 0 ? 'Balanced' : 'Variance Detected'}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={[
              styles.ultimateFinalizeButton,
              (verifiedCount !== totalCashiers || finalizing || closing) && styles.disabledUltimateButton
            ]}
            disabled={verifiedCount !== totalCashiers || finalizing || closing}
            onPress={() => {
              if (verifiedCount !== totalCashiers) {
                Alert.alert('Cannot Finalize', 'All cashiers must verify their counts before finalizing.');
                return;
              }
              finalizeDay();
            }}
          >
            <Icon name="military-tech" size={20} color="#fff" />
            <Text style={styles.ultimateFinalizeText}>
              {closing ? 'CLOSING SHOP...' : finalizing ? 'FINALIZING...' : 'FINALIZE DAY'}
            </Text>
            <Icon name="verified" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      </ScrollView>

      {/* MODAL */}
      <Modal visible={showModal} animationType="slide">
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowModal(false)} style={styles.modalCloseButton}>
            <Icon name="close" size={26} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{currentCashier}</Text>
          <TouchableOpacity onPress={saveCashier}>
            <Text style={styles.save}>SAVE</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <LabelInput label="Cash Counted" value={inputs.cash}
            onChange={v => setInputs({ ...inputs, cash: v })} />
          <LabelInput label="Card" value={inputs.card}
            onChange={v => setInputs({ ...inputs, card: v })} />
          <LabelInput label="EcoCash" value={inputs.ecocash}
            onChange={v => setInputs({ ...inputs, ecocash: v })} />

          <TextInput
            style={styles.notesInput}
            placeholder="Notes (optional)"
            multiline
            value={inputs.notes}
            onChangeText={v => setInputs({ ...inputs, notes: v })}
          />
        </View>
      </View>
    </Modal>
    </>
  );
};

/* ---------- SMALL COMPONENTS ---------- */

const CompareRow = ({ label, value, bold }) => (
  <View style={styles.compareRow}>
    <Text style={[styles.compareLabel, bold && styles.bold]}>{label}</Text>
    <Text style={[styles.compareValue, bold && styles.bold]}>
      ${value.toFixed(2)}
    </Text>
  </View>
);

const LabelInput = ({ label, value, onChange }) => (
  <>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput
      style={styles.amountInput}
      keyboardType="decimal-pad"
      value={value}
      onChangeText={onChange}
    />
  </>
);

/* ---------- STYLES ---------- */

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
    padding: 20, 
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ECF0F1'
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8
  },
  headerContent: {
    alignItems: 'center'
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  refreshButton: {
    padding: 8,
    marginLeft: 'auto',
  },
  headerWithBack: {
    backgroundColor: '#1e293b',
    padding: 16,
    paddingTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  refreshButtonText: {
    marginLeft: 6,
    color: '#3498DB',
    fontWeight: '600',
    fontSize: 14
  },
  title: { fontSize: 26, fontWeight: 'bold', color: '#2C3E50' },
  date: { color: '#7F8C8D', marginTop: 4 },

  compareCard: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 16,
    padding: 15
  },
  compareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6
  },
  compareLabel: { color: '#7F8C8D' },
  compareValue: { fontWeight: '600' },
  bold: { fontWeight: 'bold' },

  varianceCard: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 2,
    alignItems: 'center'
  },
  varianceValue: { fontSize: 34, fontWeight: 'bold' },
  varianceLabel: { color: '#7F8C8D', marginBottom: 10 },

  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: '#ECF0F1',
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3498DB'
  },
  progressText: { fontSize: 11, color: '#95A5A6', marginTop: 6 },

  section: {
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    width: '48%',
    borderLeftWidth: 4,
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
    elevation: 4,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 12,
    color: '#e2e8f0',
    marginLeft: 8,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
  },

  // Ultimate Header Styles
  ultimateHeader: {
    backgroundColor: '#1e293b',
    padding: 24,
    paddingTop: 24,
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 2,
    borderBottomColor: '#374151',
  },
  headerBackgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    opacity: 0.95,
  },
  commandCenterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#fbbf24',
    alignSelf: 'flex-start',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  commandCenterBadgeText: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 8,
    letterSpacing: 1,
  },
  ultimateHeaderTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    position: 'relative',
    zIndex: 1,
  },
  ultimateHeaderSubtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
    zIndex: 1,
  },
  ultimateHeaderSubtitle: {
    fontSize: 18,
    color: '#e2e8f0',
    marginHorizontal: 12,
    fontWeight: '500',
  },
  realtimeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
    zIndex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
    marginRight: 8,
  },
  performanceSummary: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    position: 'relative',
    zIndex: 1,
  },
  performanceSummaryText: {
    fontSize: 13,
    color: '#10b981',
    textAlign: 'center',
    fontWeight: '600',
  },
  alertSection: {
    backgroundColor: '#fef2f2',
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: 4,
  },
  alertValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 4,
  },
  alertSubtitle: {
    fontSize: 12,
    color: '#7f1d1d',
  },
  enhancedProgressBar: {
    marginTop: 16,
  },
  enhancedProgressBarBg: {
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  enhancedProgressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  enhancedProgressText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Cashier Section Styles
  cashierSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cashierStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  cashierStatusText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  enhancedCashierGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  enhancedCashierCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    width: '48%',
    marginBottom: 12,
    borderLeftWidth: 4,
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
    elevation: 3,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#334155',
  },
  verifiedCashierCard: {
    borderTopWidth: 2,
    borderTopColor: '#10b981',
  },
  enhancedCashierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cashierRankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cashierRankBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cashierRankText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cashierNameContainer: {
    flex: 1,
    marginLeft: 8,
  },
  enhancedCashierName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  cashierPerformanceDate: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
  },
  cashierVerificationBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  enhancedCashierMetrics: {
    marginBottom: 10,
  },
  cashierMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  cashierMetricIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  cashierMetricContent: {
    flex: 1,
  },
  cashierMetricLabel: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '500',
    marginBottom: 1,
  },
  cashierMetricValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  cashierVerificationStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  cashierStatItem: {
    alignItems: 'center',
  },
  cashierStatLabel: {
    fontSize: 9,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 1,
  },
  cashierStatValue: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  ultimateCashierSummary: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  ultimateCashierSummaryText: {
    fontSize: 12,
    color: '#10b981',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Notes Section Styles
  notesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  notesStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  notesStatusText: {
    color: '#8b5cf6',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  enhancedNotesCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
    elevation: 4,
  },
  enhancedNotesInput: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    color: '#ffffff',
    fontSize: 14,
    textAlignVertical: 'top',
  },
  notesMetadata: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  notesMetadataText: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Finalization Section Styles
  ultimateFinalizationSection: {
    padding: 16,
    marginBottom: 20,
  },
  ultimateFinalizationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  ultimateFinalizationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginHorizontal: 12,
  },
  ultimateFinalizationCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 6,
    borderLeftColor: '#ef4444',
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
    elevation: 6,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 2,
    borderColor: '#334155',
  },
  ultimateFinalizationWarning: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fca5a5',
    textAlign: 'center',
    marginBottom: 8,
  },
  ultimateFinalizationDetail: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  finalizationMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  finalizationMetric: {
    alignItems: 'center',
    flex: 1,
  },
  finalizationMetricLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },
  finalizationMetricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  ultimateFinalizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    elevation: 4,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  disabledUltimateButton: {
    backgroundColor: '#6b7280',
    elevation: 0,
    shadowOpacity: 0,
  },
  ultimateFinalizeText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 8,
  },

  cashierRow: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 15,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  cashierName: { fontWeight: 'bold' },
  cashierStatus: { color: '#95A5A6', fontSize: 12 },
  cashierRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cashierAmount: { fontWeight: 'bold' },

  notesCard: { margin: 20 },
  notesInput: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 15,
    minHeight: 80
  },

  finalBtn: {
    backgroundColor: '#2C3E50',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center'
  },
  disabled: { backgroundColor: '#BDC3C7' },
  finalText: { color: '#fff', fontWeight: 'bold' },

  modal: { flex: 1, backgroundColor: '#0f172a' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: 'bold',
    color: '#ffffff'
  },
  save: { 
    color: '#3b82f6', 
    fontWeight: 'bold',
    fontSize: 16
  },

  form: { 
    padding: 20,
    backgroundColor: '#0f172a',
    flex: 1
  },
  inputLabel: { 
    marginTop: 15, 
    fontWeight: 'bold', 
    color: '#e2e8f0',
    fontSize: 14,
    marginBottom: 8
  },
  amountInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 15,
    fontSize: 18,
    marginTop: 6,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#374151',
  },
  notesInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 15,
    minHeight: 80,
    color: '#ffffff',
    fontSize: 14,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#374151',
  }
});

export default EODProductionScreen;
