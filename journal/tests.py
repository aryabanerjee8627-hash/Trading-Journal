from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.exceptions import ValidationError
from .models import Trade, Symbol, Mistake
from .forms import TradeCreateForm


class TradeModelTest(TestCase):
    """Test Trade model validation and functionality"""

    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.symbol = Symbol.objects.create(symbol='AAPL', name='Apple Inc.')

    def test_trade_validation_positive_quantity(self):
        """Test that quantity must be positive"""
        with self.assertRaises(ValidationError):
            trade = Trade(
                user=self.user,
                symbol=self.symbol,
                side='buy',
                quantity=-1,
                entry_price=100.00,
                entry_date=timezone.now()
            )
            trade.full_clean()

    def test_trade_validation_future_entry_date(self):
        """Test that entry date cannot be in the future"""
        future_date = timezone.now().replace(year=timezone.now().year + 1)
        with self.assertRaises(ValidationError):
            trade = Trade(
                user=self.user,
                symbol=self.symbol,
                side='buy',
                quantity=100,
                entry_price=100.00,
                entry_date=future_date
            )
            trade.full_clean()

    def test_trade_validation_exit_before_entry(self):
        """Test that exit date cannot be before entry date"""
        entry_date = timezone.now()
        exit_date = entry_date.replace(hour=entry_date.hour - 1)

        with self.assertRaises(ValidationError):
            trade = Trade(
                user=self.user,
                symbol=self.symbol,
                side='buy',
                quantity=100,
                entry_price=100.00,
                entry_date=entry_date,
                exit_price=105.00,
                exit_date=exit_date
            )
            trade.full_clean()

    def test_trade_pnl_calculation_buy(self):
        """Test P&L calculation for buy trades"""
        trade = Trade.objects.create(
            user=self.user,
            symbol=self.symbol,
            side='buy',
            quantity=100,
            entry_price=100.00,
            exit_price=110.00,
            entry_date=timezone.now(),
            exit_date=timezone.now()
        )
        expected_pnl = (110.00 - 100.00) * 100  # $1,000 profit
        self.assertEqual(trade.pnl, expected_pnl)

    def test_trade_pnl_calculation_sell(self):
        """Test P&L calculation for sell trades"""
        trade = Trade.objects.create(
            user=self.user,
            symbol=self.symbol,
            side='sell',
            quantity=100,
            entry_price=110.00,
            exit_price=100.00,
            entry_date=timezone.now(),
            exit_date=timezone.now()
        )
        expected_pnl = (110.00 - 100.00) * 100  # $1,000 profit
        self.assertEqual(trade.pnl, expected_pnl)

    def test_trade_is_closed(self):
        """Test is_closed property"""
        # Open trade
        open_trade = Trade.objects.create(
            user=self.user,
            symbol=self.symbol,
            side='buy',
            quantity=100,
            entry_price=100.00,
            entry_date=timezone.now()
        )
        self.assertFalse(open_trade.is_closed)

        # Closed trade
        closed_trade = Trade.objects.create(
            user=self.user,
            symbol=self.symbol,
            side='buy',
            quantity=100,
            entry_price=100.00,
            exit_price=110.00,
            entry_date=timezone.now(),
            exit_date=timezone.now()
        )
        self.assertTrue(closed_trade.is_closed)


class TradeFormTest(TestCase):
    """Test TradeCreateForm validation"""

    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass')

    def test_form_valid_data(self):
        """Test form accepts valid data"""
        data = {
            'symbol_input': 'AAPL',
            'side': 'buy',
            'quantity': 100,
            'entry_price': 150.00,
            'entry_date': timezone.now().strftime('%Y-%m-%dT%H:%M'),
            'exit_price': 155.00,
            'exit_date': timezone.now().strftime('%Y-%m-%dT%H:%M'),
            'notes': 'Test trade'
        }
        form = TradeCreateForm(data=data)
        self.assertTrue(form.is_valid())

    def test_form_missing_exit_date(self):
        """Test form rejects exit price without exit date"""
        data = {
            'symbol_input': 'AAPL',
            'side': 'buy',
            'quantity': 100,
            'entry_price': 150.00,
            'entry_date': timezone.now().strftime('%Y-%m-%dT%H:%M'),
            'exit_price': 155.00,
            'notes': 'Test trade'
        }
        form = TradeCreateForm(data=data)
        self.assertFalse(form.is_valid())
        self.assertIn('exit_date', form.errors)

    def test_form_negative_quantity(self):
        """Test form rejects negative quantity"""
        data = {
            'symbol_input': 'AAPL',
            'side': 'buy',
            'quantity': -100,
            'entry_price': 150.00,
            'entry_date': timezone.now().strftime('%Y-%m-%dT%H:%M'),
            'notes': 'Test trade'
        }
        form = TradeCreateForm(data=data)
        self.assertFalse(form.is_valid())
        self.assertIn('quantity', form.errors)


class MistakeModelTest(TestCase):
    """Test Mistake model validation"""

    def test_mistake_validation_empty_name(self):
        """Test that mistake name cannot be empty"""
        with self.assertRaises(ValidationError):
            mistake = Mistake(name='', category='entry')
            mistake.full_clean()

    def test_mistake_validation_invalid_category(self):
        """Test that category must be valid"""
        with self.assertRaises(ValidationError):
            mistake = Mistake(name='Test Mistake', category='invalid')
            mistake.full_clean()