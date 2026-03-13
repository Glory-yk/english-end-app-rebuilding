# Agent 05: SRS Engine (srs-engine)

## 역할
SM-2 간격 반복 알고리즘 구현, 단어장 관리, 복습 스케줄링, 플래시카드 시스템

## 우선순위: ★★★★☆ (Phase 2 핵심 — 학습 효과의 핵심)

## 담당 파일

### Backend
```
english-learning-api/src/
├── vocabulary/
│   ├── vocabulary.module.ts
│   ├── vocabulary.controller.ts
│   ├── vocabulary.service.ts
│   ├── srs/
│   │   ├── sm2.service.ts            # SM-2 알고리즘 핵심
│   │   └── sm2.service.spec.ts       # 단위 테스트 (필수)
│   └── dto/
│       ├── save-word.dto.ts
│       └── review-result.dto.ts
```

### Frontend
```
english-learning-app/src/
├── utils/srs.ts                      # SM-2 클라이언트 복사본 (오프라인용)
├── hooks/
│   ├── useSRS.ts                     # SRS 상태 관리 훅
│   └── useFlashcardSwipe.ts          # 카드 스와이프 제스처
├── stores/useVocabStore.ts           # 단어장 상태
├── components/learning/
│   ├── FlashCard.tsx                 # 플래시카드 UI
│   └── ProgressRing.tsx              # 학습 진도 표시
```

## SM-2 알고리즘 명세

### 핵심 공식

```typescript
interface SM2Result {
  easeFactor: number;     // 다음 ease factor (최소 1.3)
  interval: number;       // 다음 복습까지 일수
  repetitions: number;    // 연속 성공 횟수
  nextReview: Date;       // 다음 복습 날짜
  status: 'new' | 'learning' | 'review' | 'mastered';
}

function calculateSM2(
  quality: number,        // 0~5 (0=완전모름, 5=완벽)
  prevEaseFactor: number, // 이전 EF (기본 2.5)
  prevInterval: number,   // 이전 간격 (일)
  prevRepetitions: number // 이전 반복 횟수
): SM2Result {

  // 1. Ease Factor 계산
  let ef = prevEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  ef = Math.max(1.3, ef);  // 최소 1.3

  // 2. 간격 계산
  let interval: number;
  let repetitions: number;

  if (quality < 3) {
    // 실패 → 처음부터 다시
    repetitions = 0;
    interval = 0;  // 즉시 복습
  } else {
    repetitions = prevRepetitions + 1;
    if (repetitions === 1) {
      interval = 1;       // 첫 성공: 1일 후
    } else if (repetitions === 2) {
      interval = 6;       // 두 번째: 6일 후
    } else {
      interval = Math.round(prevInterval * ef);
    }
  }

  // 3. 상태 결정
  let status: string;
  if (repetitions === 0) status = 'learning';
  else if (interval < 21) status = 'review';
  else status = 'mastered';

  return {
    easeFactor: ef,
    interval,
    repetitions,
    nextReview: addDays(new Date(), interval),
    status,
  };
}
```

### 사용자 평가 매핑

| UI 버튼 | quality 값 | 의미 |
|---------|-----------|------|
| 모름 (Again) | 0 | 전혀 기억 못함 → 즉시 재복습 |
| 어려움 (Hard) | 3 | 겨우 기억 → 간격 짧게 |
| 보통 (Good) | 4 | 약간 고민 후 기억 → 정상 간격 |
| 쉬움 (Easy) | 5 | 즉시 기억 → 간격 늘림 |

## 복습 스케줄링 로직

### 오늘의 복습 목록 조회
```sql
SELECT uv.*, v.word, v.meaning_ko, v.phonetic, v.example_en
FROM user_vocabulary uv
JOIN vocabulary v ON uv.vocabulary_id = v.id
WHERE uv.profile_id = :profileId
  AND uv.next_review <= NOW()
  AND uv.status != 'mastered'
ORDER BY uv.next_review ASC
LIMIT 20;
```

