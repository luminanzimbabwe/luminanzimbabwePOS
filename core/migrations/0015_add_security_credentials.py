# Generated migration for adding security credentials to ShopConfiguration

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0014_alter_cashier_unique_together'),
    ]

    operations = [
        migrations.AddField(
            model_name='shopconfiguration',
            name='api_key',
            field=models.CharField(blank=True, help_text='API key for integrations', max_length=100, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='shopconfiguration',
            name='checksum',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='shopconfiguration',
            name='device_id',
            field=models.CharField(blank=True, help_text='Unique device identifier', max_length=50, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='shopconfiguration',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='shopconfiguration',
            name='last_login',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='shopconfiguration',
            name='owner_id',
            field=models.CharField(blank=True, help_text='Owner profile identifier', max_length=50, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='shopconfiguration',
            name='recovery_codes',
            field=models.JSONField(blank=True, default=list, help_text='List of 8 recovery codes for shop owner'),
        ),
        migrations.AddField(
            model_name='shopconfiguration',
            name='registration_time',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='shopconfiguration',
            name='shop_owner_master_password',
            field=models.CharField(blank=True, help_text='Master password for individual shop owner account recovery', max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='shopconfiguration',
            name='version',
            field=models.CharField(default='1.0.0', max_length=20),
        ),
        migrations.RunPython(
            code=lambda apps, schema_editor: update_existing_shops(apps),
            reverse_code=lambda apps, schema_editor: reverse_update_existing_shops(apps),
        ),
    ]


def update_existing_shops(apps):
    """Update existing shop records with default values"""
    ShopConfiguration = apps.get_model('core', 'ShopConfiguration')
    
    for shop in ShopConfiguration.objects.all():
        # Set registration_time if not set
        if not shop.registration_time:
            shop.registration_time = shop.registered_at
        
        # Set default version if not set
        if not shop.version:
            shop.version = '1.0.0'
        
        shop.save()


def reverse_update_existing_shops(apps):
    """Reverse operation for existing shops"""
    # This is a no-op since we're just setting default values
    pass