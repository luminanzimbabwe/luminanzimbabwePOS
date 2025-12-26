#!/usr/bin/env python
import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from core.models import Cashier

print("=== FIXING CASHIER PASSWORD ===")

try:
    cashiers = Cashier.objects.all()
    print(f"Total cashiers: {cashiers.count()}")
    
    for cashier in cashiers:
        print(f"\nCashier: {cashier.name} (ID: {cashier.id})")
        print(f"Current status: {cashier.status}")
        
        # Reset to known password
        print(f"Resetting cashier password to 'morrill95@2001'...")
        cashier.set_password("morrill95@2001")
        cashier.save()
        
        # Verify
        is_valid = cashier.check_password("morrill95@2001")
        print(f"Password reset successful. Validation test: {is_valid}")
        
        if is_valid:
            print("SUCCESS: Cashier can now login with password 'morrill95@2001'")
        else:
            print("ERROR: Password validation still failing")
        
except Exception as e:
    print(f"ERROR: {e}")