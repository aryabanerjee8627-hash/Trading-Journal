from django.core.management.base import BaseCommand
from journal.models import Mistake


class Command(BaseCommand):
    help = 'Populate the database with predefined trading mistakes'

    def handle(self, *args, **options):
        mistakes_data = [
            # Entry Timing Mistakes
            ('Entered too early', 'Entered position before confirmation signals', 'entry'),
            ('Entered too late', 'Missed optimal entry point, entered after move began', 'entry'),
            ('Chased the price', 'Bought/sold at worse price trying to catch momentum', 'entry'),
            ('Counter-trend entry', 'Entered against prevailing trend', 'entry'),

            # Exit Timing Mistakes
            ('Exited too early', 'Closed profitable trade before target was reached', 'exit'),
            ('Exited too late', 'Held losing position hoping for recovery', 'exit'),
            ('Pyramid selling', 'Sold winners too quickly, held losers too long', 'exit'),
            ('No stop loss', 'Entered without predefined exit plan', 'exit'),

            # Position Sizing Mistakes
            ('Position too large', 'Risked too much capital on single trade', 'position'),
            ('Position too small', 'Risked too little, missed opportunity', 'position'),
            ('Added to loser', 'Increased position size after loss (revenge trading)', 'position'),
            ('Over-leveraged', 'Used excessive leverage relative to account size', 'position'),

            # Risk Management Mistakes
            ('No risk-reward ratio', 'Did not consider potential profit vs loss', 'risk'),
            ('Risked >1% per trade', 'Violated position sizing rules', 'risk'),
            ('No diversification', 'Too concentrated in one asset/strategy', 'risk'),
            ('Ignored correlation', 'Did not account for related asset movements', 'risk'),

            # Psychology/Emotion Mistakes
            ('FOMO trading', 'Entered due to fear of missing out', 'psychology'),
            ('Revenge trading', 'Traded to recover losses after bad trade', 'psychology'),
            ('Overconfidence', 'Traded too aggressively after wins', 'psychology'),
            ('Hesitation', 'Failed to act on valid signals due to fear', 'psychology'),
            ('Confirmation bias', 'Only saw evidence supporting desired outcome', 'psychology'),

            # Analysis/Research Mistakes
            ('Insufficient research', 'Did not properly analyze fundamentals/technicals', 'analysis'),
            ('Ignored news/events', 'Failed to account for scheduled news or events', 'analysis'),
            ('Over-relied on indicators', 'Used too many conflicting signals', 'analysis'),
            ('Recency bias', 'Based decisions on recent events only', 'analysis'),

            # Trade Execution Mistakes
            ('Slippage', 'Got worse price than expected due to market movement', 'execution'),
            ('Poor order type', 'Used market order when limit would have been better', 'execution'),
            ('Partial fill issues', 'Did not account for partial order fills', 'execution'),
            ('Platform errors', 'Mistakes due to trading platform issues', 'execution'),

            # Other Mistakes
            ('Journal not updated', 'Failed to record trade details properly', 'other'),
            ('No trading plan', 'Traded without predefined strategy', 'other'),
            ('Market hours mistake', 'Traded during unfavorable market hours', 'other'),
            ('Cost ignorance', 'Did not account for fees, spreads, commissions', 'other'),
        ]

        created_count = 0
        for name, description, category in mistakes_data:
            mistake, created = Mistake.objects.get_or_create(
                name=name,
                defaults={
                    'description': description,
                    'category': category
                }
            )
            if created:
                created_count += 1

        self.stdout.write(
            self.style.SUCCESS(f'Successfully populated {created_count} trading mistakes')
        )