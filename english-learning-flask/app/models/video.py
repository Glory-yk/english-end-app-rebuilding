from datetime import datetime
import uuid
from app import db
from sqlalchemy.dialects.postgresql import JSONB

class Video(db.Model):
    __tablename__ = 'videos'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    youtube_id = db.Column(db.String(20), unique=True, index=True, nullable=False)
    title = db.Column(db.String(500), nullable=False)
    channel_name = db.Column(db.String(200))
    thumbnail_url = db.Column(db.String(500))
    duration_sec = db.Column(db.Integer)
    difficulty = db.Column(db.String(10)) # 'easy' / 'medium' / 'hard'
    age_group = db.Column(db.JSON) # Changed from ARRAY to JSON
    category = db.Column(db.String(50))
    tags = db.Column(db.JSON) # Changed from ARRAY to JSON
    subtitle_lang = db.Column(db.JSON) # Changed from ARRAY to JSON
    view_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    subtitles = db.relationship('Subtitle', backref='video', lazy='dynamic')
    quizzes = db.relationship('Quiz', backref='video', lazy='dynamic')

class Channel(db.Model):
    __tablename__ = 'channels'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    profile_id = db.Column(db.String(36), db.ForeignKey('profiles.id'), nullable=False)
    youtube_channel_id = db.Column(db.String(100), nullable=False)
    name = db.Column(db.String(200))
    thumbnail_url = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Subtitle(db.Model):
    __tablename__ = 'subtitles'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    video_id = db.Column(db.String(36), db.ForeignKey('videos.id'), nullable=False)
    lang = db.Column(db.String(10)) # 'en' / 'ko'
    start_ms = db.Column(db.Integer, nullable=False)
    end_ms = db.Column(db.Integer, nullable=False)
    text = db.Column(db.Text, nullable=False)
    words_json = db.Column(db.JSON) # Changed from JSONB to JSON
    
    # Index (video_id, start_ms) for synchronization performance
    __table_args__ = (db.Index('idx_subtitle_sync', 'video_id', 'start_ms'),)
