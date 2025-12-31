#!/usr/bin/env python
import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from core.models import Product, ShopConfiguration
from django.db.models import F

def test_pos_products():
    """Test POS system with the new products"""
    
    print("🧪 TESTING POS SYSTEM WITH NEW PRODUCTS")
    print("=" * 50)
    
    try:
        shop = ShopConfiguration.objects.get()
        products = Product.objects.filter(shop=shop)
        
        print(f"✅ Shop: {shop.name}")
        print(f"✅ Total Products: {products.count()}")
        
        # Test product search
        print("\n🔍 TESTING PRODUCT SEARCH:")
        
        # Find by line code
        try:
            product = Product.objects.get(shop=shop, line_code='BAK001')
            print(f"✅ Found by line code BAK001: {product.name} - ${product.price}")
        except Product.DoesNotExist:
            print("❌ Product BAK001 not found")
        
        # Find by category
        bakery_products = products.filter(category='Bakery')
        print(f"✅ Bakery products: {bakery_products.count()}")
        
        # Test stock management
        print("\n📊 STOCK STATUS:")
        for product in products[:5]:  # Show first 5 products
            status = "LOW" if product.stock_quantity <= product.min_stock_level else "OK"
            print(f"  {product.name}: {product.stock_quantity} units ({status})")
        
        # Test price calculations
        print("\n💰 PRICE TEST:")
        bread = Product.objects.get(shop=shop, line_code='BAK001')
        milk = Product.objects.get(shop=shop, line_code='DAI001')
        
        test_order = [
            (bread, 2),  # 2 bread loaves
            (milk, 1),   # 1 milk
        ]
        
        total = 0
        print("Sample Order:")
        for product, quantity in test_order:
            subtotal = product.price * quantity
            total += subtotal
            print(f"  {product.name} x{quantity} = ${subtotal:.2f}")
        
        print(f"Total: ${total:.2f}")
        
        # Test low stock alerts
        print("\n⚠️  LOW STOCK ALERTS:")
        low_stock_products = products.filter(stock_quantity__lte=models.F('min_stock_level'))
        if low_stock_products.exists():
            for product in low_stock_products:
                print(f"  🚨 {product.name}: {product.stock_quantity} (min: {product.min_stock_level})")
        else:
            print("  ✅ No low stock items")
        
        print("\n🎯 POS SYSTEM READY!")
        print("Your products are ready for testing the POS system.")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_pos_products()