"""
Django management command to reset all cash floats for a specific date.
Use this to fix drawer issues where old money data is showing up in new days.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from decimal import Decimal
from core.models import CashFloat, ShopConfiguration


class Command(BaseCommand):
    help = 'Reset all cash floats for a specific date to zero (useful for fixing drawer issues)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--date',
            type=str,
            help='Date to reset (YYYY-MM-DD format). Defaults to today.',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Reset ALL dates (not just today)',
        )

    def handle(self, *args, **options):
        today = timezone.now().date()
        target_date = options.get('date')
        
        if target_date:
            try:
                target_date = timezone.datetime.strptime(target_date, '%Y-%m-%d').date()
            except ValueError:
                self.stderr.write(self.style.ERROR(f'Invalid date format: {target_date}. Use YYYY-MM-DD'))
                return
        else:
            target_date = today

        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            self.stderr.write(self.style.ERROR('No shop found'))
            return

        if options['all']:
            drawers = CashFloat.objects.filter(shop=shop)
            self.stdout.write(f'Resetting ALL {drawers.count()} cash float records...')
        else:
            drawers = CashFloat.objects.filter(shop=shop, date=target_date)
            self.stdout.write(f'Resetting {drawers.count()} cash float records for {target_date}...')

        reset_count = 0
        for drawer in drawers:
            try:
                # Reset ALL fields to zero
                drawer.status = 'SETTLED'
                
                # Legacy USD fields
                drawer.current_cash = Decimal('0.00')
                drawer.current_card = Decimal('0.00')
                drawer.current_ecocash = Decimal('0.00')
                drawer.current_transfer = Decimal('0.00')
                drawer.current_total = Decimal('0.00')
                
                # Currency-specific current amounts
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
                
                # Session sales
                drawer.session_cash_sales = Decimal('0.00')
                drawer.session_card_sales = Decimal('0.00')
                drawer.session_ecocash_sales = Decimal('0.00')
                drawer.session_transfer_sales = Decimal('0.00')
                drawer.session_total_sales = Decimal('0.00')
                
                # Currency-specific session sales
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
                
                # EOD expectations
                drawer.expected_cash_at_eod = Decimal('0.00')
                
                drawer.save()
                reset_count += 1
                
            except Exception as e:
                self.stderr.write(self.style.WARNING(f'Could not reset drawer for {drawer.cashier.name}: {e}'))

        self.stdout.write(self.style.SUCCESS(f'Successfully reset {reset_count} cash float records'))
        
        if not options['all'] and target_date == today:
            self.stdout.write(self.style.SUCCESS('All drawers are now zeroed. The next sale will start fresh with $0.00'))
