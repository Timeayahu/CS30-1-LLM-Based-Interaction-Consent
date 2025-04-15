from redis import Redis
import logging

logging.basicConfig(level=logging.INFO)

redis_client = Redis(
    host='test-cache-cpcxto.serverless.use1.cache.amazonaws.com',
    port=6379,
    decode_responses=True,
    ssl=True,
)

if redis_client.ping():
    logging.info("Connected to Redis")
result = redis_client.get("a")
print(result)
