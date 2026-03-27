import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./ui/card";

export default function TradeForm({ initialData = null, onSubmit, onCancel }) {
  const isEditing = !!initialData;

  const getLocalISOString = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now - offset).toISOString().slice(0, 16);
  };

  const defaultState = {
    pair: "",
    direction: "BUY",
    lot_size: "",
    entry_price: "",
    exit_price: "",
    stop_loss: "",
    take_profit: "",
    trade_time: getLocalISOString(),
    commissions: "0",
    mistakes: "",
    screenshot_url: ""
  };

  const [formData, setFormData] = useState(defaultState);

  useEffect(() => {
    if (initialData) {
      const formattedDate = initialData.trade_time 
        ? new Date(initialData.trade_time).toISOString().slice(0, 16)
        : defaultState.trade_time;

      const formattedMistakes = Array.isArray(initialData.mistakes) 
        ? initialData.mistakes.join('\n') 
        : initialData.mistakes || "";

      setFormData({
        ...defaultState,
        ...initialData,
        trade_time: formattedDate,
        mistakes: formattedMistakes,
        commissions: initialData.commissions !== undefined ? initialData.commissions.toString() : "0"
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const processedData = {
      ...formData,
      lot_size: formData.lot_size ? parseFloat(formData.lot_size) : 0,
      entry_price: formData.entry_price ? parseFloat(formData.entry_price) : 0,
      exit_price: formData.exit_price ? parseFloat(formData.exit_price) : null,
      stop_loss: formData.stop_loss ? parseFloat(formData.stop_loss) : 0,
      take_profit: formData.take_profit ? parseFloat(formData.take_profit) : null,
      commissions: formData.commissions ? parseFloat(formData.commissions) : 0,
      trade_time: new Date(formData.trade_time).toISOString(),
      mistakes: formData.mistakes ? formData.mistakes.split('\n').map(m => m.trim()).filter(m => m !== '') : [],
    };

    onSubmit(processedData);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Trade" : "Add New Trade"}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Trading Pair</label>
              <Input
                name="pair"
                value={formData.pair}
                onChange={handleChange}
                placeholder="e.g. XAUUSD, EURUSD"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Direction</label>
              <select
                name="direction"
                value={formData.direction}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Lot Size</label>
              <Input
                name="lot_size"
                type="number"
                step="0.01"
                value={formData.lot_size}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Entry Price</label>
              <Input
                name="entry_price"
                type="number"
                step="0.000001"
                value={formData.entry_price}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Exit Price</label>
              <Input
                name="exit_price"
                type="number"
                step="0.000001"
                value={formData.exit_price}
                onChange={handleChange}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Stop Loss</label>
              <Input
                name="stop_loss"
                type="number"
                step="0.000001"
                value={formData.stop_loss}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Take Profit</label>
              <Input
                name="take_profit"
                type="number"
                step="0.000001"
                value={formData.take_profit}
                onChange={handleChange}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Trade Time</label>
              <Input
                name="trade_time"
                type="datetime-local"
                value={formData.trade_time}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Commission ($)</label>
              <Input
                name="commissions"
                type="number"
                step="0.01"
                value={formData.commissions}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Mistakes / Notes</label>
            <textarea
              name="mistakes"
              value={formData.mistakes}
              onChange={handleChange}
              className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Any psychological mistakes or notes..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Screenshot URL</label>
            <Input
              name="screenshot_url"
              value={formData.screenshot_url}
              onChange={handleChange}
              placeholder="https://imgur.com/..."
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {isEditing ? "Update Trade" : "Create Trade"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
