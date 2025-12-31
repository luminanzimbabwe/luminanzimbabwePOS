#!/usr/bin/env python3

import urllib.request
import urllib.parse
import json

def test_product_split():
    url = "http://localhost:8000/api/v1/shop/stock-transfers/"
    
    data = {
        "transfer_type": "SPLIT",
        "from_line_code": "57740846",
        "from_barcode": "6009801792071",
        "from_quantity": 10,
        "to_line_code": "92535538",
        "to_barcode": "",
        "to_quantity": 0.5,
        "reason": "none",
        "notes": "Product split: BAKER'S INN SOFT WHITE BREAD -> BAKER'S INN SOFT WHITE BREAD (Half)",
        "new_product_data": {
            "name": "BAKER'S INN SOFT WHITE BREAD (Half)",
            "price": 0.6,
            "cost_price": 0.25,
            "category": "Bakery",
            "currency": "USD"
        }
    }
    
    # Convert to JSON
    json_data = json.dumps(data).encode('utf-8')
    
    # Create request
    req = urllib.request.Request(
        url,
        data=json_data,
        headers={
            'Content-Type': 'application/json',
            'X-Shop-ID': '097b227c-73ef-4d78-a7f5-ee4d439cf332'
        }
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            response_data = response.read().decode('utf-8')
            print(f"Status Code: {response.status}")
            print(f"Response: {response_data}")
            
            if response.status == 201:
                print("✅ SUCCESS: Product split completed!")
            else:
                print("❌ FAILED: Product split failed")
                
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.reason}")
        try:
            error_data = e.read().decode('utf-8')
            print(f"Error Response: {error_data}")
        except:
            print("Could not read error response")
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")

if __name__ == "__main__":
    test_product_split()