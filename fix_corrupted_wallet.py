"""
Script to fix corrupted wallet balance from staff lunch deductions.
This resets the wallet balance to 0 since staff lunches should NOT affect the wallet.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from core.models import ShopConfiguration, CurrencyWallet, CurrencyTransaction

def fix_wallet_balance():
    """Reset wallet balance to 0 since it was corrupted by staff lunch deductions"""
    
    try:
        shop = ShopConfiguration.objects.get()
        print(f"Found shop: {shop.name}")
        
        # Get or create wallet
        wallet, created = CurrencyWallet.objects.get_or_create(shop=shop)
        print(f"Wallet found - Current balance_usd: ${wallet.balance_usd}")
        
        if wallet.balance_usd < 0:
            print(f"\n⚠️  Wallet has NEGATIVE balance: ${wallet.balance_usd}")
            print("This was caused by staff lunch deductions incorrectly affecting the wallet.")
            print("Staff lunch should only affect the drawer, not the wallet.")
            
            # Reset wallet balance to 0
            old_balance = float(wallet.balance_usd)
            wallet.balance_usd = 0
            wallet.save()
            
            print(f"\n✅ Wallet balance reset: ${old_balance} -> $0.00")
            
            # Log this fix
            print("\n📝 Wallet transactions will still show the incorrect withdrawals,")
            print("but the current balance is now correct at $0.00")
            print("\nTo see accurate wallet history, check CurrencyTransaction records.")
        else:
            print(f"Wallet balance is already correct: ${wallet.balance_usd}")
            
    except ShopConfiguration.DoesNotExist:
        print("❌ No shop found!")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == '__main__':
    fix_wallet_balance()
