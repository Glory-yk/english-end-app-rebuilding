import hashlib
from datetime import datetime, timedelta, date as date_type
from flask import Blueprint, render_template, request
from flask_login import login_required, current_user
from sqlalchemy import func, case
from sqlalchemy.orm import joinedload
from app.models.profile import Profile
from app.models.progress import LearningSession, Quiz
from app.models.vocabulary import UserVocabulary, Vocabulary
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
        # Count first (cheap); then fetch only the single word needed via OFFSET
        # instead of loading all vocabulary into memory.
        word_count = UserVocabulary.query.filter_by(profile_id=profile.id).count()
        word_of_day = None
        if word_count > 0:
            seed = int(hashlib.md5(f"{today_str}-{profile.id}".encode()).hexdigest(), 16)
            word_of_day = (
                UserVocabulary.query
                .filter_by(profile_id=profile.id)
                .options(joinedload(UserVocabulary.vocabulary))
                .order_by(UserVocabulary.id)
                .offset(seed % word_count)
                .limit(1)
                .first()
            )

        # Consecutive-day learning streak
        streak_days = _calculate_streak(profile.id)

        # 7-day SRS review forecast (words due on each of the next 7 days)
        review_forecast = []
        review_forecast_max = 0
        if word_count > 0:
            now_dt = datetime.utcnow()
            tomorrow_start = (now_dt + timedelta(days=1)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            week_end = tomorrow_start + timedelta(days=7)
            upcoming_rows = db.session.query(
                func.date(UserVocabulary.next_review).label('day'),
                func.count(UserVocabulary.id).label('cnt')
            ).filter(
                UserVocabulary.profile_id == profile.id,
                UserVocabulary.next_review >= tomorrow_start,
                UserVocabulary.next_review < week_end,
            ).group_by(func.date(UserVocabulary.next_review)).all()

            upcoming_map = {}
            for row in upcoming_rows:
                d = row.day if isinstance(row.day, str) else row.day.strftime('%Y-%m-%d')
                upcoming_map[d] = row.cnt

            today_date = now_dt.date()
            for i in range(1, 8):
                day = today_date + timedelta(days=i)
                day_str = day.strftime('%Y-%m-%d')
                count = upcoming_map.get(day_str, 0)
                review_forecast.append({
                    'label': 'Tomorrow' if i == 1 else day.strftime('%a'),
                    'date': f"{day.strftime('%b')} {day.day}",
                    'count': count,
                })
            review_forecast_max = max((d['count'] for d in review_forecast), default=0)

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
                               word_count=word_count,
                               review_forecast=review_forecast,
                               review_forecast_max=review_forecast_max)
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

    # 5. 30-Day Activity Heatmap + Vocabulary Growth
    thirty_days_start = (datetime.utcnow() - timedelta(days=29)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    # Vocabulary growth: words added per day in the last 30 days
    vocab_growth_rows = db.session.query(
        func.date(UserVocabulary.created_at).label('date'),
        func.count(UserVocabulary.id).label('count')
    ).filter(
        UserVocabulary.profile_id == profile.id,
        UserVocabulary.created_at >= thirty_days_start
    ).group_by(func.date(UserVocabulary.created_at)).all()

    vocab_daily = {}
    for row in vocab_growth_rows:
        d = row.date if isinstance(row.date, str) else row.date.strftime('%Y-%m-%d')
        vocab_daily[d] = row.count

    # Baseline: words saved before the 30-day window
    words_before_window = UserVocabulary.query.filter(
        UserVocabulary.profile_id == profile.id,
        UserVocabulary.created_at < thirty_days_start
    ).count()

    today_dt = datetime.utcnow().date()

    vocab_growth_labels = []
    vocab_growth_values = []
    cumulative = words_before_window
    for i in range(29, -1, -1):
        day = today_dt - timedelta(days=i)
        day_str = day.strftime('%Y-%m-%d')
        cumulative += vocab_daily.get(day_str, 0)
        vocab_growth_labels.append(day.strftime('%b ') + str(day.day))
        vocab_growth_values.append(cumulative)

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

    # Words Needing Attention: reviewed at least once, ordered by ease_factor ASC
    # (lower ease_factor = harder for the learner to recall)
    struggling_words = (
        UserVocabulary.query
        .filter(
            UserVocabulary.profile_id == profile.id,
            UserVocabulary.repetitions > 0,
        )
        .join(UserVocabulary.vocabulary)
        .order_by(UserVocabulary.ease_factor.asc())
        .limit(6)
        .all()
    )

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
                         best_day_mins=best_day_mins,
                         vocab_growth_labels=vocab_growth_labels,
                         vocab_growth_values=vocab_growth_values,
                         struggling_words=struggling_words)


@main_bp.route('/study-timer')
@login_required
def study_timer():
    """Pomodoro study timer page."""
    return render_template('main/study_timer.html')


@main_bp.route('/search')
@login_required
def search():
    """Site-wide search: videos by title/channel, vocabulary by word/meaning."""
    q = request.args.get('q', '').strip()

    videos = []
    vocab_results = []

    if len(q) >= 2:
        like_q = f'%{q}%'

        # Search all videos in the library by title or channel name
        videos = (
            Video.query
            .filter(
                db.or_(
                    Video.title.ilike(like_q),
                    Video.channel_name.ilike(like_q),
                )
            )
            .order_by(Video.created_at.desc())
            .limit(12)
            .all()
        )

        # Search the current user's personal wordbook by English word or Korean meaning
        profile = Profile.query.filter_by(user_id=current_user.id).first()
        if profile:
            vocab_results = (
                UserVocabulary.query
                .filter_by(profile_id=profile.id)
                .join(UserVocabulary.vocabulary)
                .filter(
                    db.or_(
                        Vocabulary.word.ilike(like_q),
                        Vocabulary.meaning_ko.ilike(like_q),
                    )
                )
                .limit(12)
                .all()
            )

    return render_template(
        'main/search.html',
        q=q,
        videos=videos,
        vocab_results=vocab_results,
    )
