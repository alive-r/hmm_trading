"use client";

import type { PortfolioBlotterItem } from "@/types/backtest";

type RoundTripTrade = {
  entryDate: string;
  asset: string;
  entryAction: string;
  tradeQty: number;
  entryPrice?: number;
  size: number;
  entryReason?: string;
  exitDate?: string;
  exitAction?: string;
  exitPrice?: number;
  exitReason?: string;
  pl?: number;
  retPct?: number;
  tradeLife?: number;
};

function computeTradeLife(entryDateStr?: string, exitDateStr?: string): number | undefined {
  if (!entryDateStr || !exitDateStr) return undefined;
  const entry = new Date(entryDateStr);
  const exit = new Date(exitDateStr);
  if (Number.isNaN(entry.getTime()) || Number.isNaN(exit.getTime())) return undefined;
  const diffMs = exit.getTime() - entry.getTime();
  const days = diffMs / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.round(days));
}

/**
 * Convert a list of blotter rows (per-trade events) into round-trip trades.
 * Assumptions:
 * - BUY / SHORT open a position
 * - SELL / COVER close a position in the same asset
 * - We track at most one open trade per asset at a time
 */
function toRoundTrips(blotter: PortfolioBlotterItem[]): RoundTripTrade[] {
  const roundTrips: RoundTripTrade[] = [];
  const openByAsset: Record<string, PortfolioBlotterItem> = {};

  for (const row of blotter) {
    const isEntry = row.action === "BUY" || row.action === "SHORT";
    const isExit = row.action === "SELL" || row.action === "COVER";

    if (isEntry) {
      // Start / overwrite an open trade for this asset
      openByAsset[row.asset] = row;
    } else if (isExit) {
      const open = openByAsset[row.asset];
      if (!open) continue;

      const pl = (open.trade_pnl ?? 0) + (row.trade_pnl ?? 0);
      const notional = (open.price ?? 0) * open.trade_qty;
      const retPct = notional !== 0 ? (pl / notional) * 100 : undefined;
      const tradeLife = computeTradeLife(open.date, row.date);

      roundTrips.push({
        entryDate: open.date,
        asset: row.asset,
        entryAction: open.action,
        tradeQty: open.trade_qty,
        entryPrice: open.price ?? undefined,
        size: open.trade_qty,
        entryReason: open.reason,
        exitDate: row.date,
        exitAction: row.action,
        exitPrice: row.price ?? undefined,
        exitReason: row.reason,
        pl,
        retPct,
        tradeLife,
      });

      delete openByAsset[row.asset];
    }
  }

  return roundTrips;
}

export default function BlotterTable({ blotter }: { blotter: PortfolioBlotterItem[] }) {
  if (!blotter || blotter.length === 0) {
    return <p className="text-muted">No trades executed.</p>;
  }

  const trades = toRoundTrips(blotter);

  if (trades.length === 0) {
    return <p className="text-muted">No completed round-trip trades.</p>;
  }

  return (
    <div className="overflow-x-auto border rounded-lg shadow bg-background text-foreground">
      <table className="min-w-full text-sm border-collapse">
        <thead className="bg-background border-b">
          <tr>
            <th className="p-2 text-left text-xs font-semibold text-muted uppercase tracking-wide">ENTRY DT</th>
            <th className="p-2 text-left text-xs font-semibold text-muted uppercase tracking-wide">Asset</th>
            <th className="p-2 text-left text-xs font-semibold text-muted uppercase tracking-wide">Entry Action</th>
            <th className="p-2 text-right text-xs font-semibold text-muted uppercase tracking-wide">Trade Qty</th>
            <th className="p-2 text-right text-xs font-semibold text-muted uppercase tracking-wide">ENTRY Price</th>
            <th className="p-2 text-right text-xs font-semibold text-muted uppercase tracking-wide">Size</th>
            <th className="p-2 text-left text-xs font-semibold text-muted uppercase tracking-wide">Entry Reason</th>
            <th className="p-2 text-left text-xs font-semibold text-muted uppercase tracking-wide">EXIT DT</th>
            <th className="p-2 text-left text-xs font-semibold text-muted uppercase tracking-wide">ACTION</th>
            <th className="p-2 text-right text-xs font-semibold text-muted uppercase tracking-wide">EXIT PRC</th>
            <th className="p-2 text-left text-xs font-semibold text-muted uppercase tracking-wide">Exit Reason</th>
            <th className="p-2 text-right text-xs font-semibold text-muted uppercase tracking-wide">P/L</th>
            <th className="p-2 text-right text-xs font-semibold text-muted uppercase tracking-wide">Return</th>
            <th className="p-2 text-right text-xs font-semibold text-muted uppercase tracking-wide">Trade Life</th>
          </tr>
        </thead>

        <tbody>
          {trades.map((t, idx) => {
            const pnlColor =
              t.pl === undefined ? "text-foreground" : t.pl >= 0 ? "text-green-600" : "text-red-600";
            const retColor =
              t.retPct === undefined ? "text-muted" : t.retPct >= 0 ? "text-green-600" : "text-red-600";

            return (
              <tr key={idx} className="border-b hover:bg-background">
                <td className="p-2 text-left text-muted">{t.entryDate}</td>
                <td className="p-2 text-left font-medium">{t.asset}</td>
                <td className="p-2 text-left">{t.entryAction}</td>
                <td className="p-2 text-right">{t.tradeQty.toFixed(4)}</td>
                <td className="p-2 text-right">
                  {t.entryPrice !== undefined ? t.entryPrice.toFixed(2) : "-"}
                </td>
                <td className="p-2 text-right">{t.size.toFixed(4)}</td>
                <td className="p-2 text-left text-muted text-xs">{t.entryReason ?? "-"}</td>
                <td className="p-2 text-left text-muted">{t.exitDate ?? "-"}</td>
                <td className="p-2 text-left">{t.exitAction ?? "-"}</td>
                <td className="p-2 text-right">
                  {t.exitPrice !== undefined ? t.exitPrice.toFixed(2) : "-"}
                </td>
                <td className="p-2 text-left text-muted text-xs">{t.exitReason ?? "-"}</td>
                <td className={`p-2 text-right font-medium ${pnlColor}`}>
                  {t.pl !== undefined ? t.pl.toFixed(2) : "-"}
                </td>
                <td className={`p-2 text-right font-medium ${retColor}`}>
                  {t.retPct !== undefined ? `${t.retPct.toFixed(2)}%` : "-"}
                </td>
                <td className="p-2 text-right">
                  {t.tradeLife !== undefined ? t.tradeLife : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}