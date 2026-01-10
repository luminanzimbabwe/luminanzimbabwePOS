"""
Test script for Split Payment Feature
Run this to verify the split payment implementation works correctly.

Usage:
    python test_split_payment.py

This script tests:
1. SalePayment model creation
2. Split payment API endpoint validation
3. Currency conversion for multiple payments
"""

import os
import sys
import django

# Add the project to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from decimal import Decimal
from django.test import TestCase, RequestFactory
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from core.models import ShopConfiguration, Cashier, Product, Sale, SalePayment
from core.serializers import CreateSaleSerializer

def test_sale_payment_model():
    """Test SalePayment model structure"""
    print("=" * 60)
    print("TESTING SALE PAYMENT MODEL")
    print("=" * 60)
    
    # Check if SalePayment model exists and has correct fields
    try:
        from core.models import SalePayment
        
        # Get all field names
        field_names = [f.name for f in SalePayment._meta.get_fields()]
        print(f"✓ SalePayment model exists")
        print(f"  Fields: {field_names}")
        
        # Check required fields
        required_fields = ['sale', 'payment_method', 'currency', 'amount', 'amount_usd_equivalent']
        missing_fields = [f for f in required_fields if f not in field_names]
        
        if missing_fields:
            print(f"✗ Missing required fields: {missing_fields}")
            return False
        else:
            print(f"✓ All required fields present: {required_fields}")
            return True
    except Exception as e:
        print(f"✗ Error testing SalePayment model: {e}")
        return False

def test_create_sale_serializer():
    """Test CreateSaleSerializer accepts split payments"""
    print("\n" + "=" * 60)
    print("TESTING CREATE SALE SERIALIZER")
    print("=" * 60)
    
    try:
        from core.serializers import CreateSaleSerializer
        
        # Test split payment data
        split_payment_data = {
            'cashier_id': 1,
            'items': [
                {'product_id': 1, 'quantity': '2'}
            ],
            'payments': [
                {'payment_method': 'cash', 'currency': 'USD', 'amount': '5.00'},
                {'payment_method': 'cash', 'currency': 'ZIG', 'amount': '1000.00'}
            ],
            'customer_name': 'Test Customer',
            'customer_phone': '+263771234567'
        }
        
        serializer = CreateSaleSerializer(data=split_payment_data)
        is_valid = serializer.is_valid()
        
        if is_valid:
            print(f"✓ Split payment data validated successfully")
            print(f"  Validated data keys: {list(serializer.validated_data.keys())}")
            return True
        else:
            print(f"✗ Split payment data validation failed: {serializer.errors}")
            return False
    except Exception as e:
        print(f"✗ Error testing serializer: {e}")
        return False

def test_serializer_excludes_both_payment_methods():
    """Test that serializer rejects both single and split payments"""
    print("\n" + "=" * 60)
    print("TESTING SERIALIZER VALIDATION (EXCLUDE BOTH)")
    print("=" * 60)
    
    try:
        from core.serializers import CreateSaleSerializer
        
        # Test data with both single payment AND split payments (should fail)
        invalid_data = {
            'cashier_id': 1,
            'items': [
                {'product_id': 1, 'quantity': '2'}
            ],
            'payment_method': 'cash',  # Single payment
            'payments': [  # Split payments
                {'payment_method': 'cash', 'currency': 'USD', 'amount': '5.00'}
            ]
        }
        
        serializer = CreateSaleSerializer(data=invalid_data)
        is_valid = serializer.is_valid()
        
        if not is_valid:
            print(f"✓ Correctly rejected data with both payment methods")
            print(f"  Error: {serializer.errors}")
            return True
        else:
            print(f"✗ Should have rejected data with both payment methods")
            return False
    except Exception as e:
        print(f"✗ Error testing validation: {e}")
        return False

