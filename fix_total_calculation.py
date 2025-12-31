#!/usr/bin/env python
"""
Fix the current_total calculation in the CashFloat model
"""

import os
import sys
import django

# Setup Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from core.models import CashFloat, ShopConfiguration
from decimal import Decimal
from django.utils import timezone

def fix_total_calculation():
    print("Fixing current_total calculation...")
    
    try:
        # Get the shop
        shop = ShopConfiguration.objects.first()
        if not shop:
            print("ERROR: No shop found")
            return
            
        # Get current date
        today = timezone.now().date()
        
        # Find the drawer
        drawer = CashFloat.objects.filter(shop=shop, date=today, status='ACTIVE').first()
        if not drawer:
            print("ERROR: No active drawer found")
            return
            
        print(f"Current drawer state:")
        print(f"   Cashier: {drawer.cashier.name}")
        print(f"   Current Cash: ${drawer.current_cash}")
        print(f"   Current Card: ${drawer.current_card}")
        print(f"   Current EcoCash: ${drawer.current_ecocash}")
        print(f"   Current Transfer: ${drawer.current_transfer}")
        print(f"   Current Total (before fix): ${drawer.current_total}")
        
        # Recalculate current_total properly
        correct_total = (drawer.current_cash + drawer.current_card + 
                        drawer.current_ecocash + drawer.current_transfer)
        
        print(f"   Correct Total should be: ${correct_total}")
        
        # Update the current_total field
        drawer.current_total = correct_total
        drawer.save()
        
        print(f"\\nDrawer fixed!")
        print(f"   Current Total (after fix): ${drawer.current_total}")
        
        # Verify the calculation
        expected_total = (drawer.current_cash + drawer.current_card + 
                         drawer.current_ecocash + drawer.current_transfer)
        
        if abs(float(drawer.current_total) - float(expected_total)) < 0.01:
            print("SUCCESS: Total calculation is now correct!")
        else:
            print(f"WARNING: Still have discrepancy: ${drawer.current_total} vs ${expected_total}")
            
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    fix_total_calculation()