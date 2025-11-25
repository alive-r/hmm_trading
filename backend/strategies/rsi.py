import pandas as pd
from .strategy_base import StrategyBase


class RSIStrategy(StrategyBase):
    def generate_signals(self, prices: pd.DataFrame, window=14, overbought=70, oversold=30):
        df = prices.copy()

        delta = df["close"].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window).mean()

        rs = gain / loss
        df["rsi"] = 100 - (100 / (1 + rs))

        df["signal"] = 0
        df.loc[df["rsi"] > overbought, "signal"] = 1   # overbought - buy
        df.loc[df["rsi"] < oversold, "signal"] = -1      # oversold - sell

        return df[["date", "signal"]]
