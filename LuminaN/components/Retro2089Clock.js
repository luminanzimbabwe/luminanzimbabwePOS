import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import licenseService from '../services/licenseService';

const Retro2089Clock = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [licenseInfo, setLicenseInfo] = useState(null);
  const [timeSource, setTimeSource] = useState('SYSTEM');
  const [timeAccuracy, setTimeAccuracy] = useState('LOCAL');
  const [fadeAnim] = useState(new Animated.Value(1));
  const [pulseAnim] = useState(new Animated.Value(1));
  const [glitchAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Initialize time sources for security
    initializeTimeSources();
    
    // Update time every 16ms for smooth milliseconds (60fps)
    const timeInterval = setInterval(() => {
      updateTime();
    }, 16);

    // Load license info
    loadLicenseInfo();

    // Pulse animation for the clock
    const pulseInterval = setInterval(() => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();
    }, 2000);

    // Random glitch effect
    const glitchInterval = setInterval(() => {
      if (Math.random() < 0.1) { // 10% chance every 2 seconds
        Animated.sequence([
          Animated.timing(glitchAnim, {
            toValue: 1,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(glitchAnim, {
            toValue: 0,
            duration: 50,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, 2000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(pulseInterval);
      clearInterval(glitchInterval);
    };
  }, []);

  const initializeTimeSources = async () => {
    try {
      // Get multiple time sources for validation
      const systemTime = new Date();
      
      // Try to get network time for validation
      try {
        const networkTime = await getNetworkTime();
        if (networkTime) {
          const timeDiff = Math.abs(networkTime.getTime() - systemTime.getTime());
          if (timeDiff < 5000) { // Within 5 seconds
            setTimeSource('NETWORK_SYNC');
            setTimeAccuracy('VERIFIED');
            setCurrentTime(networkTime);
          } else {
            setTimeSource('SYSTEM');
            setTimeAccuracy('UNVERIFIED');
          }
        } else {
          setTimeSource('SYSTEM');
          setTimeAccuracy('LOCAL_ONLY');
        }
      } catch (networkError) {
        console.warn('Network time sync failed, using system time:', networkError);
        setTimeSource('SYSTEM');
        setTimeAccuracy('LOCAL_ONLY');
      }
    } catch (error) {
      console.error('Time source initialization failed:', error);
      setTimeSource('SYSTEM');
      setTimeAccuracy('ERROR');
    }
  };

  const getNetworkTime = async () => {
    try {
      // Try multiple reliable time servers
      const timeServers = [
        'https://worldtimeapi.org/api/timezone/Etc/UTC',
        'https://api.timezonedb.com/v2.1/get-time-zone?key=YOUR_KEY&format=json&by=zone&zone=UTC'
      ];
      
      for (const server of timeServers) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
          
          const response = await fetch(server, {
            method: 'GET',
            signal: controller.signal,
            headers: { 'Cache-Control': 'no-cache' }
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const timeData = await response.json();
            if (server.includes('worldtimeapi')) {
              return new Date(timeData.datetime);
            }
          }
        } catch (serverError) {
          console.warn(`Time server ${server} failed:`, serverError);
          continue;
        }
      }
      return null;
    } catch (error) {
      console.error('Network time fetch failed:', error);
      return null;
    }
  };

  const updateTime = () => {
    const newTime = new Date();
    
    // Detect time manipulation
    if (timeSource === 'SYSTEM') {
      const lastUpdate = currentTime.getTime();
      const currentUpdate = newTime.getTime();
      const timeDiff = currentUpdate - lastUpdate;
      
      // If time went backwards significantly or jumped forward unrealistically
      if (timeDiff < -1000 || timeDiff > 60000) {
        console.warn('Potential time manipulation detected:', timeDiff);
        setTimeAccuracy('MANIPULATED');
        
        // Try to re-sync with network time
        initializeTimeSources();
      }
    }
    
    setCurrentTime(newTime);
  };

  const loadLicenseInfo = async () => {
    try {
      const licenseStatus = await licenseService.getLicenseStatus();
      if (licenseStatus.hasLicense && licenseStatus.licenseInfo) {
        setLicenseInfo(licenseStatus.licenseInfo);
      }
    } catch (error) {
      console.error('Failed to load license info for clock:', error);
    }
  };

  const formatTime = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
    
    return { hours, minutes, seconds, milliseconds };
  };

  const getDaysRemaining = () => {
    if (!licenseInfo) return null;
    return licenseInfo.daysRemaining;
  };

  const time = formatTime(currentTime);
  const daysRemaining = getDaysRemaining();

  return (
    <Animated.View 
      style={[
        styles.clockContainer,
        {
          transform: [
            { scale: pulseAnim },
            { 
              translateX: glitchAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, Math.random() * 4 - 2]
              })
            },
            { 
              translateY: glitchAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, Math.random() * 2 - 1]
              })
            }
          ],
          opacity: fadeAnim
        }
      ]}
    >
      {/* Retro CRT Monitor Frame */}
      <View style={styles.crtFrame}>
        <View style={styles.crtScreen}>
          {/* Scanlines Effect */}
          <View style={styles.scanlines} />
          
          {/* Clock Header */}
          <View style={styles.clockHeader}>
            <Icon name="schedule" size={16} color="#ffaa00" />
            <Text style={styles.clockTitle}>TEMPORAL MATRIX</Text>
            <View style={styles.timeSourceContainer}>
              <View style={[
                styles.timeSourceIndicator,
                { 
                  backgroundColor: 
                    timeAccuracy === 'VERIFIED' ? '#00ff88' :
                    timeAccuracy === 'UNVERIFIED' ? '#ffaa00' :
                    timeAccuracy === 'LOCAL_ONLY' ? '#00f5ff' :
                    timeAccuracy === 'MANIPULATED' ? '#ff4444' : '#666'
                }
              ]} />
              <Text style={[
                styles.timeSourceText,
                { 
                  color: 
                    timeAccuracy === 'VERIFIED' ? '#00ff88' :
                    timeAccuracy === 'UNVERIFIED' ? '#ffaa00' :
                    timeAccuracy === 'LOCAL_ONLY' ? '#00f5ff' :
                    timeAccuracy === 'MANIPULATED' ? '#ff4444' : '#666'
                }
              ]}>
                {timeSource === 'NETWORK_SYNC' ? 'NETWORK' : 
                 timeSource === 'SYSTEM' ? 'SYSTEM' : 'UNKNOWN'}
              </Text>
            </View>
            <View style={styles.statusLed} />
          </View>

          {/* Main Time Display */}
          <View style={styles.timeDisplay}>
            {/* Hours */}
            <View style={styles.timeUnit}>
              <Text style={styles.timeLabel}>HRS</Text>
              <Text style={styles.timeValue}>{time.hours}</Text>
            </View>
            
            <Text style={styles.timeSeparator}>:</Text>
            
            {/* Minutes */}
            <View style={styles.timeUnit}>
              <Text style={styles.timeLabel}>MIN</Text>
              <Text style={styles.timeValue}>{time.minutes}</Text>
            </View>
            
            <Text style={styles.timeSeparator}>:</Text>
            
            {/* Seconds */}
            <View style={styles.timeUnit}>
              <Text style={styles.timeLabel}>SEC</Text>
              <Text style={styles.timeValue}>{time.seconds}</Text>
            </View>
            
            <Text style={styles.timeSeparator}>.</Text>
            
            {/* Milliseconds */}
            <View style={styles.timeUnitSmall}>
              <Text style={styles.timeLabelSmall}>MS</Text>
              <Text style={styles.timeValueSmall}>{time.milliseconds}</Text>
            </View>
          </View>

          {/* License Integration */}
          {licenseInfo && (
            <View style={styles.licenseIntegration}>
              <View style={styles.licenseDataRow}>
                <Icon name="security" size={14} color="#00ff88" />
                <Text style={styles.licenseLabel}>LICENSE STATUS:</Text>
                <Text style={[
                  styles.licenseValue,
                  { color: licenseInfo.isExpired ? '#ff4444' : '#00ff88' }
                ]}>
                  {licenseInfo.isExpired ? 'EXPIRED' : 'ACTIVE'}
                </Text>
              </View>
              
              <View style={styles.licenseDataRow}>
                <Icon name="timer" size={14} color="#00f5ff" />
                <Text style={styles.licenseLabel}>DAYS REMAINING:</Text>
                <Text style={[
                  styles.licenseValue,
                  { color: daysRemaining <= 7 ? '#ffaa00' : '#00f5ff' }
                ]}>
                  {daysRemaining || 0}
                </Text>
              </View>
              
              {licenseInfo.isExpiringSoon && daysRemaining <= 7 && (
                <View style={styles.warningRow}>
                  <Icon name="warning" size={14} color="#ff4444" />
                  <Text style={styles.warningText}>LICENSE EXPIRING SOON</Text>
                </View>
              )}
            </View>
          )}

          {/* Futuristic Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View 
                style={[
                  styles.progressFill,
                  {
                    width: `${((24 - currentTime.getHours()) / 24) * 100}%`,
                    backgroundColor: daysRemaining && daysRemaining <= 7 ? '#ff4444' : '#00ff88'
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              DAILY CYCLE: {Math.round(((24 - currentTime.getHours()) / 24) * 100)}%
            </Text>
          </View>

          {/* Date Display */}
          <View style={styles.dateDisplay}>
            <Text style={styles.dateText}>
              {currentTime.toLocaleDateString('en-US', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Text>
          </View>
        </View>
      </View>

      {/* Ambient Glow Effect */}
      <View style={styles.ambientGlow} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  clockContainer: {
    alignItems: 'center',
    marginVertical: 20,
    position: 'relative',
  },
  crtFrame: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 4,
    borderWidth: 3,
    borderColor: '#00f5ff',
    shadowColor: '#00f5ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  crtScreen: {
    backgroundColor: '#000000',
    borderRadius: 16,
    padding: 20,
    width: 350,
    position: 'relative',
    overflow: 'hidden',
  },
  scanlines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,255,0,0.03) 0px, rgba(0,255,0,0.03) 1px, transparent 1px, transparent 3px)',
    pointerEvents: 'none',
  },
  clockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  clockTitle: {
    color: '#ffaa00',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
    flex: 1,
    textAlign: 'center',
  },
  timeSourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  timeSourceIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 3,
  },
  timeSourceText: {
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  statusLed: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00ff88',
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(0, 255, 0, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 0, 0.3)',
  },
  timeUnit: {
    alignItems: 'center',
    minWidth: 60,
  },
  timeUnitSmall: {
    alignItems: 'center',
    minWidth: 50,
  },
  timeLabel: {
    color: '#888',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  timeLabelSmall: {
    color: '#666',
    fontSize: 7,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 2,
  },
  timeValue: {
    color: '#00ff00',
    fontSize: 36,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    textShadowColor: '#00ff00',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
    letterSpacing: 2,
  },
  timeValueSmall: {
    color: '#00aa00',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    textShadowColor: '#00aa00',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
    letterSpacing: 1,
  },
  timeSeparator: {
    color: '#ffaa00',
    fontSize: 28,
    fontWeight: 'bold',
    marginHorizontal: 8,
    textShadowColor: '#ffaa00',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
  licenseIntegration: {
    backgroundColor: 'rgba(0, 100, 200, 0.1)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(0, 100, 200, 0.3)',
  },
  licenseDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  licenseLabel: {
    color: '#00f5ff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginLeft: 8,
    marginRight: 10,
    minWidth: 120,
  },
  licenseValue: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 68, 68, 0.3)',
  },
  warningText: {
    color: '#ff4444',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginLeft: 8,
  },
  progressContainer: {
    marginBottom: 15,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    color: '#888',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
  },
  dateDisplay: {
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  dateText: {
    color: '#cccccc',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  ambientGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    backgroundColor: 'radial-gradient(circle, rgba(0,245,255,0.1) 0%, transparent 70%)',
    borderRadius: 30,
    zIndex: -1,
  },
});

export default Retro2089Clock;