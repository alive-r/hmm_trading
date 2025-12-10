"use client";

import { useState } from "react";
import { runBacktest } from "@/lib/api";
import type { FormState } from "@/types/backtest";
import type { BacktestResult } from "@/types/backtest";

export default function BacktestForm({
  onResult,
  onLoadingChange
}: {
  onResult: (data: BacktestResult) => void;
  onLoadingChange?: (loading: boolean) => void;
}) {
  const [form, setForm] = useState<FormState>({
    assets: ["BTC="],
    weights: { "BTC=": 1.0 },
    start: "2023-01-01",
    end: "2024-12-31",
    analysis_type: "strategy",
    strategy_type: "ma",
    model_type: "logistic",
    parameters: {
      stop_loss_pct: 0.05,
      initial_capital: 10000
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const totalWeight = Object.values(form.weights).reduce((sum, w) => sum + w, 0);
    if (totalWeight === 0) {
      alert("Please set at least one asset weight > 0");
      return;
    }
    if (totalWeight > 1) {
      alert("Total weight cannot exceed 1.0");
      return;
    }
    if (new Date(form.start) >= new Date(form.end)) {
      alert("Start date must be before end date");
      return;
    }

    onLoadingChange?.(true);
    
    try {
      const result = await runBacktest(form);
      
      if (result.error) {
        alert(`Error: ${result.error}`);
        onLoadingChange?.(false);
        return;
      }
      
      onResult(result);
    } catch (error) {
      console.error("Backtest failed:", error);
      alert("Backtest failed. Please check console for details.");
      onLoadingChange?.(false);
    }
  };

  const totalWeight = Object.values(form.weights).reduce((s, w) => s + w, 0);
  const remainingWeight = 1 - totalWeight;

  return (
    <form
      className="p-6 border rounded-lg space-y-6 bg-background text-foreground shadow-lg"
      onSubmit={handleSubmit}
    >
      {/* Analysis Type Selection */}
      <div className="border-b pb-4">
        <label className="font-semibold text-lg block mb-3">Analysis Type:</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="strategy"
              checked={form.analysis_type === "strategy"}
              onChange={(e) =>
                setForm({ ...form, analysis_type: e.target.value as "strategy" })
              }
            />
            <span>Trading Strategy</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="model"
              checked={form.analysis_type === "model"}
              onChange={(e) =>
                setForm({ ...form, analysis_type: e.target.value as "model" })
              }
            />
            <span>Machine Learning Model</span>
          </label>
        </div>
        <div className="mt-2 text-xs text-muted-foreground space-y-1">
          <p>
            <span className="font-semibold">Trading Strategy:</span> uses predefined indicator
            rules (for example moving averages, RSI, or momentum) to generate buy/sell signals
            directly from prices and then backtest their performance.
          </p>
          <p>
            <span className="font-semibold">Machine Learning Model:</span> trains a model on
            historical data to predict the direction of returns and then backtests trades based
            on those predictions.
          </p>
        </div>
      </div>

      {/* Assets & Weights */}
      <div className="space-y-3">
        <label className="font-semibold text-lg">Assets & Weights:</label>
        <p className="text-xs text-muted-foreground mt-1">
          Weights describe how much of your total capital you allocate to each asset.
          For example, BTC= 0.6 and ETH= 0.4 means 60% of capital is traded in BTC and
          40% in ETH.
        </p>
        <div className="text-sm mb-2">
          <span className={totalWeight > 1 ? "text-red-600 font-bold" : "text-muted"}>
            Total weight: {totalWeight.toFixed(2)}
          </span>
          {remainingWeight > 0 && (
            <span className="text-green-600 ml-4">
              (Remaining: {remainingWeight.toFixed(2)})
            </span>
          )}
          {totalWeight > 1 && (
            <span className="text-red-600 ml-4 font-semibold">
              ⚠️ Total cannot exceed 1.0
            </span>
          )}
        </div>
        {["BTC=", "ETH=", "XRP=", "LTC=", "BCH="].map((asset) => (
          <div key={asset} className="flex items-center space-x-3 bg-background/60 p-2 rounded">
            <input
              type="checkbox"
              checked={form.assets.includes(asset)}
              onChange={(e) => {
                const checked = e.target.checked;
                setForm({
                  ...form,
                  assets: checked
                    ? Array.from(new Set([...form.assets, asset]))
                    : form.assets.filter((a) => a !== asset)
                });
              }}
            />
            <span className="w-20 font-medium">{asset}</span>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              className="border p-2 rounded w-28 bg-background text-foreground"
              value={form.weights[asset] ?? 0}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (isNaN(val) || val < 0) return;

                setForm({
                  ...form,
                  weights: { ...form.weights, [asset]: val }
                });
              }}
              disabled={!form.assets.includes(asset)}
            />
          </div>
        ))}
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="font-semibold">Start Date:</label>
          <input
            type="date"
            className="border p-2 rounded w-full mt-1 bg-background text-foreground"
            value={form.start}
            onChange={(e) => setForm({ ...form, start: e.target.value })}
          />
        </div>
        <div>
          <label className="font-semibold">End Date:</label>
          <input
            type="date"
            className="border p-2 rounded w-full mt-1 bg-background text-foreground"
            value={form.end}
            onChange={(e) => setForm({ ...form, end: e.target.value })}
          />
        </div>
      </div>

      {/* Strategy or Model Selection */}
      {form.analysis_type === "strategy" ? (
        <div className="space-y-4 border-t pt-4">
          <h3 className="font-semibold text-lg">Strategy Settings</h3>
          
          <div>
            <label className="font-semibold">Strategy Type:</label>
            <select
              className="border p-2 rounded w-full mt-1 bg-background text-foreground"
              value={form.strategy_type}
              onChange={(e) => {
                const strategyType = e.target.value as "ma" | "rsi" | "momentum";
                const commonParams = {
                  stop_loss_pct: form.parameters.stop_loss_pct ?? 0.05,
                  initial_capital: form.parameters.initial_capital ?? 10000
                };

                let strategyParams: Record<string, number> = {};

                if (strategyType === "ma") {
                  strategyParams = { short_window: 5, long_window: 20 };
                } else if (strategyType === "rsi") {
                  strategyParams = { window: 14, overbought: 70, oversold: 30 };
                } else if (strategyType === "momentum") {
                  strategyParams = { window: 10 };
                }
                setForm({
                  ...form,
                  strategy_type: strategyType,
                  parameters: { ...commonParams, ...strategyParams }
                });
              }}
            >
              <option value="ma">Moving Average Crossover</option>
              <option value="rsi">RSI (Relative Strength Index)</option>
              <option value="momentum">Momentum</option>
            </select>
            <div className="mt-2 text-xs text-muted-foreground space-y-1">
              {form.strategy_type === "ma" && (
                <p>
                  Moving Average Crossover: compares a short-term and long-term average
                  of the price. When the short-term average is above the long-term
                  average the strategy stays long; when it is below, the strategy goes
                  short.
                </p>
              )}
              {form.strategy_type === "rsi" && (
                <p>
                  RSI (Relative Strength Index): uses recent gains and losses to measure
                  momentum. High RSI means strong upward momentum; low RSI means strong
                  downward momentum.
                </p>
              )}
              {form.strategy_type === "momentum" && (
                <p>
                  Momentum: compares today's price to the price some days ago. If the
                  price has increased the strategy goes long; if it has decreased the
                  strategy goes short.
                </p>
              )}
            </div>
          </div>

          {/* Strategy Parameters */}
          {form.strategy_type === "ma" && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm">Short Window:</label>
                  <input
                    type="number"
                    className="border p-2 rounded w-full mt-1 bg-background text-foreground"
                    value={form.parameters.short_window ?? 5}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        parameters: { ...form.parameters, short_window: parseInt(e.target.value) }
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Number of days for the fast moving average (reacts quickly to price
                    changes).
                  </p>
                </div>
                <div>
                  <label className="text-sm">Long Window:</label>
                  <input
                    type="number"
                    className="border p-2 rounded w-full mt-1 bg-background text-foreground"
                    value={form.parameters.long_window ?? 20}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        parameters: { ...form.parameters, long_window: parseInt(e.target.value) }
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Number of days for the slow moving average (defines the overall trend).
                  </p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                <p className="font-semibold">Trading rule (Moving Average):</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    We first compute two moving averages of the closing price:
                    the short MA is the average of the last <code>Short Window</code> days,
                    and the long MA is the average of the last <code>Long Window</code> days.
                  </li>
                  <li>
                    Each day we compare the short-term and long-term moving averages of the price.
                  </li>
                  <li>
                    If the short moving average is above the long moving average, the strategy
                    sets the signal to +1 (target long position).
                  </li>
                  <li>
                    If the short moving average is below the long moving average, the strategy
                    sets the signal to -1 (target short position).
                  </li>
                  <li>
                    If there is not enough data yet, or they are equal, the signal stays 0 (no position).
                  </li>
                </ul>
              </div>
            </div>
          )}

          {form.strategy_type === "rsi" && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm">Window:</label>
                  <input
                    type="number"
                    className="border p-2 rounded w-full mt-1 bg-background text-foreground"
                    value={form.parameters.window ?? 14}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        parameters: { ...form.parameters, window: parseInt(e.target.value) }
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Number of days used to calculate the RSI (lookback period).
                  </p>
                </div>
                <div>
                  <label className="text-sm">Overbought:</label>
                  <input
                    type="number"
                    className="border p-2 rounded w-full mt-1 bg-background text-foreground"
                    value={form.parameters.overbought ?? 70}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        parameters: { ...form.parameters, overbought: parseInt(e.target.value) }
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Above this level the RSI indicates strong upward momentum (overbought zone).
                  </p>
                </div>
                <div>
                  <label className="text-sm">Oversold:</label>
                  <input
                    type="number"
                    className="border p-2 rounded w-full mt-1 bg-background text-foreground"
                    value={form.parameters.oversold ?? 30}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        parameters: { ...form.parameters, oversold: parseInt(e.target.value) }
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Below this level the RSI indicates strong downward momentum (oversold zone).
                  </p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                <p className="font-semibold">Trading rule (RSI):</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    We first compute daily gains and losses over the selected window and use them
                    to calculate RSI: RSI = 100 - 100 / (1 + RS), where RS is the average gain
                    divided by the average loss.
                  </li>
                  <li>
                    Each day we compute RSI from recent gains and losses over the selected window.
                  </li>
                  <li>
                    If RSI is above the overbought threshold, the strategy sets the signal to
                    +1 (strong upward momentum, target long position).
                  </li>
                  <li>
                    If RSI is below the oversold threshold, the strategy sets the signal to
                    -1 (strong downward momentum, target short position).
                  </li>
                  <li>
                    When RSI is between these thresholds, the signal stays 0 (no position).
                  </li>
                </ul>
              </div>
            </div>
          )}

          {form.strategy_type === "momentum" && (
            <div className="space-y-2">
              <div>
                <label className="text-sm">Window:</label>
                <input
                  type="number"
                  className="border p-2 rounded w-full mt-1 bg-background text-foreground"
                  value={form.parameters.window ?? 10}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      parameters: { ...form.parameters, window: parseInt(e.target.value) }
                    })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Number of days between today's price and the past price used to compute momentum.
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                <p className="font-semibold">Trading rule (Momentum):</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    We compute momentum as today&apos;s closing price minus the closing price
                    from <code>Window</code> days ago.
                  </li>
                  <li>
                    Each day we compare today&apos;s price to the price from the selected
                    window days ago.
                  </li>
                  <li>
                    If today&apos;s price is higher than the past price, momentum is positive
                    and the strategy sets the signal to +1 (target long position).
                  </li>
                  <li>
                    If today&apos;s price is lower than the past price, momentum is negative
                    and the strategy sets the signal to -1 (target short position).
                  </li>
                  <li>
                    If prices are almost the same, the signal stays 0 (no position).
                  </li>
                </ul>
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            In this backtest, the chosen strategy generates a daily trading signal for each
            asset: +1 means a long position, -1 means a short position, and 0 means no
            position. The portfolio backtester then uses these signals together with your
            asset weights, stop loss, and initial capital to open, close, or reverse
            positions over time and compute performance metrics.
          </p>
        </div>
      ) : (
        <div className="space-y-4 border-t pt-4">
          <h3 className="font-semibold text-lg">Model Settings</h3>
          
          <div>
            <label className="font-semibold">Model Type:</label>
            <select
              className="border p-2 rounded w-full mt-1 bg-background text-foreground"
              value={form.model_type}
              onChange={(e) => {
                const modelType = e.target.value;
                let newParams = { ...form.parameters };
                
                if (modelType === "rf") {
                  newParams = { ...newParams, n_estimators: 100, max_depth: 5 };
                } else if (modelType === "xgb") {
                  newParams = { ...newParams };
                }
                
                setForm({ ...form, model_type: modelType, parameters: newParams });
              }}
            >
              <option value="logistic">Logistic Regression</option>
              <option value="rf">Random Forest</option>
              <option value="xgb">XGBoost</option>
            </select>
          </div>

          {/* Model Parameters */}
          {form.model_type === "rf" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm">N Estimators:</label>
                <input
                  type="number"
                  className="border p-2 rounded w-full mt-1 bg-background text-foreground"
                  value={form.parameters.n_estimators ?? 100}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      parameters: { ...form.parameters, n_estimators: parseInt(e.target.value) }
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm">Max Depth:</label>
                <input
                  type="number"
                  className="border p-2 rounded w-full mt-1 bg-background text-foreground"
                  value={form.parameters.max_depth ?? 5}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      parameters: { ...form.parameters, max_depth: parseInt(e.target.value) }
                    })
                  }
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Common Parameters */}
      <div className="grid grid-cols-2 gap-4 border-t pt-4">
        <div>
          <label className="font-semibold">Stop Loss %:</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            className="border p-2 rounded w-full mt-1 bg-background text-foreground"
            value={form.parameters.stop_loss_pct ?? 0.05}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setForm({
                ...form,
                parameters: { ...form.parameters, stop_loss_pct: val }
              });
            }}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Fraction of loss from the entry price that will close the position.
            For example, 0.05 means the trade is closed if it loses 5% of its value.
            This demo only implements a stop loss; there is no separate profit-taking level.
          </p>
        </div>
        <div>
          <label className="font-semibold">Initial Capital:</label>
          <input
            type="number"
            step="1000"
            min="1000"
            className="border p-2 rounded w-full mt-1 bg-background text-foreground"
            value={form.parameters.initial_capital ?? 10000}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setForm({
                ...form,
                parameters: { ...form.parameters, initial_capital: val }
              });
            }}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Total cash used for the backtest. Asset weights determine how this capital
            is split across different assets when trades are opened.
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground border-t pt-2">
        If a stop loss is never hit, the position stays open until the strategy generates
        an opposite signal (for example when the moving averages cross in the other
        direction). There is currently no explicit profit-taking threshold.
      </p>
      <button
        type="submit"
        disabled={totalWeight > 1}
        className={`w-full px-6 py-3 rounded-lg shadow transition font-semibold ${
          totalWeight > 1
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {form.analysis_type === "strategy" ? "Run Strategy Backtest" : "Train Model & Backtest"}
      </button>
    </form>
  );
}