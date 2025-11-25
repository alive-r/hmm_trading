import type { ParametersType } from "@/types/backtest";

export interface RunBacktestRequest {
  assets: string[];
  weights: Record<string, number>;
  start: string;
  end: string;
  analysis_type: "strategy" | "model";
  strategy_type?: string;
  model_type?: string;
  parameters: ParametersType;
}

export async function runBacktest(req: RunBacktestRequest) {
  const response = await fetch("http://localhost:8000/api/run-backtest", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(req)
  });

  if (!response.ok) {
    throw new Error("Backtest API failed");
  }

  return response.json();
}