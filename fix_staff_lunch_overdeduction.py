"""
Script to fix staff lunch over-deduction issue
Problem: $257 was deducted for staff lunches but only $106 was earned, causing negative balance
Solution: Remove excess staff lunch deductions to match available cash
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.utils import timezone
from decimal import Decimal
from core.models import ShopConfiguration, StaffLunch, CashFloat, Sale

def fix_staff_lunch_overdeduction():
    """Fix the over-deduction of staff lunch from drawer"""
    
    print("=" * 60)
    print("🔧 STAFF LUNCH OVER-DEDUCTION FIX")
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
    
    # Get today's sales
    today_sales = Sale.objects.filter(
        shop=shop, 
        created_at__date=today, 
        status='completed'
    )
    total_sales = today_sales.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
    print(f"💰 Today's Sales: ${float(total_sales):.2f}")
    
    # Get today's staff lunch deductions
    today_lunches = StaffLunch.objects.filter(
        shop=shop,
        created_at__date=today
    )
    total_lunch_deductions = today_lunches.aggregate(total=Sum('total_cost'))['total'] or Decimal('0.00')
    print(f"🍽️ Today's Staff Lunch Deductions: ${float(total_lunch_deductions):.2f}")
    
    # Calculate what the drawer SHOULD have
    correct_drawer_balance = total_sales - total_lunch_deductions
    print(f"✅ Correct Drawer Balance Should Be: ${float(correct_drawer_balance):.2f}")
    
    # Get current drawer status
    cash_floats = CashFloat.objects.filter(shop=shop, date=today)
    current_cash_usd = sum(cf.current_cash_usd or Decimal('0.00') for cf in cash_floats)
    print(f"❌ Current Drawer Balance: ${float(current_cash_usd):.2f}")
    
    print()
    print("-" * 60)
    print("📋 STAFF LUNCH RECORDS TO REVIEW:")
    print("-" * 60)
    
    # Show all staff lunch records
    for i, lunch in enumerate(today_lunches.order_by('created_at'), 1):
        print(f"  {i}. ${float(lunch.total_cost):.2f} - {lunch.notes[:50]}...")
    
    print()
    
    # Calculate excess deduction
    if current_cash_usd < 0:
        excess_deduction = abs(current_cash_usd)
        print(f"🚨 OVER-DEDUCTION DETECTED: ${float(excess_deduction):.2f}")
        print()
        
        # Ask for confirmation
        print("Options:")
        print("  1. Delete excess staff lunch records to match available cash")
        print("  2. Reset all today's staff lunch records")
        print("  3. Just report the issue (no changes)")
        
        choice = input("\nEnter your choice (1/2/3): ").strip()
        
        if choice == '1':
            # Delete excess lunches (keep only what can be afforded)
            affordable_amount = float(total_sales)
            print(f"\n💡 Keeping lunches up to ${affordable_amount:.2f}")
            
            cumulative = Decimal('0.00')
            lunches_to_keep = []
            lunches_to_delete = []
            
            for lunch in today_lunches.order_by('created_at'):
                if cumulative + lunch.total_cost <= affordable_amount:
                    cumulative += lunch.total_cost
                    lunches_to_keep.append(lunch)
                else:
                    lunches_to_delete.append(lunch)
            
            print(f"   Keeping {len(lunches_to_keep)} lunch records (${float(cumulative):.2f})")
            print(f"   Deleting {len(lunches_to_delete)} lunch records")
            
            for lunch in lunches_to_delete:
                print(f"      - Deleting: ${float(lunch.total_cost):.2f} - {lunch.notes[:40]}...")
                lunch.delete()
            
            # Update drawer to correct balance
            for cf in cash_floats:
                cf.current_cash_usd = cumulative
                cf.current_cash = cumulative
                cf.current_total_usd = cumulative
                cf.current_total = cumulative
                cf.expected_cash_at_eod = cumulative
                cf.expected_cash_usd = cumulative
                cf.save()
            
            print(f"\n✅ Fixed! Drawer now shows: ${float(cumulative):.2f}")
            
        elif choice == '2':
            # Delete all today's lunches
            count = today_lunches.count()
            print(f"\n🗑️ Deleting all {count} staff lunch records for today...")
            today_lunches.delete()
            
            # Reset drawer to just sales
            for cf in cash_floats:
                cf.current_cash_usd = total_sales
                cf.current_cash = total_sales
                cf.current_total_usd = total_sales
                cf.current_total = total_sales
                cf.expected_cash_at_eod = total_sales
                cf.expected_cash_usd = total_sales
                cf.save()
            
            print(f"✅ Reset! Drawer now shows: ${float(total_sales):.2f}")
            
        else:
            print("\n📊 No changes made - issue reported only.")
    
    else:
        print("✅ No over-deduction detected. Drawer balance is positive.")

if __name__ == '__main__':
    fix_staff_lunch_overdeduction()
