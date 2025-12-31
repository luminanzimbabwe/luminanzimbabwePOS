#!/usr/bin/env python
"""
Debug script to test if stock is being decremented during sales
"""
import os
import sys
import django
import json
from datetime import datetime

# Add the current directory to Python path
sys.path.insert(0, os.getcwd())

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from core.models import Product, Sale, SaleItem, InventoryLog, Cashier, Shop
from django.db import transaction

def debug_stock_decrement():
    print("=== DEBUGGING STOCK DECREMENT ISSUE ===\n")
    
    # Get or create a test product
    test_product, created = Product.objects.get_or_create(
        line_code='TEST001',
        defaults={
            'name': 'Test Product',
            'cost_price': 10.00,
            'selling_price': 15.00,
            'stock_quantity': 100,
            'category': 'Test Category',
            'currency': 'USD'
        }
    )
    
    if created:
        print(f"Created new test product: {test_product.name}")
    else:
        print(f"Using existing test product: {test_product.name}")
    
    print(f"Initial stock: {test_product.stock_quantity}\n")
    
    # Simulate a sale
    print("Simulating a sale...")
    
    # Create a test sale
    sale_data = {
        'customer_name': 'Test Customer',
        'total_amount': 45.00,
        'sale_items': [
            {
                'product': test_product,
                'quantity': 3,
                'unit_price': 15.00,
                'total_price': 45.00
            }
        ]
    }
    
    try:
        with transaction.atomic():
            # Create the sale
            sale = Sale.objects.create(
                shop_id=1,  # assuming shop with id 1 exists
                cashier_id=1,  # assuming cashier with id 1 exists
                customer_name=sale_data['customer_name'],
                total_amount=sale_data['total_amount'],
                status='COMPLETED'
            )
            
            print(f"Created sale: {sale.id}")
            
            # Check stock before creating sale items
            print(f"Stock after creating sale record: {test_product.stock_quantity}")
            
            # Create sale items and update stock (this is the critical part)
            for item_data in sale_data['sale_items']:
                print(f"Processing item: {item_data['product'].name} x {item_data['quantity']}")
                
                # Check stock before decrement
                original_stock = item_data['product'].stock_quantity
                print(f"Stock before decrement: {original_stock}")
                
                # Create the sale item
                sale_item = SaleItem.objects.create(
                    sale=sale,
                    product=item_data['product'],
                    quantity=item_data['quantity'],
                    unit_price=item_data['unit_price'],
                    total_price=item_data['total_price']
                )
                print(f"Created sale item: {sale_item.id}")
                
                # Decrement stock
                item_data['product'].stock_quantity -= item_data['quantity']
                item_data['product'].save()
                
                print(f"Stock after decrement: {item_data['product'].stock_quantity}")
                
                # Create inventory log
                log = InventoryLog.objects.create(
                    shop_id=1,
                    product=item_data['product'],
                    reason_code='SALE',
                    quantity_change=-item_data['quantity'],
                    previous_quantity=original_stock,
                    new_quantity=item_data['product'].stock_quantity,
                    performed_by_id=1,
                    reference_number=f'Sale #{sale.id}',
                    notes=f'Sold {item_data[\"quantity\"]} x {item_data[\"product\"].name} to {sale_data[\"customer_name\"]}',
                    cost_price=item_data['product'].cost_price
                )
                print(f"Created inventory log: {log.id}")
        
        print(f"\n=== FINAL RESULTS ===")
        print(f"Original stock: 100")
        print(f"Final stock: {test_product.stock_quantity}")
        print(f"Expected stock: 97")
        print(f"Stock correctly decremented: {test_product.stock_quantity == 97}")
        
        # Check database directly
        product_from_db = Product.objects.get(id=test_product.id)
        print(f"Stock from fresh DB query: {product_from_db.stock_quantity}")
        
    except Exception as e:
        print(f"Error during sale simulation: {e}")
        import traceback
        traceback.print_exc()

def check_existing_sales():
    print("\n=== CHECKING EXISTING SALES ===")
    
    # Get all products and their current stock
    products = Product.objects.all()
    print("Current product stock levels:")
    for p in products:
        print(f"  {p.name} ({p.line_code}): {p.stock_quantity}")
    
    # Check for any inventory logs with SALE reason
    sale_logs = InventoryLog.objects.filter(reason_code='SALE')
    print(f"\nFound {sale_logs.count()} SALE inventory logs:")
    for log in sale_logs.order_by('-created_at')[:10]:
        print(f"  {log.created_at}: {log.product.name} - {log.quantity_change} (from {log.previous_quantity} to {log.new_quantity})")
    
    # Check recent sales
    recent_sales = Sale.objects.all().order_by('-created_at')[:5]
    print(f"\nRecent sales:")
    for sale in recent_sales:
        print(f"  Sale #{sale.id}: ${sale.total_amount} - {sale.created_at}")
        items = SaleItem.objects.filter(sale=sale)
        for item in items:
            print(f"    {item.product.name}: {item.quantity} x ${item.unit_price}")

if __name__ == '__main__':
    debug_stock_decrement()
    check_existing_sales()