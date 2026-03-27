from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import schema, crud
from app.database import get_db
from app.auth import get_current_user
from app.service import calculate_stats

router = APIRouter(
    prefix="/trades",
    tags=["Trade"]
)

@router.get("/stats", response_model=schema.TradeStats)
async def get_stats(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    trades = crud.get_trades(db, user_id)
    return calculate_stats(trades)

@router.get("/", response_model=list[schema.Trade])
async def get_trades(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    trades = crud.get_trades(db, user_id)
    return trades

@router.get("/{trade_id}", response_model=schema.Trade)
async def get_one_trade(trade_id: int, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    trade = crud.get_one_trade(db, user_id, trade_id)
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    return trade

@router.post("/", response_model=schema.Trade)
async def create_trade(trade: schema.TradeCreate, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    return crud.create_trade(db, trade, user_id)

@router.put("/{trade_id}", response_model=schema.Trade)
async def update_trade(trade_id: int, trade: schema.TradeUpdate, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    updated_trade = crud.update_trade(db, user_id, trade_id, trade)
    if not updated_trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    return updated_trade

@router.delete("/{trade_id}")
async def delete_trade(trade_id: int, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    trade = crud.delete_trade(db, user_id, trade_id)
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    return {"message": "Trade deleted successfully"}
