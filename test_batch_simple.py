#!/usr/bin/env python
import os
import sys
import django
import json
from django.test import Client

# Add the project directory to Python path
sys.path.append('c:/Users/HomePC4r/Desktop/luminanzimbabwePOS')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from core.models import ShopConfiguration, Product

print("Testing batch wastages - Complete Flow")

shop = ShopConfiguration.objects.first()
if not shop:
    print("No shop found")
    exit(1)

products = Product.objects.filter(shop=shop)[:2]
if not products:
    print("No products found")
    exit(1)

client = Client()

print(f"Available products:")
for p in products:
    print(f"  - {p.name} (Stock: {p.stock_quantity})")

print("\n1. Creating waste batch...")
response = client.post(
    '/api/v1/shop/waste-batches/',
    data=json.dumps({"reason": "EXPIRED", "reason_details": "Test batch"}),
    content_type='application/json',
    HTTP_X_Shop_ID=str(shop.id)
)

print(f"Status: {response.status_code}")
if response.status_code == 201:
    data = json.loads(response.content.decode('utf-8'))
    batch_id = data['batch']['id']
    batch_number = data['batch']['batch_number']
    print(f"SUCCESS: Batch {batch_number} created (ID: {batch_id})")
    
    print("\n2. Adding waste items to batch...")
    for i, product in enumerate(products):
        print(f"  Adding {product.name}...")
        response = client.post(
            f'/api/v1/shop/waste-batches/{batch_id}/',
            data=json.dumps({
                "identifier": product.line_code,
                "quantity": 1,
                "specific_reason": "EXPIRED"
            }),
            content_type='application/json',
            HTTP_X_Shop_ID=str(shop.id)
        )
        print(f"    Status: {response.status_code}")
        if response.status_code == 201:
            print(f"    SUCCESS: Added {product.name}")
        else:
            print(f"    ERROR: {response.content.decode('utf-8')}")
    
    print("\n3. Completing batch...")
    response = client.patch(
        f'/api/v1/shop/waste-batches/{batch_id}/',
        data=json.dumps({"action": "complete"}),
        content_type='application/json',
        HTTP_X_Shop_ID=str(shop.id)
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print("SUCCESS: Batch completed")
    else:
        print(f"ERROR: {response.content.decode('utf-8')}")
    
    print("\n4. Getting batch details...")
    response = client.get(
        f'/api/v1/shop/waste-batches/{batch_id}/',
        HTTP_X_Shop_ID=str(shop.id)
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = json.loads(response.content.decode('utf-8'))
        batch = data['batch']
        print(f"SUCCESS: Batch {batch['batch_number']}")
        print(f"  Items: {batch['item_count']}")
        print(f"  Total Value: ${batch['total_waste_value']}")
        print(f"  Status: {batch['status']}")
    
    print("\n5. Listing all batches...")
    response = client.get(
        '/api/v1/shop/waste-batches/',
        HTTP_X_Shop_ID=str(shop.id)
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = json.loads(response.content.decode('utf-8'))
        print(f"SUCCESS: Found {len(data['batches'])} batches")
        for batch in data['batches']:
            print(f"  - {batch['batch_number']} ({batch['status']}) - ${batch['total_waste_value']}")

else:
    print(f"ERROR: {response.content.decode('utf-8')}")

print("\nTest completed!")