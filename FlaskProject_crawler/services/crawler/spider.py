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
    
    def selenium_crawl(self, url=None, wait_time=5):
        target_url = url if url else self.base_url
        
        # set the headless mode for Chrome
        chrome_options = Options()
        chrome_options.add_argument("--headless")  # headless mode
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920x1080")

        # bypass the Selenium detection
        chrome_options.add_argument("--disable-blink-features=AutomationControlled")

        # add the User-Agent to mimic a normal browser
        chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36")

        # try to close HTTP/2, avoid ERR_HTTP2_PROTOCOL_ERROR
        chrome_options.add_argument("--disable-features=NetworkService,NetworkServiceInProcess")
        
        try:
            chrome_path = "/usr/bin/google-chrome"
            driver_path = "/usr/bin/chromedriver"

            if os.path.exists(chrome_path) and os.path.exists(driver_path):
                chrome_options.binary_location = chrome_path
                service = Service(driver_path)
                driver = webdriver.Chrome(service=service, options=chrome_options)
            else:
                raise FileNotFoundError("Chrome or ChromeDriver not found at expected paths")
                
            # visit the target page
            driver.get(target_url)
            
            # wait for the JavaScript to load
            time.sleep(wait_time)
            
            # get the HTML code inside the <body> tag
            body_html = driver.find_element(By.TAG_NAME, "body").get_attribute("outerHTML")
              
            return {
                'html': body_html,
            }
            
        except Exception as e:
            print(f"Selenium crawl failed: {str(e)}")
            return {
                'html': None,
                'error': str(e)
            }
        finally:
            if 'driver' in locals():
                driver.quit()
