import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  RefreshControl,
  Animated,
  Dimensions,
  PanResponder,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { shopStorage } from '../services/storage';
import { shopAPI } from '../services/api';
import { ROUTES } from '../constants/navigation';
import BarcodeScanner from '../components/BarcodeScanner';
import presenceService from '../services/presenceService';
import Icon from 'react-native-vector-icons/MaterialIcons';
import WeightInputModal from '../components/WeightInputModal';
// import ecocashService from '../services/ecocashService'; // REMOVED - USD only
import exchangeRateService from '../services/exchangeRateService';

const { width, height } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(width * 0.75, 350); // Cover up to 75% of screen, max 350px

const CashierDashboardScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [loading, setLoading] = useState(true);
  const [cashierData, setCashierData] = useState(null);
  const [shopData, setShopData] = useState(null);
  const [shopStatus, setShopStatus] = useState(null);
  
  // POS State - Multi-Currency Support
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash'); // Cash payment method
  const [selectedCurrency, setSelectedCurrency] = useState('USD'); // Selected currency for payment
  
  // Payment Details State - Multi-Currency Support
  const [cardLast4, setCardLast4] = useState('');
  const [transferReference, setTransferReference] = useState('');
  const [transferWallet, setTransferWallet] = useState('');
  const [showTransferWalletModal, setShowTransferWalletModal] = useState(false);
  const [cardNetwork, setCardNetwork] = useState('');
  
  // Available transfer wallets - Comprehensive list for Zimbabwe and regional payments
  const transferWallets = [
    // ===== ZIG CURRENCY WALLETS =====
    { id: 'ecocash', name: 'EcoCash', currency: 'ZIG', icon: '📱' },
    { id: 'onemoney', name: 'OneMoney', currency: 'ZIG', icon: '💰' },
    { id: 'innbucks', name: 'InnBucks', currency: 'ZIG', icon: '💳' },
    { id: 'telecash', name: 'Telecash', currency: 'ZIG', icon: '📞' },
    { id: 'sadzaim', name: 'Sadzaim', currency: 'ZIG', icon: '🍲' },
    { id: 'mpesa_zig', name: 'M-Pesa ZW', currency: 'ZIG', icon: '📲' },
    { id: 'impesa', name: 'Impesa', currency: 'ZIG', icon: '💸' },
    { id: 'zemax', name: 'Zemax Pay', currency: 'ZIG', icon: '🔶' },
    { id: 'pauCash', name: 'PauCash', currency: 'ZIG', icon: '💴' },
    { id: 'cashtech', name: 'CashTech', currency: 'ZIG', icon: '💵' },
    { id: 'hughespay', name: 'HughesPay', currency: 'ZIG', icon: '🏦' },
    { id: 'saspay', name: 'SasPay', currency: 'ZIG', icon: '💳' },
    { id: 'vipcash', name: 'VIP Cash', currency: 'ZIG', icon: '⭐' },
    { id: 'freecash', name: 'FreeCash', currency: 'ZIG', icon: '🆓' },
    { id: 'zimbocash', name: 'ZimboCash', currency: 'ZIG', icon: '💰' },
    { id: 'pocketvending', name: 'PocketVending', currency: 'ZIG', icon: '📱' },
    
    // ===== USD CURRENCY WALLETS/ACCOUNTS =====
    { id: 'ecocash_usd', name: 'EcoCash USD', currency: 'USD', icon: '📱' },
    { id: 'onemoney_usd', name: 'OneMoney USD', currency: 'USD', icon: '💰' },
    { id: 'visa', name: 'Visa Card', currency: 'USD', icon: '💳' },
    { id: 'mastercard', name: 'Mastercard', currency: 'USD', icon: '💳' },
    { id: 'amex', name: 'Amex Card', currency: 'USD', icon: '💳' },
    { id: 'zimswitch', name: 'ZimSwitch', currency: 'USD', icon: '🔄' },
    { id: 'visa_debit', name: 'Visa Debit', currency: 'USD', icon: '💳' },
    { id: 'mastercard_debit', name: 'Mastercard Debit', currency: 'USD', icon: '💳' },
    { id: 'intl_card', name: 'International Card', currency: 'USD', icon: '🌍' },
    { id: 'paypal', name: 'PayPal', currency: 'USD', icon: '🅿️' },
    { id: 'skrill', name: 'Skrill', currency: 'USD', icon: '💸' },
    { id: 'neteller', name: 'Neteller', currency: 'USD', icon: '💳' },
    { id: 'wise', name: 'Wise', currency: 'USD', icon: '🌐' },
    { id: 'payoneer', name: 'Payoneer', currency: 'USD', icon: '💼' },
    { id: 'stripe', name: 'Stripe', currency: 'USD', icon: '💳' },
    { id: 'bank_transfer_usd', name: 'Bank Transfer USD', currency: 'USD', icon: '🏦' },
    { id: 'swift_usd', name: 'SWIFT USD', currency: 'USD', icon: '🌍' },
    { id: 'westernunion', name: 'Western Union', currency: 'USD', icon: '💸' },
    { id: 'moneygram', name: 'MoneyGram', currency: 'USD', icon: '💰' },
    
    // ===== RAND CURRENCY WALLETS/ACCOUNTS =====
    { id: 'ecocash_rand', name: 'EcoCash Rand', currency: 'RAND', icon: '📱' },
    { id: 'onemoney_rand', name: 'OneMoney Rand', currency: 'RAND', icon: '💰' },
    { id: 'visa_rand', name: 'Visa Card Rand', currency: 'RAND', icon: '💳' },
    { id: 'mastercard_rand', name: 'Mastercard Rand', currency: 'RAND', icon: '💳' },
    { id: 'snapscan', name: 'SnapScan', currency: 'RAND', icon: '📸' },
    { id: 'zapper', name: 'Zapper', currency: 'RAND', icon: '📱' },
    { id: 'fnb', name: 'FNB Account', currency: 'RAND', icon: '🏦' },
    { id: 'standard_bank', name: 'Standard Bank', currency: 'RAND', icon: '🏦' },
    { id: 'absa_rand', name: 'ABSA Rand', currency: 'RAND', icon: '🏦' },
    { id: 'nedbank_rand', name: 'Nedbank Rand', currency: 'RAND', icon: '🏦' },
    { id: 'capitec_rand', name: 'Capitec Rand', currency: 'RAND', icon: '🏦' },
    { id: 'ozow', name: 'Ozow', currency: 'RAND', icon: '💳' },
    { id: 'peachpayments', name: 'Peach Payments', currency: 'RAND', icon: '🍑' },
    { id: 'bank_transfer_rand', name: 'Bank Transfer Rand', currency: 'RAND', icon: '🏦' },
  ];
  
  const cardNetworks = [
    { id: 'visa', name: 'Visa', icon: '💳' },
    { id: 'mastercard', name: 'Mastercard', icon: '💳' },
    { id: 'amex', name: 'American Express', icon: '💳' },
    { id: 'discover', name: 'Discover', icon: '💳' },
    { id: 'visa_debit', name: 'Visa Debit', icon: '💳' },
    { id: 'mastercard_debit', name: 'Mastercard Debit', icon: '💳' },
    { id: 'visa_zig', name: 'Visa (ZIG)', icon: '💳' },
    { id: 'visa_rand', name: 'Visa (RAND)', icon: '💳' },
    { id: 'other', name: 'Other Card', icon: '💳' },
  ];
  
  // Handle selected products from CashierProductsScreen
  useEffect(() => {
    if (route.params && route.params.selectedProducts) {
      const selectedProducts = route.params.selectedProducts;
      console.log('Adding selected products to cart:', selectedProducts);
      
      // Show success message
      Alert.alert(
        '✅ Products Added to Cart',
        `${selectedProducts.length} product${selectedProducts.length !== 1 ? 's' : ''} added to your cart!`,
        [{ text: 'OK' }]
      );
      
      // Merge selected products into existing cart
      setCart(prevCart => {
        const newCart = [...prevCart];
        selectedProducts.forEach(selectedProduct => {
          const existingItem = newCart.find(item => item.id === selectedProduct.id);
          if (existingItem) {
            // Update quantity or weight if product already in cart
            if (selectedProduct.price_type === 'unit') {
              existingItem.quantity += selectedProduct.quantity;
            } else {
              // For weighable products, update weight
              existingItem.weight = (existingItem.weight || 0) + (selectedProduct.weight || selectedProduct.quantity || 0);
            }
          } else {
            // Add new product to cart
            newCart.push(selectedProduct);
          }
        });
        return newCart;
      });
      
      // Clear the navigation param to prevent re-adding
      navigation.setParams({ selectedProducts: undefined });
    }

    // Handle quick product selection from QuickProductsScreen
    if (route.params && route.params.selectedQuickProduct) {
      const selectedProduct = route.params.selectedQuickProduct;
      console.log('Adding quick product to cart:', selectedProduct);
      
      addToCart(selectedProduct);
      
      // Clear the navigation param to prevent re-adding
      navigation.setParams({ selectedQuickProduct: undefined });
    }
  }, [route.params, navigation]);
  const [amountReceived, setAmountReceived] = useState('');
  const [productsLoading, setProductsLoading] = useState(false);
  const [processingSale, setProcessingSale] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalData, setErrorModalData] = useState({ title: '', message: '', type: 'error' });
  const [presenceStatus, setPresenceStatus] = useState({ isOnline: false, lastActivity: null });
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeValidation, setBarcodeValidation] = useState(null); // Track validation state
  const [backgroundScannerActive, setBackgroundScannerActive] = useState(false);

  // Drawer Status State
  const [drawerStatus, setDrawerStatus] = useState(null);
  const [showDrawerStatus, setShowDrawerStatus] = useState(false);
  const [refreshingDrawer, setRefreshingDrawer] = useState(false);
  const [drawerWasResetAtEOD, setDrawerWasResetAtEOD] = useState(false);
  
  // Sidebar State
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarX] = useState(new Animated.Value(-SIDEBAR_WIDTH));
  
  // Cart View State
  const [cartExpanded, setCartExpanded] = useState(false);
  
  // Products View State
  const [productsExpanded, setProductsExpanded] = useState(false);

  // Weight Input Modal State
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [weightInput, setWeightInput] = useState('');

  // Calculator State - Ultra Advanced Calculator with Graphing
  const [calculatorDisplay, setCalculatorDisplay] = useState('0');
  const [calculatorPreviousValue, setCalculatorPreviousValue] = useState(null);
  const [calculatorOperation, setCalculatorOperation] = useState(null);
  const [calculatorWaitingForNewValue, setCalculatorWaitingForNewValue] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorMemory, setCalculatorMemory] = useState(0);
  const [quantityMultiplier, setQuantityMultiplier] = useState('1');
  // Formula display for showing current operation
  const [calculatorFormula, setCalculatorFormula] = useState('');
  
  // Ultra Advanced Calculator Modes
  const [calculatorMode, setCalculatorMode] = useState('scientific'); // basic, scientific, stats, graph, matrix, programmer
  const [calculatorHistory, setCalculatorHistory] = useState([]);
  const [graphData, setGraphData] = useState({ type: 'bar', labels: [], values: [], title: '' });
  const [listInput, setListInput] = useState('');
  const [listResults, setListResults] = useState(null);
  const [matrixInput, setMatrixInput] = useState({ a: '', b: '', c: '', d: '' });
  const [matrixResult, setMatrixResult] = useState(null);
  const [equationInput, setEquationInput] = useState('x^2');
  const [graphRange, setGraphRange] = useState({ xMin: -10, xMax: 10, yMin: -10, yMax: 10 });
  const [customFunctions, setCustomFunctions] = useState([]);
  const [showGraph, setShowGraph] = useState(false);
  const [programmerMode, setProgrammerMode] = useState('dec'); // dec, bin, hex, oct
  
  // Tax Settings
  const [taxRate, setTaxRate] = useState(15); // Default 15% VAT

  // Exchange Rates State
  const [exchangeRates, setExchangeRates] = useState(null);
  const [ratesLoading, setRatesLoading] = useState(true);

  // Discount and Tax State
  const [cartDiscount, setCartDiscount] = useState(0);
  const [taxIncluded, setTaxIncluded] = useState(true);

  // Real-time Dashboard Functions
  const [realTimeStats, setRealTimeStats] = useState({
    todaySales: 0,
    totalTransactions: 0,
    averageTransaction: 0,
    itemsPerTransaction: 0,
    peakHour: '14:00-15:00',
    lastUpdated: new Date()
  });


  useEffect(() => {
    loadCashierData();
    fetchExchangeRates();
    
    // Set up presence tracking
    if (typeof window !== 'undefined') {
      window.addEventListener('presenceStatusChanged', handlePresenceChange);
    }
    
    // Set up background barcode scanner listening
    setupBackgroundScanner();

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('presenceStatusChanged', handlePresenceChange);
      }
      // Clean up background scanner
      cleanupBackgroundScanner();
    };
    
    // Add web-specific scrolling CSS
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.textContent = `
        .cashier-dashboard-scroll {
          overflow-y: auto !important;
          overflow-x: hidden !important;
          height: 100vh !important;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
        if (typeof window !== 'undefined') {
          window.removeEventListener('presenceStatusChanged', handlePresenceChange);
        }
      };
    }
  }, []);

  // Auto-refresh drawer status when cashierData is available
  useEffect(() => {
    if (!cashierData || drawerWasResetAtEOD) return;
    const interval = setInterval(() => {
      loadDrawerStatus(cashierData);
    }, 5000);
    return () => clearInterval(interval);
  }, [cashierData, drawerWasResetAtEOD]);

  // Fetch business settings when component loads
  useEffect(() => {
    fetchBusinessSettings();
  }, []);

  // Refresh business settings when screen comes into focus (e.g., after returning from SettingsScreen)
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Screen focused - refreshing business settings...');
      fetchBusinessSettings();
      
      // Optional: Return cleanup function if needed
      return () => {
        console.log('🔄 Screen unfocused');
      };
    }, [])
  );

  // Fetch business settings for the header display
  const fetchBusinessSettings = async () => {
    try {
      // First try to load from local storage immediately (for fast display)
      const storedSettings = await shopStorage.getBusinessSettings();
      if (storedSettings) {
        console.log('📦 Using business settings from storage (immediate):', storedSettings);
        setShopData(prev => ({
          ...prev,
          opening_time: storedSettings.opening_time || prev?.opening_time,
          closing_time: storedSettings.closing_time || prev?.closing_time,
          timezone: storedSettings.timezone || prev?.timezone,
          vat_rate: storedSettings.vat_rate || prev?.vat_rate,
        }));
      }
      
      // Then fetch from API to get latest settings
      const response = await shopAPI.getBusinessSettings();
      if (response.data) {
        console.log('📊 Business settings loaded from API:', response.data);
        
        // Extract settings from response (handle both direct data and nested structure)
        const settingsData = response.data.settings || response.data;
        
        const newSettings = {
          opening_time: settingsData.opening_time || storedSettings?.opening_time || null,
          closing_time: settingsData.closing_time || storedSettings?.closing_time || null,
          timezone: settingsData.timezone || storedSettings?.timezone || null,
          vat_rate: settingsData.vat_rate || storedSettings?.vat_rate || null,
        };
        
        // Update shopData with the latest business settings
        setShopData(prev => ({
          ...prev,
          ...newSettings
        }));
        
        // Also save to local storage for persistence
        try {
          await shopStorage.saveBusinessSettings(newSettings);
          console.log('💾 Business settings saved to storage');
        } catch (storageError) {
          console.log('⚠️ Could not save business settings to storage:', storageError.message);
        }
      }
    } catch (error) {
      console.log('⚠️ Could not load business settings from API:', error.message);
      
      // If API fails and we didn't load from storage above, try to load from local storage
      if (!storedSettings) {
        try {
          const storedSettings = await shopStorage.getBusinessSettings();
          if (storedSettings) {
            console.log('📦 Using business settings from storage (fallback):', storedSettings);
            setShopData(prev => ({
              ...prev,
              opening_time: storedSettings.opening_time || null,
              closing_time: storedSettings.closing_time || null,
              timezone: storedSettings.timezone || null,
              vat_rate: storedSettings.vat_rate || null,
            }));
          }
        } catch (storageError) {
          console.log('⚠️ Could not load business settings from storage either');
        }
      }
    }
  };

  // Fetch exchange rates for payment processing context
  const fetchExchangeRates = async () => {
    try {
      setRatesLoading(true);
      const rates = await exchangeRateService.getCurrentRates();
      setExchangeRates(rates);
      console.log('💱 Exchange rates loaded for cashier:', rates);
    } catch (error) {
      console.error('❌ Failed to load exchange rates:', error);
      // Use default rates if API fails
      setExchangeRates({
        usd_to_zig: 24.50,
        usd_to_rand: 18.20,
        last_updated: new Date().toISOString()
      });
    } finally {
      setRatesLoading(false);
    }
  };

  // Sidebar animation effect
  useEffect(() => {
    Animated.timing(sidebarX, {
      toValue: showSidebar ? 0 : -SIDEBAR_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showSidebar]);

  // Pan responder for swipe gestures
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => {
        return evt.nativeEvent.locationX < 50; // Only respond to touches near the left edge
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return evt.nativeEvent.locationX < 50;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dx > 0 && showSidebar) {
          sidebarX.setValue(-SIDEBAR_WIDTH + gestureState.dx);
        } else if (gestureState.dx < 0 && !showSidebar) {
          sidebarX.setValue(-SIDEBAR_WIDTH + gestureState.dx);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 100) {
          // Swipe right to open
          setShowSidebar(true);
        } else if (gestureState.dx < -50) {
          // Swipe left to close
          setShowSidebar(false);
        } else {
          // Reset to original position
          Animated.timing(sidebarX, {
            toValue: showSidebar ? 0 : -SIDEBAR_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Filter products based on search and category
  useEffect(() => {
    if (products.length === 0) {
      setFilteredProducts([]);
      return;
    }

    let filtered = products;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => 
        product.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(product => 
        product.name?.toLowerCase().includes(query) ||
        product.line_code?.toLowerCase().includes(query) ||
        product.category?.toLowerCase().includes(query) ||
        product.barcode?.toLowerCase().includes(query)
      );
    }

    setFilteredProducts(filtered);
  }, [products, searchQuery, selectedCategory]);

  // Handle presence status changes
  const handlePresenceChange = (event) => {
    setPresenceStatus({
      isOnline: event.detail.isOnline,
      lastActivity: event.detail.lastActivity,
    });
  };

  const loadCashierData = async () => {
    try {
      const credentials = await shopStorage.getCredentials();
      console.log('🔍 Raw credentials from storage found');
      
      if (!credentials) {
        navigation.replace('Login');
        return;
      }

      // Check if this is a cashier login
      if (credentials.user_type === 'cashier' || credentials.name) {
        // Extract shop info using the same approach as SettingsScreen
        const shopInfo = credentials.shop_info || credentials;
        
        // Create comprehensive shop data (like SettingsScreen does)
        const fullShopData = {
          ...shopInfo,
          // Ensure all registration data is included with fallbacks
          register_id: credentials.register_id || shopInfo.register_id || 'REG-' + Date.now().toString(36).toUpperCase(),
          device_id: credentials.device_id || shopInfo.device_id || 'DEV-' + Math.random().toString(36).substring(2, 15).toUpperCase(),
          shop_id: credentials.shop_id || shopInfo.shop_id || 'SHOP-' + (shopInfo.name || 'UNK').substring(0, 3).toUpperCase() + '-' + Date.now().toString(36).substring(0, 6).toUpperCase(),
          owner_id: credentials.owner_id || shopInfo.owner_id || 'OWN-' + (shopInfo.email || 'unknown').split('@')[0].toUpperCase().substring(0, 6) + '-' + Date.now().toString(36).substring(0, 4).toUpperCase(),
          api_key: credentials.api_key || shopInfo.api_key || 'luminan_' + Math.random().toString(36).substring(2, 34).toUpperCase(),
          master_password: credentials.master_password || shopInfo.master_password || 'Generated during registration',
          recovery_codes: credentials.recovery_codes || shopInfo.recovery_codes || ['1HAEJ9', 'MS1QCX', 'K08XWJ', 'SJXAYI', '1ORIXN', 'XXDURU', 'I4PJIJ', 'P4CFG8'],
          registration_time: credentials.registration_time || shopInfo.registration_time || new Date().toISOString(),
          version: credentials.version || shopInfo.version || '1.0.0',
          checksum: credentials.checksum || shopInfo.checksum || 'CHK-' + Date.now().toString(36).toUpperCase(),
        };
        
        setCashierData(credentials);
        setShopData(fullShopData);
        
        // Initialize presence tracking for the cashier
        presenceService.initialize({
          id: credentials.id || credentials.cashier_id || credentials.user_id,
          name: credentials.name || 'Cashier',
          user_type: 'cashier',
          shop_info: fullShopData
        });
        
        // Load products for POS
        await loadProducts();
        
        // Load shop status first
        await loadShopStatus();
        
        // Load drawer status (pass credentials so we can pick the cashier's drawer)
        await loadDrawerStatus(credentials);
        
        // Test API connection and get fresh data
        try {
          const statusResponse = await shopAPI.checkStatus();
        } catch (apiError) {
          console.error('API Connection failed:', apiError);
        }
        
        // Try to get fresh data from API and merge (like SettingsScreen does)
        try {
          const response = await shopAPI.getOwnerDashboard();
          
          let apiData = null;
          if (response.data.shop_info) {
            apiData = response.data.shop_info;
          } else if (response.data.name || response.data.email) {
            apiData = response.data;
          }
          
          if (apiData) {
            // Merge API data with storage data (API takes priority for fresh data)
            const mergedData = {
              ...fullShopData,
              ...apiData,
              // Ensure critical fields are preserved from storage
              register_id: apiData.register_id || fullShopData?.register_id,
              device_id: apiData.device_id || fullShopData?.device_id,
              shop_id: apiData.shop_id || fullShopData?.shop_id,
              owner_id: apiData.owner_id || fullShopData?.owner_id,
              api_key: apiData.api_key || fullShopData?.api_key,
              master_password: fullShopData?.master_password,
              recovery_codes: fullShopData?.recovery_codes,
              checksum: fullShopData?.checksum,
            };
            
            setShopData(mergedData);
          }
        } catch (apiError) {
          // Keep the existing fullShopData if API fails
        }

      } else {
        // If not a cashier, redirect to main app
        navigation.replace('MainApp');
      }
      
    } catch (error) {
      console.error('Error loading cashier data:', error);
      navigation.replace('Login');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      setProductsLoading(true);
      console.log('Loading products from API...');
      const response = await shopAPI.getProducts();
      
      if (response.data && Array.isArray(response.data)) {
        console.log('Products loaded successfully:', response.data.length, 'products');
        setProducts(response.data);
      } else {
        console.log('No products found or invalid response format');
        setProducts([]);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      // Don't show error alert for products, just log it
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  const loadShopStatus = async () => {
    try {
      console.log('🔍 Loading shop status...');
      const response = await shopAPI.getShopStatus();
      console.log('📊 Shop status response:', response);
      
      // Handle different response structures
      let statusData = response.data;
      
      // If response is directly the status object
      if (statusData && (statusData.is_open !== undefined || statusData.status)) {
        // Normalize the status data structure
        const normalizedStatus = {
          is_open: statusData.is_open !== undefined ? statusData.is_open : (statusData.status !== 'CLOSED'),
          status: statusData.is_open ? 'OPEN' : 'CLOSED',
          ...statusData
        };
        
        console.log('✅ Shop status loaded:', normalizedStatus);
        setShopStatus(normalizedStatus);
        
        // If shop is closed, show warning but allow access
        if (!normalizedStatus.is_open) {
          console.log('⚠️ Shop is currently closed');
        }
      } else {
        // If no valid status data, assume shop is open for cashier operations
        console.log('⚠️ No shop status data found, assuming shop is open');
        const defaultStatus = {
          is_open: true,
          status: 'OPEN',
          message: 'Shop status not available - assuming open'
        };
        setShopStatus(defaultStatus);
      }
    } catch (error) {
      console.error('Failed to load shop status:', error);
      // Set default status to open so cashier can work
      const fallbackStatus = {
        is_open: true,
        status: 'OPEN',
        message: 'Shop status unavailable - allowing operations'
      };
      setShopStatus(fallbackStatus);
      console.log('🔄 Using fallback shop status (OPEN) due to error');
    }
  };

  const loadDrawerStatus = async (cashier = null) => {
    try {
      setRefreshingDrawer(true);
      const response = await shopAPI.getCashFloat();
      // Debug log to inspect backend shape during runtime
      console.log('[/cash-float/] response:', JSON.stringify(response?.data, null, 2));

      if (response.data && response.data.success) {
        // Prefer explicit `drawer` field (single-drawer payload), else use shop_status
        const payload = response.data.drawer || response.data.shop_status || response.data;
        console.log('🔍 PAYLOAD DEBUG:', JSON.stringify(payload, null, 2));

        // If shop is closed (from previously loaded shopStatus) or payload is for a previous date,
        // present zeroed drawer to start fresh for the new day.
        const today = new Date().toISOString().slice(0,10);
        const payloadDate = payload?.date || payload?.current_shop_day?.date || null;
        
        // Only check shopStatus if it exists and has valid data
        const currentShopStatus = shopStatus;
        const isClosed = currentShopStatus && (currentShopStatus.status === 'CLOSED' || currentShopStatus.is_open === false);
        
        if (isClosed || (payloadDate && payloadDate !== today)) {
          console.log('⚠️ Clearing drawer status because shop closed or payload is stale', { isClosed, payloadDate, today });
          setDrawerStatus({
            cashier: cashier?.name || 'Unknown',
            float_amount: 0,
            current_breakdown: { usd_cash: 0, zig_cash: 0, rand_cash: 0, card: 0, transfer: 0, total: 0 },
            // Explicitly clear ALL transaction counts for all currencies
            session_sales: { usd_cash: 0, zig_cash: 0, rand_cash: 0, card: 0, transfer: 0, total: 0, usd_count: 0, zig_count: 0, rand_count: 0 },
            // Also clear currency-specific session sales with counts
            session_sales_by_currency: {
              usd: { cash: 0, card: 0, ecocash: 0, transfer: 0, total: 0, count: 0 },
              zig: { cash: 0, card: 0, ecocash: 0, transfer: 0, total: 0, count: 0 },
              rand: { cash: 0, card: 0, ecocash: 0, transfer: 0, total: 0, count: 0 }
            },
            // Clear direct transaction count fields
            usd_transaction_count: 0,
            zig_transaction_count: 0,
            rand_transaction_count: 0,
            total_transaction_count: 0,
            eod_expectations: { expected_cash: 0, variance: 0, efficiency: 100 },
            status: 'INACTIVE',
            last_activity: null
          });
          setDrawerWasResetAtEOD(true); // Stop auto-refresh after EOD reset
          return;
        }

        const payloadShopStatus = payload;
        if (payloadShopStatus && Array.isArray(payloadShopStatus.drawers)) {
          console.log('🔍 MULTIPLE DRAWERS FOUND:', payloadShopStatus.drawers.length);
          
          // Create comprehensive cashier identifier for matching
          const cashierIdentifiers = [
            cashier?.name,
            cashier?.username, 
            cashier?.id,
            cashier?.cashier_id,
            cashier?.user_id,
            cashier?.email,
            cashier?.cashier_info?.id,
            cashier?.cashier_info?.name
          ].filter(Boolean);

          console.log('🔍 DRAWER ATTRIBUTION DEBUG - Cashier Identifiers:', { cashier, cashierIdentifiers });

          // Enhanced matching logic with multiple fallback strategies
          const matched = payloadShopStatus.drawers.find(d => {
            if (!d) return false;
            
            console.log('🔍 Checking drawer:', { drawer: d, cashier: d.cashier, cashierId: d.cashier_id });
            
            // Strategy 1: Exact cashier field match (case-insensitive)
            if (typeof d.cashier === 'string' && cashierIdentifiers.length > 0) {
              const exactMatch = cashierIdentifiers.some(id => 
                d.cashier.toLowerCase() === String(id).toLowerCase()
              );
              if (exactMatch) {
                console.log('✅ EXACT MATCH FOUND:', d.cashier);
                return true;
              }
            }
            
            // Strategy 2: Cashier ID field match
            if (d.cashier_id && cashier?.id && String(d.cashier_id) === String(cashier.id)) {
              console.log('✅ CASHIER ID MATCH FOUND:', d.cashier_id);
              return true;
            }
            
            // Strategy 3: Try to match by cashier_info if available
            if (d.cashier_info && cashier?.cashier_info) {
              if (String(d.cashier_info.id) === String(cashier.cashier_info.id) ||
                  d.cashier_info.name?.toLowerCase() === cashier.cashier_info.name?.toLowerCase()) {
                console.log('✅ CASHIER_INFO MATCH FOUND:', d.cashier_info);
                return true;
              }
            }
            
            // Strategy 4: Partial name matching (if cashier name contains drawer cashier name or vice versa)
            if (typeof d.cashier === 'string' && cashier?.name) {
              const drawerCashier = d.cashier.toLowerCase();
              const currentCashier = cashier.name.toLowerCase();
              if (drawerCashier.includes(currentCashier) || currentCashier.includes(drawerCashier)) {
                console.log('✅ PARTIAL NAME MATCH FOUND:', { drawerCashier, currentCashier });
                return true;
              }
            }
            
            return false;
          });

          if (matched) {
            console.log('✅ DRAWER MATCHED TO CASHIER:', { drawer: matched.cashier, cashier: cashier?.name });
            console.log('📊 MATCHED DRAWER DATA:', JSON.stringify(matched, null, 2));
            setDrawerStatus(matched);
            return;
          }

          // If there is only one drawer for the shop, use it as fallback
          if (payloadShopStatus.drawers.length === 1) {
            console.log('⚠️ SINGLE DRAWER FALLBACK - Using shop drawer for:', payloadShopStatus.drawers[0].cashier);
            console.log('📊 SINGLE DRAWER DATA:', JSON.stringify(payloadShopStatus.drawers[0], null, 2));
            setDrawerStatus(payloadShopStatus.drawers[0]);
            return;
          }

          // If no match found and multiple drawers exist, create a new drawer status for this cashier
          if (cashierIdentifiers.length > 0) {
            console.log('⚠️ NO MATCH FOUND - Creating drawer status for new cashier:', cashier?.name);
            const newDrawerStatus = {
              cashier: cashier?.name || 'Unknown Cashier',
              cashier_id: cashier?.id || cashier?.cashier_id,
              float_amount: 0,
              current_breakdown: { usd_cash: 0, zig_cash: 0, rand_cash: 0, card: 0, transfer: 0, total: 0 },
              // Clear ALL transaction counts for new day
              session_sales: { usd_cash: 0, zig_cash: 0, rand_cash: 0, card: 0, transfer: 0, total: 0, usd_count: 0, zig_count: 0, rand_count: 0 },
              session_sales_by_currency: {
                usd: { cash: 0, card: 0, ecocash: 0, transfer: 0, total: 0, count: 0 },
                zig: { cash: 0, card: 0, ecocash: 0, transfer: 0, total: 0, count: 0 },
                rand: { cash: 0, card: 0, ecocash: 0, transfer: 0, total: 0, count: 0 }
              },
              // Clear direct transaction count fields
              usd_transaction_count: 0,
              zig_transaction_count: 0,
              rand_transaction_count: 0,
              total_transaction_count: 0,
              eod_expectations: { expected_cash: 0, variance: 0, efficiency: 100 },
              status: 'ACTIVE',
              last_activity: new Date().toISOString()
            };
            setDrawerStatus(newDrawerStatus);
            return;
          }

          // If no match found and no cashier identifiers, avoid overwriting existing drawerStatus
          if (drawerStatus) {
            console.log('⚠️ NO MATCH & NO CASHIER DATA - Keeping existing drawer status');
            return;
          }
        } else if (payload && !Array.isArray(payload.drawers)) {
          // Single drawer case - direct assignment
          console.log('📊 SINGLE DRAWER DIRECT ASSIGNMENT:', JSON.stringify(payload, null, 2));
          setDrawerStatus(payload);
          return;
        }

        // Fallback: if response provided a single drawer object, use it
        if (response.data.drawer) {
          console.log('📊 FALLBACK DRAWER DATA:', JSON.stringify(response.data.drawer, null, 2));
          setDrawerStatus(response.data.drawer);
        } else {
          console.log('⚠️ NO VALID DRAWER DATA FOUND IN RESPONSE');
        }
      } else {
        console.log('⚠️ API RESPONSE NOT SUCCESSFUL:', response);
      }
    } catch (error) {
      console.error('Failed to load drawer status:', error);
    } finally {
      setRefreshingDrawer(false);
    }
  };

  const refreshDrawerStatus = async () => {
    await loadDrawerStatus();
  };

  // Check if session was reset at EOD (all session sales are 0)
  const checkSessionResetAtEOD = () => {
    if (!drawerStatus) return false;
    
    const sessionSales = drawerStatus.session_sales || {};
    const sessionSalesByCurrency = drawerStatus.session_sales_by_currency || {};
    
    // If all currency session sales are 0, session was reset
    const usdCash = sessionSales.usd_cash || sessionSalesByCurrency.usd?.cash || 0;
    const zigCash = sessionSales.zig_cash || sessionSalesByCurrency.zig?.cash || 0;
    const randCash = sessionSales.rand_cash || sessionSalesByCurrency.rand?.cash || 0;
    const cardSales = sessionSales.card || 0;
    const transferSales = sessionSales.transfer || 0;
    
    return usdCash === 0 && zigCash === 0 && randCash === 0 && cardSales === 0 && transferSales === 0;
  };

  // Get transaction counts with EOD reset check
  const getDashboardTransactionCounts = () => {
    // If session was reset at EOD, return 0 for all counts
    if (checkSessionResetAtEOD()) {
      console.log('🛑 EOD RESET DETECTED - Returning 0 transaction counts');
      return { usd: 0, zig: 0, rand: 0 };
    }
    
    return {
      usd: drawerStatus?.session_sales?.usd_count || 
           drawerStatus?.session_sales_by_currency?.usd?.count || 
           drawerStatus?.usd_transaction_count || 0,
      zig: drawerStatus?.session_sales?.zig_count || 
           drawerStatus?.session_sales_by_currency?.zig?.count || 
           drawerStatus?.zig_transaction_count || 0,
      rand: drawerStatus?.session_sales?.rand_count || 
            drawerStatus?.session_sales_by_currency?.rand?.count || 
            drawerStatus?.rand_transaction_count || 0
    };
  };

  const transactionCounts = getDashboardTransactionCounts();

  // Get formatted transaction count text with EOD check
  const getTransactionCountText = (count) => {
    if (checkSessionResetAtEOD()) {
      return '0 transactions';
    }
    return `${count} transactions`;
  };

  const formatCurrency = (amount, currency = 'USD') => {
    if (currency === 'ZIG') {
      return `${amount.toFixed(2)} ZIG`;
    } else if (currency === 'RAND') {
      return `${amount.toFixed(2)} RAND`;
    } else {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }).format(amount || 0);
    }
  };

  const formatCurrencyWithSymbol = (amount, currency = 'usd') => {
    if (currency === 'zig' || currency === 'ZIG') {
      return `${amount.toFixed(2)} ZIG`;
    } else if (currency === 'rand' || currency === 'RAND') {
      return `${amount.toFixed(2)} RAND`;
    } else {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }).format(amount || 0);
    }
  };

  // Refresh business settings - can be called from navigation focus
  const refreshBusinessSettings = async () => {
    console.log('🔄 Refreshing business settings...');
    
    // Clear cached settings and re-fetch
    try {
      const storedSettings = await shopStorage.getBusinessSettings();
      if (storedSettings) {
        console.log('📦 Business settings from storage:', storedSettings);
        setShopData(prev => ({
          ...prev,
          opening_time: storedSettings.opening_time || null,
          closing_time: storedSettings.closing_time || null,
          timezone: storedSettings.timezone || null,
          vat_rate: storedSettings.vat_rate || null,
        }));
      }
    } catch (error) {
      console.log('⚠️ Error refreshing business settings:', error.message);
    }
  };

  // Format time from 24-hour (HH:MM) to 12-hour (h:mm AM/PM) format
  const formatTimeDisplay = (timeStr) => {
    if (!timeStr || timeStr === 'null' || timeStr === 'undefined') return 'Not set';
    const [hours, minutes] = timeStr.split(':');
    if (!hours || !minutes) return 'Not set';
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // USD Only - No currency conversion needed
  const convertToCurrency = (amount, targetCurrency) => {
    if (!exchangeRates) return amount;
    
    // Convert from USD to target currency
    if (targetCurrency === 'USD') {
      return amount;
    } else if (targetCurrency === 'ZIG') {
      return amount * (exchangeRates.usd_to_zig || 24.50);
    } else if (targetCurrency === 'RAND') {
      return amount * (exchangeRates.usd_to_rand || 18.20);
    }
    return amount;
  };

  // Sidebar features for cashiers - Drawer Status removed for security
  const sidebarFeatures = [
    {
      id: 'product-receiving',
      title: '📦 Product Receiving',
      description: 'Receive products from suppliers',
      icon: '📦',
      screen: 'CashierProductReceiving',
      color: '#8b5cf6',
      section: 'cashier-tools'
    },
    {
      id: 'quick-products',
      title: '⚡ Quick Products',
      description: 'Products without barcodes',
      icon: '⚡',
      screen: 'QuickProducts',
      color: '#10b981',
      section: 'cashier-tools'
    },
    {
      id: 'waste-management',
      title: '🗑️ Waste Management',
      description: 'Track product waste & shrinkage',
      icon: '🗑️',
      screen: 'WasteScreen',
      color: '#f97316',
      section: 'cashier-tools'
    },
    {
      id: 'my-sales',
      title: '📊 My Sales',
      description: 'View my transaction history only',
      icon: '📊',
      screen: 'CashierSales',
      color: '#10b981',
      section: 'cashier-tools'
    },
    // Stock Transfer feature removed - only owner should access drawer management
    // Keeping Stock Transfer for other operations
    {
      title: '🔄 Stock Transfer',
      description: 'Transfer & convert stock between products',
      icon: '🔄',
      screen: 'StockTransfer',
      color: '#8b5cf6',
      section: 'cashier-tools'
    },
    {
      id: 'weight-products',
      title: '⚖️ Weight Products',
      description: 'Browse & manage weighable items',
      icon: '⚖️',
      screen: 'WeightProducts',
      color: '#f97316',
      section: 'cashier-tools'
    },
    {
      id: 'transfer-history',
      title: '📊 Transfer History',
      description: 'View financial impact & analysis',
      icon: '📊',
      screen: 'StockTransferHistory',
      color: '#06b6d4',
      section: 'cashier-tools'
    },
    {
      title: '🍽️ Staff Lunch',
      description: 'Take stock items or money for staff meals',
      icon: '🍽️',
      screen: ROUTES.STAFF_LUNCH,
      color: '#8b5cf6',
      section: 'cashier-tools'
    },
  ];

  const handleSidebarFeaturePress = (feature) => {
    setShowSidebar(false); // Close sidebar first
    
    // Navigate to the feature screen
    switch (feature.screen) {
      case 'CashierProductReceiving':
        navigation.navigate('CashierProductReceiving');
        break;
      case 'WasteScreen':
        navigation.navigate(ROUTES.WASTE_SCREEN);
        break;
      case 'CashierSales':
        navigation.navigate(ROUTES.CASHIER_SALES);
        break;
      case 'CashierDrawer':
        // Cashier Drawer removed - only owner can access drawer management
        break;
      case 'StockTransfer':
        navigation.navigate(ROUTES.STOCK_TRANSFER);
        break;
      case 'StockTransferHistory':
        navigation.navigate(ROUTES.STOCK_TRANSFER_HISTORY);
        break;
      case 'WeightProducts':
        navigation.navigate(ROUTES.WEIGHT_PRODUCTS);
        break;
      case 'QuickProducts':
        navigation.navigate(ROUTES.QUICK_PRODUCTS);
        break;
      case 'CashierStockTake':
        navigation.navigate('CashierStockTake');
        break;
      case 'StaffLunch':
      case ROUTES.STAFF_LUNCH:
        navigation.navigate(ROUTES.STAFF_LUNCH);
        break;
      default:
        console.log(`Feature "${feature.title}" pressed`);
        break;
    }
  };

  const renderSidebarFeatureItem = (feature) => (
    <TouchableOpacity
      key={feature.id}
      style={styles.sidebarFeatureItem}
      onPress={() => handleSidebarFeaturePress(feature)}
      activeOpacity={0.8}
    >
      <View style={[styles.sidebarFeatureIcon, { backgroundColor: feature.color }]}>
        <Text style={styles.sidebarFeatureIconText}>{feature.icon}</Text>
      </View>
      <View style={styles.sidebarFeatureContent}>
        <Text style={styles.sidebarFeatureTitle}>{feature.title}</Text>
        <Text style={styles.sidebarFeatureDescription}>{feature.description}</Text>
      </View>
      <Text style={styles.sidebarFeatureArrow}>→</Text>
    </TouchableOpacity>
  );

  // Parse quantity multiplier - supports expressions like "100*23"
  const parseMultiplier = (multiplierStr) => {
    if (!multiplierStr || multiplierStr.trim() === '') return 1;
    
    const trimmed = multiplierStr.trim();
    
    // If it's a simple number, return it directly
    if (/^\d+$/.test(trimmed)) {
      return parseInt(trimmed, 10);
    }
    
    // If it contains multiplication or addition, evaluate it safely
    if (trimmed.includes('*') || trimmed.includes('+')) {
      try {
        // Only allow numbers, *, +, -, (, ) and spaces
        if (!/^[\d\s\*\+\-\(\)]+$/.test(trimmed)) {
          Alert.alert(
            '⚠️ Invalid Expression',
            'Only numbers and basic operations (+, *, -, parentheses) are allowed.',
            [{ text: 'OK' }]
          );
          return 1;
        }
        
        // Evaluate the expression safely
        // Replace common patterns and evaluate
        const result = Function('"use strict"; return (' + trimmed + ')')();
        
        if (isNaN(result) || result <= 0 || result > 999999) {
          Alert.alert(
            '⚠️ Invalid Result',
            'Please enter a valid positive number (max: 999,999)',
            [{ text: 'OK' }]
          );
          return 1;
        }
        
        return Math.floor(result);
      } catch (error) {
        Alert.alert(
          '⚠️ Invalid Expression',
          'Please enter a valid mathematical expression (e.g., 100*23, 50+25)',
          [{ text: 'OK' }]
        );
        return 1;
      }
    }
    
    // Default fallback
    return 1;
  };

  const addToCart = (product) => {
    // For weighable products, show weight input modal
    if (product.price_type !== 'unit') {
      setSelectedProduct(product);
      setWeightInput('');
      setShowWeightModal(true);
      return;
    }

    // For unit products, add directly to cart with quantity 1
    const existingItem = cart.find(item => item.id === product.id);
    
    // Allow negative stock sales - no stock validation
    
    if (existingItem) {
      // For unit products, increment quantity by 1
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      // Add new product with quantity 1
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  // Handle weight addition from modal
  const handleWeightAdd = (weight) => {
    if (!selectedProduct || weight <= 0) {
      setShowWeightModal(false);
      setSelectedProduct(null);
      setWeightInput('');
      return;
    }

    const existingItem = cart.find(item => item.id === selectedProduct.id);
    
    if (existingItem) {
      // Update existing item weight
      setCart(cart.map(item => 
        item.id === selectedProduct.id 
          ? { ...item, weight: (item.weight || 0) + weight }
          : item
      ));
    } else {
      // Add new weighable product
      setCart([...cart, { 
        ...selectedProduct, 
        quantity: 0, // Don't use quantity for weighable products
        weight: weight
      }]);
    }
    
    // Close modal and reset state
    setShowWeightModal(false);
    setSelectedProduct(null);
    setWeightInput('');
  };

  // Handle weight modal cancellation
  const handleWeightCancel = () => {
    setShowWeightModal(false);
    setSelectedProduct(null);
    setWeightInput('');
  };

  // Cart management functions
  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  // Apply multiplier to all cart items
  const applyMultiplierToCart = () => {
    if (cart.length === 0) {
      Alert.alert(
        '⚠️ No Items in Cart',
        'Add products to cart first, then use the multiplier to increase quantities.',
        [{ text: 'OK' }]
      );
      return;
    }

    const multiplier = parseMultiplier(quantityMultiplier);
    
    if (multiplier <= 1) {
      Alert.alert(
        '⚠️ Invalid Multiplier',
        'Please enter a number greater than 1 to multiply quantities.',
        [{ text: 'OK' }]
      );
      return;
    }

    setCart(prevCart => 
      prevCart.map(item => {
        if (item.price_type === 'unit') {
          // For unit products, multiply quantity
          return { ...item, quantity: item.quantity * multiplier };
        } else {
          // For weighable products, multiply weight
          return { ...item, weight: (item.weight || 0) * multiplier };
        }
      })
    );

    Alert.alert(
      '✅ Multiplier Applied',
      `All quantities multiplied by ${multiplier}!`,
      [{ text: 'OK' }]
    );

    // Reset multiplier
    setQuantityMultiplier('1');
  };

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      // Remove item if quantity is 0 or negative
      removeFromCart(itemId);
      return;
    }
    
    setCart(cart.map(item => 
      item.id === itemId 
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const updateWeight = (itemId, newWeight) => {
    const weight = parseFloat(newWeight) || 0;
    
    if (weight <= 0) {
      // Remove item if weight is 0 or negative
      removeFromCart(itemId);
      return;
    }
    
    setCart(cart.map(item => 
      item.id === itemId 
        ? { ...item, weight: weight }
        : item
    ));
  };

  // Calculator Functions - Retro 1990s Style with Enhanced Operations
  const inputNumber = (num) => {
    if (calculatorWaitingForNewValue) {
      setCalculatorDisplay(num);
      setCalculatorWaitingForNewValue(false);
    } else {
      setCalculatorDisplay(calculatorDisplay === '0' ? num : calculatorDisplay + num);
    }
  };

  const inputDecimal = () => {
    if (calculatorWaitingForNewValue) {
      setCalculatorDisplay('0.');
      setCalculatorWaitingForNewValue(false);
    } else if (calculatorDisplay.indexOf('.') === -1) {
      setCalculatorDisplay(calculatorDisplay + '.');
    }
  };

  const inputOperation = (nextOperation) => {
    const inputValue = parseFloat(calculatorDisplay);

    if (calculatorPreviousValue === null) {
      setCalculatorPreviousValue(inputValue);
      setCalculatorFormula(`${inputValue} ${nextOperation}`);
    } else if (calculatorOperation) {
      const currentValue = calculatorPreviousValue || 0;
      const newValue = calculate(currentValue, inputValue, calculatorOperation);
      setCalculatorDisplay(String(newValue));
      setCalculatorPreviousValue(newValue);
      setCalculatorFormula(`${currentValue} ${calculatorOperation} ${inputValue} = ${newValue}\n${newValue} ${nextOperation}`);
    } else {
      setCalculatorFormula(`${calculatorPreviousValue} ${nextOperation}`);
    }

    setCalculatorWaitingForNewValue(true);
    setCalculatorOperation(nextOperation);
  };

  const calculate = (firstValue, secondValue, operation) => {
    switch (operation) {
      case '+':
        return firstValue + secondValue;
      case '-':
        return firstValue - secondValue;
      case '*':
        return firstValue * secondValue;
      case '/':
        return firstValue / secondValue;
      case '=':
        return secondValue;
      case '%':
        return (firstValue * secondValue) / 100;
      case 'x²':
        return firstValue * firstValue;
      case '√':
        return Math.sqrt(firstValue);
      case '±':
        return -firstValue;
      case '1/x':
        return 1 / firstValue;
      default:
        return secondValue;
    }
  };

  const performCalculation = () => {
    const inputValue = parseFloat(calculatorDisplay);

    if (calculatorPreviousValue !== null && calculatorOperation) {
      const newValue = calculate(calculatorPreviousValue, inputValue, calculatorOperation);
      setCalculatorDisplay(String(newValue));
      setCalculatorFormula(`${calculatorPreviousValue} ${calculatorOperation} ${inputValue} = ${newValue}`);
      setCalculatorPreviousValue(null);
      setCalculatorOperation(null);
      setCalculatorWaitingForNewValue(true);
    }
  };

  // Memory Functions
  const memoryStore = () => {
    setCalculatorMemory(parseFloat(calculatorDisplay));
  };

  const memoryRecall = () => {
    setCalculatorDisplay(String(calculatorMemory));
    setCalculatorWaitingForNewValue(true);
  };

  const memoryClear = () => {
    setCalculatorMemory(0);
  };

  const memoryAdd = () => {
    setCalculatorMemory(calculatorMemory + parseFloat(calculatorDisplay));
  };

  // Advanced Operations
  const performSquare = () => {
    const value = parseFloat(calculatorDisplay);
    setCalculatorDisplay(String(value * value));
    setCalculatorWaitingForNewValue(true);
  };

  const performSquareRoot = () => {
    const value = parseFloat(calculatorDisplay);
    setCalculatorDisplay(String(Math.sqrt(value)));
    setCalculatorWaitingForNewValue(true);
  };

  const toggleSign = () => {
    const value = parseFloat(calculatorDisplay);
    setCalculatorDisplay(String(-value));
  };

  const reciprocal = () => {
    const value = parseFloat(calculatorDisplay);
    setCalculatorDisplay(String(1 / value));
    setCalculatorWaitingForNewValue(true);
  };

  const percentage = () => {
    const value = parseFloat(calculatorDisplay);
    setCalculatorDisplay(String(value / 100));
    setCalculatorWaitingForNewValue(true);
  };

  const clearCalculator = () => {
    setCalculatorDisplay('0');
    setCalculatorPreviousValue(null);
    setCalculatorOperation(null);
    setCalculatorWaitingForNewValue(false);
    setCalculatorFormula('');
  };

  const clearEntry = () => {
    setCalculatorDisplay('0');
  };

  // ========== ADVANCED CALCULATOR FUNCTIONS ==========

  // Scientific Functions
  const performSin = () => {
    const value = parseFloat(calculatorDisplay);
    const result = Math.sin(value * Math.PI / 180); // Convert to radians
    setCalculatorDisplay(String(result));
    setCalculatorFormula(`sin(${value}°) = ${result.toFixed(6)}`);
    addToHistory(`sin(${value}°)`, result.toFixed(6));
    setCalculatorWaitingForNewValue(true);
  };

  const performCos = () => {
    const value = parseFloat(calculatorDisplay);
    const result = Math.cos(value * Math.PI / 180); // Convert to radians
    setCalculatorDisplay(String(result));
    setCalculatorFormula(`cos(${value}°) = ${result.toFixed(6)}`);
    addToHistory(`cos(${value}°)`, result.toFixed(6));
    setCalculatorWaitingForNewValue(true);
  };

  const performTan = () => {
    const value = parseFloat(calculatorDisplay);
    const result = Math.tan(value * Math.PI / 180); // Convert to radians
    setCalculatorDisplay(String(result));
    setCalculatorFormula(`tan(${value}°) = ${result.toFixed(6)}`);
    addToHistory(`tan(${value}°)`, result.toFixed(6));
    setCalculatorWaitingForNewValue(true);
  };

  const performAsin = () => {
    const value = parseFloat(calculatorDisplay);
    if (value < -1 || value > 1) {
      Alert.alert('Error', 'Input must be between -1 and 1');
      return;
    }
    const result = Math.asin(value) * 180 / Math.PI;
    setCalculatorDisplay(String(result));
    setCalculatorFormula(`arcsin(${value}) = ${result.toFixed(2)}°`);
    addToHistory(`arcsin(${value})`, result.toFixed(2));
    setCalculatorWaitingForNewValue(true);
  };

  const performAcos = () => {
    const value = parseFloat(calculatorDisplay);
    if (value < -1 || value > 1) {
      Alert.alert('Error', 'Input must be between -1 and 1');
      return;
    }
    const result = Math.acos(value) * 180 / Math.PI;
    setCalculatorDisplay(String(result));
    setCalculatorFormula(`arccos(${value}) = ${result.toFixed(2)}°`);
    addToHistory(`arccos(${value})`, result.toFixed(2));
    setCalculatorWaitingForNewValue(true);
  };

  const performAtan = () => {
    const value = parseFloat(calculatorDisplay);
    const result = Math.atan(value) * 180 / Math.PI;
    setCalculatorDisplay(String(result));
    setCalculatorFormula(`arctan(${value}) = ${result.toFixed(2)}°`);
    addToHistory(`arctan(${value})`, result.toFixed(2));
    setCalculatorWaitingForNewValue(true);
  };

  const performLog = () => {
    const value = parseFloat(calculatorDisplay);
    if (value <= 0) {
      Alert.alert('Error', 'Logarithm requires positive input');
      return;
    }
    const result = Math.log10(value);
    setCalculatorDisplay(String(result));
    setCalculatorFormula(`log(${value}) = ${result.toFixed(6)}`);
    addToHistory(`log(${value})`, result.toFixed(6));
    setCalculatorWaitingForNewValue(true);
  };

  const performLn = () => {
    const value = parseFloat(calculatorDisplay);
    if (value <= 0) {
      Alert.alert('Error', 'Natural log requires positive input');
      return;
    }
    const result = Math.log(value);
    setCalculatorDisplay(String(result));
    setCalculatorFormula(`ln(${value}) = ${result.toFixed(6)}`);
    addToHistory(`ln(${value})`, result.toFixed(6));
    setCalculatorWaitingForNewValue(true);
  };

  const performPow = () => {
    const value = parseFloat(calculatorDisplay);
    setCalculatorFormula(`${value}²`);
    setCalculatorDisplay(String(value * value));
    addToHistory(`${value}²`, value * value);
    setCalculatorWaitingForNewValue(true);
  };

  const performPow10 = () => {
    const value = parseFloat(calculatorDisplay);
    const result = Math.pow(10, value);
    setCalculatorDisplay(String(result));
    setCalculatorFormula(`10^${value} = ${result.toExponential(4)}`);
    addToHistory(`10^${value}`, result.toExponential(4));
    setCalculatorWaitingForNewValue(true);
  };

  const performExp = () => {
    const value = parseFloat(calculatorDisplay);
    const result = Math.exp(value);
    setCalculatorDisplay(String(result));
    setCalculatorFormula(`e^${value} = ${result.toExponential(4)}`);
    addToHistory(`e^${value}`, result.toExponential(4));
    setCalculatorWaitingForNewValue(true);
  };

  const performAbs = () => {
    const value = parseFloat(calculatorDisplay);
    const result = Math.abs(value);
    setCalculatorDisplay(String(result));
    setCalculatorFormula(`|${value}| = ${result}`);
    addToHistory(`|${value}|`, result);
    setCalculatorWaitingForNewValue(true);
  };

  const performFactorial = () => {
    const value = parseFloat(calculatorDisplay);
    if (value < 0 || !Number.isInteger(value)) {
      Alert.alert('Error', 'Factorial requires non-negative integer');
      return;
    }
    let result = 1;
    for (let i = 2; i <= value; i++) result *= i;
    setCalculatorDisplay(String(result));
    setCalculatorFormula(`${value}! = ${result}`);
    addToHistory(`${value}!`, result);
    setCalculatorWaitingForNewValue(true);
  };

  const performPi = () => {
    if (!calculatorWaitingForNewValue && calculatorDisplay !== '0') {
      setCalculatorDisplay(calculatorDisplay + Math.PI.toFixed(6));
    } else {
      setCalculatorDisplay(String(Math.PI.toFixed(6)));
      setCalculatorWaitingForNewValue(false);
    }
  };

  const performE = () => {
    if (!calculatorWaitingForNewValue && calculatorDisplay !== '0') {
      setCalculatorDisplay(calculatorDisplay + Math.E.toFixed(6));
    } else {
      setCalculatorDisplay(String(Math.E.toFixed(6)));
      setCalculatorWaitingForNewValue(false);
    }
  };

  // Statistics Functions
  const parseListInput = () => {
    const input = listInput.replace(/[^0-9.,\-]/g, '').replace(/,/g, ' ');
    return input.split(/\s+/).filter(v => v.trim()).map(Number).filter(n => !isNaN(n));
  };

  const calculateStats = (operation) => {
    const numbers = parseListInput();
    if (numbers.length === 0) {
      Alert.alert('Error', 'Please enter numbers separated by commas or spaces');
      return null;
    }

    let result;
    switch (operation) {
      case 'sum':
        result = numbers.reduce((a, b) => a + b, 0);
        break;
      case 'avg':
        result = numbers.reduce((a, b) => a + b, 0) / numbers.length;
        break;
      case 'min':
        result = Math.min(...numbers);
        break;
      case 'max':
        result = Math.max(...numbers);
        break;
      case 'count':
        result = numbers.length;
        break;
      case 'median':
        const sorted = [...numbers].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        result = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        break;
      case 'mode':
        const freq = {};
        let maxFreq = 0;
        numbers.forEach(n => {
          freq[n] = (freq[n] || 0) + 1;
          if (freq[n] > maxFreq) maxFreq = freq[n];
        });
        const modes = Object.keys(freq).filter(k => freq[k] === maxFreq);
        result = modes.length === numbers.length ? 'No mode' : modes.join(', ');
        break;
      case 'range':
        result = Math.max(...numbers) - Math.min(...numbers);
        break;
      case 'stddev':
        const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
        const variance = numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numbers.length;
        result = Math.sqrt(variance);
        break;
      case 'variance':
        const avg = numbers.reduce((a, b) => a + b, 0) / numbers.length;
        result = numbers.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / numbers.length;
        break;
      case 'prod':
        result = numbers.reduce((a, b) => a * b, 1);
        break;
      default:
        return null;
    }
    return result;
  };

  const performStats = (operation) => {
    const result = calculateStats(operation);
    if (result !== null) {
      setListResults({ operation, result, numbers: parseListInput() });
      addToHistory(`${operation}([${parseListInput().join(', ')}])`, typeof result === 'number' ? result.toFixed(4) : result);
    }
  };

  // List Functions
  const addToList = () => {
    const value = parseFloat(calculatorDisplay);
    if (!isNaN(value)) {
      const numbers = parseListInput();
      setListInput(numbers.length > 0 ? listInput + ', ' + value : String(value));
      setCalculatorDisplay('0');
    }
  };

  const clearList = () => {
    setListInput('');
    setListResults(null);
  };

  const sortListAsc = () => {
    const numbers = parseListInput();
    if (numbers.length > 0) {
      const sorted = [...numbers].sort((a, b) => a - b);
      setListInput(sorted.join(', '));
    }
  };

  const sortListDesc = () => {
    const numbers = parseListInput();
    if (numbers.length > 0) {
      const sorted = [...numbers].sort((a, b) => b - a);
      setListInput(sorted.join(', '));
    }
  };

  const reverseList = () => {
    const numbers = parseListInput();
    if (numbers.length > 0) {
      const reversed = [...numbers].reverse();
      setListInput(reversed.join(', '));
    }
  };

  const removeDuplicates = () => {
    const numbers = parseListInput();
    if (numbers.length > 0) {
      const unique = [...new Set(numbers)];
      setListInput(unique.join(', '));
    }
  };

  const filterGreaterThan = () => {
    const numbers = parseListInput();
    const threshold = parseFloat(calculatorDisplay);
    if (numbers.length > 0 && !isNaN(threshold)) {
      const filtered = numbers.filter(n => n > threshold);
      setListInput(filtered.join(', '));
    }
  };

  const filterLessThan = () => {
    const numbers = parseListInput();
    const threshold = parseFloat(calculatorDisplay);
    if (numbers.length > 0 && !isNaN(threshold)) {
      const filtered = numbers.filter(n => n < threshold);
      setListInput(filtered.join(', '));
    }
  };

  // Matrix Functions (2x2)
  const calculateMatrixDet = () => {
    const { a, b, c, d } = matrixInput;
    const values = [parseFloat(a), parseFloat(b), parseFloat(c), parseFloat(d)];
    if (values.some(isNaN)) {
      Alert.alert('Error', 'Please enter all matrix values');
      return;
    }
    const det = parseFloat(a) * parseFloat(d) - parseFloat(b) * parseFloat(c);
    setMatrixResult({ type: 'determinant', value: det, matrix: { a, b, c, d } });
    addToHistory('det([[a,b],[c,d]])', det);
  };

  const calculateMatrixInv = () => {
    const { a, b, c, d } = matrixInput;
    const det = parseFloat(a) * parseFloat(d) - parseFloat(b) * parseFloat(c);
    if (Math.abs(det) < 1e-10) {
      Alert.alert('Error', 'Matrix is singular (determinant = 0)');
      return;
    }
    const invDet = 1 / det;
    setMatrixResult({
      type: 'inverse',
      value: `[[${(parseFloat(d) * invDet).toFixed(4)}, ${(-parseFloat(b) * invDet).toFixed(4)}], [${(-parseFloat(c) * invDet).toFixed(4)}, ${(parseFloat(a) * invDet).toFixed(4)}]]`,
      matrix: { a, b, c, d }
    });
    addToHistory('inverse([[a,b],[c,d]])', 'Calculated');
  };

  const clearMatrix = () => {
    setMatrixInput({ a: '', b: '', c: '', d: '' });
    setMatrixResult(null);
  };

  // Graph Functions
  const generateGraphData = (type) => {
    const numbers = parseListInput();
    if (numbers.length === 0) {
      Alert.alert('Error', 'Please enter numbers to graph');
      return;
    }
    const labels = numbers.map((_, i) => `Item ${i + 1}`);
    setGraphData({ type, labels, values: numbers });
    addToHistory(`graph(${type})`, `Generated ${type} chart with ${numbers.length} data points`);
  };

  const generateLineGraph = () => generateGraphData('line');
  const generateBarGraph = () => generateGraphData('bar');
  const generatePieData = () => generateGraphData('pie');

  // History Functions
  const addToHistory = (formula, result) => {
    setCalculatorHistory(prev => [{
      formula,
      result: typeof result === 'number' ? parseFloat(result.toFixed(8)) : result,
      timestamp: new Date().toLocaleTimeString()
    }, ...prev.slice(0, 19)]);
  };

  const clearHistory = () => {
    setCalculatorHistory([]);
  };

  const recallFromHistory = (item) => {
    setCalculatorDisplay(String(item.result));
    setCalculatorWaitingForNewValue(true);
  };

  // Tax Functions
  const calculateTax = () => {
    const value = parseFloat(calculatorDisplay);
    const tax = (value * taxRate) / 100;
    const total = value + tax;
    setCalculatorDisplay(String(total));
    setCalculatorFormula(`${value} + ${taxRate}% tax = ${tax.toFixed(2)} (Total: ${total.toFixed(2)})`);
    addToHistory(`${value} + ${taxRate}% tax`, total.toFixed(2));
    setCalculatorWaitingForNewValue(true);
  };

  const calculateTaxAmount = () => {
    const value = parseFloat(calculatorDisplay);
    const tax = (value * taxRate) / 100;
    setCalculatorDisplay(String(tax));
    setCalculatorFormula(`${taxRate}% of ${value} = ${tax.toFixed(2)}`);
    addToHistory(`${taxRate}% of ${value}`, tax.toFixed(2));
    setCalculatorWaitingForNewValue(true);
  };

  const removeTax = () => {
    const total = parseFloat(calculatorDisplay);
    const subtotal = total / (1 + taxRate / 100);
    const tax = total - subtotal;
    setCalculatorDisplay(String(subtotal.toFixed(2)));
    setCalculatorFormula(`${total} - ${taxRate}% tax = ${subtotal.toFixed(2)} (Tax: ${tax.toFixed(2)})`);
    addToHistory(`${total} - ${taxRate}% tax`, subtotal.toFixed(2));
    setCalculatorWaitingForNewValue(true);
  };

  const changeTaxRate = (rate) => {
    setTaxRate(rate);
    Alert.alert('Tax Rate Changed', `Tax rate set to ${rate}%`);
  };

  // Quick Actions Functions
  const applyDiscount = (percentage) => {
    setCartDiscount(percentage);
    Alert.alert(
      '💰 Discount Applied',
      `${percentage}% discount applied to cart!`,
      [{ text: 'OK' }]
    );
  };

  const clearDiscount = () => {
    setCartDiscount(0);
    Alert.alert(
      '🗑️ Discount Cleared',
      'Discount removed from cart',
      [{ text: 'OK' }]
    );
  };

  const toggleTaxMode = () => {
    setTaxIncluded(!taxIncluded);
    Alert.alert(
      '💱 Tax Mode Changed',
      `Tax is now ${!taxIncluded ? 'INCLUDED' : 'EXCLUDED'} in prices`,
      [{ text: 'OK' }]
    );
  };

  const bulkUpdateQuantities = () => {
    Alert.alert(
      '📋 Bulk Update Quantities',
      'This feature allows updating quantities for all items in cart.\n\nSelect multiplier:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'x2 (Double)', onPress: () => bulkMultiplyQuantities(2) },
        { text: 'x3 (Triple)', onPress: () => bulkMultiplyQuantities(3) },
        { text: 'Custom...', onPress: () => showCustomMultiplierDialog() }
      ]
    );
  };

  const bulkMultiplyQuantities = (multiplier) => {
    setCart(prevCart => 
      prevCart.map(item => ({
        ...item,
        quantity: item.price_type === 'unit' ? item.quantity * multiplier : item.quantity,
        weight: item.price_type !== 'unit' ? (item.weight || 0) * multiplier : item.weight
      }))
    );
    Alert.alert(
      '✅ Bulk Update Complete',
      `All quantities multiplied by ${multiplier}`,
      [{ text: 'OK' }]
    );
  };

  const showCustomMultiplierDialog = () => {
    // In a real implementation, you'd show a custom input dialog
    Alert.alert(
      'Custom Multiplier',
      'Enter multiplier value:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Apply', onPress: () => bulkMultiplyQuantities(1.5) }
      ]
    );
  };

  const clearCartWithConfirmation = () => {
    console.log('🗑️ Clear Cart button clicked!');
    console.log('Current cart length:', cart.length);
    setShowClearCartModal(true);
  };

  // Custom modal state for Clear Cart confirmation
  const [showClearCartModal, setShowClearCartModal] = useState(false);
  
  // Backup clear function without alerts for testing
  const clearCartSimple = () => {
    console.log('🗑️ Simple Clear Cart called!');
    setCart([]);
    setAmountReceived('');
    setPaymentMethod('cash');
    setCardLast4('');
    setTransferReference('');
    console.log('✅ Cart cleared without alert!');
  };
  
  // Handle clear cart with custom modal
  const handleClearCartConfirm = () => {
    console.log('🗑️ Clearing cart now...');
    setCart([]);
    setAmountReceived('');
    setShowClearCartModal(false);
    console.log('✅ Cart cleared successfully!');
  };

  // Real-time Dashboard Functions
  const updateRealTimeStats = async () => {
    try {
      // In a real implementation, you'd fetch from API
      const mockStats = {
        todaySales: Math.random() * 1000 + 500,
        totalTransactions: Math.floor(Math.random() * 50) + 20,
        averageTransaction: Math.random() * 50 + 25,
        itemsPerTransaction: Math.random() * 5 + 2,
        peakHour: '14:00-15:00',
        lastUpdated: new Date()
      };
      setRealTimeStats(mockStats);
    } catch (error) {
      console.error('Failed to update real-time stats:', error);
    }
  };

  // Auto-update real-time stats every 30 seconds
  useEffect(() => {
    updateRealTimeStats();
    const interval = setInterval(updateRealTimeStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Get unique categories from products
  const getCategories = () => {
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
    return ['all', ...categories];
  };

  const getTotalAmount = () => {
    // Calculate total in USD first, then convert to selected currency
    const usdTotal = cart.reduce((total, item) => {
      if (item.price_type === 'unit') {
        // For unit products, use quantity
        return total + (item.price * item.quantity);
      } else {
        // For weighable products, use weight
        return total + (item.price * (item.weight || 0));
      }
    }, 0);
    
    // Round to 2 decimal places to avoid floating-point precision issues
    const roundedTotal = Math.round(usdTotal * 100) / 100;
    
    // Convert to selected currency and round again
    const convertedTotal = convertToCurrency(roundedTotal, selectedCurrency);
    return Math.round(convertedTotal * 100) / 100;
  };

  const getChange = () => {
    if (paymentMethod !== 'cash') {
      return 0; // No change for non-cash payments
    }
    
    const total = getTotalAmount();
    const received = parseFloat(amountReceived) || 0;
    return Math.max(0, received - total);
  };

  // Handle barcode scan - Auto add to cart
  const handleBarcodeScan = (barcode) => {
    const product = products.find(p => p.line_code === barcode || p.barcode === barcode);
    if (product) {
      addToCart(product);
      Alert.alert(
        '📷 SCAN SUCCESS', 
        `${product.name} scanned and added to cart!`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        '❌ PRODUCT NOT FOUND', 
        `No product found with code: ${barcode}\n\nPlease check the barcode or add the product manually.`,
        [{ text: 'OK' }]
      );
    }
    setShowScanner(false);
  };

  // Handle barcode input (validation only, no auto-add)
  const handleBarcodeInput = (input) => {
    setBarcodeInput(input);
    
    // Clear previous validation state when input changes
    if (input.length === 0) {
      setBarcodeValidation(null);
    }
  };

  // USD Only - No currency conversion needed

  // Validate barcode and auto-add to cart
  const validateAndAddBarcode = () => {
    const barcode = barcodeInput.trim();
    
    if (barcode.length < 6) {
      Alert.alert(
        '❌ INVALID BARCODE', 
        'Barcode must be at least 6 characters long.\n\nPlease enter a complete barcode.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Check if product exists (support multiple barcodes per product)
    const product = products.find(p => {
      // Check primary barcode
      if (p.barcode === barcode) return true;
      // Check line code
      if (p.line_code === barcode) return true;
      // Check additional barcodes (if stored as array or comma-separated string)
      if (p.additional_barcodes) {
        if (Array.isArray(p.additional_barcodes)) {
          return p.additional_barcodes.includes(barcode);
        } else if (typeof p.additional_barcodes === 'string') {
          const barcodes = p.additional_barcodes.split(',').map(b => b.trim());
          return barcodes.includes(barcode);
        }
      }
      return false;
    });
    
    if (!product) {
      Alert.alert(
        '❌ PRODUCT NOT FOUND', 
        `No product found with barcode: ${barcode}\n\nPlease check the barcode or add the product manually.`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Product exists - add to cart and show success
    setBarcodeInput('');
    setBarcodeValidation(null);
    addToCart(product);
    
    Alert.alert(
      '✅ BARCODE ADDED', 
      `${product.name} has been added to your cart!`,
      [{ text: 'OK' }]
    );
  };

  // Clear barcode input
  const clearBarcodeInput = () => {
    setBarcodeInput('');
  };

  // USD Only - No EcoCash payment verification needed

  // Background barcode scanner setup (like supermarket scanners)
  let barcodeBuffer = '';
  let lastKeystrokeTime = 0;
  let scannerActive = false;
  const SCANNER_TIMEOUT = 100; // Increased timeout for better reliability
  const MIN_BARCODE_LENGTH = 4; // Reduced minimum length for more flexibility
  const MAX_BARCODE_LENGTH = 50; // Maximum barcode length
  
  const setupBackgroundScanner = () => {
    if (typeof window === 'undefined') return;
    
    setBackgroundScannerActive(true);
    scannerActive = true;
    
    console.log('🔧 Background barcode scanner activated');
    
    // Global keydown listener for background scanning
    const handleGlobalKeydown = (event) => {
      // Only process if scanner is active and not typing in input fields
      if (!scannerActive || event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }
      
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeystrokeTime;
      
      // If it's been too long since last keystroke, start a new barcode
      if (timeDiff > SCANNER_TIMEOUT && barcodeBuffer.length > 0) {
        console.log('🕒 Scanner timeout - clearing buffer');
        barcodeBuffer = '';
      }
      
      // Only accept printable characters and control keys
      if (event.key.length === 1) {
        // Add character to buffer if it's valid
        const char = event.key;
        if (/[a-zA-Z0-9]/.test(char)) { // Only alphanumeric characters
          barcodeBuffer += char;
          lastKeystrokeTime = currentTime;
          
          // Check if we have a complete barcode
          if (barcodeBuffer.length >= MIN_BARCODE_LENGTH && barcodeBuffer.length <= MAX_BARCODE_LENGTH) {
            console.log('📝 Barcode buffer ready:', barcodeBuffer);
            // Auto-process if buffer is getting long
            if (barcodeBuffer.length >= 12) {
              processBackgroundBarcode(barcodeBuffer);
              barcodeBuffer = '';
            }
          }
        }
      }
      
      // Handle Enter key (some scanners end with Enter)
      if (event.key === 'Enter' && barcodeBuffer.length >= MIN_BARCODE_LENGTH) {
        console.log('⏎ Enter pressed - processing barcode');
        processBackgroundBarcode(barcodeBuffer);
        barcodeBuffer = '';
      }
      
      // Handle Escape key to clear buffer
      if (event.key === 'Escape') {
        console.log('🛑 Escape pressed - clearing buffer');
        barcodeBuffer = '';
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeydown);
    
    // Store cleanup function
    window.cleanupBackgroundScanner = () => {
      scannerActive = false;
      window.removeEventListener('keydown', handleGlobalKeydown);
      console.log('🔧 Background barcode scanner deactivated');
    };
  };
  
  const cleanupBackgroundScanner = () => {
    if (typeof window !== 'undefined' && window.cleanupBackgroundScanner) {
      window.cleanupBackgroundScanner();
    }
    setBackgroundScannerActive(false);
  };
  
  // Enhanced product matching with better barcode support
  const findProductByBarcode = (barcode) => {
    console.log('🔍 Searching for product with barcode:', barcode);
    
    const normalizedBarcode = barcode.toString().trim().toLowerCase();
    
    const product = products.find(p => {
      // Check primary barcode (case insensitive)
      if (p.barcode && p.barcode.toString().toLowerCase() === normalizedBarcode) {
        console.log('✅ Found product by primary barcode:', p.name);
        return true;
      }
      
      // Check line code (case insensitive)
      if (p.line_code && p.line_code.toString().toLowerCase() === normalizedBarcode) {
        console.log('✅ Found product by line code:', p.name);
        return true;
      }
      
      // Check additional barcodes (case insensitive)
      if (p.additional_barcodes) {
        if (Array.isArray(p.additional_barcodes)) {
          const found = p.additional_barcodes.some(ab => 
            ab && ab.toString().toLowerCase() === normalizedBarcode
          );
          if (found) {
            console.log('✅ Found product by additional barcode:', p.name);
            return true;
          }
        } else if (typeof p.additional_barcodes === 'string') {
          const barcodes = p.additional_barcodes.split(',').map(b => b.trim().toLowerCase());
          if (barcodes.includes(normalizedBarcode)) {
            console.log('✅ Found product by additional barcodes:', p.name);
            return true;
          }
        }
      }
      
      // Also check if barcode contains or is contained in product codes
      if (p.barcode && p.barcode.toString().includes(normalizedBarcode)) {
        console.log('✅ Found product by barcode contains:', p.name);
        return true;
      }
      
      if (p.line_code && p.line_code.toString().includes(normalizedBarcode)) {
        console.log('✅ Found product by line code contains:', p.name);
        return true;
      }
      
      return false;
    });
    
    return product;
  };
  
  const processBackgroundBarcode = (barcode) => {
    console.log('🔍 Background scanner detected barcode:', barcode);
    
    const product = findProductByBarcode(barcode);
    
    if (product) {
      addToCart(product);
      Alert.alert(
        '🛒 SCANNER ADDED', 
        `${product.name} scanned and added to cart!`,
        [{ text: 'OK', timeout: 1500 }]
      );
    } else {
      Alert.alert(
        '❌ PRODUCT NOT FOUND', 
        `No product found with barcode: ${barcode}\n\nAvailable products: ${products.length}\n\nPlease check the barcode or add the product manually.`,
        [{ text: 'OK' }]
      );
    }
  };

  // Handle manual barcode submission via button click
  const handleBarcodeSubmit = () => {
    const barcode = barcodeInput.trim();
    
    // Only process if barcode has sufficient length (6+ characters)
    if (barcode.length < 6) {
      return; // Don't process short barcodes
    }
    
    // Check for exact barcode match
    const product = products.find(p => 
      p.barcode === barcode || p.line_code === barcode
    );
    
    if (product) {
      // Clear the barcode input and silently add to cart
      setBarcodeInput('');
      addToCart(product);
      // NO SUCCESS MESSAGE - completely silent operation
    }
    // If barcode doesn't exist, do nothing silently
  };



  // Show error modal function
  const showError = (title, message, type = 'error') => {
    setErrorModalData({ title, message, type });
    setShowErrorModal(true);
  };

  // Print vintage receipt function
  const printVintageReceipt = (saleData, total, received, currency = 'USD') => {
    const now = new Date();
    const receiptNumber = saleData.id || 'N/A';
    const cashierName = cashierData?.name || 'Cashier';
    
    // Calculate change properly
    const change = Math.max(0, (parseFloat(received) || 0) - total);
    
    // Get payment method and currency for receipt - Multi-Currency Support
    const receiptPaymentMethod = `${currency} CASH`;
    const receiptCurrency = currency.toLowerCase();
    
    // Convert amounts to receipt currency for display
    // Note: received amount is NOT converted because cashier types it in the selected currency
    // Note: total is already converted by getTotalAmount(), so no conversion needed
    const totalInReceiptCurrency = total; // Already in the correct currency
    const receivedInReceiptCurrency = received; // Already in the correct currency as typed by cashier
    const changeInReceiptCurrency = change; // Already calculated correctly
    
    // Get REAL company details from loaded shop data (not fake values!)
    const companyName = shopData?.name || shopData?.business_name || shopData?.shop_name || 'Business Name';
    const companyEmail = shopData?.email || 'info@business.com';
    const companyPhone = shopData?.phone || '+123 456 7890';
    const companyAddress = shopData?.address || 'Business Address';
    const companyTaxId = shopData?.tax_id || 'TAX-ID-NOT-SET';
    
    // Use REAL system information from database (not fake random values!)
    const deviceId = shopData?.device_id || 'DEVICE-NOT-SET';
    const shopId = shopData?.shop_id || 'SHOP-NOT-SET';
    const registerId = shopData?.register_id || 'REG-NOT-SET';
    const terminalId = cashierData?.id || cashierData?.cashier_id || 'CASHIER-NOT-SET';
    
    // Generate receipt verification barcode
    const verificationCode = `R${receiptNumber}${now.getTime().toString().slice(-6)}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    // Create enhanced professional receipt HTML optimized for printing
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Professional Receipt</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          /* Print-optimized CSS */
          @media print {
            body { 
              margin: 0; 
              padding: 0; 
              background: white !important;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            .receipt-container {
              box-shadow: none !important;
              border: none !important;
              background: white !important;
              margin: 0 !important;
              padding: 10px !important;
              width: 100% !important;
              max-width: none !important;
            }
            .cancel-button {
              display: none !important;
            }
            .receipt {
              padding: 0 !important;
            }
            .no-print {
              display: none !important;
            }
          }
          
          /* Screen display styles */
          body {
            font-family: 'Courier New', 'Arial', sans-serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            color: #000000;
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            line-height: 1.4;
            font-size: 16px;
          }
          
          .receipt-container {
            background: #ffffff;
            padding: 15px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.8);
            width: 350px;
            max-width: 95vw;
            position: relative;
            overflow: hidden;
          }
          
          .receipt-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          }
          
          .receipt {
            background: white;
            position: relative;
          }
          
          /* Enhanced Header */
          .header {
            text-align: center;
            border-bottom: 3px double #333;
            padding-bottom: 12px;
            margin-bottom: 15px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            margin: -15px -15px 15px -15px;
            padding: 15px;
            border-radius: 12px 12px 0 0;
          }
          
          .company-name {
            font-size: 26px;
            font-weight: bold;
            margin-bottom: 8px;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: #2c3e50;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
          }
          
          .company-info {
            font-size: 13px;
            margin-bottom: 2px;
            color: #555;
            font-weight: 500;
          }
          
          .business-tagline {
            font-size: 11px;
            font-style: italic;
            color: #666;
            margin-top: 4px;
            font-weight: 400;
          }
          
          /* System Information Box */
          .system-info {
            font-size: 11px;
            color: #444;
            margin: 10px 0;
            border: 1px solid #ddd;
            padding: 8px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 6px;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
          }
          
          /* Enhanced Verification Code */
          .verification-barcode {
            font-size: 13px;
            font-weight: bold;
            color: #1e3a8a;
            background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
            border: 2px solid #3b82f6;
            padding: 10px;
            margin: 12px 0;
            text-align: center;
            letter-spacing: 1px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(59, 130, 246, 0.2);
            position: relative;
          }
          
          .verification-barcode::before {
            content: '🛡️';
            position: absolute;
            top: -8px;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            padding: 0 8px;
            font-size: 12px;
          }
          
          /* Receipt Information */
          .receipt-info {
            margin-bottom: 12px;
            background: #f8f9fa;
            padding: 10px;
            border-radius: 6px;
            border: 1px solid #e9ecef;
          }
          
          .info-line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
            font-size: 14px;
            font-weight: 500;
          }
          
          .info-line span:first-child {
            color: #555;
          }
          
          .info-line span:last-child {
            font-weight: 600;
            color: #2c3e50;
          }
          
          /* Enhanced Items Section */
          .items-section {
            margin-bottom: 12px;
          }
          
          .items-header {
            text-align: center;
            font-weight: bold;
            border-bottom: 2px solid #333;
            padding-bottom: 4px;
            margin-bottom: 8px;
            font-size: 16px;
            color: #2c3e50;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .item-line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
            padding: 2px 0;
            border-bottom: 1px dotted #ccc;
          }
          
          .item-name {
            flex: 1;
            font-size: 14px;
            font-weight: 600;
            color: #2c3e50;
          }
          
          .item-qty {
            width: 40px;
            text-align: center;
            font-size: 14px;
            font-weight: bold;
            color: #666;
          }
          
          .item-price {
            width: 60px;
            text-align: right;
            font-size: 14px;
            font-weight: bold;
            color: #2c3e50;
          }
          
          .item-subtotal {
            font-size: 12px;
            color: #666;
            text-align: right;
            margin-top: -1px;
          }
          
          /* Enhanced Totals Section */
          .totals-section {
            border-top: 3px double #333;
            padding-top: 8px;
            margin-top: 8px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            padding: 10px;
            border-radius: 6px;
          }
          
          .total-line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
            font-size: 14px;
          }
          
          .total-line.grand-total {
            font-weight: bold;
            font-size: 18px;
            border-top: 2px solid #333;
            padding-top: 4px;
            margin-top: 4px;
            color: #1e3a8a;
            background: #dbeafe;
            padding: 8px;
            border-radius: 4px;
            margin-left: -10px;
            margin-right: -10px;
            margin-bottom: -10px;
            margin-top: 8px;
          }
          
          /* Enhanced Footer */
          .refund-policy {
            font-size: 11px;
            color: #444;
            background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
            border: 1px solid #fbbf24;
            padding: 8px;
            margin: 8px 0;
            text-align: center;
            border-radius: 6px;
            box-shadow: inset 0 1px 3px rgba(251, 191, 36, 0.2);
          }
          
          .footer {
            text-align: center;
            border-top: 2px solid #333;
            padding-top: 8px;
            margin-top: 10px;
          }
          
          .thank-you {
            font-weight: bold;
            font-size: 16px;
            color: #059669;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .lumina-footer {
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px dashed #ccc;
            text-align: center;
          }
          
          .lumina-brand {
            font-size: 11px;
            font-weight: bold;
            color: #6b7280;
            margin-bottom: 2px;
          }
          
          .powered-by {
            font-size: 10px;
            color: #9ca3af;
            margin-bottom: 2px;
          }
          
          .website {
            color: #3b82f6;
            text-decoration: none;
            font-size: 10px;
            font-weight: 500;
          }
          
          .footer-text {
            font-size: 10px;
            margin-top: 4px;
            line-height: 1.2;
            color: #6b7280;
          }
          
          /* Enhanced Cancel Button */
          .cancel-button {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: white;
            border: none;
            padding: 15px 25px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
            z-index: 1000;
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .cancel-button:hover {
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(239, 68, 68, 0.6);
          }
          
          .cancel-button:active {
            transform: translateY(0);
          }
          
          /* Print Button */
          .print-button {
            position: fixed;
            bottom: 30px;
            left: 30px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            border: none;
            padding: 15px 25px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
            z-index: 1000;
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .print-button:hover {
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(16, 185, 129, 0.6);
          }
          
          /* Divider */
          .divider {
            text-align: center;
            margin: 6px 0;
            font-size: 12px;
            color: #666;
          }
          
          /* Payment method indicator */
          .payment-method {
            background: #e0f2fe;
            border: 1px solid #0ea5e9;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            color: #0c4a6e;
            text-align: center;
            margin: 4px 0;
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="receipt">
            <div class="header">
              <div class="company-name">${companyName || 'Business Name'}</div>
              <div class="company-info">📧 ${companyEmail}</div>
              <div class="company-info">📞 ${companyPhone}</div>
              <div class="company-info">📍 ${companyAddress}</div>
              <div class="company-info">🏢 Tax ID: ${companyTaxId}</div>
              <div class="business-tagline">Professional Service Since ${new Date().getFullYear()}</div>
            </div>
            
            <div class="system-info">
              <strong>🔧 SYSTEM INFORMATION:</strong><br>
              Device: ${deviceId} | Shop: ${shopId}<br>
              Register: ${registerId} | Terminal: ${terminalId}<br>
              Sale ID: ${receiptNumber} | Items: ${cart.length} | Total: ${formatCurrencyWithSymbol(totalInReceiptCurrency, receiptCurrency)}
            </div>
            
            <div class="verification-barcode">
              🔍 RECEIPT VERIFICATION CODE:<br>
              ${verificationCode}<br>
              <div style="font-size: 7px; color: #666; margin-top: 2px; font-style: italic;">
                Scan this code at our POS for instant verification
              </div>
            </div>
            
            <div class="divider">◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆</div>
            
            <div class="receipt-info">
              <div class="info-line">
                <span>Receipt #:</span>
                <span>${receiptNumber}</span>
              </div>
              <div class="info-line">
                <span>Date:</span>
                <span>${now.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
              </div>
              <div class="info-line">
                <span>Time:</span>
                <span>${now.toLocaleTimeString()}</span>
              </div>
              <div class="info-line">
                <span>Cashier:</span>
                <span>${cashierName}</span>
              </div>
              <div class="info-line">
                <span>Terminal:</span>
                <span>${terminalId}</span>
              </div>
            </div>
            
            <div class="divider">◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆</div>
            
            <div class="items-section">
              <div class="items-header">🛒 ITEMS PURCHASED</div>
              ${cart.map(item => {
                const itemTotal = item.price_type === 'unit' 
                  ? item.price * item.quantity 
                  : item.price * (item.weight || 0);
                const itemPriceInReceiptCurrency = receiptCurrency === 'usd' ? item.price : convertToCurrency(item.price, receiptCurrency.toUpperCase());
                const itemTotalInReceiptCurrency = receiptCurrency === 'usd' ? itemTotal : convertToCurrency(itemTotal, receiptCurrency.toUpperCase());
                const itemDetail = item.price_type === 'unit'
                  ? `${item.quantity} units @ ${formatCurrencyWithSymbol(itemPriceInReceiptCurrency, receiptCurrency)} each`
                  : `${item.weight || 0} ${item.price_type} @ ${formatCurrencyWithSymbol(itemPriceInReceiptCurrency, receiptCurrency)}/${item.price_type}`;
                
                return `
                  <div class="item-line">
                    <div class="item-name">${item.name}</div>
                    <div class="item-qty">${item.price_type === 'unit' ? item.quantity : (item.weight || 0) + ' ' + item.price_type}</div>
                    <div class="item-price">${formatCurrencyWithSymbol(itemTotalInReceiptCurrency, receiptCurrency)}</div>
                  </div>
                  <div class="item-subtotal">${itemDetail}</div>
                `;
              }).join('')}
            </div>
            
            <div class="divider">◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆</div>
            
            <div class="totals-section">
              <div class="total-line">
                <span>Subtotal:</span>
                <span>${formatCurrencyWithSymbol(totalInReceiptCurrency, receiptCurrency)}</span>
              </div>
              <div class="payment-method">💵 ${receiptPaymentMethod} PAYMENT</div>
              <div class="total-line">
                <span>Cash Received:</span>
                <span>${formatCurrencyWithSymbol(receivedInReceiptCurrency, receiptCurrency)}</span>
              </div>
              <div class="total-line">
                <span>Change Due:</span>
                <span style="color: #059669;">${formatCurrencyWithSymbol(changeInReceiptCurrency, receiptCurrency)}</span>
              </div>
              <div class="total-line grand-total">
                <span>TOTAL:</span>
                <span>${formatCurrencyWithSymbol(totalInReceiptCurrency, receiptCurrency)}</span>
              </div>
            </div>
            
            <div class="divider">◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆</div>
            
            <div class="refund-policy">
              <strong>🔄 RETURN & REFUND POLICY</strong><br>
              • Items can be returned within 7 days with receipt<br>
              • Original packaging required for refunds<br>
              • Contact us with verification code: ${verificationCode}<br>
              • Customer service: ${companyPhone}<br>
              • Thank you for your business!
            </div>
            
            <div class="footer">
              <div class="thank-you">🙏 THANK YOU!</div>
              <div style="font-size: 9px; color: #666; margin-top: 4px;">
                We appreciate your business
              </div>
            </div>
            
            <div class="lumina-footer">
              <div class="lumina-brand">Powered by LuminaN</div>
              <div class="powered-by">Professional POS Solutions</div>
              <div class="website">www.luminanzimbabwe.com</div>
              <div class="footer-text">
                Advanced point-of-sale system<br>
                for modern businesses
              </div>
            </div>
            
            <div class="divider">◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆</div>
            
            <div style="text-align: center; font-size: 10px; color: #999; margin-top: 8px;">
              Receipt generated on ${now.toLocaleString()}
            </div>
          </div>
        </div>
        
        <button class="print-button" onclick="window.print()">🖨️ PRINT</button>
        <button class="cancel-button" onclick="window.close()">✕ CLOSE</button>
      </body>
      </html>
    `;
    
    // Create a new window to display receipt (stays open until user cancels)
    const screenWidth = window.screen.width || 1200;
    const screenHeight = window.screen.height || 800;
    const windowWidth = 480;
    const windowHeight = 750;
    const leftPosition = (screenWidth - windowWidth) / 2;
    const topPosition = (screenHeight - windowHeight) / 2;
    
    const receiptWindow = window.open('', '_blank', `width=${windowWidth},height=${windowHeight},scrollbars=yes,resizable=yes,left=${leftPosition},top=${topPosition}`);
    receiptWindow.document.write(receiptHTML);
    receiptWindow.document.close();
    
    // Focus the window to bring it to front
    receiptWindow.focus();
  };

  const processSale = async () => {
    console.log('SALE BUTTON PRESSED!');
    
    // Show immediate feedback
    Alert.alert(
      'Processing Sale...', 
      'Please wait while we process your sale.',
      [{ text: 'OK' }]
    );
    
    if (cart.length === 0) {
      showError(
        '⚠️ NO ITEMS IN CART', 
        'Please add items to the cart before processing the sale.\n\nClick on products to add them to the cart.',
        'warning'
      );
      return;
    }

    // Validate card payment
    if (paymentMethod === 'card') {
      if (!cardNetwork) {
        Alert.alert(
          '⚠️ CARD NETWORK REQUIRED',
          'Please select the card network (Visa, Mastercard, etc.)',
          [{ text: 'OK' }]
        );
        return;
      }
      if (!cardLast4 || cardLast4.length !== 4) {
        Alert.alert(
          '⚠️ CARD NUMBER REQUIRED',
          'Please enter the last 4 digits of the card',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    // Validate transfer payment
    if (paymentMethod === 'transfer') {
      if (!transferWallet) {
        Alert.alert(
          '⚠️ TRANSFER METHOD REQUIRED',
          'Please select a transfer wallet or bank account from the modal',
          [{ text: 'OK', onPress: () => setShowTransferWalletModal(true) }]
        );
        return;
      }
    }

    // For cash payments, require amount received
    if (paymentMethod === 'cash') {
      const received = parseFloat(amountReceived) || 0;
      if (received <= 0) {
        Alert.alert(
          '⚠️ PAYMENT REQUIRED',
          `Please enter the amount received from customer before processing the sale.\n\nTotal Amount: ${formatCurrency(getTotalAmount())}`,
          [{ text: 'OK', style: 'default' }]
        );
        setTimeout(() => {
          const amountInput = document.querySelector('input[placeholder="0.00"]');
          if (amountInput) amountInput.focus();
        }, 100);
        return;
      }

      // Check if sufficient amount received
      if (received < getTotalAmount()) {
        const shortage = getTotalAmount() - received;
        Alert.alert(
          '⚠️ INSUFFICIENT PAYMENT',
          `Insufficient amount received for ${selectedCurrency} cash payment.\n\nTotal Amount: ${formatCurrency(getTotalAmount())}\nAmount Received: ${formatCurrency(received, selectedCurrency)}\nShort Amount: ${formatCurrency(shortage, selectedCurrency)}\n\nPlease collect the remaining amount from customer.`,
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      // Check for overpayment
      if (received > getTotalAmount()) {
        const overpayment = received - getTotalAmount();
        console.log('OVERPAYMENT DETECTED - ALLOWING WITH WARNING');
        Alert.alert(
          'Overpayment Detected',
          `Overpayment detected!\n\nTotal: ${formatCurrency(getTotalAmount())}\nReceived: ${formatCurrency(received, selectedCurrency)}\nChange: ${formatCurrency(overpayment, selectedCurrency)}\n\nPlease verify the amount with customer before proceeding.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Proceed Anyway',
              onPress: () => {
                console.log('Overpayment confirmed by cashier');
              }
            }
          ]
        );
      }
    }

    console.log('Starting sale processing...');
    
    // Final validation summary
    const saleSummary = {
      items: cart.length,
      total: formatCurrency(getTotalAmount()),
      paymentMethod: paymentMethod.toUpperCase(),
      ...(paymentMethod === 'cash' && {
        received: formatCurrency(parseFloat(amountReceived) || 0),
        change: formatCurrency(getChange())
      }),
      ...(paymentMethod === 'transfer' && {
        transferWallet: transferWallet,
        transferReference: transferReference
      }),
      ...(paymentMethod === 'card' && {
        cardNetwork: cardNetwork,
        cardLast4: cardLast4
      })
    };
    console.log('Sale summary:', saleSummary);
    
    // Prepare sale data - Multi-Currency Support with Transfer/Card
    // Determine the specific payment type for proper tracking
    let paymentType = paymentMethod;
    let walletAccount = transferWallet || 'bank';
    
    // For transfer payments, use the wallet ID for precise tracking
    if (paymentMethod === 'transfer' && transferWallet) {
      const selectedWallet = transferWallets.find(w => w.name === transferWallet);
      if (selectedWallet) {
        walletAccount = selectedWallet.id; // Use the wallet ID (e.g., 'ecocash', 'ecocash_usd')
      }
    }
    
    // Calculate total with proper rounding to avoid floating-point precision issues
    const roundedTotal = Math.round(getTotalAmount() * 100) / 100;
    
    const saleData = {
      cashier_id: cashierData?.cashier_info?.id || cashierData?.id || cashierData?.cashier_id || 1,
      items: cart.map(item => ({
        product_id: item.id.toString(),
        quantity: item.price_type === 'unit' ? item.quantity.toString() : (item.weight || 0).toString(),
        unit_price: convertToCurrency(item.price, selectedCurrency).toString()
      })),
      payment_method: paymentType, // cash, card, transfer
      payment_currency: selectedCurrency,
      product_price_currency: 'USD',
      customer_name: '',
      customer_phone: '',
      total_amount: roundedTotal.toString(),
      // Transfer/Card specific fields
      ...(paymentMethod === 'transfer' && {
        wallet_account: walletAccount, // Now contains specific wallet ID like 'ecocash', 'ecocash_usd', 'onemoney', etc.
        transfer_reference: transferReference
      }),
      ...(paymentMethod === 'card' && {
        card_network: cardNetwork,
        card_last_4: cardLast4
      })
    };
    
    console.log('🔍 SALE ATTRIBUTION DEBUG:', {
      cashierId: cashierData?.cashier_info?.id || cashierData?.id || cashierData?.cashier_id || 1,
      cashierName: cashierData?.name || cashierData?.cashier_info?.name || 'Unknown',
      saleData,
      timestamp: new Date().toISOString()
    });
    
    try {
      setProcessingSale(true);

      const response = await shopAPI.createSale(saleData);
      
      if (response?.data) {
        // Process automatic receipt generation - Multi-Currency Support
        const receivedAmount = parseFloat(amountReceived) || 0;
        printVintageReceipt(response.data, getTotalAmount(), receivedAmount, selectedCurrency);
        
        // Calculate change first
        const calculatedChange = Math.max(0, receivedAmount - getTotalAmount());
        const updatedItems = cart.map(item => `${item.name}: ${item.stock_quantity - item.quantity} remaining`).join('\n');

        // Build payment method description
        let paymentMethodDesc = '';
        if (paymentMethod === 'cash') {
          paymentMethodDesc = `Currency: ${selectedCurrency}\nCash Received: ${formatCurrency(receivedAmount, selectedCurrency)}\nChange: ${formatCurrency(calculatedChange, selectedCurrency)}`;
        } else if (paymentMethod === 'transfer') {
          paymentMethodDesc = `Transfer (${transferWallet}): ${transferReference}`;
        } else if (paymentMethod === 'card') {
          paymentMethodDesc = `Card: ${cardNetwork?.toUpperCase()}\nLast 4: ****${cardLast4}`;
        }

        Alert.alert(
          'SALE COMPLETED!',
          `Sale #${response.data.id} completed successfully!\n\n` +
          `Total: ${formatCurrency(getTotalAmount(), selectedCurrency)}\n` +
          `${paymentMethodDesc}\n\n` +
          `Stock Updated:\n${updatedItems}`,
          [
            {
              text: 'OK',
              onPress: () => {
                setCart([]);
                setAmountReceived('');
                setPaymentMethod('cash');
                setCardLast4('');
                setCardNetwork('');
                setTransferWallet('');
                setTransferReference('');
                loadProducts();
                setProcessingSale(false);
              }
            }
          ]
        );
      }
    } catch (error) {
      let errorMessage = 'Failed to process sale';
      if (error.response?.data) {
        errorMessage = typeof error.response.data === 'string' 
          ? error.response.data 
          : JSON.stringify(error.response.data);
      } else {
        errorMessage = error.message || 'Network error';
      }
      
      showError(
        'SALE FAILED', 
        `${errorMessage}\n\nPlease check your connection and try again.`,
        'error'
      );
    } finally {
      setProcessingSale(false);
    }
  };

  const voidSale = () => {
    Alert.alert(
      'Void Sale',
      'Are you sure you want to void this sale?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Void',
          style: 'destructive',
          onPress: () => {
            setCart([]);
            setAmountReceived('');
          }
        }
      ]
    );
  };



  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Set offline status before clearing credentials
              presenceService.setOffline('manual_logout');
              
              await shopStorage.clearCredentials();
              
              // Clean up presence service
              presenceService.destroy();
              
              navigation.replace('Login');
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };



  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>✨ Cashier Dashboard ✨</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B4513" />
          <Text style={styles.loadingText}>Loading cashier terminal...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, Platform.OS === 'web' && styles.webScrollView]}
      contentContainerStyle={Platform.OS === 'web' ? styles.webContentContainer : undefined}
      showsVerticalScrollIndicator={Platform.OS === 'web'}
      showsHorizontalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshingDrawer}
          onRefresh={() => refreshDrawerStatus()}
        />
      }
    >
      {/* NEURAL CASHIER HEADER - GEN 2080 INTERFACE */}
      <View style={styles.neuralCashierHeader}>
        <View style={styles.neuralHeaderBackground}>
          <View style={styles.neuralHeaderContent}>
            {/* GEN 2080 Neural Title */}
            <View style={styles.neuralTitleSection}>
              <TouchableOpacity 
                style={styles.neuralMenuButton} 
                onPress={() => setShowSidebar(!showSidebar)}
              >
                <View style={styles.neuralButtonGlow}></View>
                <Icon name="menu" size={20} color="#00ffff" />
                <Text style={styles.neuralButtonText}>NEURAL</Text>
              </TouchableOpacity>
              
              <View style={styles.neuralTitleContainer}>
                <Text style={styles.neuralGeneration}>GEN 2080</Text>
                <Text style={styles.neuralSubtitle}>🧠 CASHIER NEURAL INTERFACE</Text>
                {(() => {
                  // Debug: Log available fields
                  console.log('Cashier Data Keys:', Object.keys(cashierData || {}));
                  console.log('Cashier Info:', cashierData?.cashier_info);
                  
                  // Try multiple fields to get the actual cashier name
                  const cashierName = cashierData?.cashier_info?.name || 
                                    cashierData?.username || 
                                    cashierData?.cashier_name || 
                                    cashierData?.name ||
                                    'CASHIER';
                  
                  // Show operator name with basic filtering (only exclude obvious shop domains)
                  if (cashierName && !cashierName.includes('.com')) {
                    return (
                      <Text style={styles.neuralCashierName}>👤 OPERATOR: {cashierName.toUpperCase()}</Text>
                    );
                  }
                  
                  // Fallback to generic cashier
                  return (
                    <Text style={styles.neuralCashierName}>👤 OPERATOR: CASHIER</Text>
                  );
                })()}
                <View style={styles.neuralScanner}>
                  <Text style={styles.neuralScannerText}>◉ NEURAL SCAN ACTIVE</Text>
                </View>
              </View>
              
              <TouchableOpacity 
                style={[styles.neuralCalculatorButton, showCalculator && styles.neuralButtonActive]} 
                onPress={() => setShowCalculator(!showCalculator)}
              >
                <View style={styles.neuralButtonGlow}></View>
                <Text style={styles.neuralCalculatorIcon}>🧮</Text>
                <Text style={styles.neuralButtonText}>CALC</Text>
              </TouchableOpacity>
            </View>
            
            {/* Neural Status Display - Compact Layout */}
            <View style={styles.neuralStatusGrid}>
              <View style={styles.neuralStatusCard}>
                <Text style={styles.neuralStatusLabel}>ITEMS</Text>
                <Text style={styles.neuralStatusValue}>{cart.length}</Text>
                <View style={styles.neuralPulse}></View>
              </View>
              <View style={styles.neuralStatusCard}>
                <Text style={styles.neuralStatusLabel}>TOTAL</Text>
                <Text style={styles.neuralStatusValue}>{formatCurrency(getTotalAmount())}</Text>
                <View style={styles.neuralPulse}></View>
              </View>
              <View style={styles.neuralStatusCard}>
                <Text style={styles.neuralStatusLabel}>STATUS</Text>
                <Text style={[styles.neuralStatusValue, shopStatus?.is_open ? styles.neuralOnline : styles.nerainOffline]}>
                  {shopStatus?.is_open ? 'ONLINE' : 'OFFLINE'}
                </Text>
                <View style={[styles.neuralPulse, shopStatus?.is_open ? styles.neuralPulseOnline : styles.neuralPulseOffline]}></View>
              </View>
              
              {/* Business Hours Display */}
              <View style={styles.neuralBusinessHoursCard}>
                <Text style={styles.neuralBusinessHoursLabel}>🕐 HOURS</Text>
                <Text style={styles.neuralBusinessHoursValue}>
                  {shopData?.opening_time ? formatTimeDisplay(shopData.opening_time) : '-'} - 
                  {shopData?.closing_time ? formatTimeDisplay(shopData.closing_time) : '-'}
                </Text>
                <Text style={styles.neuralBusinessHoursTimezone}>
                  {shopData?.timezone || 'Not set'}
                </Text>
              </View>
              
              {/* Currency & Rates - Combined Compact Card (Moved before SYNC) */}
              <View style={styles.neuralCurrencyCard}>
                <Text style={styles.neuralRatesText}>
                  USD ➜ {exchangeRates?.usd_to_zig?.toFixed(2) || '24.50'} ZIG | {exchangeRates?.usd_to_rand?.toFixed(2) || '18.20'} RAND
                </Text>
              </View>
              
              
              {/* SYNC Button - Refreshes entire screen */}
              <TouchableOpacity 
                onPress={() => {
                  // Refresh all data for the cashier screen
                  loadDrawerStatus(cashierData);
                  loadProducts();
                  loadShopStatus();
                  fetchExchangeRates();
                  fetchBusinessSettings();
                  updateRealTimeStats();
                  Alert.alert('✅ REFRESHED', 'All data has been refreshed successfully!', [{ text: 'OK' }]);
                }} 
                style={styles.neuralRefreshButton}
              >
                <View style={styles.neuralButtonGlow}></View>
                <Icon name="refresh" size={18} color="#00ffff" />
                <Text style={styles.neuralRefreshText}>SYNC</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Modern Decorative Border */}
      <View style={styles.vintageBorder}>
        <Text style={styles.borderText}>✨ MODERN POS SYSTEM ✨</Text>
        <Text style={styles.borderText}>Professional Point of Sale Solution</Text>
      </View>

      {/* Inspirational Quote Section */}
      <View style={styles.inspirationalQuoteSection}>
        <Text style={styles.inspirationalQuoteText}>"For its like magic but powered by code logic and networks"</Text>
        <Text style={styles.inspirationalQuoteAuthor}>- LuminaN Technology</Text>
        <View style={styles.quoteDecoration}>
          <Text style={styles.quoteDecoText}>⚡ ✨ 💫</Text>
        </View>
      </View>

      {/* POS Interface */}
      <View style={styles.posContainer}>
        {/* Products Section - Hidden Initially with Show All Button */}
        <View style={styles.productsSection}>
          <Text style={styles.sectionTitle}>🛍️ AVAILABLE PRODUCTS</Text>
          
          {/* Show All Products Button */}
          <View style={styles.showAllProductsContainer}>
            <TouchableOpacity 
              style={styles.showAllProductsButton}
              onPress={() => navigation.navigate('CashierProducts')}
            >
              <Icon name="inventory" size={24} color="#ffffff" />
              <Text style={styles.showAllProductsButtonText}>SHOW ALL PRODUCTS</Text>
              <Icon name="arrow-forward" size={20} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.showAllProductsSubtext}>
              Click to view and add products to your cart
            </Text>
          </View>
          
          {/* Quick Products Section - Products without Barcodes */}
          <View style={styles.quickProductsContainer}>
            <Text style={styles.quickProductsTitle}>⚡ QUICK PRODUCTS</Text>
            <Text style={styles.quickProductsSubtitle}>Products without barcodes - Treated as units for faster sales</Text>
            

            
            <View style={styles.quickProductsGrid}>
              {products.filter(product => {
                const barcode = (product.barcode || '').toString().trim().toUpperCase();
                // Show products without barcodes AND with unit price type only
                const hasNoBarcode = (!barcode || barcode === 'N/A' || barcode === 'NA' || barcode === 'NONE' || barcode === 'NULL' || barcode === 'UNDEFINED' || barcode === '');
                const isUnitPrice = product.price_type === 'unit';
                return hasNoBarcode && isUnitPrice;
              }).slice(0, 6).map((product, index) => (
                <TouchableOpacity
                  key={product.id}
                  style={styles.quickProductCard}
                  onPress={() => {
                    // For Quick Products (no barcodes), always treat as units regardless of price_type
                    const unitProduct = { ...product, price_type: 'unit' };
                    addToCart(unitProduct);
                    Alert.alert(
                      '✅ Quick Product Added',
                      `${product.name} added to cart as unit!`,
                      [{ text: 'OK', timeout: 1000 }]
                    );
                  }}
                >
                  <Text style={styles.quickProductName}>{product.name}</Text>
                  <Text style={styles.quickProductPrice}>{formatCurrency(product.price)}/unit</Text>
                  <Text style={styles.quickProductCategory}>{product.category || 'General'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {products.filter(product => {
              const barcode = (product.barcode || '').toString().trim().toUpperCase();
              // Show products without barcodes AND with unit price type only
              const hasNoBarcode = (!barcode || barcode === 'N/A' || barcode === 'NA' || barcode === 'NONE' || barcode === 'NULL' || barcode === 'UNDEFINED' || barcode === '');
              const isUnitPrice = product.price_type === 'unit';
              return hasNoBarcode && isUnitPrice;
            }).length === 0 && (
              <View style={styles.noQuickProductsContainer}>
                <Icon name="inventory-2" size={48} color="#6b7280" />
                <Text style={styles.noQuickProductsText}>No products without barcodes</Text>
                <Text style={styles.noQuickProductsSubtext}>
                  Add products without barcodes to see them here for quick access
                </Text>
              </View>
            )}
            
            {products.filter(product => {
              const barcode = (product.barcode || '').toString().trim().toUpperCase();
              // Show products without barcodes AND with unit price type only
              const hasNoBarcode = (!barcode || barcode === 'N/A' || barcode === 'NA' || barcode === 'NONE' || barcode === 'NULL' || barcode === 'UNDEFINED' || barcode === '');
              const isUnitPrice = product.price_type === 'unit';
              return hasNoBarcode && isUnitPrice;
            }).length > 6 && (
              <TouchableOpacity 
                style={styles.viewAllQuickProductsButton}
                onPress={() => navigation.navigate(ROUTES.QUICK_PRODUCTS)}
              >
                <Text style={styles.viewAllQuickProductsButtonText}>
                  View All Quick Products ({products.filter(product => {
                    const barcode = (product.barcode || '').toString().trim().toUpperCase();
                    // Show products without barcodes AND with unit price type only
                    const hasNoBarcode = (!barcode || barcode === 'N/A' || barcode === 'NA' || barcode === 'NONE' || barcode === 'NULL' || barcode === 'UNDEFINED' || barcode === '');
                    const isUnitPrice = product.price_type === 'unit';
                    return hasNoBarcode && isUnitPrice;
                  }).length})
                </Text>
                <Icon name="arrow-forward" size={16} color="#10b981" />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Search and Filter Section - Now Visible and Functional */}
          <View style={styles.searchFilterSection}>
            {/* Search Input with Scan Button */}
            <View style={styles.searchContainer}>
              <Text style={styles.searchLabel}>🔍 SEARCH PRODUCTS:</Text>
              <View style={styles.searchInputContainer}>
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search by name, code, or scan barcode..."
                  placeholderTextColor="#8B4513"
                />

              </View>
            </View>
            
            {/* Barcode Input with Validation */}
            <View style={styles.barcodeContainer}>
              <Text style={styles.barcodeLabel}>📱 BARCODE INPUT (Multiple Barcodes Supported):</Text>
              <View style={styles.barcodeInputContainer}>
                <TextInput
                  style={styles.barcodeInput}
                  value={barcodeInput}
                  onChangeText={handleBarcodeInput}
                  placeholder="Enter barcode or line code, press Enter to auto-add..."
                  placeholderTextColor="#10b981"
                  keyboardType="default"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={handleBarcodeSubmit}
                  blurOnSubmit={false}
                />
                <TouchableOpacity
                  style={[
                    styles.addBarcodeButton,
                    barcodeInput.length < 6 && styles.addBarcodeButtonDisabled
                  ]}
                  onPress={validateAndAddBarcode}
                  disabled={barcodeInput.length < 6}
                >
                  <Text style={styles.addBarcodeButtonText}>ADD TO CART</Text>
                </TouchableOpacity>
                {barcodeInput.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearBarcodeButton}
                    onPress={() => {
                      setBarcodeInput('');
                      setBarcodeValidation(null);
                    }}
                  >
                    <Text style={styles.clearBarcodeButtonText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.barcodeHelpText}>
                💡 Type any barcode or line code, then press Enter or click "ADD TO CART" to automatically add to cart
              </Text>
            </View>
            
            {/* Category Filter - Hidden by default, show only when searching */}
            <View style={[
              styles.categoryContainer,
              (!searchQuery && selectedCategory === 'all') && { display: 'none' }
            ]}>
              <Text style={styles.categoryLabel}>📁 FILTER BY CATEGORY:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {getCategories().map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryButton,
                      selectedCategory === category && styles.categoryButtonActive
                    ]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      selectedCategory === category && styles.categoryButtonTextActive
                    ]}>
                      {category === 'all' ? 'ALL' : category.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Products Display - Enhanced for Large Search Results */}
          <View style={[
            styles.productsDisplayContainer, 
            (!searchQuery && selectedCategory === 'all') && { display: 'none' }
          ]}>
            {productsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B4513" />
                <Text style={styles.loadingText}>Loading products...</Text>
              </View>
            ) : filteredProducts.length === 0 ? (
              <View style={styles.noProductsContainer}>
                {searchQuery || selectedCategory !== 'all' ? (
                  <>
                    <Text style={styles.noProductsText}>
                      No products match your search criteria
                    </Text>
                    <Text style={styles.searchHelpText}>
                      Try a different search term or clear the search
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.searchHelpTitle}>🔍 Search Products</Text>
                    <Text style={styles.searchHelpText}>
                      Use the search bar above to find products by name, code, or barcode
                    </Text>
                    <Text style={styles.searchHelpSubtext}>
                      Or scan a barcode to add products directly to cart
                    </Text>
                  </>
                )}
              </View>
            ) : filteredProducts.length > 12 && !productsExpanded ? (
              /* Compact Summary View for Large Product Lists */
              <View style={styles.compactProductsSummary}>
                <View style={styles.compactProductsHeader}>
                  <Text style={styles.compactProductsTitle}>🔍 {filteredProducts.length} PRODUCTS FOUND</Text>
                  <TouchableOpacity 
                    style={styles.expandProductsButton}
                    onPress={() => setProductsExpanded(true)}
                  >
                    <Text style={styles.expandProductsButtonText}>📋 VIEW ALL</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.compactProductsGrid}>
                  {filteredProducts.slice(0, 6).map((product) => (
                    <TouchableOpacity
                      key={product.id}
                      style={styles.compactProductCard}
                      onPress={() => {
                        addToCart(product);
                        Alert.alert(
                          '✅ Product Added',
                          `${product.name} added to cart!`,
                          [{ text: 'OK', timeout: 1000 }]
                        );
                      }}
                    >
                      <Text style={styles.compactProductName}>
                        {product.name.length > 15 ? product.name.substring(0, 15) + '...' : product.name}
                      </Text>
                      <Text style={styles.compactProductPrice}>{formatCurrency(product.price)}</Text>
                      <Text style={styles.compactProductCategory}>{product.category || 'General'}</Text>
                    </TouchableOpacity>
                  ))}
                  {filteredProducts.length > 6 && (
                    <View style={styles.compactProductsMore}>
                      <Text style={styles.compactProductsMoreText}>+ {filteredProducts.length - 6} more products...</Text>
                      <Text style={styles.compactProductsMoreSubtext}>Click "VIEW ALL" to see all products</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              /* Detailed Products View */
              <>
                {filteredProducts.length > 12 && (
                  <View style={styles.productsViewHeader}>
                    <Text style={styles.productsViewTitle}>📋 ALL PRODUCTS ({filteredProducts.length} found)</Text>
                    <TouchableOpacity 
                      style={styles.collapseProductsButton}
                      onPress={() => setProductsExpanded(false)}
                    >
                      <Text style={styles.collapseProductsButtonText}>🔼 COMPACT VIEW</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <ScrollView 
                  style={filteredProducts.length > 8 ? styles.productsListScroll : null}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                  maximumHeight={filteredProducts.length > 8 ? 400 : undefined}
                >
                  <View style={styles.productsGrid}>
                    {filteredProducts.map((product) => (
                      <TouchableOpacity
                        key={product.id}
                        style={styles.productCard}
                        onPress={() => {
                          addToCart(product);
                          // Show brief feedback
                          Alert.alert(
                            '✅ Product Added',
                            `${product.name} added to cart!`,
                            [{ text: 'OK', timeout: 1000 }]
                          );
                        }}
                      >
                        {/* Product Card Header */}
                        <View style={styles.productCardHeader}>
                          <Text style={styles.productName}>{product.name}</Text>
                          <Text style={styles.productCode}>Code: {product.line_code || 'N/A'}</Text>
                        </View>
                        
                        {/* Product Card Body */}
                        <View style={styles.productCardBody}>
                          <View style={styles.productInfo}>
                            <Text style={styles.productCategory}>
                              📁 {product.category || 'Uncategorized'}
                            </Text>
                            <View style={styles.stockIndicator}>
                              <View style={[
                                styles.stockDot,
                                (product.stock_quantity || 0) < 0 && styles.stockDotNegative,
                                (product.stock_quantity || 0) === 0 && styles.stockDotOut,
                                (product.stock_quantity || 0) > 0 && (product.stock_quantity || 0) <= 5 && styles.stockDotLow,
                                (product.stock_quantity || 0) > 5 && styles.stockDotActive
                              ]} />
                              <Text style={[
                                styles.productStock,
                                (product.stock_quantity || 0) < 0 && styles.negativeStock,
                                (product.stock_quantity || 0) === 0 && styles.outOfStock,
                                (product.stock_quantity || 0) > 0 && (product.stock_quantity || 0) <= 5 && styles.lowStock
                              ]}>
                                📦 {product.stock_quantity || 0} {product.price_type === 'unit' ? 'units' : product.price_type}
                                {(product.stock_quantity || 0) < 0 && ' - NEGATIVE STOCK (SELLING)'}
                                {(product.stock_quantity || 0) === 0 && ' - OUT OF STOCK'}
                                {(product.stock_quantity || 0) > 0 && (product.stock_quantity || 0) <= 5 && ' - LOW STOCK'}
                                {(product.stock_quantity || 0) > 5 && ' - IN STOCK'}
                              </Text>
                            </View>
                            {/* Display all barcodes for the product */}
                            {((product.barcode || product.line_code) || product.additional_barcodes) && (
                              <View style={styles.productBarcodes}>
                                <Text style={styles.productBarcodeLabel}>🔖 Barcodes:</Text>
                                <Text style={styles.productBarcode}>
                                  {product.barcode && `Primary: ${product.barcode}`}
                                  {product.line_code && ` | Code: ${product.line_code}`}
                                </Text>
                                {product.additional_barcodes && (
                                  <Text style={styles.productBarcode}>
                                    {Array.isArray(product.additional_barcodes) 
                                      ? `Additional: ${product.additional_barcodes.join(', ')}`
                                      : `Additional: ${product.additional_barcodes}`
                                    }
                                  </Text>
                                )}
                              </View>
                            )}
                          </View>
                          
                          <View style={styles.productPriceSection}>
                            <Text style={styles.priceText}>{formatCurrency(product.price)}/{product.price_type === 'unit' ? 'unit' : product.price_type}</Text>
                            <TouchableOpacity
                              style={styles.addButton}
                              onPress={() => {
                                addToCart(product);
                                // Show brief feedback
                                Alert.alert(
                                  '✅ Product Added',
                                  `${product.name} added to cart!`,
                                  [{ text: 'OK', timeout: 1000 }]
                                );
                              }}
                            >
                              <Text style={styles.addButtonText}>
                                ➕ ADD
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        
                        {/* Product Card Footer */}
                        <View style={styles.productCardFooter}>
                          <Text style={styles.cardVintageBorder}>✨ Premium Quality Products</Text>
                          <Text style={{color: '#6b7280', fontSize: 10}}>
                            {new Date().toLocaleDateString()}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>

        {/* Purchase Summary Section - Enhanced for Large Carts */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>🛒 PURCHASE SUMMARY</Text>
          
          {/* Apply Multiplier to Cart Section */}
          <View style={styles.multiplierContainer}>
            <View style={styles.multiplierWrapper}>
              <View style={styles.multiplierHeader}>
                <Text style={styles.multiplierLabel}>APPLY MULTIPLIER TO CART:</Text>
                <Text style={styles.multiplierHint}>Enter expressions like 100*23 to multiply all items</Text>
              </View>
              <View style={styles.multiplierInputGroup}>
                <TextInput
                  style={[
                    styles.multiplierInput,
                    quantityMultiplier !== '1' && styles.multiplierInputActive
                  ]}
                  value={quantityMultiplier}
                  onChangeText={setQuantityMultiplier}
                  keyboardType="default"
                  placeholder="1 or 100*23"
                  placeholderTextColor="#6b7280"
                  selectTextOnFocus
                />
                <Text style={styles.multiplierX}>×</Text>
              </View>
              <View style={styles.multiplierExamples}>
                <Text style={styles.multiplierExamplesText}>Examples: 100, 50*2, 25+75, (10*10)+5</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.applyMultiplierButton, cart.length === 0 && styles.applyMultiplierButtonDisabled]}
              onPress={applyMultiplierToCart}
              disabled={cart.length === 0}
            >
              <Text style={styles.applyMultiplierText}>APPLY TO CART</Text>
            </TouchableOpacity>
          </View>
          
          {/* Cart Items */}
          <View style={styles.cartItems}>
            {cart.length === 0 ? (
              <Text style={styles.emptyCartText}>No items in cart</Text>
            ) : cart.length > 8 && !cartExpanded ? (
              /* Compact Summary View for Large Carts */
              <View style={styles.compactCartSummary}>
                <View style={styles.compactCartHeader}>
                  <Text style={styles.compactCartTitle}>📦 {cart.length} ITEMS IN CART</Text>
                  <TouchableOpacity 
                    style={styles.expandCartButton}
                    onPress={() => setCartExpanded(true)}
                  >
                    <Text style={styles.expandCartButtonText}>📋 VIEW DETAILS</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.compactCartItems}>
                  {cart.slice(0, 3).map((item) => {
                    const itemTotal = item.price_type === 'unit' 
                      ? item.price * item.quantity 
                      : item.price * (item.weight || 0);
                    
                    return (
                      <View key={item.id} style={styles.compactCartItem}>
                        <Text style={styles.compactCartItemName}>
                          {item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name}
                        </Text>
                        <Text style={styles.compactCartItemDetail}>
                          {item.price_type === 'unit' 
                            ? `×${item.quantity}`
                            : `${item.weight || 0}${item.price_type}`
                          } @ {formatCurrency(itemTotal)}
                        </Text>
                      </View>
                    );
                  })}
                  {cart.length > 3 && (
                    <Text style={styles.compactCartMoreItems}>+ {cart.length - 3} more items...</Text>
                  )}
                </View>
              </View>
            ) : (
              /* Detailed Cart View */
              <>
                {cart.length > 8 && (
                  <View style={styles.cartViewHeader}>
                    <Text style={styles.cartViewTitle}>📋 DETAILED VIEW ({cart.length} items)</Text>
                    <TouchableOpacity 
                      style={styles.collapseCartButton}
                      onPress={() => setCartExpanded(false)}
                    >
                      <Text style={styles.collapseCartButtonText}>🔼 COLLAPSE</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <ScrollView 
                  style={cart.length > 5 ? styles.cartItemsScroll : null}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                  maximumHeight={cart.length > 5 ? 200 : undefined}
                >
                  {cart.map((item) => {
                    const itemTotal = item.price_type === 'unit' 
                      ? item.price * item.quantity 
                      : item.price * (item.weight || 0);
                    
                    return (
                      <View key={item.id} style={styles.cartItem}>
                        <View style={styles.cartItemInfo}>
                          <Text style={styles.cartItemName}>{item.name}</Text>
                          <Text style={styles.cartItemPrice}>
                            {item.price_type === 'unit' 
                              ? `${formatCurrency(itemTotal)} x ${item.quantity}`
                              : `${formatCurrency(item.price)}/${item.price_type} x ${item.weight || 0} ${item.price_type} = ${formatCurrency(itemTotal)}`
                            }
                          </Text>
                        </View>
                        <View style={styles.cartItemControls}>
                          {item.price_type === 'unit' ? (
                            /* Unit product controls */
                            <>
                              <TouchableOpacity
                                style={styles.qtyButton}
                                onPress={() => updateQuantity(item.id, item.quantity - 1)}
                              >
                                <Text style={styles.qtyButtonText}>-</Text>
                              </TouchableOpacity>
                              <Text style={styles.qtyText}>{item.quantity}</Text>
                              <TouchableOpacity
                                style={styles.qtyButton}
                                onPress={() => updateQuantity(item.id, item.quantity + 1)}
                              >
                                <Text style={styles.qtyButtonText}>+</Text>
                              </TouchableOpacity>
                            </>
                          ) : (
                            /* Weighable product controls */
                            <>
                              <TextInput
                                style={styles.weightInput}
                                value={item.weight?.toString() || ''}
                                onChangeText={(text) => updateWeight(item.id, text)}
                                placeholder={`0.0`}
                                keyboardType="numeric"
                              />
                              <Text style={styles.unitLabel}>{item.price_type}</Text>
                            </>
                          )}
                          <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => removeFromCart(item.id)}
                          >
                            <Text style={styles.removeButtonText}>X</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              </>
            )}
          </View>

          {/* Total */}
          <View style={styles.totalSection}>
            <Text style={styles.totalLabel}>TOTAL:</Text>
            <Text style={styles.totalAmount}>
              {formatCurrency(getTotalAmount())}
            </Text>
          </View>

          {/* Payment Method - Multi-Currency Support */}
          <View style={styles.paymentSection}>
            <Text style={styles.paymentLabel}>💳 PAYMENT METHOD:</Text>
            
            {/* Currency Selection */}
            <View style={styles.currencySelection}>
              <Text style={styles.currencyLabel}>Select Currency:</Text>
              <View style={styles.currencyButtons}>
                <TouchableOpacity
                  style={[
                    styles.currencyButton,
                    selectedCurrency === 'USD' && styles.currencyButtonActive
                  ]}
                  onPress={() => setSelectedCurrency('USD')}
                >
                  <Text style={[
                    styles.currencyButtonText,
                    selectedCurrency === 'USD' && styles.currencyButtonTextActive
                  ]}>💵 USD</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.currencyButton,
                    selectedCurrency === 'ZIG' && styles.currencyButtonActive
                  ]}
                  onPress={() => setSelectedCurrency('ZIG')}
                >
                  <Text style={[
                    styles.currencyButtonText,
                    selectedCurrency === 'ZIG' && styles.currencyButtonTextActive
                  ]}>💰 ZIG</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.currencyButton,
                    selectedCurrency === 'RAND' && styles.currencyButtonActive
                  ]}
                  onPress={() => setSelectedCurrency('RAND')}
                >
                  <Text style={[
                    styles.currencyButtonText,
                    selectedCurrency === 'RAND' && styles.currencyButtonTextActive
                  ]}>💸 RAND</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Payment Method Selection */}
            <View style={styles.paymentMethodSection}>
              <Text style={styles.paymentMethodLabel}>Payment Type:</Text>
              <View style={styles.paymentButtons}>
                <TouchableOpacity
                  style={[
                    styles.paymentButton,
                    paymentMethod === 'cash' && styles.paymentButtonActive
                  ]}
                  onPress={() => {
                    setPaymentMethod('cash');
                    setTransferWallet('');
                    setCardLast4('');
                    setCardNetwork('');
                    setTransferReference('');
                  }}
                >
                  <Text style={styles.paymentButtonText}>💵 CASH</Text>
                  <Text style={styles.paymentButtonSubtext}>Pay with {selectedCurrency} cash</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.paymentButton,
                    paymentMethod === 'transfer' && styles.paymentButtonActive
                  ]}
                  onPress={() => {
                    setPaymentMethod('transfer');
                    setShowTransferWalletModal(true);
                  }}
                >
                  <Text style={styles.paymentButtonText}>📱 TRANSFER</Text>
                  <Text style={styles.paymentButtonSubtext}>
                    {transferWallet ? `${transferWallet} ${selectedCurrency}` : 'Bank/Wallet Transfer'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.paymentButton,
                    paymentMethod === 'card' && styles.paymentButtonActive
                  ]}
                  onPress={() => {
                    setPaymentMethod('card');
                    setTransferWallet('');
                    setTransferReference('');
                  }}
                >
                  <Text style={styles.paymentButtonText}>💳 CARD</Text>
                  <Text style={styles.paymentButtonSubtext}>
                    {cardLast4 ? `${cardNetwork} ****${cardLast4}` : 'Credit/Debit Card'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Card Details Input - Only show when card payment is selected */}
            {paymentMethod === 'card' && (
              <View style={styles.cardDetailsContainer}>
                <Text style={styles.cardDetailsLabel}>💳 CARD DETAILS:</Text>
                <Text style={styles.cardDetailsSubtext}>Select card network and enter last 4 digits</Text>
                
                {/* Card Network Selection */}
                <View style={styles.cardNetworkButtons}>
                  {cardNetworks.map((network) => (
                    <TouchableOpacity
                      key={network.id}
                      style={[
                        styles.cardNetworkButton,
                        cardNetwork === network.id && styles.cardNetworkButtonActive
                      ]}
                      onPress={() => setCardNetwork(network.id)}
                    >
                      <Text style={styles.cardNetworkButtonText}>{network.icon} {network.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                {/* Last 4 Digits Input */}
                <TextInput
                  style={styles.cardLast4Input}
                  value={cardLast4}
                  onChangeText={(text) => {
                    // Only allow numeric input, max 4 characters
                    const filtered = text.replace(/[^0-9]/g, '').slice(0, 4);
                    setCardLast4(filtered);
                  }}
                  keyboardType="numeric"
                  placeholder="Last 4 digits"
                  placeholderTextColor="#6b7280"
                  maxLength={4}
                />
              </View>
            )}
            
            {/* Transfer Details Input - Only show when transfer payment is selected */}
            {paymentMethod === 'transfer' && (
              <View style={styles.transferDetailsContainer}>
                <Text style={styles.transferDetailsLabel}>📱 TRANSFER DETAILS:</Text>
                <Text style={styles.transferDetailsSubtext}>
                  Selected: {transferWallet || 'None selected'}
                </Text>
                <TouchableOpacity
                  style={styles.changeWalletButton}
                  onPress={() => setShowTransferWalletModal(true)}
                >
                  <Text style={styles.changeWalletButtonText}>🔄 Change Wallet / Account</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.transferReferenceInput}
                  value={transferReference}
                  onChangeText={setTransferReference}
                  placeholder="Transfer Reference (optional)"
                  placeholderTextColor="#6b7280"
                />
              </View>
            )}
          </View>

          {/* Amount Received - Multi-Currency Support */}
          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>💵 {selectedCurrency} CASH PAYMENT:</Text>
            <TextInput
              style={styles.amountInput}
              value={amountReceived}
              onChangeText={setAmountReceived}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor="#8B4513"
            />

            {/* Show change */}
            {amountReceived && (
              <Text style={styles.changeText}>
                CHANGE: {formatCurrency(getChange())}
              </Text>
            )}
          </View>

          {/* Action Buttons */}
          <View>
            {/* System Status Indicator - Multi-Currency Support */}
            <View style={styles.automaticPrintIndicator}>
              <Text style={styles.automaticPrintText}>✨ SYSTEM READY</Text>
              <Text style={styles.automaticPrintSubtext}>
                💰 {selectedCurrency} Cash payments: Select currency, enter amount, process sale
              </Text>
            </View>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.clearCartButton]}
                onPress={clearCartWithConfirmation}
                disabled={cart.length === 0}
              >
                <Text style={[
                  styles.actionButtonText,
                  cart.length === 0 && styles.actionButtonTextDisabled
                ]}>
                  🗑️ CLEAR CART
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.refreshButton]}
                onPress={() => {
                  console.log('REFRESHING PRODUCTS...');
                  loadProducts();
                }}
              >
                <Text style={styles.actionButtonText}>REFRESH</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.voidButton]}
                onPress={voidSale}
              >
                <Text style={styles.actionButtonText}>VOID</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton, 
                  styles.saleButton,
                  (processingSale || cart.length === 0) && styles.saleButtonDisabled
                ]}
                onPress={() => {
                  console.log('SALE BUTTON CLICKED!', { cart, processingSale, cashierData });
                  processSale();
                }}
                disabled={processingSale || cart.length === 0}
              >
                <Text style={[
                  styles.actionButtonText,
                  (processingSale || cart.length === 0) && styles.actionButtonTextDisabled
                ]}>
                  {processingSale ? 'PROCESSING...' :
                   cart.length === 0 ? 'ADD ITEMS FIRST' :
                   !amountReceived ? 'ENTER CASH AMOUNT' :
                   'COMPLETE SALE'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Bottom spacing for web */}
      <View style={{ 
        height: Platform.OS === 'web' ? 50 : 20,
        backgroundColor: '#0a0a0a'
      }} />

      {/* Clear Cart Confirmation Modal */}
      {showClearCartModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.clearCartModalContainer}>
            <View style={styles.clearCartModalHeader}>
              <Text style={styles.clearCartModalIcon}>🗑️</Text>
              <Text style={styles.clearCartModalTitle}>Clear Cart</Text>
            </View>
            <View style={styles.clearCartModalBody}>
              <Text style={styles.clearCartModalMessage}>
                Are you sure you want to clear all items from the cart?
              </Text>
              <Text style={styles.clearCartModalWarning}>
                This action cannot be undone.
              </Text>
            </View>
            <View style={styles.clearCartModalButtons}>
              <TouchableOpacity
                style={styles.clearCartCancelButton}
                onPress={() => setShowClearCartModal(false)}
              >
                <Text style={styles.clearCartCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.clearCartConfirmButton}
                onPress={handleClearCartConfirm}
              >
                <Text style={styles.clearCartConfirmButtonText}>Clear Cart</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <View style={styles.modalOverlay}>
          <View style={[
            styles.errorModalContainer,
            errorModalData.type === 'warning' && styles.warningModal,
            errorModalData.type === 'success' && styles.successModal
          ]}>
            <View style={styles.errorModalHeader}>
              <Text style={[
                styles.errorModalIcon,
                errorModalData.type === 'warning' && styles.warningIcon,
                errorModalData.type === 'success' && styles.successIcon
              ]}>
                {errorModalData.type === 'warning' ? '⚠️' : 
                 errorModalData.type === 'success' ? '✅' : '❌'}
              </Text>
              <Text style={[
                styles.errorModalTitle,
                errorModalData.type === 'warning' && styles.warningTitle,
                errorModalData.type === 'success' && styles.successTitle
              ]}>
                {errorModalData.title}
              </Text>
            </View>
            <View style={styles.errorModalBody}>
              <Text style={styles.errorModalMessage}>
                {errorModalData.message}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.errorModalButton,
                errorModalData.type === 'warning' && styles.warningButton,
                errorModalData.type === 'success' && styles.successButton
              ]}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.errorModalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Transfer Wallet Selection Modal */}
      {showTransferWalletModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.transferWalletModalContainer}>
            <View style={styles.transferWalletModalHeader}>
              <View style={styles.transferWalletHeaderContent}>
                <Text style={styles.transferWalletModalTitle}>📱 SELECT PAYMENT METHOD</Text>
                <Text style={styles.transferWalletModalSubtitle}>
                  Choose how customer will pay
                </Text>
              </View>
              <TouchableOpacity
                style={styles.transferWalletModalCloseButton}
                onPress={() => {
                  setShowTransferWalletModal(false);
                  if (!transferWallet) {
                    setPaymentMethod('cash');
                  }
                }}
              >
                <Text style={styles.transferWalletModalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.transferWalletModalBody}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {/* ZIG Wallets Section */}
              <View style={styles.transferWalletSection}>
                <View style={styles.transferWalletSectionHeader}>
                  <Text style={styles.transferWalletSectionIcon}>💰</Text>
                  <Text style={styles.transferWalletSectionTitle}>ZIG CURRENCY</Text>
                </View>
                <View style={styles.transferWalletGridCompact}>
                  {transferWallets.filter(w => w.currency === 'ZIG').map((wallet) => (
                    <TouchableOpacity
                      key={wallet.id}
                      style={[
                        styles.transferWalletButtonCompact,
                        transferWallet === wallet.name && styles.transferWalletButtonActive
                      ]}
                      onPress={() => {
                        setTransferWallet(wallet.name);
                        setSelectedCurrency('ZIG');
                        setShowTransferWalletModal(false);
                      }}
                    >
                      <Text style={styles.transferWalletIconCompact}>{wallet.icon}</Text>
                      <Text style={styles.transferWalletNameCompact}>{wallet.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* USD Wallets Section */}
              <View style={styles.transferWalletSection}>
                <View style={styles.transferWalletSectionHeader}>
                  <Text style={styles.transferWalletSectionIcon}>💵</Text>
                  <Text style={styles.transferWalletSectionTitle}>USD CURRENCY</Text>
                </View>
                <View style={styles.transferWalletGridCompact}>
                  {transferWallets.filter(w => w.currency === 'USD').map((wallet) => (
                    <TouchableOpacity
                      key={wallet.id}
                      style={[
                        styles.transferWalletButtonCompact,
                        transferWallet === wallet.name && styles.transferWalletButtonActive
                      ]}
                      onPress={() => {
                        setTransferWallet(wallet.name);
                        setSelectedCurrency('USD');
                        setShowTransferWalletModal(false);
                      }}
                    >
                      <Text style={styles.transferWalletIconCompact}>{wallet.icon}</Text>
                      <Text style={styles.transferWalletNameCompact}>{wallet.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* RAND Wallets Section */}
              <View style={styles.transferWalletSection}>
                <View style={styles.transferWalletSectionHeader}>
                  <Text style={styles.transferWalletSectionIcon}>💸</Text>
                  <Text style={styles.transferWalletSectionTitle}>RAND CURRENCY</Text>
                </View>
                <View style={styles.transferWalletGridCompact}>
                  {transferWallets.filter(w => w.currency === 'RAND').map((wallet) => (
                    <TouchableOpacity
                      key={wallet.id}
                      style={[
                        styles.transferWalletButtonCompact,
                        transferWallet === wallet.name && styles.transferWalletButtonActive
                      ]}
                      onPress={() => {
                        setTransferWallet(wallet.name);
                        setSelectedCurrency('RAND');
                        setShowTransferWalletModal(false);
                      }}
                    >
                      <Text style={styles.transferWalletIconCompact}>{wallet.icon}</Text>
                      <Text style={styles.transferWalletNameCompact}>{wallet.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* Cards Section */}
              <View style={styles.transferWalletSection}>
                <View style={styles.transferWalletSectionHeader}>
                  <Text style={styles.transferWalletSectionIcon}>💳</Text>
                  <Text style={styles.transferWalletSectionTitle}>CARDS</Text>
                </View>
                <View style={styles.transferWalletGridCompact}>
                  {cardNetworks.map((network) => (
                    <TouchableOpacity
                      key={network.id}
                      style={[
                        styles.transferWalletButtonCompact,
                        transferWallet === `Card ${network.name}` && styles.transferWalletButtonActive
                      ]}
                      onPress={() => {
                        setTransferWallet(`Card ${network.name}`);
                        if (network.id === 'visa_zig') {
                          setSelectedCurrency('ZIG');
                        } else if (network.id === 'visa_rand') {
                          setSelectedCurrency('RAND');
                        } else {
                          setSelectedCurrency('USD');
                        }
                        setShowTransferWalletModal(false);
                      }}
                    >
                      <Text style={styles.transferWalletIconCompact}>{network.icon}</Text>
                      <Text style={styles.transferWalletNameCompact}>{network.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View style={styles.transferWalletModalFooterSpacer} />
            </ScrollView>
            
            <View style={styles.transferWalletModalFooter}>
              <TouchableOpacity
                style={styles.transferWalletCancelButton}
                onPress={() => {
                  setShowTransferWalletModal(false);
                  if (!transferWallet) {
                    setPaymentMethod('cash');
                  }
                }}
              >
                <Text style={styles.transferWalletCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Currency Modals Removed - USD Only */}

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={(result) => handleBarcodeScan(result.data)}
      />

      {/* Weight Input Modal for Weighable Products */}
      <WeightInputModal
        visible={showWeightModal}
        product={selectedProduct}
        weightInput={weightInput}
        setWeightInput={setWeightInput}
        onAdd={handleWeightAdd}
        onCancel={handleWeightCancel}
      />

      {/* Enhanced Retro 1990s Calculator Modal */}
      {showCalculator && (
        <View style={styles.calculatorModalOverlay}>
          <View style={styles.calculatorModalContainer}>
            <View style={styles.calculatorModalHeader}>
              <Text style={styles.calculatorModalTitle}>🧮 RETRO CALCULATOR</Text>
              <TouchableOpacity 
                style={styles.calculatorModalCloseButton}
                onPress={() => setShowCalculator(false)}
              >
                <Text style={styles.calculatorModalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {/* Memory Display */}
            <View style={styles.calculatorMemoryContainer}>
              <Text style={styles.calculatorMemoryText}>
                MEMORY: {calculatorMemory !== 0 ? calculatorMemory.toFixed(2) : 'EMPTY'}
              </Text>
            </View>
            
            <View style={styles.calculatorModalDisplayContainer}>
              <Text style={styles.calculatorFormulaText}>{calculatorFormula || 'Ready to calculate'}</Text>
              <Text style={styles.calculatorModalDisplay}>{calculatorDisplay}</Text>
            </View>
            
            <View style={styles.calculatorModalButtonsContainer}>
              {/* Memory Functions Row */}
              <View style={styles.calculatorModalRow}>
                <TouchableOpacity 
                  style={[styles.calculatorModalButton, styles.calculatorModalButtonMemory]} 
                  onPress={memoryClear}
                >
                  <Text style={styles.calculatorModalButtonText}>MC</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.calculatorModalButton, styles.calculatorModalButtonMemory]} 
                  onPress={memoryRecall}
                >
                  <Text style={styles.calculatorModalButtonText}>MR</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.calculatorModalButton, styles.calculatorModalButtonMemory]} 
                  onPress={memoryAdd}
                >
                  <Text style={styles.calculatorModalButtonText}>M+</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.calculatorModalButton, styles.calculatorModalButtonMemory]} 
                  onPress={memoryStore}
                >
                  <Text style={styles.calculatorModalButtonText}>MS</Text>
                </TouchableOpacity>
              </View>
              
              {/* Advanced Operations Row */}
              <View style={styles.calculatorModalRow}>
                <TouchableOpacity 
                  style={[styles.calculatorModalButton, styles.calculatorModalButtonAdvanced]} 
                  onPress={clearCalculator}
                >
                  <Text style={styles.calculatorModalButtonText}>C</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.calculatorModalButton, styles.calculatorModalButtonAdvanced]} 
                  onPress={clearEntry}
                >
                  <Text style={styles.calculatorModalButtonText}>CE</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.calculatorModalButton, styles.calculatorModalButtonAdvanced]} 
                  onPress={performSquare}
                >
                  <Text style={styles.calculatorModalButtonText}>x²</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.calculatorModalButton, styles.calculatorModalButtonAdvanced]} 
                  onPress={performSquareRoot}
                >
                  <Text style={styles.calculatorModalButtonText}>√</Text>
                </TouchableOpacity>
              </View>
              
              {/* More Advanced Operations Row */}
              <View style={styles.calculatorModalRow}>
                <TouchableOpacity 
                  style={[styles.calculatorModalButton, styles.calculatorModalButtonAdvanced]} 
                  onPress={toggleSign}
                >
                  <Text style={styles.calculatorModalButtonText}>±</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.calculatorModalButton, styles.calculatorModalButtonAdvanced]} 
                  onPress={reciprocal}
                >
                  <Text style={styles.calculatorModalButtonText}>1/x</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.calculatorModalButton, styles.calculatorModalButtonOperator]} 
                  onPress={() => inputOperation('%')}
                >
                  <Text style={styles.calculatorModalButtonText}>%</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.calculatorModalButton, styles.calculatorModalButtonOperator]} 
                  onPress={() => inputOperation('/')}
                >
                  <Text style={styles.calculatorModalButtonText}>÷</Text>
                </TouchableOpacity>
              </View>
              
              {/* Number Rows */}
              <View style={styles.calculatorModalRow}>
                <TouchableOpacity 
                  style={styles.calculatorModalButton} 
                  onPress={() => inputNumber('7')}
                >
                  <Text style={styles.calculatorModalButtonText}>7</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.calculatorModalButton} 
                  onPress={() => inputNumber('8')}
                >
                  <Text style={styles.calculatorModalButtonText}>8</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.calculatorModalButton} 
                  onPress={() => inputNumber('9')}
                >
                  <Text style={styles.calculatorModalButtonText}>9</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.calculatorModalButton, styles.calculatorModalButtonOperator]} 
                  onPress={() => inputOperation('*')}
                >
                  <Text style={styles.calculatorModalButtonText}>×</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.calculatorModalRow}>
                <TouchableOpacity 
                  style={styles.calculatorModalButton} 
                  onPress={() => inputNumber('4')}
                >
                  <Text style={styles.calculatorModalButtonText}>4</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.calculatorModalButton} 
                  onPress={() => inputNumber('5')}
                >
                  <Text style={styles.calculatorModalButtonText}>5</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.calculatorModalButton} 
                  onPress={() => inputNumber('6')}
                >
                  <Text style={styles.calculatorModalButtonText}>6</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.calculatorModalButton, styles.calculatorModalButtonOperator]} 
                  onPress={() => inputOperation('-')}
                >
                  <Text style={styles.calculatorModalButtonText}>-</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.calculatorModalRow}>
                <TouchableOpacity 
                  style={styles.calculatorModalButton} 
                  onPress={() => inputNumber('1')}
                >
                  <Text style={styles.calculatorModalButtonText}>1</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.calculatorModalButton} 
                  onPress={() => inputNumber('2')}
                >
                  <Text style={styles.calculatorModalButtonText}>2</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.calculatorModalButton} 
                  onPress={() => inputNumber('3')}
                >
                  <Text style={styles.calculatorModalButtonText}>3</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.calculatorModalButton, styles.calculatorModalButtonOperator]} 
                  onPress={() => inputOperation('+')}
                >
                  <Text style={styles.calculatorModalButtonText}>+</Text>
                </TouchableOpacity>
              </View>
              
              {/* Final Row */}
              <View style={styles.calculatorModalRow}>
                <TouchableOpacity 
                  style={[styles.calculatorModalButton, { flex: 2 }]} 
                  onPress={() => inputNumber('0')}
                >
                  <Text style={styles.calculatorModalButtonText}>0</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.calculatorModalButton} 
                  onPress={inputDecimal}
                >
                  <Text style={styles.calculatorModalButtonText}>.</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.calculatorModalButton, styles.calculatorModalButtonEquals]} 
                  onPress={performCalculation}
                >
                  <Text style={styles.calculatorModalButtonText}>=</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Cashier Sidebar */}
      {showSidebar && (
        <>
          {/* Backdrop */}
          <TouchableOpacity
            style={styles.sidebarBackdrop}
            activeOpacity={1}
            onPress={() => setShowSidebar(false)}
          />

          {/* Sidebar */}
          <Animated.View
            style={[
              styles.sidebar,
              {
                transform: [{ translateX: sidebarX }],
                width: SIDEBAR_WIDTH,
              },
            ]}
            {...panResponder.panHandlers}
          >
            {/* Sidebar Header */}
            <View style={styles.sidebarHeader}>
              <View style={styles.sidebarTitleContainer}>
                <Text style={styles.sidebarTitle}>💰 Cashier Tools</Text>
                <Text style={styles.sidebarSubtitle}>Quick Access Menu</Text>
              </View>
              <TouchableOpacity
                style={styles.sidebarCloseButton}
                onPress={() => setShowSidebar(false)}
              >
                <Text style={styles.sidebarCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Access Tools */}
            <ScrollView style={styles.sidebarFeaturesList} showsVerticalScrollIndicator={false}>
              <View style={styles.sidebarFeaturesSection}>
                <Text style={styles.sidebarSectionTitle}>🚀 QUICK ACCESS TOOLS</Text>
                {sidebarFeatures.filter(f => f.section === 'cashier-tools' && f.id !== 'drawer-status').map(renderSidebarFeatureItem)}
              </View>
            </ScrollView>

            {/* Sidebar Footer */}
            <View style={styles.sidebarFooter}>
              <Text style={styles.sidebarFooterText}>💡 Quick Tip</Text>
              <Text style={styles.sidebarFooterDescription}>
                Swipe from left edge or tap ☰ to open menu on mobile.
              </Text>
            </View>
          </Animated.View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a', // Deep black background
    ...Platform.select({
      web: {
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
      },
    }),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  loadingText: {
    color: '#e5e7eb', // Light gray
    marginTop: 16,
    fontSize: 18,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#111111', // Dark gray header
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    borderTopWidth: 1,
    borderTopColor: '#374151',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
    flex: 1,
  },
  headerTitle: {
    color: '#ffffff', // Pure white
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
  },
  headerSubtitle: {
    color: '#9ca3af', // Medium gray
    fontSize: 16,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
  },
  companyName: {
    color: '#3b82f6', // Bright blue
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
  },
  companyRole: {
    color: '#9ca3af', // Medium gray
    fontSize: 14,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
  },
  logoutButton: {
    backgroundColor: '#ef4444', // Modern red
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8, // Modern rounded corners
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutButtonText: {
    color: '#ffffff', // White text
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
  },

  // Presence Indicator Styles
  presenceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  presenceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  presenceDotOnline: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  presenceDotOffline: {
    backgroundColor: '#ef4444',
  },
  presenceText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
  },
  presenceActivityTime: {
    color: '#6b7280',
    fontSize: 10,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    marginLeft: 12,
  },
  
  // Shop Status Indicator Styles
  shopStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  shopStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  shopStatusText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
  },
  shopClosedNote: {
    color: '#ef4444',
    fontSize: 10,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    marginLeft: 8,
    fontStyle: 'italic',
  },

  // Enhanced Drawer Status Indicator Styles
  enhancedDrawerStatusContainer: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  


  // Compact Cashier Header Styles - REDUCED SIZE
  compactCashierHeader: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  compactHeaderContent: {
    alignItems: 'center',
  },
  compactTitleWithButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  headerRefreshButtonInline: {
    backgroundColor: '#3b82f6',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  inlineMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  inlineMenuButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 3,
  },
  compactHeaderTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
    marginHorizontal: 8,
  },
  compactStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    width: '100%',
  },
  compactStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactStatusLabel: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '600',
    marginRight: 3,
  },
  compactStatusValue: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  compactStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 4,
  },
  compactStatusText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '600',
  },

  showAllProductsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  showAllProductsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 0,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  showAllProductsButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginHorizontal: 12,
    textAlign: 'center',
  },
  showAllProductsSubtext: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },

  // Quick Products Styles - Products without Barcodes
  quickProductsContainer: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  quickProductsTitle: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  quickProductsSubtitle: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
  },
  quickProductsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickProductCard: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    width: '31%',
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  quickProductName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  quickProductPrice: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  quickProductCategory: {
    color: '#9ca3af',
    fontSize: 10,
    textAlign: 'center',
  },
  noQuickProductsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noQuickProductsText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  noQuickProductsSubtext: {
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  viewAllQuickProductsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#065f46',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  viewAllQuickProductsButtonText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  productsDisplayContainer: {
    flex: 1,
  },
  drawerStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  drawerStatusTitle: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  refreshDrawerButton: {
    backgroundColor: '#374151',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  refreshDrawerButtonText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
  },
  primaryDrawerMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  primaryMetricCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    width: '48%',
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  primaryMetricLabel: {
    color: '#9ca3af',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    textTransform: 'uppercase',
    marginBottom: 4,
    textAlign: 'center',
  },
  primaryMetricValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    textAlign: 'center',
  },
  varianceAlert: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  varianceAlertText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    textAlign: 'center',
  },
  paymentBreakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  paymentBreakdownItem: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 12,
    width: '31%',
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  paymentIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  paymentLabel: {
    color: '#9ca3af',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    textTransform: 'uppercase',
    marginBottom: 2,
    textAlign: 'center',
  },
  paymentValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    textAlign: 'center',
  },
  paymentLabelTotal: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    textTransform: 'uppercase',
    marginBottom: 2,
    textAlign: 'center',
  },
  paymentValueTotal: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    textAlign: 'center',
  },
  totalPaymentItem: {
    width: '100%',
    backgroundColor: '#1f2937',
    borderColor: '#10b981',
    borderWidth: 2,
  },
  performanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  performanceItem: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 12,
    width: '31%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  performanceLabel: {
    color: '#9ca3af',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    textTransform: 'uppercase',
    marginBottom: 4,
    textAlign: 'center',
  },
  performanceValue: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    textAlign: 'center',
  },
  drawerDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  drawerDetailsTitle: {
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    marginBottom: 8,
  },
  paymentBreakdown: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  breakdownLabel: {
    color: '#9ca3af',
    fontSize: 11,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
  },
  breakdownValue: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '500',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
  },
  totalBreakdownRow: {
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 4,
    marginTop: 2,
  },
  breakdownLabelTotal: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
  },
  breakdownValueTotal: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
  },
  sessionSales: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  salesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  salesLabel: {
    color: '#9ca3af',
    fontSize: 11,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
  },
  salesValue: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '500',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
  },
  eodExpectations: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 8,
  },
  expectationsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  expectationsLabel: {
    color: '#9ca3af',
    fontSize: 11,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
  },
  expectationsValue: {
    color: '#3b82f6',
    fontSize: 11,
    fontWeight: '500',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
  },
  drawerStatusNote: {
    color: '#6b7280',
    fontSize: 9,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Compact Sidebar Drawer Styles
  sidebarCompactMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sidebarCompactMetric: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  sidebarCompactLabel: {
    color: '#9ca3af',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    textTransform: 'uppercase',
  },
  sidebarCompactValue: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    marginTop: 4,
  },
  sidebarCompactSubtext: {
    color: '#6b7280',
    fontSize: 8,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    marginTop: 2,
  },
  sidebarCompactVariance: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
    alignItems: 'center',
  },
  sidebarVarianceLabel: {
    color: '#9ca3af',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
  },
  sidebarVarianceSubtext: {
    color: '#3b82f6',
    fontSize: 11,
    fontWeight: '500',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    marginTop: 4,
    textAlign: 'center',
  },

  topProductsContainer: {
    padding: 20,
    backgroundColor: '#0a0a0a',
  },
  topProductsTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  productsLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  productsLoadingText: {
    color: '#cccccc',
    marginLeft: 10,
    fontSize: 14,
  },
  productsList: {
    gap: 12,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  productRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  productCategory: {
    color: '#888888',
    fontSize: 12,
  },
  productStats: {
    alignItems: 'flex-end',
  },
  productSold: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  productRevenue: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noProductsContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noProductsText: {
    color: '#cccccc',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  noProductsSubtext: {
    color: '#888888',
    fontSize: 14,
    textAlign: 'center',
  },
  searchHelpTitle: {
    color: '#10b981',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  searchHelpText: {
    color: '#9ca3af',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  searchHelpSubtext: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  statsContainer: {
    padding: 20,
    backgroundColor: '#0a0a0a',
  },
  statsTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#333',
  },
  statValue: {
    color: '#22c55e',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#cccccc',
    fontSize: 12,
    textAlign: 'center',
  },
  actionsContainer: {
    padding: 20,
    backgroundColor: '#0a0a0a',
  },
  actionsTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  primaryAction: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: '#3b82f6',
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  actionSubtext: {
    color: '#999999',
    fontSize: 12,
    textAlign: 'center',
  },
  activityContainer: {
    padding: 20,
    backgroundColor: '#0a0a0a',
    flex: 1,
  },
  activityTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  activityCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityText: {
    color: '#999999',
    fontSize: 14,
    textAlign: 'center',
  },
  webScrollView: {
    ...Platform.select({
      web: {
        height: '100vh',
        maxHeight: '100vh',
      },
    }),
  },
  webContentContainer: {
    flexGrow: 1,
    minHeight: '100vh',
    paddingBottom: 100,
  },
  // Compact Vintage Border
  vintageBorder: {
    backgroundColor: '#111111',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    alignItems: 'center',
  },
  borderText: {
    color: '#9ca3af',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginVertical: 2,
  },

  // Inspirational Quote Styles
  inspirationalQuoteSection: {
    backgroundColor: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #06b6d4 100%)',
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#60a5fa',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    alignItems: 'center',
  },
  inspirationalQuoteText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    textAlign: 'center',
    marginBottom: 8,
    fontStyle: 'italic',
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  inspirationalQuoteAuthor: {
    color: '#bfdbfe',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    textAlign: 'center',
    marginBottom: 8,
  },
  quoteDecoration: {
    marginTop: 4,
  },
  quoteDecoText: {
    fontSize: 16,
    textAlign: 'center',
  },

  // POS Interface Styles - Dark Theme
  posContainer: {
    flex: 1,
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#0a0a0a',
    alignItems: 'flex-start',
  },
  productsSection: {
    flex: 3,
    backgroundColor: '#1a1a1a',
    marginRight: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  
  // Search and Filter Styles - Dark Theme
  searchFilterSection: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  searchContainer: {
    marginBottom: 15,
  },
  searchLabel: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    marginBottom: 8,
  },
  searchInput: {
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4b5563',
    padding: 12,
    fontSize: 16,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    color: '#ffffff',
    borderRadius: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barcodeContainer: {
    marginBottom: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  barcodeLabel: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    marginBottom: 8,
  },
  barcodeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barcodeInput: {
    backgroundColor: '#065f46',
    borderWidth: 2,
    borderColor: '#10b981',
    padding: 12,
    fontSize: 16,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    color: '#ffffff',
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  addBarcodeButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  addBarcodeButtonDisabled: {
    backgroundColor: '#6b7280',
    opacity: 0.6,
    shadowOpacity: 0,
  },
  addBarcodeButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    textAlign: 'center',
  },
  clearBarcodeButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginLeft: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearBarcodeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
  },
  barcodeHelpText: {
    color: '#10b981',
    fontSize: 11,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    marginTop: 6,
    fontStyle: 'italic',
  },

  categoryContainer: {
    marginBottom: 10,
  },
  categoryLabel: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    marginBottom: 8,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryButton: {
    backgroundColor: '#374151',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4b5563',
    minWidth: 70,
    alignItems: 'center',
  },
  categoryButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#2563eb',
  },
  categoryButtonText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
  },
  categoryButtonTextActive: {
    color: '#ffffff',
  },
  summarySection: {
    flex: 1.2,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    textAlign: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3b82f6',
    paddingBottom: 8,
  },
  productsList: {
    flex: 1,
  },
  
  // Enhanced Product Cards - Premium Dark Theme
  productsGrid: {
    flexDirection: 'column',
    gap: 16,
  },
  productCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#404040',
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  productCardHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
    paddingBottom: 16,
    marginBottom: 16,
  },
  productName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    marginBottom: 6,
  },
  productCode: {
    color: '#9ca3af',
    fontSize: 14,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    marginTop: 4,
  },
  productCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productInfo: {
    flex: 1,
  },
  productCategory: {
    color: '#9ca3af',
    fontSize: 13,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    marginBottom: 8,
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  productStock: {
    color: '#9ca3af',
    fontSize: 13,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    marginBottom: 6,
    fontWeight: '500',
  },
  outOfStock: {
    color: '#ef4444',
    fontWeight: '600',
  },
  negativeStock: {
    color: '#dc2626',
    fontWeight: '600',
  },
  productBarcodes: {
    marginTop: 6,
  },
  productBarcodeLabel: {
    color: '#9ca3af',
    fontSize: 12,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    fontWeight: '600',
    marginBottom: 2,
  },
  productBarcode: {
    color: '#6b7280',
    fontSize: 11,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    marginBottom: 1,
    lineHeight: 14,
  },
  productPriceSection: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  priceText: {
    color: '#10b981',
    fontSize: 24,
    fontWeight: '800',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    marginBottom: 16,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 0,
    alignItems: 'center',
    minWidth: 80,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonDisabled: {
    backgroundColor: '#6b7280',
    opacity: 0.6,
    shadowOpacity: 0,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
  },
  addButtonTextDisabled: {
    color: '#9ca3af',
  },
  productCardFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#404040',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardVintageBorder: {
    color: '#6b7280',
    fontSize: 10,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    textAlign: 'center',
  },
  stockIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  stockDotActive: {
    backgroundColor: '#10b981',
  },
  stockDotNegative: {
    backgroundColor: '#dc2626',
  },
  stockDotLow: {
    backgroundColor: '#f59e0b',
  },
  stockDotOut: {
    backgroundColor: '#ef4444',
  },
  noProductsContainer: {
    alignItems: 'center',
    padding: 30,
  },
  noProductsText: {
    color: '#9ca3af',
    fontSize: 16,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    textAlign: 'center',
  },
  cartItems: {
    flex: 1,
    marginBottom: 16,
  },
  emptyCartText: {
    color: '#9ca3af',
    fontSize: 16,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    textAlign: 'center',
    marginTop: 30,
  },
  cartItem: {
    backgroundColor: '#374151',
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    marginBottom: 4,
  },
  cartItemPrice: {
    color: '#9ca3af',
    fontSize: 12,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
  },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  qtyButton: {
    backgroundColor: '#3b82f6',
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    borderRadius: 6,
  },
  qtyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  qtyText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    minWidth: 30,
    textAlign: 'center',
  },
  weightInput: {
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4b5563',
    padding: 6,
    fontSize: 12,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    color: '#ffffff',
    borderRadius: 4,
    minWidth: 50,
    textAlign: 'center',
    marginHorizontal: 4,
  },
  unitLabel: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    marginLeft: 4,
  },
  removeButton: {
    backgroundColor: '#ef4444',
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderRadius: 6,
  },
  removeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  totalSection: {
    backgroundColor: '#1f2937',
    padding: 16,
    marginBottom: 16,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  totalLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
  },
  totalAmount: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
  },
  paymentSection: {
    marginBottom: 8,
  },
  currencySelection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#374151',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  currencyLabel: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  currencyButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  currencyButton: {
    flex: 1,
    backgroundColor: '#4b5563',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#6b7280',
    alignItems: 'center',
  },
  currencyButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#2563eb',
  },
  currencyButtonText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  currencyButtonTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  paymentMethodSection: {
    marginBottom: 16,
  },
  paymentMethodLabel: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  paymentLabel: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    marginBottom: 10,
  },
  paymentButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  paymentButton: {
    backgroundColor: '#374151',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4b5563',
    width: '48%',
    alignItems: 'center',
  },
  paymentButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#2563eb',
  },
  paymentButtonText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    textAlign: 'center',
  },
  paymentButtonSubtext: {
    color: '#6b7280',
    fontSize: 10,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    textAlign: 'center',
    marginTop: 2,
  },
  exchangeRateDisplay: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#10b981',
    alignItems: 'center',
  },
  exchangeRateText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    textAlign: 'center',
  },
  exchangeRateSubtext: {
    color: '#9ca3af',
    fontSize: 12,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    textAlign: 'center',
    marginTop: 4,
  },
  currentPaymentMethod: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#10b981',
    alignItems: 'center',
  },
  currentPaymentText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    textAlign: 'center',
    marginBottom: 8,
  },
  changeCurrencyButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  changeCurrencyText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    textAlign: 'center',
  },
  amountSection: {
    marginBottom: 12,
  },
  amountLabel: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    marginBottom: 10,
  },
  amountInput: {
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4b5563',
    padding: 12,
    fontSize: 16,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    color: '#ffffff',
    borderRadius: 8,
  },
  changeText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    marginTop: 8,
  },
  cardTotalText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    marginBottom: 12,
    textAlign: 'center',
  },
  paymentDetailsContainer: {
    marginBottom: 16,
  },
  paymentDetailsLabel: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    marginBottom: 8,
  },
  paymentDetailsInput: {
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4b5563',
    padding: 12,
    fontSize: 16,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    color: '#ffffff',
    borderRadius: 8,
  },
  receivedButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 0,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  receivedButtonSuccess: {
    backgroundColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  receivedButtonDisabled: {
    backgroundColor: '#6b7280',
    opacity: 0.7,
    shadowOpacity: 0,
  },
  receivedButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    textAlign: 'center',
  },

  // EcoCash Payment Verification Styles
  paymentStatusContainer: {
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#6b7280',
  },
  paymentStatusSuccess: {
    backgroundColor: '#22c55e',
    borderColor: '#16a34a',
  },
  paymentStatusError: {
    backgroundColor: '#ef4444',
    borderColor: '#dc2626',
  },
  paymentStatusTimeout: {
    backgroundColor: '#f59e0b',
    borderColor: '#d97706',
  },
  paymentStatusText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  paymentIdText: {
    color: '#e5e7eb',
    fontSize: 12,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Courier New, monospace' : 'Courier New',
  },
  timeoutButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  timeoutButton: {
    backgroundColor: '#6b7280',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  timeoutButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  ussdInstructions: {
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  ussdInstructionsTitle: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  ussdInstructionsText: {
    color: '#e5e7eb',
    fontSize: 12,
    marginBottom: 2,
    fontFamily: Platform.OS === 'web' ? 'Courier New, monospace' : 'Courier New',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '31%',
    paddingVertical: 10,
    marginBottom: 8,
    borderRadius: 6,
    borderWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 1,
  },
  clearCartButton: {
    backgroundColor: '#f97316',
  },
  refreshButton: {
    backgroundColor: '#3b82f6',
  },
  voidButton: {
    backgroundColor: '#ef4444',
  },
  saleButton: {
    backgroundColor: '#10b981',
  },
  saleButtonDisabled: {
    backgroundColor: '#6b7280',
    opacity: 0.6,
  },
  processingButton: {
    backgroundColor: '#6b7280',
    opacity: 0.7,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
  },
  actionButtonTextDisabled: {
    color: '#9ca3af',
  },
  automaticPrintIndicator: {
    backgroundColor: '#059669',
    padding: 8,
    marginBottom: 8,
    borderRadius: 6,
    borderWidth: 0,
    alignItems: 'center',
  },
  automaticPrintText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
  },
  automaticPrintSubtext: {
    color: '#ffffff',
    fontSize: 8,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    marginTop: 1,
    textAlign: 'center',
  },

  // Clear Cart Modal Styles
  clearCartModalContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 3,
    borderColor: '#f97316',
    alignSelf: 'center',
  },
  clearCartModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#4b5563',
  },
  clearCartModalIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  clearCartModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f97316',
    flex: 1,
    textAlign: 'left',
  },
  clearCartModalBody: {
    marginBottom: 24,
  },
  clearCartModalMessage: {
    fontSize: 16,
    color: '#ffffff',
    lineHeight: 24,
    textAlign: 'left',
    marginBottom: 8,
  },
  clearCartModalWarning: {
    fontSize: 14,
    color: '#f97316',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  clearCartModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  clearCartCancelButton: {
    backgroundColor: '#6b7280',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    flex: 1,
    marginRight: 8,
  },
  clearCartConfirmButton: {
    backgroundColor: '#f97316',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    flex: 1,
    marginLeft: 8,
  },
  clearCartCancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    textAlign: 'center',
  },
  clearCartConfirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    textAlign: 'center',
  },

  // Error Modal Styles - FIXED CENTERING
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: 20,
  },
  errorModalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    maxWidth: 420,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 3,
    borderColor: '#dc2626',
    alignSelf: 'center',
  },
  warningModal: {
    borderColor: '#f59e0b',
  },
  successModal: {
    borderColor: '#22c55e',
  },
  errorModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  errorModalIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  warningIcon: {
    color: '#f59e0b',
  },
  successIcon: {
    color: '#22c55e',
  },
  errorModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc2626',
    flex: 1,
    textAlign: 'left',
  },
  warningTitle: {
    color: '#f59e0b',
  },
  successTitle: {
    color: '#22c55e',
  },
  errorModalBody: {
    marginBottom: 24,
  },
  errorModalMessage: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    textAlign: 'left',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
  },
  errorModalButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  warningButton: {
    backgroundColor: '#f59e0b',
    shadowColor: '#f59e0b',
  },
  successButton: {
    backgroundColor: '#22c55e',
    shadowColor: '#22c55e',
  },
  errorModalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    textAlign: 'center',
  },

  // Sidebar Styles
  menuButton: {
    backgroundColor: '#374151',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 12,
    minWidth: 40,
    alignItems: 'center',
  },
  menuButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  sidebarBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  // Enhanced Sidebar Styles - Better Positioning
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#1a1a1a',
    borderRightWidth: 2,
    borderRightColor: '#10b981',
    zIndex: 1001,
    ...Platform.select({
      web: {
        boxShadow: '4px 0 20px rgba(0, 0, 0, 0.5)',
      },
    }),
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
    borderBottomWidth: 2,
    borderBottomColor: '#10b981',
    backgroundColor: '#111111',
  },
  sidebarTitleContainer: {
    flex: 1,
  },
  sidebarTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sidebarSubtitle: {
    color: '#999',
    fontSize: 12,
  },
  sidebarCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sidebarCloseButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sidebarDrawerSection: {
    backgroundColor: '#1f2937',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  sidebarDrawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sidebarDrawerTitle: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sidebarRefreshButton: {
    backgroundColor: '#374151',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    minWidth: 32,
    alignItems: 'center',
  },
  sidebarRefreshButtonText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
  },
  sidebarDrawerMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sidebarMetricCard: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 8,
    width: '48%',
    marginBottom: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  sidebarMetricLabel: {
    color: '#9ca3af',
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
    textAlign: 'center',
  },
  sidebarMetricValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  sidebarVarianceAlert: {
    borderRadius: 6,
    padding: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  sidebarVarianceAlertText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Currency breakdown styles for sidebar
  sidebarCurrencyBreakdown: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  sidebarPaymentTitle: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  sidebarCurrencySection: {
    backgroundColor: '#111827',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  sidebarCurrencyTitle: {
    color: '#3b82f6',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  sidebarCurrencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  sidebarCurrencyLabel: {
    color: '#9ca3af',
    fontSize: 10,
    fontWeight: '500',
  },
  sidebarCurrencyValue: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  sidebarPaymentBreakdown: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  sidebarPaymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  sidebarPaymentLabel: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '500',
  },
  sidebarPaymentValue: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  sidebarPaymentRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    marginTop: 4,
  },
  sidebarPaymentLabelTotal: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  sidebarPaymentValueTotal: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
  },
  // Currency sales breakdown styles for sidebar
  sidebarCurrencySalesBreakdown: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  sidebarCurrencySalesTitle: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  sidebarCurrencySalesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  sidebarCurrencySalesLabel: {
    color: '#e5e7eb',
    fontSize: 11,
    fontWeight: '600',
  },
  sidebarCurrencySalesValue: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
  },
  sidebarCurrencySalesRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    marginTop: 6,
  },
  sidebarCurrencySalesLabelTotal: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  sidebarCurrencySalesValueTotal: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
  },
  sidebarDrawerNote: {
    color: '#6b7280',
    fontSize: 9,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  sidebarFeaturesList: {
    flex: 1,
    padding: 16,
  },
  sidebarFeaturesSection: {
    marginBottom: 24,
  },
  sidebarSectionTitle: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  sidebarFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  sidebarFeatureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sidebarFeatureIconText: {
    fontSize: 16,
  },
  sidebarFeatureContent: {
    flex: 1,
  },
  sidebarFeatureTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  sidebarFeatureDescription: {
    color: '#999',
    fontSize: 10,
  },
  sidebarFeatureArrow: {
    color: '#666',
    fontSize: 14,
    marginLeft: 8,
  },
  sidebarFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: '#0f0f0f',
  },
  sidebarFooterText: {
    color: '#22c55e',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sidebarFooterDescription: {
    color: '#999',
    fontSize: 10,
    lineHeight: 14,
  },

  // Enhanced Cart Styles for Large Carts
  compactCartSummary: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  compactCartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  compactCartTitle: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
  },
  expandCartButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  expandCartButtonText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  compactCartItems: {
    marginBottom: 8,
  },
  compactCartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    paddingVertical: 2,
  },
  compactCartItemName: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  compactCartItemDetail: {
    color: '#9ca3af',
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'right',
  },
  compactCartMoreItems: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  cartViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#374151',
    borderRadius: 6,
  },
  cartViewTitle: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
  },
  collapseCartButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  collapseCartButtonText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  cartItemsScroll: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 6,
  },

  // Enhanced Products Styles for Large Search Results
  compactProductsSummary: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  compactProductsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  compactProductsTitle: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '700',
  },
  expandProductsButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  expandProductsButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  compactProductsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  compactProductCard: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 8,
    width: '31%',
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  compactProductName: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  compactProductPrice: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  compactProductCategory: {
    color: '#9ca3af',
    fontSize: 9,
    textAlign: 'center',
  },
  compactProductsMore: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#111827',
    borderRadius: 8,
    marginTop: 8,
  },
  compactProductsMoreText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  compactProductsMoreSubtext: {
    color: '#9ca3af',
    fontSize: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  productsViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#374151',
    borderRadius: 8,
  },
  productsViewTitle: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '700',
  },
  collapseProductsButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  collapseProductsButtonText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  productsListScroll: {
    maxHeight: 400,
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 8,
  },

  // Retro 1990s Calculator Styles - Enhanced Modal Version
  inlineCalculatorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6b7280',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  calculatorButtonActive: {
    backgroundColor: '#10b981',
  },
  inlineCalculatorButtonText: {
    color: '#ffffff',
    fontSize: 16,
    marginRight: 4,
  },
  inlineCalculatorButtonLabel: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  
  // Modal Calculator Styles
  calculatorModalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  calculatorModalContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    width: 400,
    maxWidth: '90vw',
    overflow: 'hidden',
  },
  calculatorModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#10b981',
  },
  calculatorModalTitle: {
    color: '#10b981',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'Courier New, monospace' : 'Courier New',
  },
  calculatorModalCloseButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  calculatorModalCloseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  calculatorMemoryContainer: {
    backgroundColor: '#111111',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  calculatorMemoryText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Courier New, monospace' : 'Courier New',
    textAlign: 'right',
  },
  calculatorModalDisplayContainer: {
    backgroundColor: '#0a0a0a',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#374151',
  },
  calculatorFormulaText: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Courier New, monospace' : 'Courier New',
    textAlign: 'right',
    marginBottom: 8,
    minHeight: 20,
  },
  calculatorModalDisplay: {
    color: '#10b981',
    fontSize: 36,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'Courier New, monospace' : 'Courier New',
    textAlign: 'right',
    letterSpacing: 3,
  },
  calculatorModalButtonsContainer: {
    padding: 20,
  },
  calculatorModalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calculatorModalButton: {
    backgroundColor: '#4b5563',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#6b7280',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  calculatorModalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Courier New, monospace' : 'Courier New',
  },
  calculatorModalButtonOperator: {
    backgroundColor: '#f59e0b',
    borderColor: '#d97706',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  calculatorModalButtonEquals: {
    backgroundColor: '#10b981',
    borderColor: '#059669',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  calculatorModalButtonAdvanced: {
    backgroundColor: '#8b5cf6',
    borderColor: '#7c3aed',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  calculatorModalButtonMemory: {
    backgroundColor: '#06b6d4',
    borderColor: '#0891b2',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },

  // NEURAL CASHIER HEADER STYLES - GEN 2080 INTERFACE
  neuralCashierHeader: {
    backgroundColor: '#000000',
    padding: 0,
    borderBottomWidth: 2,
    borderBottomColor: '#00ffff',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  neuralHeaderBackground: {
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderWidth: 1,
    borderColor: '#00ffff',
    borderRadius: 0,
    padding: 0,
  },
  neuralHeaderContent: {
    padding: 20,
    paddingTop: 30,
  },
  neuralTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  neuralMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: '#00ffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  neuralCalculatorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 2,
    borderColor: '#8b5cf6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  neuralButtonActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    borderColor: '#a855f7',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  neuralButtonGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderRadius: 12,
  },
  neuralButtonText: {
    color: '#00ffff',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  neuralCalculatorIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  neuralTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  neuralGeneration: {
    color: '#00ffff',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 3,
    textShadowColor: '#00ffff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  neuralSubtitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  neuralCashierName: {
    color: '#00ffff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textShadowColor: '#00ffff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
  neuralScanner: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#00ffff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  neuralScannerText: {
    color: '#00ffff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  neuralStatusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderWidth: 1,
    borderColor: '#00ffff',
    borderRadius: 12,
    padding: 16,
  },
  neuralStatusCard: {
    flex: 1,
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: '#00ffff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  neuralStatusLabel: {
    color: '#00ffff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
    textAlign: 'center',
  },
  neuralStatusValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  neuralOnline: {
    color: '#00ff00',
    textShadowColor: '#00ff00',
    textShadowOffset: { width: 0, height: 0 },
  },
  neuralOffline: {
    color: '#ff4444',
    textShadowColor: '#ff4444',
    textShadowOffset: { width: 0, height: 0 },
  },
  neuralPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00ffff',
    marginTop: 4,
  },
  neuralPulseOnline: {
    backgroundColor: '#00ff00',
  },
  neuralPulseOffline: {
    backgroundColor: '#ff4444',
  },
  neuralRefreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: '#00ffff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
    marginLeft: 8,
  },
  neuralRefreshText: {
    color: '#00ffff',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Business Hours Display Styles
  neuralBusinessHoursCard: {
    flex: 1,
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: '#00ffff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  neuralBusinessHoursLabel: {
    color: '#00ffff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
    textAlign: 'center',
  },
  neuralBusinessHoursValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  neuralBusinessHoursTimezone: {
    color: '#9ca3af',
    fontSize: 8,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
    fontStyle: 'italic',
  },

  // Exchange Rates Display Styles
  exchangeRatesContainer: {
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: '#00ffff',
    borderRadius: 8,
    padding: 12,
    margin: 8,
    alignItems: 'center',
  },
  exchangeRatesTitle: {
    color: '#00ffff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: 'center',
  },
  exchangeRateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4,
  },
  exchangeRateLabel: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  exchangeRateValue: {
    color: '#00ff88',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'Courier New, monospace' : 'Courier New',
  },
  exchangeRatesLoading: {
    color: '#ffaa00',
    fontSize: 10,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  exchangeRatesError: {
    color: '#ff4444',
    fontSize: 10,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  exchangeRateRefreshButton: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#00ffff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 8,
    alignItems: 'center',
  },
  exchangeRateRefreshText: {
    color: '#00ffff',
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  // Additional Neural Interface Styles
  neuralStatusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderWidth: 1,
    borderColor: '#00ffff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  neuralStatusCard: {
    flex: 1,
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: '#00ffff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  neuralStatusLabel: {
    color: '#00ffff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
    textAlign: 'center',
  },
  neuralStatusValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  neuralOnline: {
    color: '#00ff00',
    textShadowColor: '#00ff00',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  neuralOffline: {
    color: '#ff0040',
    textShadowColor: '#ff0040',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  neuralPulse: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
    opacity: 0.3,
  },
  neuralPulseOnline: {
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
  },
  neuralPulseOffline: {
    backgroundColor: 'rgba(255, 0, 64, 0.1)',
  },
  neuralRefreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: '#00ffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
    marginLeft: 8,
  },
  neuralRefreshText: {
    color: '#00ffff',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  
  // Neural Currency Card Styles - Larger Display
  neuralCurrencyCard: {
    flex: 2,
    backgroundColor: 'rgba(0, 255, 255, 0.08)',
    borderWidth: 2,
    borderColor: '#00ffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 70,
  },
  neuralCurrencyLabel: {
    color: '#00ffff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    textAlign: 'center',
  },
  neuralCurrencyValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  neuralRatesText: {
    color: '#00ff88',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    textShadowColor: '#00ff88',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },

  // Currency Status Display Styles
  currencyStatusContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  currencyStatusTitle: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  currencyStatusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  currencyStatusCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 2,
  },
  currencyStatusLabel: {
    color: '#00ffff',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  currencyStatusValue: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  currencyStatusSubtext: {
    color: '#9ca3af',
    fontSize: 8,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 1,
  },
  
  // Multiplier Styles
  multiplierContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  multiplierWrapper: {
    flexDirection: 'column',
    flex: 1,
  },
  multiplierHeader: {
    flexDirection: 'column',
    marginBottom: 6,
  },
  multiplierLabel: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  multiplierHint: {
    color: '#10b981',
    fontSize: 9,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  multiplierInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  multiplierInput: {
    backgroundColor: '#1f2937',
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4b5563',
    width: 100,
    textAlign: 'center',
  },
  multiplierInputActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#2563eb',
  },
  multiplierX: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  multiplierExamples: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#4b5563',
  },
  multiplierExamplesText: {
    color: '#6b7280',
    fontSize: 8,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  applyMultiplierButton: {
    backgroundColor: '#10b981',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  applyMultiplierButtonDisabled: {
    backgroundColor: '#6b7280',
    opacity: 0.6,
    shadowOpacity: 0,
  },
  applyMultiplierText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Currency Modal Styles
  currencyModalContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 3,
    borderColor: '#10b981',
    alignSelf: 'center',
  },
  currencyModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#4b5563',
  },
  currencyModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10b981',
    flex: 1,
    textAlign: 'left',
  },
  currencyModalCloseButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  currencyModalCloseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  currencyModalBody: {
    marginBottom: 24,
  },
  currencyModalSubtitle: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  currencyOptions: {
    marginBottom: 20,
  },
  currencyOption: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#4b5563',
    alignItems: 'center',
  },
  currencyOptionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  currencyOptionName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  currencyOptionDesc: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
  },
  currencyModalRates: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  currencyModalRatesTitle: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  currencyModalRate: {
    color: '#e5e7eb',
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'center',
  },

  // Transfer Wallet Modal Styles
  transferWalletModalContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 0,
    maxWidth: 450,
    width: '95%',
    maxHeight: '85vh',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 2,
    borderColor: '#3b82f6',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  transferWalletModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 20,
    backgroundColor: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
    borderBottomWidth: 0,
  },
  transferWalletHeaderContent: {
    flex: 1,
  },
  transferWalletModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  transferWalletModalSubtitle: {
    fontSize: 12,
    color: '#bfdbfe',
  },
  transferWalletModalCloseButton: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 25,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transferWalletModalCloseButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  transferWalletModalBody: {
    flex: 1,
    padding: 12,
    backgroundColor: '#111827',
  },
  transferWalletSection: {
    marginBottom: 12,
  },
  transferWalletSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  transferWalletSectionIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  transferWalletSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#60a5fa',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  transferWalletGridCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  transferWalletButtonCompact: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 12,
    width: '31%',
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#374151',
    minHeight: 70,
  },
  transferWalletButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#60a5fa',
  },
  transferWalletIconCompact: {
    fontSize: 22,
    marginBottom: 6,
  },
  transferWalletNameCompact: {
    color: '#e5e7eb',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 12,
  },
  transferWalletModalFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#111827',
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  transferWalletModalFooterSpacer: {
    height: 16,
  },
  transferWalletCancelButton: {
    backgroundColor: '#4b5563',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 140,
  },
  transferWalletCancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Legacy styles kept for reference (can be removed later)
  transferWalletGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  transferWalletButton: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4b5563',
  },
  transferWalletButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#2563eb',
  },
  transferWalletIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  transferWalletName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  transferWalletCurrency: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  // Card Details Styles
  cardDetailsContainer: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  cardDetailsLabel: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  cardDetailsSubtext: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  cardNetworkButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardNetworkButton: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    width: '48%',
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  cardNetworkButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#2563eb',
  },
  cardNetworkButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardLast4Input: {
    backgroundColor: '#374151',
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: 'bold',
  },

  // Transfer Details Styles
  transferDetailsContainer: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  transferDetailsLabel: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  transferDetailsSubtext: {
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '600',
  },
  changeWalletButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  changeWalletButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  transferReferenceInput: {
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#ffffff',
  },
});

export default CashierDashboardScreen;
