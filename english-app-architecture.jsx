import { useState } from "react";

const tabs = ["아키텍처", "기술스택", "앱 플로우", "DB 스키마", "API 설계", "개발 로드맵"];

const colors = {
  bg: "#0a0e17",
  card: "#111827",
  cardHover: "#1a2332",
  accent: "#3b82f6",
  accent2: "#8b5cf6",
  accent3: "#10b981",
  accent4: "#f59e0b",
  accent5: "#ef4444",
  text: "#e2e8f0",
  textDim: "#94a3b8",
  border: "#1e293b",
};

function Badge({ children, color = colors.accent }) {
  return (
    <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: color + "22", color, border: `1px solid ${color}44`, marginRight: 6, marginBottom: 4 }}>
      {children}
    </span>
  );
}

function Section({ title, children, icon }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
        {title}
      </h3>
      {children}
    </div>
  );
}

function CodeBlock({ children, title }) {
  return (
    <div style={{ background: "#0d1117", borderRadius: 10, border: `1px solid ${colors.border}`, overflow: "hidden", marginBottom: 16 }}>
      {title && <div style={{ padding: "8px 14px", borderBottom: `1px solid ${colors.border}`, fontSize: 11, color: colors.textDim, fontWeight: 600, letterSpacing: 0.5 }}>{title}</div>}
      <pre style={{ padding: 14, margin: 0, fontSize: 12, lineHeight: 1.6, color: "#c9d1d9", overflowX: "auto", fontFamily: "'SF Mono', 'Fira Code', monospace" }}>{children}</pre>
    </div>
  );
}

function FlowBox({ label, sub, color = colors.accent, arrow }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ background: color + "15", border: `1px solid ${color}40`, borderRadius: 10, padding: "10px 16px", minWidth: 120, textAlign: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: colors.textDim, marginTop: 3 }}>{sub}</div>}
      </div>
      {arrow && <span style={{ color: colors.textDim, fontSize: 18 }}>→</span>}
    </div>
  );
}

