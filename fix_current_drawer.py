#!/usr/bin/env python
"""
Quick fix for current drawer state
This will manually add the missing $1.80 sale to the drawer
"""

import os
import sys
import django

# Setup Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from core.models import CashFloat, ShopConfiguration, Cashier
from decimal import Decimal
from django.utils import timezone

def fix_current_drawer():
    print("Fixing current drawer state...")
    
    try:
        # Get the shop
        shop = ShopConfiguration.objects.first()
        if not shop:
            print("ERROR: No shop found")
            return
            
        # Get current date
        today = timezone.now().date()
        
        # Find the active drawer for today
        try:
            drawer = CashFloat.objects.filter(shop=shop, date=today, status='ACTIVE').first()
            if not drawer:
                print("ERROR: No active drawer found for today")
                return
                
            print(f"Found drawer for: {drawer.cashier.name}")
            print(f"Current state:")
            print(f"   Float: ${drawer.float_amount}")
            print(f"   Current Cash: ${drawer.current_cash}")
            print(f"   Session Cash Sales: ${drawer.session_cash_sales}")
            print(f"   Expected EOD: ${drawer.expected_cash_at_eod}")
            
            # The sale was $1.80 cash but didn't get added to current_cash
            # So we need to add it manually
            missing_sale_amount = Decimal('1.80')
            
            print(f"Adding missing sale: ${missing_sale_amount}")
            
            # Add the sale to the drawer
            drawer.add_sale(missing_sale_amount, 'cash')
            
            print("Drawer fixed!")
            print(f"New state:")
            print(f"   Current Cash: ${drawer.current_cash}")
            print(f"   Session Cash Sales: ${drawer.session_cash_sales}")
            print(f"   Expected EOD: ${drawer.expected_cash_at_eod}")
            print(f"   Variance: ${drawer.cash_variance}")
            
            if abs(float(drawer.cash_variance)) < 0.01:
                print("SUCCESS: Drawer is now balanced!")
            else:
                print(f"WARNING: Still have variance of ${drawer.cash_variance}")
                
        except CashFloat.DoesNotExist:
            print("ERROR: No cash float found")
            
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    fix_current_drawer()