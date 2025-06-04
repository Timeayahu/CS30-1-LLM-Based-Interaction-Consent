import os
import sys
import argparse
import logging
from dotenv import load_dotenv

# Add project root directory to path for importing related modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.mongodb_local import privacy_data, get_policy_by_id, get_policy_by_url
from services.crawler.text_processor import text_processor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def process_single_policy(policy_id):
    """Process a single policy document"""
    logger.info(f"Starting to process policy: {policy_id}")
    
    # Get policy data
    policy = get_policy_by_id(policy_id)
    if not policy:
        logger.error(f"Policy not found: {policy_id}")
        return False
    
    # Get HTML content
    html_content = policy.get("html_content") or policy.get("content")
    if not html_content:
        logger.error(f"Policy has no HTML content: {policy_id}")
        return False
    
    # Process policy text
    logger.info(f"Starting to clean and chunk policy text: {policy_id}")
    success = text_processor.process_html_to_chunks(policy_id, html_content)
    
    if success:
        logger.info(f"Successfully processed policy: {policy_id}")
    else:
        logger.error(f"Failed to process policy: {policy_id}")
    
    return success

def process_all_policies():
    """Process all policy documents in the database"""
    logger.info("Starting to process all policies")
    
    # Get all policies
    policies = privacy_data.find({})
    total = privacy_data.count_documents({})
    processed = 0
    success = 0
    
    logger.info(f"Found {total} policy documents in total")
    
    for policy in policies:
        policy_id = policy.get("_id")
        if not policy_id:
            continue
            
        processed += 1
        if process_single_policy(policy_id):
            success += 1
            
        # Print progress
        if processed % 10 == 0 or processed == total:
            logger.info(f"Progress: {processed}/{total} ({(processed/total*100):.1f}%), Success: {success}")
    
    logger.info(f"Processing completed. Total: {total}, Processed: {processed}, Success: {success}")
    return success

def process_by_url(url):
    """Process policy by URL"""
    logger.info(f"Processing policy by URL: {url}")
    
    # Find policy
    policy = get_policy_by_url(url)
    if not policy:
        logger.error(f"Policy not found for URL: {url}")
        return False
    
    policy_id = policy.get("policy_id") or policy.get("_id")
    return process_single_policy(policy_id)

def main():
    """Main function to handle command line arguments"""
    parser = argparse.ArgumentParser(description="Process privacy policy documents to generate text chunks and vector embeddings")
    
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("-a", "--all", action="store_true", help="Process all policies")
    group.add_argument("-i", "--id", help="Process a single policy by ID")
    group.add_argument("-u", "--url", help="Process policy by URL")
    
    args = parser.parse_args()
    
    # Load environment variables
    load_dotenv()
    
    # Check OpenAI API key
    if not os.environ.get("OPENAI_API_KEY"):
        logger.error("OPENAI_API_KEY environment variable not set")
        return 1
    
    # Execute corresponding operation based on arguments
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