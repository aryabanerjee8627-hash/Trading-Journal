from django import forms
from django.utils import timezone
from .models import Trade, Symbol, Mistake


class TradeCreateForm(forms.ModelForm):
    """
    Form for creating new trades in the journal.

    Uses Django ModelForm to automatically generate form fields from our Trade model.
    Includes custom validation and automatic calculations.
    """

    # Custom field for symbol selection/input
    symbol_input = forms.CharField(
        max_length=20,
        label="Symbol",
        help_text="Enter trading symbol (e.g., AAPL, BTC-USD)",
        widget=forms.TextInput(attrs={'placeholder': 'AAPL'})
    )

    class Meta:
        model = Trade
        fields = [
            'side',
            'quantity',
            'entry_price',
            'entry_date',
            'exit_price',
            'exit_date',
            'notes',
            'mistakes'
        ]

        # Custom widgets for better UX
        widgets = {
            'entry_date': forms.DateTimeInput(
                attrs={'type': 'datetime-local'},
                format='%Y-%m-%dT%H:%M'
            ),
            'exit_date': forms.DateTimeInput(
                attrs={'type': 'datetime-local'},
                format='%Y-%m-%dT%H:%M'
            ),
            'quantity': forms.NumberInput(attrs={'step': '0.00000001'}),
            'entry_price': forms.NumberInput(attrs={'step': '0.00000001'}),
            'exit_price': forms.NumberInput(attrs={'step': '0.00000001'}),
            'notes': forms.Textarea(attrs={'rows': 3, 'placeholder': 'Optional notes about the trade...'}),
            'mistakes': forms.CheckboxSelectMultiple()
        }

        # Custom labels and help text
        labels = {
            'side': 'Position Type',
            'quantity': 'Quantity',
            'entry_price': 'Entry Price',
            'entry_date': 'Entry Date/Time',
            'exit_price': 'Exit Price (optional)',
            'exit_date': 'Exit Date/Time (optional)',
            'notes': 'Trade Notes',
            'mistakes': 'Mistakes Made (optional)'
        }

        help_texts = {
            'quantity': 'Number of shares/units (e.g., 100, 0.5 for crypto)',
            'entry_price': 'Price when you entered the position',
            'entry_date': 'When did you execute this trade?',
            'exit_price': 'Leave blank for open positions',
            'exit_date': 'Leave blank for open positions',
            'mistakes': 'Select any mistakes you made in this trade (for behavioral learning)',
        }


    def __init__(self, *args, **kwargs):
        """Initialize form with current datetime as default for entry_date."""
        self.user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)
        # Set default entry date to now
        if not self.instance.pk:  # Only for new trades
            if self.user and hasattr(self.user , 'userprofile'):
                user_tz = self.user.userprofile.timezone
                import pytz
                tz = pytz.timezone(user_tz)
                self.fields['entry_date'].initial = timezone.now().astimezone(tz)
            else:
                self.fields['entry_date'].initial = timezone.now()

        # Organize mistakes by category for better UX
        self.fields['mistakes'].queryset = Mistake.objects.all().order_by('category', 'name')
        self.fields['mistakes'].required = False

    def clean(self):
        cleaned_data = super().clean()
        entry_date = cleaned_data.get('entry_date')
        exit_date = cleaned_data.get('exit_date')
        exit_price = cleaned_data.get('exit_price')
        quantity = cleaned_data.get('quantity')
        entry_price = cleaned_data.get('entry_price')

        # Get user's timezone
        if self.user and hasattr(self.user, 'userprofile'):
            import pytz
            user_tz = pytz.timezone(self.user.userprofile.timezone)
        else:
            user_tz = pytz.UTC

        # Make naive datetimes aware
        if entry_date and timezone.is_naive(entry_date):
            entry_date = timezone.make_aware(entry_date, timezone=user_tz)

        if exit_date and timezone.is_naive(exit_date):
            exit_date = timezone.make_aware(exit_date, timezone=user_tz)

        # Compare with now in user's timezone
        now_user = timezone.now().astimezone(user_tz)
        if entry_date and entry_date > now_user + timezone.timedelta(minutes=1):
            raise forms.ValidationError("Entry date cannot be in the future (user timezone).")
        if exit_date and exit_date > now_user + timezone.timedelta(minutes=1):
            raise forms.ValidationError("Exit date cannot be in the future (user timezone).")

        # Exit date/price logical checks
        if exit_price and not exit_date:
            raise forms.ValidationError("Exit date is required when exit price is provided.")
        if exit_date and not exit_price:
            raise forms.ValidationError("Exit price is required when exit date is provided.")
        if entry_date and exit_date and exit_date < entry_date:
            raise forms.ValidationError("Exit date cannot be before entry date.")

        # Quantity validation
        if quantity is not None:
            if quantity <= 0:
                raise forms.ValidationError("Quantity must be greater than zero.")
            if quantity > 1000000:
                raise forms.ValidationError("Quantity seems unreasonably large. Please verify.")

        # Price validation
        if entry_price is not None:
            if entry_price <= 0:
                raise forms.ValidationError("Entry price must be greater than zero.")
            if entry_price > 10000000:
                raise forms.ValidationError("Entry price seems unreasonably high. Please verify.")

        if exit_price is not None:
            if exit_price <= 0:
                raise forms.ValidationError("Exit price must be greater than zero.")
            if exit_price > 10000000:
                raise forms.ValidationError("Exit price seems unreasonably high. Please verify.")

        # Symbol input validation
        symbol_input = cleaned_data.get('symbol_input')
        if symbol_input:
            symbol_input = symbol_input.strip().upper()
            if len(symbol_input) < 1:
                raise forms.ValidationError("Symbol cannot be empty.")
            if len(symbol_input) > 20:
                raise forms.ValidationError("Symbol name is too long (max 20 characters).")
            if not symbol_input.replace('-', '').replace('_', '').replace('.', '').isalnum():
                raise forms.ValidationError("Symbol contains invalid characters. Use only letters, numbers, hyphens, underscores, and dots.")
            
        return cleaned_data

    def save(self, commit=True, user=None):
        """
        Save the trade with automatic symbol lookup/creation and user assignment.
        """
        if not user:
            raise ValueError("User is required to save a trade")

        # Get or create the symbol
        symbol_name = self.cleaned_data['symbol_input'].upper().strip()
        symbol, created = Symbol.objects.get_or_create(
            symbol=symbol_name,
            defaults={'asset_type': 'stock'}  # Default to stock
        )

        # Create the trade instance
        trade = super().save(commit=False)
        trade.user = user
        trade.symbol = symbol

        if commit:
            trade.save()

        return trade