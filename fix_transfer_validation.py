# Read the file
with open('LuminaN/screens/OwnerDashboardScreen.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the section to modify - search for key unique parts
search_text = '// Calculate multi-currency breakdowns from drawer data'
if search_text in content:
    print('Found the search text!')
    
    # Find the start position
    start_idx = content.find(search_text)
    
    # Find the end of the section (look for the closing braces pattern)
    # We need to find the closing braces for this if statement
    # Count braces to find matching closing brace
    brace_count = 0
    end_idx = start_idx
    for i, char in enumerate(content[start_idx:], start=start_idx):
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count == 0:
                end_idx = i + 1
                break
    
    # Get the old section
    old_section = content[start_idx:end_idx]
    print(f'Old section length: {len(old_section)}')
    
    # Create the new section
    new_section = '''            // Calculate multi-currency breakdowns from drawer data
          if (Array.isArray(shop_status.drawers) && shop_status.drawers.length > 0) {
            const currencyBreakdown = shop_status.drawers.reduce((acc, drawer) => {
              // Expected amounts per currency
              acc.expected_zig = (acc.expected_zig || 0) + Number(drawer?.eod_expectations?.expected_zig || 0);
              acc.expected_usd = (acc.expected_usd || 0) + Number(drawer?.eod_expectations?.expected_usd || 0);
              acc.expected_rand = (acc.expected_rand || 0) + Number(drawer?.eod_expectations?.expected_rand || 0);
              
              // Current amounts per currency - use current_breakdown_by_currency from backend
              const breakdownByCurrency = drawer?.current_breakdown_by_currency || {};
              
              // Get current total from current_breakdown_by_currency.zig.total or fallback to direct fields
              acc.current_zig = (acc.current_zig || 0) + (Number(breakdownByCurrency?.zig?.total || 0) || Number(drawer?.current_total_zig || 0));
              acc.current_usd = (acc.current_usd || 0) + (Number(breakdownByCurrency?.usd?.total || 0) || Number(drawer?.current_total_usd || 0));
              acc.current_rand = (acc.current_rand || 0) + (Number(breakdownByCurrency?.rand?.total || 0) || Number(drawer?.current_total_rand || 0));
              
              // Transfer amounts per currency - extract from drawer transfer data
              acc.transfer_zig = (acc.transfer_zig || 0) + (Number(drawer?.transfer_amount_zig || drawer?.transfer_zig || drawer?.transfer?.zig || 0));
              acc.transfer_usd = (acc.transfer_usd || 0) + (Number(drawer?.transfer_amount_usd || drawer?.transfer_usd || drawer?.transfer?.usd || 0));
              acc.transfer_rand = (acc.transfer_rand || 0) + (Number(drawer?.transfer_amount_rand || drawer?.transfer_rand || drawer?.transfer?.rand || 0));
              
              return acc;
            }, {});
            
            // Calculate variances per currency (current - expected)
            const zigVariance = (currencyBreakdown.current_zig || 0) - (currencyBreakdown.expected_zig || 0);
            const usdVariance = (currencyBreakdown.current_usd || 0) - (currencyBreakdown.expected_usd || 0);
            const randVariance = (currencyBreakdown.current_rand || 0) - (currencyBreakdown.expected_rand || 0);
            
            // Calculate adjusted variance EXCLUDING transfers (transfers are intentional money movements, not surplus/deficit)
            const adjustedZigVariance = zigVariance - (currencyBreakdown.transfer_zig || 0);
            const adjustedUsdVariance = usdVariance - (currencyBreakdown.transfer_usd || 0);
            const adjustedRandVariance = randVariance - (currencyBreakdown.transfer_rand || 0);
            
            shop_status.cash_flow = {
              ...shop_status.cash_flow,
              ...currencyBreakdown,
              zig_variance: adjustedZigVariance,
              usd_variance: adjustedUsdVariance,
              rand_variance: adjustedRandVariance,
              // Recalculate total from currency breakdown (excluding transfers for variance)
              total_expected_cash: (currencyBreakdown.expected_zig || 0) + (currencyBreakdown.expected_usd || 0) + (currencyBreakdown.expected_rand || 0),
              total_current_cash: (currencyBreakdown.current_zig || 0) + (currencyBreakdown.current_usd || 0) + (currencyBreakdown.current_rand || 0),
              variance: adjustedZigVariance + adjustedUsdVariance + adjustedRandVariance,
            };
          }'''
    
    # Replace the old section with the new section
    new_content = content[:start_idx] + new_section + content[end_idx:]
    
    # Write the modified content back
    with open('LuminaN/screens/OwnerDashboardScreen.js', 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print('SUCCESS: File updated with transfer money validation fix!')
else:
    print('ERROR: Search text not found')
