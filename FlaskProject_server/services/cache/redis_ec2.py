from redis import Redis
import os
import logging
from dotenv import load_dotenv


load_dotenv()
logging.basicConfig(level=logging.INFO)


# connect to redis
def connect_to_redis():
    """
    Establishes connection to Redis.
    Returns the Redis client if connection is successful, None otherwise.
    """
    redis_client = None
    
    try:
        redis_client = Redis(
            host=os.getenv("REDIS_HOST", "test-cache-cpcxto.serverless.use1.cache.amazonaws.com"),
            port=int(os.getenv("REDIS_PORT", 6379)),
            db=0,
            decode_responses=True, 
            ssl=True
        )
        
        # Test the connection
        redis_client.ping()
        
        print(f"Successfully connected to Redis: {os.getenv('REDIS_HOST', 'localhost')}:{os.getenv('REDIS_PORT', 6379)}")
        
        return redis_client
    except Exception as e:
        print(f"Redis connection error: {e}")
        return None

def close_redis_connection(client):
    """
    Closes the Redis connection.
    """
    if client:
        try:
            client.close()
            print("Redis connection closed successfully")
        except Exception as e:
            print(f"Error closing Redis connection: {e}")


# check if the result is in redis or not
def check_result_in_redis_or_not(redis_client, url):
    return redis_client.exists(url) == 1

# write the result to redis
def write_result_to_redis(redis_client, url, result):
    redis_client.setex(url, os.getenv("REDIS_EXPIRE_TIME", 3600), result)

# read the result from redis
def read_result_from_redis(redis_client, url):
    return redis_client.get(url)


