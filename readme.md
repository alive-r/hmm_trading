# 📘 Trading Web Application – README

## Overview

This project implements a full-stack algorithmic trading research and backtesting platform that supports both rule-based trading strategies and machine-learning forecasting models. The platform can evaluate single-asset or multi-asset cryptocurrency portfolios using realistic backtesting logic and walk-forward machine-learning training to prevent future leakage.

The architecture consists of:
	•	Backend: FastAPI (Python)
	•	Frontend: Next.js (TypeScript)
	•	Data Source: LSEG / Refinitiv API
	•	Trading Engine: Custom Backtester + Portfolio Backtester
	•	Machine Learning: Logistic Regression, Random Forest, XGBoost
	•	Walk-Forward Training Framework (no look-ahead bias)


## Features

✔ Multi-Asset Backtesting

Supports any combination of crypto assets (e.g., BTC=, ETH=, LTC=, XRP=, BCH=) with user-defined weights.

✔ Classical Trading Strategies
	•	Moving Average (MA) Crossover
	•	Relative Strength Index (RSI)
	•	Momentum Strategy

✔ Machine Learning-Based Signals
	•	Logistic Regression
	•	Random Forest
	•	XGBoost

✔ Walk-Forward Training (Rolling Window)

A realistic ML framework that ensures:
	•	No future leakage
	•	One-step-ahead predictions
	•	Signal generation over the entire historical range


## Data Pipeline

Price data is obtained using the LSEG / Refinitiv Data Platform API, cleaned, and stored locally. The processed data is used for:
	•	Technical indicator computation
	•	Feature engineering
	•	ML model training
	•	Backtesting and PnL simulation


## Strategy Models

1. Moving Average Crossover

Generates signals based on short/long moving average relationships to identify trend shifts.

2. RSI Strategy

Uses oversold/overbought readings to generate contrarian or momentum-based trades.

3. Momentum Strategy

Exploits recent price strength to follow market trends.


## Machine Learning Models

Model Types
	•	Logistic Regression – Interpretable probabilistic classifier
	•	Random Forest – Nonlinear ensemble model with high robustness
	•	XGBoost – Gradient-boosted trees optimized for tabular time-series data

Feature Engineering

The ML pipeline builds predictive features such as:
	•	Lagged returns
	•	Rolling mean / volatility
	•	RSI & momentum indicators
	•	Normalized price-based technical features

These features convert time-series data into supervised learning samples.


## Walk-Forward Training Framework

This system uses a Rolling Window Walk-Forward approach:
	1.	Select a lookback window (e.g., 200 days).
	2.	Train the chosen ML model on historical data within that window.
	3.	Predict the signal for the next day (one-step-ahead).
	4.	Slide the window by one day.
	5.	Repeat until the end of the dataset.

Benefits
	•	Eliminates look-ahead bias
	•	Simulates real trading conditions
	•	Produces realistic predictive performance
	•	Allows signals across the entire date range


## Backtesting Architecture

1. Single-Asset Backtester

Simulates trading based on signals:
	•	Full long/short positions
	•	Automatic reversals
	•	Stop-loss support
	•	Realized/unrealized PnL
	•	Equity curve tracking
	•	Trade blotter generation

2. Multi-Asset Portfolio Backtester

Aggregates multiple asset backtests using user-defined weights:
	•	Allocates initial capital per asset
	•	Computes weighted portfolio value
	•	Tracks cumulative portfolio PnL
	•	Merges asset-level blotters
	•	Calculates performance metrics:
	•	Sharpe ratio
	•	Maximum drawdown
	•	Cumulative portfolio return


## Project Structure

app/
 ├── routes/
 │    └── run_backtest.py       # Main API route
 ├── backtest/
 │    ├── backtester.py         # Single-asset engine
 │    └── portfolio_backtester.py  # Multi-asset engine
 ├── strategies/
 │    ├── ma.py
 │    ├── rsi.py
 │    └── momentum.py
 ├── models_ml/
 │    ├── trainer.py            # ML training + Walk-forward logic
 │    ├── feature_engineering.py
 │    ├── train_logistic.py
 │    ├── train_rf.py
 │    └── train_xgb.py
frontend/
 └── (Next.js UI code)




## Installation

Backend
```
	pip install -r requirements.txt
	uvicorn app.main:app --reload
```

Frontend

```
	cd frontend
	npm install
	npm run dev
```


## Running a Backtest

Example JSON payload for /api/run-backtest:

{
  "assets": ["BTC=", "ETH="],
  "weights": { "BTC=": 0.6, "ETH=": 0.4 },
  "start": "2020-01-01",
  "end": "2024-01-01",
  "analysis_type": "model",
  "model_type": "xgb",
  "parameters": {
    "window": 200,
    "stop_loss_pct": 0.05
  }
}


## Conclusion

This project delivers a robust, extensible trading research system capable of:
	•	Fetching real crypto market data
	•	Generating strategy-based and ML-based trading signals
	•	Using walk-forward training to eliminate look-ahead bias
	•	Simulating realistic single-asset and multi-asset portfolio PnL

It provides a strong foundation for advanced quantitative finance research and future enhancements such as hyperparameter optimization, ensemble modeling, regime detection, and real-time deployment.