# Agent 04: Subtitle & AI Pipeline (subtitle-ai)

## 역할
YouTube 자막 추출, Claude API 기반 자막 분석/난이도 분류, AI 퀴즈 자동 생성

## 우선순위: ★★★★☆ (핵심 — 학습 데이터의 원천)

## 담당 파일

```
english-learning-api/src/
├── external/
│   ├── external.module.ts
│   ├── youtube/
│   │   ├── youtube.service.ts        # YouTube Data API + 자막 추출
│   │   └── youtube.types.ts
│   ├── claude/
│   │   ├── claude.service.ts         # Claude API 래퍼
│   │   └── claude.types.ts
│   └── tts/
│       ├── tts.service.ts            # Google Cloud TTS
│       └── tts.types.ts
├── videos/processors/
│   └── subtitle.processor.ts         # Bull Queue 자막 파싱 워커
├── quiz/processors/
│   └── quiz-generator.processor.ts   # Bull Queue 퀴즈 생성 워커
```

## 자막 처리 파이프라인

```
POST /videos/import
       │
       v
┌─────────────────┐
│ Videos Service   │ → DB에 video 메타데이터 저장
│                  │ → Bull Queue에 'subtitle:parse' 작업 등록
└────────┬────────┘
         v
┌─────────────────────────────────────────────────────┐
│ SubtitleProcessor (@Processor('subtitle'))           │
│                                                      │
│ Step 1: youtube-captions-scraper                     │
│   → videoID + lang='en'으로 자막 추출                  │
│   → [{text, start, dur}, ...] 배열 획득               │
│                                                      │
│ Step 2: Claude API 분석 요청                          │
│   → 프롬프트: 핵심 단어 추출 + 한국어 뜻 + 난이도 평가    │
│   → JSON 응답 파싱                                    │
│                                                      │
│ Step 3: DB 저장                                      │
│   → subtitles 테이블에 타이밍+텍스트+words_json 저장    │
│   → vocabulary 테이블에 새 단어 upsert                 │
│                                                      │
│ Step 4: 난이도 자동 분류                               │
│   → 평균 난이도 계산 → video.difficulty 업데이트         │
│   → easy(≤2) / medium(≤3.5) / hard(>3.5)             │
└─────────────────────────────────────────────────────┘
```

## Claude API 프롬프트 설계

### 자막 분석 프롬프트
```
다음 영어 자막의 각 문장에서:
1. 핵심 단어를 추출하고 한국어 뜻을 제공
2. 품사(noun/verb/adj/adv/phrase)를 분류
3. 발음 기호(IPA)를 제공
4. 문장 난이도를 1-5로 평가
5. 한국인이 어려워할 문법 포인트 표시

자막: [자막 텍스트]

JSON 형식으로 응답:
{
  "sentences": [
    {
      "text": "원문",
      "difficulty": 3,
      "grammar_point": "현재완료 vs 과거시제",
      "words": [
        {
          "word": "accomplish",
          "pos": "verb",
          "phonetic": "/əˈkɑːm.plɪʃ/",
          "meaning_ko": "달성하다, 성취하다",
          "example_en": "She accomplished her goal.",
          "example_ko": "그녀는 목표를 달성했다.",
          "difficulty": 3
        }
      ]
    }
  ],
  "averageDifficulty": 2.8
}
```

### 퀴즈 생성 프롬프트
```
다음 영상 자막 내용을 기반으로 {age_group} / {level} 학습자에게 적합한 퀴즈 3문제를 생성하세요.

자막 내용: [자막 텍스트]
핵심 단어: [추출된 단어 목록]

퀴즈 유형:
1. fill_blank (빈칸 채우기) - 1문제
2. listening (듣기 퀴즈) - 1문제
3. arrange (문장 배열) - 1문제

JSON 형식:
{
  "quizzes": [
    {
      "type": "fill_blank",
      "prompt": "I want to ___ a new language.",
      "options": ["learn", "teach", "forget", "ignore"],
      "answer": "learn",
      "hint": "새로운 것을 배우다",
      "difficulty": 2
    }
  ]
}
```

## YouTube API 사용 최적화

| 작업 | API 비용 (units) | 캐싱 전략 |
|------|-----------------|----------|
| search.list | 100 units/req | Redis TTL 6h |
| videos.list | 1 unit/req | Redis TTL 24h |
| captions.list | 50 units/req | DB 영구 저장 |
| 자막 scraping | 0 (비공식) | DB 영구 저장 |

**일일 한도**: 10,000 units → 검색 최대 ~100회/일
**완화**: 인기 영상 사전 색인 + 사용자별 검색 횟수 제한

## Bull Queue 설정

```typescript
// subtitle queue
{
  name: 'subtitle',
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
  limiter: { max: 5, duration: 60000 }, // 분당 5개
}

// quiz queue
{
  name: 'quiz',
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: true,
  },
  limiter: { max: 10, duration: 60000 }, // 분당 10개
}
```

## 에러 핸들링

| 상황 | 대응 |
|------|------|
| 자막 없는 영상 | 사용자에게 "자막 없음" 안내, 해당 영상은 학습 불가 표시 |
| Claude API 타임아웃 | 3회 재시도 (지수 백오프), 실패 시 기본 단어 분석만 수행 |
| Claude API 파싱 에러 | JSON 파싱 실패 시 재요청 (stricter 프롬프트), 2회 실패 시 raw 텍스트 저장 |
| YouTube API 한도 초과 | 검색 비활성화 + "내일 다시 시도" 안내, 캐시된 결과만 제공 |

## 의존 관계
- **의존하는 Agent**: database (엔티티), backend-api (모듈 구조)
- **의존받는 Agent**: frontend-app (자막 데이터 소비), srs-engine (단어 데이터)

## 완료 기준
- [ ] youtube.service.ts: 검색 + 메타데이터 + 자막 추출
- [ ] claude.service.ts: 분석 + 퀴즈 생성 API 래퍼
- [ ] tts.service.ts: 단어/문장 음성 합성
- [ ] subtitle.processor.ts: 전체 파이프라인 (추출→분석→저장)
- [ ] quiz-generator.processor.ts: 퀴즈 생성 워커
- [ ] Redis 캐싱 레이어 (YouTube 검색 결과)
- [ ] 에러 핸들링 + 재시도 로직
- [ ] 단위 테스트 (Claude 모킹)
