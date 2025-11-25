import pandas as pd

class StrategyBase:
    def generate_signals(self, prices: pd.DataFrame, **kwargs):
        raise NotImplementedError("Strategy must implement generate_signals()")
