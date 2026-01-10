"""
Check SalePayment records
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from django.utils import timezone
from core.models import SalePayment, Sale, ShopConfiguration

def check_payments():
    """Check SalePayment records"""
    try:
        shop = ShopConfiguration.objects.get()
        today = timezone.now().date()

        # Get today's sales
        today_sales = Sale.objects.filter(
            shop=shop,
            created_at__date=today,
            status='completed'
        )

        print(f"Found {today_sales.count()} sales for today")

        total_by_currency = {'USD': 0, 'ZIG': 0, 'RAND': 0}

        for sale in today_sales:
            print(f"Sale {sale.id}: {sale.payment_method} {sale.payment_currency} ${sale.total_amount}")
            if sale.payment_method == 'split':
                payments = SalePayment.objects.filter(sale=sale)
                print(f"  Payments: {payments.count()}")
                for payment in payments:
                    print(f"    {payment.payment_method} {payment.currency} ${payment.amount}")
                    if payment.payment_method == 'cash':
                        total_by_currency[payment.currency] += float(payment.amount)
            elif sale.payment_method == 'cash':
                total_by_currency[sale.payment_currency] += float(sale.total_amount)
            print()

        print("Total cash by currency:")
        for currency, amount in total_by_currency.items():
            print(f"  {currency}: ${amount}")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    check_payments()