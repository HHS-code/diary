# Architecture — free-drawing (XP 그림판식 자유 그리기)

## 기술 스택

- React + Fabric.js 7 (기존과 동일)
- **신규 패키지 1개**: `@erase2d/fabric` ^1.2.1 (지우개, peerDependency `fabric >= 6.0.0` — 현재 7.4와 호환 확인됨)
- 그리기 자체는 Fabric 내장 free drawing 사용: `canvas.isDrawingMode` + `PencilBrush`(연필/브러시), `SprayBrush`(에어브러시)

## 기존 구조가 이미 해결해주는 것

- **좌표 변환**: `useFabricCanvas`가 `setZoom(displayScale)`을 쓰므로 Fabric이 마우스 좌표를 논리 좌표(1600×1000)로 자동 변환 — 그리기 좌표 처리 코드 불필요.
- **오토세이브**: 획이 완성되면 Fabric이 `object:added`를 발생시켜 기존 500ms 디바운스 저장이 그대로 작동.
- **박제 상태 저장**: `EXTRA_SERIALIZED_PROPS`에 이미 `selectable`/`evented`가 있어 획의 선택 불가 상태가 새로고침 후에도 유지됨.

## 폴더 구조 (제안)

```
diary/
  docs/plan/free-drawing/        PRD.md, architecture.md (이 문서)
  src/
    components/
      DiaryCanvas/
        DiaryCanvas.jsx          PaintToolbox 렌더링 + 훅 연결 (수정)
      PaintToolbox/
        PaintToolbox.jsx         신규: 순수 UI — XP 그림판식 도구/굵기/색상 팔레트
    hooks/
      useFabricCanvas.js         EXTRA_SERIALIZED_PROPS에 isFreeDrawing·erasable 추가 (수정)
      usePaintTools.js           신규: 로직 — 도구 상태, 브러시 구성, 획 박제, 지우개 연동
      useCanvasHistory.js        신규: 로직 — undo/redo 스냅샷 스택 + Ctrl+Z/Y
```

UI/로직 분리 원칙은 canvas-object-toolbar phase에서 확립한 그대로: `useXxx.js`는 Fabric 호출·상태만, `Xxx.jsx`는 props로 받은 데이터/함수로 그리기만 (fabric 미import).

## usePaintTools.js (신규 — 로직)

- 훅 시그니처: `usePaintTools(fabricCanvasRef) -> { tool, color, width, setTool, setColor, setWidth }`
- 도구 상태: `tool ∈ { 'select', 'pencil', 'brush', 'airbrush', 'eraser' }`, 기본값 `'select'`.
- `tool === 'select'`: `canvas.isDrawingMode = false` — 기존 오브젝트 선택/이동 모드 그대로.
- 그리기 도구 선택 시 `isDrawingMode = true` + `canvas.freeDrawingBrush` 교체:
  - 연필: `PencilBrush`, 굵기 1 고정 (굵기 UI 비활성).
  - 브러시: `PencilBrush`, 굵기 = `width` 상태.
  - 에어브러시: `SprayBrush`, 밀도/굵기 = `width` 기반.
  - 지우개: `@erase2d/fabric`의 `EraserBrush`, 굵기 = `width`.
- **획 박제**: `path:created` 이벤트에서 생성된 Path에 `selectable: false`, `evented: false`, `isFreeDrawing: true`, `erasable: true`를 설정한다. 에어브러시 산출물(Group)도 동일 처리.
- **지우개 연동**: `EraserBrush`의 `end` 이벤트에서 `commit()`을 호출해 지운 결과를 대상 오브젝트에 반영한다. `erasable: true`인 오브젝트(=그린 획)만 지워지고, 스티커/사진/텍스트는 `erasable` 미설정(기본 false)이라 지나가도 영향 없음.
- 브러시 굵기는 논리 좌표 기준이므로 displayScale과 무관하게 저장 데이터가 일관된다.

## useCanvasHistory.js (신규 — 로직)

