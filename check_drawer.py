"""
Check drawer values directly
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from django.utils import timezone
from core.models import CashFloat, ShopConfiguration

def check_drawer():
    """Check current drawer values"""
    try:
        shop = ShopConfiguration.objects.get()
        today = timezone.now().date()

        drawers = CashFloat.objects.filter(shop=shop, date=today)

        print(f"Found {drawers.count()} drawers for today")

        for drawer in drawers:
            print(f"Drawer for {drawer.cashier.name}:")
            print(f"  USD Cash: ${drawer.current_cash_usd}")
            print(f"  ZIG Cash: {drawer.current_cash_zig}")
            print(f"  RAND Cash: {drawer.current_cash_rand}")
            print(f"  Total USD: ${drawer.current_total_usd}")
            print(f"  Total ZIG: {drawer.current_total_zig}")
            print(f"  Total RAND: {drawer.current_total_rand}")
            print()

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    check_drawer()