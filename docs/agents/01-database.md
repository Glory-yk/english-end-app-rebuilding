# Agent 01: Database (database)

## 역할
PostgreSQL 스키마 설계, TypeORM 엔티티 정의, 마이그레이션 관리, 시드 데이터 구성

## 우선순위: ★★★★★ (최우선 — 모든 Agent의 기반)

## 담당 파일

```
english-learning-api/
├── src/
│   ├── users/entities/user.entity.ts
│   ├── profiles/entities/profile.entity.ts
│   ├── videos/entities/
│   │   ├── video.entity.ts
│   │   └── subtitle.entity.ts
│   ├── vocabulary/entities/
│   │   ├── vocabulary.entity.ts
│   │   └── user-vocabulary.entity.ts
│   ├── quiz/entities/quiz.entity.ts
│   ├── progress/entities/learning-session.entity.ts
│   └── config/database.config.ts
├── database/
│   ├── migrations/
│   │   ├── 001-create-users.ts
│   │   ├── 002-create-profiles.ts
│   │   ├── 003-create-videos.ts
│   │   ├── 004-create-subtitles.ts
│   │   ├── 005-create-vocabulary.ts
│   │   ├── 006-create-user-vocabulary.ts
│   │   ├── 007-create-learning-sessions.ts
│   │   └── 008-create-quizzes.ts
│   └── seeds/
│       ├── sample-videos.seed.ts
│       └── sample-vocabulary.seed.ts
```

## 스키마 명세

### users
| 컬럼 | 타입 | 제약 |
|------|------|------|
| id | UUID | PK, gen_random_uuid() |
| email | VARCHAR(255) | UNIQUE |
| password_hash | VARCHAR(255) | nullable (소셜 로그인) |
| provider | VARCHAR(20) | 'local' / 'google' / 'kakao' / 'apple' |
| provider_id | VARCHAR(255) | nullable |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### profiles
| 컬럼 | 타입 | 제약 |
|------|------|------|
| id | UUID | PK |
| user_id | UUID | FK → users(id) |
| name | VARCHAR(100) | NOT NULL |
| type | VARCHAR(10) | 'child' / 'adult' |
| age_group | VARCHAR(10) | '1y' / '3y' / '6y' / 'adult' |
| level | VARCHAR(10) | DEFAULT 'beginner' |
| avatar_url | VARCHAR(500) | nullable |
| daily_goal_min | INT | DEFAULT 20 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### videos
| 컬럼 | 타입 | 제약 |
|------|------|------|
| id | UUID | PK |
| youtube_id | VARCHAR(20) | UNIQUE, NOT NULL |
| title | VARCHAR(500) | NOT NULL |
| channel_name | VARCHAR(200) | |
| thumbnail_url | VARCHAR(500) | |
| duration_sec | INT | |
| difficulty | VARCHAR(10) | 'easy' / 'medium' / 'hard' |
| age_group | VARCHAR(10)[] | 배열 |
| category | VARCHAR(50) | |
| tags | VARCHAR(50)[] | 배열 |
| subtitle_lang | VARCHAR(10)[] | |
| view_count | INT | DEFAULT 0 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### subtitles
| 컬럼 | 타입 | 제약 |
|------|------|------|
| id | UUID | PK |
| video_id | UUID | FK → videos(id) |
| lang | VARCHAR(10) | 'en' / 'ko' |
| start_ms | INT | NOT NULL |
| end_ms | INT | NOT NULL |
| text | TEXT | NOT NULL |
| words_json | JSONB | [{word, pos, meaning_ko, phonetic}] |

**인덱스**: `(video_id, start_ms)` — 자막 동기화 조회 성능

### vocabulary
| 컬럼 | 타입 | 제약 |
|------|------|------|
| id | UUID | PK |
| word | VARCHAR(100) | NOT NULL |
| phonetic | VARCHAR(200) | |
| meaning_ko | TEXT | NOT NULL |
| pos | VARCHAR(20) | 'noun' / 'verb' / 'adj' ... |
| example_en | TEXT | |
| example_ko | TEXT | |
| difficulty | INT | DEFAULT 1 (1-5) |
| audio_url | VARCHAR(500) | |

**UNIQUE**: `(word, pos)`

### user_vocabulary (SM-2 SRS 필드 포함)
| 컬럼 | 타입 | 제약 |
|------|------|------|
| id | UUID | PK |
| profile_id | UUID | FK → profiles(id) |
| vocabulary_id | UUID | FK → vocabulary(id) |
| source_video | UUID | FK → videos(id) |
| ease_factor | FLOAT | DEFAULT 2.5 |
| interval_days | INT | DEFAULT 0 |
| repetitions | INT | DEFAULT 0 |
| next_review | TIMESTAMPTZ | DEFAULT NOW() |
| last_reviewed | TIMESTAMPTZ | |
| status | VARCHAR(10) | 'new' / 'learning' / 'review' / 'mastered' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

**UNIQUE**: `(profile_id, vocabulary_id)`

### learning_sessions
| 컬럼 | 타입 | 제약 |
|------|------|------|
| id | UUID | PK |
| profile_id | UUID | FK → profiles(id) |
| video_id | UUID | FK → videos(id) |
| watched_sec | INT | |
| words_learned | INT | DEFAULT 0 |
| quiz_score | FLOAT | |
| completed | BOOLEAN | DEFAULT FALSE |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### quizzes
| 컬럼 | 타입 | 제약 |
|------|------|------|
| id | UUID | PK |
| video_id | UUID | FK → videos(id) |
| profile_id | UUID | FK → profiles(id) |
| type | VARCHAR(20) | 'fill_blank' / 'listening' / 'arrange' / 'match' |
| question | JSONB | {prompt, options, answer, hint} |
| difficulty | INT | DEFAULT 1 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

## 구현 규칙

1. TypeORM 엔티티에 `@Index` 데코레이터로 성능 인덱스 반드시 명시
2. 관계는 `@ManyToOne`, `@OneToMany`로 명시적 정의
3. 마이그레이션은 순서대로 번호 부여, 롤백 가능하게 `down()` 구현
4. JSONB 필드 (`words_json`, `question`)는 TypeScript 인터페이스 별도 정의
5. UUID는 `uuid` 타입 + `gen_random_uuid()` 사용
6. 시드 데이터는 실제 YouTube 영상 ID 기반 샘플 최소 10개

## 의존 관계
- **의존하는 Agent**: 없음 (기반 레이어)
- **의존받는 Agent**: backend-api, subtitle-ai, srs-engine, kids-mode

## 완료 기준
- [ ] 8개 테이블 TypeORM 엔티티 완성
- [ ] 마이그레이션 파일 8개 생성 + 실행 확인
- [ ] database.config.ts 환경별 설정 (dev/staging/prod)
- [ ] 시드 데이터 생성 스크립트
- [ ] 모든 FK 관계 + 인덱스 검증
