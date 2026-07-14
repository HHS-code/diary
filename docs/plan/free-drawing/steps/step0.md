# Step 0: paint-tools-drawing

## 읽을 파일
- `src/hooks/useFabricCanvas.js` — 캔버스 생명주기·직렬화 속성·`setZoom(displayScale)` 구조
- `src/hooks/useCanvasBackground.js` — "fabricCanvasRef만 의존하는 로직 훅" 패턴 참고
- `src/hooks/useObjectActions.js` + `src/hooks/useObjectActions.test.js` — 훅 테스트 작성 패턴 참고
- `src/components/DiaryCanvas/DiaryCanvas.jsx` — 훅이 연결될 자리 (이 step에서는 수정하지 않음)

## 작업

### 1. `src/hooks/usePaintTools.js` (신규 — 로직 훅)

시그니처 (architecture.md 합의):
```
usePaintTools(fabricCanvasRef) -> { tool, color, width, setTool, setColor, setWidth }
```

- `tool ∈ { 'select', 'pencil', 'brush', 'airbrush' }`, 기본값 `'select'`. (`'eraser'`는 step 1에서 추가 — 이번에 만들지 마라.)
- `color` 기본 `'#000000'`, `width` 기본은 재량(예: 4).
- `tool === 'select'` → `canvas.isDrawingMode = false` (기존 오브젝트 선택/이동 모드).
- 그리기 도구 선택 시 `canvas.isDrawingMode = true` + `canvas.freeDrawingBrush` 교체:
  - `pencil`: fabric `PencilBrush`, 굵기 1 고정 (color만 반영)
  - `brush`: fabric `PencilBrush`, 굵기 = `width`
  - `airbrush`: fabric `SprayBrush`, 굵기/밀도 = `width` 기반
- `color`/`width` 변경은 현재 활성 브러시에 즉시 반영.
- **획 박제 (핵심 규칙)**: `canvas.on('path:created')`에서 생성된 오브젝트에
  `selectable: false`, `evented: false`, `isFreeDrawing: true`, `erasable: true`를 설정한다.
  에어브러시 산출물(Group일 수 있음)도 동일 처리. 이 속성 설정이 빠지면 그린 획이
  스티커처럼 잡혀서 PRD의 "박제" 결정(그림판처럼 이동 불가)이 깨진다.
- fabricCanvasRef.current가 아직 null일 수 있음(비동기 생성) — 기존 훅들의 처리 방식을 따른다.

### 2. `src/hooks/useFabricCanvas.js` (수정 — 이 한 줄 성격만)

- `EXTRA_SERIALIZED_PROPS`에 `'isFreeDrawing'`, `'erasable'` 추가. 그 외 무수정.

### 3. 테스트 (TDD — 구현 전에 실패 테스트 먼저)

`src/hooks/usePaintTools.test.js` (신규): 최소 다음 동작 검증 —
- 기본값이 select 모드이고 `isDrawingMode`가 false다
- pencil/brush/airbrush 선택 시 `isDrawingMode`가 true가 되고 브러시 타입·굵기가 맞다
- select로 돌아오면 `isDrawingMode`가 false다
- `path:created` 발생 시 오브젝트에 selectable=false, evented=false, isFreeDrawing=true, erasable=true가 설정된다
- setColor/setWidth가 활성 브러시에 반영된다

기존 테스트 파일들의 jsdom + fabric Canvas 생성 패턴을 재사용하라.

## AC
```
npm run lint
npm run test
npm run build
```
셋 다 exit code 0. 기존 테스트 40개 전부 유지 + 신규 테스트 통과.

## 금지
- UI 컴포넌트(PaintToolbox 등)를 만들지 마라. 이유: step 2의 범위 — UI/로직 분리 원칙상 이 step은 로직만.
- 지우개(eraser)를 구현하거나 `@erase2d/fabric`를 import하지 마라. 이유: step 1의 범위.
- `DiaryCanvas.jsx`를 수정하지 마라. 이유: 훅 연결은 step 2에서 UI와 함께 한 번에 — 지금 연결하면 UI 없는 죽은 코드가 생긴다.
- 기존 훅(`useObjectActions`, `useActiveSelection`, `useCanvasKeyboardShortcuts`, `useCanvasBackground`)을 수정하지 마라. 이유: PRD 성공 기준 "기존 기능 무손상".
- undo/redo를 만들지 마라. 이유: step 3의 범위.