### 복습 우선순위
1. `status = 'learning'` (실패한 단어) — 최우선
2. `next_review`가 오래된 순서 — 밀린 복습 먼저
3. 같은 날이면 `ease_factor`가 낮은 순서 — 어려운 단어 먼저

## 플래시카드 UX 설계

```
┌─────────────────────────────────┐
│         앞면 (Front)              │
│                                  │
│        accomplish                │
│     /əˈkɑːm.plɪʃ/               │
│                                  │
│        🔊 발음 재생               │
│                                  │
│      [탭하여 뒤집기]              │
└─────────────────────────────────┘
          ↓ 탭 ↓
┌─────────────────────────────────┐
│         뒷면 (Back)              │
│                                  │
│    달성하다, 성취하다 (verb)       │
│                                  │
│   "She accomplished her goal."   │
│   "그녀는 목표를 달성했다."        │
│                                  │
│   출처: [영상 제목] 02:34         │
│                                  │
│ ┌──────┬──────┬──────┬──────┐   │
│ │ 모름  │어려움 │ 보통  │ 쉬움  │   │
│ │ ←    │  ↑   │      │  →   │   │
│ └──────┴──────┴──────┴──────┘   │
└─────────────────────────────────┘
```

### 스와이프 제스처 (Reanimated 3)
- **← 좌 스와이프**: 모름 (quality=0) → 빨간 피드백
- **→ 우 스와이프**: 쉬움 (quality=5) → 초록 피드백
- **↑ 위 스와이프**: 어려움 (quality=3) → 노란 피드백
- **탭**: 보통 (quality=4) → 기본 피드백

## 오프라인 동기화

```
[온라인 복습] → 서버 SM-2 계산 → DB 즉시 반영
[오프라인 복습] → 로컬 SM-2 계산 → AsyncStorage 저장
[온라인 복귀] → 서버와 동기화 (서버 우선, conflict 시 last_reviewed 비교)
```

### 동기화 규칙
1. 서버 데이터가 truth (권위)
2. 오프라인 복습 기록은 `pendingReviews` 배열에 저장
3. 온라인 복귀 시 `POST /vocabulary/sync` 배치 전송
4. 충돌 시: `last_reviewed`가 더 최근인 쪽 채택

## 통계 데이터

| 지표 | 계산 방식 |
|------|----------|
| 총 학습 단어 수 | COUNT(user_vocabulary) WHERE profile_id |
| 마스터한 단어 | COUNT WHERE status = 'mastered' |
| 오늘 복습한 단어 | COUNT WHERE last_reviewed = TODAY |
| 평균 정답률 | AVG(quality >= 3) over recent 30 reviews |
| 연속 학습일 | 연속된 last_reviewed 날짜 카운트 |
| 다음 복습 예정 | COUNT WHERE next_review = TOMORROW |

## 의존 관계
- **의존하는 Agent**: database (user_vocabulary 엔티티), backend-api (API 구조)
- **의존받는 Agent**: frontend-app (FlashCard 컴포넌트 소비), kids-mode (유아 복습)

## 완료 기준
- [ ] sm2.service.ts: SM-2 알고리즘 구현 + 엣지 케이스 처리
- [ ] sm2.service.spec.ts: 최소 15개 테스트 케이스
  - quality 0~5 각각에 대한 결과 검증
  - ease_factor 최솟값 (1.3) 보장
  - 연속 실패 시 리셋 확인
  - 장기 간격 계산 정확성
- [ ] vocabulary.service.ts: 복습 목록 조회 + 결과 제출
- [ ] 프론트 srs.ts: 서버와 동일한 SM-2 로직
- [ ] FlashCard.tsx: 스와이프 제스처 + 애니메이션
- [ ] useVocabStore.ts: 단어장 상태 + 오프라인 큐
- [ ] 통계 API: /vocabulary/stats 엔드포인트
