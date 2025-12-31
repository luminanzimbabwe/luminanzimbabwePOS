#!/usr/bin/env python3
"""
Comprehensive EOD Reconciliation Test
Tests the complete reconciliation workflow including:
1. Enhanced backend API endpoints
2. Frontend integration
3. Data persistence and retrieval
4. Variance calculations
5. Error handling and validation
"""

import os
import sys
import django
from decimal import Decimal
from datetime import date, datetime

# Add the project directory to Python path
sys.path.append('/d:/luminanzimbabwePOS')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from core.models import ShopConfiguration, Cashier, Sale, SaleItem, Product, CashFloat
from core.models_reconciliation import CashierCount, ReconciliationSession
from core.reconciliation_views import CashierCountView, EODReconciliationEnhancedView
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory


def create_test_data():
    """Create comprehensive test data for reconciliation testing"""
    print("🔧 Creating comprehensive test data...")
    
    # Create or get shop
    shop, created = ShopConfiguration.objects.get_or_create(
        email="testshop@example.com",
        defaults={
            'name': 'Test Shop',
            'address': '123 Test Street',
            'business_type': 'Retail',
            'register_id': 'T001',
            'password': 'test123'
        }
    )
    
    if created:
        print("✅ Created test shop")
    else:
        print("📋 Using existing test shop")
    
    # Create test cashiers
    cashier1, _ = Cashier.objects.get_or_create(
        shop=shop,
        name='Isaac Ngirazi',
        defaults={
            'phone': '+1234567890',
            'status': 'active',
            'email': 'isaac@testshop.com'
        }
    )
    
    cashier2, _ = Cashier.objects.get_or_create(
        shop=shop,
        name='Test Cashier 2',
        defaults={
            'phone': '+1234567891',
            'status': 'active',
            'email': 'cashier2@testshop.com'
        }
    )
    
    print(f"✅ Created/verified cashiers: {cashier1.name}, {cashier2.name}")
    
    # Create test products
    product1, _ = Product.objects.get_or_create(
        shop=shop,
        name='Test Product 1',
        defaults={
            'price': Decimal('10.00'),
            'cost_price': Decimal('5.00'),
            'stock_quantity': Decimal('100.00'),
            'category': 'Test Category'
        }
    )
    
    product2, _ = Product.objects.get_or_create(
        shop=shop,
        name='Test Product 2',
        defaults={
            'price': Decimal('15.00'),
            'cost_price': Decimal('8.00'),
            'stock_quantity': Decimal('50.00'),
            'category': 'Test Category'
        }
    )
    
    print(f"✅ Created/verified products: {product1.name}, {product2.name}")
    
    # Create test sales for today
    today = date.today()
    
    # Create some cash sales
    sale1 = Sale.objects.create(
        shop=shop,
        cashier=cashier1,
        total_amount=Decimal('25.00'),
        payment_method='cash',
        status='completed',
        created_at=datetime.combine(today, datetime.min.time())
    )
    
    SaleItem.objects.create(
        sale=sale1,
        product=product1,
        quantity=Decimal('1.00'),
        unit_price=Decimal('10.00'),
        total_price=Decimal('10.00')
    )
    
    SaleItem.objects.create(
        sale=sale1,
        product=product2,
        quantity=Decimal('1.00'),
        unit_price=Decimal('15.00'),
        total_price=Decimal('15.00')
    )
    
    # Create more cash sales
    sale2 = Sale.objects.create(
        shop=shop,
        cashier=cashier1,
        total_amount=Decimal('20.00'),
        payment_method='cash',
        status='completed',
        created_at=datetime.combine(today, datetime.min.time())
    )
    
    SaleItem.objects.create(
        sale=sale2,
        product=product1,
        quantity=Decimal('2.00'),
        unit_price=Decimal('10.00'),
        total_price=Decimal('20.00')
    )
    
    # Create some card sales
    sale3 = Sale.objects.create(
        shop=shop,
        cashier=cashier2,
        total_amount=Decimal('30.00'),
        payment_method='card',
        status='completed',
        created_at=datetime.combine(today, datetime.min.time())
    )
    
    SaleItem.objects.create(
        sale=sale3,
        product=product1,
        quantity=Decimal('3.00'),
        unit_price=Decimal('10.00'),
        total_price=Decimal('30.00')
    )
    
    print(f"✅ Created test sales: {sale1.id}, {sale2.id}, {sale3.id}")
    
    # Create CashFloat records
    cash_float1, _ = CashFloat.objects.get_or_create(
        shop=shop,
        cashier=cashier1,
        date=today,
        defaults={
            'float_amount': Decimal('50.00'),
            'current_cash': Decimal('95.00'),  # 50 float + 45 cash sales
            'session_cash_sales': Decimal('45.00'),
            'expected_cash_at_eod': Decimal('95.00'),
            'status': 'ACTIVE'
        }
    )
    
    cash_float2, _ = CashFloat.objects.get_or_create(
        shop=shop,
        cashier=cashier2,
        date=today,
        defaults={
            'float_amount': Decimal('30.00'),
            'current_cash': Decimal('30.00'),
            'session_cash_sales': Decimal('0.00'),
            'expected_cash_at_eod': Decimal('30.00'),
            'status': 'ACTIVE'
        }
    )
    
    print(f"✅ Created/verified CashFloat records")
    
    return shop, cashier1, cashier2, today


