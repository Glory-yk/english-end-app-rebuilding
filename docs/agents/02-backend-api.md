# Agent 02: Backend API (backend-api)

## 역할
NestJS API 서버의 모듈 구조, 컨트롤러, 서비스, 인증, 미들웨어 구현

## 우선순위: ★★★★★ (핵심 — 프론트엔드와 병렬 진행)

## 담당 파일

```
english-learning-api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   │   ├── decorators/current-user.decorator.ts
│   │   ├── decorators/current-profile.decorator.ts
│   │   ├── guards/jwt-auth.guard.ts
│   │   ├── guards/parental.guard.ts
│   │   ├── interceptors/transform.interceptor.ts
│   │   ├── filters/http-exception.filter.ts
│   │   └── dto/pagination.dto.ts
│   ├── config/
│   │   ├── database.config.ts      (database agent와 공유)
│   │   ├── redis.config.ts
│   │   ├── jwt.config.ts
│   │   └── external-api.config.ts
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/jwt.strategy.ts
│   │   ├── strategies/local.strategy.ts
│   │   ├── strategies/kakao.strategy.ts
│   │   ├── strategies/google.strategy.ts
│   │   └── dto/register.dto.ts, login.dto.ts
│   ├── profiles/
│   │   ├── profiles.module.ts
│   │   ├── profiles.controller.ts
│   │   ├── profiles.service.ts
│   │   └── dto/create-profile.dto.ts, update-profile.dto.ts
│   ├── videos/
│   │   ├── videos.module.ts
│   │   ├── videos.controller.ts
│   │   └── videos.service.ts
│   ├── vocabulary/
│   │   ├── vocabulary.module.ts
│   │   ├── vocabulary.controller.ts
│   │   └── vocabulary.service.ts
│   ├── quiz/
│   │   ├── quiz.module.ts
│   │   ├── quiz.controller.ts
│   │   └── quiz.service.ts
│   ├── progress/
│   │   ├── progress.module.ts
│   │   ├── progress.controller.ts
│   │   └── progress.service.ts
│   └── notifications/
│       ├── notifications.module.ts
│       └── notifications.service.ts
├── .env.example
├── nest-cli.json
├── tsconfig.json
└── package.json
```

## API 엔드포인트 명세

### Auth (🔐)
| Method | Path | 설명 |
|--------|------|------|
| POST | /auth/register | 이메일 회원가입 |
| POST | /auth/login | 로그인 (JWT 발급) |
| POST | /auth/social | 소셜 로그인 (카카오/구글/애플) |
| POST | /auth/refresh | 토큰 갱신 |

### Profiles (👤)
| Method | Path | 설명 |
|--------|------|------|
| POST | /profiles | 프로필 생성 (유아/성인) |
| GET | /profiles | 내 프로필 목록 |
| PATCH | /profiles/:id | 프로필 수정 |

### Videos (🎬)
| Method | Path | 설명 |
|--------|------|------|
| GET | /videos/recommended | 맞춤 추천 (연령/레벨) |
| GET | /videos/search?q= | YouTube 검색 |
| GET | /videos/:id | 영상 상세 |
| GET | /videos/:id/subtitles | 자막 전체 (타이밍+단어) |
| POST | /videos/import | YouTube URL 등록+파싱 |

### Vocabulary (📚)
| Method | Path | 설명 |
|--------|------|------|
| GET | /vocabulary/review | 오늘 복습 단어 (SRS) |
| POST | /vocabulary/save | 단어 저장 |
| POST | /vocabulary/:id/review | 복습 결과 제출 |
| GET | /vocabulary/stats | 학습 통계 |

### Quiz (🧩)
| Method | Path | 설명 |
|--------|------|------|
| POST | /quiz/generate | AI 퀴즈 생성 (Claude) |
| POST | /quiz/:id/submit | 답안 제출 |
| GET | /quiz/daily | 오늘의 퀴즈 |

### Progress (📊)
| Method | Path | 설명 |
|--------|------|------|
| POST | /sessions | 학습 세션 기록 |
| GET | /progress/dashboard | 대시보드 |
| GET | /progress/family | 가족 현황 |

## 인증/보안 규칙

1. **JWT**: Access Token 15분 + Refresh Token 7일
2. **비밀번호**: bcrypt (saltRounds: 12)
3. **Rate Limiting**: @nestjs/throttler (일반 60/min, 인증 5/min)
4. **입력 검증**: class-validator + class-transformer 모든 DTO
5. **프로필 격리**: 모든 API에서 profileId 소유권 검증 Guard
6. **CORS**: 프론트엔드 도메인만 허용
7. **Helmet**: HTTP 보안 헤더

## 모듈 구조 규칙

1. 각 모듈은 `module.ts`, `controller.ts`, `service.ts`, `dto/`, `entities/` 구조
2. 외부 API 호출은 반드시 `external/` 모듈 경유 (직접 호출 금지)
3. Bull Queue 프로세서는 해당 모듈 내 `processors/` 폴더에 위치
4. 순환 의존 방지: `forwardRef()` 사용 최소화, 이벤트 기반 디커플링 우선
5. 환경 변수는 `@nestjs/config`의 `ConfigService`로 타입 안전하게 접근

## 의존 관계
- **의존하는 Agent**: database (엔티티)
- **의존받는 Agent**: frontend-app, subtitle-ai, srs-engine, kids-mode

## 완료 기준
- [ ] NestJS 프로젝트 초기화 + 모듈 구조 생성
- [ ] Auth 모듈 완성 (JWT + 카카오 소셜 최소)
- [ ] 6개 도메인 모듈 CRUD 기본 구현
- [ ] common/ (Guards, Pipes, Filters, Decorators) 구현
- [ ] Redis 연결 + 캐싱 미들웨어
- [ ] Swagger/OpenAPI 문서 자동 생성 설정
- [ ] 단위 테스트 핵심 서비스별 최소 3개
