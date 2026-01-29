"""
Migration to create CashierCountArchive and CashierPerformanceSummary models
"""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0060_cashiercount_cash_variance_rand_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='CashierCountArchive',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('cashier_name', models.CharField(help_text='Cashier name at time of count', max_length=255)),
                ('date', models.DateField()),
                ('shop_day_id', models.IntegerField(blank=True, help_text='Reference to ShopDay if available', null=True)),
                ('total_cash', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('total_cash_usd', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('total_cash_zig', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('total_cash_rand', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('total_card', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('total_ecocash', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('grand_total', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('expected_cash', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('expected_cash_usd', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('expected_cash_zig', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('expected_cash_rand', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('expected_card', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('expected_ecocash', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('cash_variance', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('total_variance', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('status', models.CharField(choices=[('BALANCED', 'Balanced'), ('SHORTAGE', 'Shortage'), ('OVER', 'Over')], default='BALANCED', max_length=20)),
                ('denominations_snapshot', models.JSONField(default=dict, help_text='JSON of all denominations counted')),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('archived_at', models.DateTimeField(auto_now_add=True, help_text='When this record was archived')),
                ('cashier', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='core.cashier')),
                ('shop', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.shopconfiguration')),
            ],
            options={
                'verbose_name': 'Cashier Count Archive',
                'verbose_name_plural': 'Cashier Count Archives',
                'ordering': ['-date', '-archived_at'],
            },
        ),
        migrations.CreateModel(
            name='CashierPerformanceSummary',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('cashier_name', models.CharField(max_length=255)),
                ('year', models.IntegerField()),
                ('month', models.IntegerField()),
                ('total_counts', models.IntegerField(default=0)),
                ('balanced_count', models.IntegerField(default=0)),
                ('shortage_count', models.IntegerField(default=0)),
                ('over_count', models.IntegerField(default=0)),
                ('total_shortage_amount', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('total_over_amount', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('balance_rate', models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ('reliability_score', models.DecimalField(decimal_places=2, default=100, max_digits=5)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('cashier', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='core.cashier')),
                ('shop', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.shopconfiguration')),
            ],
            options={
                'verbose_name': 'Cashier Performance Summary',
                'verbose_name_plural': 'Cashier Performance Summaries',
                'ordering': ['-year', '-month', 'cashier_name'],
                'unique_together': {('shop', 'cashier', 'year', 'month')},
            },
        ),
        migrations.AddIndex(
            model_name='cashiercountarchive',
            index=models.Index(fields=['shop', 'date'], name='core_cashie_shop_id_f81286_idx'),
        ),
        migrations.AddIndex(
            model_name='cashiercountarchive',
            index=models.Index(fields=['cashier', 'date'], name='core_cashie_cashier_0c3a0e_idx'),
        ),
        migrations.AddIndex(
            model_name='cashiercountarchive',
            index=models.Index(fields=['status'], name='core_cashie_status_b5f88c_idx'),
        ),
    ]
