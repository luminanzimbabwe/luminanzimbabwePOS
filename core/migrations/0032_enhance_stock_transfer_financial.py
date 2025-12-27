# Generated migration to enhance StockTransfer model with financial tracking

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0031_stocktransfer_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='stocktransfer',
            name='shrinkage_quantity',
            field=models.DecimalField(decimal_places=2, default=0, help_text='Quantity lost due to shrinkage, damage, or processing loss', max_digits=10),
        ),
        migrations.AddField(
            model_name='stocktransfer',
            name='shrinkage_value',
            field=models.DecimalField(decimal_places=2, default=0, help_text='Financial value of shrinkage', max_digits=10),
        ),
        migrations.AddField(
            model_name='stocktransfer',
            name='from_product_cost',
            field=models.DecimalField(decimal_places=2, default=0, help_text='Cost of source products', max_digits=10),
        ),
        migrations.AddField(
            model_name='stocktransfer',
            name='to_product_cost',
            field=models.DecimalField(decimal_places=2, default=0, help_text='Cost of destination products', max_digits=10),
        ),
        migrations.AddField(
            model_name='stocktransfer',
            name='net_inventory_value_change',
            field=models.DecimalField(decimal_places=2, default=0, help_text='Change in total inventory value', max_digits=12),
        ),
    ]
