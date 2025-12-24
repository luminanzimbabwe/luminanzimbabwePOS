#!/usr/bin/env python
"""
Simple test to view audit trail data
"""
import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from core.models import InventoryLog, Product, ShopConfiguration
from django.db import models

def view_audit_trail():
    try:
        # Get the shop
        shop = ShopConfiguration.objects.get()
        print(f"Shop: {shop.name}")
        
        # Get audit trail entries
        audit_logs = InventoryLog.objects.filter(shop=shop).order_by('-created_at')[:10]
        
        if not audit_logs.exists():
            print("\nNo audit trail entries found.")
            print("This means either:")
            print("1. No stock movements have been recorded yet")
            print("2. The audit trail system is not capturing the movements")
            return
        
        print(f"\n=== AUDIT TRAIL REPORT ===")
        print(f"Found {audit_logs.count()} audit entries")
        print("\nRecent Stock Movements:")
        print("-" * 80)
        
        for log in audit_logs:
            print(f"ID: {log.id}")
            print(f"Product: {log.product.name}")
            print(f"Reason: {log.reason_code} - {get_reason_description(log.reason_code)}")
            print(f"Change: {log.quantity_change:+.2f} units")
            print(f"From: {log.previous_quantity} → To: {log.new_quantity}")
            print(f"Reference: {log.reference_number or 'N/A'}")
            print(f"Notes: {log.notes or 'N/A'}")
            print(f"By: {log.performed_by.name if log.performed_by else 'System'}")
            print(f"Date: {log.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"Cost Price: ${log.cost_price or 0}")
            print("-" * 80)
            
    except Exception as e:
        print(f"Error viewing audit trail: {e}")

def get_reason_description(reason_code):
    """Get human-readable description for reason codes"""
    descriptions = {
        'RECEIPT': 'Stock Receipt (New Delivery)',
        'SALE': 'Stock Sale (Product Sold)',
        'RETURN': 'Customer Return',
        'ADJUSTMENT': 'Manual Adjustment',
        'DAMAGE': 'Damage/Spoilage',
        'THEFT': 'Theft/Loss',
        'TRANSFER': 'Transfer between locations',
        'STOCKTAKE': 'Physical Count Adjustment',
        'SUPPLIER_RETURN': 'Returned to Supplier',
        'EXPIRED': 'Expired Items',
        'OTHER': 'Miscellaneous'
    }
    return descriptions.get(reason_code, reason_code)

if __name__ == "__main__":
    view_audit_trail()