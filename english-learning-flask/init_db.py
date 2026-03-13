from app import create_app, db
from app.models.user import User
from app.models.profile import Profile
from app.models.video import Video, Subtitle, Channel
from app.models.vocabulary import Vocabulary, UserVocabulary
from app.models.progress import LearningSession, Quiz

app = create_app()

def init_database():
    with app.app_context():
        # Create all tables
        db.create_all()
        print("Database tables created.")
        
        # Add a test user if it doesn't exist
        if not User.query.filter_by(email='test@example.com').first():
            user = User(email='test@example.com')
            user.set_password('password')
            db.session.add(user)
            db.session.flush()
            
            # Adult profile
            profile_adult = Profile(user_id=user.id, name='Test Adult', type='adult', age_group='adult')
            db.session.add(profile_adult)
            
            # Kids profile
            profile_kid = Profile(user_id=user.id, name='Test Kid', type='child', age_group='6y')
            db.session.add(profile_kid)
            
            db.session.commit()
            print("Test user created: test@example.com / password")
        else:
            print("Test user already exists.")

if __name__ == '__main__':
    init_database()