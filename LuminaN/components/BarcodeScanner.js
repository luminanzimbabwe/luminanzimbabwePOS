import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, TextInput, Platform } from 'react-native';

const BarcodeScannerComponent = ({ 
  visible, 
  onClose, 
  onScan, 
  title = "Scan Product Barcode"
}) => {
  const [manualBarcode, setManualBarcode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBarCodeScanned = ({ type, data }) => {
    if (isProcessing) return; // Prevent multiple scans
    setIsProcessing(true);
    
    console.log('📷 Barcode Scanned:', { type, data });
    onScan({ type, data });
    
    Alert.alert(
      "✅ Barcode Scanned!",
      `Type: ${type}\nCode: ${data}`,
      [
        {
          text: "Scan Again",
          onPress: () => setIsProcessing(false)
        },
        {
          text: "Use Result",
          onPress: () => {
            onClose();
            setIsProcessing(false);
          }
        }
      ]
    );
  };

  const handleManualBarcodeSubmit = () => {
    if (!manualBarcode.trim()) {
      Alert.alert('⚠️ Empty Barcode', 'Please enter a barcode code.');
      return;
    }
    
    console.log('✏️ Manual Barcode Entered:', manualBarcode);
    handleBarCodeScanned({ type: 'manual', data: manualBarcode.trim() });
    setManualBarcode('');
  };

  // Test scan function for demo purposes
  const testScan = () => {
    const testCodes = [
      { data: "1234567890123", type: "ean13" },
      { data: "978020137962", type: "isbn" },
      { data: "123456789", type: "code128" },
      { data: "0123456789012", type: "upc" }
    ];
    
    const randomCode = testCodes[Math.floor(Math.random() * testCodes.length)];
    console.log('🧪 Test scan generated:', randomCode);
    handleBarCodeScanned(randomCode);
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
          <View style={styles.scannerContent}>
            <Text style={styles.scannerIcon}>📷</Text>
            <Text style={styles.scannerTitle}>Barcode Scanner</Text>
            <Text style={styles.scannerSubtitle}>
              {Platform.OS === 'web' ? 'Web camera not supported in this demo' : 'Camera scanning available on mobile devices'}
            </Text>
            
            {/* Manual Barcode Input */}
            <View style={styles.manualInputContainer}>
              <Text style={styles.manualInputLabel}>Enter Barcode Manually:</Text>
              <View style={styles.manualInputRow}>
                <TextInput
                  style={styles.manualInput}
                  value={manualBarcode}
                  onChangeText={setManualBarcode}
                  placeholder="Type barcode here..."
                  keyboardType="default"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={handleManualBarcodeSubmit}
                />
                <TouchableOpacity 
                  style={[
                    styles.submitButton,
                    !manualBarcode.trim() && styles.submitButtonDisabled
                  ]}
                  onPress={handleManualBarcodeSubmit}
                  disabled={!manualBarcode.trim()}
                >
                  <Text style={styles.submitButtonText}>SCAN</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Test/Demo Options */}
            <View style={styles.demoContainer}>
              <Text style={styles.demoTitle}>Test/Demo Options:</Text>
              <TouchableOpacity 
                style={styles.testButton} 
                onPress={testScan}
              >
                <Text style={styles.testButtonText}>🧪 Random Test Scan</Text>
              </TouchableOpacity>
              
              <Text style={styles.demoInfo}>
                💡 The system will automatically add products to cart when a valid barcode is scanned.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.closeButtonFull} 
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>Close Scanner</Text>
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
  scannerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
  },
  scannerIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  scannerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  scannerSubtitle: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  
  // Manual Input Styles
  manualInputContainer: {
    width: '100%',
    marginBottom: 30,
  },
  manualInputLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  manualInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  manualInput: {
    flex: 1,
    backgroundColor: '#374151',
    color: '#fff',
    fontSize: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  submitButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#6b7280',
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Demo/Test Styles
  demoContainer: {
    width: '100%',
    alignItems: 'center',
  },
  demoTitle: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
  },
  testButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  demoInfo: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
    maxWidth: 280,
  },
  
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
  closeButtonFull: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
});

export default BarcodeScannerComponent;