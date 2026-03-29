from motor.motor_asyncio import AsyncIOMotorClient
import os

_client = None

def get_db_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    return _client

def close_db_client():
    global _client
    if _client is not None:
        _client.close()
        _client = None

def get_db():
    return get_db_client()[os.environ['DB_NAME']]
