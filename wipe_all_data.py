#!/usr/bin/env python
"""
Script to completely wipe all data and start fresh.
This will delete ALL data from the database - use with caution!
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
sys.path.append(os.path.dirname(__file__))
django.setup()

from core.models import (
    ShopConfiguration, Cashier, Product, Sale, SaleItem, Customer, Discount,
    Shift, Expense, StaffLunch, StockTake, StockTakeItem, InventoryLog,
    StockTransfer, Waste, WasteBatch, ShopDay, CurrencyWallet, CurrencyTransaction,
    SalePayment
)

def wipe_all_data():
    """Completely wipe all data from the database"""
    print("🗑️ Starting complete data wipe...")

    try:
        # Delete in order to handle foreign key constraints
        print("Deleting SalePayments...")
        SalePayment.objects.all().delete()

        print("Deleting SaleItems...")
        SaleItem.objects.all().delete()

        print("Deleting Sales...")
        Sale.objects.all().delete()

        print("Deleting CurrencyTransactions...")
        CurrencyTransaction.objects.all().delete()

        print("Deleting CurrencyWallets...")
        CurrencyWallet.objects.all().delete()

        print("Deleting StaffLunches...")
        StaffLunch.objects.all().delete()

        print("Deleting Expenses...")
        Expense.objects.all().delete()

        print("Deleting Shifts...")
        Shift.objects.all().delete()

        print("Deleting StockTakeItems...")
        StockTakeItem.objects.all().delete()

        print("Deleting StockTakes...")
        StockTake.objects.all().delete()

        print("Deleting InventoryLogs...")
        InventoryLog.objects.all().delete()

        print("Deleting StockTransfers...")
        StockTransfer.objects.all().delete()

        print("Deleting WasteBatches...")
        WasteBatch.objects.all().delete()

        print("Deleting Wastes...")
        Waste.objects.all().delete()

        print("Deleting ShopDays...")
        ShopDay.objects.all().delete()

        print("Deleting Discounts...")
        Discount.objects.all().delete()

        print("Deleting Customers...")
        Customer.objects.all().delete()

        print("Deleting Products...")
        Product.objects.all().delete()

        print("Deleting Cashiers...")
        Cashier.objects.all().delete()

        print("Deleting ShopConfiguration...")
        ShopConfiguration.objects.all().delete()

        print("✅ All data has been completely wiped!")
        print("You can now start fresh with a completely clean database.")

    except Exception as e:
        print(f"❌ Error during data wipe: {str(e)}")
        return False

    return True

if __name__ == '__main__':
    print("⚠️ WARNING: This will delete ALL data permanently!")
    print("Are you sure you want to continue? (This action cannot be undone)")
    print("")

    # In a real script, you'd want user confirmation, but for automation:
    confirm = input("Type 'YES' to confirm complete data wipe: ")
    if confirm.upper() == 'YES':
        wipe_all_data()
    else:
        print("Data wipe cancelled.")