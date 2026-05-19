from django import forms
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from .models import User, Event, Booking, Review


class CustomUserCreationForm(UserCreationForm):
    role = forms.ChoiceField(choices=User.ROLE_CHOICES, widget=forms.RadioSelect)
    phone = forms.CharField(max_length=15, required=False)
    organization_name = forms.CharField(max_length=200, required=False)
    website = forms.URLField(required=False)
    
    class Meta:
        model = User
        fields = ('username', 'email', 'first_name', 'last_name', 'phone', 'role', 
                  'organization_name', 'website', 'password1', 'password2')
    
    def clean(self):
        cleaned_data = super().clean()
        role = cleaned_data.get('role')
        organization_name = cleaned_data.get('organization_name')
        
        if role == 'organizer' and not organization_name:
            self.add_error('organization_name', 'Organization name is required for organizers')
        return cleaned_data


class CustomAuthenticationForm(AuthenticationForm):
    role = forms.ChoiceField(choices=User.ROLE_CHOICES, widget=forms.RadioSelect)
    
    def confirm_login_allowed(self, user):
        super().confirm_login_allowed(user)
        role = self.cleaned_data.get('role')
        if role and user.role != role:
            raise forms.ValidationError(f"This account is registered as {user.role}, not {role}")


class EventForm(forms.ModelForm):
    event_date = forms.DateTimeField(widget=forms.DateTimeInput(attrs={'type': 'datetime-local'}))
    
    class Meta:
        model = Event
        fields = ['title', 'category', 'description', 'banner_image', 'thumbnail', 
                  'event_date', 'venue', 'capacity', 'is_published', 'is_featured']
        widgets = {
            'description': forms.Textarea(attrs={'rows': 5, 'class': 'np-input'}),
            'venue': forms.TextInput(attrs={'class': 'np-input'}),
            'capacity': forms.NumberInput(attrs={'class': 'np-input'}),
            'title': forms.TextInput(attrs={'class': 'np-input'}),
            'category': forms.Select(attrs={'class': 'np-input'}),
        }


class BookingForm(forms.ModelForm):
    class Meta:
        model = Booking
        fields = ['quantity']
    
    def __init__(self, *args, **kwargs):
        self.ticket_type = kwargs.pop('ticket_type', None)
        super().__init__(*args, **kwargs)
        if self.ticket_type:
            choices = [(i, i) for i in range(1, min(11, self.ticket_type.remaining_quantity + 1))]
            self.fields['quantity'].widget = forms.Select(choices=choices, attrs={'class': 'np-input'})


class ReviewForm(forms.ModelForm):
    class Meta:
        model = Review
        fields = ['rating', 'comment']
        widgets = {
            'rating': forms.RadioSelect(choices=[(i, f'{i}★') for i in range(1, 6)]),
            'comment': forms.Textarea(attrs={'rows': 4, 'class': 'np-input'}),
        }


class UserProfileForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'phone', 'avatar']
        widgets = {
            'first_name': forms.TextInput(attrs={'class': 'np-input'}),
            'last_name': forms.TextInput(attrs={'class': 'np-input'}),
            'email': forms.EmailInput(attrs={'class': 'np-input'}),
            'phone': forms.TextInput(attrs={'class': 'np-input'}),
            'avatar': forms.FileInput(attrs={'class': 'np-input'}),
        }