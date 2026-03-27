from sqlalchemy import Column, Integer, Float, String, DateTime , Numeric
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import ARRAY
from app.database import Base


class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(String, index=True)

    pair = Column(String, nullable=False)
    direction = Column(String, nullable=False)

    lot_size = Column(Float)

    entry_price = Column(Numeric(20, 6))
    exit_price = Column(Numeric(20, 6))

    stop_loss = Column(Numeric(20, 6))
    take_profit = Column(Numeric(20, 6))

    risk_amount = Column(Float)

    gross_pnl = Column(Numeric(20, 6))
    commissions = Column(Float)
    net_pnl = Column(Numeric(20, 6))

    r_multiple = Column(Float)

    trade_time = Column(DateTime(timezone=True))

    mistakes = Column(ARRAY(String))

    screenshot_url = Column(String)

    created_at = Column(DateTime(timezone=True), server_default=func.now())