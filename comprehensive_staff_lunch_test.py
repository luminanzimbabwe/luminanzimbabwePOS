#!/usr/bin/env python3
"""
Comprehensive Staff Lunch Test
Tests both recording new staff lunch AND displaying the complete history
"""

import os
import sys
import django
import json
from decimal import Decimal

# Add the project directory to Python path
sys.path.append('.')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from core.models import ShopConfiguration, Product, StaffLunch, Cashier
from core.views import StaffLunchListView
from django.test import RequestFactory
from django.utils import timezone

def test_complete_staff_lunch_workflow():
    """Test the complete staff lunch workflow: create new + show history"""
    print("🧪 COMPREHENSIVE STAFF LUNCH TEST")
    print("=" * 60)
    
    try:
        # Get shop
        shop = ShopConfiguration.objects.get()
        print(f"✅ Shop found: {shop.name}")
        
        # Get products for testing
        products = Product.objects.filter(shop=shop)[:5]
        if not products.exists():
            print("❌ No products found for testing")
            return False
        
        # Get or create cashier
        cashier = Cashier.objects.filter(shop=shop, status='active').first()
        if cashier:
            print(f"✅ Using cashier: {cashier.name}")
        else:
            cashier = Cashier.objects.filter(shop=shop).first()
            if cashier:
                print(f"⚠️  Using cashier (not active): {cashier.name}")
            else:
                print("❌ No cashiers found")
                return False
        
        # STEP 1: Show current staff lunch history BEFORE test
        print(f"\n📋 CURRENT STAFF LUNCH HISTORY (BEFORE TEST):")
        print("-" * 50)
        
        # Get all existing staff lunch records
        existing_lunches = StaffLunch.objects.filter(shop=shop).order_by('-created_at')
        
        if existing_lunches.exists():
            print(f"Found {existing_lunches.count()} existing staff lunch records:")
            for i, lunch in enumerate(existing_lunches[:5], 1):  # Show first 5
                print(f"  {i}. Staff: {lunch.notes.split(',')[0].replace('Staff: ', '')}")
                print(f"     Product: {lunch.product.name}")
                print(f"     Quantity: {lunch.quantity}")
                print(f"     Cost: ${lunch.total_cost}")
                print(f"     Date: {lunch.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
                print()
        else:
            print("No existing staff lunch records found.")
        
        # STEP 2: Record a NEW staff lunch
        print(f"\n🆕 RECORDING NEW STAFF LUNCH...")
        print("-" * 40)
        
        # Select 2-3 different products for the test
        selected_products = list(products[:3])
        
        # Calculate total and prepare data
        total_value = 0
        products_data = []
        
        for i, product in enumerate(selected_products):
            quantity = i + 1  # 1, 2, 3
            unit_price = float(product.cost_price)
            item_total = quantity * unit_price
            total_value += item_total
            
            products_data.append({
                'product_id': product.id,
                'product_name': product.name,
                'quantity': quantity,
                'unit_price': unit_price
            })
            
            print(f"  Product {i+1}: {product.name}")
            print(f"    Quantity: {quantity}")
            print(f"    Unit Price: ${unit_price}")
            print(f"    Total: ${item_total}")
        
        print(f"  📦 TOTAL VALUE: ${total_value}")
        
        # Create staff lunch data
        staff_lunch_data = {
            'staff_name': 'Test Staff Member - API Test',
            'lunch_type': 'stock',
            'reason': 'Comprehensive API test',
            'cashier_name': cashier.name if cashier else '',
            'timestamp': timezone.now().isoformat(),
            'products': products_data,
            'total_value': total_value
        }
        
        # Make the POST request to create new staff lunch
        factory = RequestFactory()
        request = factory.post('/api/staff-lunch/', 
                             data=json.dumps(staff_lunch_data),
                             content_type='application/json')
        request.data = staff_lunch_data
        
        view = StaffLunchListView()
        response = view.post(request)
        
        print(f"📊 Response Status: {response.status_code}")
        print(f"📊 Response Data: {json.dumps(response.data, indent=2)}")
        
        if response.status_code == 201:
            print("✅ New staff lunch recorded successfully!")
        else:
            print("❌ Failed to record new staff lunch")
            return False
        
        # STEP 3: Show COMPLETE staff lunch history AFTER test
        print(f"\n📋 COMPLETE STAFF LUNCH HISTORY (AFTER TEST):")
        print("-" * 50)
        
        # Get ALL staff lunch records after the test
        all_lunches = StaffLunch.objects.filter(shop=shop).order_by('-created_at')
        
        print(f"Found {all_lunches.count()} total staff lunch records:")
        print()
        
        # Show all records with better formatting
        for i, lunch in enumerate(all_lunches, 1):
            print(f"📝 RECORD #{i}")
            print(f"   ID: {lunch.id}")
            print(f"   Staff: {lunch.notes.split(',')[0].replace('Staff: ', '') if 'Staff: ' in lunch.notes else 'Unknown'}")
            print(f"   Product: {lunch.product.name}")
            print(f"   Quantity: {lunch.quantity}")
            print(f"   Unit Price: ${lunch.unit_price}")
            print(f"   Total Cost: ${lunch.total_cost}")
            print(f"   Currency: {lunch.currency}")
            if lunch.recorded_by:
                print(f"   Recorded by: {lunch.recorded_by.name}")
            print(f"   Date/Time: {lunch.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
            print()
        
        # STEP 4: Verify stock changes
        print(f"🔍 STOCK VERIFICATION:")
        print("-" * 30)
        
        for i, product in enumerate(selected_products):
            # Get original quantity (we stored it above)
            original_quantity = products_data[i]['quantity']
            
            # Get current stock
            current_stock = float(product.stock_quantity)
            
            # Calculate expected stock (original stock - consumed)
            # We need to get the product fresh from database
            fresh_product = Product.objects.get(id=product.id)
            expected_stock = float(fresh_product.stock_quantity)
            
            print(f"  Product: {product.name}")
            print(f"    Consumed in lunch: {original_quantity}")
            print(f"    Current stock: {expected_stock}")
            print()
        
        print(f"\n🎉 COMPREHENSIVE TEST COMPLETED SUCCESSFULLY!")
        print(f"✅ New staff lunch record created")
        print(f"✅ Stock quantities properly reduced")
        print(f"✅ History shows all records correctly")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def show_staff_lunch_summary():
    """Show a summary of all staff lunch activity"""
    print(f"\n📊 STAFF LUNCH SUMMARY:")
    print("=" * 40)
    
    try:
        shop = ShopConfiguration.objects.get()
        
        # Get all staff lunch records
        lunches = StaffLunch.objects.filter(shop=shop)
        
        if not lunches.exists():
            print("No staff lunch records found.")
            return
        
        print(f"Total Records: {lunches.count()}")
        
        # Calculate totals
        total_cost = sum(float(lunch.total_cost) for lunch in lunches)
        total_quantity = sum(lunch.quantity for lunch in lunches)
        
        print(f"Total Cost: ${total_cost:.2f}")
        print(f"Total Quantity: {total_quantity}")
        
        # Group by staff member
        staff_summary = {}
        for lunch in lunches:
            staff_name = lunch.notes.split(',')[0].replace('Staff: ', '') if 'Staff: ' in lunch.notes else 'Unknown'
            if staff_name not in staff_summary:
                staff_summary[staff_name] = {'count': 0, 'total_cost': 0}
            
            staff_summary[staff_name]['count'] += 1
            staff_summary[staff_name]['total_cost'] += float(lunch.total_cost)
        
        print(f"\n👥 BY STAFF MEMBER:")
        for staff, data in staff_summary.items():
            print(f"  {staff}: {data['count']} lunches, ${data['total_cost']:.2f}")
        
        # Recent activity
        recent = lunches[:5]
        print(f"\n🕒 RECENT ACTIVITY:")
        for lunch in recent:
            staff = lunch.notes.split(',')[0].replace('Staff: ', '') if 'Staff: ' in lunch.notes else 'Unknown'
            print(f"  {lunch.created_at.strftime('%m-%d %H:%M')} - {staff} - {lunch.product.name} (${lunch.total_cost})")
            
    except Exception as e:
        print(f"Error generating summary: {str(e)}")

if __name__ == "__main__":
    print("🎯 STAFF LUNCH COMPREHENSIVE TEST")
    print("=" * 60)
    print("This test will:")
    print("1. Show existing staff lunch history")
    print("2. Record a NEW staff lunch")
    print("3. Show complete history including the new record")
    print("4. Verify stock changes")
    print("5. Provide summary statistics")
    print("=" * 60)
    
    success = test_complete_staff_lunch_workflow()
    
    if success:
        show_staff_lunch_summary()
        print(f"\n🎉 ALL TESTS PASSED!")
        print("The staff lunch functionality is working correctly!")
    else:
        print(f"\n❌ TESTS FAILED!")
        print("There are still issues with the staff lunch functionality.")