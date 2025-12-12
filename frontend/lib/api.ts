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

// Use an environment variable in production, fall back to localhost for local dev.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function runBacktest(req: RunBacktestRequest) {
  const response = await fetch(`${API_BASE_URL}/api/run-backtest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(req)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Backtest API failed (${response.status}): ${text || "no response body"}`
    );
  }

  return response.json();
}