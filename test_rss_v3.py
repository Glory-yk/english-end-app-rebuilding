import requests

urls = [
    "https://www.youtube.com/feeds/videos.xml?channel_id=UCAuUUnT6oDeKwE6v1NGQxug",
    "https://www.youtube.com/feeds/videos.xml?user=TEDEducation",
    "https://www.youtube.com/feeds/videos.xml?playlist_id=UUAuUUnT6oDeKwE6v1NGQxug" # Playlist for all uploads
]

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

for url in urls:
    print(f"Testing: {url}")
    try:
        r = requests.get(url, headers=headers, timeout=10)
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            print("Success!")
            # print(r.text[:200])
    except Exception as e:
        print(f"Error: {e}")
