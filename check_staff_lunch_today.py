"""
Check staff lunch data for today to help debug the expected cash calculation issue.
Run this to see if there's unexpected staff lunch data causing the negative expected amount.
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Lumina.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from datetime import date
from decimal import Decimal
from core.models import StaffLunch, ShopConfiguration
from core.models_reconciliation import CashierCount

print("=" * 60)
print("STAFF LUNCH DEBUG REPORT")
print("=" * 60)

try:
    shop = ShopConfiguration.objects.get()
    print(f"Shop: {shop.name}")
except:
    print("ERROR: No shop configuration found!")
    sys.exit(1)

today = date.today()
print(f"Date: {today}")
print()

# Get all staff lunches for today
staff_lunches = StaffLunch.objects.filter(
    shop=shop,
    created_at__date=today
)

print(f"Total Staff Lunches Today: {staff_lunches.count()}")
print()

if staff_lunches.exists():
    print("Staff Lunch Details:")
    print("-" * 60)
    total_cost = Decimal('0')
    for lunch in staff_lunches:
        cost = Decimal(str(lunch.total_cost))
        total_cost += cost
        print(f"  ID: {lunch.id}")
        print(f"  Cashier: {lunch.cashier.name if lunch.cashier else 'None'}")
        print(f"  Product: {lunch.product.name if lunch.product else 'Money Lunch'}")
        print(f"  Cost: ${cost}")
        print(f"  Created: {lunch.created_at}")
        print("-" * 60)
    print(f"TOTAL STAFF LUNCH COST: ${total_cost}")
else:
    print("No staff lunches recorded for today.")

print()
print("=" * 60)
print("CASHIER COUNT EXPECTED AMOUNTS")
print("=" * 60)

cashier_counts = CashierCount.objects.filter(shop=shop, date=today)
print(f"Cashier Count Records: {cashier_counts.count()}")
print()

for count in cashier_counts:
    print(f"Cashier: {count.cashier.name}")
    print(f"  Expected Cash USD: ${count.expected_cash_usd}")
    print(f"  Expected Cash ZIG: ${count.expected_cash_zig}")
    print(f"  Expected Cash RAND: ${count.expected_cash_rand}")
    print(f"  Status: {count.status}")
    print()

print("=" * 60)
print("If Expected Cash USD is negative and you have no staff lunches,")
print("there may be a calculation bug or old corrupted data.")
print("=" * 60)
