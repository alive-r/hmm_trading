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
      </div>

      {/* Assets & Weights */}
      <div className="space-y-3">
        <label className="font-semibold text-lg">Assets & Weights:</label>
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
          </div>

          {/* Strategy Parameters */}
          {form.strategy_type === "ma" && (
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
              </div>
            </div>
          )}

          {form.strategy_type === "rsi" && (
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
              </div>
            </div>
          )}

          {form.strategy_type === "momentum" && (
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
            </div>
          )}
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
        </div>
      </div>

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