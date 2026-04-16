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
    hard_words_count = UserVocabulary.query.filter(
        UserVocabulary.profile_id == profile.id,
        UserVocabulary.repetitions > 0,
    ).count()
    return render_template('quiz/index.html', quizzes=quizzes, word_count=word_count,
                           hard_words_count=hard_words_count)

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


@quiz_bp.route('/word-match')
@login_required
def word_match():
    """Word Match: click matching English–Korean pairs to clear the board."""
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
        flash("You need at least 4 words in your wordbook to play Word Match.", 'warning')
        return redirect(url_for('quiz.index'))

    # 6 pairs gives a snappy 12-card board; cap at available words
    sample_size = min(6, len(all_words))
    selected = random.sample(all_words, sample_size)

    pairs = []
    for uw in selected:
        pairs.append({
            'word': uw.vocabulary.word,
            'meaning': uw.vocabulary.meaning_ko,
        })

    return render_template(
        'quiz/word_match.html',
        pairs_json=json.dumps(pairs, ensure_ascii=False),
        total=len(pairs),
    )


@quiz_bp.route('/true-false')
@login_required
def true_false():
    """True or False: judge whether the shown Korean meaning is correct for the word."""
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
        flash("You need at least 4 words in your wordbook to play True or False.", 'warning')
        return redirect(url_for('quiz.index'))

    sample_size = min(12, len(all_words))
    question_words = random.sample(all_words, sample_size)
    all_meanings = [uw.vocabulary.meaning_ko for uw in all_words]

    questions = []
    for uw in question_words:
        correct_meaning = uw.vocabulary.meaning_ko
        show_correct = random.random() >= 0.5
        if show_correct:
            shown_meaning = correct_meaning
        else:
            others = [m for m in all_meanings if m != correct_meaning]
            shown_meaning = random.choice(others) if others else correct_meaning
            if shown_meaning == correct_meaning:
                show_correct = True  # fallback when only 1 unique meaning
        questions.append({
            'word': uw.vocabulary.word,
            'phonetic': uw.vocabulary.phonetic or '',
            'pos': uw.vocabulary.pos or '',
            'correct_meaning': correct_meaning,
            'shown_meaning': shown_meaning,
            'is_correct': show_correct,
        })

    return render_template(
        'quiz/true_false.html',
        questions_json=json.dumps(questions, ensure_ascii=False),
        total=len(questions),
    )


@quiz_bp.route('/hard-words')
@login_required
def hard_words():
    """Hard Words Drill: targeted MCQ quiz focused on the user's lowest ease-factor words."""
    profile = Profile.query.filter_by(user_id=current_user.id).first()
    if not profile:
        flash("No profile found.", 'error')
        return redirect(url_for('quiz.index'))

    # Full pool needed for distractor options
    all_words = (
        UserVocabulary.query
        .filter_by(profile_id=profile.id)
        .join(UserVocabulary.vocabulary)
        .all()
    )

    if len(all_words) < 4:
        flash("You need at least 4 words in your wordbook to use Hard Words Drill.", 'warning')
        return redirect(url_for('quiz.index'))

    # Hard words: reviewed at least once, sorted by ease_factor ASC (hardest first)
    hard = (
        UserVocabulary.query
        .filter(
            UserVocabulary.profile_id == profile.id,
            UserVocabulary.repetitions > 0,
        )
        .join(UserVocabulary.vocabulary)
        .order_by(UserVocabulary.ease_factor.asc())
        .limit(10)
        .all()
    )

    if len(hard) < 2:
        flash(
            "Not enough reviewed words yet. Complete some SRS reviews first — "
            "then come back to drill your hardest words!",
            'warning',
        )
        return redirect(url_for('quiz.index'))

    all_meanings = [uw.vocabulary.meaning_ko for uw in all_words]

    questions = []
    for uw in hard:
        correct = uw.vocabulary.meaning_ko
        distractor_pool = [m for m in all_meanings if m != correct]
        if len(distractor_pool) < 3:
            continue
        distractors = random.sample(distractor_pool, 3)
        options = distractors + [correct]
        random.shuffle(options)
        # ease_factor range 1.3 (hardest) → 2.5 (easiest), map to 0–100 %
        ease_pct = max(0, min(100, int((uw.ease_factor - 1.3) / (2.5 - 1.3) * 100)))
        questions.append({
            'word': uw.vocabulary.word,
            'phonetic': uw.vocabulary.phonetic or '',
            'pos': uw.vocabulary.pos or '',
            'correct': correct,
            'options': options,
            'ease_pct': ease_pct,
            'repetitions': uw.repetitions,
        })

    if not questions:
        flash("No hard words found. Keep reviewing to build your difficulty data!", 'warning')
        return redirect(url_for('quiz.index'))

    return render_template(
        'quiz/hard_words.html',
        questions_json=json.dumps(questions, ensure_ascii=False),
        total=len(questions),
    )


