#!/usr/bin/env python3
"""
Test the API endpoint directly to see if it's working
"""
import os
import sys
import django
import requests
import json

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from core.models import ShopConfiguration

def test_api_endpoint():
    print("TESTING API ENDPOINT...")
    print("=" * 40)
    
    try:
        # Get shop info for the API call
        shop = ShopConfiguration.objects.get()
        print(f"Shop: {shop.name}")
        print(f"Email: {shop.email}")
        
        # Test the products endpoint
        api_url = "http://localhost:8000/api/v1/shop/products/"
        print(f"\nTesting URL: {api_url}")
        
        # Make the API call
        try:
            response = requests.get(api_url, timeout=10)
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Response Type: {type(data)}")
                print(f"Response Length: {len(data) if isinstance(data, list) else 'Not a list'}")
                
                if isinstance(data, list) and len(data) > 0:
                    print("SUCCESS: API returns products!")
                    print(f"First product: {data[0].get('name', 'N/A')}")
                else:
                    print("ISSUE: API returns empty or invalid data")
                    print(f"Response: {data}")
            else:
                print(f"ERROR: HTTP {response.status_code}")
                print(f"Response: {response.text}")
                
        except requests.exceptions.ConnectionError:
            print("ERROR: Cannot connect to API")
            print("Make sure the Django development server is running on port 8000")
        except requests.exceptions.Timeout:
            print("ERROR: Request timed out")
        except Exception as e:
            print(f"ERROR: {e}")
            
    except ShopConfiguration.DoesNotExist:
        print("ERROR: No shop found in database")
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_api_endpoint()