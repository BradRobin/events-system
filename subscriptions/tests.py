"""Subscription plan and payment tests."""

from decimal import Decimal
from django.test import TestCase, Client
from django.utils import timezone

from accounts.models import User
from events.models import Event, Category
from subscriptions.models import SubscriptionOrder
from subscriptions.services import can_create_event, activate_subscription, get_effective_plan
from subscriptions.plans import PLANS


class SubscriptionPlanTests(TestCase):
    def setUp(self):
        self.organizer = User.objects.create_user(
            username='org1',
            email='org1@test.com',
            password='pass',
            role='organizer',
            subscription_plan='free',
        )
        self.client = Client()
        self.category = Category.objects.create(name='Music', slug='music')

    def test_free_plan_allows_one_event_per_month(self):
        allowed, _, code = can_create_event(self.organizer)
        self.assertTrue(allowed)
        Event.objects.create(
            title='First',
            slug='first-event',
            description='d',
            category=self.category,
            organizer=self.organizer,
            start_date=timezone.now(),
            end_date=timezone.now(),
            venue='Nairobi',
            price=100,
            total_seats=10,
            available_seats=10,
        )
        allowed, message, code = can_create_event(self.organizer)
        self.assertFalse(allowed)
        self.assertEqual(code, 'upgrade_required')

    def test_plus_plan_allows_more_events(self):
        activate_subscription(self.organizer, 'plus')
        self.organizer.refresh_from_db()
        self.assertEqual(get_effective_plan(self.organizer), 'plus')
        for i in range(5):
            allowed, _, _ = can_create_event(self.organizer)
            self.assertTrue(allowed)
            Event.objects.create(
                title=f'E{i}',
                slug=f'event-{i}',
                description='d',
                category=self.category,
                organizer=self.organizer,
                start_date=timezone.now(),
                end_date=timezone.now(),
                venue='Nairobi',
                price=100,
                total_seats=10,
                available_seats=10,
            )

    def test_create_subscription_order_api(self):
        self.client.force_login(self.organizer)
        res = self.client.post(
            '/api/organizer/subscription/orders/create/',
            data='{"plan":"plus"}',
            content_type='application/json',
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data['success'])
        self.assertEqual(float(data['order']['amount']), float(PLANS['plus']['price_kes']))

    def test_admin_approves_subscription(self):
        order = SubscriptionOrder.objects.create(
            organizer=self.organizer,
            plan='premium',
            amount=Decimal('1000'),
            status='manual_review',
        )
        admin = User.objects.create_superuser('admin', 'admin@test.com', 'pass')
        self.client.force_login(admin)
        res = self.client.post(f'/api/admin/subscription-orders/{order.id}/approve/')
        self.assertEqual(res.status_code, 200)
        self.organizer.refresh_from_db()
        self.assertEqual(self.organizer.subscription_plan, 'premium')
        from payments.models import OrganizerNotification
        self.assertTrue(
            OrganizerNotification.objects.filter(
                organizer=self.organizer,
                title='Plan upgraded successfully',
            ).exists()
        )

    def test_admin_notification_includes_pending_subscription(self):
        SubscriptionOrder.objects.create(
            organizer=self.organizer,
            plan='plus',
            amount=Decimal('500'),
            status='manual_review',
        )
        from accounts.admin_store import build_dynamic_notifications
        notes = build_dynamic_notifications()
        self.assertTrue(any(n.get('action_type') == 'subscription_pending_approval' for n in notes))

    def test_verify_subscription_screenshot_submits_for_approval(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        order = SubscriptionOrder.objects.create(
            organizer=self.organizer,
            plan='plus',
            amount=Decimal('500'),
            status='pending_payment',
        )
        self.client.force_login(self.organizer)
        image = SimpleUploadedFile(
            'payment.png',
            b'\x89PNG\r\n\x1a\n' + b'0' * 128,
            content_type='image/png',
        )
        res = self.client.post(
            f'/api/organizer/subscription/orders/{order.id}/verify-screenshot/',
            data={'screenshot': image},
        )
        self.assertEqual(res.status_code, 200, res.content)
        data = res.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['step'], 'pending_approval')
        order.refresh_from_db()
        self.assertEqual(order.status, 'manual_review')
        self.assertTrue(order.screenshot_data)

    def test_ocr_health_endpoint(self):
        res = self.client.get('/api/health/ocr/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('ocr_available', res.json())
