#!/usr/bin/env python3
"""
Simple test to validate drawer sales attribution fix
"""

import os
import sys
import django

# Add the project to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from core.models import ShopConfiguration, Cashier, CashFloat, Sale, Product
from decimal import Decimal

def test_drawer_attribution():
    print("Testing Drawer Sales Attribution Fix")
    print("=" * 50)
    
    try:
        # Get or create a test shop
        shop, created = ShopConfiguration.objects.get_or_create(
            email="test@example.com",
            defaults={
                'name': 'Test Shop',
                'phone': '1234567890',
                'address': 'Test Address',
                'password': 'testpass',
                'register_id': 'TEST'
            }
        )
        if created:
            print("[OK] Created test shop")
        else:
            print("[OK] Using existing test shop")
        
        # Create test cashiers
        cashier1, created1 = Cashier.objects.get_or_create(
            shop=shop,
            name='Test Cashier 1',
            email='cashier1@test.com',
            defaults={
                'phone': '1234567891',
                'password': 'testpass1',
                'status': 'active'
            }
        )
        
        cashier2, created2 = Cashier.objects.get_or_create(
            shop=shop,
            name='Test Cashier 2', 
            email='cashier2@test.com',
            defaults={
                'phone': '1234567892',
                'password': 'testpass2',
                'status': 'active'
            }
        )
        
        if created1:
            print(f"[OK] Created cashier 1: {cashier1.name} (ID: {cashier1.id})")
        else:
            print(f"[OK] Using existing cashier 1: {cashier1.name} (ID: {cashier1.id})")
            
        if created2:
            print(f"[OK] Created cashier 2: {cashier2.name} (ID: {cashier2.id})")
        else:
            print(f"[OK] Using existing cashier 2: {cashier2.name} (ID: {cashier2.id})")
        
        # Create test products
        product1, created3 = Product.objects.get_or_create(
            shop=shop,
            name='Test Product 1',
            defaults={
                'price': Decimal('10.00'),
                'cost_price': Decimal('5.00'),
                'stock_quantity': Decimal('100'),
                'category': 'Test',
                'line_code': 'TEST001'
            }
        )
        
        if created3:
            print(f"[OK] Created test product: {product1.name}")
        else:
            print(f"[OK] Using existing product: {product1.name}")
        
        # Create CashFloat records for both cashiers
        from datetime import date
        today = date.today()
        
        drawer1, created4 = CashFloat.objects.get_or_create(
            shop=shop,
            cashier=cashier1,
            date=today,
            defaults={
                'status': 'ACTIVE',
                'float_amount': Decimal('50.00')
            }
        )
        
        drawer2, created5 = CashFloat.objects.get_or_create(
            shop=shop,
            cashier=cashier2,
            date=today,
            defaults={
                'status': 'ACTIVE',
                'float_amount': Decimal('50.00')
            }
        )
        
        if created4:
            print(f"[OK] Created drawer for cashier 1")
        else:
            print(f"[OK] Using existing drawer for cashier 1")
            
        if created5:
            print(f"[OK] Created drawer for cashier 2")
        else:
            print(f"[OK] Using existing drawer for cashier 2")
        
        print("\nInitial Drawer Status:")
        print(f"Cashier 1 Drawer - Cash: ${drawer1.current_cash}, Sales: ${drawer1.session_total_sales}")
        print(f"Cashier 2 Drawer - Cash: ${drawer2.current_cash}, Sales: ${drawer2.session_total_sales}")
        
        # Test creating sales for each cashier
        print("\nCreating test sales...")
        
        # Create sale for cashier 1
        sale1 = Sale.objects.create(
            shop=shop,
            cashier=cashier1,
            total_amount=Decimal('25.00'),
            currency='USD',
            payment_method='cash'
        )
        
        # Create sale items for sale1
        from core.models import SaleItem
        SaleItem.objects.create(
            sale=sale1,
            product=product1,
            quantity=Decimal('2'),
            unit_price=Decimal('10.00'),
            total_price=Decimal('20.00')
        )
        SaleItem.objects.create(
            sale=sale1,
            product=product1,
            quantity=Decimal('0.5'),
            unit_price=Decimal('10.00'),
            total_price=Decimal('5.00')
        )
        
        print(f"[OK] Created sale #{sale1.id} for {cashier1.name}")
        
        # Create sale for cashier 2
        sale2 = Sale.objects.create(
            shop=shop,
            cashier=cashier2,
            total_amount=Decimal('35.00'),
            currency='USD',
            payment_method='cash'
        )
        
        # Create sale items for sale2
        SaleItem.objects.create(
            sale=sale2,
            product=product1,
            quantity=Decimal('3'),
            unit_price=Decimal('10.00'),
            total_price=Decimal('30.00')
        )
        SaleItem.objects.create(
            sale=sale2,
            product=product1,
            quantity=Decimal('0.5'),
            unit_price=Decimal('10.00'),
            total_price=Decimal('5.00')
        )
        
        print(f"[OK] Created sale #{sale2.id} for {cashier2.name}")
        
        # Refresh drawer data
        drawer1.refresh_from_db()
        drawer2.refresh_from_db()
        
        print("\nFinal Drawer Status:")
        print(f"Cashier 1 Drawer - Cash: ${drawer1.current_cash}, Sales: ${drawer1.session_total_sales}")
        print(f"Cashier 2 Drawer - Cash: ${drawer2.current_cash}, Sales: ${drawer2.session_total_sales}")
        
        # Validate attribution
        print("\nValidation Results:")
        
        # Check that each drawer has the correct sales amount
        expected_cashier1_sales = Decimal('25.00')
        expected_cashier2_sales = Decimal('35.00')
        
        if drawer1.session_total_sales == expected_cashier1_sales:
            print(f"[PASS] Cashier 1 drawer correctly shows ${expected_cashier1_sales} in sales")
        else:
            print(f"[FAIL] Cashier 1 drawer shows ${drawer1.session_total_sales}, expected ${expected_cashier1_sales}")
        
        if drawer2.session_total_sales == expected_cashier2_sales:
            print(f"[PASS] Cashier 2 drawer correctly shows ${expected_cashier2_sales} in sales")
        else:
            print(f"[FAIL] Cashier 2 drawer shows ${drawer2.session_total_sales}, expected ${expected_cashier2_sales}")
        
        # Check that cash amounts are correct (float + sales)
        expected_cashier1_cash = Decimal('50.00') + expected_cashier1_sales  # 75.00
        expected_cashier2_cash = Decimal('50.00') + expected_cashier2_sales  # 85.00
        
        if drawer1.current_cash == expected_cashier1_cash:
            print(f"[PASS] Cashier 1 drawer correctly shows ${expected_cashier1_cash} in cash")
        else:
            print(f"[FAIL] Cashier 1 drawer shows ${drawer1.current_cash}, expected ${expected_cashier1_cash}")
        
        if drawer2.current_cash == expected_cashier2_cash:
            print(f"[PASS] Cashier 2 drawer correctly shows ${expected_cashier2_cash} in cash")
        else:
            print(f"[FAIL] Cashier 2 drawer shows ${drawer2.current_cash}, expected ${expected_cashier2_cash}")
        
        # Overall test result
        print("\n" + "=" * 50)
        if (drawer1.session_total_sales == expected_cashier1_sales and 
            drawer2.session_total_sales == expected_cashier2_sales and
            drawer1.current_cash == expected_cashier1_cash and 
            drawer2.current_cash == expected_cashier2_cash):
            print("SUCCESS: All tests passed! Drawer sales attribution is working correctly.")
            return True
        else:
            print("FAILED: There are issues with drawer sales attribution.")
            return False
            
    except Exception as e:
        print(f"ERROR: Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_drawer_attribution()
    sys.exit(0 if success else 1)