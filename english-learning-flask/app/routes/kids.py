from flask import Blueprint, render_template, request, jsonify
from flask_login import login_required, current_user
from app.models.profile import Profile
from app.models.video import Video, Channel
from app.services.youtube_service import YouTubeService

kids_bp = Blueprint('kids', __name__)

@kids_bp.route('/')
@login_required
def index():
    """Kids Mode Dashboard - Channels First."""
    # Get all profiles for this user to collect all registered channels
    user_profiles = Profile.query.filter_by(user_id=current_user.id).all()
    profile_ids = [p.id for p in user_profiles]
    
    # Selected kid profile for UI personalization
    kid_profile = next((p for p in user_profiles if p.type == 'child'), user_profiles[0])
    
    # Get all channels for all profiles of this user
    channels = Channel.query.filter(Channel.profile_id.in_(profile_ids)).all()
    
    # Default: Show first channel's videos if exists
    initial_videos = []
    first_channel = None
    if channels:
        first_channel = channels[0]
        initial_videos = YouTubeService.fetch_channel_videos(first_channel.youtube_channel_id)
    
    return render_template('kids/index.html', profile=kid_profile, channels=channels, first_channel=first_channel, initial_videos=initial_videos)


@kids_bp.route('/channel/<channel_id>/videos')
@login_required
def channel_videos(channel_id):
    """Fetch videos for a channel via AJAX."""
    sort_by = request.args.get('sort', 'newest') # 'newest' or 'popular'
    page = int(request.args.get('page', 1))
    
    # Note: Currently fetch_channel_videos returns fixed batch. 
    # For real infinite scroll with page, we'd need to handle continuation tokens.
    # Here we simulate it by returning the batch.
    videos = YouTubeService.fetch_channel_videos(channel_id, sort_by=sort_by)
    
    return jsonify({
        'videos': videos,
        'has_more': len(videos) >= 20 # Approximation
    })