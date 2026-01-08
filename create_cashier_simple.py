#!/usr/bin/env python3
"""
Simple script to create cashier in Render database with correct password
"""

import requests
import json

def create_cashier():
    """Create cashier with correct password"""
    base_url = "https://luminanzimbabwepos.onrender.com"
    
    print("👥 CREATING CASHIER IN RENDER DATABASE")
    print("=" * 50)
    
    cashier_data = {
        "name": "Mufaro Ngirazi",
        "email": "cashier@luminanzimbabwe.com",
        "phone": "+263771234567",
        "employee_id": "EMP001",
        "password": "morrill95@2001",
        "preferred_shift": "morning",
        "role": "cashier"
    }
    
    try:
        response = requests.post(f"{base_url}/api/v1/shop/cashiers/", 
                               json=cashier_data, timeout=10)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 201:
            result = response.json()
            print("✅ Cashier created successfully!")
            print(f"ID: {result.get('id')}")
            print(f"Name: {result.get('name')}")
            print(f"Status: {result.get('status')}")
            return True
        else:
            print(f"❌ Failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    create_cashier()