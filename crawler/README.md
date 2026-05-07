# BoBi Insurance Crawler

보험상품 공시·약관·보장·요율 데이터를 수집해 Supabase의 `insurance` 스키마에 적재하는
독립 크롤러. 보비 본체(Next.js / Vercel)와는 코드·배포·실행 모두 분리되어 있다.

> ⚠️ **현재 Phase 1 (사전 조사)** — 코드 없음, 디렉토리 골격만 존재.
>   조사 결과는 [docs/insurance-db-research.md](../docs/insurance-db-research.md) 참조.

## Layout

```
crawler/
├─ sources/      # 사이트별 fetcher (e.g. lifeplaza.py, kifa.py)
├─ pipelines/    # parse → normalize → upsert 흐름
├─ schemas/      # Supabase insurance 스키마 마이그레이션 SQL
└─ scripts/      # 일회성 백필·검증 스크립트
```

## Phase 2 진입 시

- 언어/스택: Python + Playwright (Phase 1 보고서 권장안)
- 스케줄러: GitHub Actions cron (보비 본체 Vercel 분리)
- 격리: Supabase `insurance` 스키마 + 전용 service_role 키
