from xgboost import XGBClassifier

def train_xgb(X_train, y_train):
    model = XGBClassifier(
        n_estimators=200,
        learning_rate=0.05,
        max_depth=5
    )
    model.fit(X_train, y_train)
    return model
