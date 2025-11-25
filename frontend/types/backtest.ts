export interface SignalItem {
  date: string;
  signal: number;
}

export interface BlotterItem {
  date: string;
  trade_qty: number;
  price: number;
  action: string;
  reason: string;
  position_after: number;
  trade_pnl: number;
}

export interface PortfolioBlotterItem extends BlotterItem {
  asset: string;
  portfolio_cum_pnl: number;
}

export interface PnlPoint {
  date: string;
  pnl?: number;
  portfolio_value?: number;
  portfolio_cum_pnl?: number;
}

export interface BacktestResult {
  assets: string[];
  weights: Record<string, number>;
  portfolio_pnl_curve: PnlPoint[];
  portfolio_blotter: PortfolioBlotterItem[];
  per_asset_pnl: Record<string, PnlPoint[]>;
  sharpe: number;
  max_drawdown: number;
  alpha?: number | null;
}

export interface ParametersType {
  // Strategy parameters
  short_window?: number;
  long_window?: number;
  window?: number;
  overbought?: number;
  oversold?: number;
  
  // Model parameters
  n_estimators?: number;
  max_depth?: number;
  
  // Backtest parameters
  stop_loss_pct?: number;
  initial_capital?: number;
}

export interface FormState {
  assets: string[];
  weights: Record<string, number>;
  start: string;
  end: string;
  analysis_type: "strategy" | "model";  // 🔥 添加 model
  strategy_type?: string;
  model_type?: string;  // 🔥 新增
  parameters: ParametersType;
}
