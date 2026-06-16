import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('accounts', '0015_user_subscription_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='SubscriptionOrder',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('plan', models.CharField(choices=[('free', 'Free'), ('plus', 'Plus'), ('premium', 'Premium')], max_length=20)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('status', models.CharField(choices=[('pending_payment', 'Pending Payment'), ('verifying', 'Verifying Screenshot'), ('manual_review', 'Awaiting Admin Approval'), ('completed', 'Completed'), ('failed', 'Verification Failed'), ('rejected', 'Rejected')], default='pending_payment', max_length=20)),
                ('screenshot', models.ImageField(blank=True, null=True, upload_to='subscription_screenshots/')),
                ('screenshot_data', models.TextField(blank=True)),
                ('submitted_mpesa_name', models.CharField(blank=True, max_length=150)),
                ('ocr_raw_text', models.TextField(blank=True)),
                ('screenshot_verified', models.BooleanField(blank=True, null=True)),
                ('verification_message', models.TextField(blank=True)),
                ('billing_months', models.PositiveSmallIntegerField(default=1)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('organizer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='subscription_orders', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'indexes': [
                    models.Index(fields=['organizer', 'status'], name='subscriptio_organiz_6f0f0d_idx'),
                    models.Index(fields=['status', 'updated_at'], name='subscriptio_status_2a8c2a_idx'),
                ],
            },
        ),
    ]
