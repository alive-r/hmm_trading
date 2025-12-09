# 📘 Trading Web Application – README

## Overview

This project implements a full-stack algorithmic trading research and backtesting platform that supports both rule-based trading strategies and machine-learning forecasting models. The platform can evaluate single-asset or multi-asset cryptocurrency portfolios using realistic backtesting logic and walk-forward machine-learning training to prevent future leakage.

### Architecture

- **Backend**: FastAPI (Python)
- **Frontend**: Next.js (TypeScript)
- **Data Source**: LSEG / Refinitiv API
- **Trading Engine**: Custom Backtester + Portfolio Backtester
- **Machine Learning**: Logistic Regression, Random Forest, XGBoost
- **Walk-Forward Training Framework** (no look-ahead bias)

## Features

### ✔ Multi-Asset Backtesting

Supports any combination of crypto assets (e.g., BTC=, ETH=, LTC=, XRP=, BCH=) with user-defined weights.

### ✔ Classical Trading Strategies

- Moving Average (MA) Crossover
- Relative Strength Index (RSI)
- Momentum Strategy

### ✔ Machine Learning-Based Signals

- Logistic Regression
- Random Forest
- XGBoost

### ✔ Walk-Forward Training (Rolling Window)

A realistic ML framework that ensures:
- No future leakage
- One-step-ahead predictions
- Signal generation over the entire historical range

## Data Pipeline

Price data is obtained using the LSEG / Refinitiv Data Platform API, cleaned, and stored locally. The processed data is used for:

- Technical indicator computation
- Feature engineering
- ML model training
- Backtesting and PnL simulation

## Strategy Models

### 1. Moving Average Crossover

Generates signals based on short/long moving average relationships to identify trend shifts.

### 2. RSI Strategy

Uses oversold/overbought readings to generate contrarian or momentum-based trades.

### 3. Momentum Strategy

Exploits recent price strength to follow market trends.

## Machine Learning Framework – Features, Models, and Parameters

### Feature Engineering

The machine-learning pipeline starts from raw daily OHLCV-style crypto price data and transforms it into a supervised learning dataset. The goal is to predict next-day price direction (up or down) based on recent market behavior.

#### 1. Input and Target Construction

For each asset:

- **Input data**: historical price series over a user-specified window (e.g., 2023-01-01 to 2025-12-31)
- **Target (label)**: a discrete direction class, typically constructed as:
  - `+1` if next-day return is positive
  - `−1` if next-day return is negative

This converts the forecasting problem into a binary classification task: "Will the price go up or down tomorrow?"

#### 2. Core Feature Types

The `build_features` function creates a feature matrix X and target vector y. The features are designed to capture trend, momentum, and volatility. Typical categories include:

**a. Lagged Returns**
- Examples:
  - 1-day log return
  - 3-day / 5-day cumulative returns
- Intuition: captures short-term momentum and mean reversion patterns

**b. Moving Averages and Trend Indicators**
- Short/long moving averages (e.g., 5-day, 10-day, 20-day)
- Differences or ratios such as:
  - MA_short − MA_long
  - price / MA_long
- Intuition: approximates classic "trend following" logic (similar to MA crossover strategies)

**c. Volatility Measures**
- Rolling standard deviation of returns over a lookback window (e.g., 10 or 20 days)
- Intuition: captures regime changes (calm vs. turbulent markets) and risk conditions

**d. Momentum / Oscillator-like Features**
- Normalized momentum over N days (price change / volatility)
- Potential RS-style indicators or overbought/oversold proxies
- Intuition: detects overextension and reversal zones

**e. Scaling / Normalization**
- Where necessary, continuous features are standardized (e.g., z-score normalization) so that models like logistic regression are not dominated by a single large-scale feature

The final engineered dataset is:
- `df_feat`: feature-enhanced DataFrame (one row per date)
- `features`: list of feature column names
- `target`: name of the target column (direction class)

The system also enforces a minimum data requirement (e.g. at least 100 rows) to prevent overfitting on extremely small samples.

---

### Models

The project supports multiple supervised learning models to predict next-day direction:

#### 1. Logistic Regression

**Type**: Linear probabilistic classifier

**Principle**:
- Logistic regression models the probability that the target y = 1 (e.g., "next-day price goes up") given features x, using:
  ```
  P(y=1 | x) = σ(wᵀx + b)
  ```
  where σ is the logistic (sigmoid) function
- The model is trained by minimizing logistic (cross-entropy) loss with regularization, which penalizes very large coefficients and helps reduce overfitting
- The resulting coefficients w can be interpreted as the marginal impact of each feature on the log-odds of an upward move

---

#### 2. Random Forest (RF)

