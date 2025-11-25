from sklearn.ensemble import RandomForestClassifier

def train_rf(X_train, y_train, n_estimators=100, max_depth=None):
    model = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        random_state=42
    )
    model.fit(X_train, y_train)
    return model