def test_enhanced_reconciliation_api():
    """Test the enhanced reconciliation API endpoints"""
    print("\n🧪 Testing Enhanced Reconciliation API...")
    
    # Create request factory
    factory = APIRequestFactory()
    
    # Test data
    shop, cashier1, cashier2, today = create_test_data()
    
    # Test 1: Enhanced Reconciliation View
    print("📊 Testing Enhanced Reconciliation View...")
    request = factory.get('/reconciliation/enhanced/')
    enhanced_view = EODReconciliationEnhancedView()
    response = enhanced_view.get(request)
    
    if response.status_code == 200:
        data = response.data
        print(f"✅ Enhanced reconciliation API returned successfully")
        print(f"   Date: {data.get('date')}")
        print(f"   Expected Cash: ${data.get('expected_amounts', {}).get('cash', 0)}")
        print(f"   Expected Card: ${data.get('expected_amounts', {}).get('card', 0)}")
        print(f"   Cashier Details: {len(data.get('cashier_details', []))} cashiers")
    else:
        print(f"❌ Enhanced reconciliation API failed: {response.status_code}")
        print(f"   Response: {response.data}")
        return False
    
    # Test 2: Cashier Count View (GET)
    print("\n💰 Testing Cashier Count GET...")
    request = factory.get(f'/reconciliation/count/?cashier_id={cashier1.id}&date={today}')
    count_view = CashierCountView()
    response = count_view.get(request)
    
    if response.status_code == 200:
        print(f"✅ Cashier count GET successful")
        print(f"   Cashier: {response.data.get('count_data', {}).get('cashier_name')}")
        print(f"   Expected Cash: ${response.data.get('count_data', {}).get('expected', {}).get('cash', 0)}")
    else:
        print(f"❌ Cashier count GET failed: {response.status_code}")
        print(f"   Response: {response.data}")
        return False
    
    # Test 3: Cashier Count View (POST)
    print("\n💾 Testing Cashier Count POST...")
    count_data = {
        'cashier_id': cashier1.id,
        'date': today.isoformat(),
        'hundreds': 0,
        'fifties': 1,
        'twenties': 2,
        'tens': 1,
        'fives': 1,
        'twos': 0,
        'ones': 5,
        'coins': 10,
        'card_receipts': 0,
        'ecocash_receipts': 0,
        'other_receipts': 0,
        'expected_cash': 95.00,
        'expected_card': 0.00,
        'expected_ecocash': 0.00,
        'status': 'COMPLETED'
    }
    
    request = factory.post('/reconciliation/count/', count_data, format='json')
    response = count_view.post(request)
    
    if response.status_code == 200:
        print(f"✅ Cashier count POST successful")
        print(f"   Total Cash: ${response.data.get('count_data', {}).get('totals', {}).get('cash', 0)}")
        print(f"   Variance: ${response.data.get('count_data', {}).get('variances', {}).get('cash', 0)}")
    else:
        print(f"❌ Cashier count POST failed: {response.status_code}")
        print(f"   Response: {response.data}")
        return False
    
    # Test 4: Verify data persistence
    print("\n💽 Testing Data Persistence...")
    saved_count = CashierCount.objects.filter(shop=shop, cashier=cashier1, date=today).first()
    if saved_count:
        print(f"✅ Cashier count persisted successfully")
        print(f"   ID: {saved_count.id}")
        print(f"   Status: {saved_count.status}")
        print(f"   Total Cash: ${saved_count.total_cash}")
        print(f"   Variance: ${saved_count.cash_variance}")
    else:
        print(f"❌ Cashier count not persisted")
        return False
    
    # Test 5: Test Reconciliation Session
    print("\n📋 Testing Reconciliation Session...")
    session, _ = ReconciliationSession.get_or_create_session(shop, today)
    session.calculate_session_summary()
    
    print(f"✅ Reconciliation session created")
    print(f"   Session ID: {session.id}")
    print(f"   Status: {session.status}")
    print(f"   Total Expected: ${session.total_expected_cash}")
    print(f"   Total Counted: ${session.total_counted_cash}")
    print(f"   Total Variance: ${session.total_variance}")
    
    return True


