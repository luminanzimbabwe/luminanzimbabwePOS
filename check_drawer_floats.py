"""
Check drawer float amounts and variance calculation
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from django.utils import timezone
from core.models import ShopConfiguration, CashFloat

def check_drawer_floats():
    """Check drawer float amounts and calculate variance"""

    try:
        shop = ShopConfiguration.objects.get()
        today = timezone.localdate()

        print(f"Checking drawer floats for {shop.name} on {today}")

        drawers = CashFloat.objects.filter(shop=shop, date=today)

        for drawer in drawers:
            print(f"\nCashier: {drawer.cashier.name}")
            print(f"Status: {drawer.status}")
            print(f"Float USD: ${drawer.float_amount}")
            print(f"Float ZIG: {drawer.float_amount_zig}")
            print(f"Float RAND: {drawer.float_amount_rand}")
            print(f"Current USD: ${drawer.current_total_usd}")
            print(f"Current ZIG: {drawer.current_total_zig}")
            print(f"Session Cash Sales USD: ${drawer.session_cash_sales_usd}")
            print(f"Session Cash Sales ZIG: {drawer.session_cash_sales_zig}")
            print(f"Expected USD: ${drawer.expected_cash_usd}")
            print(f"Expected ZIG: {drawer.expected_cash_zig}")

            # Calculate variance like frontend does
            # actual = current - transfers - cards
            actual_usd = drawer.current_total_usd  # Since transfers and cards are included in current_total
            expected_usd = drawer.expected_cash_usd
            variance_usd = actual_usd - expected_usd

            print(f"Actual USD (current): ${actual_usd}")
            print(f"Expected USD: ${expected_usd}")
            print(f"Variance USD: ${variance_usd}")

            if variance_usd != 0:
                print(f"*** VARIANCE DETECTED: {'SURPLUS' if variance_usd > 0 else 'SHORTAGE'} of ${abs(variance_usd)} ***")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    check_drawer_floats()