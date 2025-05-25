import pika
import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

class RabbitMQManager:
    def __init__(self):
        self.connection = pika.BlockingConnection(
            pika.ConnectionParameters(
                host='127.0.0.1',
                virtual_host='/',
                port=5675,
                credentials=pika.PlainCredentials('guest', 'guest')))
        self.channel = self.connection.channel()

    def declare_queue(self, exchange_name, queue_name, routing_key):
        """declare queue (create if not exists)"""
        self.channel.exchange_declare(exchange=exchange_name, exchange_type='direct')
        self.channel.queue_declare(queue=queue_name)
        self.channel.queue_bind(exchange=exchange_name, queue=queue_name, routing_key=routing_key)

    def send_message(self, exchange_name, queue_name, routing_key, message):
        self.channel.queue_declare(queue=queue_name)
        """send message to specified queue"""
        self.channel.basic_publish(
            exchange=exchange_name,
            routing_key=routing_key,
            body=json.dumps(message))
        print(f" [x] Sent to {exchange_name}, routing_key: {routing_key}, message: {message}")

    def ensure_channel_open(self):
        if not self.channel or self.channel.is_closed:
            self.channel = self.connection.channel()

    def consume_messages(self, queue_name, callback):
        self.ensure_channel_open()
        self.channel.queue_declare(queue=queue_name)
        self.channel.basic_consume(
            queue=queue_name,
            on_message_callback=callback,
            auto_ack=False)
        print(f" [*] Waiting for messages in {queue_name}. To exit press CTRL+C")
        self.channel.start_consuming()

    def close(self):
        """close connection"""
        self.connection.close()