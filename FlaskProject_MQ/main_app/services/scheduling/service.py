from urllib.parse import urlparse

from routes.privacy_routes import classification_privacy_service
from services.crawler import call_crawler
from services.split import call_split
import queue
import threading
import json
from services.classification import call_classification

from utils.messageQueue import RabbitMQManager


#from flask import jsonify


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

        # Crawler Message Queue
        self.rabbitmq = RabbitMQManager()
        self.crawler_exchange_name = "crawler_exchange_name"

        self.crawler_queue_name = "crawler_queue"
        self.crawler_routing_key = "crawler_routing_key"

        self.crawler_result_queue = "result_queue"
        self.crawler_result_routing_key = "result_routing_key"

        self.rabbitmq.declare_queue(self.crawler_exchange_name, self.crawler_queue_name, self.crawler_routing_key)
        self.rabbitmq.declare_queue(self.crawler_exchange_name, self.crawler_queue_name, self.crawler_result_routing_key)

    def send_crawler_task(self, data):
        task = {"url": data, "action": "crawl"}
        self.rabbitmq.send_message(self.crawler_exchange_name, self.crawler_queue_name, self.crawler_routing_key, task)

    def wait_for_result(self):
        event = threading.Event()

        def callback(ch, method, properties, body):
            try:
                body_str = body.decode('utf-8')
                result = json.loads(body_str)
                print(f" [x] Receive results: {result}")

                self.result = result

                url = result['url']
                domain = urlparse(url).netloc
                company_name = domain.split('.')[0]
                self.company_name = company_name
                self.html_content = result.get('html', None)
                self.markdown_content = result.get('markdown', None)
                self.status = result.get('status', None)

            except Exception as e:
                print(f"Got wrong in processing results: {e}")
            finally:
                ch.basic_ack(delivery_tag=method.delivery_tag)
                event.set()
                if not ch.is_closed:
                    ch.stop_consuming()

        consume_thread = threading.Thread(
            target=self.rabbitmq.consume_messages,
            args=(self.crawler_result_queue, callback),
            daemon=True
        )
        consume_thread.start()
        event.wait()

        if consume_thread.is_alive():
            print("Warning: Consumer thread stopped accidentally, forcing close the connection.")

    #
    # def crawler(self, data):
    #     result, status = call_crawler.crawl_privacy_policy(data)
    #     self.result = result
    #     self.status = status
    #     self.html_content = result.get('html', None)
    #     self.markdown_content = result.get('markdown', None)
    #     url = data['url']
    #     domain = urlparse(url).netloc
    #     company_name = domain.split('.')[0]
    #     self.company_name = company_name

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
        self.wait_for_result()
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
