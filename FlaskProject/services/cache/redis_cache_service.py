import redis
import json
import hashlib
import asyncio
import aiohttp
from datetime import datetime, timedelta
from aiohttp import ClientSession

import redis_client
import mongodb_localhost
from routes.privacy_routes import summary_privacy_service, classification_privacy_service
from routes.scheduling_routes import scheduling_service
from services.crawler import call_crawler
from services.crawler.call_crawler import crawl_privacy_policy
from services.llm_privacy_classification import classification_service


class RedisCacheService:
    def __init__(self):
        self.redis_client = redis_client.redis_client
        self.mongodb_collection = mongodb_localhost.collection
        self.crawler = call_crawler
        self.result = None

    def __bool__(self):
        try:
            return self.redis_client.ping()
        except redis.exceptions.ConnectionError:
            return False

    def check_result_in_redis_or_not(self, data):
        return self.redis_client.exists(data) == 1

    def check_result_in_mongodb_or_not(self, data):
        return self.mongodb_collection.find_one(data) is not None

    def record_duration_check_cache(self, url):
        cache_time = self.get_cache_time(url)
        new_time = self.get_website_time(url)
        if cache_time and new_time and (new_time - cache_time < timedelta(minutes=180)):
            return True
        return False

    def record_duration_check_database(self, url):
        record_time = self.get_dbrecord_time(url)
        new_time = self.get_website_time(url)
        if record_time and new_time and (new_time - record_time < timedelta(minutes=180)):
            return True
        return False

    def get_cache_time(self, url):
        cache_data = self.redis_client.get(url)
        if cache_data:
            data = json.loads(cache_data)
            time = data.get("time", "")
            return datetime.fromisoformat(time)
        return None

    def get_dbrecord_time(self, url: str):
        record_data = self.mongodb_collection.find_one({"url": url})
        if record_data:
            time = record_data.get("time", "")
            return datetime.fromisoformat(time)
        return None

    def get_website_time(self, url: str):
        # TODO: Update with message queue
        crawler = self.crawler
        url = {"url:": url}
        print(url)
        result, status = crawler.crawl_privacy_policy(url)
        time = result.get('time', None)
        if time:
            return datetime.fromisoformat(time)
        return None

    def check_cache_validity(self, url: str) -> bool:
        cache_hash = self.get_cache_hash(url)
        new_hash = self.get_website_hash(url)

        return cache_hash == new_hash

    def check_database_validity(self, url: str) -> bool:
        cached_hash = self.get_dbrecord_hash(url)
        new_hash = self.get_website_hash(url)

        return cached_hash == new_hash

    def get_cache_hash(self, url: str) -> str:
        cached_data = self.redis_client.get(url)
        if cached_data:
            data = json.loads(cached_data)
            return data.get("hash", "")
        return ""

    def get_dbrecord_hash(self, url: str) -> str:
        record_data = self.mongodb_collection.find_one({"url": url})
        if record_data:
            return record_data.get("hash", "")
        return ""

    # Check whether websites have updated or not
    def get_website_hash(self, url: str) -> str:
        # TODO: Update with message queue
        url = {"url:": url}
        crawler = self.crawler
        result, status = crawler.crawl_privacy_policy(url)
        html_content = result.get('html_content', None)
        if html_content:
            return hashlib.md5(html_content.encode("utf-8")).hexdigest()
        return ""

    def update_redis_and_database_hash(self, url: str):
        self.result = self.fetch_fresh_data(url)

        return self.result

    def verify_and_refresh_cache(self, url: str):
        is_valid = self.check_cache_validity(url)

        if is_valid:
            result = self.redis_client.get(url)
            return result
        else:
            result = self.update_redis_and_database_hash(url)
            return result

    def verify_and_refresh_database(self, url: str):
        is_valid = self.check_database_validity(url)

        if is_valid == True:
            result = self.mongodb_collection.find_one({"url": url})
            return result

        if not is_valid == False:
            result = self.update_redis_and_database_hash(url)
            return result

    def fetch_fresh_data(self, url: str):
        # if result has hash
        # self.result, status = scheduling_service.schedule(data) # Integrate to project
        self.result = self.create_result(url) # For testing
        self.redis_client.set(url, json.dumps(self.result), ex=None)
        # self.mongodb_collection.insert_one({"url": url, **self.result})
        self.mongodb_collection.insert_one({"url": url, **self.result})
        return self.result

    # Test method
    def create_result(self, url: str):
        url_dict = {"url": url}
        url_json = json.dumps(url_dict)
        print(url_dict)
        response, status_code = crawl_privacy_policy(url_dict)
        end_time = datetime.now()
        time = end_time.isoformat()
        print(response)
        url = url
        html_content = response.get('html', None)
        markdown_content = response.get('markdown', None)
        summary_result = summary_privacy_service.generate_summary_content(url, html_content, markdown_content)
        classification_result = classification_privacy_service.generate_classification_content(url, html_content, markdown_content)
        if html_content is None:
            html_content = ''
        hash = hashlib.md5(html_content.encode("utf-8")).hexdigest()

        return {
            "url": url,
            "hash": hash,
            "summary": summary_result,
            "classification": classification_result,
            "time": time,
            "status": status_code
        }

    def load_or_store_result_in_redis_or_mongo(self, data):
        url = data.get('url', None)

        if url is None:
            return None

        if self.check_result_in_redis_or_not(url):
            if self.record_duration_check_cache(url):
                cached = self.redis_client.get(url)
                result = json.loads(cached) if cached else None
                return result
            else:
                result = self.verify_and_refresh_cache(url, data)
                return result
        else:
            if self.check_result_in_mongodb_or_not(data):
                if self.record_duration_check_database(url):
                    record = self.mongodb_collection.find_one({"url": url})
                    result = json.loads(record) if record else None
                    return result
                else:
                    result = self.verify_and_refresh_database(url, data)
                    return result
            else:
                result = self.fetch_fresh_data(url)
                return result


if __name__ == "__main__":
    def main():
        r = RedisCacheService()

        if not r:
            print("Redis is unavailable.")
            return

        data = {
            "url": "https://www.microsoft.com/en-us/privacy/privacystatement",
        }

        result = r.load_or_store_result_in_redis_or_mongo(data)
        print("Return result:")
        print(result)


    main()