**Type**: Ensemble of decision trees (bagging)

**Principle**:
- A Random Forest builds many decision trees on bootstrap samples of the training data
- At each tree split, a random subset of features is considered, and the best splitting rule is chosen
- Predictions are aggregated by majority vote (for classification)

**Key hyperparameters used**:
- `n_estimators` (default: 100)
  - Number of trees in the forest. More trees reduce variance but increase computation time
- `max_depth` (default: 5)
  - Maximum depth of each tree. Controls model complexity:
    - too shallow → underfitting
    - too deep → overfitting

---

#### 3. XGBoost (XGB)

**Type**: Gradient boosting decision trees

**Principle**:
- XGBoost trains trees sequentially, where each new tree learns to correct the residual errors of the previous ensemble
- Uses gradient descent on a differentiable loss (e.g., logistic loss for classification)
- Includes regularization on tree weights, learning rate, and maximum depth to control overfitting

**Key hyperparameters (typical)**:
- Number of trees / boosting rounds
- max_depth of trees
- Learning rate (shrinkage)
- Subsampling rates (rows/columns)


---

### Signal Generation from Model Outputs

Once a model is trained, it produces probabilities or class predictions for each day in the test or walk-forward window.

#### Probability-Based Signal Thresholding

If the model supports `predict_proba` (logistic, RF, XGB), the system:

1. Computes P(y=1 | xₜ) for each day t
2. Applies asymmetric thresholds to create trading signals:

```python
signal = 0        # neutral
if proba > 0.65:  # high confidence up move
    signal = 1    # long
elif proba < 0.35:  # high confidence down move
    signal = -1   # short
```

**Interpretation**:
- **0.55 / 0.45 band**: Introduces a neutral zone where the model does not trade unless the probability is sufficiently extreme → reduces over-trading and noise
- `signal = 1` → fully long
- `signal = -1` → fully short
- `signal = 0` → flat (no position / close existing position)

If a model does not support `predict_proba`, a fallback uses hard class predictions (`predict`) and maps:
- class = 1 → signal = 1
- class = 0 or -1 → signal = -1

(no neutral zone in this case)

---

### Walk-Forward Training and Its Effect

To avoid future leakage and to make the model behavior more realistic over the entire period, the system uses a Walk-Forward (rolling) training scheme in model mode.

#### Walk-Forward Logic

For each asset:

1. Compute features `df_feat` sorted by date
2. Choose a rolling training window size (e.g. window = 200 days)
3. For each day t from window to the end:
   - **Training set**: rows [t - window, ..., t-1]
   - **Test point**: row at t
4. Train a fresh model on the training window
5. Predict the signal for day t (next trading decision)
6. Append the (date_t, signal_t) pair to the signal series
7. Slide the window forward and repeat

---

### How the Models Translate into Trading Behavior

Once signals are generated:

- They are fed into the **Backtester**, which:
  - Interprets `signal = 1` as "go (or stay) fully long"
  - Interprets `signal = -1` as "go (or stay) fully short"
  - Interprets `signal = 0` as "close any open position"

- The **Backtester** then:
  - Simulates position changes (enter, reverse, or exit)
  - Applies optional stop-loss (e.g. `stop_loss_pct = 0.05`)
  - Tracks cash, position, and mark-to-market equity
  - Generates a trade blotter and daily PnL

- The **Portfolio Backtester** aggregates:
  - Asset-level PnL streams (using user-defined weights)
  - Portfolio equity curve
  - Total return, Sharpe ratio, and max drawdown

## Backtesting Architecture

### 1. Single-Asset Backtester

Simulates trading based on signals:
- Full long/short positions
- Automatic reversals
- Stop-loss support
- Realized/unrealized PnL
- Equity curve tracking
- Trade blotter generation

### 2. Multi-Asset Portfolio Backtester

Aggregates multiple asset backtests using user-defined weights:
- Allocates initial capital per asset
- Computes weighted portfolio value
- Tracks cumulative portfolio PnL
- Merges asset-level blotters
- Calculates performance metrics:
  - Sharpe ratio
  - Maximum drawdown
  - Cumulative portfolio return

## Installation

Run backend and frontend at the same time.

### Run Backend and Frontend at once
```bash
in main project folder
npm run dev

```

### Backend

```bash
pip install -r requirements.txt
uvicorn main:app --reload 
```

### Frontend 

```bash
cd frontend
npm install
npm run dev
```

## Conclusion

This project delivers a robust, extensible trading research system capable of:

- Fetching real crypto market data
- Generating strategy-based and ML-based trading signals
- Using walk-forward training to eliminate look-ahead bias
- Simulating realistic single-asset and multi-asset portfolio PnL
