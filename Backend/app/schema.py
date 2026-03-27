from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from decimal import Decimal

class TradeBase(BaseModel):
    pair: str

    direction: str        
    lot_size: Decimal

    entry_price: Decimal
    exit_price: Optional[Decimal] = None

    stop_loss: Decimal
    take_profit: Optional[Decimal] = None

    trade_time: datetime

    commissions: Optional[Decimal] = Decimal("0")

    gross_pnl: Optional[Decimal] = None
    net_pnl: Optional[Decimal] = None
    r_multiple: Optional[Decimal] = None

    mistakes: Optional[list[str]] = None
    screenshot_url: Optional[str] = None


class TradeCreate(TradeBase):
    pass


class TradeUpdate(BaseModel):

    pair: Optional[str] = None

    direction: Optional[str] = None
    lot_size: Optional[Decimal] = None

    entry_price: Optional[Decimal] = None
    exit_price: Optional[Decimal] = None

    stop_loss: Optional[Decimal] = None
    take_profit: Optional[Decimal] = None

    trade_time: Optional[datetime] = None

    commissions: Optional[Decimal] = None

    mistakes: Optional[list[str]] = None
    screenshot_url: Optional[str] = None


class Trade(TradeBase):
    id: int
    class Config:
        from_attributes = True

class TradeStats(BaseModel):
    win_rate: float
    profitability: Decimal
    max_drawdown: Decimal
    expectancy: Decimal
    total_trades: int
