# Upgrade Log

## 2026-04-10 07:00 - [Bug Fix / UX] Fix video player error UI crash + implement subtitle auto-scroll
Fixed a JS `TypeError` in `onPlayerError` where `document.getElementById('error-message')` returned `null` (the element was missing from the HTML), crashing silently on every embedding-restricted video — the most common error users encounter. Added `id="error-title"` and `id="error-message"` elements to the error overlay and updated `onPlayerError` to populate them with error-code-specific messages (cases 2, 5, 100, 101/150). Also implemented the long-standing TODO in `updateActiveSubtitle`: the subtitle sidebar now smoothly scrolls to centre the currently playing line on every subtitle transition, using a first-change guard to avoid redundant `scrollTo` calls.

## 2026-04-10 06:00 - [Code Quality] Replace file-based debug logging with Python logging module
Removed the custom `YouTubeService.log_debug()` method that appended raw text to `debug_log.txt` on every API call, replacing all 10 call sites with proper `logger.debug/info/warning/error()` calls using a module-level `logging.getLogger(__name__)`. Configured `basicConfig` in the app factory so log output is formatted and routed correctly. Also fixed a critical `NameError` bug in `video.py` where `jsonify` was used in the `record-session` endpoint but missing from the Flask imports.

## 2026-04-10 05:30 - [Feature/Vocabulary] Pronunciation guide in vocabulary review
Replaced the "Pronunciation Loading..." placeholder in the SRS review flashcards with real browser-based pronunciation via the Web Speech API (no new dependencies). Each card now auto-pronounces the word when it appears, shows the phonetic transcription and POS badge when available, and has a speaker button for manual replay. Added an "Auto-pronounce" toggle so users can turn it off. Also fixed the card-advance logic to correctly show a styled completion screen (with "Review Again" and "Back to Wordbook" CTAs) when all due words have been rated, and improved quality buttons with descriptive labels (Blank/Wrong/Hard/OK/Good/Easy).

## 2026-04-10 00:04 - [UI/UX] Auto-dismissing toast notifications for flash messages
Replaced the static blue-banner flash message system in base.html with animated, auto-dismissing toast notifications positioned at the bottom-right. Toasts slide in on page load, auto-dismiss after 4.5s, and are color-coded by category (red=error, green=success, yellow=warning, blue=default). Updated all flash() calls in auth.py, channels.py, video.py, and vocabulary.py to pass appropriate categories so every user-facing action now gives clear visual feedback.

## 2026-04-10 00:03 - [Dashboard] Word of the Day widget
Added a prominent gradient banner to the dashboard that surfaces one vocabulary word per day (deterministic: same word all day, different each day via date+profile MD5 seed). Shows word, phonetic, POS badge, Korean meaning, and example sentence, with a direct "Review Now" CTA. Falls back to an empty-state CTA when the user's wordbook is empty.

## 2026-04-10 00:02 - [UI/UX] Mobile-responsive hamburger navigation
Replaced the single-row desktop-only nav in base.html with a responsive layout: desktop keeps the original horizontal links, while mobile gets a hamburger button that toggles a full-width dropdown menu via vanilla JS. Affects every page and every mobile user.

## 2026-04-10 00:01 - [Feature/Vocabulary] Export vocabulary to CSV + fix Remove button
Added a working "Export CSV" button to the vocabulary list that downloads all saved words (word, phonetic, meaning, POS, example, status, next review date) as a timestamped .csv file. Also fixed the broken "Remove" link (was href="#") by adding a POST route that safely deletes the word from the user's wordbook with a confirmation prompt.

## 2026-04-10 00:00 - [UI/Dashboard] Fix dashboard to display real live stats
Replaced hardcoded placeholder values (15 min, 42 words, 85%) on the dashboard with real data queried from the DB: today's watched minutes vs. daily goal (with dynamic progress bar), actual mastered word count, and average quiz score. Also added a Recent Activity section showing the last 5 learning sessions.
