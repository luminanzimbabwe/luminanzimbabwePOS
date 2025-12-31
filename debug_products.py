#!/usr/bin/env python3

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from core.models import Product, ShopConfiguration
from django.db import models

def debug_products():
    try:
        shop = ShopConfiguration.objects.get()
        print(f"Found shop: {shop.name}")
        
        products = Product.objects.filter(shop=shop).order_by('-created_at')[:20]
        print(f"Total products: {products.count()}")
        
        print("\nRecent products:")
        for p in products:
            barcode_status = "No Barcode" if not p.barcode or p.barcode.strip() == "" else f"Has Barcode: {p.barcode}"
            print(f"ID: {p.id}")
            print(f"  Name: {p.name}")
            print(f"  Line Code: {p.line_code}")
            print(f"  Barcode: {barcode_status}")
            print(f"  Stock: {p.stock_quantity}")
            print(f"  Created: {p.created_at}")
            print()
        
        # Check for split products specifically
        print("\n=== SPLIT PRODUCT ANALYSIS ===")
        split_products = products.filter(
            models.Q(name__icontains='half') |
            models.Q(name__icontains='quarter') |
            models.Q(name__icontains='small') |
            models.Q(name__icontains='mini')
        )
        print(f"Products with split-related names: {split_products.count()}")
        
        no_barcode_products = products.filter(
            models.Q(barcode__isnull=True) |
            models.Q(barcode__exact='') |
            models.Q(barcode__strip__exact='')
        )
        print(f"Products with no barcode: {no_barcode_products.count()}")
        
        # Combined filter like in HalfProductsScreen
        split_criteria = products.filter(
            models.Q(name__icontains='half') |
            models.Q(name__icontains='quarter') |
            models.Q(name__icontains='small') |
            models.Q(name__icontains='mini')
        )
        
        no_barcode_criteria = products.filter(
            models.Q(barcode__isnull=True) |
            models.Q(barcode__exact='') |
            models.Q(barcode__strip__exact='')
        )
        
        all_split_products = split_criteria | no_barcode_criteria
        print(f"Total split products (combined criteria): {all_split_products.count()}")
        
        if all_split_products.exists():
            print("\nSplit products found:")
            for p in all_split_products:
                print(f"  - {p.name} (Barcode: {p.barcode or 'None'})")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_products()