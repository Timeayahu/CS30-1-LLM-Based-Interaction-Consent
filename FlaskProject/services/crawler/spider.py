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
      
        url = f"{self.base_url}/{path}"
        response = self.session.get(url)
        return response.text
    
    def parse(self, html_content):
      
        soup = BeautifulSoup(html_content, 'html.parser')
        title = soup.title.string if soup.title else "No title found"
        return {"title": title}
    
    def selenium_crawl(self, url=None, wait_time=5, save_path=None):
      
        target_url = url if url else self.base_url
        
        # set Chrome headless mode
        chrome_options = Options()
        chrome_options.add_argument("--headless=new")  # 使用新的无头模式
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920x1080")

        # bypass Selenium detection
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
                    service = Service(ChromeDriverManager().install())
                    driver = webdriver.Chrome(service=service, options=chrome_options)
                except Exception as e:
                    print(f"Failed to use ChromeDriverManager: {e}")              
                    driver = webdriver.Chrome(options=chrome_options)
                
            # visit target page
            driver.get(target_url)
            
            time.sleep(wait_time)
            
            body_html = driver.find_element(By.TAG_NAME, "body").get_attribute("outerHTML")
            
            converter = html2text.HTML2Text()
            readable_text = converter.handle(body_html)
            
            if save_path:
                if isinstance(save_path, dict):
                    if 'html' in save_path:
                        with open(save_path['html'], "w", encoding="utf-8") as f:
                            f.write(body_html)
                    if 'text' in save_path:
                        with open(save_path['text'], "w", encoding="utf-8") as f:
                            f.write(readable_text)
                else:
                    with open(save_path, "w", encoding="utf-8") as f:
                        f.write(body_html)
            
            return {
                'html': body_html,
                'markdown': readable_text
            }
            
        except Exception as e:
            print(f"Selenium crawl failed: {str(e)}")
            return {
                'html': None,
                'markdown': None,
                'error': str(e)
            }
        finally:
            if 'driver' in locals():
                driver.quit()

# simple page get function
def simple_fetch(url):
    return requests.get(url).text