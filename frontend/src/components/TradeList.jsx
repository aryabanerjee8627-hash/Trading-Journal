import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Button } from "./ui/button";
import { Pencil, Trash2, ExternalLink } from "lucide-react";

export default function TradeList({ trades, onEdit, onDelete }) {
  if (!trades || trades.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg bg-card">
        <p className="text-muted-foreground">No trades recorded yet.</p>
      </div>
    );
  }

  const formatPnL = (pnl) => {
    if (pnl === null || pnl === undefined) return "-";
    const value = parseFloat(pnl).toFixed(2);
    const color = parseFloat(pnl) >= 0 ? "text-green-600" : "text-red-600";
    return <span className={`font-medium ${color}`}>{value >= 0 ? `+$${value}` : `-$${Math.abs(value)}`}</span>;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Pair</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Lot</TableHead>
            <TableHead>Entry</TableHead>
            <TableHead>Exit</TableHead>
            <TableHead>Net PnL</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.map((trade) => (
            <TableRow key={trade.id}>
              <TableCell className="text-muted-foreground text-xs">
                {formatDate(trade.trade_time)}
              </TableCell>
              <TableCell className="font-bold">{trade.pair}</TableCell>
              <TableCell>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  trade.direction === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {trade.direction}
                </span>
              </TableCell>
              <TableCell>{trade.lot_size}</TableCell>
              <TableCell className="font-mono text-xs">{parseFloat(trade.entry_price).toFixed(5)}</TableCell>
              <TableCell className="font-mono text-xs">{trade.exit_price ? parseFloat(trade.exit_price).toFixed(5) : "-"}</TableCell>
              <TableCell>{formatPnL(trade.net_pnl)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {trade.screenshot_url && (
                    <Button variant="ghost" size="icon" onClick={() => window.open(trade.screenshot_url, '_blank')}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => onEdit(trade)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDelete(trade.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
