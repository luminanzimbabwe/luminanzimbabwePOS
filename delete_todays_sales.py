#!/usr/bin/env python
"""
Delete all today's sales and reset all drawers to start fresh.
Run this script to clear all sales data for the current day.

Usage:
    python delete_todays_sales.py

This will:
1. Delete all sales for today
2. Reset all CashFloat drawers for today to zero
3. Reset CurrencyWallet balances to zero
4. Delete currency transactions for today
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.utils import timezone
from django.db import transaction
from decimal import Decimal
from core.models import Sale, SaleItem, CashFloat, CurrencyWallet, CurrencyTransaction, ShopConfiguration

def delete_todays_sales():
    """Delete all today's sales and reset everything to start fresh"""
    
    try:
        shop = ShopConfiguration.objects.get()
    except ShopConfiguration.DoesNotExist:
        print("❌ Error: No shop found! Please register your shop first.")
        return False
    
    today = timezone.now().date()
    
    print(f"\n🗑️  DELETING ALL SALES FOR TODAY: {today}")
    print("=" * 50)
    
    try:
        with transaction.atomic():
            # Get all sales for today
            today_sales = Sale.objects.filter(created_at__date=today)
            sale_count = today_sales.count()
            
            print(f"📊 Found {sale_count} sales to delete")
            
            if sale_count == 0:
                print("ℹ️  No sales found for today - nothing to delete")
            else:
                # Get unique shops and cashiers from these sales
                cashiers = set()
                for sale in today_sales:
                    cashiers.add((sale.shop, sale.cashier))
                
                print(f"👥 Affects {len(cashiers)} cashier(s)")
                
                # Delete all sales for today (SaleItem records will be deleted automatically due to CASCADE)
                today_sales.delete()
                print(f"✅ Deleted {sale_count} sales")
            
            # Reset all CashFloat records for today to zero
            drawers = CashFloat.objects.filter(shop=shop, date=today)
            drawer_count = 0
            for drawer in drawers:
                drawer_count += 1
                
                # Reset all currency fields to zero
                drawer.current_cash = Decimal('0.00')
                drawer.current_card = Decimal('0.00')
                drawer.current_ecocash = Decimal('0.00')
                drawer.current_transfer = Decimal('0.00')
                drawer.current_total = Decimal('0.00')
                
                drawer.current_cash_usd = Decimal('0.00')
                drawer.current_cash_zig = Decimal('0.00')
                drawer.current_cash_rand = Decimal('0.00')
                drawer.current_card_usd = Decimal('0.00')
                drawer.current_card_zig = Decimal('0.00')
                drawer.current_card_rand = Decimal('0.00')
                drawer.current_ecocash_usd = Decimal('0.00')
                drawer.current_ecocash_zig = Decimal('0.00')
                drawer.current_ecocash_rand = Decimal('0.00')
                drawer.current_transfer_usd = Decimal('0.00')
                drawer.current_transfer_zig = Decimal('0.00')
                drawer.current_transfer_rand = Decimal('0.00')
                drawer.current_total_usd = Decimal('0.00')
                drawer.current_total_zig = Decimal('0.00')
                drawer.current_total_rand = Decimal('0.00')
                
                drawer.session_cash_sales = Decimal('0.00')
                drawer.session_card_sales = Decimal('0.00')
                drawer.session_ecocash_sales = Decimal('0.00')
                drawer.session_transfer_sales = Decimal('0.00')
                drawer.session_total_sales = Decimal('0.00')
                
                drawer.session_cash_sales_usd = Decimal('0.00')
                drawer.session_cash_sales_zig = Decimal('0.00')
                drawer.session_cash_sales_rand = Decimal('0.00')
                drawer.session_card_sales_usd = Decimal('0.00')
                drawer.session_card_sales_zig = Decimal('0.00')
                drawer.session_card_sales_rand = Decimal('0.00')
                drawer.session_ecocash_sales_usd = Decimal('0.00')
                drawer.session_ecocash_sales_zig = Decimal('0.00')
                drawer.session_ecocash_sales_rand = Decimal('0.00')
                drawer.session_transfer_sales_usd = Decimal('0.00')
                drawer.session_transfer_sales_zig = Decimal('0.00')
                drawer.session_transfer_sales_rand = Decimal('0.00')
                drawer.session_total_sales_usd = Decimal('0.00')
                drawer.session_total_sales_zig = Decimal('0.00')
                drawer.session_total_sales_rand = Decimal('0.00')
                
                drawer.status = 'INACTIVE'
                drawer.save()
            
            print(f"✅ Reset {drawer_count} drawer(s) to zero")
            
            # Reset CurrencyWallet balances to zero
            wallet, created = CurrencyWallet.objects.get_or_create(shop=shop)
            wallet.balance_usd = Decimal('0.00')
            wallet.balance_zig = Decimal('0.00')
            wallet.balance_rand = Decimal('0.00')
            wallet.total_transactions = 0
            wallet.save()
            print("✅ Reset currency wallet balances to zero")
            
            # Delete currency transactions for today
            transactions_deleted = CurrencyTransaction.objects.filter(
                shop=shop,
                created_at__date=today
            ).delete()[0]
            print(f"✅ Deleted {transactions_deleted} currency transactions")
            
        print("\n" + "=" * 50)
        print(f"✅ SUCCESS! All data for {today} has been deleted.")
        print("   You can now start fresh for today.")
        print("=" * 50 + "\n")
        return True
        
    except Exception as e:
        print(f"\n❌ ERROR: Failed to delete sales: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = delete_todays_sales()
    sys.exit(0 if success else 1)
