# Step 0: active-selection-tracking

## 읽을 파일
- docs/plan/canvas-object-toolbar/PRD.md
- docs/plan/canvas-object-toolbar/architecture.md (특히 "UI/로직 분리 원칙", "useActiveSelection.js" 절)
- src/hooks/useFabricCanvas.js (기존 훅 패턴 참고 — fabricCanvasRef를 어떻게 다루는지)
- src/components/DiaryCanvas/DiaryCanvas.jsx (수정 대상)

## 작업

`src/hooks/useActiveSelection.js`를 새로 만든다.

- 시그니처: `useActiveSelection(fabricCanvasRef) -> { activeObject, activeSelection }`
  - `activeObject`: 단일 오브젝트가 선택되어 있으면 그 Fabric.js 오브젝트, 아니면 `null`.
  - `activeSelection`: 2개 이상 선택(Fabric.js `ActiveSelection`)이면 그 인스턴스, 아니면 `null`.
- `fabricCanvasRef.current`가 존재할 때 `selection:created`, `selection:updated`, `selection:cleared` 이벤트를 구독한다. `useFabricCanvas.js`처럼 `useEffect` 안에서 캔버스 인스턴스를 다루고 언마운트 시 리스너를 정리한다.
- Fabric.js에서 오브젝트가 1개 선택되면 `canvas.getActiveObject()`가 해당 오브젝트를, 여러 개 선택되면 `ActiveSelection` 인스턴스를 반환한다(이 인스턴스도 `getActiveObject()`로 얻는다). `getObjects()`로 하위 오브젝트 개수를 세어 1개인지 여러 개인지 구분한다.
- JSX를 반환하지 않는다(로직 전용 훅).

`src/components/DiaryCanvas/DiaryCanvas.jsx`를 수정한다.

- `useActiveSelection(fabricCanvasRef)`를 호출해 `activeObject`, `activeSelection`을 얻는다.
- 이번 step에서는 아직 `ObjectToolbar`/`AlignmentToolbar`를 만들지 않으므로, 값이 잘 잡히는지 확인할 수 있도록 캔버스 영역 근처에 임시로 텍스트로 노출한다. 예: `activeObject`가 있으면 `<div>선택됨: {activeObject.type}</div>`, `activeSelection`이 있으면 `<div>다중 선택: {activeSelection.getObjects().length}개</div>` 처럼 최소한으로. 이 임시 표시는 다음 step(object-actions-toolbar)에서 실제 툴바 컴포넌트로 교체되어 사라질 것임을 감안해 화려하게 만들지 않는다.

## AC
- `npm run lint` 통과 (변경된 파일 기준)
- `npm run build` 통과 (문법/타입 오류 없이 빌드됨)
- 수동 확인 불가(headless)이므로, 코드 리뷰 관점에서 `useActiveSelection`이 `selection:created`/`selection:updated`/`selection:cleared` 세 이벤트를 모두 구독하고 언마운트 시 해제하는지 스스로 점검해 리포트에 기록한다.

## 금지
- `ObjectToolbar.jsx`, `AlignmentToolbar.jsx`, `useObjectActions.js`, `useAlignment.js`를 이번 step에서 만들지 마라. 이유: 각각 다음 step의 범위이며, 한 step에서 여러 모듈을 동시에 만들면 실패 시 원인 분리가 어려워진다.
- `useFabricCanvas.js`의 기존 로직(오토세이브 debounce 등)을 변경하지 마라. 이유: PRD Out-of-scope — 기존 캔버스 도구 동작은 그대로 유지해야 한다.
- 임시 표시용 JSX를 화면 전체를 덮는 형태로 만들지 마라. 이유: 다음 step에서 바로 대체될 코드이므로 최소한으로 유지한다.