@quiz_bp.route('/daily-challenge')
@login_required
def daily_challenge():
    """Daily Challenge: 10 daily-seeded MCQ questions — same questions all day, new set tomorrow."""
    import hashlib
    import random as _random
    from datetime import date as dt_date

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
        flash("You need at least 4 words in your wordbook to take the Daily Challenge.", 'warning')
        return redirect(url_for('quiz.index'))

    # Deterministic daily seed: same 10 questions all day for this user
    today_str = dt_date.today().isoformat()
    seed_int = int(hashlib.md5(f"daily-{today_str}-{profile.id}".encode()).hexdigest(), 16)
    rng = _random.Random(seed_int)

    sample_size = min(10, len(all_words))
    question_words = rng.sample(all_words, sample_size)
    all_meanings = [uw.vocabulary.meaning_ko for uw in all_words]

    questions = []
    for uw in question_words:
        correct = uw.vocabulary.meaning_ko
        distractor_pool = [m for m in all_meanings if m != correct]
        if len(distractor_pool) < 3:
            continue
        distractors = rng.sample(distractor_pool, min(3, len(distractor_pool)))
        options = distractors + [correct]
        rng.shuffle(options)
        questions.append({
            'word': uw.vocabulary.word,
            'phonetic': uw.vocabulary.phonetic or '',
            'pos': uw.vocabulary.pos or '',
            'correct': correct,
            'options': options,
        })

    if not questions:
        flash("Not enough vocabulary for the Daily Challenge!", 'warning')
        return redirect(url_for('quiz.index'))

    return render_template(
        'quiz/daily_challenge.html',
        questions_json=json.dumps(questions, ensure_ascii=False),
        total=len(questions),
        today_str=today_str,
    )


@quiz_bp.route('/grammar-drill')
@login_required
def grammar_drill():
    """Grammar Drill: read a real subtitle sentence and identify which grammar pattern it uses."""
    # Import grammar pattern definitions from the video route (single source of truth)
    from app.routes.video import _GRAMMAR_PATTERNS

    profile = Profile.query.filter_by(user_id=current_user.id).first()
    if not profile:
        flash("No profile found.", 'error')
        return redirect(url_for('quiz.index'))

    # Only use subtitles from videos the user has actually watched
    watched_video_ids = [
        row[0]
        for row in db.session.query(LearningSession.video_id)
            .filter_by(profile_id=profile.id)
            .distinct()
            .all()
    ]

    if not watched_video_ids:
        flash("Watch some videos first to unlock Grammar Drill!", 'warning')
        return redirect(url_for('quiz.index'))

    all_subs = (
        Subtitle.query
        .filter(Subtitle.video_id.in_(watched_video_ids))
        .filter(~Subtitle.text.startswith('[System:'))
        .filter(Subtitle.text != '')
        .all()
    )

    if not all_subs:
        flash("No subtitle content found. Watch more videos to unlock Grammar Drill!", 'warning')
        return redirect(url_for('quiz.index'))

    # Collect sentences that clearly demonstrate each grammar pattern
    PATTERN_LABELS = [p['label'] for p in _GRAMMAR_PATTERNS]

    pattern_sentences = {}  # label -> list of {'sentence': str, 'match': str}
    for pat in _GRAMMAR_PATTERNS:
        matches = []
        for sub in all_subs:
            m = pat['regex'].search(sub.text)
            if m and 4 <= len(sub.text.split()) <= 16:
                matches.append({'sentence': sub.text.strip(), 'match': m.group(0)})
        pattern_sentences[pat['label']] = matches

    available_patterns = [lbl for lbl, sents in pattern_sentences.items() if sents]
    if len(available_patterns) < 3:
        flash(
            "Not enough subtitle variety yet. "
            "Watch more videos to unlock Grammar Drill!",
            'warning',
        )
        return redirect(url_for('quiz.index'))

    # Build up to 8 questions; cycle through patterns for variety
    questions = []
    used_sentences = set()
    shuffled_patterns = list(available_patterns)
    random.shuffle(shuffled_patterns)
    cycle_idx = 0
    attempts = 0

    while len(questions) < 8 and attempts < 60:
        attempts += 1
        correct_label = shuffled_patterns[cycle_idx % len(shuffled_patterns)]
        cycle_idx += 1

        candidates = [
            s for s in pattern_sentences[correct_label]
            if s['sentence'] not in used_sentences
        ]
        if not candidates:
            continue

        chosen = random.choice(candidates)
        used_sentences.add(chosen['sentence'])

        # 3 distractor options from other pattern labels
        other_labels = [l for l in PATTERN_LABELS if l != correct_label]
        distractors = random.sample(other_labels, min(3, len(other_labels)))
        options = distractors + [correct_label]
        random.shuffle(options)

        questions.append({
            'sentence': chosen['sentence'],
            'match': chosen['match'],
            'correct': correct_label,
            'options': options,
        })

    if len(questions) < 3:
        flash(
            "Not enough grammar examples found. Watch more videos to unlock Grammar Drill!",
            'warning',
        )
        return redirect(url_for('quiz.index'))

    # Pass pattern descriptions so the template can show them after each answer
    pattern_info = {
        p['label']: {'description': p['description'], 'icon': p['icon']}
        for p in _GRAMMAR_PATTERNS
    }

    return render_template(
        'quiz/grammar_drill.html',
        questions_json=json.dumps(questions, ensure_ascii=False),
        total=len(questions),
        pattern_info_json=json.dumps(pattern_info, ensure_ascii=False),
        available_count=len(available_patterns),
    )


