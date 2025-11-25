import numpy as np
import pandas as pd


class Backtester:
    def __init__(self):
        pass

    def run(
        self,
        prices: pd.DataFrame,
        signals: pd.DataFrame,
        stop_loss_pct: float | None = None,
        initial_capital: float = 10_000.0,
    ):
        price_df = prices[["date", "close"]].copy()
        sig_df = signals[["date", "signal"]].copy()
        
        df = price_df.merge(sig_df, on="date", how="left")
        df["signal"] = df["signal"].fillna(0).astype(int)
        df = df.sort_values("date").reset_index(drop=True)

        cash = float(initial_capital)
        position = 0.0
        entry_price = None
        position_value = 0.0
        
        equity_curve: list[dict] = []
        blotter: list[dict] = []

        for _, row in df.iterrows():
            date = row["date"]
            price = float(row["close"])
            signal = int(row["signal"])

            # stop_loss
            stopped_today = False
            if stop_loss_pct is not None and position != 0 and entry_price is not None:
                if position > 0:
                    unrealized_ret = (price - entry_price) / entry_price
                else:
                    unrealized_ret = (entry_price - price) / entry_price

                if unrealized_ret <= -abs(stop_loss_pct):
                    if position > 0:
                        trade_pnl = position * (price - entry_price)
                        trade_qty = position
                        cash += position * price
                        action = "SELL"
                    else:
                        trade_pnl = (-position) * (entry_price - price)
                        trade_qty = -position 
                        cash += (-position) * (2 * entry_price - price)
                        action = "COVER"

                    blotter.append({
                        "date": date,
                        "action": action,
                        "price": price,
                        "trade_qty": trade_qty,
                        "reason": "STOP_LOSS",
                        "position_after": 0.0,
                        "trade_pnl": trade_pnl,
                    })

                    position = 0.0
                    entry_price = None
                    position_value = 0.0
                    stopped_today = True

            # adjust qty
            if not stopped_today:
                current_sign = 0 if position == 0 else (1 if position > 0 else -1)
                target_sign = signal

                # signal is 0 and position is not 0 - sell
                if target_sign == 0 and position != 0:
                    if position > 0:
                        trade_pnl = position * (price - entry_price)
                        trade_qty = position
                        cash += position * price
                        action = "SELL"
                    else:
                        trade_pnl = (-position) * (entry_price - price)
                        trade_qty = -position
                        cash += (-position) * (2 * entry_price - price)
                        action = "COVER"

                    blotter.append({
                        "date": date,
                        "action": action,
                        "price": price,
                        "trade_qty": trade_qty,
                        "reason": "SIGNAL_CLOSE",
                        "position_after": 0.0,
                        "trade_pnl": trade_pnl,
                    })

                    position = 0.0
                    entry_price = None
                    position_value = 0.0
                elif target_sign != 0 and target_sign == current_sign:
                    pass
                elif target_sign != 0 and target_sign != current_sign:
                    if position != 0:
                        if position > 0:
                            trade_pnl = position * (price - entry_price)
                            trade_qty = position
                            cash += position * price
                            action = "SELL"
                        else:
                            trade_pnl = (-position) * (entry_price - price)
                            trade_qty = -position
                            cash += (-position) * (2 * entry_price - price)
                            action = "COVER"

                        blotter.append({
                            "date": date,
                            "action": action,
                            "price": price,
                            "trade_qty": trade_qty,
                            "reason": "REVERSE_CLOSE",
                            "position_after": 0.0,
                            "trade_pnl": trade_pnl,
                        })

                        position = 0.0
                        entry_price = None
                        position_value = 0.0
                    if target_sign == 1:
                        qty = cash / price
                        cash -= qty * price
                        position = qty
                        entry_price = price
                        position_value = qty * price
                        action = "BUY"
                    else:
                        qty = cash / price
                        position = -qty
                        entry_price = price
                        position_value = qty * price
                        cash -= qty * price
                        action = "SHORT"

                    blotter.append({
                        "date": date,
                        "action": action,
                        "price": price,
                        "trade_qty": qty,
                        "reason": "SIGNAL_OPEN",
                        "position_after": position,
                        "trade_pnl": 0.0,
                    })
            if position == 0:
                equity = cash
            elif position > 0:
                equity = cash + position * price
            else:
                unrealized_pnl = (-position) * (entry_price - price)
                equity = cash + position_value + unrealized_pnl

            equity_curve.append({
                "date": date,
                "pnl": equity,
            })

        pnl_df = pd.DataFrame(equity_curve)
        pnl_df = pnl_df.sort_values("date").reset_index(drop=True)

        return {
            "df": df,
            "blotter": blotter,
            "pnl_curve": pnl_df,
        }