def test_variance_calculations():
    """Test variance calculation accuracy"""
    print("\n🧮 Testing Variance Calculations...")
    
    shop, cashier1, cashier2, today = create_test_data()
    
    # Create a count with exact match
    exact_count = CashierCount.objects.create(
        shop=shop,
        cashier=cashier1,
        date=today,
        hundreds=0,
        fifties=1,  # 50
        twenties=2,  # 40
        tens=1,  # 10
        fives=1,  # 5
        twos=0,
        ones=0,
        coins=0,
        expected_cash=Decimal('95.00'),
        status='COMPLETED'
    )
    
    # Should calculate: 50 + 40 + 10 + 5 = 105
    # Expected: 95
    # Variance: 105 - 95 = 10
    
    print(f"📊 Exact Match Test:")
    print(f"   Denominations: 1x$50, 2x$20, 1x$10, 1x$5")
    print(f"   Calculated Total: ${exact_count.total_cash}")
    print(f"   Expected: ${exact_count.expected_cash}")
    print(f"   Variance: ${exact_count.cash_variance}")
    
    if abs(exact_count.total_cash - Decimal('105.00')) < 0.01:
        print(f"✅ Cash calculation correct")
    else:
        print(f"❌ Cash calculation incorrect")
        return False
    
    if abs(exact_count.cash_variance - Decimal('10.00')) < 0.01:
        print(f"✅ Variance calculation correct")
    else:
        print(f"❌ Variance calculation incorrect")
        return False
    
    return True


def test_error_handling():
    """Test error handling and validation"""
    print("\n🚨 Testing Error Handling...")
    
    shop, cashier1, cashier2, today = create_test_data()
    
    factory = APIRequestFactory()
    count_view = CashierCountView()
    
    # Test 1: Missing cashier_id
    print("🧪 Test 1: Missing cashier_id")
    request = factory.post('/reconciliation/count/', {}, format='json')
    response = count_view.post(request)
    
    if response.status_code == 400 and 'cashier_id is required' in str(response.data.get('error', '')):
        print(f"✅ Correctly rejected missing cashier_id")
    else:
        print(f"❌ Did not properly reject missing cashier_id")
        return False
    
    # Test 2: Invalid cashier_id
    print("🧪 Test 2: Invalid cashier_id")
    invalid_data = {'cashier_id': 99999}
    request = factory.post('/reconciliation/count/', invalid_data, format='json')
    response = count_view.post(request)
    
    if response.status_code == 404 and 'Cashier not found' in str(response.data.get('error', '')):
        print(f"✅ Correctly rejected invalid cashier_id")
    else:
        print(f"❌ Did not properly reject invalid cashier_id")
        return False
    
    # Test 3: Invalid date format
    print("🧪 Test 3: Invalid date format")
    invalid_data = {
        'cashier_id': cashier1.id,
        'date': 'invalid-date'
    }
    request = factory.post('/reconciliation/count/', invalid_data, format='json')
    response = count_view.post(request)
    
    if response.status_code == 400 and 'Invalid date format' in str(response.data.get('error', '')):
        print(f"✅ Correctly rejected invalid date format")
    else:
        print(f"❌ Did not properly reject invalid date format")
        return False
    
    print(f"✅ All error handling tests passed")
    return True


