# Generated manually for adding amount_received field to Sale model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0054_alter_sale_payment_method'),
    ]

    operations = [
        migrations.AddField(
            model_name='sale',
            name='amount_received',
            field=models.DecimalField(blank=True, decimal_places=2, help_text='Amount actually received from customer (for change calculation)', max_digits=10, null=True),
        ),
    ]