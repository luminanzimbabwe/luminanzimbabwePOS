/**
 * License Management Screen
 * Shows current license status and allows management actions
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  ScrollView,
  Alert,
  Dimensions
} from 'react-native';

const { width } = Dimensions.get('window');
import { useNavigation } from '@react-navigation/native';
import { ROUTES } from '../constants/navigation';
import { shopStorage } from '../services/storage';
import licenseService from '../services/licenseService';
import licenseSecurity from '../services/licenseSecurity';

const LicenseManagementScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [licenseStatus, setLicenseStatus] = useState(null);
  const [securityCheck, setSecurityCheck] = useState(null);

  useEffect(() => {
    loadLicenseData();
  }, []);

  const loadLicenseData = async () => {
    try {
      setLoading(true);
      
      // Get license status
      const status = await licenseService.getLicenseStatus();
      setLicenseStatus(status);
      
      // Perform security check
      if (status.hasLicense && status.licenseInfo) {
        const security = await licenseSecurity.performSecurityCheck(status.licenseInfo);
        setSecurityCheck(security);
      }
      
    } catch (error) {
      console.error('Failed to load license data:', error);
      Alert.alert('Error', 'Failed to load license information.');
    } finally {
      setLoading(false);
    }
  };

  const handleRenewLicense = () => {
    navigation.navigate(ROUTES.LICENSE_RENEWAL);
  };

  const handleViewSecurityDetails = () => {
    if (securityCheck) {
      Alert.alert(
        'Security Details',
        `Overall Score: ${securityCheck.overallScore || 0}%\n` +
        `Risk Level: ${securityCheck.riskLevel || 'Unknown'}\n` +
        `Valid: ${securityCheck.valid ? 'Yes' : 'No'}`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleEmergencyLockdown = () => {
    Alert.alert(
      'Emergency Lockdown',
      'This will immediately lock the application and require a recovery challenge. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Lock Down', 
          style: 'destructive',
          onPress: async () => {
            try {
              await licenseSecurity.triggerEmergencyLockdown('manual_emergency_lockdown');
              Alert.alert('Locked', 'Application has been locked down. Contact support for recovery.');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to trigger lockdown.');
            }
          }
        }
      ]
    );
  };

  const handleResetSecurity = () => {
    Alert.alert(
      'Reset Security',
      'This will clear all security data and require re-initialization. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: async () => {
            try {
              await licenseSecurity.resetSecurityState();
              Alert.alert('Reset', 'Security data has been reset. Please restart the app.');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to reset security data.');
            }
          }
        }
      ]
    );
  };

  const handleClearLicense = () => {
    Alert.alert(
      'Clear License',
      'This will remove your current license and you will need to activate a new one. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: async () => {
            try {
              await shopStorage.clearLicenseData();
              Alert.alert('Cleared', 'License has been cleared. Please activate a new license.');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to clear license.');
            }
          }
        }
      ]
    );
  };

  const getSecurityScoreColor = (score) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getRiskLevelColor = (riskLevel) => {
    switch (riskLevel) {
      case 'LOW': return '#22c55e';
      case 'MEDIUM': return '#f59e0b';
      case 'HIGH': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading license information...</Text>
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
        <Text style={styles.headerTitle}>License Management</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Current License Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current License</Text>
          
          {licenseStatus?.hasLicense ? (
            <View style={styles.licenseInfoCard}>
              <View style={styles.licenseHeader}>
                <Text style={styles.licenseType}>
                  {licenseStatus.licenseInfo?.type} {licenseStatus.licenseInfo?.isFounderTrial ? '(Founder Trial)' : ''}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(licenseStatus) }]}>
                  <Text style={styles.statusBadgeText}>
                    {licenseStatus.isExpired ? 'Expired' : 
                     licenseStatus.isExpiringSoon ? 'Expiring Soon' : 'Active'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.licenseDetails}>
                <DetailRow label="Shop" value={licenseStatus.licenseInfo?.shopName} />
                <DetailRow label="License Key" value={licenseStatus.licenseInfo?.licenseKey} />
                <DetailRow label="Days Remaining" value={licenseStatus.daysRemaining?.toString()} />
                <DetailRow label="Expires" value={new Date(licenseStatus.licenseInfo?.expiryDate).toLocaleDateString()} />
                <DetailRow label="Status" value={licenseStatus.licenseInfo?.status} />
              </View>
              
              <View style={styles.licenseActions}>
                <TouchableOpacity style={styles.renewButton} onPress={handleRenewLicense}>
                  <Text style={styles.renewButtonText}>Renew License</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.clearButton} onPress={handleClearLicense}>
                  <Text style={styles.clearButtonText}>Clear License</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.noLicenseCard}>
              <Text style={styles.noLicenseText}>No active license found</Text>
              <TouchableOpacity style={styles.getLicenseButton} onPress={handleRenewLicense}>
                <Text style={styles.getLicenseButtonText}>Get License</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Security Status */}
        {securityCheck && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security Status</Text>
            <View style={styles.securityCard}>
              <View style={styles.securityHeader}>
                <Text style={styles.securityScore}>
                  Security Score: {securityCheck.overallScore || 0}%
                </Text>
                <TouchableOpacity onPress={handleViewSecurityDetails}>
                  <Text style={styles.detailsLink}>View Details</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.securityDetails}>
                <DetailRow 
                  label="Risk Level" 
                  value={securityCheck.riskLevel} 
                  valueColor={getRiskLevelColor(securityCheck.riskLevel)}
                />
                <DetailRow 
                  label="System Valid" 
                  value={securityCheck.valid ? 'Yes' : 'No'} 
                  valueColor={securityCheck.valid ? '#22c55e' : '#ef4444'}
                />
                {securityCheck.checks && (
                  <DetailRow 
                    label="Checks Performed" 
                    value={Object.keys(securityCheck.checks).length.toString()} 
                  />
                )}
              </View>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={loadLicenseData}>
            <Text style={styles.actionButtonText}>Refresh License Info</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleRenewLicense}>
            <Text style={styles.actionButtonText}>Purchase/Renew License</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleViewSecurityDetails}>
            <Text style={styles.actionButtonText}>View Security Details</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.dangerButton} onPress={handleEmergencyLockdown}>
            <Text style={styles.dangerButtonText}>Emergency Lockdown</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.dangerButton} onPress={handleResetSecurity}>
            <Text style={styles.dangerButtonText}>Reset Security Data</Text>
          </TouchableOpacity>
        </View>

        {/* Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              This screen shows your current license status and security information.
              The license is protected by advanced security measures including hardware 
              fingerprinting and time validation.
            </Text>
            <Text style={styles.infoText}>
              If you encounter any issues or suspect tampering, contact support immediately.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const DetailRow = ({ label, value, valueColor = '#ffffff' }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}:</Text>
    <Text style={[styles.detailValue, { color: valueColor }]}>{value || 'N/A'}</Text>
  </View>
);

const getStatusColor = (licenseStatus) => {
  if (licenseStatus.isExpired) return '#ef4444';
  if (licenseStatus.isExpiringSoon) return '#f59e0b';
  return '#22c55e';
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
  backButton: { color: '#3b82f6', fontSize: 16 },
  content: { flex: 1, padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#ffffff', marginTop: 16, fontSize: 16 },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#ffffff', marginBottom: 12 },

  licenseInfoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  licenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  licenseType: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },

  licenseDetails: { marginBottom: 16 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: { fontSize: 12, color: 'rgba(255, 255, 255, 0.6)' },
  detailValue: { fontSize: 12, color: '#ffffff', fontWeight: '500' },

  licenseActions: { flexDirection: 'row', gap: 8 },
  renewButton: {
    flex: 1,
    backgroundColor: '#22c55e',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  renewButtonText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  clearButton: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  clearButtonText: { color: '#ef4444', fontSize: 12, fontWeight: 'bold' },

  noLicenseCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  noLicenseText: { color: '#ef4444', fontSize: 14, marginBottom: 12 },
  getLicenseButton: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  getLicenseButtonText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },

  securityCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  securityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  securityScore: { fontSize: 14, fontWeight: 'bold', color: '#3b82f6' },
  detailsLink: { color: '#3b82f6', fontSize: 12, textDecorationLine: 'underline' },
  securityDetails: { marginBottom: 8 },

  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  actionButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '500' },

  dangerButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  dangerButtonText: { color: '#ef4444', fontSize: 14, fontWeight: '500' },

  infoCard: {
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.3)',
  },
  infoText: { fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', marginBottom: 8 },
});

export default LicenseManagementScreen;