from django.core.management.base import BaseCommand
from core.models import Product, ShopConfiguration

class Command(BaseCommand):
    help = 'Fix products with $0.00 cost prices to enable proper shrinkage tracking'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be changed without making changes',
        )
        parser.add_argument(
            '--percentage',
            type=float,
            default=0.4,
            help='Cost price as percentage of selling price (default: 40%)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        cost_percentage = options['percentage'] / 100
        
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            self.stdout.write(self.style.ERROR('No shop configuration found'))
            return

        # Find products with $0.00 cost price
        zero_cost_products = Product.objects.filter(shop=shop, cost_price=0)
        
        if not zero_cost_products.exists():
            self.stdout.write(self.style.SUCCESS('All products already have cost prices set'))
            return

        self.stdout.write(self.style.WARNING(f'Found {zero_cost_products.count()} products with $0.00 cost price'))
        
        for product in zero_cost_products:
            if product.price > 0:
                suggested_cost = product.price * cost_percentage
                if dry_run:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'DRY RUN: Would set {product.name} cost price to ${suggested_cost:.2f} '
                            f'(40% of selling price ${product.price:.2f})'
                        )
                    )
                else:
                    product.cost_price = suggested_cost
                    product.save()
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Set {product.name} cost price to ${suggested_cost:.2f} '
                            f'(40% of selling price ${product.price:.2f})'
                        )
                    )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f'Skipping {product.name} - selling price is $0.00'
                    )
                )

        if not dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f'\n✅ Fixed cost prices for shrinkage tracking!\n'
                    f'These products will now show real financial impact during transfers.'
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    f'\n🔍 DRY RUN COMPLETE\n'
                    f'Run without --dry-run to apply these changes.'
                )
            )
