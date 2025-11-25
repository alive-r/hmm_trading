import pandas as pd
from .strategy_base import StrategyBase


class MomentumStrategy(StrategyBase):
    def generate_signals(self, prices: pd.DataFrame, window=10):
        df = prices.copy()

        # Momentum = close - close.shift(window)
        df["momentum"] = df["close"] - df["close"].shift(window)

        df["signal"] = 0
        df.loc[df["momentum"] > 0, "signal"] = 1
        df.loc[df["momentum"] < 0, "signal"] = -1

        return df[["date", "signal"]]
