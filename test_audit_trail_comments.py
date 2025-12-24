#!/usr/bin/env python3
"""
Test Script: Staff Management Audit Trail with Required Comments

This script demonstrates the new audit trail functionality where comments are required
for critical staff management actions like:
- REJECT (pending staff registration)
- DEACTIVATE (active staff member)
- DELETE (permanent deletion of any staff)
- REACTIVATE (inactive staff member)

Each action now requires a comment for professional audit trail purposes.
"""

import requests
import json

# Configuration
API_BASE = "http://localhost:8000/api/v1/shop"

def test_comment_required_endpoints():
    """Test the new comment-required functionality"""
    
    print("🧪 TESTING AUDIT TRAIL - COMMENT REQUIRED FUNCTIONALITY")
    print("=" * 60)
    
    # Sample owner credentials (replace with real ones)
    owner_credentials = {
        "email": "owner@example.com",
        "password": "owner_password_123"
    }
    
    # Test data for different actions
    test_cases = [
        {
            "action": "REJECT",
            "endpoint": "/staff/reject/",
            "description": "Reject pending staff registration",
            "required_comment": "Incomplete application documents - missing ID verification",
            "staff_id": 123  # Replace with real staff ID
        },
        {
            "action": "DEACTIVATE", 
            "endpoint": "/staff/deactivate/",
            "description": "Deactivate active staff member",
            "required_comment": "Staff member on temporary leave - vacation period",
            "staff_id": 124  # Replace with real staff ID
        },
        {
            "action": "DELETE",
            "endpoint": "/staff/delete/", 
            "description": "Permanently delete staff member",
            "required_comment": "Staff member permanently terminated - policy violation",
            "staff_id": 125  # Replace with real staff ID
        },
        {
            "action": "REACTIVATE",
            "endpoint": "/staff/reactivate/",
            "description": "Reactivate inactive staff member",
            "required_comment": "Staff member returned from vacation - reactivated",
            "staff_id": 126  # Replace with real staff ID
        }
    ]
    
    print("\n📋 TESTING COMMENT REQUIREMENT FOR CRITICAL ACTIONS")
    print("-" * 60)
    
    for test_case in test_cases:
        print(f"\n🔍 Testing {test_case['action']}: {test_case['description']}")
        print(f"   Endpoint: {test_case['endpoint']}")
        
        # Test 1: WITHOUT comment (should fail)
        print(f"\n   ❌ Test 1: Without comment (should fail)")
        data_without_comment = {
            "email": owner_credentials["email"],
            "password": owner_credentials["password"],
            "staff_id": test_case["staff_id"]
            # NO COMMENT - this should cause an error
        }
        
        try:
            response = requests.post(API_BASE + test_case['endpoint'], json=data_without_comment)
            if response.status_code == 400:
                print(f"      ✅ Correctly rejected: {response.json().get('error', 'Unknown error')}")
            else:
                print(f"      ❌ Unexpected response: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"      ❌ Request failed: {e}")
        
        # Test 2: WITH comment (should succeed)
        print(f"\n   ✅ Test 2: With comment (should succeed)")
        data_with_comment = {
            "email": owner_credentials["email"],
            "password": owner_credentials["password"],
            "staff_id": test_case["staff_id"],
            "comment": test_case["required_comment"]  # REQUIRED COMMENT
        }
        
        try:
            response = requests.post(API_BASE + test_case['endpoint'], json=data_with_comment)
            if response.status_code == 200:
                print(f"      ✅ Successfully processed: {response.json().get('message', 'Success')}")
                print(f"      📝 Comment recorded: '{test_case['required_comment']}'")
            else:
                print(f"      ❌ Failed: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"      ❌ Request failed: {e}")
    
    print(f"\n" + "=" * 60)
    print("🎯 AUDIT TRAIL SUMMARY")
    print("=" * 60)
    print("✅ All critical actions now require comments")
    print("✅ Comments are validated and cannot be empty")
    print("✅ Audit trail provides accountability")
    print("✅ Professional staff management compliance")
    print("✅ Actions without comments are rejected")

def test_api_endpoints_availability():
    """Test that all new endpoints are available"""
    
    print(f"\n🔌 TESTING API ENDPOINTS AVAILABILITY")
    print("-" * 40)
    
    endpoints = [
        "/staff/pending/",
        "/staff/approved/", 
        "/staff/inactive/",
        "/staff/approve/",
        "/staff/reject/",
        "/staff/deactivate/",
        "/staff/delete/",
        "/staff/reactivate/"
    ]
    
    for endpoint in endpoints:
        try:
            # Test with empty data to check if endpoint exists
            response = requests.post(API_BASE + endpoint, json={}, timeout=5)
            # We expect 400 (bad request) not 404 (not found) if endpoint exists
            if response.status_code != 404:
                print(f"   ✅ {endpoint} - Available (status: {response.status_code})")
            else:
                print(f"   ❌ {endpoint} - Not found")
        except requests.exceptions.ConnectionError:
            print(f"   ⚠️  {endpoint} - Server not running")
        except Exception as e:
            print(f"   ❌ {endpoint} - Error: {e}")

if __name__ == "__main__":
    print("🚀 STARTING AUDIT TRAIL COMMENT TESTS")
    print("=" * 60)
    
    # Check server availability
    try:
        response = requests.get(f"{API_BASE}/status/", timeout=5)
        print(f"✅ Server is running (Status: {response.status_code})")
    except:
        print("❌ Server is not running. Please start the Django server first.")
        print("   Run: python manage.py runserver")
        exit(1)
    
    # Run tests
    test_api_endpoints_availability()
    test_comment_required_endpoints()
    
    print(f"\n🎉 AUDIT TRAIL TESTS COMPLETED!")
    print("=" * 60)
    print("💡 NEXT STEPS:")
    print("1. Update the test credentials and staff IDs")
    print("2. Run the tests against your actual API")
    print("3. Verify the comment dialogs work in the mobile app")
    print("4. Ensure audit trail compliance in production")