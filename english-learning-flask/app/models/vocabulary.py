from datetime import datetime
import uuid
from app import db

class Vocabulary(db.Model):
    __tablename__ = 'vocabulary'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    word = db.Column(db.String(100), nullable=False)
    phonetic = db.Column(db.String(200))
    meaning_ko = db.Column(db.Text, nullable=False)
    pos = db.Column(db.String(20)) # 'noun' / 'verb' / 'adj' ...
    example_en = db.Column(db.Text)
    example_ko = db.Column(db.Text)
    difficulty = db.Column(db.Integer, default=1) # (1-5)
    audio_url = db.Column(db.String(500))
    
    # UNIQUE: (word, pos)
    __table_args__ = (db.UniqueConstraint('word', 'pos', name='uq_word_pos'),)
    
    user_vocab = db.relationship('UserVocabulary', backref='vocabulary', lazy='dynamic')

class UserVocabulary(db.Model):
    __tablename__ = 'user_vocabulary'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    profile_id = db.Column(db.String(36), db.ForeignKey('profiles.id'), nullable=False)
    vocabulary_id = db.Column(db.String(36), db.ForeignKey('vocabulary.id'), nullable=False)
    source_video = db.Column(db.String(36), db.ForeignKey('videos.id'))
    
    # SM-2 SRS fields
    ease_factor = db.Column(db.Float, default=2.5)
    interval_days = db.Column(db.Integer, default=0)
    repetitions = db.Column(db.Integer, default=0)
    next_review = db.Column(db.DateTime, default=datetime.utcnow)
    last_reviewed = db.Column(db.DateTime)
    status = db.Column(db.String(10), default='new') # 'new' / 'learning' / 'review' / 'mastered'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # UNIQUE: (profile_id, vocabulary_id)
    __table_args__ = (db.UniqueConstraint('profile_id', 'vocabulary_id', name='uq_profile_word'),)
