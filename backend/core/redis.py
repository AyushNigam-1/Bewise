import redis

pool = redis.ConnectionPool.from_url("redis://localhost:6379/0", decode_responses=True)
redis_client = redis.Redis(connection_pool=pool)

CACHE_TTL = 3600