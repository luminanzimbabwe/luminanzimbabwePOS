#!/usr/bin/env python3
import requests
import json

def debug_wastage_api():
    try:
        print("🔍 Testing wastages API...")
        
        # Test wastages summary endpoint
        summary_response = requests.get('http://localhost:8000/api/v1/shop/wastes/summary/')
        print(f"📊 Summary Status Code: {summary_response.status_code}")
        print(f"📊 Summary Response: {json.dumps(summary_response.json(), indent=2)}")
        
        # Test wastages list endpoint  
        list_response = requests.get('http://localhost:8000/api/v1/shop/wastes/')
        print(f"📋 List Status Code: {list_response.status_code}")
        print(f"📋 List Response: {json.dumps(list_response.json(), indent=2)}")
        
        # Parse the data structure
        summary_data = summary_response.json()
        list_data = list_response.json()
        
        print("🔍 Summary data structure:")
        print(f"  - hasSuccess: {'success' in summary_data}")
        print(f"  - hasSummary: {'summary' in summary_data}")
        if 'summary' in summary_data:
            print(f"  - summaryFields: {list(summary_data['summary'].keys())}")
        
        print("🔍 List data structure:")
        print(f"  - hasSuccess: {'success' in list_data}")
        print(f"  - hasWastes: {'wastes' in list_data}")
        if 'wastes' in list_data:
            print(f"  - wasteCount: {len(list_data['wastes'])}")
        
        # Calculate what the frontend should display
        wastages_impact = {
            'totalCost': summary_data.get('summary', {}).get('total_waste_value', 0),
            'totalItems': summary_data.get('summary', {}).get('waste_count', 0),
            'details': list_data.get('wastes', [])[:5]
        }
        
        print("💰 Calculated wastages impact:")
        print(f"  - totalCost: {wastages_impact['totalCost']}")
        print(f"  - totalItems: {wastages_impact['totalItems']}")
        print(f"  - detailsCount: {len(wastages_impact['details'])}")
        
    except Exception as error:
        print(f"❌ Error testing API: {error}")

if __name__ == "__main__":
    debug_wastage_api()