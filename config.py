import os
from dotenv import load_dotenv

load_dotenv()

LSEG_APP_KEY = os.getenv("LSEG_APP_KEY")

if not LSEG_APP_KEY:
    raise ValueError("Missing LSEG_APP_KEY in .env file")
