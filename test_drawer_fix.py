#!/usr/bin/env python3
"""
Test script to verify the drawer double-counting fix
"""
import requests
import json
from decimal import Decimal

# Test configuration
BASE_URL = "http://localhost:8000/api/v1/shop"

def test_drawer_fix():
    print("🧪 Testing Drawer Double-Counting Fix")
    print("=" * 50)
    
    # Test 1: Get current drawer status before test
    print("\n📊 STEP 1: Getting current drawer status...")
    try:
        response = requests.get(f"{BASE_URL}/cash-float/")
        if response.status_code == 200:
            data = response.json()
            print("✅ Current drawer status retrieved")
            if 'shop_status' in data and 'drawers' in data['shop_status']:
                for drawer in data['shop_status']['drawers']:
                    cashier_name = drawer.get('cashier', 'Unknown')
                    cash_amount = drawer.get('current_breakdown', {}).get('cash', 0)
                    total_sales = drawer.get('session_sales', {}).get('total', 0)
                    print(f"   {cashier_name}: Cash=${cash_amount:.2f}, Sales=${total_sales:.2f}")
        else:
            print(f"❌ Failed to get drawer status: {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Error getting drawer status: {e}")
        return
    
    # Test 2: Create a test sale to verify single recording
    print("\n💰 STEP 2: Creating test sale...")
    
    # First, let's try to get a cashier ID for testing
    try:
        # Get cashiers list
        response = requests.get(f"{BASE_URL}/cashiers/")
        if response.status_code == 200:
            cashiers = response.json()
            if cashiers:
                test_cashier = cashiers[0]  # Use first cashier for test
                cashier_id = test_cashier['id']
                cashier_name = test_cashier['name']
                print(f"   Using cashier: {cashier_name} (ID: {cashier_id})")
                
                # Create a test sale
                sale_data = {
                    'cashier_id': cashier_id,
                    'items': [
                        {
                            'product_id': '1',  # Assuming product ID 1 exists
                            'quantity': '1',
                            'unit_price': '2.50'
                        }
                    ],
                    'payment_method': 'cash',
                    'customer_name': 'Test Customer',
                    'customer_phone': '1234567890'
                }
                
                print(f"   Creating sale: ${sale_data['items'][0]['unit_price']} (Product ID: {sale_data['items'][0]['product_id']})")
                
                response = requests.post(f"{BASE_URL}/sales/", json=sale_data)
                if response.status_code == 201:
                    sale = response.json()
                    sale_id = sale.get('id')
                    sale_amount = float(sale.get('total_amount', 0))
                    print(f"✅ Sale created successfully: Sale #{sale_id} - ${sale_amount:.2f}")
                    
                    # Test 3: Check if drawer was updated correctly (only once)
                    print("\n🔍 STEP 3: Verifying drawer update...")
                    import time
                    time.sleep(2)  # Wait for drawer update to process
                    
                    response = requests.get(f"{BASE_URL}/cash-float/")
                    if response.status_code == 200:
                        data = response.json()
                        if 'shop_status' in data and 'drawers' in data['shop_status']:
                            found_cashier = False
                            for drawer in data['shop_status']['drawers']:
                                if drawer.get('cashier') == cashier_name:
                                    found_cashier = True
                                    current_cash = drawer.get('current_breakdown', {}).get('cash', 0)
                                    session_sales = drawer.get('session_sales', {}).get('total', 0)
                                    expected_cash = drawer.get('eod_expectations', {}).get('expected_cash', 0)
                                    
                                    print(f"   After sale - {cashier_name}:")
                                    print(f"     Current Cash: ${current_cash:.2f}")
                                    print(f"     Session Sales: ${session_sales:.2f}")
                                    print(f"     Expected Cash: ${expected_cash:.2f}")
                                    
                                    # Check if the sale was recorded correctly
                                    if abs(session_sales - sale_amount) < 0.01:  # Allow small rounding difference
                                        print(f"✅ SUCCESS: Sale recorded exactly once (${sale_amount:.2f})")
                                    elif abs(session_sales - (sale_amount * 2)) < 0.01:
                                        print(f"❌ FAILURE: Sale recorded TWICE (${session_sales:.2f} vs expected ${sale_amount:.2f})")
                                    else:
                                        print(f"⚠️  UNCLEAR: Session sales ${session_sales:.2f} vs expected ${sale_amount:.2f}")
                                    break
                            
                            if not found_cashier:
                                print(f"⚠️  Cashier {cashier_name} not found in drawer status")
                    
                else:
                    print(f"❌ Failed to create sale: {response.status_code}")
                    print(f"   Response: {response.text}")
            else:
                print("❌ No cashiers found to test with")
        else:
            print(f"❌ Failed to get cashiers: {response.status_code}")
    except Exception as e:
        print(f"❌ Error during test: {e}")
    
    print("\n🏁 Test completed!")

if __name__ == "__main__":
    test_drawer_fix()