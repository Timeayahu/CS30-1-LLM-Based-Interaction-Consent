import json
from utils.messageQueue import RabbitMQManager
from call_crawler import crawl_privacy_policy
def start_crawler_worker():
    rabbitmq = RabbitMQManager()
    crawler_exchange_name = "crawler_exchange_name"

    crawler_queue_name = "crawler_queue"
    crawler_routing_key = "crawler_routing_key"

    result_queue = "result_queue"
    result_routing_key = "result_routing_key"

    rabbitmq.declare_queue(crawler_exchange_name, crawler_queue_name, crawler_routing_key)
    rabbitmq.declare_queue(crawler_exchange_name, result_queue, result_routing_key)

    processed_count = 0
    max_processing = 3

    def process_task(ch, method, properties, body):
        nonlocal processed_count
        try:
            task = json.loads(body)
            if task.get("type") == "result":
                print(" [!] Received result message by mistake, ignoring...")
                return

            print(f" [x] Processing: {task['url']}")

            result, status = crawl_privacy_policy(task["url"])
            html = result.get("html")
            markdown = result.get("markdown")

            response = {"type": "result", "url": task["url"]["url"], "html": html, "markdown": markdown, "status": status}
            rabbitmq.send_message(crawler_exchange_name, result_queue, result_routing_key, response)

            if html or markdown:
                print(" [x] Result found, reset counter. Waiting for next task...")
                processed_count = 0
            else:
                processed_count += 1
                print(f" [x] Processed {processed_count}/{max_processing} tasks")
                if processed_count >= max_processing:
                    processed_count = 0
                    print(" [x] Max tasks reached, waiting...")

        except Exception as e:
            print(f" [!] Error processing task: {e}")
        finally:
            ch.basic_ack(delivery_tag=method.delivery_tag)


    rabbitmq.channel.basic_qos(prefetch_count=1)
    rabbitmq.consume_messages(crawler_queue_name, process_task)


if __name__ == "__main__":
    start_crawler_worker()