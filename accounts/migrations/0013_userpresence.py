from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0012_rename_accounts_ad_is_dism_0c0f0d_idx_accounts_ad_is_dism_250a16_idx_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='UserPresence',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('session_id', models.CharField(db_index=True, max_length=64, unique=True)),
                ('last_seen', models.DateTimeField(db_index=True)),
                ('role', models.CharField(blank=True, default='', max_length=20)),
                ('path', models.CharField(blank=True, default='', max_length=500)),
                ('user', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='presence_sessions',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'indexes': [
                    models.Index(fields=['user', 'last_seen'], name='accounts_us_user_id_8a4f21_idx'),
                    models.Index(fields=['last_seen'], name='accounts_us_last_se_2c8b9a_idx'),
                ],
            },
        ),
    ]
