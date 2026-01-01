#!/usr/bin/env python3
"""
Targeted search for app storage files
"""

import json
import os
import sys
from pathlib import Path

def find_app_storage_files():
    """Find potential app storage files"""
    print("Searching for app storage files...")
    
    # Look for files that might contain app data
    target_patterns = [
        "*receiving*",
        "*orders*", 
        "*storage*",
        "*data*",
        "*.json"
    ]
    
    storage_files = []
    for pattern in target_patterns:
        for file_path in Path(".").rglob(pattern):
            if file_path.is_file():
                # Skip node_modules and package files
                if "node_modules" in str(file_path) or "package" in str(file_path).lower():
                    continue
                    
                # Skip very large files (likely not app data)
                try:
                    if file_path.stat().st_size > 1024 * 1024:  # 1MB
                        continue
                except:
                    pass
                    
                storage_files.append(file_path)
    
    print(f"Found {len(storage_files)} potential storage files:")
    for file_path in storage_files:
        try:
            size = file_path.stat().st_size
            print(f"   - {file_path} ({size} bytes)")
        except:
            print(f"   - {file_path} (size unknown)")
    
    return storage_files

def check_specific_storage_content(file_paths):
    """Check content of potential storage files for order data"""
    print("\nChecking for order-related content...")
    
    order_keywords = [
        'receiving',
        'cashier',
        'pending',
        'confirmed',
        'status',
        'createdBy',
        'supplierName',
        'receivingItems'
    ]
    
    for file_path in file_paths:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read().strip()
                
            if not content:
                continue
                
            # Check if content contains order-related keywords
            content_lower = content.lower()
            keyword_matches = [kw for kw in order_keywords if kw in content_lower]
            
            if keyword_matches:
                print(f"\nMATCH FOUND: {file_path}")
                print(f"   Keywords found: {keyword_matches}")
                
                try:
                    data = json.loads(content)
                    if isinstance(data, list):
                        print(f"   Contains {len(data)} items")
                        if len(data) > 0:
                            print(f"   Sample keys: {list(data[0].keys()) if isinstance(data[0], dict) else 'Not a dict'}")
                            
                            # Look for status field
                            for i, item in enumerate(data[:3]):
                                if isinstance(item, dict):
                                    if 'status' in item:
                                        print(f"   Item {i+1} status: '{item['status']}'")
                                    if 'createdBy' in item:
                                        print(f"   Item {i+1} createdBy: '{item['createdBy']}'")
                                        
                    elif isinstance(data, dict):
                        print(f"   Dict with keys: {list(data.keys())}")
                        
                except json.JSONDecodeError:
                    print(f"   Content preview: {content[:200]}...")
                    
        except Exception as e:
            print(f"   Error reading {file_path}: {e}")

def main():
    print("=" * 60)
    print("APP STORAGE FILE SEARCH")
    print("=" * 60)
    
    storage_files = find_app_storage_files()
    
    if storage_files:
        check_specific_storage_content(storage_files)
    else:
        print("No storage files found")
    
    print("\n" + "=" * 60)
    print("SEARCH COMPLETED")

if __name__ == "__main__":
    main()