import hashlib
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

        # Today's watched minutes
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_sec = db.session.query(func.sum(LearningSession.watched_sec)).filter(
            LearningSession.profile_id == profile.id,
            LearningSession.created_at >= today_start
        ).scalar() or 0
        today_minutes = today_sec // 60

        # Daily goal progress percentage (capped at 100)
        goal_min = profile.daily_goal_min or 30
        goal_pct = min(100, round(today_minutes / goal_min * 100)) if goal_min else 0

        # Mastered words count
        mastered_count = UserVocabulary.query.filter_by(
            profile_id=profile.id, status='mastered'
        ).count()

        # Average quiz score (from sessions that have quiz scores)
        avg_quiz_raw = db.session.query(func.avg(LearningSession.quiz_score)).filter(
            LearningSession.profile_id == profile.id,
            LearningSession.quiz_score.isnot(None)
        ).scalar()
        avg_quiz_pct = round(avg_quiz_raw * 100) if avg_quiz_raw is not None else None

        # Words due for review right now
        due_count = UserVocabulary.query.filter(
            UserVocabulary.profile_id == profile.id,
            UserVocabulary.next_review <= datetime.utcnow()
        ).count()

        # Word of the Day: deterministic pick based on date + profile id
        today_str = datetime.utcnow().date().isoformat()
        all_words = UserVocabulary.query.filter_by(profile_id=profile.id).all()
        word_of_day = None
        if all_words:
            seed = int(hashlib.md5(f"{today_str}-{profile.id}".encode()).hexdigest(), 16)
            word_of_day = all_words[seed % len(all_words)]

        return render_template('main/dashboard.html',
                               profile=profile,
                               sessions=recent_sessions,
                               today_minutes=today_minutes,
                               goal_min=goal_min,
                               goal_pct=goal_pct,
                               mastered_count=mastered_count,
                               avg_quiz_pct=avg_quiz_pct,
                               due_count=due_count,
                               word_of_day=word_of_day)
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
