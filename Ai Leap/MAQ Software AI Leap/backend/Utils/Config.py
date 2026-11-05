import os
from dotenv import load_dotenv

load_dotenv()

def get_credentials():
    endpoint = os.getenv("ENDPOINT", "").strip()
    key = os.getenv("KEY", "").strip()

    if endpoint and key:
        return endpoint, key
    
    return None, None