# Project Rebuilding Plan: English Learning App (Python/Flask)

## 1. Overview
The goal is to rebuild the existing NestJS/Expo-based English learning application into a unified web application using **Python** and **Flask**. This will simplify the architecture by moving to a monolithic (or modular monolith) approach while maintaining all core features like YouTube-based learning, SRS vocabulary management, and AI-powered subtitle processing.

### Tech Stack
- **Backend:** Python 3.11+
- **Web Framework:** Flask
- **Database:** PostgreSQL (Managed via Flask-SQLAlchemy)
- **Frontend:** Flask Templates (Jinja2) + Tailwind CSS + HTMX (for modern, SPA-like interactivity)
- **Task Queue:** Celery + Redis (for asynchronous AI processing and subtitle scraping)
- **AI/ML:** OpenAI API (for quiz generation/analysis) + Transformers (for punctuation)
- **Authentication:** Flask-Login & Flask-Security-Too

---

## 2. Architecture & Directory Structure
```text
english-learning-flask/
├── app/
│   ├── static/             # CSS (Tailwind), JS (HTMX), Images
│   ├── templates/          # Jinja2 Templates (Base, Auth, Video, Quiz, etc.)
│   ├── models/             # SQLAlchemy Entities
│   ├── routes/             # Blueprints (auth, main, video, vocabulary, kids)
│   ├── services/           # Business logic (SRS engine, AI pipeline, YouTube scraper)
│   ├── utils/              # Helpers (YouTube API, Validators)
│   └── __init__.py         # App factory setup
├── migrations/             # Flask-Migrate (Alembic)
├── tasks/                  # Celery tasks
├── tests/                  # Pytest suite
├── .env                    # Environment variables
├── config.py               # App configuration
├── celery_worker.py        # Celery entry point
└── run.py                  # App entry point
```

---

## 3. Database Migration (PostgreSQL)
We will replicate the existing schema but adapt it for SQLAlchemy models.
- **Users & Profiles:** Handle multi-profile support (Adult/Child).
- **Videos:** Store YouTube metadata and difficulty levels.
- **Subtitles:** JSONB storage for words and timing.
- **Vocabulary:** Central dictionary and user-specific SRS records.
- **SRS Fields:** `ease_factor`, `interval_days`, `repetitions`, `next_review`.

---

## 4. Implementation Phases

### Phase 1: Core Setup & Authentication
- Initialize Flask project with Blueprints.
- Set up PostgreSQL connection and Flask-Migrate.
- Implement User and Profile models.
- Build login/register views and profile selection UI.

### Phase 2: Video & Subtitle Pipeline
- Integrate YouTube caption scraping (`youtube-transcript-api`).
- Port the existing `punctuate.py` logic into a Python service.
- Implement video detail views and subtitle synchronization logic in the frontend.

### Phase 3: SRS & Vocabulary Management
- Implement the **SM-2 (Spaced Repetition)** algorithm in Python.
- Create views for adding words from subtitles to personal wordbooks.
- Build the "Review" interface (Flashcards) using HTMX for smooth transitions.

### Phase 4: Quiz & Progress Tracking
- Implement AI-driven quiz generation (Fill-in-the-blanks, Listening).
- Track learning sessions and update user progress statistics.
- Create a dashboard for learning history.

### Phase 5: Kids Mode & UI Polishing
- Build a simplified, visual-heavy UI for children (`/kids` route).
- Apply Tailwind CSS themes for both Adult (Professional) and Kids (Playful) modes.
- Implement parental controls and age-appropriate content filtering.

### Phase 6: AI Integration & Optimization
- Integrate OpenAI/Claude for advanced subtitle analysis.
- Set up Celery for background processing of new videos (scraping -> punctuation -> translation).
- Optimize database queries and caching with Redis.

---

## 5. Key Improvements
1. **Developer Experience:** Unified Python codebase for both backend and AI scripts.
2. **Simplified Deployment:** Single Flask application instead of separate API and App services.
3. **SEO & Performance:** Server-side rendering (SSR) for faster initial loads and better SEO.
4. **Interactivity:** Using HTMX to provide a mobile-app-like feel without the complexity of a full JS framework.

---

## 6. Next Steps
1. [ ] Initialize the new directory `english-learning-flask`.
2. [ ] Set up the virtual environment and `requirements.txt`.
3. [ ] Define initial SQLAlchemy models based on `01-database.md`.
4. [ ] Begin Phase 1 implementation.
