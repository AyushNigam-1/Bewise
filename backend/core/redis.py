import redis
import os
from dotenv import load_dotenv
from rq import Queue
load_dotenv()

REDIS_URL = os.getenv("REDIS_URL")

pool_cache = redis.ConnectionPool.from_url(REDIS_URL, decode_responses=True, ssl_cert_reqs="none")
redis_client = redis.Redis(connection_pool=pool_cache)

pool_rq = redis.ConnectionPool.from_url(REDIS_URL, decode_responses=False, ssl_cert_reqs="none")
redis_client_rq = redis.Redis(connection_pool=pool_rq)

redis_queue = Queue(connection=redis_client_rq)

CACHE_TTL = 3600