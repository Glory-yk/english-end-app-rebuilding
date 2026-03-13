from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required, current_user
from app.models.progress import Quiz
from app.models.profile import Profile

quiz_bp = Blueprint('quiz', __name__)

@quiz_bp.route('/')
@login_required
def index():
    """List available quizzes."""
    profile = Profile.query.filter_by(user_id=current_user.id).first()
    quizzes = Quiz.query.filter_by(profile_id=profile.id).all()
    return render_template('quiz/index.html', quizzes=quizzes)

@quiz_bp.route('/generate/<video_id>', methods=['POST'])
@login_required
def generate(video_id):
    """Mock endpoint to generate a quiz from a video."""
    flash("AI Quiz Generation is simulating... Quiz created!")
    return redirect(url_for('quiz.index'))