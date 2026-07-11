# Step 0: canvas-resize-layout

## 읽을 파일
- docs/plan/diary-editor-ux-overhaul/PRD.md (섹션 1 "에디터 레이아웃/캔버스 확대" + "원칙 — UI와 기능의 분리")
- docs/plan/diary-editor-ux-overhaul/architecture.md (섹션 1)
- src/components/Window/Window.jsx (수정 대상)
- src/hooks/useFabricCanvas.js (수정 대상)
- src/storage/diaryStorage.js (수정 대상 — canvasSize 필드)
- src/components/DiaryCanvas/DiaryCanvas.jsx (수정 대상)
- src/components/DiaryApp/DiaryApp.jsx (edit 화면 컨테이너 수정 대상)

## 작업

### Window.jsx (UI만)
- `windowBoxStyle`의 `width: '90%'` → `'97%'`, `height: '88%'` → `'95%'`. 다른 스타일은 변경하지 않는다.

### storage/diaryStorage.js (로직, 최소 확장)
- `setDatePageData(data, dateKey, tab, canvasJSON)`에 5번째 인자 `canvasSize`({ width, height })를 추가하고, 저장 구조를 `{ canvasJSON, canvasSize }`로 확장한다. 기존 호출부 호환을 위해 `canvasSize`는 옵셔널로 하고 없으면 저장하지 않는다.
- `getDatePageData`의 반환을 `{ canvasJSON, canvasSize }`로 확장한다. `canvasSize`가 없으면 `null`을 반환한다.
- 기존 필드(todos, 기존 canvasJSON)는 절대 깨뜨리지 않는다.

### useFabricCanvas.js (로직, 최소 수정)
- 훅 시그니처를 `useFabricCanvas(canvasElementRef, initialCanvasJSON, onSave, options)`로 확장. `options = { width, height }`, 생략 시 기존 800×600.
- `new Canvas(el, {...})` 옵션에 `backgroundColor: '#ffffff'` 추가.
- `onSave` 호출 시 두 번째 인자로 현재 캔버스 크기 `{ width, height }`를 함께 전달하도록 확장한다 (저장 시 canvasSize 기록용). 기존 첫 번째 인자(canvasJSON)는 그대로.
- 기존 오토세이브 디바운스, StrictMode dispose 처리 로직은 변경하지 않는다.

### 좌표 확대/재배치 (신규 로직)
- `src/hooks/canvasMigration.js` 같은 순수 함수 모듈을 만든다: `scaleCanvasObjects(canvas, fromSize, toSize) -> void`.
  - `scaleX = toSize.width / fromSize.width`, `scaleY = toSize.height / fromSize.height`를 계산해, 캔버스의 모든 오브젝트에 대해 `left *= scaleX`, `top *= scaleY`, `scaleX(오브젝트 속성) *= scaleX`, `scaleY(오브젝트 속성) *= scaleY`를 적용하고 각 오브젝트 `setCoords()` 후 `canvas.renderAll()`.
  - 배경 이미지가 있으면 배경도 동일 비율로 스케일.
- `DiaryCanvas.jsx`에서 `loadFromJSON` 완료 직후: 저장된 `canvasSize`가 있고 현재 캔버스 크기와 다르면 `scaleCanvasObjects` 1회 호출. `canvasSize`가 없으면(구버전 데이터) 800×600으로 간주.
- **vitest 단위 테스트 필수**: `src/hooks/canvasMigration.test.js`에 실제 Fabric.js Canvas/Rect로 "800×600에서 1400×900으로 옮기면 좌표와 크기가 비율대로 늘어난다", "같은 크기면 아무것도 안 바뀐다"를 검증하는 테스트를 작성한다. 기존 `useObjectActions.test.js`의 패턴(실제 Fabric.js 인스턴스 사용)을 따른다.

### DiaryCanvas.jsx / DiaryApp.jsx (UI)
- 새 캔버스 크기: 1400×900을 기본으로 `useFabricCanvas`에 전달 (상수로 정의).
- `DiaryCanvas.jsx` 바깥 flex 컨테이너에 `justifyContent: 'center'` 추가.
- `DiaryApp.jsx`의 edit 화면 컨테이너(`padding: '24px'`인 flex div)의 padding을 줄이고 `height: '100%'`, `boxSizing: 'border-box'`, 내부가 창 높이 안에 들어오도록 조정. 편집 화면이 스크롤 없이 보이는 것이 목표 — 캔버스 1400×900이 창(97%/95%)에 안 들어가면 캔버스 크기 상수를 창에 들어가는 최대값으로 낮춘다(하드코딩 값 조정 허용).
- `handleSaveCanvas`가 `onSave`의 두 번째 인자(canvasSize)를 받아 `setDatePageData`에 전달하도록 수정.

## AC
- `npm run lint` 통과
- `npm run build` 통과
- `npm run test` 통과 (신규 canvasMigration.test.js 포함 — 테스트를 먼저 작성하고 구현할 것)

## 금지
- `useObjectActions.js`, `useCanvasKeyboardShortcuts.js`, `useActiveSelection.js`를 수정하지 마라. 이유: 이번 step 범위 밖이고, 검증된 로직이다.
- 창 리사이즈 실시간 반응(resize 이벤트 구독)을 구현하지 마라. 이유: 합의된 범위는 "마운트 시 고정 크기 1회"다.
- 기존 localStorage 데이터를 마이그레이션 스크립트로 일괄 변환하지 마라. 이유: 변환은 로드 시점에 lazy하게 1회 수행하기로 합의됨.
