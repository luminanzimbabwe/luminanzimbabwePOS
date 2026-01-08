#!/usr/bin/env python3
"""
Generate a secure Django secret key for production
"""

import secrets
import string

def generate_secret_key():
    """Generate a secure Django secret key"""
    # Django secret key consists of 50 characters from a specific set
    chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*(-_=+)'
    
    # Generate a 50-character secret key
    secret_key = ''.join(secrets.choice(chars) for i in range(50))
    
    print("Generated Production Secret Key:")
    print("=" * 60)
    print(secret_key)
    print("=" * 60)
    
    return secret_key

if __name__ == "__main__":
    key = generate_secret_key()
    print(f"\nUse this key in your .env file:")
    print(f"SECRET_KEY={key}")