import requests
import re
import traceback
import os
import json
import xml.etree.ElementTree as ET
from youtube_transcript_api import YouTubeTranscriptApi
from app.models.video import Video, Subtitle, Channel
from app import db

class YouTubeService:
    @staticmethod
    def log_debug(message):
        """Log debug messages to a file."""
        with open('debug_log.txt', 'a', encoding='utf-8') as f:
            f.write(f"{message}\n")

    @staticmethod
    def get_video_id(url):
        if not url: return None
        pattern = r'(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})'
        match = re.search(pattern, url)
        return match.group(1) if match else None

    @staticmethod
    def fetch_metadata(video_id):
        YouTubeService.log_debug(f"--- Fetching Metadata for {video_id} ---")
        oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
        try:
            response = requests.get(oembed_url, timeout=10)
            if response.status_code == 200:
                data = response.json()
                YouTubeService.log_debug("oEmbed Success")
                return {
                    'title': data.get('title', f"Video {video_id}"),
                    'channel_name': data.get('author_name', "Unknown Channel"),
                    'thumbnail_url': data.get('thumbnail_url', f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"),
                }
            else:
                YouTubeService.log_debug(f"oEmbed returned status: {response.status_code}")
        except Exception as e:
            YouTubeService.log_debug(f"oEmbed Error: {str(e)}")
            
        return {
            'title': f"YouTube Video ({video_id})",
            'channel_name': "YouTube",
            'thumbnail_url': f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
        }

    @staticmethod
    def fetch_transcript(video_id):
        YouTubeService.log_debug(f"--- Fetching Transcript for {video_id} ---")
        try:
            # Attempt 1
            return YouTubeTranscriptApi.get_transcript(video_id, languages=['en', 'en-US'])
        except Exception as e:
            YouTubeService.log_debug(f"Attempt 1 Fail: {str(e)}")
            try:
                # Attempt 2
                transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
                transcript = transcript_list.find_transcript(['en', 'en-US', 'en-GB'])
                YouTubeService.log_debug("Attempt 2 Success")
                return transcript.fetch()
            except Exception as e2:
                YouTubeService.log_debug(f"Attempt 2 Fail: {str(e2)}")
                try:
                    # Attempt 3: Translation
                    transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
                    first = next(iter(transcript_list))
                    YouTubeService.log_debug(f"Attempting translation from {first.language_code}")
                    return first.translate('en').fetch()
                except Exception as e3:
                    YouTubeService.log_debug(f"Attempt 3 Fail: {str(e3)}")
        return None

    @staticmethod
    def fetch_channel_videos(channel_id, sort_by='newest'):
        """Fetch latest videos from a channel via RSS feed with a scraping fallback and sorting."""
        # RSS doesn't support sorting well, so for popularity we might jump straight to scraping
        rss_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
        YouTubeService.log_debug(f"Fetching RSS: {rss_url} (sort: {sort_by})")
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9'
        }
        
        # Try RSS only if newest is requested
        if sort_by == 'newest':
            try:
                response = requests.get(rss_url, headers=headers, timeout=10)
                if response.status_code == 200:
                    root = ET.fromstring(response.content)
                    videos = []
                    ns = {'ns': 'http://www.w3.org/2005/Atom', 'yt': 'http://www.youtube.com/xml/schemas/2015'}
                    entries = root.findall('ns:entry', ns)
                    for entry in entries:
                        v_id_elem = entry.find('yt:videoId', ns)
                        t_elem = entry.find('ns:title', ns)
                        if v_id_elem is not None and t_elem is not None:
                            videos.append({
                                'id': v_id_elem.text,
                                'title': t_elem.text,
                                'thumbnail_url': f"https://img.youtube.com/vi/{v_id_elem.text}/hqdefault.jpg"
                            })
                    if videos: return videos
            except Exception as e:
                YouTubeService.log_debug(f"RSS Feed error: {str(e)}")

        # Fallback to scraping for sorting or RSS failure
        if sort_by == 'popular':
            scrape_url = f"https://www.youtube.com/channel/{channel_id}/videos?view=0&sort=p"
        else:
            scrape_url = f"https://www.youtube.com/channel/{channel_id}/videos"

        
        try:
            response = requests.get(scrape_url, headers=headers, timeout=15)
            if response.status_code != 200: return []
                
            match = re.search(r'var ytInitialData = (\{.*?\});', response.text)
            if not match: match = re.search(r'ytInitialData\s*=\s*(\{.*?\});', response.text)
            if not match: return []
                
            data = json.loads(match.group(1))
            try:
                tabs = data['contents']['twoColumnBrowseResultsRenderer']['tabs']
                # Try to find the selected or videos tab
                selected_tab = next((tab for tab in tabs if tab.get('tabRenderer', {}).get('selected')), tabs[1])
                
                tab_content = selected_tab['tabRenderer']['content']
                contents = []
                if 'richGridRenderer' in tab_content:
                    contents = tab_content['richGridRenderer']['contents']
                elif 'sectionListRenderer' in tab_content:
                    contents = tab_content['sectionListRenderer']['contents'][0]['itemSectionRenderer']['contents'][0]['gridRenderer']['items']

                videos = []
                for item in contents:
                    video_renderer = item.get('richItemRenderer', {}).get('content', {}).get('videoRenderer') or item.get('gridVideoRenderer')
                    if not video_renderer: continue
                        
                    v_id = video_renderer['videoId']
                    title = video_renderer['title']['runs'][0]['text'] if 'runs' in video_renderer['title'] else video_renderer['title']['simpleText']
                    videos.append({
                        'id': v_id,
                        'title': title,
                        'thumbnail_url': f"https://img.youtube.com/vi/{v_id}/hqdefault.jpg"
                    })
                return videos
            except Exception as e:
                YouTubeService.log_debug(f"Scrape parse error: {str(e)}")
                return []
        except Exception as e:
            return []


    @classmethod
    def process_video(cls, video_url):
        video_id = cls.get_video_id(video_url)
        YouTubeService.log_debug(f"\n\n=== Processing Video: {video_url} (ID: {video_id}) ===")
        
        if not video_id:
            return None, "Invalid URL"

        # Check if video already exists
        video = Video.query.filter_by(youtube_id=video_id).first()
        if video:
            return video, "Video already exists"

        metadata = cls.fetch_metadata(video_id)
        transcript = cls.fetch_transcript(video_id)

        try:
            # Double check inside the try block to catch race conditions
            existing = Video.query.filter_by(youtube_id=video_id).first()
            if existing:
                return existing, "Video already exists"

            new_video = Video(
                youtube_id=video_id,
                title=metadata['title'],
                channel_name=metadata['channel_name'],
                thumbnail_url=metadata['thumbnail_url']
            )
            db.session.add(new_video)
            db.session.flush()

            if transcript:
                for item in transcript:
                    sub = Subtitle(
                        video_id=new_video.id,
                        lang='en',
                        start_ms=int(item['start'] * 1000),
                        end_ms=int((item['start'] + item['duration']) * 1000),
                        text=item['text']
                    )
                    db.session.add(sub)
            else:
                sub = Subtitle(
                    video_id=new_video.id,
                    lang='en',
                    start_ms=0,
                    end_ms=5000,
                    text="[System: No subtitles found for this video. You can still watch it, but learning features may be limited.]"
                )
                db.session.add(sub)

            db.session.commit()
            YouTubeService.log_debug("Database Save Success")
            return new_video, "Success"
        except Exception as e:
            db.session.rollback()
            # If it's a unique constraint error, someone else might have just added it
            if "UNIQUE constraint failed" in str(e) or "duplicate key" in str(e).lower():
                YouTubeService.log_debug(f"Handled concurrent insert for {video_id}")
                return Video.query.filter_by(youtube_id=video_id).first(), "Video already exists"
            
            YouTubeService.log_debug(f"DB Error: {str(e)}")
            return None, f"Database Error: {str(e)}"


