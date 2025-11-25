import numpy as np
import pandas as pd
from .backtester import Backtester


class PortfolioBacktester:

    def __init__(self, assets, weights, parameters):
        self.assets = assets
        self.weights = weights
        self.parameters = parameters

    def run(self, price_data_dict: dict, signals_dict: dict):

        active_assets = [a for a in self.assets if self.weights.get(a, 0) > 0]
        if not active_assets:
            raise ValueError("No active assets with weight > 0.")

        total_capital = float(self.parameters.get("initial_capital", 10_000.0))
        
        weight_sum = sum(self.weights[a] for a in active_assets)
        if weight_sum <= 0:
            raise ValueError("Sum of active weights must be > 0.")

        per_asset_capital = {
            a: total_capital * (self.weights[a] / weight_sum) 
            for a in active_assets
        }

        stop_loss_pct = self.parameters.get("stop_loss_pct", None)

        per_asset_pnl: dict[str, pd.DataFrame] = {}
        per_asset_blotter: dict[str, pd.DataFrame] = {}

        bt = Backtester()

        for asset in active_assets:
            prices = price_data_dict[asset].copy()
            signals = signals_dict[asset].copy()

            result = bt.run(
                prices=prices,
                signals=signals,
                stop_loss_pct=stop_loss_pct,
                initial_capital=per_asset_capital[asset],
            )

            pnl_df = result["pnl_curve"].copy()
            per_asset_pnl[asset] = pnl_df

            blotter_df = pd.DataFrame(result["blotter"])
            if not blotter_df.empty:
                blotter_df["asset"] = asset
            per_asset_blotter[asset] = blotter_df

        merged: pd.DataFrame | None = None

        for asset in active_assets:
            df = per_asset_pnl[asset].rename(columns={"pnl": f"value_{asset}"})
            if merged is None:
                merged = df.copy()
            else:
                merged = merged.merge(df, on="date", how="outer")

        merged = merged.sort_values("date").reset_index(drop=True)

        for asset in active_assets:
            col = f"value_{asset}"
            if col not in merged.columns:
                merged[col] = per_asset_capital[asset]
            merged[col] = merged[col].ffill()
            merged[col] = merged[col].fillna(per_asset_capital[asset])


        merged["portfolio_value"] = 0.0
        for asset in active_assets:
            merged["portfolio_value"] += merged[f"value_{asset}"]

        merged["portfolio_cum_pnl"] = merged["portfolio_value"] - total_capital

        portfolio_df = merged[["date", "portfolio_value", "portfolio_cum_pnl"]].copy()
        portfolio_df = portfolio_df.replace([np.inf, -np.inf], np.nan).fillna(0.0)

        if per_asset_blotter:
            all_blotter = pd.concat(
                [df for df in per_asset_blotter.values() if not df.empty],
                ignore_index=True,
            )
            all_blotter = all_blotter.sort_values("date").reset_index(drop=True)
        else:
            all_blotter = pd.DataFrame()


        if not all_blotter.empty:
            all_blotter["cumulative_trade_pnl"] = all_blotter["trade_pnl"].cumsum()
            portfolio_lookup = portfolio_df.set_index("date")["portfolio_cum_pnl"].to_dict()
            unique_dates = sorted(all_blotter["date"].unique())
            date_to_prev_pnl = {}
            for i, date in enumerate(unique_dates):
                if i == 0:
                    date_to_prev_pnl[date] = 0.0
                else:
                    prev_date = unique_dates[i - 1]
                    date_to_prev_pnl[date] = portfolio_lookup.get(prev_date, 0.0)
            def calculate_portfolio_pnl(row):
                date = row["date"]
                starting_pnl = date_to_prev_pnl.get(date, 0.0)
                trades_before = all_blotter[
                    (all_blotter["date"] == date) & 
                    (all_blotter.index <= row.name)
                ]["trade_pnl"].sum()
                
                return starting_pnl + trades_before
            
            all_blotter["portfolio_cum_pnl"] = all_blotter.apply(
                calculate_portfolio_pnl, axis=1
            )
        else:
            all_blotter["portfolio_cum_pnl"] = []

        all_blotter = all_blotter.replace([np.inf, -np.inf], np.nan).fillna(0.0)
        portfolio_df["returns"] = portfolio_df["portfolio_value"].pct_change()
        returns = portfolio_df["returns"].replace([np.inf, -np.inf], np.nan).dropna()

        if len(returns) == 0 or returns.std() == 0:
            sharpe = 0.0
            alpha = 0.0
        else:
            mean_ret = returns.mean()
            std_ret = returns.std()
            sharpe = float(np.sqrt(252) * mean_ret / std_ret) if std_ret > 0 else 0.0
            alpha = float(mean_ret - 0.0001) if not np.isnan(mean_ret) else 0.0

        cum_max = portfolio_df["portfolio_value"].cummax()
        drawdown = (portfolio_df["portfolio_value"] - cum_max) / cum_max
        drawdown = drawdown.replace([np.inf, -np.inf], np.nan).fillna(0.0)
        max_drawdown = float(drawdown.min())
        per_asset_pnl_dict: dict[str, list[dict]] = {}
        for asset in active_assets:
            per_asset_pnl_dict[asset] = per_asset_pnl[asset].to_dict(orient="records")

        return {
            "assets": active_assets,
            "weights": {a: self.weights[a] for a in active_assets},
            "portfolio_pnl_curve": portfolio_df[["date", "portfolio_value", "portfolio_cum_pnl"]].to_dict(orient="records"),
            "portfolio_blotter": all_blotter.to_dict(orient="records"),
            "per_asset_pnl": per_asset_pnl_dict,
            "sharpe": sharpe,
            "max_drawdown": max_drawdown,
            "alpha": alpha,
        }