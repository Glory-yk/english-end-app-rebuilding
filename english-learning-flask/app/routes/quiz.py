import json
import re
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


@quiz_bp.route('/cloze')
@login_required
def cloze():
    """Cloze (fill-in-the-blank) quiz: pick the vocabulary word that fits a real subtitle sentence."""
    profile = Profile.query.filter_by(user_id=current_user.id).first()
    if not profile:
        flash("No profile found.", 'error')
        return redirect(url_for('quiz.index'))

    all_user_words = (
        UserVocabulary.query
        .filter_by(profile_id=profile.id)
        .join(UserVocabulary.vocabulary)
        .all()
    )

    if len(all_user_words) < 4:
        flash("You need at least 4 words in your wordbook to take a Cloze quiz.", 'warning')
        return redirect(url_for('quiz.index'))

    # Map lowercase word -> UserVocabulary for fast lookup
    word_to_uv = {uv.vocabulary.word.lower(): uv for uv in all_user_words}

    # Fetch all subtitle lines (exclude system markers)
    all_subs = (
        Subtitle.query
        .filter(~Subtitle.text.startswith('[System:'))
        .filter(Subtitle.text != '')
        .all()
    )

    # Shuffle so we get variety across runs
    random.shuffle(all_subs)

    questions = []
    used_words = set()
    _punct_re = re.compile(r"[^a-zA-Z'-]")

    for sub in all_subs:
        if len(questions) >= 8:
            break
        tokens = sub.text.split()
        for token in tokens:
            clean = _punct_re.sub('', token).lower()
            if not clean or clean in used_words:
                continue
            if clean not in word_to_uv:
                continue

            uv = word_to_uv[clean]
            used_words.add(clean)

            # Build blanked sentence (replace first occurrence, case-insensitive)
            blanked = re.sub(
                r'(?<![a-zA-Z\'-])' + re.escape(clean) + r'(?![a-zA-Z\'-])',
                '___',
                sub.text.strip(),
                count=1,
                flags=re.IGNORECASE,
            )

            # If no blank was created (edge case), skip
            if '___' not in blanked:
                continue

            # Distractors: other words from the wordbook (different from correct)
            distractor_pool = [
                uv2.vocabulary.word
                for uv2 in all_user_words
                if uv2.vocabulary.word.lower() != clean
            ]
            if len(distractor_pool) < 3:
                continue

            distractors = random.sample(distractor_pool, 3)
            options = distractors + [uv.vocabulary.word]
            random.shuffle(options)

            questions.append({
                'sentence': sub.text.strip(),
                'blanked': blanked,
                'correct': uv.vocabulary.word,
                'meaning': uv.vocabulary.meaning_ko,
                'phonetic': uv.vocabulary.phonetic or '',
                'pos': uv.vocabulary.pos or '',
                'options': options,
            })
            break  # one question per subtitle line

    if len(questions) < 3:
        flash(
            "Not enough subtitle content matches your vocabulary yet. "
            "Watch more videos and save words to unlock the Cloze Quiz!",
            'warning',
        )
        return redirect(url_for('quiz.index'))

    return render_template(
        'quiz/cloze.html',
        questions_json=json.dumps(questions, ensure_ascii=False),
        total=len(questions),
    )


@quiz_bp.route('/spelling-bee')
@login_required
def spelling_bee():
    """Spelling Bee: see the Korean meaning and type the correct English spelling."""
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
        flash("You need at least 4 words in your wordbook to play Spelling Bee.", 'warning')
        return redirect(url_for('quiz.index'))

    sample_size = min(10, len(all_words))
    question_words = random.sample(all_words, sample_size)

    questions = []
    for uw in question_words:
        w = uw.vocabulary.word
        questions.append({
            'word': w,
            'phonetic': uw.vocabulary.phonetic or '',
            'pos': uw.vocabulary.pos or '',
            'meaning': uw.vocabulary.meaning_ko,
            'example': uw.vocabulary.example_en or '',
            'first_letter': w[0].upper(),
            'length': len(w),
        })

    return render_template(
        'quiz/spelling_bee.html',
        questions_json=json.dumps(questions, ensure_ascii=False),
        total=len(questions),
    )


@quiz_bp.route('/rapid-fire')
@login_required
def rapid_fire():
    """Rapid Fire: answer as many MCQs as possible in 60 seconds."""
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
        flash("You need at least 4 words in your wordbook to play Rapid Fire.", 'warning')
        return redirect(url_for('quiz.index'))

    # Pool of up to 30 questions so there's plenty to answer in 60 s
    sample_size = min(30, len(all_words))
    question_words = random.sample(all_words, sample_size)

    all_meanings = [uw.vocabulary.meaning_ko for uw in all_words]

    questions = []
    for uw in question_words:
        correct = uw.vocabulary.meaning_ko
        distractors = random.sample(
            [m for m in all_meanings if m != correct],
            min(3, len(all_meanings) - 1),
        )
        options = distractors + [correct]
        random.shuffle(options)
        questions.append({
            'word': uw.vocabulary.word,
            'phonetic': uw.vocabulary.phonetic or '',
            'correct': correct,
            'options': options,
        })

    return render_template(
        'quiz/rapid_fire.html',
        questions_json=json.dumps(questions, ensure_ascii=False),
        total=len(questions),
    )