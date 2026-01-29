
from django.db.models.signals import post_save
from django.dispatch import receiver
from core.models import Sale, CashFloat, StaffLunch, ShopDay
from django.utils import timezone
from core.models_exchange_rates import ExchangeRate
from django.db.models import Sum
from django.db import transaction
from decimal import Decimal
import logging
import datetime

logger = logging.getLogger(__name__)


@receiver(post_save, sender=ShopDay)
def auto_create_reconciliation_session(sender, instance, created, **kwargs):
    """
    Automatically create a reconciliation session when a new shop day is opened.
    This ensures EOD reconciliation is always available for the current day.
    """
    if created and instance.status == 'OPEN':
        try:
            from .models_reconciliation import ReconciliationSession
            session, session_created = ReconciliationSession.get_or_create_session(
                shop=instance.shop,
                date=instance.date
            )
            if session_created:
                session.start_session()
                logger.info(f"Auto-created reconciliation session for {instance.shop.name} on {instance.date}")
        except Exception as e:
            logger.error(f"Failed to auto-create reconciliation session: {e}")

@receiver(post_save, sender=Sale)
def update_cash_float_on_sale(sender, instance, created, **kwargs):
    """
    Automatically update cash float drawer when a sale is created or updated
    ENHANCED: Now tracks currency-specific drawer amounts
    CRITICAL FIX: Uses proper timezone-aware date filtering to only show today's sales
    """
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

        # Fetch current exchange rates
        try:
            exchange_rates = ExchangeRate.get_current_rates()
        except Exception as e:
            logger.error(f"Could not fetch exchange rates: {e}")
            exchange_rates = None

        # Calculate actual totals from database by payment_currency and payment method
        # CRITICAL FIX: Handle both single payments and split payments
        from .models import SalePayment

        # Initialize currency totals
        currency_totals = {
            'USD': {'cash': Decimal('0.00'), 'card': Decimal('0.00'), 'ecocash': Decimal('0.00'), 'transfer': Decimal('0.00'), 'total': Decimal('0.00')},
            'ZIG': {'cash': Decimal('0.00'), 'card': Decimal('0.00'), 'ecocash': Decimal('0.00'), 'transfer': Decimal('0.00'), 'total': Decimal('0.00')},
            'RAND': {'cash': Decimal('0.00'), 'card': Decimal('0.00'), 'ecocash': Decimal('0.00'), 'transfer': Decimal('0.00'), 'total': Decimal('0.00')}
        }


        # Process split payments - aggregate from SalePayment records
        split_sales = actual_sales_today.filter(payment_method='split')
        for sale in split_sales:
            # Get all payments for this sale
            sale_payments = SalePayment.objects.filter(sale=sale)
            for payment in sale_payments:
                currency = payment.currency
                method = payment.payment_method
                amount = payment.amount
                amount_received = payment.amount_received

                # Add the sale amount to currency totals
                # Use amount_received for cash inflow if available to track physical cash
                amount_to_add = amount
                if method == 'cash' and amount_received is not None:
                    amount_to_add = amount_received

                if currency in currency_totals and method in currency_totals[currency]:
                    currency_totals[currency][method] += amount_to_add
                    currency_totals[currency]['total'] += amount_to_add

                # Calculate change for this specific payment method if amount_received is provided
                if amount_received and amount_received > amount:
                    change_amount = amount_received - amount

                    # STRICT LOGIC: Deduct change from the SAME currency as payment
                    # This prevents negative balances in other currencies
                    if currency in currency_totals:
                        currency_totals[currency]['cash'] -= change_amount
                        currency_totals[currency]['total'] -= change_amount
                        logger.info(f"Deducting change {change_amount} {currency} from drawer")

        # Process single payments (non-split)
        single_sales = actual_sales_today.exclude(payment_method='split')
        for sale in single_sales:
            # Use the saved total_amount which is already in payment_currency
            # Do NOT recalculate from items as they might be in a different base currency
            sale_amount = sale.total_amount
            payment_method = sale.payment_method
            payment_currency = sale.payment_currency or 'USD'

            # Determine amount received (in payment currency)
            amount_received = sale.amount_received if sale.amount_received is not None else sale_amount

            # Add inflow to drawer (Amount Received)
            if payment_currency in currency_totals and payment_method in currency_totals[payment_currency]:
                currency_totals[payment_currency][payment_method] += amount_received
                currency_totals[payment_currency]['total'] += amount_received
                logger.info(f"Sale {sale.id}: Added {amount_received} to {payment_currency} {payment_method}")

            # Handle change for cash payments
            if payment_method == 'cash' and amount_received > sale_amount:
                change_amount = amount_received - sale_amount
                
                # HYBRID LOGIC for USD: Split change into Notes (USD) and Cents (ZIG)
                if payment_currency == 'USD':
                    change_int_usd = int(change_amount)
                    change_frac_usd = change_amount - Decimal(change_int_usd)
                    
                    # Deduct Integer USD (Notes) from drawer
                    if change_int_usd > 0:
                        currency_totals['USD']['cash'] -= Decimal(change_int_usd)
                        currency_totals['USD']['total'] -= Decimal(change_int_usd)
                        logger.info(f"Deducting change {change_int_usd} USD from drawer")
                    
                    # Deduct Fractional part (converted to ZIG) from drawer
                    if change_frac_usd > 0:
                        if exchange_rates:
                            try:
                                change_zig = exchange_rates.convert_amount(change_frac_usd, 'USD', 'ZIG')
                                currency_totals['ZIG']['cash'] -= change_zig
                                currency_totals['ZIG']['total'] -= change_zig
                                logger.info(f"Deducting change {change_zig} ZIG (from {change_frac_usd} USD) from drawer")
                            except Exception as e:
                                logger.error(f"Error converting fractional change to ZIG: {e}")
                                # Fallback: deduct from USD if conversion fails
                                currency_totals['USD']['cash'] -= change_frac_usd
                                currency_totals['USD']['total'] -= change_frac_usd
                        else:
                            # No rates available, deduct from USD
                            currency_totals['USD']['cash'] -= change_frac_usd
                            currency_totals['USD']['total'] -= change_frac_usd
                
                # STANDARD LOGIC for ZIG/RAND: Deduct full change from same currency
                elif payment_currency in currency_totals:
                    currency_totals[payment_currency]['cash'] -= change_amount
                    currency_totals[payment_currency]['total'] -= change_amount
                    logger.info(f"Deducting change {change_amount} {payment_currency} from drawer")

        # Update drawer currency-specific fields
        for currency_code, totals in currency_totals.items():
            if currency_code == 'USD':
                drawer.session_cash_sales_usd = totals['cash']
                drawer.session_card_sales_usd = totals['card']
                drawer.session_ecocash_sales_usd = totals['ecocash']
                drawer.session_transfer_sales_usd = totals['transfer']
                drawer.session_total_sales_usd = totals['total']
                drawer.current_cash_usd = drawer.float_amount + totals['cash']
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
                drawer.current_cash_zig = drawer.float_amount_zig + totals['cash']
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
                drawer.current_cash_rand = drawer.float_amount_rand + totals['cash']
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

        # PERMANENT FIX: Staff lunch is ONLY deducted in CashierCount.update_from_cash_float()
        # when calculating the expected amount for reconciliation.
        # We do NOT deduct it from the drawer here because:
        # 1. The drawer tracks ACTUAL sales (what came into the till)
        # 2. Staff lunch is a deduction from what the cashier needs to account for
        # 3. Expected amount = Float + Sales - Staff Lunch
        # 4. If we deduct lunch from both drawer AND expected, we get double-deduction
        #
        # The drawer fields (current_cash, session_cash_sales) show raw sales data.
        # The expected_cash_at_eod already includes the calculation in update_expected_cash().

        # Update last activity
        drawer.last_activity = timezone.now()
        drawer.save()

        logger.info(f"Drawer synchronized with actual sales by currency for {today}. Total USD: ${drawer.current_total_usd}, ZIG: {drawer.current_total_zig}, RAND: {drawer.current_total_rand}")

    except Exception as e:
        logger.error(f"Error updating cash float for sale {instance.id}: {str(e)}")
        # Don't raise the exception to avoid breaking the sale creation