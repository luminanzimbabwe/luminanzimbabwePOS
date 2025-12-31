#!/usr/bin/env python3
"""
Simple test to verify cash float and refund functionality
"""
import os
import sys
import django

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from core.models import Cashier, CashierFloat, CashierFloatEntry
from django.utils import timezone
from datetime import date
import requests
import json

def test_refund_functionality():
    print("Testing Cash Float Refund Functionality")
    print("=" * 50)
    
    try:
        # Get a cashier
        cashier = Cashier.objects.filter(is_active=True).first()
        if cashier:
            print(f"Found cashier: {cashier.name} (ID: {cashier.id})")
        else:
            print("No cashiers found in database")
            return
            
        # Test cash float endpoint
        api_url = "http://127.0.0.1:8000/api/cash-float/"
        headers = {"Content-Type": "application/json"}
        
        # Test getting current floats
        response = requests.get(f"{api_url}?cashier={cashier.id}", headers=headers)
        print(f"GET floats status: {response.status_code}")
        
        if response.status_code == 200:
            floats_data = response.json()
            print(f"Current floats count: {len(floats_data) if isinstance(floats_data, list) else 'N/A'}")
        
        # Test refund endpoint
        refund_url = "http://127.0.0.1:8000/api/cash-float/refund/"
        refund_data = {
            "cashier_id": cashier.id,
            "amount": 2.50,
            "reason": "Test refund",
            "reference": "TEST-REFUND-001"
        }
        
        print(f"\nTesting refund with data: {refund_data}")
        refund_response = requests.post(refund_url, json=refund_data, headers=headers)
        print(f"Refund response status: {refund_response.status_code}")
        
        if refund_response.status_code == 200:
            refund_result = refund_response.json()
            print(f"Refund successful: {refund_result}")
        else:
            print(f"Refund failed: {refund_response.text}")
            
    except Exception as e:
        print(f"Error accessing cashier: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_refund_functionality()