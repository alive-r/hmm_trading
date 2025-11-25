from fastapi import APIRouter
from pydantic import BaseModel
import pandas as pd
import numpy as np

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

    # data for asset
    price_data_dict = {}
    for asset in req.assets:
        raw = get_prices(asset, req.start, req.end)
        df = pd.DataFrame(raw)
        if df.empty:
            return {"error": f"No price data for asset {asset}"}
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
        strategy_params = {
            k: v for k, v in req.parameters.items() 
            if k not in ["stop_loss_pct", "initial_capital"]
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
    
    # Trim price data to only test-set dates
    for asset in req.assets:
        sig_dates = set(signals_dict[asset]["date"])
        price_data_dict[asset] = price_data_dict[asset][price_data_dict[asset]["date"].isin(sig_dates)].reset_index(drop=True)

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