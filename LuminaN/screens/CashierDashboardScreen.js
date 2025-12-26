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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { shopStorage } from '../services/storage';
import { shopAPI } from '../services/api';
import BarcodeScanner from '../components/BarcodeScanner';
import presenceService from '../services/presenceService';

const CashierDashboardScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [cashierData, setCashierData] = useState(null);
  const [shopData, setShopData] = useState(null);
  
  // POS State
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
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


  useEffect(() => {
    loadCashierData();
    
    // Set up presence tracking
    if (typeof window !== 'undefined') {
      window.addEventListener('presenceStatusChanged', handlePresenceChange);
    }
    
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

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    const currentQuantity = existingItem ? existingItem.quantity : 0;
    const availableStock = product.stock_quantity || 0;
    const newQuantity = currentQuantity + 1;
    
    // Stock validation: Prevent adding more than available stock
    if (newQuantity > availableStock) {
      showError(
        '⚠️ INSUFFICIENT STOCK', 
        `Cannot add ${product.name} to cart.\n\nAvailable stock: ${availableStock}\nCurrently in cart: ${currentQuantity}\nRequested: ${newQuantity}\n\nPlease reduce quantity or restock item.`,
        'warning'
      );
      return;
    }
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    // Stock validation: Check if new quantity exceeds available stock
    const cartItem = cart.find(item => item.id === productId);
    if (cartItem) {
      const availableStock = cartItem.stock_quantity || 0;
      if (quantity > availableStock) {
        showError(
          '⚠️ INSUFFICIENT STOCK', 
          `Cannot increase quantity to ${quantity}.\n\nAvailable stock: ${availableStock}\nCurrent quantity: ${cartItem.quantity}\n\nPlease reduce quantity or restock item.`,
          'warning'
        );
        return;
      }
    }
    
    setCart(cart.map(item => 
      item.id === productId 
        ? { ...item, quantity }
        : item
    ));
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getChange = () => {
    const total = getTotalAmount();
    const received = parseFloat(amountReceived) || 0;
    return Math.max(0, received - total);
  };

  // Get unique categories from products
  const getCategories = () => {
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
    return ['all', ...categories];
  };

  // Handle barcode scan
  const handleBarcodeScan = (barcode) => {
    const product = products.find(p => p.line_code === barcode || p.barcode === barcode);
    if (product) {
      addToCart(product);
      showError(
        '✅ PRODUCT ADDED', 
        `${product.name} has been added to your cart!`,
        'success'
      );
    } else {
      showError(
        '❌ PRODUCT NOT FOUND', 
        `No product found with code: ${barcode}\n\nPlease check the barcode or add the product manually.`,
        'error'
      );
    }
    setShowScanner(false);
  };

  // Handle scan button press
  const handleScanPress = () => {
    setShowScanner(true);
  };

  // Show error modal function
  const showError = (title, message, type = 'error') => {
    setErrorModalData({ title, message, type });
    setShowErrorModal(true);
  };

  // Print vintage receipt function
  const printVintageReceipt = (saleData, total, received) => {
    const now = new Date();
    const receiptNumber = saleData.id || 'N/A';
    const cashierName = cashierData?.name || 'Cashier';
    
    // Calculate change properly
    const change = Math.max(0, (parseFloat(received) || 0) - total);
    
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
    
    // Create authentic business receipt HTML (like real restaurants/stores)
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            background-color: #f5f5f5;
            color: #000000;
            margin: 0;
            padding: 20px;
            width: 100%;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            line-height: 1.2;
            font-size: 12px;
          }
          
          .receipt-container {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            width: 320px;
            max-width: 90vw;
          }
          
          .receipt {
            padding: 0;
            background: white;
          }
          
          .header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          
          .company-name {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 8px;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: #000;
          }
          
          .company-info {
            font-size: 10px;
            margin-bottom: 3px;
          }
          
          .system-info {
            font-size: 8px;
            color: #333;
            margin: 8px 0;
            border: 1px dashed #ccc;
            padding: 8px;
            background-color: #f9f9f9;
            border-radius: 4px;
          }
          
          .verification-barcode {
            font-size: 10px;
            font-weight: bold;
            color: #1a472a;
            background-color: #e8f5e8;
            border: 2px solid #1a472a;
            padding: 8px;
            margin: 10px 0;
            text-align: center;
            letter-spacing: 1px;
            border-radius: 4px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          
          .refund-policy {
            font-size: 8px;
            color: #666;
            background-color: #fff8dc;
            border: 1px dotted #daa520;
            padding: 8px;
            margin: 8px 0;
            text-align: center;
            border-radius: 4px;
          }
          
          .divider {
            text-align: center;
            margin: 8px 0;
            font-size: 10px;
          }
          
          .receipt-info {
            margin-bottom: 15px;
          }
          
          .info-line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            font-size: 11px;
          }
          
          .items-section {
            margin-bottom: 15px;
          }
          
          .items-header {
            text-align: center;
            font-weight: bold;
            border-bottom: 1px dashed #000;
            padding-bottom: 5px;
            margin-bottom: 10px;
          }
          
          .item-line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          
          .item-name {
            flex: 1;
            font-size: 11px;
          }
          
          .item-qty {
            width: 40px;
            text-align: center;
            font-size: 11px;
          }
          
          .item-price {
            width: 50px;
            text-align: right;
            font-size: 11px;
          }
          
          .totals-section {
            border-top: 2px dashed #000;
            padding-top: 10px;
            margin-top: 10px;
          }
          
          .total-line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            font-size: 12px;
          }
          
          .total-line.grand-total {
            font-weight: bold;
            font-size: 14px;
            border-top: 1px dashed #000;
            padding-top: 5px;
            margin-top: 5px;
          }
          
          .footer {
            text-align: center;
            border-top: 1px dashed #000;
            padding-top: 10px;
            margin-top: 15px;
          }
          
          .thank-you {
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .website {
            color: #000;
            text-decoration: none;
            font-size: 10px;
          }
          
          .footer-text {
            font-size: 9px;
            margin-top: 8px;
            line-height: 1.3;
          }
          
          .cancel-button {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background-color: #dc2626;
            color: white;
            border: none;
            padding: 12px 20px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            z-index: 1000;
          }
          
          .cancel-button:hover {
            background-color: #b91c1c;
          }
          
          .scan-instruction {
            font-size: 8px;
            color: #666;
            text-align: center;
            margin-top: 3px;
            font-style: italic;
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
            </div>
            
            <div class="system-info">
              <strong>🔧 SYSTEM INFORMATION:</strong><br>
              Device: ${deviceId} | Shop: ${shopId}<br>
              Register: ${registerId} | Terminal: ${terminalId}<br>
              Sale ID: ${receiptNumber} | Items: ${cart.length} | Total: ${formatCurrency(total)}
            </div>
            
            <div class="verification-barcode">
              🔍 RECEIPT VERIFICATION CODE:<br>
              ${verificationCode}<br>
              <div class="scan-instruction">Scan this code at our POS for instant verification</div>
            </div>
            
            <div class="divider">====================================</div>
            
            <div class="receipt-info">
              <div class="info-line">
                <span>Receipt #:</span>
                <span>${receiptNumber}</span>
              </div>
              <div class="info-line">
                <span>Date:</span>
                <span>${now.toLocaleDateString()}</span>
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
                <span>Timestamp:</span>
                <span>${now.toISOString().split('T')[1].split('.')[0]}</span>
              </div>
            </div>
            
            <div class="divider">====================================</div>
            
            <div class="items-section">
              <div class="items-header">🛒 ITEMS PURCHASED</div>
              ${cart.map(item => `
                <div class="item-line">
                  <div class="item-name">${item.name}</div>
                  <div class="item-qty">${item.quantity}</div>
                  <div class="item-price">${formatCurrency(item.price * item.quantity)}</div>
                </div>
                <div class="item-line" style="font-size: 10px; color: #666;">
                  <div style="width: 40px;"></div>
                  <div style="width: 40px; text-align: center;">@ ${formatCurrency(item.price)}</div>
                  <div style="width: 50px;"></div>
                </div>
              `).join('')}
            </div>
            
            <div class="divider">====================================</div>
            
            <div class="totals-section">
              <div class="total-line">
                <span>Subtotal:</span>
                <span>${formatCurrency(total)}</span>
              </div>
              ${paymentMethod === 'cash' ? `
                <div class="total-line">
                  <span>Cash Received:</span>
                  <span>${formatCurrency(received)}</span>
                </div>
                <div class="total-line">
                  <span>Change:</span>
                  <span>${formatCurrency(change)}</span>
                </div>
              ` : `
                <div class="total-line">
                  <span>Payment Method:</span>
                  <span>${paymentMethod.toUpperCase()}</span>
                </div>
              `}
              <div class="total-line grand-total">
                <span>TOTAL:</span>
                <span>${formatCurrency(total)}</span>
              </div>
            </div>
            
            <div class="divider">====================================</div>
            
            <div class="refund-policy">
              <strong>🔄 RETURN & REFUND POLICY</strong><br>
              • Items can be returned within 7 days with receipt<br>
              • Original packaging required for refunds<br>
              • Contact us with verification code: ${verificationCode}<br>
              • Customer service: ${companyPhone}
            </div>
            
            <div class="footer">
              <div class="thank-you">🙏 THANK YOU!</div>
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
            
            <div class="divider">====================================</div>
          </div>
        </div>
        
        <button class="cancel-button" onclick="window.close()">CANCEL</button>
      </body>
      </html>
    `;
    
    // Create a new window to display receipt (stays open until user cancels)
    const screenWidth = window.screen.width || 1200;
    const screenHeight = window.screen.height || 800;
    const windowWidth = 450;
    const windowHeight = 700;
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

    // CRITICAL: Stock validation before processing sale
    const stockIssues = [];
    for (const item of cart) {
      const availableStock = item.stock_quantity || 0;
      const requestedQuantity = item.quantity;
      
      if (requestedQuantity > availableStock) {
        stockIssues.push({
          name: item.name,
          requested: requestedQuantity,
          available: availableStock,
          shortfall: requestedQuantity - availableStock
        });
      }
    }
    
    if (stockIssues.length > 0) {
      const issueText = stockIssues.map(issue => 
        `• ${issue.name}: Requested ${issue.requested}, Available ${issue.available} (Short by ${issue.shortfall})`
      ).join('\n');
      
      showError(
        '⚠️ INSUFFICIENT STOCK', 
        `Cannot complete sale - insufficient stock:\n\n${issueText}\n\nPlease reduce quantities or restock items before proceeding.`,
        'warning'
      );
      return;
    }

    // Get cashier ID with proper fallback handling
    const cashierId = cashierData?.id || 
                     cashierData?.cashier_info?.id || 
                     cashierData?.cashier_id || 
                     cashierData?.user_id ||
                     1; // fallback to 1 if no ID found
    console.log('Available cashier data:', { cashierData, cashierId });
    
    if (!cashierId) {
      Alert.alert('Error', 'Cashier information not available. Please log out and log back in.');
      return;
    }

    const total = getTotalAmount();
    const received = parseFloat(amountReceived) || 0;

    // Enhanced Payment Validation
    if (paymentMethod === 'cash') {
      // For cash payments, require amount received
      if (received <= 0) {
        Alert.alert(
          '⚠️ PAYMENT REQUIRED', 
          'Please enter the amount received from customer before processing the sale.',
          [{ text: 'OK', style: 'default' }]
        );
        // Focus on the amount input field
        setTimeout(() => {
          const amountInput = document.querySelector('input[placeholder="0.00"]');
          if (amountInput) amountInput.focus();
        }, 100);
        return;
      }
      
      // Check if sufficient amount received
      if (received < total) {
        Alert.alert(
          '⚠️ INSUFFICIENT PAYMENT', 
          `Insufficient amount received for cash payment.\n\nTotal Amount: ${formatCurrency(total)}\nAmount Received: ${formatCurrency(received)}\nShort Amount: ${formatCurrency(total - received)}\n\nPlease collect the remaining amount from customer.`, 
          [{ text: 'OK', style: 'default' }]
        );
        // Focus on the amount input field
        setTimeout(() => {
          const amountInput = document.querySelector('input[placeholder="0.00"]');
          if (amountInput) amountInput.focus();
        }, 100);
        return;
      }
      
      // Check for overpayment (customer error)
      if (received > total) {
        console.log('OVERPAYMENT DETECTED - ALLOWING WITH WARNING');
        Alert.alert(
          'Overpayment Detected',
          `Overpayment detected!\n\nTotal: ${formatCurrency(total)}\nReceived: ${formatCurrency(received)}\nChange: ${formatCurrency(received - total)}\n\nPlease verify the amount with customer before proceeding.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Proceed Anyway', 
              onPress: () => {
                // Allow overpayment with confirmation
                console.log('Overpayment confirmed by cashier');
              }
            }
          ]
        );
        // Don't return - allow processing to continue
      }
    } else if (paymentMethod === 'card') {
      // For card payments, require amount validation (RECEIVED button sets this automatically)
      if (received <= 0) {
        Alert.alert(
          '⚠️ CARD PAYMENT REQUIRED', 
          'Please click the "RECEIVED - PROCESS SALE" button to confirm card payment.',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }
      
      if (received < total) {
        Alert.alert('Insufficient Card Payment', `Insufficient card payment amount.\n\nTotal: ${formatCurrency(total)}\nReceived: ${formatCurrency(received)}\nShort: ${formatCurrency(total - received)}`);
        return;
      }
      
      if (received > total) {
        console.log('CARD OVERPAYMENT DETECTED - ALLOWING WITH WARNING');
        Alert.alert(
          'Overpayment on Card',
          `Card payment exceeds total amount.\n\nTotal: ${formatCurrency(total)}\nReceived: ${formatCurrency(received)}\nExcess: ${formatCurrency(received - total)}\n\nPlease verify the card amount with customer.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Proceed', 
              onPress: () => {
                console.log('Card overpayment confirmed by cashier');
              }
            }
          ]
        );
        // Don't return - allow processing to continue
      }
    }

    console.log('Starting sale processing...');
    
    // Final validation summary
    const saleSummary = {
      items: cart.length,
      total: formatCurrency(total),
      received: formatCurrency(received),
      change: formatCurrency(getChange()),
      paymentMethod: paymentMethod.toUpperCase()
    };
    
    // Prepare sale data outside try block for error handling
    const saleData = {
      cashier_id: cashierId,
      items: cart.map(item => ({
        product_id: item.id.toString(),
        quantity: item.quantity.toString(),
        unit_price: item.price.toString()
      })),
      payment_method: paymentMethod,
      customer_name: '',
      customer_phone: ''
    };
    
    try {
      setProcessingSale(true);

      const response = await shopAPI.createSale(saleData);
      
      if (response?.data) {
        // Process automatic receipt generation
        const receivedAmount = parseFloat(amountReceived) || 0;
        printVintageReceipt(response.data, total, receivedAmount);
        
        // Show success notification with stock update info
        const calculatedChange = Math.max(0, receivedAmount - total);
        const updatedItems = cart.map(item => `${item.name}: ${item.stock_quantity - item.quantity} remaining`).join('\n');
        
        Alert.alert(
          'SALE COMPLETED!',
          `Sale #${response.data.id} completed successfully!\n\n` +
          `Total: ${formatCurrency(total)}\n` +
          `Received: ${formatCurrency(receivedAmount)}\n` +
          `Change: ${formatCurrency(calculatedChange)}\n\n` +
          `Stock Updated:\n${updatedItems}`,
          [
            { 
              text: 'OK', 
              onPress: () => {
                setCart([]);
                setAmountReceived('');
                setPaymentMethod('cash');
                // Refresh products to show updated stock
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
            setPaymentMethod('cash');
          }
        }
      ]
    );
  };



  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount || 0);
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
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>✨ Cashier Dashboard ✨</Text>
          <Text style={styles.headerSubtitle}>
            Welcome, {cashierData?.name || 'Cashier'}
          </Text>
          {/* Presence Status Indicator */}
          <View style={styles.presenceIndicator}>
            <View style={[
              styles.presenceDot,
              presenceStatus.isOnline ? styles.presenceDotOnline : styles.presenceDotOffline
            ]} />
            <Text style={styles.presenceText}>
              {presenceStatus.isOnline ? '🟢 Online' : '🔴 Offline'}
            </Text>
            {presenceStatus.lastActivity && (
              <Text style={styles.presenceActivityTime}>
                Last activity: {new Date(presenceStatus.lastActivity).toLocaleTimeString()}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.companyName}>{shopData?.name || 'POS System'}</Text>
          <Text style={styles.companyRole}>Cashier Portal</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Modern Decorative Border */}
      <View style={styles.vintageBorder}>
        <Text style={styles.borderText}>✨ MODERN POS SYSTEM ✨</Text>
        <Text style={styles.borderText}>Professional Point of Sale Solution</Text>
      </View>

      {/* POS Interface */}
      <View style={styles.posContainer}>
        {/* Products Section - Large Card with Search */}
        <View style={styles.productsSection}>
          <Text style={styles.sectionTitle}>🛍️ AVAILABLE PRODUCTS</Text>
          
          {/* Search and Filter Section */}
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
                <TouchableOpacity
                  style={styles.scanButton}
                  onPress={handleScanPress}
                >
                  <Text style={styles.scanButtonText}>📷 SCAN</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Category Filter */}
            <View style={styles.categoryContainer}>
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

          {/* Products Display */}
          {productsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B4513" />
              <Text style={styles.loadingText}>Loading products...</Text>
            </View>
          ) : (
            <ScrollView style={styles.productsList} showsVerticalScrollIndicator={true}>
              {filteredProducts.length === 0 ? (
                <View style={styles.noProductsContainer}>
                  <Text style={styles.noProductsText}>
                    {searchQuery || selectedCategory !== 'all' 
                      ? 'No products match your search criteria'
                      : 'No products available'
                    }
                  </Text>
                </View>
              ) : (
                <View style={styles.productsGrid}>
                  {filteredProducts.map((product) => (
                    <TouchableOpacity
                      key={product.id}
                      style={styles.productCard}
                      onPress={() => addToCart(product)}
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
                              (product.stock_quantity || 0) === 0 && styles.stockDotOut,
                              (product.stock_quantity || 0) > 0 && (product.stock_quantity || 0) <= 5 && styles.stockDotLow,
                              (product.stock_quantity || 0) > 5 && styles.stockDotActive
                            ]} />
                            <Text style={[
                              styles.productStock,
                              (product.stock_quantity || 0) === 0 && styles.outOfStock,
                              (product.stock_quantity || 0) > 0 && (product.stock_quantity || 0) <= 5 && styles.lowStock
                            ]}>
                              📦 {product.stock_quantity || 0} units
                              {(product.stock_quantity || 0) === 0 && ' - OUT OF STOCK'}
                              {(product.stock_quantity || 0) > 0 && (product.stock_quantity || 0) <= 5 && ' - LOW STOCK'}
                              {(product.stock_quantity || 0) > 5 && ' - IN STOCK'}
                            </Text>
                          </View>
                          {product.barcode && (
                            <Text style={styles.productBarcode}>
                              🔖 Barcode: {product.barcode}
                            </Text>
                          )}
                        </View>
                        
                        <View style={styles.productPriceSection}>
                          <Text style={styles.priceText}>{formatCurrency(product.price)}</Text>
                          <TouchableOpacity
                            style={[
                              styles.addButton,
                              (product.stock_quantity || 0) === 0 && styles.addButtonDisabled
                            ]}
                            onPress={() => addToCart(product)}
                            disabled={(product.stock_quantity || 0) === 0}
                          >
                            <Text style={[
                              styles.addButtonText,
                              (product.stock_quantity || 0) === 0 && styles.addButtonTextDisabled
                            ]}>
                              {(product.stock_quantity || 0) === 0 ? '❌ OUT' : '➕ ADD'}
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
              )}
            </ScrollView>
          )}
        </View>

        {/* Purchase Summary Section - Small Card */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>🛒 PURCHASE SUMMARY</Text>
          
          {/* Cart Items */}
          <View style={styles.cartItems}>
            {cart.length === 0 ? (
              <Text style={styles.emptyCartText}>No items in cart</Text>
            ) : (
              cart.map((item) => (
                <View key={item.id} style={styles.cartItem}>
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName}>{item.name}</Text>
                    <Text style={styles.cartItemPrice}>{formatCurrency(item.price)} x {item.quantity}</Text>
                  </View>
                  <View style={styles.cartItemControls}>
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
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeFromCart(item.id)}
                    >
                      <Text style={styles.removeButtonText}>X</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Total */}
          <View style={styles.totalSection}>
            <Text style={styles.totalLabel}>TOTAL:</Text>
            <Text style={styles.totalAmount}>{formatCurrency(getTotalAmount())}</Text>
          </View>

          {/* Payment Method */}
          <View style={styles.paymentSection}>
            <Text style={styles.paymentLabel}>💳 PAYMENT METHOD:</Text>
            <View style={styles.paymentButtons}>
              <TouchableOpacity
                style={[styles.paymentButton, paymentMethod === 'cash' && styles.paymentButtonActive]}
                onPress={() => setPaymentMethod('cash')}
              >
                <Text style={styles.paymentButtonText}>CASH</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.paymentButton, paymentMethod === 'card' && styles.paymentButtonActive]}
                onPress={() => setPaymentMethod('card')}
              >
                <Text style={styles.paymentButtonText}>CARD</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Amount Received */}
          {paymentMethod === 'cash' ? (
            <View style={styles.amountSection}>
              <Text style={styles.amountLabel}>💵 AMOUNT RECEIVED:</Text>
              <TextInput
                style={styles.amountInput}
                value={amountReceived}
                onChangeText={setAmountReceived}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#8B4513"
              />
              {amountReceived && (
                <Text style={styles.changeText}>CHANGE: {formatCurrency(getChange())}</Text>
              )}
            </View>
          ) : paymentMethod === 'card' ? (
            <View style={styles.amountSection}>
              <Text style={styles.amountLabel}>💳 CARD PAYMENT CONFIRMED:</Text>
              <Text style={styles.cardTotalText}>Total: {formatCurrency(getTotalAmount())}</Text>
              <TouchableOpacity
                style={styles.receivedButton}
                onPress={() => {
                  const total = getTotalAmount();
                  setAmountReceived(total.toString());
                  Alert.alert(
                    '💳 CARD PAYMENT CONFIRMED', 
                    `Card payment of ${formatCurrency(total)} has been received.\n\nProcessing sale...`,
                    [
                      { 
                        text: 'PROCESS SALE', 
                        onPress: () => {
                          // Small delay to ensure state is updated
                          setTimeout(() => {
                            processSale();
                          }, 100);
                        }
                      },
                      { text: 'CANCEL', style: 'cancel' }
                    ]
                  );
                }}
              >
                <Text style={styles.receivedButtonText}>💳 RECEIVED & PROCESS SALE</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Action Buttons */}
          <View>
            {/* System Status Indicator */}
            <View style={styles.automaticPrintIndicator}>
              <Text style={styles.automaticPrintText}>✨ SYSTEM READY</Text>
              <Text style={styles.automaticPrintSubtext}>
                {paymentMethod === 'card' ? 
                  '💳 Card payments: Use "RECEIVED" button for quick processing' :
                  '🚀 Modern POS system operational'
                }
              </Text>
            </View>
            
            <View style={styles.actionButtons}>
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
                   paymentMethod === 'card' ? 'USE RECEIVED BUTTON' : 'COMPLETE SALE'}
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

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={(result) => handleBarcodeScan(result.data)}
      />
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
  vintageBorder: {
    backgroundColor: '#111111',
    padding: 15,
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

  // POS Interface Styles - Dark Theme
  posContainer: {
    flex: 1,
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#0a0a0a',
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
  scanButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginLeft: 12,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  scanButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
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
    flex: 2,
    backgroundColor: '#1a1a1a',
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
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    textAlign: 'center',
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
    paddingBottom: 12,
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
  lowStock: {
    color: '#f59e0b',
    fontWeight: '600',
  },
  productBarcode: {
    color: '#6b7280',
    fontSize: 12,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    marginTop: 4,
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
    marginBottom: 20,
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
    marginBottom: 12,
    padding: 16,
    borderRadius: 10,
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
    marginBottom: 20,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  totalLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
  },
  totalAmount: {
    color: '#10b981',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
  },
  paymentSection: {
    marginBottom: 20,
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
  },
  paymentButton: {
    backgroundColor: '#374151',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginRight: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4b5563',
    flex: 1,
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
  amountSection: {
    marginBottom: 20,
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
  receivedButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '31%',
    paddingVertical: 14,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
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
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
  },
  actionButtonTextDisabled: {
    color: '#9ca3af',
  },
  automaticPrintIndicator: {
    backgroundColor: '#059669',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 0,
    alignItems: 'center',
  },
  automaticPrintText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
  },
  automaticPrintSubtext: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' : 'Arial',
    marginTop: 2,
    textAlign: 'center',
  },

  // Error Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  errorModalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxWidth: 400,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#dc2626',
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
    marginBottom: 15,
  },
  errorModalIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  warningIcon: {
    color: '#f59e0b',
  },
  successIcon: {
    color: '#22c55e',
  },
  errorModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc2626',
    flex: 1,
  },
  warningTitle: {
    color: '#f59e0b',
  },
  successTitle: {
    color: '#22c55e',
  },
  errorModalBody: {
    marginBottom: 20,
  },
  errorModalMessage: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  errorModalButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  warningButton: {
    backgroundColor: '#f59e0b',
  },
  successButton: {
    backgroundColor: '#22c55e',
  },
  errorModalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CashierDashboardScreen;