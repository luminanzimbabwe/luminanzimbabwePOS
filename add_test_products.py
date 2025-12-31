#!/usr/bin/env python
import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from core.models import Product, ShopConfiguration

def add_test_products():
    """Add test products for POS system testing"""
    
    # Get or create a shop
    try:
        shop = ShopConfiguration.objects.get()
        print(f"Using existing shop: {shop.name}")
    except ShopConfiguration.DoesNotExist:
        print("No shop found, creating a test shop...")
        shop = ShopConfiguration.objects.create(
            name="Test POS Shop",
            email="test@posshop.com",
            phone="+263123456789",
            address="123 Test Street, Harare, Zimbabwe",
            register_id="001",
            password="testpass123"
        )
        print(f"Created shop: {shop.name}")
    
    # Define test products
    test_products = [
        # Fast Moving Items
        {
            'name': 'White Bread Loaf',
            'description': 'Fresh white bread loaf',
            'price': 1.10,
            'cost_price': 0.60,
            'category': 'Bakery',
            'line_code': 'BAK001',
            'stock_quantity': 50,
            'min_stock_level': 10,
            'supplier': 'Bakers Inn',
            'currency': 'USD'
        },
        {
            'name': 'Mazoe Orange Crush 2L',
            'description': 'Popular Zimbabwean orange juice drink',
            'price': 2.50,
            'cost_price': 1.80,
            'category': 'Beverages',
            'line_code': 'BEV001',
            'stock_quantity': 40,
            'min_stock_level': 8,
            'supplier': 'Mazoe',
            'currency': 'USD'
        },
        {
            'name': 'Sugar 1kg',
            'description': 'White granulated sugar',
            'price': 1.75,
            'cost_price': 1.20,
            'category': 'Dried Foods',
            'line_code': 'DF001',
            'stock_quantity': 100,
            'min_stock_level': 20,
            'supplier': 'Local Supplier',
            'currency': 'USD'
        },
        {
            'name': 'Cooking Oil 1L',
            'description': 'Sunflower cooking oil',
            'price': 4.50,
            'cost_price': 3.20,
            'category': 'Dried Foods',
            'line_code': 'DF002',
            'stock_quantity': 60,
            'min_stock_level': 12,
            'supplier': 'Local Supplier',
            'currency': 'USD'
        },
        {
            'name': 'Fresh Milk 2L',
            'description': 'Fresh full cream milk',
            'price': 2.75,
            'cost_price': 2.00,
            'category': 'Dairy',
            'line_code': 'DAI001',
            'stock_quantity': 35,
            'min_stock_level': 8,
            'supplier': 'Local Dairy',
            'currency': 'USD'
        },
        {
            'name': 'Eggs (Dozen)',
            'description': 'Fresh farm eggs',
            'price': 3.50,
            'cost_price': 2.50,
            'category': 'Dairy',
            'line_code': 'DAI002',
            'stock_quantity': 25,
            'min_stock_level': 6,
            'supplier': 'Local Farm',
            'currency': 'USD'
        },
        {
            'name': 'Bananas 1kg',
            'description': 'Fresh bananas',
            'price': 1.50,
            'cost_price': 0.80,
            'category': 'Fresh Produce',
            'line_code': 'FP001',
            'stock_quantity': 80,
            'min_stock_level': 15,
            'supplier': 'Local Farm',
            'currency': 'USD'
        },
        {
            'name': 'Tomatoes 1kg',
            'description': 'Fresh tomatoes',
            'price': 1.75,
            'cost_price': 1.00,
            'category': 'Fresh Produce',
            'line_code': 'FP002',
            'stock_quantity': 45,
            'min_stock_level': 10,
            'supplier': 'Local Farm',
            'currency': 'USD'
        },
        {
            'name': 'Chicken Pieces 1kg',
            'description': 'Fresh chicken pieces',
            'price': 8.50,
            'cost_price': 6.50,
            'category': 'Meat',
            'line_code': 'MEA001',
            'stock_quantity': 20,
            'min_stock_level': 5,
            'supplier': 'Local Butcher',
            'currency': 'USD'
        },
        {
            'name': 'Baked Beans 410g',
            'description': 'Canned baked beans',
            'price': 2.75,
            'cost_price': 1.90,
            'category': 'Dried Foods',
            'line_code': 'DF003',
            'stock_quantity': 60,
            'min_stock_level': 12,
            'supplier': 'Local Supplier',
            'currency': 'USD'
        },
        {
            'name': 'Bonaqua Water 500ml',
            'description': 'Purified water bottle',
            'price': 0.75,
            'cost_price': 0.40,
            'category': 'Beverages',
            'line_code': 'BEV002',
            'stock_quantity': 200,
            'min_stock_level': 40,
            'supplier': 'Bonaqua',
            'currency': 'USD'
        },
        {
            'name': 'Instant Noodles (6 pack)',
            'description': 'Instant noodles with seasoning',
            'price': 3.50,
            'cost_price': 2.30,
            'category': 'Dried Foods',
            'line_code': 'DF004',
            'stock_quantity': 75,
            'min_stock_level': 15,
            'supplier': 'Local Supplier',
            'currency': 'USD'
        },
        {
            'name': 'Potato Chips 150g',
            'description': 'Crispy potato chips',
            'price': 3.50,
            'cost_price': 2.20,
            'category': 'Snacks',
            'line_code': 'SNK001',
            'stock_quantity': 100,
            'min_stock_level': 20,
            'supplier': 'Local Supplier',
            'currency': 'USD'
        },
        {
            'name': 'Toothpaste 150g',
            'description': 'Fluoride toothpaste',
            'price': 2.75,
            'cost_price': 1.80,
            'category': 'Personal Care',
            'line_code': 'PC001',
            'stock_quantity': 40,
            'min_stock_level': 8,
            'supplier': 'Local Supplier',
            'currency': 'USD'
        },
        {
            'name': 'Soap Bar',
            'description': 'Bath soap bar',
            'price': 1.50,
            'cost_price': 0.90,
            'category': 'Personal Care',
            'line_code': 'PC002',
            'stock_quantity': 60,
            'min_stock_level': 12,
            'supplier': 'Local Supplier',
            'currency': 'USD'
        }
    ]
    
    created_count = 0
    skipped_count = 0
    
    for product_data in test_products:
        try:
            # Check if product already exists
            if Product.objects.filter(shop=shop, line_code=product_data['line_code']).exists():
                print(f"Skipped (already exists): {product_data['name']}")
                skipped_count += 1
            else:
                # Create the product
                product = Product.objects.create(shop=shop, **product_data)
                print(f"Created: {product.name} - ${product.price} (Stock: {product.stock_quantity})")
                created_count += 1
        except Exception as e:
            print(f"Error creating {product_data['name']}: {e}")
    
    print(f"\n=== PRODUCT ADDITION COMPLETE ===")
    print(f"✅ Successfully created: {created_count} products")
    print(f"⏭️  Skipped (already exists): {skipped_count} products")
    print(f"📊 Total products in database: {Product.objects.filter(shop=shop).count()}")
    
    # Show summary by category
    categories = Product.objects.filter(shop=shop).values('category').distinct()
    print(f"\n📋 Product Categories:")
    for category in categories:
        count = Product.objects.filter(shop=shop, category=category['category']).count()
        print(f"  - {category['category']}: {count} products")

if __name__ == '__main__':
    add_test_products()