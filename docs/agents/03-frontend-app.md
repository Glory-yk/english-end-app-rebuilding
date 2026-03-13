# Agent 03: Frontend App (frontend-app)

## 역할
Expo/React Native 모바일 앱의 화면, 컴포넌트, 네비게이션, 상태관리, API 연동

## 우선순위: ★★★★★ (핵심 — 백엔드와 병렬 진행)

## 담당 파일

```
english-learning-app/
├── app/                              # Expo Router v4
│   ├── _layout.tsx                   # 루트 레이아웃
│   ├── index.tsx                     # 스플래시
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── social.tsx
│   ├── (onboarding)/
│   │   ├── profile-select.tsx
│   │   ├── age-group.tsx
│   │   └── level-test.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx               # 하단 탭바
│   │   ├── home.tsx
│   │   ├── explore.tsx
│   │   ├── words.tsx
│   │   ├── quiz.tsx
│   │   └── stats.tsx
│   ├── learn/
│   │   ├── [videoId].tsx             # 영상 학습 (핵심)
│   │   └── shadowing/[videoId].tsx
│   ├── review/
│   │   ├── flashcard.tsx
│   │   └── result.tsx
│   └── settings/
│       ├── index.tsx
│       ├── profiles.tsx
│       └── parental.tsx
├── src/
│   ├── components/
│   │   ├── ui/                       # Button, Card, Badge, Modal, Loading
│   │   ├── video/
│   │   │   ├── YouTubePlayer.tsx
│   │   │   ├── SubtitleOverlay.tsx
│   │   │   ├── WordPopup.tsx
│   │   │   └── LoopControl.tsx
│   │   └── learning/
│   │       ├── FlashCard.tsx
│   │       ├── QuizCard.tsx
│   │       ├── ProgressRing.tsx
│   │       └── StreakBadge.tsx
│   ├── stores/                       # Zustand
│   │   ├── useAuthStore.ts
│   │   ├── useProfileStore.ts
│   │   ├── useVideoStore.ts
│   │   ├── useVocabStore.ts
│   │   └── useLearningStore.ts
│   ├── services/                     # API 호출
│   │   ├── api.ts                    # Axios 인스턴스
│   │   ├── authService.ts
│   │   ├── videoService.ts
│   │   ├── vocabService.ts
│   │   ├── quizService.ts
│   │   └── progressService.ts
│   ├── hooks/
│   │   ├── useSubtitleSync.ts        # 영상-자막 동기화
│   │   ├── useFlashcardSwipe.ts
│   │   ├── useSRS.ts
│   │   └── useAudio.ts
│   ├── utils/
│   │   ├── srs.ts                    # SM-2 (오프라인 백업)
│   │   ├── time.ts
│   │   └── storage.ts               # AsyncStorage 래퍼
│   ├── constants/
│   │   ├── theme.ts
│   │   ├── ageGroups.ts
│   │   └── categories.ts
│   └── types/
│       ├── user.ts
│       ├── video.ts
│       ├── vocabulary.ts
│       └── quiz.ts
├── app.json
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## 기술 스택

| 라이브러리 | 버전 | 용도 |
|-----------|------|------|
| Expo SDK | 52 | 기반 프레임워크 |
| Expo Router | v4 | 파일 기반 네비게이션 |
| Zustand | latest | 전역 상태관리 |
| react-native-youtube-iframe | latest | YouTube 재생 |
| React Native Reanimated | 3 | 60fps 애니메이션 |
| Nativewind | v4 | Tailwind 스타일링 |
| expo-secure-store | latest | JWT 보안 저장 |
| expo-image | latest | 이미지 최적화 |

## 화면 구성 (6개 메인 탭)

### 홈 (Home)
- 추천 영상 피드 (FlatList → FlashList 최적화)
- 오늘의 학습 요약 카드
- 연속 학습일 (Streak) 배지
- 빠른 복습 버튼

### 탐색 (Explore)
- 검색바 (YouTube 검색 연동)
- 카테고리 필터 (가로 스크롤 칩)
- 난이도 필터
- 인기 영상 그리드

### 영상 학습 (Learn) — ★ 핵심 화면
- YouTube Player (상단 50%)
- 실시간 자막 오버레이 (하단)
- 한/영 전환 토글
- 단어 탭 → WordPopup (뜻, 발음, 예문)
- 저장 버튼 → SRS 큐 추가
- 구간 반복 (LoopControl)

### 단어장 (Words)
- 저장된 단어 목록 (검색, 필터)
- SRS 상태별 분류 탭 (new/learning/review/mastered)
- 플래시카드 복습 진입

### 퀴즈 (Quiz)
- 빈칸 채우기, 듣기 퀴즈, 문장 배열
- 결과 화면 + 오답 복습

### 통계 (Stats)
- 학습 시간 그래프 (주간/월간)
- 단어 성장 추이
- 연속 학습일 캘린더

## 핵심 훅 설계

### useSubtitleSync(subtitles, currentTime)
```typescript
// 이진탐색으로 O(log n) 자막 검색
// YouTube Player의 onStateChange 이벤트 기반
// 반환: { currentSubtitle, nextSubtitle, progress }
```

### useFlashcardSwipe()
```typescript
// Reanimated 3 + Gesture Handler
// 좌(모름) / 우(쉬움) / 위(어려움) 스와이프
// UI 스레드 애니메이션, JS 스레드 차단 없음
```

## 성능 최적화 규칙

1. 영상 목록: `FlashList` 사용 (FlatList 대비 5x 빠름)
2. 썸네일: `expo-image` + 적절한 크기 파라미터 (mqdefault)
3. 자막 동기화: `requestAnimationFrame` 아닌 이벤트 기반
4. 유아 모드 컴포넌트: `React.lazy` + `Suspense`로 코드 스플리팅
5. 번들 사이즈: tree-shaking 활용, 불필요한 import 제거

## 의존 관계
- **의존하는 Agent**: backend-api (API 스펙), database (타입 정의)
- **의존받는 Agent**: kids-mode (공통 컴포넌트 활용)

## 완료 기준
- [ ] Expo 프로젝트 초기화 + Expo Router 설정
- [ ] 6개 탭 화면 기본 레이아웃
- [ ] Auth 플로우 (로그인/회원가입/소셜) UI + API 연동
- [ ] 온보딩 플로우 UI
- [ ] YouTube Player + SubtitleOverlay 구현
- [ ] WordPopup + 단어 저장 플로우
- [ ] Zustand 스토어 5개 구현
- [ ] API 서비스 레이어 구현
- [ ] useSubtitleSync 훅 (이진탐색 자막 동기화)
