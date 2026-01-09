import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

import json
from core.models import Sale
from django.utils import timezone
import datetime

today = timezone.localdate()

# Create proper timezone-aware datetime range for the local day
day_start = timezone.make_aware(
    datetime.datetime.combine(today, datetime.time.min),
    timezone.get_current_timezone()
)
day_end = timezone.make_aware(
    datetime.datetime.combine(today, datetime.time.max),
    timezone.get_current_timezone()
)

# Get all completed sales for today
today_sales = Sale.objects.filter(
    created_at__range=[day_start, day_end],
    status='completed'
)

print(f"Today's sales: {today_sales.count()}")
for sale in today_sales:
    print(f"  ID: {sale.id}, Method: {sale.payment_method}, Currency: {sale.payment_currency}, Amount: {sale.total_amount}")

# Calculate sales by currency and payment method (same logic as API)
sales_by_currency = {
    'usd': {'cash': 0, 'card': 0, 'ecocash': 0, 'transfer': 0, 'total': 0},
    'zig': {'cash': 0, 'card': 0, 'ecocash': 0, 'transfer': 0, 'total': 0},
    'rand': {'cash': 0, 'card': 0, 'ecocash': 0, 'transfer': 0, 'total': 0}
}

for sale in today_sales:
    currency = sale.payment_currency.upper() if sale.payment_currency else 'USD'
    payment_method = sale.payment_method
    
    currency_key = currency.lower()
    if currency_key not in sales_by_currency:
        currency_key = 'usd'
    
    if payment_method == 'cash':
        sales_by_currency[currency_key]['cash'] += float(sale.total_amount)
    elif payment_method == 'card':
        sales_by_currency[currency_key]['card'] += float(sale.total_amount)
    elif payment_method == 'ecocash':
        sales_by_currency[currency_key]['ecocash'] += float(sale.total_amount)
    elif payment_method == 'transfer':
        sales_by_currency[currency_key]['transfer'] += float(sale.total_amount)
    
    sales_by_currency[currency_key]['total'] += float(sale.total_amount)

print("\nSales by currency and payment method:")
for currency, methods in sales_by_currency.items():
    print(f"  {currency}: {methods}")

# Calculate transfer totals per currency
total_transfer_usd = sales_by_currency['usd']['transfer']
total_transfer_zig = sales_by_currency['zig']['transfer']
total_transfer_rand = sales_by_currency['rand']['transfer']

print("\nTransfer totals:")
print(f"  USD Transfer: ${total_transfer_usd}")
print(f"  ZIG Transfer: ZW${total_transfer_zig}")
print(f"  RAND Transfer: R{total_transfer_rand}")

# What the API would return in cash_flow
print("\nAPI cash_flow transfer fields:")
print(f"  transfer_usd: {total_transfer_usd}")
print(f"  transfer_zig: {total_transfer_zig}")
print(f"  transfer_rand: {total_transfer_rand}")
