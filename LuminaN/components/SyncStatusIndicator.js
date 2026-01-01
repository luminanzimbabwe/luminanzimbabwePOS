// Sync Status Indicator Component for Offline-First POS
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  ScrollView
} from 'react-native';
import OfflineFirstService from '../services/offlineFirstService.js';

const SyncStatusIndicator = ({ 
  position = 'top-right', // 'top-left', 'top-right', 'bottom-left', 'bottom-right'
  showDetails = true,
  onSyncPress = null,
  style = {}
}) => {
  const [syncStatus, setSyncStatus] = useState({
    isOnline: false,
    syncInProgress: false,
    pendingItems: 0,
    lastSync: null
  });
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    // Subscribe to sync status changes
    const updateStatus = (status) => {
      setSyncStatus(status);
      
      // Animate when status changes
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();

      // Pulse animation when syncing
      if (status.syncInProgress) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.2,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            })
          ])
        ).start();
      }
    };

    // Get initial status
    const initialStatus = OfflineFirstService.getSyncStatus();
    updateStatus(initialStatus);

    // Subscribe to events
    const syncStatusListener = (status) => updateStatus(status);
    const syncQueueListener = (stats) => {
      setSyncStatus(prev => ({
        ...prev,
        pendingItems: stats.pending
      }));
    };

    OfflineFirstService.on('syncStatusChanged', syncStatusListener);
    OfflineFirstService.on('syncQueueUpdated', syncQueueListener);

    // Cleanup
    return () => {
      OfflineFirstService.off('syncStatusChanged', syncStatusListener);
      OfflineFirstService.off('syncQueueUpdated', syncQueueListener);
    };
  }, []);

  // Get status icon based on current state
  const getStatusIcon = () => {
    if (syncStatus.syncInProgress) {
      return '🔄'; // Syncing
    } else if (!syncStatus.isOnline) {
      return '📴'; // Offline
    } else if (syncStatus.pendingItems > 0) {
      return '⚠️'; // Pending sync
    } else {
      return '✅'; // Synced
    }
  };

  // Get status color
  const getStatusColor = () => {
    if (syncStatus.syncInProgress) {
      return '#3b82f6'; // Blue
    } else if (!syncStatus.isOnline) {
      return '#f59e0b'; // Orange (offline)
    } else if (syncStatus.pendingItems > 0) {
      return '#dc2626'; // Red (pending)
    } else {
      return '#10b981'; // Green (synced)
    }
  };

  // Get status text
  const getStatusText = () => {
    if (syncStatus.syncInProgress) {
      return 'Syncing...';
    } else if (!syncStatus.isOnline) {
      return 'Offline';
    } else if (syncStatus.pendingItems > 0) {
      return `${syncStatus.pendingItems} pending`;
    } else {
      return 'Synced';
    }
  };

  // Format last sync time
  const formatLastSync = () => {
    if (!syncStatus.lastSync) return 'Never';
    
    const now = new Date();
    const lastSync = new Date(syncStatus.lastSync);
    const diffMs = now - lastSync;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return lastSync.toLocaleDateString();
  };

  // Handle sync button press
  const handleSyncPress = () => {
    if (onSyncPress) {
      onSyncPress();
    } else {
      // Default behavior: trigger manual sync
      OfflineFirstService.forceSyncAll();
    }
  };

  // Get position styles
  const getPositionStyle = () => {
    const baseStyle = {
      position: 'absolute',
      zIndex: 1000,
    };

    switch (position) {
      case 'top-left':
        return { ...baseStyle, top: 50, left: 20 };
      case 'top-right':
        return { ...baseStyle, top: 50, right: 20 };
      case 'bottom-left':
        return { ...baseStyle, bottom: 50, left: 20 };
      case 'bottom-right':
        return { ...baseStyle, bottom: 50, right: 20 };
      default:
        return { ...baseStyle, top: 50, right: 20 };
    }
  };

  return (
    <>
      <Animated.View 
        style={[
          styles.container,
          getPositionStyle(),
          { 
            backgroundColor: getStatusColor(),
            opacity: fadeAnim,
            transform: [{ scale: pulseAnim }]
          },
          style
        ]}
      >
        <TouchableOpacity 
          style={styles.touchable}
          onPress={() => showDetails && setShowDetailsModal(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.icon}>{getStatusIcon()}</Text>
          
          {showDetails && (
            <View style={styles.textContainer}>
              <Text style={styles.statusText}>{getStatusText()}</Text>
              {syncStatus.pendingItems > 0 && (
                <Text style={styles.pendingText}>
                  {syncStatus.pendingItems} item{syncStatus.pendingItems !== 1 ? 's' : ''}
                </Text>
              )}
            </View>
          )}
        </TouchableOpacity>

        {/* Quick sync button for pending items */}
        {syncStatus.pendingItems > 0 && syncStatus.isOnline && (
          <TouchableOpacity 
            style={styles.syncButton}
            onPress={handleSyncPress}
            disabled={syncStatus.syncInProgress}
          >
            <Text style={styles.syncButtonText}>
              {syncStatus.syncInProgress ? '⏳' : '🔄'}
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Details Modal */}
      <Modal
        visible={showDetailsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔄 Sync Status</Text>
              <TouchableOpacity 
                onPress={() => setShowDetailsModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Connection Status */}
              <View style={styles.statusSection}>
                <Text style={styles.sectionTitle}>📡 Connection</Text>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Status:</Text>
                  <Text style={[
                    styles.statusValue,
                    { color: getStatusColor() }
                  ]}>
                    {syncStatus.isOnline ? '🟢 Online' : '🔴 Offline'}
                  </Text>
                </View>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Last Sync:</Text>
                  <Text style={styles.statusValue}>{formatLastSync()}</Text>
                </View>
              </View>

              {/* Sync Queue */}
              <View style={styles.statusSection}>
                <Text style={styles.sectionTitle}>📋 Sync Queue</Text>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Pending Items:</Text>
                  <Text style={[
                    styles.statusValue,
                    { color: syncStatus.pendingItems > 0 ? '#dc2626' : '#10b981' }
                  ]}>
                    {syncStatus.pendingItems}
                  </Text>
                </View>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Syncing:</Text>
                  <Text style={[
                    styles.statusValue,
                    { color: syncStatus.syncInProgress ? '#3b82f6' : '#6b7280' }
                  ]}>
                    {syncStatus.syncInProgress ? 'Yes' : 'No'}
                  </Text>
                </View>
              </View>

              {/* Database Stats */}
              <View style={styles.statusSection}>
                <Text style={styles.sectionTitle}>💾 Local Database</Text>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Status:</Text>
                  <Text style={styles.statusValue}>Ready</Text>
                </View>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Offline Capable:</Text>
                  <Text style={styles.statusValue}>✅ Yes</Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actionsSection}>
                <Text style={styles.sectionTitle}>⚡ Actions</Text>
                
                <TouchableOpacity 
                  style={[
                    styles.actionButton,
                    (!syncStatus.isOnline || syncStatus.syncInProgress) && styles.actionButtonDisabled
                  ]}
                  onPress={handleSyncPress}
                  disabled={!syncStatus.isOnline || syncStatus.syncInProgress}
                >
                  <Text style={styles.actionButtonText}>
                    🔄 Sync Now
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => {
                    // Force refresh status
                    const status = OfflineFirstService.getSyncStatus();
                    setSyncStatus(status);
                  }}
                >
                  <Text style={styles.actionButtonText}>
                    🔍 Refresh Status
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 80,
  },
  touchable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 16,
    marginRight: 6,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pendingText: {
    color: '#ffffff',
    fontSize: 10,
    opacity: 0.8,
  },
  syncButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 4,
    marginLeft: 6,
  },
  syncButtonText: {
    color: '#ffffff',
    fontSize: 12,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 20,
  },
  statusSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusLabel: {
    color: '#cccccc',
    fontSize: 14,
  },
  statusValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionsSection: {
    marginTop: 10,
  },
  actionButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  actionButtonDisabled: {
    backgroundColor: '#6b7280',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default SyncStatusIndicator;