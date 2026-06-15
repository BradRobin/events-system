from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase
from django.utils import timezone

from bookings.models import Ticket
from bookings.services import fulfill_payment_order
from events.models import Category, Event
from payments.models import PaymentOrder
from reviews.models import EventReview

User = get_user_model()


class DatabaseRelationshipTests(TestCase):
    def setUp(self):
        self.organizer = User.objects.create_user(
            username='org1', email='org1@example.com', password='pass', role='organizer',
        )
        self.other_organizer = User.objects.create_user(
            username='org2', email='org2@example.com', password='pass', role='organizer',
        )
        self.attendee = User.objects.create_user(
            username='att1', email='att1@example.com', password='pass', role='attendee',
        )
        self.category = Category.objects.create(name='Tech', slug='tech')
        now = timezone.now()
        self.event = Event.objects.create(
            title='Test Event',
            slug='test-event',
            description='Desc',
            category=self.category,
            organizer=self.organizer,
            start_date=now + timedelta(days=1),
            end_date=now + timedelta(days=2),
            venue='Hall',
            price=Decimal('100.00'),
            total_seats=100,
            available_seats=100,
            status='published',
        )

    def test_category_events_related_name(self):
        self.assertEqual(self.event.category_id, self.category.id)
        self.assertIn(self.event, self.category.events.all())

    def test_payment_order_organizer_must_match_event(self):
        order = PaymentOrder(
            attendee=self.attendee,
            event=self.event,
            organizer=self.other_organizer,
            ticket_type='Regular',
            quantity=1,
            unit_price=Decimal('100.00'),
            total_amount=Decimal('100.00'),
        )
        with self.assertRaises(ValidationError):
            order.full_clean()

    def test_payment_order_defaults_organizer_from_event(self):
        order = PaymentOrder(
            attendee=self.attendee,
            event=self.event,
            ticket_type='Regular',
            quantity=1,
            unit_price=Decimal('100.00'),
            total_amount=Decimal('100.00'),
        )
        order.save()
        self.assertEqual(order.organizer_id, self.organizer.id)

    def test_fulfillment_links_ticket_to_order(self):
        order = PaymentOrder.objects.create(
            attendee=self.attendee,
            event=self.event,
            organizer=self.organizer,
            ticket_type='Regular',
            quantity=1,
            unit_price=Decimal('100.00'),
            total_amount=Decimal('100.00'),
            status='manual_review',
        )
        ticket = fulfill_payment_order(order)
        order.refresh_from_db()
        self.assertEqual(order.ticket_id, ticket.id)
        self.assertEqual(order.status, 'completed')
        self.assertEqual(ticket.event_id, self.event.id)
        self.assertEqual(ticket.attendee_id, self.attendee.id)

    def test_unique_review_per_user_event(self):
        ticket = Ticket.objects.create(
            attendee=self.attendee,
            event=self.event,
            billing_name='Attendee',
            billing_email='att1@example.com',
            billing_phone='0700000000',
            price=Decimal('100.00'),
        )
        EventReview.objects.create(
            user=self.attendee,
            event=self.event,
            ticket=ticket,
            rating=5,
            comment='Great',
        )
        with self.assertRaises(IntegrityError):
            EventReview.objects.create(
                user=self.attendee,
                event=self.event,
                rating=4,
                comment='Duplicate',
            )

    def test_ticket_cascade_from_event(self):
        ticket = Ticket.objects.create(
            attendee=self.attendee,
            event=self.event,
            billing_name='Attendee',
            billing_email='att1@example.com',
            billing_phone='0700000000',
        )
        ticket_id = ticket.id
        self.event.delete()
        self.assertFalse(Ticket.objects.filter(pk=ticket_id).exists())
