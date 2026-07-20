import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Trophy, TrendingUp, TrendingDown, Target, DollarSign, Percent, AlertCircle, Calculator } from 'lucide-react';

export default function StatsCards({ stats }) {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted rounded"></div>
              <div className="h-4 w-4 bg-muted rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatCurrency = (value) => {
    const num = parseFloat(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(num);
  };

  const cards = [
    {
      title: "Win Rate",
      value: `${stats.win_rate}%`,
      icon: Trophy,
      color: "text-yellow-600",
      description: "Percentage of profitable trades"
    },
    {
      title: "Profitability",
      value: formatCurrency(stats.profitability),
      icon: stats.profitability >= 0 ? TrendingUp : TrendingDown,
      color: stats.profitability >= 0 ? "text-green-600" : "text-red-600",
      description: "Total Net PnL"
    },
    {
      title: "Max Drawdown",
      value: formatCurrency(stats.max_drawdown),
      icon: AlertCircle,
      color: "text-red-600",
      description: "Maximum equity drop"
    },
    {
      title: "Expectancy",
      value: formatCurrency(stats.expectancy),
      icon: Target,
      color: "text-blue-600",
      description: "Average PnL per trade"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: index * 0.08,
              duration: 0.4,
              ease: [0.25, 1, 0.5, 1],
            }}
            whileHover={{
              scale: 1.02,
              y: -4,
              boxShadow: '0 8px 30px hsl(var(--primary) / 0.08)',
            }}
            style={{ originY: 0 }}
          >
            <Card className="cursor-pointer transition-colors duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                <p className="text-xs text-muted-foreground">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
