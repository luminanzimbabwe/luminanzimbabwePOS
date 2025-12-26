#!/usr/bin/env python
import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from core.models import ShopConfiguration, Cashier

print("=== DATABASE CHECK ===")

# Check shop configuration
try:
    shop = ShopConfiguration.objects.first()
    if shop:
        print(f"Shop Name: {shop.name}")
        print(f"Shop Email: {shop.email}")
        print(f"Shop Owner Master Password exists: {bool(shop.shop_owner_master_password)}")
        if shop.shop_owner_master_password:
            print(f"Shop Owner Master Password: '{shop.shop_owner_master_password}'")
            print(f"Shop Owner Master Password length: {len(shop.shop_owner_master_password)}")
        else:
            print("WARNING: Shop Owner Master Password is empty!")
    else:
        print("ERROR: No shop configuration found!")
except Exception as e:
    print(f"ERROR checking shop: {e}")

print("\n=== CASHIER CHECK ===")

# Check cashiers
try:
    cashiers = Cashier.objects.all()
    print(f"Total cashiers in database: {cashiers.count()}")
    
    for cashier in cashiers:
        print(f"\nCashier ID: {cashier.id}")
        print(f"Cashier Name: '{cashier.name}'")
        print(f"Cashier Status: {cashier.status}")
        print(f"Cashier Email: {cashier.email}")
        print(f"Password hash exists: {bool(cashier.password)}")
        print(f"Password hash length: {len(cashier.password) if cashier.password else 0}")
        print(f"Approved at: {cashier.approved_at}")
        
        # Test password validation
        if cashier.password:
            test_password = "morrill95@2001"
            is_valid = cashier.check_password(test_password)
            print(f"Test password '{test_password}' is valid: {is_valid}")
        
except Exception as e:
    print(f"ERROR checking cashiers: {e}")