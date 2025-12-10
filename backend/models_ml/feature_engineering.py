import pandas as pd
import numpy as np

# Maximum lookback (in days) required by any feature in this module.
# Upstream code should fetch at least `train_window + FEATURE_LOOKBACK_DAYS`
# of price history before the backtest Start Date so that all indicator
# warm-up happens before the reporting window.
FEATURE_LOOKBACK_DAYS = 20


def compute_rsi(series, window=14):
    delta = series.diff()
    gain = delta.clip(lower=0).rolling(window).mean()
    loss = (-delta.clip(upper=0)).rolling(window).mean()

    rs = gain / loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    
    return rsi.fillna(50)


def build_features(df: pd.DataFrame):
    df = df.copy()
    

    df["return_1d"] = df["close"].pct_change()
    df["ma5"] = df["close"].rolling(5).mean()
    df["ma20"] = df["close"].rolling(20).mean()
    df["momentum10"] = df["close"] - df["close"].shift(10)
    df["rsi14"] = compute_rsi(df["close"], 14)
    

    df["volatility"] = df["return_1d"].rolling(20).std()
    df["ma_cross"] = (df["ma5"] - df["ma20"]) / df["ma20"]

    # Use next day's 1-day return as the prediction target.
    df["future_return"] = df["return_1d"].shift(-1)
    df["label"] = (df["future_return"] > 0).astype(int)

    df = df.replace([np.inf, -np.inf], np.nan)
    df = df.dropna()

    features = ["return_1d", "ma5", "ma20", "momentum10", "rsi14", "volatility", "ma_cross"]
    target = "label"

    return df, features, target