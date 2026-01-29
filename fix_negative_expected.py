"""
CRITICAL FIX: Negative Expected Amount Bug

This script fixes the bug where expected cash amounts are showing as negative
when they should be positive (float + sales - change).

The issue is in the calculation logic where expected amounts are being corrupted.
This script recalculates from actual sales data.
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Lumina.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from datetime import date, datetime, time
from decimal import Decimal
from django.utils import timezone
from core.models import ShopConfiguration, Cashier, Sale, SalePayment, StaffLunch, CashFloat
from core.models_reconciliation import CashierCount
from core.models_exchange_rates import ExchangeRate

print("=" * 70)
print("FIX NEGATIVE EXPECTED AMOUNTS - CRITICAL BUG FIX")
print("=" * 70)

try:
    shop = ShopConfiguration.objects.get()
    print(f"Shop: {shop.name}")
except:
    print("ERROR: No shop configuration found!")
    sys.exit(1)

# Get date to fix (default to today)
target_date = date.today()
print(f"Date: {target_date}")
print()

# Create timezone-aware datetime range
day_start = timezone.make_aware(
    datetime.combine(target_date, time.min),
    timezone.get_current_timezone()
)
day_end = timezone.make_aware(
    datetime.combine(target_date, time.max),
    timezone.get_current_timezone()
)

# Get exchange rates
exchange_rates = None
try:
    rates = ExchangeRate.objects.filter(shop=shop, is_active=True).order_by('-created_at')[:5]
    if rates:
        exchange_rates = rates[0]
        print(f"Using exchange rate: 1 USD = {exchange_rates.zig_per_usd} ZiG")
except Exception as e:
    print(f"Warning: Could not get exchange rates: {e}")

print()
print("=" * 70)
print("RECALCULATING EXPECTED AMOUNTS FROM ACTUAL SALES")
print("=" * 70)

# Get all cashier counts for this date
cashier_counts = CashierCount.objects.filter(shop=shop, date=target_date)
print(f"Found {cashier_counts.count()} cashier count records")
print()

fixed_count = 0

for count in cashier_counts:
    cashier = count.cashier
    print(f"\n{'='*70}")
    print(f"Cashier: {cashier.name}")
    print(f"{'='*70}")
    print(f"  CURRENT Expected USD: ${count.expected_cash_usd}")
    print(f"  CURRENT Actual Counted: ${count.total_cash_usd}")
    
    # Get the cash float for this cashier
    try:
        cash_float = CashFloat.get_active_drawer(shop, cashier)
        float_usd = cash_float.float_amount
        float_zig = cash_float.float_amount_zig
        float_rand = cash_float.float_amount_rand
        print(f"  Float: ${float_usd} USD, {float_zig} ZiG, {float_rand} RAND")
    except Exception as e:
        print(f"  WARNING: Could not get cash float: {e}")
        float_usd = Decimal('0')
        float_zig = Decimal('0')
        float_rand = Decimal('0')
    
    # Calculate sales for this cashier from ACTUAL SALE records
    exp_usd = {'cash': Decimal('0'), 'card': Decimal('0'), 'ecocash': Decimal('0')}
    exp_zig = {'cash': Decimal('0'), 'card': Decimal('0'), 'ecocash': Decimal('0')}
    exp_rand = {'cash': Decimal('0'), 'card': Decimal('0'), 'ecocash': Decimal('0')}
    
    try:
        today_sales = Sale.objects.filter(
            shop=shop,
            cashier=cashier,
            created_at__range=[day_start, day_end],
            status='completed'
        )
        
        print(f"  Sales count: {today_sales.count()}")
        
        for sale in today_sales:
            if sale.payment_method == 'split':
                sale_payments = SalePayment.objects.filter(sale=sale)
                for payment in sale_payments:
                    currency = payment.currency.upper()
                    method = payment.payment_method
                    amount = Decimal(str(payment.amount))
                    
                    if currency == 'USD' and method in exp_usd:
                        exp_usd[method] += amount
                    elif currency == 'ZIG' and method in exp_zig:
                        exp_zig[method] += amount
                    elif currency == 'RAND' and method in exp_rand:
                        exp_rand[method] += amount
                
                # Handle change for split payments
                total_paid_usd = Decimal('0')
                for payment in sale_payments:
                    if payment.currency == 'USD':
                        total_paid_usd += Decimal(str(payment.amount))
                    elif exchange_rates:
                        try:
                            amount_usd = exchange_rates.convert_amount(payment.amount, payment.currency, 'USD')
                            total_paid_usd += Decimal(str(amount_usd))
                        except:
                            pass
                
                sale_total = Decimal(str(sale.total_amount))
                if total_paid_usd > sale_total:
                    change_usd = total_paid_usd - sale_total
                    change_int_usd = int(change_usd)
                    change_frac_usd = change_usd - Decimal(change_int_usd)
                    
                    if change_int_usd > 0:
                        exp_usd['cash'] -= Decimal(change_int_usd)
                    
                    if change_frac_usd > 0 and exchange_rates:
                        try:
                            change_zig = exchange_rates.convert_amount(change_frac_usd, 'USD', 'ZIG')
                            exp_zig['cash'] -= Decimal(str(change_zig))
                        except:
                            exp_usd['cash'] -= change_frac_usd
            else:
                # Handle regular payments
                sale_amount = Decimal(str(sale.total_amount))
                currency = (sale.payment_currency or 'USD').upper()
                method = sale.payment_method
                
                if currency == 'USD':
                    if method == 'cash':
                        exp_usd['cash'] += sale_amount
                    elif method == 'card':
                        exp_usd['card'] += sale_amount
                    elif method == 'ecocash':
                        exp_usd['ecocash'] += sale_amount
                elif currency == 'ZIG':
                    if method == 'cash':
                        exp_zig['cash'] += sale_amount
                    elif method == 'card':
                        exp_zig['card'] += sale_amount
                    elif method == 'ecocash':
                        exp_zig['ecocash'] += sale_amount
                elif currency == 'RAND':
                    if method == 'cash':
                        exp_rand['cash'] += sale_amount
                    elif method == 'card':
                        exp_rand['card'] += sale_amount
                    elif method == 'ecocash':
                        exp_rand['ecocash'] += sale_amount
                
                # Handle change for cash payments
                if method == 'cash' and sale.amount_received:
                    amount_received = Decimal(str(sale.amount_received))
                    if amount_received > sale_amount:
                        change_amount = amount_received - sale_amount
                        
                        if currency == 'USD':
                            change_int_usd = int(change_amount)
                            change_frac_usd = change_amount - Decimal(change_int_usd)
                            
                            if change_int_usd > 0:
                                exp_usd['cash'] -= Decimal(change_int_usd)
                            
                            if change_frac_usd > 0 and exchange_rates:
                                try:
                                    change_zig = exchange_rates.convert_amount(change_frac_usd, 'USD', 'ZIG')
                                    exp_zig['cash'] -= Decimal(str(change_zig))
                                except:
                                    exp_usd['cash'] -= change_frac_usd
                        elif currency == 'ZIG':
                            exp_zig['cash'] -= change_amount
                        elif currency == 'RAND':
                            exp_rand['cash'] -= change_amount
    except Exception as e:
        print(f"  ERROR calculating sales: {e}")
        import traceback
        print(traceback.format_exc())
    
    # Subtract staff lunch deductions (only for THIS cashier)
    staff_lunch_total = Decimal('0')
    try:
        staff_lunches = StaffLunch.objects.filter(
            shop=shop,
            cashier=cashier,  # CRITICAL: Only THIS cashier's lunches
            created_at__range=[day_start, day_end],
            product=None  # Money lunch only
        )
        staff_lunch_total = sum([Decimal(str(lunch.total_cost)) for lunch in staff_lunches])
        exp_usd['cash'] -= staff_lunch_total
        print(f"  Staff lunches (this cashier): {staff_lunches.count()}, Total: ${staff_lunch_total}")
    except Exception as e:
        print(f"  ERROR calculating staff lunch: {e}")
    
    # Calculate NEW expected amounts
    new_expected_usd = float_usd + exp_usd['cash']
    new_expected_zig = float_zig + exp_zig['cash']
    new_expected_rand = float_rand + exp_rand['cash']
    
    print(f"  Sales cash USD: ${exp_usd['cash'] + staff_lunch_total}")
    print(f"  Staff lunch deduction: -${staff_lunch_total}")
    print(f"  Net sales cash: ${exp_usd['cash']}")
    print(f"  Float: ${float_usd}")
    print(f"  NEW Expected USD: ${float_usd} + ${exp_usd['cash']} = ${new_expected_usd}")
    
    # VALIDATION: Expected should NEVER be negative unless there's more staff lunch than sales
    if new_expected_usd < 0:
        print(f"  ⚠️ WARNING: Expected USD is still negative after calculation!")
        print(f"     This means staff lunch (${staff_lunch_total}) exceeds sales (${exp_usd['cash'] + staff_lunch_total})")
        print(f"     Setting expected to $0.00 to prevent negative values.")
        new_expected_usd = Decimal('0')
    
    # Update the count record
    count.expected_cash_usd = new_expected_usd
    count.expected_cash_zig = new_expected_zig
    count.expected_cash_rand = new_expected_rand
    count.expected_cash = new_expected_usd  # Legacy field
    count.expected_card = exp_usd['card'] + exp_zig['card'] + exp_rand['card']
    count.expected_ecocash = exp_usd['ecocash'] + exp_zig['ecocash'] + exp_rand['ecocash']
    
    # Recalculate variances
    count.cash_variance = count.total_cash - count.expected_cash
    count.cash_variance_usd = count.total_cash_usd - count.expected_cash_usd
    count.cash_variance_zig = count.total_cash_zig - count.expected_cash_zig
    count.cash_variance_rand = count.total_cash_rand - count.expected_cash_rand
    count.card_variance = count.total_card - count.expected_card
    count.ecocash_variance = count.total_ecocash - count.expected_ecocash
    count.total_variance = count.cash_variance + count.card_variance + count.ecocash_variance
    
    count.save()
    fixed_count += 1
    print(f"  ✓ SAVED - Expected: ${new_expected_usd}, Variance: ${count.cash_variance_usd}")

print()
print("=" * 70)
print(f"FIXED {fixed_count} CASHIER COUNT RECORDS")
print("=" * 70)
print()
print("Next steps:")
print("1. Refresh your EOD reconciliation screen to see corrected values")
print("2. The expected amounts should now match: Float + Sales - Change - StaffLunch")
print("3. Variances will be recalculated based on the corrected expected amounts")
print()
