"""
System Money Status Report
Shows all money in the system: sales, wallet balance, drawer contents, staff lunches
"""
import os
import django
from datetime import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from django.utils import timezone
from django.db.models import Sum
from core.models import (
    ShopConfiguration, Sale, CurrencyWallet, CurrencyTransaction,
    CashFloat, StaffLunch, ShopDay
)

def generate_money_report():
    """Generate a comprehensive report of all money in the system"""
    
    print("=" * 70)
    print("💰 SYSTEM MONEY STATUS REPORT")
    print("=" * 70)
    print(f"Generated: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    try:
        shop = ShopConfiguration.objects.get()
        print(f"🏪 Shop: {shop.name}")
        print()
        
        # Check if shop is open
        shop_day = ShopDay.get_current_day(shop)
        print(f"📅 Shop Status: {'OPEN' if shop_day.is_open else 'CLOSED'}")
        print()
        
        # ===== WALLET BALANCE =====
        print("-" * 50)
        print("💳 CURRENCY WALLET BALANCE")
        print("-" * 50)
        
        wallet, created = CurrencyWallet.objects.get_or_create(shop=shop)
        print(f"  USD Balance:  ${float(wallet.balance_usd):.2f}")
        print(f"  ZIG Balance:  {float(wallet.balance_zig):.2f}")
        print(f"  RAND Balance: R{float(wallet.balance_rand):.2f}")
        print(f"  Total Transactions: {wallet.total_transactions}")
        print()
        
        # ===== TODAY'S SALES =====
        print("-" * 50)
        print("📊 TODAY'S SALES")
        print("-" * 50)
        
        today = timezone.now().date()
        today_sales = Sale.objects.filter(
            shop=shop, 
            created_at__date=today,
            status='completed'
        )
        
        sales_by_currency = {
            'USD': {'cash': 0, 'card': 0, 'ecocash': 0, 'transfer': 0, 'total': 0, 'count': 0},
            'ZIG': {'cash': 0, 'card': 0, 'ecocash': 0, 'transfer': 0, 'total': 0, 'count': 0},
            'RAND': {'cash': 0, 'card': 0, 'ecocash': 0, 'transfer': 0, 'total': 0, 'count': 0},
        }
        
        for sale in today_sales:
            currency = sale.payment_currency.upper() if sale.payment_currency else 'USD'
            if currency not in sales_by_currency:
                currency = 'USD'
            
            payment_method = sale.payment_method
            
            if payment_method == 'cash':
                sales_by_currency[currency]['cash'] += float(sale.total_amount)
            elif payment_method == 'card':
                sales_by_currency[currency]['card'] += float(sale.total_amount)
            elif payment_method == 'ecocash':
                sales_by_currency[currency]['ecocash'] += float(sale.total_amount)
            elif payment_method == 'transfer':
                sales_by_currency[currency]['transfer'] += float(sale.total_amount)
            
            sales_by_currency[currency]['total'] += float(sale.total_amount)
            sales_by_currency[currency]['count'] += 1
        
        print(f"Total Transactions: {today_sales.count()}")
        print()
        
        for currency, data in sales_by_currency.items():
            if data['count'] > 0:
                print(f"  {currency}:")
                print(f"    Cash:      ${data['cash']:.2f}")
                print(f"    Card:      ${data['card']:.2f}")
                print(f"    EcoCash:   ${data['ecocash']:.2f}")
                print(f"    Transfer:  ${data['transfer']:.2f}")
                print(f"    ─────────────────")
                print(f"    TOTAL:     ${data['total']:.2f} ({data['count']} sales)")
                print()
        
        # ===== STAFF LUNCHES =====
        print("-" * 50)
        print("🍽️ TODAY'S STAFF LUNCHES (Money Deductions)")
        print("-" * 50)
        
        today_lunches = StaffLunch.objects.filter(
            shop=shop,
            created_at__date=today,
            product=None  # Money lunch only
        )
        
        total_lunch_cost = sum([float(lunch.total_cost) for lunch in today_lunches])
        
        print(f"Total Staff Lunches: {today_lunches.count()}")
        print(f"Total Deducted from Drawer: ${total_lunch_cost:.2f}")
        print()
        
        if today_lunches.count() > 0:
            print("Recent Lunch Records:")
            for lunch in today_lunches[:5]:  # Show last 5
                print(f"  - ${float(lunch.total_cost):.2f} for {lunch.notes[:50] if lunch.notes else 'Staff'}...")
        
        print()
        
        # ===== DRAWER STATUS =====
        print("-" * 50)
        print("🧮 DRAWER STATUS (All Cashiers)")
        print("-" * 50)
        
        drawers = CashFloat.objects.filter(shop=shop, date=today)
        
        total_cash_usd = sum([float(d.current_cash_usd) for d in drawers])
        total_cash_zig = sum([float(d.current_cash_zig) for d in drawers])
        total_cash_rand = sum([float(d.current_cash_rand) for d in drawers])
        
        print(f"Active Drawers: {drawers.count()}")
        print(f"Total Cash USD:  ${total_cash_usd:.2f}")
        print(f"Total Cash ZIG:  {total_cash_zig:.2f}")
        print(f"Total Cash RAND: R{total_cash_rand:.2f}")
        print()
        
        # ===== SUMMARY =====
        print("=" * 70)
        print("📈 SUMMARY")
        print("=" * 70)
        
        usd_total_sales = sales_by_currency['USD']['total']
        usd_lunch_deduction = total_lunch_cost
        
        print(f"Today's USD Sales:         ${usd_total_sales:.2f}")
        print(f"Staff Lunch Deductions:    -${usd_lunch_deduction:.2f}")
        print(f"─────────────────────────────")
        print(f"Net USD in Drawer:         ${usd_total_sales - usd_lunch_deduction:.2f}")
        print()
        print(f"Wallet Balance:            ${float(wallet.balance_usd):.2f}")
        print()
        print("=" * 70)
        
    except ShopConfiguration.DoesNotExist:
        print("❌ No shop configured!")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    generate_money_report()
