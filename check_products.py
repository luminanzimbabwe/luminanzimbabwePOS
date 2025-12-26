#!/usr/bin/env python
import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from core.models import Product

print("=== CHECKING PRODUCTS IN DATABASE ===")

try:
    products = Product.objects.all()
    print(f"Total products in database: {products.count()}")
    print()
    
    if products.count() == 0:
        print("No products found! Let's create some sample products.")
        # Create sample products
        sample_products = [
            {"name": "SUGAR 1KG", "price": 1.00, "stock": 50, "category": "Food"},
            {"name": "RICE 2KG", "price": 1.80, "stock": 30, "category": "Food"},
            {"name": "BREAD LOAF", "price": 0.75, "stock": 25, "category": "Bakery"},
            {"name": "MILK 1L", "price": 1.20, "stock": 40, "category": "Dairy"},
            {"name": "EGGS DOZEN", "price": 2.50, "stock": 20, "category": "Dairy"},
            {"name": "COFFEE 500G", "price": 3.99, "stock": 15, "category": "Beverages"},
            {"name": "TEA BOX", "price": 2.25, "stock": 18, "category": "Beverages"},
            {"name": "SALT 1KG", "price": 0.50, "stock": 35, "category": "Condiments"},
            {"name": "OIL 1L", "price": 2.75, "stock": 22, "category": "Condiments"},
            {"name": "TOMATOES 1KG", "price": 1.50, "stock": 28, "category": "Vegetables"},
        ]
        
        for i, prod_data in enumerate(sample_products, 1):
            product = Product.objects.create(
                name=prod_data["name"],
                price=prod_data["price"],
                stock_quantity=prod_data["stock"],
                category=prod_data["category"],
                line_code=f"PROD{str(i).zfill(3)}",
                currency="USD"
            )
            print(f"Created: {product.name} - ${product.price}")
        
        print(f"\nCreated {len(sample_products)} sample products!")
        
    else:
        print("Products found:")
        for product in products:
            print(f"- {product.name}: ${product.price} (Stock: {product.stock_quantity}) - {product.category}")
    
    print("\n✅ Products are ready for the POS system!")
    
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()