# Enhanced Negative Stock Alerts for POS System
"""
This module enhances the existing POS system with improved negative stock handling,
including better alerts, warnings, and notifications.
"""

import logging
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from decimal import Decimal

logger = logging.getLogger(__name__)

class NegativeStockAlertManager:
    """
    Enhanced manager for handling negative stock alerts and notifications
    """
    
    @staticmethod
    def check_negative_stock_alert(product, previous_stock=None):
        """
        Check if a product needs negative stock alerts and send notifications
        """
        if not product or product.stock_quantity >= 0:
            return
        
        # Only alert if stock just went negative (transition from positive to negative)
        if previous_stock is not None and previous_stock >= 0 and product.stock_quantity < 0:
            NegativeStockAlertManager._send_negative_stock_alert(product, previous_stock)
            NegativeStockAlertManager._log_negative_stock_event(product, previous_stock)
    
    @staticmethod
    def _send_negative_stock_alert(product, previous_stock):
        """
        Send alerts when stock goes negative
        """
        try:
            oversold_quantity = abs(product.stock_quantity)
            suggested_restock = oversold_quantity + product.min_stock_level
            
            # Create alert message
            alert_message = f"""
🚨 NEGATIVE STOCK ALERT 🚨

Product: {product.name}
Previous Stock: {previous_stock}
Current Stock: {product.stock_quantity}
Oversold By: {oversold_quantity} units
Suggested Restock: {suggested_restock} units
Priority: URGENT

This product has been oversold and requires immediate restocking.
Each day of delay increases customer debt and potential lost sales.

Recommended Action:
1. Restock {suggested_restock} units immediately
2. Review stock tracking accuracy
3. Set up automated low stock alerts

System: POS Stock Management
Time: {timezone.now()}
            """
            
            # Log to system log
            logger.critical(f"NEGATIVE STOCK ALERT: {product.name} is oversold by {oversold_quantity} units")
            
            # TODO: Send email notifications to management
            # This would require email settings configuration
            # send_mail(
            #     subject=f'URGENT: Negative Stock Alert - {product.name}',
            #     message=alert_message,
            #     from_email=settings.DEFAULT_FROM_EMAIL,
            #     recipient_list=[settings.MANAGER_EMAIL],
            #     fail_silently=True
            # )
            
            # TODO: Send SMS notifications if configured
            # This would require SMS service integration
            
        except Exception as e:
            logger.error(f"Failed to send negative stock alert for {product.name}: {str(e)}")
    
    @staticmethod
    def _log_negative_stock_event(product, previous_stock):
        """
        Log negative stock events for audit trail
        """
        try:
            from core.models import InventoryLog
            
            InventoryLog.objects.create(
                shop=product.shop,
                product=product,
                reason_code='NEGATIVE_STOCK_ALERT',
                quantity_change=product.stock_quantity - previous_stock,
                previous_quantity=previous_stock,
                new_quantity=product.stock_quantity,
                reference_number='SYSTEM_ALERT',
                notes=f'AUTOMATIC ALERT: Product went negative - oversold by {abs(product.stock_quantity)} units. Immediate restock required.',
                performed_by=None
            )
            
        except Exception as e:
            logger.error(f"Failed to log negative stock event: {str(e)}")

class EnhancedStockProcessor:
    """
    Enhanced stock processing with better negative stock handling
    """
    
    @staticmethod
    def process_sale_with_enhanced_alerts(shop, cashier, product, quantity, sale_reference=None):
        """
        Process a sale with enhanced negative stock alerts and handling
        """
        try:
            # Get current stock before sale
            previous_stock = product.stock_quantity
            
            # Process the sale (existing logic)
            total_price = product.price * Decimal(str(quantity))
            
            # Create inventory log entry
            from core.models import InventoryLog
            InventoryLog.objects.create(
                shop=shop,
                product=product,
                reason_code='SALE',
                quantity_change=-Decimal(str(quantity)),
                previous_quantity=previous_stock,
                new_quantity=product.stock_quantity - Decimal(str(quantity)),
                performed_by=cashier,
                reference_number=sale_reference or 'SALE',
                notes=f'Sold {quantity} x {product.name}',
                cost_price=product.cost_price
            )
            
            # Update stock
            product.stock_quantity -= Decimal(str(quantity))
            product.save()
            
            # Check for negative stock alerts
            NegativeStockAlertManager.check_negative_stock_alert(product, previous_stock)
            
            # Additional enhanced alerts for severe overselling
            if product.stock_quantity < -5:  # Oversold by more than 5 units
                logger.critical(f"SEVERE OVERSELLING: {product.name} is oversold by {abs(product.stock_quantity)} units!")
            
            return {
                'success': True,
                'stock_before': previous_stock,
                'stock_after': product.stock_quantity,
                'oversold_amount': abs(product.stock_quantity) if product.stock_quantity < 0 else 0,
                'requires_restock': product.stock_quantity < 0
            }
            
        except Exception as e:
            logger.error(f"Enhanced sale processing failed: {str(e)}")
            return {'success': False, 'error': str(e)}