@quiz_bp.route('/vocab-by-video/<video_id>')
@login_required
def vocab_by_video(video_id):
    """Vocabulary quiz focused on words the user saved from a specific video.

    Uses words saved from that video as the primary question pool; supplements
    with random wordbook words if fewer than 4 video-specific words exist.
    Falls back to an informative flash + redirect if no video words are saved.
    """
    from app.models.video import Video as VideoModel

    profile = Profile.query.filter_by(user_id=current_user.id).first()
    if not profile:
        flash("No profile found.", 'error')
        return redirect(url_for('quiz.index'))

    video = VideoModel.query.get_or_404(video_id)

    # Full wordbook — needed for distractor pool and potential supplement
    all_words = (
        UserVocabulary.query
        .filter_by(profile_id=profile.id)
        .join(UserVocabulary.vocabulary)
        .all()
    )

    if len(all_words) < 4:
        flash("You need at least 4 words in your wordbook to take a quiz.", 'warning')
        return redirect(url_for('video.detail', video_id=video_id))

    # Words saved specifically from this video
    video_words = [uv for uv in all_words if uv.source_video == video_id]

    if not video_words:
        flash(
            "No words saved from this video yet. "
            "Tap words in the subtitle panel while watching to save them!",
            'warning',
        )
        return redirect(url_for('video.detail', video_id=video_id))

    # Supplement with random words from the full wordbook if fewer than 4
    question_pool = list(video_words)
    if len(question_pool) < 4:
        video_word_ids = {uv.id for uv in question_pool}
        extras = [uv for uv in all_words if uv.id not in video_word_ids]
        needed = 4 - len(question_pool)
        if extras:
            question_pool += random.sample(extras, min(needed, len(extras)))

    sample_size = min(10, len(question_pool))
    selected = random.sample(question_pool, sample_size)
    all_meanings = [uv.vocabulary.meaning_ko for uv in all_words]

    questions = []
    for uw in selected:
        correct = uw.vocabulary.meaning_ko
        distractor_pool = [m for m in all_meanings if m != correct]
        if len(distractor_pool) < 3:
            continue
        distractors = random.sample(distractor_pool, 3)
        options = distractors + [correct]
        random.shuffle(options)
        questions.append({
            'word': uw.vocabulary.word,
            'phonetic': uw.vocabulary.phonetic or '',
            'pos': uw.vocabulary.pos or '',
            'correct': correct,
            'options': options,
            'from_this_video': uw.source_video == video_id,
        })

    if not questions:
        flash("Not enough vocabulary to build a quiz. Save more words from this video!", 'warning')
        return redirect(url_for('video.detail', video_id=video_id))

    return render_template(
        'quiz/vocab_challenge.html',
        questions_json=json.dumps(questions, ensure_ascii=False),
        total=len(questions),
        video_title=video.title,
        video_id=video_id,
    )


@quiz_bp.route('/anagram')
@login_required
def anagram():
    """Anagram Challenge: tap scrambled letter tiles to spell the English word."""
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
        flash("You need at least 4 words in your wordbook to try the Anagram Challenge.", 'warning')
        return redirect(url_for('quiz.index'))

    # Only words >= 3 letters (single-char words are trivial anagrams)
    eligible = [uw for uw in all_words if len(uw.vocabulary.word.replace(' ', '')) >= 3]
    if not eligible:
        flash("Not enough suitable words. Add more words to your wordbook!", 'warning')
        return redirect(url_for('quiz.index'))

    sample_size = min(10, len(eligible))
    selected = random.sample(eligible, sample_size)

    questions = []
    for uw in selected:
        word = uw.vocabulary.word.lower()
        letters = list(word)
        shuffled = letters[:]
        attempts = 0
        while ''.join(shuffled) == word and len(letters) > 1 and attempts < 30:
            random.shuffle(shuffled)
            attempts += 1
        questions.append({
            'word': word,
            'phonetic': uw.vocabulary.phonetic or '',
            'pos': uw.vocabulary.pos or '',
            'meaning': uw.vocabulary.meaning_ko,
            'letters': shuffled,
        })

    return render_template(
        'quiz/anagram.html',
        questions_json=json.dumps(questions, ensure_ascii=False),
        total=len(questions),
    )