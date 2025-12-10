from fastapi import APIRouter
from pydantic import BaseModel
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

from data.database import get_prices
from strategies.ma import MovingAverageStrategy
from strategies.rsi import RSIStrategy
from strategies.momentum import MomentumStrategy
from models_ml.trainer import ModelTrainer
from backtest.backtester import Backtester
from backtest.portfolio_backtester import PortfolioBacktester

router = APIRouter()


class RunBacktestRequest(BaseModel):
    assets: list[str] = []
    weights: dict = {}
    start: str
    end: str
    analysis_type: str   # "strategy" or "model"
    strategy_type: str = None
    model_type: str = None
    parameters: dict = {}
    benchmark: str = None


@router.post("/run-backtest")
def run_backtest(req: RunBacktestRequest):

    # parse start/end dates
    try:
        start_dt = datetime.fromisoformat(req.start)
        end_dt = datetime.fromisoformat(req.end)
    except Exception:
        return {"error": "Invalid date format for start or end. Please use YYYY-MM-DD."}

    # determine lookback window (in days) based on analysis type and parameters
    lookback_days = 0
    if req.analysis_type == "strategy":
        # default values in case parameters are missing
        if req.strategy_type == "ma":
            short_w = int(req.parameters.get("short_window", 5))
            long_w = int(req.parameters.get("long_window", 20))
            lookback_days = max(short_w, long_w)
        elif req.strategy_type in ("rsi", "momentum"):
            # both RSI and Momentum use a single window length
            lookback_days = int(req.parameters.get("window", 14))
    elif req.analysis_type == "model":
        # training window for walk-forward analysis
        lookback_days = int(req.parameters.get("window", 200))

    # compute earliest date we need prices for (may be before the user-selected start)
    if lookback_days > 0:
        data_start_dt = start_dt - timedelta(days=lookback_days)
    else:
        data_start_dt = start_dt

    data_start_str = data_start_dt.strftime("%Y-%m-%d")

    # data for asset
    price_data_dict = {}
    for asset in req.assets:
        raw = get_prices(asset, data_start_str, req.end)
        df = pd.DataFrame(raw)
        if df.empty:
            return {"error": f"No price data for asset {asset}"}

        # ensure date column is datetime for checks and later filtering
        if "date" not in df.columns:
            return {"error": f"Price data for asset {asset} is missing 'date' column"}
        if not pd.api.types.is_datetime64_any_dtype(df["date"]):
            df["date"] = pd.to_datetime(df["date"])

        # check if we have enough history for the requested lookback
        if lookback_days > 0:
            required_history_start = start_dt - timedelta(days=lookback_days)
            first_available_date = df["date"].min()
            if first_available_date > required_history_start:
                return {
                    "error": (
                        f"Not enough price history for asset {asset} to support a "
                        f"lookback window of {lookback_days} days before {req.start}."
                    )
                }

        price_data_dict[asset] = df

    # negerate signals
    signals_dict = {}

    if req.analysis_type == "strategy":
        strategies = {
            "ma": MovingAverageStrategy(),
            "rsi": RSIStrategy(),
            "momentum": MomentumStrategy()
        }

        if req.strategy_type not in strategies:
            return {"error": f"Unknown strategy {req.strategy_type}"}

        # Only pass parameters that are actually used by the selected strategy.
        if req.strategy_type == "ma":
            allowed_keys = {"short_window", "long_window"}
        elif req.strategy_type == "rsi":
            allowed_keys = {"window", "overbought", "oversold"}
        elif req.strategy_type == "momentum":
            allowed_keys = {"window"}
        else:
            allowed_keys = set()

        strategy_params = {
            k: v for k, v in req.parameters.items()
            if k in allowed_keys
        }

        for asset, df in price_data_dict.items():
            strat = strategies[req.strategy_type]
            signals_dict[asset] = strat.generate_signals(df, **strategy_params)

    elif req.analysis_type == "model":
        if not req.model_type:
            return {"error": "model_type is required when analysis_type='model'"}

        trainer = ModelTrainer()
        model_params = {
            k: v for k, v in req.parameters.items() 
            if k not in ["stop_loss_pct", "initial_capital"]
        }

        for asset, df in price_data_dict.items():
            try:
                # 训练模型
                # train_result = trainer.train(df, req.model_type, model_params)
                # model = train_result["model"]
                # features = train_result["features"]
                # test_index = train_result["test_index"]

                # # 生成信号
                # signals = trainer.generate_signals(df, model, features, test_index)
                # signals_dict[asset] = signals

                signals = trainer.generate_walkforward_signals(
                    df,
                    model_type=req.model_type,
                    params=model_params,
                    window=req.parameters.get("window", 200) 
                )

                signals_dict[asset] = signals
                                
            except Exception as e:
                return {"error": f"Model training failed for {asset}: {str(e)}"}
    else:
        return {"error": f"Unknown analysis_type: {req.analysis_type}"}

    # Portfolio Backtest
    pbt = PortfolioBacktester(
        assets=req.assets,
        weights=req.weights,
        parameters=req.parameters
    )

    # Trim signals and price data to align with the user-selected reporting window
    for asset in req.assets:
        sig_df = signals_dict[asset]
        if "date" not in sig_df.columns:
            return {"error": f"Signals for asset {asset} are missing 'date' column"}
        if not pd.api.types.is_datetime64_any_dtype(sig_df["date"]):
            sig_df["date"] = pd.to_datetime(sig_df["date"])

        # keep only signals within [start_dt, end_dt]
        sig_df = sig_df[(sig_df["date"] >= start_dt) & (sig_df["date"] <= end_dt)].reset_index(drop=True)
        if sig_df.empty:
            return {
                "error": (
                    f"No valid trading signals for asset {asset} within the selected "
                    f"date range {req.start} to {req.end}."
                )
            }
        signals_dict[asset] = sig_df

        # align price data with the remaining signal dates
        sig_dates = set(sig_df["date"])
        price_df = price_data_dict[asset]
        # date column already converted earlier
        price_df = price_df[price_df["date"].isin(sig_dates)].reset_index(drop=True)
        if price_df.empty:
            return {
                "error": (
                    f"No matching price data for asset {asset} on the signal dates "
                    f"within the selected range."
                )
            }
        price_data_dict[asset] = price_df

    try:
        result = pbt.run(price_data_dict, signals_dict)
    except Exception as e:
        return {"error": f"Backtest failed: {str(e)}"}

    # JSON
    def clean(x):
        if isinstance(x, dict):
            return {k: clean(v) for k, v in x.items()}
        if isinstance(x, list):
            return [clean(v) for v in x]
        if isinstance(x, float):
            if np.isnan(x) or np.isinf(x):
                return 0.0
            return float(x)
        return x

    output = {
        "assets": req.assets,
        "weights": result["weights"],
        "portfolio_pnl_curve": result["portfolio_pnl_curve"],
        "portfolio_blotter": result["portfolio_blotter"],
        "per_asset_pnl": result["per_asset_pnl"],
        "sharpe": result["sharpe"],
        "max_drawdown": result["max_drawdown"],
        "alpha": result["alpha"]
    }

    return clean(output)