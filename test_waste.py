#!/usr/bin/env python
import os
import sys
import django

# Add the project directory to Python path
sys.path.append('c:/Users/HomePC4r/Desktop/luminanzimbabwePOS')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from core.models import ShopConfiguration, Waste, Product
from core.waste_views import WasteListView, WasteProductSearchView, WasteSummaryView
from django.test import RequestFactory
import json

print("Testing waste views...")

# Create a request factory
factory = RequestFactory()

# Test the search endpoint
print("\n1. Testing WasteProductSearchView...")
request = factory.post('/api/v1/shop/wastes/search/', 
                      data=json.dumps({'identifier': '12345678'}),
                      content_type='application/json')

view = WasteProductSearchView()
try:
    response = view.post(request)
    print(f"Response status: {response.status_code}")
    # JsonResponse returns content directly, not in .data attribute
    if hasattr(response, 'content'):
        import json
        content = response.content.decode('utf-8')
        print(f"Response content: {content}")
    else:
        print(f"Response: {response}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

print("\n3. Testing WasteSummaryView...")
request = factory.get('/api/v1/shop/wastes/summary/')

view = WasteSummaryView()
try:
    response = view.get(request)
    print(f"Response status: {response.status_code}")
    # JsonResponse returns content directly, not in .data attribute
    if hasattr(response, 'content'):
        import json
        content = response.content.decode('utf-8')
        print(f"Response content: {content}")
    else:
        print(f"Response: {response}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()