#!/usr/bin/env python
"""
Test script to verify shop_day functionality for sales.
This ensures that sales are properly linked to shop days.
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from decimal import Decimal
from django.utils import timezone
from core.models import ShopConfiguration, Cashier, Product, Sale, ShopDay

def test_shop_day_sale_linking():
    """Test that sales are automatically linked to shop days"""
    print("=" * 60)
    print("Testing Shop Day Sale Linking")
    print("=" * 60)
    
    # Get or create shop
    try:
        shop = ShopConfiguration.objects.get()
        print(f"[OK] Shop found: {shop.name}")
    except ShopConfiguration.DoesNotExist:
        print("[ERROR] No shop found. Please set up a shop first.")
        return False
    
    # Create or get current shop day
    today = timezone.now().date()
    shop_day, created = ShopDay.objects.get_or_create(
        shop=shop,
        date=today,
        defaults={'status': 'OPEN'}
    )
    if created:
        print(f"[OK] Created new ShopDay for {today}")
    else:
        print(f"[OK] Found existing ShopDay for {today} (status: {shop_day.status})")
    
    # Get or create a cashier
    cashier, _ = Cashier.objects.get_or_create(
        shop=shop,
        name="Test Cashier",
        defaults={
            'email': 'test@example.com',
            'password': 'test123',
            'status': 'active'
        }
    )
    print(f"[OK] Cashier: {cashier.name}")
    
    # Get or create a product
    product, _ = Product.objects.get_or_create(
        shop=shop,
        name="Test Product",
        line_code="TEST001",
        defaults={
            'price': Decimal('10.00'),
            'cost_price': Decimal('5.00'),
            'stock_quantity': Decimal('100'),
            'category': 'Test',
            'currency': 'USD'
        }
    )
    print(f"[OK] Product: {product.name} (${product.price})")
    
    # Create a test sale
    print("\n--- Creating Test Sale ---")
    sale = Sale(
        shop=shop,
        cashier=cashier,
        total_amount=Decimal('50.00'),
        currency='USD',
        payment_currency='USD',
        payment_method='cash',
        status='completed'
    )
    
    # Before save - shop_day should be None
    print(f"Before save: sale.shop_day = {sale.shop_day}")
    
    # Save the sale - this should auto-set shop_day
    sale.save()
    
    # After save - shop_day should be set
    print(f"After save: sale.shop_day = {sale.shop_day}")
    
    if sale.shop_day:
        print(f"[OK] Sale successfully linked to ShopDay ID: {sale.shop_day.id} (date: {sale.shop_day.date})")
    else:
        print("[ERROR] WARNING: Sale.shop_day is still None after save!")
        print("  This means the auto-linking in Sale.save() might not be working.")
        return False
    
    # Verify the sale appears in shop_day.sales
    sale_count = shop_day.sales.count()
    print(f"[OK] ShopDay now has {sale_count} sale(s)")
    
    # Clean up test data
    sale.delete()
    print("\n[OK] Test sale deleted")
    
    print("\n" + "=" * 60)
    print("Test Completed Successfully!")
    print("=" * 60)
    return True

if __name__ == "__main__":
    try:
        success = test_shop_day_sale_linking()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n[ERROR] Error during test: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
