"""
Debug script to show exactly how expected amount is calculated
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Lumina.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from datetime import date, datetime, time
from decimal import Decimal
from django.utils import timezone
from core.models import ShopConfiguration, Cashier, Sale, SalePayment, StaffLunch, CashFloat
from core.models_reconciliation import CashierCount

shop = ShopConfiguration.objects.get()
today = date.today()

print("=" * 60)
print("DEBUG EXPECTED AMOUNT CALCULATION")
print("=" * 60)
print(f"Date: {today}")
print()

day_start = timezone.make_aware(datetime.combine(today, time.min), timezone.get_current_timezone())
day_end = timezone.make_aware(datetime.combine(today, time.max), timezone.get_current_timezone())

for cashier in Cashier.objects.filter(shop=shop, status='active'):
    print(f"\n{'='*60}")
    print(f"Cashier: {cashier.name}")
    print(f"{'='*60}")
    
    # Get sales
    sales = Sale.objects.filter(shop=shop, cashier=cashier, created_at__range=[day_start, day_end], status='completed')
    total_sales = sum(s.total_amount for s in sales)
    print(f"Sales: {sales.count()} transactions")
    print(f"Total Sales: ${total_sales}")
    
    # Get float
    try:
        cf = CashFloat.objects.get(shop=shop, cashier=cashier, date=today)
        print(f"Float USD: ${cf.float_amount}")
        float_amount = cf.float_amount
    except:
        print("Float USD: $0 (not set)")
        float_amount = Decimal('0')
    
    # Get staff lunch
    lunches = StaffLunch.objects.filter(shop=shop, cashier=cashier, created_at__range=[day_start, day_end], product=None)
    lunch_total = sum(l.total_cost for l in lunches)
    print(f"Staff Lunch: ${lunch_total} ({lunches.count()} records)")
    
    # Calculate expected
    expected = float_amount + total_sales - lunch_total
    print(f"\nCalculation:")
    print(f"  Float: ${float_amount}")
    print(f"  + Sales: ${total_sales}")
    print(f"  - Staff Lunch: ${lunch_total}")
    print(f"  = Expected: ${expected}")
    
    # Check stored CashierCount
    try:
        cc = CashierCount.objects.get(shop=shop, cashier=cashier, date=today)
        print(f"\nStored in Database:")
        print(f"  Expected USD: ${cc.expected_cash_usd}")
        print(f"  Actual Counted: ${cc.total_cash_usd}")
        print(f"  Variance: ${cc.cash_variance_usd}")
        
        if cc.expected_cash_usd != expected:
            print(f"\n⚠️  MISMATCH!")
            print(f"   Calculated: ${expected}")
            print(f"   Stored: ${cc.expected_cash_usd}")
            print(f"   Difference: ${expected - cc.expected_cash_usd}")
    except CashierCount.DoesNotExist:
        print("\nNo CashierCount record found")

print(f"\n{'='*60}")
print("END DEBUG")
print(f"{'='*60}")
