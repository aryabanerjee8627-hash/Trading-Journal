from django.core.management.base import BaseCommand
from django.db.models import Count, Sum, Avg, Q, F
from journal.models import Trade, Mistake
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'Run analytics queries on trading journal data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user',
            type=str,
            help='Username to analyze (default: all users)',
        )

    def handle(self, *args, **options):
        username = options.get('user')
        if username:
            try:
                user = User.objects.get(username=username)
                self.stdout.write(f'Analyzing data for user: {username}')
                self.run_analytics(user)
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'User "{username}" not found'))
        else:
            # Analyze all users
            users = User.objects.all()
            for user in users:
                if user.trades.exists():
                    self.stdout.write(f'\n=== ANALYZING USER: {user.username} ===')
                    self.run_analytics(user)

    def run_analytics(self, user):
        """Run all analytics queries for a user"""

        self.stdout.write('\n1. RULE-FOLLOWED VS RULE-BROKEN P&L ANALYSIS')
        self.rule_followed_analysis(user)

        self.stdout.write('\n2. EMOTION VS WIN RATE ANALYSIS')
        self.emotion_win_rate_analysis(user)

        self.stdout.write('\n3. MISTAKE FREQUENCY ANALYSIS')
        self.mistake_frequency_analysis(user)

    def rule_followed_analysis(self, user):
        """
        Compare P&L between trades where rules were followed (closed trades)
        vs trades where rules were broken (open trades).

        Rule-followed = Closed trades (both entry and exit properly executed)
        Rule-broken = Open trades (position not properly closed)
        """
        trades = user.trades.all()

        # Rule-followed: Closed trades (have both entry and exit)
        closed_trades = trades.exclude(exit_price__isnull=True).exclude(exit_date__isnull=True)
        closed_count = closed_trades.count()
        closed_pnl = sum((trade.pnl or 0) for trade in closed_trades)

        # Rule-broken: Open trades (missing exit data)
        open_trades = trades.filter(
            Q(exit_price__isnull=True) | Q(exit_date__isnull=True)
        )
        open_count = open_trades.count()
        # Open trades have unrealized P&L (could be positive or negative)
        open_pnl = sum((trade.pnl or 0) for trade in open_trades)

        self.stdout.write(f'  Closed trades (Rule-followed): {closed_count} trades, P&L: ${closed_pnl:.2f}')
        self.stdout.write(f'  Open trades (Rule-broken): {open_count} trades, Unrealized P&L: ${open_pnl:.2f}')

        if closed_count > 0:
            avg_closed_pnl = closed_pnl / closed_count
            self.stdout.write(f'  Average P&L per closed trade: ${avg_closed_pnl:.2f}')

        if closed_count + open_count > 0:
            rule_followed_percentage = (closed_count / (closed_count + open_count)) * 100
            self.stdout.write(f'  Rule compliance rate: {rule_followed_percentage:.1f}%')

    def emotion_win_rate_analysis(self, user):
        """
        Analyze win rates for trades with emotional mistakes vs trades without.

        Emotional mistakes include: FOMO, revenge trading, overconfidence, hesitation, confirmation bias
        """
        trades = user.trades.all()

        # Define emotional mistake categories
        emotional_mistakes = [
            'FOMO trading', 'Revenge trading', 'Overconfidence',
            'Hesitation', 'Confirmation bias'
        ]

        # Get emotional mistake objects
        emotion_mistake_objects = Mistake.objects.filter(name__in=emotional_mistakes)

        # Trades with emotional mistakes
        emotional_trades = trades.filter(mistakes__in=emotion_mistake_objects).distinct()
        emotional_count = emotional_trades.count()

        # Trades without emotional mistakes
        non_emotional_trades = trades.exclude(mistakes__in=emotion_mistake_objects).distinct()
        non_emotional_count = non_emotional_trades.count()

        # Calculate win rates (profitable closed trades)
        def calculate_win_rate(trade_queryset):
            closed = trade_queryset.exclude(exit_price__isnull=True).exclude(exit_date__isnull=True)
            if closed.count() == 0:
                return 0, 0

            # Wins: trades where we made money
            wins = closed.filter(
                Q(side='buy', exit_price__gt=F('entry_price')) |
                Q(side='sell', exit_price__lt=F('entry_price'))
            ).count()

            return wins, closed.count()

        emotion_wins, emotion_total = calculate_win_rate(emotional_trades)
        non_emotion_wins, non_emotion_total = calculate_win_rate(non_emotional_trades)

        emotion_win_rate = (emotion_wins / emotion_total * 100) if emotion_total > 0 else 0
        non_emotion_win_rate = (non_emotion_wins / non_emotion_total * 100) if non_emotion_total > 0 else 0

        self.stdout.write(f'  Emotional trades: {emotional_count} total, {emotion_total} closed, {emotion_wins} wins ({emotion_win_rate:.1f}% win rate)')
        self.stdout.write(f'  Non-emotional trades: {non_emotional_count} total, {non_emotion_total} closed, {non_emotion_wins} wins ({non_emotion_win_rate:.1f}% win rate)')

        if emotion_total > 0 and non_emotion_total > 0:
            rate_diff = emotion_win_rate - non_emotion_win_rate
            self.stdout.write(f'  Win rate difference: {rate_diff:+.1f}% (emotional vs non-emotional)')

    def mistake_frequency_analysis(self, user):
        """
        Analyze the frequency of different mistake types across all trades.
        Shows which mistakes occur most often and their impact.
        """
        trades = user.trades.all()

        # Get all mistakes and their frequencies
        mistake_stats = []

        for mistake in Mistake.objects.all():
            # Count trades with this mistake
            trade_count = trades.filter(mistakes=mistake).count()

            if trade_count > 0:
                # Calculate average P&L for trades with this mistake
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

        # Sort by frequency (most common first)
        mistake_stats.sort(key=lambda x: x['frequency'], reverse=True)

        self.stdout.write('  Top 10 most frequent mistakes:')
        for i, stat in enumerate(mistake_stats[:10], 1):
            self.stdout.write(f'    {i}. {stat["name"]} ({stat["category"]})')
            self.stdout.write(f'       Frequency: {stat["frequency"]} trades, Avg P&L: ${stat["avg_pnl"]:.2f}, Total P&L: ${stat["total_pnl"]:.2f}')

        if not mistake_stats:
            self.stdout.write('    No mistakes tagged in trades yet.')

        # Category breakdown
        self.stdout.write('\n  Mistakes by category:')
        category_stats = {}
        for stat in mistake_stats:
            cat = stat['category']
            if cat not in category_stats:
                category_stats[cat] = {'count': 0, 'total_pnl': 0}
            category_stats[cat]['count'] += stat['frequency']
            category_stats[cat]['total_pnl'] += stat['total_pnl']

        for category, data in sorted(category_stats.items(), key=lambda x: x[1]['count'], reverse=True):
            avg_pnl = data['total_pnl'] / data['count'] if data['count'] > 0 else 0
            self.stdout.write(f'    {category}: {data["count"]} occurrences, Avg P&L: ${avg_pnl:.2f}')