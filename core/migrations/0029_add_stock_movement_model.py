# Generated migration for StockMovement model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0028_product_additional_barcodes_alter_product_barcode'),
    ]

    operations = [
        migrations.CreateModel(
            name='StockMovement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('movement_type', models.CharField(choices=[('SALE', 'Sale - Product Sold'), ('RECEIPT', 'Receipt - New Stock Received'), ('ADJUSTMENT', 'Adjustment - Manual Stock Correction'), ('RETURN', 'Return - Customer Return'), ('DAMAGE', 'Damage - Damaged/Spoiled Items'), ('THEFT', 'Theft - Missing Items'), ('TRANSFER', 'Transfer - Stock Movement'), ('STOCKTAKE', 'Stock Take - Physical Count'), ('SUPPLIER_RETURN', 'Supplier Return - Returned to Supplier'), ('EXPIRED', 'Expired - Removed Due to Expiry'), ('OTHER', 'Other - Miscellaneous')], max_length=20)),
                ('transition_type', models.CharField(choices=[('NORMAL', 'Normal Stock Movement'), ('NEGATIVE_TO_POSITIVE', 'Transition from Negative to Positive Stock'), ('POSITIVE_TO_NEGATIVE', 'Transition from Positive to Negative Stock'), ('RESTOCK', 'Restock of Oversold Items'), ('OVERSTOCK_CORRECTION', 'Overstock Correction')], default='NORMAL', max_length=25)),
                ('previous_stock', models.DecimalField(decimal_places=2, help_text='Stock quantity before movement', max_digits=10)),
                ('quantity_change', models.DecimalField(decimal_places=2, help_text='Quantity added or removed (positive for additions)', max_digits=10)),
                ('new_stock', models.DecimalField(decimal_places=2, help_text='Stock quantity after movement', max_digits=10)),
                ('cost_price', models.DecimalField(decimal_places=2, help_text='Cost price at time of movement', max_digits=10)),
                ('total_cost_value', models.DecimalField(decimal_places=2, help_text='Total value of stock movement (quantity × cost_price)', max_digits=12)),
                ('inventory_value_change', models.DecimalField(decimal_places=2, help_text='Change in total inventory value', max_digits=12)),
                ('reference_number', models.CharField(blank=True, help_text='Invoice number, transaction ID, etc.', max_length=100)),
                ('supplier_name', models.CharField(blank=True, help_text='Supplier name for receipts', max_length=255)),
                ('notes', models.TextField(blank=True, help_text='Additional notes about the movement')),
                ('performed_by', models.ForeignKey(blank=True, help_text='Who performed this movement', null=True, on_delete=django.db.models.deletion.SET_NULL, to='core.cashier')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.product')),
                ('shop', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.shopconfiguration')),
            ],
            options={
                'verbose_name': 'Stock Movement',
                'verbose_name_plural': 'Stock Movements',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='stockmovement',
            index=models.Index(fields=['shop', 'product', '-created_at'], name='core_stock_shop_id_product__f0a1b4_idx'),
        ),
        migrations.AddIndex(
            model_name='stockmovement',
            index=models.Index(fields=['movement_type', '-created_at'], name='core_stock_movement__9e4c8d_idx'),
        ),
        migrations.AddIndex(
            model_name='stockmovement',
            index=models.Index(fields=['transition_type', '-created_at'], name='core_stock_transit_7b2e9c_idx'),
        ),
    ]
