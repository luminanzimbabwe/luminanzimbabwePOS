#!/usr/bin/env python
"""
Script to fix the existing staff lunch financial discrepancy
The issue: Wallet withdrawals ($357) > StaffLunch records ($210) = $147 difference
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from django.db.models import Sum
from core.models import (
    ShopConfiguration, StaffLunch, CurrencyWallet, 
    CurrencyTransaction, CashFloat, Sale, Expense
)

def fix_staff_lunch_financials():
    print("=" * 80)
    print("FIXING STAFF LUNCH FINANCIAL DISCREPANCY")
    print("=" * 80)
    
    shop = ShopConfiguration.objects.get()
    today = timezone.now().date()
    
    # Get all wallet withdrawals for staff lunch
    staff_lunch_wallet_txs = CurrencyTransaction.objects.filter(
        shop=shop,
        transaction_type='WITHDRAWAL',
        description__icontains='Staff Lunch'
    ).order_by('created_at')
    
    # Get all StaffLunch records (money lunches only)
    staff_lunches = StaffLunch.objects.filter(
        shop=shop,
        product=None,  # Money lunches only
        created_at__date=today
    )
    
    # Build a lookup of transaction descriptions to StaffLunch IDs
    lunch_lookup = {}
    for lunch in staff_lunches:
        # Extract amount and staff name from notes
        notes = lunch.notes
        # Format: "MONEY LUNCH - Staff: isaac, Amount: $100.00, Reason: lunch break"
        if 'MONEY LUNCH' in notes:
            # Create a key based on amount and approximate time
            amount_str = f"${float(lunch.total_cost):.2f}"
            time_key = lunch.created_at.strftime('%H:%M')
            key = f"{amount_str}_{time_key}"
            lunch_lookup[key] = lunch.id
    
    print(f"\nFound {len(staff_lunch_wallet_txs)} wallet transactions")
    print(f"Found {len(staff_lunches)} StaffLunch records")
    print(f"Lunch lookup keys: {list(lunch_lookup.keys())}")
    
    # Find transactions that don't have matching StaffLunch records
    unmatched_txs = []
    for tx in staff_lunch_wallet_txs:
        desc = tx.description
        # Format: "Staff Lunch - isaac: lunch break"
        
        # Try to match based on amount
        amount_key = f"${float(tx.amount):.2f}"
        
        # Try to find approximate time match
        time_key = tx.created_at.strftime('%H:%M')
        full_key = f"{amount_key}_{time_key}"
        
        if full_key not in lunch_lookup:
            unmatched_txs.append({
                'id': tx.id,
                'description': desc,
                'amount': tx.amount,
                'time': tx.created_at
            })
    
    print(f"\nUnmatched transactions: {len(unmatched_txs)}")
    
    if unmatched_txs:
        print("\nUnmatched transactions:")
        for tx in unmatched_txs:
            print(f"  - {tx['id']}: ${float(tx['amount']):.2f} - {tx['description']} at {tx['time']}")
        
        # Calculate total unmatched amount
        unmatched_total = sum(tx['amount'] for tx in unmatched_txs)
        print(f"\nTotal unmatched amount: ${float(unmatched_total):.2f}")
        
        # Option 1: Create StaffLunch records for unmatched transactions
        print("\n" + "=" * 80)
        print("CREATING STAFFLUNCH RECORDS FOR UNMATCHED TRANSACTIONS")
        print("=" * 80)
        
        for tx in unmatched_txs:
            # Extract staff name from description
            desc = tx['description']
            # Format: "Staff Lunch - isaac: lunch break"
            if 'Staff Lunch - ' in desc:
                parts = desc.replace('Staff Lunch - ', '').split(':')
                staff_name = parts[0].strip() if parts else 'unknown'
                reason = parts[1].strip() if len(parts) > 1 else 'Unknown reason'
            else:
                staff_name = 'unknown'
                reason = desc
            
            # Create StaffLunch record
            lunch = StaffLunch.objects.create(
                shop=shop,
                product=None,  # Money lunch
                quantity=1,
                total_cost=tx['amount'],
                notes=f"MONEY LUNCH - Staff: {staff_name}, Amount: ${float(tx['amount']):.2f}, Reason: {reason} [AUTO-CREATED FROM WALLET TX #{tx['id']}]",
                recorded_by=None
            )
            print(f"Created StaffLunch ID {lunch.id} for wallet TX #{tx['id']}: ${float(tx['amount']):.2f}")
        
        print(f"\nCreated {len(unmatched_txs)} StaffLunch records")
    
    # Verify the fix
    print("\n" + "=" * 80)
    print("VERIFICATION")
    print("=" * 80)
    
    staff_lunches = StaffLunch.objects.filter(
        shop=shop,
        product=None,  # Money lunches only
        created_at__date=today
    )
    
    wallet_total = staff_lunch_wallet_txs.aggregate(total=Sum('amount'))['total'] or Decimal('0')
    lunch_total = staff_lunches.aggregate(total=Sum('total_cost'))['total'] or Decimal('0')
    
    print(f"Wallet withdrawals for staff lunch: ${float(wallet_total):.2f}")
    print(f"StaffLunch total: ${float(lunch_total):.2f}")
    print(f"Difference: ${float(wallet_total - lunch_total):.2f}")
    
    if wallet_total == lunch_total:
        print("\n✅ FIXED: Wallet and StaffLunch totals now match!")
    else:
        print(f"\n⚠️ Still have a difference of ${float(wallet_total - lunch_total):.2f}")
    
    return True

if __name__ == '__main__':
    fix_staff_lunch_financials()
