"use client";

import type { PortfolioBlotterItem } from "@/types/backtest";

export default function BlotterTable({ blotter }: { blotter: PortfolioBlotterItem[] }) {
  if (!blotter || blotter.length === 0) {
    return <p className="text-gray-500">No trades executed.</p>;
  }

  return (
    <div className="overflow-x-auto border rounded-lg shadow">
      <table className="min-w-full text-sm border-collapse">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="p-2 text-left">Date</th>
            <th className="p-2 text-left">Asset</th>
            <th className="p-2 text-center">Action</th>
            <th className="p-2 text-right">Trade Qty</th>
            <th className="p-2 text-right">Price</th>
            <th className="p-2 text-right">Position After</th>
            <th className="p-2 text-left">Reason</th>
            <th className="p-2 text-right">Trade PnL</th>
            <th className="p-2 text-right">Portfolio Cum PnL</th>
          </tr>
        </thead>

        <tbody>
          {blotter.map((row, idx) => {
            // 根据 action 设置颜色
            const actionColor = 
              row.action === "BUY" ? "text-green-600 font-semibold" :
              row.action === "SELL" ? "text-red-600 font-semibold" :
              row.action === "SHORT" ? "text-purple-600 font-semibold" :
              row.action === "COVER" ? "text-blue-600 font-semibold" :
              "text-gray-700";

            const pnlColor = row.trade_pnl >= 0 ? "text-green-600" : "text-red-600";

            return (
              <tr key={idx} className="border-b hover:bg-gray-50">
                <td className="p-2 text-left text-gray-600">{row.date}</td>
                <td className="p-2 text-left font-medium">{row.asset}</td>
                <td className={`p-2 text-center ${actionColor}`}>{row.action}</td>
                <td className="p-2 text-right">{row.trade_qty.toFixed(4)}</td>
                <td className="p-2 text-right">{row.price?.toFixed(2) ?? "-"}</td>
                <td className="p-2 text-right">{row.position_after.toFixed(4)}</td>
                <td className="p-2 text-left text-gray-600 text-xs">{row.reason}</td>
                <td className={`p-2 text-right font-medium ${pnlColor}`}>
                  {row.trade_pnl?.toFixed(2) ?? "-"}
                </td>
                <td className="p-2 text-right font-semibold">
                  {row.portfolio_cum_pnl !== undefined
                    ? row.portfolio_cum_pnl.toFixed(2)
                    : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}