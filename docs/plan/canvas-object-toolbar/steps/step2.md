# Step 2: alignment-toolbar

## 읽을 파일
- docs/plan/canvas-object-toolbar/PRD.md
- docs/plan/canvas-object-toolbar/architecture.md (특히 "useAlignment.js", "AlignmentToolbar.jsx" 절)
- src/hooks/useObjectActions.js, src/components/ObjectToolbar/ObjectToolbar.jsx (step 1 산출물 — 같은 로직/UI 분리 패턴을 따른다)
- src/hooks/useActiveSelection.js (activeSelection을 어떻게 얻는지)
- src/components/DiaryCanvas/DiaryCanvas.jsx (수정 대상)

## 작업

`src/hooks/useAlignment.js`를 새로 만든다.

- 시그니처: `useAlignment(fabricCanvasRef) -> { alignLeft, alignRight, alignTop, alignBottom, alignCenterH, alignCenterV, distributeHorizontal, distributeVertical }`. 각 함수는 `(selection) => void` 형태 (`selection`은 Fabric.js `ActiveSelection`).
- 정렬 함수 공통 로직: `selection.getObjects()`로 하위 오브젝트 배열을 얻고, 각 오브젝트의 `getBoundingRect()`(캔버스 좌표계 기준)로 최소/최대/중앙값을 계산한다.
  - `alignLeft`: 모든 오브젝트의 `left`를 선택 영역 중 가장 작은 `left` 값으로 맞춘다.
  - `alignRight`: 모든 오브젝트의 오른쪽 끝(`left + width`)을 가장 큰 값으로 맞춘다.
  - `alignTop`/`alignBottom`: 위 로직을 y축으로 동일 적용.
  - `alignCenterH`: 모든 오브젝트의 수평 중심을 선택 영역 전체의 수평 중심으로 맞춘다.
  - `alignCenterV`: 수직 중심 버전.
- `distributeHorizontal`/`distributeVertical`: 오브젝트들을 해당 축 중심 좌표 기준으로 정렬한 뒤, 양 끝(가장 작은/가장 큰 중심 좌표를 가진 오브젝트)은 고정하고 나머지를 그 사이에 균등한 간격으로 재배치한다. 오브젝트가 2개 이하면 아무 동작도 하지 않는다(균등 분배할 중간 오브젝트가 없으므로).
- 각 함수는 좌표 변경 후 `fabricCanvasRef.current.renderAll()`을 호출한다.
- JSX 반환 없음.

`src/components/ObjectToolbar/AlignmentToolbar.jsx`를 새로 만든다.

- props: `{ activeSelection, actions }` — `actions`는 `useAlignment`가 반환한 객체.
- `fabric` 패키지를 이 파일에서 import하지 않는다.
- 버튼 8개: 좌 정렬, 우 정렬, 상 정렬, 하 정렬, 가운데 정렬(수평), 가운데 정렬(수직), 가로 등간격, 세로 등간격. 각 `onClick`은 `() => actions.alignLeft(activeSelection)` 형태.
- 위치: `activeSelection.getBoundingRect()`로 선택 영역 전체의 좌표를 구해, `ObjectToolbar`와 겹치지 않도록 별도 위치(예: 선택 영역의 옆, 또는 `ObjectToolbar` 아래)에 `position: absolute`로 배치한다.
- 스타일은 step 1의 `ObjectToolbar.jsx`와 동일한 `docs/design.md` 버튼 스펙을 재사용한다.

`src/components/DiaryCanvas/DiaryCanvas.jsx`를 수정한다.

- `useAlignment(fabricCanvasRef)`를 호출한다.
- `activeSelection`이 있을 때(2개 이상 선택) `<AlignmentToolbar activeSelection={activeSelection} actions={alignActions} />`를 `ObjectToolbar`와 함께 렌더링한다.

## AC
- `npm run lint` 통과
- `npm run build` 통과
- 코드 리뷰 관점 자가 점검: `AlignmentToolbar.jsx`가 `fabric` 패키지를 import하지 않는지 확인하고, `distributeHorizontal`/`distributeVertical`이 오브젝트 2개 이하일 때 안전하게 아무 동작도 안 하는지(에러 없이) 코드로 확인해 리포트에 기록한다.

## 금지
- `AlignmentToolbar.jsx` 안에서 `fabricCanvasRef`나 `fabric` 패키지를 직접 사용하지 마라. 이유: step 1과 동일한 로직/UI 분리 원칙.
- 그룹핑/그룹 해제 기능을 만들지 마라. 이유: PRD Out-of-scope로 명시됨.
- `useCanvasKeyboardShortcuts.js`를 이번 step에서 만들지 마라. 이유: step 3의 범위.
