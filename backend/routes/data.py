from fastapi import APIRouter
from pydantic import BaseModel
from data.database import get_prices

router = APIRouter()

class FetchRequest(BaseModel):
    ric: str
    start: str
    end: str

@router.get("/prices")
def fetch_prices(ric: str, start: str, end: str):
    data = get_prices(ric, start, end)

    return {
        "ric": ric,
        "count": len(data),
        "data": data
    }


