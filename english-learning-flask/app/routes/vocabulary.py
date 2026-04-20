import csv
import html as _html
import io
import re as _re
from datetime import datetime, timedelta
from flask import Blueprint, render_template, request, jsonify, flash, redirect, url_for, Response
from flask_login import login_required, current_user
from sqlalchemy.orm import joinedload
from app.models.vocabulary import Vocabulary, UserVocabulary
from app.models.profile import Profile
from app.services.srs_service import SrsService
from app import db, htmx

vocab_bp = Blueprint('vocab', __name__)

@vocab_bp.route('/')
@login_required
def index():
    """List words in user's vocabulary."""
    # Assuming the first profile for now (profile selection logic would come later)
    profile = Profile.query.filter_by(user_id=current_user.id).first()
    if not profile:
        return "No profile found", 404
    
    words = UserVocabulary.query.filter_by(profile_id=profile.id).order_by(UserVocabulary.next_review).all()
    return render_template('vocabulary/index.html', words=words)

@vocab_bp.route('/add', methods=['POST'])
@login_required
def add_word():
    """Add a new word to the personal wordbook."""
    data = request.get_json()
    word_text = data.get('word')
    video_id = data.get('video_id')
    
    profile = Profile.query.filter_by(user_id=current_user.id).first()
    
    # 1. Find or create the central Vocabulary record
    vocab = Vocabulary.query.filter_by(word=word_text.lower()).first()
    if not vocab:
        # 간단한 번역 로직 추가 (필요시 실제 API 연동)
        meaning = f"Meaning of {word_text}" # 실제로는 여기서 사전 API 호출 가능
        vocab = Vocabulary(word=word_text.lower(), meaning_ko=meaning)
        db.session.add(vocab)
        db.session.flush()

    # 2. Check if already in user's vocabulary
    user_word = UserVocabulary.query.filter_by(profile_id=profile.id, vocabulary_id=vocab.id).first()
    if not user_word:
        user_word = UserVocabulary(
            profile_id=profile.id,
            vocabulary_id=vocab.id,
            source_video=video_id,
            status='new',
            next_review=datetime.utcnow() # 즉시 리뷰 가능하게 설정
        )
        db.session.add(user_word)
        db.session.commit()
        return jsonify({'status': 'added', 'message': f"'{word_text}' added to your wordbook!"})
    
    return jsonify({'status': 'exists', 'message': f"'{word_text}' is already in your wordbook."})

@vocab_bp.route('/remove/<word_id>', methods=['POST'])
@login_required
def remove_word(word_id):
    """Remove a word from the user's vocabulary."""
    profile = Profile.query.filter_by(user_id=current_user.id).first()
    user_word = UserVocabulary.query.filter_by(id=word_id, profile_id=profile.id).first_or_404()
    word_text = user_word.vocabulary.word
    db.session.delete(user_word)
    db.session.commit()
    flash(f"'{word_text}' removed from your wordbook.", 'success')
    return redirect(url_for('vocab.index'))

@vocab_bp.route('/export')
@login_required
def export_csv():
    """Export user's vocabulary list as a CSV file."""
    profile = Profile.query.filter_by(user_id=current_user.id).first()
    if not profile:
        flash("No profile found.", 'error')
        return redirect(url_for('vocab.index'))

    words = UserVocabulary.query.filter_by(profile_id=profile.id).order_by(UserVocabulary.status).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Word', 'Phonetic', 'Meaning (KO)', 'Part of Speech', 'Example (EN)', 'Status', 'Next Review'])
    for item in words:
        v = item.vocabulary
        writer.writerow([
            v.word,
            v.phonetic or '',
            v.meaning_ko,
            v.pos or '',
            v.example_en or '',
            item.status,
            item.next_review.strftime('%Y-%m-%d') if item.next_review else '',
        ])

    output.seek(0)
    filename = f"vocabulary_{datetime.utcnow().strftime('%Y%m%d')}.csv"
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': f'attachment; filename={filename}'}
    )

