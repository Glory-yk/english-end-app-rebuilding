import sys
from youtube_transcript_api import YouTubeTranscriptApi
import traceback

video_id = 'bGeWTQPKGZ4'
print(f"Testing video_id: {video_id}")

try:
    print("Attempting to list transcripts...")
    transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
    
    print("\nAvailable Transcripts:")
    for t in transcript_list:
        print(f"- Language: {t.language}, Code: {t.language_code}, Generated: {t.is_generated}")
        
    try:
        print("\nAttempting to find English transcript...")
        transcript = transcript_list.find_transcript(['en'])
        print("Success! English transcript found.")
        # print(transcript.fetch()[:2]) # Print first two lines
    except Exception as e:
        print(f"Could not find English transcript: {e}")
        
except Exception as e:
    print("\nFATAL ERROR:")
    print(traceback.format_exc())
