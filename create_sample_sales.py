#!/usr/bin/env python
import os
import django
from datetime import timedelta

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from core.models import ShopConfiguration, Cashier, Product, Sale, SaleItem

print("=== CREATING SAMPLE SALES DATA ===")

try:
    # Get existing data
    shop = ShopConfiguration.objects.first()
    cashier = Cashier.objects.first()
    products = Product.objects.all()
    
    if not shop:
        print("ERROR: No shop found!")
        exit(1)
    
    if not cashier:
        print("ERROR: No cashier found!")
        exit(1)
    
    if products.count() == 0:
        print("ERROR: No products found!")
        exit(1)
    
    print(f"Shop: {shop.name}")
    print(f"Cashier: {cashier.name}")
    print(f"Products available: {products.count()}")
    
    # Create sample sales with different products
    from django.utils import timezone
    
    # Sample products for top selling list
    sample_products = list(products)[:5]  # Get first 5 products
    
    if len(sample_products) == 0:
        print("ERROR: Need at least 5 products to create sample sales!")
        exit(1)
    
    # Create multiple sales for each product to make them "top selling"
    sales_created = 0
    total_items = 0
    
    for i, product in enumerate(sample_products):
        # Create 3-5 sales for each product
        for sale_num in range(3 + i):  # Different numbers to create ranking
            # Create sale
            sale = Sale.objects.create(
                shop=shop,
                cashier=cashier,
                total_amount=product.price * 2,  # Sell 2 units each time
                currency=product.currency,
                payment_method='cash',
                status='completed',
                created_at=timezone.now() - timedelta(days=i)
            )
            
            # Create sale item
            sale_item = SaleItem.objects.create(
                sale=sale,
                product=product,
                quantity=2,
                unit_price=product.price,
                total_price=product.price * 2
            )
            
            # Update product stock
            product.stock_quantity -= 2
            product.save()
            
            sales_created += 1
            total_items += 2
    
    print(f"SUCCESS: Created {sales_created} sales with {total_items} total items")
    print(f"SUCCESS: Top selling products will be:")
    for i, product in enumerate(sample_products):
        print(f"   {i+1}. {product.name} - ${product.price} ({product.currency})")
    
    print("\nINFO: The cashier dashboard will now show these as top selling products!")
    
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()