# Step 0: bg-removal-model-wrapper

## 읽을 파일
- docs/plan/ai-background-removal/PRD.md (섹션 1 "자동 배경 제거")
- docs/plan/ai-background-removal/ADR.md (ADR-1, ADR-2, ADR-4)
- docs/plan/ai-background-removal/architecture.md (섹션 1 "자동 배경 제거", 섹션 3 "모델 세션 생명주기", "Vite 빌드 통합 시 확인 사항" — **이 문서의 API 시그니처는 웹 조사 기반이며 미검증이라고 명시되어 있음. 이 step에서 실제 패키지로 검증한다**)
- package.json (기존 의존성 목록, 스크립트: `lint`/`build`/`test`)
- vite.config.js (현재 설정 — 이 step에서 WASM/워커 관련 조정이 필요한지 판단)

## 작업

### 의존성 설치 및 API 실측 확인

1. `npm install @bunnio/rembg-web`로 설치한다.
2. `node_modules/@bunnio/rembg-web`의 타입 정의(`.d.ts`) 또는 README를 직접 열어, architecture.md가 가정한 API(`remove(data, options)`, `newSession(modelName)`, `options.onlyMask`, `options.onProgress`, `options.session`)가 실제로 이 형태인지 확인한다. 이름이나 시그니처가 다르면(예: `onProgress`가 아니라 다른 이름이거나, `newSession`이 비동기인 경우 등) architecture.md와 다른 실제 사실을 따르고, 이후 코드와 이 step의 report에 실제 시그니처를 기록한다.
3. `npm run dev`와 `npm run build` 양쪽에서 이 패키지를 import했을 때 WASM/워커 관련 에러가 없는지 실제로 확인한다. 에러가 있으면 `vite.config.js`에 필요한 최소 조정(예: `optimizeDeps.exclude`, `worker.format`)을 추가한다. 문제가 없으면 아무 것도 바꾸지 않는다.

### backgroundRemoval.js (신규)

`src/ai/backgroundRemoval.js`:

- 모듈 스코프에 세션을 캐싱한다(architecture.md 섹션 3의 `getOrCreateSession` 패턴) — 같은 브라우저 탭에서 여러 번 호출해도 모델을 한 번만 로드한다(ADR-4).
- 공개 시그니처(정확한 이름은 실제 라이브러리 API 확인 후 맞춰 조정 가능하나, 아래 형태를 목표로 한다): `removeBackgroundFromImage(source: HTMLCanvasElement | Blob, onProgress?: (info) => void) -> Promise<Blob>` — 반환값은 배경이 제거된(투명해진) 이미지의 PNG Blob이다.
- 모델은 `'u2netp'`(경량, ADR-2)로 고정한다. 모델 이름을 파라미터로 받는 옵션은 만들지 않는다.
- 이 함수는 Fabric이나 React 상태에 의존하지 않는 순수한 비동기 래퍼다 — UI 상태(버튼 비활성화 등)는 이 step에서 다루지 않는다(다음 step의 범위).

## AC
- `npm run lint && npm run build && npm run test` 통과.
- `npm run dev`로 실행한 상태에서 브라우저 콘솔에 `@bunnio/rembg-web` 관련 로드 에러가 없는지 실제로 확인한다(Playwright 등으로 페이지를 열어 콘솔 에러를 점검해도 되고, 수동으로 확인해도 된다 — 이 확인 결과를 report에 기록한다).
- 신규 테스트 `backgroundRemoval.test.js`: 라이브러리의 `remove`/`newSession`(실제 API 이름)을 모킹해, `removeBackgroundFromImage`를 두 번 호출했을 때 세션 생성 함수(`newSession` 등)가 한 번만 호출되는지(캐싱 확인), `onProgress` 콜백이 전달되면 라이브러리 호출에 그대로 전달되는지.

## 금지
- 이 step에서 `StickerStudio.jsx`나 UI 컴포넌트를 수정하지 마라. 이유: 이 step은 순수 래퍼 계층만 담당하고, 버튼/UX 연결은 다음 step(bg-removal-button)의 범위다.
- architecture.md의 API 가정이 실제와 다를 때, 그 사실을 조용히 무시하고 문서와 다르게 구현한 뒤 아무 기록도 남기지 마라. 이유: 이 문서는 명시적으로 "미검증, 이 step에서 확인" 상태로 작성되었다 — report에 실제 API와 문서 가정의 차이를 반드시 기록해야 다음 step들이 정확한 시그니처를 참고할 수 있다.
- `isnet` 등 더 큰 모델을 기본값으로 쓰지 마라. 이유: ADR-2 — 경량 모델(`u2netp`) 고정이 이번 phase의 명시적 결정이다.
