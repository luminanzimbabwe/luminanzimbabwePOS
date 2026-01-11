import React from 'react';
import { View, StyleSheet, Image, Text } from 'react-native';

const LuminaLogo = ({ size = 'normal' }) => {
  // Size configurations for the image
  const getContainerStyle = () => {
    switch (size) {
      case 'large':
        return { width: 400, height: 200 };
      case 'fullscreen':
        return {
          width: '90%',
          height: '60%',
          maxWidth: 600,
          maxHeight: 300,
        };
      default:
        return { width: 400, height: 200 };
    }
  };

  const containerStyle = getContainerStyle();

  if (size === 'fullscreen') {
    return (
      <Image
        source={require('../assets/luminanzimbabwelogo.png')}
        style={[styles.fullscreenBackgroundImage, containerStyle]}
        resizeMode="contain"
      />
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Background Image */}
      <Image
        source={require('../assets/luminanzimbabwelogo.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      {/* Overlay Text */}
      <View style={styles.overlay}>
        <Text style={styles.logoText}>LUMINA</Text>
        <Text style={styles.logoSubtitle}>ZIMBABWE POS</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a2e', // Dark blue-grey background
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fullscreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.8, // Slight transparency to blend with background
  },
  fullscreenBackgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 1.0, // Full opacity for clear display
    resizeMode: 'contain', // Better scaling to maintain aspect ratio
    backgroundColor: 'transparent', // Ensure no background
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(26, 26, 46, 0.3)', // Semi-transparent overlay
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#e0e7ff', // Light blue-white
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    fontFamily: 'serif',
    letterSpacing: 2,
  },
  logoSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#94a3b8', // Grey-blue
    textAlign: 'center',
    marginTop: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    fontFamily: 'serif',
  },
});

export default LuminaLogo;
