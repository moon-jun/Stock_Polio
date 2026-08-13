# 워렌 버핏의 어린 시절 투자일기 구현 계획

> **For Antigravity:** REQUIRED SUB-SKILL: Load executing-plans to implement this plan task-by-task.

## 1. 확정 결정
- **앱 표시 이름:** 워렌 버핏의 어린 시절 투자일기
- **저장소 이름:** Stock_Polio (현재 `friends_wallet` 저장소와 분리된 새 저장소로 생성)
- **사용자:** 미리 등록된 친구 7명 중 선택
- **인증:** Firebase Authentication 미사용
- **권한:** 신뢰 기반, 다른 사용자 조작 방어는 범위 밖
- **Firestore Rules:** 권한 방어가 아닌 형식·원자성·우발적 손상 방지
- **활성 종목:** 사용자당 최대 10개
- **가격 공급자:** Yahoo Finance 비공식 API
  - Yahoo 실패 시: 검색은 티커 직접 입력으로 대체, 시세 API 자체가 실패하면 KIS로 전환
- **수익률:** 단순 가격 수익률, 배당·환율·액면분할 미반영
- **프런트엔드:** Vite + React + TypeScript + Vanilla CSS
- **시세 프록시:** Cloudflare Worker
- **저장소:** Firestore
- **배포:** GitHub Pages + Cloudflare Workers
- **종목 범위:** 미국·코스피·코스닥 일반 주식, ETF 제외
- **색상:** 한국 금융 UI 기준 상승 빨강, 하락 파랑
- **정확한 패키지 버전은 package-lock.json으로 고정**

### 운영 설정
- `worker/wrangler.toml`의 `ALLOWED_ORIGINS`를 실제 GitHub Pages origin으로 변경합니다.
- KIS fallback을 사용하려면 `wrangler secret put KIS_APP_KEY`와 `wrangler secret put KIS_APP_SECRET`을 실행합니다.
- 사용자 문서는 이름을 처음 선택할 때 생성할 수 있으며, Rules는 올바른 초기 필드와 빈 활성 종목 배열만 허용합니다.

## 2. 프로젝트 경계
현재 `friends_wallet` 안에서 다음 명령을 실행하면 안 됩니다. 구현 시작 전 반드시 확인합니다.
`git rev-parse --show-toplevel`
출력 경로의 마지막 폴더가 `Stock_Polio`인지 확인한 뒤 스캐폴딩합니다. 중첩 Git 저장소를 만들지 않습니다.

## 3. 최종 구조
```
Stock_Polio/
  src/
    app/
      App.tsx, MainPage.tsx, styles.css
    auth/
      AuthProvider.tsx, AuthScreen.tsx
    stock/
      model.ts, logic.ts, api.ts, AddStockModal.tsx, CloseStockConfirm.tsx, StockCard.tsx
    shared/
      firebase.ts, marketApi.ts, useStockPrices.ts
  worker/
    src/
      index.ts, yahoo.ts, validation.ts
    tsconfig.json, wrangler.toml
  test/
    firestore.test.ts, worker.test.ts
  firestore.rules, firebase.json, .env.example
  .github/workflows/deploy-pages.yml
  package.json, vite.config.ts
```
별도 entities, features, widgets, 공급자 인터페이스는 만들지 않습니다. 두 번째 시세 공급자를 실제로 붙일 때 분리합니다.
