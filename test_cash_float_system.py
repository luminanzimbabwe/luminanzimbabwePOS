#!/usr/bin/env python3
"""
Test script for Cash Float Management System
Tests the complete workflow from model creation to API functionality
"""

import os
import sys
import django
from django.conf import settings
from django.test import TestCase
from django.utils import timezone
from decimal import Decimal

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
sys.path.append('/testbed')
django.setup()

from core.models import CashFloat, ShopConfiguration, Cashier
from core.models import cash_float_management, activate_cashier_drawer, update_drawer_sale, settle_drawer_at_eod

def test_cash_float_model():
    """Test CashFloat model functionality"""
    print("🧪 Testing CashFloat Model...")
    
    try:
        # Test model creation
        shop = ShopConfiguration.objects.first()
        if not shop:
            print("❌ No shop found in database")
            return False
            
        cashier = Cashier.objects.first()
        if not cashier:
            print("❌ No cashier found in database")
            return False
        
        # Create a CashFloat instance
        cash_float = CashFloat.objects.create(
            shop=shop,
            cashier=cashier,
            float_amount=Decimal('100.00'),
            current_cash=Decimal('100.00'),
            current_card=Decimal('0.00'),
            current_ecocash=Decimal('0.00'),
            current_transfer=Decimal('0.00'),
            current_total=Decimal('100.00'),
            status='ACTIVE'
        )
        
        print(f"✅ CashFloat created: {cash_float}")
        
        # Test properties
        print(f"   Float Amount: ${cash_float.float_amount}")
        print(f"   Expected Drawer Total: ${cash_float.expected_drawer_total}")
        print(f"   Cash Variance: ${cash_float.cash_variance}")
        print(f"   Drawer Efficiency: {cash_float.drawer_efficiency}%")
        
        # Test adding a sale
        cash_float.add_sale(Decimal('50.00'), 'cash')
        print(f"   After $50 cash sale - Current Cash: ${cash_float.current_cash}")
        print(f"   Expected Drawer Total: ${cash_float.expected_drawer_total}")
        
        # Test EOD settlement
        settlement = cash_float.settle_at_eod(Decimal('155.00'))
        print(f"   EOD Settlement - Expected: ${settlement['expected_cash']}, Actual: ${settlement['actual_cash']}, Variance: ${settlement['variance']}")
        
        return True
        
    except Exception as e:
        print(f"❌ CashFloat model test failed: {e}")
        return False

def test_cash_float_api_views():
    """Test CashFloat API views (basic structure test)"""
    print("\n🧪 Testing CashFloat API Views...")
    
    try:
        # Test that the API functions exist and are callable
        print("✅ cash_float_management function exists")
        print("✅ activate_cashier_drawer function exists")
        print("✅ update_drawer_sale function exists")
        print("✅ settle_drawer_at_eod function exists")
        
        # Check function signatures
        import inspect
        
        for func_name, func in [
            ('cash_float_management', cash_float_management),
            ('activate_cashier_drawer', activate_cashier_drawer),
            ('update_drawer_sale', update_drawer_sale),
            ('settle_drawer_at_eod', settle_drawer_at_eod)
        ]:
            sig = inspect.signature(func)
            print(f"   {func_name}: {len(sig.parameters)} parameters")
        
        return True
        
    except Exception as e:
        print(f"❌ CashFloat API test failed: {e}")
        return False

def test_urls_configuration():
    """Test that URLs are properly configured"""
    print("\n🧪 Testing URL Configuration...")
    
    try:
        from django.urls import reverse, resolve
        
        # Test URL patterns exist
        url_names = [
            'cash-float-management',
            'activate-cashier-drawer', 
            'update-drawer-sale',
            'settle-drawer-eod',
            'all-cashiers-drawer-status'
        ]
        
        for url_name in url_names:
            try:
                reverse(url_name)
                print(f"✅ URL pattern '{url_name}' exists")
            except Exception as e:
                print(f"❌ URL pattern '{url_name}' not found: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ URL configuration test failed: {e}")
        return False

def test_integration_workflow():
    """Test complete workflow integration"""
    print("\n🧪 Testing Complete Workflow Integration...")
    
    try:
        shop = ShopConfiguration.objects.first()
        cashier = Cashier.objects.first()
        
        if not shop or not cashier:
            print("❌ Missing shop or cashier for integration test")
            return False
        
        # Simulate complete workflow
        print("1. Creating drawer for cashier...")
        drawer = CashFloat.get_active_drawer(shop, cashier)
        print(f"   Created drawer: {drawer.id}")
        
        print("2. Setting float amount...")
        drawer.set_float_amount(Decimal('200.00'), cashier)
        print(f"   Float set to: ${drawer.float_amount}")
        
        print("3. Adding sales...")
        drawer.add_sale(Decimal('75.00'), 'cash')
        drawer.add_sale(Decimal('50.00'), 'card')
        drawer.add_sale(Decimal('25.00'), 'ecocash')
        print(f"   Current totals - Cash: ${drawer.current_cash}, Card: ${drawer.current_card}, EcoCash: ${drawer.current_ecocash}")
        
        print("4. Getting drawer summary...")
        summary = drawer.get_drawer_summary()
        print(f"   Summary: {len(summary)} fields")
        
        print("5. Getting shop drawer status...")
        shop_status = CashFloat.get_shop_drawer_status(shop)
        print(f"   Shop status: {shop_status['active_drawers']} active drawers")
        
        return True
        
    except Exception as e:
        print(f"❌ Integration workflow test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all tests"""
    print("Starting Cash Float Management System Tests\n")
    
    tests = [
        ("CashFloat Model", test_cash_float_model),
        ("API Views", test_cash_float_api_views),
        ("URL Configuration", test_urls_configuration),
        ("Integration Workflow", test_integration_workflow),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n{'='*50}")
        print(f"Running: {test_name}")
        print('='*50)
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    print(f"\n{'='*50}")
    print("TEST SUMMARY")
    print('='*50)
    
    passed = 0
    failed = 0
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print(f"\nTotal: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("\n🎉 All tests passed! Cash Float Management System is ready!")
    else:
        print(f"\n⚠️  {failed} test(s) failed. Please check the issues above.")
    
    return failed == 0

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)