import os
import redis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

pool = redis.ConnectionPool.from_url(REDIS_URL, decode_responses=True)
redis_client = redis.Redis(connection_pool=pool)

CACHE_TTL = 3600