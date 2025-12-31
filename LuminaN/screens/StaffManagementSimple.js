import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import shopAPI from '../services/api';
import shopStorage from '../services/storage';

const StaffManagementSimple = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [pendingStaff, setPendingStaff] = useState([]);
  const [approvedStaff, setApprovedStaff] = useState([]);
  const [shopCredentials, setShopCredentials] = useState(null);

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      const credentials = await shopStorage.getCredentials();
      setShopCredentials(credentials);
      loadStaffData();
    } catch (error) {
      console.error('Error loading credentials:', error);
      setLoading(false);
    }
  };

  const loadStaffData = async () => {
    try {
      // NO AUTHENTICATION REQUIRED - Public access
      const pendingResponse = await shopAPI.getPendingStaff({});
      setPendingStaff(pendingResponse.data?.staff || []);

      const approvedResponse = await shopAPI.getApprovedStaff({});
      setApprovedStaff(approvedResponse.data?.staff || []);

    } catch (error) {
      console.error('Error loading staff data:', error);
      Alert.alert('Error', 'Failed to load staff data.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (staffId, role) => {
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
      const authData = {
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
      Alert.alert('Error', 'Failed to approve staff member.');
    }
  };

  const handleReject = (staffId) => {
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
      const authData = {
        staff_id: staffId
      };

      const response = await shopAPI.rejectStaff(authData);
      console.log('✅ Rejection successful:', response.data);

      setPendingStaff(prev => prev.filter(s => s.id !== staffId));
      Alert.alert('✅ Rejected', 'Staff member has been rejected.');

    } catch (error) {
      console.error('❌ Rejection failed:', error);
      Alert.alert('Error', 'Failed to reject staff member.');
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Staff Management</Text>
        <TouchableOpacity onPress={loadStaffData}>
          <Text style={styles.refreshButton}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.statusText}>
        {`Pending: ${pendingStaff.length} | Approved: ${approvedStaff.length}`}
      </Text>

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
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    color: '#3b82f6',
    fontSize: 16,
  },
  refreshButton: {
    color: '#10b981',
    fontSize: 14,
  },
  headerSpacer: {
    width: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ccc',
    fontSize: 16,
    marginTop: 12,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    padding: 12,
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  staffCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  approvedCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  staffInfo: {
    flex: 1,
    marginBottom: 12,
  },
  staffName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  staffEmail: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 2,
  },
  staffPhone: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 2,
  },
  staffShift: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 8,
  },
  staffRole: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  approveButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
  },
  rejectButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    color: '#10b981',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default StaffManagementSimple;