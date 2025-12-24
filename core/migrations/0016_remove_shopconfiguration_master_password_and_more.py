# Empty migration to avoid KeyError: 'master_password'
# All security fields are already properly defined in model

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0015_add_security_credentials'),
    ]

    operations = [
        # No operations - migration placeholder only
    ]
