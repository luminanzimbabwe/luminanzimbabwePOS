import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ROUTES } from '../constants/navigation';

const SuccessScreen = ({ navigation, route }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Get custom props from route params
  const { 
    title = 'Success!', 
    subtitle = 'Operation completed successfully',
    buttonText = 'Continue',
    onContinue,
    customNavigation,
    isError = false,
    errorDetails = null
  } = route?.params || {};

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleContinue = () => {
    if (onContinue) {
      onContinue();
    } else if (customNavigation) {
      customNavigation();
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainApp' }],
      });
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.card}>
          <Animated.View
            style={[
              styles.checkmarkContainer,
              {
                transform: [{ scale: scaleAnim }],
                opacity: opacityAnim,
                backgroundColor: isError ? 'rgba(220, 38, 38, 0.3)' : 'rgba(16, 185, 129, 0.3)',
                borderColor: isError ? 'rgba(220, 38, 38, 0.5)' : 'rgba(16, 185, 129, 0.5)',
              },
            ]}
          >
            <Text style={styles.checkmark}>
              {isError ? '✗' : '✓'}
            </Text>
          </Animated.View>

          <Text style={styles.title}>{title}</Text>

          <Text style={styles.subtitle}>
            {subtitle}
          </Text>

          {/* Show error details if available */}
          {isError && errorDetails && (
            <View style={styles.errorDetailsContainer}>
              <Text style={styles.errorDetailsTitle}>Error Details:</Text>
              <ScrollView style={styles.errorDetailsScroll}>
                <Text style={styles.errorDetailsText}>{errorDetails}</Text>
              </ScrollView>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.button, isError && styles.errorButton]} 
            onPress={handleContinue}
          >
            <Text style={styles.buttonText}>{buttonText}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 500,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    width: 350,
    maxHeight: 600,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  checkmarkContainer: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'rgba(16, 185, 129, 0.5)',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 40,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 30,
  },
  errorDetailsContainer: {
    width: '100%',
    marginBottom: 20,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
    padding: 15,
    maxHeight: 150,
  },
  errorDetailsTitle: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorDetailsScroll: {
    maxHeight: 100,
  },
  errorDetailsText: {
    color: '#ffaaaa',
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  button: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.6)',
    width: 150,
  },
  errorButton: {
    backgroundColor: 'rgba(220, 38, 38, 0.3)',
    borderColor: 'rgba(220, 38, 38, 0.6)',
  },
  buttonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SuccessScreen;