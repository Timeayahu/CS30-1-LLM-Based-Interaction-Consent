import redis
import json
import hashlib
import asyncio
import aiohttp
from datetime import datetime, timedelta
from aiohttp import ClientSession

import redis_client
import mongodb_localhost
from routes.scheduling_routes import scheduling_service
from services.crawler import call_crawler


class RedisCacheService:
    def __init__(self):
        self.redis_client = redis_client.redis_client
        self.mongodb_collection = mongodb_localhost.collection
        self.crawler = call_crawler

    def __bool__(self):
        try:
            return self.redis_client.ping()
        except redis.exceptions.ConnectionError:
            return False

    def check_result_in_redis_or_not(self, data):
        return self.redis_client.exists(data) == 1

    def check_result_in_mongodb_or_not(self, data):
        return self.mongodb_collection.find_one(data) is not None

    async def check_cache_validity(self, url: str) -> bool:
        cached_hash = await self.get_cached_hash(url)
        new_hash = await self.get_website_hash(url)

        return cached_hash == new_hash

    async def get_cached_hash(self, url: str) -> str:
        cached_data = self.redis_client.get(url)
        if cached_data:
            data = json.loads(cached_data)
            return data.get("hash", "")
        return ""

    # Check whether websites have updated or not
    async def get_website_hash(self, url: str) -> str:
        # TODO: Update with message queue
        crawler = self.crawler
        result, status = crawler.crawl_privacy_policy(url)
        html_content = result.get('html_content', None)
        if html_content:
            return hashlib.md5(html_content.encode("utf-8")).hexdigest()
        return ""

    async def verify_and_refresh_cache(self, url: str, data: dict):
        is_valid = await self.check_cache_validity(url)

        if not is_valid:
            result = await self.fetch_fresh_data(url, data)
            self.redis_client.set(url, json.dumps(result), ex=None)
            self.mongodb_collection.update_one({"url": url}, {"$set": result}, upsert=True)

    async def fetch_fresh_data(self, url: str, data: dict):
        result, status = scheduling_service.schedule(data)
        self.redis_client.set(url, json.dumps(result), ex=None)
        self.mongodb_collection.insert_one({"url": url, **result})
        return result

    async def load_or_store_result_in_redis_or_mongo(self, data):
        url = data.get('url', None)

        if url is None:
            return None

        if self.check_result_in_redis_or_not(url):
            cached = self.redis_client.get(url)
            result = json.loads(cached) if cached else None

            if result:
                await self.verify_and_refresh_cache(url, data)
                return result
        else:
            if self.check_result_in_mongodb_or_not(data):
                result = self.mongodb_collection.find_one(data)
                if result:
                    await self.verify_and_refresh_cache(url, data)
                return result
            else:
                result = await self.fetch_fresh_data(url, data)
                return result



if __name__ == "__main__":
    async def main():
        r = RedisCacheService()

        if not r:
            print("Redis 不可用")
            return

        data = {
            "url": "https://www.microsoft.com/en-us/privacy/privacystatement",
        }

        result = await r.load_or_store_result_in_redis_or_mongo(data)
        print("Return result:")
        print(result)


    asyncio.run(main())