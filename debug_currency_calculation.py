#!/usr/bin/env python
"""
Debug the currency calculation issue - trace what's sent vs what's stored
"""
import os
import sys
import django
from decimal import Decimal

# Add the project directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from core.models import ShopConfiguration, Cashier, Product, Sale, SaleItem, CashFloat
from django.utils import timezone

def debug_currency_calculation():
    print("DEBUGGING CURRENCY CALCULATION ISSUE")
    print("=" * 50)
    
    try:
        # Get the shop
        shop = ShopConfiguration.objects.get()
        print(f"Shop: {shop.name}")
        
        # Get the cashier
        cashier = Cashier.objects.get(name="mufaro ngirazi")
        print(f"Cashier: {cashier.name}")
        
        # Check all sales for this cashier today
        today = timezone.now().date()
        today_sales = Sale.objects.filter(
            shop=shop, 
            cashier=cashier, 
            created_at__date=today
        ).order_by('created_at')
        
        print(f"\nALL SALES FOR {cashier.name} TODAY ({today}):")
        print("-" * 50)
        
        total_by_currency = {'USD': Decimal('0'), 'ZIG': Decimal('0'), 'RAND': Decimal('0')}
        
        for sale in today_sales:
            print(f"Sale ID: {sale.id}")
            print(f"  Amount: ${sale.total_amount}")
            print(f"  Currency: {sale.currency}")
            print(f"  Payment Method: {sale.payment_method}")
            print(f"  Customer: {sale.customer_name or 'N/A'}")
            print(f"  Created: {sale.created_at}")
            print(f"  Items:")
            
            # Check sale items
            for item in sale.items.all():
                print(f"    - {item.product.name}: {item.quantity} x ${item.unit_price} = ${item.total_price}")
                print(f"      Product Price: ${item.product.price} {item.product.currency}")
            
            # Add to totals
            total_by_currency[sale.currency] += sale.total_amount
            print(f"  Running totals - USD: ${total_by_currency['USD']}, ZIG: ${total_by_currency['ZIG']}, RAND: ${total_by_currency['RAND']}")
            print()
        
        print("SALE TOTALS BY CURRENCY:")
        print(f"USD: ${total_by_currency['USD']}")
        print(f"ZIG: ${total_by_currency['ZIG']}")
        print(f"RAND: ${total_by_currency['RAND']}")
        print(f"TOTAL: ${total_by_currency['USD'] + total_by_currency['ZIG'] + total_by_currency['RAND']}")
        
        # Check drawer state
        print(f"\nDRAWER STATE:")
        try:
            drawer = CashFloat.objects.get(shop=shop, cashier=cashier, date=today)
            print(f"Drawer USD Cash: ${drawer.current_cash_usd}")
            print(f"Drawer ZIG Cash: ${drawer.current_cash_zig}")
            print(f"Drawer RAND Cash: ${drawer.current_cash_rand}")
            print(f"Drawer Legacy Total: ${drawer.current_total}")
            
            print(f"\nCURRENCY TOTALS IN DRAWER:")
            print(f"USD Total: ${drawer.current_total_usd}")
            print(f"ZIG Total: ${drawer.current_total_zig}")
            print(f"RAND Total: ${drawer.current_total_rand}")
            print(f"Sum of currency totals: ${drawer.current_total_usd + drawer.current_total_zig + drawer.current_total_rand}")
            
        except CashFloat.DoesNotExist:
            print("No drawer found for today")
        
        # Analysis
        print(f"\nANALYSIS:")
        print("=" * 50)
        
        # Check if drawer matches sales
        if 'drawer' in locals():
            sales_total_usd = total_by_currency['USD']
            sales_total_zig = total_by_currency['ZIG']
            sales_total_rand = total_by_currency['RAND']
            
            drawer_usd = drawer.current_total_usd
            drawer_zig = drawer.current_total_zig
            drawer_rand = drawer.current_total_rand
            
            print(f"USD - Sales: ${sales_total_usd}, Drawer: ${drawer_usd}, Match: {sales_total_usd == drawer_usd}")
            print(f"ZIG - Sales: ${sales_total_zig}, Drawer: ${drawer_zig}, Match: {sales_total_zig == drawer_zig}")
            print(f"RAND - Sales: ${sales_total_rand}, Drawer: ${drawer_rand}, Match: {sales_total_rand == drawer_rand}")
            
            if sales_total_zig != drawer_zig:
                print(f"\n⚠️ ZIG MISMATCH DETECTED!")
                print(f"   Sales show: ${sales_total_zig} ZIG")
                print(f"   Drawer shows: ${drawer_zig} ZIG")
                print(f"   Difference: ${abs(sales_total_zig - drawer_zig)} ZIG")
            
        # Check specific sale 65
        print(f"\nSPECIFIC CHECK - SALE 65:")
        try:
            sale_65 = Sale.objects.get(id=65)
            print(f"Sale 65 Amount: ${sale_65.total_amount}")
            print(f"Sale 65 Currency: {sale_65.currency}")
            print(f"Receipt shows: 32.00 ZIG")
            print(f"Database shows: ${sale_65.total_amount} {sale_65.currency}")
            
            if sale_65.currency == 'ZIG' and sale_65.total_amount != Decimal('32.00'):
                print(f"❌ MISMATCH: Receipt shows 32.00 ZIG but database shows ${sale_65.total_amount} {sale_65.currency}")
                
                # Check the product that was sold
                for item in sale_65.items.all():
                    print(f"Product: {item.product.name}")
                    print(f"Product Price: ${item.product.price} {item.product.currency}")
                    print(f"Quantity Sold: {item.quantity}")
                    print(f"Expected Total: {item.quantity} x ${item.product.price} = ${item.quantity * item.product.price}")
                    
        except Sale.DoesNotExist:
            print("Sale 65 not found")
        
        return True
        
    except Exception as e:
        print(f"\nERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = debug_currency_calculation()
    sys.exit(0 if success else 1)