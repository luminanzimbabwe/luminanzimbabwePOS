#!/usr/bin/env python3
"""
Stock Valuation Business Logic Test
This script demonstrates the fixed stock valuation logic that separates
inventory valuation from sales performance.

PROBLEM SOLVED:
- Before: Negative stock showed negative values (misleading business owners)
- After: Stock value never negative, profit based on actual sales
"""

def calculate_old_way(stock, cost_price, selling_price, quantity_sold=0):
    """OLD PROBLEMATIC LOGIC"""
    stock_value = stock * cost_price  # Can be negative!
    gross_profit = stock * (selling_price - cost_price)  # Based on stock, not sales!
    
    return {
        'stock_value': stock_value,
        'gross_profit': gross_profit,
        'logic': 'Based on current stock (WRONG for business reporting)'
    }

def calculate_new_way(stock, cost_price, selling_price, quantity_sold=0):
    """NEW BUSINESS-LOGIC CORRECT LOGIC"""
    # 1. STOCK VALUE: Never negative - if oversold, value is $0 (no physical assets)
    stock_value = max(0, stock) * cost_price
    
    # 2. GROSS PROFIT: Based on actual sales performance, not current stock
    total_sales = quantity_sold * selling_price
    total_cost = quantity_sold * cost_price
    gross_profit = total_sales - total_cost
    
    # 3. GP % based on sales performance
    gp_percentage = (gross_profit / total_sales * 100) if total_sales > 0 else 0
    
    return {
        'stock_value': stock_value,
        'gross_profit': gross_profit,
        'gp_percentage': gp_percentage,
        'total_sales': total_sales,
        'total_cost': total_cost,
        'logic': 'Separates inventory valuation from sales performance'
    }

# Test with your example data
print("=== STOCK VALUATION BUSINESS LOGIC TEST ===\n")

# Example from your table
products = [
    {
        'name': 'SUGAR 1KG',
        'stock': -2,
        'cost_price': 0.80,
        'selling_price': 1.00,
        'quantity_sold': 2  # They sold 2 units
    },
    {
        'name': 'RICE 2KG', 
        'stock': -6,
        'cost_price': 1.20,
        'selling_price': 1.80,
        'quantity_sold': 6  # They sold 6 units
    },
    {
        'name': 'POWER PLAY ENERGY DRINK',
        'stock': 53,
        'cost_price': 0.70,
        'selling_price': 1.10,
        'quantity_sold': 10  # They sold 10 units
    }
]

print("COMPARISON: OLD vs NEW LOGIC")
print("=" * 60)

for product in products:
    print(f"\nPRODUCT: {product['name']}")
    print(f"   Stock: {product['stock']}, Cost: ${product['cost_price']}, Price: ${product['selling_price']}")
    print(f"   Quantity Sold: {product['quantity_sold']}")
    
    # Old way (problematic)
    old_result = calculate_old_way(
        product['stock'], 
        product['cost_price'], 
        product['selling_price'],
        product['quantity_sold']
    )
    
    # New way (business correct)
    new_result = calculate_new_way(
        product['stock'], 
        product['cost_price'], 
        product['selling_price'],
        product['quantity_sold']
    )
    
    print(f"\n   OLD LOGIC (Misleading):")
    print(f"      Stock Value: ${old_result['stock_value']:.2f}")
    print(f"      Gross Profit: ${old_result['gross_profit']:.2f}")
    print(f"      Logic: {old_result['logic']}")
    
    print(f"\n   NEW LOGIC (Business Correct):")
    print(f"      Stock Value: ${new_result['stock_value']:.2f}")
    print(f"      Gross Profit: ${new_result['gross_profit']:.2f}")
    print(f"      GP %: {new_result['gp_percentage']:.1f}%")
    print(f"      Total Sales: ${new_result['total_sales']:.2f}")
    print(f"      Logic: {new_result['logic']}")

print("\n" + "=" * 60)
print("KEY BUSINESS INSIGHTS:")
print("1. Stock Value: Never negative - if oversold, value = $0")
print("2. Gross Profit: Based on SALES PERFORMANCE, not stock levels")
print("3. Business owners see REAL profit made from selling")
print("4. Separate inventory valuation from sales reporting")
print("\nPROBLEM SOLVED: No more misleading negative profits!")