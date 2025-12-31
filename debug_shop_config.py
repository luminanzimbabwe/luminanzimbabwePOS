#!/usr/bin/env python
import os
import django
import sys

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from core.models import ShopConfiguration
from django.test import RequestFactory
from core.views import ShopStatusView
from core.views import StaffListCreateView

def debug_shop_configs():
    print("=== Shop Configurations Debug ===")
    shops = ShopConfiguration.objects.all()
    print(f"Total ShopConfigurations: {shops.count()}")
    
    for i, shop in enumerate(shops, 1):
        print(f"\nShop {i}:")
        print(f"  ID: {shop.id}")
        print(f"  Name: {shop.name}")
        print(f"  Email: {shop.email}")
        print(f"  API Key: {shop.api_key}")
        print(f"  Active: {shop.active}")
        
    return shops.first()

def test_shop_status_authentication():
    print("\n=== Testing Shop Status Authentication ===")
    shop = debug_shop_configs()
    
    if not shop:
        print("No shop configuration found!")
        return
        
    if not shop.api_key:
        print("ERROR: Shop has no API key set!")
        print("This is why authentication is failing.")
        return
        
    # Test with valid API key
    factory = RequestFactory()
    request = factory.get('/api/v1/shop/shop-status/')
    request.META['HTTP_X_API_KEY'] = shop.api_key
    
    view = ShopStatusView.as_view()
    response = view(request)
    
    print(f"Response status with valid API key: {response.status_code}")
    if response.status_code == 200:
        print("✓ Authentication successful with valid API key")
    else:
        print(f"✗ Authentication failed: {response.content}")

def test_staff_inactive_authentication():
    print("\n=== Testing Staff Inactive Authentication ===")
    shop = debug_shop_configs()
    
    if not shop:
        print("No shop configuration found!")
        return
        
    if not shop.api_key:
        print("ERROR: Shop has no API key set!")
        print("This is why authentication is failing.")
        return
        
    # Test with valid API key
    factory = RequestFactory()
    request = factory.get('/api/v1/shop/staff/inactive/')
    request.META['HTTP_X_API_KEY'] = shop.api_key
    
    view = StaffListCreateView.as_view()
    response = view(request)
    
    print(f"Response status with valid API key: {response.status_code}")
    if response.status_code == 200:
        print("✓ Authentication successful with valid API key")
    else:
        print(f"✗ Authentication failed: {response.content}")

if __name__ == "__main__":
    test_shop_status_authentication()
    test_staff_inactive_authentication()