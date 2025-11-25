from sqlalchemy import create_engine, Column, String, Float, Date, select
from sqlalchemy.orm import declarative_base, sessionmaker
import pandas as pd

DATABASE_URL = "sqlite:///./crypto.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
Base = declarative_base()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Price(Base):
    __tablename__ = "prices"

    date = Column(Date, primary_key=True)
    ric = Column(String, primary_key=True)
    close = Column(Float)
    bid = Column(Float)
    ask = Column(Float)


def init_db():
    Base.metadata.create_all(bind=engine)


def store_price_data(df: pd.DataFrame):
    db = SessionLocal()

    try:
        for _, row in df.iterrows():
            db.merge(Price(
                date=row["date"],
                ric=row["ric"],
                close=row["close"],
                bid=row["BID"],
                ask=row["ASK"],
            ))
        db.commit()
    finally:
        db.close()

def get_prices(ric: str, start: str, end: str):
    db = SessionLocal()

    stmt = (
        select(Price)
        .where(Price.ric == ric)
        .where(Price.date >= start)
        .where(Price.date <= end)
        .order_by(Price.date.asc())
    )

    rows = db.execute(stmt).scalars().all()
    db.close()

    result = [
        {
            "date": r.date.isoformat(),
            "ric": r.ric,
            "close": r.close,
            "bid": r.bid,
            "ask": r.ask
        }
        for r in rows
    ]

    return result