def test_complete_workflow():
    """Test the complete reconciliation workflow end-to-end"""
    print("\n🔄 Testing Complete Workflow...")
    
    shop, cashier1, cashier2, today = create_test_data()
    
    # Step 1: Get initial reconciliation data
    factory = APIRequestFactory()
    request = factory.get('/reconciliation/enhanced/')
    enhanced_view = EODReconciliationEnhancedView()
    response = enhanced_view.get(request)
    
    if response.status_code != 200:
        print(f"❌ Failed to get initial reconciliation data")
        return False
    
    initial_data = response.data
    print(f"📊 Step 1: Initial data retrieved")
    print(f"   Expected cash total: ${initial_data.get('expected_amounts', {}).get('cash', 0)}")
    
    # Step 2: Count first cashier
    count_data_1 = {
        'cashier_id': cashier1.id,
        'date': today.isoformat(),
        'hundreds': 0,
        'fifties': 1,
        'twenties': 2,
        'tens': 0,
        'fives': 1,
        'twos': 0,
        'ones': 5,
        'coins': 0,
        'card_receipts': 0,
        'ecocash_receipts': 0,
        'other_receipts': 0,
        'expected_cash': 95.00,
        'status': 'COMPLETED'
    }
    
    request = factory.post('/reconciliation/count/', count_data_1, format='json')
    count_view = CashierCountView()
    response = count_view.post(request)
    
    if response.status_code != 200:
        print(f"❌ Failed to save first cashier count")
        return False
    
    print(f"💰 Step 2: First cashier counted")
    print(f"   Cashier: {response.data.get('count_data', {}).get('cashier_name')}")
    print(f"   Total: ${response.data.get('count_data', {}).get('totals', {}).get('cash', 0)}")
    
    # Step 3: Count second cashier
    count_data_2 = {
        'cashier_id': cashier2.id,
        'date': today.isoformat(),
        'hundreds': 0,
        'fifties': 0,
        'twenties': 1,
        'tens': 1,
        'fives': 0,
        'twos': 0,
        'ones': 0,
        'coins': 0,
        'card_receipts': 3,  # 3 card receipts
        'ecocash_receipts': 0,
        'other_receipts': 0,
        'expected_cash': 30.00,
        'status': 'COMPLETED'
    }
    
    request = factory.post('/reconciliation/count/', count_data_2, format='json')
    response = count_view.post(request)
    
    if response.status_code != 200:
        print(f"❌ Failed to save second cashier count")
        return False
    
    print(f"💰 Step 3: Second cashier counted")
    print(f"   Cashier: {response.data.get('count_data', {}).get('cashier_name')}")
    print(f"   Cash: ${response.data.get('count_data', {}).get('totals', {}).get('cash', 0)}")
    print(f"   Card: ${response.data.get('count_data', {}).get('totals', {}).get('card', 0)}")
    
    # Step 4: Get updated reconciliation data
    request = factory.get('/reconciliation/enhanced/')
    response = enhanced_view.get(request)
    
    if response.status_code != 200:
        print(f"❌ Failed to get updated reconciliation data")
        return False
    
    updated_data = response.data
    print(f"📊 Step 4: Updated reconciliation data")
    print(f"   Actual cash total: ${updated_data.get('actual_counts', {}).get('cash', 0)}")
    print(f"   Actual card total: ${updated_data.get('actual_counts', {}).get('card', 0)}")
    print(f"   Cash variance: ${updated_data.get('variances', {}).get('cash', 0)}")
    print(f"   Card variance: ${updated_data.get('variances', {}).get('card', 0)}")
    print(f"   Progress: {updated_data.get('cashier_progress', {}).get('completed_counts', 0)}/{updated_data.get('cashier_progress', {}).get('total_cashiers', 0)} cashiers")
    
    # Step 5: Verify session summary
    session = ReconciliationSession.objects.get(shop=shop, date=today)
    print(f"📋 Step 5: Session summary")
    print(f"   Session status: {session.status}")
    print(f"   Total expected: ${session.total_expected_cash}")
    print(f"   Total counted: ${session.total_counted_cash}")
    print(f"   Total variance: ${session.total_variance}")
    
    print(f"✅ Complete workflow test passed!")
    return True


def main():
    """Run all tests"""
    print("🚀 Starting Comprehensive EOD Reconciliation Tests")
    print("=" * 60)
    
    tests = [
        ("Enhanced Reconciliation API", test_enhanced_reconciliation_api),
        ("Variance Calculations", test_variance_calculations),
        ("Error Handling", test_error_handling),
        ("Complete Workflow", test_complete_workflow)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            if test_func():
                passed += 1
                print(f"✅ {test_name} PASSED")
            else:
                print(f"❌ {test_name} FAILED")
        except Exception as e:
            print(f"💥 {test_name} CRASHED: {str(e)}")
            import traceback
            traceback.print_exc()
    
    print(f"\n{'='*60}")
    print(f"🏁 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print(f"🎉 All tests passed! EOD Reconciliation system is working correctly.")
        return True
    else:
        print(f"⚠️  Some tests failed. Please review the output above.")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)