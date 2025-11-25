from fastapi import APIRouter
from pydantic import BaseModel
import pandas as pd

from data.database import get_prices
from backtest.backtester import Backtester

router = APIRouter()


class BacktestRequest(BaseModel):
    ric: str
    start: str
    end: str
    signals: list 
    benchmark: str = None  


@router.post("/backtest")
def backtest(req: BacktestRequest):

    prices_raw = get_prices(req.ric, req.start, req.end)
    prices = pd.DataFrame(prices_raw)

    signals = pd.DataFrame(req.signals)
    
    benchmark_df = None
    if req.benchmark is not None:
        bench_raw = get_prices(req.benchmark, req.start, req.end)
        bench = pd.DataFrame(bench_raw)
        bench.rename(columns={"close": "close_benchmark"}, inplace=True)
        benchmark_df = bench

    bt = Backtester()
    result = bt.run(prices, signals, benchmark_df)

    return result
