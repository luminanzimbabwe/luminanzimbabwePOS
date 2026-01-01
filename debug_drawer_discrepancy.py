#!/usr/bin/env python3
"""
Debug script to identify and fix drawer calculation discrepancies
"""
import os
import sys
import django
from decimal import Decimal
from datetime import date

# Add the project root to the Python path
sys.path.insert(0, '/testbed')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from core.models import ShopConfiguration, Cashier, Sale, CashFloat
from django.utils import timezone
from django.db.models import Sum

def debug_drawer_issue():
    """Debug the drawer calculation issue"""
    print("🔍 DEBUGGING DRAWER DISCREPANCY ISSUE")
    print("=" * 50)
    
    try:
        # Get the shop
        shop = ShopConfiguration.objects.get()
        print(f"📍 Shop: {shop.name}")
        
        # Get today's date
        today = date.today()
        print(f"📅 Date: {today}")
        
        # Check all sales for today
        today_sales = Sale.objects.filter(
            shop=shop,
            created_at__date=today,
            status='completed'
        ).order_by('created_at')
        
        print(f"\n💰 TODAY'S SALES ANALYSIS:")
        print(f"   Total Sales Count: {today_sales.count()}")
        
        if today_sales.exists():
            total_revenue = today_sales.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
            print(f"   Total Revenue: ${total_revenue}")
            
            # Break down by payment method
            cash_sales = today_sales.filter(payment_method='cash')
            card_sales = today_sales.filter(payment_method='card')
            
            cash_revenue = cash_sales.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
            card_revenue = card_sales.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
            
            print(f"   Cash Sales: {cash_sales.count()} transactions = ${cash_revenue}")
            print(f"   Card Sales: {card_sales.count()} transactions = ${card_revenue}")
            
            # Show individual sales
            print(f"\n📊 INDIVIDUAL SALES:")
            for i, sale in enumerate(today_sales, 1):
                cashier_name = sale.cashier.name if sale.cashier else 'Unknown'
                print(f"   Sale #{sale.id}: ${sale.total_amount} ({sale.payment_method}) by {cashier_name} at {sale.created_at.strftime('%H:%M:%S')}")
        
        # Check cash float drawers
        print(f"\n💵 CASH FLOAT DRAWERS:")
        drawers = CashFloat.objects.filter(shop=shop, date=today)
        
        if drawers.exists():
            for drawer in drawers:
                cashier_name = drawer.cashier.name if drawer.cashier else 'Unknown'
                print(f"   Drawer for {cashier_name}:")
                print(f"     Status: {drawer.status}")
                print(f"     Float: ${drawer.float_amount}")
                print(f"     Current Cash: ${drawer.current_cash}")
                print(f"     Session Cash Sales: ${drawer.session_cash_sales}")
                print(f"     Session Total Sales: ${drawer.session_total_sales}")
                print(f"     Expected Cash at EOD: ${drawer.expected_cash_at_eod}")
                print(f"     Last Activity: {drawer.last_activity}")
                print()
        else:
            print("   No drawers found for today!")
        
        # Check for attribution issues
        print(f"\n🔍 ATTRIBUTION ANALYSIS:")
        if today_sales.exists() and drawers.exists():
            for sale in today_sales:
                matching_drawer = drawers.filter(cashier=sale.cashier).first()
                if matching_drawer:
                    print(f"   ✅ Sale #{sale.id} by {sale.cashier.name} -> Drawer for {matching_drawer.cashier.name}")
                else:
                    print(f"   ❌ Sale #{sale.id} by {sale.cashier.name} -> NO MATCHING DRAWER!")
        
        # Calculate expected vs actual
        print(f"\n📈 EXPECTED vs ACTUAL CALCULATION:")
        expected_total_cash = cash_revenue
        actual_total_cash = sum(d.current_cash for d in drawers)
        
        print(f"   Expected Total Cash (from sales): ${expected_total_cash}")
        print(f"   Actual Total Cash (in drawers): ${actual_total_cash}")
        print(f"   Difference: ${actual_total_cash - expected_total_cash}")
        
        if abs(actual_total_cash - expected_total_cash) > Decimal('0.01'):
            print(f"   🚨 DISCREPANCY DETECTED!")
            return True
        else:
            print(f"   ✅ Calculations match!")
            return False
            
    except Exception as e:
        print(f"❌ Error during debugging: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def fix_drawer_calculations():
    """Fix drawer calculations to match actual sales"""
    print(f"\n🔧 FIXING DRAWER CALCULATIONS")
    print("=" * 40)
    
    try:
        shop = ShopConfiguration.objects.get()
        today = date.today()
        
        # Get today's sales
        today_sales = Sale.objects.filter(
            shop=shop,
            created_at__date=today,
            status='completed'
        )
        
        if not today_sales.exists():
            print("   No sales found to process.")
            return
        
        # Group sales by cashier and payment method
        sales_by_cashier = {}
        for sale in today_sales:
            cashier_id = sale.cashier.id
            if cashier_id not in sales_by_cashier:
                sales_by_cashier[cashier_id] = {
                    'cashier': sale.cashier,
                    'cash_sales': Decimal('0.00'),
                    'card_sales': Decimal('0.00'),
                    'ecocash_sales': Decimal('0.00'),
                    'transfer_sales': Decimal('0.00'),
                    'total_sales': Decimal('0.00')
                }
            
            sales_by_cashier[cashier_id][f"{sale.payment_method}_sales"] += sale.total_amount
            sales_by_cashier[cashier_id]['total_sales'] += sale.total_amount
        
        # Update each cashier's drawer
        fixed_drawers = 0
        for cashier_id, sales_data in sales_by_cashier.items():
            cashier = sales_data['cashier']
            
            # Get or create drawer
            drawer, created = CashFloat.objects.get_or_create(
                shop=shop,
                cashier=cashier,
                date=today,
                defaults={
                    'status': 'ACTIVE',
                    'float_amount': Decimal('0.00'),
                    'current_cash': Decimal('0.00'),
                    'current_card': Decimal('0.00'),
                    'current_ecocash': Decimal('0.00'),
                    'current_transfer': Decimal('0.00'),
                    'current_total': Decimal('0.00'),
                    'session_cash_sales': Decimal('0.00'),
                    'session_card_sales': Decimal('0.00'),
                    'session_ecocash_sales': Decimal('0.00'),
                    'session_transfer_sales': Decimal('0.00'),
                    'session_total_sales': Decimal('0.00'),
                    'expected_cash_at_eod': Decimal('0.00')
                }
            )
            
            # Update drawer with actual sales data
            old_cash = drawer.current_cash
            old_session_cash = drawer.session_cash_sales
            
            drawer.session_cash_sales = sales_data['cash_sales']
            drawer.session_card_sales = sales_data['card_sales']
            drawer.session_ecocash_sales = sales_data['ecocash_sales']
            drawer.session_transfer_sales = sales_data['transfer_sales']
            drawer.session_total_sales = sales_data['total_sales']
            
            # Update current amounts (cash in drawer = cash sales)
            drawer.current_cash = sales_data['cash_sales']
            drawer.current_card = sales_data['card_sales']
            drawer.current_ecocash = sales_data['ecocash_sales']
            drawer.current_transfer = sales_data['transfer_sales']
            drawer.current_total = sales_data['total_sales']
            
            # Update expected cash at EOD (float + cash sales)
            drawer.expected_cash_at_eod = drawer.float_amount + drawer.session_cash_sales
            
            # Mark as active and update activity
            drawer.status = 'ACTIVE'
            drawer.last_activity = timezone.now()
            drawer.save()
            
            print(f"   ✅ Fixed drawer for {cashier.name}:")
            print(f"      Cash Sales: ${old_session_cash} -> ${drawer.session_cash_sales}")
            print(f"      Current Cash: ${old_cash} -> ${drawer.current_cash}")
            print(f"      Total Sales: ${drawer.session_total_sales}")
            
            fixed_drawers += 1
        
        print(f"\n🎉 FIXED {fixed_drawers} DRAWER(S)")
        
    except Exception as e:
        print(f"❌ Error fixing drawers: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🚀 STARTING DRAWER DISCREPANCY DIAGNOSTIC")
    print("=" * 60)
    
    has_discrepancy = debug_drawer_issue()
    
    if has_discrepancy:
        print(f"\n⚠️ DISCREPANCY DETECTED - Running fix...")
        fix_drawer_calculations()
        
        print(f"\n🔍 VERIFICATION - Running diagnostic again:")
        debug_drawer_issue()
    else:
        print(f"\n✅ No discrepancy detected!")
    
    print(f"\n🏁 DIAGNOSTIC COMPLETE")