import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

const WeightInputModal = ({ 
  visible, 
  product, 
  onAdd, 
  onCancel,
  isDarkTheme = true 
}) => {
  const [weight, setWeight] = useState('');
  const [scaleAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      // Reset weight when modal opens
      setWeight('');
      // Animate in
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleAdd = () => {
    const numWeight = parseFloat(weight);
    if (numWeight > 0) {
      onAdd(numWeight);
    }
  };

  const handleCancel = () => {
    onCancel();
  };

  const getUnitIcon = (unit) => {
    switch (unit) {
      case 'kg': return '⚖️';
      case 'g': return '⚖️';
      case 'lb': return '⚖️';
      case 'oz': return '⚖️';
      default: return '⚖️';
    }
  };

  const getUnitLabel = (unit) => {
    switch (unit) {
      case 'kg': return 'Kilograms';
      case 'g': return 'Grams';
      case 'lb': return 'Pounds';
      case 'oz': return 'Ounces';
      default: return unit;
    }
  };

  if (!product) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleCancel}
    >
      <View style={styles.modalOverlay}>
        <Animated.View 
          style={[
            styles.modalContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            }
          ]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerIconContainer}>
              <Icon name="scale" size={28} color="#10b981" />
            </View>
            <Text style={styles.modalTitle}>Add Weighable Product</Text>
            <Text style={styles.modalSubtitle}>{product.name}</Text>
          </View>

          {/* Product Info */}
          <View style={styles.productInfo}>
            <Text style={styles.productPrice}>
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(product.price)}/{product.price_type}
            </Text>
            <Text style={styles.productCategory}>
              📁 {product.category || 'Uncategorized'}
            </Text>
          </View>

          {/* Weight Input Section */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>
              {getUnitIcon(product.price_type)} Enter Weight ({getUnitLabel(product.price_type)})
            </Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.weightInput}
                value={weight}
                onChangeText={setWeight}
                placeholder="0.0"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                autoFocus
                maxLength={10}
              />
              <View style={styles.unitDisplay}>
                <Text style={styles.unitText}>{product.price_type}</Text>
              </View>
            </View>

            {/* Quick Add Buttons */}
            <View style={styles.quickAddContainer}>
              <Text style={styles.quickAddLabel}>Quick Add:</Text>
              <View style={styles.quickAddButtons}>
                {getQuickAddWeights(product.price_type).map((quickWeight) => (
                  <TouchableOpacity
                    key={quickWeight}
                    style={styles.quickAddButton}
                    onPress={() => setWeight(quickWeight.toString())}
                  >
                    <Text style={styles.quickAddButtonText}>
                      {quickWeight}{product.price_type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
            >
              <Icon name="close" size={20} color="#ffffff" />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.button, 
                styles.addButton,
                parseFloat(weight) > 0 ? styles.addButtonActive : styles.addButtonDisabled
              ]}
              onPress={handleAdd}
              disabled={!weight || parseFloat(weight) <= 0}
            >
              <Icon name="add-shopping-cart" size={20} color="#ffffff" />
              <Text style={styles.addButtonText}>Add to Cart</Text>
            </TouchableOpacity>
          </View>

          {/* Preview Section */}
          {weight && parseFloat(weight) > 0 && (
            <View style={styles.previewSection}>
              <Text style={styles.previewLabel}>Preview:</Text>
              <Text style={styles.previewText}>
                {parseFloat(weight)} {product.price_type} × ${parseFloat(product.price).toFixed(2)} = 
                <Text style={styles.previewTotal}>
                  {' '}${((parseFloat(weight)) * parseFloat(product.price)).toFixed(2)}
                </Text>
              </Text>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const getQuickAddWeights = (priceType) => {
  switch (priceType) {
    case 'kg':
      return [0.25, 0.5, 1, 1.5, 2];
    case 'g':
      return [100, 250, 500, 750, 1000];
    case 'lb':
      return [0.5, 1, 1.5, 2, 3];
    case 'oz':
      return [4, 8, 12, 16, 24];
    default:
      return [1];
  }
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalSubtitle: {
    color: '#9ca3af',
    fontSize: 16,
    textAlign: 'center',
  },
  productInfo: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  productPrice: {
    color: '#10b981',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  productCategory: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4b5563',
    marginBottom: 16,
  },
  weightInput: {
    flex: 1,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  unitDisplay: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#10b981',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  unitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    minWidth: 30,
    textAlign: 'center',
  },
  quickAddContainer: {
    marginTop: 8,
  },
  quickAddLabel: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  quickAddButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  quickAddButton: {
    backgroundColor: '#374151',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  quickAddButtonText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#6b7280',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#10b981',
  },
  addButtonActive: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonDisabled: {
    backgroundColor: '#6b7280',
    opacity: 0.6,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  previewSection: {
    backgroundColor: '#065f46',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  previewLabel: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  previewText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  previewTotal: {
    color: '#10b981',
    fontWeight: '700',
  },
});

export default WeightInputModal;