#!/usr/bin/env python3
"""
Check current database status
"""

import os
import sys
import django

# Setup Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from core.models import ShopConfiguration, Cashier, Product, Sale

def check_database_status():
    """Check what's in the database"""
    
    print("=== DATABASE STATUS CHECK ===")
    
    # Check shops
    shops = ShopConfiguration.objects.all()
    print(f"\n📊 Shops in database: {shops.count()}")
    if shops.exists():
        for shop in shops:
            print(f"   - {shop.name} ({shop.email}) - Status: {'Active' if shop.is_active else 'Inactive'}")
    else:
        print("   ❌ No shops found - This is why you're getting the error!")
    
    # Check cashiers
    cashiers = Cashier.objects.all()
    print(f"\n👥 Cashiers in database: {cashiers.count()}")
    
    # Check products
    products = Product.objects.all()
    print(f"\n🛍️ Products in database: {products.count()}")
    
    # Check sales
    sales = Sale.objects.all()
    print(f"\n💰 Sales in database: {sales.count()}")
    
    print("\n=== SOLUTION ===")
    if not shops.exists():
        print("🔧 TO FIX THIS ERROR:")
        print("1. Register your shop using the API or frontend")
        print("2. The registration will create a ShopConfiguration")
        print("3. Then all the other APIs will work")
        print("\n📝 Use these endpoints:")
        print("   POST /api/v1/shop/register/ - Register new shop")
        print("   GET /api/v1/shop/status/ - Check if shop is registered")
    else:
        print("✅ Database has shop data - error might be elsewhere")

if __name__ == "__main__":
    check_database_status()