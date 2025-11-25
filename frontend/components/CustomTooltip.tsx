"use client";

interface TooltipPayload {
  payload: Record<string, unknown>;
  value: number;
  name?: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
}

export default function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const d = payload[0].payload as {
    timestamp: number;
    close: number;
    buy?: number | null;
    sell?: number | null;
    short?: number | null;
    cover?: number | null;
    stop?: number | null;
  };

  return (
    <div className="bg-white border border-gray-300 p-3 rounded shadow text-sm">
      <div>
        <strong>Date:</strong>{" "}
        {new Date(d.timestamp).toISOString().slice(0, 10)}
      </div>
      <div>
        <strong>Price:</strong> {d.close}
      </div>

      <div className="mt-2">
        {d.buy && <div className="text-green-600">🟢 BUY</div>}
        {d.sell && <div className="text-red-600">🔴 SELL</div>}
        {d.short && <div className="text-purple-600">🟣 SHORT</div>}
        {d.cover && <div className="text-blue-600">🔵 COVER</div>}
        {d.stop && <div className="text-yellow-600">⚠️ STOP LOSS</div>}
      </div>
    </div>
  );
}