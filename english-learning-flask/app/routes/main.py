import hashlib
from datetime import datetime, timedelta, date as date_type
from flask import Blueprint, render_template
from flask_login import login_required, current_user
from sqlalchemy import func, case
from sqlalchemy.orm import joinedload
from app.models.profile import Profile
from app.models.progress import LearningSession, Quiz
from app.models.vocabulary import UserVocabulary
from app.models.video import Video, Channel
from app import db


def _calculate_streak(profile_id):
    """Return the current consecutive-day learning streak for a profile.

    Counts backward from today; a day counts if at least one LearningSession
    exists for it.  Works with both SQLite (date strings) and PostgreSQL
    (Python date objects).
    """
    rows = (
        db.session.query(func.date(LearningSession.created_at))
        .filter_by(profile_id=profile_id)
        .distinct()
        .all()
    )
    active_dates = set()
    for (d,) in rows:
        if isinstance(d, str):
            try:
                active_dates.add(datetime.strptime(d, '%Y-%m-%d').date())
            except ValueError:
                pass
        elif isinstance(d, date_type):
            active_dates.add(d)

    streak = 0
    check = datetime.utcnow().date()
    while check in active_dates:
        streak += 1
        check -= timedelta(days=1)
    return streak

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    if current_user.is_authenticated:
        profile = Profile.query.filter_by(user_id=current_user.id).first()
        recent_sessions = (
            LearningSession.query
            .filter_by(profile_id=profile.id)
            .options(joinedload(LearningSession.video))
            .order_by(LearningSession.created_at.desc())
            .limit(5)
            .all()
        )

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

        # Consecutive-day learning streak
        streak_days = _calculate_streak(profile.id)

        # Total vocabulary count (reuse already-fetched all_words — no extra query)
        word_count = len(all_words)

        return render_template('main/dashboard.html',
                               profile=profile,
                               sessions=recent_sessions,
                               today_minutes=today_minutes,
                               goal_min=goal_min,
                               goal_pct=goal_pct,
                               mastered_count=mastered_count,
                               avg_quiz_pct=avg_quiz_pct,
                               due_count=due_count,
                               word_of_day=word_of_day,
                               streak_days=streak_days,
                               word_count=word_count)
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
    activity_data = {
        (row.date if isinstance(row.date, str) else row.date.strftime('%Y-%m-%d')): row.seconds
        for row in daily_stats
    }
    chart_values = [activity_data.get(label, 0) // 60 for label in labels] # minutes

    # 4. Difficulty Distribution
    diff_stats = db.session.query(
        Video.difficulty,
        func.count(LearningSession.id)
    ).join(LearningSession, Video.id == LearningSession.video_id).filter(
        LearningSession.profile_id == profile.id
    ).group_by(Video.difficulty).all()
    diff_dist = {diff or 'unknown': count for diff, count in diff_stats}

    streak_days = _calculate_streak(profile.id)

    # 5. 30-Day Activity Heatmap
    thirty_days_start = (datetime.utcnow() - timedelta(days=29)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    heatmap_stats = db.session.query(
        func.date(LearningSession.created_at).label('date'),
        func.sum(LearningSession.watched_sec).label('seconds'),
    ).filter(
        LearningSession.profile_id == profile.id,
        LearningSession.created_at >= thirty_days_start
    ).group_by(func.date(LearningSession.created_at)).all()

    raw_heatmap = {}
    for row in heatmap_stats:
        d = row.date if isinstance(row.date, str) else row.date.strftime('%Y-%m-%d')
        raw_heatmap[d] = (row.seconds or 0) // 60  # seconds → minutes

    today_dt = datetime.utcnow().date()
    heatmap_days = []
    for i in range(29, -1, -1):
        day = today_dt - timedelta(days=i)
        day_str = day.strftime('%Y-%m-%d')
        mins = raw_heatmap.get(day_str, 0)
        level = 0 if mins == 0 else (1 if mins < 15 else (2 if mins < 30 else (3 if mins < 60 else 4)))
        heatmap_days.append({
            'date': day_str,
            'label': day.strftime('%b ') + str(day.day),
            'minutes': mins,
            'level': level,
            'is_today': (day == today_dt),
        })

    # Number of leading blank cells to align the first day to its weekday column (0=Mon)
    heatmap_offset = (today_dt - timedelta(days=29)).weekday()
    active_days = sum(1 for d in heatmap_days if d['minutes'] > 0)
    best_day_mins = max((d['minutes'] for d in heatmap_days), default=0)

    return render_template('main/stats.html',
                         profile=profile,
                         total_hours=round(total_watched_sec / 3600, 1),
                         total_videos=total_videos,
                         total_vocab=total_vocab,
                         vocab_dist=vocab_dist,
                         labels=labels,
                         chart_values=chart_values,
                         diff_dist=diff_dist,
                         streak_days=streak_days,
                         heatmap_days=heatmap_days,
                         heatmap_offset=heatmap_offset,
                         active_days=active_days,
                         best_day_mins=best_day_mins)
