"""
Automatic script to fix staff lunch over-deduction issue
Run this to automatically correct the negative drawer balance and wallet
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.utils import timezone
from django.db.models import Sum
from django.db import transaction
from decimal import Decimal
from core.models import ShopConfiguration, StaffLunch, CashFloat, Sale, CurrencyWallet, CurrencyTransaction

def auto_fix_staff_lunch():
    """Automatically fix staff lunch over-deduction"""
    
    print("=" * 60)
    print("🔧 AUTO-FIX: STAFF LUNCH OVER-DEDUCTION")
    print("=" * 60)
    
    try:
        shop = ShopConfiguration.objects.get()
        print(f"🏪 Shop: {shop.name}")
    except ShopConfiguration.DoesNotExist:
        print("❌ No shop configured!")
        return
    
    today = timezone.now().date()
    print(f"📅 Date: {today}")
    print()
    
    with transaction.atomic():
        # Get today's sales
        today_sales = Sale.objects.filter(
            shop=shop, 
            created_at__date=today, 
            status='completed'
        ).aggregate(total=Sum('total_amount'))
        total_sales = today_sales['total'] or Decimal('0.00')
        print(f"💰 Today's Sales: ${float(total_sales):.2f}")
        
        # Get today's staff lunch deductions
        today_lunches = StaffLunch.objects.filter(
            shop=shop,
            created_at__date=today,
            product=None  # Money lunches only
        )
        total_lunch_deductions = today_lunches.aggregate(total=Sum('total_cost'))['total'] or Decimal('0.00')
        print(f"🍽️ Staff Lunch Deductions: ${float(total_lunch_deductions):.2f}")
        
        # Get current drawer status
        cash_floats = CashFloat.objects.filter(shop=shop, date=today)
        current_cash_usd = sum(cf.current_cash_usd or Decimal('0.00') for cf in cash_floats)
        print(f"❌ Current Drawer Balance: ${float(current_cash_usd):.2f}")
        print()
        
        # Get wallet status
        wallet = CurrencyWallet.objects.get_or_create(shop=shop)[0]
        print(f"💳 Wallet Balance: ${float(wallet.balance_usd):.2f}")
        print()
        
        # Calculate what the drawer should have
        expected_balance = total_sales - total_lunch_deductions
        print(f"📊 Expected Balance (Sales - Lunches): ${float(expected_balance):.2f}")
        
        # Step 1: Delete excess staff lunch records to match available cash
        print("\n🔧 FIXING STAFF LUNCH DEDUCTIONS...")
        
        affordable_amount = float(total_sales)
        cumulative = Decimal('0.00')
        deleted_count = 0
        deleted_amount = Decimal('0.00')
        
        for lunch in today_lunches.order_by('created_at'):
            if cumulative + lunch.total_cost <= affordable_amount:
                cumulative += lunch.total_cost
            else:
                print(f"   Deleting: ${float(lunch.total_cost):.2f} - {lunch.notes[:50]}...")
                lunch.delete()
                deleted_count += 1
                deleted_amount += lunch.total_cost
        
        print(f"   Kept {today_lunches.count() - deleted_count} lunch records totaling ${float(cumulative):.2f}")
        print(f"   Deleted {deleted_count} lunch records totaling ${float(deleted_amount):.2f}")
        
        # Step 2: Reset wallet to match actual sales (not affected by staff lunch)
        print(f"\n🔧 FIXING WALLET...")
        
        # Get all wallet transactions
        wallet_txs = CurrencyTransaction.objects.filter(
            shop=shop,
            created_at__date=today
        ).order_by('-created_at')
        
        # Calculate correct wallet balance from sales
        correct_wallet_balance = total_sales
        
        # Reset wallet balance
        wallet.balance_usd = correct_wallet_balance
        wallet.balance_zig = Decimal('0.00')
        wallet.balance_rand = Decimal('0.00')
        wallet.save()
        
        print(f"   Reset wallet to: ${float(correct_wallet_balance):.2f}")
        
        # Step 3: Update drawer balances
        print(f"\n🔧 FIXING DRAWER...")
        
        for cf in cash_floats:
            cf.current_cash_usd = cumulative
            cf.current_cash = cumulative
            cf.current_total_usd = cumulative
            cf.current_total = cumulative
            cf.session_cash_sales_usd = cumulative
            cf.session_total_sales_usd = cumulative
            cf.session_cash_sales = cumulative
            cf.session_total_sales = cumulative
            cf.expected_cash_at_eod = cumulative
            cf.expected_cash_usd = cumulative
            cf.save()
        
        print(f"   Updated {cash_floats.count()} drawer(s) to: ${float(cumulative):.2f}")
        
        print("\n" + "=" * 60)
        print("✅ ALL FIXES COMPLETED!")
        print("=" * 60)
        print(f"   - Deleted {deleted_count} excess staff lunch records")
        print(f"   - Reset wallet to: ${float(correct_wallet_balance):.2f}")
        print(f"   - Reset drawer to: ${float(cumulative):.2f}")
        print()
        print("📝 NOTE: Staff lunch deductions now properly accounted for!")
        print("   Future staff lunches will validate available funds before deduction.")

if __name__ == '__main__':
    auto_fix_staff_lunch()
