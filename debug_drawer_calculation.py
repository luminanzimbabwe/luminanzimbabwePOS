#!/usr/bin/env python3
"""
Debug Drawer Calculation Issue
This script investigates discrepancies between drawer sales and actual sales records.
"""

import os
import sys
import django
from decimal import Decimal

# Add the project directory to Python path
sys.path.append('.')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from core.models import Sale, CashFloat, ShopConfiguration, Cashier
from django.utils import timezone
from datetime import date

def debug_drawer_calculation():
    """Debug the drawer calculation discrepancy"""
    print("DEBUGGING DRAWER CALCULATION ISSUE")
    print("=" * 50)
    
    try:
        # Get the shop
        shop = ShopConfiguration.objects.first()
        if not shop:
            print("No shop found")
            return
            
        print(f"Shop: {shop.name}")
        
        # Get today's date
        today = date.today()
        print(f"Date: {today}")
        
        # Get all cashiers
        cashiers = Cashier.objects.filter(shop=shop)
        print(f"Cashiers: {cashiers.count()}")
        
        for cashier in cashiers:
            print(f"\nANALYZING CASHIER: {cashier.name} (ID: {cashier.id})")
            print("-" * 40)
            
            # Get actual sales for today
            today_sales = Sale.objects.filter(
                shop=shop,
                cashier=cashier,
                created_at__date=today,
                status='completed'
            ).order_by('created_at')
            
            print(f"ACTUAL SALES TODAY: {today_sales.count()} transactions")
            
            total_actual_sales = Decimal('0.00')
            for sale in today_sales:
                total_actual_sales += sale.total_amount
                print(f"   • Sale #{sale.id}: ${sale.total_amount} ({sale.payment_method}) at {sale.created_at.strftime('%H:%M:%S')}")
            
            print(f"TOTAL ACTUAL SALES: ${total_actual_sales}")
            
            # Get drawer for this cashier
            try:
                drawer = CashFloat.objects.get(
                    shop=shop,
                    cashier=cashier,
                    date=today
                )
                
                print(f"DRAWER STATUS:")
                print(f"   • Float Amount: ${drawer.float_amount}")
                print(f"   • Session Cash Sales: ${drawer.session_cash_sales}")
                print(f"   • Session Card Sales: ${drawer.session_card_sales}")
                print(f"   • Session Total Sales: ${drawer.session_total_sales}")
                print(f"   • Current Cash: ${drawer.current_cash}")
                print(f"   • Current Card: ${drawer.current_card}")
                print(f"   • Current Total: ${drawer.current_total}")
                print(f"   • Status: {drawer.status}")
                print(f"   • Last Activity: {drawer.last_activity}")
                
                # Calculate discrepancy
                drawer_session_total = drawer.session_total_sales
                discrepancy = drawer_session_total - total_actual_sales
                
                print(f"\n🔍 DISCREPANCY ANALYSIS:")
                print(f"   • Drawer Session Total: ${drawer_session_total}")
                print(f"   • Actual Sales Total: ${total_actual_sales}")
                print(f"   • Discrepancy: ${discrepancy}")
                
                if abs(discrepancy) > Decimal('0.01'):  # Allow for small rounding differences
                    print(f"   WARNING: SIGNIFICANT DISCREPANCY DETECTED!")
                    
                    # Check for potential double counting
                    print(f"\nPOTENTIAL CAUSES:")
                    
                    # Check if there are any sales with refunded status
                    refunded_sales = Sale.objects.filter(
                        shop=shop,
                        cashier=cashier,
                        created_at__date=today,
                        status='refunded'
                    )
                    if refunded_sales.exists():
                        print(f"   • Refunded sales found: {refunded_sales.count()}")
                        for refund in refunded_sales:
                            print(f"     - Sale #{refund.id}: ${refund.total_amount} (refunded)")
                    
                    # Check for sales in other time ranges
                    yesterday_sales = Sale.objects.filter(
                        shop=shop,
                        cashier=cashier,
                        created_at__date=today - timezone.timedelta(days=1),
                        status='completed'
                    )
                    if yesterday_sales.exists():
                        print(f"   • Yesterday's sales: {yesterday_sales.count()} (${sum(s.total_amount for s in yesterday_sales)})")
                    
                    # Check if drawer was updated multiple times
                    print(f"   • Drawer created at: {drawer.created_at}")
                    print(f"   • Drawer updated at: {drawer.updated_at}")
                    
                else:
                    print(f"   NO SIGNIFICANT DISCREPANCY")
                    
            except CashFloat.DoesNotExist:
                print(f"   No drawer found for cashier {cashier.name}")
            
            print("\n" + "=" * 50)
    
    except Exception as e:
        print(f"Error during debugging: {str(e)}")
        import traceback
        traceback.print_exc()

def reset_drawer_if_needed():
    """Reset drawer if significant discrepancy is found"""
    print("\nCHECKING IF DRAWER RESET IS NEEDED...")
    
    shop = ShopConfiguration.objects.first()
    if not shop:
        return
        
    today = date.today()
    cashiers = Cashier.objects.filter(shop=shop)
    
    for cashier in cashiers:
        try:
            drawer = CashFloat.objects.get(
                shop=shop,
                cashier=cashier,
                date=today
            )
            
            # Get actual sales
            today_sales = Sale.objects.filter(
                shop=shop,
                cashier=cashier,
                created_at__date=today,
                status='completed'
            )
            
            actual_total = sum(sale.total_amount for sale in today_sales)
            drawer_total = drawer.session_total_sales
            
            if abs(drawer_total - actual_total) > Decimal('0.01'):
                print(f"WARNING: Resetting drawer for {cashier.name}")
                print(f"   Old drawer total: ${drawer_total}")
                print(f"   Actual sales total: ${actual_total}")
                
                # Reset drawer to match actual sales
                drawer.session_cash_sales = Decimal('0.00')
                drawer.session_card_sales = Decimal('0.00')
                drawer.session_ecocash_sales = Decimal('0.00')
                drawer.session_transfer_sales = Decimal('0.00')
                drawer.session_total_sales = Decimal('0.00')
                drawer.current_cash = Decimal('0.00')
                drawer.current_card = Decimal('0.00')
                drawer.current_ecocash = Decimal('0.00')
                drawer.current_transfer = Decimal('0.00')
                drawer.current_total = Decimal('0.00')
                
                # Re-add actual sales to drawer
                for sale in today_sales:
                    drawer.add_sale(sale.total_amount, sale.payment_method)
                
                print(f"   Drawer reset completed")
                
        except CashFloat.DoesNotExist:
            continue

if __name__ == "__main__":
    debug_drawer_calculation()
    
    # Ask user if they want to reset the drawer
    response = input("\n❓ Do you want to reset drawers to match actual sales? (y/N): ")
    if response.lower() in ['y', 'yes']:
        reset_drawer_if_needed()
        print("\nDrawer reset completed!")
    else:
        print("\nDrawer reset skipped. Manual investigation needed.")