"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

import type { PnlPoint } from "@/types/backtest";

export default function ChartPnL({ pnlData }: { pnlData: PnlPoint[] }) {
  if (!pnlData || pnlData.length === 0) {
    return <p className="text-gray-500">No PnL data available.</p>;
  }

  // 排序
  const sorted = [...pnlData].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // 转换为 timestamp
  const transformed = sorted.map((p) => ({
    ...p,
    timestamp: new Date(p.date).getTime(),
  }));

  // 判断用哪个 key（组合用 portfolio_value，单资产用 pnl）
  const key = transformed[0].portfolio_value !== undefined
    ? "portfolio_value"
    : "pnl";

  return (
    <div className="border rounded-lg p-4 bg-white shadow">
      <h2 className="text-xl font-semibold mb-4">
        {key === "portfolio_value" ? "Portfolio Value" : "Equity Curve"}
      </h2>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={transformed}>
          <XAxis
            dataKey="timestamp"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(t) =>
              new Date(t).toISOString().slice(0, 10)
            }
            tick={{ fontSize: 11 }}
          />
          <YAxis 
            tick={{ fontSize: 12 }} 
            domain={["auto", "auto"]}
            tickFormatter={(val) => `$${val.toFixed(0)}`}
          />
          <Tooltip
            formatter={(value: number) => `$${value.toFixed(2)}`}
            labelFormatter={(ts) =>
              `Date: ${new Date(ts).toISOString().slice(0, 10)}`
            }
          />
          <Legend />
          <Line
            type="monotone"
            dataKey={key}
            name={key === "portfolio_value" ? "Portfolio Value" : "Equity"}
            stroke="#15803d"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}