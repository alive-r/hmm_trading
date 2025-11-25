"use client";

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Scatter,
  ResponsiveContainer,
} from "recharts";
import type { BlotterItem, PricePoint } from "@/types/backtest";
import CustomTooltip from "./CustomTooltip";

export default function ChartPrice({
  priceData,
  blotter,
}: {
  priceData: PricePoint[];
  blotter: BlotterItem[];
}) {
  if (!priceData || priceData.length === 0) {
    return <p>No price data available.</p>;
  }
  
  // Sort priceData by date to avoid X-axis disorder
  const sortedPrice = [...priceData].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Merge signal points
  const merged = sortedPrice.map((p) => {
    const matches = blotter.filter((b) => b.date === p.date);
    return {
      ...p,
      timestamp: new Date(p.date).getTime(),
      buy: matches.some((m) => m.action === "BUY") ? p.close : null,
      sell: matches.some((m) => m.action === "SELL") ? p.close : null,
      short: matches.some((m) => m.action === "SHORT") ? p.close : null,
      cover: matches.some((m) => m.action === "COVER") ? p.close : null,
      stop: matches.some((m) => m.action.startsWith("STOP_LOSS")) ? p.close : null,
    };
  });

  return (
    <div className="border rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-4">Price & Signals</h2>

      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart data={merged}>
          <XAxis
            dataKey="timestamp"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(ts) =>
              new Date(ts).toISOString().slice(0, 10)
            }
            tick={{ fontSize: 12 }}
          />
          <YAxis tick={{ fontSize: 12 }} domain={["auto", "auto"]} />
          <Tooltip content={<CustomTooltip />}/>
          <Legend />

          {/* Price Line */}
          <Line
            type="monotone"
            dataKey="close"
            stroke="#1e3a8a"
            strokeWidth={2}
            name="Close Price"
            dot={false}
          />

          {/* MARKERS — drawn using separate scatters */}
          <Scatter
            name="BUY"
            data={merged}
            dataKey="buy"
            fill="#16a34a"
            shape="triangle"
          />
          <Scatter
            name="SELL"
            data={merged}
            dataKey="sell"
            fill="#dc2626"
            shape="triangle"
          />
          <Scatter
            name="SHORT"
            data={merged}
            dataKey="short"
            fill="#7c3aed"
            shape="diamond"
          />
          <Scatter
            name="COVER"
            data={merged}
            dataKey="cover"
            fill="#2563eb"
            shape="square"
          />
          <Scatter
            name="STOP LOSS"
            data={merged}
            dataKey="stop"
            fill="#ca8a04"
            shape="star"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}