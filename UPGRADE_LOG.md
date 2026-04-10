# Upgrade Log

## 2026-04-10 16:30 - [Feature] Vocabulary Challenge quiz from personal wordbook
Added a fully functional multiple-choice vocabulary quiz (`/quiz/vocab-challenge`) that pulls up to 10 random words from the user's wordbook, presents each English word with 4 Korean-meaning options (1 correct + 3 random distractors), gives instant color-coded feedback, pronounces words via Web Speech API, supports keyboard shortcuts (1–4 choose, Enter next, R replay), and shows a scored results screen with a missed-words review list. The Quiz Hub index was redesigned to showcase the new quiz as a prominent gradient card with a word-count guard (requires ≥4 words) and the quiz route now passes `word_count` to the template.

## 2026-04-10 15:30 - [Learning Mode] Grammar pattern extraction from video subtitles
Added a dedicated Grammar Pattern Analysis page (`/video/<id>/grammar`) that scans a video's subtitle lines with regex and groups real in-context examples into six categories: Modal Verbs, Passive Voice, Conditional Sentences, Present Perfect, Comparatives & Superlatives, and Question Forms. Each example highlights the matched phrase in yellow using HTML-safe server-side rendering (`markupsafe`). A summary banner shows the number of pattern types found, total examples, and subtitle lines scanned. An empty state is shown for videos with too few subtitles. A green "📖 Grammar Patterns" button was added to the video detail page button row alongside the existing learning mode buttons.

## 2026-04-10 14:00 - [Learning Mode] Listening comprehension mode for videos
Added a dedicated Listening Mode page (`/video/<id>/listen`) where subtitles are hidden by default so users practise understanding the spoken audio without text support. Users can toggle the full transcript on/off at any time via a "Reveal Subtitles" button (or the `S` keyboard shortcut), and the visible transcript syncs a highlighted active line to the playback position. After watching, a "Rate Understanding" panel lets users self-assess comprehension on a 1–5 emoji scale (Almost nothing → Fully understood), saving the session to their stats. Watch time is recorded every 30 s just like the main player. A teal "👂 Listening Mode" button was added first in the button row on every video detail page.

## 2026-04-10 13:00 - [Learning Mode] Sentence shadowing practice for subtitle lines
Added a dedicated Shadowing Practice page (`/video/<id>/shadowing`) where users listen to each subtitle line via the browser's Web Speech API and then speak it aloud to shadow the speaker's rhythm and intonation. The page shows one line at a time: a large Play button triggers TTS, the user shadows during a prompted "Speak it aloud now…" phase, then clicks Reveal to see the text and self-assesses with "Got it ✓" or "↺ Try Again". A running accuracy score (lines nailed / lines revealed), progress bar, and completion screen are included. Keyboard shortcuts (Space=play/next, R=reveal, G=got it, T=try again) keep the session hands-free. A "Shadowing Practice" button was added alongside the existing Dictation Practice button on every video detail page.

## 2026-04-10 12:00 - [New Feature] Pomodoro study timer on video detail page
Added a collapsible Pomodoro timer widget to the video detail page (🍅 button next to Dictation Practice). Clicking the button expands a compact panel showing a colour-coded countdown (red for 25-min Focus, green for 5-min Short Break, blue for 15-min Long Break after every 4 pomodoros), an animated progress bar, a session counter, and Start/Pause/Reset controls. Phase transitions play a Web Audio API beep and auto-start the next phase; the browser tab title mirrors the current countdown so users can glance at it without switching windows. Zero backend changes required.

## 2026-04-10 11:00 - [Learning Mode] Dictation practice mode for subtitle lines
Added a dedicated Dictation Practice page (`/video/<id>/dictation`) that reads each subtitle line aloud via the browser's Web Speech API, prompts the user to type what they heard, then highlights correct (green) vs incorrect/missing (red strikethrough) words with a per-line and running cumulative accuracy score. A "Dictation Practice" button on every video detail page links straight to it; keyboard shortcuts (Space to play, Enter to check/next, R to replay) keep hands off the mouse throughout the session.

## 2026-04-10 10:00 - [Gamification] Daily learning streak tracker on dashboard + stats
Added a consecutive-day learning streak counter computed from existing LearningSession data (no schema change). Displayed as a 4th stat card on both the dashboard and the analytics page, with a flickering flame animation, color-coded borders (gray → red → yellow → orange), and motivational copy that escalates from "come back tomorrow" through "you're on fire!" to "Legendary streak!". The dashboard grid was also widened to 4 columns (responsive: 1→2→4) to accommodate the new card without crowding.

## 2026-04-10 09:00 - [Accessibility/UX] Keyboard shortcuts for vocabulary flashcard review
Added keyboard shortcuts to the SRS review page so users never need to reach for the mouse: Space (or →) reveals the answer, keys 1–6 submit quality ratings 0–5, and R replays the word's pronunciation. A discoverable hint bar below the card deck labels all three shortcuts using styled `<kbd>` elements. Input-focused elements are guarded so shortcuts don't fire while the user types in the auto-pronounce toggle checkbox area.

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

## 2026-04-10 08:00 - [UI/Dashboard] Add due-words review reminder banner + badge counter
Added an amber notification banner at the top of the dashboard that shows when SRS review words are due, with a direct "Review Now" CTA. Also added a red badge counter on the "Review Vocabulary" quick-action button. Wired up `due_count` query in `main.py` and merged alongside the Word of the Day and real-stats work already in place.
