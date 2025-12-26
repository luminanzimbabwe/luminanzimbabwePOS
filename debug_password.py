#!/usr/bin/env python
import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from core.models import Cashier
from django.contrib.auth.hashers import make_password, check_password

print("=== DEBUGGING CASHIER PASSWORD ISSUE ===")

try:
    cashier = Cashier.objects.first()
    print(f"Cashier: {cashier.name}")
    print(f"Password field type: {type(cashier.password)}")
    print(f"Password field value: '{cashier.password}'")
    print(f"Password field length: {len(cashier.password) if cashier.password else 0}")
    
    # Test direct hasher functions
    test_password = "morrill95@2001"
    print(f"\nTesting direct hasher functions:")
    
    # Make a fresh hash
    fresh_hash = make_password(test_password)
    print(f"Fresh hash: '{fresh_hash}'")
    
    # Check the fresh hash
    fresh_check = check_password(test_password, fresh_hash)
    print(f"Fresh hash validation: {fresh_check}")
    
    # Test the cashier's hash
    cashier_hash_check = check_password(test_password, cashier.password)
    print(f"Cashier hash validation: {cashier_hash_check}")
    
    # Let's try setting the password again and force save
    print(f"\nRe-setting password and forcing save...")
    cashier.set_password(test_password)
    cashier.save()
    
    # Refresh from database
    cashier.refresh_from_db()
    print(f"After refresh - Password: '{cashier.password}'")
    
    # Test again
    final_check = cashier.check_password(test_password)
    print(f"Final validation test: {final_check}")
    
    if final_check:
        print("SUCCESS: Password is now working!")
    else:
        print("STILL FAILING: There might be a deeper issue")
        
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()