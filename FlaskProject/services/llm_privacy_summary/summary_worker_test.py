import json
from redis_client import redis_client as r
from summary_service import SummaryPrivacyService

queue_name = 'privacy_queue'
result_queue_name = 'summary_result_queue'

summary_service = SummaryPrivacyService()

print("Summary Worker Starts，Waiting for Queue...")

while True:
    task_data = r.blpop(queue_name, timeout=0)
    if task_data:
        _, task_json = task_data
        task = json.loads(task_json)

        #print(f"Receive ：{task['company']} Privacy Policy，Start to Summary...")
        print(f"Receive Privacy Policy，Start to Summary...")

        result = summary_service.generate_summary_content(
            url=task['url'],
            html_content=task['html'],
            markdown_content=task['markdown']
        )

        if result['success']:
            summary_content = result['summary_content']
            r.rpush(result_queue_name, json.dumps({
                "company": task['company'],
                "summary": summary_content
            }, ensure_ascii=False))
            print(f"Summary is sended to Redis Queue: {result_queue_name} successfully")
        else:
            print(f"Error: {result['error']}")