@vocab_bp.route('/boost-review', methods=['POST'])
@login_required
def boost_review():
    """Mark a list of words for immediate SRS review.

    Accepts JSON: {"words": ["word1", "word2", ...]}
    Resets next_review to now and nudges ease_factor down so these words
    surface first in the next SRS session.  This closes the feedback loop
    between quiz wrong answers and the spaced-repetition queue.
    """
    data = request.get_json(silent=True) or {}
    words = data.get('words', [])
    if not words or not isinstance(words, list):
        return jsonify({'status': 'error', 'message': 'No words provided.'}), 400

    profile = Profile.query.filter_by(user_id=current_user.id).first()
    if not profile:
        return jsonify({'status': 'error', 'message': 'No profile.'}), 404

    updated = 0
    for word_text in words[:20]:          # cap to prevent abuse
        word_text = str(word_text).strip().lower()
        vocab = Vocabulary.query.filter_by(word=word_text).first()
        if not vocab:
            continue
        uv = UserVocabulary.query.filter_by(
            profile_id=profile.id,
            vocabulary_id=vocab.id
        ).first()
        if not uv:
            continue
        # Reset to due now; lower ease_factor (SM-2 minimum is 1.3)
        uv.next_review = datetime.utcnow()
        uv.ease_factor = max(1.3, uv.ease_factor - 0.15)
        if uv.status == 'mastered':
            uv.status = 'review'
        updated += 1

    db.session.commit()
    return jsonify({'status': 'ok', 'updated': updated})


@vocab_bp.route('/set-status/<int:word_id>', methods=['POST'])
@login_required
def set_status(word_id):
    """Update a word's SRS status directly from the wordbook (no full review needed).

    Accepts JSON {"status": "mastered"} and adjusts next_review / SRS counters
    to keep the spaced-repetition schedule consistent with the new status.
    """
    _VALID = ('new', 'learning', 'review', 'mastered')
    data = request.get_json(silent=True) or {}
    new_status = data.get('status')
    if new_status not in _VALID:
        return jsonify({'status': 'error', 'message': 'Invalid status'}), 400

    profile = Profile.query.filter_by(user_id=current_user.id).first()
    if not profile:
        return jsonify({'status': 'error', 'message': 'No profile'}), 404

    user_word = UserVocabulary.query.filter_by(
        id=word_id, profile_id=profile.id
    ).first_or_404()

    user_word.status = new_status
    now = datetime.utcnow()

    if new_status == 'mastered':
        user_word.next_review = now + timedelta(days=30)
        user_word.ease_factor = max(user_word.ease_factor or 2.5, 2.5)
    elif new_status == 'new':
        user_word.next_review = now
        user_word.ease_factor = 2.5
        user_word.repetitions = 0
        user_word.interval = 0
    elif new_status in ('learning', 'review'):
        user_word.next_review = now

    db.session.commit()
    return jsonify({'status': 'ok', 'new_status': new_status})


@vocab_bp.route('/review')
@login_required
def review():
    """Review due words using SM-2."""
    profile = Profile.query.filter_by(user_id=current_user.id).first()
    due_words = (
        UserVocabulary.query
        .filter(
            UserVocabulary.profile_id == profile.id,
            UserVocabulary.next_review <= datetime.utcnow()
        )
        .options(joinedload(UserVocabulary.vocabulary))
        .all()
    )
    return render_template('vocabulary/review.html', words=due_words, count=len(due_words))

