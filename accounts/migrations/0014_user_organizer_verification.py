from django.conf import settings
from django.db import migrations, models


def _has_mpesa(user):
    return bool(
        getattr(user, 'mpesa_display_name', '').strip()
        and any([
            getattr(user, 'mpesa_paybill', '').strip(),
            getattr(user, 'mpesa_till', '').strip(),
            getattr(user, 'mpesa_pochi', '').strip(),
            getattr(user, 'mpesa_send_money', '').strip(),
        ])
    )


def set_initial_organizer_verification(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    Event = apps.get_model('events', 'Event')

    for user in User.objects.filter(role='organizer'):
        if not user.is_active:
            user.organizer_verification = 'rejected'
        elif Event.objects.filter(organizer_id=user.id).exists() or _has_mpesa(user):
            user.organizer_verification = 'approved'
        else:
            user.organizer_verification = 'pending'
        user.save(update_fields=['organizer_verification'])


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0013_userpresence'),
        ('events', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='organizer_verification',
            field=models.CharField(
                blank=True,
                choices=[('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')],
                default='pending',
                max_length=20,
            ),
        ),
        migrations.RunPython(set_initial_organizer_verification, migrations.RunPython.noop),
    ]
