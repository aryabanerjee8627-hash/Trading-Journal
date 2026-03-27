from sqlalchemy.orm import Session
from app import models, schema
from app.service import calculate_pnl_risk


def create_trade(db: Session, trade: schema.TradeCreate, user_id: str):

    gross_pnl, risk, r_multiple, net_pnl = calculate_pnl_risk(
        trade.pair,
        trade.direction,
        trade.entry_price,
        trade.exit_price,
        trade.lot_size,
        trade.stop_loss,
        trade.commissions
    )

    db_trade = models.Trade(
        user_id=user_id,
        pair=trade.pair,
        direction=trade.direction,
        lot_size=trade.lot_size,
        entry_price=trade.entry_price,
        exit_price=trade.exit_price,
        stop_loss=trade.stop_loss,
        take_profit=trade.take_profit,
        trade_time=trade.trade_time,
        commissions=trade.commissions,
        gross_pnl=gross_pnl,
        net_pnl=net_pnl,
        r_multiple=r_multiple,
        risk_amount=risk,
        mistakes=trade.mistakes,
        screenshot_url=trade.screenshot_url,
    )

    db.add(db_trade)
    db.commit()
    db.refresh(db_trade)

    return db_trade


def get_trades(db: Session, user_id: str):

    return db.query(models.Trade).filter(
        models.Trade.user_id == user_id
    ).all()


def get_one_trade(db: Session, user_id: str, id: int):

    return db.query(models.Trade).filter(
        models.Trade.user_id == user_id,
        models.Trade.id == id
    ).first()


def update_trade(db: Session, user_id: str, id: int, trade_update: schema.TradeUpdate):

    trade = get_one_trade(db, user_id, id)

    if not trade:
        return None

    update_data = trade_update.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(trade, key, value)

    # Always recalculate risk and PnL stats to keep them in sync with updated values
    gross_pnl, risk, r_multiple, net_pnl = calculate_pnl_risk(
        trade.pair,
        trade.direction,
        trade.entry_price,
        trade.exit_price,
        trade.lot_size,
        trade.stop_loss,
        trade.commissions
    )

    trade.risk_amount = risk
    trade.gross_pnl = gross_pnl
    trade.net_pnl = net_pnl
    trade.r_multiple = r_multiple

    db.commit()
    db.refresh(trade)

    return trade


def delete_trade(db: Session, user_id: str, id: int):

    trade = get_one_trade(db, user_id, id)

    if trade:
        db.delete(trade)
        db.commit()

    return trade