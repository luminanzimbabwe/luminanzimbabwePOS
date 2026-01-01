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
    ENHANCED: Improved logic to prevent calculation errors and ensure accurate accumulation
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
                    'expected_cash_at_eod': Decimal('0.00')
                }
            )
            
            # If drawer was just created, activate it
            if created_drawer:
                drawer.status = 'ACTIVE'
            
            # Add the sale to the drawer
            sale_amount = Decimal(str(instance.total_amount))
            payment_method = instance.payment_method
            
            logger.info(f"Updating drawer for sale: ${sale_amount} {payment_method} by {cashier.name} (Sale ID: {instance.id})")
            
            # Use the drawer's add_sale method which properly accumulates values
            drawer.add_sale(sale_amount, payment_method)
            
            # Ensure drawer is active
            if drawer.status != 'ACTIVE':
                drawer.status = 'ACTIVE'
                drawer.save()
                
            logger.info(f"Drawer updated successfully. Current cash: ${drawer.current_cash}, Session total: ${drawer.session_total_sales}")
            
            # COMPREHENSIVE VERIFICATION: Recalculate totals from actual sales to prevent drift
            # This ensures drawer always matches actual sales data
            actual_sales_today = Sale.objects.filter(
                shop=shop,
                cashier=cashier,
                created_at__date=today,
                status='completed'
            )
            
            # Calculate actual totals from database
            actual_cash_sales = actual_sales_today.filter(payment_method='cash').aggregate(
                total=models.Sum('total_amount')
            )['total'] or Decimal('0.00')
            
            actual_card_sales = actual_sales_today.filter(payment_method='card').aggregate(
                total=models.Sum('total_amount')
            )['total'] or Decimal('0.00')
            
            actual_ecocash_sales = actual_sales_today.filter(payment_method='ecocash').aggregate(
                total=models.Sum('total_amount')
            )['total'] or Decimal('0.00')
            
            actual_transfer_sales = actual_sales_today.filter(payment_method='transfer').aggregate(
                total=models.Sum('total_amount')
            )['total'] or Decimal('0.00')
            
            actual_total_sales = actual_cash_sales + actual_card_sales + actual_ecocash_sales + actual_transfer_sales
            
            # Update drawer to match actual sales (prevents drift)
            drawer.session_cash_sales = actual_cash_sales
            drawer.session_card_sales = actual_card_sales
            drawer.session_ecocash_sales = actual_ecocash_sales
            drawer.session_transfer_sales = actual_transfer_sales
            drawer.session_total_sales = actual_total_sales
            
            # Update current amounts to match sales (cash in drawer = cash sales, etc.)
            drawer.current_cash = actual_cash_sales
            drawer.current_card = actual_card_sales
            drawer.current_ecocash = actual_ecocash_sales
            drawer.current_transfer = actual_transfer_sales
            drawer.current_total = actual_total_sales
            
            # Update expected cash at EOD
            drawer.expected_cash_at_eod = drawer.float_amount + drawer.session_cash_sales
            
            # Update last activity
            drawer.last_activity = timezone.now()
            drawer.save()
            
            logger.info(f"Drawer synchronized with actual sales. Cash: ${drawer.current_cash}, Total: ${drawer.session_total_sales}")
            
        except Exception as e:
            logger.error(f"Error updating cash float for sale {instance.id}: {str(e)}")
            # Don't raise the exception to avoid breaking the sale creation