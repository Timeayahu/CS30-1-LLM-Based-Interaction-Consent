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
from ..section_analysis.what_to_collect import info_collection
from ..section_analysis.how_to_use import info_use
from ..section_analysis.who_to_share import info_share
from models.mongodb_local import (
    get_policy_by_url,
    save_policy,
    save_summary,
    get_summary
)
from bson import ObjectId


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

                #Todo: still need to check whether the content has been updated by the website
                #If updated, get the latest one
                #If not, return result
                existing_policy = get_policy_by_url(url)
                if existing_policy:
                    
                    policy_id = existing_policy["_id"]
                    existing_summary = get_summary(policy_id)
                    
                    if existing_summary and "summary_content" in existing_summary:
                        # if the summary exists, return the result
                        self.policy_id = policy_id
                        return {
                            'summary': existing_summary["summary_content"],
                            'policy_id': str(policy_id)
                        }, 200
            except Exception as e:
                
                print(f"database query error: {e}")
           
            
            # if the url is not in the database or the summary does not exist, call the crawler to get the content
            self.crawler(data)
            if self.status != 200:
                self.result['error_type'] = 'crawler'
                return self.result, self.status
        elif 'text' in data:
            self.get_content(data)
        else:
            return {"error": "Not valid request!"}
        #global_thread = threading.Thread(target=self.analyse_global)
        #global_thread.start()
        self.split()
        result = asyncio.run(self.analyse_sections())
        merged = dict()
        for d in result:
            merged.update(d)
            
        summary_json = json.dumps(merged, indent=4)
        self.result = {'summary': summary_json}
        self.status = 200
        #global_thread.join()
        #self.result = {'summary': {'global_result': self.result_queue.get(),
        #               'section_result': None}}
        
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
