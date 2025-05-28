import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By  # 添加By导入，用于find_element
from webdriver_manager.chrome import ChromeDriverManager
import time
import html2text
import os
import platform

class WebCrawler:
    def __init__(self, base_url):
        self.base_url = base_url
        self.session = requests.Session()
    
    def crawl(self, path=""):
        """爬取指定页面的内容"""
        url = f"{self.base_url}/{path}"
        response = self.session.get(url)
        return response.text
    
    def parse(self, html_content):
        """解析HTML内容"""
        soup = BeautifulSoup(html_content, 'html.parser')
        # 简单解析返回标题
        title = soup.title.string if soup.title else "No title found"
        return {"title": title}
    
    def selenium_crawl(self, url=None, wait_time=5, save_path=None):
        """使用Selenium获取JavaScript渲染的页面内容
        
        Args:
            url: 要爬取的URL，如果为None则使用base_url
            wait_time: 等待JavaScript加载的时间(秒)
            save_path: 保存内容的路径，如果提供则保存结果
            
        Returns:
            dict: 包含HTML内容和Markdown文本的字典
        """
        target_url = url if url else self.base_url
        
        # 设置Chrome的无头模式
        chrome_options = Options()
        chrome_options.add_argument("--headless=new")  # 使用新的无头模式
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920x1080")

        # 绕过Selenium检测
        chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option("useAutomationExtension", False)

        # 添加User-Agent伪装成普通浏览器
        chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36")

        # 禁用HTTP/2以避免错误
        chrome_options.add_argument("--disable-http2")
        chrome_options.add_argument("--disable-features=NetworkService,NetworkServiceInProcess")
        
        try:
            # 根据不同环境初始化WebDriver
            if platform.system() == "Linux" and os.path.exists("/usr/bin/chromedriver"):  # Docker/Linux环境
                # 直接使用Dockerfile中安装的ChromeDriver
                service = Service("/usr/bin/chromedriver")
                driver = webdriver.Chrome(service=service, options=chrome_options)
            else:  # Windows或其他环境，使用webdriver_manager自动管理
                try:
                    # 尝试使用webdriver_manager自动下载和管理ChromeDriver
                    service = Service(ChromeDriverManager().install())
                    driver = webdriver.Chrome(service=service, options=chrome_options)
                except Exception as e:
                    print(f"使用ChromeDriverManager失败: {e}")
                    # 如果失败，尝试直接初始化（依赖系统中已有ChromeDriver）
                    driver = webdriver.Chrome(options=chrome_options)
                
            # 访问目标页面
            driver.get(target_url)
            
            # 等待JavaScript加载
            time.sleep(wait_time)
            
            # 获取<body>标签内的HTML代码
            body_html = driver.find_element(By.TAG_NAME, "body").get_attribute("outerHTML")
            
            # 将HTML转换为Markdown纯文本
            converter = html2text.HTML2Text()
            readable_text = converter.handle(body_html)
            
            # 如果提供了保存路径，则保存内容
            if save_path:
                if isinstance(save_path, dict):
                    # 分别保存HTML和文本
                    if 'html' in save_path:
                        with open(save_path['html'], "w", encoding="utf-8") as f:
                            f.write(body_html)
                    if 'text' in save_path:
                        with open(save_path['text'], "w", encoding="utf-8") as f:
                            f.write(readable_text)
                else:
                    # 只保存HTML
                    with open(save_path, "w", encoding="utf-8") as f:
                        f.write(body_html)
            
            return {
                'html': body_html,
                'markdown': readable_text
            }
            
        except Exception as e:
            print(f"Selenium爬取失败: {str(e)}")
            return {
                'html': None,
                'markdown': None,
                'error': str(e)
            }
        finally:
            if 'driver' in locals():
                driver.quit()

# 简单的页面获取函数
def simple_fetch(url):
    """简单的页面获取函数"""
    return requests.get(url).text