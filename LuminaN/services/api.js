import axios from 'axios';

// API Configuration - Production ready
const getApiBaseUrl = () => {
  // Detect the environment and use appropriate API URL
  if (typeof window !== 'undefined') {
    // Web environment
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // Use current host for development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:8000/api/v1/shop`;
    }
    
    // Use current host for production
    return `${protocol}//${hostname}/api/v1/shop`;
  }
  
  // Fallback for other environments
  return 'http://localhost:8000/api/v1/shop';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Add response interceptor for network error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      // Network error (timeout, no connection, etc.)
      const errorMessage = error.code === 'ECONNABORTED' 
        ? 'Cannot connect to server. Please check if the development server is running and the IP address is correct.'
        : 'Network connection failed. Please check your internet connection and try again.';
      throw new Error(errorMessage);
    }
    return Promise.reject(error);
  }
);

export const shopAPI = {
  checkStatus: () => api.get('/status/'),
  register: (data) => api.post('/register/', data),
  loginOwner: (data) => api.post('/login/', data),
  loginCashier: (data) => api.post('/cashiers/login/', data),
  resetPassword: (data) => api.post('/reset-password/', data),
  retrieveCredentials: (data) => api.post('/retrieve-credentials/', data),
  resetCashierPassword: (data) => api.post('/cashiers/reset-password/', data),
  getOwnerDashboard: () => api.get('/dashboard/'),
  getShopStatus: () => api.get('/shop-status/'),
  updateShop: (data) => api.patch('/update/', data),
  
  // Staff management methods - NO AUTHENTICATION REQUIRED
  registerCashier: (data) => api.post('/cashiers/', data),
  registerCashierSelf: (data) => api.post('/cashiers/register/', data), // Self-registration endpoint
  getPendingStaff: (data) => api.post('/staff/pending/', {}), // No credentials needed
  getApprovedStaff: (data) => api.post('/staff/approved/', {}), // No credentials needed
  approveStaff: (data) => api.post('/staff/approve/', data),
  rejectStaff: (data) => api.post('/staff/reject/', data),
  deactivateCashier: (data) => api.post('/staff/deactivate/', data),
  deleteCashier: (data) => api.post('/staff/delete/', data),
  getInactiveStaff: (data) => api.post('/staff/inactive/', {}), // No credentials needed
  reactivateCashier: (data) => api.post('/staff/reactivate/', data),
  getCashierDetails: (data) => api.post('/staff/details/', data),
  editCashier: (data) => api.post('/staff/edit/', data),


  
  // Product management methods
  getProducts: () => api.get('/products/'),
  addProduct: (data) => api.post('/products/', data),
  updateProduct: (productId, data) => api.patch(`/products/${productId}/`, data),
  deleteProduct: (productId, data) => api.delete(`/products/${productId}/`, { data }),
  delistProduct: (productId, data) => api.put(`/products/${productId}/`, data),
  relistProduct: (productId, data) => api.post(`/products/${productId}/`, data),
  getProductsByCategory: (category) => api.get(`/products/bulk/?category=${encodeURIComponent(category)}`),
  lookupBarcode: (barcode) => api.get(`/products/barcode-lookup/?barcode=${encodeURIComponent(barcode)}`),
  
  // Product Splitting methods
  validateProductSplit: (data, config = {}) => api.post('/product-splits/validate_split/', data, config),
  createSplitProduct: (data, config = {}) => api.post('/product-splits/create_split_product/', data, config),
  
  // Sales methods
  createSale: (data) => api.post('/sales/', data),
  getSales: () => api.get('/sales/'),
  getSale: (saleId) => api.get(`/sales/${saleId}/`),
  
  // Inventory audit trail methods
  getAuditTrail: () => api.get('/audit-trail/'),
  getProductAuditHistory: (productId) => api.get(`/products/${productId}/audit-history/`),
  getCustomEndpoint: (endpoint, authData) => {
    const config = {};
    if (authData) {
      config.headers = {
        'Authorization': `Basic ${btoa(`${authData.email}:${authData.password}`)}`
      };
    }
    return api.get(endpoint, config);
  },
  
  // Anonymous endpoint method (no authentication required)
  getAnonymousEndpoint: (endpoint) => api.get(endpoint),
  
  // Inventory management methods
  receiveInventory: (data) => api.post('/inventory/receive/', data),
  adjustInventory: (productId, data) => api.post(`/products/${productId}/adjust/`, data),
  stockTake: (data) => api.post('/inventory/stocktake/', data),
  
  // Enhanced receiving methods
  getSuppliers: () => api.get('/suppliers/'),
  getReceivingHistory: () => api.get('/inventory/receiving/history/'),
  submitBatchReceiving: (data) => api.post('/inventory/receiving/batch/', data),
  
  // Purchase Order methods
  getPurchaseOrders: () => api.get('/purchase-orders/'),
  createPurchaseOrder: (data) => api.post('/purchase-orders/', data),
  updatePurchaseOrder: (orderId, data) => api.patch(`/purchase-orders/${orderId}/`, data),
  
  // Founder super admin methods
  founderLogin: (data) => api.post('/founder/login/', data),
  getAllShops: (data) => api.post('/founder/shops/', data),
  getFounderShopDashboard: (data) => api.post('/founder/shops/dashboard/', data),
  resetShopPassword: (data) => api.post('/founder/shops/reset-password/', data),
  
  // Debug method to check API connectivity
  testConnection: async () => {
    try {
      const response = await api.get('/status/');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // Debug method to test cashier login endpoint
  testCashierLogin: async (data) => {
    try {
      const response = await api.post('/cashiers/login/', data);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message, status: error.response?.status, details: error.response?.data };
    }
  },
  
  // Debug method to test cashier reset endpoint
  testCashierReset: async (data) => {
    try {
      const response = await api.post('/cashiers/reset-password/', data);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message, status: error.response?.status, details: error.response?.data };
    }
  },
  
  // Stock Transfer methods
  findProductForTransfer: (data, config = {}) => api.post('/stock-transfers/find_product/', data, config),
  validateTransfer: (data, config = {}) => api.post('/stock-transfers/validate_transfer/', data, config),
  createTransfer: (data, config = {}) => api.post('/stock-transfers/', data, config),
  confirmTransfer: (data, config = {}) => api.post('/stock-transfers/confirm_transfer/', data, config),
  getTransfers: (config = {}) => api.get('/stock-transfers/', config),

  // Waste/Wastage management methods
  getWastes: (config = {}) => api.get('/wastes/', config),
  createWaste: (data, config = {}) => api.post('/wastes/', data, config),
  getWasteSummary: (config = {}) => api.get('/wastes/summary/', config),
  searchWasteProduct: (data, config = {}) => api.post('/wastes/product-search/', data, config),
  
  // Waste Batch management methods
  createWasteBatch: (data, config = {}) => api.post('/waste-batches/', data, config),
  getWasteBatches: (config = {}) => api.get('/waste-batches/', config),
  getWasteBatchDetail: (batchId, config = {}) => api.get(`/waste-batches/${batchId}/`, config),
  addWasteToBatch: (batchId, data, config = {}) => api.post(`/waste-batches/${batchId}/`, data, config),
  updateWasteBatch: (batchId, data, config = {}) => api.patch(`/waste-batches/${batchId}/`, data, config),

  // Shop Day Management methods
  getShopStatus: () => api.get('/shop-status/'),
  startDay: (data) => api.post('/start-day/', data),
  endDay: (data) => api.post('/end-day/', data),

  // Cash Float Management methods
  getCashFloat: () => api.get('/cash-float/'),
  setCashFloat: (data) => api.post('/cash-float/', data),
  activateDrawer: (cashierId) => api.post('/cash-float/activate/', { cashier_id: cashierId }),
  addDrawerSale: (cashierId, amount, paymentMethod) => api.post('/cash-float/sale/', {
    cashier_id: cashierId,
    amount: amount,
    payment_method: paymentMethod
  }),

  settleDrawer: (cashierId, actualCashCounted) => api.post('/cash-float/settle/', {
    cashier_id: cashierId,
    actual_cash_counted: actualCashCounted
  }),
  resetAllDrawersAtEOD: () => api.post('/cash-float/reset-all/'),
  emergencyResetAllDrawers: (confirmToken = 'EMERGENCY_RESET_CONFIRMED') => api.post('/cash-float/emergency-reset/', { confirm_token: confirmToken }),
  getAllDrawersStatus: () => api.get('/cash-float/all-status/'),

  getSalesHistory: (config = {}) => api.get('/sales-history/', config),
  getSaleDetails: (saleId, config = {}) => api.get(`/sales/${saleId}/`, config),
  
  // Real Sales Analytics for Dashboard
  getSalesAnalytics: (config = {}) => api.get('/sales-analytics/', config),
  getSalesSummary: (config = {}) => api.get('/sales/summary/', config),
  getRecentSales: (config = {}) => api.get('/sales/recent/', config),
  getSalesMetrics: (config = {}) => api.get('/sales/metrics/', config),

  // Enhanced EOD Reconciliation methods
  getEnhancedReconciliation: (cacheBuster = '') => {
    const url = cacheBuster ? `/reconciliation/enhanced/${cacheBuster}` : '/reconciliation/enhanced/';
    return api.get(url);
  },
  getCashierCount: (cashierId, date, config = {}) => api.get(`/reconciliation/count/?cashier_id=${cashierId}&date=${date}`, config),
  saveCashierCount: (countData, config = {}) => api.post('/reconciliation/count/', countData, config),
  getReconciliationSession: (date, config = {}) => api.get(`/reconciliation/session/?date=${date}`, config),
  startReconciliationSession: (data, config = {}) => api.post('/reconciliation/session/', { ...data, action: 'start' }, config),
  completeReconciliationSession: (data, config = {}) => api.post('/reconciliation/session/', { ...data, action: 'complete' }, config),

  // Stock Take methods - NO AUTHENTICATION REQUIRED
  createStockTake: (data) => api.post('/stock-takes/', data),
  bulkAddStockTakeItems: (stockTakeId, data) => api.post(`/stock-takes/${stockTakeId}/items/bulk/`, data),
  completeStockTake: (stockTakeId) => api.patch(`/stock-takes/${stockTakeId}/`, { action: 'complete' }),
  
  // Public product access - NO AUTHENTICATION REQUIRED  
  getPublicProducts: () => api.get('/products/'),
  
  // Staff Lunch methods
  createStaffLunch: (data) => api.post('/staff-lunch/', data),
  getStaffLunchHistory: (params = '') => {
    const queryParams = params ? `?${params}` : '';
    return api.get(`/staff-lunch/${queryParams}`);
  },
  
  // Money Lunch - Deduct from drawer
  deductMoneyFromDrawer: (data) => api.post('/staff-lunch/deduct-money/', data),
  
  // Product Lunch - Deduct from stock
  deductProductFromStock: (data) => api.post('/staff-lunch/deduct-product/', data),

  // Exchange Rate Management methods
  getExchangeRates: () => api.get('/exchange-rates/'),
  updateExchangeRates: (data) => api.post('/exchange-rates/', data),
  getExchangeRateHistory: () => api.get('/exchange-rates/history/'),
  convertCurrency: (params) => api.get('/exchange-rates/convert/', { params }),
  setCurrentRates: (data) => api.post('/exchange-rates/set-current/', data),

  // Multi-Currency Wallet methods
  getWalletSummary: () => api.get('/wallet/summary/'),
  getWalletTransactions: (params = '') => {
    const queryParams = params ? `?${params}` : '';
    return api.get(`/wallet/transactions/${queryParams}`);
  },
  createWalletAdjustment: (data) => api.post('/wallet/adjustment/', data),

  // Drawer Access Control methods
  grantDrawerAccess: (data) => api.post('/drawer-access/grant/', data),
  revokeDrawerAccess: (data) => api.post('/drawer-access/revoke/', data),
  getDrawerAccessStatus: (cashierId) => api.get(`/drawer-access/status/?cashier_id=${cashierId}`),
  checkDrawerAccess: (cashierId) => api.post('/cash-float/drawer-access/check/', { cashier_id: cashierId }),
  updateDrawerAccess: (cashierId, drawerAccess) => api.post('/cash-float/drawer-access/update/', { 
    cashier_id: cashierId, 
    drawer_access: drawerAccess 
  }),
  
  // NEW: Today's drawer endpoint - fetches ONLY today's sales for drawer display
  getCashierDrawerToday: (cashierId) => api.get(`/cash-float/drawer-today/?cashier_id=${cashierId}`),
  
  // NEW: Session drawer endpoint - fetches ONLY current session sales (shop open/close aware)
  getCashierDrawerSession: (cashierId) => api.get(`/cash-float/drawer-session/?cashier_id=${cashierId}`),
  
  // NEW: All drawers session endpoint - fetches session-aware data for ALL cashiers (shop open/close aware)
  getAllDrawersSession: (cacheBuster = '') => {
    const url = cacheBuster ? `/cash-float/all-drawers-session/${cacheBuster}` : '/cash-float/all-drawers-session/';
    return api.get(url);
  },
  
  // DELETE TODAY'S SALES - Owner only endpoint to start fresh
  deleteTodaySales: (data = {}, config = {}) => api.post('/delete-today-sales/', data, config),
  
  // DELETE TODAY'S STAFF LUNCH RECORDS - for EOD process
  deleteTodayStaffLunch: (data = {}, config = {}) => api.post('/delete-today-staff-lunch/', data, config),

  // ALL SALES HISTORY - Never affected by EOD deletion
  getAllSalesHistory: (config = {}) => api.get('/all-sales-history/', config),

  // ALL CASHIER SALES HISTORY - Never affected by EOD deletion - for Cashier My Sales screen
  getAllCashierSales: (cashierId = null, cashierIdentifier = null, config = {}) => {
    let url = '/all-cashier-sales/';
    const params = [];
    if (cashierId) params.push(`cashier_id=${cashierId}`);
    if (cashierIdentifier) params.push(`cashier_identifier=${encodeURIComponent(cashierIdentifier)}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    return api.get(url, config);
  },
  
  // Business Settings methods - for managing business hours, timezone, and VAT
  getBusinessSettings: (config = {}) => api.get('/business-settings/', config),
  updateBusinessSettings: (data, config = {}) => api.patch('/business-settings/', data, config),
};

// Export apiService as alias for shopAPI for backwards compatibility
export const apiService = shopAPI;

// Export getApiBaseUrl for use in components
export { getApiBaseUrl };

export default api;
