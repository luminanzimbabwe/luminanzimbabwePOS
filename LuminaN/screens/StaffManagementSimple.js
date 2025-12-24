import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { shopAPI } from '../services/api';
import { shopStorage } from '../services/storage';
import { ROUTES } from '../constants/navigation';

const StaffManagementSimple = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [pendingStaff, setPendingStaff] = useState([]);
  const [approvedStaff, setApprovedStaff] = useState([]);
  const [shopCredentials, setShopCredentials] = useState(null);

  useEffect(() => {
    loadShopCredentials();
  }, []);

  const loadShopCredentials = async () => {
    try {
      const credentials = await shopStorage.getCredentials();
      if (!credentials) {
        navigation.replace(ROUTES.LOGIN);
        return;
      }
      setShopCredentials(credentials);
      loadStaffData();
    } catch (error) {
      console.error('Error loading credentials:', error);
      navigation.replace(ROUTES.LOGIN);
    }
  };

  const loadStaffData = async () => {
    try {
      setLoading(true);
      const authData = {
        email: shopCredentials.email,
        password: shopCredentials.shop_owner_master_password
      };
      
      const pendingResponse = await shopAPI.getPendingStaff(authData);
      setPendingStaff(pendingResponse.data?.staff || []);
      
      const approvedResponse = await shopAPI.getApprovedStaff(authData);
      setApprovedStaff(approvedResponse.data?.staff || []);
      
    } catch (error) {
      console.error('Error loading staff data:', error);
      Alert.alert('Error', 'Failed to load staff data.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (staffId, role) => {
    console.log('✅ Approve button clicked:', { staffId, role });
    Alert.alert(
      'Confirm Action',
      `Approve this staff member as ${role}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes, Approve', 
          onPress: () => executeApprove(staffId, role)
        }
      ]
    );
  };

  const executeApprove = async (staffId, role) => {
    try {
      console.log('🚀 Executing approval...');
      
      const authData = {
        email: shopCredentials.email,
        password: shopCredentials.shop_owner_master_password,
        staff_id: staffId,
        role: role
      };
      
      const response = await shopAPI.approveStaff(authData);
      console.log('✅ Approval successful:', response.data);
      
      // Update local state
      const staffMember = pendingStaff.find(s => s.id === staffId);
      if (staffMember) {
        setPendingStaff(prev => prev.filter(s => s.id !== staffId));
        setApprovedStaff(prev => [...prev, { ...staffMember, role, status: 'approved' }]);
      }
      
      Alert.alert('✅ Success!', `Staff member approved as ${role}`);
      
    } catch (error) {
      console.error('❌ Approval failed:', error);
      Alert.alert('❌ Error', `Approval failed: ${error.message}`);
    }
  };

  const handleReject = (staffId) => {
    console.log('❌ Reject button clicked:', staffId);
    
    const staffMember = pendingStaff.find(s => s.id === staffId);
    const staffName = staffMember?.name || 'Staff member';
    
    Alert.alert(
      'Confirm Rejection',
      `Are you sure you want to reject ${staffName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes, Reject', 
          style: 'destructive',
          onPress: () => executeReject(staffId)
        }
      ]
    );
  };

  const executeReject = async (staffId) => {
    try {
      console.log('🚀 Executing rejection...');
      
      const authData = {
        email: shopCredentials.email,
        password: shopCredentials.shop_owner_master_password,
        staff_id: staffId
      };
      
      const response = await shopAPI.rejectStaff(authData);
      console.log('✅ Rejection successful:', response.data);
      
      setPendingStaff(prev => prev.filter(s => s.id !== staffId));
      Alert.alert('✅ Rejected', 'Staff member has been rejected.');
      
    } catch (error) {
      console.error('❌ Rejection failed:', error);
      Alert.alert('❌ Error', `Rejection failed: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Staff Management</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading staff...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Staff Management</Text>
        <TouchableOpacity onPress={loadStaffData}>
          <Text style={styles.refreshButton}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Status Info */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          Pending: {pendingStaff.length} | Approved: {approvedStaff.length}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {pendingStaff.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Pending Staff</Text>
            {pendingStaff.map(staff => (
              <View key={staff.id} style={styles.staffCard}>
                <View style={styles.staffInfo}>
                  <Text style={styles.staffName}>{staff.name}</Text>
                  <Text style={styles.staffEmail}>{staff.email}</Text>
                  <Text style={styles.staffPhone}>{staff.phone}</Text>
                  <Text style={styles.staffShift}>Shift: {staff.shift}</Text>
                </View>
                
                <View style={styles.actionContainer}>
                  <TouchableOpacity 
                    style={styles.approveButton}
                    onPress={() => handleApprove(staff.id, 'cashier')}
                  >
                    <Text style={styles.approveButtonText}>✅ Approve</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.rejectButton}
                    onPress={() => handleReject(staff.id)}
                  >
                    <Text style={styles.rejectButtonText}>❌ Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>✅ No Pending Staff</Text>
            <Text style={styles.emptyText}>All staff registrations have been processed.</Text>
          </View>
        )}

        {approvedStaff.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👥 Approved Staff</Text>
            {approvedStaff.map(staff => (
              <View key={staff.id} style={styles.approvedCard}>
                <Text style={styles.staffName}>{staff.name}</Text>
                <Text style={styles.staffEmail}>{staff.email}</Text>
                <Text style={styles.staffRole}>Role: {staff.role}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: { color: '#3b82f6', fontSize: 16 },
  refreshButton: { color: '#3b82f6', fontSize: 14 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerSpacer: { width: 60 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#fff', marginTop: 16 },
  statusBar: { backgroundColor: '#1a1a1a', padding: 12 },
  statusText: { color: '#ccc', textAlign: 'center', fontSize: 14 },
  content: { flex: 1, padding: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  staffCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  approvedCard: {
    backgroundColor: '#0a2e1a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e4d2b',
  },
  staffInfo: { flex: 1, marginBottom: 12 },
  staffName: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  staffEmail: { color: '#ccc', fontSize: 14, marginBottom: 2 },
  staffPhone: { color: '#ccc', fontSize: 14, marginBottom: 2 },
  staffShift: { color: '#ccc', fontSize: 14, marginBottom: 8 },
  staffRole: { color: '#10b981', fontSize: 14, fontWeight: 'bold' },
  actionContainer: { flexDirection: 'row', gap: 12 },
  approveButton: {
    backgroundColor: '#10b981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  approveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  rejectButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptyText: { color: '#666', textAlign: 'center' },
});

export default StaffManagementSimple;