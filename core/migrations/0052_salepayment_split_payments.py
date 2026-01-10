"""
Migration for SalePayment model - supports split payments (ZIG + USD for same product)
"""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0051_stafflunch_cashier'),
    ]

    operations = [
        # Add pending_payment status to Sale model
        migrations.AlterField(
            model_name='sale',
            name='status',
            field=models.CharField(
                max_length=20,
                default='completed',
                choices=[
                    ('pending', 'Pending Confirmation'),
                    ('pending_payment', 'Pending Payment'),
                    ('completed', 'Completed'),
                    ('refunded', 'Refunded')
                ]
            ),
        ),
        
        # Create SalePayment model
        migrations.CreateModel(
            name='SalePayment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('payment_method', models.CharField(
                    max_length=20,
                    choices=[
                        ('cash', 'Cash'),
                        ('ecocash', 'EcoCash'),
                        ('card', 'Card'),
                        ('transfer', 'Bank Transfer'),
                    ]
                )),
                ('currency', models.CharField(
                    max_length=4,
                    choices=[
                        ('USD', 'US Dollar'),
                        ('ZIG', 'Zimbabwe Gold'),
                        ('RAND', 'South African Rand'),
                    ],
                    default='USD'
                )),
                ('amount', models.DecimalField(
                    decimal_places=2,
                    help_text='Amount in the payment currency',
                    max_digits=15
                )),
                ('exchange_rate_to_usd', models.DecimalField(
                    blank=True,
                    decimal_places=6,
                    help_text='Exchange rate to convert this payment to USD (for multi-currency tracking)',
                    max_digits=10,
                    null=True
                )),
                ('amount_usd_equivalent', models.DecimalField(
                    blank=True,
                    decimal_places=2,
                    help_text='Payment amount converted to USD equivalent for reporting',
                    max_digits=15,
                    null=True
                )),
                ('is_change_given', models.BooleanField(default=False, help_text='Whether change was given for this payment')),
                ('change_amount', models.DecimalField(
                    decimal_places=2,
                    default=0,
                    help_text='Change given back to customer',
                    max_digits=15
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('sale', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='payments',
                    to='core.sale'
                )),
            ],
            options={
                'verbose_name': 'Sale Payment',
                'verbose_name_plural': 'Sale Payments',
                'ordering': ['created_at'],
                'indexes': [
                    models.Index(fields=['sale', 'created_at'], name='salepayment_sale_created_at_idx'),
                    models.Index(fields=['currency'], name='salepayment_currency_idx'),
                ],
            },
        ),
    ]
