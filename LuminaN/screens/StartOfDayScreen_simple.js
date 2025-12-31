import React, { useState, useEffect } from 'react';
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
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { shopAPI } from '../services/api';
import { ROUTES } from '../constants/navigation';

const StartOfDayScreen = ({ navigation, route }) => {
  const { onStatusChange } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [shopStatus, setShopStatus] = useState(null);
  const [activeShifts, setActiveShifts] = useState([]);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [openingNotes, setOpeningNotes] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');

  // Cash Float Management State - Simplified
  const [cashiers, setCashiers] = useState([]);
  const [drawerStatus, setDrawerStatus] = useState(null);
  const [showFloatModal, setShowFloatModal] = useState(false);
  const [selectedCashier, setSelectedCashier] = useState(null);
  const [floatAmount, setFloatAmount] = useState('');
  const [loadingFloat, setLoadingFloat] = useState(false);

  useEffect(() => {
    fetchShopStatus();
    fetchCashiers();
    fetchDrawerStatus();
    
    // Add web-specific scrolling CSS
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.textContent = `
        .start-of-day-scroll {
          overflow-y: auto !important;
          overflow-x: hidden !important;
          height: 100vh !important;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  const fetchShopStatus = async () => {
    try {
      setLoading(true);
      const response = await shopAPI.getAnonymousEndpoint('/shop-status/');
      const data = response.data;
      
      setShopStatus(data.shop_day);
      setActiveShifts(data.active_shifts || []);
      
    } catch (error) {
      console.error('❌ Error fetching shop status:', error);
      Alert.alert(
        'Error', 
        'Failed to load shop status. Please try again.',
        [{ text: 'Retry', onPress: () => fetchShopStatus() }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchShopStatus();
    fetchCashiers();
    fetchDrawerStatus();
  };

  // Simplified Cash Float Management Functions
  const fetchCashiers = async () => {
    try {
      const response = await shopAPI.getAnonymousEndpoint('/staff/approved/');
      if (response.data.success) {
        setCashiers(response.data.cashiers || []);
      }
    } catch (error) {
      console.error('❌ Error fetching cashiers:', error);
    }
  };

  const fetchDrawerStatus = async () => {
    try {
      const response = await shopAPI.getCashFloat();
      if (response.data && response.data.success) {
        const payload = response.data.shop_status || response.data.drawer || response.data;
        const today = new Date().toISOString().slice(0,10);
        const payloadDate = payload?.date || payload?.current_shop_day?.date || null;
        const isClosed = shopStatus && (shopStatus.status === 'CLOSED' || shopStatus.is_open === false);
        if (isClosed || (payloadDate && payloadDate !== today)) {
          setDrawerStatus({
            total_drawers: 0,
            active_drawers: 0,
            inactive_drawers: 0,
            settled_drawers: 0,
            cash_flow: { total_expected_cash: 0, total_current_cash: 0, variance: 0 },
            drawers: []
          });
        } else {
          setDrawerStatus(payload);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching drawer status:', error);
    }
  };

  const handleSetFloat = async (cashierId, amount) => {
    if (!amount || isNaN(amount) || parseFloat(amount) < 0) {
      Alert.alert('Error', 'Please enter a valid float amount');
      return;
    }

    try {
      setLoadingFloat(true);
      await shopAPI.setCashFloat({
        cashier_id: cashierId,
        float_amount: parseFloat(amount)
      });

      Alert.alert('Success', 'Float amount set successfully');
      setShowFloatModal(false);
      setSelectedCashier(null);
      setFloatAmount('');
      fetchDrawerStatus();
    } catch (error) {
      console.error('❌ Error setting float:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to set float amount'
      );
    } finally {
      setLoadingFloat(false);
    }
  };

  const openFloatModal = (cashier) => {
    setSelectedCashier(cashier);
    setFloatAmount(cashier.current_float?.toString() || '');
    setShowFloatModal(true);
  };

  const handleStartDay = async () => {
    if (!openingNotes.trim()) {
      Alert.alert('Error', 'Please enter opening notes');
      return;
    }

    try {
      setLoading(true);
      await shopAPI.postAnonymousEndpoint('/start-day/', {
        action: 'start_day',
        notes: openingNotes.trim()
      });
      
      Alert.alert(
        'Success!',
        'Shop opened successfully. Cashiers can now log in.',
        [{ text: 'OK', onPress: () => {
          setShowStartModal(false);
          setOpeningNotes('');
          fetchShopStatus();
          if (onStatusChange) onStatusChange();
        }}]
      );
      
    } catch (error) {
      console.error('❌ Error starting day:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to open shop. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEndDay = async () => {
    if (!closingNotes.trim()) {
      Alert.alert('Error', 'Please enter closing notes');
      return;
    }

    // Show confirmation for ending the day
    Alert.alert(
      'Confirm End of Day',
      `Are you sure you want to close the shop?\n\nThis will:\n• Log out all active cashiers\n• End all current shifts\n• Close the shop for business\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Close Shop', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await shopAPI.postAnonymousEndpoint('/end-day/', {
                action: 'end_day',
                notes: closingNotes.trim()
              });
              
              Alert.alert(
                'Shop Closed',
                'Shop has been closed successfully. All cashiers have been logged out.',
                [{ text: 'OK', onPress: () => {
                  setShowEndModal(false);
                  setClosingNotes('');
                  fetchShopStatus();
                  if (onStatusChange) onStatusChange();
                }}]
              );
              
            } catch (error) {
              console.error('❌ Error ending day:', error);
              Alert.alert(
                'Error',
                error.response?.data?.error || 'Failed to close shop. Please try again.'
              );
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN': return '#10b981';
      case 'CLOSED': return '#ef4444';
      case 'CLOSING': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'OPEN': return 'play-circle-filled';
      case 'CLOSED': return 'stop-circle';
      case 'CLOSING': return 'pause-circle';
      default: return 'help';
    }
  };

  if (loading && !shopStatus) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading shop status...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, Platform.OS === 'web' && styles.webScrollView]}
      contentContainerStyle={Platform.OS === 'web' ? styles.webContentContainer : styles.scrollContentContainer}
      showsVerticalScrollIndicator={Platform.OS === 'web'}
      showsHorizontalScrollIndicator={false}
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
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Icon name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Shop Status Header */}
      <View style={styles.statusHeader}>
        <View style={styles.statusCard}>
          <View style={styles.statusIconContainer}>
            <Icon 
              name={getStatusIcon(shopStatus?.status)} 
              size={48} 
              color={getStatusColor(shopStatus?.status)} 
            />
          </View>
          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>
              Shop {shopStatus?.status === 'OPEN' ? 'Open' : 'Closed'}
            </Text>
            <Text style={styles.statusSubtitle}>
              {shopStatus?.date ? new Date(shopStatus.date).toLocaleDateString() : 'Today'}
            </Text>
            {shopStatus?.opened_at && (
              <Text style={styles.statusTime}>
                Opened at: {new Date(shopStatus.opened_at).toLocaleTimeString()}
              </Text>
            )}
            {shopStatus?.closed_at && (
              <Text style={styles.statusTime}>
                Closed at: {new Date(shopStatus.closed_at).toLocaleTimeString()}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
        <View style={styles.actionGrid}>
          {shopStatus?.status === 'CLOSED' ? (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setShowStartModal(true)}
            >
              <Icon name="play-circle-filled" size={32} color="#10b981" />
              <Text style={styles.actionButtonText}>Start Day</Text>
              <Text style={styles.actionButtonSubtext}>Open shop for business</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setShowEndModal(true)}
            >
              <Icon name="stop-circle" size={32} color="#ef4444" />
              <Text style={styles.actionButtonText}>End Day</Text>
              <Text style={styles.actionButtonSubtext}>Close shop and logout cashiers</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('EODReconciliation')}
          >
            <Icon name="assessment" size={32} color="#3b82f6" />
            <Text style={styles.actionButtonText}>EOD Reconciliation</Text>
            <Text style={styles.actionButtonSubtext}>End of day reports</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={async () => {
              await fetchDrawerStatus();
              Alert.alert('Info', 'Drawer status updated. Check console for data.');
            }}
          >
            <Icon name="account-balance-wallet" size={32} color="#8b5cf6" />
            <Text style={styles.actionButtonText}>Cash Drawer Status</Text>
            <Text style={styles.actionButtonSubtext}>View all drawer amounts</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Simplified Drawer Status Display */}
      {drawerStatus && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Cash Drawer Management</Text>
          
          <View style={styles.cashFlowCard}>
            <Text style={styles.cashFlowLabel}>Drawer Status Available</Text>
            <Text style={styles.cashFlowValue}>
              {drawerStatus.drawers ? `${drawerStatus.drawers.length} drawers` : 'No data'}
            </Text>
          </View>
        </View>
      )}

      {/* Active Shifts */}
      {activeShifts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 Active Cashiers</Text>
          <View style={styles.shiftsList}>
            {activeShifts.map((shift) => (
              <View key={shift.shift_id} style={styles.shiftItem}>
                <View style={styles.shiftInfo}>
                  <Text style={styles.shiftCashierName}>{shift.cashier_name}</Text>
                  <Text style={styles.shiftTime}>
                    Started: {new Date(shift.start_time).toLocaleTimeString()}
                  </Text>
                  <Text style={styles.shiftBalance}>
                    Opening Balance: ${shift.opening_balance?.toFixed(2) || '0.00'}
                  </Text>
                </View>
                <View style={styles.shiftStatus}>
                  <Icon name="person" size={20} color="#10b981" />
                  <Text style={styles.shiftStatusText}>Active</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Shop Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Today's Summary</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Active Cashiers:</Text>
            <Text style={styles.summaryValue}>{activeShifts.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shop Status:</Text>
            <Text style={[styles.summaryValue, { color: getStatusColor(shopStatus?.status) }]}>
              {shopStatus?.status || 'Unknown'}
            </Text>
          </View>
          {shopStatus?.opening_notes && (
            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>Opening Notes:</Text>
              <Text style={styles.notesText}>{shopStatus.opening_notes}</Text>
            </View>
          )}
          {shopStatus?.closing_notes && (
            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>Closing Notes:</Text>
              <Text style={styles.notesText}>{shopStatus.closing_notes}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Start Day Modal */}
      <Modal
        visible={showStartModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowStartModal(false)}
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color="#64748b" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Start of Day</Text>
            <TouchableOpacity 
              onPress={handleStartDay}
              style={styles.saveButton}
            >
              <Text style={styles.saveButtonText}>Open Shop</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Opening Notes *</Text>
              <TextInput
                style={styles.notesInput}
                value={openingNotes}
                onChangeText={setOpeningNotes}
                placeholder="Enter notes about today's opening (cash float, special instructions, etc.)"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.infoCard}>
              <Icon name="info" size={20} color="#3b82f6" />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>What happens when you start the day:</Text>
                <Text style={styles.infoText}>• Cashiers will be able to log in</Text>
                <Text style={styles.infoText}>• New shifts can be started</Text>
                <Text style={styles.infoText}>• Sales transactions can begin</Text>
                <Text style={styles.infoText}>• Business operations commence</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* End Day Modal */}
      <Modal
        visible={showEndModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowEndModal(false)}
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color="#64748b" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>End of Day</Text>
            <TouchableOpacity 
              onPress={handleEndDay}
              style={[styles.saveButton, styles.dangerButton]}
            >
              <Text style={styles.saveButtonText}>Close Shop</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Closing Notes *</Text>
              <TextInput
                style={styles.notesInput}
                value={closingNotes}
                onChangeText={setClosingNotes}
                placeholder="Enter notes about today's closing (final cash count, issues, etc.)"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={[styles.infoCard, styles.dangerInfoCard]}>
              <Icon name="warning" size={20} color="#ef4444" />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>⚠️ This action will:</Text>
                <Text style={styles.infoText}>• Log out all active cashiers</Text>
                <Text style={styles.infoText}>• End all current shifts</Text>
                <Text style={styles.infoText}>• Close the shop for business</Text>
                <Text style={styles.infoText}>• Prevent new cashier logins</Text>
                <Text style={[styles.infoText, { fontWeight: 'bold', marginTop: 8 }]}>
                  This action cannot be undone!
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Set Float Modal */}
      <Modal
        visible={showFloatModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowFloatModal(false)}
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color="#64748b" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Set Cash Float</Text>
            <TouchableOpacity 
              onPress={() => handleSetFloat(selectedCashier?.cashier_id, floatAmount)}
              style={[styles.saveButton, loadingFloat && styles.disabledButton]}
              disabled={loadingFloat}
            >
              <Text style={styles.saveButtonText}>
                {loadingFloat ? 'Setting...' : 'Set Float'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedCashier && (
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Cashier</Text>
                <Text style={styles.cashierNameDisplay}>{selectedCashier.cashier}</Text>
              </View>
            )}

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Float Amount ($) *</Text>
              <TextInput
                style={styles.floatInput}
                value={floatAmount}
                onChangeText={setFloatAmount}
                placeholder="Enter float amount"
                keyboardType="numeric"
                editable={!loadingFloat}
              />
            </View>

            <View style={styles.infoCard}>
              <Icon name="info" size={20} color="#3b82f6" />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>About Cash Floats:</Text>
                <Text style={styles.infoText}>• Float amount is the starting cash for the cashier's drawer</Text>
                <Text style={styles.infoText}>• This amount will be subtracted during EOD reconciliation</Text>
                <Text style={styles.infoText}>• You can set or update floats at any time during business hours</Text>
                <Text style={styles.infoText}>• Each cashier should have their own float amount</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

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
    backgroundColor: '#1e293b',
    ...Platform.select({
      web: {
        height: '100vh',
        overflow: 'auto',
        WebkitOverflowScrolling: 'auto',
        scrollBehavior: 'smooth',
      },
    }),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'web' ? 100 : 0,
  },
  webScrollView: {
    ...Platform.select({
      web: {
        height: '100vh',
        maxHeight: '100vh',
      },
    }),
  },
  webContentContainer: {
    flexGrow: 1,
    minHeight: '100vh',
    paddingBottom: 100,
  },
  header: {
    backgroundColor: '#1e293b',
    padding: 16,
    paddingTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  },
  statusHeader: {
    padding: 16,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  statusIconContainer: {
    marginRight: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 2,
  },
  statusTime: {
    fontSize: 14,
    color: '#94a3b8',
  },
  section: {
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 12,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 8,
    textAlign: 'center',
  },
  actionButtonSubtext: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  shiftsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  shiftItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  shiftInfo: {
    flex: 1,
  },
  shiftCashierName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  shiftTime: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  shiftBalance: {
    fontSize: 12,
    color: '#94a3b8',
  },
  shiftStatus: {
    alignItems: 'center',
  },
  shiftStatusText: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '600',
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  notesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  dangerButton: {
    backgroundColor: '#ef4444',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalContent: {
    padding: 16,
  },
  formSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1e293b',
    minHeight: 100,
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  dangerInfoCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },

  // Simplified Cash Flow Card
  cashFlowCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  cashFlowLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  cashFlowValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  cashierNameDisplay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 8,
  },
  floatInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default StartOfDayScreen;