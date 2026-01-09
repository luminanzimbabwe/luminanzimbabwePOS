# Generated migration for adding business hours and timezone to ShopConfiguration

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0046_add_cashier_drawer_access'),
    ]

    operations = [
        migrations.AddField(
            model_name='shopconfiguration',
            name='opening_time',
            field=models.TimeField(default='08:00:00', help_text='Shop opening time (e.g., 08:00 for 8:00 AM)'),
        ),
        migrations.AddField(
            model_name='shopconfiguration',
            name='closing_time',
            field=models.TimeField(default='20:00:00', help_text='Shop closing time (e.g., 20:00 for 8:00 PM)'),
        ),
        migrations.AddField(
            model_name='shopconfiguration',
            name='timezone',
            field=models.CharField(default='Africa/Harare', help_text='Business timezone for scheduling and reports', max_length=50),
        ),
        migrations.AddField(
            model_name='shopconfiguration',
            name='vat_rate',
            field=models.DecimalField(decimal_places=2, default=15.00, help_text='VAT rate as percentage (default 15%)', max_digits=5),
        ),
    ]
