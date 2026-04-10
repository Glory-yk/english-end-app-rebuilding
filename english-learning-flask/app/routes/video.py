from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user
from app.services.youtube_service import YouTubeService
from app.models.video import Video, Subtitle
from app import db

video_bp = Blueprint('video', __name__)

@video_bp.route('/')
@login_required
def index():
    """List available videos."""
    videos = Video.query.order_by(Video.created_at.desc()).all()
    return render_template('video/index.html', videos=videos)

@video_bp.route('/add', methods=['GET', 'POST'])
@login_required
def add():
    """Add a new video by URL and redirect to learn immediately."""
    if request.method == 'POST':
        url = request.form.get('url', '').strip()
        if not url:
            flash("Please provide a valid YouTube URL.", 'error')
            return redirect(url_for('channels.index'))

        video_id = YouTubeService.get_video_id(url)
        if not video_id:
            flash("Invalid YouTube URL.", 'error')
            return redirect(url_for('channels.index'))

        # 1. Early check
        existing = Video.query.filter_by(youtube_id=video_id).first()
        if existing:
            return redirect(url_for('video.detail', video_id=existing.id))
            
        # 2. Process (has internal safety checks)
        video, message = YouTubeService.process_video(url)
        if video:
            return redirect(url_for('video.detail', video_id=video.id))
        else:
            flash(f"Error: {message}", 'error')
            return redirect(url_for('channels.index'))
            
    return render_template('video/add.html')



@video_bp.route('/add-sample')
@login_required
def add_sample():
    """Create a mock video for testing. Checks if already exists to prevent errors."""
    video_id = "ScMzIvxBSi4" # Very reliable educational video
    
    existing_video = Video.query.filter_by(youtube_id=video_id).first()
    if existing_video:
        flash("Sample video already exists! Enjoy learning.", 'warning')
        return redirect(url_for('video.detail', video_id=existing_video.id))

    try:
        video = Video(
            youtube_id=video_id,
            title="[Sample] English Speaking Practice",
            channel_name="English End Academy",
            thumbnail_url=f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
        )
        db.session.add(video)
        db.session.flush()

        samples = [
            {"start": 0, "dur": 3, "text": "Welcome to your first English learning session!"},
            {"start": 3, "dur": 4, "text": "Our platform helps you master vocabulary using spaced repetition."},
            {"start": 7, "dur": 5, "text": "Click on words like 'platform' or 'repetition' to save them."},
            {"start": 12, "dur": 4, "text": "You can then review them later in the vocabulary tab."},
            {"start": 16, "dur": 5, "text": "Let's start your journey to English fluency today!"}
        ]
        for s in samples:
            sub = Subtitle(
                video_id=video.id, lang='en',
                start_ms=s['start']*1000, end_ms=(s['start']+s['dur'])*1000,
                text=s['text']
            )
            db.session.add(sub)
        
        db.session.commit()
        flash("Sample video added successfully!", 'success')
        return redirect(url_for('video.detail', video_id=video.id))
    except Exception as e:
        db.session.rollback()
        flash(f"Error creating sample: {str(e)}", 'error')
        return redirect(url_for('video.add'))

from app.models.progress import LearningSession
from app.models.profile import Profile

@video_bp.route('/record-session', methods=['POST'])
@login_required
def record_session():
    """API to record time spent on a video."""
    data = request.get_json()
    video_id = data.get('video_id')
    duration = int(data.get('duration', 0)) # in seconds
    
    if not video_id or duration <= 0:
        return jsonify({'status': 'ignored'}), 400

    profile = Profile.query.filter_by(user_id=current_user.id).first()
    
    # Create a new session record
    session = LearningSession(
        profile_id=profile.id,
        video_id=video_id,
        watched_sec=duration,
        completed=True if duration > 60 else False
    )
    db.session.add(session)
    db.session.commit()
    
    return jsonify({'status': 'success', 'recorded_sec': duration})

@video_bp.route('/<video_id>/dictation')
@login_required
def dictation(video_id):
    """Dictation practice: listen to subtitle lines and type what you hear."""
    video = Video.query.get_or_404(video_id)
    subtitles = Subtitle.query.filter_by(video_id=video.id).order_by(Subtitle.start_ms).all()
    real_subs = [s for s in subtitles if not s.text.startswith('[System:')]
    subs_texts = [s.text for s in real_subs]
    return render_template('video/dictation.html', video=video, subtitles=real_subs, subs_texts=subs_texts)

@video_bp.route('/<video_id>/shadowing')
@login_required
def shadowing(video_id):
    """Sentence shadowing: listen to subtitle lines and repeat them aloud."""
    video = Video.query.get_or_404(video_id)
    subtitles = Subtitle.query.filter_by(video_id=video.id).order_by(Subtitle.start_ms).all()
    real_subs = [s for s in subtitles if not s.text.startswith('[System:')]
    return render_template('video/shadowing.html', video=video, subtitles=real_subs)

@video_bp.route('/<video_id>/listen')
@login_required
def listen(video_id):
    """Listening comprehension mode: watch without subtitles, reveal to check."""
    video = Video.query.get_or_404(video_id)
    subtitles = Subtitle.query.filter_by(video_id=video.id).order_by(Subtitle.start_ms).all()
    real_subs = [s for s in subtitles if not s.text.startswith('[System:')]
    return render_template('video/listen.html', video=video, subtitles=real_subs)

@video_bp.route('/<video_id>')
@login_required
def detail(video_id):
    """Video detail/learning page."""
    video = Video.query.get_or_404(video_id)
    subtitles = Subtitle.query.filter_by(video_id=video.id).order_by(Subtitle.start_ms).all()
    return render_template('video/detail.html', video=video, subtitles=subtitles)
