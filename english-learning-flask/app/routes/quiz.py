import json
import random
from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required, current_user
from app.models.progress import Quiz, LearningSession
from app.models.profile import Profile
from app.models.vocabulary import UserVocabulary
from app.models.video import Subtitle
from app import db

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


@quiz_bp.route('/sentence-scramble')
@login_required
def sentence_scramble():
    """Sentence scramble: rearrange subtitle words into the correct order."""
    profile = Profile.query.filter_by(user_id=current_user.id).first()
    if not profile:
        flash("No profile found.", 'error')
        return redirect(url_for('quiz.index'))

    # Find videos the user has actually watched
    watched_video_ids = [
        row[0]
        for row in db.session.query(LearningSession.video_id)
            .filter_by(profile_id=profile.id)
            .distinct()
            .all()
    ]

    if not watched_video_ids:
        flash("Watch some videos first to unlock Sentence Scramble!", 'warning')
        return redirect(url_for('quiz.index'))

    # Pull subtitles from those videos (exclude system markers)
    all_subs = (
        Subtitle.query
        .filter(Subtitle.video_id.in_(watched_video_ids))
        .all()
    )

    # Good sentences: 4–12 words, not system messages, longer than 20 chars
    good_subs = [
        s for s in all_subs
        if not s.text.startswith('[System:')
        and 4 <= len(s.text.split()) <= 12
        and len(s.text.strip()) > 20
    ]

    if len(good_subs) < 3:
        flash("Not enough subtitle content yet. Watch more videos to unlock this quiz!", 'warning')
        return redirect(url_for('quiz.index'))

    sample_size = min(8, len(good_subs))
    selected = random.sample(good_subs, sample_size)

    sentences = []
    for sub in selected:
        original = sub.text.strip()
        words = original.split()
        shuffled = words[:]
        # Keep shuffling until order differs (only possible with >1 word)
        attempts = 0
        while shuffled == words and len(words) > 1 and attempts < 20:
            random.shuffle(shuffled)
            attempts += 1
        sentences.append({
            'original': original,
            'words': words,
            'shuffled': shuffled,
        })

    return render_template(
        'quiz/sentence_scramble.html',
        sentences_json=json.dumps(sentences, ensure_ascii=False),
        total=len(sentences),
    )