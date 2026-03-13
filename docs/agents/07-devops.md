# Agent 07: DevOps & Infrastructure (devops)

## 역할
Docker 환경 구성, CI/CD 파이프라인, 배포 설정, 모니터링, 인프라 관리

## 우선순위: ★★★★☆ (Phase 0에서 기반 구축 + Phase 4에서 마무리)

## 담당 파일

```
프로젝트 루트/
├── english-learning-api/
│   ├── Dockerfile
│   ├── docker-compose.yml        # PostgreSQL + Redis + API
│   ├── docker-compose.dev.yml    # 개발 전용 (핫 리로드)
│   ├── .env.example
│   ├── .env.development
│   └── .env.production
├── english-learning-app/
│   ├── app.json                  # Expo 설정
│   ├── eas.json                  # EAS Build 설정
│   └── .env.example
├── .github/
│   └── workflows/
│       ├── api-ci.yml            # 백엔드 CI
│       ├── api-deploy.yml        # 백엔드 배포
│       ├── app-build.yml         # 모바일 앱 빌드
│       └── app-preview.yml       # PR 미리보기 빌드
├── .gitignore
└── README.md                     (요청 시에만)
```

## Docker 구성

### docker-compose.yml (프로덕션)
```yaml
version: '3.8'
services:
  api:
    build: ./english-learning-api
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres:5432/english_app
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=english_app
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=english_app
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes

volumes:
  postgres_data:
  redis_data:
```

### docker-compose.dev.yml (개발)
```yaml
# 추가 설정
services:
  api:
    build:
      context: ./english-learning-api
      target: development
    volumes:
      - ./english-learning-api:/app
      - /app/node_modules
    command: npm run start:dev

  pgadmin:
    image: dpage/pgadmin4
    ports:
      - "5050:80"
    environment:
      - PGADMIN_DEFAULT_EMAIL=admin@local.dev
      - PGADMIN_DEFAULT_PASSWORD=admin

  redis-commander:
    image: rediscommander/redis-commander
    ports:
      - "8081:8081"
    environment:
      - REDIS_HOSTS=local:redis:6379
```

### Dockerfile (Multi-stage)
```dockerfile
# Stage 1: Development
FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npm", "run", "start:dev"]

# Stage 2: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/main"]
```

## CI/CD 파이프라인

### api-ci.yml (PR 검증)
```yaml
트리거: PR → main, develop
단계:
  1. Checkout
  2. Node.js 20 setup
  3. npm ci
  4. Lint (eslint)
  5. Type Check (tsc --noEmit)
  6. Unit Tests (jest)
  7. Docker Compose 기동 (PostgreSQL + Redis)
  8. Integration Tests (jest --config jest-e2e.config.ts)
  9. Build Check (npm run build)
```

### api-deploy.yml (배포)
```yaml
트리거: push → main
단계:
  1. CI 통과 확인
  2. Docker 이미지 빌드 + 태그
  3. Railway Deploy (railway up)
     또는
     AWS ECR Push → ECS 서비스 업데이트
  4. DB 마이그레이션 실행 (typeorm migration:run)
  5. Health check 확인
```

### app-build.yml (모바일 빌드)
```yaml
트리거: push → main (태그 v*)
단계:
  1. EAS Build 트리거
     - iOS: eas build --platform ios --profile production
     - Android: eas build --platform android --profile production
  2. 빌드 완료 대기
  3. (태그 시) TestFlight / 내부 테스트 트랙 자동 제출
```

### app-preview.yml (PR 미리보기)
```yaml
트리거: PR → main
단계:
  1. EAS Build --profile preview
  2. PR 코멘트에 QR 코드 (Expo Go 또는 Dev Client 링크)
```

## EAS 설정 (eas.json)
```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": true }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "...", "ascAppId": "..." },
      "android": { "serviceAccountKeyPath": "./google-services.json" }
    }
  }
}
```

## 환경 변수 관리

### .env.example
```
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://english_app:password@localhost:5432/english_app

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# YouTube
YOUTUBE_API_KEY=your-youtube-api-key

# Claude API
CLAUDE_API_KEY=your-claude-api-key
CLAUDE_MODEL=claude-sonnet-4-20250514

# Google TTS
GOOGLE_TTS_KEY=your-google-tts-key

# Expo Push
EXPO_ACCESS_TOKEN=your-expo-token
```

## 배포 아키텍처

### 초기 (Phase 0~2)
```
[Expo Dev Client] → [Railway NestJS] → [Railway PostgreSQL]
                                      → [Upstash Redis]
```

### 프로덕션 (Phase 4+)
```
[App Store / Play Store]
         │
    [CloudFront CDN] ← 정적 에셋, TTS 오디오
         │
    [ALB 로드밸런서]
    ┌────┴────┐
    │ EC2 #1  │ EC2 #2  (Auto Scaling)
    └────┬────┘
    [RDS PostgreSQL] (Multi-AZ)
    [ElastiCache Redis]
```

## 모니터링 (Phase 4)

| 도구 | 용도 | 비용 |
|------|------|------|
| Railway Metrics | 기본 서버 모니터링 | 포함 |
| Sentry | 에러 트래킹 (FE+BE) | 무료 (5K events) |
| Expo Insights | 앱 성능/크래시 | 무료 |
| UptimeRobot | API 가용성 모니터링 | 무료 (50 monitors) |

## 월간 비용 추정

| 서비스 | 비용 | 비고 |
|--------|------|------|
| Railway (API) | ~$5-20 | 초기 트래픽 |
| PostgreSQL | 무료~$25 | Supabase 또는 Railway |
| Redis (Upstash) | 무료~$10 | 10K req/day 무료 |
| YouTube Data API | 무료 | 10,000 units/일 |
| Claude API | ~$10-30 | Sonnet, 퀴즈 생성 |
| Google TTS | ~$5-15 | 100만 문자/월 |
| EAS Build | 무료~$15 | 30 빌드/월 무료 |
| **합계** | **~$20-100/월** | |

## 의존 관계
- **의존하는 Agent**: 전체 (배포 대상)
- **의존받는 Agent**: 전체 (개발 환경 제공)

## 완료 기준
- [ ] Docker Compose (dev + prod) 동작 확인
- [ ] Dockerfile (multi-stage) 빌드 성공
- [ ] .env.example 모든 변수 문서화
- [ ] GitHub Actions CI 파이프라인 (lint + test + build)
- [ ] GitHub Actions CD 파이프라인 (Railway 배포)
- [ ] EAS Build 설정 (dev + preview + production)
- [ ] .gitignore 완성 (node_modules, .env, 빌드 산출물)
- [ ] 로컬 개발 환경 원커맨드 구동 (`docker compose up`)
