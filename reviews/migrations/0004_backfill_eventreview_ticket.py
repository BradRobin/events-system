from django.db import migrations


def backfill_review_tickets(apps, schema_editor):
    EventReview = apps.get_model('reviews', 'EventReview')
    Ticket = apps.get_model('bookings', 'Ticket')
    for review in EventReview.objects.filter(ticket__isnull=True).iterator():
        ticket = (
            Ticket.objects.filter(
                attendee_id=review.user_id,
                event_id=review.event_id,
                status__in=['valid', 'checked_in'],
            )
            .order_by('-purchase_date')
            .first()
        )
        if ticket:
            review.ticket_id = ticket.id
            review.save(update_fields=['ticket_id'])


class Migration(migrations.Migration):

    dependencies = [
        ('reviews', '0003_db_indexes_and_relationships'),
        ('bookings', '0004_db_indexes_and_relationships'),
    ]

    operations = [
        migrations.RunPython(backfill_review_tickets, migrations.RunPython.noop),
    ]
