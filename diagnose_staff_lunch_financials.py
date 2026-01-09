#!/usr/bin/env python
"""
Diagnostic script to investigate staff lunch financial inconsistencies
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from django.db.models import Sum
from core.models import (
    ShopConfiguration, StaffLunch, CurrencyWallet, 
    CurrencyTransaction, CashFloat, Sale, Expense
)

def diagnose_staff_lunch_financials():
    print("=" * 80)
    print("STAFF LUNCH FINANCIAL DIAGNOSTIC")
    print("=" * 80)
    
    shop = ShopConfiguration.objects.get()
    today = timezone.now().date()
    
    # 1. Check StaffLunch records
    print("\n[STEP 1] STAFF LUNCH RECORDS")
    print("-" * 50)
    lunches = StaffLunch.objects.filter(
        shop=shop,
        created_at__date=today
    ).order_by('created_at')
    
    print(f"Total StaffLunch records today: {lunches.count()}")
    
    money_lunches = lunches.filter(product=None)
    stock_lunches = lunches.filter(product__isnull=False)
    
    print(f"  - Money lunches (product=None): {money_lunches.count()}")
    print(f"  - Stock lunches (with product): {stock_lunches.count()}")
    
    total_money_lunch_cost = money_lunches.aggregate(total=Sum('total_cost'))['total'] or Decimal('0')
    total_stock_lunch_cost = stock_lunches.aggregate(total=Sum('total_cost'))['total'] or Decimal('0')
    
    print(f"\nMoney lunch total: ${float(total_money_lunch_cost):.2f}")
    print(f"Stock lunch total: ${float(total_stock_lunch_cost):.2f}")
    print(f"Combined total: ${float(total_money_lunch_cost + total_stock_lunch_cost):.2f}")
    
    # 2. Check CurrencyWallet transactions
    print("\n[STEP 2] CURRENCY WALLET TRANSACTIONS")
    print("-" * 50)
    
    wallet = CurrencyWallet.objects.get(shop=shop)
    print(f"Wallet ID: {wallet.id}")
    print(f"Current Balance USD: ${float(wallet.balance_usd):.2f}")
    print(f"Current Balance ZIG: ${float(wallet.balance_zig):.2f}")
    print(f"Current Balance RAND: ${float(wallet.balance_rand):.2f}")
    print(f"Total Transactions: {wallet.total_transactions}")
    
    # Get all withdrawal transactions for staff lunch
    staff_lunch_transactions = CurrencyTransaction.objects.filter(
        shop=shop,
        transaction_type='WITHDRAWAL',
        description__icontains='Staff Lunch'
    ).order_by('-created_at')
    
    print(f"\nStaff Lunch Wallet Withdrawals: {staff_lunch_transactions.count()}")
    
    withdrawal_total = staff_lunch_transactions.aggregate(total=Sum('amount'))['total'] or Decimal('0')
    print(f"Total withdrawn for staff lunch: ${float(withdrawal_total):.2f}")
    
    print("\nRecent Staff Lunch Withdrawals:")
    for i, tx in enumerate(staff_lunch_transactions[:15], 1):
        print(f"  {i}. {tx.description}")
        print(f"     Amount: ${float(tx.amount):.2f} | Balance After: ${float(tx.balance_after):.2f}")
        print(f"     Time: {tx.created_at}")
    
    # 3. Check CashFloat records
    print("\n[STEP 3] CASH FLOAT RECORDS")
    print("-" * 50)
    
    cash_floats = CashFloat.objects.filter(
        shop=shop,
        date=today
    )
    
    print(f"Total CashFloat records today: {cash_floats.count()}")
    
    for cf in cash_floats:
        print(f"\n  Cashier: {cf.cashier.name if cf.cashier else 'None'}")
        print(f"    Initial Float: ${float(cf.float_amount):.2f}")
        print(f"    Current Cash: ${float(cf.current_cash):.2f}")
        print(f"    Session Cash Sales: ${float(cf.session_cash_sales):.2f}")
        print(f"    Expected Cash at EOD: ${float(cf.expected_cash_at_eod):.2f}")
        print(f"    Status: {cf.status}")
    
    # 4. Check Sales
    print("\n[STEP 4] TODAY'S SALES")
    print("-" * 50)
    
    sales = Sale.objects.filter(
        shop=shop,
        created_at__date=today,
        status='completed'
    )
    
    print(f"Total sales today: {sales.count()}")
    total_sales = sales.aggregate(total=Sum('total_amount'))['total'] or Decimal('0')
    print(f"Total sales amount: ${float(total_sales):.2f}")
    
    cash_sales = sales.filter(payment_method='cash')
    cash_sales_total = cash_sales.aggregate(total=Sum('total_amount'))['total'] or Decimal('0')
    print(f"Cash sales: ${float(cash_sales_total):.2f}")
    
    # 5. Check Expenses
    print("\n[STEP 5] TODAY'S EXPENSES")
    print("-" * 50)
    
    expenses = Expense.objects.filter(
        shop=shop,
        created_at__date=today
    )
    
    print(f"Total expenses today: {expenses.count()}")
    total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0')
    print(f"Total expense amount: ${float(total_expenses):.2f}")
    
    # 6. Check for DUPLICATE transactions
    print("\n[STEP 6] CHECKING FOR DUPLICATE/EXTRA TRANSACTIONS")
    print("-" * 50)
    
    # The issue: if StaffLunchDeductMoneyView is called multiple times for the same lunch
    # it might create multiple wallet withdrawals but only one StaffLunch record
    
    print("\n[FINANCIAL SUMMARY]")
    print("-" * 50)
    print(f"Sales collected: ${float(total_sales):.2f}")
    print(f"Staff lunches (from StaffLunch table): ${float(total_money_lunch_cost):.2f}")
    print(f"Wallet withdrawals for staff lunch: ${float(withdrawal_total):.2f}")
    print(f"Variance (Wallet - StaffLunch): ${float(withdrawal_total - total_money_lunch_cost):.2f}")
    
    expected_drawer = total_sales - total_money_lunch_cost
    actual_drawer = sum(cf.current_cash for cf in cash_floats)
    print(f"\nExpected drawer balance: ${float(expected_drawer):.2f}")
    print(f"Actual drawer cash (sum of all cashiers): ${float(actual_drawer):.2f}")
    print(f"Drawer variance: ${float(expected_drawer - actual_drawer):.2f}")
    
    # 7. Identify the root cause
    print("\n" + "=" * 80)
    print("[ROOT CAUSE ANALYSIS]")
    print("=" * 80)
    
    if withdrawal_total > total_money_lunch_cost:
        diff = withdrawal_total - total_money_lunch_cost
        print(f"\n!!! ISSUE FOUND: Wallet has ${float(diff):.2f} MORE in withdrawals than StaffLunch records show")
        print("\nThis means the StaffLunchDeductMoneyView is being called MORE TIMES")
        print("than the StaffLunch records are being created.")
        print("\nPossible causes:")
        print("  1. Frontend is calling the API multiple times for the same lunch")
        print("  2. Network retry logic is duplicating requests")
        print("  3. The wallet deduction code runs before StaffLunch creation and fails midway")
    
    if actual_drawer < expected_drawer:
        drawer_diff = expected_drawer - actual_drawer
        print(f"\n!!! ISSUE FOUND: Drawer is missing ${float(drawer_diff):.2f}")
        print("\nThis indicates the drawer is being deducted for staff lunches")
        print("but the wallet is being deducted MULTIPLE TIMES for the same lunch.")
    
    print("\n" + "=" * 80)

if __name__ == '__main__':
    diagnose_staff_lunch_financials()
