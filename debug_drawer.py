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

def debug_drawer_issue():
    print('DRAWER DEBUG ANALYSIS')
    print('=' * 50)
    
    # Get today's date
    today = timezone.now().date()
    print(f"Analysis for: {today}")
    
    # Check all cashiers
    cashiers = Cashier.objects.all()
    print(f"Found {cashiers.count()} cashiers:")
    for cashier in cashiers:
        print(f"  - {cashier.name} (ID: {cashier.id})")
    
    # Check recent sales
    print(f"Recent Sales (last 10):")
    sales = Sale.objects.all().order_by('-created_at')[:10]
    for sale in sales:
        cashier_name = sale.cashier.name if sale.cashier else 'Unknown'
        print(f"  Sale #{sale.id}: ${sale.total_amount:.2f} ({sale.payment_method}) by {cashier_name}")
    
    # Check cash float records for today
    print(f"Cash Float Records for {today}:")
    cash_floats = CashFloat.objects.filter(date=today)
    print(f"Found {cash_floats.count()} cash float records")
    
    for cf in cash_floats:
        cashier_name = cf.cashier.name if cf.cashier else 'Unknown'
        print(f"  {cashier_name}:")
        print(f"    Current Cash: ${cf.current_cash:.2f}")
        print(f"    Session Sales: ${cf.session_total_sales:.2f}")
        print(f"    Expected Cash: ${cf.expected_cash_at_eod:.2f}")
        print(f"    Status: {cf.status}")
    
    # Compare sales vs drawer
    print(f"SALES vs DRAWER COMPARISON:")
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
            
            print(f"  {cf.cashier.name}:")
            print(f"    Actual Sales (DB): ${actual_total:.2f}")
            print(f"    Drawer Sales: ${drawer_total:.2f}")
            print(f"    Difference: ${drawer_total - actual_total:.2f}")
            
            if abs(drawer_total - actual_total) > 0.01:
                print(f"    MISMATCH - Drawer has ${drawer_total - actual_total:.2f} extra!")
                
                # Show individual sales
                print(f"    Individual Sales:")
                for sale in cashier_sales:
                    print(f"      Sale #{sale.id}: ${sale.total_amount:.2f} at {sale.created_at}")
            else:
                print(f"    MATCHES")

if __name__ == "__main__":
    debug_drawer_issue()