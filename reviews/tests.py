import json
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.utils import timezone

from bookings.models import Ticket
from events.models import Category, Event
from payments.models import OrganizerNotification
from reviews.models import EventReview

User = get_user_model()


class ReviewApiTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.organizer = User.objects.create_user(
            username='organizer1',
            email='org@test.com',
            password='pass12345',
            role='organizer',
        )
        self.attendee = User.objects.create_user(
            username='attendee1',
            email='att@test.com',
            password='pass12345',
            role='attendee',
        )
        self.category = Category.objects.create(name='Sports', slug='sports')
        self.event = Event.objects.create(
            title='World cup campaign',
            slug='world-cup-campaign',
            description='Test event',
            category=self.category,
            organizer=self.organizer,
            venue='Nairobi',
            start_date=timezone.now() - timedelta(days=3),
            end_date=timezone.now() - timedelta(days=2),
            price=Decimal('1000'),
            total_seats=100,
            available_seats=99,
            status='published',
        )
        self.ticket = Ticket.objects.create(
            attendee=self.attendee,
            event=self.event,
            ticket_type='Regular',
            quantity=1,
            price=Decimal('1000'),
            billing_name='Test Attendee',
            billing_email='att@test.com',
            billing_phone='0700000000',
            status='valid',
        )
        self.client.force_login(self.attendee)

    def test_create_review_notifies_organizer(self):
        response = self.client.post(
            f'/api/attendee/reviews/create/{self.event.id}/',
            data=json.dumps({
                'rating': 4,
                'comment': 'Awesome event. I really enjoyed the matches.',
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 201, response.content)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(EventReview.objects.count(), 1)

        notification = OrganizerNotification.objects.get(organizer=self.organizer)
        self.assertEqual(notification.action_type, 'event_review')
        self.assertEqual(notification.action_url, '/organizer/reviews/')
        self.assertIn('World cup campaign', notification.message)

    def test_create_review_rejects_future_event_with_message(self):
        future_event = Event.objects.create(
            title='Upcoming show',
            slug='upcoming-show',
            description='Future',
            category=self.category,
            organizer=self.organizer,
            venue='Nairobi',
            start_date=timezone.now() + timedelta(days=1),
            end_date=timezone.now() + timedelta(days=2),
            price=Decimal('500'),
            total_seats=50,
            available_seats=50,
            status='published',
        )
        Ticket.objects.create(
            attendee=self.attendee,
            event=future_event,
            ticket_type='Regular',
            quantity=1,
            price=Decimal('500'),
            billing_name='Test Attendee',
            billing_email='att@test.com',
            billing_phone='0700000000',
            status='valid',
        )

        response = self.client.post(
            f'/api/attendee/reviews/create/{future_event.id}/',
            data=json.dumps({'rating': 5, 'comment': 'Great'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 403, response.content)
        self.assertIn('ended', response.json()['message'].lower())

    def test_event_reviews_list_includes_submitted_review(self):
        EventReview.objects.create(
            user=self.attendee,
            event=self.event,
            ticket=self.ticket,
            rating=4,
            comment='Awesome event.',
        )

        response = self.client.get(f'/api/attendee/events/{self.event.id}/reviews/')
        self.assertEqual(response.status_code, 200, response.content)
        data = response.json()
        self.assertEqual(data['count'], 1)
        self.assertEqual(data['results'][0]['comment'], 'Awesome event.')
        self.assertEqual(data['average_rating'], 4.0)