- 훅 시그니처: `useCanvasHistory(fabricCanvasRef) -> { undo, redo, canUndo, canRedo }` + 부작용으로 Ctrl+Z/Ctrl+Y 전역 keydown 등록.
- 방식: **전체 스냅샷 스택**. 캔버스 변경 이벤트(`object:added`/`object:modified`/`object:removed`)마다 `canvas.toObject(EXTRA_SERIALIZED_PROPS)`를 `past` 스택에 push. `past`는 30개 제한(초과 시 가장 오래된 것 버림), 새 변경이 생기면 `future`(redo 스택)는 비운다.
- undo: 현재 상태를 `future`에 넣고 `past`에서 pop한 스냅샷을 `loadFromJSON`으로 복원. redo는 반대.
- **복원 중 가드**: `loadFromJSON` 동안 발생하는 이벤트로 히스토리가 또 쌓이지 않도록 `isRestoring` 플래그로 기록을 중단한다 (`useFabricCanvas`의 `isLoading` 패턴과 동일).
- **오토세이브 연동**: 복원 완료 후 `canvas.fire('object:modified')`로 기존 저장 파이프라인을 태운다 (`useCanvasBackground`에서 확립한 패턴). 단, 이 fire가 히스토리에 기록되지 않도록 가드 해제 순서에 주의.
- **텍스트 편집 중 무시**: `IText` 편집 모드에서는 Ctrl+Z를 가로채지 않는다 (`useCanvasKeyboardShortcuts`의 기존 판별 방식 재사용).
- 배경(색/이미지)도 스냅샷에 포함되므로 배경 변경도 자동으로 undo 대상이 된다.
- 메모리 참고: 업로드 사진이 dataURL로 직렬화되므로 스냅샷이 무거울 수 있음 — 30개 제한이 보호 장치. 실측으로 문제 시 제한을 낮추는 것만 허용(구조 변경은 범위 밖).

## PaintToolbox.jsx (신규 — 순수 UI)

- props: `{ tool, color, width, onToolChange, onColorChange, onWidthChange }` — `usePaintTools` 반환값을 `DiaryCanvas`가 연결. fabric 미import.
- 레이아웃 (240px 사이드바 패널, StickerPalette 프레임 스타일 재사용):
  1. **도구 격자**: 2열 아이콘 버튼 — 선택(화살표)/연필/브러시/에어브러시/지우개. 현재 도구는 눌린(sunken) 상태 표시.
  2. **굵기 옵션 박스**: XP 그림판의 도구 아래 옵션 영역처럼, 현재 도구의 굵기 선택지 표시 (연필은 비활성).
  3. **색상 팔레트**: XP 그림판식 2행 기본 색상 격자 + 현재 색 표시 칸.
- **실측 검증**: 색상값·격자 배치·눌림 효과는 `match-reference` 스킬로 `reference/ms-paint-on-xp-v0-lilxt1d7tbf11.webp`와 비교해 확정한다. 이 문서에는 스타일 수치를 박지 않는다 — 실측이 스펙.

## DiaryCanvas.jsx (수정)

- 사이드바 최상단(StickerPalette 위)에 `PaintToolbox` 배치 — XP 그림판에서 도구 팔레트가 가장 먼저 보이는 것과 대응.
- `usePaintTools(fabricCanvasRef)`, `useCanvasHistory(fabricCanvasRef)` 호출 추가.
- 그 외 기존 렌더링·훅 호출 무수정.

## useFabricCanvas.js (수정 — 최소)

- `EXTRA_SERIALIZED_PROPS`에 `'isFreeDrawing'`, `'erasable'` 추가. 그 외 무수정.

## 검증이 필요한 기술 가정 (실행 시 해당 step에서 확인)

1. **지운 상태의 직렬화**: `@erase2d/fabric`는 지운 결과를 대상 오브젝트의 `clipPath`(ClippingGroup)로 저장한다. `toObject()` → `loadFromJSON()` 왕복과 모아보기 `StaticCanvas` 썸네일에서 지운 상태가 유지되는지 확인. ClippingGroup 클래스가 역직렬화 시 classRegistry에 등록되어 있어야 함 (패키지 import로 등록되는지 확인).
2. **에어브러시 직렬화**: `SprayBrush` 산출물이 JSON 왕복 후에도 동일하게 복원되는지.
3. jsdom 환경에서 브러시/지우개 로직의 vitest 테스트 가능 범위 — 안 되는 부분은 브라우저 수동 검증으로 대체하고 report에 명시.

## 모듈 경계

- `usePaintTools.js`, `useCanvasHistory.js`는 `fabricCanvasRef`에만 의존, storage/localStorage 직접 접근 금지 (저장은 기존 `useFabricCanvas` 파이프라인이 담당).
- `PaintToolbox.jsx`는 fabric 미import — 훅이 준 props만 사용.
- `@erase2d/fabric` import는 `usePaintTools.js` 안에만 존재한다 (다른 파일로 새지 않게).
- 기존 훅(`useObjectActions`, `useActiveSelection`, `useCanvasKeyboardShortcuts`, `useCanvasBackground`)은 무수정.
