import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '5m', target: 100 },
    { duration: '30m', target: 100 },
    { duration: '5m', target: 0 },
  ],
    // thresholds: {
    //   http_req_duration: ['p(99)<150'],
    // },
};

const urls = [
  "https://policies.google.com/privacy?hl=en-US",
  "https://www.facebook.com/privacy/policy/",
  "https://foundation.wikimedia.org/wiki/Privacy_policy",
  "https://privacy.microsoft.com/en-us/privacystatement",
  "https://www.reddit.com/policies/privacy-policy?__hstc=53109431.bd1028bfa9b412cc559ab7e732b52496.1727735173021.1732200491510.1732209607383.87&__hssc=53109431.4951.1732209607383&__hsfp=810579359",
  "https://openai.com/policies/privacy-policy",
  "https://x.com/en/privacy",
  "https://www.whatsapp.com/legal/privacy-policy",
  "https://yandex.com/legal/confidential/",
  "https://duckduckgo.com/privacy",
  "https://www.amazon.com/gp/help/customer/display.html?nodeId=GX7NJQ4ZB8MHFRNJ",
  "https://legal.yahoo.com/us/en/yahoo/privacy/index.html",
  "https://www.lycorp.co.jp/en/company/privacypolicy/",
  "https://www.tiktok.com/legal/page/row/privacy-policy/en",
  "https://weather.com/en-US/twc/privacy-policy",
  "https://help.netflix.com/en/legal/privacy",
  "https://policy.naver.com/policy/privacy_en.html",
  "https://www.twitch.tv/p/en/legal/privacy-notice/",
  "https://www.linkedin.com/legal/privacy-policy?",
  "https://policy.pinterest.com/en/privacy-policy",
  "https://vk.com/privacy",
  "https://www.temu.com/au/privacy-and-cookie-policy.html?title=Privacy%20%26%20Cookie%20Policy&_bg_fs=0&_x_sessn_id=bo4jjqxfso&refer_page_name=home&refer_page_id=10005_1745910789372_i1mkfmgvo9&refer_page_sn=10005",
  "https://rulechannel.alibaba.com/icbu?type=detail&ruleId=2034&cId=1306#/rule/detail?cId=1306&ruleId=2034",
  "https://discord.com/privacy",
  "https://www.canva.com/policies/privacy-policy/",
  "https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement",
  "https://www.spotify.com/us/legal/privacy-policy/",
  "https://en.help.roblox.com/hc/en-us/articles/115004630823-Privacy-Policy",
  "https://www.imdb.com/privacy",
  "https://www.quora.com/about/privacy",
];

const url_backend = 'https://usyd-cs30-1-llm-based-consent-reader.com';

export default function () {
  // const url = urls[__ITER % urls.length];
  const url = "https://www.temu.com/mx-en/privacy-and-cookie-policy.html?refer_page_name=privacy-and-cookie-policy&refer_page_id=17875_1747879271921_3oc6u2dmo5&refer_page_sn=17875&_x_sessn_id=wqvblc71na"
  const payload = JSON.stringify({
    url: url
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

 // let res = http.post(url_backend, payload, params, { tags: { url: url } });
   let res = http.post(url_backend, payload, params);


  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
