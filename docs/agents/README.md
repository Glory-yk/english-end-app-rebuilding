# Sub-Agent 구성 가이드

## 개요
English Learning App 프로젝트를 7개의 전문 Sub-Agent로 분할하여 병렬 개발을 극대화한다.

## Agent 구성도

```
                    ┌─────────────────┐
                    │  Orchestrator   │  ← 메인 대화에서 조율
                    │  (Main Agent)   │
                    └────────┬────────┘
          ┌─────┬─────┬──────┼──────┬──────┬──────┐
          v     v     v      v      v      v      v
       ┌─────┐┌────┐┌────┐┌─────┐┌────┐┌─────┐┌──────┐
       │ FE  ││ BE ││ DB ││SubAI││SRS ││Kids ││DevOps│
       │Agent││Agt ││Agt ││Agent││Agt ││Agent││Agent │
       └─────┘└────┘└────┘└─────┘└────┘└─────┘└──────┘
```

## Agent 목록

| # | Agent ID | 담당 영역 | 의존 Agent |
|---|----------|----------|-----------|
| 1 | `frontend-app` | Expo/RN 화면, 컴포넌트, 네비게이션 | DB(타입), BE(API) |
| 2 | `backend-api` | NestJS 모듈, 컨트롤러, 서비스 | DB(엔티티) |
| 3 | `database` | PostgreSQL 스키마, 마이그레이션, TypeORM | 없음 (기반) |
| 4 | `subtitle-ai` | 자막 추출, Claude 분석, 퀴즈 생성 | BE, DB |
| 5 | `srs-engine` | SM-2 알고리즘, 복습 시스템, 단어장 | DB, BE |
| 6 | `kids-mode` | 유아 전용 UI/UX, 부모 대시보드 | FE, BE |
| 7 | `devops` | Docker, CI/CD, 배포, 인프라 | 전체 |

## 실행 순서 (의존성 기반)

```
Phase 0:  [database] + [devops]              ← 동시 착수 가능
Phase 1a: [backend-api] + [frontend-app]     ← DB 완료 후 동시
Phase 1b: [subtitle-ai] + [srs-engine]       ← BE 기본 구조 완료 후 동시
Phase 2:  [kids-mode]                        ← FE + BE 기본 완료 후
Phase 3:  [devops] 마무리                     ← 전체 통합 후
```

## 사용법

각 Agent를 Claude Code의 `Agent` 도구로 호출할 때,
해당 .md 파일의 내용을 프롬프트에 포함시켜 컨텍스트를 제공한다.

```
예시: Agent(subagent_type="general-purpose",
           prompt="다음 가이드를 따라 작업하세요: [agent .md 내용]")
```

## 파일 목록
- `01-database.md` — DB 스키마, 마이그레이션
- `02-backend-api.md` — NestJS API 서버
- `03-frontend-app.md` — Expo 모바일 앱
- `04-subtitle-ai.md` — 자막/AI 파이프라인
- `05-srs-engine.md` — 간격반복 학습 엔진
- `06-kids-mode.md` — 유아 모드
- `07-devops.md` — 인프라/배포
