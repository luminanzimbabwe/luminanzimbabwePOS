# LuminaN POS API Endpoints - Testing Guide

## Base URL
```
https://luminanzimbabwepos.onrender.com/api/v1/shop/
```

## 🔍 Health Check & Status
```bash
# Health Check (for sync system) - FIXED: Moved to top of URL patterns
# NOTE: Requires code push to Render for server restart
curl -X GET "https://luminanzimbabwepos.onrender.com/api/v1/shop/health/"

# Shop Status Check (WORKING NOW - test this first)
curl -X GET "https://luminanzimbabwepos.onrender.com/api/v1/shop/status/"
```

## 👤 Authentication Endpoints
```bash
# Shop Owner Login
curl -X POST "https://luminanzimbabwepos.onrender.com/api/v1/shop/login/" \
  -H "Content-Type: application/json" \
  -d '{"email": "your_shop_email", "password": "your_password"}'

# Cashier Login  
curl -X POST "https://luminanzimbabwepos.onrender.com/api/v1/shop/cashiers/login/" \
  -H "Content-Type: application/json" \
  -d '{"name": "cashier_name", "password": "cashier_password"}'

# Retrieve Credentials
curl -X POST "https://luminanzimbabwepos.onrender.com/api/v1/shop/retrieve-credentials/" \
  -H "Content-Type: application/json" \
  -d '{"recovery_method": "shop_owner_master_password", "shop_owner_master_password": "password"}'
```

## 📦 Product Management
```bash
# Get All Products (for sync)
curl -X GET "https://luminanzimbabwepos.onrender.com/api/v1/shop/products/"

# Get Single Product
curl -X GET "https://luminanzimbabwepos.onrender.com/api/v1/shop/products/1/"

# Create Product
curl -X POST "https://luminanzimbabwepos.onrender.com/api/v1/shop/products/" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Product", "price": 10.00, "stock_quantity": 50}'

# Update Product
curl -X PATCH "https://luminanzimbabwepos.onrender.com/api/v1/shop/products/1/" \
  -H "Content-Type: application/json" \
  -d '{"stock_quantity": 75}'

# Barcode Lookup (for POS)
curl -X GET "https://luminanzimbabwepos.onrender.com/api/v1/shop/products/barcode-lookup/?barcode=BARCODE123"
```

## 💰 Sales Management
```bash
# Get All Sales (for sync)
curl -X GET "https://luminanzimbabwepos.onrender.com/api/v1/shop/sales/"

# Create Sale (for sync - most important)
curl -X POST "https://luminanzimbabwepos.onrender.com/api/v1/shop/sales/" \
  -H "Content-Type: application/json" \
  -d '{
    "cashier_id": 1,
    "items": [
      {"product_id": 1, "quantity": 2, "unit_price": 10.00}
    ],
    "payment_method": "cash",
    "customer_name": "Test Customer"
  }'

# Get Single Sale
curl -X GET "https://luminanzimbabwepos.onrender.com/api/v1/shop/sales/1/"

# Sales History (Owner Dashboard)
curl -X GET "https://luminanzimbabwepos.onrender.com/api/v1/shop/sales-history/"
```

## 👥 Cashier Management
```bash
# Get All Cashiers
curl -X GET "https://luminanzimbabwepos.onrender.com/api/v1/shop/cashiers/"

# Get Cashier Details
curl -X GET "https://luminanzimbabwepos.onrender.com/api/v1/shop/cashiers/1/"

# Create Cashier
curl -X POST "https://luminanzimbabwepos.onrender.com/api/v1/shop/cashiers/" \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@shop.com", "password": "password123"}'
```

## 🏪 Shop Management
```bash
# Get Owner Dashboard
curl -X GET "https://luminanzimbabwepos.onrender.com/api/v1/shop/dashboard/"

# Register New Shop
curl -X POST "https://luminanzimbabwepos.onrender.com/api/v1/shop/register/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Shop",
    "email": "shop@example.com",
    "password": "password123"
  }'
```

## 📊 Inventory & Stock
```bash
# Stock Valuation
curl -X GET "https://luminanzimbabwepos.onrender.com/api/v1/shop/stock-valuation/"

# Inventory Audit Trail
curl -X GET "https://luminanzimbabwepos.onrender.com/api/v1/shop/audit-trail/"

# Product Audit History
curl -X GET "https://luminanzimbabwepos.onrender.com/api/v1/shop/products/1/audit-history/"
```

