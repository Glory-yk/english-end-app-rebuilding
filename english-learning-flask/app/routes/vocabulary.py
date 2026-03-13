from datetime import datetime
from flask import Blueprint, render_template, request, jsonify, flash, redirect, url_for
from flask_login import login_required, current_user
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

@vocab_bp.route('/review')
@login_required
def review():
    """Review due words using SM-2."""
    profile = Profile.query.filter_by(user_id=current_user.id).first()
    due_words = UserVocabulary.query.filter(
        UserVocabulary.profile_id == profile.id,
        UserVocabulary.next_review <= datetime.utcnow()
    ).all()
    
    return render_template('vocabulary/review.html', words=due_words, count=len(due_words))

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
