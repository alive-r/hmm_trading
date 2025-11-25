from fastapi import FastAPI
from routes.data import router as data_router
from data.database import init_db
from routes.strategy import router as strategy_router
from routes.backtest import router as backtest_router
from routes.train import router as train_router
from routes.run_backtest import router as run_backtest_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],         
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],
)


app.include_router(data_router, prefix="/api")
app.include_router(strategy_router, prefix="/api")
app.include_router(backtest_router, prefix="/api")
app.include_router(train_router, prefix="/api")
app.include_router(run_backtest_router, prefix="/api")