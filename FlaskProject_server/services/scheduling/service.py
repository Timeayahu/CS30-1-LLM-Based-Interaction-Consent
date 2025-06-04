from services.split import call_split
from services.classification import call_classification
import queue
import threading
from urllib.parse import urlparse
import html2text
import json
import os  
import hashlib
import datetime
import requests
from ..section_analysis.what_to_collect import info_collection
from ..section_analysis.how_to_use import info_use
from ..section_analysis.who_to_share import info_share
from concurrent.futures import ThreadPoolExecutor, as_completed

from models.mongodb_ec2 import (
    connect_to_mongodb,
    close_mongodb_connection,
    get_policy_by_url,
    save_policy,
    save_summary,
    get_summary,
    update_last_checked_time,
    check_db_update
)
from bson import ObjectId

from services.cache.redis_ec2 import (
    connect_to_redis,
    close_redis_connection,
    check_result_in_redis_or_not,
    write_result_to_redis,
    read_result_from_redis
)


# set refresh interval, default is 7 days
REFRESH_INTERVAL = datetime.timedelta(days=7)
CRAWLER_HOST = os.getenv("CRAWLER_HOST", "3.85.23.203")



class Scheduling:
    def __init__(self):
        self.html_content = None
        self.markdown_content = None
        self.sections = {'Collect': None, 'Use': None, 'Share': None}
        self.result = None
        self.status = None
        self.company_name = None
        self.policy_id = None  
        self.result_queue = queue.Queue()

    def get_content(self, data):
        """
        Get the content from the data and convert it to markdown format.
        """
        self.html_content = data.get('text', None)
        converter = html2text.HTML2Text()
        self.markdown_content = converter.handle(self.html_content)

    def crawler(self, data):
        """
        Crawl the content from the crawler and convert it to markdown format.
        """
        try:
            # crawl the content from the crawler using the crawler service API
            response = requests.post(f"http://{CRAWLER_HOST}:8001/api/crawl", json={"url": data['url']}, timeout=60)
            self.result = response.json()
            self.status = response.status_code
            self.html_content = self.result.get('html', None)
            converter = html2text.HTML2Text()
            self.markdown_content = converter.handle(self.html_content)
        except Exception as e:
            self.status = 503
            self.result = {"error": str(e)}
            self.html_content = None
            self.markdown_content = None
        
        url = data['url']
        domain = urlparse(url).netloc
        company_name = domain.split('.')[0]
        self.company_name = company_name

    # check if the website content has changed
    def check_content_changed(self, url, existing_policy):
        """
        Check if the website content has changed.
        """
        # crawl the current website content (only crawl, not save)
        current_data = {'url': url}
        try:
            response = requests.post(f"http://{CRAWLER_HOST}:8001/api/crawl", json=current_data, timeout=60)
            result = response.json()
            status = response.status_code
        except Exception as e:
            status = 503
            result = {"error": str(e)}
        
        if status != 200 or 'html' not in result:
            # crawl failed, cannot compare, assume content has changed
            print(f"Failed to fetch current content for comparison: {url}")
            return True
            
        # calculate hash value of current content
        current_html = result.get('html', '')
        current_hash = hashlib.md5(current_html.encode('utf-8')).hexdigest()

        stored_html = existing_policy.get("html_content", "")
        stored_hash = hashlib.md5(stored_html.encode('utf-8')).hexdigest()
        
        # compare hash value
        is_changed = current_hash != stored_hash
        print(f"Content check for {url}: {'Changed' if is_changed else 'Unchanged'}")
        return is_changed

    def split(self):
        """
        Split the content into sections.
        """
        self.sections = call_split.extract_webpage_content(self.html_content)

    def analyse_global(self):
        """
        Analyse the global content.
        """
        global_processing = call_classification.classify_privacy_global
        result = global_processing(self.company_name, self.html_content, self.markdown_content)
        output = ' '
        if 'error' in result:
            output = {'error': result['error']}
        elif 'classification_content' in result:
            output = result['classification_content']
        self.result_queue.put(output)

    def analyse_sections(self):
        """
        Analyse the sections.
        """
        # Fallback: if section is too short, use entire markdown
        if len(self.sections['Collect']) < 50:
            self.sections['Collect'] = self.markdown_content
        if len(self.sections['Use']) < 50:
            self.sections['Use'] = self.markdown_content
        if len(self.sections['Share']) < 50:
            self.sections['Share'] = self.markdown_content

        # Threaded execution of the 3 section analyses
        with ThreadPoolExecutor(max_workers=3) as executor:
            future_to_section = {
                executor.submit(info_collection, self.sections['Collect']): 'Collect',
                executor.submit(info_use, self.sections['Use']): 'Use',
                executor.submit(info_share, self.sections['Share']): 'Share',
            }

            results = {}

            # Wait up to 90s total for all futures
            try:
                for future in as_completed(future_to_section, timeout=90):
                    section = future_to_section[future]
                    try:
                        result = future.result(timeout=40)  # each section has max 40s to run
                        results.update(result)
                    except TimeoutError:
                        print(f"[TIMEOUT] {section} section took too long (>40s)")
                        results[section] = [f"Error: Timeout in {section} section"]
                    except Exception as e:
                        print(f"[ERROR] Exception in {section} section: {e}")
                        results[section] = [f"Error: {str(e)}"]
            except TimeoutError:
                print("[FATAL TIMEOUT] Overall section analysis exceeded 90 seconds.")
                for future, section in future_to_section.items():
                    if section not in results:
                        results[section] = [f"Error: Global timeout before {section} completed"]

        return results
     
    

    def schedule(self, data):
        """
        Schedule the calling of the functions in processing a request.
        """
        # connect to the redis
        client = None
        redis_client = connect_to_redis()
        if redis_client == None:
            return {'error': 'Redis connection failed!'}, 503
        
        # check if the url is provided
        if 'url' in data:
            url = data['url']

            try:
                # check if the result is in redis
                if check_result_in_redis_or_not(redis_client, url):
                    result = read_result_from_redis(redis_client, url)
                    close_redis_connection(redis_client)
                    print(f"successfully get data from Redis: {url}")
                    return json.loads(result), 200
                
                print(f"Redis does not have data for {url}, getting data from MongoDB")
                
                # connect to the mongodb
                client, db, privacy_data = connect_to_mongodb()
                if client == None:
                    return {'error': 'Database connection failed!'}, 503

                # check if the url is already in the database
                existing_policy = get_policy_by_url(url, privacy_data)
                if existing_policy:

                    policy_id = existing_policy["policy_id"] if "policy_id" in existing_policy else existing_policy["_id"]

                    # if the time interval is less than the refresh interval, return the existing result
                    time_elapsed = check_db_update(existing_policy, REFRESH_INTERVAL)
                    if time_elapsed:
                        print(f"Content is recent (updated {time_elapsed.days} days ago), using cached version")

                        existing_summary = get_summary(policy_id, privacy_data)
                        if existing_summary and "summary_content" in existing_summary:
                            result = {
                                'summary': existing_summary["summary_content"],
                                'policy_id': str(policy_id)
                            }
                            write_result_to_redis(redis_client, url, json.dumps(result))
                            close_redis_connection(redis_client)
                            close_mongodb_connection(client)
                            return result, 200

                    # if the time interval greater than refresh interval, check if content has changed
                    print(f"Content may be outdated, checking for changes")

                    if not self.check_content_changed(url, existing_policy):
                        # no change, update last checked time
                        print(f"Content unchanged, updating last checked time")

                        existing_summary = get_summary(policy_id, privacy_data)
                        if existing_summary and "summary_content" in existing_summary:
                            result = {
                                'summary': existing_summary["summary_content"],
                                'policy_id': str(policy_id)
                            }
                            write_result_to_redis(redis_client, url, json.dumps(result))
                            close_redis_connection(redis_client)
                            close_mongodb_connection(client)
                            return result, 200

                    # changed, continue and re-crawl
                    print(f"Content changed, re-crawling and updating")

                # if the url or summary does not exist, the content is outdated or the content has changed, crawl new content
                self.crawler(data)

                # check if the content is valid
                if self.status != 200 or len(self.html_content)<0.5*len(data.get('text', ' ')):
                    # if the content is not valid, get the content from the frontend
                    if "text" in data:
                        print(self.status)
                        print("data from frontend")
                        if self.html_content==None:
                            print("no content from crawler")
                        else:
                            print(f"length of crawler content{len(self.html_content)} length of front end content {len(data.get('text', ' '))}")
                        self.get_content(data)
                    else:
                        close_redis_connection(redis_client)
                        close_mongodb_connection(client)
                        return {"error": "Unable to get the content"}, self.status if self.status!=200 else 503

            except Exception as e:
                print(f"Error during freshness check: {str(e)}")
                close_redis_connection(redis_client)
                if client!=None:
                    close_mongodb_connection(client)
                return {"error": "Error during freshness check!"}, 503

        else:
            close_redis_connection(redis_client)
            return {"error": "Not valid request!"}, 400

        # schedule the calling of the functions in processing a request
        with ThreadPoolExecutor(max_workers=2) as executor:
            global_future = executor.submit(self.analyse_global)
            self.split()
            merged = self.analyse_sections()  # runs in main thread

            try:
                global_future.result(timeout=90)  # wait for global analysis to complete
            except TimeoutError:
                print("[TIMEOUT] Global analysis thread took too long.")
            except Exception as e:
                print(f"[ERROR] Global analysis thread failed: {e}")

        # get the result from the result queue
        merged.update(self.result_queue.get())

        # check if the result is valid
        for key in merged.keys():
            if not isinstance(merged[key], list):
                close_mongodb_connection(client)
                close_redis_connection(redis_client)
                return {'error': merged[key]}, 503
        
        # convert the result to json
        summary_json = json.dumps(merged, indent=4)
        self.result = {'summary': summary_json}
        self.status = 200

        # save data to MongoDB
        if 'url' in data:
            try:
                print(f"====== database storage debug information ======")
                print(f"prepare to save to database: URL={data['url']}")
                print(f"HTML content length: {len(self.html_content) if self.html_content else 0}")
                print(f"Markdown content length: {len(self.markdown_content) if self.markdown_content else 0}")
                print(f"current environment variables: MONGODB_HOST={os.getenv('MONGODB_HOST', 'localhost')}, MONGODB_DB={os.getenv('MONGODB_DB', 'CS307')}")

                # save the data to the database
                policy_id = save_policy(
                    url=data['url'],
                    html_content=self.html_content,
                    markdown_content=self.markdown_content,
                    summary_content=summary_json,
                    privacy_data=privacy_data
                )
                print(f"save policy and summary result: {policy_id}")

                if policy_id:
                    # set policy_id and add to the result
                    self.result['policy_id'] = str(policy_id)
                    print(f"successfully save data to MongoDB: policy_id={policy_id}")
                    try:
                        # save the result to redis which will last for 1 hour
                        write_result_to_redis(redis_client, url, json.dumps(self.result))
                        print(f"successfully save data to Redis: {url}")
                    except Exception as e:
                        print(f"Redis save error: {e}")
                else:
                    print("save policy failed, no valid id returned")
            except Exception as e:
                print(f"database save error: {e}")

        close_mongodb_connection(client)
        close_redis_connection(redis_client)
        return self.result, self.status
