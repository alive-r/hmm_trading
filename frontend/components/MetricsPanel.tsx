"use client";

import type { BacktestResult } from "@/types/backtest";

export default function MetricsPanel({ result }: { result: BacktestResult }) {
  if (!result) return null;

  const { sharpe, max_drawdown, alpha, portfolio_pnl_curve } = result;

  const firstPoint = portfolio_pnl_curve[0];
  const lastPoint = portfolio_pnl_curve[portfolio_pnl_curve.length - 1];
  
  const initialValue = firstPoint?.portfolio_value ?? firstPoint?.pnl ?? 0;
  const finalValue = lastPoint?.portfolio_value ?? lastPoint?.pnl ?? 0;
  
  const totalReturn = initialValue !== 0 
    ? ((finalValue - initialValue) / initialValue) * 100 
    : 0;

  const finalPnL = lastPoint?.portfolio_cum_pnl ?? (finalValue - initialValue);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 my-4">
      
      <div className="bg-background border rounded-lg p-4 shadow-sm text-foreground">
        <div className="text-muted text-sm">Total Return</div>
        <div className={`text-xl font-bold ${totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {totalReturn.toFixed(2)}%
        </div>
      </div>

      <div className="bg-background border rounded-lg p-4 shadow-sm text-foreground">
        <div className="text-muted text-sm">Total PnL</div>
        <div className={`text-xl font-bold ${finalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          ${finalPnL.toFixed(2)}
        </div>
      </div>

      <div className="bg-background border rounded-lg p-4 shadow-sm text-foreground">
        <div className="text-muted text-sm">Sharpe Ratio</div>
        <div className="text-lg font-semibold">{sharpe?.toFixed(3) ?? "--"}</div>
      </div>

      <div className="bg-background border rounded-lg p-4 shadow-sm text-foreground">
        <div className="text-muted text-sm">Max Drawdown</div>
        <div className="text-lg font-semibold text-red-600">
          {(max_drawdown * 100).toFixed(2)}%
        </div>
      </div>

      <div className="bg-background border rounded-lg p-4 shadow-sm text-foreground">
        <div className="text-muted text-sm">Alpha</div>
        <div className="text-lg font-semibold">{alpha?.toFixed(4) ?? "--"}</div>
      </div>
    </div>
  );
}