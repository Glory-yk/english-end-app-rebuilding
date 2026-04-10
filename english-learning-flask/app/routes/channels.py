from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required, current_user
from app.models.video import Channel
from app.models.profile import Profile
from app.services.youtube_service import YouTubeService
from app import db

channels_bp = Blueprint('channels', __name__)

@channels_bp.route('/')
@login_required
def index():
    """List subscribed channels."""
    profile = Profile.query.filter_by(user_id=current_user.id).first()
    channels = Channel.query.filter_by(profile_id=profile.id).all()
    return render_template('channels/index.html', channels=channels)

@channels_bp.route('/add', methods=['POST'])
@login_required
def add():
    """Add a new channel by ID or URL."""
    input_val = request.form.get('channel_id', '').strip()
    name = request.form.get('name', 'New Channel')
    
    # Simple ID extraction if a URL is provided
    channel_id = input_val
    if 'youtube.com/channel/' in input_val:
        channel_id = input_val.split('youtube.com/channel/')[-1].split('/')[0].split('?')[0]
    elif 'youtube.com/@' in input_val or 'youtube.com/c/' in input_val or 'youtube.com/user/' in input_val:
        # Try to scrape the channel ID from the page
        try:
            import requests
            import re
            r = requests.get(input_val, timeout=10)
            match = re.search(r'"channelId":"(UC[a-zA-Z0-9_-]+)"', r.text)
            if match:
                channel_id = match.group(1)
            else:
                match = re.search(r'<meta itemprop="channelId" content="(UC[a-zA-Z0-9_-]+)">', r.text)
                if match:
                    channel_id = match.group(1)
        except Exception as e:
            flash(f"Could not extract channel ID: {str(e)}", 'error')
            return redirect(url_for('channels.index'))

    if not channel_id:
        flash("Channel ID or URL is required.", 'error')
        return redirect(url_for('channels.index'))

    profile = Profile.query.filter_by(user_id=current_user.id).first()

    # Check if already exists
    existing = Channel.query.filter_by(profile_id=profile.id, youtube_channel_id=channel_id).first()
    if existing:
        flash("Channel already subscribed.", 'warning')
        return redirect(url_for('channels.index'))

    new_channel = Channel(
        profile_id=profile.id,
        youtube_channel_id=channel_id,
        name=name,
        thumbnail_url=f"https://img.youtube.com/vi/sample/hqdefault.jpg" # Placeholder
    )
    db.session.add(new_channel)
    db.session.commit()
    flash(f"Subscribed to {name}!", 'success')
    return redirect(url_for('channels.index'))

@channels_bp.route('/view/<channel_id>')
@login_required
def view(channel_id):
    """View recent videos from a specific channel."""
    channel = Channel.query.get_or_404(channel_id)
    videos = YouTubeService.fetch_channel_videos(channel.youtube_channel_id)
    return render_template('channels/view.html', channel=channel, videos=videos)

@channels_bp.route('/edit/<channel_id>', methods=['POST'])
@login_required
def edit(channel_id):
    """Edit channel name."""
    channel = Channel.query.get_or_404(channel_id)
    profile = Profile.query.filter_by(user_id=current_user.id).first()
    
    # Verify ownership
    if channel.profile_id != profile.id:
        flash("You do not have permission to edit this channel.", 'error')
        return redirect(url_for('channels.index'))

    new_name = request.form.get('name', '').strip()
    if new_name:
        channel.name = new_name
        db.session.commit()
        flash(f"Channel updated to {new_name}", 'success')
    else:
        flash("Channel name cannot be empty.", 'error')
        
    return redirect(url_for('channels.index'))

@channels_bp.route('/delete/<channel_id>', methods=['POST'])
@login_required
def delete(channel_id):
    """Delete (unsubscribe) a channel."""
    channel = Channel.query.get_or_404(channel_id)
    profile = Profile.query.filter_by(user_id=current_user.id).first()
    
    # Verify ownership
    if channel.profile_id != profile.id:
        flash("You do not have permission to delete this channel.", 'error')
        return redirect(url_for('channels.index'))

    channel_name = channel.name
    db.session.delete(channel)
    db.session.commit()
    flash(f"Unsubscribed from {channel_name}.", 'success')
    
    return redirect(url_for('channels.index'))

