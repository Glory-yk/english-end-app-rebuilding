import requests
import json

urls = [
    "https://www.youtube.com/feeds/videos.xml?channel_id=UCAuUUnT6oDeKwE6v1NGQxug",
    "https://www.youtube.com/feeds/videos.xml?user=TEDEducation",
    "https://www.youtube.com/feeds/videos.xml?playlist_id=UUAuUUnT6oDeKwE6v1NGQxug"
]

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

results = []
for url in urls:
    try:
        r = requests.get(url, headers=headers, timeout=10)
        results.append({'url': url, 'status': r.status_code})
    except Exception as e:
        results.append({'url': url, 'error': str(e)})

with open('rss_results.json', 'w') as f:
    json.dump(results, f, indent=2)
