"""
Django management command to immediately reset ALL drawer data for today.
Use this command when the drawer is showing old sales data instead of starting fresh.

Usage:
    python manage.py fix_drawer_today

This will:
1. Clear ALL session sales and current cash amounts for today
2. Set all drawers to start fresh at $0.00
3. Ensure the next sale creates a fresh drawer for today

For complete reset (all dates):
    python manage.py fix_drawer_today --all
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from decimal import Decimal
from core.models import CashFloat, ShopConfiguration, Sale
import datetime


class Command(BaseCommand):
    help = 'Fix drawer issues by clearing all today\'s drawer data to start fresh'

    def add_arguments(self, parser):
        parser.add_argument(
            '--all',
            action='store_true',
            help='Reset ALL dates, not just today',
        )
        parser.add_argument(
            '--verify',
            action='store_true',
            help='Just show what would be reset, without actually resetting',
        )

    def handle(self, *args, **options):
        today = timezone.localdate()
        
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            self.stderr.write(self.style.ERROR('No shop found'))
            return

        if options['all']:
            drawers = CashFloat.objects.filter(shop=shop)
            date_str = 'ALL DATES'
        else:
            drawers = CashFloat.objects.filter(shop=shop, date=today)
            date_str = str(today)

        self.stdout.write(self.style.WARNING(f'🔍 Found {drawers.count()} drawer records for {date_str}'))
        
        if options['verify']:
            self.stdout.write('📋 VERIFICATION MODE - No changes will be made')
            for drawer in drawers:
                total = drawer.session_total_sales_usd + drawer.session_total_sales_zig + drawer.session_total_sales_rand
                self.stdout.write(f'   - {drawer.cashier.name}: ${float(total):.2f} total sales')
            return

        # Reset all drawers
        reset_count = 0
        for drawer in drawers:
            try:
                # Get sales count before resetting
                sales_count = Sale.objects.filter(
                    shop=shop,
                    cashier=drawer.cashier,
                    created_at__date=drawer.date,
                    status='completed'
                ).count()
                
                self.stdout.write(f'🔄 Resetting drawer for {drawer.cashier.name} ({sales_count} sales)')
                
                # Clear all currency fields
                drawer.status = 'SETTLED'
                drawer.current_cash = Decimal('0.00')
                drawer.current_card = Decimal('0.00')
                drawer.current_ecocash = Decimal('0.00')
                drawer.current_transfer = Decimal('0.00')
                drawer.current_total = Decimal('0.00')
                drawer.current_cash_usd = Decimal('0.00')
                drawer.current_cash_zig = Decimal('0.00')
                drawer.current_cash_rand = Decimal('0.00')
                drawer.current_card_usd = Decimal('0.00')
                drawer.current_card_zig = Decimal('0.00')
                drawer.current_card_rand = Decimal('0.00')
                drawer.current_ecocash_usd = Decimal('0.00')
                drawer.current_ecocash_zig = Decimal('0.00')
                drawer.current_ecocash_rand = Decimal('0.00')
                drawer.current_transfer_usd = Decimal('0.00')
                drawer.current_transfer_zig = Decimal('0.00')
                drawer.current_transfer_rand = Decimal('0.00')
                drawer.current_total_usd = Decimal('0.00')
                drawer.current_total_zig = Decimal('0.00')
                drawer.current_total_rand = Decimal('0.00')
                
                # Clear session sales
                drawer.session_cash_sales = Decimal('0.00')
                drawer.session_card_sales = Decimal('0.00')
                drawer.session_ecocash_sales = Decimal('0.00')
                drawer.session_transfer_sales = Decimal('0.00')
                drawer.session_total_sales = Decimal('0.00')
                drawer.session_cash_sales_usd = Decimal('0.00')
                drawer.session_cash_sales_zig = Decimal('0.00')
                drawer.session_cash_sales_rand = Decimal('0.00')
                drawer.session_card_sales_usd = Decimal('0.00')
                drawer.session_card_sales_zig = Decimal('0.00')
                drawer.session_card_sales_rand = Decimal('0.00')
                drawer.session_ecocash_sales_usd = Decimal('0.00')
                drawer.session_ecocash_sales_zig = Decimal('0.00')
                drawer.session_ecocash_sales_rand = Decimal('0.00')
                drawer.session_transfer_sales_usd = Decimal('0.00')
                drawer.session_transfer_sales_zig = Decimal('0.00')
                drawer.session_transfer_sales_rand = Decimal('0.00')
                drawer.session_total_sales_usd = Decimal('0.00')
                drawer.session_total_sales_zig = Decimal('0.00')
                drawer.session_total_sales_rand = Decimal('0.00')
                
                # Clear EOD expectations
                drawer.expected_cash_at_eod = Decimal('0.00')
                drawer.expected_cash_usd = Decimal('0.00')
                drawer.expected_cash_zig = Decimal('0.00')
                drawer.expected_cash_rand = Decimal('0.00')
                
                drawer.save()
                reset_count += 1
                
            except Exception as e:
                self.stderr.write(self.style.WARNING(f'⚠️ Could not reset drawer for {drawer.cashier.name}: {e}'))

        self.stdout.write(self.style.SUCCESS(f'✅ Successfully reset {reset_count} drawer records'))
        
        if not options['all']:
            self.stdout.write(self.style.SUCCESS(f'📝 All drawers for {today} are now at $0.00'))
            self.stdout.write(self.style.SUCCESS(f'💡 The next sale will create fresh drawer data starting at $0.00'))
        else:
            self.stdout.write(self.style.SUCCESS(f'📝 ALL drawer records have been cleared to $0.00'))
