# StockPick 최종 구현 계획

> **For Antigravity:** REQUIRED SUB-SKILL: Load executing-plans to implement this plan task-by-task.

## 1. 확정 결정
- **앱 표시 이름:** StockPick
- **저장소 이름:** Stock_Polio (현재 `friends_wallet` 저장소와 분리된 새 저장소로 생성)
- **사용자:** 미리 등록된 친구 7명 중 선택
- **인증:** Firebase Authentication 미사용
- **권한:** 신뢰 기반, 다른 사용자 조작 방어는 범위 밖
- **Firestore Rules:** 권한 방어가 아닌 형식·원자성·우발적 손상 방지
- **활성 종목:** 사용자당 최대 5개
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

---

## Phase 0 — 외부 API 스파이크

### Task 1. Yahoo 시세 검증
프런트엔드보다 먼저 Worker 로컬 스파이크를 작성합니다.
- **검증 종목:** 미국(AAPL), 코스피(005930.KS), 코스닥(035720.KQ), 잘못된 값(NOT_A_REAL_STOCK)
- **검증 필드:**
  ```typescript
  type StockQuote = {
    symbol: string; name: string; price: number; currency: "USD" | "KRW";
    asOf: string; marketState: "REGULAR" | "PRE" | "POST" | "CLOSED" | "UNKNOWN";
  };
  ```
- **검색 검증:** 영문 회사명/티커, 한글 종목명, 미국/한국 결과 필터, 일반 주식만 반환 가능한지, 검색 결과의 symbol을 시세 API에서 그대로 사용할 수 있는지.
- **오류 검증:** 404/빈 결과, 401, 429, timeout, 가격/통화 누락, 장 마감 상태.

**Phase 0 합격 기준**
다음 조건을 모두 만족해야 Yahoo로 진행합니다.
1. 세 테스트 종목의 양수 가격 반환
2. 시세 기준 시각 반환
3. USD/KRW 구분 가능
4. 잘못된 티커를 정상 오류로 변환
5. Worker 환경에서 쿠키나 브라우저 세션 없이 호출 가능
6. 연속 호출 시 즉시 차단되지 않음

*검색만 실패하면 티커 직접 입력 방식으로 진행합니다. 시세 조회가 실패하면 프런트 구현을 중단하고 KIS로 교체합니다.*
- **커밋:** `git commit -m "spike: validate Yahoo stock quote API"`

---

## Phase 1 — 프로젝트와 공통 모델

### Task 2. Vite 프로젝트 생성
```bash
npm create vite@latest . -- --template react-ts
npm install firebase
npm install -D vitest @firebase/rules-unit-testing firebase-tools wrangler
```
- **필수 스크립트:** dev, build, test, worker:dev, worker:deploy, firebase:emulator, firebase:rules
- **Vite base:** `base: "/Stock_Polio/";`
- **환경변수:** `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, `VITE_WORKER_API_URL` (.env.local 배제, GitHub Variables 관리)

### Task 3. 데이터 모델
```typescript
import type { Timestamp } from "firebase/firestore";
export type Currency = "USD" | "KRW";
export type User = { name: string; activeStockIds: string[]; createdAt: Timestamp; };
export type ActiveStock = {
  userId: string; symbol: string; name: string; currency: Currency;
  buyPrice: number; buyPriceAsOf: Timestamp; addedAt: Timestamp;
};
export type StockHistory = ActiveStock & {
  sourceActiveStockId: string; sellPrice: number; sellPriceAsOf: Timestamp; closedAt: Timestamp;
};
export type StockQuote = {
  symbol: string; name: string; price: number; currency: Currency;
  asOf: string; marketState: "REGULAR" | "PRE" | "POST" | "CLOSED" | "UNKNOWN";
};
```
- 수익률은 저장하지 않음. `calculateReturnRate` 함수 활용.
- 활성 문서 ID: `const activeStockId = ${userId}__${symbol};`
- 허용 symbol: 대문자 영문, 숫자, 마침표, 하이픈 최대 20자 (슬래시 금지)

---

## Phase 2 — Cloudflare Worker

### Task 4. API 계약 구현
- **검색 (`GET /api/search?q=apple`)**
  - 검색어 2~50자, 프런트 debounce 300ms, 최대 10건, 일반 주식(미국, .KS, .KQ)만 허용, 5분 캐시.
  - (검색 스파이크 실패 시 엔드포인트 미구현 및 티커 입력 검증 UI로 대체)
- **배치 시세 (`POST /api/quotes?fresh=true`)**
  - 요청당 최대 35개, 빈 배열 거부, 중복 제거, symbol 정규화.
  - 캐시 미스만 Yahoo 호출, Yahoo 동시 호출 최대 5개, 종목당 timeout 5초, 개별 종목 실패 방어.
  - 성공 응답만 일반 시세 캐시 60초. `fresh=true`는 캐시 읽기 우회 후 성공 결과 캐시.
  - Rate Limit: 검색 30회/분/IP, 일반 시세 60회/분/IP, fresh 시세 10회/분/IP.
  - CORS 허용: 실제 GitHub Pages 주소, `http://localhost:5173`.

