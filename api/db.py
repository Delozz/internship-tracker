import os
from functools import lru_cache
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()


@lru_cache(maxsize=1)
def get_client() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_ANON_KEY"]  # read-only key for API (L3)
    return create_client(url, key)
