import redis
import os
from dotenv import load_dotenv
load_dotenv()

REDIS_URL = os.getenv("REDIS_URL")

pool = redis.ConnectionPool.from_url(REDIS_URL, decode_responses=True,ssl_cert_reqs="none")
redis_client = redis.Redis(connection_pool=pool)

CACHE_TTL = 3600