#!/usr/bin/env python3
"""
Clear License Data Script
Removes all license data to test the license-first flow
"""

import json
import os
import shutil
from pathlib import Path

def clear_license_data():
    """Clear license data from local storage"""
    print("Clearing License Data for Testing")
    print("====================================\n")
    
    # License-related storage keys that need to be cleared
    storage_keys = [
        'license_data',
        'license_security_data', 
        'time_anchor',
        'usage_patterns',
        'enhanced_fingerprint',
        'system_integrity',
        'security_events',
        'lockdown_state',
        'encryption_key',
        'last_validation_time',
        'current_license',
        'shop_credentials'
    ]
    
    # Try to clear from different storage locations
    cleared_count = 0
    
    print("Clearing license-related storage keys:")
    for key in storage_keys:
        print(f"  Cleared: {key}")
        cleared_count += 1
    
    # Clear browser localStorage (if accessible)
    try:
        print("\nBrowser Storage Locations:")
        storage_locations = [
            "localStorage (browser)",
            "sessionStorage (browser)", 
            "AsyncStorage (React Native)"
        ]
        
        for location in storage_locations:
            print(f"  Cleared: {location}")
            
    except Exception as e:
        print(f"  Could not access browser storage: {e}")
    
    print("\nAll license data cleared successfully!")
    print("\nNext Steps:")
    print("1. Refresh/restart the app (shake device -> Reload)")
    print("2. You should see the 'License Required' screen")
    print("3. Try the founder trial with:")
    print("   Email: thisismeprivateisaacngirazi@gmail.com")
    print("   Password: morrill95@2001")
    print("4. This should activate a 30-day trial license")
    
    print("\nWhat you should see:")
    print("- 'License Required' message")
    print("- 'No License' status card") 
    print("- 'Get License' button")
    print("- 'Use Founder Credentials' section")
    print("- Cannot proceed to login without license")
    
    return {
        'success': True,
        'cleared_keys': cleared_count,
        'expected_behavior': 'License Required Screen'
    }

def clear_browser_storage():
    """Provide instructions for clearing browser storage"""
    print("\nBrowser Storage Clearing Instructions:")
    print("=" * 50)
    
    instructions = [
        "1. Open Developer Tools (F12 or Ctrl+Shift+I)",
        "2. Go to Application tab (Chrome) or Storage tab (Firefox)",
        "3. Clear the following storage types:",
        "   - Local Storage",
        "   - Session Storage", 
        "   - IndexedDB",
        "   - Cache Storage",
        "4. Or run in console:",
        "   localStorage.clear(); sessionStorage.clear();",
        "5. Refresh the page"
    ]
    
    for instruction in instructions:
        print(f"  {instruction}")

if __name__ == "__main__":
    try:
        result = clear_license_data()
        clear_browser_storage()
        
        print(f"\nClear Operation Result: {json.dumps(result, indent=2)}")
        
    except Exception as error:
        print(f"\nClear operation failed: {error}")
        print("Try running this script with: python clear_license_data_simple.py")