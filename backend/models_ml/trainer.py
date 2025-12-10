import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from datetime import datetime

from .feature_engineering import build_features
from .train_logistic import train_logistic
from .train_rf import train_rf
from .train_xgb import train_xgb


class ModelTrainer:

    def train(self, df: pd.DataFrame, model_type="logistic", params=None):
        if params is None:
            params = {}
            
        df_feat, features, target = build_features(df)

        if df_feat.empty or len(df_feat) < 100:
            raise ValueError("Insufficient data for training (need at least 100 rows)")

        X = df_feat[features]
        y = df_feat[target]

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, shuffle=False
        )

        if model_type == "logistic":
            model = train_logistic(X_train, y_train)

        elif model_type == "rf":
            n_estimators = params.get("n_estimators", 100)
            max_depth = params.get("max_depth", 5)
            model = train_rf(X_train, y_train, n_estimators, max_depth)

        elif model_type == "xgb":
            model = train_xgb(X_train, y_train)

        else:
            raise ValueError(f"Unknown model type: {model_type}")

        # Prediction & accuracy
        preds = model.predict(X_test)
        acc = accuracy_score(y_test, preds)

        return {
            "model": model,
            "accuracy": float(acc),
            "features": features,
            "train_index": X_train.index,
            "test_index": X_test.index
        }

    def generate_signals(self, df: pd.DataFrame, model, features, test_index):
        df_feat, _, _ = build_features(df)

        # Only predict on test rows
        test_df = df_feat.loc[test_index].copy()

        if test_df.empty:
            raise ValueError("No test-set feature rows available")

        try:
            proba = model.predict_proba(test_df[features])[:, 1]
            test_df["signal"] = 0
            test_df.loc[proba > 0.55, "signal"] = -1
            test_df.loc[proba < 0.55, "signal"] = 1
        except AttributeError:
            test_df["pred"] = model.predict(test_df[features])
            test_df["signal"] = test_df["pred"].apply(lambda x: 1 if x == 1 else -1)

        return test_df[["date", "signal"]]
    
    def generate_walkforward_signals(
        self,
        df: pd.DataFrame,
        model_type: str = "logistic",
        params: dict | None = None,
        window: int = 200,
        start_date: datetime | str | None = None,
    ) -> pd.DataFrame:
        """
        Walk-forward backtest:
        - Use data before start_date as history for training windows.
        - Start generating trading signals from start_date onward.
        - For each date >= start_date, train on the previous `window` rows
          (based on feature-engineered data) and predict the signal for that day.

        Returns a DataFrame with ['date', 'signal'].
        """

        if params is None:
            params = {}

        # 1. Feature engineering
        df_feat, features, target = build_features(df)
        if df_feat.empty:
            raise ValueError("Feature generation failed")

        if "date" not in df_feat.columns:
            raise ValueError("Feature DataFrame must contain a 'date' column.")

        # 2. Ensure date is datetime and sort
        if not pd.api.types.is_datetime64_any_dtype(df_feat["date"]):
            df_feat["date"] = pd.to_datetime(df_feat["date"])

        df_feat = df_feat.sort_values("date").reset_index(drop=True)

        # 3. Handle start_date: if None, use earliest available date
        if start_date is not None:
            if isinstance(start_date, str):
                start_date = datetime.fromisoformat(start_date)
        else:
            start_date = df_feat["date"].min()

        all_signals = []

        # 4. Walk-forward analysis
        for i in range(len(df_feat)):
            current_date = df_feat.loc[i, "date"]

            # Dates before start_date are only used as history, not for prediction
            if current_date < start_date:
                continue

            # History: all rows strictly before current_date
            hist = df_feat[df_feat["date"] < current_date]

            # Require at least `window` rows of history to train a model
            if len(hist) < window:
                # Not enough history for a stable model at this date, skip this day
                continue

            train_df = hist.tail(window)

            X_train = train_df[features]
            y_train = train_df[target]

            X_test = df_feat.loc[[i], features]

            # Train model for the current window
            if model_type == "logistic":
                model = train_logistic(X_train, y_train)
            elif model_type == "rf":
                n_estimators = params.get("n_estimators", 100)
                max_depth = params.get("max_depth", 5)
                model = train_rf(X_train, y_train, n_estimators, max_depth)
            elif model_type == "xgb":
                model = train_xgb(X_train, y_train)
            else:
                raise ValueError(f"Unknown model type: {model_type}")

            # Forecast and map prediction to trading signal
            try:
                proba = model.predict_proba(X_test)[:, 1]
                sig = 0
                if proba > 0.65:
                    sig = -1
                elif proba < 0.45:
                    sig = 1
            except AttributeError:
                pred = model.predict(X_test)[0]
                sig = 1 if pred == 1 else -1

            all_signals.append({
                "date": current_date,
                "signal": sig
            })

        # If no signals were generated, return an empty DataFrame with the right columns
        if not all_signals:
            return pd.DataFrame(columns=["date", "signal"])

        return pd.DataFrame(all_signals)