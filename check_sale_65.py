#!/usr/bin/env python
"""
Check the actual sale data from the receipt
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

def check_sale_65():
    print("CHECKING SALE ID 65 FROM RECEIPT")
    print("=" * 50)
    
    try:
        # Get the shop
        shop = ShopConfiguration.objects.get()
        print(f"Shop: {shop.name}")
        
        # Check Sale ID 65
        try:
            sale = Sale.objects.get(id=65)
            print(f"\nSALE FOUND:")
            print(f"  ID: {sale.id}")
            print(f"  Total Amount: ${sale.total_amount}")
            print(f"  Currency: {sale.currency}")
            print(f"  Payment Method: {sale.payment_method}")
            print(f"  Customer Name: {sale.customer_name}")
            print(f"  Cashier: {sale.cashier.name if sale.cashier else 'None'}")
            print(f"  Created At: {sale.created_at}")
            print(f"  Status: {sale.status}")
            
            # Check sale items
            print(f"\nSALE ITEMS:")
            for item in sale.items.all():
                print(f"  - {item.product.name}: {item.quantity} x ${item.unit_price} = ${item.total_price}")
            
            # Check drawer for this cashier
            today = timezone.now().date()
            if sale.cashier:
                try:
                    drawer = CashFloat.objects.get(
                        shop=shop,
                        cashier=sale.cashier,
                        date=today
                    )
                    print(f"\nDRAWER STATE FOR CASHIER '{sale.cashier.name}':")
                    print(f"  USD Cash: ${drawer.current_cash_usd}")
                    print(f"  ZIG Cash: ${drawer.current_cash_zig}")
                    print(f"  RAND Cash: ${drawer.current_cash_rand}")
                    print(f"  USD Total: ${drawer.current_total_usd}")
                    print(f"  ZIG Total: ${drawer.current_total_zig}")
                    print(f"  RAND Total: ${drawer.current_total_rand}")
                    print(f"  Legacy Total: ${drawer.current_total}")
                    
                    # Check session sales
                    print(f"\nSESSION SALES:")
                    print(f"  USD Cash Sales: ${drawer.session_cash_sales_usd}")
                    print(f"  ZIG Cash Sales: ${drawer.session_cash_sales_zig}")
                    print(f"  RAND Cash Sales: ${drawer.session_cash_sales_rand}")
                    
                except CashFloat.DoesNotExist:
                    print(f"\nNO DRAWER FOUND for cashier '{sale.cashier.name}' on {today}")
            
        except Sale.DoesNotExist:
            print("Sale ID 65 not found in database")
            
            # Check if there are any recent sales
            print("\nRECENT SALES:")
            recent_sales = Sale.objects.filter(shop=shop).order_by('-created_at')[:10]
            for s in recent_sales:
                print(f"  ID {s.id}: ${s.total_amount} {s.currency} {s.payment_method} by {s.cashier.name if s.cashier else 'No cashier'}")
        
        return True
        
    except Exception as e:
        print(f"\nERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = check_sale_65()
    sys.exit(0 if success else 1)