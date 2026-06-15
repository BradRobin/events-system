from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reviews', '0004_backfill_eventreview_ticket'),
    ]

    operations = [
        migrations.AddField(
            model_name='eventreview',
            name='organizer_response',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='eventreview',
            name='organizer_responded_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
