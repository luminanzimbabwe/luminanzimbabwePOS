#!/usr/bin/env python3
"""
Simple EOD Reconciliation Test
Tests the core functionality without Unicode characters
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

def test_basic_functionality():
    """Test basic reconciliation functionality"""
    print("Testing Basic EOD Reconciliation Functionality")
    print("=" * 50)
    
    try:
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
            print("Created test shop")
        else:
            print("Using existing test shop")
        
        # Create test cashier
        cashier, _ = Cashier.objects.get_or_create(
            shop=shop,
            name='Test Cashier',
            defaults={
                'phone': '+1234567890',
                'status': 'active',
                'email': 'test@testshop.com'
            }
        )
        
        print(f"Created/verified cashier: {cashier.name}")
        
        # Create test product
        product, _ = Product.objects.get_or_create(
            shop=shop,
            name='Test Product',
            defaults={
                'price': Decimal('10.00'),
                'cost_price': Decimal('5.00'),
                'stock_quantity': Decimal('100.00'),
                'category': 'Test Category'
            }
        )
        
        print(f"Created/verified product: {product.name}")
        
        # Create test sale for today
        today = date.today()
        
        sale = Sale.objects.create(
            shop=shop,
            cashier=cashier,
            total_amount=Decimal('30.00'),
            payment_method='cash',
            status='completed',
            created_at=datetime.combine(today, datetime.min.time())
        )
        
        SaleItem.objects.create(
            sale=sale,
            product=product,
            quantity=Decimal('3.00'),
            unit_price=Decimal('10.00'),
            total_price=Decimal('30.00')
        )
        
        print(f"Created test sale: {sale.id}")
        
        # Create CashFloat record
        cash_float, _ = CashFloat.objects.get_or_create(
            shop=shop,
            cashier=cashier,
            date=today,
            defaults={
                'float_amount': Decimal('50.00'),
                'current_cash': Decimal('80.00'),  # 50 float + 30 cash sales
                'session_cash_sales': Decimal('30.00'),
                'expected_cash_at_eod': Decimal('80.00'),
                'status': 'ACTIVE'
            }
        )
        
        print(f"Created CashFloat record")
        
        # Test CashierCount creation
        count = CashierCount.objects.create(
            shop=shop,
            cashier=cashier,
            date=today,
            hundreds=0,
            fifties=1,  # 50
            twenties=1,  # 20
            tens=1,  # 10
            fives=0,
            twos=0,
            ones=0,
            coins=0,
            expected_cash=Decimal('80.00'),
            status='COMPLETED'
        )
        
        print(f"Created cashier count")
        print(f"Calculated total cash: ${count.total_cash}")
        print(f"Expected cash: ${count.expected_cash}")
        print(f"Cash variance: ${count.cash_variance}")
        
        # Test ReconciliationSession
        session, _ = ReconciliationSession.get_or_create_session(shop, today)
        session.calculate_session_summary()
        
        print(f"Created reconciliation session")
        print(f"Session status: {session.status}")
        print(f"Total expected: ${session.total_expected_cash}")
        print(f"Total counted: ${session.total_counted_cash}")
        print(f"Total variance: ${session.total_variance}")
        
        print("\nAll basic tests passed!")
        return True
        
    except Exception as e:
        print(f"Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_basic_functionality()
    sys.exit(0 if success else 1)