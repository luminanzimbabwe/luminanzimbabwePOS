#!/usr/bin/env python3

import requests
import json

# Test registration with master password system (no old password field)
def test_registration():
    url = "http://localhost:8000/api/v1/shop/register/"
    
    # Test data - now using master password system only
    registration_data = {
        "shop_id": "12345",
        "register_id": "67890",
        "name": "Test Shop",
        "address": "123 Test Street",
        "business_type": "retail",
        "industry": "grocery",
        "description": "Test grocery store",
        "email": "test@example.com",
        "phone": "+1234567890",
        "shop_owner_master_password": "CRYSTALFIRE2024#",
        "recovery_codes": ["CODE123", "CODE456"]
    }
    
    try:
        print("🧪 Testing Registration with Master Password System...")
        print(f"📡 POST {url}")
        print(f"📊 Data: {json.dumps(registration_data, indent=2)}")
        
        response = requests.post(url, json=registration_data, timeout=10)
        
        print(f"\n📈 Response Status: {response.status_code}")
        print(f"📋 Response Headers: {dict(response.headers)}")
        
        if response.status_code == 201:
            print("✅ SUCCESS: Registration completed successfully!")
            response_data = response.json()
            print(f"📋 Response Data: {json.dumps(response_data, indent=2)}")
        else:
            print("❌ FAILED: Registration failed")
            try:
                error_data = response.json()
                print(f"🚨 Error Response: {json.dumps(error_data, indent=2)}")
            except:
                print(f"🚨 Raw Error: {response.text}")
        
        return response.status_code == 201
        
    except requests.exceptions.RequestException as e:
        print(f"🚨 Network Error: {e}")
        return False
    except Exception as e:
        print(f"🚨 Unexpected Error: {e}")
        return False

if __name__ == "__main__":
    success = test_registration()
    print(f"\n🎯 Test Result: {'PASSED' if success else 'FAILED'}")