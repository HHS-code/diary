# Step 2: shared-render-loop

## 읽을 파일
- docs/plan/animated-gif-support/PRD.md (섹션 3 "공유 렌더 루프")
- docs/plan/animated-gif-support/ADR.md (ADR-4)
- docs/plan/animated-gif-support/architecture.md (섹션 3 "공유 렌더 루프")
- src/fabric/AnimatedGif.js (step 1 산출물 — `advanceFrame()`, `frameDelays`, `currentFrameIndex` 필드)
- src/hooks/useFabricCanvas.js (전체 — 캔버스 생성/dispose 생명주기, `object:added`/`object:removed` 이벤트 사용 지점)

## 작업

### sharedGifRenderLoop.js (신규)

`src/fabric/sharedGifRenderLoop.js`:

- 공개 시그니처: `createSharedGifRenderLoop(fabricCanvas) -> { register(obj), unregister(obj), start(), stop() }`.
- 내부적으로 `Set`에 등록된 `AnimatedGif` 오브젝트를 순회하며, 오브젝트별 "마지막 프레임 전환 시각"을 추적(`WeakMap` 등)한다.
- `requestAnimationFrame` 콜백(매 틱마다 `now` 타임스탬프를 받음)에서: 각 등록된 오브젝트에 대해 `now - lastTickTime >= obj.frameDelays[obj.currentFrameIndex]`이면 `obj.advanceFrame()`을 호출하고 시각을 갱신, 이번 틱에 하나라도 갱신이 있었으면 `fabricCanvas.renderAll()`을 **틱당 최대 1회만** 호출한다.
- `start()`는 이미 루프가 돌고 있으면(내부 rafId 존재) 아무 것도 하지 않는다(중복 시작 방지). `stop()`은 `cancelAnimationFrame`으로 정지하고 내부 상태를 초기화한다.
- architecture.md의 코드 스니펫을 기본 틀로 삼되, 세부 구현(변수명, 내부 구조)은 자유롭게 조정 가능하다.

### useFabricCanvas.js 연결

- `fabricCanvas`가 생성되는 시점(현재 `new Canvas(el, {...})` 직후)에 `createSharedGifRenderLoop(fabricCanvas)`를 호출해 만들고 `start()`한다.
- `fabricCanvas.on('object:added', ...)`에서 추가된 오브젝트가 `AnimatedGif`의 인스턴스이면(`instanceof` 체크) 루프에 `register`한다. `object:removed`에서는 `unregister`한다. 기존 `object:added`/`object:modified`/`object:removed` 리스너(`scheduleSave`)는 그대로 유지하고, 이 register/unregister 로직을 별도 리스너로 추가하거나 기존 리스너 안에 나란히 추가한다 — 기존 자동저장 동작을 변경하지 않는다.
- 캔버스 `dispose()` 직전(현재 `disposePromiseRef.current = setupPromise.then(() => fabricCanvas?.dispose())` 지점)에 루프의 `stop()`을 호출해 정리한다.
- `loadFromJSON` 복원 완료 후(`options.onLoaded` 호출 시점) 캔버스에 이미 올라온 기존 `AnimatedGif` 오브젝트들(재로드로 복원된 것들)을 순회해 루프에 `register`한다 — `object:added` 이벤트가 `loadFromJSON`이 만드는 오브젝트에도 발생하는지 Fabric.js 동작을 먼저 확인하고, 발생한다면 이 단계는 생략 가능(중복 등록 방지를 위해 `Set` 특성을 활용하면 중복 register는 안전하지만, 발생하지 않는다면 반드시 명시적으로 처리해야 한다). 이 확인과 처리는 이 step에서 마친다 — 다음 step(gif-persistence)은 이 재로드 등록 로직이 이미 동작한다고 가정하지 않고, 실제로 필요한 마무리 작업(assetId 통과 분기 등)만 다룬다.

## AC
- `npm run lint && npm run build && npm run test` 통과. 신규 테스트 `sharedGifRenderLoop.test.js`:
  - `requestAnimationFrame`을 모킹해 틱을 수동으로 발생시키는 방식으로: 등록된 가짜 `AnimatedGif`류 객체(`{ advanceFrame: vi.fn(), frameDelays: [10], currentFrameIndex: 0 }`)에 대해 delay 시간이 지난 뒤 틱을 실행하면 `advanceFrame`이 호출되고 `renderAll`이 호출되는지.
  - 여러 오브젝트가 등록되어 있고 한 틱에 여러 개가 동시에 프레임을 넘겨야 하는 상황에서도 `renderAll`이 그 틱에 1번만 호출되는지.
  - `unregister` 후에는 더 이상 `advanceFrame`이 호출되지 않는지.
  - `stop()` 후 `cancelAnimationFrame`이 호출되는지.
- `useFabricCanvas.test.js`(기존 파일)에 회귀 테스트 추가: 캔버스 dispose 시 루프도 정리되어(예: 이후 rAF 콜백이 더 실행되지 않음) 메모리 누수나 dispose된 캔버스에 대한 `renderAll` 호출이 발생하지 않는지.

## 금지
- 개별 `AnimatedGif` 오브젝트가 자체 `requestAnimationFrame`을 갖게 하지 마라(step1에서 이미 안 만들었어야 하지만, 이 step에서도 그 방향으로 되돌리지 않는다). 이유: ADR-4의 핵심 결정 — 캔버스당 루프 1개로 렌더 호출 빈도를 GIF 개수와 무관하게 고정하는 것이 이번 phase 성능 전략의 전부다.
- 매 틱마다 조건 없이 `renderAll()`을 호출하지 마라(예: 등록된 오브젝트가 하나도 프레임을 안 넘겼는데도 호출). 이유: 불필요한 렌더는 이 루프가 막으려는 바로 그 병목이다.
