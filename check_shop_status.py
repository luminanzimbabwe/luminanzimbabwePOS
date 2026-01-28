#!/usr/bin/env python
"""
Check and fix shop status - ensure shop day is open
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminanzimbabwePOS.settings')
sys.path.append('.')
django.setup()

from core.models import ShopConfiguration, ShopDay
from django.utils import timezone

def main():
    try:
        shop = ShopConfiguration.objects.get()
        today = timezone.now().date()

        print(f"Checking shop status for {shop.name} on {today}")

        # Check if shop day exists for today
        try:
            shop_day = ShopDay.objects.get(shop=shop, date=today)
            print(f'✓ Shop day exists: {shop_day.date}, Status: {shop_day.status}')
            if shop_day.status == 'CLOSED':
                print('⚠️  Shop day is CLOSED - opening it...')
                shop_day.open_shop()
                print('✅ Shop day opened successfully!')
            else:
                print('✅ Shop day is already OPEN')
        except ShopDay.DoesNotExist:
            print('❌ No shop day exists for today - creating and opening...')
            shop_day = ShopDay.objects.create(shop=shop, date=today, status='OPEN')
            print('✅ New shop day created and opened!')

        # Verify final status
        shop_day.refresh_from_db()
        print(f'📊 Final shop day status: {shop_day.status}')
        print(f'🟢 Shop is open: {shop_day.is_open}')

        if shop_day.is_open:
            print('🎉 SUCCESS: Shop is now active!')
        else:
            print('❌ FAILED: Shop is still closed')

    except ShopConfiguration.DoesNotExist:
        print('❌ ERROR: No shop configuration found')
    except Exception as e:
        print(f'❌ ERROR: {e}')

if __name__ == '__main__':
    main()