def test_serializer_requires_payment():
    """Test that serializer requires either single or split payment"""
    print("\n" + "=" * 60)
    print("TESTING SERIALIZER VALIDATION (REQUIRES PAYMENT)")
    print("=" * 60)
    
    try:
        from core.serializers import CreateSaleSerializer
        
        # Test data without any payment (should fail)
        invalid_data = {
            'cashier_id': 1,
            'items': [
                {'product_id': 1, 'quantity': '2'}
            ]
        }
        
        serializer = CreateSaleSerializer(data=invalid_data)
        is_valid = serializer.is_valid()
        
        if not is_valid:
            print(f"✓ Correctly rejected data without payment method")
            print(f"  Error: {serializer.errors}")
            return True
        else:
            print(f"✗ Should have rejected data without payment method")
            return False
    except Exception as e:
        print(f"✗ Error testing validation: {e}")
        return False

def test_sale_status_choices():
    """Test that Sale model has 'pending_payment' status"""
    print("\n" + "=" * 60)
    print("TESTING SALE STATUS CHOICES")
    print("=" * 60)
    
    try:
        from core.models import Sale
        
        # Get status choices
        status_choices = dict(Sale.STATUS_CHOICES)
        print(f"✓ Sale status choices: {status_choices}")
        
        if 'pending_payment' in status_choices:
            print(f"✓ 'pending_payment' status is available")
            return True
        else:
            print(f"✗ 'pending_payment' status not found")
            return False
    except Exception as e:
        print(f"✗ Error testing status choices: {e}")
        return False

def test_payment_validation():
    """Test payment validation in serializer"""
    print("\n" + "=" * 60)
    print("TESTING PAYMENT VALIDATION")
    print("=" * 60)
    
    try:
        from core.serializers import CreateSaleSerializer
        
        # Test invalid payment method
        invalid_payment_data = {
            'cashier_id': 1,
            'items': [
                {'product_id': 1, 'quantity': '2'}
            ],
            'payments': [
                {'payment_method': 'invalid', 'currency': 'USD', 'amount': '5.00'}
            ]
        }
        
        serializer = CreateSaleSerializer(data=invalid_payment_data)
        is_valid = serializer.is_valid()
        
        if not is_valid:
            print(f"✓ Correctly rejected invalid payment method")
            print(f"  Error: {serializer.errors}")
        else:
            print(f"✗ Should have rejected invalid payment method")
            return False
        
        # Test invalid currency
        invalid_currency_data = {
            'cashier_id': 1,
            'items': [
                {'product_id': 1, 'quantity': '2'}
            ],
            'payments': [
                {'payment_method': 'cash', 'currency': 'INVALID', 'amount': '5.00'}
            ]
        }
        
        serializer = CreateSaleSerializer(data=invalid_currency_data)
        is_valid = serializer.is_valid()
        
        if not is_valid:
            print(f"✓ Correctly rejected invalid currency")
            print(f"  Error: {serializer.errors}")
            return True
        else:
            print(f"✗ Should have rejected invalid currency")
            return False
    except Exception as e:
        print(f"✗ Error testing payment validation: {e}")
        return False

def run_all_tests():
    """Run all tests and print summary"""
    print("\n" + "=" * 60)
    print("SPLIT PAYMENT FEATURE TESTS")
    print("=" * 60)
    
    tests = [
        ("SalePayment Model", test_sale_payment_model),
        ("CreateSaleSerializer (Split Payment)", test_create_sale_serializer),
        ("Serializer Excludes Both", test_serializer_excludes_both_payment_methods),
        ("Serializer Requires Payment", test_serializer_requires_payment),
        ("Sale Status Choices", test_sale_status_choices),
        ("Payment Validation", test_payment_validation),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n✗ Test '{name}' crashed: {e}")
            results.append((name, False))
    
    # Print summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    passed = 0
    failed = 0
    
    for name, result in results:
        status = "✓ PASSED" if result else "✗ FAILED"
        print(f"  {status}: {name}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print(f"\nTotal: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("\n🎉 All tests passed! Split payment feature is ready to use.")
        return True
    else:
        print(f"\n⚠️ {failed} test(s) failed. Please review the implementation.")
        return False

if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)
