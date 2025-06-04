from services.cache.redis_ec2 import connect_to_redis, close_redis_connection


def reset_redis():
    # WARNING: This deletes everything in Redis!
    r = connect_to_redis()
    print("Flushing all Redis keys...")
    r.flushdb()  # or flushall() if you're sure

    # Store as JSON string under key "feature_visibility"
    r.set("extension", "1")
    print("Reset Redis successfully")
    
    close_redis_connection(r)

if __name__ == "__main__":
    reset_redis()