# Django Signal Handlers for Enhanced Negative Stock Monitoring
@receiver(pre_save, sender='core.Product')
def monitor_stock_changes(sender, instance, **kwargs):
    """
    Monitor stock changes and trigger alerts when going negative
    """
    if instance.pk:
        try:
            # Get the previous stock quantity
            previous_instance = sender.objects.get(pk=instance.pk)
            previous_stock = previous_instance.stock_quantity
            
            # Check if stock is changing and going negative
            if (previous_stock >= 0 and instance.stock_quantity < 0):
                NegativeStockAlertManager.check_negative_stock_alert(instance, previous_stock)
                
        except sender.DoesNotExist:
            # New product, no previous stock to compare
            pass
        except Exception as e:
            logger.error(f"Error in stock change monitoring: {str(e)}")

@receiver(post_save, sender='core.Sale')
def enhanced_sale_stock_monitoring(sender, instance, created, **kwargs):
    """
    Enhanced monitoring of sales for negative stock alerts
    """
    if created and instance.status == 'completed':
        try:
            # Process each sale item with enhanced alerts
            for item in instance.items.all():
                EnhancedStockProcessor.process_sale_with_enhanced_alerts(
                    shop=instance.shop,
                    cashier=instance.cashier,
                    product=item.product,
                    quantity=item.quantity,
                    sale_reference=f"Sale #{instance.id}"
                )
                
        except Exception as e:
            logger.error(f"Enhanced sale monitoring failed: {str(e)}")

# Additional utility functions for negative stock management
class NegativeStockUtils:
    """
    Utility functions for managing negative stock situations
    """
    
    @staticmethod
    def get_all_negative_stock_products(shop):
        """
        Get all products with negative stock for a shop
        """
        from core.models import Product
        return Product.objects.filter(shop=shop, stock_quantity__lt=0).order_by('stock_quantity')
    
    @staticmethod
    def generate_negative_stock_report(shop):
        """
        Generate a comprehensive report of negative stock situations
        """
        negative_products = NegativeStockUtils.get_all_negative_stock_products(shop)
        
        total_oversold = 0
        total_restock_value = 0
        
        report_data = []
        for product in negative_products:
            oversold = abs(product.stock_quantity)
            suggested_restock = oversold + product.min_stock_level
            restock_cost = suggested_restock * product.cost_price
            
            total_oversold += oversold
            total_restock_value += restock_cost
            
            report_data.append({
                'product': product,
                'current_stock': product.stock_quantity,
                'oversold_quantity': oversold,
                'suggested_restock': suggested_restock,
                'restock_cost': restock_cost,
                'days_since_negative': (timezone.now().date() - product.updated_at.date()).days
            })
        
        return {
            'summary': {
                'total_negative_products': len(negative_products),
                'total_units_oversold': total_oversold,
                'total_restock_cost': total_restock_value,
                'severity': 'CRITICAL' if len(negative_products) > 10 else 'HIGH' if len(negative_products) > 5 else 'MEDIUM'
            },
            'products': report_data
        }
    
    @staticmethod
    def auto_suggest_restock_actions(shop):
        """
        Generate automated restock suggestions for negative stock products
        """
        negative_products = NegativeStockUtils.get_all_negative_stock_products(shop)
        
        suggestions = []
        for product in negative_products:
            oversold = abs(product.stock_quantity)
            urgency_multiplier = 1 + (oversold / 10)  # Higher oversell = higher urgency
            
            suggestion = {
                'product_id': product.id,
                'product_name': product.name,
                'current_stock': product.stock_quantity,
                'oversold_by': oversold,
                'suggested_quantity': oversold + product.min_stock_level,
                'estimated_cost': (oversold + product.min_stock_level) * product.cost_price,
                'urgency_level': 'CRITICAL' if oversold > 5 else 'HIGH' if oversold > 2 else 'MEDIUM',
                'supplier_info': product.supplier or 'Unknown Supplier',
                'last_restock_date': None  # Would need to be calculated from InventoryLog
            }
            suggestions.append(suggestion)
        
        # Sort by urgency (most critical first)
        suggestions.sort(key=lambda x: {'CRITICAL': 3, 'HIGH': 2, 'MEDIUM': 1}[x['urgency_level']], reverse=True)
        
        return suggestions

# Enhanced API endpoints for negative stock management
def get_negative_stock_dashboard_data(shop):
    """
    Get enhanced dashboard data for negative stock management
    """
    report = NegativeStockUtils.generate_negative_stock_report(shop)
    suggestions = NegativeStockUtils.auto_suggest_restock_actions(shop)
    
    return {
        'negative_stock_summary': report['summary'],
        'urgent_restock_needed': len([s for s in suggestions if s['urgency_level'] == 'CRITICAL']),
        'top_negative_products': suggestions[:5],
        'total_oversold_value': report['summary']['total_restock_cost'],
        'alert_level': report['summary']['severity']
    }

# Integration with existing views
def enhance_existing_sale_processing():
    """
    Function to integrate enhanced negative stock handling with existing sale processing
    """
    # This function shows how to integrate the enhanced alerts with existing code
    print("Enhanced Negative Stock Alert System Loaded")
    print("Features:")
    print("- Automatic alerts when stock goes negative")
    print("- Enhanced stock monitoring")
    print("- Comprehensive negative stock reporting")
    print("- Automated restock suggestions")
    print("- Integration with existing sale processing")

if __name__ == "__main__":
    enhance_existing_sale_processing()