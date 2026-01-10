"""
Fix drawer synchronization issue
Update drawer fields based on existing sales data
"""
import os
import django
from datetime import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from django.utils import timezone
from django.db.models import Sum
from core.models import ShopConfiguration, Sale, CashFloat, StaffLunch, SalePayment
from decimal import Decimal

def fix_drawer_sync():
    """Fix drawer synchronization by updating drawer fields from sales data"""

    try:
        shop = ShopConfiguration.objects.get()
        today = timezone.localdate()

        print(f"Fixing drawer sync for {shop.name} on {today}")

        # Get all active cashiers
        from core.models import Cashier
        cashiers = Cashier.objects.filter(shop=shop, status='active')

        for cashier in cashiers:
            print(f"\nProcessing cashier: {cashier.name}")

            # Get today's sales for this cashier
            day_start = timezone.make_aware(
                datetime.combine(today, datetime.min.time()),
                timezone.get_current_timezone()
            )
            day_end = timezone.make_aware(
                datetime.combine(today, datetime.max.time()),
                timezone.get_current_timezone()
            )

            today_sales = Sale.objects.filter(
                shop=shop,
                cashier=cashier,
                created_at__range=[day_start, day_end],
                status='completed'
            )

            print(f"Found {today_sales.count()} sales for {cashier.name}")

            # Calculate totals by currency and payment method
            currency_totals = {
                'USD': {'cash': Decimal('0.00'), 'card': Decimal('0.00'), 'ecocash': Decimal('0.00'), 'transfer': Decimal('0.00'), 'total': Decimal('0.00')},
                'ZIG': {'cash': Decimal('0.00'), 'card': Decimal('0.00'), 'ecocash': Decimal('0.00'), 'transfer': Decimal('0.00'), 'total': Decimal('0.00')},
                'RAND': {'cash': Decimal('0.00'), 'card': Decimal('0.00'), 'ecocash': Decimal('0.00'), 'transfer': Decimal('0.00'), 'total': Decimal('0.00')}
            }

            # Process single payments
            for currency_code in ['USD', 'ZIG', 'RAND']:
                currency_sales = today_sales.filter(payment_currency=currency_code)

                cash_sales = currency_sales.filter(payment_method='cash').aggregate(
                    total=Sum('total_amount')
                )['total'] or Decimal('0.00')

                card_sales = currency_sales.filter(payment_method='card').aggregate(
                    total=Sum('total_amount')
                )['total'] or Decimal('0.00')

                ecocash_sales = currency_sales.filter(payment_method='ecocash').aggregate(
                    total=Sum('total_amount')
                )['total'] or Decimal('0.00')

                transfer_sales = currency_sales.filter(payment_method='transfer').aggregate(
                    total=Sum('total_amount')
                )['total'] or Decimal('0.00')

                currency_totals[currency_code]['cash'] = cash_sales
                currency_totals[currency_code]['card'] = card_sales
                currency_totals[currency_code]['ecocash'] = ecocash_sales
                currency_totals[currency_code]['transfer'] = transfer_sales
                currency_totals[currency_code]['total'] = cash_sales + card_sales + ecocash_sales + transfer_sales

            # Process split payments
            split_sales = today_sales.filter(payment_method='split')
            for sale in split_sales:
                sale_payments = SalePayment.objects.filter(sale=sale)
                for payment in sale_payments:
                    currency = payment.currency
                    method = payment.payment_method
                    amount = payment.amount

                    if currency in currency_totals and method in currency_totals[currency]:
                        currency_totals[currency][method] += amount
                        currency_totals[currency]['total'] += amount

            # Get or create drawer
            drawer, created = CashFloat.objects.get_or_create(
                shop=shop,
                cashier=cashier,
                date=today,
                defaults={'status': 'ACTIVE'}
            )

            print(f"Drawer {'created' if created else 'found'}: {drawer}")

            # Update drawer fields
            for currency_code, totals in currency_totals.items():
                if currency_code == 'USD':
                    drawer.session_cash_sales_usd = totals['cash']
                    drawer.session_card_sales_usd = totals['card']
                    drawer.session_ecocash_sales_usd = totals['ecocash']
                    drawer.session_transfer_sales_usd = totals['transfer']
                    drawer.session_total_sales_usd = totals['total']
                    drawer.current_cash_usd = totals['cash']
                    drawer.current_card_usd = totals['card']
                    drawer.current_ecocash_usd = totals['ecocash']
                    drawer.current_transfer_usd = totals['transfer']
                    drawer.current_total_usd = totals['total']
                elif currency_code == 'ZIG':
                    drawer.session_cash_sales_zig = totals['cash']
                    drawer.session_card_sales_zig = totals['card']
                    drawer.session_ecocash_sales_zig = totals['ecocash']
                    drawer.session_transfer_sales_zig = totals['transfer']
                    drawer.session_total_sales_zig = totals['total']
                    drawer.current_cash_zig = totals['cash']
                    drawer.current_card_zig = totals['card']
                    drawer.current_ecocash_zig = totals['ecocash']
                    drawer.current_transfer_zig = totals['transfer']
                    drawer.current_total_zig = totals['total']
                elif currency_code == 'RAND':
                    drawer.session_cash_sales_rand = totals['cash']
                    drawer.session_card_sales_rand = totals['card']
                    drawer.session_ecocash_sales_rand = totals['ecocash']
                    drawer.session_transfer_sales_rand = totals['transfer']
                    drawer.session_total_sales_rand = totals['total']
                    drawer.current_cash_rand = totals['cash']
                    drawer.current_card_rand = totals['card']
                    drawer.current_ecocash_rand = totals['ecocash']
                    drawer.current_transfer_rand = totals['transfer']
                    drawer.current_total_rand = totals['total']

            # Update legacy fields (use USD as primary)
            drawer.session_cash_sales = drawer.session_cash_sales_usd
            drawer.session_card_sales = drawer.session_card_sales_usd
            drawer.session_ecocash_sales = drawer.session_ecocash_sales_usd
            drawer.session_transfer_sales = drawer.session_transfer_sales_usd
            drawer.session_total_sales = drawer.session_total_sales_usd

            drawer.current_cash = drawer.current_cash_usd
            drawer.current_card = drawer.current_card_usd
            drawer.current_ecocash = drawer.current_ecocash_usd
            drawer.current_transfer = drawer.current_transfer_usd
            drawer.current_total = drawer.current_total_usd

            # Account for staff lunch deductions
            today_staff_lunches = StaffLunch.objects.filter(
                shop=shop,
                created_at__range=[day_start, day_end],
                product=None  # Money lunches only
            )
            staff_lunch_total = today_staff_lunches.aggregate(total=Sum('total_cost'))['total'] or Decimal('0.00')

            if staff_lunch_total > 0:
                print(f"Applying staff lunch deduction: ${staff_lunch_total}")
                drawer.current_cash_usd -= staff_lunch_total
                drawer.current_total_usd -= staff_lunch_total
                drawer.session_cash_sales_usd -= staff_lunch_total
                drawer.session_total_sales_usd -= staff_lunch_total

                # Update legacy fields
                drawer.current_cash -= staff_lunch_total
                drawer.current_total -= staff_lunch_total
                drawer.session_cash_sales -= staff_lunch_total
                drawer.session_total_sales -= staff_lunch_total

            # Update expected cash
            drawer.expected_cash_at_eod = drawer.float_amount + drawer.session_cash_sales_usd
            drawer.expected_cash_usd = drawer.float_amount + drawer.session_cash_sales_usd
            drawer.expected_cash_zig = drawer.float_amount_zig + drawer.session_cash_sales_zig
            drawer.expected_cash_rand = drawer.float_amount_rand + drawer.session_cash_sales_rand

            drawer.last_activity = timezone.now()
            drawer.save()

            print(f"Updated drawer: USD=${drawer.current_total_usd}, ZIG={drawer.current_total_zig}, RAND={drawer.current_total_rand}")

        print("\nDrawer sync fix completed!")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    fix_drawer_sync()