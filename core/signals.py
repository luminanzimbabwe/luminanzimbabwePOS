# Auto-update cash float drawer when sales are made
from django.db.models.signals import post_save
from django.dispatch import receiver
from core.models import Sale, CashFloat, StaffLunch
from django.utils import timezone
from django.db.models import Sum
from django.db import transaction
from decimal import Decimal
import logging
import datetime

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Sale)
def update_cash_float_on_sale(sender, instance, created, **kwargs):
    """
    Automatically update cash float drawer when a sale is created or updated
    ENHANCED: Now tracks currency-specific drawer amounts
    CRITICAL FIX: Uses proper timezone-aware date filtering to only show today's sales
    """
    # Only process new sales or completed sales that haven't been processed yet
    if created or (instance.status == 'completed' and not hasattr(instance, '_cash_float_updated')):
        try:
            # Mark that we've updated the cash float to avoid recursive updates
            instance._cash_float_updated = True
            
            # Get the shop and cashier
            shop = instance.shop
            cashier = instance.cashier
            
            # CRITICAL FIX: Use timezone-aware datetime range for proper date filtering
            # This ensures we only get today's sales regardless of server timezone
            today = timezone.localdate()  # Local date (Africa/Harare)
            
            # Create proper timezone-aware datetime range for the local day
            # This ensures we capture all sales made during local business hours (00:00 to 23:59:59 local time)
            day_start = timezone.make_aware(
                datetime.datetime.combine(today, datetime.time.min),
                timezone.get_current_timezone()
            )
            day_end = timezone.make_aware(
                datetime.datetime.combine(today, datetime.time.max),
                timezone.get_current_timezone()
            )
            
            logger.info(f"Processing sale for drawer update - Local date: {today}, Range: {day_start} to {day_end}")
            
            # Get or create the drawer for today
            drawer, created_drawer = CashFloat.objects.get_or_create(
                shop=shop,
                cashier=cashier,
                date=today,
                defaults={
                    'status': 'ACTIVE',
                    'float_amount': Decimal('0.00'),
                    # Legacy fields
                    'current_cash': Decimal('0.00'),
                    'current_card': Decimal('0.00'),
                    'current_ecocash': Decimal('0.00'),
                    'current_transfer': Decimal('0.00'),
                    'current_total': Decimal('0.00'),
                    'session_cash_sales': Decimal('0.00'),
                    'session_card_sales': Decimal('0.00'),
                    'session_ecocash_sales': Decimal('0.00'),
                    'session_transfer_sales': Decimal('0.00'),
                    'session_total_sales': Decimal('0.00'),
                    'expected_cash_at_eod': Decimal('0.00'),
                    # Currency-specific fields
                    'current_cash_usd': Decimal('0.00'),
                    'current_cash_zig': Decimal('0.00'),
                    'current_cash_rand': Decimal('0.00'),
                    'current_card_usd': Decimal('0.00'),
                    'current_card_zig': Decimal('0.00'),
                    'current_card_rand': Decimal('0.00'),
                    'current_ecocash_usd': Decimal('0.00'),
                    'current_ecocash_zig': Decimal('0.00'),
                    'current_ecocash_rand': Decimal('0.00'),
                    'current_transfer_usd': Decimal('0.00'),
                    'current_transfer_zig': Decimal('0.00'),
                    'current_transfer_rand': Decimal('0.00'),
                    'current_total_usd': Decimal('0.00'),
                    'current_total_zig': Decimal('0.00'),
                    'current_total_rand': Decimal('0.00'),
                    'session_cash_sales_usd': Decimal('0.00'),
                    'session_cash_sales_zig': Decimal('0.00'),
                    'session_cash_sales_rand': Decimal('0.00'),
                    'session_card_sales_usd': Decimal('0.00'),
                    'session_card_sales_zig': Decimal('0.00'),
                    'session_card_sales_rand': Decimal('0.00'),
                    'session_ecocash_sales_usd': Decimal('0.00'),
                    'session_ecocash_sales_zig': Decimal('0.00'),
                    'session_ecocash_sales_rand': Decimal('0.00'),
                    'session_transfer_sales_usd': Decimal('0.00'),
                    'session_transfer_sales_zig': Decimal('0.00'),
                    'session_transfer_sales_rand': Decimal('0.00'),
                    'session_total_sales_usd': Decimal('0.00'),
                    'session_total_sales_zig': Decimal('0.00'),
                    'session_total_sales_rand': Decimal('0.00')
                }
            )
            
            # If drawer was just created, activate it
            if created_drawer:
                drawer.status = 'ACTIVE'
            
            # Add the sale to the drawer with currency tracking
            sale_amount = Decimal(str(instance.total_amount))
            payment_method = instance.payment_method
            payment_currency = instance.payment_currency or 'USD'
            
            logger.info(f"Processing sale: ${sale_amount} {payment_method} in {payment_currency} by {cashier.name} (Sale ID: {instance.id})")
            
            # Ensure drawer is active
            if drawer.status != 'ACTIVE':
                drawer.status = 'ACTIVE'
            
            # CRITICAL FIX: Use proper timezone-aware datetime range for filtering
            # This ensures we ONLY count sales from TODAY (local time), not old sales
            actual_sales_today = Sale.objects.filter(
                shop=shop,
                cashier=cashier,
                created_at__range=[day_start, day_end],
                status='completed'
            )

            logger.info(f"Signal processing {actual_sales_today.count()} sales for {cashier.name} on {today}")
            for sale in actual_sales_today:
                logger.info(f"  Sale {sale.id}: {sale.payment_method} {sale.payment_currency} ${sale.total_amount}")
            
            logger.info(f"Found {actual_sales_today.count()} completed sales for today ({today})")
            
            # Calculate actual totals from database by payment_currency and payment method
            # CRITICAL FIX: Handle both single payments and split payments
            from .models import SalePayment

            # Initialize currency totals
            currency_totals = {
                'USD': {'cash': Decimal('0.00'), 'card': Decimal('0.00'), 'ecocash': Decimal('0.00'), 'transfer': Decimal('0.00'), 'total': Decimal('0.00')},
                'ZIG': {'cash': Decimal('0.00'), 'card': Decimal('0.00'), 'ecocash': Decimal('0.00'), 'transfer': Decimal('0.00'), 'total': Decimal('0.00')},
                'RAND': {'cash': Decimal('0.00'), 'card': Decimal('0.00'), 'ecocash': Decimal('0.00'), 'transfer': Decimal('0.00'), 'total': Decimal('0.00')}
            }

            # Process single payments (non-split)
            for currency_code in ['USD', 'ZIG', 'RAND']:
                currency_sales = actual_sales_today.filter(payment_currency=currency_code)

                # Calculate by payment method for this currency
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

                # Add to currency totals
                currency_totals[currency_code]['cash'] += cash_sales
                currency_totals[currency_code]['card'] += card_sales
                currency_totals[currency_code]['ecocash'] += ecocash_sales
                currency_totals[currency_code]['transfer'] += transfer_sales
                currency_totals[currency_code]['total'] += cash_sales + card_sales + ecocash_sales + transfer_sales

            # Process split payments - aggregate from SalePayment records
            split_sales = actual_sales_today.filter(payment_method='split')
            for sale in split_sales:
                # Get all payments for this sale
                sale_payments = SalePayment.objects.filter(sale=sale)
                for payment in sale_payments:
                    currency = payment.currency
                    method = payment.payment_method
                    amount = payment.amount

                    if currency in currency_totals and method in currency_totals[currency]:
                        currency_totals[currency][method] += amount
                        currency_totals[currency]['total'] += amount

            # Update drawer currency-specific fields
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
            
            # Update legacy fields for backward compatibility using PRIMARY CURRENCY
            # Determine primary currency based on total sales
            usd_total = drawer.session_total_sales_usd
            zig_total = drawer.session_total_sales_zig
            rand_total = drawer.session_total_sales_rand
            
            primary_currency = 'USD'
            if zig_total > 0:
                primary_currency = 'ZIG'
            elif rand_total > 0:
                primary_currency = 'RAND'
            elif usd_total > 0:
                primary_currency = 'USD'
            
            logger.info(f"Setting legacy fields to {primary_currency} values: USD=${usd_total}, ZIG={zig_total}, RAND={rand_total}")
            
            # Set legacy fields to primary currency values
            if primary_currency == 'ZIG':
                drawer.session_cash_sales = drawer.session_cash_sales_zig
                drawer.session_card_sales = drawer.session_card_sales_zig
                drawer.session_ecocash_sales = drawer.session_ecocash_sales_zig
                drawer.session_transfer_sales = drawer.session_transfer_sales_zig
                drawer.session_total_sales = drawer.session_total_sales_zig
                
                drawer.current_cash = drawer.current_cash_zig
                drawer.current_card = drawer.current_card_zig
                drawer.current_ecocash = drawer.current_ecocash_zig
                drawer.current_transfer = drawer.current_transfer_zig
                drawer.current_total = drawer.current_total_zig
            elif primary_currency == 'RAND':
                drawer.session_cash_sales = drawer.session_cash_sales_rand
                drawer.session_card_sales = drawer.session_card_sales_rand
                drawer.session_ecocash_sales = drawer.session_ecocash_sales_rand
                drawer.session_transfer_sales = drawer.session_transfer_sales_rand
                drawer.session_total_sales = drawer.session_total_sales_rand
                
                drawer.current_cash = drawer.current_cash_rand
                drawer.current_card = drawer.current_card_rand
                drawer.current_ecocash = drawer.current_ecocash_rand
                drawer.current_transfer = drawer.current_transfer_rand
                drawer.current_total = drawer.current_total_rand
            else:
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
            
            # Update expected cash at EOD (use primary currency's cash sales + float)
            # CRITICAL FIX: Always update expected_cash_at_eod for ALL currencies, not just primary
            # This ensures variance calculation works correctly for all currencies
            drawer.expected_cash_at_eod = drawer.float_amount + drawer.session_cash_sales_usd
            drawer.expected_cash_usd = drawer.float_amount + drawer.session_cash_sales_usd
            drawer.expected_cash_zig = drawer.float_amount_zig + drawer.session_cash_sales_zig
            drawer.expected_cash_rand = drawer.float_amount_rand + drawer.session_cash_sales_rand
            
            # Also call the model's method for additional consistency
            drawer.update_expected_cash()
            
            # CRITICAL FIX: Account for staff lunch deductions
            # Staff lunch deductions are taken from the drawer, so we need to subtract them
            # from the drawer cash to get the actual money remaining
            today_staff_lunches = StaffLunch.objects.filter(
                shop=shop,
                created_at__range=[day_start, day_end],
                product=None  # Money lunches only (deduct from drawer)
            )
            staff_lunch_total = today_staff_lunches.aggregate(total=Sum('total_cost'))['total'] or Decimal('0.00')
            
            # Subtract staff lunch from drawer cash USD (staff lunch is always in USD)
            if staff_lunch_total > 0:
                logger.info(f"Accounting for staff lunch deductions: ${staff_lunch_total}")
                drawer.current_cash_usd -= staff_lunch_total
                drawer.current_total_usd -= staff_lunch_total
                drawer.session_cash_sales_usd -= staff_lunch_total
                drawer.session_total_sales_usd -= staff_lunch_total
                
                # Also update expected cash (reduce it by staff lunch amount)
                drawer.expected_cash_at_eod -= staff_lunch_total
                drawer.expected_cash_usd -= staff_lunch_total
                
                # Update legacy fields too
                drawer.current_cash -= staff_lunch_total
                drawer.current_total -= staff_lunch_total
                drawer.session_cash_sales -= staff_lunch_total
                drawer.session_total_sales -= staff_lunch_total
            
            # Update last activity
            drawer.last_activity = timezone.now()
            drawer.save()
            
            logger.info(f"Drawer synchronized with actual sales by currency for {today}. Total USD: ${drawer.current_total_usd}, ZIG: {drawer.current_total_zig}, RAND: {drawer.current_total_rand}")
            
        except Exception as e:
            logger.error(f"Error updating cash float for sale {instance.id}: {str(e)}")
            # Don't raise the exception to avoid breaking the sale creation