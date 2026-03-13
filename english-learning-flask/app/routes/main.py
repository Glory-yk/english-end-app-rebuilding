from flask import Blueprint, render_template
from flask_login import login_required, current_user
from sqlalchemy import func, case
from datetime import datetime, timedelta
from app.models.profile import Profile
from app.models.progress import LearningSession, Quiz
from app.models.vocabulary import UserVocabulary
from app.models.video import Video, Channel
from app import db

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    if current_user.is_authenticated:
        profile = Profile.query.filter_by(user_id=current_user.id).first()
        recent_sessions = LearningSession.query.filter_by(profile_id=profile.id).order_by(LearningSession.created_at.desc()).limit(5).all()
        return render_template('main/dashboard.html', profile=profile, sessions=recent_sessions)
    return render_template('main/landing.html')

@main_bp.route('/stats')
@login_required
def stats():
    profile = Profile.query.filter_by(user_id=current_user.id).first()
    if not profile:
        return render_template('main/landing.html')

    # 1. Overall Metrics
    total_watched_sec = db.session.query(func.sum(LearningSession.watched_sec)).filter_by(profile_id=profile.id).scalar() or 0
    total_videos = LearningSession.query.filter_by(profile_id=profile.id).distinct(LearningSession.video_id).count()
    total_vocab = UserVocabulary.query.filter_by(profile_id=profile.id).count()
    
    # 2. Vocabulary Status Distribution
    vocab_stats = db.session.query(
        UserVocabulary.status, 
        func.count(UserVocabulary.id)
    ).filter_by(profile_id=profile.id).group_by(UserVocabulary.status).all()
    vocab_dist = {status: count for status, count in vocab_stats}
    
    # 3. Learning Activity (Last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    daily_stats = db.session.query(
        func.date(LearningSession.created_at).label('date'),
        func.sum(LearningSession.watched_sec).label('seconds'),
        func.sum(LearningSession.words_learned).label('words')
    ).filter(
        LearningSession.profile_id == profile.id,
        LearningSession.created_at >= seven_days_ago
    ).group_by(func.date(LearningSession.created_at)).order_by('date').all()
    
    # Prepare data for charts
    labels = [(datetime.utcnow() - timedelta(days=i)).strftime('%Y-%m-%d') for i in range(6, -1, -1)]
    activity_data = {row.date.strftime('%Y-%m-%d'): row.seconds for row in daily_stats}
    chart_values = [activity_data.get(label, 0) // 60 for label in labels] # minutes

    # 4. Difficulty Distribution
    diff_stats = db.session.query(
        Video.difficulty,
        func.count(LearningSession.id)
    ).join(LearningSession, Video.id == LearningSession.video_id).filter(
        LearningSession.profile_id == profile.id
    ).group_by(Video.difficulty).all()
    diff_dist = {diff or 'unknown': count for diff, count in diff_stats}

    return render_template('main/stats.html', 
                         profile=profile,
                         total_hours=round(total_watched_sec / 3600, 1),
                         total_videos=total_videos,
                         total_vocab=total_vocab,
                         vocab_dist=vocab_dist,
                         labels=labels,
                         chart_values=chart_values,
                         diff_dist=diff_dist)