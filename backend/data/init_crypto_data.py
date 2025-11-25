import lseg.data as ld
import pandas as pd
from datetime import datetime
from database import init_db, store_price_data


CRYPTOS = ["BTC=", "ETH=", "XRP=", "LTC=",  "BCH="]

START_DATE = "2020-01-01"
END_DATE   = "2025-11-24"


def start_session():
    ld.open_session(name="desktop.workspace")
    
def fetch_single_crypto(ric, start, end):
    fields = [
            "BID", "ASK",
            "MID_PRICE",
            "OPEN", "HIGH", "LOW" 
        ]
    
    resp = ld.get_history(
        universe=ric,
        fields=fields,
        start=start,
        end=end,
        interval="1D"
    )

    df = resp
    df.reset_index(inplace=True)
    df.columns = [c[1] if isinstance(c, tuple) else c for c in df.columns]

    df["ric"] = ric

    df["close"] = (df["BID"] + df["ASK"]) / 2
    df.rename(columns={"Date": "date"}, inplace=True)
    
    df = df[["date", "ric", "close", "BID", "ASK", "MID_PRICE"]]
    return df


def main():
    print("📌 Initializing database...")
    init_db()

    print("📌 Connecting to LSEG...")
    start_session()
    for ric in CRYPTOS:
        print(f"\n⏳ Fetching {ric} ...")
        df = fetch_single_crypto(ric, START_DATE, END_DATE)
        print(df.tail())
        if df is None or df.empty:
            print(f"⚠️ {ric} has no data, skipping")
            continue
        print(f"📌 {ric}: {len(df)} rows fetched, storing to DB...")
        store_price_data(df)
    print("\n🎉 All crypto data stored successfully!")

if __name__ == "__main__":
    main()
