import sys, os
from urllib.parse import urlparse
import html2text
import redis
import json
import hashlib
from datetime import datetime, timedelta

import services
from services.scheduling import service
from services.split import call_split
from services.section_analysis.what_to_collect import info_collection
from services.section_analysis.how_to_use import info_use
from services.section_analysis.who_to_share import info_share

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))
import redis_client
import mongodb_localhost
# import test_aws_redis
# import test_db
from routes.privacy_routes import summary_privacy_service, classification_privacy_service
from services.crawler import call_crawler
from services.crawler.call_crawler import crawl_privacy_policy
import asyncio


class RedisCacheService:
    def __init__(self):
        self.redis_client = redis_client.redis_client
        self.mongodb_collection = mongodb_localhost.collection
        # self.redis_client = test_aws_redis.redis_client
        # self.mongodb_collection = test_db.collection
        self.company_name = None
        self.crawler_time = None
        self.crawler_result = None
        self.html_content = None
        self.markdown_content = None
        self.hash = None
        self.sections = {'Collect': None, 'Use': None, 'Share': None}
        self.result = None
        self.status = None

    def set_hash(self):
        self.markdown_content = self.get_content(self.html_content)
        if self.markdown_content is None:
            self.markdown_content = ''
        hash = hashlib.md5(self.markdown_content.encode("utf-8")).hexdigest()
        return hash

    def crawler(self, data):
        result, status = call_crawler.crawl_privacy_policy(data)
        self.crawler_time = datetime.now()
        self.crawler_result = result
        self.status = status
        self.html_content = result.get('html', None)
        self.markdown_content = result.get('markdown', None)
        url = data.get("url")
        domain = urlparse(url).netloc
        company_name = domain.split('.')[0]
        self.company_name = company_name

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
        self.crawler({"url": url})
        if self.crawler_time:
            return self.crawler_time
            # return datetime.fromisoformat(self.crawler_time)
        return None

    def check_cache_validity(self, url: str) -> bool:
        cache_hash = self.get_cache_hash(url)
        new_hash = self.get_website_hash()

        return cache_hash == new_hash

    def check_database_validity(self, url: str) -> bool:
        cached_hash = self.get_dbrecord_hash(url)
        new_hash = self.get_website_hash()

        return cached_hash == new_hash

    def get_cache_hash(self, url: str):
        cached_data = self.redis_client.get(url)
        if cached_data:
            data = json.loads(cached_data)
            return data.get("hash", "")
        return ""

    def get_dbrecord_hash(self, url: str):
        record_data = self.mongodb_collection.find_one({"url": url})
        if record_data:
            return record_data.get("hash", "")
        return ""

    # Check whether websites have updated or not
    def get_website_hash(self):
        if self.hash:
            return self.hash
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

    async def fetch_fresh_data(self, url: str):
        # if result has hash
        # self.result, status = scheduling_service.schedule(data) # Integrate to project
        # self.result = self.create_result(url) # For testing
        self.result = await self.create_result(url)
        self.redis_client.set(url, json.dumps(self.result), ex=None)
        self.mongodb_collection.insert_one({"url": url, **self.result})
        return self.result

    def get_content(self, html_content):
        converter = html2text.HTML2Text()
        markdown_content = converter.handle(html_content)
        return markdown_content

    def split(self):
        self.sections = call_split.extract_webpage_content(self.html_content)

    async def analyse_sections(self):
        results = await asyncio.gather(
            info_collection(self.sections['Collect']),
            info_use(self.sections['Use']),
            info_share(self.sections['Share'])
        )
        return results

    async def sections_result(self):
        self.split()
        result = await self.analyse_sections()
        merged = dict()
        for d in result:
            merged.update(d)
        result_summary = {'summary': json.dumps(merged, indent=4)}
        return result_summary

    # Test method
    async def create_result(self, url: str):
        self.crawler({"url": url})
        self.hash = self.set_hash()
        summary_result = await self.sections_result()

        return {
            "url": url,
            "hash": self.hash,
            "summary": summary_result,
            "time": self.crawler_time.isoformat() if self.crawler_time else None,
            "status": self.status
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
                result = self.verify_and_refresh_cache(url)
                return result
        else:
            if self.check_result_in_mongodb_or_not(data):
                if self.record_duration_check_database(url):
                    record = self.mongodb_collection.find_one({"url": url})
                    result = json.loads(record) if record else None
                    return result
                else:
                    result = self.verify_and_refresh_database(url)
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

        # result = r.load_or_store_result_in_redis_or_mongo(data)
        # print("Return result:")
        # print(result)

        r = RedisCacheService()
        result = asyncio.run(r.load_or_store_result_in_redis_or_mongo(data))
        print("Return result:")
        print(result)


    main()