function ArchitectureTab() {
  return (
    <div>
      <Section title="시스템 아키텍처 개요" icon="🏗️">
        <div style={{ background: "#0d1117", borderRadius: 12, padding: 20, border: `1px solid ${colors.border}`, marginBottom: 16 }}>
          <div style={{ textAlign: "center", marginBottom: 16, fontSize: 12, color: colors.accent, fontWeight: 700, letterSpacing: 1 }}>HIGH-LEVEL ARCHITECTURE</div>
          
          {/* Client Layer */}
          <div style={{ background: colors.accent + "10", border: `1px solid ${colors.accent}30`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: colors.accent, marginBottom: 8 }}>📱 CLIENT LAYER</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Badge color={colors.accent}>React Native (Expo)</Badge>
              <Badge color={colors.accent}>Expo Router</Badge>
              <Badge color={colors.accent}>Zustand 상태관리</Badge>
              <Badge color={colors.accent}>react-native-youtube-iframe</Badge>
            </div>
          </div>

          <div style={{ textAlign: "center", color: colors.textDim, fontSize: 14, margin: "4px 0" }}>⬇️ REST API + WebSocket ⬇️</div>

          {/* API Layer */}
          <div style={{ background: colors.accent3 + "10", border: `1px solid ${colors.accent3}30`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: colors.accent3, marginBottom: 8 }}>⚡ API LAYER (NestJS)</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Badge color={colors.accent3}>Auth Module</Badge>
              <Badge color={colors.accent3}>Video Module</Badge>
              <Badge color={colors.accent3}>Learning Module</Badge>
              <Badge color={colors.accent3}>Quiz Module</Badge>
              <Badge color={colors.accent3}>Progress Module</Badge>
            </div>
          </div>

          <div style={{ textAlign: "center", color: colors.textDim, fontSize: 14, margin: "4px 0" }}>⬇️ ⬇️ ⬇️</div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {/* DB */}
            <div style={{ flex: 1, minWidth: 140, background: colors.accent2 + "10", border: `1px solid ${colors.accent2}30`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.accent2, marginBottom: 6 }}>💾 DATA</div>
              <Badge color={colors.accent2}>PostgreSQL</Badge>
              <Badge color={colors.accent2}>Redis Cache</Badge>
              <Badge color={colors.accent2}>TypeORM</Badge>
            </div>
            {/* External APIs */}
            <div style={{ flex: 1, minWidth: 140, background: colors.accent4 + "10", border: `1px solid ${colors.accent4}30`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.accent4, marginBottom: 6 }}>🌐 EXTERNAL</div>
              <Badge color={colors.accent4}>YouTube Data API</Badge>
              <Badge color={colors.accent4}>Claude API</Badge>
              <Badge color={colors.accent4}>Google TTS</Badge>
            </div>
            {/* AI */}
            <div style={{ flex: 1, minWidth: 140, background: colors.accent5 + "10", border: `1px solid ${colors.accent5}30`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.accent5, marginBottom: 6 }}>🤖 AI ENGINE</div>
              <Badge color={colors.accent5}>자막 분석</Badge>
              <Badge color={colors.accent5}>난이도 분류</Badge>
              <Badge color={colors.accent5}>퀴즈 생성</Badge>
            </div>
          </div>
        </div>
      </Section>

      <Section title="핵심 설계 원칙" icon="🎯">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
          {[
            { t: "YouTube 자막 기반 학습", d: "영상 자막을 추출하여 단어/문장 학습 자료로 자동 변환", c: colors.accent },
            { t: "연령별 맞춤 콘텐츠", d: "1세/3세/6세/성인 각각 다른 UI와 학습 경로 제공", c: colors.accent3 },
            { t: "간격 반복(SRS) 내장", d: "에빙하우스 망각곡선 기반 단어/표현 자동 복습 스케줄", c: colors.accent2 },
            { t: "AI 퀴즈 자동생성", d: "Claude API로 영상 내용 기반 맞춤형 퀴즈 생성", c: colors.accent4 },
          ].map((item, i) => (
            <div key={i} style={{ background: item.c + "08", border: `1px solid ${item.c}25`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: item.c, marginBottom: 6 }}>{item.t}</div>
              <div style={{ fontSize: 11, color: colors.textDim, lineHeight: 1.5 }}>{item.d}</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function TechStackTab() {
  const stacks = [
    { category: "📱 Frontend (Mobile)", items: [
      { name: "React Native + Expo SDK 52", role: "크로스플랫폼 모바일 앱", reason: "기존 RN 경험 활용, Expo로 빠른 개발" },
      { name: "Expo Router v4", role: "파일 기반 네비게이션", reason: "Next.js 스타일 라우팅, 딥링크 자동 지원" },
      { name: "Zustand", role: "전역 상태관리", reason: "Redux 대비 보일러플레이트 최소, 간결한 API" },
      { name: "react-native-youtube-iframe", role: "YouTube 영상 재생", reason: "YouTube IFrame API 래핑, 자막 타이밍 동기화 가능" },
      { name: "React Native Reanimated 3", role: "애니메이션", reason: "UI 스레드 직접 실행, 60fps 보장" },
      { name: "Nativewind v4", role: "스타일링", reason: "Tailwind CSS 문법, 빠른 UI 개발" },
    ]},
    { category: "⚡ Backend (API Server)", items: [
      { name: "NestJS v10", role: "API 서버 프레임워크", reason: "기존 경험 활용, 모듈 기반 구조, TypeScript 네이티브" },
      { name: "TypeORM", role: "ORM", reason: "NestJS와 긴밀한 통합, 마이그레이션 지원" },
      { name: "PostgreSQL 16", role: "메인 데이터베이스", reason: "기존 경험 활용, JSON 지원, 확장성 우수" },
      { name: "Redis", role: "캐싱/세션/SRS 큐", reason: "자막 캐싱, 학습 세션 관리, Bull Queue 연동" },
      { name: "Bull Queue", role: "백그라운드 작업", reason: "자막 파싱, AI 퀴즈 생성 등 비동기 처리" },
      { name: "Passport + JWT", role: "인증", reason: "소셜 로그인 + JWT 토큰 기반 인증" },
    ]},
    { category: "🌐 External APIs", items: [
      { name: "YouTube Data API v3", role: "영상 메타데이터/검색", reason: "영상 검색, 채널 정보, 자막 목록 조회" },
      { name: "youtube-captions-scraper", role: "자막 추출", reason: "YouTube 자막 텍스트 + 타이밍 데이터 추출" },
      { name: "Claude API (Sonnet)", role: "AI 분석/퀴즈 생성", reason: "자막 난이도 분석, 핵심 표현 추출, 퀴즈 생성" },
      { name: "Google Cloud TTS", role: "음성 합성", reason: "단어/문장 발음 재생, 한국어 번역 음성" },
    ]},
    { category: "🛠️ DevOps & Tools", items: [
      { name: "Docker + Docker Compose", role: "컨테이너화", reason: "개발/배포 환경 일치, PostgreSQL/Redis 로컬 실행" },
      { name: "GitHub Actions", role: "CI/CD", reason: "자동 테스트/빌드, EAS Build 연동" },
      { name: "EAS (Expo Application Services)", role: "앱 빌드/배포", reason: "OTA 업데이트, iOS/Android 빌드 클라우드 처리" },
      { name: "AWS EC2 or Railway", role: "서버 호스팅", reason: "NestJS 서버 배포, 초기에는 Railway로 간편 배포" },
    ]},
  ];

  return (
    <div>
      {stacks.map((stack, si) => (
        <Section key={si} title={stack.category}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {stack.items.map((item, ii) => (
              <div key={ii} style={{ background: colors.card, borderRadius: 8, padding: "10px 14px", border: `1px solid ${colors.border}`, display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: colors.text, minWidth: 200 }}>{item.name}</span>
                <span style={{ fontSize: 11, color: colors.accent, fontWeight: 600 }}>{item.role}</span>
                <span style={{ fontSize: 11, color: colors.textDim }}>— {item.reason}</span>
              </div>
            ))}
          </div>
        </Section>
      ))}
    </div>
  );
}

function AppFlowTab() {
  return (
    <div>
      <Section title="사용자 여정 플로우" icon="🗺️">
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Flow 1: Onboarding */}
          <div style={{ background: colors.card, borderRadius: 12, padding: 16, border: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: colors.accent, marginBottom: 12 }}>FLOW 1: 온보딩</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <FlowBox label="앱 실행" sub="스플래시" color={colors.textDim} arrow />
              <FlowBox label="프로필 선택" sub="유아/성인" color={colors.accent} arrow />
              <FlowBox label="연령 설정" sub="1/3/6/성인" color={colors.accent} arrow />
              <FlowBox label="레벨 테스트" sub="성인만" color={colors.accent2} arrow />
              <FlowBox label="홈 화면" sub="맞춤 콘텐츠" color={colors.accent3} />
            </div>
          </div>

          {/* Flow 2: Video Learning */}
          <div style={{ background: colors.card, borderRadius: 12, padding: 16, border: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: colors.accent3, marginBottom: 12 }}>FLOW 2: 영상 학습 (핵심 플로우)</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <FlowBox label="영상 선택" sub="추천/검색/카테고리" color={colors.accent} arrow />
              <FlowBox label="영상 시청" sub="자막 동기화 표시" color={colors.accent3} arrow />
              <FlowBox label="자막 탭" sub="단어 뜻 팝업" color={colors.accent4} arrow />
              <FlowBox label="단어 저장" sub="SRS 큐에 추가" color={colors.accent2} arrow />
              <FlowBox label="퀴즈" sub="AI 생성 퀴즈" color={colors.accent5} />
            </div>
            <div style={{ marginTop: 14, padding: 12, background: "#0d1117", borderRadius: 8, fontSize: 11, color: colors.textDim, lineHeight: 1.7 }}>
              <strong style={{ color: colors.accent3 }}>핵심 기능 상세:</strong><br/>
              ① 영상 재생 중 실시간 자막이 하단에 표시됨 (한/영 동시 또는 전환 가능)<br/>
              ② 자막의 특정 단어를 탭하면 뜻/발음/예문 팝업 → 바로 단어장에 저장 가능<br/>
              ③ 영상 시청 후 자동으로 핵심 표현 5개 + 퀴즈 3문제 생성<br/>
              ④ 구간 반복 기능: 특정 자막 구간을 반복 재생하여 쉐도잉 연습
            </div>
          </div>

          {/* Flow 3: SRS Review */}
          <div style={{ background: colors.card, borderRadius: 12, padding: 16, border: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: colors.accent2, marginBottom: 12 }}>FLOW 3: 간격 반복 복습</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <FlowBox label="복습 알림" sub="푸시 알림" color={colors.accent4} arrow />
              <FlowBox label="플래시카드" sub="단어/표현 카드" color={colors.accent2} arrow />
              <FlowBox label="자기 평가" sub="모름/어려움/쉬움" color={colors.accent} arrow />
              <FlowBox label="간격 조정" sub="SM-2 알고리즘" color={colors.accent3} arrow />
              <FlowBox label="통계 업데이트" sub="학습 현황" color={colors.textDim} />
            </div>
          </div>

          {/* Flow 4: Kids Mode */}
          <div style={{ background: colors.card, borderRadius: 12, padding: 16, border: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: colors.accent4, marginBottom: 12 }}>FLOW 4: 유아 모드 (1세/3세/6세)</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <FlowBox label="부모 잠금화면" sub="설정 보호" color={colors.textDim} arrow />
              <FlowBox label="큰 아이콘 홈" sub="카테고리 선택" color={colors.accent4} arrow />
              <FlowBox label="영상 자동재생" sub="큐레이션 목록" color={colors.accent} arrow />
              <FlowBox label="따라하기 게임" sub="노래/단어 반복" color={colors.accent3} arrow />
              <FlowBox label="스티커 보상" sub="동기부여" color={colors.accent5} />
            </div>
          </div>
        </div>
      </Section>

      <Section title="화면 구성 (Screen Map)" icon="📱">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
          {[
            { screen: "홈 (Home)", pages: ["추천 영상 피드", "오늘의 학습", "연속 학습일", "빠른 복습 버튼"] },
            { screen: "탐색 (Explore)", pages: ["카테고리별 검색", "난이도 필터", "인기 영상", "YouTube 검색"] },
            { screen: "영상 학습 (Learn)", pages: ["YouTube Player", "실시간 자막 표시", "단어 탭 → 사전", "구간 반복 모드"] },
            { screen: "단어장 (Words)", pages: ["저장된 단어 목록", "SRS 복습 카드", "단어 통계", "카테고리 분류"] },
            { screen: "퀴즈 (Quiz)", pages: ["빈칸 채우기", "듣기 퀴즈", "문장 배열", "그림 매칭(유아)"] },
            { screen: "통계 (Stats)", pages: ["학습 시간 그래프", "단어 성장 추이", "연속 학습일", "가족 현황"] },
          ].map((s, i) => (
            <div key={i} style={{ background: colors.card, borderRadius: 10, padding: 12, border: `1px solid ${colors.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: colors.accent, marginBottom: 8 }}>{s.screen}</div>
              {s.pages.map((pg, pi) => (
                <div key={pi} style={{ fontSize: 11, color: colors.textDim, padding: "3px 0", borderBottom: pi < s.pages.length - 1 ? `1px solid ${colors.border}` : "none" }}>• {pg}</div>
              ))}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function DBSchemaTab() {
  return (
    <div>
      <Section title="데이터베이스 스키마 (PostgreSQL)" icon="💾">
        <CodeBlock title="schema.sql — 핵심 테이블 설계">{`-- 사용자 & 프로필
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  provider      VARCHAR(20),          -- 'local' | 'google' | 'kakao' | 'apple'
  provider_id   VARCHAR(255),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  name          VARCHAR(100) NOT NULL,
  type          VARCHAR(10) NOT NULL,  -- 'child' | 'adult'
  age_group     VARCHAR(10),           -- '1y' | '3y' | '6y' | 'adult'
  level         VARCHAR(10) DEFAULT 'beginner', -- 'beginner'|'intermediate'|'advanced'
  avatar_url    VARCHAR(500),
  daily_goal_min INT DEFAULT 20,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 영상 & 자막
CREATE TABLE videos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_id    VARCHAR(20) UNIQUE NOT NULL,
  title         VARCHAR(500) NOT NULL,
  channel_name  VARCHAR(200),
  thumbnail_url VARCHAR(500),
  duration_sec  INT,
  difficulty    VARCHAR(10),           -- 'easy' | 'medium' | 'hard'
  age_group     VARCHAR(10)[],         -- ['1y','3y','6y','adult']
  category      VARCHAR(50),           -- 'nursery_rhyme' | 'cartoon' | 'news' | ...
  tags          VARCHAR(50)[],
  subtitle_lang VARCHAR(10)[],         -- ['en','ko']
  view_count    INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subtitles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id      UUID REFERENCES videos(id),
  lang          VARCHAR(10) NOT NULL,  -- 'en' | 'ko'
  start_ms      INT NOT NULL,          -- 시작 시간 (밀리초)
  end_ms        INT NOT NULL,          -- 종료 시간
  text          TEXT NOT NULL,          -- 자막 텍스트
  words_json    JSONB,                 -- [{word, pos, meaning_ko, phonetic}]
  INDEX idx_sub_video_time (video_id, start_ms)
);

-- 단어 & SRS 학습
CREATE TABLE vocabulary (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word          VARCHAR(100) NOT NULL,
  phonetic      VARCHAR(200),
  meaning_ko    TEXT NOT NULL,
  pos           VARCHAR(20),           -- 'noun' | 'verb' | 'adj' | ...
  example_en    TEXT,
  example_ko    TEXT,
  difficulty    INT DEFAULT 1,         -- 1-5
  audio_url     VARCHAR(500),
  UNIQUE(word, pos)
);

CREATE TABLE user_vocabulary (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID REFERENCES profiles(id),
  vocabulary_id UUID REFERENCES vocabulary(id),
  source_video  UUID REFERENCES videos(id),
  -- SRS (SM-2 알고리즘) 필드
  ease_factor   FLOAT DEFAULT 2.5,
  interval_days INT DEFAULT 0,
  repetitions   INT DEFAULT 0,
  next_review   TIMESTAMPTZ DEFAULT NOW(),
  last_reviewed TIMESTAMPTZ,
  status        VARCHAR(10) DEFAULT 'new', -- 'new'|'learning'|'review'|'mastered'
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, vocabulary_id)
);

-- 학습 기록
CREATE TABLE learning_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID REFERENCES profiles(id),
  video_id      UUID REFERENCES videos(id),
  watched_sec   INT,                   -- 시청 시간
  words_learned INT DEFAULT 0,
  quiz_score    FLOAT,
  completed     BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 퀴즈
CREATE TABLE quizzes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id      UUID REFERENCES videos(id),
  profile_id    UUID REFERENCES profiles(id),
  type          VARCHAR(20),           -- 'fill_blank'|'listening'|'arrange'|'match'
  question      JSONB NOT NULL,        -- {prompt, options, answer, hint}
  difficulty    INT DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);`}</CodeBlock>
      </Section>
    </div>
  );
}

function APIDesignTab() {
  const apis = [
    { group: "🔐 Auth", endpoints: [
      { method: "POST", path: "/auth/register", desc: "이메일 회원가입" },
      { method: "POST", path: "/auth/login", desc: "로그인 (JWT 발급)" },
      { method: "POST", path: "/auth/social", desc: "소셜 로그인 (카카오/구글/애플)" },
      { method: "POST", path: "/auth/refresh", desc: "토큰 갱신" },
    ]},
    { group: "👤 Profiles", endpoints: [
      { method: "POST", path: "/profiles", desc: "프로필 생성 (유아/성인)" },
      { method: "GET", path: "/profiles", desc: "내 프로필 목록" },
      { method: "PATCH", path: "/profiles/:id", desc: "프로필 수정 (레벨, 목표 등)" },
    ]},
    { group: "🎬 Videos", endpoints: [
      { method: "GET", path: "/videos/recommended", desc: "맞춤 추천 영상 (연령/레벨 기반)" },
      { method: "GET", path: "/videos/search?q=", desc: "YouTube 영상 검색" },
      { method: "GET", path: "/videos/:id", desc: "영상 상세 (메타데이터+자막)" },
      { method: "GET", path: "/videos/:id/subtitles", desc: "자막 전체 (타이밍+단어 분석)" },
      { method: "POST", path: "/videos/import", desc: "YouTube URL로 영상 등록+자막 파싱" },
    ]},
    { group: "📚 Vocabulary", endpoints: [
      { method: "GET", path: "/vocabulary/review", desc: "오늘 복습할 단어 목록 (SRS)" },
      { method: "POST", path: "/vocabulary/save", desc: "영상에서 단어 저장" },
      { method: "POST", path: "/vocabulary/:id/review", desc: "복습 결과 제출 (SM-2 업데이트)" },
      { method: "GET", path: "/vocabulary/stats", desc: "단어 학습 통계" },
    ]},
    { group: "🧩 Quiz", endpoints: [
      { method: "POST", path: "/quiz/generate", desc: "영상 기반 AI 퀴즈 생성 (Claude API)" },
      { method: "POST", path: "/quiz/:id/submit", desc: "퀴즈 답안 제출" },
      { method: "GET", path: "/quiz/daily", desc: "오늘의 퀴즈 (간격반복 기반)" },
    ]},
    { group: "📊 Progress", endpoints: [
      { method: "POST", path: "/sessions", desc: "학습 세션 기록" },
      { method: "GET", path: "/progress/dashboard", desc: "대시보드 데이터 (스트릭, 통계)" },
      { method: "GET", path: "/progress/family", desc: "가족 전체 학습 현황" },
    ]},
  ];

  const methodColors = { GET: colors.accent3, POST: colors.accent4, PATCH: colors.accent2, DELETE: colors.accent5 };

  return (
    <div>
      <Section title="REST API 설계" icon="⚡">
        {apis.map((group, gi) => (
          <div key={gi} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, marginBottom: 8 }}>{group.group}</div>
            {group.endpoints.map((ep, ei) => (
              <div key={ei} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 12px", background: ei % 2 ? "transparent" : colors.card, borderRadius: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: methodColors[ep.method], minWidth: 42, fontFamily: "monospace" }}>{ep.method}</span>
                <span style={{ fontSize: 12, color: colors.text, fontFamily: "monospace", minWidth: 220 }}>{ep.path}</span>
                <span style={{ fontSize: 11, color: colors.textDim }}>{ep.desc}</span>
              </div>
            ))}
          </div>
        ))}
      </Section>

      <Section title="자막 처리 파이프라인" icon="🔄">
        <CodeBlock title="subtitle-pipeline.ts — 자막 파싱 → AI 분석 → 저장 플로우">{`// NestJS Bull Queue Worker
@Processor('subtitle')
export class SubtitleProcessor {
  
  @Process('parse')
  async parseSubtitles(job: Job<{ videoId: string; youtubeId: string }>) {
    // 1. YouTube 자막 추출
    const captions = await getSubtitles({
      videoID: job.data.youtubeId,
      lang: 'en',
    });
    
    // 2. Claude API로 단어 분석
    const analyzed = await this.claude.analyze({
      prompt: \`다음 영어 자막의 각 문장에서:
        1. 핵심 단어를 추출하고 한국어 뜻을 제공
        2. 문장 난이도를 1-5로 평가
        3. 한국인이 어려워할 문법 포인트 표시
        
        자막: \${captions.map(c => c.text).join('\\n')}
        
        JSON 형식으로 응답:\`,
    });
    
    // 3. DB 저장 (자막 + 분석된 단어)
    await this.subtitleRepo.save(
      captions.map((cap, i) => ({
        videoId: job.data.videoId,
        lang: 'en',
        startMs: cap.start * 1000,
        endMs: (cap.start + cap.dur) * 1000,
        text: cap.text,
        wordsJson: analyzed.sentences[i].words,
      }))
    );
    
    // 4. 영상 난이도 자동 분류
    const avgDifficulty = analyzed.averageDifficulty;
    await this.videoRepo.update(job.data.videoId, {
      difficulty: avgDifficulty <= 2 ? 'easy' 
                : avgDifficulty <= 3.5 ? 'medium' : 'hard',
    });
  }
}`}</CodeBlock>
      </Section>
    </div>
  );
}

function RoadmapTab() {
  const phases = [
    { phase: "Phase 0", title: "프로젝트 셋업", duration: "1주", color: colors.textDim, tasks: [
      "Expo 프로젝트 초기화 (Expo Router + Nativewind)",
      "NestJS 프로젝트 셋업 (모듈 구조, TypeORM, PostgreSQL)",
      "Docker Compose (PostgreSQL + Redis + NestJS)",
      "GitHub 저장소 + CI/CD 파이프라인 구축",
      "Figma 와이어프레임 (핵심 화면 5개)",
    ]},
    { phase: "Phase 1", title: "MVP 핵심 기능", duration: "3-4주", color: colors.accent, tasks: [
      "회원가입/로그인 (JWT + 카카오 소셜)",
      "프로필 시스템 (유아/성인 모드 전환)",
      "YouTube 영상 검색 + 재생 (react-native-youtube-iframe)",
      "자막 추출 + 실시간 동기화 표시",
      "자막 단어 탭 → 사전 팝업 → 단어 저장",
      "기본 단어장 (저장된 단어 목록/삭제)",
    ]},
    { phase: "Phase 2", title: "학습 엔진", duration: "3-4주", color: colors.accent3, tasks: [
      "SM-2 간격 반복 알고리즘 구현",
      "플래시카드 복습 UI (스와이프)",
      "Claude API 연동 → 퀴즈 자동 생성",
      "퀴즈 UI (빈칸채우기, 듣기, 문장배열)",
      "학습 세션 기록 + 통계 대시보드",
      "구간 반복 재생 (쉐도잉 모드)",
    ]},
    { phase: "Phase 3", title: "유아 모드", duration: "2-3주", color: colors.accent4, tasks: [
      "유아 전용 UI (큰 버튼, 밝은 색상, 간결한 화면)",
      "연령별 영상 큐레이션 시스템",
      "따라하기 게임 (노래 가사 하이라이트)",
      "스티커/별 보상 시스템",
      "부모 대시보드 (자녀 학습 현황)",
      "화면 시간 제한 + 부모 잠금",
    ]},
    { phase: "Phase 4", title: "고도화 + 런칭", duration: "2-3주", color: colors.accent2, tasks: [
      "가족 그룹 기능 (가족 현황 공유)",
      "푸시 알림 (복습 리마인더, 연속 학습일)",
      "오프라인 모드 (저장된 단어장 복습)",
      "앱스토어/플레이스토어 제출 준비",
      "베타 테스트 + 피드백 반영",
      "런칭 + 초기 사용자 확보",
    ]},
  ];

  return (
    <div>
      <Section title="개발 로드맵 (총 12-15주)" icon="🚀">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {phases.map((ph, i) => (
            <div key={i} style={{ background: colors.card, borderRadius: 12, border: `1px solid ${ph.color}30`, overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: `1px solid ${colors.border}`, background: ph.color + "08" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: ph.color, background: ph.color + "20", padding: "2px 10px", borderRadius: 20 }}>{ph.phase}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>{ph.title}</span>
                </div>
                <span style={{ fontSize: 11, color: colors.textDim, fontWeight: 600 }}>{ph.duration}</span>
              </div>
              <div style={{ padding: "10px 16px" }}>
                {ph.tasks.map((task, ti) => (
                  <div key={ti} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 12, color: colors.textDim }}>
                    <span style={{ color: ph.color, fontSize: 8 }}>●</span>
                    {task}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="비용 추정 (월간)" icon="💰">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
          {[
            { item: "Railway (서버)", cost: "~$5-20", note: "초기 트래픽 기준" },
            { item: "Supabase PostgreSQL", cost: "무료 ~ $25", note: "500MB까지 무료" },
            { item: "Redis (Upstash)", cost: "무료 ~ $10", note: "10K 요청/일 무료" },
            { item: "YouTube Data API", cost: "무료", note: "10,000 units/일" },
            { item: "Claude API (Sonnet)", cost: "~$10-30", note: "퀴즈 생성 기준" },
            { item: "Google TTS", cost: "~$5-15", note: "100만 문자/월 기준" },
            { item: "EAS Build", cost: "무료 ~ $15", note: "30 빌드/월 무료" },
            { item: "합계 (초기)", cost: "~$20-100/월", note: "사용량에 따라 변동" },
          ].map((c, i) => (
            <div key={i} style={{ background: i === 7 ? colors.accent + "15" : colors.card, borderRadius: 8, padding: 10, border: `1px solid ${i === 7 ? colors.accent + "40" : colors.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: i === 7 ? colors.accent : colors.text }}>{c.item}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: i === 7 ? colors.accent : colors.accent3, marginTop: 4 }}>{c.cost}</div>
              <div style={{ fontSize: 10, color: colors.textDim, marginTop: 2 }}>{c.note}</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

const tabComponents = [ArchitectureTab, TechStackTab, AppFlowTab, DBSchemaTab, APIDesignTab, RoadmapTab];

export default function App() {
  const [activeTab, setActiveTab] = useState(0);
  const ActiveComponent = tabComponents[activeTab];

  return (
    <div style={{ background: colors.bg, minHeight: "100vh", color: colors.text, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "20px 20px 0", borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 22 }}>🎓</span>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent2})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            English Learning App
          </h1>
        </div>
        <p style={{ fontSize: 12, color: colors.textDim, margin: "4px 0 14px" }}>YouTube 기반 한국인 가족 영어 학습 앱 — 기술 설계 문서</p>
        
        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, overflowX: "auto", paddingBottom: 0 }}>
          {tabs.map((tab, i) => (
            <button key={i} onClick={() => setActiveTab(i)} style={{
              padding: "8px 14px", fontSize: 12, fontWeight: activeTab === i ? 700 : 500,
              color: activeTab === i ? colors.accent : colors.textDim,
              background: activeTab === i ? colors.accent + "15" : "transparent",
              border: "none", borderBottom: activeTab === i ? `2px solid ${colors.accent}` : "2px solid transparent",
              cursor: "pointer", whiteSpace: "nowrap", borderRadius: "8px 8px 0 0",
              transition: "all 0.2s",
            }}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
        <ActiveComponent />
      </div>
    </div>
  );
}
