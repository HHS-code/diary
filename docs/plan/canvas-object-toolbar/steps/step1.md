# Step 1: object-actions-toolbar

## 읽을 파일
- docs/plan/canvas-object-toolbar/PRD.md
- docs/plan/canvas-object-toolbar/architecture.md (특히 "useObjectActions.js", "ObjectToolbar.jsx" 절)
- docs/design.md ("9. StickerPalette / ImageUploadButton / ..." 절 — 버튼 공통 스타일 스펙)
- src/components/StickerPalette/StickerPalette.jsx (panelStyle·버튼 스타일 재사용 대상)
- src/hooks/useActiveSelection.js (step 0 산출물)
- src/components/DiaryCanvas/DiaryCanvas.jsx (수정 대상 — step 0에서 넣은 임시 표시를 이 step에서 대체)

## 작업

`src/hooks/useObjectActions.js`를 새로 만든다.

- 시그니처: `useObjectActions(fabricCanvasRef) -> { copy, remove, bringToFront, sendToBack, bringForward, sendBackward }`. 각 함수는 `(target) => void` 형태.
- `copy(target)`: `target.clone()`으로 복제 → 복제본의 `left`/`top`에 오프셋(+10, +10 정도)을 더함 → `fabricCanvasRef.current.add(clone)` → `setActiveObject(clone)` → `renderAll()`. `clone()`은 Fabric.js v7에서 Promise를 반환하므로 `await` 또는 `.then()`으로 처리한다.
- `remove(target)`: `fabricCanvasRef.current.remove(target)` → `renderAll()`.
- `bringToFront`/`sendToBack`/`bringForward`/`sendBackward`: 각각 `canvas.bringObjectToFront(target)` / `sendObjectToBack(target)` / `bringObjectForward(target)` / `sendObjectBackwards(target)` 호출 후 `renderAll()`.
- JSX 반환 없음. Fabric.js 호출 로직만 담당한다.

`src/components/ObjectToolbar/ObjectToolbar.jsx`를 새로 만든다.

- props: `{ activeObject, actions }` — `actions`는 `useObjectActions`가 반환한 객체를 그대로 받는다.
- Fabric.js를 이 파일에서 직접 import하지 않는다 (architecture의 모듈 경계 규칙).
- `activeObject.getBoundingRect()`로 좌표를 구해 오브젝트 바로 위에 `position: absolute`로 배치한다. 캔버스 위쪽 공간이 부족하면(예: `top < 40`) 오브젝트 아래에 배치한다.
- 버튼 6개: 복사, 삭제, 맨 앞으로, 맨 뒤로, 한 단계 앞으로, 한 단계 뒤로. 각 `onClick`은 `() => actions.copy(activeObject)` 형태.
- 스타일은 `docs/design.md`의 버튼 공통 스펙(`border:1px solid #7d7d64`, `background:linear-gradient(180deg,#fdfdfa,#dcd9c7)`, `borderRadius:3`)과 `StickerPalette.jsx`의 `panelStyle`(배경 `#ece9d8`, 동일 boxShadow)을 그대로 재사용한다. 새 색상값을 만들지 않는다.

`src/components/DiaryCanvas/DiaryCanvas.jsx`를 수정한다.

- 캔버스를 감싸는 `<div>`(현재 `<canvas ref={canvasElRef} />`의 부모)에 `position: 'relative'`를 추가한다.
- `useObjectActions(fabricCanvasRef)`를 호출한다.
- step 0에서 넣은 임시 텍스트 표시를 제거하고, `activeObject`가 있을 때 `<ObjectToolbar activeObject={activeObject} actions={actions} />`를 렌더링한다.

## AC
- `npm run lint` 통과
- `npm run build` 통과
- 코드 리뷰 관점 자가 점검: `ObjectToolbar.jsx`가 `fabric` 패키지를 import하지 않는지 grep으로 확인하고 리포트에 기록한다.

## 금지
- `ObjectToolbar.jsx` 안에서 `fabricCanvasRef`나 `fabric` 패키지를 직접 사용하지 마라. 이유: architecture의 로직/UI 분리 원칙 — UI 파일은 props로 받은 함수만 호출해야 스타일 변경이 기능에 영향을 주지 않는다.
- `AlignmentToolbar.jsx`, `useAlignment.js`, `useCanvasKeyboardShortcuts.js`를 이번 step에서 만들지 마라. 이유: 각각 step 2, step 3의 범위.
- 새로운 색상/그라디언트 값을 만들지 마라. 이유: PRD에 기존 `docs/design.md` 스펙 재사용이 명시되어 있다.
