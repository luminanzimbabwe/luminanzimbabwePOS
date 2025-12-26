#!/usr/bin/env python
import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from core.models import Cashier
from django.contrib.auth.hashers import check_password

print("=== DEEP DEBUGGING CASHIER PASSWORD ===")

try:
    cashier = Cashier.objects.first()
    test_password = "morrill95@2001"
    
    print(f"Cashier: {cashier.name}")
    print(f"Password in database: '{cashier.password}'")
    
    # Method 1: Direct Django function
    direct_result = check_password(test_password, cashier.password)
    print(f"Direct Django check_password: {direct_result}")
    
    # Method 2: Cashier instance method
    method_result = cashier.check_password(test_password)
    print(f"Cashier.check_password method: {method_result}")
    
    # Method 3: Check if they're calling the same function
    print(f"Are they the same function? {check_password == cashier.check_password}")
    
    # Method 4: Let's manually call the method's code
    manual_result = check_password(cashier.password, test_password)
    print(f"Manual call of same code: {manual_result}")
    
    # Method 5: Check what the cashier method is actually calling
    print(f"Method source: {cashier.check_password}")
    
    # Let's try to reset the password again and see what happens
    print(f"\n--- Resetting password again ---")
    cashier.set_password(test_password)
    cashier.save()
    
    # Check immediately
    immediate_check = cashier.check_password(test_password)
    print(f"Immediate check after save: {immediate_check}")
    
    # Refresh from DB
    cashier.refresh_from_db()
    db_check = cashier.check_password(test_password)
    print(f"Check after DB refresh: {db_check}")
    
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()