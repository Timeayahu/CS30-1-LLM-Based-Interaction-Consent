import os
import sys
import argparse
import logging
from dotenv import load_dotenv

# 添加项目根目录到路径，以便导入相关模块
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.mongodb_local import privacy_data, get_policy_by_id, get_policy_by_url
from services.crawler.text_processor import text_processor

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def process_single_policy(policy_id):
    """处理单个政策文档"""
    logger.info(f"开始处理政策: {policy_id}")
    
    # 获取政策数据
    policy = get_policy_by_id(policy_id)
    if not policy:
        logger.error(f"找不到政策: {policy_id}")
        return False
    
    # 获取HTML内容
    html_content = policy.get("html_content") or policy.get("content")
    if not html_content:
        logger.error(f"政策没有HTML内容: {policy_id}")
        return False
    
    # 处理政策文本
    logger.info(f"开始清洗并分块政策文本: {policy_id}")
    success = text_processor.process_html_to_chunks(policy_id, html_content)
    
    if success:
        logger.info(f"成功处理政策: {policy_id}")
    else:
        logger.error(f"处理政策失败: {policy_id}")
    
    return success

def process_all_policies():
    """处理数据库中的所有政策文档"""
    logger.info("开始处理所有政策")
    
    # 获取所有政策
    policies = privacy_data.find({})
    total = privacy_data.count_documents({})
    processed = 0
    success = 0
    
    logger.info(f"共找到 {total} 个政策文档")
    
    for policy in policies:
        policy_id = policy.get("_id")
        if not policy_id:
            continue
            
        processed += 1
        if process_single_policy(policy_id):
            success += 1
            
        # 打印进度
        if processed % 10 == 0 or processed == total:
            logger.info(f"进度: {processed}/{total} ({(processed/total*100):.1f}%), 成功: {success}")
    
    logger.info(f"处理完成。总计: {total}, 处理: {processed}, 成功: {success}")
    return success

def process_by_url(url):
    """通过URL处理政策"""
    logger.info(f"通过URL处理政策: {url}")
    
    # 查找政策
    policy = get_policy_by_url(url)
    if not policy:
        logger.error(f"找不到URL对应的政策: {url}")
        return False
    
    policy_id = policy.get("policy_id") or policy.get("_id")
    return process_single_policy(policy_id)

def main():
    """主函数，处理命令行参数"""
    parser = argparse.ArgumentParser(description="处理隐私政策文档，生成文本块和向量嵌入")
    
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("-a", "--all", action="store_true", help="处理所有政策")
    group.add_argument("-i", "--id", help="通过ID处理单个政策")
    group.add_argument("-u", "--url", help="通过URL处理政策")
    
    args = parser.parse_args()
    
    # 加载环境变量
    load_dotenv()
    
    # 检查OpenAI API密钥
    if not os.environ.get("OPENAI_API_KEY"):
        logger.error("未设置OPENAI_API_KEY环境变量")
        return 1
    
    # 根据参数执行相应操作
    if args.all:
        success = process_all_policies()
        return 0 if success > 0 else 1
    elif args.id:
        success = process_single_policy(args.id)
        return 0 if success else 1
    elif args.url:
        success = process_by_url(args.url)
        return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main()) 