from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0014_user_organizer_verification'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='subscription_plan',
            field=models.CharField(
                blank=True,
                choices=[('free', 'Free'), ('plus', 'Plus'), ('premium', 'Premium')],
                default='free',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='subscription_started_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='subscription_expires_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
