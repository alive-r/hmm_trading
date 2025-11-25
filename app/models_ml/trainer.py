import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

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
    
    def generate_walkforward_signals(self, df: pd.DataFrame, model_type="logistic", params=None, window=200):

        if params is None:
            params = {}

        # feature engineering
        df_feat, features, target = build_features(df)
        if df_feat.empty:
            raise ValueError("Feature generation failed")

        # sort by date
        df_feat = df_feat.sort_values("date").reset_index(drop=True)

        all_signals = []

        # walk forward analysis
        for t in range(window, len(df_feat)):
            train_df = df_feat.iloc[t - window : t]
            test_df = df_feat.iloc[t : t + 1]

            X_train = train_df[features]
            y_train = train_df[target]
            X_test = test_df[features]

            # train by model
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

            # forecast future data
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
                "date": test_df["date"].values[0],
                "signal": sig
            })

        return pd.DataFrame(all_signals)