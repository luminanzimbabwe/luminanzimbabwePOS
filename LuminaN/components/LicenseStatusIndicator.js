import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, ScrollView } from 'react-native';
import { shopAPI } from '../services/api';
import { Ionicons } from '@expo/vector-icons';

const LicenseStatusIndicator = ({ shopId, onStatusChange }) => {
  const [licenseStatus, setLicenseStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (shopId) {
      checkLicenseStatus();
    }
  }, [shopId]);

  const checkLicenseStatus = async () => {
    try {
      const response = await shopAPI.getLicenseStatus(shopId);
      setLicenseStatus(response.data);
      onStatusChange && onStatusChange(response.data);
    } catch (error) {
      console.error('License status check failed:', error);
      setLicenseStatus({
        error: true,
        message: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    if (!licenseStatus || licenseStatus.error) return '#ef4444';
    
    const status = licenseStatus.license?.status;
    const licenseType = licenseStatus.license?.type;
    const daysRemaining = licenseStatus.license?.days_remaining || 0;
    
    switch (status) {
      case 'ACTIVE':
        if (licenseType === 'UNLIMITED') {
          return '#22c55e'; // Green for unlimited
        }
        return daysRemaining <= 7 ? '#f59e0b' : '#22c55e';
      case 'TRIAL':
        return daysRemaining <= 3 ? '#ef4444' : '#3b82f6';
      case 'EXPIRED':
      case 'SUSPENDED':
      case 'REVOKED':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = () => {
    if (!licenseStatus || licenseStatus.error) {
      return 'License Error';
    }
    
    const status = licenseStatus.license?.status;
    const licenseType = licenseStatus.license?.type;
    const daysRemaining = licenseStatus.license?.days_remaining || 0;
    
    switch (status) {
      case 'ACTIVE':
        if (licenseType === 'UNLIMITED') {
          return 'Unlimited License';
        }
        return daysRemaining <= 7 ? `Expires in ${daysRemaining} days` : 'License Active';
      case 'TRIAL':
        return daysRemaining <= 3 ? `Trial expires in ${daysRemaining} days` : `Trial (${daysRemaining} days left)`;
      case 'EXPIRED':
        return 'License Expired';
      case 'SUSPENDED':
        return 'License Suspended';
      case 'REVOKED':
        return 'License Revoked';
      default:
        return 'Unknown Status';
    }
  };

  const getStatusIcon = () => {
    if (!licenseStatus || licenseStatus.error) return 'alert-circle';
    
    const status = licenseStatus.license?.status;
    const daysRemaining = licenseStatus.license?.days_remaining || 0;
    
    if (status === 'ACTIVE' || status === 'TRIAL') {
      return daysRemaining <= 7 ? 'warning' : 'checkmark-circle';
    }
    
    return 'alert-circle';
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Checking license...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.statusContainer, { borderColor: getStatusColor() }]}
        onPress={() => setShowDetails(true)}
      >
        <Ionicons 
          name={getStatusIcon()} 
          size={20} 
          color={getStatusColor()} 
        />
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#6b7280" />
      </TouchableOpacity>

      <Modal
        visible={showDetails}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetails(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>License Details</Text>
            <TouchableOpacity onPress={() => setShowDetails(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {licenseStatus && !licenseStatus.error ? (
              <>
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>License Information</Text>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Type:</Text>
                    <Text style={styles.detailValue}>{licenseStatus.license?.type}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <Text style={[styles.detailValue, { color: getStatusColor() }]}>
                      {licenseStatus.license?.status}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Days Remaining:</Text>
                    <Text style={styles.detailValue}>
                      {licenseStatus.license?.type === 'UNLIMITED' ? 'Unlimited' : (licenseStatus.license?.days_remaining || 0)}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Expiry Date:</Text>
                    <Text style={styles.detailValue}>
                      {licenseStatus.license?.type === 'UNLIMITED' ? 'Never Expires' : 
                        (licenseStatus.license?.expiry_date 
                          ? new Date(licenseStatus.license.expiry_date).toLocaleDateString()
                          : 'N/A')
                      }
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Hardware Information</Text>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Hardware Match:</Text>
                    <Text style={[
                      styles.detailValue, 
                      { color: licenseStatus.hardware?.hardware_match ? '#22c55e' : '#ef4444' }
                    ]}>
                      {licenseStatus.hardware?.hardware_match ? 'Yes' : 'No'}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Validation Count:</Text>
                    <Text style={styles.detailValue}>
                      {licenseStatus.license?.validation_count || 0}
                    </Text>
                  </View>
                </View>

                {licenseStatus.warnings && licenseStatus.warnings.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Warnings</Text>
                    {licenseStatus.warnings.map((warning, index) => (
                      <View key={index} style={styles.warningItem}>
                        <Ionicons name="warning" size={16} color="#f59e0b" />
                        <Text style={styles.warningText}>{warning}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.buttonContainer}>
                  <TouchableOpacity 
                    style={styles.refreshButton}
                    onPress={checkLicenseStatus}
                  >
                    <Ionicons name="refresh" size={20} color="#3b82f6" />
                    <Text style={styles.refreshButtonText}>Refresh Status</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={48} color="#ef4444" />
                <Text style={styles.errorText}>
                  {licenseStatus?.error || 'Unknown error occurred'}
                </Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={checkLicenseStatus}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 14,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#1f2937',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  detailSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  detailLabel: {
    fontSize: 14,
    color: '#9ca3af',
  },
  detailValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  warningText: {
    fontSize: 14,
    color: '#f59e0b',
    flex: 1,
  },
  buttonContainer: {
    marginTop: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  refreshButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default LicenseStatusIndicator;