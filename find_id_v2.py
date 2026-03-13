import requests
import re
import json

def find_channel_id(url):
    try:
        r = requests.get(url, timeout=10)
        match = re.search(r'"channelId":"(UC[a-zA-Z0-9_-]+)"', r.text)
        if match: return match.group(1)
        match = re.search(r'<meta itemprop="channelId" content="(UC[a-zA-Z0-9_-]+)">', r.text)
        if match: return match.group(1)
    except: pass
    return None

data = {
    'bbc': find_channel_id('https://www.youtube.com/@bbclearningenglish'),
    'supersimple': find_channel_id('https://www.youtube.com/@SuperSimplePlay'),
    'teded': find_channel_id('https://www.youtube.com/@TEDEd')
}

with open('found_ids.json', 'w') as f:
    json.dump(data, f, indent=2)
