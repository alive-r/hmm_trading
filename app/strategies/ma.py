import pandas as pd
from .strategy_base import StrategyBase


class MovingAverageStrategy(StrategyBase):
    def generate_signals(self, prices: pd.DataFrame, short_window=5, long_window=20):
        df = prices.copy()

        df["ma_short"] = df["close"].rolling(short_window).mean()
        df["ma_long"] = df["close"].rolling(long_window).mean()

        # signal = 1 when short MA crosses above long MA
        df["signal"] = 0
        df.loc[df["ma_short"] > df["ma_long"], "signal"] = 1
        df.loc[df["ma_short"] < df["ma_long"], "signal"] = -1

        return df[["date", "signal"]]
