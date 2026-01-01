#!/usr/bin/env python3
"""
Debug script to check local storage data for the POS app
Specifically looking for cashier receiving records and order data
"""

import json
import os
import sys
from pathlib import Path

def check_storage_files():
    """Check for storage files in the app directory"""
    print("Checking for storage files...")
    
    # Check in current directory and subdirectories
    storage_patterns = [
        "*.json",
        "*storage*",
        "*receiving*",
        "*orders*",
        "*data*"
    ]
    
    storage_files = []
    for pattern in storage_patterns:
        for file_path in Path(".").rglob(pattern):
            if file_path.is_file() and file_path.suffix == '.json':
                storage_files.append(file_path)
    
    print(f"Found {len(storage_files)} potential storage files:")
    for file_path in storage_files:
        print(f"   - {file_path}")
    
    return storage_files

def check_json_files_content(file_paths):
    """Check the content of JSON files"""
    print("\nChecking JSON file contents...")
    
    for file_path in file_paths:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read().strip()
                
            if not content:
                print(f"   FILE {file_path}: EMPTY")
                continue
                
            try:
                data = json.loads(content)
                print(f"   FILE {file_path}: {type(data).__name__} with {len(data) if isinstance(data, (list, dict)) else 'N/A'} items")
                
                # If it's a list or dict, show a sample of the structure
                if isinstance(data, list) and len(data) > 0:
                    print(f"      Sample item keys: {list(data[0].keys()) if isinstance(data[0], dict) else 'Not a dict'}")
                    # Look for order-related data
                    for i, item in enumerate(data[:3]):  # Check first 3 items
                        if isinstance(item, dict):
                            if 'status' in item:
                                print(f"      Item {i+1} status: {item.get('status')}")
                            if 'createdBy' in item:
                                print(f"      Item {i+1} createdBy: {item.get('createdBy')}")
                            if 'receivingItems' in item:
                                print(f"      Item {i+1} has {len(item.get('receivingItems', []))} receiving items")
                                
                elif isinstance(data, dict):
                    print(f"      Dict keys: {list(data.keys())}")
                    
            except json.JSONDecodeError as e:
                print(f"   ERROR {file_path}: Invalid JSON - {e}")
                
        except Exception as e:
            print(f"   ERROR {file_path}: Error reading - {e}")

def main():
    print("Storage Debug Check Starting...")
    print("=" * 50)
    
    # Check for storage files
    storage_files = check_storage_files()
    
    if storage_files:
        check_json_files_content(storage_files)
    else:
        print("ERROR: No JSON storage files found")
    
    print("\n" + "=" * 50)
    print("Debug check completed")

if __name__ == "__main__":
    main()