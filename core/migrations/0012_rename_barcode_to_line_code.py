# Generated manually for renaming barcode to line_code

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0011_expense_stafflunch'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='line_code',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.RunSQL(
            'UPDATE core_product SET line_code = barcode WHERE barcode IS NOT NULL AND barcode != \'\'',
            reverse_sql='UPDATE core_product SET barcode = line_code WHERE line_code IS NOT NULL AND line_code != \'\''
        ),
        migrations.RemoveField(
            model_name='product',
            name='barcode',
        ),
    ]