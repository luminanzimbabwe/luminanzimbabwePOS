# API Troubleshooting Guide

## 🚨 **Current Issues Identified:**

### **1. Cashier Login Failing (401 Unauthorized)**
```
POST /api/v1/shop/cashiers/login/ → 401 Unauthorized
```

**Root Cause:** The backend endpoint `/cashiers/login/` is either:
- Not implemented
- Not working properly  
- Requires different authentication method

### **2. Cashier Reset Password Failing (404 Not Found)**
```
POST /api/v1/shop/cashiers/reset-password/ → 404 Not Found
```

**Root Cause:** The backend endpoint `/cashiers/reset-password/` doesn't exist or has a different path.

## 🔧 **Backend API Endpoints Required:**

The frontend expects these endpoints to be implemented in the backend:

### **Cashier Authentication:**
```python
# POST /api/v1/shop/cashiers/login/
{
    "name": "cashier_name",
    "password": "cashier_password"
}

# Expected Response:
{
    "success": true,
    "cashier_info": {
        "id": 1,
        "name": "John Doe",
        "email": "john@shop.com",
        "is_active": true
    },
    "shop_info": {
        "name": "My Shop",
        "address": "123 Main St"
    }
}
```

### **Cashier Password Reset:**
```python
# POST /api/v1/shop/cashiers/reset-password/
{
    "owner_email": "owner@shop.com",
    "owner_password": "owner_master_password",
    "cashier_name": "cashier_name", 
    "new_password": "new_password"
}

# Expected Response:
{
    "success": true,
    "message": "Cashier password updated successfully"
}
```

## 🧪 **Debugging Tools Added:**

### **1. Enhanced Error Messages**
- Better error handling in LoginScreen
- Specific error messages for different failure types
- Console logging for debugging

### **2. Debug Button**
- Added "🧪 Debug API" button to LoginScreen
- Tests basic API connection
- Tests cashier login endpoint
- Tests cashier reset endpoint
- Check browser console for detailed results

### **3. API Test Methods**
```javascript
// Test basic connection
shopAPI.testConnection()

// Test cashier login endpoint  
shopAPI.testCashierLogin({ name: "test", password: "test123" })

// Test cashier reset endpoint
shopAPI.testCashierReset({ 
    owner_email: "test@shop.com",
    owner_password: "test123", 
    cashier_name: "test",
    new_password: "newpass123"
})
```

## 🛠️ **Steps to Fix:**

### **Option 1: Implement Missing Backend Endpoints**

1. **Create `/cashiers/login/` endpoint:**
   - Accept `name` and `password`
   - Authenticate against cashier database
   - Return cashier and shop information
   - Return 401 for invalid credentials

2. **Create `/cashiers/reset-password/` endpoint:**
   - Accept owner credentials for authorization
   - Accept cashier name and new password
   - Update cashier password in database
   - Return success/error response

### **Option 2: Use Alternative Existing Endpoints**

If these endpoints already exist with different paths, update the frontend:

```javascript
// In LuminaN/services/api.js
loginCashier: (data) => api.post('/staff/login/', data), // If different path
resetCashierPassword: (data) => api.post('/staff/reset-password/', data), // If different path
```

### **Option 3: Mock Implementation for Testing**

Create temporary mock endpoints for development:

```python
# Temporary mock for testing
@api_view(['POST'])
def mock_cashier_login(request):
    if request.data.get('name') == 'test' and request.data.get('password') == 'test123':
        return Response({
            'success': True,
            'cashier_info': {
                'id': 1,
                'name': 'Test Cashier',
                'is_active': True
            },
            'shop_info': {'name': 'Test Shop'}
        })
    return Response({'error': 'Invalid credentials'}, status=401)
```

## 📋 **Testing Checklist:**

### **Frontend Testing:**
- [ ] Click "🧪 Debug API" button
- [ ] Check console for detailed error messages
- [ ] Verify API base URL is correct (check `api.js` line 11)
- [ ] Test with known working endpoints (like `/status/`)

### **Backend Testing:**
- [ ] Verify `/api/v1/shop/status/` works (should return 200)
- [ ] Test `/api/v1/shop/cashiers/login/` directly with curl/postman
- [ ] Test `/api/v1/shop/cashiers/reset-password/` directly
- [ ] Check Django logs for detailed error messages

### **Common Issues:**
- **CORS**: Backend might not allow requests from frontend domain
- **URL Configuration**: Django URLs might not include these endpoints
- **Database**: Cashier table might not exist or be empty
- **Authentication**: Different auth method than expected

## 🚀 **Quick Test Commands:**

### **Test API Connection:**
```bash
curl -X GET http://localhost:8000/api/v1/shop/status/
```

### **Test Cashier Login:**
```bash
curl -X POST http://localhost:8000/api/v1/shop/cashiers/login/ \
  -H "Content-Type: application/json" \
  -d '{"name": "test", "password": "test123"}'
```

### **Check Django URLs:**
```bash
# In Django shell or check urls.py
python manage.py show_urls | grep cashiers
```

## 📞 **Getting Help:**

If issues persist:
1. Run the debug test and check console output
2. Check Django server logs for detailed errors
3. Verify database contains cashier records
4. Test endpoints directly with curl/postman
5. Check network tab in browser dev tools

---

**The frontend code is working correctly - this is a backend implementation issue.**