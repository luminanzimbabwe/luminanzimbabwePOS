#!/usr/bin/env python
"""
Debug script to check why drawer shows zero when sales are being made
"""
import os
import sys
import django
from datetime import datetime, time
from django.utils import timezone

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
sys.path.append(os.path.dirname(__file__))
django.setup()

from core.models import ShopConfiguration, Sale, CashFloat, Cashier

def debug_drawer_issue():
    print("🔍 DEBUGGING DRAWER ISSUE")
    print("=" * 60)

    try:
        shop = ShopConfiguration.objects.get()
        print(f"🏪 Shop: {shop.name}")

        # Get today's date in local timezone
        today = timezone.localdate()
        print(f"📅 Today (local): {today}")

        # Create proper timezone-aware datetime range for the local day
        day_start = timezone.make_aware(
            datetime.datetime.combine(today, datetime.time.min),
            timezone.get_current_timezone()
        )
        day_end = timezone.make_aware(
            datetime.datetime.combine(today, datetime.time.max),
            timezone.get_current_timezone()
        )
        print(f"⏰ Day range: {day_start} to {day_end}")

        # Check total sales
        total_sales = Sale.objects.filter(shop=shop).count()
        print(f"📊 Total sales in DB: {total_sales}")

        # Check today's sales
        today_sales = Sale.objects.filter(
            shop=shop,
            created_at__range=[day_start, day_end]
        )
        print(f"📊 Today's sales: {today_sales.count()}")

        # Check completed sales
        completed_sales = today_sales.filter(status='completed')
        print(f"✅ Completed sales today: {completed_sales.count()}")

        # Show details of today's completed sales
        if completed_sales.exists():
            print("\n💰 TODAY'S COMPLETED SALES:")
            for sale in completed_sales:
                cashier_name = sale.cashier.name if sale.cashier else 'No Cashier'
                print(f"  Sale #{sale.id}: ${sale.total_amount} {sale.payment_currency} {sale.payment_method} by {cashier_name}")
        else:
            print("\n❌ NO COMPLETED SALES TODAY")

        # Check active cashiers
        active_cashiers = Cashier.objects.filter(shop=shop, status='active')
        print(f"\n👥 Active cashiers: {active_cashiers.count()}")

        for cashier in active_cashiers:
            print(f"\n👤 Cashier: {cashier.name}")

            # Check if drawer exists
            try:
                drawer = CashFloat.objects.get(shop=shop, cashier=cashier, date=today)
                print("  📁 Drawer exists:"                print(f"    Status: {drawer.status}")
                print(f"    USD Cash: ${drawer.current_cash_usd}")
                print(f"    ZIG Cash: {drawer.current_cash_zig}")
                print(f"    RAND Cash: {drawer.current_cash_rand}")
                print(f"    USD Total: ${drawer.current_total_usd}")
                print(f"    Last activity: {drawer.last_activity}")
            except CashFloat.DoesNotExist:
                print("  ❌ No drawer found for today"

        # Check if signals are working by manually triggering
        print("
🔄 Testing signal manually..."        if completed_sales.exists():
            # Get the most recent sale and manually call the signal logic
            recent_sale = completed_sales.latest('created_at')
            print(f"  Testing with Sale #{recent_sale.id}")

            # Import the signal function
            from core.signals import update_cash_float_on_sale

            # Call it manually (this should update the drawer)
            try:
                update_cash_float_on_sale(sender=Sale, instance=recent_sale, created=False)
                print("  ✅ Signal executed successfully")
            except Exception as e:
                print(f"  ❌ Signal failed: {e}")
                import traceback
                traceback.print_exc()

        print("\n" + "=" * 60)
        print("🔍 DEBUG COMPLETE")

    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    debug_drawer_issue()