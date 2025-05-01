from services.crawler import call_crawler
from services.split import call_split
from services.classification import call_classification
import queue
import threading
from urllib.parse import urlparse
import html2text
import asyncio
import json
import os  
import hashlib
import datetime
from ..section_analysis.what_to_collect import info_collection
from ..section_analysis.how_to_use import info_use
from ..section_analysis.who_to_share import info_share
from models.mongodb_local import (
    get_policy_by_url,
    save_policy,
    save_summary,
    get_summary,
    update_last_checked_time
)
from bson import ObjectId


# set refresh interval, default is 7 days
REFRESH_INTERVAL = datetime.timedelta(days=7)


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
        self.html_content = data.get('text', None)
        converter = html2text.HTML2Text()
        self.markdown_content = converter.handle(self.html_content)

    def crawler(self, data):
        result, status = call_crawler.crawl_privacy_policy(data)
        self.result = result
        self.status = status
        self.html_content = result.get('html', None)
        self.markdown_content = result.get('markdown', None)
        url = data['url']
        domain = urlparse(url).netloc
        company_name = domain.split('.')[0]
        self.company_name = company_name

    # check if the website content has changed
    def check_content_changed(self, url, stored_content_hash):
        # crawl the current website content (only crawl, not save)
        current_data = {'url': url}
        result, status = call_crawler.crawl_privacy_policy(current_data)
        
        if status != 200 or 'html' not in result:
            # crawl failed, cannot compare, assume content has changed
            print(f"Failed to fetch current content for comparison: {url}")
            return True
            
        # calculate hash value of current content
        current_html = result.get('html', '')
        current_hash = hashlib.md5(current_html.encode('utf-8')).hexdigest()
        
        # compare hash value
        is_changed = current_hash != stored_content_hash
        print(f"Content check for {url}: {'Changed' if is_changed else 'Unchanged'}")
        return is_changed

    def split(self):
        self.sections = call_split.extract_webpage_content(self.html_content)

    def analyse_global(self):
        # Replace your real function here
        global_processing = call_classification.classify_privacy_global
        result = global_processing(self.company_name, self.html_content, self.markdown_content)
        output = ' '
        if 'error' in result:
            output = result['error']
        elif 'classification_content' in result:
            output = result['classification_content']
        self.result_queue.put(output)

    async def analyse_sections(self):
        results = await asyncio.gather(
        info_collection(self.sections['Collect']),
        info_use(self.sections['Use']),
        info_share(self.sections['Share'])
        )
        return results

    def schedule(self, data):
        if 'url' in data:
            url = data['url']
            
            try:
                # check if the url is already in the database
                existing_policy = get_policy_by_url(url)
                if existing_policy:
                    
                    policy_id = existing_policy["policy_id"] if "policy_id" in existing_policy else existing_policy["_id"]
                    
                    # check time interval
                    current_time = datetime.datetime.now()
                    last_update_time = existing_policy.get("updated_at") or existing_policy.get("created_at")
                    
                    # calculate time interval
                    time_elapsed = current_time - last_update_time
                    
                    # if the time interval is less than the refresh interval, return the existing result
                    if time_elapsed < REFRESH_INTERVAL:
                        print(f"Content is recent (updated {time_elapsed.days} days ago), using cached version")
                        
                        existing_summary = get_summary(policy_id)
                        if existing_summary and "summary_content" in existing_summary:
                            self.policy_id = policy_id
                            return {
                                'summary': existing_summary["summary_content"],
                                'policy_id': str(policy_id)
                            }, 200
                    
                    # if the time interval greater than refresh interval, check if content has changed
                    print(f"Content may be outdated (updated {time_elapsed.days} days ago), checking for changes")
                    
                    # calculate hash
                    stored_html = existing_policy.get("html_content", "")
                    stored_hash = hashlib.md5(stored_html.encode('utf-8')).hexdigest()
                    
                    # check whether content has change
                    if not self.check_content_changed(url, stored_hash):
                        # no change, update last checked time
                        print(f"Content unchanged, updating last checked time")
                        update_last_checked_time(policy_id)
                        
                        existing_summary = get_summary(policy_id)
                        if existing_summary and "summary_content" in existing_summary:
                            self.policy_id = policy_id
                            return {
                                'summary': existing_summary["summary_content"],
                                'policy_id': str(policy_id)
                            }, 200
                    
                    # changed, continue and re-crawl
                    print(f"Content changed, re-crawling and updating")
                    
            except Exception as e:
                print(f"Error during freshness check: {str(e)}")
           
            
            # if the url or summary does not exist, the content is outdated or the content has changed, crawl new content
            self.crawler(data)
            if self.status != 200:
                self.result['error_type'] = 'crawler'
                return self.result, self.status
        elif 'text' in data:
            self.get_content(data)
        else:
            return {"error": "Not valid request!"}
            
        self.split()
        result = asyncio.run(self.analyse_sections())
        merged = dict()
        for d in result:
            merged.update(d)
            
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
                
                policy_id = save_policy(
                    url=data['url'],
                    html_content=self.html_content,
                    markdown_content=self.markdown_content,
                    summary_content=summary_json
                )
                print(f"save policy and summary result: {policy_id}")
                
                if policy_id:
                    # set policy_id and add to the result
                    self.policy_id = policy_id
                    self.result['policy_id'] = str(policy_id)
                    print(f"successfully save data to MongoDB: policy_id={policy_id}")
                else:
                    print("save policy failed, no valid id returned")
            except Exception as e:
                
                print(f"database save error: {e}")
                

        return self.result, self.status
