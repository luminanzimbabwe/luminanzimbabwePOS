#!/usr/bin/env python3
"""
Debug script to test the complete sale processing flow
"""

import os
import sys
import django
import json
from datetime import datetime, date

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from core.models import Product, Sale, SaleItem, ShopConfiguration, Cashier
from core.serializers import SaleSerializer
from django.db import transaction

def test_sale_processing():
    """Test the complete sale processing flow"""
    
    print("=== SALE PROCESSING DEBUG ===\n")
    
    try:
        # 1. Get or create a cashier
        print("1. Getting cashier...")
        cashier = Cashier.objects.filter(username='test_cashier').first()
        if not cashier:
            cashier = Cashier.objects.create(
                username='test_cashier',
                password='test123',
                full_name='Test Cashier',
                approved=True
            )
            print(f"Created cashier: {cashier.full_name}")
        else:
            print(f"Using existing cashier: {cashier.full_name}")
        
        # 2. Get or create shop configuration
        print("\n2. Getting shop configuration...")
        shop_config = ShopConfiguration.objects.first()
        if not shop_config:
            shop_config = ShopConfiguration.objects.create(
                shop_name='Test Shop',
                tax_rate=15.0,
                currency='USD'
            )
            print("Created shop configuration")
        else:
            print(f"Using shop: {shop_config.shop_name}")
        
        # 3. Get or create test products
        print("\n3. Getting test products...")
        products = Product.objects.all()[:3]  # Get first 3 products
        
        if len(products) < 2:
            print("Creating test products...")
            products = []
            for i in range(3):
                product = Product.objects.create(
                    name=f'Test Product {i+1}',
                    line_code=f'TP{i+1}',
                    price=10.00 + i * 5,
                    cost_price=5.00 + i * 3,
                    quantity_in_stock=100 + i * 10,
                    min_stock_level=10,
                    category=f'Test Category {i+1}'
                )
                products.append(product)
                print(f"Created product: {product.name} - Stock: {product.quantity_in_stock}")
        else:
            for product in products:
                print(f"Product: {product.name} - Stock: {product.quantity_in_stock}")
        
        # 4. Prepare sale data
        print("\n4. Preparing sale data...")
        sale_data = {
            'cashier': cashier.id,
            'payment_method': 'cash',
            'items': []
        }
        
        # Add sale items
        for i, product in enumerate(products[:2]):  # Use first 2 products
            item = {
                'product': product.id,
                'quantity': 2 + i,  # Different quantities
                'unit_price': float(product.price),
                'discount': 0
            }
            sale_data['items'].append(item)
            print(f"Added item: {product.name} x {item['quantity']} @ {item['unit_price']}")
        
        print(f"\nSale data: {json.dumps(sale_data, indent=2)}")
        
        # 5. Test sale creation
        print("\n5. Testing sale creation...")
        try:
            with transaction.atomic():
                # Create sale
                sale = Sale.objects.create(
                    cashier=cashier,
                    total_amount=0,  # Will be calculated
                    status='pending',
                    payment_method=sale_data['payment_method']
                )
                print(f"✓ Created sale with ID: {sale.id}")
                
                # Calculate total and create sale items
                total_amount = 0
                for item_data in sale_data['items']:
                    product = Product.objects.get(id=item_data['product'])
                    quantity = item_data['quantity']
                    unit_price = item_data['unit_price']
                    discount = item_data['discount']
                    
                    item_total = (quantity * unit_price) - discount
                    total_amount += item_total
                    
                    # Create sale item
                    sale_item = SaleItem.objects.create(
                        sale=sale,
                        product=product,
                        quantity=quantity,
                        unit_price=unit_price,
                        total_price=item_total
                    )
                    print(f"✓ Created sale item: {product.name} x {quantity}")
                    
                    # Stock decrement
                    print(f"Stock before decrement: {product.quantity_in_stock}")
                    product.quantity_in_stock -= quantity
                    product.save()
                    print(f"✓ Stock decremented: {product.quantity_in_stock}")
                
                # Update sale total
                sale.total_amount = total_amount
                sale.status = 'completed'
                sale.save()
                
                print(f"✓ Sale completed - Total: {total_amount}")
                
                # 6. Verify the sale
                print("\n6. Verifying sale...")
                sale = Sale.objects.get(id=sale.id)
                sale_items = SaleItem.objects.filter(sale=sale)
                
                print(f"Sale ID: {sale.id}")
                print(f"Status: {sale.status}")
                print(f"Total: {sale.total_amount}")
                print(f"Items count: {sale_items.count()}")
                
                for item in sale_items:
                    product = item.product
                    print(f"  - {product.name}: {item.quantity} @ {item.unit_price} = {item.total_price}")
                    print(f"    Product stock after: {product.quantity_in_stock}")
                
                print("\n✅ SALE PROCESSING SUCCESSFUL!")
                return sale.id
                
        except Exception as e:
            print(f"❌ Error during sale creation: {str(e)}")
            print(f"Error type: {type(e).__name__}")
            import traceback
            traceback.print_exc()
            return None
            
    except Exception as e:
        print(f"❌ Error in setup: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def test_sale_serializer():
    """Test the SaleSerializer"""
    print("\n=== TESTING SALE SERIALIZER ===\n")
    
    try:
        # Get test data
        cashier = Cashier.objects.first()
        products = Product.objects.all()[:2]
        
        if not cashier or len(products) < 1:
            print("❌ Need cashier and products for serializer test")
            return
        
        sale_data = {
            'cashier': cashier.id,
            'payment_method': 'cash',
            'items': [
                {
                    'product': products[0].id,
                    'quantity': 1,
                    'unit_price': float(products[0].price),
                    'discount': 0
                }
            ]
        }
        
        print("Testing serializer with data:")
        print(json.dumps(sale_data, indent=2))
        
        serializer = SaleSerializer(data=sale_data)
        
        if serializer.is_valid():
            print("✓ Serializer is valid")
            print(f"Validated data: {serializer.validated_data}")
            
            # Try to save
            sale = serializer.save()
            print(f"✓ Serializer saved sale with ID: {sale.id}")
            return sale.id
        else:
            print("❌ Serializer errors:")
            print(serializer.errors)
            return None
            
    except Exception as e:
        print(f"❌ Serializer test error: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == '__main__':
    print("Starting Sale Processing Debug...\n")
    
    # Test 1: Manual sale creation
    sale_id = test_sale_processing()
    
    # Test 2: Serializer test
    if sale_id:
        print(f"\n✓ Manual sale creation test completed successfully (Sale ID: {sale_id})")
    else:
        print("\n❌ Manual sale creation test failed")
    
    # Test 3: Serializer test
    serializer_sale_id = test_sale_serializer()
    
    if serializer_sale_id:
        print(f"\n✓ Serializer test completed successfully (Sale ID: {serializer_sale_id})")
    else:
        print("\n❌ Serializer test failed")
    
    print("\n=== DEBUG COMPLETE ===")