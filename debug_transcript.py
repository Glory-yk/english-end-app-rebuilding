from youtube_transcript_api import YouTubeTranscriptApi
import json

video_id = 'bGeWTQPKGZ4'
result = {}
try:
    transcript_info = YouTubeTranscriptApi.list_transcripts(video_id)
    result['transcripts'] = [{'code': t.language_code, 'generated': t.is_generated} for t in transcript_info]
except Exception as e:
    result['error'] = str(e)

with open('debug_transcript.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, indent=2)
