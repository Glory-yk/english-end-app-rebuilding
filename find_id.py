import requests
import re

def find_channel_id(url):
    print(f"Finding ID for: {url}")
    try:
        r = requests.get(url, timeout=10)
        match = re.search(r'"channelId":"(UC[a-zA-Z0-9_-]+)"', r.text)
        if match:
            return match.group(1)
        
        # Alternative meta tag
        match = re.search(r'<meta itemprop="channelId" content="(UC[a-zA-Z0-9_-]+)">', r.text)
        if match:
            return match.group(1)
            
    except Exception as e:
        print(f"Error: {e}")
    return None

print(f"BBC ID: {find_channel_id('https://www.youtube.com/@bbclearningenglish')}")
print(f"Super Simple ID: {find_channel_id('https://www.youtube.com/@SuperSimplePlay')}")
