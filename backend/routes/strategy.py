from fastapi import APIRouter
from pydantic import BaseModel
import pandas as pd

from data.database import get_prices
from strategies.ma import MovingAverageStrategy
from strategies.rsi import RSIStrategy
from strategies.momentum import MomentumStrategy

router = APIRouter()

class StrategyRequest(BaseModel):
    ric: str
    strategy: str
    start: str
    end: str
    parameters: dict = {}


@router.post("/run-strategy")
def run_strategy(req: StrategyRequest):

    raw = get_prices(req.ric, req.start, req.end)
    df = pd.DataFrame(raw)

    strategies = {
        "ma": MovingAverageStrategy(),
        "rsi": RSIStrategy(),
        "momentum": MomentumStrategy()
    }

    if req.strategy not in strategies:
        return {"error": f"Unknown strategy {req.strategy}"}

    strat = strategies[req.strategy]

    signals = strat.generate_signals(df, **req.parameters)

    return {
        "ric": req.ric,
        "strategy": req.strategy,
        "signals": signals.to_dict(orient="records")
    }
