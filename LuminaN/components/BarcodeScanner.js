import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal } from 'react-native';

const BarcodeScannerComponent = ({ 
  visible, 
  onClose, 
  onScan, 
  title = "Scan Product Barcode"
}) => {
  const handleBarCodeScanned = ({ type, data }) => {
    onScan({ type, data });
    Alert.alert(
      "Barcode Scanned!",
      `Type: ${type}\nData: ${data}`,
      [
        {
          text: "Scan Again",
          onPress: () => {}
        },
        {
          text: "Use Result",
          onPress: () => {
            onClose();
          }
        }
      ]
    );
  };

  // Simulate a barcode scan for demo purposes
  const simulateScan = () => {
    // For demo purposes, simulate finding a product
    const mockData = "1234567890123";
    const mockType = "ean13";
    handleBarCodeScanned({ type: mockType, data: mockData });
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.cameraContainer}>
          <View style={styles.cameraFallback}>
            <Text style={styles.cameraIcon}>📷</Text>
            <Text style={styles.cameraTitle}>Barcode Scanner</Text>
            <Text style={styles.cameraSubtitle}>Camera functionality not available in this environment</Text>
            
            <TouchableOpacity 
              style={styles.demoButton} 
              onPress={simulateScan}
            >
              <Text style={styles.demoButtonText}>🔍 Simulate Scan (Demo)</Text>
            </TouchableOpacity>
            
            <Text style={styles.fallbackText}>
              Use the product search button to add items manually
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={onClose}
          >
            <Text style={styles.buttonText}>Close Scanner</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#1a1a1a',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#3b82f6',
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  cameraContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cameraFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 40,
  },
  cameraIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  cameraTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  cameraSubtitle: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  demoButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginBottom: 30,
  },
  demoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fallbackText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
  button: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BarcodeScannerComponent;