## 🗑️ Waste Management
```bash
# Get Waste List
curl -X GET "https://luminanzimbabwepos.onrender.com/api/v1/shop/wastes/"

# Create Waste Entry
curl -X POST "https://luminanzimbabwepos.onrender.com/api/v1/shop/wastes/" \
  -H "Content-Type: application/json" \
  -d '{"product_id": 1, "quantity": 5, "reason": "damaged"}'

# Waste Summary
curl -X GET "https://luminanzimbabwepos.onrender.com/api/v1/shop/wastes/summary/"
```

## 💵 Cash Float Management
```bash
# Get Cash Float Status
curl -X GET "https://luminanzimbabwepos.onrender.com/api/v1/shop/cash-float/"

# Activate Drawer
curl -X POST "https://luminanzimbabwepos.onrender.com/api/v1/shop/cash-float/activate/" \
  -H "Content-Type: application/json" \
  -d '{"cashier_id": 1}'

# Add Sale to Drawer
curl -X POST "https://luminanzimbabwepos.onrender.com/api/v1/shop/cash-float/sale/" \
  -H "Content-Type: application/json" \
  -d '{"cashier_id": 1, "amount": 25.50, "payment_method": "cash"}'

# Settle Drawer at EOD
curl -X POST "https://luminanzimbabwepos.onrender.com/api/v1/shop/cash-float/settle/" \
  -H "Content-Type: application/json" \
  -d '{"cashier_id": 1, "actual_cash_counted": 125.50}'
```

## 🔄 Sync Queue Endpoints (Auto-generated)
The following are the endpoints your frontend sync system will automatically call:

### For Product Sync
```
GET  /api/v1/shop/products/
POST /api/v1/shop/products/     (create)
PUT  /api/v1/shop/products/{id}/ (update)
```

### For Sales Sync  
```
GET  /api/v1/shop/sales/
POST /api/v1/shop/sales/        (create)
```

### For Cashier Orders Sync
```
POST /api/v1/shop/cashier-orders/
GET  /api/v1/shop/cashier-orders/
```

### For Stock Movements Sync
```
POST /api/v1/shop/stock-movements/
GET  /api/v1/shop/stock-movements/
```

## 📱 Mobile App Testing

### Test Sync Flow:
1. **Test Offline**: Disconnect internet, create sales, update products
2. **Test Online**: Reconnect internet, verify data syncs automatically
3. **Test Conflict Resolution**: Make changes on both server and local, test merge

### Test Network Detection:
```javascript
// Test in your React Native app console
import NetworkService from './services/networkService.js';

NetworkService.testInternetConnectivity().then(result => {
  console.log('Internet test result:', result);
});
```

### Test Offline First Service:
```javascript
// Test complete offline-first system
import OfflineFirstService from './services/offlineFirstService.js';

await OfflineFirstService.initialize();
const status = OfflineFirstService.getSyncStatus();
console.log('Sync status:', status);
```

## ✅ Success Indicators

### ✅ Working Endpoints Return:
- Status codes: 200, 201, 204
- JSON responses with expected data structure
- No CORS errors

### ❌ Failed Endpoints Show:
- 400: Bad request (validation errors)
- 401: Unauthorized (authentication issues)  
- 404: Not found (wrong URL)
- 500: Server error (backend issues)

## 🚀 Quick Test Script

```bash
#!/bin/bash
# Quick health check for all critical endpoints

echo "🔍 Testing LuminaN POS API Endpoints..."
echo "======================================="

# Test health
echo "1. Testing Health Check..."
curl -s -o /dev/null -w "%{http_code}" "https://luminanzimbabwepos.onrender.com/api/v1/shop/health/"

# Test products
echo -e "\n2. Testing Products Endpoint..."
curl -s -o /dev/null -w "%{http_code}" "https://luminanzimbabwepos.onrender.com/api/v1/shop/products/"

# Test sales
echo -e "\n3. Testing Sales Endpoint..."
curl -s -o /dev/null -w "%{http_code}" "https://luminanzimbabwepos.onrender.com/api/v1/shop/sales/"

# Test status
echo -e "\n4. Testing Status Endpoint..."
curl -s -o /dev/null -w "%{http_code}" "https://luminanzimbabwepos.onrender.com/api/v1/shop/status/"

echo -e "\n✅ Testing Complete!"
```

## 📋 Testing Checklist

- [ ] Health check responds (200)
- [ ] Shop status works (200 or 404 if not registered)
- [ ] Products endpoint accessible (401 if not authed)
- [ ] Sales endpoint accessible (401 if not authed)
- [ ] Cashier login works
- [ ] Product creation/updates work
- [ ] Sale creation works
- [ ] Offline functionality works
- [ ] Sync queue processes correctly
- [ ] Network detection works
- [ ] Conflict resolution works

**Test these endpoints one by one to ensure your sync system works perfectly!**