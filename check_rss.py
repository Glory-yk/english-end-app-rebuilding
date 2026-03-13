import requests

def check_rss(channel_id):
    url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
    print(f"Checking RSS: {url}")
    try:
        r = requests.get(url, timeout=10)
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            print("Content (first 500 chars):")
            print(r.text[:500])
        else:
            print(f"Error Content: {r.text}")
    except Exception as e:
        print(f"Exception: {e}")

print("--- BBC Learning English ---")
check_rss("UCHaHD477h-FeBbVh9Sh7syA")

print("\n--- User Video Channel ---")
# Let's find the channel ID for jKFKDl8f5ow
# Usually we can find it in the oEmbed
try:
    o = requests.get(f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=jKFKDl8f5ow&format=json").json()
    print(f"Author: {o['author_name']}, URL: {o['author_url']}")
except:
    print("Could not fetch oEmbed")
