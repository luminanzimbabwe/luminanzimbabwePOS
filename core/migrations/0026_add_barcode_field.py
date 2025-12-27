# Generated migration for adding additional_barcodes field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0025_product_is_active'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='additional_barcodes',
            field=models.JSONField(default=list, blank=True, help_text='Additional barcodes for the same product (supports multiple barcodes per product)'),
        ),
    ]