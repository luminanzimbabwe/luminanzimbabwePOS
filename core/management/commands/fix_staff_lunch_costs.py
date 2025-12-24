from django.core.management.base import BaseCommand
from decimal import Decimal
from core.models import StaffLunch

class Command(BaseCommand):
    help = 'Recalculate total_cost for all existing staff lunch records'

    def handle(self, *args, **options):
        lunches = StaffLunch.objects.all()
        updated_count = 0

        self.stdout.write(f'Found {lunches.count()} total staff lunch records')

        for lunch in lunches:
            old_cost = lunch.total_cost
            new_cost = Decimal(str(lunch.product.price)) * Decimal(str(lunch.quantity))
            self.stdout.write(f'Lunch {lunch.id}: {lunch.product.name} (price: ${lunch.product.price}) x{lunch.quantity} = ${new_cost} (was: ${old_cost})')

            # Use update to avoid any model save issues
            StaffLunch.objects.filter(id=lunch.id).update(total_cost=new_cost)
            updated_count += 1

            # Verify the update worked
            updated_lunch = StaffLunch.objects.get(id=lunch.id)
            self.stdout.write(f'  -> Updated to: ${updated_lunch.total_cost}')

        self.stdout.write(self.style.SUCCESS(f'Updated total_cost for {updated_count} staff lunch records'))