@vocab_bp.route('/flashcards')
@login_required
def flashcards():
    """Free-practice flashcard mode — browse all words with a flip-card UI."""
    profile = Profile.query.filter_by(user_id=current_user.id).first()
    if not profile:
        flash("No profile found.", 'error')
        return redirect(url_for('vocab.index'))

    status_filter = request.args.get('filter', 'all')
    query = UserVocabulary.query.filter_by(profile_id=profile.id)
    if status_filter in ('new', 'learning', 'review', 'mastered'):
        query = query.filter_by(status=status_filter)

    words = query.join(UserVocabulary.vocabulary).order_by(UserVocabulary.next_review).all()

    if not words:
        flash("No words found for this filter. Add some words first!", 'warning')
        return redirect(url_for('vocab.index'))

    import json as _json
    cards = []
    for uw in words:
        v = uw.vocabulary
        cards.append({
            'word': v.word,
            'phonetic': v.phonetic or '',
            'pos': v.pos or '',
            'meaning': v.meaning_ko,
            'example': v.example_en or '',
            'status': uw.status,
        })

    return render_template(
        'vocabulary/flashcards.html',
        cards_json=_json.dumps(cards, ensure_ascii=False),
        total=len(cards),
        status_filter=status_filter,
    )


@vocab_bp.route('/word/<word_id>')
@login_required
def word_detail(word_id):
    """Word detail page: full info, SRS progress, and in-context subtitle sentences."""
    import re as _re
    from app.models.progress import LearningSession

    profile = Profile.query.filter_by(user_id=current_user.id).first()
    if not profile:
        flash("No profile found.", 'error')
        return redirect(url_for('vocab.index'))

    user_word = UserVocabulary.query.filter_by(
        id=word_id, profile_id=profile.id
    ).first_or_404()

    vocab = user_word.vocabulary

    # Source video (where the word was originally saved)
    source_video = None
    if user_word.source_video:
        from app.models.video import Video
        source_video = Video.query.get(user_word.source_video)

    # All subtitle sentences from the user's watched videos that contain this word
    from app.models.video import Subtitle, Video as VideoModel
    watched_video_ids = [
        row[0]
        for row in db.session.query(LearningSession.video_id)
            .filter_by(profile_id=profile.id)
            .distinct()
            .all()
    ]

    context_sentences = []
    if watched_video_ids:
        _word_re = _re.compile(
            r'(?<![a-zA-Z\'-])' + _re.escape(vocab.word.lower()) + r'(?![a-zA-Z\'-])',
            _re.IGNORECASE,
        )
        candidate_subs = (
            Subtitle.query
            .filter(Subtitle.video_id.in_(watched_video_ids))
            .filter(~Subtitle.text.startswith('[System:'))
            .all()
        )
        # Preload all watched videos in one query to avoid N+1 inside the loop.
        watched_videos_map = {
            v.id: v for v in
            VideoModel.query.filter(VideoModel.id.in_(watched_video_ids)).all()
        }
        for sub in candidate_subs:
            if _word_re.search(sub.text):
                # Highlight the matched word span in the sentence
                highlighted = _word_re.sub(
                    lambda m: f'<mark class="bg-yellow-200 font-bold rounded px-0.5">{m.group(0)}</mark>',
                    sub.text.strip(),
                )
                video_obj = watched_videos_map.get(sub.video_id)
                context_sentences.append({
                    'text': sub.text.strip(),
                    'highlighted': highlighted,
                    'video_title': video_obj.title if video_obj else 'Unknown Video',
                    'video_id': sub.video_id,
                })
                if len(context_sentences) >= 6:
                    break

    # Next-review label
    now = datetime.utcnow()
    next_review = user_word.next_review
    if next_review:
        delta = next_review - now
        if delta.total_seconds() < 0:
            next_review_label = 'Due now'
        elif delta.days == 0:
            h = int(delta.total_seconds() // 3600)
            next_review_label = f'In {h}h' if h else 'In <1h'
        elif delta.days == 1:
            next_review_label = 'Tomorrow'
        else:
            next_review_label = f'In {delta.days} days'
    else:
        next_review_label = '—'

    return render_template(
        'vocabulary/word_detail.html',
        user_word=user_word,
        vocab=vocab,
        source_video=source_video,
        context_sentences=context_sentences,
        next_review_label=next_review_label,
    )


@vocab_bp.route('/print')
@login_required
def print_vocab():
    """Render a print-optimised vocabulary sheet (browser prints to PDF)."""
    profile = Profile.query.filter_by(user_id=current_user.id).first()
    if not profile:
        flash("No profile found.", 'error')
        return redirect(url_for('vocab.index'))

    words = (
        UserVocabulary.query
        .filter_by(profile_id=profile.id)
        .join(UserVocabulary.vocabulary)
        .order_by(UserVocabulary.status, UserVocabulary.vocabulary)
        .all()
    )

    # Group by status for a structured sheet
    STATUS_ORDER = ['mastered', 'review', 'learning', 'new']
    grouped = {s: [] for s in STATUS_ORDER}
    for uw in words:
        grouped.setdefault(uw.status, []).append(uw)

    return render_template(
        'vocabulary/print.html',
        profile=profile,
        grouped=grouped,
        STATUS_ORDER=STATUS_ORDER,
        total=len(words),
        print_date=datetime.utcnow().strftime('%B %d, %Y'),
    )


@vocab_bp.route('/context-sentences/<word_id>')
@login_required
def context_sentences(word_id):
    """Return up to 3 in-context subtitle sentences for a vocabulary word (JSON).

    Used by the SRS review page to lazily enrich each card with real examples
    from the user's watched videos — fetched only when the answer is revealed.
    """
    from app.models.progress import LearningSession
    from app.models.video import Subtitle, Video as VideoModel

    profile = Profile.query.filter_by(user_id=current_user.id).first()
    if not profile:
        return jsonify({'sentences': []})

    user_word = UserVocabulary.query.filter_by(
        id=word_id, profile_id=profile.id
    ).first_or_404()
    vocab = user_word.vocabulary

    watched_video_ids = [
        row[0]
        for row in db.session.query(LearningSession.video_id)
            .filter_by(profile_id=profile.id)
            .distinct()
            .all()
    ]

    sentences = []
    if watched_video_ids:
        word_re = _re.compile(
            r'(?<![a-zA-Z\'-])' + _re.escape(vocab.word.lower()) + r'(?![a-zA-Z\'-])',
            _re.IGNORECASE,
        )
        # Scan at most 500 subtitle lines to keep response fast
        candidate_subs = (
            Subtitle.query
            .filter(Subtitle.video_id.in_(watched_video_ids))
            .filter(~Subtitle.text.startswith('[System:'))
            .limit(500)
            .all()
        )
        watched_videos_map = {
            v.id: v for v in
            VideoModel.query.filter(VideoModel.id.in_(watched_video_ids)).all()
        }
        for sub in candidate_subs:
            if word_re.search(sub.text):
                safe_text = _html.escape(sub.text.strip())
                highlighted = word_re.sub(
                    lambda m: f'<mark class="bg-yellow-200 font-bold rounded px-0.5">{_html.escape(m.group(0))}</mark>',
                    safe_text,
                )
                video_obj = watched_videos_map.get(sub.video_id)
                sentences.append({
                    'highlighted': highlighted,
                    'video_title': video_obj.title[:60] if video_obj else 'Unknown Video',
                })
                if len(sentences) >= 3:
                    break

    return jsonify({'sentences': sentences})


@vocab_bp.route('/review/answer/<word_id>', methods=['POST'])
@login_required
def submit_answer(word_id):
    """Process SRS review and return next card via HTMX."""
    quality = int(request.form.get('quality', 0))
    user_word = UserVocabulary.query.get_or_404(word_id)
    
    # Update SRS stats
    srs_data = SrsService.calculate_next_review(
        quality, user_word.repetitions, user_word.ease_factor, user_word.interval_days
    )
    
    user_word.repetitions = srs_data['repetitions']
    user_word.ease_factor = srs_data['ease_factor']
    user_word.interval_days = srs_data['interval']
    user_word.next_review = srs_data['next_review']
    user_word.last_reviewed = datetime.utcnow()
    user_word.status = SrsService.get_status(srs_data['interval'])
    
    db.session.commit()
    
    # HTMX response: Trigger "next card" load
    return f'<div id="card-{word_id}" class="hidden">Reviewed</div>'
