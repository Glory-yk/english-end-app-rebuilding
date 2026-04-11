import re
import json
from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user
from markupsafe import Markup, escape
from app.services.youtube_service import YouTubeService
from app.models.video import Video, Subtitle
from app.models.vocabulary import UserVocabulary
from app import db

# ── Grammar pattern detection ─────────────────────────────────────────────────
_GRAMMAR_PATTERNS = [
    {
        'key': 'modals',
        'label': 'Modal Verbs',
        'description': 'Expressing ability, permission, or obligation (can / could / should / would / must / may / might / shall).',
        'icon': '💡',
        'badge': 'bg-blue-100 text-blue-700',
        'regex': re.compile(
            r'\b(can|could|should|would|must|may|might|shall)\s+(?:not\s+)?(?:be\s+)?\w+',
            re.IGNORECASE,
        ),
    },
    {
        'key': 'passive',
        'label': 'Passive Voice',
        'description': 'The subject receives the action — formed with be + past participle.',
        'icon': '🔄',
        'badge': 'bg-purple-100 text-purple-700',
        'regex': re.compile(
            r'\b(?:is|are|was|were|be|been|being)\s+\w+(?:ed|en|ied)\b',
            re.IGNORECASE,
        ),
    },
    {
        'key': 'conditionals',
        'label': 'Conditional Sentences',
        'description': 'If-clauses expressing conditions, hypotheticals, or results.',
        'icon': '🔀',
        'badge': 'bg-green-100 text-green-700',
        'regex': re.compile(
            r'\bif\s+(?:\w+\s+){1,6}\w+',
            re.IGNORECASE,
        ),
    },
    {
        'key': 'present_perfect',
        'label': 'Present Perfect',
        'description': 'Have / has + past participle — actions with a link to the present.',
        'icon': '⏰',
        'badge': 'bg-amber-100 text-amber-700',
        'regex': re.compile(
            r"\b(?:I've|you've|we've|they've|he's|she's|it's|have|has)\s+(?:not\s+)?(?:already\s+|just\s+|never\s+)?\w+(?:ed|en)\b",
            re.IGNORECASE,
        ),
    },
    {
        'key': 'comparative',
        'label': 'Comparatives & Superlatives',
        'description': 'Comparing people, places, or things using -er than or more / most.',
        'icon': '📊',
        'badge': 'bg-red-100 text-red-700',
        'regex': re.compile(
            r'\b\w+er\s+than\b|\b(?:more|most|less|least)\s+\w+',
            re.IGNORECASE,
        ),
    },
    {
        'key': 'questions',
        'label': 'Question Forms',
        'description': 'Inverted word order and wh-questions used in natural speech.',
        'icon': '❓',
        'badge': 'bg-teal-100 text-teal-700',
        'regex': re.compile(
            r'^(?:Do|Does|Did|Is|Are|Was|Were|Have|Has|Had|Can|Could|Will|Would|Should|What|Where|When|Why|How|Who)\s+\w+',
            re.IGNORECASE,
        ),
    },
]

_MAX_EXAMPLES = 6


def _make_highlighted(full_text, match_text):
    """Return a Markup string with match_text wrapped in a yellow <mark>."""
    esc_full = str(escape(full_text))
    esc_match = str(escape(match_text))
    highlighted = esc_full.replace(
        esc_match,
        f'<mark class="bg-yellow-200 font-semibold rounded px-0.5">{esc_match}</mark>',
        1,
    )
    return Markup(highlighted)


def _extract_grammar_patterns(subtitles):
    """Scan subtitle lines for grammar patterns; return list of pattern dicts."""
    results = []
    for pat in _GRAMMAR_PATTERNS:
        examples = []
        for sub in subtitles:
            if len(examples) >= _MAX_EXAMPLES:
                break
            m = pat['regex'].search(sub.text)
            if m:
                examples.append(_make_highlighted(sub.text.strip(), m.group(0)))
        results.append({
            'label': pat['label'],
            'description': pat['description'],
            'icon': pat['icon'],
            'badge': pat['badge'],
            'examples': examples,
        })
    return results

video_bp = Blueprint('video', __name__)

@video_bp.route('/')
@login_required
def index():
    """List available videos."""
    from app.models.progress import LearningSession
    from app.models.profile import Profile
    videos = Video.query.order_by(Video.created_at.desc()).all()
    profile = Profile.query.filter_by(user_id=current_user.id).first()
    watched_ids = set()
    if profile:
        watched_ids = {
            row[0] for row in
            db.session.query(LearningSession.video_id)
                .filter_by(profile_id=profile.id)
                .distinct()
                .all()
        }
    return render_template('video/index.html', videos=videos, watched_ids=watched_ids)

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

@video_bp.route('/<video_id>/grammar')
@login_required
def grammar(video_id):
    """Grammar pattern analysis: scan subtitle lines and group by pattern type."""
    video = Video.query.get_or_404(video_id)
    subtitles = Subtitle.query.filter_by(video_id=video.id).order_by(Subtitle.start_ms).all()
    real_subs = [s for s in subtitles if not s.text.startswith('[System:')]
    patterns = _extract_grammar_patterns(real_subs)
    found = [p for p in patterns if p['examples']]
    total_examples = sum(len(p['examples']) for p in found)
    return render_template(
        'video/grammar.html',
        video=video,
        patterns=found,
        total_examples=total_examples,
        total_lines=len(real_subs),
    )


@video_bp.route('/<video_id>')
@login_required
def detail(video_id):
    """Video detail/learning page."""
    video = Video.query.get_or_404(video_id)
    subtitles = Subtitle.query.filter_by(video_id=video.id).order_by(Subtitle.start_ms).all()

    # Fetch the user's saved words so the subtitle panel can highlight them
    profile = Profile.query.filter_by(user_id=current_user.id).first()
    saved_words_json = '[]'
    video_saved_words = []
    if profile:
        all_uvs = (
            UserVocabulary.query
            .filter_by(profile_id=profile.id)
            .join(UserVocabulary.vocabulary)
            .all()
        )
        saved_words_json = json.dumps([uv.vocabulary.word.lower() for uv in all_uvs])
        video_saved_words = (
            UserVocabulary.query
            .filter_by(profile_id=profile.id, source_video=video.id)
            .join(UserVocabulary.vocabulary)
            .all()
        )

    return render_template(
        'video/detail.html',
        video=video,
        subtitles=subtitles,
        saved_words_json=saved_words_json,
        video_saved_words=video_saved_words,
    )
