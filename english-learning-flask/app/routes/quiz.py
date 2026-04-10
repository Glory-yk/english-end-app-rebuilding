import json
import random
from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required, current_user
from app.models.progress import Quiz
from app.models.profile import Profile
from app.models.vocabulary import UserVocabulary

quiz_bp = Blueprint('quiz', __name__)

@quiz_bp.route('/')
@login_required
def index():
    """List available quizzes."""
    profile = Profile.query.filter_by(user_id=current_user.id).first()
    quizzes = Quiz.query.filter_by(profile_id=profile.id).all()
    word_count = UserVocabulary.query.filter_by(profile_id=profile.id).count()
    return render_template('quiz/index.html', quizzes=quizzes, word_count=word_count)

@quiz_bp.route('/generate/<video_id>', methods=['POST'])
@login_required
def generate(video_id):
    """Mock endpoint to generate a quiz from a video."""
    flash("AI Quiz Generation is simulating... Quiz created!")
    return redirect(url_for('quiz.index'))

@quiz_bp.route('/vocab-challenge')
@login_required
def vocab_challenge():
    """Multiple-choice vocabulary quiz drawn from the user's wordbook."""
    profile = Profile.query.filter_by(user_id=current_user.id).first()
    if not profile:
        flash("No profile found.", 'error')
        return redirect(url_for('quiz.index'))

    all_words = (
        UserVocabulary.query
        .filter_by(profile_id=profile.id)
        .join(UserVocabulary.vocabulary)
        .all()
    )

    if len(all_words) < 4:
        flash("You need at least 4 words in your wordbook to take a vocabulary challenge.", 'warning')
        return redirect(url_for('quiz.index'))

    # Pick up to 10 random words for this session
    sample_size = min(10, len(all_words))
    question_words = random.sample(all_words, sample_size)

    # Build question list
    questions = []
    all_meanings = [uw.vocabulary.meaning_ko for uw in all_words]

    for uw in question_words:
        correct = uw.vocabulary.meaning_ko
        # 3 distractors: random meanings that are not the correct one
        distractors = random.sample(
            [m for m in all_meanings if m != correct],
            min(3, len(all_meanings) - 1)
        )
        options = distractors + [correct]
        random.shuffle(options)
        questions.append({
            'word': uw.vocabulary.word,
            'phonetic': uw.vocabulary.phonetic or '',
            'pos': uw.vocabulary.pos or '',
            'correct': correct,
            'options': options,
        })

    return render_template(
        'quiz/vocab_challenge.html',
        questions_json=json.dumps(questions, ensure_ascii=False),
        total=len(questions),
    )