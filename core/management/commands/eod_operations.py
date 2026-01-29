"""
Management command for End of Day (EOD) operations.
Allows manual completion of EOD reconciliation, viewing status, and fixing issues.
"""
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from decimal import Decimal
import datetime

from core.models import ShopConfiguration, Cashier, ShopDay
from core.models_reconciliation import CashierCount, ReconciliationSession
from core.models_cashier_archive import CashierCountArchive


class Command(BaseCommand):
    help = 'Manage End of Day (EOD) reconciliation operations'

    def add_arguments(self, parser):
        parser.add_argument(
            'action',
            choices=['status', 'complete', 'reset', 'force-close', 'create-session'],
            help='Action to perform: status, complete, reset, force-close, create-session'
        )
        parser.add_argument(
            '--date',
            type=str,
            help='Date in YYYY-MM-DD format (default: today)'
        )
        parser.add_argument(
            '--cashier',
            type=str,
            help='Cashier name or ID (required for some actions)'
        )
        parser.add_argument(
            '--notes',
            type=str,
            default='',
            help='Notes for the action'
        )

    def handle(self, *args, **options):
        action = options['action']
        date_str = options['date']
        cashier_identifier = options['cashier']
        notes = options['notes']

        # Parse date
        if date_str:
            try:
                target_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                raise CommandError('Invalid date format. Use YYYY-MM-DD')
        else:
            target_date = timezone.now().date()

        # Get shop
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            raise CommandError('No shop configured. Please set up a shop first.')
        except ShopConfiguration.MultipleObjectsReturned:
            shop = ShopConfiguration.objects.first()
            self.stdout.write(self.style.WARNING(f'Multiple shops found, using: {shop.name}'))

        # Get cashier if specified
        cashier = None
        if cashier_identifier:
            try:
                try:
                    cashier = Cashier.objects.get(id=int(cashier_identifier), shop=shop)
                except ValueError:
                    cashier = Cashier.objects.get(name=cashier_identifier, shop=shop)
            except Cashier.DoesNotExist:
                raise CommandError(f'Cashier "{cashier_identifier}" not found')

        # Execute action
        if action == 'status':
            self.show_status(shop, target_date)
        elif action == 'complete':
            self.complete_eod(shop, target_date, cashier, notes)
        elif action == 'reset':
            self.reset_eod(shop, target_date)
        elif action == 'force-close':
            self.force_close_shop(shop, target_date, cashier, notes)
        elif action == 'create-session':
            self.create_session(shop, target_date)

    def show_status(self, shop, date):
        """Show current EOD status"""
        self.stdout.write(self.style.HTTP_INFO(f'\n=== EOD Status for {shop.name} - {date} ===\n'))

        # Get or create session
        session, created = ReconciliationSession.get_or_create_session(shop, date)
        if created:
            self.stdout.write(self.style.WARNING(f'Created new reconciliation session for {date}'))

        self.stdout.write(f"Session Status: {session.get_status_display()}")
        self.stdout.write(f"Started At: {session.started_at or 'Not started'}")
        self.stdout.write(f"Completed At: {session.completed_at or 'Not completed'}")
        
        # Get cashier counts
        counts = CashierCount.objects.filter(shop=shop, date=date)
        self.stdout.write(f"\nCashier Counts: {counts.count()} total")
        self.stdout.write(f"  - In Progress: {counts.filter(status='IN_PROGRESS').count()}")
        self.stdout.write(f"  - Completed: {counts.filter(status='COMPLETED').count()}")
        self.stdout.write(f"  - Reviewed: {counts.filter(status='REVIEWED').count()}")

        # Show each cashier
        if counts.exists():
            self.stdout.write("\nCashier Details:")
            for count in counts:
                variance_str = f"${count.total_variance}" if count.total_variance >= 0 else f"-${abs(count.total_variance)}"
                variance_color = 'SUCCESS' if count.total_variance == 0 else 'WARNING' if abs(count.total_variance) < 5 else 'ERROR'
                self.stdout.write(f"  - {count.cashier.name}: {count.get_status_display()} | "
                                f"Counted: ${count.grand_total} | "
                                f"Variance: ", ending='')
                self.stdout.write(getattr(self.style, variance_color)(variance_str))

        # Shop day status
        try:
            shop_day = ShopDay.objects.get(shop=shop, date=date)
            self.stdout.write(f"\nShop Day Status: {shop_day.get_status_display()}")
            self.stdout.write(f"Opened At: {shop_day.opened_at}")
            if shop_day.closed_at:
                self.stdout.write(f"Closed At: {shop_day.closed_at}")
        except ShopDay.DoesNotExist:
            self.stdout.write(self.style.WARNING(f"\nNo shop day record for {date}"))

        self.stdout.write('')

    def complete_eod(self, shop, date, cashier, notes):
        """Complete EOD reconciliation"""
        self.stdout.write(self.style.HTTP_INFO(f'\n=== Completing EOD for {shop.name} - {date} ===\n'))

        # Get session
        session, created = ReconciliationSession.get_or_create_session(shop, date)
        if created:
            self.stdout.write(self.style.WARNING('Created new session'))

        # Check for incomplete counts
        incomplete_counts = CashierCount.objects.filter(
            shop=shop,
            date=date,
            status='IN_PROGRESS'
        )
        
        if incomplete_counts.exists():
            self.stdout.write(self.style.WARNING(
                f'Warning: {incomplete_counts.count()} cashier counts are still in progress:'
            ))
            for count in incomplete_counts:
                self.stdout.write(f"  - {count.cashier.name}")
            
            # Ask for confirmation
            confirm = input('\nDo you want to complete anyway? (yes/no): ')
            if confirm.lower() != 'yes':
                self.stdout.write(self.style.ERROR('EOD completion cancelled'))
                return

        # Calculate final summary
        session.calculate_session_summary()
        
        # ARCHIVE all cashier counts BEFORE completing (permanent history)
        self.stdout.write('Archiving cashier counts for permanent history...')
        archived = CashierCountArchive.archive_all_counts_for_date(shop, date)
        self.stdout.write(self.style.SUCCESS(f'  ✓ Archived {len(archived)} cashier count records'))
        
        # Complete the session
        session.complete_session(cashier)
        
        # Add closing notes
        if notes:
            session.closing_notes = notes
            session.save()

        self.stdout.write(self.style.SUCCESS(f'\n✓ EOD reconciliation completed successfully!'))
        self.stdout.write(f"Total Variance: ${session.total_variance}")
        self.stdout.write(f"Completed By: {cashier.name if cashier else 'System'}")
        self.stdout.write('')

    def reset_eod(self, shop, date):
        """Reset EOD for a date (dangerous - use with caution)"""
        self.stdout.write(self.style.ERROR(f'\n=== WARNING: Resetting EOD for {shop.name} - {date} ===\n'))
        self.stdout.write(self.style.ERROR('This will delete all cashier counts and reset the reconciliation session!'))
        
        confirm = input('\nType "RESET" to confirm: ')
        if confirm != 'RESET':
            self.stdout.write(self.style.ERROR('Reset cancelled'))
            return

        # Delete cashier counts
        count, _ = CashierCount.objects.filter(shop=shop, date=date).delete()
        self.stdout.write(f'Deleted {count} cashier count records')

        # Reset session
        try:
            session = ReconciliationSession.objects.get(shop=shop, date=date)
            session.status = 'NOT_STARTED'
            session.started_at = None
            session.completed_at = None
            session.started_by = None
            session.completed_by = None
            session.total_expected_cash = 0
            session.total_counted_cash = 0
            session.total_variance = 0
            session.save()
            self.stdout.write('Reset reconciliation session')
        except ReconciliationSession.DoesNotExist:
            pass

        self.stdout.write(self.style.SUCCESS('\n✓ EOD reset completed'))

    def force_close_shop(self, shop, date, cashier, notes):
        """Force close the shop even if reconciliation is incomplete"""
        self.stdout.write(self.style.ERROR(f'\n=== Force Closing Shop for {shop.name} - {date} ===\n'))
        self.stdout.write(self.style.WARNING('This will close the shop without completing reconciliation!'))
        
        confirm = input('\nType "FORCE CLOSE" to confirm: ')
        if confirm != 'FORCE CLOSE':
            self.stdout.write(self.style.ERROR('Force close cancelled'))
            return

        try:
            shop_day = ShopDay.objects.get(shop=shop, date=date)
            if shop_day.status == 'CLOSED':
                self.stdout.write(self.style.WARNING('Shop is already closed'))
                return
            
            shop_day.close_shop(closed_by=cashier, notes=notes or 'Force closed via management command')
            self.stdout.write(self.style.SUCCESS(f'\n✓ Shop force closed successfully'))
        except ShopDay.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'No shop day record found for {date}'))

    def create_session(self, shop, date):
        """Create a new reconciliation session"""
        session, created = ReconciliationSession.get_or_create_session(shop, date)
        if created:
            self.stdout.write(self.style.SUCCESS(f'\n✓ Created new reconciliation session for {date}'))
        else:
            self.stdout.write(self.style.WARNING(f'\nSession already exists for {date}'))
            self.stdout.write(f'Status: {session.get_status_display()}')
