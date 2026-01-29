# Generated migration for CashierCount detailed denominations

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0056_add_amount_received_to_sale_payment'),
    ]

    operations = [
        # USD Denominations
        migrations.AddField(
            model_name='cashiercount',
            name='usd_100',
            field=models.PositiveIntegerField(default=0, help_text='$100 bills'),
        ),
        migrations.AddField(
            model_name='cashiercount',
            name='usd_50',
            field=models.PositiveIntegerField(default=0, help_text='$50 bills'),
        ),
        migrations.AddField(
            model_name='cashiercount',
            name='usd_20',
            field=models.PositiveIntegerField(default=0, help_text='$20 bills'),
        ),
        migrations.AddField(
            model_name='cashiercount',
            name='usd_10',
            field=models.PositiveIntegerField(default=0, help_text='$10 bills'),
        ),
        migrations.AddField(
            model_name='cashiercount',
            name='usd_5',
            field=models.PositiveIntegerField(default=0, help_text='$5 bills'),
        ),
        migrations.AddField(
            model_name='cashiercount',
            name='usd_2',
            field=models.PositiveIntegerField(default=0, help_text='$2 bills'),
        ),
        migrations.AddField(
            model_name='cashiercount',
            name='usd_1',
            field=models.PositiveIntegerField(default=0, help_text='$1 bills'),
        ),
        # ZIG Denominations
        migrations.AddField(
            model_name='cashiercount',
            name='zig_100',
            field=models.PositiveIntegerField(default=0, help_text='ZIG 100'),
        ),
        migrations.AddField(
            model_name='cashiercount',
            name='zig_50',
            field=models.PositiveIntegerField(default=0, help_text='ZIG 50'),
        ),
        migrations.AddField(
            model_name='cashiercount',
            name='zig_20',
            field=models.PositiveIntegerField(default=0, help_text='ZIG 20'),
        ),
        migrations.AddField(
            model_name='cashiercount',
            name='zig_10',
            field=models.PositiveIntegerField(default=0, help_text='ZIG 10'),
        ),
        migrations.AddField(
            model_name='cashiercount',
            name='zig_5',
            field=models.PositiveIntegerField(default=0, help_text='ZIG 5'),
        ),
        migrations.AddField(
            model_name='cashiercount',
            name='zig_2',
            field=models.PositiveIntegerField(default=0, help_text='ZIG 2'),
        ),
        migrations.AddField(
            model_name='cashiercount',
            name='zig_1',
            field=models.PositiveIntegerField(default=0, help_text='ZIG 1'),
        ),
        # Transfer and Card Amounts
        migrations.AddField(
            model_name='cashiercount',
            name='total_transfer',
            field=models.DecimalField(decimal_places=2, default=0, help_text='Total transfer payments (all currencies)', max_digits=12),
        ),
        migrations.AddField(
            model_name='cashiercount',
            name='total_card_amount',
            field=models.DecimalField(decimal_places=2, default=0, help_text='Total card payments (all currencies)', max_digits=12),
        ),
        # Currency-specific totals
        migrations.AddField(
            model_name='cashiercount',
            name='total_cash_usd',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name='cashiercount',
            name='total_cash_zig',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
    ]
