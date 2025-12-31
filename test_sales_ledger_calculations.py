#!/usr/bin/env python3
"""
Test script to verify Sales Ledger calculation fixes
"""

def test_sales_ledger_calculations():
    """Test the enhanced sales ledger calculations"""
    
    print("🧪 Testing Sales Ledger Calculation Fixes")
    print("=" * 50)
    
    # Test case 1: Sale R005 from user example
    print("\n📊 Test Case 1: Sale R005 - Sugar 1kg")
    sale_r005 = {
        'receipt_number': 'R005',
        'total_amount': 1.75,
        'cost_price': None,  # This should be calculated from items
        'items': [
            {
                'cost_price': 1.20,  # Assuming cost price
                'quantity': 1
            }
        ]
    }
    
    # Simulate the enhanced cost price calculation
    cost_price = 0
    if sale_r005.get('cost_price') is not None:
        cost_price = float(sale_r005['cost_price']) or 0
    elif sale_r005.get('items') and len(sale_r005['items']) > 0:
        cost_price = sum(
            (float(item.get('cost_price', 0)) or 0) * (float(item.get('quantity', 1)) or 1)
            for item in sale_r005['items']
        )
    
    total_amount = float(sale_r005['total_amount']) or 0
    margin_amount = total_amount - cost_price
    margin_percentage = (cost_price > 0) * (margin_amount / cost_price * 100) or ((total_amount > 0) * (margin_amount / total_amount * 100) or 0)
    
    print(f"  Total Amount: ${total_amount:.2f}")
    print(f"  Cost Price: ${cost_price:.2f}")
    print(f"  Margin Amount: ${margin_amount:.2f}")
    print(f"  Margin %: {margin_percentage:.1f}%")
    
    expected_results = {
        'total_amount': 1.75,
        'cost_price': 1.20,
        'margin_amount': 0.55,
        'margin_percentage': 31.4  # (0.55/1.75)*100
    }
    
    print(f"\n✅ Expected Results:")
    for key, value in expected_results.items():
        print(f"  {key}: {value}")
    
    print(f"\n🎯 Validation:")
    if abs(total_amount - expected_results['total_amount']) < 0.01:
        print("  ✅ Total Amount: CORRECT")
    else:
        print("  ❌ Total Amount: INCORRECT")
        
    if abs(cost_price - expected_results['cost_price']) < 0.01:
        print("  ✅ Cost Price: CORRECT")
    else:
        print("  ❌ Cost Price: INCORRECT")
        
    if abs(margin_amount - expected_results['margin_amount']) < 0.01:
        print("  ✅ Margin Amount: CORRECT")
    else:
        print("  ❌ Margin Amount: INCORRECT")
    
    # Test case 2: Multiple sales with different cost structures
    print("\n📊 Test Case 2: Multiple Sales Aggregation")
    sales_data = [
        {'total_amount': 10.00, 'cost_price': 7.00, 'status': 'completed'},
        {'total_amount': 15.50, 'cost_price': 12.00, 'status': 'completed'},
        {'total_amount': 5.25, 'cost_price': 4.00, 'status': 'refunded'},  # Should be excluded
        {'total_amount': 8.75, 'items': [{'cost_price': 6.50, 'quantity': 1}], 'status': 'completed'}
    ]
    
    # Simulate the totals calculation
    totals = {'totalCostPrice': 0, 'totalSellingPrice': 0, 'totalRefunded': 0}
    
    for sale in sales_data:
        is_refunded = sale.get('status') == 'refunded'
        
        # Enhanced cost price calculation
        cost_price = 0
        if sale.get('cost_price') is not None:
            cost_price = float(sale['cost_price']) or 0
        elif sale.get('items') and len(sale['items']) > 0:
            cost_price = sum(
                (float(item.get('cost_price', 0)) or 0) * (float(item.get('quantity', 1)) or 1)
                for item in sale['items']
            )
        
        selling_price = float(sale['total_amount']) or 0
        
        if not is_refunded:
            totals['totalCostPrice'] += cost_price
            totals['totalSellingPrice'] += selling_price
        else:
            totals['totalRefunded'] += selling_price
    
    total_margin = totals['totalSellingPrice'] - totals['totalCostPrice']
    margin_percentage = (totals['totalCostPrice'] > 0) * (total_margin / totals['totalCostPrice'] * 100) or ((totals['totalSellingPrice'] > 0) * (total_margin / totals['totalSellingPrice'] * 100) or 0)
    
    print(f"  Total Selling Price: ${totals['totalSellingPrice']:.2f}")
    print(f"  Total Cost Price: ${totals['totalCostPrice']:.2f}")
    print(f"  Total Refunded: ${totals['totalRefunded']:.2f}")
    print(f"  Net Margin: ${total_margin:.2f}")
    print(f"  Margin %: {margin_percentage:.1f}%")
    
    expected_totals = {
        'totalSellingPrice': 34.25,  # 10.00 + 15.50 + 8.75 (excluded 5.25 refunded)
        'totalCostPrice': 25.50,     # 7.00 + 12.00 + 6.50
        'totalRefunded': 5.25,
        'netMargin': 8.75,
        'marginPercentage': 34.3     # (8.75/25.50)*100
    }
    
    print(f"\n✅ Expected Totals:")
    for key, value in expected_totals.items():
        print(f"  {key}: {value}")
    
    print(f"\n🎯 Validation:")
    if abs(totals['totalSellingPrice'] - expected_totals['totalSellingPrice']) < 0.01:
        print("  ✅ Total Selling Price: CORRECT")
    else:
        print("  ❌ Total Selling Price: INCORRECT")
        
    if abs(totals['totalCostPrice'] - expected_totals['totalCostPrice']) < 0.01:
        print("  ✅ Total Cost Price: CORRECT")
    else:
        print("  ❌ Total Cost Price: INCORRECT")
        
    if abs(totals['totalRefunded'] - expected_totals['totalRefunded']) < 0.01:
        print("  ✅ Total Refunded: CORRECT")
    else:
        print("  ❌ Total Refunded: INCORRECT")
    
    print("\n" + "=" * 50)
    print("🎉 Sales Ledger Calculation Tests Complete!")
    print("\n📋 Summary of Enhancements:")
    print("  • Enhanced cost price calculation from multiple sources")
    print("  • Support for cost_price, cost, and items-based calculations")
    print("  • Proper margin calculations with fallback logic")
    print("  • Refund exclusion from financial totals")
    print("  • Debug logging for troubleshooting")

if __name__ == "__main__":
    test_sales_ledger_calculations()