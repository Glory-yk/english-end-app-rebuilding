import youtube_transcript_api
import json

info = {
    'version': getattr(youtube_transcript_api, '__version__', 'unknown'),
    'methods': dir(youtube_transcript_api.YouTubeTranscriptApi)
}

with open('yt_info.json', 'w') as f:
    json.dump(info, f, indent=2)
