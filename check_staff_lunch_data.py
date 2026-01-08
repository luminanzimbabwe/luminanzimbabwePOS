#!/usr/bin/env python
import os
import sys
import django

# Add the project directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from core.models import StaffLunch, Product, Cashier

print('=== STAFF LUNCH RECORDS ANALYSIS ===')

# Get all staff lunch records
staff_lunches = StaffLunch.objects.all().order_by('-created_at')[:10]

print(f'Total Staff Lunch records: {StaffLunch.objects.count()}')

for i, sl in enumerate(staff_lunches):
    print(f'\n--- Record {i+1} (ID: {sl.id}) ---')
    print(f'Created: {sl.created_at}')
    
    # Check product
    if sl.product:
        print(f'Product: {sl.product.name} (ID: {sl.product_id})')
    else:
        print(f'Product: NULL (product_id: {sl.product_id})')
    
    # Check recorded_by
    if sl.recorded_by:
        print(f'Recorded By: {sl.recorded_by.name} (ID: {sl.recorded_by_id})')
    else:
        print(f'Recorded By: NULL (recorded_by_id: {sl.recorded_by_id})')
    
    print(f'Quantity: {sl.quantity}')
    print(f'Total Cost: {sl.total_cost}')
    print(f'Notes: {sl.notes}')

print('\n=== CHECKING PRODUCTS ===')
products = Product.objects.all()[:5]
print(f'Total Products: {Product.objects.count()}')
for product in products:
    print(f'Product: {product.name} (ID: {product.id})')

print('\n=== CHECKING CASHIERS ===')
cashiers = Cashier.objects.all()[:5]
print(f'Total Cashiers: {Cashier.objects.count()}')
for cashier in cashiers:
    print(f'Cashier: {cashier.name} (ID: {cashier.id})')