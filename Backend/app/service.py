from decimal import Decimal
from datetime import time

def detect_instrument(pair : str):
    pair = pair.upper()
    if "XAU" in pair:
        return"gold"
    else:
        return "forex"


def detect_trading_session(trade_time):
    t = trade_time.time()
    if time(0,0) <= t < time(8,0):
        return "A"
    elif time(8,0) <= t < time(13,0):
        return "L"
    elif time(13,0) <= t < time(22,0):
        return "NY"
    return None

def get_pip_value_multiplier(pair):
    pair = pair.upper()
    if "XAU" in pair:
        return Decimal("100") 
    elif "JPY" in pair:
        return Decimal("1000")
    else:
        return Decimal("100000")

def calculate_pnl_risk(pair, direction, entry_price, exit_price, lot_size, stop_loss, commissions):
    entry_price = Decimal(str(entry_price))
    lot_size = Decimal(str(lot_size))
    stop_loss = Decimal(str(stop_loss))

    multiplier = get_pip_value_multiplier(pair)

    if commissions is None:
        commissions = Decimal("0")
    else:
        commissions = Decimal(str(commissions))

    pair_upper = pair.upper()
    
    if "XAU" in pair_upper:
        pip_factor = Decimal("10")
    elif "JPY" in pair_upper:
        pip_factor = Decimal("100")
    else:
        pip_factor = Decimal("10000")

    risk_pips = abs(entry_price - stop_loss) * pip_factor
    risk = risk_pips * (multiplier / pip_factor) * lot_size
    risk = abs(entry_price - stop_loss) * multiplier * lot_size

    gross_pnl = None
    r_multiple = None
    net_pnl = None

    if exit_price is not None:
        exit_price = Decimal(str(exit_price))
        if direction.upper() == "BUY":
            price_diff = exit_price - entry_price
        else:
            price_diff = entry_price - exit_price

        gross_pnl = price_diff * multiplier * lot_size

        if risk != 0:
            r_multiple = gross_pnl / risk

        net_pnl = gross_pnl - commissions

    return (gross_pnl, risk, r_multiple, net_pnl)


def calculate_stats(trades):
    total_trades = 0
    winning_trades = 0
    total_pnl = Decimal("0")
    
    # For drawdown calculation
    # Sort trades by time just in case, though they usually come sorted from DB
    sorted_trades = sorted(trades, key=lambda x: x.trade_time)
    
    peak_balance = Decimal("0")
    current_balance = Decimal("0")
    max_drawdown = Decimal("0")

    for trade in sorted_trades:
        # Only consider closed trades for stats
        if trade.net_pnl is not None:
            total_trades += 1
            pnl = Decimal(str(trade.net_pnl))
            total_pnl += pnl
            
            if pnl > 0:
                winning_trades += 1
            
            # Drawdown logic
            current_balance += pnl
            if current_balance > peak_balance:
                peak_balance = current_balance
            
            drawdown = peak_balance - current_balance
            if drawdown > max_drawdown:
                max_drawdown = drawdown

    win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0
    expectancy = (total_pnl / total_trades) if total_trades > 0 else Decimal("0")

    return {
        "win_rate": round(win_rate, 2),
        "profitability": total_pnl,
        "max_drawdown": max_drawdown,
        "expectancy": expectancy,
        "total_trades": total_trades
    }