import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  Platform,
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { shopAPI } from '../services/api';

const { width, height } = Dimensions.get('window');

const CashierHistoryScreen = () => {
  const navigation = useNavigation();
  const [cashiers, setCashiers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCashier, setSelectedCashier] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [showDateFromPicker, setShowDateFromPicker] = useState(false);
  const [showDateToPicker, setShowDateToPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const statusOptions = [
    { label: 'All Status', value: 'ALL' },
    { label: 'Balanced', value: 'BALANCED' },
    { label: 'Shortage', value: 'SHORTAGE' },
    { label: 'Over', value: 'OVER' }
  ];

  const fetchCashierHistory = async () => {
    try {
      setLoading(true);
      
      // Build query params
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (dateFrom) params.date_from = dateFrom.toISOString().split('T')[0];
      if (dateTo) params.date_to = dateTo.toISOString().split('T')[0];
      
      const response = await shopAPI.getCashierHistory(params);
      
      if (response.data.success) {
        setCashiers(response.data.cashiers);
        setSummary(response.data.summary);
      } else {
        Alert.alert('Error', 'Failed to fetch cashier history');
      }
    } catch (error) {
      console.error('Error fetching cashier history:', error);
      Alert.alert('Error', error.message || 'Network error while fetching data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCashierHistory();
  }, [statusFilter, dateFrom, dateTo]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCashierHistory();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'BALANCED':
        return '#4CAF50';
      case 'SHORTAGE':
        return '#F44336';
      case 'OVER':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'BALANCED':
        return 'checkmark-circle';
      case 'SHORTAGE':
        return 'remove-circle';
      case 'OVER':
        return 'add-circle';
      default:
        return 'help-circle';
    }
  };

  const getReliabilityColor = (score) => {
    if (score >= 90) return '#4CAF50';
    if (score >= 70) return '#FF9800';
    return '#F44336';
  };

  const filteredCashiers = cashiers.filter(cashier =>
    cashier.cashier_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderCashierCard = (cashier) => {
    const stats = cashier.statistics;
    const reliabilityColor = getReliabilityColor(stats.reliability_score);
    
    return (
      <TouchableOpacity
        key={cashier.cashier_id}
        style={styles.cashierCard}
        onPress={() => {
          setSelectedCashier(cashier);
          setDetailModalVisible(true);
        }}
      >
        <View style={styles.cashierHeader}>
          <View style={styles.cashierInfo}>
            <Text style={styles.cashierName}>{cashier.cashier_name}</Text>
            <Text style={styles.cashierCode}>ID: {cashier.cashier_id}</Text>
          </View>
          <View style={[styles.reliabilityBadge, { backgroundColor: reliabilityColor }]}>
            <Text style={styles.reliabilityText}>{stats.reliability_score}%</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total_counts}</Text>
            <Text style={styles.statLabel}>Counts</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>{stats.balanced}</Text>
            <Text style={styles.statLabel}>Balanced</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#F44336' }]}>{stats.shortages}</Text>
            <Text style={styles.statLabel}>Shortages</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#FF9800' }]}>{stats.overs}</Text>
            <Text style={styles.statLabel}>Overs</Text>
          </View>
        </View>

        <View style={styles.balanceRateBar}>
          <View 
            style={[
              styles.balanceRateFill, 
              { 
                width: `${stats.balance_rate}%`,
                backgroundColor: stats.balance_rate >= 80 ? '#4CAF50' : stats.balance_rate >= 50 ? '#FF9800' : '#F44336'
              }
            ]} 
          />
        </View>
        <Text style={styles.balanceRateText}>
          Balance Rate: {stats.balance_rate.toFixed(1)}%
        </Text>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedCashier) return null;
    
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedCashier.cashier_name}</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Ionicons name="close" size={28} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.modalStats}>
                <Text style={styles.sectionTitle}>Statistics</Text>
                <View style={styles.detailStatsGrid}>
                  <View style={styles.detailStatBox}>
                    <Text style={styles.detailStatValue}>{selectedCashier.statistics.total_counts}</Text>
                    <Text style={styles.detailStatLabel}>Total Counts</Text>
                  </View>
                  <View style={styles.detailStatBox}>
                    <Text style={[styles.detailStatValue, { color: '#4CAF50' }]}>
                      {selectedCashier.statistics.balanced}
                    </Text>
                    <Text style={styles.detailStatLabel}>Balanced</Text>
                  </View>
                  <View style={styles.detailStatBox}>
                    <Text style={[styles.detailStatValue, { color: '#F44336' }]}>
                      {selectedCashier.statistics.shortages}
                    </Text>
                    <Text style={styles.detailStatLabel}>Shortages</Text>
                  </View>
                  <View style={styles.detailStatBox}>
                    <Text style={[styles.detailStatValue, { color: '#FF9800' }]}>
                      {selectedCashier.statistics.overs}
                    </Text>
                    <Text style={styles.detailStatLabel}>Overs</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Count History</Text>
              {selectedCashier.count_history.map((count, index) => (
                <View key={index} style={styles.historyItem}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyDate}>
                      {new Date(count.date).toLocaleDateString()}
                    </Text>
                    <View style={[
                      styles.historyStatusBadge,
                      { backgroundColor: getStatusColor(count.status) }
                    ]}>
                      <Ionicons 
                        name={getStatusIcon(count.status)} 
                        size={14} 
                        color="#fff" 
                      />
                      <Text style={styles.historyStatusText}>{count.status}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.historyDetails}>
                    <View style={styles.historyRow}>
                      <Text style={styles.historyLabel}>Cash Counted:</Text>
                      <Text style={styles.historyValue}>${count.total_cash.toFixed(2)}</Text>
                    </View>
                    <View style={styles.historyRow}>
                      <Text style={styles.historyLabel}>Expected:</Text>
                      <Text style={styles.historyValue}>${count.expected_cash.toFixed(2)}</Text>
                    </View>
                    <View style={styles.historyRow}>
                      <Text style={styles.historyLabel}>Variance:</Text>
                      <Text style={[
                        styles.historyValue,
                        { color: count.total_variance < 0 ? '#F44336' : count.total_variance > 0 ? '#FF9800' : '#4CAF50' }
                      ]}>
                        {count.total_variance >= 0 ? '+' : ''}${count.total_variance.toFixed(2)}
                      </Text>
                    </View>
                    {count.notes && (
                      <Text style={styles.historyNotes}>Notes: {count.notes}</Text>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00f5ff" />
        <Text style={styles.loadingText}>Loading cashier history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Cashier History</Text>
        {summary && (
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.total_cashiers}</Text>
              <Text style={styles.summaryLabel}>Cashiers</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>{summary.total_balanced}</Text>
              <Text style={styles.summaryLabel}>Balanced</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#F44336' }]}>{summary.total_shortages}</Text>
              <Text style={styles.summaryLabel}>Shortages</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.filterSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search cashier..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />

        <View style={styles.filterRow}>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={statusFilter}
              onValueChange={(itemValue) => setStatusFilter(itemValue)}
              style={styles.picker}
            >
              {statusOptions.map(option => (
                <Picker.Item key={option.value} label={option.label} value={option.value} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.dateFilterRow}>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowDateFromPicker(true)}
          >
            <Ionicons name="calendar" size={18} color="#00f5ff" />
            <Text style={styles.dateButtonText}>
              {dateFrom ? dateFrom.toLocaleDateString() : 'From Date'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowDateToPicker(true)}
          >
            <Ionicons name="calendar" size={18} color="#00f5ff" />
            <Text style={styles.dateButtonText}>
              {dateTo ? dateTo.toLocaleDateString() : 'To Date'}
            </Text>
          </TouchableOpacity>
        </View>

        {(dateFrom || dateTo) && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={() => {
              setDateFrom(null);
              setDateTo(null);
            }}
          >
            <Text style={styles.clearButtonText}>Clear Dates</Text>
          </TouchableOpacity>
        )}
      </View>

      {showDateFromPicker && (
        <DateTimePicker
          value={dateFrom || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDateFromPicker(false);
            if (selectedDate) setDateFrom(selectedDate);
          }}
        />
      )}

      {showDateToPicker && (
        <DateTimePicker
          value={dateTo || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDateToPicker(false);
            if (selectedDate) setDateTo(selectedDate);
          }}
        />
      )}

      <ScrollView
        style={[styles.scrollView, Platform.OS === 'web' && styles.webContainer]}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={true}
        scrollEventThrottle={16}
        nestedScrollEnabled={Platform.OS === 'web'}
        removeClippedSubviews={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredCashiers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people" size={64} color="#00f5ff" />
            <Text style={styles.emptyText}>No cashiers found</Text>
          </View>
        ) : (
          filteredCashiers.map(renderCashierCard)
        )}
      </ScrollView>

      {renderDetailModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  webContainer: {
    ...Platform.select({
      web: {
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'auto',
        WebkitOverflowScrolling: 'auto',
        scrollBehavior: 'smooth',
        backgroundColor: '#0a0a0a',
      },
    }),
  },
  scrollContentContainer: {
    flexGrow: 1,
    padding: 12,
    paddingBottom: Platform.OS === 'web' ? 100 : 30,
    backgroundColor: '#0a0a0a',
    ...Platform.select({
      web: {
        minHeight: '100vh',
        width: '100%',
        flexGrow: 1,
      },
    }),
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9ca3af',
  },
  header: {
    backgroundColor: '#6200EE',
    padding: 16,
    paddingTop: Platform.OS === 'web' ? 20 : 50,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 12,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  filterSection: {
    backgroundColor: '#1a1a2e',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#00f5ff',
  },
  searchInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)',
  },
  filterRow: {
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)',
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  picker: {
    height: 44,
    color: '#ffffff',
  },
  dateFilterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 12,
    borderRadius: 8,
    flex: 0.48,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)',
  },
  dateButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#ffffff',
  },
  clearButton: {
    marginTop: 8,
    alignSelf: 'center',
  },
  clearButtonText: {
    color: '#00f5ff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    backgroundColor: '#0a0a0a',
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
  },
  cashierCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
  },
  cashierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cashierInfo: {
    flex: 1,
  },
  cashierName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  cashierCode: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  reliabilityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  reliabilityText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  balanceRateBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  balanceRateFill: {
    height: '100%',
    borderRadius: 3,
  },
  balanceRateText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 6,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    borderTopWidth: 2,
    borderTopColor: '#00f5ff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 245, 255, 0.3)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalScroll: {
    padding: 16,
    backgroundColor: '#1a1a2e',
  },
  modalStats: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00f5ff',
    marginBottom: 12,
  },
  detailStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  detailStatBox: {
    width: '48%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
  },
  detailStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  detailStatLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  historyItem: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  historyStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  historyStatusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  historyDetails: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 245, 255, 0.2)',
    paddingTop: 8,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  historyLabel: {
    fontSize: 13,
    color: '#9ca3af',
  },
  historyValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  historyNotes: {
    fontSize: 12,
    color: '#ffaa00',
    fontStyle: 'italic',
    marginTop: 8,
  },
});

export default CashierHistoryScreen;
