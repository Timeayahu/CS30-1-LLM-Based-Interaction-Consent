from services.crawler import call_crawler
from services.split import call_split
import queue
import threading
#from flask import jsonify
from routes.privacy_routes import classification_privacy_service


class Scheduling:
    def __init__(self):
        self.html_content = None
        self.markdown_content = None
        self.sections = {'Collect': None, 'Use': None, 'Share': None}
        self.methods = {'Collect': None, 'Use': None, 'Share': None}
        self.result = None
        self.status = None
        self.result_queue = queue.Queue()
    
    def crawler(self, data):
        result, status = call_crawler.crawl_privacy_policy(data)
        self.result = result
        self.status = status
        self.html_content = result.get('html', None)
        self.markdown_content = result.get('markdown', None)

    def split(self):
        self.sections = call_split.extract_webpage_content(self.html_content)

    def analyse_global(self, data):
        # Replace your real function here
        self.crawler(data)

        url = self.result.get('url', None)
        html_content = self.html_content
        markdown_content = self.markdown_content

        classification_result = classification_privacy_service.generate_classification_content(url, html_content, markdown_content)
        self.result_queue.put(classification_result)


    def analyse_sections(self):
        pass

    def schedule(self):
        if self.status != 200:
            self.result['error_type'] = 'crawler'
            return self.result, self.status
        global_thread = threading.Thread(target=self.analyse_global)
        global_thread.start()
        #self.split()
        #self.analyse_()
        global_thread.join()
        self.result = {'global_result': self.result_queue.get(),
                       'section_result': None}

        return self.result, self.status
