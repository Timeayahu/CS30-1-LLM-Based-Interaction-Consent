import os
from urllib.parse import urlparse
from services.crawler import CrawlerService

class PrivacyFileService:
    def __init__(self):
        self.crawler_service = CrawlerService()
        self.privacy_data_dir = os.path.join("data", "privacy_policies")
        self.ensure_dir_exists()

    def ensure_dir_exists(self):
        """确保目录存在，如不存在则创建"""
        if not os.path.exists(self.privacy_data_dir):
            os.makedirs(self.privacy_data_dir)

    def get_privacy_folder_path(self, url=None):
        """获取隐私政策文件夹路径和文件名"""
        if url:
            # 如果提供了URL，先检查是否已有对应的文件
            domain = urlparse(url).netloc
            company_name = domain.split('.')[0]
            potential_file = os.path.join(self.privacy_data_dir, f"{company_name}.txt")
            filename = f"{company_name}.txt"
            
            # 如果文件已存在，返回文件夹路径
            if os.path.exists(potential_file):
                return {
                    'success': True,
                    'folder_path': self.privacy_data_dir,
                    'filename': filename
                }
            
            # 如果文件不存在，爬取内容
            result = self.crawler_service.crawl_privacy_policy(url)
            if result['success']:
                return {
                    'success': True,
                    'folder_path': self.privacy_data_dir,
                    'filename': filename
                }   
        
        return {
            'success': False,
            'error': 'Failed to get privacy policy file path'
        }