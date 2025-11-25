import numpy as np
import pandas as pd


def compute_sharpe(returns: pd.Series, risk_free_rate=0.00):
    """
    returns: daily strategy returns
    """
    if returns.std() == 0:
        return 0.0

    sharpe = (returns.mean() - risk_free_rate) / returns.std() * np.sqrt(252)
    return round(float(sharpe), 4)


def compute_max_drawdown(pnl: pd.Series):
    """
    pnl: cumulative pnl series
    """
    roll_max = pnl.cummax()
    drawdown = pnl / roll_max - 1
    mdd = drawdown.min()
    return round(float(mdd), 4)


def compute_alpha(df: pd.DataFrame, benchmark: pd.DataFrame):
    """
    df: strategy df with column 'strategy_return'
    benchmark: df containing ['date','close']
    """
    merged = df.merge(benchmark, on="date", suffixes=("_strategy", "_benchmark"))

    merged["bm_return"] = merged["close_benchmark"].pct_change().fillna(0)

    strategy_avg = merged["strategy_return"].mean()
    benchmark_avg = merged["bm_return"].mean()

    alpha = strategy_avg - benchmark_avg
    return round(float(alpha), 4)
