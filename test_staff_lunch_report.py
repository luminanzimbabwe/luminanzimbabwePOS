#!/usr/bin/env python3
"""
Staff Lunch & Revenue Test Script
Shows revenue, staff lunches, drawer balances, and sales impact
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from core.models import (
    Sale, StaffLunch, CurrencyWallet, CurrencyTransaction, 
    CashFloat, ShopDay, Product, Cashier
)
from django.utils import timezone
from datetime import datetime, timedelta

def get_current_shop_day():
    """Get today's shop day"""
    today = timezone.now().date()
    shop_day, created = ShopDay.objects.get_or_create(
        date=today,
        defaults={'is_active': True}
    )
    return shop_day

def format_currency(amount):
    return f"${amount:,.2f}" if amount else "$0.00"

def test_staff_lunch_report():
    print("=" * 70)
    print("STAFF LUNCH & REVENUE REPORT")
    print("=" * 70)
    print()
    
    shop_day = get_current_shop_day()
    print(f"Shop Day: {shop_day.date}")
    print(f"Shop Day ID: {shop_day.id}")
    print()
    
    # 1. SALES SUMMARY
    print("=" * 70)
    print("SALES SUMMARY")
    print("=" * 70)
    
    today_sales = Sale.objects.filter(
        created_at__date=shop_day.date
    ).order_by('-created_at')
    
    total_revenue = sum(sale.total_amount for sale in today_sales)
    cash_sales = sum(sale.total_amount for sale in today_sales if sale.payment_method == 'cash')
    wallet_sales = sum(sale.total_amount for sale in today_sales if sale.payment_method == 'wallet')
    
    print(f"Total Sales Count: {today_sales.count()}")
    print(f"Total Revenue: {format_currency(total_revenue)}")
    print(f"Cash Sales: {format_currency(cash_sales)}")
    print(f"Wallet Sales: {format_currency(wallet_sales)}")
    print()
    
    if today_sales:
        print("Recent Sales:")
        for i, sale in enumerate(today_sales[:10], 1):
            print(f"  {i}. #{sale.id} | {sale.payment_method.upper()} | {format_currency(sale.total_amount)} | {sale.created_at.strftime('%H:%M:%S')}")
    print()
    
    # 2. STAFF LUNCHES
    print("=" * 70)
    print("STAFF LUNCHES")
    print("=" * 70)
    
    staff_lunches = StaffLunch.objects.filter(
        created_at__date=shop_day.date
    ).order_by('-created_at')
    
    total_lunch_value = sum(lunch.total_cost for lunch in staff_lunches)
    
    # Distinguish between cash and stock lunches
    cash_lunches = staff_lunches.filter(product=None)  # No product = cash lunch
    stock_lunches = staff_lunches.exclude(product=None)  # Has product = stock lunch
    
    cash_lunch_total = sum(lunch.total_cost for lunch in cash_lunches)
    stock_lunch_total = sum(lunch.total_cost for lunch in stock_lunches)
    
    print(f"Total Staff Lunches: {staff_lunches.count()}")
    print(f"  - Cash Lunches: {cash_lunches.count()} (Total: {format_currency(cash_lunch_total)})")
    print(f"  - Stock Lunches: {stock_lunches.count()} (Total: {format_currency(stock_lunch_total)})")
    print(f"Total Lunch Value: {format_currency(total_lunch_value)}")
    print()
    
    if staff_lunches:
        print("Staff Lunch Details:")
        for i, lunch in enumerate(staff_lunches[:10], 1):
            lunch_type = "CASH" if lunch.product is None else "STOCK"
            product_name = lunch.product.name if lunch.product else "N/A"
            # Extract staff name from notes if available
            staff_from_notes = None
            if lunch.notes:
                import re
                staff_match = re.search(r'Staff:\s*([^,\n]+)', lunch.notes)
                if staff_match:
                    staff_from_notes = staff_match.group(1).strip()
            print(f"  {i}. #{lunch.id} | {lunch_type} | Staff: {staff_from_notes or 'Unknown'} | {format_currency(lunch.total_cost)}")
            print(f"     Product: {product_name} | Qty: {lunch.quantity} | Time: {lunch.created_at.strftime('%H:%M:%S')}")
            if lunch.notes:
                notes_preview = lunch.notes[:50]
                print(f"     Notes: {notes_preview}")
            print()
    else:
        print("No staff lunches recorded today.")
        print()
    
    # 3. CURRENCY WALLET
    print("=" * 70)
    print("CURRENCY WALLET")
    print("=" * 70)
    
    wallets = CurrencyWallet.objects.all()
    print(f"Wallet Accounts: {wallets.count()}")
    print()
    
    for wallet in wallets:
        print(f"  Wallet ID: {wallet.id}")
        print(f"  Shop: {wallet.shop.name}")
        print(f"  Balance USD: {format_currency(wallet.balance_usd)}")
        print(f"  Balance ZIG: {format_currency(wallet.balance_zig)}")
        print(f"  Balance RAND: {format_currency(wallet.balance_rand)}")
        print(f"  Transaction Count: {wallet.total_transactions}")
        print()
    
    # Wallet Transactions
    print("Recent Wallet Transactions:")
    all_transactions = CurrencyTransaction.objects.all().order_by('-created_at')[:20]
    for i, tx in enumerate(all_transactions, 1):
        if tx.transaction_type in ['WITHDRAWAL', 'REFUND', 'TRANSFER_OUT']:
            tx_type_icon = "OUT"
        else:
            tx_type_icon = "IN"
        print(f"  {i}. {tx_type_icon} #{tx.id} | {tx.transaction_type} | {tx.currency} | {format_currency(tx.amount)}")
        if tx.description:
            desc = tx.description[:50] if len(tx.description) > 50 else tx.description
            print(f"     Desc: {desc}")
    print()
    
    # 4. CASH FLOAT / DRAWER
    print("=" * 70)
    print("CASH FLOAT / DRAWER")
    print("=" * 70)
    
    cash_floats = CashFloat.objects.filter(shop=shop_day.shop, date=shop_day.date)
    print(f"Cash Floats Today: {cash_floats.count()}")
    print()
    
    for cf in cash_floats:
        cashier_name = cf.cashier.name if cf.cashier else 'Unknown'
        print(f"  Cashier: {cashier_name}")
        print(f"  Initial Float (USD): {format_currency(cf.float_amount)}")
        print(f"  Current Cash (USD): {format_currency(cf.current_cash_usd)}")
        print(f"  Session Cash Sales: {format_currency(cf.session_cash_sales_usd)}")
        print(f"  Status: {cf.status}")
        print()
    
    # 5. REVENUE IMPACT ANALYSIS
    print("=" * 70)
    print("REVENUE IMPACT ANALYSIS")
    print("=" * 70)
    
    print(f"Gross Revenue: {format_currency(total_revenue)}")
    print(f"Staff Lunch Deductions: {format_currency(total_lunch_value)}")
    print(f"  - Cash Lunches: {format_currency(cash_lunch_total)}")
    print(f"  - Stock Lunches: {format_currency(stock_lunch_total)}")
    print(f"Net Revenue: {format_currency(total_revenue - total_lunch_value)}")
    print()
    
    if total_revenue > 0:
        lunch_impact = (total_lunch_value / total_revenue) * 100
        print(f"Staff Lunch Impact: {lunch_impact:.1f}% of revenue")
    print()
    
    # 6. PRODUCTS AFFECTED BY STAFF LUNCHES
    print("=" * 70)
    print("PRODUCTS USED IN STAFF LUNCHES (STOCK LUNCHES)")
    print("=" * 70)
    
    if stock_lunches.exists():
        # Get unique products from stock lunches
        product_details = {}
        for lunch in stock_lunches:
            if lunch.product:
                if lunch.product.id not in product_details:
                    product_details[lunch.product.id] = {
                        'name': lunch.product.name,
                        'quantity': 0,
                        'total_cost': 0
                    }
                product_details[lunch.product.id]['quantity'] += lunch.quantity
                product_details[lunch.product.id]['total_cost'] += float(lunch.total_cost)
        
        print(f"Unique Products Used: {len(product_details)}")
        for pid, details in list(product_details.items())[:10]:
            print(f"  - {details['name']}: {details['quantity']} units (${details['total_cost']:.2f})")
    else:
        print("No stock lunches recorded today.")
    print()
    
    # 7. CASHIER INFO
    print("=" * 70)
    print("CASHIER INFORMATION")
    print("=" * 70)
    
    cashiers = Cashier.objects.filter(shop=shop_day.shop, status='active')
    print(f"Active Cashiers: {cashiers.count()}")
    for cashier in cashiers:
        print(f"  - {cashier.name} ({cashier.role})")
    print()
    
    # 8. SUMMARY
    print("=" * 70)
    print("DAILY SUMMARY")
    print("=" * 70)
    print(f"Date: {shop_day.date}")
    print(f"Sales: {today_sales.count()} transactions")
    print(f"Revenue: {format_currency(total_revenue)}")
    print(f"Staff Lunches: {staff_lunches.count()} ({format_currency(total_lunch_value)} total)")
    print(f"  - Cash Lunches: {cash_lunches.count()}")
    print(f"  - Stock Lunches: {stock_lunches.count()}")
    print(f"Net Income: {format_currency(total_revenue - total_lunch_value)}")
    print()
    
    if wallets.exists():
        main_wallet = wallets.first()
        print(f"Wallet Balance (USD): {format_currency(main_wallet.balance_usd)}")
    print("=" * 70)

if __name__ == "__main__":
    try:
        test_staff_lunch_report()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
