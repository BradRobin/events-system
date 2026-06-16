"""Tests for customer story API authentication."""

from django.contrib.auth import get_user_model
from django.test import Client, TestCase

from reviews.models import CustomerStory

User = get_user_model()


class CustomerStoryApiTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='storyteller@example.com',
            email='storyteller@example.com',
            password='testpass123',
            role='attendee',
            first_name='Story',
            last_name='Teller',
        )

    def test_create_requires_login(self):
        response = self.client.post(
            '/api/attendee/customer-stories/',
            data='{"name":"Guest","message":"This is my long enough story.","rating":5}',
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 401)

    def test_authenticated_user_can_create_and_delete_story(self):
        self.client.force_login(self.user)
        response = self.client.post(
            '/api/attendee/customer-stories/',
            data='{"name":"Story Teller","message":"This is my long enough story.","rating":5,"event":"Music Fest"}',
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertTrue(CustomerStory.objects.filter(user=self.user).exists())

        duplicate = self.client.post(
            '/api/attendee/customer-stories/',
            data='{"name":"Story Teller","message":"Another long enough story here.","rating":4}',
            content_type='application/json',
        )
        self.assertEqual(duplicate.status_code, 400)

        delete_response = self.client.post('/api/attendee/customer-stories/delete/')
        self.assertEqual(delete_response.status_code, 200)
        self.assertFalse(CustomerStory.objects.filter(user=self.user).exists())

    def test_public_list_includes_published_stories(self):
        CustomerStory.objects.create(
            user=self.user,
            display_name='Story Teller',
            message='Published story content here.',
            rating=5,
            is_published=True,
        )
        response = self.client.get('/api/customer-stories/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['count'], 1)
