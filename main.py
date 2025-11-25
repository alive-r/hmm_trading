from fastapi import FastAPI
from app.routes.data import router as data_router
from app.database import init_db
from app.routes.strategy import router as strategy_router
from app.routes.backtest import router as backtest_router
from app.routes.train import router as train_router
from app.routes.run_backtest import router as run_backtest_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # 允许所有前端域名（开发阶段）
    allow_credentials=True,
    allow_methods=["*"],          # 必须允许 OPTIONS!!
    allow_headers=["*"],
)


app.include_router(data_router, prefix="/api")
app.include_router(strategy_router, prefix="/api")
app.include_router(backtest_router, prefix="/api")
app.include_router(train_router, prefix="/api")
app.include_router(run_backtest_router, prefix="/api")