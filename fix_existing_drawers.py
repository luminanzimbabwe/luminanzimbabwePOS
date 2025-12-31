#!/usr/bin/env python3
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
sys.path.append('d:/luminanzimbabwePOS')
django.setup()

from core.models import Sale, CashFloat, Cashier
from django.utils import timezone
from decimal import Decimal

def fix_existing_drawers():
    print('FIXING EXISTING DOUBLE-COUNTED DRAWERS')
    print('=' * 50)
    
    # Get today's date
    today = timezone.now().date()
    
    # Get all cash float records for today
    cash_floats = CashFloat.objects.filter(date=today)
    
    fixed_count = 0
    for cf in cash_floats:
        if cf.cashier:
            # Get actual sales for this cashier today
            cashier_sales = Sale.objects.filter(
                cashier=cf.cashier, 
                created_at__date=today, 
                status='completed'
            )
            actual_total = sum(sale.total_amount for sale in cashier_sales)
            drawer_total = cf.session_total_sales
            
            print(f"\nCashier: {cf.cashier.name}")
            print(f"  Current Drawer Sales: ${drawer_total:.2f}")
            print(f"  Actual Sales Total: ${actual_total:.2f}")
            print(f"  Difference: ${drawer_total - actual_total:.2f}")
            
            # If there's a mismatch, fix it
            if abs(drawer_total - actual_total) > 0.01:
                print(f"  FIXING: Setting drawer sales to match actual sales...")
                
                # Update the drawer to match actual sales
                cf.session_total_sales = actual_total
                
                # Recalculate current cash based on payment methods
                cash_sales = sum(sale.total_amount for sale in cashier_sales if sale.payment_method == 'cash')
                card_sales = sum(sale.total_amount for sale in cashier_sales if sale.payment_method == 'card')
                ecocash_sales = sum(sale.total_amount for sale in cashier_sales if sale.payment_method == 'ecocash')
                transfer_sales = sum(sale.total_amount for sale in cashier_sales if sale.payment_method == 'transfer')
                
                cf.session_cash_sales = cash_sales
                cf.session_card_sales = card_sales
                cf.session_ecocash_sales = ecocash_sales
                cf.session_transfer_sales = transfer_sales
                
                # Update current cash (cash sales only)
                cf.current_cash = cf.float_amount + cash_sales
                cf.current_card = card_sales
                cf.current_ecocash = ecocash_sales
                cf.current_transfer = transfer_sales
                cf.current_total = cf.current_cash + cf.current_card + cf.current_ecocash + cf.current_transfer
                
                # Update expected cash
                cf.expected_cash_at_eod = cf.float_amount + cash_sales
                
                cf.save()
                
                print(f"  FIXED: Drawer sales corrected to ${actual_total:.2f}")
                fixed_count += 1
            else:
                print(f"  Already correct")
    
    print(f"\nSUMMARY: Fixed {fixed_count} drawer records")
    
    # Verify the fix
    print(f"\nVERIFICATION:")
    cash_floats = CashFloat.objects.filter(date=today)
    for cf in cash_floats:
        if cf.cashier:
            cashier_sales = Sale.objects.filter(
                cashier=cf.cashier, 
                created_at__date=today, 
                status='completed'
            )
            actual_total = sum(sale.total_amount for sale in cashier_sales)
            drawer_total = cf.session_total_sales
            
            status = "OK" if abs(drawer_total - actual_total) <= 0.01 else "ERROR"
            print(f"  {cf.cashier.name}: Actual=${actual_total:.2f}, Drawer=${drawer_total:.2f} [{status}]")

if __name__ == "__main__":
    fix_existing_drawers()