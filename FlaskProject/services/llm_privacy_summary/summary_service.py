import os
from urllib.parse import urlparse
from typing import Dict, Union
from utils.text_processor import TextProcessor
from services.llm_privacy_summary.llm_summary_service import SummaryService


class SummaryPrivacyService:
    def __init__(self):
        self.llm_summary_service = SummaryService()
        self.text_processor = TextProcessor()
        self.summary_folder = "data/summary_result"

        # 确保输出目录存在
        os.makedirs(self.summary_folder, exist_ok=True)

    def generate_summary_content(
            self,
            url: str,
            html_content: str,
            markdown_content: str
    ) -> Dict[str, Union[bool, str, dict]]:
        """
        生成隐私政策摘要内容

        参数:
            url: 政策来源URL
            html_content: HTML格式内容
            markdown_content: Markdown格式内容

        返回:
            {
                'success': bool,
                'data': dict | None,
                'error': str | None
            }
        """
        # 验证输入内容
        if not self._validate_input(html_content, markdown_content):
            return {
                'success': False,
                'data': None,
                'error': 'Invalid input content'
            }
        print(1)

        try:
            company_name = self._extract_company_name(url)
            file_path = self._get_output_filepath(company_name)
            print(2)
            # 如果已有缓存文件，直接返回
            if os.path.exists(file_path):
                return self._load_cached_result(file_path)
            print(3)
            # 生成新摘要
            return self._generate_new_summary(
                company_name,
                html_content,
                markdown_content,
                file_path
            )
        except Exception as e:
            return {
                'success': False,
                'data': None,
                'error': f"Summary generation failed: {str(e)}"
            }

    def _validate_input(self, html: str, markdown: str) -> bool:
        return bool(html and markdown)

    def _extract_company_name(self, url: str) -> str:
        domain = urlparse(url).netloc
        return domain.split('.')[0]

    def _get_output_filepath(self, company_name: str) -> str:
        filename = f"{company_name}_summary_result.json"
        return os.path.join(self.summary_folder, filename)

    def _load_cached_result(self, file_path: str) -> Dict:
        try:
            data = self.text_processor.load_text_file(
                os.path.dirname(file_path),
                os.path.basename(file_path)
            )
            return {
                'success': True,
                'data': data,
                'error': None
            }
        except Exception as e:
            return {
                'success': False,
                'data': None,
                'error': f"Failed to load cached file: {str(e)}"
            }

    def _generate_new_summary(
            self,
            company_name: str,
            html: str,
            markdown: str,
            output_path: str
    ) -> Dict:
        content_dict = {company_name: markdown}
        result = self.llm_summary_service.summary_privacy_policy(
            content_dict,
            "Markdown"
        )

        if not result.get('success') or "error" in result.get('data', {}):
            content_dict = {company_name: html}
            result = self.llm_summary_service.summary_privacy_policy(
                content_dict,
                "HTML"
            )

        return {
            'success': result.get('success', False),
            'data': result.get('data'),
            'error': result.get('error')
        }