#!/usr/bin/env python
import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from core.models import Product

print("=== UPDATING PRODUCT STOCK ===")

try:
    # Update RICE stock
    rice = Product.objects.get(name='RICE 2KG')
    rice.stock_quantity = 25
    rice.save()
    print(f"Updated RICE stock to: {rice.stock_quantity}")
    
    # Verify all products
    products = Product.objects.all()
    print(f"\nProducts in database:")
    for product in products:
        print(f"- {product.name}: ${product.price} (Stock: {product.stock_quantity}) - {product.category}")
    
    print("\nProducts are ready for POS testing!")
    
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()