---

## Phase 3 — Firestore와 사용자 선택

### Task 5. 사용자 seed
- Firebase Console에서 `users/jaehyung` (name: "재형", activeStockIds: [], createdAt: Timestamp) 등 친구 7명 1회 등록. (회원 생성 UI 없음)

### Task 6. 이름 선택
- Firestore `users` 목록을 버튼/셀렉트로 표시. 선택 시 `selectedUserId`를 localStorage 저장.
- 새로고침 시 복원, 없으면 선택 화면 복귀. 헤더에서 변경 가능. Firebase Auth 미사용.

### Task 7. Firestore Rules
- **users:** 읽기 허용, 생성/삭제 금지, `activeStockIds`만 변경 가능(최대 5개, 중복 금지).
- **activeStocks:** 읽기 허용, 생성/삭제 허용, 생성 후 수정 금지. 문서 ID 매칭, 가격 양수, `addedAt == request.time`, 트랜잭션 시 `users` 배열 추가 확인.
- **stockHistory:** 읽기/생성 허용, 수정/삭제 금지. 활성 문서 값 일치, 트랜잭션 시 활성 문서 삭제 및 배열 제거 확인.

---

## Phase 4 — 핵심 트랜잭션

### Task 8. 종목 등록
- 검색/티커 선택 → `/api/quotes?fresh=true` 호출 → 가격/통화/시각 검증 (장 마감 안내) → 트랜잭션 시작 (users 읽기, activeStocks 읽기) → 검증(<5개, 미존재) → 활성 문서 생성 & 배열 ID 추가 → 성공 닫기.
- Worker 호출은 트랜잭션 콜백 밖에서 실행.

### Task 9. 종목 종료
- 종료 버튼 선택 → `/api/quotes?fresh=true` 호출 → 예상 수익률 표시 및 최종 확인 → 히스토리 문서 ID 밖에서 생성 → 트랜잭션 시작 (users, activeStocks 읽기) → 검증 → 히스토리 문서 생성 → 활성 문서 삭제 & 배열 제거 → 성공 갱신.

---

## Phase 5 — 대시보드

### Task 10. 실시간 데이터
- `activeStocks`, `stockHistory`, `users` 전체 구독 (추후 페이지네이션).

### Task 11. 가격 폴링
- 진입 즉시 호출, 중복 제거, 최대 35개 일괄 요청, 60초 주기.
- 탭 숨겨지면 중지, 다시 보이면 즉시 호출, 이전 요청 진행 중 생략. 실패 시 기존 가격 유지 및 stale 표시.

### Task 12. 화면
- **탭:** 랭킹, 내 종목, 친구별, 종료 기록
- **카드:** 수익률 표시 (단순 가격 변동률, 배당 등 미반영 문구 명시), 상승 빨강/하락 파랑 규칙. 랭킹 시 가격 누락 종목 순위 제외, 동률 시 등록 시간 우선.

---

## Phase 6 — 테스트

### Task 13. Vitest (단위 테스트)
- 수익률 계산, symbol 정규화, 중복 symbol 제거, Yahoo 정상 응답 매핑, 필드 누락 처리, KRW/USD 매핑, 부분 실패 응답 처리.

### Task 14. Firestore Emulator (통합 테스트)
- 1~5개 등록 성공, 6번째 실패, 중복 등록 실패, 동시 같은 종목 등록 방어, 동시 종료 방어, 종료 후 재등록, 배열/활성문서 단독 변경 방어 등.

### Task 15. 수동 E2E
- 사용자 선택/변경/복원, 5개 제한, 장 마감 가격, 모바일 해상도, Yahoo 장애 모의 등 수동 검증.

---

## Phase 7 — 배포

### Task 16. Cloudflare Worker
- Worker 배포, Rate Limit binding 설정, CORS Origin 설정, `/api/search` 및 `/api/quotes` smoke test (429, timeout, 35종목 요청, fresh=true 등).

### Task 17. Firebase
- Firebase 프로젝트 연결, 7명 seed, Rules 배포, 운영 환경 검증.

### Task 18. GitHub Pages
- GitHub Variables 설정, 워크플로 구성(빌드/테스트 후 배포). 프런트와 Worker 배포 워크플로 분리.
