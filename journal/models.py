from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils import timezone


class Mistake(models.Model):
    """
    Represents common trading mistakes for behavioral analysis.
    Predefined tags that traders can assign to their trades.
    """
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    category = models.CharField(
        max_length=20,
        choices=[
            ('entry', 'Entry Timing'),
            ('exit', 'Exit Timing'),
            ('position', 'Position Sizing'),
            ('risk', 'Risk Management'),
            ('psychology', 'Psychology/Emotion'),
            ('analysis', 'Analysis/Research'),
            ('execution', 'Trade Execution'),
            ('other', 'Other'),
        ],
        default='other'
    )

    class Meta:
        ordering = ['category', 'name']

    def __str__(self):
        return self.name

    def clean(self):
        """Validate mistake data"""
        if not self.name or not self.name.strip():
            raise ValidationError("Mistake name cannot be empty.")
        if len(self.name) > 100:
            raise ValidationError("Mistake name is too long.")
        if self.category not in dict(self._meta.get_field('category').choices):
            raise ValidationError("Invalid mistake category.")


class Symbol(models.Model):
    """
    Represents a trading symbol/ticker (e.g., AAPL, BTC, EUR/USD).
    This prevents duplicating symbol names across trades.
    """
    symbol = models.CharField(
        max_length=20,
        unique=True,
        help_text="Trading symbol/ticker (e.g., AAPL, BTC-USD)"
    )
    name = models.CharField(
        max_length=100,
        blank=True,
        help_text="Full name of the asset (e.g., Apple Inc.)"
    )
    asset_type = models.CharField(
        max_length=20,
        choices=[
            ('stock', 'Stock'),
            ('crypto', 'Cryptocurrency'),
            ('forex', 'Forex'),
            ('commodity', 'Commodity'),
            ('option', 'Option'),
            ('future', 'Future'),
            ('other', 'Other'),
        ],
        default='stock',
        help_text="Type of financial instrument"
    )

    class Meta:
        ordering = ['symbol']

    def __str__(self):
        return f"{self.symbol}"


class Trade(models.Model):
    """
    Represents a single trade entry in the trading journal.
    Each trade belongs to a user and tracks the complete lifecycle.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='trades',
        help_text="User who made this trade"
    )
    symbol = models.ForeignKey(
        Symbol,
        on_delete=models.CASCADE,
        related_name='trades',
        help_text="Trading symbol for this trade"
    )

    # Trade direction
    SIDE_CHOICES = [
        ('buy', 'Buy/Long'),
        ('sell', 'Sell/Short'),
    ]
    side = models.CharField(
        max_length=4,
        choices=SIDE_CHOICES,
        help_text="Buy (long) or Sell (short) position"
    )

    # Entry details
    quantity = models.DecimalField(
        max_digits=20,
        decimal_places=8,
        help_text="Number of units/shares/contracts traded"
    )
    entry_price = models.DecimalField(
        max_digits=20,
        decimal_places=8,
        help_text="Price at which position was entered"
    )
    entry_date = models.DateTimeField(
        help_text="When the trade was executed"
    )

    # Exit details (optional - for open positions)
    exit_price = models.DecimalField(
        max_digits=20,
        decimal_places=8,
        null=True,
        blank=True,
        help_text="Price at which position was closed (null for open trades)"
    )
    exit_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the trade was closed (null for open trades)"
    )

    # Notes and analysis
    notes = models.TextField(
        blank=True,
        help_text="Personal notes about the trade, strategy, emotions, etc."
    )

    # Behavioral analysis - mistake tagging
    mistakes = models.ManyToManyField(
        Mistake,
        blank=True,
        related_name='trades',
        help_text="Mistakes made in this trade (for behavioral learning)"
    )

    # Calculated field (could be computed in views/queries)
    @property
    def pnl(self):
        """
        Calculate profit/loss for closed trades.
        Returns None for open trades.
        """
        if self.exit_price is None:
            return None

        if self.side == 'buy':
            return (self.exit_price - self.entry_price) * self.quantity
        else:  # sell/short
            return (self.entry_price - self.exit_price) * self.quantity

    @property
    def is_closed(self):
        """Check if this trade has been closed."""
        return self.exit_price is not None and self.exit_date is not None

    class Meta:
        ordering = ['-entry_date']  # Most recent trades first
        indexes = [
            models.Index(fields=['user', '-entry_date']),
            models.Index(fields=['symbol', '-entry_date']),
        ]

    def clean(self):
        """Validate trade data"""
        now = timezone.now()

        if self.entry_date:
            # Allow for a small grace period (e.g., 1 minute) to account for timing differences
            if self.entry_date > now + timezone.timedelta(minutes=1):
                raise ValidationError("Entry date cannot be in the future.")

        if self.exit_date:
            # Allow for a small grace period (e.g., 1 minute) to account for timing differences
            if self.exit_date > now + timezone.timedelta(minutes=1):
                raise ValidationError("Exit date cannot be in the future.")

        if self.entry_date and self.exit_date and self.exit_date < self.entry_date:
            raise ValidationError("Exit date cannot be before entry date.")

        if self.quantity is not None and self.quantity <= 0:
            raise ValidationError("Quantity must be greater than zero.")

        if self.entry_price is not None and self.entry_price <= 0:
            raise ValidationError("Entry price must be greater than zero.")

        if self.exit_price is not None and self.exit_price <= 0:
            raise ValidationError("Exit price must be greater than zero.")

        # Logical consistency: if exit_price exists, exit_date should too (and vice versa)
        if (self.exit_price and not self.exit_date) or (self.exit_date and not self.exit_price):
            raise ValidationError("Both exit price and exit date must be provided together, or both left empty.")

    def __str__(self):
        status = "Closed" if self.is_closed else "Open"
        return f"{self.user.username} - {self.side.upper()} {self.quantity} {self.symbol.symbol} @ {self.entry_price} ({status})"
