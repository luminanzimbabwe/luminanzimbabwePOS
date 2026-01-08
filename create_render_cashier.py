#!/usr/bin/env python3
"""
Create a cashier in the Render database for React Native app login
"""

import requests
import json

def create_cashier_in_render():
    """Create a cashier in the Render database"""
    base_url = "https://luminanzimbabwepos.onrender.com"
    
    print("👥 CREATING CASHIER IN RENDER DATABASE")
    print("=" * 60)
    
    # Create cashier data
    cashier_data = {
        "name": "Mufaro Ngirazi",
        "email": "cashier@luminanzimbabwe.com",
        "phone": "+263771234567",
        "employee_id": "EMP001",
        "password": "morrill95@2001",
        "preferred_shift": "morning",
        "role": "cashier"
    }
    
    print(f"📝 Creating cashier: {cashier_data['name']}")
    print(f"   Email: {cashier_data['email']}")
    print(f"   Employee ID: {cashier_data['employee_id']}")
    
    try:
        response = requests.post(f"{base_url}/api/v1/shop/cashiers/", 
                               json=cashier_data, timeout=10)
        print(f"\n📤 Registration status: {response.status_code}")
        
        if response.status_code == 201:
            result = response.json()
            print(f"✅ Cashier created successfully!")
            print(f"   ID: {result.get('id')}")
            print(f"   Name: {result.get('name')}")
            print(f"   Status: {result.get('status')}")
            
            # Test login
            print(f"\n🔐 Testing login...")
            login_data = {
                "name": cashier_data['name'],
                "password": cashier_data['password']
            }
            
            login_response = requests.post(f"{base_url}/api/v1/shop/cashiers/login/", 
                                         json=login_data, timeout=10)
            
            if login_response.status_code == 200:
                login_result = login_response.json()
                print(f"✅ Login successful!")
                print(f"   Cashier: {login_result['cashier_info']['name']}")
                print(f"   Shop: {login_result['shop_info']['name']}")
                return True
            else:
                print(f"❌ Login failed: {login_response.status_code}")
                print(f"   Error: {login_response.text}")
                return False
                
        elif response.status_code == 400:
            error_data = response.json()
            if "already exists" in error_data.get('error', '').lower():
                print("ℹ️  Cashier already exists (this is expected)")
                
                # Try to login with existing cashier
                print(f"\n🔐 Testing login with existing cashier...")
                login_data = {
                    "name": cashier_data['name'],
                    "password": "morrill95@2001"
                }
                
                login_response = requests.post(f"{base_url}/api/v1/shop/cashiers/login/", 
                                             json=login_data, timeout=10)
                
                if login_response.status_code == 200:
                    login_result = login_response.json()
                    print(f"✅ Login successful with existing cashier!")
                    print(f"   Cashier: {login_result['cashier_info']['name']}")
                    print(f"   Shop: {login_result['shop_info']['name']}")
                    return True
                else:
                    print(f"❌ Login failed: {login_response.status_code}")
                    print(f"   Error: {login_response.text}")
                    return False
            else:
                print(f"❌ Registration failed: {error_data}")
                return False
        else:
            print(f"❌ Registration failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_full_login_flow():
    """Test the complete login flow"""
    base_url = "https://luminanzimbabwepos.onrender.com"
    
    print(f"\n🧪 TESTING COMPLETE LOGIN FLOW")
    print("=" * 60)
    
    # Test credentials
    login_data = {
        "name": "Mufaro Ngirazi",
        "password": "morrill95@2001"
    }
    
    print(f"🔐 Attempting login with:")
    print(f"   Name: {login_data['name']}")
    print(f"   Password: {login_data['password']}")
    
    try:
        response = requests.post(f"{base_url}/api/v1/shop/cashiers/login/", 
                               json=login_data, timeout=10)
        
        print(f"\n📤 Login response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ LOGIN SUCCESSFUL!")
            print(f"\n📱 React Native App Data:")
            print(f"   Shop Name: {result['shop_info']['name']}")
            print(f"   Shop ID: {result['shop_info']['shop_id']}")
            print(f"   Cashier Name: {result['cashier_info']['name']}")
            print(f"   Cashier ID: {result['cashier_info']['id']}")
            print(f"   Cashier Role: {result['cashier_info']['role']}")
            print(f"   Shop Open: {result['shop_info']['shop_open']}")
            
            print(f"\n🎯 This data will be available for offline sync!")
            return True
            
        else:
            print(f"❌ LOGIN FAILED!")
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Login error: {e}")
        return False

def main():
    """Main function"""
    print("🚀 SETTING UP RENDER DATABASE FOR REACT NATIVE APP")
    print("=" * 70)
    
    # Create cashier
    success = create_cashier_in_render()
    
    if success:
        # Test complete login flow
        login_success = test_full_login_flow()
        
        if login_success:
            print(f"\n🎉 COMPLETE SUCCESS!")
            print(f"✅ Render database is fully configured")
            print(f"✅ Shop is registered")
            print(f"✅ Cashier is created and can login")
            print(f"✅ React Native app can now connect and sync data")
            
            print(f"\n📱 REACT NATIVE APP CREDENTIALS:")
            print(f"   • Shop: luminanzimbabwe.com")
            print(f"   • Cashier Name: Mufaro Ngirazi") 
            print(f"   • Password: CashierPassword123!")
            print(f"   • Server: https://luminanzimbabwepos.onrender.com")
            
            print(f"\n🔄 APP BEHAVIOR:")
            print(f"   1. App will login using these credentials")
            print(f"   2. Shop data will sync from Render PostgreSQL")
            print(f"   3. Cashier data will be stored locally")
            print(f"   4. Products can be added and synced")
            print(f"   5. Offline operations work with local SQLite")
            print(f"   6. Data syncs back to cloud when online")
            
        else:
            print(f"\n❌ LOGIN TEST FAILED")
            print(f"❌ Cashier created but login doesn't work")
            print(f"❌ Check password and cashier status")
    else:
        print(f"\n❌ FAILED TO CREATE CASHIER")
        print(f"❌ Render database setup incomplete")

if __name__ == "__main__":
    main()