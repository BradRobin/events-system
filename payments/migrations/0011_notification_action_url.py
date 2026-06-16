from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0010_db_indexes_and_relationships'),
    ]

    operations = [
        migrations.AddField(
            model_name='attendeenotification',
            name='action_url',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='organizernotification',
            name='action_url',
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
