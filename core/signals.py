# Auto-update cash float drawer when sales are made
from django.db.models.signals import post_save
from django.dispatch import receiver
from core.models import Sale, CashFloat
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Sale)
def update_cash_float_on_sale(sender, instance, created, **kwargs):
    """
    Automatically update cash float drawer when a sale is created or updated
    """
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
                    'float_amount': 0,
                    'current_cash': 0,
                    'current_card': 0,
                    'current_ecocash': 0,
                    'current_transfer': 0,
                    'current_total': 0,
                    'session_cash_sales': 0,
                    'session_card_sales': 0,
                    'session_ecocash_sales': 0,
                    'session_transfer_sales': 0,
                    'session_total_sales': 0,
                    'expected_cash_at_eod': 0
                }
            )
            
            # If drawer was just created, activate it
            if created_drawer:
                drawer.status = 'ACTIVE'
            
            # Add the sale to the drawer
            sale_amount = instance.total_amount
            payment_method = instance.payment_method
            
            logger.info(f"Updating drawer for sale: ${sale_amount} {payment_method} by {cashier.name}")
            
            # Log drawer attribution details
            logger.info(f"🔍 DRAWER ATTRIBUTION: Sale by {cashier.name} (ID: {cashier.id}) -> Drawer for {drawer.cashier.name} (ID: {drawer.cashier.id})")
            if cashier.id != drawer.cashier.id:
                logger.warning(f"⚠️ CASHIER MISMATCH: Sale cashier {cashier.id} != Drawer cashier {drawer.cashier.id}")
            
            drawer.add_sale(sale_amount, payment_method)
            
            # Ensure drawer is active
            if drawer.status != 'ACTIVE':
                drawer.status = 'ACTIVE'
                drawer.save()
                
            logger.info(f"Drawer updated successfully. Current cash: ${drawer.current_cash}")
            
        except Exception as e:
            logger.error(f"Error updating cash float for sale {instance.id}: {str(e)}")
            # Don't raise the exception to avoid breaking the sale creation