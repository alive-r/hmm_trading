from fastapi import APIRouter
from pydantic import BaseModel
import pandas as pd

from data.database import get_prices
from models_ml.trainer import ModelTrainer

router = APIRouter()


class TrainRequest(BaseModel):
    ric: str
    start: str
    end: str
    model_type: str
    params: dict = {}


@router.post("/train-model")
def train_model(req: TrainRequest):

    raw = get_prices(req.ric, req.start, req.end)
    df = pd.DataFrame(raw)

    trainer = ModelTrainer()
    result = trainer.train(df, req.model_type, req.params)

    model = result["model"]
    features = result["features"]
    accuracy = result["accuracy"]

    
    signals = trainer.generate_signals(df, model, features)

    return {
        "accuracy": accuracy,
        "signals": signals.to_dict(orient="records")
    }
