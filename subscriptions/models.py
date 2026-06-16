from django.conf import settings
from django.db import models

from .plans import PLAN_CHOICES


class SubscriptionOrder(models.Model):
    STATUS_CHOICES = [
        ('pending_payment', 'Pending Payment'),
        ('verifying', 'Verifying Screenshot'),
        ('manual_review', 'Awaiting Admin Approval'),
        ('completed', 'Completed'),
        ('failed', 'Verification Failed'),
        ('rejected', 'Rejected'),
    ]

    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='subscription_orders',
    )
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending_payment')
    screenshot = models.ImageField(upload_to='subscription_screenshots/', null=True, blank=True)
    screenshot_data = models.TextField(blank=True)
    submitted_mpesa_name = models.CharField(max_length=150, blank=True)
    ocr_raw_text = models.TextField(blank=True)
    screenshot_verified = models.BooleanField(null=True, blank=True)
    verification_message = models.TextField(blank=True)
    billing_months = models.PositiveSmallIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['organizer', 'status']),
            models.Index(fields=['status', 'updated_at']),
        ]

    def __str__(self):
        return f'SubscriptionOrder #{self.pk} - {self.organizer_id} - {self.plan} - {self.status}'
