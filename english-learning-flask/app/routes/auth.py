from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_user, logout_user, login_required, current_user
from app.models.user import User
from app.models.profile import Profile
from app import db

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('main.index'))
        
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        user = User.query.filter_by(email=email).first()
        
        if user is None or not user.check_password(password):
            flash('Invalid email or password', 'error')
            return redirect(url_for('auth.login'))
            
        login_user(user)
        return redirect(url_for('main.index'))
        
    return render_template('auth/login.html')

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('main.index'))
        
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        name = request.form.get('name')
        
        if User.query.filter_by(email=email).first():
            flash('Email address already exists', 'error')
            return redirect(url_for('auth.register'))
            
        # Create User
        new_user = User(email=email)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.flush() # Get user ID
        
        # Create default Adult Profile
        new_profile = Profile(user_id=new_user.id, name=name, type='adult', age_group='adult')
        db.session.add(new_profile)
        
        db.session.commit()
        
        login_user(new_user)
        return redirect(url_for('main.index'))
        
    return render_template('auth/register.html')

@auth_bp.route('/settings', methods=['GET', 'POST'])
@login_required
def settings():
    """Profile settings: update name, daily goal, and English level."""
    profile = Profile.query.filter_by(user_id=current_user.id).first()
    if not profile:
        flash("No profile found.", 'error')
        return redirect(url_for('main.index'))

    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        daily_goal = request.form.get('daily_goal_min', '').strip()
        level = request.form.get('level', '').strip()

        errors = []
        if not name:
            errors.append("Display name cannot be empty.")
        elif len(name) > 100:
            errors.append("Display name must be 100 characters or fewer.")

        try:
            daily_goal_int = int(daily_goal)
            if not (5 <= daily_goal_int <= 240):
                errors.append("Daily goal must be between 5 and 240 minutes.")
        except (ValueError, TypeError):
            errors.append("Daily goal must be a whole number.")
            daily_goal_int = profile.daily_goal_min

        valid_levels = ('beginner', 'intermediate', 'upper-intermediate', 'advanced')
        if level not in valid_levels:
            errors.append("Please select a valid English level.")

        if errors:
            for msg in errors:
                flash(msg, 'error')
        else:
            profile.name = name
            profile.daily_goal_min = daily_goal_int
            profile.level = level
            db.session.commit()
            flash("Settings saved successfully!", 'success')
            return redirect(url_for('auth.settings'))

    return render_template('auth/settings.html', profile=profile)


@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('main.index'))