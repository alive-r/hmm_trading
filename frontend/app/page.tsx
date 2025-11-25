"use client";
import BacktestForm from "@/components/BacktestForm"
import type { BacktestResult } from "@/types/backtest";
import { useState } from "react";
import BlotterTable from "@/components/BlotterTable";
import ChartPnL from "@/components/ChartPnL";
import MetricsPanel from "@/components/MetricsPanel";

export default function HomePage() {

  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);

  console.log("RESULT:", result)

  const handleResult = (data: BacktestResult) => {
    setResult(data);
    setLoading(false);
  }

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">Crypto Trading Backtest</h1>
        <p className="text-gray-600 mt-2">Test your strategies with historical data</p>
      </div>

      <BacktestForm 
        onResult={handleResult}
        onLoadingChange={setLoading}
      />

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Running backtest...</p>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-8">

          {/* Portfolio-Level Metrics */}
          <MetricsPanel result={result} />

          {/* Portfolio PnL Chart */}
          <ChartPnL pnlData={result.portfolio_pnl_curve} />

          {/* Per-Asset PnL Charts */}
          {Object.keys(result.per_asset_pnl).length > 1 && (
            <div className="border-t pt-6">
              <h2 className="text-2xl font-bold mb-4">Individual Asset Performance</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Object.entries(result.per_asset_pnl).map(([asset, pnl]) => (
                  <div key={asset}>
                    <h3 className="text-lg font-semibold mb-2">{asset}</h3>
                    <ChartPnL pnlData={pnl} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Portfolio Blotter */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Trade History</h2>
            <BlotterTable blotter={result.portfolio_blotter} />
          </div>

        </div>
      )}
    </main>
  );
}
