#!/usr/bin/env python
"""
Script to delete shop registration for re-registration.
This will remove the current shop configuration so you can register a new shop.
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
sys.path.append(os.path.dirname(__file__))
django.setup()

from core.models import ShopConfiguration

def delete_shop():
    """Delete the current shop registration"""
    try:
        shop = ShopConfiguration.objects.get()
        shop_name = shop.name
        shop_email = shop.email
        shop.delete()
        print(f"✅ Successfully deleted shop registration for '{shop_name}' ({shop_email})")
        print("You can now re-register your shop through the app.")
    except ShopConfiguration.DoesNotExist:
        print("❌ No shop registration found to delete.")
    except Exception as e:
        print(f"❌ Error deleting shop: {str(e)}")

if __name__ == '__main__':
    print("🗑️ Deleting shop registration...")
    delete_shop()