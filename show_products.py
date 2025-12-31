#!/usr/bin/env python
import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from core.models import Product, ShopConfiguration
from django.db.models import F

def show_products():
    """Show all products in the system"""
    
    try:
        shop = ShopConfiguration.objects.get()
        print(f"Shop: {shop.name}")
        print("=" * 50)
        
        products = Product.objects.filter(shop=shop).order_by('category', 'name')
        
        if products.count() == 0:
            print("No products found in the system.")
            return
        
        print(f"Total products: {products.count()}")
        print()
        
        current_category = ""
        for product in products:
            if product.category != current_category:
                current_category = product.category
                print(f"\n--- {current_category.upper()} ---")
            
            print(f"{product.line_code:8} | {product.name:25} | ${product.price:6.2f} | Stock: {product.stock_quantity:3} | Min: {product.min_stock_level:2}")
        
        print("\n" + "=" * 50)
        
        # Show stock status
        low_stock = products.filter(stock_quantity__lte=models.F('min_stock_level'))
        print(f"Low stock items: {low_stock.count()}")
        
        # Show categories summary
        categories = products.values('category').distinct()
        print(f"Categories: {categories.count()}")
        for cat in categories:
            count = products.filter(category=cat['category']).count()
            print(f"  - {cat['category']}: {count} products")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    show_products()