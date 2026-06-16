from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.utils import timezone

from bookings.models import Ticket
from events.models import Category, Event

User = get_user_model()


class OrganizerTicketScannerTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.organizer = User.objects.create_user(
            username='scanner_org',
            email='scanner-org@test.com',
            password='pass12345',
            role='organizer',
        )
        self.other_organizer = User.objects.create_user(
            username='other_org',
            email='other-org@test.com',
            password='pass12345',
            role='organizer',
        )
        self.attendee = User.objects.create_user(
            username='scanner_att',
            email='scanner-att@test.com',
            password='pass12345',
            role='attendee',
        )
        self.category = Category.objects.create(name='Music', slug='music')
        self.event = Event.objects.create(
            title='Scanner Test Event',
            slug='scanner-test-event',
            description='Test',
            category=self.category,
            organizer=self.organizer,
            venue='Nairobi',
            start_date=timezone.now(),
            end_date=timezone.now(),
            price=Decimal('500'),
            total_seats=50,
            available_seats=49,
            status='published',
        )
        self.ticket = Ticket.objects.create(
            attendee=self.attendee,
            event=self.event,
            ticket_type='Regular',
            quantity=1,
            price=Decimal('500'),
            billing_name='Jane Attendee',
            billing_email='scanner-att@test.com',
            billing_phone='0700000001',
            status='valid',
            ticket_number='TICK-SCAN123',
        )
        self.client.force_login(self.organizer)

    def test_verify_valid_ticket(self):
        response = self.client.get('/api/organizer/tickets/TICK-SCAN123/verify/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['ticket']['customer_name'], 'Jane Attendee')

    def test_checkin_valid_ticket(self):
        response = self.client.post('/api/organizer/tickets/TICK-SCAN123/checkin/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.status, 'checked_in')
        self.assertIsNotNone(self.ticket.checked_in_at)

    def test_verify_rejects_other_organizer_ticket(self):
        other_event = Event.objects.create(
            title='Other Event',
            slug='other-event',
            description='Test',
            category=self.category,
            organizer=self.other_organizer,
            venue='Mombasa',
            start_date=timezone.now(),
            end_date=timezone.now(),
            price=Decimal('300'),
            total_seats=20,
            available_seats=20,
            status='published',
        )
        other_ticket = Ticket.objects.create(
            attendee=self.attendee,
            event=other_event,
            ticket_type='Regular',
            quantity=1,
            price=Decimal('300'),
            billing_name='Other Guest',
            billing_email='scanner-att@test.com',
            billing_phone='0700000002',
            status='valid',
            ticket_number='TICK-OTHER999',
        )
        response = self.client.get(f'/api/organizer/tickets/{other_ticket.ticket_number}/verify/')
        self.assertEqual(response.status_code, 404)

    def test_checkin_already_checked_in_ticket(self):
        self.ticket.status = 'checked_in'
        self.ticket.checked_in_at = timezone.now()
        self.ticket.save(update_fields=['status', 'checked_in_at'])
        response = self.client.post('/api/organizer/tickets/TICK-SCAN123/checkin/')
        self.assertEqual(response.status_code, 400)
        self.assertIn('already', response.json()['message'].lower())
