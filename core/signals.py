# Auto-update cash float drawer when sales are made
from django.db.models.signals import post_save
from django.dispatch import receiver
from core.models import Sale, CashFloat
from django.utils import timezone
from django.db.models import Sum
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Sale)
def update_cash_float_on_sale(sender, instance, created, **kwargs):
    """
    Automatically update cash float drawer when a sale is created or updated
    ENHANCED: Now tracks currency-specific drawer amounts
    """
    # Only process new sales or completed sales that haven't been processed yet
    if created or (instance.status == 'completed' and not hasattr(instance, '_cash_float_updated')):
        try:
            # Mark that we've updated the cash float to avoid recursive updates
            instance._cash_float_updated = True
            
            # Get the shop and cashier
            shop = instance.shop
            cashier = instance.cashier
            
            # Get or create the drawer for today
            today = timezone.now().date()
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
            payment_currency = instance.payment_currency or 'USD'  # Use payment_currency to determine which bank
            
            logger.info(f"Processing sale: ${sale_amount} {payment_method} in {payment_currency} by {cashier.name} (Sale ID: {instance.id})")
            
            # Ensure drawer is active
            if drawer.status != 'ACTIVE':
                drawer.status = 'ACTIVE'
                
            # NOTE: Skipping add_sale() call to avoid double-counting
            # Drawer will be updated by the comprehensive database recalculation below
            logger.info(f"Will synchronize drawer with all sales data for accurate currency tracking")
            
            # COMPREHENSIVE VERIFICATION: Recalculate totals from actual sales to prevent drift
            # This ensures drawer always matches actual sales data including currency breakdowns
            actual_sales_today = Sale.objects.filter(
                shop=shop,
                cashier=cashier,
                created_at__date=today,
                status='completed'
            )
            
            # Calculate actual totals from database by payment_currency and payment method
            # CRITICAL FIX: Use payment_currency to determine which bank the money went to
            for currency_code in ['USD', 'ZIG', 'RAND']:
                currency_sales = actual_sales_today.filter(payment_currency=currency_code)
                
                # Calculate by payment method for this currency
                from django.db.models import Sum
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
                
                total_sales = cash_sales + card_sales + ecocash_sales + transfer_sales
                
                # Update drawer currency-specific fields
                if currency_code == 'USD':
                    drawer.session_cash_sales_usd = cash_sales
                    drawer.session_card_sales_usd = card_sales
                    drawer.session_ecocash_sales_usd = ecocash_sales
                    drawer.session_transfer_sales_usd = transfer_sales
                    drawer.session_total_sales_usd = total_sales
                    drawer.current_cash_usd = cash_sales
                    drawer.current_card_usd = card_sales
                    drawer.current_ecocash_usd = ecocash_sales
                    drawer.current_transfer_usd = transfer_sales
                    drawer.current_total_usd = total_sales
                elif currency_code == 'ZIG':
                    drawer.session_cash_sales_zig = cash_sales
                    drawer.session_card_sales_zig = card_sales
                    drawer.session_ecocash_sales_zig = ecocash_sales
                    drawer.session_transfer_sales_zig = transfer_sales
                    drawer.session_total_sales_zig = total_sales
                    drawer.current_cash_zig = cash_sales
                    drawer.current_card_zig = card_sales
                    drawer.current_ecocash_zig = ecocash_sales
                    drawer.current_transfer_zig = transfer_sales
                    drawer.current_total_zig = total_sales
                elif currency_code == 'RAND':
                    drawer.session_cash_sales_rand = cash_sales
                    drawer.session_card_sales_rand = card_sales
                    drawer.session_ecocash_sales_rand = ecocash_sales
                    drawer.session_transfer_sales_rand = transfer_sales
                    drawer.session_total_sales_rand = total_sales
                    drawer.current_cash_rand = cash_sales
                    drawer.current_card_rand = card_sales
                    drawer.current_ecocash_rand = ecocash_sales
                    drawer.current_transfer_rand = transfer_sales
                    drawer.current_total_rand = total_sales
            
            # Update legacy fields for backward compatibility using PRIMARY CURRENCY
            # This ensures legacy fields show the actual currency used in sales, not just USD
            
            # Determine primary currency based on total sales
            usd_total = drawer.session_total_sales_usd
            zig_total = drawer.session_total_sales_zig
            rand_total = drawer.session_total_sales_rand
            
            primary_currency = 'USD'  # Default fallback
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
            else:  # USD
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
            # This ensures EOD expectations match the actual currency used
            if primary_currency == 'ZIG':
                drawer.expected_cash_at_eod = drawer.float_amount + drawer.session_cash_sales_zig
            elif primary_currency == 'RAND':
                drawer.expected_cash_at_eod = drawer.float_amount + drawer.session_cash_sales_rand
            else:
                drawer.expected_cash_at_eod = drawer.float_amount + drawer.session_cash_sales_usd
            
            # Update last activity
            drawer.last_activity = timezone.now()
            drawer.save()
            
            logger.info(f"Drawer synchronized with actual sales by currency. Total USD: ${drawer.current_total_usd}, ZIG: {drawer.current_total_zig}, RAND: {drawer.current_total_rand}")
            
        except Exception as e:
            logger.error(f"Error updating cash float for sale {instance.id}: {str(e)}")
            # Don't raise the exception to avoid breaking the sale creation