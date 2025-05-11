from services.crawler import call_crawler
from services.split import call_split
from services.classification import call_classification
import queue
import threading
from urllib.parse import urlparse
import html2text
import asyncio
import json
from ..section_analysis.what_to_collect import info_collection
from ..section_analysis.how_to_use import info_use
from ..section_analysis.who_to_share import info_share
<<<<<<< Updated upstream
=======
from models.mongodb_ec2 import (
    connect_to_mongodb,
    close_mongodb_connection,
    get_policy_by_url,
    save_policy,
    save_summary,
    get_summary,
    update_last_checked_time
)

from bson import ObjectId

# set refresh interval, default is 7 days
REFRESH_INTERVAL = datetime.timedelta(days=7)
>>>>>>> Stashed changes


class Scheduling:
    def __init__(self):
        self.html_content = None
        self.markdown_content = None
        self.sections = {'Collect': None, 'Use': None, 'Share': None}
        self.result = None
        self.status = None
        self.company_name = None
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
        self.result = {'summary': json.dumps(merged, indent=4)}
        self.status = 200
        #global_thread.join()
        #self.result = {'summary': {'global_result': self.result_queue.get(),
        #               'section_result': None}}

        return self.result, self.status
