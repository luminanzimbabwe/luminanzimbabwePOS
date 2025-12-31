#!/usr/bin/env python
"""
Reset drawer to match reality
If you have $3.60 in your drawer but the system thinks you have $100 float + $1.80 sales,
we need to set the float to $1.80 (the actual cash) and sales to $1.80
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

def reset_drawer_to_reality():
    print("Resetting drawer to match actual cash...")
    
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
        print(f"   Float Amount: ${drawer.float_amount}")
        print(f"   Current Cash: ${drawer.current_cash}")
        print(f"   Session Cash Sales: ${drawer.session_cash_sales}")
        print(f"   Expected EOD: ${drawer.expected_cash_at_eod}")
        
        # Set float to match actual cash
        actual_cash = Decimal('1.80')  # You have $1.80 in your drawer
        drawer.float_amount = actual_cash
        drawer.current_cash = actual_cash
        drawer.session_cash_sales = Decimal('0.00')  # No additional sales beyond the float
        drawer.session_total_sales = Decimal('0.00')
        
        # Update expected cash
        drawer.expected_cash_at_eod = drawer.float_amount + drawer.session_cash_sales
        
        drawer.save()
        
        print(f"\\nDrawer reset to match reality:")
        print(f"   Float Amount: ${drawer.float_amount}")
        print(f"   Current Cash: ${drawer.current_cash}")
        print(f"   Session Cash Sales: ${drawer.session_cash_sales}")
        print(f"   Expected EOD: ${drawer.expected_cash_at_eod}")
        print(f"   Variance: ${drawer.cash_variance}")
        
        if abs(float(drawer.cash_variance)) < 0.01:
            print("SUCCESS: Drawer is now perfectly balanced!")
        else:
            print(f"WARNING: Still have variance of ${drawer.cash_variance}")
            
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    reset_drawer_to_reality()