from django.core.management.base import BaseCommand
from core.models import Product

class Command(BaseCommand):
    help = 'Set all product prices to zero'

    def handle(self, *args, **options):
        products = Product.objects.all()
        updated_count = 0
        for product in products:
            if product.price != 0:
                product.price = 0
                product.save()
                updated_count += 1
        self.stdout.write(
            self.style.SUCCESS(f'Successfully set {updated_count} product prices to zero')
        )