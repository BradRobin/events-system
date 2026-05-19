from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Event, TicketType, Booking, Review, Notification


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'phone', 'is_staff')
    list_filter = ('role', 'is_staff', 'is_active')
    fieldsets = UserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('role', 'phone', 'avatar', 'organization_name', 'website')}),
    )


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('title', 'organizer', 'category', 'event_date', 'is_published', 'is_featured')
    list_filter = ('category', 'is_published', 'is_featured')
    search_fields = ('title', 'venue')
    prepopulated_fields = {'slug': ('title',)}


@admin.register(TicketType)
class TicketTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'event', 'price', 'quantity_available', 'quantity_sold')
    list_filter = ('event',)


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('booking_reference', 'user', 'event', 'quantity', 'total_price', 'status')
    list_filter = ('status', 'payment_status')


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('user', 'event', 'rating', 'created_at')
    list_filter = ('rating',)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'is_read', 'created_at')
    list_filter = ('is_read',)