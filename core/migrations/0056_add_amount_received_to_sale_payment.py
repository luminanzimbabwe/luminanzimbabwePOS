# Generated manually for adding amount_received field to SalePayment model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0055_add_amount_received_to_sale'),
    ]

    operations = [
        migrations.AddField(
            model_name='salepayment',
            name='amount_received',
            field=models.DecimalField(blank=True, decimal_places=2, help_text='Amount actually received from customer for this payment method (for change calculation)', max_digits=15, null=True),
        ),
    ]