import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from pathlib import Path
from payments.models import AttendeeNotification

name = AttendeeNotification._meta.model_name
content = f'''from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0010_db_indexes_and_relationships'),
    ]

    operations = [
        migrations.AddField(
            model_name='{name}',
            name='action_url',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='organizernotification',
            name='action_url',
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
'''
Path('payments/migrations/0011_notification_action_url.py').write_text(content)
print('wrote model_name=', name)
