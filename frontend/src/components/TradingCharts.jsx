import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const COLORS = {
  equity: '#10b981', // green-500
  rmultiple: '#3b82f6', // blue-500
  drawdown: '#ef4444', // red-500
  win: '#10b981',
  loss: '#ef4444',
  breakeven: '#94a3b8' // slate-400
};

export default function TradingCharts({ trades }) {
  const chartData = useMemo(() => {
    if (!trades || trades.length === 0) return [];

    // Filter closed trades and sort by time
    const closedTrades = trades
      .filter(t => t.exit_price !== null && t.net_pnl !== null)
      .sort((a, b) => new Date(a.trade_time) - new Date(b.trade_time));

    let cumulativeEquity = 0;
    let cumulativeR = 0;
    let peakBalance = 0;

    return closedTrades.map((trade, index) => {
      const pnl = parseFloat(trade.net_pnl);
      const r = parseFloat(trade.r_multiple) || 0;
      
      cumulativeEquity += pnl;
      cumulativeR += r;

      if (cumulativeEquity > peakBalance) {
        peakBalance = cumulativeEquity;
      }

      const drawdown = peakBalance - cumulativeEquity;

      return {
        index: index + 1,
        date: new Date(trade.trade_time).toLocaleDateString(),
        equity: cumulativeEquity,
        r_multiple: cumulativeR,
        drawdown: -drawdown, // Negative for visual representation
        trade_pnl: pnl,
        pair: trade.pair
      };
    });
  }, [trades]);

  const outcomeData = useMemo(() => {
    if (!trades) return [];
    const counts = { Win: 0, Loss: 0, BE: 0 };
    trades.forEach(t => {
      if (t.net_pnl > 0) counts.Win++;
      else if (t.net_pnl < 0) counts.Loss++;
      else if (t.net_pnl !== null) counts.BE++;
    });
    return [
      { name: 'Wins', value: counts.Win, color: COLORS.win },
      { name: 'Losses', value: counts.Loss, color: COLORS.loss },
      { name: 'BE', value: counts.BE, color: COLORS.breakeven }
    ];
  }, [trades]);

  if (!chartData.length) {
    return (
      <Card className="mb-8">
        <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
          No closed trades to display charts.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Equity Curve */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Cumulative Equity ($)</CardTitle>
        </CardHeader>
        <CardContent className="h-75">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="index" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  borderColor: 'hsl(var(--border))',
                  color: 'hsl(var(--foreground))'
                }}
                formatter={(value) => [`$${parseFloat(value).toFixed(2)}`, 'Equity']}
              />
              <Line 
                type="monotone" 
                dataKey="equity" 
                stroke={COLORS.equity} 
                strokeWidth={2} 
                dot={{ r: 4, fill: COLORS.equity }} 
                activeDot={{ r: 6 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* R-Multiple Curve */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Cumulative R-Multiple</CardTitle>
        </CardHeader>
        <CardContent className="h-75">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="index" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(value) => `${value}R`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  borderColor: 'hsl(var(--border))',
                  color: 'hsl(var(--foreground))'
                }}
                formatter={(value) => [`${parseFloat(value).toFixed(2)}R`, 'R-Multiple']}
              />
              <Line 
                type="monotone" 
                dataKey="r_multiple" 
                stroke={COLORS.rmultiple} 
                strokeWidth={2} 
                dot={{ r: 4, fill: COLORS.rmultiple }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Drawdown Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Drawdown ($)</CardTitle>
        </CardHeader>
        <CardContent className="h-75">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="index" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  borderColor: 'hsl(var(--border))',
                  color: 'hsl(var(--foreground))'
                }}
                formatter={(value) => [`$${Math.abs(value).toFixed(2)}`, 'Drawdown']}
              />
              <Area 
                type="monotone" 
                dataKey="drawdown" 
                stroke={COLORS.drawdown} 
                fill={COLORS.drawdown} 
                fillOpacity={0.2} 
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Outcome Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Win/Loss Distribution</CardTitle>
        </CardHeader>
        <CardContent className="h-75">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={outcomeData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  borderColor: 'hsl(var(--border))',
                  color: 'hsl(var(--foreground))'
                }}
              />
              <Bar dataKey="value">
                {outcomeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
