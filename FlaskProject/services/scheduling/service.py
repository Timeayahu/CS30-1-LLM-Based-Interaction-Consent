from services.crawler import call_crawler
from services.split import call_split
from services.classification import call_classification
import queue
import threading
from urllib.parse import urlparse



class Scheduling:
    def __init__(self):
        self.html_content = None
        self.markdown_content = None
        self.sections = {'Collect': None, 'Use': None, 'Share': None}
        self.methods = {'Collect': None, 'Use': None, 'Share': None}
        self.result = None
        self.status = None
        self.company_name = None
        self.result_queue = queue.Queue()
    
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
        self.result = {'summary': {'global_result': self.result_queue.get(),
                       'section_result': None}}

        return self.result, self.status
