#!/usr/bin/env python
"""
Script to display current drawer status for all cashiers
Shows each cashier's drawer contents in USD, ZIG, and RAND
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
sys.path.append(os.path.dirname(__file__))
django.setup()

from core.models import ShopConfiguration, Cashier, CashFloat
from decimal import Decimal

def show_drawer_status():
    """Display current drawer status for all cashiers"""
    try:
        shop = ShopConfiguration.objects.get()
        print(f"🏪 Shop: {shop.name}")
        print("=" * 60)

        # Get all active cashiers
        cashiers = Cashier.objects.filter(shop=shop, status='active')

        if not cashiers.exists():
            print("❌ No active cashiers found")
            return

        for cashier in cashiers:
            print(f"\n👤 Cashier: {cashier.name} (ID: {cashier.id})")
            print("-" * 40)

            # Get or create drawer for today
            drawer = CashFloat.get_active_drawer(shop, cashier)

            print(f"Status: {drawer.status}")
            print(f"Float Amount: USD ${drawer.float_amount}, ZIG {drawer.float_amount_zig}, RAND {drawer.float_amount_rand}")

            print("\n💰 Current Drawer Contents:")
            print(f"  USD Cash: ${drawer.current_cash_usd}")
            print(f"  ZIG Cash: {drawer.current_cash_zig}")
            print(f"  RAND Cash: {drawer.current_cash_rand}")

            print(f"\n💳 Card Payments:")
            print(f"  USD Card: ${drawer.current_card_usd}")
            print(f"  ZIG Card: {drawer.current_card_zig}")
            print(f"  RAND Card: {drawer.current_card_rand}")

            print(f"\n📱 EcoCash Payments:")
            print(f"  USD EcoCash: ${drawer.current_ecocash_usd}")
            print(f"  ZIG EcoCash: {drawer.current_ecocash_zig}")
            print(f"  RAND EcoCash: {drawer.current_ecocash_rand}")

            print(f"\n🏦 Bank Transfers:")
            print(f"  USD Transfer: ${drawer.current_transfer_usd}")
            print(f"  ZIG Transfer: {drawer.current_transfer_zig}")
            print(f"  RAND Transfer: {drawer.current_transfer_rand}")

            print(f"\n📊 Totals by Currency:")
            print(f"  USD Total: ${drawer.current_total_usd}")
            print(f"  ZIG Total: {drawer.current_total_zig}")
            print(f"  RAND Total: {drawer.current_total_rand}")

            print(f"\n📈 Session Sales Today:")
            print(f"  USD Cash Sales: ${drawer.session_cash_sales_usd}")
            print(f"  ZIG Cash Sales: {drawer.session_cash_sales_zig}")
            print(f"  RAND Cash Sales: {drawer.session_cash_sales_rand}")

            # Calculate expected vs actual
            expected_usd = drawer.float_amount + drawer.session_cash_sales_usd
            expected_zig = drawer.float_amount_zig + drawer.session_cash_sales_zig
            expected_rand = drawer.float_amount_rand + drawer.session_cash_sales_rand

            variance_usd = drawer.current_cash_usd - expected_usd
            variance_zig = drawer.current_cash_zig - expected_zig
            variance_rand = drawer.current_cash_rand - expected_rand

            print(f"\n⚖️  Cash Variance (Expected vs Actual):")
            print(f"  USD: Expected ${expected_usd}, Actual ${drawer.current_cash_usd}, Variance ${variance_usd}")
            print(f"  ZIG: Expected {expected_zig}, Actual {drawer.current_cash_zig}, Variance {variance_zig}")
            print(f"  RAND: Expected {expected_rand}, Actual {drawer.current_cash_rand}, Variance {variance_rand}")

        print("\n" + "=" * 60)
        print("✅ Drawer status display complete")

    except ShopConfiguration.DoesNotExist:
        print("❌ No shop configuration found")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == '__main__':
    show_drawer_status()