from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db import models
from .forms import TradeCreateForm


def signup_view(request):
    """
    Handle user registration with email and password.
    Uses Django's built-in UserCreationForm for secure password handling.
    """
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)  # Auto-login after signup
            messages.success(request, 'Account created successfully!')
            return redirect('journal:trade_list')  # Will create this view later
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        form = UserCreationForm()

    return render(request, 'journal/signup.html', {'form': form})


def login_view(request):
    """
    Handle user login with username and password.
    Uses Django's built-in AuthenticationForm for security.
    """
    if request.method == 'POST':
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password')
            user = authenticate(username=username, password=password)
            if user is not None:
                login(request, user)
                messages.success(request, f'Welcome back, {username}!')
                return redirect('journal:trade_list')  # Will create this view later
            else:
                messages.error(request, 'Invalid username or password.')
        else:
            messages.error(request, 'Invalid username or password.')
    else:
        form = AuthenticationForm()

    return render(request, 'journal/login.html', {'form': form})


def logout_view(request):
    """
    Handle user logout.
    Uses Django's built-in logout function.
    """
    logout(request)
    messages.info(request, 'You have been logged out.')
    return redirect('journal:login')


@login_required
def trade_create(request):
    """
    View for creating a new trade in the journal.
    Only logged-in users can create trades.
    """
    if request.method == 'POST':
        form = TradeCreateForm(request.POST, user=request.user)
        if form.is_valid():
            try:
                # Save the trade with the current user
                trade = form.save(user=request.user)
                messages.success(
                    request,
                    f'Trade for {trade.symbol.symbol} has been added to your journal!'
                )
                return redirect('journal:trade_list')
            except Exception as e:
                # Handle unexpected errors during save
                messages.error(
                    request,
                    f'Error saving trade: {str(e)}. Please try again.'
                )
        else:
            messages.error(
                request,
                'Please correct the errors below and try again.'
            )
    else:
        form = TradeCreateForm(user=request.user)

    return render(request, 'journal/trade_create.html', {
        'form': form,
        'title': 'Add New Trade'
    })


@login_required
def trade_update(request, trade_id):
    """
    View for updating an existing trade.
    Only the trade owner can edit their trades.
    """
    # Validate trade_id is a valid integer
    try:
        trade_id = int(trade_id)
    except (ValueError, TypeError):
        messages.error(request, 'Invalid trade ID.')
        return redirect('journal:trade_list')

    # Get the trade, ensuring it belongs to the current user
    trade = get_object_or_404(request.user.trades, id=trade_id)

    if request.method == 'POST':
        form = TradeCreateForm(request.POST, instance=trade, user=request.user)
        if form.is_valid():
            try:
                # Save the updated trade (user remains the same)
                updated_trade = form.save(user=request.user)
                messages.success(
                    request,
                    f'Trade for {updated_trade.symbol.symbol} has been updated!'
                )
                return redirect('journal:trade_list')
            except Exception as e:
                messages.error(
                    request,
                    f'Error updating trade: {str(e)}. Please try again.'
                )
        else:
            messages.error(
                request,
                'Please correct the errors below and try again.'
            )
    else:
        # Pre-populate form with existing trade data
        form = TradeCreateForm(instance=trade , user=request.user)

    return render(request, 'journal/trade_create.html', {
        'form': form,
        'title': f'Edit Trade: {trade.symbol.symbol}',
        'trade': trade,  # Pass trade for additional context
    })


@login_required
def trade_delete(request, trade_id):
    """
    View for deleting a trade.
    Only the trade owner can delete their trades.
    """
    # Validate trade_id is a valid integer
    try:
        trade_id = int(trade_id)
    except (ValueError, TypeError):
        messages.error(request, 'Invalid trade ID.')
        return redirect('journal:trade_list')

    # Get the trade, ensuring it belongs to the current user
    trade = get_object_or_404(request.user.trades, id=trade_id)

    if request.method == 'POST':
        try:
            # Store info before deletion for message
            symbol_name = trade.symbol.symbol
            trade.delete()
            messages.success(
                request,
                f'Trade for {symbol_name} has been deleted from your journal.'
            )
        except Exception as e:
            messages.error(
                request,
                f'Error deleting trade: {str(e)}. Please try again.'
            )
        return redirect('journal:trade_list')

    # GET request - show confirmation page
    return render(request, 'journal/trade_delete.html', {
        'trade': trade,
        'title': f'Delete Trade: {trade.symbol.symbol}'
    })


@login_required
def trade_list(request):
    """
    Display a filtered list of trades for the logged-in user.

    Supports filtering by:
    - Date range (start_date, end_date)
    - Symbol/Asset (symbol)
    - Side (buy/sell) - strategy filter
    - Status (open/closed) - rule followed filter
    """
    # Start with all trades for the current user
    trades = request.user.trades.all()

    # Apply filters from GET parameters
    filters_applied = []

    # Date range filter
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')

    if start_date:
        trades = trades.filter(entry_date__date__gte=start_date)
        filters_applied.append(f"From {start_date}")

    if end_date:
        trades = trades.filter(entry_date__date__lte=end_date)
        filters_applied.append(f"To {end_date}")

    # Symbol/Asset filter
    symbol_filter = request.GET.get('symbol')
    if symbol_filter:
        trades = trades.filter(symbol__symbol__iexact=symbol_filter.strip())
        filters_applied.append(f"Symbol: {symbol_filter.upper()}")

    # Strategy filter (maps to side: buy/sell)
    strategy = request.GET.get('strategy')
    if strategy in ['buy', 'sell']:
        trades = trades.filter(side=strategy)
        filters_applied.append(f"Strategy: {strategy.title()}")

    # Rule followed filter (maps to status: open/closed)
    rule_followed = request.GET.get('rule_followed')
    if rule_followed == 'yes':
        # Closed trades (both exit_price and exit_date present)
        trades = trades.exclude(exit_price__isnull=True).exclude(exit_date__isnull=True)
        filters_applied.append("Rule followed: Yes (Closed)")
    elif rule_followed == 'no':
        # Open trades (either exit_price or exit_date missing)
        trades = trades.filter(
            models.Q(exit_price__isnull=True) | models.Q(exit_date__isnull=True)
        )
        filters_applied.append("Rule followed: No (Open)")

    # Get unique symbols for the filter dropdown
    user_symbols = request.user.trades.values_list(
        'symbol__symbol', flat=True
    ).distinct().order_by('symbol__symbol')

    # Calculate summary statistics
    closed_trades = trades.exclude(exit_price__isnull=True).exclude(exit_date__isnull=True)
    total_pnl = sum((trade.pnl or 0) for trade in closed_trades)

    context = {
        'trades': trades.order_by('-entry_date'),  # Most recent first
        'filters_applied': filters_applied,
        'user_symbols': user_symbols,
        'total_trades': trades.count(),
        'closed_trades': closed_trades.count(),
        'open_trades': trades.count() - closed_trades.count(),
        'total_pnl': total_pnl,
        'filter_params': request.GET,  # For form repopulation
    }

    return render(request, 'journal/trade_list.html', context)
