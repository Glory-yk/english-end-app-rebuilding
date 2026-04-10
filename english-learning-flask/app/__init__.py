import logging
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from flask_htmx import HTMX
from config import Config

db = SQLAlchemy()
migrate = Migrate()
login = LoginManager()
login.login_view = 'auth.login'
htmx = HTMX()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s %(levelname)s %(name)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S',
    )

    db.init_app(app)
    migrate.init_app(app, db)
    login.init_app(app)
    htmx.init_app(app)

    # Register Blueprints
    from app.routes.main import main_bp
    from app.routes.auth import auth_bp
    from app.routes.video import video_bp
    from app.routes.vocabulary import vocab_bp
    from app.routes.kids import kids_bp
    from app.routes.quiz import quiz_bp
    from app.routes.channels import channels_bp
    
    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(video_bp, url_prefix='/video')
    app.register_blueprint(vocab_bp, url_prefix='/vocab')
    app.register_blueprint(kids_bp, url_prefix='/kids')
    app.register_blueprint(quiz_bp, url_prefix='/quiz')
    app.register_blueprint(channels_bp, url_prefix='/channels')

    return app