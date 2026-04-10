from datetime import datetime
import uuid
from app import db
from sqlalchemy.dialects.postgresql import JSONB

class LearningSession(db.Model):
    __tablename__ = 'learning_sessions'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    profile_id = db.Column(db.String(36), db.ForeignKey('profiles.id'), nullable=False)
    video_id = db.Column(db.String(36), db.ForeignKey('videos.id'), nullable=False)
    watched_sec = db.Column(db.Integer, default=0)
    words_learned = db.Column(db.Integer, default=0)
    quiz_score = db.Column(db.Float)
    completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    video = db.relationship('Video', foreign_keys=[video_id])

class Quiz(db.Model):
    __tablename__ = 'quizzes'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    video_id = db.Column(db.String(36), db.ForeignKey('videos.id'), nullable=False)
    profile_id = db.Column(db.String(36), db.ForeignKey('profiles.id'), nullable=False)
    type = db.Column(db.String(20)) # 'fill_blank' / 'listening' / 'arrange' / 'match'
    question_json = db.Column(db.JSON) # Changed from JSONB to JSON
    difficulty = db.Column(db.Integer, default=1)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
