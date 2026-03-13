from app import create_app, db
from app.models import user, profile, video, vocabulary, progress

app = create_app()

@app.shell_context_processor
def make_shell_context():
    return {'db': db, 'User': user.User, 'Profile': profile.Profile, 'Video': video.Video, 
            'Vocabulary': vocabulary.Vocabulary, 'LearningSession': progress.LearningSession}

if __name__ == '__main__':
    app.run(debug=True)
