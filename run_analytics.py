#!/usr/bin/env python
"""
Run analytics queries on trading journal data
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'trading_journal.settings')
django.setup()

from journal.models import Trade, Mistake
from django.contrib.auth.models import User
from django.db.models import Q, F

def run_analytics():
    # Get user
    user = User.objects.get(username='user0')

    print('=== ANALYTICS QUERIES DEMONSTRATION ===')
    print(f'Analyzing data for user: {user.username}')
    print(f'Total trades: {user.trades.count()}')

    # 1. Rule-followed vs Rule-broken P&L Analysis
    print('\n1. RULE-FOLLOWED VS RULE-BROKEN P&L ANALYSIS')
    trades = user.trades.all()

    closed_trades = trades.exclude(exit_price__isnull=True).exclude(exit_date__isnull=True)
    closed_count = closed_trades.count()
    closed_pnl = sum((trade.pnl or 0) for trade in closed_trades)

    open_trades = trades.filter(Q(exit_price__isnull=True) | Q(exit_date__isnull=True))
    open_count = open_trades.count()
    open_pnl = sum((trade.pnl or 0) for trade in open_trades)

    print(f'  Closed trades (Rule-followed): {closed_count} trades, P&L: ${closed_pnl:.2f}')
    print(f'  Open trades (Rule-broken): {open_count} trades, Unrealized P&L: ${open_pnl:.2f}')

    if closed_count > 0:
        avg_closed_pnl = closed_pnl / closed_count
        print(f'  Average P&L per closed trade: ${avg_closed_pnl:.2f}')

    if closed_count + open_count > 0:
        rule_followed_percentage = (closed_count / (closed_count + open_count)) * 100
        print(f'  Rule compliance rate: {rule_followed_percentage:.1f}%')

    # 2. Emotion vs Win Rate Analysis
    print('\n2. EMOTION VS WIN RATE ANALYSIS')

    emotional_mistakes = ['FOMO trading', 'Revenge trading', 'Overconfidence', 'Hesitation', 'Confirmation bias']
    emotion_mistake_objects = Mistake.objects.filter(name__in=emotional_mistakes)

    emotional_trades = trades.filter(mistakes__in=emotion_mistake_objects).distinct()
    non_emotional_trades = trades.exclude(mistakes__in=emotion_mistake_objects).distinct()

    def calculate_win_rate(trade_queryset):
        closed = trade_queryset.exclude(exit_price__isnull=True).exclude(exit_date__isnull=True)
        if closed.count() == 0:
            return 0, 0

        wins = closed.filter(
            Q(side='buy', exit_price__gt=F('entry_price')) |
            Q(side='sell', exit_price__lt=F('entry_price'))
        ).count()

        return wins, closed.count()

    emotion_wins, emotion_total = calculate_win_rate(emotional_trades)
    non_emotion_wins, non_emotion_total = calculate_win_rate(non_emotional_trades)

    emotion_win_rate = (emotion_wins / emotion_total * 100) if emotion_total > 0 else 0
    non_emotion_win_rate = (non_emotion_wins / non_emotion_total * 100) if non_emotion_total > 0 else 0

    print(f'  Emotional trades: {emotional_trades.count()} total, {emotion_total} closed, {emotion_wins} wins ({emotion_win_rate:.1f}% win rate)')
    print(f'  Non-emotional trades: {non_emotional_trades.count()} total, {non_emotion_total} closed, {non_emotion_wins} wins ({non_emotion_win_rate:.1f}% win rate)')

    if emotion_total > 0 and non_emotion_total > 0:
        rate_diff = emotion_win_rate - non_emotion_win_rate
        print(f'  Win rate difference: {rate_diff:+.1f}% (emotional vs non-emotional)')

    # 3. Mistake Frequency Analysis
    print('\n3. MISTAKE FREQUENCY ANALYSIS')

    mistake_stats = []
    for mistake in Mistake.objects.all():
        trade_count = trades.filter(mistakes=mistake).count()

        if trade_count > 0:
            mistake_trades = trades.filter(mistakes=mistake)
            closed_mistake_trades = mistake_trades.exclude(exit_price__isnull=True).exclude(exit_date__isnull=True)

            total_pnl = sum((trade.pnl or 0) for trade in closed_mistake_trades)
            avg_pnl = total_pnl / closed_mistake_trades.count() if closed_mistake_trades.count() > 0 else 0

            mistake_stats.append({
                'name': mistake.name,
                'category': mistake.get_category_display(),
                'frequency': trade_count,
                'avg_pnl': avg_pnl,
                'total_pnl': total_pnl
            })

    mistake_stats.sort(key=lambda x: x['frequency'], reverse=True)

    print('  Top 5 most frequent mistakes:')
    for i, stat in enumerate(mistake_stats[:5], 1):
        print(f'    {i}. {stat["name"]} ({stat["category"]})')
        print(f'       Frequency: {stat["frequency"]} trades, Avg P&L: ${stat["avg_pnl"]:.2f}, Total P&L: ${stat["total_pnl"]:.2f}')

    if not mistake_stats:
        print('    No mistakes tagged in trades yet.')

    print('\n✅ Analytics queries completed!')

if __name__ == '__main__':
    run_analytics()