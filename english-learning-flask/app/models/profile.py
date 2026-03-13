from datetime import datetime
import uuid
from app import db

class Profile(db.Model):
    __tablename__ = 'profiles'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(10)) # 'child' / 'adult'
    age_group = db.Column(db.String(10)) # '1y' / '3y' / '6y' / 'adult'
    level = db.Column(db.String(10), default='beginner')
    avatar_url = db.Column(db.String(500))
    daily_goal_min = db.Column(db.Integer, default=20)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    sessions = db.relationship('LearningSession', backref='profile', lazy='dynamic')
    vocab_list = db.relationship('UserVocabulary', backref='profile', lazy='dynamic')
    quizzes = db.relationship('Quiz', backref='profile', lazy='dynamic')
