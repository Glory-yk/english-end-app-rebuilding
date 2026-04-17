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

def _ensure_indexes(app):
    """Create performance indexes on existing tables using IF NOT EXISTS.

    SQLAlchemy's db.create_all() only creates indexes on new tables, so this
    function runs idempotent CREATE INDEX IF NOT EXISTS statements at startup
    to cover databases that were created before the Index() objects were added
    to the models.
    """
    from sqlalchemy import text
    stmts = [
        "CREATE INDEX IF NOT EXISTS idx_uv_profile ON user_vocabulary(profile_id)",
        "CREATE INDEX IF NOT EXISTS idx_uv_profile_review ON user_vocabulary(profile_id, next_review)",
        "CREATE INDEX IF NOT EXISTS idx_uv_profile_status ON user_vocabulary(profile_id, status)",
        "CREATE INDEX IF NOT EXISTS idx_ls_profile ON learning_sessions(profile_id)",
        "CREATE INDEX IF NOT EXISTS idx_ls_profile_created ON learning_sessions(profile_id, created_at)",
        "CREATE INDEX IF NOT EXISTS idx_ls_video ON learning_sessions(video_id)",
    ]
    with app.app_context():
        for stmt in stmts:
            try:
                db.session.execute(text(stmt))
            except Exception:
                db.session.rollback()
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()


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

    _ensure_indexes(app)

    @app.context_processor
    def inject_global_due_count():
        """Inject due-review word count into every template (authenticated users only)."""
        from flask_login import current_user
        from datetime import datetime

        if not current_user.is_authenticated:
            return {'global_due_count': 0}
        try:
            from app.models.profile import Profile
            from app.models.vocabulary import UserVocabulary
            profile = Profile.query.filter_by(user_id=current_user.id).first()
            if not profile:
                return {'global_due_count': 0}
            due = UserVocabulary.query.filter(
                UserVocabulary.profile_id == profile.id,
                UserVocabulary.next_review <= datetime.utcnow()
            ).count()
            return {'global_due_count': due}
        except Exception:
            return {'global_due_count': 0}

    return app