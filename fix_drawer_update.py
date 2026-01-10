"""
Manually trigger drawer updates for today's sales
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from django.utils import timezone
from core.signals import update_cash_float_on_sale
from core.models import Sale, ShopConfiguration

def manual_drawer_update():
    """Manually trigger drawer updates for all today's sales"""
    try:
        shop = ShopConfiguration.objects.get()
        today = timezone.now().date()

        # Get all today's completed sales
        today_sales = Sale.objects.filter(
            shop=shop,
            created_at__date=today,
            status='completed'
        )

        print(f"Found {today_sales.count()} sales to process")

        # Group sales by cashier
        sales_by_cashier = {}
        for sale in today_sales:
            cashier_id = sale.cashier.id if sale.cashier else None
            if cashier_id not in sales_by_cashier:
                sales_by_cashier[cashier_id] = []
            sales_by_cashier[cashier_id].append(sale)

        # Process each cashier's sales
        for cashier_id, sales in sales_by_cashier.items():
            print(f"Processing {len(sales)} sales for cashier {cashier_id}")
            for sale in sales:
                print(f"  Sale {sale.id}: {sale.payment_method} {sale.payment_currency}")
                # Trigger the signal for each sale
                update_cash_float_on_sale(Sale, sale, created=False, update_fields=['status'])

        print("Manual drawer update completed")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    manual_drawer_update()