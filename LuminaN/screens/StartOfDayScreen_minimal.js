import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { shopAPI } from '../services/api';

const StartOfDayScreen = ({ navigation, route }) => {
  const { onStatusChange } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [shopStatus, setShopStatus] = useState(null);

  useEffect(() => {
    fetchShopStatus();
  }, []);

  const fetchShopStatus = async () => {
    try {
      setLoading(true);
      const response = await shopAPI.getAnonymousEndpoint('/shop-status/');
      const data = response.data;
      setShopStatus(data.shop_day);
    } catch (error) {
      console.error('❌ Error fetching shop status:', error);
      Alert.alert('Error', 'Failed to load shop status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN': return '#10b981';
      case 'CLOSED': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#fff" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>
            Shop {shopStatus?.status === 'OPEN' ? 'Open' : 'Closed'}
          </Text>
          <Text style={[styles.statusIndicator, { color: getStatusColor(shopStatus?.status) }]}>
            Status: {shopStatus?.status || 'Unknown'}
          </Text>
        </View>

        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('EODReconciliation')}
          >
            <Icon name="assessment" size={24} color="#3b82f6" />
            <Text style={styles.actionButtonText}>EOD Reconciliation</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => Alert.alert('Info', 'Feature coming soon')}
          >
            <Icon name="account-balance-wallet" size={24} color="#8b5cf6" />
            <Text style={styles.actionButtonText}>Cash Drawer Status</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e293b',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    backgroundColor: '#1e293b',
    padding: 16,
    paddingTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
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
  content: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  statusIndicator: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 12,
  },
});

export default StartOfDayScreen;