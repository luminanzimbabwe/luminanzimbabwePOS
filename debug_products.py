#!/usr/bin/env python3
"""
Debug script to check product data and API endpoints
"""
import os
import sys
import django

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from core.models import ShopConfiguration, Product
from core.serializers import ProductSerializer

def debug_products():
    print("DEBUGGING PRODUCT LOADING...")
    print("=" * 50)
    
    try:
        # Check if shop exists
        shop = ShopConfiguration.objects.get()
        print(f"Shop found: {shop.name}")
        print(f"   Email: {shop.email}")
        print(f"   ID: {shop.id}")
        print()
        
        # Check products count
        products = Product.objects.filter(shop=shop)
        product_count = products.count()
        print(f"Products count: {product_count}")
        
        if product_count == 0:
            print("NO PRODUCTS FOUND!")
            print("   This explains why the stock take screen shows no products.")
            print("   You need to add some products first.")
        else:
            print(f"Found {product_count} products:")
            print("-" * 30)
            
            # Show first few products
            for i, product in enumerate(products[:5]):
                print(f"   {i+1}. {product.name}")
                print(f"      ID: {product.id}")
                print(f"      Stock: {product.stock_quantity}")
                print(f"      Price: ${product.price}")
                print(f"      Category: {product.category}")
                print()
            
            if product_count > 5:
                print(f"   ... and {product_count - 5} more products")
                print()
            
            # Test serializer
            print("Testing ProductSerializer...")
            try:
                serializer = ProductSerializer(products, many=True)
                serialized_data = serializer.data
                print(f"Serializer works! Generated {len(serialized_data)} product records")
                
                # Show first product structure
                if serialized_data:
                    print("First product structure:")
                    first_product = serialized_data[0]
                    for key, value in first_product.items():
                        print(f"   {key}: {value}")
                    print()
                
            except Exception as e:
                print(f"Serializer error: {e}")
                import traceback
                traceback.print_exc()
                
    except ShopConfiguration.DoesNotExist:
        print("NO SHOP FOUND!")
        print("   Please register your shop first.")
        
    except Exception as e:
        print(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_products()